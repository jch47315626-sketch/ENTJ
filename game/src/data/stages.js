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
