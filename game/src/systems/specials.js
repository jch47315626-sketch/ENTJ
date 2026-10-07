import { TAU, rand } from '../core/math.js';
import { hitArc, currentWeaponLevel } from './weapons.js';
import { GWANSIM } from '../data/skills.js';

/**
 * Hero special abilities (고유기). Fired automatically when the momentum
 * (기세) gauge fills.
 */
export const SPECIALS = {
  // 왕건 — 고려 창병 소환
  tongsol: {
    name: '통솔',
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

  // 견훤 — 정면 140° 거대 참격, 넉백 + 기절
  paewang: {
    name: '패왕의 일격',
    fire(g) {
      const p = g.player;
      const lv = currentWeaponLevel(p);
      const target = g.nearestEnemy(p.x, p.y, 320);
      const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facing;
      p.facing = aim;
      const dmg = Math.max(lv.damage, 30) * 4 * p.stats.might * p.stats.specialMul;
      hitArc(g, p.x, p.y, aim, 240 * p.stats.area * p.stats.specialArea, 160, dmg, 320, 'paewang', { stun: 0.8 + p.stats.specialStun });
      g.shake(10);
      g.banner('패왕의 일격', 'small');
      g.sfx('paewang');
    },
  },

  // 궁예 — 관심법: 주변의 일반 병사를 홀려 서로 싸우게 한다 (적장은 홀리지 못함)
  gwansim: {
    name: '관심법',
    fire(g) {
      const p = g.player;
      const base = GWANSIM[Math.min(GWANSIM.length - 1, p.upgrades.gwansim ?? 0)];
      const m = p.meta;
      const L = {
        ...base,
        count: base.count + (m.gwansimCount ?? 0),
        duration: base.duration + (m.gwansimDur ?? 0),
        tier: m.gwansimAllTiers ? 99 : base.tier,
      };
      const picks = [];
      g.grid.query(p.x, p.y, 340, (e) => {
        if (e.dead || e.isBoss || e.def.behavior === 'static' || g.isCharmed(e)) return;
        const tier = (e.def.tier ?? 1) + (e.elite ? 1 : 0);
        if (tier > L.tier) return;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > 340 * 340) return;
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
      g.banner(chosen.length ? `관심법 — ${chosen.length}명이 서로를 벤다` : '관심법 — 홀릴 자가 없다', 'small');
      g.sfx('gwansim');
      // Nothing to sway: keep most of the gauge instead of wasting it.
      if (!chosen.length) p.momentum = 70;
    },
  },
};
