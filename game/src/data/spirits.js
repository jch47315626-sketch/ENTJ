/**
 * 영물: companions every hero can take into battle. Twenty are called with
 * 영주 at the 영물 뽑기; the four 사신 only with 사신 정수 (data/altar.js).
 * Each 영물 grows from ★1 to ★5 with duplicates: ★3 opens a choice of two
 * 갈래 (switchable at any time), ★5 is its 각성.
 *
 * save.spirits[id] = { stars, dupes, branch }  (branch: 'a' | 'b' | null)
 * save.companions  = [id…]                       taken into battle
 * save.pity        = draws since the last 신수
 *
 * What each one does in battle is written here as text; the behaviour
 * itself lives in systems/spirits.js.
 */

export const SPIRIT_GRADES = [
  null,
  { id: 1, name: '범수', color: '#9ab07a', rate: 0.55, refund: 10 },
  { id: 2, name: '영수', color: '#5aa0e0', rate: 0.3, refund: 20 },
  { id: 3, name: '서수', color: '#b07ae0', rate: 0.12, refund: 40 },
  { id: 4, name: '신수', color: '#f2b84a', rate: 0.03, refund: 80 },
  { id: 5, name: '사신', color: '#ff6b6b', rate: 0, refund: 0 },
];

/** 영물 뽑기: one draw, ten at a discount, and a 신수 guaranteed by the 60th draw. */
export const GACHA = { one: 100, ten: 900, pity: 60 };

/** Duplicates needed to go from ★n to ★n+1 (index n). 1+1+2+3+4 = 11 copies to ★5. */
export const STAR_DUPES = [0, 1, 2, 3, 4];
export const MAX_STARS = 5;
/** 사신 rise with 사신 정수 instead of duplicates: ★2, ★3, ★4, ★5. */
export const SASIN_STAR_ESSENCE = [0, 20, 30, 40, 50];

/** Companion slots: one, and a second once any 사신 has answered. */
export const companionSlots = (save) => (Object.keys(save.spirits ?? {}).some((id) => SPIRITS[id]?.grade === 5) ? 2 : 1);

const S = (id, grade, icon, name, role, base, a, b, awaken) => ({ id, grade, icon, name, role, base, branches: { a, b }, awaken });

export const SPIRITS = Object.fromEntries([
  // 범수
  S('jindo', 1, '🐕', '진돗개', '묶기', '가장 가까운 적에게 달려가 물고 늘어져 잠깐 묶어 둬요.',
    { name: '사냥개', desc: '묶는 시간 2배, 묶인 적이 받는 피해 +20%' }, { name: '충견', desc: '영웅 곁을 지키며 다가온 적과 영웅을 때린 적을 물어요' },
    '두 마리가 함께 달려요'),
  S('crow', 1, '🐦‍⬛', '까마귀', '수집', '떨어진 엽전과 주먹밥을 물어다 줘요.',
    { name: '수집', desc: '줍는 범위 +50%, 공훈 +5%' }, { name: '흉조', desc: '적을 쪼아 저주 — 받는 피해 +15%' },
    '까마귀 떼가 화면 끝의 엽전까지 쓸어 와요'),
  S('otter', 1, '🦦', '수달', '회복', '가끔 물고기를 물어 와 체력을 채워 줘요.',
    { name: '보양', desc: '회복량 2배' }, { name: '물보라', desc: '물보라를 튀겨 주변 적을 느리게' },
    '체력이 30% 아래로 떨어지면 한 번 크게 회복'),
  S('gull', 1, '🕊️', '갈매기', '폭격', '하늘에서 적 무리로 급강하해 들이받아요.',
    { name: '연속 폭격', desc: '급강하 3연속' }, { name: '큰 폭발', desc: '급강하 범위 2배' },
    '갈매기 떼가 한꺼번에 내리꽂혀요'),
  S('boar', 1, '🐗', '멧돼지', '돌진', '일직선으로 돌진하며 적을 밀쳐내요.',
    { name: '관통', desc: '멈추지 않고 끝까지 뚫고 지나가요' }, { name: '기절', desc: '부딪힌 적이 1초 기절' },
    '돌진 거리 1.5배, 밀쳐내기 2배'),
  S('bat', 1, '🦇', '박쥐', '흡혈', '적의 피를 빨아 영웅의 체력으로 돌려줘요.',
    { name: '피흡', desc: '흡혈량 2배' }, { name: '박쥐 떼', desc: '박쥐 3마리가 흩어져 빨아요' },
    '처치할 때마다 영웅 체력 소량 회복'),
  // 영수
  S('falcon', 2, '🦅', '해동청', '사냥', '정예병과 원거리 적부터 골라 낚아채요.',
    { name: '처형', desc: '체력 25% 아래 적 즉시 처치(적장 제외)' }, { name: '연속 사냥', desc: '사냥 간격 절반' },
    '적장에게 주는 피해 +30%'),
  S('fox', 2, '🦊', '여우', '도발', '분신을 만들어 적을 끌고 다녀요.',
    { name: '분신 수', desc: '분신 2개' }, { name: '여우불', desc: '분신이 사라질 때 터져요' },
    '분신이 영웅 대신 화살을 맞아 줘요'),
  S('snake', 2, '🐍', '구렁이', '독', '영웅 주위를 휘감으며 독 장판을 남겨요.',
    { name: '맹독', desc: '독 피해 2배' }, { name: '조이기', desc: '독에 닿은 적이 잠깐 묶여요' },
    '영웅이 지나간 자리마다 독'),
  S('bear', 2, '🐻', '산곰', '수호', '영웅이 받는 피해 일부를 대신 맞아요.',
    { name: '버티기', desc: '대신 맞는 비율 2배' }, { name: '앞발', desc: '대신 맞을 때마다 앞발로 후려쳐요' },
    '한 판에 한 번, 쓰러질 피해를 막아요'),
  S('owl', 2, '🦉', '부엉이', '책략', '레벨업 때 책략 카드를 한 장 더 보여 줘요.',
    { name: '선견', desc: '카드 1장 더(총 2장 추가)' }, { name: '다시 뽑기', desc: '한 판에 3번 카드를 새로 뽑아요' },
    '궁극기 카드가 더 잘 나와요'),
  S('wolf', 2, '🐺', '늑대', '무리', '적을 쓰러뜨릴수록 늑대 무리가 늘어나요(최대 5).',
    { name: '머릿수', desc: '최대 8마리' }, { name: '우두머리', desc: '우두머리 1마리가 3배로 강해요' },
    '무리가 다 모이면 일제히 울부짖어 적을 겁줘요'),
  // 서수
  S('crane', 3, '🦢', '학', '궁극기', '영웅 곁에서 노래해 기세가 빨리 차요.',
    { name: '기세', desc: '기세 충전 +40%' }, { name: '선율', desc: '스킬 쿨다운 −25%' },
    '기세를 다 쓰면 절반을 돌려줘요'),
  S('worm', 3, '🪱', '대지렁이', '제압', '땅속을 파고들었다 적 밑에서 솟아 띄워 올려요.',
    { name: '지진', desc: '솟는 범위 2배' }, { name: '연속', desc: '한 번 더 솟아요' },
    '견훤의 핏줄 — 견훤과 함께면 위력 2배'),
  S('cub', 3, '🐯', '범새끼', '성장', '싸울수록 자라서 판 후반에는 큰 범이 돼요.',
    { name: '맹수', desc: '다 자란 범의 공격 2배' }, { name: '포효', desc: '자랄 때마다 적을 겁줘요' },
    '처음부터 큰 범으로 시작'),
  S('turtle', 3, '🐢', '바다거북', '방어', '주기적으로 영웅에게 등딱지 보호막을 씌워요.',
    { name: '두꺼운 등딱지', desc: '보호막 2배' }, { name: '반사', desc: '보호막이 막은 피해를 되돌려요' },
    '보호막이 깨질 때 주변 적을 밀쳐내요'),
  S('samjogo', 3, '☀️', '삼족오', '광역', '영웅 주위를 도는 태양 광선을 쏘아요.',
    { name: '쌍광', desc: '광선 2줄' }, { name: '열기', desc: '광선 피해 +60%' },
    '광선이 세 줄로 늘어나요'),
  // 신수
  S('dragonmaid', 4, '🧜‍♀️', '용녀', '소환', '물결로 적을 느리게 하고 영웅의 아군을 강하게 해요.',
    { name: '해일', desc: '물결이 더 넓고 자주' }, { name: '용궁', desc: '아군·분신·소환수 피해 +40%' },
    '서해 용왕의 축복 — 물결이 두 번 밀려와요'),
  S('elephant', 4, '🐘', '백상', '기동', '영웅이 올라타 달려요 — 짓밟고, 잠깐 무적.',
    { name: '짓밟기', desc: '짓밟기 피해 2배' }, { name: '질주', desc: '이동 속도 +25%, 무적 시간 2배' },
    '미륵의 흰 코끼리 — 탈 때마다 주변 적을 기절'),
  S('haetae', 4, '🦁', '해태', '정화', '날아오는 화살과 투사체를 삼켜요.',
    { name: '삼킴', desc: '삼키는 범위 2배' }, { name: '불토', desc: '삼킨 만큼 불을 뿜어요' },
    '적장의 장판(불·독)도 꺼 버려요'),
  // 사신 (사신 정수로만)
  S('cheongnyong', 5, '🐉', '청룡', '번개', '번개가 적에서 적으로 튀어요. 가끔 폭풍이 몰아쳐요.',
    { name: '연쇄', desc: '번개가 튀는 횟수 2배' }, { name: '폭풍', desc: '폭풍이 영웅을 따라다녀요' },
    '동녘의 용 — 번개 맞은 적이 잠깐 감전'),
  S('jujak', 5, '🐦‍🔥', '주작', '불·부활', '불꽃 날개로 지나간 자리를 태워요. 한 판에 한 번 영웅을 되살려요.',
    { name: '불바다', desc: '불꽃 자리 2배로 넓게' }, { name: '불사', desc: '되살아날 때 체력 100%·주변 폭발' },
    '남녘의 불새 — 되살리기 2번'),
  S('baekho', 5, '🐅', '백호', '처형', '체력이 낮은 적을 덮쳐 단숨에 끝내요. 아니면 크게 물어뜯어요.',
    { name: '처형', desc: '처형 기준 체력 2배' }, { name: '송곳니', desc: '덮칠 때 피해 +50%' },
    '서녘의 흰 범 — 적장에게도 처형이 통해요(체력 10% 아래)'),
  S('hyeonmu', 5, '🐢', '현무', '보호막·독', '영웅을 감싸는 보호막과, 다가온 적을 녹이는 독.',
    { name: '철갑', desc: '보호막 2배, 막은 피해를 되돌려요' }, { name: '독사', desc: '독 범위 1.5배, 피해 2배' },
    '북녘의 거북과 뱀 — 보호막이 깨지면 독 폭발'),
].map((s) => [s.id, s]));

export const SPIRIT_LIST = Object.values(SPIRITS);
/** The 20 that can come from a draw (all but the 사신). */
export const DRAW_POOL = SPIRIT_LIST.filter((s) => s.grade < 5);

/** One 영물's state in the save, or null. */
export const spiritOf = (save, id) => save.spirits?.[id] ?? null;

/** Duplicates needed for the next star (Infinity at ★5). */
export const dupesForNext = (stars) => (stars >= MAX_STARS ? Infinity : STAR_DUPES[stars]);

/**
 * One draw: a grade by the rates (a 신수 is forced on the pity draw), then
 * a 영물 of that grade. `rand` is injectable for tests.
 */
export function rollSpirit(pity, rand = Math.random) {
  let grade;
  if (pity + 1 >= GACHA.pity) grade = 4;
  else {
    let u = rand();
    grade = 1;
    for (const g of [4, 3, 2, 1]) {
      if (u < SPIRIT_GRADES[g].rate) { grade = g; break; }
      u -= SPIRIT_GRADES[g].rate;
    }
  }
  const pool = DRAW_POOL.filter((s) => s.grade === grade);
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/**
 * Draws `n` 영물 for `cost` 영주. New ones arrive at ★1; a duplicate adds a
 * copy toward the next star, or — at ★5 — comes back as 영주.
 * Returns [{ id, isNew, refund }] or null if 영주 is short.
 */
export function drawSpirits(save, n, cost, rand = Math.random) {
  if ((save.yeongju ?? 0) < cost) return null;
  save.yeongju -= cost;
  save.spirits ??= {};
  const out = [];
  save.stats ??= {};
  save.stats.draws = (save.stats.draws ?? 0) + n;
  for (let i = 0; i < n; i++) {
    const s = rollSpirit(save.pity ?? 0, rand);
    save.pity = s.grade === 4 ? 0 : (save.pity ?? 0) + 1;
    const own = save.spirits[s.id];
    if (!own) {
      save.spirits[s.id] = { stars: 1, dupes: 0, branch: null };
      out.push({ id: s.id, isNew: true, refund: 0 });
    } else if (own.stars >= MAX_STARS) {
      const refund = SPIRIT_GRADES[s.grade].refund;
      save.yeongju += refund;
      out.push({ id: s.id, isNew: false, refund });
    } else {
      own.dupes += 1;
      out.push({ id: s.id, isNew: false, refund: 0 });
    }
  }
  if (!save.companions?.length) save.companions = [out[0].id];
  return out;
}

/** Raise a 영물 one star (spends duplicates, or 사신 정수 for a 사신). False if it cannot. */
export function starUp(save, id) {
  const s = SPIRITS[id], own = spiritOf(save, id);
  if (!s || !own || own.stars >= MAX_STARS) return false;
  if (s.grade === 5) {
    const cost = SASIN_STAR_ESSENCE[own.stars];
    if ((save.essence ?? 0) < cost) return false;
    save.essence -= cost;
  } else {
    const need = dupesForNext(own.stars);
    if (own.dupes < need) return false;
    own.dupes -= need;
  }
  own.stars += 1;
  return true;
}

/** Call a 사신 with 사신 정수 (ESSENCE_PER_SASIN). False if owned already or short. */
export function callSasin(save, id, cost) {
  const s = SPIRITS[id];
  if (!s || s.grade !== 5 || spiritOf(save, id) || (save.essence ?? 0) < cost) return false;
  save.essence -= cost;
  save.spirits[id] = { stars: 1, dupes: 0, branch: null };
  return true;
}

/** Pick (or switch) a ★3+ 영물's 갈래. */
export function setBranch(save, id, branch) {
  const own = spiritOf(save, id);
  if (!own || own.stars < 3 || !['a', 'b'].includes(branch)) return false;
  own.branch = branch;
  return true;
}

/** Take a 영물 along, or leave it home. A full party drops the oldest. */
export function toggleCompanion(save, id) {
  if (!spiritOf(save, id)) return false;
  const list = (save.companions ??= []).filter((c) => spiritOf(save, c));
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else {
    list.push(id);
    while (list.length > companionSlots(save)) list.shift();
  }
  save.companions = list;
  return true;
}

// ------------------------------------------------------------------ 궁합

/**
 * 궁합: two 영물 taken along together. `mods[id]` changes that 영물 in
 * battle (read by systems/spirits.js): dmg × and cd × always; the other keys
 * are its own (beams, jumps, dives, packMax, shield, grow0, life, range,
 * heal, radius, execute, quake, allCoins). `meta` adds to the hero's bonuses.
 */
export const COMBOS = [
  { id: 'crowSun', ids: ['crow', 'samjogo'], icon: '🌞', name: '까마귀 떼', desc: '삼족오 광선 +1줄 · 까마귀가 화면 끝의 엽전까지 물어 와요', mods: { samjogo: { beams: 1 }, crow: { allCoins: true } } },
  { id: 'tigerWolf', ids: ['wolf', 'baekho'], icon: '🐾', name: '범과 이리', desc: '늑대 무리 피해 +50% · 백호 처형 기준 +10%p', mods: { wolf: { dmg: 1.5 }, baekho: { execute: 0.1 } } },
  { id: 'shellPact', ids: ['turtle', 'hyeonmu'], icon: '🐢', name: '거북의 맹약', desc: '보호막 +50% · 바다거북 보호막 간격 −30%', mods: { turtle: { shield: 1.5, cd: 0.7 }, hyeonmu: { shield: 1.5 } } },
  { id: 'dragonWed', ids: ['dragonmaid', 'cheongnyong'], icon: '💞', name: '용궁의 혼례', desc: '번개가 3번 더 튀어요 · 물결 범위 +30%', mods: { cheongnyong: { jumps: 3 }, dragonmaid: { radius: 1.3 } } },
  { id: 'phoenixSong', ids: ['crane', 'jujak'], icon: '🎶', name: '봉황의 노래', desc: '기세 충전 +30% · 주작 불길 피해 +40%', mods: { jujak: { dmg: 1.4 } }, meta: { momentum: 0.3 } },
  { id: 'houndPack', ids: ['jindo', 'wolf'], icon: '🐕', name: '들개 무리', desc: '늑대 최대 +2마리 · 진돗개 쿨다운 −30%', mods: { wolf: { packMax: 2 }, jindo: { cd: 0.7 } } },
  { id: 'seaWind', ids: ['gull', 'turtle'], icon: '🌊', name: '바닷바람', desc: '갈매기 급강하 +1회 · 보호막 +30%', mods: { gull: { dives: 1 }, turtle: { shield: 1.3 } } },
  { id: 'nightVenom', ids: ['bat', 'snake'], icon: '🌙', name: '밤의 독', desc: '박쥐 피해 +50% · 구렁이 독 +40%', mods: { bat: { dmg: 1.5 }, snake: { dmg: 1.4 } } },
  { id: 'earthQuake', ids: ['worm', 'boar'], icon: '🌋', name: '땅울림', desc: '멧돼지 돌진이 끝나는 곳에서 대지렁이가 솟아요', mods: { boar: { quake: true } } },
  { id: 'tigerBlood', ids: ['cub', 'baekho'], icon: '🐯', name: '범의 핏줄', desc: '범새끼가 반쯤 자란 채 시작 · 백호 피해 +30%', mods: { cub: { grow0: 0.5 }, baekho: { dmg: 1.3 } } },
  { id: 'foxFire', ids: ['fox', 'haetae'], icon: '🦊', name: '여우불', desc: '분신이 2배 오래 · 해태가 삼키는 범위 +30%', mods: { fox: { life: 2 }, haetae: { range: 1.3 } } },
  { id: 'mountainStep', ids: ['elephant', 'bear'], icon: '⛰️', name: '산을 울리는 발', desc: '백상 쿨다운 −30% · 짓밟기 피해 +50%', mods: { elephant: { cd: 0.7, dmg: 1.5 } } },
  { id: 'scholar', ids: ['owl', 'crane'], icon: '📜', name: '선비의 벗', desc: '책략 카드 +1장 · 공훈 +10%', mods: { owl: { cards: 1 } }, meta: { xp: 0.1 } },
  { id: 'waterFriends', ids: ['otter', 'dragonmaid'], icon: '💧', name: '물의 벗', desc: '수달 회복 2배 · 물결 범위 +30%', mods: { otter: { heal: 2 }, dragonmaid: { radius: 1.3 } } },
  { id: 'skyHunt', ids: ['falcon', 'cheongnyong'], icon: '⚡', name: '하늘의 사냥꾼', desc: '해동청 피해 +50% · 번개 피해 +20%', mods: { falcon: { dmg: 1.5 }, cheongnyong: { dmg: 1.2 } } },
];

/** The 궁합 that a party (list of ids) makes. */
export const combosOf = (ids) => COMBOS.filter((c) => c.ids.every((id) => ids.includes(id)));

/** 첫 영물: after this many finished 사신의 제단 runs, a 범수 joins for free. */
export const FIRST_SPIRIT_RUNS = 5;
/** 사신의 제단 runs counted so far toward the first 영물. */
export const altarRunsDone = (save) => save.altarRuns ?? 0;

/**
 * Once FIRST_SPIRIT_RUNS 사신의 제단 runs are done (main.js counts them), gives a 범수
 * the player does not have yet (★1, taken along if the party has room).
 * Returns that 영물's id, or null.
 */
export function countRunForGift(save, rand = Math.random) {
  if (save.spiritGift || (save.altarRuns ?? 0) < FIRST_SPIRIT_RUNS) return null;
  save.spiritGift = true;
  save.spirits ??= {};
  const pool = DRAW_POOL.filter((s) => s.grade === 1 && !save.spirits[s.id]);
  if (!pool.length) return null;
  const s = pool[Math.floor(rand() * pool.length)];
  save.spirits[s.id] = { stars: 1, dupes: 0, branch: null };
  save.companions ??= [];
  if (save.companions.length < companionSlots(save)) save.companions.push(s.id);
  return s.id;
}
