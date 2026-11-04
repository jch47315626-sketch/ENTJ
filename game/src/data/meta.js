import { STAGES } from './stages.js';
import { josa } from '../core/korean.js';
import { gyeolgiBonus } from './gyeolgi.js';
import { imprintBonus, imprintSets } from './imprint.js';
import { GEAR_OPTIONS } from './gearOptions.js';
import { SCHOOLS, SCHOOL_ORDER, SCHOOL_SETS, schoolCounts, nodeOf } from './schools.js';

/**
 * Progression between runs: money (냥) earned per run, equipment bought
 * and worn in slots, and skills learned in the camp (군영). Everything here
 * is plain data; core/save.js stores what the player owns.
 */

// Reward multiplier by difficulty stars: kept in data/balance.js (data/stages.js needs it too).
export { REWARD_BY_STARS } from './balance.js';

/**
 * 빠른 시험 모드 (boss at 1:00) pays this share of the 냥: a quick run is
 * about a third as long, so farming a low field on it must not beat a
 * full run on a harder one.
 */
export const QUICK_REWARD = 0.35;

/** Base 냥 for felling the boss, and for winning (before the stage multiplier). */
export const BOSS_REWARD = 700;
export const WIN_BONUS = 150;

/**
 * 황금 룰렛: when a general falls, its 토벌 reward (냥 · 제단 영기 · 무한
 * 결기수정) is multiplied by a spin. WHEEL is the order of the 8 painted
 * slices (×1 twice); every slice is equally likely, ×3 on average.
 */
export const WHEEL = [0.5, 2, 1, 5, 1.5, 10, 1, 3];
export const ROULETTE = WHEEL.map((mul) => ({ mul, w: 1 }));
export const ROULETTE_SPIN = 2.6;
export function rollRoulette(rand = Math.random) {
  let u = rand() * ROULETTE.reduce((a, r) => a + r.w, 0);
  for (const r of ROULETTE) {
    if (u < r.w) return r.mul;
    u -= r.w;
  }
  return 1;
}

/**
 * A lost run still earns part of the victory bonus (150 + 적장 400) by how far
 * it got: up to 35% for holding out until the boss, plus up to 25% for the
 * boss's HP taken off. It goes through the stage multiplier like the rest,
 * so a defeat on a hard field is worth more than one on an easy field.
 */
export const LOSS_SHARE = { reach: 0.35, boss: 0.25 };

/**
 * 냥 earned from a run, before the stage multiplier and 판 보상 bonuses.
 * `reach` (0–1): share of the way to the boss; `bossDone` (0–1): share of
 * the boss's HP taken off. Both only count when the run is lost, and a lost
 * run's whole pay is scaled by `reach`.
 */
export function baseReward({ kills, seconds, won, bossKilled, reach = 0, bossDone = 0 }) {
  if (won) return Math.round(kills * 0.6 + seconds * 0.4 + WIN_BONUS + (bossKilled ? BOSS_REWARD : 0));
  // A defeat is scaled by `reach` as well, so dying early on a field far
  // above one's level (×10–22 냥) never pays better than winning a fitting one.
  // (kept on the old 150 + 400 so a defeat pays what it did when the 토벌 reward rose)
  const consolation = 550 * (LOSS_SHARE.reach * reach + LOSS_SHARE.boss * bossDone);
  return Math.round((kills * 0.6 + seconds * 0.4 + consolation) * Math.min(1, reach));
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
 * Gear template, eight grades per slot (ids kept from older saves). All
 * heroes share it (see EQUIPMENT below). `icon` reuses another item's drawing,
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

/** Name of every piece, by slot, grade 1→8. */
const GEAR_NAMES = {
  body: ['누비옷', '가죽갑옷', '찰갑', '쇄자갑', '명광개', '어린갑', '용비늘갑', '금장 용린갑'],
  head: ['두건', '철투구', '깃 투구', '첨주', '금동관', '해룡 투구', '봉황관', '금관'],
  charm: ['곡옥', '호부', '유리구슬 목걸이', '진주 노리개', '천마 장식', '비취패', '영롱 구슬 목걸이', '금귀걸이'],
  wrist: ['무쇠 팔찌', '은팔찌', '벽옥 팔찌', '쇠토시', '금팔찌', '무늬 토시', '비취 팔찌', '용 금팔찌'],
  belt: ['가죽 띠', '은 띠고리', '금동띠', '혁대', '금제띠', '띠드리개', '옥대', '금 과대'],
  feet: ['짚신', '목화', '징 박은 신', '장화', '금동신', '무늬 목화', '구름 신', '봉황 식리'],
};

/** Id a piece had when each hero kept their own copy (for older saves). */
export const gearId = (heroId, baseId) => `${heroId}.${baseId}`;

/**
 * Every piece of gear. Gear is shared: one armoury for all three heroes,
 * whoever goes out wears the same outfit (save.outfit). Each template piece
 * comes in the five 계열 (data/schools.js): same stats, a different school.
 * The 무(武) piece keeps the template id (older saves); the others are
 * "lamellar@jin" and so on. `base` is the template id (its drawing is
 * reused for the icon).
 */
export const schoolId = (baseId, school) => (school === SCHOOL_ORDER[0] ? baseId : `${baseId}@${school}`);
export const EQUIPMENT = GEAR_BASE.flatMap((b) => SCHOOL_ORDER.map((sc) => ({
  ...b, id: schoolId(b.id, sc), base: b.id, school: sc,
  name: `${SCHOOLS[sc].prefix} ${GEAR_NAMES[b.slot][b.grade - 1]}`, icon: b.icon ?? b.id,
})));
export const GEAR_BASE_IDS = GEAR_BASE.map((b) => b.id);

/**
 * 신물 (grade 9): one per slot, never in the shop. Found only by clearing
 * 난세 10단계+; the fixed bonus is the 국보 piece's ×1.35, and it rolls
 * four option lines (data/gearOptions.js).
 */
const RELIC_NAMES = { body: '삼한 통일갑', head: '일월 금관', charm: '여의보주', wrist: '사해 팔찌', belt: '천하일통대', feet: '천리 질주화' };
for (const slot of ['head', 'body', 'charm', 'wrist', 'belt', 'feet']) {
  const top = GEAR_BASE.find((b) => b.slot === slot && b.grade === TOP_GRADE);
  const bonus = {};
  for (const [k, v] of Object.entries(top.bonus)) bonus[k] = k === 'maxHp' ? Math.round(v * 1.35) : k === 'armor' ? Math.ceil(v * 1.35) : Math.round(v * 1.35 * 100) / 100;
  EQUIPMENT.push({
    id: `relic_${slot}`, slot, grade: 9, relic: true, price: 100000,
    name: RELIC_NAMES[slot], bonus, icon: top.icon ?? top.id, tint: '#ff6b8a',
    note: '🔥 일일 던전에서 난세 10단계 이상을 평정하면 얻는 신물.',
  });
}
export const RELICS = EQUIPMENT.filter((e) => e.relic);

/**
 * 하 · 중 · 상: every grade is climbed in three steps. A bought piece starts
 * at 하; 승급 (냥) raises it to 중 and 상, its bonus moving a third and two
 * thirds of the way to the next grade's (국보 and 신물 toward ×`top`).
 * save.gearTier = { [itemId]: 0 | 1 | 2 }.
 */
export const TIER = { names: ['하', '중', '상'], cost: [0.6, 1], top: 1.3 };
export const TOP_TIER = TIER.names.length - 1;
for (const it of EQUIPMENT) {
  const next = !it.relic && it.grade < TOP_GRADE && GEAR_BASE.find((b) => b.slot === it.slot && b.grade === it.grade + 1);
  it.nextBonus = {};
  for (const k of new Set([...Object.keys(it.bonus), ...Object.keys(next ? next.bonus : {})])) {
    it.nextBonus[k] = next ? next.bonus[k] ?? 0 : (it.bonus[k] ?? 0) * TIER.top;
  }
}
export const tierOf = (save, item) => save.gearTier?.[item.id] ?? 0;
/** 냥 to raise a piece from `tier` to the next. */
export const tierCost = (item, tier) => Math.round((item.price * TIER.cost[tier]) / 10) * 10;

/**
 * Whether a piece may be bought: 범품 always; above that, the armoury must hold
 * the grade below in the same slot at 상 (or already own something higher).
 */
export function canBuy(save, item) {
  if (item.relic) return false;
  if (item.grade <= 1) return true;
  return EQUIPMENT.some((o) => o.slot === item.slot && !o.relic && save.owned.includes(o.id)
    && (o.grade > item.grade || (o.grade === item.grade - 1 && tierOf(save, o) >= TOP_TIER)));
}

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

/** An item's bonus at forge level `lv` and 하·중·상 `tier`. */
export function itemBonus(item, lv = 0, tier = 0) {
  const k = 1 + FORGE.step * lv;
  const f = tier / (TOP_TIER + 1);
  const out = {};
  for (const key in item.nextBonus ?? item.bonus) {
    const a = item.bonus[key] ?? 0, b = item.nextBonus?.[key] ?? a;
    const v = (a + (b - a) * f) * k;
    if (v) out[key] = key === 'maxHp' ? Math.round(v) : Math.round(v * 1000) / 1000;
  }
  return out;
}

/**
 * Entry check for a battlefield: `stage.require = { grade, count }` asks the
 * hero to wear at least `count` pieces of that grade or better.
 */
export function entryCheck(save, heroId, stage) {
  // A field that opens only after another is cleared (양길의 등장: one after another).
  if (stage.unlockAfter && !save.best?.[stage.unlockAfter]) {
    const text = `${josa(STAGES[stage.unlockAfter]?.name ?? stage.unlockAfter, '을')} 평정하면 열려요`;
    return { ok: false, have: 0, need: 1, text, locked: true };
  }
  const req = stage.require;
  if (!req) return { ok: true };
  const outfit = save.outfit ?? {};
  const have = SLOTS.filter((sl) => (EQUIPMENT.find((e) => e.id === outfit[sl.id])?.grade ?? 0) >= req.grade).length;
  const text = `${GRADES[req.grade].name} 이상 장비 ${req.count}부위 착용 필요 (지금 ${have})`;
  return { ok: have >= req.count, have, need: req.count, grade: GRADES[req.grade], text };
}

/** Highest difficulty the player has cleared, whole fields only (0 = none). */
export const clearedStars = (save) => Math.max(0, ...Object.entries(save.best ?? {}).map(([id, v]) => ((STAGES[id]?.level ?? 5) === 5 ? v : 0)));
// Every grade is on sale from the start; higher grades are simply far more expensive.
export const gradeOpen = () => true;

/**
 * Hero secrets (비전): start every run already knowing one of the hero's
 * level-up skills at Lv1. `grant` is an upgrade id from data/upgrades.js.
 */
export const SECRETS = [
  { id: 'secretShin', hero: 'wanggeon', name: '신숭겸 비전', price: 700, grant: 'shin', desc: '출진할 때부터 신숭겸을 부를 수 있다' },
  { id: 'secretHorse', hero: 'wanggeon', name: '말타기 비전', price: 700, grant: 'horse', desc: '출진할 때부터 말타기를 쓴다' },
  { id: 'secretFury', hero: 'gyeonhwon', name: '패기 비전', price: 600, grant: 'fury', desc: '출진할 때부터 패기 Lv1' },
  { id: 'secretChain', hero: 'gyeonhwon', name: '철쇄 비전', price: 700, grant: 'chain', desc: '출진할 때부터 철쇄로 원거리 적을 끌어온다' },
  { id: 'secretVajra', hero: 'gungye', name: '금강저 비전', price: 700, grant: 'vajra', desc: '출진할 때부터 금강저를 쥔다' },
  { id: 'secretGwansim', hero: 'gungye', name: '관심법 비전', price: 700, grant: 'gwansim', desc: '출진할 때부터 관심법 Lv2' },
];

/** Option keys that belong to one hero (data/gearOptions.js GEAR_OPTIONS `hero`). */
const heroOnlyKeys = Object.fromEntries(GEAR_OPTIONS.filter((o) => o.hero).map((o) => [o.key, o.hero]));

/** Sums every owned bonus for one hero into a single object. */
export function metaBonus(save, heroId) {
  const gearGrants = [];
  const worn = [];
  const total = {};
  const add = (b) => {
    for (const k in b) total[k] = (total[k] ?? 0) + b[k];
  };
  const outfit = save.outfit ?? {};
  const wornItems = [];
  for (const slot of SLOTS) {
    const item = EQUIPMENT.find((e) => e.id === outfit[slot.id]);
    if (item) {
      wornItems.push(item);
      // 비결 (data/schools.js NODES): this piece's trick.
      const node = nodeOf(item);
      if (node) {
        add(node.stats ?? {});
        (total.nodes ??= {})[`${item.school}.${item.slot}`] = true;
      }
      add(itemBonus(item, save.forge?.[item.id] ?? 0, tierOf(save, item)));
      // 🔷 속성 각인 (data/imprint.js): the piece's own 속성 stats; sets are counted below.
      const rec = save.imprint?.[item.id];
      if (rec) {
        add(imprintBonus(rec));
        worn.push(rec);
      }
      // 장비 옵션 (data/gearOptions.js): random lines rolled when the piece was obtained.
      for (const l of save.gearOpts?.[item.id] ?? []) {
        // A hero's own line (e.g. 신숭겸 체력) works only for that hero.
        if (!l.special) {
          if (!heroOnlyKeys[l.k] || heroOnlyKeys[l.k] === heroId) add({ [l.k]: l.v });
        }
        // 비기 lines (data/gearOptions.js SPECIAL).
        else if (l.k === 'grant') gearGrants.push(l.v);
        else if (l.k === 'cap') total.caps = { ...(total.caps ?? {}), [l.v]: (total.caps?.[l.v] ?? 0) + 1 };
        else if (l.k === 'proc') total[l.v] = 1;
      }
    }
  }
  // 결기 상점 (무한 전장's 결기수정).
  add(gyeolgiBonus(save));
  const sets = imprintSets(worn);
  if (Object.keys(sets).length) total.imprintSets = sets;
  // 장비 계열: pieces worn per school (책략 at 2, 궁극기 at 4), and the 6-piece bonus.
  const schools = schoolCounts(wornItems);
  if (Object.keys(schools).length) total.schools = schools;
  for (const [sc, n] of Object.entries(schools)) if (n >= SCHOOL_SETS[2]) add(SCHOOLS[sc].six);
  const grants = SECRETS.filter((s) => s.hero === heroId && save.secrets.includes(s.id)).map((s) => s.grant);
  // Copies stack: each one is a level at the start and an extra pick (초월, systems/over.js).
  return { ...total, grants: [...grants, ...gearGrants] };
}
