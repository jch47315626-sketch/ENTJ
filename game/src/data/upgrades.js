import { WEAPONS } from './weapons.js';
import { GWANSIM, TIER_NAMES, SHIN, HORSE, CHAIN, TIGER, MAGUNI_LV } from './skills.js';

/**
 * Level-up choices (책략). `apply` runs after the level has been increased,
 * so player.upgrades[id] already holds the new level.
 * Categories: 무예 (weapon), 병법 (troops), 지세 (field), 보급 (fallback).
 */
export const UPGRADES = [
  {
    id: 'weapon', category: '무예', maxLevel: 99, weight: 20,
    name: (g) => nextWeaponLevel(g)?.name ?? '주무기 단련',
    describe: (g) => nextWeaponLevel(g)?.desc ?? '',
    isEvolution: (g) => !!nextWeaponLevel(g)?.evolution,
    available: (g) => canUpgradeWeapon(g),
    apply: (g) => {
      g.player.weapon.level += 1;
      g.player.weapon.timer = 0;
    },
  },
  subWeapon('vajra', ['gungye']),
  {
    id: 'might', name: '연마', category: '무예', maxLevel: 5, weight: 10,
    describe: () => '모든 공격 피해 +15%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'haste', name: '속공', category: '무예', maxLevel: 5, weight: 10,
    describe: () => '공격 재사용 시간 −10%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'area', name: '장병술', category: '무예', maxLevel: 5, weight: 9,
    describe: () => '공격 범위 +12%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'guard', name: '모병', category: '병법', maxLevel: 5, weight: 10, heroes: ['wanggeon'],
    describe: () => '통솔로 부르는 창병 +1, 머무는 시간 +2초',
    apply: (g) => g.player.recalc(),
  },
  // Build 책략: offered only when the matching skill-tree path is taken (`needs` = a meta key).
  {
    id: 'orderDrill', name: '군령 단련', category: '병법', maxLevel: 3, weight: 12, heroes: ['wanggeon'], needs: 'retinueSpear',
    describe: () => '🏯 군세가 더 자주 움직인다 — 모든 군령 주기 −10%',
    apply: () => {}, // read directly by the build systems
  },
  {
    id: 'rushDrill', name: '질풍참', category: '무예', maxLevel: 3, weight: 12, heroes: ['gyeonhwon'], needs: 'rush',
    describe: () => '⚔️ 연참이 더 자주 — 재사용 −12%, 연참 피해 +15%',
    apply: () => {}, // read directly by the build systems
  },
  {
    id: 'counterDrill', name: '역습', category: '무예', maxLevel: 3, weight: 12, heroes: ['gyeonhwon'], needs: 'counter',
    describe: () => '💥 반격이 더 세고 넓게 — 반격 피해 +25%, 범위 +10%',
    apply: () => {}, // read directly by the build systems
  },
  {
    id: 'focusDrill', name: '정신 통일', category: '무예', maxLevel: 3, weight: 12, heroes: ['gungye'], needs: 'focus',
    describe: () => '☄️ 법력이 더 빨리 모인다 — 집중 속도 +30%, 천안통 주기 −10%',
    apply: () => {}, // read directly by the build systems
  },
  {
    id: 'chaosDrill', name: '미혹', category: '병법', maxLevel: 3, weight: 12, heroes: ['gungye'], needs: 'chaosAura',
    describe: () => '🌀 혼란의 기운이 더 자주, 더 오래 — 주기 −12%, 홀림 +1초',
    apply: () => {}, // read directly by the build systems
  },
  skillUpgrade('shin', SHIN, ['wanggeon'], '병법', 14),
  skillUpgrade('horse', HORSE, ['wanggeon'], '지세', 13),
  skillUpgrade('chain', CHAIN, ['gyeonhwon'], '무예', 14),
  skillUpgrade('tiger', TIGER, ['gyeonhwon'], '무예', 13),
  {
    id: 'fury', name: '패기', category: '무예', maxLevel: 4, weight: 9, heroes: ['gyeonhwon'],
    describe: () => '패왕의 일격 피해 +30%, 기절 +0.2초',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'gwansim', name: '관심법', category: '병법', maxLevel: GWANSIM.length - 1, weight: 11, heroes: ['gungye'],
    describe: (g) => {
      const now = GWANSIM[g.player.upgrades.gwansim ?? 0];
      const next = GWANSIM[(g.player.upgrades.gwansim ?? 0) + 1];
      const parts = [`홀리는 적 ${now.count} → ${next.count}명`, `${next.duration}초`, `홀린 적의 공격력 ×${next.power}`];
      if (next.tier > now.tier) parts.unshift(`${TIER_NAMES[next.tier]}도 홀린다`);
      return parts.join(', ');
    },
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'archers', name: '궁수대', category: '병법', maxLevel: 3, weight: 8, heroes: ['wanggeon'],
    describe: () => '곁을 따르며 활을 쏘는 아군 궁수 +1',
    apply: (g) => g.syncArcherAllies(),
  },
  skillUpgrade('maguni', MAGUNI_LV, ['gungye'], '병법', 10),
  {
    id: 'momentum', name: '기세', category: '병법', maxLevel: 3, weight: 7,
    describe: () => '기세 충전 속도 +25%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'swift', name: '질풍보', category: '지세', maxLevel: 4, weight: 9,
    describe: () => '이동 속도 +8%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'vitality', name: '강건', category: '지세', maxLevel: 5, weight: 9,
    describe: () => '최대 체력 +25, 즉시 25 회복',
    apply: (g) => {
      g.player.recalc();
      g.player.heal(25);
    },
  },
  {
    id: 'caltrops', name: '마름쇠', category: '지세', maxLevel: 3, weight: 7,
    describe: () => '주변 적의 이동 속도 −15%',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'magnet', name: '수습', category: '지세', maxLevel: 3, weight: 7,
    describe: () => '엽전을 끌어오는 거리 +35%',
    apply: (g) => g.player.recalc(),
  },
];

/** Offered only when nothing else is left. */
export const FALLBACKS = [
  { id: 'riceball', name: '주먹밥', category: '보급', maxLevel: Infinity, describe: () => '체력 30 회복', apply: (g) => g.player.heal(30) },
  { id: 'coinPouch', name: '엽전 꾸러미', category: '보급', maxLevel: Infinity, describe: () => '공훈 25 획득', apply: (g) => g.gainXp(25) },
];

/** Level-up entry that grants a cooldown skill (systems/skills.js), then grows it. */
function skillUpgrade(id, levels, heroes, category, weight) {
  const next = (g) => levels[g.player.upgrades[id] ?? 0];
  return {
    id, category, maxLevel: levels.length, weight, heroes, skill: true, title: levels[0].name,
    name: (g) => next(g)?.name ?? levels[0].name,
    ownedName: (g) => levels[(g.player.upgrades[id] ?? 1) - 1].name,
    describe: (g) => next(g)?.desc ?? '',
    isEvolution: (g) => !!next(g)?.evolution,
    available: (g) => {
      const n = next(g);
      if (!n) return false;
      return !n.requires || (g.player.upgrades[n.requires.upgrade] ?? 0) >= n.requires.level;
    },
    apply: (g) => {
      // Comes into play soon after being chosen, then on its own cooldown.
      g.player.skillTimers[id] = Math.min(g.player.skillTimers[id] ?? 2, 2);
    },
  };
}

/** Level-up entry that grants a hero's second weapon, then grows it. */
function subWeapon(id, heroes) {
  const W = WEAPONS[id];
  const lvl = (g) => g.player.upgrades[id] ?? 0;
  const next = (g) => W.levels[lvl(g)];
  return {
    id, category: '무예', maxLevel: W.levels.length, weight: 16, heroes, subWeapon: true, title: W.levels[0].name,
    name: (g) => next(g)?.name ?? W.levels[0].name,
    describe: (g) => next(g)?.desc ?? '',
    isEvolution: (g) => !!next(g)?.evolution,
    available: (g) => {
      const n = next(g);
      if (!n) return false;
      return !n.requires || (g.player.upgrades[n.requires.upgrade] ?? 0) >= n.requires.level;
    },
    apply: (g) => g.player.syncSubWeapons(),
  };
}

function nextWeaponLevel(g) {
  const w = g.player.weapon;
  return WEAPONS[w.id].levels[w.level + 1];
}

function canUpgradeWeapon(g) {
  const next = nextWeaponLevel(g);
  if (!next) return false;
  if (!next.requires) return true;
  return (g.player.upgrades[next.requires.upgrade] ?? 0) >= next.requires.level;
}

/** Skill lines that end in a 궁극기 (data/skills.js). */
const SKILL_LINES = { shin: SHIN, horse: HORSE, chain: CHAIN, tiger: TIGER, maguni: MAGUNI_LV };

const upTitle = (id) => {
  const u = UPGRADES.find((x) => x.id === id);
  return u?.title ?? (typeof u?.name === 'string' ? u.name : id);
};

/** A hero's three 궁극기 for the hero screen: [{ name, from, need, desc }]. */
export function heroUltimates(hero) {
  const out = [];
  const add = (levels, from) => {
    const E = levels.findIndex((l) => l?.evolution);
    if (E < 0) return;
    const evo = levels[E];
    const need = [`${from} ${E}단계`];
    if (evo.requires) need.push(`${upTitle(evo.requires.upgrade)} Lv${evo.requires.level}`);
    out.push({ name: evo.name, from, need, desc: evo.desc });
  };
  add(WEAPONS[hero.weapon].levels, `${WEAPONS[hero.weapon].levels[0].name}(주무기)`);
  for (const id of hero.subWeapons ?? []) add(WEAPONS[id].levels, WEAPONS[id].levels[0].name);
  for (const [id, L] of Object.entries(SKILL_LINES)) {
    if (UPGRADES.find((u) => u.id === id)?.heroes?.includes(hero.id)) add(L, L[0].name);
  }
  return out;
}

/**
 * Checklist for every evolution the hero can still reach in this battle:
 * [{ name, checks: [{ id, label, now, need, done }], ready }] (`id`: the 책략 that raises it). An evolution
 * appears once its item is owned and disappears after it happens.
 */
export function evolutionStatus(g) {
  const p = g.player;
  const list = [];
  const upName = (id) => {
    const u = UPGRADES.find((x) => x.id === id);
    return u?.title ?? (typeof u?.name === 'function' ? u.name(g) : u?.name ?? id);
  };
  // `levels`: the item's level table; `have`: levels already taken (1 = first level).
  const add = (id, levels, have, label) => {
    const E = levels.findIndex((l) => l?.evolution);
    if (E < 0 || have > E) return;
    const evo = levels[E];
    const checks = [{ id, label, now: Math.min(have, E), need: E, done: have >= E }];
    if (evo.requires) {
      const now = p.upgrades[evo.requires.upgrade] ?? 0;
      checks.push({ id: evo.requires.upgrade, label: upName(evo.requires.upgrade), now: Math.min(now, evo.requires.level), need: evo.requires.level, done: now >= evo.requires.level });
    }
    list.push({ name: evo.name, checks, ready: checks.every((c) => c.done), owned: have > 0 });
  };
  const W = WEAPONS[p.weapon.id].levels;
  add('weapon', W, p.weapon.level + 1, W[0].name);
  // Every 궁극기 the hero can reach shows from the start (dim until its 책략 is taken).
  for (const id of p.hero.subWeapons ?? []) add(id, WEAPONS[id].levels, p.upgrades[id] ?? 0, WEAPONS[id].levels[0].name);
  for (const [id, L] of Object.entries(SKILL_LINES)) {
    if (!UPGRADES.find((u) => u.id === id)?.heroes?.includes(p.hero.id)) continue;
    add(id, L, p.upgrades[id] ?? 0, L[0].name);
  }
  return list;
}
