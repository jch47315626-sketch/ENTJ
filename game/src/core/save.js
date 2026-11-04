/**
 * Persistent progress (money, gear, 결기) in this browser's storage.
 * Storage can be missing or blocked, so every access is guarded and the
 * game keeps working with an in-memory save.
 */
import { STAGES, levelsOf } from '../data/stages.js';
import { SLOTS, EQUIPMENT, gearId } from '../data/meta.js';

const KEY = 'samhan-save-v1';

// outfit: { [slotId]: itemId } — one outfit, worn by whichever hero goes out (gear is shared).
const fresh = () => ({ money: 0, crystals: 0, gyeolgi: {}, owned: [], outfit: {}, secrets: [], best: {}, forge: {}, codex: { kills: {}, runs: 0, wins: 0, earned: 0 }, ach: {}, stats: {}, ...freshSpirit() });
// codex: lifetime record for the 도감 — kills by enemy/boss id, runs, wins, 냥 earned.
// forge: { [itemId]: 0..5 } — 제련 level of each owned item.
// 사신의 제단 and 영물 (data/altar.js): yeongju 영주, essence 사신 정수,
// altar { day, tickets, essenceDay }, spirits { [spiritId]: { stars, dupes, branch } },
// companions [spiritId…] taken into battle, pity draws since the last 신수.
const freshSpirit = () => ({ yeongju: 0, essence: 0, altar: null, spirits: {}, companions: [], pity: 0 });

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...fresh(), ...JSON.parse(raw) });
  } catch {}
  return fresh();
}

// ------------------------------------------------------------ save codes
// A save code is the save as JSON, UTF-8, base64, with a short checksum so a
// mistyped or cut-off code is rejected instead of loading half a save.
const CODE_PREFIX = 'SAMHAN1-';

function checksum(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).padStart(7, '0').slice(-7);
}

/** The whole save as one copyable line. */
export function encodeSave(save) {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const body = btoa(bin);
  return `${CODE_PREFIX}${checksum(body)}-${body}`;
}

/** Reads a save code back. Throws an Error with a Korean message if it is not valid. */
export function decodeSave(code) {
  const text = String(code ?? '').replace(/\s+/g, '');
  if (!text.startsWith(CODE_PREFIX)) throw new Error('삼한난세 저장 코드가 아닙니다.');
  const rest = text.slice(CODE_PREFIX.length);
  const dash = rest.indexOf('-');
  const sum = rest.slice(0, dash), body = rest.slice(dash + 1);
  if (dash < 0 || checksum(body) !== sum) throw new Error('코드가 잘렸거나 바뀌었습니다. 처음부터 끝까지 다시 복사해 주세요.');
  let data;
  try {
    const bin = atob(body);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('코드를 읽을 수 없습니다.');
  }
  if (!data || typeof data !== 'object' || typeof data.money !== 'number' || !Array.isArray(data.owned)) {
    throw new Error('코드 안의 기록이 올바르지 않습니다.');
  }
  return migrate({ ...fresh(), ...data });
}

/** Brings an older save up to date. */
function migrate(save) {
  save.codex = { kills: {}, runs: 0, wins: 0, earned: 0, ...(save.codex ?? {}) };
  // 업적: id → 'ready' | 'done'; stats: lifetime counts for them (core/achieve.js).
  save.ach ??= {};
  save.stats ??= {};
  migrateSpirit(save);
  splitFieldLevels(save);
  refundBuilds(save);
  refundTraining(save);
  mergeHeroGear(save);
  return save;
}

/**
 * 삼한 fields came in one difficulty before they had five 단계; that one is
 * now 5단계 (same id). A field pacified back then counts its 1–4단계 too.
 */
function splitFieldLevels(save) {
  for (const [id, v] of Object.entries(save.best ?? {})) {
    if (!v) continue;
    for (const st of levelsOf(STAGES[id]?.map === id ? id : '')) if (st.id !== id) save.best[st.id] = Math.max(save.best[st.id] ?? 0, v);
  }
}

/** 영주·사신 정수·영물 (added later): fill in what an older save lacks and drop anything malformed. */
function migrateSpirit(save) {
  const base = freshSpirit();
  for (const k of ['yeongju', 'essence', 'pity']) {
    const v = Number(save[k]);
    save[k] = Number.isFinite(v) && v > 0 ? Math.floor(v) : base[k];
  }
  const a = save.altar;
  save.altar = a && Number.isFinite(a.day) ? { day: a.day, tickets: Math.max(0, Math.floor(Number(a.tickets) || 0)), essenceDay: Number.isFinite(a.essenceDay) ? a.essenceDay : -1 } : null;
  if (!save.spirits || typeof save.spirits !== 'object' || Array.isArray(save.spirits)) save.spirits = {};
  if (!Array.isArray(save.companions)) save.companions = [];
  // 쿠폰: fingerprints of the codes already used (core/coupon.js).
  if (!Array.isArray(save.coupons)) save.coupons = [];
}

/**
 * 수련 was taken out of the 성장 tab (its stats live on in 결기): the 냥 paid
 * for it comes back once. Prices as they were: each level cost base × level.
 */
function refundTraining(save) {
  const BASE = { swordDrill: 150, body: 120, riding: 200, fortune: 180 };
  let back = 0;
  for (const [id, lv] of Object.entries(save.training ?? {})) {
    if (id === 'tactics') back += lv ? 900 : 0;
    else for (let i = 1; i <= lv; i++) back += (BASE[id] ?? 0) * i;
  }
  delete save.training;
  if (back) save.money += back;
}

/**
 * 스킬 트리 (영웅의 길) and 보물 were taken out of the game: whatever was paid
 * for them comes back as 냥, once. Prices as they were: nodes 360 · 900 ·
 * 1,950 · 3,900 by depth, treasures 250 · 800 · 2,000.
 */
function refundBuilds(save) {
  const NODE = [360, 900, 1950, 3900], TREASURE = [250, 800, 2000];
  let back = 0;
  for (const t of Object.values(save.trees ?? {})) {
    for (const id of t.nodes ?? []) back += id.endsWith('_root') ? NODE[0] : NODE[Number(id.slice(-1))] ?? 0;
  }
  save.owned = save.owned.filter((id) => {
    if (!id.startsWith('tr_')) return true;
    back += TREASURE[Number(id.slice(-1))] ?? 0;
    return false;
  });
  for (const outfit of Object.values(save.equipped ?? {})) delete outfit?.treasure;
  delete save.trees;
  if (back) save.money += back;
}

/**
 * Gear is shared by all heroes again (one armoury, one outfit). Saves from
 * when each hero had a copy ("wanggeon.lamellar") fold into one piece
 * ("lamellar"), keeping the most of each: the highest 승급 and 제련, the
 * best 각인, and the options of the most raised copy — nothing paid for is
 * lost. The outfit worn is the
 * one of the hero picked last. Older still: a plain outfit of slot → id.
 */
function mergeHeroGear(save) {
  const ids = new Set(EQUIPMENT.map((e) => e.id));
  const legacy = (id) => {
    const m = /^(wanggeon|gyeonhwon|gungye)\.(.+)$/.exec(id ?? '');
    return m ? m[2] : null;
  };
  const eq = save.equipped ?? {};
  if (save.equipped && !Object.keys(save.outfit ?? {}).length) {
    const flat = SLOTS.some((s) => typeof eq[s.id] === 'string');
    const from = flat ? eq : eq[save.sel?.hero] ?? Object.values(eq).find((o) => o && Object.keys(o).length) ?? {};
    save.outfit = {};
    for (const s of SLOTS) {
      const id = from?.[s.id];
      const base = legacy(id) ?? id;
      if (base && ids.has(base)) save.outfit[s.id] = base;
    }
  }
  delete save.equipped;
  if (!save.owned.some((id) => legacy(id))) return;
  const rank = (id) => (save.gearTier?.[id] ?? 0) * 100 + (save.forge?.[id] ?? 0) * 10 + (save.imprint?.[id]?.lv ?? 0);
  const best = {};
  for (const id of save.owned) {
    const base = legacy(id) ?? id;
    if (!ids.has(base)) continue;
    if (!best[base] || rank(id) > rank(best[base])) best[base] = id;
  }
  // Options come with the most raised copy.
  for (const [base, id] of Object.entries(best)) {
    if (id !== base && save.gearOpts?.[id]) save.gearOpts[base] = save.gearOpts[id];
  }
  // 제련 · 승급 · 각인: the highest of any copy.
  for (const id of save.owned) {
    const base = legacy(id);
    if (!base || !best[base]) continue;
    for (const key of ['forge', 'gearTier']) {
      const v = save[key]?.[id];
      if (v > (save[key][base] ?? 0)) save[key][base] = v;
    }
    const rec = save.imprint?.[id];
    if (rec && (!save.imprint[base] || rec.lv > save.imprint[base].lv)) save.imprint[base] = rec;
  }
  for (const key of ['forge', 'gearTier', 'gearOpts', 'imprint']) {
    for (const id of Object.keys(save[key] ?? {})) if (legacy(id)) delete save[key][id];
  }
  save.owned = Object.keys(best);
}

/** The outfit every hero wears ({ slotId: itemId }); gear is shared. */
export function outfitOf(save) {
  return (save.outfit ??= {});
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}
