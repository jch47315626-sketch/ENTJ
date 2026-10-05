/**
 * Bosses. `patterns` are cycled in order; each `type` is a routine in
 * systems/bossAI.js. All patterns show a telegraph before they hit.
 */
export const BOSSES = {
  neungchang: {
    id: 'neungchang',
    name: '수달 능창',
    hanja: '水獺 能昌',
    epithet: '압해도의 해적 두령',
    hp: 2400, speed: 85, radius: 30, damage: 15, knockResist: 0.92, xp: 0,
    look: { body: '#3e5560', accent: '#1d2a30', hat: 'pirateBoss', weapon: 'hook' },
    patterns: [
      { type: 'chase', time: 2.2 },
      { type: 'dash', windup: 0.75, speed: 560, distance: 440, damage: 22 },
      { type: 'chase', time: 1.6 },
      { type: 'hookFan', windup: 0.5, count: 5, spread: 50, speed: 300, damage: 12 },
      { type: 'chase', time: 1.8 },
      { type: 'dash', windup: 0.6, speed: 600, distance: 380, damage: 22, repeat: 2 },
    ],
    summons: [
      { atHpRatio: 0.66, enemy: 'bandit', count: 6, banner: '능창이 졸개들을 부른다!' },
      { atHpRatio: 0.33, enemy: 'bandit', count: 8, banner: '해적들이 갯벌에서 솟아오른다!' },
    ],
    enrage: { below: 0.4, speedMul: 1.3, cooldownMul: 0.7, banner: '능창이 격노했다!' },
  },
};
