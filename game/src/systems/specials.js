import { TAU, rand } from '../core/math.js';
import { hitArc, currentWeaponLevel } from './weapons.js';

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
      const count = 2 + p.stats.guard;
      const life = 12 + 2 * p.stats.guard;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rand(-0.2, 0.2);
        const x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 40;
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
      const dmg = Math.max(lv.damage, 30) * 6 * p.stats.might * p.stats.specialMul;
      hitArc(g, p.x, p.y, aim, 210 * p.stats.area, 140, dmg, 320, 'paewang', { stun: 0.8 + p.stats.specialStun });
      g.shake(10);
      g.banner('패왕의 일격', 'small');
      g.sfx('paewang');
    },
  },

  // 궁예 — 적이 가장 몰린 곳에 법륜 표식, 0.8초 뒤 폭발 + 둔화 지대
  mireuk: {
    name: '미륵의 심판',
    fire(g) {
      const p = g.player;
      const R = 140 * p.stats.area * p.stats.specialArea;
      const spot = densestSpot(g, R) ?? { x: p.x + Math.cos(p.facing) * 120, y: p.y + Math.sin(p.facing) * 120 };
      const dmg = Math.max(currentWeaponLevel(p).damage, 10) * 8 * p.stats.might * p.stats.specialMul;
      g.fx.push({ type: 'mark', x: spot.x, y: spot.y, range: R, t: 0, life: 0.8 });
      g.sfx('chant');
      g.later(0.8, () => {
        hitArc(g, spot.x, spot.y, 0, R, 360, dmg, 160, 'burst');
        g.zones.push({ team: 'player', kind: 'lotus', x: spot.x, y: spot.y, r: R, slow: 0.5, life: 3, t: 0 });
        g.shake(8);
        g.sfx('burst');
      });
      g.banner('미륵의 심판', 'small');
    },
  },
};

/** Picks the enemy position with the most neighbours inside radius R. */
function densestSpot(g, R) {
  const cands = g.enemies.filter((e) => !e.dead && e.def.behavior !== 'static');
  if (!cands.length) return null;
  let best = null, bestN = -1;
  const step = Math.max(1, Math.floor(cands.length / 40));
  for (let i = 0; i < cands.length; i += step) {
    const c = cands[i];
    if ((c.x - g.player.x) ** 2 + (c.y - g.player.y) ** 2 > 420 * 420) continue;
    let n = 0;
    g.grid.query(c.x, c.y, R, (e) => {
      if (!e.dead && (e.x - c.x) ** 2 + (e.y - c.y) ** 2 < R * R) n++;
    });
    if (n > bestN) {
      bestN = n;
      best = c;
    }
  }
  return best && { x: best.x, y: best.y };
}
