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
    difficulty: { label: '쉬움', stars: 1, enemyHp: 1.45, enemyDamage: 1.45, spawnRate: 1.2, eliteBonus: 0.06, bossHp: 1.35, bossDamage: 1.35 },
    clearText: '서남해의 뱃길이 고려에 열린다.',
    next: 'gongsan',
    bossAt: 300,
    boss: 'neungchang',
    bossAlt: {},
    supplyEvery: 40,
    phases: [
      { until: 60, rate: [1.1, 1.5], mix: { infantry: 62, bandit: 32, archer: 6 }, eliteChance: 0 },
      { until: 120, rate: [1.5, 2.0], mix: { infantry: 50, bandit: 30, archer: 10, cavalry: 10 }, eliteChance: 0.05 },
      { until: 240, rate: [2.2, 3.2], mix: { infantry: 42, bandit: 28, archer: 10, cavalry: 12, shield: 8 }, eliteChance: 0.15 },
      { until: 300, rate: [3.8, 4.8], mix: { infantry: 40, bandit: 26, archer: 10, cavalry: 12, shield: 12 }, eliteChance: 0.25 },
    ],
    events: [
      { at: 90, type: 'pack', enemy: 'bandit', count: 10, banner: '해적 기습! 한쪽에서 몰려온다' },
      { at: 165, type: 'pack', enemy: 'archer', count: 6, banner: '갈대숲의 궁수대' },
      { at: 205, type: 'pack', enemy: 'cavalry', count: 6, banner: '해적 기마대가 갯벌을 달려온다!' },
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
    require: { grade: 2, count: 3 }, // gear needed to march here
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
    require: { grade: 3, count: 3 }, // gear needed to march here
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
    require: { grade: 4, count: 3 }, // gear needed to march here
    clearText: '궁성이 열리고 왕건이 즉위한다. 나라 이름은 고려, 연호는 천수(天授).',
    next: 'illicheon',
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
  illicheon: {
    id: 'illicheon',
    order: 5,
    numeral: '五',
    name: '일리천',
    place: '경북 구미 · 선산',
    year: '936',
    intro: '936년 가을, 일리천. 고려군 8만 7천이 강가 벌판에 진을 친다. 아들에게 쫓겨난 늙은 견훤이 고려 편에서 옛 부하들을 바라본다. 삼한의 마지막 싸움이다.',
    ground: 'riverPlain',
    difficulty: { label: '극악', stars: 5, enemyHp: 3.6, enemyDamage: 3.0, spawnRate: 1.35, eliteBonus: 0.22, bossHp: 1.9, bossDamage: 2.0, xpScale: 0.3 },
    require: { grade: 5, count: 2 }, // gear needed to march here
    clearText: '후백제가 무너지고 삼한이 하나가 된다.',
    ending: {
      seal: '統\n一',
      title: '통일 — 삼한이 하나가 되다',
      text: '936년, 신검이 항복하고 후백제가 무너진다. 견훤은 황산의 절에서 숨을 거두고, 신라는 이미 고려에 나라를 넘겼다. 쉰 해 가까이 이어진 난세가 끝났다.',
      alt: {
        gyeonhwon: '가상 결전 — 견훤이 왕건을 꺾었다. 역사와 다른 길이지만, 이 판에서 삼한은 후백제의 깃발 아래 하나가 되었다.',
        gungye: '가상 결전 — 궁예가 왕건을 꺾었다. 미륵의 나라가 다시 일어나 삼한을 하나로 묶었다.',
      },
    },
    bossAt: 300,
    boss: 'singeom',
    bossAlt: { gyeonhwon: 'wanggeonBoss', gungye: 'wanggeonBoss' },
    supplyEvery: 32,
    phases: [
      { until: 60, rate: [1.1, 1.5], mix: { infantry: 44, shield: 14, ironclad: 12, cavalry: 12, bandit: 10, archer: 8 }, eliteChance: 0.08 },
      { until: 120, rate: [1.5, 2.0], mix: { infantry: 30, shield: 14, ironclad: 18, cavalry: 12, eliteCavalry: 10, eliteArcher: 6, bandit: 10 }, eliteChance: 0.14 },
      { until: 240, rate: [2.2, 3.0], mix: { infantry: 20, shield: 14, ironclad: 22, eliteCavalry: 18, cavalry: 10, eliteArcher: 8, bandit: 8 }, eliteChance: 0.2 },
      { until: 300, rate: [3.2, 4.0], mix: { infantry: 18, shield: 14, ironclad: 24, eliteCavalry: 22, cavalry: 8, eliteArcher: 8, bandit: 6 }, eliteChance: 0.24 },
    ],
    events: [
      { at: 60, type: 'pack', enemy: 'ironclad', count: 10, banner: '후백제 중군이 강을 건너온다!' },
      { at: 120, type: 'charge', enemy: 'eliteCavalry', count: 12, width: 420, warn: 1.6, banner: '대규모 기병 돌격! 옆으로 비켜라' },
      { at: 180, type: 'defect', count: 10, life: 25, banner: '견훤의 깃발을 본 후백제 장수들이 창을 거꾸로 든다!',
        altForHero: { gyeonhwon: { type: 'defect', count: 14, life: 30, banner: '옛 주군 견훤을 알아본 후백제 병사들이 그 앞에 엎드린다!' } } },
      { at: 210, type: 'ring', enemy: 'shield', count: 16, banner: '방패진이 강가를 에워싼다!' },
      { at: 240, type: 'charge', enemy: 'eliteCavalry', count: 16, width: 520, warn: 1.4, banner: '두 번째 기병 돌격! 벌판이 울린다' },
      { at: 270, type: 'pack', enemy: 'eliteArcher', count: 8, banner: '강 건너 궁수대' },
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
