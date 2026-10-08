/**
 * ♾️ 무한 전장: any battlefield with no end. The field's own enemy waves keep
 * coming and keep getting tougher; every ENDLESS.bossEvery seconds its boss
 * returns, stronger each time. The run ends only when the hero falls; the
 * record is how long they lasted.
 */
export const ENDLESS = {
  bossEvery: 180, // seconds between bosses
  bossHpStep: 0.8, // each later boss: +80% health
  bossDamageStep: 0.3, // … and +30% damage
  spawnGrowth: 220, // spawn rate ×(1 + t / spawnGrowth)
  rampFrom: 240, // after 4:00 the waves harden:
  damageGrowth: 240, // enemy damage ×(1 + (t − rampFrom) / damageGrowth)
  hpGrowth: 300, // enemy health ×(1 + (t − rampFrom) / hpGrowth)
  bossBounty: 0.5, // share of the normal boss reward paid per boss felled
  // From 7:00 the climb itself steepens: every minute adds a bigger step of
  // enemy damage than the one before (+8%, +16%, +24% … on top).
  surgeFrom: 420,
  surgeStep: 0.08,
};

/**
 * 마계: 무한 전장 is fought in its own dark realm, whatever field was chosen.
 * The chosen field still sets the difficulty, foes and boss; the tempo is
 * faster (more foes, quicker feet).
 */
export const MAGYE = {
  ground: 'demonRealm',
  terrain: { rocks: 0.14, bog: 0.22, clear: 240, bogSlow: 0.35, demon: true },
  spawnRate: 1.4,
  enemySpeed: 1.15,
};

/**
 * 신의 분노: stand (nearly) still for `idle` seconds and lightning is called
 * down — a warned circle, then a bolt that ignores armour.
 */
export const WRATH = { idle: 20, radius: 70, warn: 1, share: 0.45, again: 1.5, hint: 12 };

/** A copy of `stage` set up for endless play. */
export function makeEndless(stage) {
  const d = stage.difficulty;
  return {
    ...stage,
    name: `마계 · ${stage.name}`,
    ground: MAGYE.ground,
    terrain: MAGYE.terrain,
    dark: true,
    difficulty: { ...d, spawnRate: (d.spawnRate ?? 1) * MAGYE.spawnRate, enemySpeed: (d.enemySpeed ?? 1) * MAGYE.enemySpeed },
    endless: true,
    bossAt: ENDLESS.bossEvery,
    phases: stage.phases.map((p) => ({ ...p })),
    events: stage.events.map((e) => ({ ...e })),
  };
}

/** Extra enemy-damage multiplier in endless mode from the 7:00 surge (1 before then). */
export function endlessSurge(t) {
  const x = Math.max(0, t - ENDLESS.surgeFrom) / 60;
  return 1 + ENDLESS.surgeStep * (x * (x + 1)) / 2;
}

/**
 * 결기수정 (무한 전장's only reward): the total owed after `t` seconds grows
 * faster than the time survived (t^1.6), more on harder fields. About 3–5 for
 * a hero with no gear (★1, ~4 min), 50–70 with 명품 gear (★3, ~10 min).
 */
export const CRYSTAL = { a: 0.31, pow: 1.6, byStars: { 1: 1, 2: 2.6, 3: 4.9, 4: 7, 5: 9.5, 6: 12 } };
export const crystalsOwed = (t, stars) => CRYSTAL.a * (t / 60) ** CRYSTAL.pow * (CRYSTAL.byStars[stars] ?? 1);
