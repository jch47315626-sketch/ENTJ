/**
 * 기능 열림: a new player sees only fighting, going out and buying gear; the
 * rest opens as the campaign goes on, so the screens stay short and nobody
 * has to read about systems they cannot use yet. A save that has already
 * used a system keeps it open whatever its progress.
 */
const won = (s, id) => !!s.best?.[id];

export const UNLOCKS = {
  /** 제련 · 하중상 승급: once a piece has been bought. */
  forge: (s) => (s.owned?.length ?? 0) > 0,
  /** 사신의 제단 (영물): the first battlefield pacified. */
  altar: (s) => won(s, 'seonamhae') || (s.altarRuns ?? 0) > 0,
  /** 일일 던전 · 속성 각인: 공산 pacified. */
  trial: (s) => won(s, 'gongsan') || (s.attrStones ?? 0) > 0 || Object.keys(s.imprint ?? {}).length > 0,
  /** 장비 계열 (다섯 계열 · 비결): 공산 pacified, or a piece of another school owned. */
  schools: (s) => won(s, 'gongsan') || (s.owned ?? []).some((id) => id.includes('@')),
  /** 무한 전장 · 결기: 고창 pacified. */
  endless: (s) => won(s, 'gochang') || (s.crystals ?? 0) > 0 || Object.keys(s.gyeolgi ?? {}).length > 0,
};

/** What opens next, for the one "곧 열려요" line: { icon, name, how } or null. */
export function nextUnlock(s) {
  if (!UNLOCKS.altar(s)) return { icon: '🏯', name: '사신의 제단', how: '서남해 갯벌 평정' };
  if (!UNLOCKS.trial(s)) return { icon: '🔥', name: '일일 던전', how: '공산 평정' };
  if (!UNLOCKS.endless(s)) return { icon: '♾️', name: '무한 전장', how: '고창 평정' };
  return null;
}
