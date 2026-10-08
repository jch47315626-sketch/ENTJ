/**
 * 결기 상점: permanent stats bought with 결기수정 (무한 전장's reward), for
 * every hero. The first stack costs 100; each stack after costs 1.3–1.5×
 * the one before, depending on the stat.
 */
export const GYEOLGI = [
  { id: 'gMight', icon: '⚔️', name: '결기 · 공격', per: { might: 0.03 }, grow: 1.5, text: '피해 +3%' },
  { id: 'gHp', icon: '❤️', name: '결기 · 체력', per: { maxHp: 15 }, grow: 1.3, text: '최대 체력 +15' },
  { id: 'gArmor', icon: '🛡️', name: '결기 · 방어', per: { armor: 0.5 }, grow: 1.4, text: '갑주 +0.5' },
  { id: 'gHaste', icon: '⚡', name: '결기 · 속공', per: { haste: 0.02 }, grow: 1.5, text: '공격 재사용 −2%' },
  { id: 'gSpeed', icon: '👣', name: '결기 · 신속', per: { speed: 0.02 }, grow: 1.4, text: '이동 +2%' },
  { id: 'gMomentum', icon: '🔥', name: '결기 · 기세', per: { momentum: 0.04 }, grow: 1.3, text: '기세 충전 +4%' },
  { id: 'gXp', icon: '⭐', name: '결기 · 공훈', per: { xp: 0.03 }, grow: 1.4, text: '공훈 +3%' },
  // 피 회복: a flat 500 per stack, at most 10 stacks (0.1% of damage dealt in all).
  { id: 'gLeech', icon: '🩸', name: '결기 · 피 회복', per: { leech: 0.0001 }, cost: 500, max: 10, text: '준 피해의 0.01%만큼 체력 회복' },
];
export const GYEOLGI_FIRST = 100;

/** 결기수정 needed for the next stack of `g` at level `lv`. */
export const gyeolgiCost = (g, lv) => g.cost ?? Math.round(GYEOLGI_FIRST * g.grow ** lv);

/** Every stack bought, as one bonus object (added in data/meta.js metaBonus). */
export function gyeolgiBonus(save) {
  const out = {};
  for (const g of GYEOLGI) {
    const lv = save.gyeolgi?.[g.id] ?? 0;
    for (const [k, v] of Object.entries(g.per)) out[k] = (out[k] ?? 0) + v * lv;
  }
  return out;
}
