/**
 * Progression between runs: money (냥) earned per run, equipment bought
 * and worn in slots, and skills learned in the camp (군영). Everything here
 * is plain data; core/save.js stores what the player owns.
 */

/** Reward multiplier by difficulty stars (1–5). */
export const REWARD_BY_STARS = { 1: 1, 2: 1.8, 3: 3, 4: 4.5, 5: 6.5 };

/** 냥 earned from a run, before the stage multiplier and 재물운. */
export function baseReward({ kills, seconds, won, bossKilled }) {
  return Math.round(kills * 0.6 + seconds * 0.4 + (won ? 150 : 0) + (bossKilled ? 100 : 0));
}

export const SLOTS = [
  { id: 'body', name: '갑옷' },
  { id: 'head', name: '투구' },
  { id: 'charm', name: '장신구' },
];

/**
 * Equipment. `bonus` keys: maxHp, armor, might, haste (cooldown multiplier
 * reduction), speed, pickup, momentum, xp (all fractions except maxHp/armor).
 */
export const EQUIPMENT = [
  { id: 'leather', slot: 'body', name: '가죽 갑옷', price: 120, bonus: { maxHp: 15 }, desc: '최대 체력 +15' },
  { id: 'lamellar', slot: 'body', name: '찰갑', price: 450, bonus: { maxHp: 30, armor: 1 }, desc: '최대 체력 +30, 갑주 +1' },
  { id: 'myeonggwang', slot: 'body', name: '명광개', price: 1400, bonus: { maxHp: 50, armor: 2 }, desc: '최대 체력 +50, 갑주 +2. 가슴의 둥근 쇠판이 빛을 되쏜다.' },

  { id: 'ironHelm', slot: 'head', name: '철투구', price: 150, bonus: { armor: 1 }, desc: '갑주 +1' },
  { id: 'plumeHelm', slot: 'head', name: '깃털 투구', price: 500, bonus: { armor: 1, speed: 0.05 }, desc: '갑주 +1, 이동 +5%' },
  { id: 'gilt', slot: 'head', name: '금동관', price: 1500, bonus: { might: 0.12 }, desc: '모든 공격 피해 +12%' },

  { id: 'gogok', slot: 'charm', name: '곡옥 목걸이', price: 200, bonus: { xp: 0.1 }, desc: '공훈 획득 +10%' },
  { id: 'hobu', slot: 'charm', name: '호부', price: 550, bonus: { momentum: 0.2 }, desc: '기세 충전 +20%' },
  { id: 'chunma', slot: 'charm', name: '천마 말다래', price: 1300, bonus: { speed: 0.06, haste: 0.06 }, desc: '이동 +6%, 공격 재사용 −6%' },
];

/** Camp training: permanent, levelled with money. */
export const TRAINING = [
  { id: 'swordDrill', name: '무예 수련', max: 5, price: (lv) => 150 * (lv + 1), bonus: (lv) => ({ might: 0.05 * lv }), desc: '모든 공격 피해 +5%' },
  { id: 'body', name: '체력 단련', max: 5, price: (lv) => 120 * (lv + 1), bonus: (lv) => ({ maxHp: 10 * lv }), desc: '최대 체력 +10' },
  { id: 'riding', name: '기마 훈련', max: 3, price: (lv) => 200 * (lv + 1), bonus: (lv) => ({ speed: 0.04 * lv }), desc: '이동 +4%' },
  { id: 'fortune', name: '재물운', max: 5, price: (lv) => 180 * (lv + 1), bonus: (lv) => ({ reward: 0.1 * lv }), desc: '판이 끝날 때 받는 냥 +10%' },
  { id: 'tactics', name: '병법서', max: 1, price: () => 900, bonus: (lv) => ({ freePicks: lv }), desc: '출진하자마자 책략 하나를 고르고 시작' },
];

/**
 * Hero secrets (비전): start every run already knowing one of the hero's
 * level-up skills at Lv1. `grant` is an upgrade id from data/upgrades.js.
 */
export const SECRETS = [
  { id: 'secretShin', hero: 'wanggeon', name: '신숭겸 비전', price: 700, grant: 'shin', desc: '출진할 때부터 신숭겸을 부를 수 있다' },
  { id: 'secretHorse', hero: 'wanggeon', name: '말타기 비전', price: 700, grant: 'horse', desc: '출진할 때부터 말타기를 쓴다' },
  { id: 'secretFury', hero: 'gyeonhwon', name: '패기 비전', price: 600, grant: 'fury', desc: '출진할 때부터 패기 Lv1' },
  { id: 'secretVajra', hero: 'gungye', name: '금강저 비전', price: 700, grant: 'vajra', desc: '출진할 때부터 금강저를 쥔다' },
  { id: 'secretGwansim', hero: 'gungye', name: '관심법 비전', price: 700, grant: 'gwansim', desc: '출진할 때부터 관심법 Lv2' },
];

/** Sums every owned bonus for one hero into a single object. */
export function metaBonus(save, heroId) {
  const total = {};
  const add = (b) => {
    for (const k in b) total[k] = (total[k] ?? 0) + b[k];
  };
  const outfit = save.equipped[heroId] ?? {};
  for (const slot of SLOTS) {
    const item = EQUIPMENT.find((e) => e.id === outfit[slot.id]);
    if (item) add(item.bonus);
  }
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    if (lv) add(t.bonus(lv));
  }
  const grants = SECRETS.filter((s) => s.hero === heroId && save.secrets.includes(s.id)).map((s) => s.grant);
  return { ...total, grants };
}
