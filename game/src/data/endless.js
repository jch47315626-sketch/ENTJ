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
  spawnGrowth: 300, // spawn rate ×(1 + t / spawnGrowth)
  rampFrom: 240, // after 4:00 the waves harden:
  damageGrowth: 240, // enemy damage ×(1 + (t − rampFrom) / damageGrowth)
  hpGrowth: 300, // enemy health ×(1 + (t − rampFrom) / hpGrowth)
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
