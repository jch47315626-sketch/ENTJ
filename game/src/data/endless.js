import { STAGES } from './stages.js';

/**
 * ♾️ 무한 전장 (마계): a short climb through six layers. The field's waves come
 * faster than anywhere else; after ENDLESS.bossEvery seconds its 적장
 * arrives, and felling it wins the run. The record is the fastest 토벌.
 */
export const ENDLESS = {
  bossEvery: 180, // seconds between bosses
  bossHpStep: 0.8, // each later boss: +80% health
  bossDamageStep: 0.3, // … and +30% damage
  spawnGrowth: 220, // spawn rate ×(1 + t / spawnGrowth)
  rampFrom: 240, // after 4:00 the waves harden:
  damageGrowth: 240, // enemy damage ×(1 + (t − rampFrom) / damageGrowth)
  hpGrowth: 300, // enemy health ×(1 + (t − rampFrom) / hpGrowth)
  // From 7:00 the climb itself steepens: every minute adds a bigger step of
  // enemy damage than the one before (+8%, +16%, +24% … on top).
  surgeFrom: 420,
  surgeStep: 0.08,
};

/**
 * 마계: 무한 전장 has its own fields, none of them a campaign battlefield.
 * The tempo is faster everywhere (more foes, quicker feet).
 */
export const MAGYE = {
  spawnRate: 1.4,
  enemySpeed: 1.15,
};

/**
 * Layers of 마계 are spaced evenly: each one down doubles enemy (and 적장)
 * health and damage, and each 결기수정 picked up there is worth 5× as much
 * as one a layer above. Everything else (spawn rate, armour, 공훈) stays as
 * on the first layer, so the step is exactly the doubling.
 */
export const LAYER = { hard: 2, worth: 5, armor: 0.05 };
const BASE_DIFF = STAGES.seonamhae.difficulty;
const layerDiff = (n, label) => {
  const k = LAYER.hard ** (n - 1);
  return {
    ...BASE_DIFF, label, stars: n, armor: LAYER.armor,
    enemyHp: BASE_DIFF.enemyHp * k, enemyDamage: BASE_DIFF.enemyDamage * k,
    bossHp: BASE_DIFF.bossHp * k, bossDamage: BASE_DIFF.bossDamage * k,
  };
};
/** What one 결기수정 is worth on a layer: 1, 5, 25, 125 … */
export const crystalWorth = (layer) => LAYER.worth ** (layer - 1);

/**
 * 무한 전장 전용 맵: six layers of 마계, each with its own ground, terrain,
 * foes, rotating 적장 and recurring events (`cycle`, repeated every
 * `period` seconds for the whole run). A map opens once `unlockAfter` (a
 * campaign field) has been pacified.
 */

export const ENDLESS_MAPS = {
  hyeolwol: {
    id: 'hyeolwol', layer: 1, icon: '🌕', name: '혈월 갯벌', place: '마계 첫째 층',
    intro: '붉은 달이 뜬 갯벌. 핏빛 물웅덩이마다 달이 비치고, 물살을 타고 해적 망령이 끝없이 밀려온다.',
    ground: 'bloodTide', music: 'seonamhae', darkTint: '18, 0, 4',
    terrain: { rocks: 0.08, bog: 0.3, clear: 240, bogSlow: 0.35, style: 'blood' },
    difficulty: layerDiff(1, '마계 Ⅰ'),
    unlockAfter: null, supplyEvery: 40,
    bosses: ['neungchang', 'kimak', 'gyeonhwon'],
    phases: [
      { until: 60, rate: [1.1, 1.5], mix: { bandit: 46, infantry: 40, archer: 14 }, eliteChance: 0.02 },
      { until: 180, rate: [1.6, 2.6], mix: { bandit: 36, infantry: 30, archer: 12, cavalry: 14, shield: 8 }, eliteChance: 0.1 },
      { until: 300, rate: [2.8, 3.8], mix: { bandit: 30, infantry: 26, archer: 12, cavalry: 18, shield: 14 }, eliteChance: 0.2 },
    ],
    period: 150,
    cycle: [
      { at: 40, type: 'pack', enemy: 'bandit', count: 12, banner: '🌕 핏빛 물살을 타고 해적 망령이 몰려온다!' },
      { at: 100, type: 'ring', enemy: 'infantry', count: 22, banner: '붉은 달 아래 포위되었다! 길을 열어라' },
    ],
  },
  dokkaebi: {
    id: 'dokkaebi', layer: 2, icon: '🔥', name: '도깨비불 무덤골', place: '마계 둘째 층',
    intro: '봉분이 끝없이 이어진 골짜기. 푸른 도깨비불이 떠다니다 꺼질 때마다, 어둠 속에서 무언가가 다가온다.',
    ground: 'ghostBarrow', music: 'gochang', darkTint: '0, 6, 16',
    terrain: { rocks: 0.22, bog: 0.18, clear: 240, bogSlow: 0.35, style: 'ghost' },
    difficulty: layerDiff(2, '마계 Ⅱ'),
    unlockAfter: 'seonamhae', supplyEvery: 38,
    bosses: ['shinsunggyeom', 'gyeonhwon', 'yugeumpil'],
    phases: [
      { until: 60, rate: [0.9, 1.3], mix: { infantry: 50, bandit: 30, archer: 20 }, eliteChance: 0.02 },
      { until: 180, rate: [1.4, 2.3], mix: { infantry: 34, bandit: 22, archer: 12, shield: 14, ironclad: 10, eliteArcher: 8 }, eliteChance: 0.08 },
      { until: 300, rate: [2.4, 3.4], mix: { infantry: 28, bandit: 18, shield: 16, ironclad: 16, eliteArcher: 12, cavalry: 10 }, eliteChance: 0.12 },
    ],
    period: 160,
    cycle: [
      { at: 60, type: 'night', life: 18, enemy: 'bandit', count: 8, banner: '🔥 도깨비불이 꺼진다 — 어둠 속 그림자를 조심하라' },
      { at: 125, type: 'pack', enemy: 'eliteArcher', count: 7, banner: '봉분 뒤에서 망령 궁수대가 일어선다!' },
    ],
  },
  hanbing: {
    id: 'hanbing', layer: 3, icon: '🧊', name: '한빙 지옥', place: '마계 셋째 층',
    intro: '모든 것이 얼어붙은 지옥. 푸른 얼음 틈으로 차가운 빛이 새고, 녹은 얼음물이 발목을 붙잡는다.',
    ground: 'frostHell', music: 'gochang', darkTint: '0, 8, 20',
    terrain: { rocks: 0.3, bog: 0.34, clear: 240, bogSlow: 0.45, style: 'frost' },
    difficulty: layerDiff(3, '마계 Ⅲ'),
    unlockAfter: 'gongsan', supplyEvery: 36,
    bosses: ['kimak', 'yugeumpil', 'heukpung'],
    phases: [
      { until: 60, rate: [0.9, 1.3], mix: { infantry: 48, shield: 16, bandit: 20, trapper: 16 }, eliteChance: 0.04 },
      { until: 180, rate: [1.4, 2.4], mix: { infantry: 28, shield: 16, ironclad: 16, cavalry: 14, trapper: 14, eliteArcher: 12 }, eliteChance: 0.1 },
      { until: 300, rate: [2.5, 3.5], mix: { infantry: 20, shield: 14, ironclad: 20, eliteCavalry: 16, trapper: 16, eliteArcher: 14 }, eliteChance: 0.15 },
    ],
    period: 150,
    cycle: [
      { at: 55, type: 'rockslide', count: 8, radius: 46, damage: 18, banner: '🧊 얼음 기둥이 무너져 내린다! 붉은 원을 피하라' },
      { at: 115, type: 'charge', enemy: 'cavalry', count: 10, width: 380, warn: 1.6, banner: '빙판 위 기병 돌격! 옆으로 비켜라' },
    ],
  },
  hwayeom: {
    id: 'hwayeom', layer: 4, icon: '🏯', name: '화염 궁궐', place: '마계 넷째 층',
    intro: '불타는 궁궐. 그을린 돌바닥에 붉은 기둥이 쓰러져 있고, 녹아내린 쇳물이 웅덩이를 이룬다. 재가 눈처럼 내린다.',
    ground: 'ashPalace', music: 'cheorwon', darkTint: '20, 4, 0',
    terrain: { rocks: 0.26, bog: 0.22, clear: 240, bogSlow: 0.4, style: 'lava' },
    difficulty: layerDiff(4, '마계 Ⅳ'),
    unlockAfter: 'gochang', supplyEvery: 34,
    bosses: ['gungyeBoss', 'gongsin', 'wanggeonBoss'],
    phases: [
      { until: 60, rate: [1.0, 1.4], mix: { infantry: 40, shield: 16, ironclad: 14, bandit: 18, axeman: 12 }, eliteChance: 0.06 },
      { until: 180, rate: [1.5, 2.5], mix: { infantry: 24, shield: 16, ironclad: 20, eliteCavalry: 14, eliteArcher: 10, axeman: 16 }, eliteChance: 0.14 },
      { until: 300, rate: [2.6, 3.6], mix: { infantry: 16, shield: 16, ironclad: 24, eliteCavalry: 16, eliteArcher: 10, axeman: 18 }, eliteChance: 0.2 },
    ],
    period: 160,
    cycle: [
      { at: 45, type: 'pack', enemy: 'axeman', count: 8, banner: '🏯 불길 속에서 광전사들이 뛰쳐나온다!' },
      { at: 100, type: 'night', life: 20, enemy: 'bandit', count: 10, banner: '검은 연기가 궁궐을 덮는다 — 자객을 조심하라' },
      { at: 140, type: 'ring', enemy: 'shield', count: 16, banner: '불타는 방패진이 에워싼다!' },
    ],
  },
  baekgol: {
    id: 'baekgol', layer: 5, icon: '💀', name: '백골 벌판', place: '마계 다섯째 층',
    intro: '쓰러진 군사들의 뼈가 산을 이룬 잿빛 벌판. 검은 혼의 강이 흐르고, 땅 밑에서 해골 군단이 기어 나온다.',
    ground: 'boneField', music: 'illicheon', darkTint: '6, 6, 10',
    terrain: { rocks: 0.3, bog: 0.28, clear: 240, bogSlow: 0.4, style: 'soul' },
    difficulty: layerDiff(5, '마계 Ⅴ'),
    unlockAfter: 'cheorwon', supplyEvery: 32,
    bosses: ['singeom', 'wanggeonBoss', 'gyeonhwon', 'beombawi'],
    phases: [
      { until: 60, rate: [1.1, 1.5], mix: { infantry: 36, shield: 14, ironclad: 12, slinger: 18, mole: 20 }, eliteChance: 0.08 },
      { until: 180, rate: [1.6, 2.6], mix: { infantry: 20, ironclad: 20, eliteCavalry: 16, slinger: 16, mole: 18, shield: 10 }, eliteChance: 0.16 },
      { until: 300, rate: [2.7, 3.7], mix: { infantry: 14, ironclad: 22, eliteCavalry: 20, slinger: 16, mole: 18, shield: 10 }, eliteChance: 0.22 },
    ],
    period: 150,
    cycle: [
      { at: 45, type: 'charge', enemy: 'eliteCavalry', count: 14, width: 460, warn: 1.5, banner: '💀 해골 기병의 돌격! 옆으로 비켜라' },
      { at: 95, type: 'ring', enemy: 'mole', count: 10, banner: '뼈무덤이 들썩인다 — 사방에서 땅굴병!' },
      { at: 130, type: 'pack', enemy: 'slinger', count: 10, banner: '뼈 언덕 위에 투석병이 늘어선다!' },
    ],
  },
  simyeon: {
    id: 'simyeon', layer: 6, icon: '🌋', name: '마계 심연', place: '마계 가장 깊은 곳',
    intro: '빛이 닿지 않는 마계의 밑바닥. 용암 틈이 맥박치고, 흑요석 바위 사이로 독 웅덩이가 끓는다. 초적의 망령들이 모두 여기 모였다.',
    ground: 'demonRealm', music: 'illicheon', darkTint: '10, 0, 8',
    terrain: { rocks: 0.14, bog: 0.22, clear: 240, bogSlow: 0.35, style: 'demon' },
    difficulty: layerDiff(6, '마계 Ⅵ'),
    unlockAfter: 'seomgang', supplyEvery: 34,
    bosses: ['heukpung', 'maehwa', 'yanggil', 'gihwon'],
    phases: [
      { until: 60, rate: [1.1, 1.5], mix: { infantry: 28, slinger: 20, trapper: 16, axeman: 18, mole: 18 }, eliteChance: 0.1 },
      { until: 180, rate: [1.6, 2.6], mix: { slinger: 18, trapper: 12, axeman: 20, mole: 16, shaman: 8, ironclad: 14, eliteCavalry: 12 }, eliteChance: 0.18 },
      { until: 300, rate: [2.7, 3.7], mix: { slinger: 16, trapper: 10, axeman: 22, mole: 18, shaman: 10, ironclad: 14, eliteCavalry: 10 }, eliteChance: 0.24 },
    ],
    period: 150,
    cycle: [
      { at: 40, type: 'rockslide', count: 10, radius: 48, damage: 20, banner: '🌋 흑요석 바위가 쏟아진다! 붉은 원을 피하라' },
      { at: 80, type: 'pack', enemy: 'shaman', count: 4, banner: '심연의 굿판 — 무당부터 베어라!' },
      { at: 115, type: 'ring', enemy: 'axeman', count: 12, banner: '광전사 망령들이 에워싼다!' },
      { at: 140, type: 'night', life: 18, enemy: 'bandit', count: 10, banner: '심연의 어둠이 짙어진다…' },
    ],
  },
};

/** Maps in order, shallowest first. */
export const ENDLESS_MAP_ORDER = Object.values(ENDLESS_MAPS).sort((a, b) => a.layer - b.layer).map((m) => m.id);

/** Whether a map is open: its campaign field has been pacified (the first is always open). */
export const endlessMapOpen = (save, id) => {
  const m = ENDLESS_MAPS[id];
  return !!m && (!m.unlockAfter || (save.best?.[m.unlockAfter] ?? 0) > 0);
};

/** The map a run starts on: the last one played if it is still open, else the first. */
export function endlessMapOf(save) {
  const id = save.endlessMap;
  return id && endlessMapOpen(save, id) ? id : ENDLESS_MAP_ORDER[0];
}

/**
 * 적장 order on a map: its list in turn, skipping the one who is the hero
 * himself (견훤 never fights 견훤).
 */
const MIRROR = { gyeonhwon: 'gyeonhwon', gungyeBoss: 'gungye', wanggeonBoss: 'wanggeon' };
export function endlessBossFor(stage, n, heroId) {
  const list = stage.bossCycle.filter((id) => MIRROR[id] !== heroId);
  return list[n % list.length];
}

/**
 * 신의 분노: stand (nearly) still for `idle` seconds and lightning is called
 * down — a warned circle, then a bolt that ignores armour.
 */
export const WRATH = { idle: 20, radius: 70, warn: 1, share: 0.45, again: 1.5, hint: 12 };

/** How long the recurring events are laid out for (no run lasts an hour). */
const CYCLE_SPAN = 3600;

/** The stage played on an endless map. */
export function makeEndlessStage(map) {
  const d = map.difficulty;
  const events = [];
  for (let base = 0; base < CYCLE_SPAN; base += map.period) {
    for (const ev of map.cycle) events.push({ ...ev, at: base + ev.at });
  }
  return {
    id: `endless_${map.id}`,
    endlessMap: map.id,
    name: map.name,
    place: map.place,
    year: `${map.icon} ${map.layer}층`,
    intro: map.intro,
    ground: map.ground,
    terrain: { ...map.terrain },
    dark: true,
    darkTint: map.darkTint,
    difficulty: { ...d, spawnRate: (d.spawnRate ?? 1) * MAGYE.spawnRate, enemySpeed: (d.enemySpeed ?? 1) * MAGYE.enemySpeed },
    endless: true,
    layer: map.layer,
    clearText: '',
    next: null,
    ending: null,
    bossAt: ENDLESS.bossEvery,
    boss: map.bosses[0],
    bossAlt: {},
    bossCycle: [...map.bosses],
    supplyEvery: map.supplyEvery,
    phases: map.phases.map((p) => ({ ...p })),
    events,
  };
}

/** Extra enemy-damage multiplier in endless mode from the 7:00 surge (1 before then). */
export function endlessSurge(t) {
  const x = Math.max(0, t - ENDLESS.surgeFrom) / 60;
  return 1 + ENDLESS.surgeStep * (x * (x + 1)) / 2;
}

/**
 * 결기수정 (무한 전장's only reward): nothing for time survived. Felling the
 * 적장 pays `clear` crystals × the 🎰 spin, each worth crystalWorth(layer);
 * falling before that pays a share of it by how far the run got (up to
 * `lossShare`: half for reaching the 적장, half for its health taken).
 */
// lossShare stays well under 1/5, so falling a layer down never beats clearing the one above.
export const CRYSTAL = { clear: 10, lossShare: 0.1 };

/** 결기수정 for a run on `layer`: won (× spin `mul`), or lost with `reach`/`bossDone` (0–1). */
export function endlessCrystals(layer, { won, mul = 1, reach = 0, bossDone = 0 }) {
  const full = CRYSTAL.clear * crystalWorth(layer);
  if (won) return Math.round(full * mul);
  return Math.floor(full * CRYSTAL.lossShare * (0.5 * reach + 0.5 * bossDone));
}
