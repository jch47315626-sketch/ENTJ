import { TAU, rand } from '../core/math.js';
import { hitArc, currentWeaponLevel } from './weapons.js';
import { GWANSIM, FURY_LV } from '../data/skills.js';
import { MOMENTUM } from '../data/heroes.js';

/** Foes within `r` of the hero that `ok` accepts (charmed ones never count). */
function foesNear(g, r, ok = () => true) {
  const p = g.player;
  let n = 0;
  g.grid.query(p.x, p.y, r, (e) => {
    if (e.dead || e.hidden || e.def.behavior === 'static' || g.isCharmed(e) || !ok(e)) return;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r * r) n++;
  });
  return n;
}

/** Worth firing: a crowd close by, or (when `boss`) the general within reach. */
function crowdOrBoss(g, r, boss = true) {
  const p = g.player, B = g.boss;
  if (boss && B && !B.dead && (B.x - p.x) ** 2 + (B.y - p.y) ** 2 <= (r + B.r) ** 2) return true;
  return foesNear(g, r) >= MOMENTUM.crowd;
}

/**
 * Hero special abilities (고유기). Fired automatically when the momentum
 * (기세) gauge fills — as soon as `worth(g)` says the moment is good, or
 * after MOMENTUM.hold seconds regardless.
 */
export const SPECIALS = {
  // 왕건 — 고려 창병 소환
  tongsol: {
    name: '통솔',
    worth: (g) => crowdOrBoss(g, 260),
    fire(g) {
      const p = g.player;
      const count = 3 + p.stats.guard + (p.meta.guardBonus ?? 0);
      const life = 10 + 1.5 * p.stats.guard + (p.meta.tongsolLife ?? 0);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rand(-0.2, 0.2);
        const ring = 40 + (i % 2) * 22;
        const x = p.x + Math.cos(a) * ring, y = p.y + Math.sin(a) * ring;
        g.allies.push({ kind: 'soldier', x, y, r: 11, life, maxLife: life, cd: rand(0, 0.4), facing: a });
        g.fx.push({ type: 'puff', x, y, t: 0, life: 0.5, size: 18, tone: 'light' });
      }
      g.banner(`통솔 — 고려 창병 ${count}명 합류`, 'small');
      g.sfx('horn');
    },
  },

  // 견훤 — 정면 140° 거대 참격, 넉백 + 기절. 패기 궁극기(후백제의 패왕):
  // 되베기 한 번 더 + 정면으로 뻗는 붉은 충격파.
  paewang: {
    name: '패왕의 일격',
    worth: (g) => crowdOrBoss(g, 240 * g.player.stats.area * g.player.stats.specialArea),
    fire(g) {
      const p = g.player;
      const lv = currentWeaponLevel(p);
      const target = g.nearestEnemy(p.x, p.y, 320);
      const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facing;
      p.facing = aim;
      const dmg = Math.max(lv.damage, 30) * 4 * p.stats.might * p.stats.specialMul;
      const range = 240 * p.stats.area * p.stats.specialArea;
      const stun = 0.8 + p.stats.specialStun;
      hitArc(g, p.x, p.y, aim, range, 160, dmg, 320, 'paewang', { stun });
      g.shake(10);
      g.sfx('paewang');
      const U = (p.upgrades.fury ?? 0) >= FURY_LV.length ? FURY_LV.at(-1).strike : null;
      if (!U) {
        g.banner('패왕의 일격', 'small');
        return;
      }
      g.banner('패왕 진격', 'small');
      g.ultFlash('220, 50, 40', 0.3, 0.4);
      g.later(U.gap, () => {
        if (g.state !== 'play') return;
        hitArc(g, p.x, p.y, aim, range, 160, dmg * U.mul, 320, 'paewang', { stun });
        const W = U.wave;
        g.projectiles.push({
          team: 'player', kind: 'redSlash', x: p.x + Math.cos(aim) * 30, y: p.y + Math.sin(aim) * 30,
          vx: Math.cos(aim) * W.speed, vy: Math.sin(aim) * W.speed,
          r: W.thick, span: W.span * p.stats.area * p.stats.specialArea, big: true,
          damage: dmg * W.mul, knockback: 200, life: W.life, pierce: Infinity, hit: new Set(), angle: aim, stun,
        });
        g.shake(14);
        g.sfx('paewang');
      });
    },
  },

  // 궁예 — 관심법: 주변의 일반 병사를 홀려 서로 싸우게 한다 (적장은 홀리지 못함)
  gwansim: {
    name: '관심법',
    // Enough soldiers it can actually sway (never the general).
    worth: (g) => {
      const p = g.player;
      const L = GWANSIM[Math.min(GWANSIM.length - 1, p.upgrades.gwansim ?? 0)];
      return foesNear(g, 340 * p.stats.specialArea, (e) => !e.isBoss && (e.def.tier ?? 1) + (e.elite ? 1 : 0) <= L.tier) >= Math.min(MOMENTUM.crowd, L.count);
    },
    fire(g) {
      const p = g.player;
      const L = GWANSIM[Math.min(GWANSIM.length - 1, p.upgrades.gwansim ?? 0)];
      const R = 340 * p.stats.specialArea;
      const picks = [];
      g.grid.query(p.x, p.y, R, (e) => {
        if (e.dead || e.isBoss || e.def.behavior === 'static' || g.isCharmed(e)) return;
        const tier = (e.def.tier ?? 1) + (e.elite ? 1 : 0);
        if (tier > L.tier) return;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > R * R) return;
        picks.push(e);
      });
      // The strongest eligible soldiers turn first.
      picks.sort((a, b) => b.maxHp - a.maxHp);
      const chosen = picks.slice(0, L.count);
      for (const e of chosen) {
        e.charmUntil = g.time + L.duration;
        e.charmPower = L.power;
        e.hp = e.maxHp;
        g.fx.push({ type: 'eye', x: e.x, y: e.y - e.r - 6, t: 0, life: 0.9, follow: e, size: 9 });
      }
      g.fx.push({ type: 'eye', x: p.x, y: p.y, t: 0, life: 1.1, follow: p, size: 40, big: true });
      // 독심 관심법: a violet wave under a great eye in the sky.
      if (L.evolution) {
        g.fx.push({ type: 'mindWave', x: p.x, y: p.y, range: R, t: 0, life: 1.2, seed: Math.random() });
        g.ultFlash('150, 80, 220', 0.32, 0.45);
      }
      g.banner(chosen.length ? `관심법 — ${chosen.length}명이 서로를 벤다` : '관심법 — 홀릴 자가 없다', 'small');
      g.sfx('gwansim');
      // Nothing to sway: keep most of the gauge instead of wasting it.
      if (!chosen.length) p.momentum = 70;
    },
  },
};
