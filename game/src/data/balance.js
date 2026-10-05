/**
 * Global difficulty curves, by seconds into the stage. Early enemies are
 * fragile and hit softly so the first minutes teach rather than punish.
 */

/** Enemy HP multiplier: 0.65 at the start, ~1.0 at 1:00, ~2.75 at 5:00. */
export const enemyHpScale = (t) => 0.65 + t / 200 + 0.6 * (t / 300) ** 2;

/** Enemy damage multiplier: 45% at the start, full strength from 4:00. */
export const enemyDamageScale = (t) => 0.45 + 0.55 * Math.min(1, t / 240);
