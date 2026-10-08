/**
 * 전장 아이템: special things that may drop near the hero once in a battle.
 * Each is rolled at the start (its own chance) and dropped at a random time
 * before the boss; it must be walked onto, like the 감나무 가지.
 *   🪤 함정    — sets a great trap where you stand; 5 s later it blows up
 *                everything in a wide ring (about 50 soldiers' worth).
 *   🍖 노루고기 — half of max health back.
 *   🛢️ 등유    — for 3 s, every step leaves fire that lasts 10 s and burns
 *                foes (only foes) for twice the hero's attack each second.
 * In 무한 전장 the roll is made again every 5 minutes.
 */
import { rand, TAU } from '../core/math.js';
import { currentWeaponLevel } from './weapons.js';

export const FIELD_ITEMS = {
  trap: { icon: '🪤', name: '함정', chance: 0.2, banner: '🪤 함정이 떨어졌다! 주우면 그 자리에 큰 함정을 설치해요' },
  venison: { icon: '🍖', name: '노루고기', chance: 0.4, banner: '🍖 노루고기가 떨어졌다! 먹으면 체력 절반 회복' },
  kerosene: { icon: '🛢️', name: '등유', chance: 0.5, banner: '🛢️ 등유가 떨어졌다! 주우면 3초 동안 지나간 길에 불길' },
};
export const ITEM_LIFE = 40; // seconds an item waits on the ground
export const BIG_TRAP = { fuse: 5, radius: 330, hpShare: 0.6, flat: 300, bossShare: 0.08 };
export const KEROSENE = { time: 3, fireLife: 10, radius: 30, every: 0.07, mul: 2 };

/** Rolls which items drop in the window [from, to] and when. */
function plan(g, from, to) {
  for (const [id, it] of Object.entries(FIELD_ITEMS)) {
    if (Math.random() < it.chance) g.itemPlan.push({ id, at: rand(from, to) });
  }
  g.itemPlan.sort((a, b) => a.at - b.at);
}

export function planFieldItems(g) {
  g.itemPlan = [];
  g.bigTraps = [];
  g.itemWindow = 0;
  const end = Math.max(90, (g.stage.bossAt ?? 300) - 20);
  plan(g, 40, end);
}

export function updateFieldItems(g, dt) {
  const p = g.player;
  // 무한 전장: a fresh roll for every 5 minutes survived.
  if (g.stage.endless && g.time > (g.itemWindow + 1) * 300) {
    g.itemWindow++;
    plan(g, g.itemWindow * 300 + 20, g.itemWindow * 300 + 280);
  }
  while (g.itemPlan.length && g.time >= g.itemPlan[0].at) {
    const { id } = g.itemPlan.shift();
    const a = rand(0, TAU), d = rand(170, 260);
    g.pickups.push({ kind: 'item', item: id, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, magnet: false, t: 0 });
    g.banner(FIELD_ITEMS[id].banner, 'crow');
    g.sfx('pick');
  }
  // 등유: the trail of fire behind the hero.
  if (p.keroseneUntil > g.time && p.moving) {
    p.keroDrop = (p.keroDrop ?? 0) - dt;
    if (p.keroDrop <= 0) {
      p.keroDrop = KEROSENE.every;
      const K = KEROSENE;
      const dps = Math.max(currentWeaponLevel(p).damage, 20) * p.stats.might * K.mul;
      g.zones.push({ team: 'player', kind: 'kero', x: p.x, y: p.y, r: K.radius * p.stats.area, dps, life: K.fireLife, t: 0 });
    }
  }
  // 함정: count down, then blow up the ring.
  for (const t of g.bigTraps) {
    t.t -= dt;
    if (t.t > 0) continue;
    t.done = true;
    blowTrap(g, t);
  }
  g.bigTraps = g.bigTraps.filter((t) => !t.done);
}

/** Walked onto an item. */
export function takeFieldItem(g, k) {
  const p = g.player;
  if (k.item === 'trap') {
    g.bigTraps.push({ x: p.x, y: p.y, t: BIG_TRAP.fuse, fuse: BIG_TRAP.fuse, r: BIG_TRAP.radius });
    g.banner(`🪤 함정 설치! ${BIG_TRAP.fuse}초 뒤 폭발 — 적을 끌어들여라`, 'small');
    g.sfx('dig');
  } else if (k.item === 'venison') {
    const before = p.hp;
    p.heal(p.stats.maxHp * 0.5);
    g.texts.push({ x: p.x, y: p.y - 30, v: `🍖 +${Math.round(p.hp - before)}`, t: 0, life: 1.1, heal: true });
    g.sfx('heal');
  } else if (k.item === 'kerosene') {
    p.keroseneUntil = g.time + KEROSENE.time;
    g.banner('🛢️ 등유를 뿌린다 — 3초 동안 달려라!', 'small');
    g.sfx('firePot');
  }
  g.runStats.items = (g.runStats.items ?? 0) + 1;
}

function blowTrap(g, t) {
  const p = g.player;
  const B = BIG_TRAP;
  let n = 0;
  for (const e of g.enemies) {
    if (e.dead || e.hidden || e.def.behavior === 'static' || g.isCharmed(e)) continue;
    if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 > (t.r + e.r) ** 2) continue;
    const dmg = (e.isBoss ? e.maxHp * B.bossShare : e.maxHp * B.hpShare) + B.flat * p.stats.might;
    g.damageEnemy(e, dmg, t.x, t.y, 260);
    n++;
  }
  g.fx.push({ type: 'smash', x: t.x, y: t.y, range: t.r, t: 0, life: 1 });
  g.fx.push({ type: 'puff', x: t.x, y: t.y, t: 0, life: 0.8, size: 60, tone: 'mud' });
  g.shake(18);
  g.sfx('blast');
  g.banner(n ? `💥 함정 폭발! 적 ${n}명이 휘말렸다` : '💥 함정 폭발! …아무도 없었다', 'small');
}
