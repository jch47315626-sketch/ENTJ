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
