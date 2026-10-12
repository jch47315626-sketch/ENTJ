#!/usr/bin/env node
/**
 * 쿠폰 지문 만들기: node tools/coupon.mjs "코드"
 * Prints the SHA-256 fingerprint to paste into game/src/data/coupons.js.
 * The code itself never goes into the game files.
 */
import { createHash } from 'node:crypto';

const norm = (c) => String(c).toUpperCase().replace(/[\s-]/g, '');
const code = process.argv[2];
if (!code) {
  console.error('사용법: node tools/coupon.mjs "코드"');
  process.exit(1);
}
const hash = createHash('sha256').update(`samhan-coupon:${norm(code)}`).digest('hex');
console.log(`코드 ${norm(code)}\n지문 ${hash}`);
