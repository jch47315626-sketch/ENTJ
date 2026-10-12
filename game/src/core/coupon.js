import { COUPONS } from '../data/coupons.js';
import { SPIRITS, companionSlots } from '../data/spirits.js';
import { EQUIPMENT } from '../data/meta.js';
import { refreshAltar } from '../data/altar.js';
import { todayKey } from '../data/daily.js';

/** Same rule as tools/coupon.mjs: upper case, no spaces or dashes. */
export const normCoupon = (c) => String(c ?? '').toUpperCase().replace(/[\s-]/g, '');

async function fingerprint(code) {
  const bytes = new TextEncoder().encode(`samhan-coupon:${normCoupon(code)}`);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Uses a coupon on the save. Resolves to { ok: true, name, lines: [text…] }
 * or { ok: false, reason }.
 */
export async function redeemCoupon(save, code) {
  const c = normCoupon(code);
  if (c.length < 4) return { ok: false, reason: '쿠폰 코드를 입력해 주세요.' };
  if (!globalThis.crypto?.subtle) return { ok: false, reason: '이 브라우저에서는 쿠폰을 확인할 수 없어요.' };
  const hash = await fingerprint(c);
  const cp = COUPONS.find((x) => x.hash === hash);
  if (!cp) return { ok: false, reason: '없는 쿠폰 코드예요. 철자를 확인해 주세요.' };
  save.coupons ??= [];
  if (save.coupons.includes(hash)) return { ok: false, reason: '이미 받은 쿠폰이에요.' };
  if (cp.until && todayKey() > cp.until) return { ok: false, reason: `기간이 끝난 쿠폰이에요 (${cp.until}까지).` };
  save.coupons.push(hash);
  const g = cp.gift, lines = [];
  const n = (v) => v.toLocaleString();
  if (g.money) { save.money += g.money; lines.push(`🪙 ${n(g.money)}냥`); }
  if (g.yeongju) { save.yeongju = (save.yeongju ?? 0) + g.yeongju; lines.push(`🔮 영주 ${n(g.yeongju)}`); }
  if (g.crystals) { save.crystals = (save.crystals ?? 0) + g.crystals; lines.push(`💎 결기수정 ${n(g.crystals)}`); }
  if (g.essence) { save.essence = (save.essence ?? 0) + g.essence; lines.push(`✨ 사신 정수 ${n(g.essence)}`); }
  if (g.tickets) {
    // Gift tickets may go past the daily cap.
    const a = refreshAltar(save);
    a.tickets += g.tickets;
    lines.push(`🎟️ 제단 입장권 ${g.tickets}장`);
  }
  for (const id of g.spirits ?? []) {
    const s = SPIRITS[id];
    if (!s) continue;
    save.spirits ??= {};
    if (save.spirits[id]) {
      save.spirits[id].dupes = (save.spirits[id].dupes ?? 0) + 1;
      lines.push(`${s.icon} ${s.name} 중복 +1`);
    } else {
      save.spirits[id] = { stars: 1, dupes: 0, branch: null };
      save.companions ??= [];
      if (save.companions.length < companionSlots(save)) save.companions.push(id);
      lines.push(`${s.icon} 영물 ${s.name}`);
    }
  }
  for (const id of g.items ?? []) {
    const it = EQUIPMENT.find((e) => e.id === id);
    if (!it || save.owned.includes(id)) continue;
    save.owned.push(id);
    lines.push(`🛡️ ${it.name}`);
  }
  return { ok: true, name: cp.name, lines };
}

