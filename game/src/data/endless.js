/**
 * ♾️ 무한 전장: any battlefield with no end. The field's own enemy waves keep
 * coming and keep getting tougher; every ENDLESS.bossEvery seconds its boss
 * returns, stronger each time. The run ends only when the hero falls; the
 * record is how long they lasted.
 */
export const ENDLESS = {
  bossEvery: 180, // seconds between bosses
  bossHpStep: 0.5, // each later boss: +50% health
  bossDamageStep: 0.2, // … and +20% damage
  spawnGrowth: 600, // spawn rate ×(1 + t / spawnGrowth)
  damageGrowth: 600, // after 5:00, enemy damage ×(1 + (t − 300) / damageGrowth)
  bossBounty: 0.5, // share of the normal boss reward paid per boss felled
};

/** A copy of `stage` set up for endless play. */
export function makeEndless(stage) {
  return {
    ...stage,
    endless: true,
    bossAt: ENDLESS.bossEvery,
    phases: stage.phases.map((p) => ({ ...p })),
    events: stage.events.map((e) => ({ ...e })),
  };
}
