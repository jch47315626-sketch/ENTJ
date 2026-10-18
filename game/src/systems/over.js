/**
 * 초월: a 책략 handed out more than once at the start (비전 and gear 비기
 * stack) begins that many levels up, and the levels it skipped can still be
 * taken after its last level. Each such extra pick (p.over[id]) makes the
 * skill hit harder and reach wider while it acts.
 */
export const OVER = { dmg: 0.2, area: 0.1 };

/** How many 초월 picks the 책략 has. */
export const overOf = (p, id) => p.over?.[id] ?? 0;

/**
 * Runs `fn` with the hero's damage and reach raised by the 책략's 초월.
 * A skill that recalculates the hero's stats mid-cast gets a fresh object,
 * so restoring the old one is harmless.
 */
export function withOver(p, id, fn) {
  const n = overOf(p, id);
  if (!n) return fn();
  const s = p.stats;
  const keep = { might: s.might, area: s.area };
  s.might *= 1 + OVER.dmg * n;
  s.area *= 1 + OVER.area * n;
  try {
    return fn();
  } finally {
    Object.assign(s, keep);
  }
}
