/**
 * 난세 단계: after a battlefield is pacified, the player can stack 난세 패
 * (hardship cards) on it before setting out. Each rank of a card is worth
 * `points`; the sum is the run's 난세 단계. Higher 단계 → more 냥, and the
 * best 단계 cleared is kept per battlefield and hero.
 * `diff` multiplies (or adds to) the stage's difficulty block; flags are
 * read by the game where noted.
 */
export const NANSE_CARDS = [
  { id: 'iron', icon: '🛡️', name: '철갑', desc: (r) => `적 체력 +${25 * r}%`, ranks: 3, points: 1, diff: (d, r) => (d.enemyHp *= 1 + 0.25 * r) },
  { id: 'blade', icon: '🗡️', name: '예기', desc: (r) => `적 공격력 +${20 * r}%`, ranks: 3, points: 1, diff: (d, r) => (d.enemyDamage *= 1 + 0.2 * r) },
  { id: 'horde', icon: '🐜', name: '인해', desc: (r) => `적이 ${20 * r}% 더 몰려온다`, ranks: 3, points: 1, diff: (d, r) => (d.spawnRate *= 1 + 0.2 * r) },
  { id: 'gale', icon: '💨', name: '질풍', desc: (r) => `적 이동 +${12 * r}%`, ranks: 2, points: 1, diff: (d, r) => (d.enemySpeed = (d.enemySpeed ?? 1) * (1 + 0.12 * r)) },
  { id: 'elite', icon: '⚔️', name: '정예', desc: (r) => `정예병 +${15 * r}%p`, ranks: 2, points: 2, diff: (d, r) => (d.eliteBonus = (d.eliteBonus ?? 0) + 0.15 * r) },
  { id: 'warlord', icon: '👹', name: '장군의 분노', desc: (r) => `적장 체력 +${40 * r}%`, ranks: 3, points: 1, diff: (d, r) => (d.bossHp *= 1 + 0.4 * r) },
  { id: 'fierce', icon: '🔥', name: '맹장', desc: (r) => `적장 공격력 +${25 * r}%`, ranks: 2, points: 1, diff: (d, r) => (d.bossDamage *= 1 + 0.25 * r) },
  { id: 'drought', icon: '🥀', name: '가뭄', desc: () => '자연 회복 없음, 주먹밥 회복 절반', ranks: 1, points: 1, diff: (d) => { d.noRegen = true; d.riceMul = 0.5; } },
  { id: 'scarce', icon: '📜', name: '궁핍', desc: () => '레벨업 때 책략 카드가 2장만 나온다', ranks: 1, points: 2, diff: (d) => (d.choiceCount = 2) },
  { id: 'barren', icon: '🏜️', name: '황무지', desc: () => '전장 오브젝트와 감나무 가지가 없다', ranks: 1, points: 1, diff: (d) => { d.noObjects = true; d.crowCount = 0; } },
  { id: 'haste', icon: '⏳', name: '촉박', desc: () => '적장이 1분 일찍 나온다', ranks: 1, points: 2, stage: (s) => (s.bossAt = Math.max(120, s.bossAt - 60)) },
];

export const NANSE_MAX = NANSE_CARDS.reduce((n, c) => n + c.ranks * c.points, 0);

/** 냥 multiplier for a 단계: +10% per level. */
export const nanseRewardMul = (level) => 1 + 0.1 * level;

/** One-time bonus the first time a battlefield is cleared at or above these 단계. */
export const NANSE_MILESTONES = [5, 10, 15, 20, 25];
export const milestoneBonus = (level, stars) => 600 * stars * (level / 5);

/** Total 단계 of a selection ({ cardId: rank }). */
export function nanseLevel(cards = {}) {
  return NANSE_CARDS.reduce((n, c) => n + Math.min(c.ranks, cards[c.id] ?? 0) * c.points, 0);
}

/** A stage with the chosen cards folded into its difficulty (and timing). */
export function applyNanse(stage, cards) {
  const d = { ...stage.difficulty };
  const s = { ...stage, difficulty: d, nanse: { cards: { ...cards }, level: nanseLevel(cards) } };
  for (const c of NANSE_CARDS) {
    const r = Math.min(c.ranks, cards[c.id] ?? 0);
    if (!r) continue;
    c.diff?.(d, r);
    c.stage?.(s, r);
  }
  d.rewardMul = (d.rewardMul ?? 1) * nanseRewardMul(s.nanse.level);
  return s;
}

/** Best 단계 cleared on a battlefield (any hero, or one hero). */
export function bestNanse(save, stageId, heroId) {
  const rec = save.nanse?.[stageId] ?? {};
  if (heroId) return rec[heroId] ?? 0;
  return Math.max(0, ...Object.values(rec));
}
