/**
 * 전장 오브젝트: breakable things that turn up near the hero every so often.
 * They are `static` enemies (like the supply cart) so any blow breaks them;
 * what happens when one breaks is decided here by its `object` kind.
 *   기름 항아리 — bursts into a pool of fire that burns nearby foes.
 *   전고 — the war drum: faster swings and steps for a while.
 *   서낭당 돌탑 — a cairn of offerings: health back and a surge of 기세.
 */
import { rand, TAU } from '../core/math.js';
import { hitArc } from './weapons.js';
import { MOMENTUM } from '../data/heroes.js';

export const FIELD_OBJECTS = {
  every: [20, 30], // seconds between drops
  first: 18,
  max: 3, // on the field at once
  weights: { oilJar: 45, warDrum: 30, shrine: 25 },
  oil: { burst: 40, radius: 95, dps: 30, life: 5 },
  drum: { time: 12, haste: 0.25, speed: 0.2 },
  shrine: { heal: 0.2, momentum: 0.5 },
};

const pick = (w) => {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, v] of Object.entries(w)) if ((r -= v) < 0) return k;
  return Object.keys(w)[0];
};

export function updateFieldObjects(g, dt) {
  const F = FIELD_OBJECTS;
  const p = g.player;
  // The drum's beat wears off.
  if (p.drumUntil && g.time >= p.drumUntil) {
    p.drumUntil = 0;
    p.recalc();
  }
  if (g.boss || g.stage.difficulty.noObjects) return; // none during a boss fight, or under 황무지
  g.objectTimer = (g.objectTimer ?? F.first) - dt;
  if (g.objectTimer > 0) return;
  g.objectTimer = rand(F.every[0], F.every[1]);
  if (g.enemies.filter((e) => !e.dead && e.def.object).length >= F.max) return;
  const a = rand(0, TAU), d = rand(230, 360);
  g.spawnEnemy(pick(F.weights), p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
}

/** Called when a field object is broken. */
export function breakObject(g, e) {
  const F = FIELD_OBJECTS;
  const p = g.player;
  if (e.def.object === 'oil') {
    const m = p.stats.might;
    hitArc(g, e.x, e.y, 0, F.oil.radius, 360, F.oil.burst * m, 120, 'burst');
    g.zones.push({ team: 'player', kind: 'fire', x: e.x, y: e.y, r: F.oil.radius, dps: F.oil.dps * m, life: F.oil.life, t: 0 });
    g.shake(6);
    g.sfx('firePot');
    g.texts.push({ x: e.x, y: e.y - 30, v: '🔥 불바다!', t: 0, life: 1.1, order: true });
  } else if (e.def.object === 'drum') {
    p.drumUntil = g.time + F.drum.time;
    p.recalc();
    g.sfx('drumRoll');
    g.banner(`🥁 둥! 둥! 전고 — ${F.drum.time}초 동안 공격과 발이 빨라진다`, 'small');
  } else if (e.def.object === 'shrine') {
    const before = p.hp;
    p.heal(p.stats.maxHp * F.shrine.heal);
    g.addMomentum(MOMENTUM.max * F.shrine.momentum);
    g.sfx('heal');
    g.texts.push({ x: p.x, y: p.y - 30, v: `+${Math.round(p.hp - before)}`, t: 0, life: 0.9, heal: true });
    g.banner('🪨 서낭당의 가호 — 체력 회복, 기세가 차오른다', 'small');
  }
  g.runStats.objects = (g.runStats.objects ?? 0) + 1;
}
