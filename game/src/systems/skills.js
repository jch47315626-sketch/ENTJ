import { SHIN, HORSE } from '../data/skills.js';
import { enemyHpScale } from '../data/balance.js';
import { rand } from '../core/math.js';

/**
 * Cooldown skills gained from level-ups (separate from the momentum
 * special). Keyed by the upgrade id that grants them.
 */
export const ACTIVE_SKILLS = {
  shin: {
    levels: SHIN,
    fire(g, L) {
      const p = g.player;
      // He steps out a little ahead of the king.
      const a = p.facing + rand(-0.4, 0.4);
      const hp = L.hp * (0.6 + 0.4 * enemyHpScale(g.time));
      g.allies.push({
        kind: 'shin', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, r: 15,
        hp, maxHp: hp, life: L.duration, maxLife: L.duration, lure: L.lure,
        damage: L.damage, explode: L.explode, cd: 0.5, facing: a,
      });
      g.fx.push({ type: 'puff', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, t: 0, life: 0.6, size: 26, tone: 'light' });
      g.banner('신숭겸 — 왕의 깃발 아래로 모여라!', 'small');
      g.sfx('shin');
    },
  },

  horse: {
    levels: HORSE,
    fire(g, L) {
      const p = g.player;
      p.mount = { until: g.time + L.duration, invulnUntil: g.time + L.invuln, L, drop: 0 };
      g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.6, size: 30, tone: 'mud' });
      g.banner(`${L.name} — 말에 오른다`, 'small');
      g.sfx('gallop');
    },
  },
};

/** Counts down each owned skill and casts it when ready. */
export function updateSkills(g, dt) {
  const p = g.player;
  for (const id in ACTIVE_SKILLS) {
    const lv = p.upgrades[id];
    if (!lv) continue;
    const skill = ACTIVE_SKILLS[id];
    const L = skill.levels[lv - 1];
    p.skillTimers[id] = (p.skillTimers[id] ?? L.cooldown) - dt;
    if (p.skillTimers[id] <= 0) {
      p.skillTimers[id] = L.cooldown;
      skill.fire(g, L);
    }
  }
}
