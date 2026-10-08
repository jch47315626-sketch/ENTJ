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
];
export const GYEOLGI_FIRST = 100;

/** 결기수정 needed for the next stack of `g` at level `lv`. */
export const gyeolgiCost = (g, lv) => Math.round(GYEOLGI_FIRST * g.grow ** lv);

/** Every stack bought, as one bonus object (added in data/meta.js metaBonus). */
export function gyeolgiBonus(save) {
  const out = {};
  for (const g of GYEOLGI) {
    const lv = save.gyeolgi?.[g.id] ?? 0;
    for (const [k, v] of Object.entries(g.per)) out[k] = (out[k] ?? 0) + v * lv;
  }
  return out;
}
