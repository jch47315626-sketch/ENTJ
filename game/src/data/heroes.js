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
    stats: { maxHp: 150, speed: 155, might: 1, haste: 1, area: 1, pickup: 70, armor: 2 },
    weapon: 'goryeoSword',
    special: 'tongsol',
    favoredCategory: '병법',
    // Key art: long black hair with blue sheen, a small gold crown with a blue jewel, blue armour, white fur.
    look: { headImg: 'assets/ui/hero/wanggeon-head.webp', hat: 'royal', weapon: 'sword', robe: '#1f4596', accent: '#14244a', trim: '#e8c060', skin: '#f2d2ac', cape: '#2a5cc0', brows: 'stern', hair: '#1a1720', hairTint: '#3a6ad8', jewel: '#2f6fe0', fur: '#f4f1ea', pauldrons: '#d9a940' },
  },
  gyeonhwon: {
    id: 'gyeonhwon',
    name: '견훤',
    hanja: '甄萱',
    title: '후백제 대왕',
    role: '근접 강타형',
    blurb: '원거리 공격은 없지만 세 영웅 중 가장 세고 단단하다. 기세가 차면 패왕의 일격으로 정면을 쓸어낸다.',
    available: true,
    stats: { maxHp: 165, speed: 142, might: 1.0, haste: 1.15, area: 1.0, pickup: 70, armor: 1 },
    weapon: 'daedo',
    special: 'paewang',
    favoredCategory: '무예',
    // Key art: a wild brown mane and beard, red headband, black-and-gold armour, white fur, red cloak.
    look: { headImg: 'assets/ui/hero/gyeonhwon-head.webp', hat: 'warband', weapon: 'greatsword', robe: '#2a2321', accent: '#160f0c', trim: '#e0aa3a', skin: '#d9ad80', beard: '#3a2418', hair: '#3a2418', band: '#c0392b', brows: 'angry', bulk: 1.25, cape: '#a8241c', fur: '#f1ece2', pauldrons: '#c9952e' },
  },
  gungye: {
    id: 'gungye',
    name: '궁예',
    hanja: '弓裔',
    title: '태봉의 왕',
    role: '원거리 술사형',
    blurb: '석장으로 법력구를 쏘고 금강저로 벼락을 부른다. 기세가 차면 관심법으로 적을 홀려 서로 베게 한다.',
    available: true,
    stats: { maxHp: 150, speed: 158, might: 1.0, haste: 1, area: 1.1, pickup: 85, armor: 1 },
    weapon: 'seokjang',
    subWeapons: ['vajra'],
    special: 'gwansim',
    favoredCategory: '지세',
    // Key art: shaved head with a sun on the brow, gold-rimmed eyepatch, golden robe, prayer beads, gold hoops.
    look: { headImg: 'assets/ui/hero/gungye-head.webp', hat: 'monk', weapon: 'staff', robe: '#d9a531', accent: '#5a3a14', trim: '#f6d77a', skin: '#f0d0aa', eyepatch: true, patchTrim: '#e0b24c', sunMark: '#3a2a14', cape: '#b8862a', brows: 'stern', beads: '#2a1e14', earrings: '#e0b24c' },
  },
};

/** Momentum (기세) gauge shared by all heroes. */
export const MOMENTUM = { max: 100, perSecond: 3, perKill: 1 };
