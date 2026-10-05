/**
 * Enemy definitions. `behavior` selects an AI routine from systems/enemyAI.js;
 * `look` selects how render/sprites.js draws it.
 */
export const ENEMIES = {
  infantry: {
    id: 'infantry', name: '창병', hp: 18, speed: 58, damage: 6, radius: 13, xp: 1,
    behavior: 'chase', knockResist: 0,
    look: { body: '#7a6a4f', accent: '#3b3328', hat: 'helmet', weapon: 'spear' },
  },
  archer: {
    id: 'archer', name: '궁수', hp: 15, speed: 50, damage: 5, radius: 12, xp: 2,
    behavior: 'ranged', knockResist: 0,
    params: { keepMin: 230, keepMax: 300, fireEvery: 2.4, arrowSpeed: 260, arrowDamage: 7 },
    look: { body: '#5d6b4a', accent: '#2e3524', hat: 'hood', weapon: 'bow' },
  },
  bandit: {
    id: 'bandit', name: '해적', hp: 13, speed: 72, damage: 9, radius: 12, xp: 1,
    behavior: 'dasher', knockResist: 0,
    params: { triggerRange: 260, windup: 0.35, dashSpeed: 330, dashTime: 0.45, cooldown: 2.5 },
    look: { body: '#8a3b2e', accent: '#3a1c16', hat: 'band', weapon: 'knife' },
  },
  cart: {
    id: 'cart', name: '군량 수레', hp: 25, speed: 0, damage: 0, radius: 20, xp: 0,
    behavior: 'static', knockResist: 1, drop: 'rice', noScaling: true,
    look: { body: '#8b6a3e', accent: '#4a3620', hat: 'cart' },
  },
};

/** Veteran variant used for elites in stages that have no dedicated elite types. */
export const VETERAN = { hpMul: 2.2, sizeMul: 1.25, xpMul: 3, damageMul: 1.3, label: '노련한' };
