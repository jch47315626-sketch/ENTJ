import { SHIN, HORSE, CHAIN } from '../data/skills.js';
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
      const hp = L.hp * (0.6 + 0.4 * enemyHpScale(g.time)) * (1 + (p.meta.shinHpMul ?? 0));
      g.allies.push({
        kind: 'shin', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, r: 15,
        hp, maxHp: hp, life: L.duration, maxLife: L.duration, lure: L.lure,
        damage: L.damage * (1 + (p.meta.allyMul ?? 0)), explode: L.explode, cd: 0.5, facing: a,
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
      p.mount = { until: g.time + L.duration, invulnUntil: g.time + L.invuln + (p.meta.horseInvul ?? 0), L, drop: 0 };
      g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.6, size: 30, tone: 'mud' });
      g.banner(`${L.name} — 말에 오른다`, 'small');
      g.sfx('gallop');
    },
  },
};

// 견훤 — 철쇄: ranged soldiers are hooked and dragged to his feet.
ACTIVE_SKILLS.chain = {
  levels: CHAIN,
  fire(g, L) {
    const p = g.player;
    const pool = g.enemies.filter((e) => !e.dead && !e.isBoss && !e.pull && !g.isCharmed(e) && L.targets.includes(e.def.id)
      && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < L.range * L.range);
    // Nothing to hook: look again shortly instead of wasting the cooldown.
    if (!pool.length) return 1;
    pool.sort((a, b) => ((b.x - p.x) ** 2 + (b.y - p.y) ** 2) - ((a.x - p.x) ** 2 + (a.y - p.y) ** 2));
    for (const e of pool.slice(0, L.count + (p.meta.chainBonus ?? 0))) e.pull = { stun: L.stun, slam: L.slam };
    g.sfx('chain');
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
    // Builds can shorten a skill's cooldown (e.g. horseCd from 기마의 길).
    const cooldown = L.cooldown * (1 - (p.meta[`${id}Cd`] ?? 0));
    p.skillTimers[id] = (p.skillTimers[id] ?? cooldown) - dt;
    if (p.skillTimers[id] <= 0) {
      p.skillTimers[id] = cooldown;
      // A skill may return a shorter wait (e.g. no valid target yet).
      const wait = skill.fire(g, L);
      if (typeof wait === 'number') p.skillTimers[id] = wait;
    }
  }
}
