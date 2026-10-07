/**
 * 관심법 (궁예's momentum skill) by skill level. Skill level is 1 plus the
 * '관심법' upgrade level. `tier` is the strongest EnemyDef.tier it can sway
 * (1: 창병·궁수·해적, 2: + 기마병·방패병, 3: + 철갑병·정예). Bosses never.
 */
export const GWANSIM = [
  { count: 3, tier: 1, duration: 7, power: 1 },
  { count: 5, tier: 1, duration: 8, power: 1.25 },
  { count: 6, tier: 2, duration: 9, power: 1.5 },
  { count: 8, tier: 2, duration: 10, power: 1.75 },
  { count: 10, tier: 3, duration: 11, power: 2 },
];

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
  { name: '천리마', cooldown: 12, duration: 5.5, invuln: 2.0, speed: 1.8, trailDps: 70, trailLife: 1.8, trample: 45, evolution: true,
    requires: { upgrade: 'swift', level: 2 },
    desc: '무적 2초. 부딪힌 적을 짓밟아 날려 버린다.' },
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
    slam: { radius: 80, damage: 45 },
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
    eight: { radius: 560, damage: 1.6, swings: 4, gap: 0.16, stun: 0.8 },
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
  { name: '마구니 결계', every: 10, max: 4, bomb: { damage: 160, radius: 140 }, evolution: true,
    ward: { reduce: 0.9, damage: 14, push: 70, hitEvery: 0.4 },
    desc: '마구니 넷이 늘 곁을 돈다. 그 안에서는 원거리 공격 피해 90% 감소, 닿는 적은 살짝 밀려나며 피해를 입는다. 폭탄도 계속 나간다.' },
];
