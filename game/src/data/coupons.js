/**
 * 쿠폰: a code typed in at home (🎁) gives its gift once per save.
 * Only each code's SHA-256 fingerprint is kept here (make one with
 * `node tools/coupon.mjs "코드"`), so reading the game files does not
 * reveal the codes. `until` (YYYY-MM-DD, inclusive) is optional.
 *
 * gift: { money, yeongju, crystals, essence, tickets, spirits: [id…], items: [itemId…] }
 *   spirits — a 영물 the player lacks joins at ★1; one already owned gets +1 중복
 *   items   — a piece of gear from data/meta.js EQUIPMENT (skipped if owned)
 */
export const COUPONS = [
  { hash: '0c61e892a37ce63c517990f5e5b71c78c46ac323ab2d39e9c36bfacd601b9b1c', name: '환영 선물', gift: { money: 5000, yeongju: 300 } },
  { hash: 'd3a988e632747bb69fbb4f48af8d4b55e1312af78bc4e0670cbc04366aeefc54', name: '사신의 축복', gift: { essence: 5, tickets: 3 } },
  { hash: 'b2d80b408f4003071ab8bf2ee28f2ce9761d38d71ba9d7097f787929efd3d74f', name: '영물의 인연', gift: { spirits: ['fox'], yeongju: 100 } },
];
