/**
 * Enemy definitions. `behavior` selects an AI routine from systems/enemyAI.js;
 * `look` selects how render/sprites.js draws it.
 */
export const ENEMIES = {
  infantry: {
    id: 'infantry', name: '창병', hp: 16, speed: 56, damage: 6, radius: 13, xp: 1, tier: 1,
    behavior: 'chase', knockResist: 0,
    look: { body: '#7a6a4f', accent: '#3b3328', hat: 'helmet', weapon: 'spear' },
  },
  archer: {
    id: 'archer', name: '궁수', hp: 12, speed: 50, damage: 5, radius: 12, xp: 2, tier: 1,
    behavior: 'ranged', knockResist: 0,
    params: { keepMin: 115, keepMax: 150, fireEvery: 2.4, arrowSpeed: 260, arrowDamage: 7 },
    look: { body: '#5d6b4a', accent: '#2e3524', hat: 'hood', weapon: 'bow' },
  },
  bandit: {
    id: 'bandit', name: '해적', hp: 11, speed: 70, damage: 8, radius: 12, xp: 1, tier: 1,
    behavior: 'dasher', knockResist: 0,
    params: { triggerRange: 260, windup: 0.35, dashSpeed: 330, dashTime: 0.45, cooldown: 2.5 },
    look: { body: '#8a3b2e', accent: '#3a1c16', hat: 'band', weapon: 'knife' },
  },
  cavalry: {
    id: 'cavalry', name: '기마병', tier: 2, hp: 34, speed: 105, damage: 9, radius: 15, xp: 3,
    behavior: 'charger', knockResist: 0.3,
    params: { orbit: 290, circleTime: [2.2, 3.6], windup: 0.65, chargeSpeed: 280, chargeDistance: 620 },
    look: { body: '#6d5a3e', accent: '#2e261a', hat: 'helmet', weapon: 'spear', mount: '#5a3f26' },
  },

  // ---- 강화 적 (elite types) ----
  ironclad: {
    id: 'ironclad', name: '철갑병', tier: 3, hp: 75, speed: 40, damage: 11, radius: 16, xp: 4,
    behavior: 'chase', knockResist: 0.8, armor: 3,
    look: { body: '#55585c', accent: '#2a2c2f', hat: 'heavyHelmet', weapon: 'glaive', plates: true },
  },
  shield: {
    id: 'shield', name: '방패병', tier: 2, hp: 45, speed: 48, damage: 8, radius: 15, xp: 3,
    behavior: 'chase', knockResist: 0.5,
    params: { blockArc: 120, blockMul: 0.5, turnRate: 1.5 },
    look: { body: '#6a5338', accent: '#3a2c1c', hat: 'helmet', weapon: 'shield' },
  },
  eliteArcher: {
    id: 'eliteArcher', name: '정예 궁수', tier: 3, hp: 35, speed: 55, damage: 6, radius: 13, xp: 4,
    behavior: 'ranged', knockResist: 0.2,
    params: { keepMin: 120, keepMax: 160, fireEvery: 3.2, arrowSpeed: 270, arrowDamage: 5, volley: 3, spread: 28, retreat: 1.0 },
    look: { body: '#7b5a2c', accent: '#3d2a12', hat: 'hood', weapon: 'bow', tassel: '#b3261e' },
  },
  eliteCavalry: {
    id: 'eliteCavalry', name: '정예 기마병', tier: 3, hp: 65, speed: 120, damage: 12, radius: 16, xp: 5,
    behavior: 'charger', knockResist: 0.5,
    params: { orbit: 310, circleTime: [1.8, 3.0], windup: 0.55, chargeSpeed: 330, chargeDistance: 680, dust: true },
    look: { body: '#7a2e24', accent: '#2e1410', hat: 'heavyHelmet', weapon: 'spear', mount: '#2d241c' },
  },

  // ---- 양길의 북원 초적 (치악산 전장): different patterns from the rest ----
  slinger: {
    id: 'slinger', name: '투석병', tier: 2, hp: 22, speed: 52, damage: 5, radius: 12, xp: 3,
    behavior: 'lobber', knockResist: 0.1,
    // Hurls a stone where the hero is heading; it lands after `flight` on a warned spot.
    params: { keepMin: 200, keepMax: 290, fireEvery: 3.2, flight: 1.0, radius: 46, rockDamage: 11, lead: 0.8 },
    look: { body: '#5c4a3a', accent: '#2a2018', hat: 'band', weapon: 'knife' },
  },
  axeman: {
    id: 'axeman', name: '도끼 광전사', tier: 3, hp: 72, speed: 64, damage: 10, radius: 15, xp: 5,
    behavior: 'whirl', knockResist: 0.6,
    // Closes in, winds up, then whirls his axes while still walking at you.
    params: { trigger: 115, windup: 0.55, spinTime: 1.5, spinRadius: 64, spinDamage: 9, spinEvery: 0.3, spinSpeed: 0.75, cooldown: 3.2 },
    look: { body: '#6e2f22', accent: '#2a120c', hat: 'band', weapon: 'glaive', bulk: 1.12 },
  },
  trapper: {
    id: 'trapper', name: '덫꾼', tier: 2, hp: 26, speed: 84, damage: 5, radius: 12, xp: 3,
    behavior: 'trapper', knockResist: 0,
    // Runs close, plants a spike trap in your path, then runs away.
    params: { plantRange: 150, cooldown: 4.5, trapRadius: 30, trapDps: 14, trapSlow: 0.4, trapLife: 12, flee: 1.4, warn: 2 },
    look: { body: '#4f5a3a', accent: '#232a18', hat: 'hood', weapon: 'knife' },
  },
  shaman: {
    id: 'shaman', name: '무당', tier: 3, hp: 42, speed: 46, damage: 4, radius: 13, xp: 6,
    behavior: 'shaman', knockResist: 0.2,
    // Stays back; every few seconds heals the foes around her and speeds them up.
    params: { keepMin: 250, keepMax: 330, every: 4.5, radius: 210, heal: 0.2, buff: 4 },
    look: { body: '#e8dfd0', accent: '#8a2a4a', hat: 'monk', weapon: 'staff', trim: '#c0392b' },
  },
  mole: {
    id: 'mole', name: '땅굴병', tier: 3, hp: 40, speed: 60, damage: 9, radius: 13, xp: 5,
    behavior: 'burrow', knockResist: 0.3,
    // Burrows (untouchable), tunnels toward the hero, bursts out under a warned circle.
    params: { underTime: 2.4, underSpeed: 165, warn: 0.75, popRadius: 54, popDamage: 16, surfaceTime: 3.0 },
    look: { body: '#6b5236', accent: '#2e2216', hat: 'helmet', weapon: 'spear' },
  },

  cart: {
    id: 'cart', name: '군량 수레', hp: 25, speed: 0, damage: 0, radius: 20, xp: 0,
    behavior: 'static', knockResist: 1, drop: 'rice', noScaling: true,
    look: { body: '#8b6a3e', accent: '#4a3620', hat: 'cart' },
  },

  // 전장 오브젝트 (systems/fieldObjects.js): break one to set off its effect.
  oilJar: {
    id: 'oilJar', name: '기름 항아리', hp: 12, speed: 0, damage: 0, radius: 16, xp: 0,
    behavior: 'static', knockResist: 1, noScaling: true, object: 'oil',
  },
  warDrum: {
    id: 'warDrum', name: '전고', hp: 18, speed: 0, damage: 0, radius: 19, xp: 0,
    behavior: 'static', knockResist: 1, noScaling: true, object: 'drum',
  },
  shrine: {
    id: 'shrine', name: '서낭당 돌탑', hp: 24, speed: 0, damage: 0, radius: 18, xp: 0,
    behavior: 'static', knockResist: 1, noScaling: true, object: 'shrine',
  },
};

/** Veteran variant used for elites in stages that have no dedicated elite types. */
export const VETERAN = { hpMul: 2.2, sizeMul: 1.25, xpMul: 3, damageMul: 1.3, label: '노련한' };
