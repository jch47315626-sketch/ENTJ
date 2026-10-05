import { ACHIEVEMENTS, isMet } from '../data/achievements.js';
import { SLOTS } from '../data/meta.js';

/**
 * 업적 bookkeeping. save.ach[id] is 'ready' (met, reward not taken yet)
 * or 'done' (reward taken). save.stats holds lifetime counts that the
 * 도감 record does not already keep.
 */

/** What one finished battle contributes (from the Game instance). */
export function runFacts(g, won, save) {
  const p = g.player;
  const outfit = save.equipped?.[p.hero.id] ?? {};
  return {
    won,
    hero: p.hero.id,
    stars: g.stage.difficulty.stars,
    level: p.level,
    kills: g.kills,
    hpRatio: Math.max(0, p.hp) / p.stats.maxHp,
    bossSeen: !!g.runStats.bossSeen,
    hurtInBoss: Math.round(g.runStats.hurtInBoss),
    gearWorn: SLOTS.filter((sl) => outfit[sl.id]).length,
    drained: Math.round(g.runStats.drained),
    crowCalls: g.runStats.crowCalls,
    objects: g.runStats.objects ?? 0,
    endless: !!g.stage.endless,
    endlessTime: g.stage.endless ? Math.floor(g.time) : 0,
    endlessBosses: g.endlessBosses ?? 0,
    crowBest: g.runStats.crowBest,
  };
}

/** Adds a battle's numbers to the lifetime stats. */
export function recordRun(save, run) {
  const st = save.stats;
  st.drained = (st.drained ?? 0) + run.drained;
  st.crowCalls = (st.crowCalls ?? 0) + run.crowCalls;
  st.crowBest = Math.max(st.crowBest ?? 0, run.crowBest);
  st.objects = (st.objects ?? 0) + run.objects;
  st.endlessBest = Math.max(st.endlessBest ?? 0, run.endlessTime);
  st.endlessBosses = Math.max(st.endlessBosses ?? 0, run.endlessBosses);
  if (run.won) {
    st.bosses = (st.bosses ?? 0) + 1;
    st.heroBest = { ...(st.heroBest ?? {}) };
    st.heroBest[run.hero] = Math.max(st.heroBest[run.hero] ?? 0, run.stars);
  }
}

/** Marks newly met 업적 as ready; returns them (for the result card). */
export function checkAchievements(save, run = null) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (save.ach[a.id]) continue;
    if (isMet(a, save, run)) {
      save.ach[a.id] = 'ready';
      fresh.push(a);
    }
  }
  return fresh;
}

/** Takes one reward. Returns the 냥 paid (0 if it was not ready). */
export function claimAchievement(save, id) {
  if (save.ach[id] !== 'ready') return 0;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  save.ach[id] = 'done';
  save.money += a.reward;
  return a.reward;
}

export const readyCount = (save) => Object.values(save.ach ?? {}).filter((v) => v === 'ready').length;
