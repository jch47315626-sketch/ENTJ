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

/**
 * 신숭겸 (왕건's summon skill, gained from level-ups). He stands where he is
 * called, draws every regular soldier within `lure` to himself and takes the
 * blows meant for the king. He falls when his HP or time runs out; at the
 * last tier his fall is an explosion. HP grows with stage time.
 */
export const SHIN = [
  { name: '신숭겸', cooldown: 24, hp: 140, lure: 300, duration: 12, damage: 14,
    desc: '왕의 갑옷을 입은 신숭겸을 부른다. 주변 적이 그에게 달려든다.' },
  { name: '신숭겸 · 결사', cooldown: 21, hp: 200, lure: 340, duration: 13, damage: 18,
    desc: '더 오래 버티고, 더 먼 곳의 적까지 끌어모은다.' },
  { name: '신숭겸 · 충의', cooldown: 18, hp: 270, lure: 380, duration: 14, damage: 22,
    desc: '더 자주 나타나고 더 단단하다.' },
  { name: '신숭겸 · 순절', cooldown: 16, hp: 340, lure: 420, duration: 15, damage: 26, evolution: true,
    explode: { radius: 190, damage: 260, stun: 1.2 },
    requires: { upgrade: 'guard', level: 3 },
    desc: '쓰러질 때 폭탄처럼 터져 주변 적을 날려 버린다.' },
];
