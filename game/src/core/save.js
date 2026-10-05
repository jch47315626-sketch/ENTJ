/**
 * Persistent progress (money, gear, training) in this browser's storage.
 * Storage can be missing or blocked, so every access is guarded and the
 * game keeps working with an in-memory save.
 */
import { HEROES } from '../data/heroes.js';
import { SLOTS, GEAR_BASE_IDS, gearId } from '../data/meta.js';

const KEY = 'samhan-save-v1';

// equipped: { [heroId]: { [slotId]: itemId } } — each hero wears their own gear.
// trees: { [heroId]: { nodes: [nodeId] } } — skill-tree purchases (both paths may be learned).
const fresh = () => ({ money: 0, owned: [], equipped: {}, training: {}, secrets: [], best: {}, trees: {}, forge: {}, codex: { kills: {}, runs: 0, wins: 0, earned: 0 }, ach: {}, stats: {} });
// codex: lifetime record for the 도감 — kills by enemy/boss id, runs, wins, 냥 earned.
// forge: { [itemId]: 0..5 } — 제련 level of each owned item.

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

/** Older saves had one shared outfit; give it to every hero. */
function migrate(save) {
  save.codex = { kills: {}, runs: 0, wins: 0, earned: 0, ...(save.codex ?? {}) };
  // 업적: id → 'ready' | 'done'; stats: lifetime counts for them (core/achieve.js).
  save.ach ??= {};
  save.stats ??= {};
  const shared = SLOTS.some((s) => typeof save.equipped[s.id] === 'string');
  if (shared) {
    const outfit = {};
    for (const s of SLOTS) if (save.equipped[s.id]) outfit[s.id] = save.equipped[s.id];
    save.equipped = {};
    for (const id in HEROES) save.equipped[id] = { ...outfit };
  }
  splitSharedGear(save);
  return save;
}

/**
 * Gear used to be shared by all heroes; now each hero has their own copy.
 * A piece bought before the split becomes one copy per hero (with its forge
 * level), so nothing already paid for is lost.
 */
function splitSharedGear(save) {
  const old = new Set(GEAR_BASE_IDS);
  if (!save.owned.some((id) => old.has(id))) return;
  const owned = [];
  for (const id of save.owned) {
    if (!old.has(id)) owned.push(id);
    else for (const h in HEROES) owned.push(gearId(h, id));
  }
  save.owned = [...new Set(owned)];
  for (const id of Object.keys(save.forge ?? {})) {
    if (!old.has(id)) continue;
    for (const h in HEROES) save.forge[gearId(h, id)] = Math.max(save.forge[gearId(h, id)] ?? 0, save.forge[id]);
    delete save.forge[id];
  }
  for (const [h, outfit] of Object.entries(save.equipped ?? {})) {
    for (const s of SLOTS) if (old.has(outfit?.[s.id])) outfit[s.id] = gearId(h, outfit[s.id]);
  }
}

/** A hero's skill-tree state. */
export function treeOf(save, heroId) {
  return (save.trees[heroId] ??= { nodes: [], branch: null });
}

/** The outfit one hero is wearing ({ slotId: itemId }). */
export function outfitOf(save, heroId) {
  return (save.equipped[heroId] ??= {});
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}
