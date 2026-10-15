/**
 * 입장 횟수.
 *   ⚔️ 출진 횟수 (일반 전장): up to STAMINA.max at a time; one comes back every
 *      STAMINA.every ms. save.stamina = { n, at } — `at` is when the next
 *      recovery started counting (kept at "now" while full).
 *   ♾️ 무한 전장: ENDLESS_PER_DAY runs a day. save.endlessDay = { day, left }.
 * 오늘의 전장 and 사신의 제단 keep their own rules and are not counted here.
 */
import { dayNumber } from './altar.js';

export const STAMINA = { max: 5, every: 30 * 60 * 1000 };
export const ENDLESS_PER_DAY = 3;

/** Brings save.stamina up to `now` and returns { n, max, nextIn (ms, 0 when full) }. */
export function staminaOf(save, now = Date.now()) {
  let s = save.stamina;
  if (!s || !Number.isFinite(s.n) || !Number.isFinite(s.at)) s = save.stamina = { n: STAMINA.max, at: now };
  s.n = Math.max(0, Math.min(STAMINA.max, Math.floor(s.n)));
  if (s.at > now) s.at = now; // a clock set back never counts backwards
  if (s.n < STAMINA.max) {
    const k = Math.floor((now - s.at) / STAMINA.every);
    if (k > 0) {
      s.n = Math.min(STAMINA.max, s.n + k);
      s.at += k * STAMINA.every;
    }
  }
  if (s.n >= STAMINA.max) s.at = now;
  return { n: s.n, max: STAMINA.max, nextIn: s.n >= STAMINA.max ? 0 : s.at + STAMINA.every - now };
}

/** Spends one 출진 횟수. False if none are left. */
export function useStamina(save, now = Date.now()) {
  const st = staminaOf(save, now);
  if (st.n <= 0) return false;
  save.stamina.n--;
  return true;
}

/** "12:34" until the next 출진 횟수 (or '' when full). */
export function staminaWait(save, now = Date.now()) {
  const { nextIn } = staminaOf(save, now);
  if (!nextIn) return '';
  const sec = Math.ceil(nextIn / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** One line for the menus: "⚔️ 출진 3/5 · 12:34 뒤 +1". */
export function staminaText(save, now = Date.now()) {
  const st = staminaOf(save, now);
  const wait = staminaWait(save, now);
  return `⚔️ 출진 횟수 ${st.n}/${st.max}${wait ? ` · ${wait} 뒤 +1` : ' · 가득'}`;
}

/** ♾️ 무한 전장 runs left today (refilled to 3 on a new day; a clock set back never refills). */
export function endlessLeft(save, now = new Date()) {
  const today = dayNumber(now);
  const e = save.endlessDay;
  if (!e || !Number.isFinite(e.day) || today > e.day) save.endlessDay = { day: today, left: ENDLESS_PER_DAY };
  save.endlessDay.left = Math.max(0, Math.min(ENDLESS_PER_DAY, Math.floor(save.endlessDay.left)));
  return save.endlessDay.left;
}

/** Spends one 무한 전장 run. False if today's are used up. */
export function useEndlessEntry(save, now = new Date()) {
  if (endlessLeft(save, now) <= 0) return false;
  save.endlessDay.left--;
  return true;
}
