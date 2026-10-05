/**
 * Stages. Phases drive spawning (rate is spawns/second interpolated across the
 * phase); events are one-shot moments; the boss arrives at `bossAt` seconds.
 */
export const STAGES = {
  seonamhae: {
    id: 'seonamhae',
    order: 1,
    numeral: '一',
    name: '서남해 갯벌',
    place: '전남 나주 · 압해도',
    year: '903 ~ 910',
    intro: '903년, 왕건의 수군이 나주에 닿는다. 서남해의 해적 두령 능창이 갯벌에서 기다린다.',
    ground: 'tidalFlat',
    // Stage-wide multipliers on top of the time curves in data/balance.js.
    difficulty: { label: '쉬움', stars: 1, enemyHp: 1, enemyDamage: 1, spawnRate: 1, eliteBonus: 0, bossHp: 1, bossDamage: 1 },
    clearText: '서남해의 뱃길이 고려에 열린다.',
    next: 'gongsan',
    bossAt: 300,
    boss: 'neungchang',
    bossAlt: {},
    supplyEvery: 40,
    phases: [
      { until: 60, rate: [0.9, 1.2], mix: { infantry: 70, bandit: 30 }, eliteChance: 0 },
      { until: 120, rate: [1.2, 1.6], mix: { infantry: 58, bandit: 34, archer: 8 }, eliteChance: 0 },
      { until: 240, rate: [1.8, 2.8], mix: { infantry: 55, bandit: 35, archer: 10 }, eliteChance: 0.15 },
      { until: 300, rate: [3.5, 4.5], mix: { infantry: 58, bandit: 34, archer: 8 }, eliteChance: 0.25 },
    ],
    events: [
      { at: 90, type: 'pack', enemy: 'bandit', count: 10, banner: '해적 기습! 한쪽에서 몰려온다' },
      { at: 165, type: 'pack', enemy: 'archer', count: 5, banner: '갈대숲의 궁수대' },
      { at: 240, type: 'ring', enemy: 'infantry', count: 26, banner: '포위되었다! 길을 열어라' },
    ],
  },
  gongsan: {
    id: 'gongsan',
    order: 2,
    numeral: '二',
    name: '공산 동수',
    place: '대구 팔공산',
    year: '927',
    intro: '927년 가을, 팔공산 동수. 경주를 친 견훤의 군대가 돌아오는 길목에서 고려군을 에워싼다.',
    ground: 'autumnHills',
    difficulty: { label: '보통', stars: 2, enemyHp: 1.45, enemyDamage: 1.4, spawnRate: 1.2, eliteBonus: 0.1, bossHp: 1.35, bossDamage: 1.3 },
    clearText: '공산의 포위를 뚫고 살아남았다. 팔공산이라는 이름은 이날 목숨을 바친 여덟 장수에게서 왔다고 전한다.',
    next: 'gochang',
    bossAt: 300,
    boss: 'gyeonhwon',
    bossAlt: { gyeonhwon: 'shinsunggyeom' },
    supplyEvery: 38,
    phases: [
      { until: 60, rate: [0.9, 1.2], mix: { infantry: 66, archer: 8, bandit: 26 }, eliteChance: 0 },
      { until: 120, rate: [1.2, 1.6], mix: { infantry: 55, archer: 6, cavalry: 10, shield: 12, bandit: 17 }, eliteChance: 0 },
      { until: 240, rate: [1.8, 2.5], mix: { infantry: 46, archer: 4, cavalry: 12, shield: 13, ironclad: 10, eliteArcher: 5, bandit: 10 }, eliteChance: 0.05 },
      { until: 300, rate: [2.8, 3.5], mix: { infantry: 42, cavalry: 10, shield: 13, ironclad: 13, eliteArcher: 5, eliteCavalry: 7, bandit: 10 }, eliteChance: 0.08 },
    ],
    events: [
      { at: 100, type: 'pack', enemy: 'cavalry', count: 5, banner: '후백제 기병대 돌격!' },
      { at: 180, type: 'decoy', life: 10, banner: '신숭겸이 왕의 깃발을 들고 적을 끌어간다!',
        altForHero: { gyeonhwon: { type: 'pack', enemy: 'ironclad', count: 8, banner: '고려 철갑병이 길을 막는다!' } } },
      { at: 240, type: 'ring', enemy: 'shield', count: 14, banner: '방패진에 갇혔다! 옆구리를 노려라' },
    ],
  },
  gochang: {
    id: 'gochang',
    order: 3,
    numeral: '三',
    name: '고창 병산',
    place: '경북 안동',
    year: '930',
    intro: '930년 정월, 고창의 얼어붙은 강가. 견훤의 주력과 고려군이 맞붙고, 고을 호족들이 어느 편에 설지 지켜본다.',
    ground: 'winterRiver',
    difficulty: { label: '어려움', stars: 3, enemyHp: 1.5, enemyDamage: 1.5, spawnRate: 1.15, eliteBonus: 0.08, bossHp: 1.6, bossDamage: 1.45 },
    clearText: '고창의 겨울 들판에서 승부가 갈렸다. 이 고을 호족 셋은 훗날 안동의 삼태사로 기려진다.',
    next: 'cheorwon',
    bossAt: 300,
    boss: 'kimak',
    bossAlt: { gyeonhwon: 'yugeumpil' },
    supplyEvery: 36,
    phases: [
      { until: 60, rate: [0.9, 1.3], mix: { infantry: 60, bandit: 25, archer: 8, shield: 7 }, eliteChance: 0 },
      { until: 120, rate: [1.3, 1.8], mix: { infantry: 50, shield: 12, cavalry: 10, ironclad: 8, bandit: 14, archer: 6 }, eliteChance: 0.05 },
      { until: 240, rate: [2.0, 2.8], mix: { infantry: 32, shield: 16, ironclad: 16, cavalry: 12, eliteCavalry: 8, eliteArcher: 6, bandit: 10 }, eliteChance: 0.12 },
      { until: 300, rate: [3.0, 3.8], mix: { infantry: 30, shield: 15, ironclad: 18, eliteCavalry: 12, cavalry: 8, eliteArcher: 7, bandit: 10 }, eliteChance: 0.15 },
    ],
    events: [
      { at: 90, type: 'pack', enemy: 'cavalry', count: 5, banner: '얼음 위로 기병이 미끄러져 온다!' },
      { at: 150, type: 'allies', ally: 'archer', count: 4, life: 40, banner: '고을 호족들이 궁수를 이끌고 합류한다!',
        altForHero: { gyeonhwon: { type: 'pack', enemy: 'ironclad', count: 10, banner: '호족들이 고려 편에 섰다! 철갑병이 몰려온다' } } },
      { at: 210, type: 'pack', enemy: 'shield', count: 10, banner: '방패진이 강가를 막는다' },
      { at: 245, type: 'ring', enemy: 'ironclad', count: 16, banner: '철갑병의 포위! 얼음 위에서 버텨라' },
    ],
  },
  cheorwon: {
    id: 'cheorwon',
    order: 4,
    numeral: '四',
    name: '철원 궁성',
    place: '강원 철원 · 태봉 도성',
    year: '918',
    intro: '918년 6월, 철원의 궁성. 네 장수가 왕건을 추대하고 궁문을 연다. 미륵을 자처한 왕 궁예는 아직 궁 안에 있다.',
    ground: 'palaceCourt',
    difficulty: { label: '매우 어려움', stars: 4, enemyHp: 2.0, enemyDamage: 1.85, spawnRate: 1.25, eliteBonus: 0.15, bossHp: 1.4, bossDamage: 1.65, xpScale: 0.4 },
    clearText: '궁성이 열리고 왕건이 즉위한다. 나라 이름은 고려, 연호는 천수(天授).',
    bossAt: 300,
    boss: 'gungyeBoss',
    bossAlt: { gungye: 'gongsin' },
    supplyEvery: 34,
    phases: [
      { until: 60, rate: [1.0, 1.4], mix: { infantry: 50, shield: 14, ironclad: 10, bandit: 18, archer: 8 }, eliteChance: 0.05 },
      { until: 120, rate: [1.4, 1.9], mix: { infantry: 36, shield: 16, ironclad: 16, cavalry: 12, eliteArcher: 6, bandit: 14 }, eliteChance: 0.1 },
      { until: 240, rate: [2.1, 2.9], mix: { infantry: 24, shield: 16, ironclad: 22, eliteCavalry: 14, cavalry: 8, eliteArcher: 8, bandit: 8 }, eliteChance: 0.16 },
      { until: 300, rate: [3.1, 3.9], mix: { infantry: 20, shield: 16, ironclad: 26, eliteCavalry: 16, eliteArcher: 8, cavalry: 6, bandit: 8 }, eliteChance: 0.2 },
    ],
    events: [
      { at: 75, type: 'pack', enemy: 'ironclad', count: 8, banner: '궁성 수비대가 계단을 내려온다!' },
      { at: 140, type: 'ring', enemy: 'shield', count: 14, banner: '방패진이 마당을 에워싼다!' },
      { at: 210, type: 'night', life: 25, enemy: 'bandit', count: 10, banner: '관심법의 밤 — 사방이 어두워진다. 그림자 속 자객을 조심하라' },
      { at: 260, type: 'pack', enemy: 'eliteCavalry', count: 8, banner: '궁문으로 친위 기병이 쏟아진다!' },
    ],
  },
};

/** Ordered list for the stage picker. */
export const STAGE_ORDER = Object.values(STAGES).sort((a, b) => a.order - b.order).map((s) => s.id);

/** Compress a stage's timeline (used by the quick test mode). */
export function scaleStage(stage, factor) {
  if (factor === 1) return stage;
  return {
    ...stage,
    bossAt: stage.bossAt * factor,
    supplyEvery: Math.max(10, stage.supplyEvery * factor),
    phases: stage.phases.map((p) => ({ ...p, until: p.until * factor })),
    events: stage.events.map((e) => ({ ...e, at: e.at * factor })),
  };
}
