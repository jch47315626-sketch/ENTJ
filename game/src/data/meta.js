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
 * Equipment grades: eight in the shop, then 신물. All shop grades are on
 * sale from the start; each costs roughly 2–3× the one below. `needStars`
 * is only the recommended difficulty. Grade numbers are used by
 * data/gearOptions.js (line count and strength).
 */
export const GRADES = [
  null,
  { id: 1, name: '범품', color: '#9a9184', needStars: 0 },
  { id: 2, name: '양품', color: '#4f8a4a', needStars: 1 },
  { id: 3, name: '상품', color: '#3f6fae', needStars: 1 },
  { id: 4, name: '정품', color: '#2f9e8f', needStars: 2 },
  { id: 5, name: '진품', color: '#8a4fae', needStars: 3 },
  { id: 6, name: '명품', color: '#d0603c', needStars: 3 },
  { id: 7, name: '보물', color: '#e8892e', needStars: 4 },
  { id: 8, name: '국보', color: '#f2c94c', needStars: 5 },
  // 신물: never sold — only found by clearing 난세 10단계 or higher (see RELICS below).
  { id: 9, name: '신물', color: '#ff6b8a', needStars: 5 },
];
export const TOP_GRADE = 8;

/** 갑주 → share of damage blocked: armor / (armor + 12), at most 80%. */
export const armorCut = (armor) => Math.min(0.8, Math.max(0, armor) / (Math.max(0, armor) + 12));

/**
 * Every piece, whatever its slot, gives 공격력 (might) and 방어력 (armor)
 * by grade; the slot adds its own speciality on top, scaled by grade.
 */
const GRADE_CORE = [null,
  { might: 0.01, armor: 0.2 }, { might: 0.025, armor: 0.5 }, { might: 0.045, armor: 1 }, { might: 0.07, armor: 1.6 },
  { might: 0.1, armor: 2.4 }, { might: 0.14, armor: 3.4 }, { might: 0.19, armor: 4.6 }, { might: 0.25, armor: 6 }];
const GRADE_SCALE = [0, 0.1, 0.2, 0.3, 0.42, 0.55, 0.7, 0.85, 1];
const GRADE_PRICE = [0, 120, 500, 1500, 4000, 9000, 20000, 42000, 85000];
/** Slot speciality at 국보 (grade 8), and the slot's price factor. */
const SLOT_SPECIAL = {
  body: { bonus: { maxHp: 120, armor: 1 }, price: 1.15 },
  head: { bonus: { maxHp: 40, might: 0.05 }, price: 1 },
  charm: { bonus: { momentum: 0.25, xp: 0.1 }, price: 1.1 },
  wrist: { bonus: { haste: 0.1, might: 0.03 }, price: 1 },
  belt: { bonus: { maxHp: 60, xp: 0.1 }, price: 0.95 },
  feet: { bonus: { speed: 0.1, armor: 0.5 }, price: 0.95 },
};
function gradeBonus(slot, grade) {
  const out = { ...GRADE_CORE[grade] };
  for (const [k, v] of Object.entries(SLOT_SPECIAL[slot].bonus)) {
    const x = v * GRADE_SCALE[grade];
    const val = k === 'maxHp' ? Math.round(x / 5) * 5 : k === 'armor' ? Math.round(x * 2) / 2 : Math.round(x * 100) / 100;
    if (val > 0) out[k] = Math.round(((out[k] ?? 0) + val) * 100) / 100;
  }
  return out;
}

/**
 * Gear template, eight grades per slot (ids kept from older saves). Every
 * hero gets their own copy of each piece (see EQUIPMENT below), so gear is
 * never shared between heroes. `icon` reuses another item's drawing,
 * tinted by `tint`. Bonuses and prices come from the tables above.
 */
const GEAR_BASE = [
  { id: 'quilted', slot: 'body', grade: 1, icon: 'leather', tint: '#c9b48a' },
  { id: 'leather', slot: 'body', grade: 2 },
  { id: 'lamellar', slot: 'body', grade: 3 },
  { id: 'chainmail', slot: 'body', grade: 4, icon: 'lamellar', tint: '#9aa6b0' },
  { id: 'myeonggwang', slot: 'body', grade: 5, note: '가슴의 둥근 쇠판이 빛을 되쏜다.' },
  { id: 'scaleMail', slot: 'body', grade: 6, icon: 'lamellar', tint: '#c4583a' },
  { id: 'dragonMail', slot: 'body', grade: 7, icon: 'myeonggwang', tint: '#e8892e' },
  { id: 'goldLamellar', slot: 'body', grade: 8, icon: 'lamellar', tint: '#d6a63e', note: '왕의 호위만 걸치던 금빛 미늘.' },

  { id: 'hood', slot: 'head', grade: 1, icon: 'ironHelm', tint: '#8a5a32' },
  { id: 'ironHelm', slot: 'head', grade: 2 },
  { id: 'plumeHelm', slot: 'head', grade: 3 },
  { id: 'cheomju', slot: 'head', grade: 4, icon: 'ironHelm', tint: '#5f8f8a' },
  { id: 'gilt', slot: 'head', grade: 5 },
  { id: 'warHelm', slot: 'head', grade: 6, icon: 'plumeHelm', tint: '#c4583a' },
  { id: 'dragonHelm', slot: 'head', grade: 7, icon: 'gilt', tint: '#e8892e' },
  { id: 'goldCrown', slot: 'head', grade: 8, icon: 'gilt', tint: '#ffd76a', note: '나뭇가지 꼴 세움장식에 곡옥이 흔들린다.' },

  { id: 'gogok', slot: 'charm', grade: 1 },
  { id: 'hobu', slot: 'charm', grade: 2 },
  { id: 'glassBeads', slot: 'charm', grade: 3, icon: 'gogok', tint: '#4a8fc9' },
  { id: 'norigae', slot: 'charm', grade: 4, icon: 'gogok', tint: '#2f9e8f' },
  { id: 'chunma', slot: 'charm', grade: 5 },
  { id: 'jadePlaque', slot: 'charm', grade: 6, icon: 'hobu', tint: '#d0603c' },
  { id: 'spiritBeads', slot: 'charm', grade: 7, icon: 'gogok', tint: '#e8892e' },
  { id: 'goldEarring', slot: 'charm', grade: 8, icon: 'goldBangle', tint: '#ffd76a' },

  { id: 'bronzeBangle', slot: 'wrist', grade: 1, icon: 'silverBangle', tint: '#a8743a' },
  { id: 'silverBangle', slot: 'wrist', grade: 2 },
  { id: 'jadeBangle', slot: 'wrist', grade: 3, icon: 'silverBangle', tint: '#5fa97a' },
  { id: 'ironBracer', slot: 'wrist', grade: 4, icon: 'silverBangle', tint: '#2f9e8f' },
  { id: 'goldBangle', slot: 'wrist', grade: 5 },
  { id: 'silverBracer', slot: 'wrist', grade: 6, icon: 'goldBangle', tint: '#d0603c' },
  { id: 'jadeBracer', slot: 'wrist', grade: 7, icon: 'goldBangle', tint: '#e8892e' },
  { id: 'dragonBangle', slot: 'wrist', grade: 8, icon: 'goldBangle', tint: '#c9452e' },

  { id: 'leatherBelt', slot: 'belt', grade: 1 },
  { id: 'silverBuckle', slot: 'belt', grade: 2, icon: 'leatherBelt', tint: '#c9ccd0' },
  { id: 'giltBelt', slot: 'belt', grade: 3, icon: 'goldBelt', tint: '#b07a48' },
  { id: 'hyeokdae', slot: 'belt', grade: 4, icon: 'leatherBelt', tint: '#2f9e8f' },
  { id: 'goldBelt', slot: 'belt', grade: 5, note: '드리개가 찰랑인다.' },
  { id: 'pendantBelt', slot: 'belt', grade: 6, icon: 'goldBelt', tint: '#d0603c' },
  { id: 'jadeBelt', slot: 'belt', grade: 7, icon: 'goldBelt', tint: '#e8892e' },
  { id: 'royalBelt', slot: 'belt', grade: 8, icon: 'goldBelt', tint: '#ffd76a' },

  { id: 'straw', slot: 'feet', grade: 1 },
  { id: 'mokhwa', slot: 'feet', grade: 2, icon: 'giltShoes', tint: '#6b4a2e' },
  { id: 'studded', slot: 'feet', grade: 3, icon: 'giltShoes', tint: '#7d8288' },
  { id: 'boots', slot: 'feet', grade: 4, icon: 'giltShoes', tint: '#2f9e8f' },
  { id: 'giltShoes', slot: 'feet', grade: 5 },
  { id: 'fineMokhwa', slot: 'feet', grade: 6, icon: 'giltShoes', tint: '#d0603c' },
  { id: 'cloudShoes', slot: 'feet', grade: 7, icon: 'giltShoes', tint: '#e8892e' },
  { id: 'phoenixShoes', slot: 'feet', grade: 8, icon: 'giltShoes', tint: '#ffd76a' },
];
for (const b of GEAR_BASE) {
  b.bonus = gradeBonus(b.slot, b.grade);
  b.price = Math.round((GRADE_PRICE[b.grade] * SLOT_SPECIAL[b.slot].price) / 10) * 10;
}

/** Each hero's name for every piece, in GEAR_BASE order (slot by slot, grade 1→8). */
const GEAR_NAMES = {
  wanggeon: {
    body: ['송악 누비옷', '해상 가죽갑옷', '고려 찰갑', '수군 쇄자갑', '태조 명광개', '개경 어린갑', '청해 용비늘갑', '금장 용린갑'],
    head: ['뱃사람 두건', '송악 철투구', '청깃 투구', '수군 첨주', '고려 금동관', '해룡 투구', '청옥 봉황관', '태조 금관'],
    charm: ['바다 곡옥', '해신 호부', '청유리 목걸이', '진주 노리개', '해동 천마 장식', '용왕 비취패', '청해 구슬 목걸이', '왕씨 금귀걸이'],
    wrist: ['닻줄 팔찌', '송악 은팔찌', '벽옥 팔찌', '수군 쇠토시', '고려 금팔찌', '파도무늬 토시', '해동 비취 팔찌', '청룡 금팔찌'],
    belt: ['뱃사람 띠', '개경 은 띠고리', '고려 금동띠', '수군 혁대', '개경 금제띠', '청옥 띠드리개', '해동 옥대', '태조 과대'],
    feet: ['갯벌 짚신', '바닷가죽 목화', '징 박은 수군화', '수군 장화', '고려 금동신', '파도무늬 목화', '청학 신', '청봉황 식리'],
  },
  gyeonhwon: {
    body: ['완산 누비옷', '백제 가죽갑옷', '흑철 찰갑', '무진 쇄자갑', '패왕 명광개', '혈철 어린갑', '흑룡 비늘갑', '흑금 찰갑'],
    head: ['무진 두건', '흑철 투구', '붉은깃 투구', '범가죽 첨주', '백제 금동관', '혈철 투구', '흑룡 투구', '패왕 금관'],
    charm: ['범 이빨 목걸이', '무장 호부', '붉은 유리구슬', '홍옥 노리개', '백제 천마 장식', '범발톱 비취패', '핏빛 곡옥', '견씨 금귀걸이'],
    wrist: ['무쇠 팔찌', '완산 은팔찌', '홍옥 팔찌', '흑철 토시', '백제 금팔찌', '혈철 토시', '범무늬 금토시', '흑룡 금팔찌'],
    belt: ['무쇠 띠', '백제 은 띠고리', '완산 금동띠', '범가죽 혁대', '패왕 금제띠', '혈옥 띠드리개', '후백제 옥대', '패왕 과대'],
    feet: ['행군 짚신', '백제 목화', '쇠징 군화', '범가죽 장화', '백제 금동신', '혈철 군화', '흑범 목화', '범무늬 식리'],
  },
  gungye: {
    body: ['승복 누비옷', '태봉 가죽갑옷', '철원 찰갑', '법의 쇄자갑', '미륵 명광개', '자금 가사갑', '보라 연화갑', '금란 가사갑'],
    head: ['승려 두건', '철원 철투구', '보라깃 투구', '법사 첨주', '미륵 금동관', '자수정 보관', '연화 보관', '미륵 보관'],
    charm: ['백팔 염주', '법력 호부', '자수정 구슬', '수정 노리개', '태봉 천마 장식', '혜안 비취패', '법륜 목걸이', '미륵 금귀걸이'],
    wrist: ['단주 팔찌', '철원 은팔찌', '자옥 팔찌', '법사 토시', '태봉 금팔찌', '자수정 단주', '법륜 금팔찌', '금강 금팔찌'],
    belt: ['승려 띠', '태봉 은 띠고리', '철원 금동띠', '법사 혁대', '미륵 금제띠', '자옥 띠드리개', '태봉 옥대', '미륵 과대'],
    feet: ['탁발 짚신', '태봉 목화', '쇠징 신', '법사 장화', '철원 금동신', '자색 목화', '구름 신', '연꽃 식리'],
  },
};

/** Id of one hero's copy of a template piece. */
export const gearId = (heroId, baseId) => `${heroId}.${baseId}`;

/**
 * Every hero's own gear: same slots, grades, prices and bonuses as the
 * template, different names, and only that hero can wear it. `base` is the
 * template id (its drawing is reused for the icon).
 */
export const EQUIPMENT = [];
for (const heroId of Object.keys(GEAR_NAMES)) {
  for (const b of GEAR_BASE) {
    const name = GEAR_NAMES[heroId][b.slot][b.grade - 1];
    EQUIPMENT.push({ ...b, id: gearId(heroId, b.id), base: b.id, hero: heroId, name, icon: b.icon ?? b.id });
  }
}
export const GEAR_BASE_IDS = GEAR_BASE.map((b) => b.id);

/**
 * 신물 (grade 9): one per slot for each hero, never in the shop. Found only
 * by clearing 난세 10단계+; the fixed bonus is the 국보 piece's ×1.35, and
 * it rolls four option lines (data/gearOptions.js).
 */
const RELIC_NAMES = {
  wanggeon: { body: '해동청룡갑', head: '태조 일월관', charm: '여의보주', wrist: '사해 팔찌', belt: '천하일통대', feet: '파도 가르는 신' },
  gyeonhwon: { body: '패왕 흑룡갑', head: '후백제 패왕관', charm: '범의 혼 목걸이', wrist: '피의 맹세 팔찌', belt: '완산 금룡대', feet: '천리 질주화' },
  gungye: { body: '미륵 금란가사', head: '미륵의 금관', charm: '천안 구슬', wrist: '금강 염주', belt: '법왕의 띠', feet: '연화 보행화' },
};
const RELIC_TINT = { wanggeon: '#5aa8ff', gyeonhwon: '#ff5a4a', gungye: '#b48aff' };
for (const heroId of Object.keys(RELIC_NAMES)) {
  for (const slot of ['head', 'body', 'charm', 'wrist', 'belt', 'feet']) {
    const top = GEAR_BASE.find((b) => b.slot === slot && b.grade === TOP_GRADE);
    const bonus = {};
    for (const [k, v] of Object.entries(top.bonus)) bonus[k] = k === 'maxHp' ? Math.round(v * 1.35) : k === 'armor' ? Math.ceil(v * 1.35) : Math.round(v * 1.35 * 100) / 100;
    EQUIPMENT.push({
      id: `${heroId}.relic_${slot}`, slot, grade: 9, hero: heroId, relic: true, price: 100000,
      name: RELIC_NAMES[heroId][slot], bonus, icon: top.icon ?? top.id, tint: RELIC_TINT[heroId],
      note: '난세 10단계 이상을 평정하면 얻는 신물.',
    });
  }
}
export const RELICS = EQUIPMENT.filter((e) => e.relic);

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
  const gearGrants = [];
  const gearNodes = [];
  const total = {};
  const add = (b) => {
    for (const k in b) total[k] = (total[k] ?? 0) + b[k];
  };
  const outfit = save.equipped[heroId] ?? {};
  for (const slot of SLOTS) {
    const item = EQUIPMENT.find((e) => e.id === outfit[slot.id]);
    if (item && item.hero === heroId) {
      add(itemBonus(item, save.forge?.[item.id] ?? 0));
      // 장비 옵션 (data/gearOptions.js): random lines rolled when the piece was obtained.
      for (const l of save.gearOpts?.[item.id] ?? []) {
        if (!l.special) add({ [l.k]: l.v });
        // 비기 lines (data/gearOptions.js SPECIAL).
        else if (l.k === 'grant') gearGrants.push(l.v);
        else if (l.k === 'cap') total.caps = { ...(total.caps ?? {}), [l.v]: (total.caps?.[l.v] ?? 0) + 1 };
        else if (l.k === 'node') gearNodes.push(l.v);
        else if (l.k === 'proc') total[l.v] = 1;
      }
    }
  }
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    if (lv) add(t.bonus(lv));
  }
  // Hero build: skill-tree nodes and the equipped treasure.
  const bought = save.trees?.[heroId]?.nodes ?? [];
  for (const node of treeNodes(heroId)) {
    // A node bought in the tree, or passed on by a piece of gear (counted once).
    if (!bought.includes(node.id) && !gearNodes.includes(node.id)) continue;
    add(node.bonus);
    treeGrants.push(...(node.grants ?? []));
  }
  const treasure = (TREASURES[heroId] ?? []).find((t) => t.id === outfit.treasure);
  if (treasure) add(treasure.bonus);

  const grants = SECRETS.filter((s) => s.hero === heroId && save.secrets.includes(s.id)).map((s) => s.grant);
  return { ...total, grants: [...new Set([...grants, ...treeGrants, ...gearGrants])] };
}
