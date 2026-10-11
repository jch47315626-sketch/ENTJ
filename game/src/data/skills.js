/**
 * 관심법 (궁예's momentum skill) by skill level. Skill level is 1 plus the
 * '관심법' upgrade level. `tier` is the strongest EnemyDef.tier it can sway
 * (1: 창병·궁수·해적, 2: + 기마병·방패병, 3: + 철갑병·정예). Bosses never.
 */
export const GWANSIM = [
  { name: '관심법', count: 3, tier: 1, duration: 7, power: 1 },
  { name: '관심법', count: 5, tier: 1, duration: 8, power: 1.25 },
  { name: '관심법', count: 6, tier: 2, duration: 9, power: 1.5 },
  { name: '관심법', count: 8, tier: 2, duration: 10, power: 1.75 },
  { name: '관심법', count: 10, tier: 3, duration: 11, power: 2 },
  // 궁극기: twice as many, every tier, and a swayed soldier bursts when it falls.
  { name: '독심 관심법', count: 20, tier: 3, duration: 12, power: 2.2, evolution: true,
    blast: { radius: 80, mul: 1.1 }, momentum: 0.35,
    requires: { upgrade: 'area', level: 3 },
    desc: '홀리는 적이 2배(20명), 철갑병·정예까지 홀린다. 기세가 35% 빨리 차고, 홀린 적이 쓰러지면 폭발해 주변을 휩쓴다.' },
];
/** The 관심법 책략's levels 1–5 (skill level is one higher), for the 궁극기 list. */
export const GWANSIM_LINE = GWANSIM.slice(1);

export const TIER_NAMES = { 2: '기마병·방패병', 3: '철갑병·정예 병사' };

/**
 * 신숭겸 (왕건's summon skill, gained from level-ups). He stands where he is
 * called, draws every regular soldier within `lure` to himself and takes the
 * blows meant for the king. He falls when his HP or time runs out; at the
 * last tier his fall is an explosion. HP grows with stage time.
 */
export const SHIN = [
  { name: '신숭겸', cooldown: 24, hp: 140, lure: 300, duration: 12, damage: 14,
    desc: '왕의 갑옷을 입은 신숭겸을 부른다. 주변 적이 그에게 달려든다.' },
  { name: '신숭겸 · 결사', cooldown: 21, hp: 200, lure: 340, duration: 13, damage: 18,
    desc: '더 오래 버티고, 더 먼 곳의 적까지 끌어모은다.' },
  { name: '신숭겸 · 충의', cooldown: 18, hp: 270, lure: 380, duration: 14, damage: 22,
    desc: '더 자주 나타나고 더 단단하다.' },
  { name: '신숭겸 · 순절', cooldown: 16, hp: 340, lure: 420, duration: 15, damage: 26, evolution: true,
    explode: { radius: 190, damage: 260, stun: 1.2 },
    requires: { upgrade: 'guard', level: 3 },
    desc: '쓰러질 때 폭탄처럼 터져 주변 적을 날려 버린다.' },
];

/**
 * 말타기 (왕건's mount skill, gained from level-ups). On cooldown he mounts:
 * faster for `duration`, untouchable for the first `invuln` seconds, and the
 * ground he gallops over hurts enemies (`trailDps` for `trailLife` seconds).
 */
export const HORSE = [
  { name: '말타기', cooldown: 18, duration: 4, invuln: 1.0, speed: 1.6, trailDps: 30, trailLife: 1.2,
    desc: '말에 올라 내달린다. 처음 1초는 무적, 말발굽이 지난 자리는 적을 다치게 한다.' },
  { name: '기마술', cooldown: 16, duration: 4.5, invuln: 1.3, speed: 1.65, trailDps: 42, trailLife: 1.4,
    desc: '더 자주, 더 오래 달린다. 무적 1.3초.' },
  { name: '돌격', cooldown: 14, duration: 5, invuln: 1.6, speed: 1.7, trailDps: 55, trailLife: 1.6,
    desc: '말발굽 자국이 더 뜨겁고 오래 남는다. 무적 1.6초.' },
  // 천리마 hits with the king's weapon: trail and trample scale with its damage.
  { name: '천리마', cooldown: 10, duration: 6, invuln: 3.0, guard: 0.5, speed: 1.8, trailDps: 70, trailMul: 1.6, trailLife: 1.8, trample: 2.2, evolution: true,
    requires: { upgrade: 'swift', level: 2 },
    desc: '처음 3초 무적, 말 위에서는 받는 피해 절반. 부딪힌 적을 짓밟아 날려 버린다.' },
];

/**
 * 철쇄 (견훤's chain-hook skill, gained from level-ups). On cooldown he
 * hurls iron chains at ranged soldiers and drags them to his feet, stunned.
 * `targets` lists which enemy ids can be hooked; the last tier slams the
 * ground where they land.
 */
export const CHAIN = [
  { name: '철쇄', cooldown: 9, count: 2, range: 520, stun: 0.6, targets: ['archer'],
    desc: '쇠사슬로 멀리 있는 궁수 둘을 발밑으로 끌어온다. 끌려온 적은 잠시 기절한다.' },
  { name: '쌍철쇄', cooldown: 8, count: 3, range: 560, stun: 0.8, targets: ['archer'],
    desc: '더 자주, 더 멀리서 궁수 셋을 끌어온다.' },
  { name: '천근쇄', cooldown: 7, count: 4, range: 600, stun: 1.0, targets: ['archer', 'eliteArcher'],
    desc: '정예 궁수까지 끌어온다. 넷까지, 기절 1초.' },
  { name: '패왕쇄', cooldown: 6, count: 5, range: 640, stun: 1.2, targets: ['archer', 'eliteArcher'], evolution: true,
    slam: { radius: 90, mul: 2.2 },
    requires: { upgrade: 'fury', level: 2 },
    desc: '다섯을 끌어와 땅에 내리꽂는다. 떨어진 자리 주변 적까지 피해를 입는다.' },
];

/**
 * 호랑이 젖먹기 (견훤's frenzy skill, gained from level-ups). On cooldown he
 * goes berserk: every blow deals `mul`× damage for `duration` seconds. The
 * last tier, 무자식이 상팔자, also has him swing wildly in a huge
 * figure-eight (八) that cuts across most of the field.
 */
export const TIGER = [
  { name: '호랑이 젖먹기', cooldown: 30, duration: 3, mul: 2,
    desc: '3초 동안 모든 피해 2배.' },
  { name: '호랑이 젖먹기 · 중', cooldown: 30, duration: 5, mul: 3,
    desc: '5초 동안 모든 피해 3배.' },
  { name: '호랑이 젖먹기 · 극', cooldown: 30, duration: 7, mul: 5,
    desc: '7초 동안 모든 피해 5배.' },
  { name: '무자식이 상팔자', cooldown: 30, duration: 7, mul: 5, evolution: true,
    eight: { radius: 560, damage: 1.2, swings: 4, gap: 0.16, stun: 0.8 },
    desc: '7초 동안 피해 5배, 그리고 칼을 마구 휘둘러 커다란 팔(八)자 참격으로 전장 대부분을 벤다.' },
];

/**
 * 마구니 (궁예's guardian spirits, gained from level-ups). One appears every
 * `every` seconds, up to `max`. Just before an enemy shot reaches 궁예, a
 * 마구니 cancels it and vanishes. When all are out and nothing came, the next
 * one turns into a 마구니 폭탄 that flies into the thick of the enemy and
 * bursts. The last tier, 마구니 결계, keeps all four for good: inside their
 * ring shots hurt 90% less, and foes they brush are nudged back and hurt.
 */
export const MAGUNI_LV = [
  { name: '마구니', every: 10, max: 4, bomb: { damage: 70, radius: 110 },
    desc: '10초마다 마구니가 하나씩 생겨(최대 4) 날아오는 원거리 공격을 막아 주고 사라진다. 넷이 다 찬 뒤 10초가 더 지나면 마구니 폭탄이 되어 적진 한가운데서 터진다.' },
  { name: '마구니 · 떼', every: 10, max: 4, bomb: { damage: 110, radius: 125 },
    desc: '마구니 폭탄이 더 크고 세게 터진다.' },
  { name: '마구니 · 업화', every: 10, max: 4, bomb: { damage: 160, radius: 140 },
    desc: '마구니 폭탄이 훨씬 세다.' },
  { name: '마구니 결계', every: 8, max: 4, bomb: { damage: 210, radius: 150 }, evolution: true,
    ward: { reduce: 0.9, damage: 20, push: 70, hitEvery: 0.4 },
    desc: '마구니 넷이 늘 곁을 돈다. 그 안에서는 원거리 공격 피해 90% 감소, 닿는 적은 살짝 밀려나며 피해를 입는다. 폭탄도 계속 나간다.' },
];

/**
 * 궁수대 (왕건's following archers, gained from level-ups): one more archer
 * per level. The 궁극기, 고려 신궁대, has them loose a rain of fire arrows
 * on the thickest knots of enemies every `cooldown` seconds.
 */
export const ARCHERS_LV = [
  { name: '궁수대', cooldown: 6, desc: '곁을 따르며 활을 쏘는 아군 궁수 +1' },
  { name: '궁수대', cooldown: 6, desc: '곁을 따르며 활을 쏘는 아군 궁수 +1' },
  { name: '궁수대', cooldown: 6, desc: '곁을 따르며 활을 쏘는 아군 궁수 +1' },
  { name: '고려 신궁대', cooldown: 6, evolution: true,
    rain: { spots: 4, radius: 110, mul: 1.8, life: 3, range: 520 },
    requires: { upgrade: 'momentum', level: 2 },
    desc: '6초마다 궁수들이 불화살 비를 쏘아 적이 몰린 네 곳을 3초 동안 불태운다.' },
];

/**
 * 어명 (왕건's royal order, gained from level-ups): on cooldown the king's
 * order strikes `count` foes on screen (`mul` × weapon damage). The 궁극기,
 * 훈요십조, strikes every foe on screen and stuns them.
 */
export const EDICT = [
  { name: '어명', cooldown: 14, count: 6, mul: 2.5,
    desc: '14초마다 왕명이 내려 주변 적 6명을 친다.' },
  { name: '어명 · 교지', cooldown: 12, count: 9, mul: 2.5,
    desc: '12초마다 주변 적 9명을 친다.' },
  { name: '어명 · 칙령', cooldown: 10, count: 12, mul: 2.5,
    desc: '10초마다 주변 적 12명을 친다.' },
  { name: '훈요십조', cooldown: 9, count: Infinity, mul: 3.5, stun: 1, bossStun: 0.25, evolution: true,
    requires: { upgrade: 'might', level: 3 },
    desc: '9초마다 하늘에서 어명이 내려 주변 모든 적을 치고 1초 기절시킨다 (적장은 짧게).' },
];

/**
 * 패기 (견훤): 패왕의 일격 grows. The 궁극기, 후백제의 패왕, makes him
 * stronger the closer he is to falling.
 */
export const FURY_LV = [
  { name: '패기', desc: '패왕의 일격 피해 +30%, 기절 +0.2초' },
  { name: '패기', desc: '패왕의 일격 피해 +30%, 기절 +0.2초' },
  { name: '패기', desc: '패왕의 일격 피해 +30%, 기절 +0.2초' },
  { name: '후백제의 패왕', evolution: true,
    rage: {
      always: { might: 0.2, haste: 0.09 },
      half: { might: 0.6, haste: 0.17 },
      low: { might: 1.0, haste: 0.23, leech: 0.01 },
    },
    requires: { upgrade: 'might', level: 3 },
    desc: '늘 피해 +20%, 공격 속도 +10%. 체력 50% 아래: 피해 +60%, 공격 속도 +20%. 30% 아래: 피해 2배, 공격 속도 +30%, 준 피해의 1% 회복.' },
];

/**
 * 바위 던지기 (견훤, gained from level-ups): on cooldown he hurls boulders
 * that roll straight on, crushing everything in the way. The 궁극기, 가은의
 * 장사, throws three huge ones that burst into shards at the end.
 */
export const BOULDER = [
  { name: '바위 던지기', cooldown: 8, count: 1, mul: 1.6, size: 20, speed: 330, range: 520, spread: 0,
    desc: '8초마다 바위를 굴려 앞의 적을 줄줄이 깔아뭉갠다.' },
  { name: '바위 던지기 · 큰돌', cooldown: 7, count: 1, mul: 2, size: 23, speed: 340, range: 560, spread: 0,
    desc: '7초마다, 더 큰 바위.' },
  { name: '바위 던지기 · 쌍돌', cooldown: 6, count: 2, mul: 2.4, size: 25, speed: 350, range: 600, spread: 0.35,
    desc: '6초마다 바위 둘을 굴린다.' },
  { name: '가은의 장사', cooldown: 6, count: 3, mul: 3.6, size: 44, speed: 330, range: 640, spread: 0.45, evolution: true,
    shatter: { radius: 100, mul: 1.6, stun: 0.5 },
    requires: { upgrade: 'area', level: 3 },
    desc: '큰 바위 셋을 부채꼴로 던진다. 굴러가며 적을 꿰뚫고, 끝에서 부서지며 파편이 사방을 친다(기절 0.5초).' },
];

/**
 * 천안 (궁예, gained from level-ups): on cooldown his one eye marks the
 * strongest foes on screen — marked foes take more damage. The 궁극기,
 * 애꾸눈의 저주, also slows them, and the curse passes to two neighbours
 * when a marked foe falls.
 */
export const CURSE = [
  { name: '천안', cooldown: 8, count: 2, duration: 5, amp: 0.3, dot: 0.6,
    desc: '8초마다 가장 센 적 둘에 표식: 5초 동안 받는 피해 +30%, 매초 저주 피해.' },
  { name: '천안 · 혜안', cooldown: 7, count: 3, duration: 5, amp: 0.4, dot: 0.8,
    desc: '7초마다 셋에게, 받는 피해 +40%.' },
  { name: '천안 · 법안', cooldown: 6, count: 4, duration: 5, amp: 0.5, dot: 1.0,
    desc: '6초마다 넷에게, 받는 피해 +50%.' },
  { name: '애꾸눈의 저주', cooldown: 6, count: 6, duration: 6, amp: 0.8, dot: 2.1, slow: 0.45, spread: 2, evolution: true,
    requires: { upgrade: 'haste', level: 3 },
    desc: '6초마다 가장 센 적 여섯에 저주: 받는 피해 +80%, 이동 −45%, 매초 큰 저주 피해. 저주받은 적이 쓰러지면 가까운 둘에게 옮겨붙는다.' },
];
