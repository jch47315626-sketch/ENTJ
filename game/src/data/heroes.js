/**
 * Playable heroes. `look` selects how render/sprites.js draws the hero;
 * `special` is a key in systems/specials.js.
 */
export const HEROES = {
  wanggeon: {
    id: 'wanggeon',
    name: '왕건',
    hanja: '王建',
    title: '고려 태조',
    role: '균형형',
    blurb: '검을 고르게 휘두르고, 기세가 차면 고려 창병을 불러 모은다.',
    available: true,
    stats: { maxHp: 120, speed: 155, might: 1, haste: 1, area: 1, pickup: 70, armor: 0 },
    weapon: 'goryeoSword',
    special: 'tongsol',
    favoredCategory: '병법',
    look: { hat: 'hero', weapon: 'sword', robe: '#2d3b5c', trim: '#c9a24a', plume: '#b3261e', skin: '#e8c9a0' },
  },
  gyeonhwon: {
    id: 'gyeonhwon',
    name: '견훤',
    hanja: '甄萱',
    title: '후백제 대왕',
    role: '근접 강타형',
    blurb: '대도로 내려찍고, 기세가 차면 패왕의 일격으로 정면을 쓸어낸다.',
    available: true,
    stats: { maxHp: 150, speed: 140, might: 1.45, haste: 1.1, area: 0.9, pickup: 60, armor: 2 },
    weapon: 'daedo',
    special: 'paewang',
    favoredCategory: '무예',
    look: { hat: 'crown', weapon: 'greatsword', robe: '#6b2a22', trim: '#d8b46a', plume: '#1d1a17', skin: '#dcb58c' },
  },
  gungye: {
    id: 'gungye',
    name: '궁예',
    hanja: '弓裔',
    title: '태봉의 왕',
    role: '범위 제압형',
    blurb: '철퇴를 휘돌리고, 기세가 차면 미륵의 심판으로 적진을 불사른다.',
    available: true,
    stats: { maxHp: 125, speed: 145, might: 0.95, haste: 1.05, area: 1.35, pickup: 80, armor: 0 },
    weapon: 'cheoltoe',
    special: 'mireuk',
    favoredCategory: '지세',
    look: { hat: 'monk', weapon: 'mace', robe: '#4a2f5e', trim: '#e0b24c', plume: '#e0b24c', skin: '#e3c19a' },
  },
};

/** Momentum (기세) gauge shared by all heroes. */
export const MOMENTUM = { max: 100, perSecond: 3, perKill: 1 };
