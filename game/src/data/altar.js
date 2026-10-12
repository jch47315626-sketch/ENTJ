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
export const ESSENCE_PER_SASIN = 39;

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
