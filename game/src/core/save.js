/**
 * Persistent progress (money, gear, training) in this browser's storage.
 * Storage can be missing or blocked, so every access is guarded and the
 * game keeps working with an in-memory save.
 */
import { HEROES } from '../data/heroes.js';
import { SLOTS } from '../data/meta.js';

const KEY = 'samhan-save-v1';

// equipped: { [heroId]: { [slotId]: itemId } } — each hero wears their own gear.
// trees: { [heroId]: { nodes: [nodeId], branch: 'A' | 'B' | null } } — skill-tree purchases.
const fresh = () => ({ money: 0, owned: [], equipped: {}, training: {}, secrets: [], best: {}, trees: {}, forge: {} });
// forge: { [itemId]: 0..5 } — 제련 level of each owned item.

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...fresh(), ...JSON.parse(raw) });
  } catch {}
  return fresh();
}

/** Older saves had one shared outfit; give it to every hero. */
function migrate(save) {
  const shared = SLOTS.some((s) => typeof save.equipped[s.id] === 'string');
  if (shared) {
    const outfit = {};
    for (const s of SLOTS) if (save.equipped[s.id]) outfit[s.id] = save.equipped[s.id];
    save.equipped = {};
    for (const id in HEROES) save.equipped[id] = { ...outfit };
  }
  return save;
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
