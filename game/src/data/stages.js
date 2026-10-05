/**
 * Stages. Phases drive spawning (rate is spawns/second interpolated across the
 * phase); events are one-shot moments; the boss arrives at `bossAt` seconds.
 */
export const STAGES = {
  seonamhae: {
    id: 'seonamhae',
    order: 1,
    name: '서남해 갯벌',
    place: '전남 나주 · 압해도',
    year: '903 ~ 910',
    intro: '903년, 왕건의 수군이 나주에 닿는다. 서남해의 해적 두령 능창이 갯벌에서 기다린다.',
    ground: 'tidalFlat',
    bossAt: 300,
    boss: 'neungchang',
    bossAlt: {},
    supplyEvery: 40,
    phases: [
      { until: 60, rate: [0.9, 1.2], mix: { infantry: 70, bandit: 30 }, eliteChance: 0 },
      { until: 120, rate: [1.2, 1.6], mix: { infantry: 50, bandit: 30, archer: 20 }, eliteChance: 0 },
      { until: 240, rate: [1.8, 2.8], mix: { infantry: 45, bandit: 30, archer: 25 }, eliteChance: 0.15 },
      { until: 300, rate: [3.5, 4.5], mix: { infantry: 50, bandit: 30, archer: 20 }, eliteChance: 0.25 },
    ],
    events: [
      { at: 90, type: 'pack', enemy: 'bandit', count: 10, banner: '해적 기습! 한쪽에서 몰려온다' },
      { at: 165, type: 'pack', enemy: 'archer', count: 8, banner: '갈대숲의 궁수대' },
      { at: 240, type: 'ring', enemy: 'infantry', count: 26, banner: '포위되었다! 길을 열어라' },
    ],
  },
};

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
