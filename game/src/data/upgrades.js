import { WEAPONS } from './weapons.js';

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
    id: 'guard', name: '친위대', category: '병법', maxLevel: 5, weight: 10,
    describe: () => '통솔로 부르는 창병 +1, 머무는 시간 +2초',
    apply: (g) => g.player.recalc(),
  },
  {
    id: 'archers', name: '궁수대', category: '병법', maxLevel: 3, weight: 8,
    describe: () => '곁을 따르며 활을 쏘는 아군 궁수 +1',
    apply: (g) => g.syncArcherAllies(),
  },
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

/** Human-readable requirement for the next evolution, or null. */
export function evolutionHint(g) {
  const next = nextWeaponLevel(g);
  if (!next?.requires || canUpgradeWeapon(g)) return null;
  const up = UPGRADES.find((u) => u.id === next.requires.upgrade);
  return `${next.name}: ${up.name} Lv${next.requires.level} 필요`;
}
