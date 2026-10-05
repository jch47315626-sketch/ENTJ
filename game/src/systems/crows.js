/**
 * 까마귀: 2–3 times a run a 감 (persimmon) branch drops somewhere near the
 * hero. Picking it up calls a crow that flies around for a while and brings
 * back every 엽전 lying on the field.
 */
import { rand, TAU } from '../core/math.js';

export const CROW = {
  life: 40, // seconds a crow keeps working
  speed: 430,
  feedLife: 45, // seconds the branch stays on the ground
};

/** When the branches drop: 2–3 times, spread over the run before the boss. */
export function planCrows(g) {
  const n = Math.random() < 0.5 ? 2 : 3;
  const end = Math.max(90, (g.stage.bossAt ?? 300) - 15);
  const span = (end - 35) / n;
  g.crowPlan = Array.from({ length: n }, (_, i) => 35 + span * i + rand(0, span * 0.6));
  g.crows = [];
}

export function updateCrows(g, dt) {
  const p = g.player;
  while (g.crowPlan.length && g.time >= g.crowPlan[0]) {
    g.crowPlan.shift();
    const a = rand(0, TAU), d = rand(170, 260);
    g.pickups.push({ kind: 'crowFeed', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, magnet: false, t: 0 });
    g.banner('🐦‍⬛ 감나무 가지가 떨어졌다! 주우면 까마귀가 엽전을 물어 와요');
  }
  for (const c of g.crows) {
    c.t += dt;
    c.flap += dt * 14;
    const leaving = c.t > CROW.life;
    // Target: the nearest coin to the crow; otherwise circle above the hero.
    let tx = p.x + Math.cos(c.t * 1.6 + c.seed) * 70, ty = p.y - 50 + Math.sin(c.t * 1.6 + c.seed) * 40;
    if (leaving) {
      tx = c.x + 600;
      ty = c.y - 600;
    } else if (c.carry) {
      tx = p.x;
      ty = p.y - 10;
    } else {
      let best = null, bd = Infinity;
      for (const k of g.pickups) {
        if (k.kind !== 'coin' || k.taken || k.magnet) continue;
        const d2 = (k.x - c.x) ** 2 + (k.y - c.y) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = k;
        }
      }
      if (best) {
        tx = best.x;
        ty = best.y;
        if (bd < 14 * 14) {
          best.taken = true;
          c.carry = best.value;
        }
      }
    }
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, CROW.speed * dt);
    c.x += (dx / d) * step;
    c.y += (dy / d) * step;
    c.facing = dx < 0 ? -1 : 1;
    // Hand the coin over once back at the hero.
    if (c.carry && d < 26) {
      g.gainXp(c.carry);
      g.sfx('coin');
      c.carry = 0;
    }
  }
  g.crows = g.crows.filter((c) => c.t < CROW.life + 2);
}

/** The hero picked up a branch. */
export function callCrow(g, x, y) {
  g.crows.push({ x, y: y - 40, t: 0, flap: 0, seed: rand(0, TAU), carry: 0, facing: 1 });
  g.sfx('levelup');
  g.texts.push({ x, y: y - 30, v: '까마귀!', t: 0, life: 1, heal: true });
}
