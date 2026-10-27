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
    crowCalls: g.runStats.crowCalls,
    objects: g.runStats.objects ?? 0,
    endless: !!g.stage.endless,
    endlessLayer: g.stage.endless && won ? g.stage.layer : 0,
    crowBest: g.runStats.crowBest,
  };
}

/** Adds a battle's numbers to the lifetime stats. */
export function recordRun(save, run) {
  const st = save.stats;
  st.crowCalls = (st.crowCalls ?? 0) + run.crowCalls;
  st.crowBest = Math.max(st.crowBest ?? 0, run.crowBest);
  st.objects = (st.objects ?? 0) + run.objects;
  // 무한 전장: the deepest layer of 마계 felled.
  st.endlessLayer = Math.max(st.endlessLayer ?? 0, run.endlessLayer ?? 0);
  if (run.won) {
    st.bosses = (st.bosses ?? 0) + 1;
    // A 마계 layer is not a campaign field: it does not count as that hero's win.
    if (!run.endless) {
      st.heroBest = { ...(st.heroBest ?? {}) };
      st.heroBest[run.hero] = Math.max(st.heroBest[run.hero] ?? 0, run.stars);
    }
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

/** Takes one reward (냥, or 영주 for `currency: 'yeongju'`). Returns { money, yeongju } paid. */
export function claimAchievement(save, id) {
  if (save.ach[id] !== 'ready') return { money: 0, yeongju: 0 };
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  save.ach[id] = 'done';
  if (a.currency === 'yeongju') {
    save.yeongju = (save.yeongju ?? 0) + a.reward;
    return { money: 0, yeongju: a.reward };
  }
  save.money += a.reward;
  return { money: a.reward, yeongju: 0 };
}

export const readyCount = (save) => ACHIEVEMENTS.filter((a) => save.ach?.[a.id] === 'ready').length;
