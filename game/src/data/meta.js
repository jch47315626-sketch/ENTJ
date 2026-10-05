import { treeNodes, TREASURES } from './trees.js';

/**
 * Progression between runs: money (냥) earned per run, equipment bought
 * and worn in slots, and skills learned in the camp (군영). Everything here
 * is plain data; core/save.js stores what the player owns.
 */

/** Reward multiplier by difficulty stars (1–5). */
export const REWARD_BY_STARS = { 1: 1, 2: 1.8, 3: 3, 4: 4.5, 5: 6.5 };

/** Base 냥 for felling the boss (before the stage multiplier). */
export const BOSS_REWARD = 400;

/** 냥 earned from a run, before the stage multiplier and 재물운. */
export function baseReward({ kills, seconds, won, bossKilled }) {
  return Math.round(kills * 0.6 + seconds * 0.4 + (won ? 150 : 0) + (bossKilled ? BOSS_REWARD : 0));
}

export const SLOTS = [
  { id: 'head', name: '투구' },
  { id: 'body', name: '갑옷' },
  { id: 'charm', name: '장신구' },
  { id: 'wrist', name: '팔찌' },
  { id: 'belt', name: '허리띠' },
  { id: 'feet', name: '신발' },
];

/**
 * Equipment grades. All are on sale from the start; each grade costs about
 * 2–2.5× more than its base price (see EQUIPMENT). `needStars` is kept only
 * as the recommended difficulty for that grade.
 */
export const GRADES = [
  null,
  { id: 1, name: '범품', color: '#9a9184', needStars: 0 },
  { id: 2, name: '양품', color: '#4f8a4a', needStars: 1 },
  { id: 3, name: '상품', color: '#3f6fae', needStars: 2 },
  { id: 4, name: '진품', color: '#8a4fae', needStars: 3 },
  { id: 5, name: '국보', color: '#d6a63e', needStars: 4 },
];

/**
 * Equipment, five grades per slot. `bonus` keys: maxHp, armor, might, haste
 * (cooldown multiplier reduction), speed, momentum, xp (fractions except
 * maxHp/armor). `icon` reuses another item's drawing, tinted by `tint`.
 */
export const EQUIPMENT = [
  { id: 'quilted', slot: 'body', grade: 1, name: '누비옷', price: 150, bonus: { maxHp: 10 }, icon: 'leather', tint: '#c9b48a' },
  { id: 'leather', slot: 'body', grade: 2, name: '가죽 갑옷', price: 1200, bonus: { maxHp: 20 } },
  { id: 'lamellar', slot: 'body', grade: 3, name: '찰갑', price: 3950, bonus: { maxHp: 35, armor: 1 } },
  { id: 'myeonggwang', slot: 'body', grade: 4, name: '명광개', price: 12000, bonus: { maxHp: 55, armor: 2 }, note: '가슴의 둥근 쇠판이 빛을 되쏜다.' },
  { id: 'goldLamellar', slot: 'body', grade: 5, name: '금장 찰갑', price: 30000, bonus: { maxHp: 80, armor: 3 }, icon: 'lamellar', tint: '#d6a63e', note: '왕의 호위만 걸치던 금빛 미늘.' },

  { id: 'hood', slot: 'head', grade: 1, name: '가죽 두건', price: 100, bonus: { maxHp: 8 }, icon: 'ironHelm', tint: '#8a5a32' },
  { id: 'ironHelm', slot: 'head', grade: 2, name: '철투구', price: 1000, bonus: { armor: 1 } },
  { id: 'plumeHelm', slot: 'head', grade: 3, name: '깃털 투구', price: 3300, bonus: { armor: 1, speed: 0.04 } },
  { id: 'gilt', slot: 'head', grade: 4, name: '금동관', price: 10800, bonus: { might: 0.1 } },
  { id: 'goldCrown', slot: 'head', grade: 5, name: '출자형 금관', price: 27500, bonus: { might: 0.15, armor: 1 }, icon: 'gilt', tint: '#ffd76a', note: '나뭇가지 꼴 세움장식에 곡옥이 흔들린다.' },

  { id: 'gogok', slot: 'charm', grade: 1, name: '곡옥 목걸이', price: 200, bonus: { xp: 0.06 } },
  { id: 'hobu', slot: 'charm', grade: 2, name: '호부', price: 1300, bonus: { momentum: 0.12 } },
  { id: 'glassBeads', slot: 'charm', grade: 3, name: '유리구슬 목걸이', price: 3750, bonus: { momentum: 0.15, xp: 0.06 }, icon: 'gogok', tint: '#4a8fc9' },
  { id: 'chunma', slot: 'charm', grade: 4, name: '천마 말다래', price: 11500, bonus: { speed: 0.05, haste: 0.05 } },
  { id: 'goldEarring', slot: 'charm', grade: 5, name: '굵은고리 금귀걸이', price: 27500, bonus: { might: 0.08, haste: 0.06, momentum: 0.1 }, icon: 'goldBangle', tint: '#ffd76a' },

  { id: 'bronzeBangle', slot: 'wrist', grade: 1, name: '청동 팔찌', price: 150, bonus: { haste: 0.02 }, icon: 'silverBangle', tint: '#a8743a' },
  { id: 'silverBangle', slot: 'wrist', grade: 2, name: '은팔찌', price: 1100, bonus: { haste: 0.03 } },
  { id: 'jadeBangle', slot: 'wrist', grade: 3, name: '옥팔찌', price: 3500, bonus: { haste: 0.03, maxHp: 10 }, icon: 'silverBangle', tint: '#5fa97a' },
  { id: 'goldBangle', slot: 'wrist', grade: 4, name: '금팔찌', price: 10100, bonus: { might: 0.06, haste: 0.04 } },
  { id: 'dragonBangle', slot: 'wrist', grade: 5, name: '용무늬 금팔찌', price: 25000, bonus: { might: 0.08, haste: 0.07 }, icon: 'goldBangle', tint: '#c9452e' },

  { id: 'leatherBelt', slot: 'belt', grade: 1, name: '가죽 띠', price: 100, bonus: { maxHp: 8 } },
  { id: 'silverBuckle', slot: 'belt', grade: 2, name: '은 띠고리', price: 1000, bonus: { maxHp: 12, xp: 0.03 }, icon: 'leatherBelt', tint: '#c9ccd0' },
  { id: 'giltBelt', slot: 'belt', grade: 3, name: '금동 허리띠', price: 3300, bonus: { maxHp: 15, armor: 1 }, icon: 'goldBelt', tint: '#b07a48' },
  { id: 'goldBelt', slot: 'belt', grade: 4, name: '금제 허리띠', price: 9600, bonus: { maxHp: 20, xp: 0.08 }, note: '드리개가 찰랑인다.' },
  { id: 'royalBelt', slot: 'belt', grade: 5, name: '황금 과대', price: 25000, bonus: { maxHp: 30, xp: 0.1, armor: 1 }, icon: 'goldBelt', tint: '#ffd76a' },

  { id: 'straw', slot: 'feet', grade: 1, name: '짚신', price: 100, bonus: { speed: 0.03 } },
  { id: 'mokhwa', slot: 'feet', grade: 2, name: '가죽 목화', price: 900, bonus: { speed: 0.04 }, icon: 'giltShoes', tint: '#6b4a2e' },
  { id: 'studded', slot: 'feet', grade: 3, name: '징 박은 신', price: 3100, bonus: { speed: 0.04, armor: 1 }, icon: 'giltShoes', tint: '#7d8288' },
  { id: 'giltShoes', slot: 'feet', grade: 4, name: '금동 신발', price: 9600, bonus: { speed: 0.06, armor: 1 } },
  { id: 'phoenixShoes', slot: 'feet', grade: 5, name: '봉황 무늬 식리', price: 25000, bonus: { speed: 0.08, armor: 2 }, icon: 'giltShoes', tint: '#ffd76a' },
];

const BONUS_TEXT = {
  maxHp: (v) => `최대 체력 +${Math.round(v)}`,
  armor: (v) => `갑주 +${+v.toFixed(1)}`,
  might: (v) => `피해 +${Math.round(v * 100)}%`,
  haste: (v) => `공격 재사용 −${Math.round(v * 100)}%`,
  speed: (v) => `이동 +${Math.round(v * 100)}%`,
  momentum: (v) => `기세 충전 +${Math.round(v * 100)}%`,
  xp: (v) => `공훈 +${Math.round(v * 100)}%`,
};
export const bonusText = (b) => Object.entries(b).map(([k, v]) => BONUS_TEXT[k]?.(v) ?? k).join(', ');
for (const it of EQUIPMENT) it.desc = bonusText(it.bonus) + (it.note ? `. ${it.note}` : '');

/**
 * 제련 (forging): +1 … +5 on an owned item. Each level adds 12% of the
 * item's base bonus; costs climb and the chance of success falls. A failed
 * attempt keeps the level but the money is gone.
 */
export const FORGE = {
  max: 5,
  step: 0.12,
  cost: [0.3, 0.45, 0.65, 0.9, 1.25], // × item price, by current level
  chance: [1, 0.8, 0.6, 0.4, 0.25],
};
export const forgeCost = (item, lv) => Math.round((item.price * FORGE.cost[lv]) / 10) * 10;

/** An item's bonus at forge level `lv`. */
export function itemBonus(item, lv = 0) {
  const k = 1 + FORGE.step * lv;
  const out = {};
  for (const key in item.bonus) out[key] = item.bonus[key] * k;
  return out;
}

/**
 * Entry check for a battlefield: `stage.require = { grade, count }` asks the
 * hero to wear at least `count` pieces of that grade or better.
 */
export function entryCheck(save, heroId, stage) {
  const req = stage.require;
  if (!req) return { ok: true };
  const outfit = save.equipped[heroId] ?? {};
  const have = SLOTS.filter((sl) => (EQUIPMENT.find((e) => e.id === outfit[sl.id])?.grade ?? 0) >= req.grade).length;
  const text = `${GRADES[req.grade].name} 이상 장비 ${req.count}부위 착용 필요 (지금 ${have})`;
  return { ok: have >= req.count, have, need: req.count, grade: GRADES[req.grade], text };
}

/** Highest difficulty the player has cleared (0 = none). */
export const clearedStars = (save) => Math.max(0, ...Object.values(save.best ?? {}));
// Every grade is on sale from the start; higher grades are simply far more expensive.
export const gradeOpen = () => true;

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
  { id: 'secretChain', hero: 'gyeonhwon', name: '철쇄 비전', price: 700, grant: 'chain', desc: '출진할 때부터 철쇄로 궁수를 끌어온다' },
  { id: 'secretVajra', hero: 'gungye', name: '금강저 비전', price: 700, grant: 'vajra', desc: '출진할 때부터 금강저를 쥔다' },
  { id: 'secretGwansim', hero: 'gungye', name: '관심법 비전', price: 700, grant: 'gwansim', desc: '출진할 때부터 관심법 Lv2' },
];

/** Sums every owned bonus for one hero into a single object. */
export function metaBonus(save, heroId) {
  const treeGrants = [];
  const total = {};
  const add = (b) => {
    for (const k in b) total[k] = (total[k] ?? 0) + b[k];
  };
  const outfit = save.equipped[heroId] ?? {};
  for (const slot of SLOTS) {
    const item = EQUIPMENT.find((e) => e.id === outfit[slot.id]);
    if (item) add(itemBonus(item, save.forge?.[item.id] ?? 0));
  }
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    if (lv) add(t.bonus(lv));
  }
  // Hero build: skill-tree nodes and the equipped treasure.
  const bought = save.trees?.[heroId]?.nodes ?? [];
  for (const node of treeNodes(heroId)) {
    if (!bought.includes(node.id)) continue;
    add(node.bonus);
    treeGrants.push(...(node.grants ?? []));
  }
  const treasure = (TREASURES[heroId] ?? []).find((t) => t.id === outfit.treasure);
  if (treasure) add(treasure.bonus);

  const grants = SECRETS.filter((s) => s.hero === heroId && save.secrets.includes(s.id)).map((s) => s.grant);
  return { ...total, grants: [...new Set([...grants, ...treeGrants])] };
}
