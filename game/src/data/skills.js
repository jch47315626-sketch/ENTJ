/**
 * 관심법 (궁예's momentum skill) by skill level. Skill level is 1 plus the
 * '관심법' upgrade level. `tier` is the strongest EnemyDef.tier it can sway
 * (1: 창병·궁수·해적, 2: + 기마병·방패병, 3: + 철갑병·정예). Bosses never.
 */
export const GWANSIM = [
  { count: 3, tier: 1, duration: 7, power: 1 },
  { count: 5, tier: 1, duration: 8, power: 1.25 },
  { count: 6, tier: 2, duration: 9, power: 1.5 },
  { count: 8, tier: 2, duration: 10, power: 1.75 },
  { count: 10, tier: 3, duration: 11, power: 2 },
];

export const TIER_NAMES = { 2: '기마병·방패병', 3: '철갑병·정예 병사' };
