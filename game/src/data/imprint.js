/**
 * 🔷 속성 각인: 속성결정 (일일 던전) is spent on owned gear. Each piece may
 * carry one of the five 오행 (화·수·목·금·토), from Lv1 to Lv10:
 *   - the piece itself gives that 속성's stats, growing with its Lv;
 *   - worn pieces of the same 속성 make a set (2 · 4 · 6 pieces), which
 *     adds a battle technique (see Game: imprintTick / imprintKill).
 * The 속성 can be changed later for a small fee; its Lv is kept.
 *
 * save.imprint = { [itemId]: { el, lv } }
 */
import { ATTR_ICON } from './trial.js';

export const IMPRINT = {
  max: 10,
  first: 50, // 처음 각인 (Lv1)
  // Lv n → n+1 costs step × n^pow (rounded to 10): 40 · 120 · 230 … 1,350 — 5,400 to Lv10.
  step: 40,
  pow: 1.6,
  change: 80, // 속성 바꾸기 (Lv 그대로)
  sets: [2, 4, 6], // pieces of one 속성 for set tiers 1–3
};

/**
 * Per piece, per Lv: `per` adds to the hero's meta bonus (see data/meta.js
 * metaBonus). `set[t]` is the technique at set tier t+1.
 */
export const ELEMENTS = {
  fire: {
    id: 'fire', icon: '🔥', name: '화(火)', color: '#ff6a3a',
    per: { might: 0.03 }, text: (lv) => `피해 +${3 * lv}%`,
    set: [
      { chance: 0.25, mul: 2.5, radius: 90, desc: '적이 쓰러질 때 25% 확률로 터져 주변을 불태운다 (무기 피해 ×2.5)' },
      { chance: 0.45, mul: 3.5, radius: 110, burn: 2.5, desc: '45% 확률로 폭발 (×3.5), 터진 자리에 2.5초 불바다' },
      { chance: 0.75, mul: 5, radius: 130, burn: 4, desc: '75% 확률로 큰 폭발 (×5), 4초 불바다' },
    ],
  },
  water: {
    id: 'water', icon: '💧', name: '수(水)', color: '#4aa8ff',
    per: { maxHp: 20, leech: 0.0003 }, text: (lv) => `최대 체력 +${20 * lv}, 피 회복 +${(0.03 * lv).toFixed(2)}%`,
    set: [
      { regen: 0.008, slow: 0.2, radius: 150, desc: '매초 체력 0.8% 회복, 곁(150)의 적 이동 −20%' },
      { regen: 0.015, slow: 0.35, radius: 180, desc: '매초 체력 1.5% 회복, 곁(180)의 적 이동 −35%' },
      { regen: 0.025, slow: 0.5, radius: 220, desc: '매초 체력 2.5% 회복, 곁(220)의 적 이동 −50%' },
    ],
  },
  wood: {
    id: 'wood', icon: '🌪️', name: '목(木)·바람', color: '#5ad08a',
    per: { haste: 0.015, speed: 0.012 }, text: (lv) => `공격 재사용 −${(1.5 * lv).toFixed(1)}%, 이동 +${(1.2 * lv).toFixed(1)}%`,
    set: [
      { every: 3, radius: 140, mul: 1.5, desc: '3초마다 회오리가 곁(140)을 휩쓸어 적을 날려 버린다 (무기 피해 ×1.5)' },
      { every: 2.5, radius: 175, mul: 2.2, desc: '2.5초마다 더 큰 회오리 (175, ×2.2)' },
      { every: 1.8, radius: 220, mul: 3, desc: '1.8초마다 거대한 회오리 (220, ×3)' },
    ],
  },
  metal: {
    id: 'metal', icon: '⚡', name: '금(金)·벼락', color: '#ffd24a',
    per: { specialMul: 0.05, momentum: 0.03 }, text: (lv) => `고유기 피해 +${5 * lv}%, 기세 충전 +${3 * lv}%`,
    set: [
      { every: 4, count: 3, mul: 2.5, stun: 0.3, desc: '4초마다 벼락이 가까운 적 셋을 내리친다 (무기 피해 ×2.5, 기절)' },
      { every: 3, count: 5, mul: 3.2, stun: 0.5, desc: '3초마다 다섯을 내리친다 (×3.2)' },
      { every: 2, count: 8, mul: 4, stun: 0.8, desc: '2초마다 여덟을 내리친다 (×4, 기절 0.8초)' },
    ],
  },
  earth: {
    id: 'earth', icon: '🪨', name: '토(土)', color: '#c9925a',
    per: { armor: 0.4, maxHp: 10 }, text: (lv) => `갑주 +${(0.4 * lv).toFixed(1)}, 최대 체력 +${10 * lv}`,
    set: [
      { taken: 0.85, desc: '받는 피해 −15%' },
      { taken: 0.7, desc: '받는 피해 −30%' },
      { taken: 0.55, thorns: 1.5, desc: '받는 피해 −45%, 때린 적에게 무기 피해 ×1.5로 되갚는다' },
    ],
  },
};
export const ELEMENT_ORDER = ['fire', 'water', 'wood', 'metal', 'earth'];

/** 속성결정 for the next step of a piece: first 각인, or Lv → Lv+1. */
export const imprintCost = (lv) => (lv ? Math.round((IMPRINT.step * lv ** IMPRINT.pow) / 10) * 10 : IMPRINT.first);

/** Stats one imprinted piece gives. */
export function imprintBonus(rec) {
  const E = rec && ELEMENTS[rec.el];
  if (!E) return {};
  const out = {};
  for (const [k, v] of Object.entries(E.per)) out[k] = v * rec.lv;
  return out;
}

/** Set tiers from worn pieces: { fire: 0–3, … } (only 속성 with a tier). */
export function imprintSets(recs) {
  const n = {};
  for (const r of recs) if (r && ELEMENTS[r.el]) n[r.el] = (n[r.el] ?? 0) + 1;
  const out = {};
  for (const [el, c] of Object.entries(n)) {
    const t = IMPRINT.sets.filter((k) => c >= k).length;
    if (t) out[el] = t;
  }
  return out;
}

/** Text for a piece's 각인, e.g. "🔥 화(火) Lv3 — 피해 +9%". */
export const imprintText = (rec) => {
  const E = rec && ELEMENTS[rec.el];
  return E ? `${E.icon} ${E.name} Lv${rec.lv} — ${E.text(rec.lv)}` : `${ATTR_ICON} 속성 각인 없음`;
};
