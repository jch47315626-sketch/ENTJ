/**
 * 쿠폰: a code typed in at home (🎁) gives its gift once per save.
 * Only each code's SHA-256 fingerprint is kept here (make one with
 * `node tools/coupon.mjs "코드"`), so reading the game files does not
 * reveal the codes. `until` (YYYY-MM-DD, inclusive) is optional.
 *
 * gift: { money, yeongju, crystals, essence, attrStones, tickets, refill, spirits: [id…], items: [itemId…] }
 *   spirits — a 영물 the player lacks joins at ★1; one already owned gets +1 중복
 *   items   — a piece of gear from data/meta.js EQUIPMENT (skipped if owned)
 *   refill  — 출진 횟수 full again, today's 무한 전장 runs and 일일 던전 back
 * `repeat: true` — usable again and again (for testing; not given to players).
 */
export const COUPONS = [
  { hash: '0c61e892a37ce63c517990f5e5b71c78c46ac323ab2d39e9c36bfacd601b9b1c', name: '환영 선물', gift: { money: 5000, yeongju: 300 } },
  { hash: 'd3a988e632747bb69fbb4f48af8d4b55e1312af78bc4e0670cbc04366aeefc54', name: '사신의 축복', gift: { essence: 5, tickets: 3 } },
  { hash: 'b2d80b408f4003071ab8bf2ee28f2ce9761d38d71ba9d7097f787929efd3d74f', name: '영물의 인연', gift: { spirits: ['fox'], yeongju: 100 } },
  { hash: '8c92658b284456d04563ae95e88a5f211dc49addaab95a504d9dad76edcf6306', name: '영주 만 개', gift: { yeongju: 10000 } },
  { hash: 'cd3d4fcd1d535376968f3868b4210d10ea4ce2bfd5990e3678f600f0eab9d335', name: '엽전 십만 냥', gift: { money: 100000 } },
  // 시험용: every currency in bulk, entries refilled — usable any number of times.
  { hash: 'db9ee3c473e763759a65a03e9831918bc1e9afd5095ebbf105bf5a19a786b2da', name: '시험용 보급', repeat: true,
    gift: { money: 10000000, yeongju: 100000, crystals: 1000000, essence: 120, attrStones: 100000, tickets: 30, refill: true } },
];
