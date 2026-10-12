import { ENEMIES } from './enemies.js';
import { BOSSES } from './bosses.js';
import { SPIRITS, SPIRIT_LIST } from './spirits.js';

/**
 * 도감 단계 보상: every 도감 entry pays again and again as it grows — a foe
 * by how many have fallen, a general by how often it was beaten, a 영물 by
 * its stars. save.codexTier[key] = tiers already claimed (key 'foe:id',
 * 'boss:id', 'spirit:id').
 */
export const FOE_TIERS = [[10, 30], [100, 120], [500, 500], [2000, 1500], [10000, 5000]]; // [처치, 냥]
export const BOSS_TIERS = [[1, 200], [3, 500], [10, 1500], [30, 4000], [100, 10000]]; // [격파, 냥]
/** 영물: ★1…★5, 영주 × the grade's weight. */
export const SPIRIT_TIERS = [[1, 5], [2, 10], [3, 20], [4, 40], [5, 80]];
const SPIRIT_WEIGHT = [0, 1, 1.5, 2, 3, 4];

export const FOES = () => Object.values(ENEMIES).filter((e) => e.behavior !== 'static');
export const GENERALS = () => Object.values(BOSSES).filter((b) => b.look && !b.minion);

/** One entry's tiers: [{ need, reward, currency }], how far it has got (`now`) and what is claimed. */
export function codexEntry(save, kind, id) {
  const kills = save.codex?.kills ?? {};
  let now, tiers;
  if (kind === 'spirit') {
    const w = SPIRIT_WEIGHT[SPIRITS[id].grade];
    now = save.spirits?.[id]?.stars ?? 0;
    tiers = SPIRIT_TIERS.map(([need, r]) => ({ need, reward: Math.round(r * w), currency: 'yeongju' }));
  } else {
    now = kills[id] ?? 0;
    tiers = (kind === 'boss' ? BOSS_TIERS : FOE_TIERS).map(([need, reward]) => ({ need, reward, currency: 'money' }));
  }
  const key = `${kind}:${id}`;
  const claimed = save.codexTier?.[key] ?? 0;
  const reached = tiers.filter((t) => now >= t.need).length;
  return { key, kind, id, now, tiers, claimed, reached, ready: reached - claimed };
}

/** Every entry that can pay. */
export function allCodexEntries(save) {
  return [
    ...FOES().map((e) => codexEntry(save, 'foe', e.id)),
    ...GENERALS().map((b) => codexEntry(save, 'boss', b.id)),
    ...SPIRIT_LIST.map((s) => codexEntry(save, 'spirit', s.id)),
  ];
}

/** How many tier rewards are waiting. */
export const codexReadyCount = (save) => allCodexEntries(save).reduce((n, e) => n + Math.max(0, e.ready), 0);

/** Claims every reached tier of one entry. Returns { money, yeongju }. */
export function claimCodex(save, kind, id) {
  const e = codexEntry(save, kind, id);
  const got = { money: 0, yeongju: 0 };
  if (e.ready <= 0) return got;
  for (let i = e.claimed; i < e.reached; i++) {
    const t = e.tiers[i];
    got[t.currency] += t.reward;
  }
  save.money += got.money;
  save.yeongju = (save.yeongju ?? 0) + got.yeongju;
  (save.codexTier ??= {})[e.key] = e.reached;
  return got;
}

/** Claims everything waiting in one 도감 tab ('foe' covers foes and generals). */
export function claimCodexAll(save, kinds) {
  const got = { money: 0, yeongju: 0 };
  for (const e of allCodexEntries(save)) {
    if (!kinds.includes(e.kind) || e.ready <= 0) continue;
    const g = claimCodex(save, e.kind, e.id);
    got.money += g.money;
    got.yeongju += g.yeongju;
  }
  return got;
}
