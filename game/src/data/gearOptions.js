/**
 * 장비 옵션: each piece of gear carries 1–4 random lines on top of its fixed
 * bonus, rolled when it is obtained. 각인 rerolls one line for 냥.
 * Keys are meta-bonus keys read by the game (see data/meta.js metaBonus).
 * `max` is the value of a perfect roll on a 상품 (grade 3) piece; other
 * grades scale it by GRADE_FACTOR. `hero` limits a line to one hero's gear.
 */
export const GEAR_OPTIONS = [
  { key: 'might', icon: '⚔️', text: (v) => `피해 +${pct(v)}`, max: 0.08 },
  { key: 'haste', icon: '⚡', text: (v) => `공격 재사용 −${pct(v)}`, max: 0.06 },
  { key: 'maxHp', icon: '❤️', text: (v) => `최대 체력 +${v}`, max: 30, flat: true },
  { key: 'armor', icon: '🛡️', text: (v) => `갑주 +${v}`, max: 1, flat: true, step: 0.5 },
  { key: 'speed', icon: '👣', text: (v) => `이동 +${pct(v)}`, max: 0.06 },
  { key: 'area', icon: '🌀', text: (v) => `공격 범위 +${pct(v)}`, max: 0.06 },
  { key: 'pickup', icon: '🧲', text: (v) => `엽전 줍는 거리 +${pct(v)}`, max: 0.25 },
  { key: 'momentum', icon: '🔥', text: (v) => `기세 충전 +${pct(v)}`, max: 0.12 },
  { key: 'specialMul', icon: '💥', text: (v) => `고유기 피해 +${pct(v)}`, max: 0.2 },
  { key: 'xp', icon: '⭐', text: (v) => `공훈 +${pct(v)}`, max: 0.08 },
  { key: 'reward', icon: '🪙', text: (v) => `판 보상 냥 +${pct(v)}`, max: 0.08 },
  // Hero lines.
  { key: 'allyMul', icon: '🏯', text: (v) => `아군 피해 +${pct(v)}`, max: 0.15, hero: 'wanggeon' },
  { key: 'orderHaste', icon: '📯', text: (v) => `군령 주기 −${pct(v)}`, max: 0.08, hero: 'wanggeon' },
  { key: 'shinHpMul', icon: '🚩', text: (v) => `신숭겸 체력 +${pct(v)}`, max: 0.3, hero: 'wanggeon' },
  { key: 'counterMul', icon: '💢', text: (v) => `반격 피해 +${pct(v)}`, max: 0.25, hero: 'gyeonhwon' },
  { key: 'drainMul', icon: '🩸', text: (v) => `혈투 회복 +${pct(v)}`, max: 0.3, hero: 'gyeonhwon' },
  { key: 'focusFill', icon: '☄️', text: (v) => `법력 집중 속도 +${pct(v)}`, max: 0.3, hero: 'gungye' },
  { key: 'specialArea', icon: '👁️', text: (v) => `관심법 범위 +${pct(v)}`, max: 0.2, hero: 'gungye' },
];

function pct(v) {
  return `${Math.round(v * 100)}%`;
}

/** Roll strength and number of lines by grade (index = grade 1–6). */
const GRADE_FACTOR = [0, 0.5, 0.75, 1, 1.3, 1.6, 2.2];
const LINES = [0, 1, 1, 2, 2, 3, 4];

const optionPool = (item) => GEAR_OPTIONS.filter((o) => !o.hero || o.hero === item.hero);

function rollValue(o, grade) {
  const raw = o.max * GRADE_FACTOR[grade] * (0.5 + 0.5 * Math.random());
  if (!o.flat) return Math.max(0.01, Math.round(raw * 100) / 100);
  const step = o.step ?? 1;
  return Math.max(step, Math.round(raw / step) * step);
}

/** One random line for `item`, avoiding keys it already has. */
export function rollLine(item, taken = []) {
  const pool = optionPool(item).filter((o) => !taken.includes(o.key));
  const o = pool[Math.floor(Math.random() * pool.length)];
  return { k: o.key, v: rollValue(o, item.grade) };
}

/** A full set of lines for a newly obtained piece. */
export function rollOptions(item) {
  const lines = [];
  for (let i = 0; i < LINES[item.grade]; i++) lines.push(rollLine(item, lines.map((l) => l.k)));
  return lines;
}

/** 각인: replace line `index` with a fresh roll (a different key than the other lines). */
export function rerollLine(item, lines, index) {
  const others = lines.filter((_, i) => i !== index).map((l) => l.k);
  const next = lines.slice();
  next[index] = rollLine(item, others);
  return next;
}

/** Cost of one 각인: a fifth of the piece's price, at least 50냥. */
export const engraveCost = (item) => Math.max(50, Math.round((item.price * 0.2) / 10) * 10);

/** Best possible value of a line on this grade (for showing how good a roll is). */
export const lineMax = (key, grade) => {
  const o = GEAR_OPTIONS.find((x) => x.key === key);
  return o ? o.max * GRADE_FACTOR[grade] : 0;
};

export const lineText = (l) => {
  const o = GEAR_OPTIONS.find((x) => x.key === l.k);
  return o ? `${o.icon} ${o.text(l.v)}` : l.k;
};

/** Every owned piece gets its lines (older saves: rolled once, for free). */
export function ensureGearOptions(save, EQUIPMENT) {
  save.gearOpts ??= {};
  for (const id of save.owned ?? []) {
    if (save.gearOpts[id]) continue;
    const item = EQUIPMENT.find((e) => e.id === id);
    if (item) save.gearOpts[id] = rollOptions(item);
  }
}
