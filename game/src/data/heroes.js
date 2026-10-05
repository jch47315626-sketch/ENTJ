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
    look: { hat: 'hero', weapon: 'sword', robe: '#2d5a9c', accent: '#1e2a48', trim: '#e8c060', plume: '#e0392b', skin: '#f2d2ac', cape: '#c0392b', brows: 'kind', mustache: '#3a2a1c' },
  },
  gyeonhwon: {
    id: 'gyeonhwon',
    name: '견훤',
    hanja: '甄萱',
    title: '후백제 대왕',
    role: '근접 강타형',
    blurb: '원거리 공격은 없지만 세 영웅 중 가장 세고 단단하다. 기세가 차면 패왕의 일격으로 정면을 쓸어낸다.',
    available: true,
    stats: { maxHp: 150, speed: 142, might: 1.0, haste: 1.15, area: 1.0, pickup: 70, armor: 1 },
    weapon: 'daedo',
    special: 'paewang',
    favoredCategory: '무예',
    look: { hat: 'crown', weapon: 'greatsword', robe: '#8e2a20', accent: '#2e120e', trim: '#f0c050', plume: '#1d1a17', skin: '#e0b88e', beard: '#1d1a17', brows: 'angry', bulk: 1.25, cape: '#2e120e' },
  },
  gungye: {
    id: 'gungye',
    name: '궁예',
    hanja: '弓裔',
    title: '태봉의 왕',
    role: '원거리 술사형',
    blurb: '석장으로 법력구를 쏘고 금강저로 벼락을 부른다. 기세가 차면 관심법으로 적을 홀려 서로 베게 한다.',
    available: true,
    stats: { maxHp: 150, speed: 158, might: 1.2, haste: 1, area: 1.1, pickup: 85, armor: 1 },
    weapon: 'seokjang',
    subWeapons: ['vajra'],
    special: 'gwansim',
    favoredCategory: '지세',
    look: { hat: 'monk', weapon: 'staff', robe: '#6a3f8e', accent: '#2e1a40', trim: '#f0c050', plume: '#e0b24c', skin: '#f0d0aa', eyepatch: true, cape: '#e0b24c' },
  },
};

/** Momentum (기세) gauge shared by all heroes. */
export const MOMENTUM = { max: 100, perSecond: 3, perKill: 1 };
