/**
 * 장비 계열 (流派): every piece of gear belongs to one of five schools. The
 * stats are the same whatever the school; what changes is how the hero
 * fights. Worn pieces of one school (2 · 4 · 6) open:
 *   2 — that school's 책략 in the level-up cards (any hero can take it),
 *   4 — its 궁극기 (once the 책략 is at its last level),
 *   6 — a strong passive bonus.
 * Gear 신물 have no school.
 *
 * 비결 (NODES): within a school, each of five slots (투구 · 갑옷 · 장신구 ·
 * 팔찌 · 허리띠; 신발 has none) carries its own trick, whatever its grade.
 * One slot holds one school, so choosing a school per slot builds the
 * player's own tree. `stats` add to the meta bonus; `flag` is read by the
 * game (game.js / systems/skills.js / systems/allies.js).
 *
 * `levels` is a cooldown-skill line for systems/skills.js (the last one is
 * the 궁극기, `requires.school` asks for 4 pieces).
 */
export const SCHOOL_SETS = [2, 4, 6];

export const SCHOOLS = {
  mu: {
    id: 'mu', icon: '⚔️', name: '무(武)', title: '검객', color: '#e0503a', prefix: '검객의',
    blurb: '칼바람을 날려 멀리까지 벤다',
    six: { might: 0.25 }, sixText: '모든 피해 +25%',
    skill: 'swordGale',
    levels: [
      { name: '검풍', cooldown: 4, waves: 2, mul: 1.2, desc: '4초마다 칼바람 둘이 가까운 적을 향해 날아가 꿰뚫는다 (무기 피해 ×1.2).' },
      { name: '검풍 · 쌍날', cooldown: 3.6, waves: 3, mul: 1.4, desc: '칼바람 셋, 피해 ×1.4.' },
      { name: '검풍 · 폭풍', cooldown: 3.2, waves: 4, mul: 1.6, desc: '칼바람 넷, 피해 ×1.6.' },
      { name: '만검귀종', cooldown: 2.6, waves: 10, mul: 2.2, ring: true, evolution: true, requires: { school: 'mu', count: 4 },
        desc: '2.6초마다 사방으로 칼바람 열 줄기 (×2.2). 칼바람이 커져 넓게 벤다.' },
    ],
  },
  jin: {
    id: 'jin', icon: '🚩', name: '진(陣)', title: '장수', color: '#3f6fae', prefix: '장수의',
    blurb: '깃발 아래 병사를 불러 모은다',
    six: { allyMul: 0.6, maxHp: 60 }, sixText: '아군 피해 +60%, 최대 체력 +60',
    skill: 'banner',
    levels: [
      { name: '깃발 병사', cooldown: 14, count: 3, life: 10, desc: '14초마다 깃발 병사 셋이 달려와 10초 동안 싸운다.' },
      { name: '깃발 병사 · 오(伍)', cooldown: 12, count: 4, life: 11, desc: '12초마다 넷, 11초.' },
      { name: '깃발 병사 · 대(隊)', cooldown: 10, count: 5, life: 12, desc: '10초마다 다섯, 12초.' },
      { name: '팔진도', cooldown: 9, count: 8, life: 16, burst: 1.5, evolution: true, requires: { school: 'jin', count: 4 },
        desc: '9초마다 병사 여덟이 팔진을 친다 (16초). 쓰러질 때 함성과 함께 주변을 친다.' },
    ],
  },
  sul: {
    id: 'sul', icon: '📜', name: '술(術)', title: '도사', color: '#8a4fae', prefix: '도사의',
    blurb: '부적을 붙여 적진을 터뜨린다',
    six: { specialMul: 0.6, momentum: 0.3 }, sixText: '고유기 피해 +60%, 기세 충전 +30%',
    skill: 'talisman',
    levels: [
      { name: '부적 폭탄', cooldown: 5, count: 2, mul: 2, radius: 70, desc: '5초마다 부적 둘이 적에게 붙었다가 터진다 (×2, 반경 70).' },
      { name: '부적 폭탄 · 삼재', cooldown: 4.5, count: 3, mul: 2.4, radius: 80, desc: '부적 셋, ×2.4.' },
      { name: '부적 폭탄 · 사방', cooldown: 4, count: 4, mul: 2.8, radius: 90, desc: '부적 넷, ×2.8.' },
      { name: '오방신장', cooldown: 3.5, count: 5, mul: 3.6, radius: 115, stun: 0.6, evolution: true, requires: { school: 'sul', count: 4 },
        desc: '다섯 방위의 신장이 부적 다섯을 터뜨린다 (×3.6, 반경 115, 기절).' },
    ],
  },
  gung: {
    id: 'gung', icon: '🏹', name: '궁(弓)', title: '명궁', color: '#4f8a4a', prefix: '명궁의',
    blurb: '쉬지 않고 쇠뇌를 쏜다',
    six: { haste: 0.15, speed: 0.08 }, sixText: '공격 재사용 −15%, 이동 +8%',
    skill: 'crossbow',
    levels: [
      { name: '연노', cooldown: 1.6, bolts: 2, mul: 0.7, pierce: 1, desc: '1.6초마다 쇠뇌 살 둘을 가까운 적에게 (×0.7, 하나 꿰뚫음).' },
      { name: '연노 · 삼연', cooldown: 1.4, bolts: 3, mul: 0.8, pierce: 2, desc: '살 셋, ×0.8, 둘 꿰뚫음.' },
      { name: '연노 · 오연', cooldown: 1.2, bolts: 4, mul: 0.9, pierce: 2, desc: '살 넷, ×0.9.' },
      { name: '신기전', cooldown: 1, bolts: 5, mul: 1, pierce: 3, rocket: { every: 5, spots: 3, radius: 90, dps: 1.2, life: 3 }, evolution: true, requires: { school: 'gung', count: 4 },
        desc: '살 다섯 (×1, 셋 꿰뚫음). 다섯 번째마다 신기전 화살이 적이 몰린 세 곳을 3초 동안 불태운다.' },
    ],
  },
  do: {
    id: 'do', icon: '🍃', name: '도(道)', title: '선인', color: '#2f9e8f', prefix: '선인의',
    blurb: '선단을 빚어 몸을 지킨다',
    six: { maxHp: 150, armor: 2 }, sixText: '최대 체력 +150, 갑주 +2',
    skill: 'elixir',
    levels: [
      { name: '선단', cooldown: 12, heal: 0.08, shield: 0.1, desc: '12초마다 체력 8% 회복, 최대 체력 10%의 보호막.' },
      { name: '선단 · 구전', cooldown: 10, heal: 0.1, shield: 0.15, desc: '10초마다, 회복 10% · 보호막 15%.' },
      { name: '선단 · 금단', cooldown: 8, heal: 0.12, shield: 0.2, desc: '8초마다, 회복 12% · 보호막 20%.' },
      { name: '금강불괴', cooldown: 6, heal: 0.12, shield: 0.35, invuln: 1, pulse: 1.2, evolution: true, requires: { school: 'do', count: 4 },
        desc: '6초마다 회복 12% · 보호막 35% · 1초 무적, 퍼지는 기운이 주변을 친다 (×1.2).' },
    ],
  },
};
export const SCHOOL_ORDER = ['mu', 'jin', 'sul', 'gung', 'do'];

/** 비결 by school and slot. Key in the meta bonus: "mu.head". */
export const NODES = {
  mu: {
    head: { name: '살기', desc: '적을 쓰러뜨릴 때마다 3초 동안 피해 +2% (최대 +30%까지 쌓임)' },
    body: { name: '호신강기', desc: '체력이 절반 아래면 받는 피해 −25%' },
    charm: { name: '검심', desc: '검풍 칼바람 +2줄기' },
    wrist: { name: '쾌검', stats: { haste: 0.1, echo: 1 }, desc: '공격 재사용 −10%, 휘두를 때 20% 확률로 한 번 더' },
    belt: { name: '참철', desc: '정예와 적장에게 주는 피해 +35%' },
  },
  jin: {
    head: { name: '군령', stats: { guardBonus: 2 }, desc: '통솔 창병 · 깃발 병사 +2명' },
    body: { name: '충의', desc: '아군이 곁에 있으면 받는 피해 −15%' },
    charm: { name: '사기', stats: { allyMul: 0.4 }, desc: '아군 피해 +40%' },
    wrist: { name: '척후', desc: '30초마다 척후 궁수 둘이 25초 동안 합류' },
    belt: { name: '군량', desc: '아군 병사가 쓰러질 때마다 체력 1.5% 회복' },
  },
  sul: {
    head: { name: '천기', stats: { momentum: 0.4 }, desc: '기세 충전 +40%' },
    body: { name: '호부', desc: '고유기를 쓰면 최대 체력 15%의 보호막' },
    charm: { name: '부적술', desc: '부적 폭탄 +2장, 폭발 반경 +20%' },
    wrist: { name: '뇌부', desc: '고유기를 쓰면 가까운 적 여섯에게 벼락 (무기 피해 ×3)' },
    belt: { name: '혼백', desc: '적을 쓰러뜨리면 8% 확률로 기세 +10' },
  },
  gung: {
    head: { name: '백보천양', stats: { area: 0.15 }, desc: '공격 범위 +15%' },
    body: { name: '경신', stats: { speed: 0.15 }, desc: '이동 +15%' },
    charm: { name: '화전', desc: '연노 살 +2발, 하나 더 꿰뚫음' },
    wrist: { name: '속사', stats: { haste: 0.12 }, desc: '공격 재사용 −12%' },
    belt: { name: '전통', desc: '10초마다 가까운 적 여덟에게 화살비 (무기 피해 ×1.5)' },
  },
  do: {
    head: { name: '청심', desc: '매초 체력 0.5% 회복' },
    body: { name: '금강', stats: { armor: 3 }, desc: '갑주 +3, 받는 피해 −10%' },
    charm: { name: '선단술', desc: '선단 재사용 −30%, 보호막 +50%' },
    wrist: { name: '흡정', stats: { leech: 0.003 }, desc: '준 피해의 0.3%만큼 체력 회복' },
    belt: { name: '불사', desc: '쓰러지면 한 판에 한 번, 체력 40%로 일어난다' },
  },
};

/** The 비결 of one piece (null for 신발 and 신물). */
export const nodeOf = (item) => (item?.school && NODES[item.school][item.slot]) || null;

/** Worn pieces by school: { mu: 2, … }. */
export function schoolCounts(items) {
  const n = {};
  for (const it of items) if (it?.school) n[it.school] = (n[it.school] ?? 0) + 1;
  return n;
}
