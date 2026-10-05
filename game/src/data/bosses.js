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
      { type: 'fan', windup: 0.5, count: 5, spread: 50, speed: 300, damage: 12, kind: 'hook' },
      { type: 'chase', time: 1.8 },
      { type: 'dash', windup: 0.6, speed: 600, distance: 380, damage: 22, repeat: 2 },
    ],
    summons: [
      { atHpRatio: 0.66, enemy: 'bandit', count: 6, banner: '능창이 졸개들을 부른다!' },
      { atHpRatio: 0.33, enemy: 'bandit', count: 8, banner: '해적들이 갯벌에서 솟아오른다!' },
    ],
    enrage: { below: 0.4, speedMul: 1.3, cooldownMul: 0.7, banner: '능창이 격노했다!' },
  },

  gyeonhwon: {
    id: 'gyeonhwon',
    name: '견훤',
    hanja: '甄萱',
    epithet: '후백제의 대왕',
    hp: 3200, speed: 78, radius: 32, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#6b2a22', accent: '#2e120e', hat: 'crown', weapon: 'greatsword', trim: '#d8b46a', skin: '#dcb58c' },
    patterns: [
      { type: 'chase', time: 2.0 },
      { type: 'spin', windup: 0.9, radius: 150, damage: 22 },
      { type: 'chase', time: 1.4 },
      { type: 'dash', windup: 0.7, speed: 540, distance: 420, damage: 24 },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.6, count: 7, spread: 70, speed: 320, damage: 11, kind: 'arrow' },
      { type: 'spin', windup: 0.7, radius: 165, damage: 22, repeat: 2 },
    ],
    summons: [
      { atHpRatio: 0.66, enemy: 'eliteArcher', count: 5, banner: '매복한 궁수들이 일어선다!' },
      { atHpRatio: 0.33, enemy: 'cavalry', count: 6, banner: '후백제 기병이 짓쳐 들어온다!' },
    ],
    enrage: { below: 0.35, speedMul: 1.2, cooldownMul: 0.8, banner: '견훤의 대도가 붉게 달아오른다!' },
  },
  shinsunggyeom: {
    id: 'shinsunggyeom',
    name: '신숭겸',
    hanja: '申崇謙',
    epithet: '왕의 갑옷을 입은 대역',
    hp: 3600, speed: 90, radius: 30, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'hero', weapon: 'shield', trim: '#c9a24a', plume: '#b3261e', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 1.8 },
      { type: 'dash', windup: 0.65, speed: 560, distance: 400, damage: 22 },
      { type: 'chase', time: 1.4 },
      { type: 'spin', windup: 0.7, radius: 130, damage: 22 },
      { type: 'chase', time: 1.2 },
      { type: 'dash', windup: 0.55, speed: 600, distance: 360, damage: 22, repeat: 3 },
    ],
    summons: [
      { atHpRatio: 0.6, enemy: 'shield', count: 6, banner: '고려 방패병이 장수를 감싼다!' },
    ],
    lastStand: { below: 0.3, time: 5, banner: '결사 — 신숭겸이 물러서지 않는다!' },
    enrage: { below: 0.3, speedMul: 1.2, cooldownMul: 0.75, banner: '' },
  },
};
