import { HEROES } from './heroes.js';
import { STAGE_ORDER, STAGES } from './stages.js';

/**
 * 오늘의 전장 (daily challenge). The date picks — the same for everyone —
 * one hero, one battlefield (★1–★3) and two rules: a hardship and a boon.
 * The first win of the day pays DAILY_REWARD on top of the normal 냥.
 * Rules change the stage's `difficulty` block (see applyDaily) and the
 * hero's start (`hero` part, read by Player.recalc via meta).
 */
export const HARDSHIPS = [
  { id: 'swarm', icon: '🐜', name: '떼거리', desc: '적이 1.5배 몰려온다', diff: { spawnRate: 1.5 } },
  { id: 'swift', icon: '💨', name: '질풍의 적', desc: '적의 발이 25% 빠르다', diff: { enemySpeed: 1.25 } },
  { id: 'iron', icon: '🛡️', name: '철갑의 적', desc: '적의 체력이 1.5배', diff: { enemyHp: 1.5 } },
  { id: 'glass', icon: '🗡️', name: '배수진', desc: '영웅 체력 −40%, 대신 피해 +40%', hero: { hpMul: 0.6, might: 0.4 } },
  { id: 'drought', icon: '🥀', name: '가뭄', desc: '자연 회복이 없다', diff: { noRegen: true } },
  { id: 'giant', icon: '👹', name: '거대 적장', desc: '적장의 체력 1.6배, 공격 1.2배', diff: { bossHp: 1.6, bossDamage: 1.2 } },
  { id: 'elite', icon: '⚔️', name: '정예의 날', desc: '정예병이 훨씬 자주 나온다', diff: { eliteAdd: 0.15 } },
];
export const BOONS = [
  { id: 'gold', icon: '🪙', name: '풍년', desc: '이번 판 냥 2배', diff: { rewardMul: 2 } },
  { id: 'scholar', icon: '📜', name: '병법의 날', desc: '공훈 1.5배 — 레벨이 빨리 오른다', diff: { xpMul: 1.5 } },
  { id: 'crows', icon: '🐦‍⬛', name: '까마귀 떼', desc: '감나무 가지가 5번 떨어진다', diff: { crowCount: 5 } },
  { id: 'vigor', icon: '💪', name: '기운찬 날', desc: '영웅 체력 +30%', hero: { hpMul: 1.3 } },
];

/** First-win bonus by the battlefield's stars. */
export const DAILY_REWARD = { 1: 1500, 2: 2500, 3: 4000 };

/** Today's date in the player's own time zone, YYYY-MM-DD. */
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Small seeded random (mulberry32) so a date always gives the same picks. */
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

/** The challenge for a date. */
export function dailyFor(date = todayKey()) {
  const r = rng(`samhan-${date}`);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const heroId = pick(Object.keys(HEROES));
  const stageId = pick(STAGE_ORDER.filter((id) => STAGES[id].difficulty.stars <= 3));
  const hardship = pick(HARDSHIPS);
  const boon = pick(BOONS);
  const stars = STAGES[stageId].difficulty.stars;
  return { date, heroId, stageId, rules: [hardship, boon], reward: DAILY_REWARD[stars] };
}

/** A stage with today's rules folded into its difficulty block. */
export function applyDaily(stage, daily) {
  const d = { ...stage.difficulty };
  for (const rule of daily.rules) {
    const x = rule.diff ?? {};
    for (const k of ['spawnRate', 'enemyHp', 'bossHp', 'bossDamage']) if (x[k]) d[k] *= x[k];
    if (x.enemySpeed) d.enemySpeed = (d.enemySpeed ?? 1) * x.enemySpeed;
    if (x.eliteAdd) d.eliteBonus = (d.eliteBonus ?? 0) + x.eliteAdd;
    if (x.rewardMul) d.rewardMul = (d.rewardMul ?? 1) * x.rewardMul;
    if (x.xpMul) d.xpMul = (d.xpMul ?? 1) * x.xpMul;
    if (x.noRegen) d.noRegen = true;
    if (x.crowCount) d.crowCount = x.crowCount;
  }
  return { ...stage, difficulty: d, daily };
}

/** Hero-side rule effects, merged into the run's meta bonus. */
export function dailyHeroBonus(daily) {
  const out = {};
  for (const rule of daily.rules) {
    const h = rule.hero;
    if (!h) continue;
    if (h.hpMul) out.hpMul = (out.hpMul ?? 1) * h.hpMul;
    if (h.might) out.might = (out.might ?? 0) + h.might;
  }
  return out;
}

/** Time left until the next day's challenge, as "H시간 M분". */
export function untilTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.ceil((next - now) / 60000));
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}
