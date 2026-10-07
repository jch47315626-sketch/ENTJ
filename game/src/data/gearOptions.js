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
  { key: 'daedoCd', icon: '🪓', text: (v) => `대도 재사용 −${pct(v)}`, max: 0.08, hero: 'gyeonhwon' },
  { key: 'focusFill', icon: '☄️', text: (v) => `법력 집중 속도 +${pct(v)}`, max: 0.3, hero: 'gungye' },
  { key: 'specialArea', icon: '👁️', text: (v) => `관심법 범위 +${pct(v)}`, max: 0.2, hero: 'gungye' },
];

/**
 * 비기 lines: instead of a number, they change how the hero fights.
 *   grant — start every battle already holding a 책략 at Lv1
 *   cap   — a 책략 can go one level higher
 *   node  — a skill-tree node works without buying it
 *   proc  — a new technique (see Game: 낙뢰 · 사기충천 · 수호 깃발 · 연환)
 * Found on 진품 (35%) up to 국보 (50%) pieces; every 신물 has one.
 */
export const SPECIAL = {
  grant: {
    any: ['caltrops', 'swift'],
    wanggeon: ['shin', 'horse', 'archers', 'guard'],
    gyeonhwon: ['chain', 'fury'],
    gungye: ['vajra', 'gwansim', 'maguni'],
  },
  cap: {
    any: ['might', 'haste', 'area', 'swift', 'vitality'],
    wanggeon: ['archers', 'guard'],
    gyeonhwon: ['fury'],
    gungye: ['maguni'],
  },
  node: {
    wanggeon: ['wg_a1', 'wg_a2', 'wg_b1', 'wg_b2'],
    gyeonhwon: ['gh_a1', 'gh_a2', 'gh_b1', 'gh_b2'],
    gungye: ['gy_a1', 'gy_a2', 'gy_b1', 'gy_b2'],
  },
  proc: ['thunder', 'rally', 'lastStand', 'echo'],
};
export const PROCS = {
  thunder: { icon: '⚡', name: '낙뢰', desc: '적을 쓰러뜨리면 15% 확률로 그 자리에 벼락이 떨어진다' },
  rally: { icon: '🥁', name: '사기충천', desc: '적을 10명 쓰러뜨릴 때마다 체력 2% 회복' },
  lastStand: { icon: '🚩', name: '수호 깃발', desc: '체력이 30% 아래로 떨어지면 3초간 무적 (60초마다)' },
  echo: { icon: '🔁', name: '연환', desc: '주무기를 휘두를 때 20% 확률로 곧바로 한 번 더' },
};
const SPECIAL_CHANCE = [0, 0, 0, 0, 0, 0.35, 0.4, 0.45, 0.5, 1];

/** Names for 비기 text, filled in by the game at start-up (avoids an import cycle). */
export const NAMES = { upgrade: {}, node: {} };

function rollSpecial(item, takenKinds = []) {
  const kinds = ['grant', 'cap', 'node', 'proc'].filter((k) => !takenKinds.includes(k));
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const S = SPECIAL[kind];
  const pool = kind === 'proc' ? S : kind === 'node' ? S[item.hero] ?? [] : [...(S.any ?? []), ...(S[item.hero] ?? [])];
  return { k: kind, v: pool[Math.floor(Math.random() * pool.length)], special: true };
}

export const specialText = (l) => {
  if (l.k === 'grant') return `📜 출진할 때 「${NAMES.upgrade[l.v] ?? l.v}」 Lv1`;
  if (l.k === 'cap') return `⬆️ 「${NAMES.upgrade[l.v] ?? l.v}」 최대 레벨 +1`;
  if (l.k === 'node') return `🌳 스킬 「${NAMES.node[l.v] ?? l.v}」 전수`;
  const p = PROCS[l.v];
  return p ? `${p.icon} ${p.name} — ${p.desc}` : l.v;
};

function pct(v) {
  return `${Math.round(v * 100)}%`;
}

/** Roll strength and number of lines by grade (index = grade 1–9, see meta.js GRADES). */
const GRADE_FACTOR = [0, 0.5, 0.75, 1, 1.15, 1.3, 1.45, 1.55, 1.7, 2.2];
const LINES = [0, 1, 1, 2, 2, 2, 3, 3, 3, 4];

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

/** A full set of lines for a newly obtained piece (the last may be a 비기). */
export function rollOptions(item) {
  const lines = [];
  const n = LINES[item.grade];
  const special = Math.random() < SPECIAL_CHANCE[item.grade];
  for (let i = 0; i < n - (special ? 1 : 0); i++) lines.push(rollLine(item, lines.map((l) => l.k)));
  if (special) lines.push(rollSpecial(item));
  return lines;
}

/** 각인: replace line `index` with a fresh roll. A 비기 line stays a 비기 (new kind or technique). */
export function rerollLine(item, lines, index) {
  const next = lines.slice();
  if (lines[index].special) {
    let fresh;
    do fresh = rollSpecial(item);
    while (fresh.k === lines[index].k && fresh.v === lines[index].v);
    next[index] = fresh;
    return next;
  }
  const others = lines.filter((l, i) => i !== index && !l.special).map((l) => l.k);
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
  if (l.special) return specialText(l);
  const o = GEAR_OPTIONS.find((x) => x.key === l.k);
  return o ? `${o.icon} ${o.text(l.v)}` : l.k;
};

/** Whether a line still means something (options and 책략 get removed over time). */
function lineValid(item, l) {
  if (!l.special) return GEAR_OPTIONS.some((o) => o.key === l.k && (!o.hero || o.hero === item.hero));
  const S = SPECIAL[l.k];
  if (!S) return false;
  if (l.k === 'proc') return S.includes(l.v);
  if (l.k === 'node') return (S[item.hero] ?? []).includes(l.v);
  return [...(S.any ?? []), ...(S[item.hero] ?? [])].includes(l.v);
}

/** Every owned piece gets its lines (older saves: rolled once, for free); stale lines are rerolled. */
export function ensureGearOptions(save, EQUIPMENT) {
  save.gearOpts ??= {};
  for (const id of save.owned ?? []) {
    const item = EQUIPMENT.find((e) => e.id === id);
    if (!item) continue;
    if (!save.gearOpts[id]) {
      save.gearOpts[id] = rollOptions(item);
      continue;
    }
    const lines = save.gearOpts[id];
    lines.forEach((l, i) => {
      if (lineValid(item, l)) return;
      lines[i] = l.special ? rollSpecial(item) : rollLine(item, lines.filter((x, j) => j !== i && !x.special).map((x) => x.k));
    });
  }
}
