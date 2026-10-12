/**
 * 사신의 제단: the daily dungeon that pays 영주 (for drawing 영물) and, on
 * weekends, 사신 정수 (for the four 사신). This file holds the bookkeeping:
 * entry tickets per day, today's guardian, and the currencies kept in the
 * save. The dungeon itself and the 영물 come in later steps.
 *
 * save.altar = { day, tickets, essenceDay }
 *   day        — last day number tickets were topped up for (never goes back)
 *   tickets    — entries left
 *   essenceDay — last day number a 사신 정수 was paid (one per weekend day)
 * save.yeongju — 영주, save.essence — 사신 정수.
 */
import { josa } from '../core/korean.js';

/** Entries per day, and how many may pile up (today's 3 + one missed day). */
export const ALTAR_TICKETS = { perDay: 3, cap: 6 };

/** The guardian of each weekday (0 = Sunday). Weekends let the player choose. */
export const GUARDIANS = {
  cheongnyong: { id: 'cheongnyong', name: '청룡', icon: '🐉', dir: '동', color: '#3fae7a', trait: '바람·번개' },
  jujak: { id: 'jujak', name: '주작', icon: '🐦‍🔥', dir: '남', color: '#e0503a', trait: '불' },
  baekho: { id: 'baekho', name: '백호', icon: '🐅', dir: '서', color: '#d8dce6', trait: '돌진' },
  hyeonmu: { id: 'hyeonmu', name: '현무', icon: '🐢', dir: '북', color: '#3a4f8a', trait: '방어·독' },
};
const WEEKDAY_GUARDIAN = [null, 'cheongnyong', 'jujak', 'baekho', 'hyeonmu', null, null];

/** 사신 정수 needed to call one 사신. */
export const ESSENCE_PER_SASIN = 30;

/** Day number in the player's own time zone (days since 1970-01-01 local). */
export function dayNumber(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Today's guardian id, or null on Friday–Sunday (사신의 날: the player picks). */
export function guardianOf(d = new Date()) {
  return WEEKDAY_GUARDIAN[d.getDay()];
}

/** Friday–Sunday: 사신 정수 can be won and the guardian is chosen. */
export const isSasinDay = (d = new Date()) => guardianOf(d) === null;

/**
 * Brings save.altar up to today: +3 tickets for each new day, at most 6.
 * A clock set back never refills (the stored day only moves forward).
 * Returns the altar record.
 */
export function refreshAltar(save, now = new Date()) {
  const today = dayNumber(now);
  const a = save.altar;
  if (!a || typeof a.day !== 'number') {
    save.altar = { day: today, tickets: ALTAR_TICKETS.perDay, essenceDay: -1 };
    return save.altar;
  }
  if (today > a.day) {
    const days = Math.min(today - a.day, ALTAR_TICKETS.cap);
    a.tickets = Math.min(ALTAR_TICKETS.cap, Math.max(0, a.tickets) + days * ALTAR_TICKETS.perDay);
    a.day = today;
  }
  return a;
}

/** Spends one entry. False if none are left. */
export function useTicket(save, now = new Date()) {
  const a = refreshAltar(save, now);
  if (a.tickets <= 0) return false;
  a.tickets--;
  return true;
}

/**
 * Pays a finished altar run: 영주 always, and one 사신 정수 for the first
 * clear on each 사신의 날. Returns what was paid.
 */
export function payAltar(save, { yeongju = 0, cleared = false }, now = new Date()) {
  const a = refreshAltar(save, now);
  save.yeongju = (save.yeongju ?? 0) + Math.max(0, Math.round(yeongju));
  let essence = 0;
  const today = dayNumber(now);
  if (cleared && isSasinDay(now) && a.essenceDay < today && today >= a.day) {
    essence = 1;
    a.essenceDay = today;
    save.essence = (save.essence ?? 0) + 1;
  }
  return { yeongju: Math.max(0, Math.round(yeongju)), essence };
}

// ------------------------------------------------------------- the dungeon

/**
 * One run at the altar: the base field's waves at double speed for 2:30,
 * then the day's guardian. 영기 drift in across the field; each is worth
 * more on a higher 단계, and felling the guardian adds a burst of them and
 * a clear bonus. Lost runs keep what was gathered (no bonus).
 */
export const ALTAR = {
  bossAt: 150,
  wispEvery: 2.6, // seconds between drifting 영기
  wispLife: 14,
  wispNear: [240, 520], // spawn distance from the hero
  eliteWisps: 1, // 정예 처치 → 영기
  bossWisps: 15, // 수호 영수 격파 → 영기
};

/** 단계 1–10: which field's strength it borrows, and a toughness step on top. */
export const ALTAR_TIERS = [
  null,
  { base: 'seonamhae', mul: 0.6 },
  { base: 'seonamhae', mul: 0.75 },
  { base: 'gongsan', mul: 0.9 },
  { base: 'gongsan', mul: 1.1 },
  { base: 'gochang', mul: 1 },
  { base: 'gochang', mul: 1.2 },
  { base: 'cheorwon', mul: 1 },
  { base: 'cheorwon', mul: 1.2 },
  { base: 'illicheon', mul: 1 },
  { base: 'seomgang', mul: 1.2 },
];
export const ALTAR_MAX_TIER = ALTAR_TIERS.length - 1;

/** The guardian's own ground and the boss that plays it. */
const GUARDIAN_FIELD = {
  cheongnyong: { ground: 'riverPlain', boss: 'g_cheongnyong', place: '동녘 청룡의 못' },
  jujak: { ground: 'autumnHills', boss: 'g_jujak', place: '남녘 주작의 언덕' },
  baekho: { ground: 'mountainPass', boss: 'g_baekho', place: '서녘 백호의 고개' },
  hyeonmu: { ground: 'winterRiver', boss: 'g_hyeonmu', place: '북녘 현무의 강' },
};

/**
 * 단계 t is open once t − 1 has been cleared at the altar and the field it
 * borrows has been pacified (단계 1 is always open).
 */
export function altarTierOpen(save, t) {
  if (t <= 1) return true;
  if (t > ALTAR_MAX_TIER) return false;
  return (save.altarBest ?? 0) >= t - 1 && (save.best?.[ALTAR_TIERS[t].base] ?? 0) > 0;
}

/** 영기 worth on a 단계 (+10% per 단계 above 1) and the clear bonus. */
export const wispWorth = (tier) => 1 + 0.1 * (tier - 1);
export const clearBonus = (tier) => 8 + 4 * tier;

/** 영주 for a run: 영기 × their worth, plus the clear bonus if the guardian fell. */
export function altarYeongju(wisps, tier, cleared) {
  return Math.round(wisps * wispWorth(tier) + (cleared ? clearBonus(tier) : 0));
}

/** The stage played at the altar: `base` is the field the 단계 borrows. */
export function makeAltarStage(base, guardianId, tier) {
  const G = GUARDIANS[guardianId];
  const F = GUARDIAN_FIELD[guardianId];
  const T = ALTAR_TIERS[tier];
  const f = ALTAR.bossAt / base.bossAt;
  const d = { ...base.difficulty };
  for (const k of ['enemyHp', 'enemyDamage', 'bossHp', 'bossDamage']) d[k] = (d[k] ?? 1) * T.mul;
  return {
    ...base,
    altar: { guardian: guardianId, tier },
    name: `사신의 제단 · ${G.name}`,
    place: F.place,
    year: `${tier}단계`,
    intro: `${G.dir}녘을 지키는 ${G.name}의 제단. 떠도는 영기를 모아라 — 2분 30초 뒤 ${josa(G.name, '이')} 깨어난다!`,
    ground: F.ground,
    difficulty: d,
    boss: F.boss,
    bossAlt: {},
    next: null,
    ending: null,
    bossAt: ALTAR.bossAt,
    supplyEvery: Math.max(15, base.supplyEvery * f),
    phases: base.phases.map((p) => ({ ...p, until: p.until * f })),
    events: base.events.map((e) => ({ ...e, at: e.at * f })),
    clearText: `${josa(G.name, '이')} 고개를 숙이고 영기를 내어 준다.`,
  };
}
