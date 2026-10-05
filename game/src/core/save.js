/**
 * Persistent progress (money, gear, training) in this browser's storage.
 * Storage can be missing or blocked, so every access is guarded and the
 * game keeps working with an in-memory save.
 */
const KEY = 'samhan-save-v1';

const fresh = () => ({ money: 0, owned: [], equipped: {}, training: {}, secrets: [], best: {} });

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch {}
  return fresh();
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}
