/**
 * 🔥 일일 던전 (난세의 시련): once a day. The day's 난세 패 are drawn at
 * random (the same all day), on the campaign field two steps below the
 * furthest field the player has pacified. It pays 속성결정 (save.attrStones),
 * the more the harder the draw; at 난세 10단계 or more a clear may also bring
 * a 신물.
 *
 * save.trial = { day, done, cleared } — `done` once today's run has started.
 */
import { STAGE_ORDER, STAGES } from './stages.js';
import { NANSE_CARDS, nanseLevel } from './nanse.js';
import { dayNumber } from './altar.js';

export const TRIAL = {
  levels: [4, 14], // the day's 난세 단계 falls in this range
  below: 2, // how many fields below the furthest pacified one
  lossShare: 0.3, // share of the 속성결정 kept when the run is lost
  relicFrom: 10, // 난세 단계 from which a clear may bring a 신물
};

/** 속성결정 for a clear, by the field's stars (×(1 + 0.1 × 난세 단계)). */
export const ATTR_BY_STARS = { 1: 12, 2: 18, 3: 26, 4: 36, 5: 48, 6: 64 };
export const ATTR_ICON = '🔷';
export const ATTR_NAME = '속성결정';

/** Seeded random (mulberry32) so a date gives the same draw all day. */
function rng(seedText) {
  let h = 1779033703;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The field the dungeon is fought on: two below the furthest pacified one (the first if none). */
export function trialStageId(save) {
  let top = -1;
  STAGE_ORDER.forEach((id, i) => {
    if (save.best?.[id]) top = i;
  });
  return STAGE_ORDER[Math.max(0, top - TRIAL.below)];
}

/** Today's 난세 패: { cardId: rank }, adding random ranks until the drawn 단계 is reached. */
export function trialCards(day = dayNumber()) {
  const r = rng(`samhan-trial-${day}`);
  const [lo, hi] = TRIAL.levels;
  const target = lo + Math.floor(r() * (hi - lo + 1));
  const cards = {};
  for (let guard = 0; guard < 200 && nanseLevel(cards) < target; guard++) {
    const open = NANSE_CARDS.filter((c) => (cards[c.id] ?? 0) < c.ranks && nanseLevel(cards) + c.points <= target);
    if (!open.length) break;
    const c = open[Math.floor(r() * open.length)];
    cards[c.id] = (cards[c.id] ?? 0) + 1;
  }
  return cards;
}

/** Today's dungeon: { day, stageId, cards, level, reward }. */
export function trialFor(save, now = new Date()) {
  const day = dayNumber(now);
  const stageId = trialStageId(save);
  const cards = trialCards(day);
  const level = nanseLevel(cards);
  return { day, stageId, cards, level, reward: attrReward(STAGES[stageId].difficulty.stars, level, true) };
}

/** 속성결정 for a run. */
export function attrReward(stars, level, cleared) {
  const full = (ATTR_BY_STARS[stars] ?? 12) * (1 + 0.1 * level);
  return Math.round(cleared ? full : full * TRIAL.lossShare);
}

/** Whether today's run has been used (a clock set back never reopens it). */
export function trialDone(save, now = new Date()) {
  const t = save.trial;
  return !!t && Number.isFinite(t.day) && t.day >= dayNumber(now) && !!t.done;
}

/** Marks today's run as used. False if it already was. */
export function useTrial(save, now = new Date()) {
  if (trialDone(save, now)) return false;
  save.trial = { day: dayNumber(now), done: true, cleared: false };
  return true;
}
