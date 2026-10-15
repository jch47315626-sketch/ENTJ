import { EQUIPMENT, SLOTS } from './meta.js';
import { STAGES } from './stages.js';
import { SPIRITS, COMBOS } from './spirits.js';

/**
 * 업적: goals with a 냥 reward (영주 for the 사신의 제단 ones, `currency`), claimed from 🎁 보상.
 * `check(save, run)` sees the lifetime save and, at the end of a battle,
 * that battle's facts (`run`, see runFacts in core/achieve.js; null when
 * checked from the menus). Groups only order the list.
 */
const totalKills = (s) => Object.values(s.codex?.kills ?? {}).reduce((a, b) => a + b, 0);
const bestStars = (s) => Math.max(0, ...Object.keys(s.best ?? {}).map((id) => (s.best[id] ? STAGES[id]?.difficulty.stars ?? 0 : 0)));
const heroBest = (s, h) => s.stats?.heroBest?.[h] ?? 0;
const grade = (id) => EQUIPMENT.find((e) => e.id === id)?.grade ?? 0;

export const ACH_GROUPS = [
  ['start', '🌱 첫걸음'],
  ['war', '⚔️ 전장'],
  ['hero', '👑 영웅'],
  ['feat', '🔥 무용담'],
  ['field', '🐦‍⬛ 전장 활용'],
  ['camp', '🏯 군영'],
  ['altar', '🐾 사신의 제단'],
];

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'];
/**
 * 연속 업적: one goal with rising targets, each a separate entry with its own
 * reward (Ⅰ, Ⅱ, Ⅲ …). `steps` = [[target, reward, id?]…] — an id keeps an
 * older single 업적 in its place so what was already claimed stays claimed.
 */
function series(sid, group, icon, name, desc, now, steps, extra = {}) {
  return steps.map(([need, reward, id], i) => ({
    id: id ?? `${sid}${i + 1}`, series: sid, tier: i + 1, tiers: steps.length, group, icon,
    name: `${name} ${ROMAN[i]}`, desc: desc(need), reward, goal: (s) => [now(s), need], ...extra,
  }));
}
const owned = (s) => Object.keys(s.spirits ?? {}).filter((id) => SPIRITS[id]);
const guardianKills = (s) => Object.entries(s.codex?.kills ?? {}).reduce((n, [id, k]) => n + (id.startsWith('g_') ? k : 0), 0);
const n = (v) => v.toLocaleString();

export const ACHIEVEMENTS = [
  // 첫걸음
  { id: 'firstRun', group: 'start', icon: '🚩', name: '첫 출진', desc: '전장에 처음 나간다', reward: 100, check: (s) => s.codex.runs >= 1 },
  { id: 'firstWin', group: 'start', icon: '🎉', name: '첫 평정', desc: '전장 하나를 처음으로 평정한다', reward: 300, check: (s) => s.codex.wins >= 1 },

  // 전장
  { id: 'star2', group: 'war', icon: '⭐', name: '공산의 바람', desc: '★2 전장을 평정한다', reward: 600, check: (s) => bestStars(s) >= 2 },
  { id: 'star3', group: 'war', icon: '🌟', name: '고창의 승전보', desc: '★3 전장을 평정한다', reward: 1500, check: (s) => bestStars(s) >= 3 },
  { id: 'star4', group: 'war', icon: '💫', name: '철원의 주인', desc: '★4 전장을 평정한다', reward: 4000, check: (s) => bestStars(s) >= 4 },
  { id: 'star5', group: 'war', icon: '👑', name: '삼한 통일', desc: '★5 일리천을 평정한다', reward: 10000, check: (s) => bestStars(s) >= 5 },
  { id: 'yanggil1', group: 'war', icon: '⛰️', name: '북원으로 가는 길', desc: '양길의 등장 첫 전장, 섬강 나루를 평정한다', reward: 6000, check: (s) => !!s.best?.seomgang },
  { id: 'yanggil4', group: 'war', icon: '🌲', name: '솔숲을 넘어', desc: '양길의 등장 넷째 전장, 신림 솔숲을 평정한다', reward: 12000, check: (s) => !!s.best?.sillim },
  { id: 'star6', group: 'war', icon: '🏔️', name: '초적왕 토벌', desc: '일곱 전장을 지나 북원성의 양길을 정복한다', reward: 30000, check: (s) => !!s.best?.bukwon },

  // 영웅
  { id: 'winWanggeon', group: 'hero', icon: '🛡️', name: '고려를 세우다', desc: '왕건으로 승리한다', reward: 300, check: (s) => heroBest(s, 'wanggeon') >= 1 },
  { id: 'winGyeonhwon', group: 'hero', icon: '🪓', name: '후백제의 패왕', desc: '견훤으로 승리한다', reward: 300, check: (s) => heroBest(s, 'gyeonhwon') >= 1 },
  { id: 'winGungye', group: 'hero', icon: '👁️', name: '미륵의 강림', desc: '궁예로 승리한다', reward: 300, check: (s) => heroBest(s, 'gungye') >= 1 },
  { id: 'threeKings', group: 'hero', icon: '🏅', name: '세 왕의 시대', desc: '세 영웅 모두 ★3 전장을 평정한다', reward: 5000,
    goal: (s) => [['wanggeon', 'gyeonhwon', 'gungye'].filter((h) => heroBest(s, h) >= 3).length, 3] },

  // 무용담 (한 판 안에서)
  { id: 'level20', group: 'feat', icon: '📜', name: '책략가', desc: '한 판에서 Lv 20에 오른다', reward: 600, check: (s, r) => r && r.level >= 20 },
  { id: 'kills800', group: 'feat', icon: '🌪️', name: '일당백', desc: '한 판에서 적 800명을 쓰러뜨린다', reward: 1000, check: (s, r) => r && r.kills >= 800 },
  { id: 'clutch', group: 'feat', icon: '❤️‍🔥', name: '구사일생', desc: '체력 20% 이하로 적장을 쓰러뜨리고 승리한다', reward: 1200, check: (s, r) => r && r.won && r.bossSeen && r.hpRatio <= 0.2 },
  { id: 'untouched', group: 'feat', icon: '🍃', name: '바람처럼', desc: '적장이 나온 뒤 한 대도 맞지 않고 승리한다', reward: 2500, check: (s, r) => r && r.won && r.bossSeen && r.hurtInBoss === 0 },
  { id: 'naked', group: 'feat', icon: '🎽', name: '맨몸의 영웅', desc: '장비를 하나도 차지 않고 ★2 이상 전장을 평정한다', reward: 2000, check: (s, r) => r && r.won && r.stars >= 2 && r.gearWorn === 0 },

  // 전장 활용
  { id: 'crow1', group: 'field', icon: '🐦‍⬛', name: '까마귀 친구', desc: '감나무 가지를 주워 까마귀를 부른다', reward: 200, check: (s) => (s.stats.crowCalls ?? 0) >= 1 },
  { id: 'crow50', group: 'field', icon: '🪙', name: '까마귀 대박', desc: '까마귀 한 번에 엽전 50개를 모은다', reward: 800, check: (s) => (s.stats.crowBest ?? 0) >= 50 },


  // 전장 오브젝트 · 무한 전장
  { id: 'endlessBoss3', group: 'war', icon: '👹', name: '적장 셋을 넘어', desc: '무한 전장 한 판에서 적장을 3번 쓰러뜨린다', reward: 3000, check: (s) => (s.stats.endlessBosses ?? 0) >= 3 },

  // 난세 단계

  // 장비 옵션 · 신물
  { id: 'relic1', group: 'camp', icon: '🌟', name: '신물의 주인', desc: '일일 던전에서 난세 10단계 이상을 평정해 신물을 처음 얻는다', reward: 3000, check: (s) => (s.stats.relics ?? 0) >= 1 },

  // 군영
  { id: 'fullSet', group: 'camp', icon: '🧥', name: '완전 무장', desc: '한 영웅이 장비 6부위를 모두 찬다', reward: 500,
    check: (s) => Object.values(s.equipped ?? {}).some((o) => SLOTS.every((sl) => o?.[sl.id])) },
  { id: 'kukbo', group: 'camp', icon: '🏺', name: '국보를 품다', desc: '국보 등급 장비를 처음 손에 넣는다', reward: 2000, check: (s) => s.owned.some((id) => grade(id) === 8) },
  { id: 'forge5', group: 'camp', icon: '🔨', name: '명장의 손', desc: '장비 하나를 +5까지 제련한다', reward: 2500, check: (s) => Object.values(s.forge ?? {}).some((lv) => lv >= 5) },
  // ---------------------------------------------------------------- 연속 업적
  ...series('runs', 'start', '🥁', '백전노장', (v) => `${n(v)}번 출진한다`, (s) => s.codex.runs, [[10, 300], [30, 1000, 'runs30'], [100, 3000], [300, 8000], [1000, 20000]]),
  ...series('wins', 'war', '🏯', '평정의 길', (v) => `전장을 ${n(v)}번 평정한다`, (s) => s.codex.wins, [[10, 800], [50, 3000], [200, 10000], [500, 25000]]),
  ...series('kills', 'war', '🗡️', '만인적', (v) => `적을 모두 합쳐 ${n(v)}명 쓰러뜨린다`, totalKills, [[1000, 500, 'kills1k'], [10000, 4000, 'kills10k'], [50000, 10000], [200000, 25000], [1000000, 60000]]),
  ...series('bosses', 'war', '💀', '적장 사냥꾼', (v) => `적장을 ${n(v)}번 쓰러뜨린다`, (s) => s.stats.bosses ?? 0, [[10, 1500, 'bosses10'], [30, 4000], [100, 10000], [300, 25000]]),
  ...series('endless', 'war', '♾️', '끝없는 싸움', (v) => `무한 전장에서 ${v / 60}분을 버틴다`, (s) => s.stats.endlessBest ?? 0, [[300, 800, 'endless5'], [600, 2500, 'endless10'], [900, 6000], [1200, 12000]]),
  ...series('nanse', 'war', '🔥', '난세의 영웅', (v) => `일일 던전에서 난세 ${v}단계 이상을 평정한다`, (s) => s.stats.nanseBest ?? 0, [[5, 1500, 'nanse5'], [8, 2500, 'nanse8'], [10, 4000, 'nanse10'], [12, 7000, 'nanse12'], [14, 10000, 'nanse14']]),
  ...series('crows', 'field', '🌳', '감나무 지기', (v) => `까마귀를 모두 합쳐 ${n(v)}번 부른다`, (s) => s.stats.crowCalls ?? 0, [[20, 800, 'crow20'], [100, 3000], [500, 10000]]),
  ...series('objects', 'field', '🥁', '전장의 지혜', (v) => `전장 오브젝트를 모두 합쳐 ${n(v)}개 부순다`, (s) => s.stats.objects ?? 0, [[30, 800, 'objects30'], [150, 3000], [600, 10000]]),
  ...series('earned', 'camp', '💰', '거부', (v) => `모두 합쳐 ${n(v)}냥을 번다`, (s) => s.codex.earned ?? 0, [[100000, 5000, 'rich'], [1000000, 20000], [10000000, 60000]]),

  // 사신의 제단 (보상: 영주)
  ...series('altarRuns', 'altar', '🏯', '제단지기', (v) => `사신의 제단을 ${n(v)}번 돈다`, (s) => s.altarRuns ?? 0, [[5, 30], [30, 100], [100, 300], [300, 800], [1000, 2000]], { currency: 'yeongju' }),
  ...series('altarTier', 'altar', '⛩️', '제단의 높이', (v) => `사신의 제단 ${v}단계를 평정한다`, (s) => s.altarBest ?? 0, [[3, 50], [5, 100], [7, 200], [10, 500]], { currency: 'yeongju' }),
  ...series('guardians', 'altar', '🐉', '수호 영수의 시험', (v) => `수호 영수를 모두 합쳐 ${n(v)}번 쓰러뜨린다`, guardianKills, [[4, 50], [20, 150], [100, 400], [300, 1000]], { currency: 'yeongju' }),
  ...series('spirits', 'altar', '🐾', '영물 도감', (v) => `영물을 ${v}종 만난다`, (s) => owned(s).length, [[1, 20], [5, 50], [10, 100], [15, 200], [20, 400], [24, 1000]], { currency: 'yeongju' }),
  ...series('spirit5', 'altar', '🌟', '각성한 영물', (v) => `★5 영물을 ${v}종 키운다`, (s) => owned(s).filter((id) => s.spirits[id].stars >= 5).length, [[1, 100], [3, 200], [6, 400], [12, 800], [24, 2000]], { currency: 'yeongju' }),
  ...series('draws', 'altar', '🔮', '영물 부르기', (v) => `영물 뽑기를 ${n(v)}번 한다`, (s) => s.stats?.draws ?? 0, [[10, 30], [100, 150], [500, 500], [1000, 1000]], { currency: 'yeongju' }),
  ...series('sasin', 'altar', '✨', '사신의 응답', (v) => `사신 ${v}마리를 부른다`, (s) => owned(s).filter((id) => SPIRITS[id].grade === 5).length, [[1, 300], [2, 500], [3, 800], [4, 1500]], { currency: 'yeongju' }),
  ...series('combos', 'altar', '💞', '궁합 박사', (v) => `궁합 ${v}가지의 두 영물을 모두 갖춘다`, (s) => COMBOS.filter((c) => c.ids.every((id) => s.spirits?.[id])).length, [[3, 100], [8, 300], [15, 800]], { currency: 'yeongju' }),
];

/** Progress for goal-type entries: [now, target]; one-shot entries are [0|1, 1]. */
export function progressOf(a, save) {
  if (a.goal) return a.goal(save);
  return [a.check(save, null) ? 1 : 0, 1];
}

/** Whether `a` is met now. */
export function isMet(a, save, run) {
  if (a.goal) {
    const [now, need] = a.goal(save);
    return now >= need;
  }
  return !!a.check(save, run);
}
