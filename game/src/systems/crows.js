/**
 * 까마귀: 2–3 times a run a 감 (persimmon) branch drops somewhere near the
 * hero. Picking it up calls a crow, and every 엽전 lying on the field at
 * that moment is brought to the hero at once.
 */
import { rand, TAU } from '../core/math.js';

export const CROW = {
  life: 3, // seconds the crow stays on screen
  feedLife: 45, // seconds the branch stays on the ground
};

/** When the branches drop: 2–3 times, spread over the run before the boss. */
export function planCrows(g) {
  const n = g.stage.difficulty.crowCount ?? (Math.random() < 0.5 ? 2 : 3);
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
    g.banner('🐦‍⬛ 까마귀가 나타났다!\n감나무 가지를 주우면 바닥의 엽전을 몽땅 물어 와요', 'crow');
    g.sfx('horn');
  }
  // The crow only circles the hero once and flies off; the coins are already on their way.
  for (const c of g.crows) {
    c.t += dt;
    c.flap += dt * 14;
    const a = c.seed + c.t * 3.2;
    const away = Math.max(0, c.t - CROW.life * 0.6) * 500;
    const tx = p.x + Math.cos(a) * 80 + away, ty = p.y - 40 + Math.sin(a) * 50 - away;
    c.facing = tx < c.x ? -1 : 1;
    c.x += (tx - c.x) * Math.min(1, dt * 8);
    c.y += (ty - c.y) * Math.min(1, dt * 8);
  }
  g.crows = g.crows.filter((c) => c.t < CROW.life);
}

/** The hero picked up a branch. */
export function callCrow(g, x, y) {
  g.crows.push({ x, y: y - 40, t: 0, flap: 0, seed: rand(0, TAU), facing: 1 });
  // Every 엽전 lying on the field right now flies to the hero.
  let n = 0;
  for (const k of g.pickups) {
    if (k.kind !== 'coin' || k.taken) continue;
    k.magnet = true;
    k.t = Math.max(k.t, 3); // pulled in fast, even from far away
    n++;
  }
  g.banner(n ? `🐦‍⬛ 까마귀가 엽전 ${n}개를 물어 왔다!` : '🐦‍⬛ 까마귀가 왔지만 주울 엽전이 없었다…', 'crow');
  g.runStats.crowCalls++;
  g.runStats.crowBest = Math.max(g.runStats.crowBest, n);
  g.sfx('levelup');
  g.texts.push({ x, y: y - 30, v: n ? `까마귀! 엽전 ${n}개` : '까마귀!', t: 0, life: 1.2, heal: true });
}
