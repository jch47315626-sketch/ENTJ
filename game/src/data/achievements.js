import { EQUIPMENT, SLOTS } from './meta.js';
import { STAGES } from './stages.js';

/**
 * 업적: one-time goals with a 냥 reward, claimed from 도감 → 업적.
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
];

export const ACHIEVEMENTS = [
  // 첫걸음
  { id: 'firstRun', group: 'start', icon: '🚩', name: '첫 출진', desc: '전장에 처음 나간다', reward: 100, check: (s) => s.codex.runs >= 1 },
  { id: 'firstWin', group: 'start', icon: '🎉', name: '첫 평정', desc: '전장 하나를 처음으로 평정한다', reward: 300, check: (s) => s.codex.wins >= 1 },
  { id: 'runs30', group: 'start', icon: '🥁', name: '백전노장', desc: '30번 출진한다', reward: 1000, goal: (s) => [s.codex.runs, 30] },

  // 전장
  { id: 'star2', group: 'war', icon: '⭐', name: '공산의 바람', desc: '★2 전장을 평정한다', reward: 600, check: (s) => bestStars(s) >= 2 },
  { id: 'star3', group: 'war', icon: '🌟', name: '고창의 승전보', desc: '★3 전장을 평정한다', reward: 1500, check: (s) => bestStars(s) >= 3 },
  { id: 'star4', group: 'war', icon: '💫', name: '철원의 주인', desc: '★4 전장을 평정한다', reward: 4000, check: (s) => bestStars(s) >= 4 },
  { id: 'star5', group: 'war', icon: '👑', name: '삼한 통일', desc: '★5 일리천을 평정한다', reward: 10000, check: (s) => bestStars(s) >= 5 },
  { id: 'yanggil1', group: 'war', icon: '⛰️', name: '북원으로 가는 길', desc: '양길의 등장 첫 전장, 섬강 나루를 평정한다', reward: 6000, check: (s) => !!s.best?.seomgang },
  { id: 'yanggil4', group: 'war', icon: '🌲', name: '솔숲을 넘어', desc: '양길의 등장 넷째 전장, 신림 솔숲을 평정한다', reward: 12000, check: (s) => !!s.best?.sillim },
  { id: 'star6', group: 'war', icon: '🏔️', name: '초적왕 토벌', desc: '일곱 전장을 지나 북원성의 양길을 정복한다', reward: 30000, check: (s) => !!s.best?.bukwon },
  { id: 'kills1k', group: 'war', icon: '🗡️', name: '천인참', desc: '적을 모두 합쳐 1,000명 쓰러뜨린다', reward: 500, goal: (s) => [totalKills(s), 1000] },
  { id: 'kills10k', group: 'war', icon: '⚔️', name: '만인적', desc: '적을 모두 합쳐 10,000명 쓰러뜨린다', reward: 4000, goal: (s) => [totalKills(s), 10000] },
  { id: 'bosses10', group: 'war', icon: '💀', name: '적장 사냥꾼', desc: '적장을 10번 쓰러뜨린다', reward: 1500, goal: (s) => [s.stats.bosses ?? 0, 10] },

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
  { id: 'crow20', group: 'field', icon: '🌳', name: '감나무 지기', desc: '까마귀를 모두 합쳐 20번 부른다', reward: 800, goal: (s) => [s.stats.crowCalls ?? 0, 20] },

  // 오늘의 전장
  { id: 'daily1', group: 'field', icon: '📅', name: '오늘의 승자', desc: '오늘의 전장에서 처음 승리한다', reward: 300, check: (s) => (s.stats.dailyWins ?? 0) >= 1 },
  { id: 'daily7', group: 'field', icon: '🗓️', name: '하루도 빠짐없이', desc: '오늘의 전장을 7번 (서로 다른 날) 이긴다', reward: 3000, goal: (s) => [s.stats.dailyWins ?? 0, 7] },

  // 전장 오브젝트 · 무한 전장
  { id: 'objects30', group: 'field', icon: '🥁', name: '전장의 지혜', desc: '항아리·전고·돌탑 같은 전장 오브젝트를 모두 합쳐 30개 부순다', reward: 800, goal: (s) => [s.stats.objects ?? 0, 30] },
  { id: 'endless5', group: 'war', icon: '♾️', name: '끝없는 싸움', desc: '무한 전장에서 5분을 버틴다', reward: 800, check: (s) => (s.stats.endlessBest ?? 0) >= 300 },
  { id: 'endless10', group: 'war', icon: '⏳', name: '불굴', desc: '무한 전장에서 10분을 버틴다', reward: 2500, check: (s) => (s.stats.endlessBest ?? 0) >= 600 },
  { id: 'endlessBoss3', group: 'war', icon: '👹', name: '적장 셋을 넘어', desc: '무한 전장 한 판에서 적장을 3번 쓰러뜨린다', reward: 3000, check: (s) => (s.stats.endlessBosses ?? 0) >= 3 },

  // 난세 단계
  { id: 'nanse5', group: 'war', icon: '🔥', name: '난세의 문턱', desc: '난세 5단계 이상으로 전장을 평정한다', reward: 1500, check: (s) => (s.stats.nanseBest ?? 0) >= 5 },
  { id: 'nanse10', group: 'war', icon: '🌋', name: '난세의 영웅', desc: '난세 10단계 이상으로 전장을 평정한다', reward: 4000, check: (s) => (s.stats.nanseBest ?? 0) >= 10 },
  { id: 'nanse20', group: 'war', icon: '☄️', name: '천하를 뒤흔든 자', desc: '난세 20단계 이상으로 전장을 평정한다', reward: 10000, check: (s) => (s.stats.nanseBest ?? 0) >= 20 },

  // 장비 옵션 · 신물
  { id: 'relic1', group: 'camp', icon: '🌟', name: '신물의 주인', desc: '난세 10단계 이상을 평정해 신물을 처음 얻는다', reward: 3000, check: (s) => (s.stats.relics ?? 0) >= 1 },

  // 군영
  { id: 'fullSet', group: 'camp', icon: '🧥', name: '완전 무장', desc: '한 영웅이 장비 6부위를 모두 찬다', reward: 500,
    check: (s) => Object.values(s.equipped ?? {}).some((o) => SLOTS.every((sl) => o?.[sl.id])) },
  { id: 'kukbo', group: 'camp', icon: '🏺', name: '국보를 품다', desc: '국보 등급 장비를 처음 손에 넣는다', reward: 2000, check: (s) => s.owned.some((id) => grade(id) === 8) },
  { id: 'forge5', group: 'camp', icon: '🔨', name: '명장의 손', desc: '장비 하나를 +5까지 제련한다', reward: 2500, check: (s) => Object.values(s.forge ?? {}).some((lv) => lv >= 5) },
  { id: 'rich', group: 'camp', icon: '💰', name: '거부', desc: '모두 합쳐 100,000냥을 번다', reward: 5000, goal: (s) => [s.codex.earned ?? 0, 100000] },
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
