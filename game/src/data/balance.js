/**
 * Global difficulty curves, by seconds into the stage. Early enemies are
 * fragile and hit softly so the first minutes teach rather than punish.
 */

/** Enemy HP multiplier: 0.65 at the start, ~1.0 at 1:00, ~2.75 at 5:00. */
export const enemyHpScale = (t) => 0.65 + t / 200 + 0.6 * (t / 300) ** 2;

/** Enemy damage multiplier: 45% at the start, full strength from 4:00. */
export const enemyDamageScale = (t) => 0.45 + 0.55 * Math.min(1, t / 240);

/**
 * Global toughness on top of every stage's own multipliers (applies to
 * regular enemies and bosses alike). Does not raise the 공훈 they drop.
 */
export const ENEMY_BOOST = { hp: 1.3, damage: 1.3 };

/** Extra toughness for bosses only, on top of ENEMY_BOOST. */
export const BOSS_BOOST = { hp: 1.6, damage: 1.3 };

/** Natural recovery: share of max HP restored per second (1% every 10 s). */
export const HP_REGEN = 0.001;

/** Enemy armour by stage stars: share of every hit that is shrugged off. */
export const ENEMY_ARMOR = { 1: 0.05, 2: 0.1, 3: 0.15, 4: 0.2, 5: 0.25 };
