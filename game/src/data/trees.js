/**
 * Per-hero build paths, bought with 냥 between runs.
 *
 * SKILL_TREES: a root node, then two branches of three nodes. Buying the
 * first node of a branch commits the hero to it; the other branch locks
 * until the player resets (길 바꾸기, 90% refund).
 *
 * TREASURES: hero-only items for the 보물 slot, also a tree: one base item,
 * then two lines of two upgrades. An item needs its parent owned.
 *
 * `bonus` keys extend data/meta.js metaBonus(). Besides the shared stat keys
 * (maxHp, armor, might, haste, speed, momentum, area, xp…) the build keys are:
 *   allyMul       ally damage +x            guardBonus  extra 통솔 soldiers
 *   retinueSpear/Archer/Guard  standing 군세 units   volleyBonus  extra arrows per 일제사격
 *   wardDur       호위진 +s                  orderHaste  군령 cycles shorter by x
 *   tongsolLife   통솔 soldiers stay +s      shinHpMul   신숭겸 HP +x
 *   horseCd       말타기 cooldown −x         mountSpeed  extra speed mounted
 *   horseInvul    말타기 invulnerable +s     trailMul    hoofprint damage +x
 *   mountedMight  damage +x while mounted   specialMul  고유기 damage +x
 *   specialArea   고유기 area +x             berserk     damage +x below half HP (+20% attack speed)
 *   chainBonus    철쇄 hooks +n              thorns      damage dealt back on melee hits
 *   invulBonus    post-hit invulnerability +s
 *   mainDamage    main weapon damage +x     vajraCd     금강저 cooldown −x
 *   pierce        extra orb/beam pierce     rangeMul    main weapon range +x
 *   gwansimCount  관심법 sways +n            gwansimDur  관심법 lasts +s
 *   gwansimAllTiers  관심법 reaches every tier   charmBlast  swayed soldiers explode on death (damage)
 * `grants` lists level-up skills the hero starts with.
 */
export const SKILL_TREES = {
  wanggeon: {
    root: { id: 'wg_root', name: '태조의 기틀', price: 120, bonus: { maxHp: 15 }, desc: '최대 체력 +15' },
    branches: [
      {
        id: 'A', name: '통솔의 길', style: '늘 곁을 지키는 군세를 이끈다. 군령이 차면 병종마다 제 몫의 특기를 터뜨린다.',
        nodes: [
          { id: 'wg_a1', name: '군세', price: 300, bonus: { retinueSpear: 2, allyMul: 0.1 }, desc: '창병 2명이 늘 따라다닌다. 군령: 전방 돌격' },
          { id: 'wg_a2', name: '궁수대', price: 650, bonus: { retinueArcher: 1, allyMul: 0.15 }, desc: '궁병 1명 합류, 빠르게 연사한다. 군령: 연속 일제사격' },
          { id: 'wg_a3', name: '친위대', price: 1300, bonus: { retinueGuard: 1, allyMul: 0.25 }, desc: '친위대 1명 합류, 왕건을 지키며 적을 밀어낸다. 군령: 호위진' },
        ],
      },
      {
        id: 'B', name: '기마의 길', style: '말 위에서 싸운다. 자주 달리고, 달리는 동안 강하다.',
        nodes: [
          { id: 'wg_b1', name: '말 위의 검', price: 300, bonus: { speed: 0.1, mountedMight: 0.2 }, desc: '이동 +10%, 말 위에서 피해 +20%' },
          { id: 'wg_b2', name: '상시 기마', price: 650, bonus: { horseCd: 0.3, horseInvul: 0.4 }, grants: ['horse'], desc: '말타기를 쓰며 출진, 말타기 재사용 −30%, 무적 +0.4초' },
          { id: 'wg_b3', name: '천군 돌격', price: 1300, bonus: { mountedMight: 0.5, trailMul: 1, mountSpeed: 0.2 }, desc: '말 위에서 피해 +50%, 발자국 피해 2배, 말 위 이동 +20%' },
        ],
      },
    ],
  },
  gyeonhwon: {
    root: { id: 'gh_root', name: '후백제의 왕', price: 120, bonus: { might: 0.1 }, desc: '모든 공격 피해 +10%' },
    branches: [
      {
        id: 'A', name: '패공의 길', style: '돌진해 베고, 빠졌다가, 다른 적에게 다시 들이친다. 전장을 가로지르며 싸운다.',
        nodes: [
          { id: 'gh_a1', name: '기습', price: 300, bonus: { lunge: 1, might: 0.05 }, desc: '칠 때마다 적에게 짧게 돌진한다' },
          { id: 'gh_a2', name: '연참', price: 650, bonus: { rush: 1 }, desc: '베고 나면 다른 적에게 돌진해 한 번 더 베고 빠진다 (1.4초마다)' },
          { id: 'gh_a3', name: '패왕의 대도', price: 1300, bonus: { rushWave: 1, might: 0.1 }, desc: '연참 돌진 베기가 검기를 날린다, 피해 +10%' },
        ],
      },
      {
        id: 'B', name: '반격의 길', style: '적 한가운데서 버티다가, 맞는 순간 크게 받아쳐 공간을 연다.',
        nodes: [
          { id: 'gh_b1', name: '철벽', price: 300, bonus: { proxArmor: 1, maxHp: 20 }, desc: '가까운 적이 많을수록 갑주가 오른다 (최대 +4), 체력 +20' },
          { id: 'gh_b2', name: '되받아치기', price: 650, bonus: { counter: 1 }, desc: '맞으면 곧바로 주위를 크게 베어 밀어낸다 (0.9초마다)' },
          { id: 'gh_b3', name: '패왕의 반격', price: 1300, bonus: { counterRush: 1, armor: 1 }, desc: '반격한 뒤 가장 가까운 적에게 돌진해 한 번 더 벤다, 갑주 +1' },
        ],
      },
    ],
  },
  gungye: {
    root: { id: 'gy_root', name: '미륵의 현신', price: 120, bonus: { area: 0.1 }, desc: '공격 범위 +10%' },
    branches: [
      {
        id: 'A', name: '법력의 길', style: '멈춰 서서 법력을 모으고, 멀리서 쏟아붓는다. 자리를 잡을수록 강해진다.',
        nodes: [
          { id: 'gy_a1', name: '법력 집중', price: 300, bonus: { focus: 1, mainDamage: 0.1 }, desc: '멈춰 서 있으면 법력이 모여 석장 피해가 최대 +60%까지 오른다. 움직이면 흩어진다' },
          { id: 'gy_a2', name: '금강 수행', price: 650, bonus: { vajraCd: 0.2 }, grants: ['vajra'], desc: '금강저를 쥐고 출진, 금강저 재사용 −20%' },
          { id: 'gy_a3', name: '천안통', price: 1300, bonus: { bigOrb: 1, pierce: 2, rangeMul: 0.25 }, desc: '법력이 가득 찬 채 3.5초마다 거대 법력탄 발사(관통·폭발), 관통 +2, 사거리 +25%' },
        ],
      },
      {
        id: 'B', name: '혼란의 길', style: '적 무리 속을 누비며 홀린다. 적끼리 베게 하고, 그 틈으로 빠져나간다.',
        nodes: [
          { id: 'gy_b1', name: '혼란의 기운', price: 300, bonus: { chaosAura: 1, momentum: 0.2, mainDamage: 0.15 }, desc: '1.5초마다 곁의 병사 하나가 3초간 홀려 제 편을 세게 벤다. 기세 +20%, 석장 피해 +15%' },
          { id: 'gy_b2', name: '관심 수련', price: 650, bonus: { gwansimDur: 3, gwansimCount: 2 }, grants: ['gwansim'], desc: '관심법 Lv2로 출진, 홀리는 적 +2, 지속 +3초' },
          { id: 'gy_b3', name: '미륵의 대계', price: 1300, bonus: { gwansimAllTiers: 1, charmBlast: 40, mainDamage: 0.2 }, desc: '관심법·혼란이 모든 병사를 홀린다(적장 제외). 홀린 적이 쓰러지면 터진다, 석장 피해 +20%' },
        ],
      },
    ],
  },
};

/**
 * Hero treasures (보물). `parent` is the item needed first; `branch` ties the
 * line to a skill-tree path (only for layout). `icon` = [shape, colour].
 */
export const TREASURES = {
  wanggeon: [
    { id: 'tr_wg_0', name: '고려 군기', price: 250, parent: null, branch: null, icon: ['banner', '#2d4a7a'], bonus: { allyMul: 0.15, maxHp: 10 }, desc: '아군 피해 +15%, 체력 +10' },
    { id: 'tr_wg_a1', name: '궁수 깃발', price: 800, parent: 'tr_wg_0', branch: 'A', icon: ['banner', '#c9a24a'], bonus: { allyMul: 0.25, volleyBonus: 2 }, desc: '궁병 일제사격 +2발, 아군 피해 +25%' },
    { id: 'tr_wg_a2', name: '친위대의 방패', price: 2000, parent: 'tr_wg_a1', branch: 'A', icon: ['mirror', '#b3261e'], bonus: { allyMul: 0.4, wardDur: 2, orderHaste: 0.2 }, desc: '호위진 +2초, 군령 주기 −20%, 아군 피해 +40%' },
    { id: 'tr_wg_b1', name: '천리마 등자', price: 800, parent: 'tr_wg_0', branch: 'B', icon: ['stirrup', '#c9ccd0'], bonus: { mountSpeed: 0.15, horseInvul: 0.4 }, desc: '말 위 이동 +15%, 말타기 무적 +0.4초' },
    { id: 'tr_wg_b2', name: '천마 금등자', price: 2000, parent: 'tr_wg_b1', branch: 'B', icon: ['stirrup', '#e2b84a'], bonus: { horseCd: 0.3, trailMul: 0.5, mountSpeed: 0.2 }, desc: '말타기 재사용 −30%, 발자국 피해 +50%, 말 위 이동 +20%' },
  ],
  gyeonhwon: [
    { id: 'tr_gh_0', name: '후백제 인장', price: 250, parent: null, branch: null, icon: ['seal', '#8e2a1e'], bonus: { might: 0.06 }, desc: '모든 공격 피해 +6%' },
    { id: 'tr_gh_a1', name: '질풍 인장', price: 800, parent: 'tr_gh_0', branch: 'A', icon: ['seal', '#c9a24a'], bonus: { rushCd: 0.3, might: 0.06 }, desc: '연참 재사용 −30%, 피해 +6%' },
    { id: 'tr_gh_a2', name: '천하패왕인', price: 2000, parent: 'tr_gh_a1', branch: 'A', icon: ['seal', '#1d1a17'], bonus: { rushChain: 1, might: 0.1, specialMul: 0.3 }, desc: '연참이 두 적을 연달아 벤다, 피해 +10%, 패왕의 일격 +30%' },
    { id: 'tr_gh_b1', name: '청동 호심경', price: 800, parent: 'tr_gh_0', branch: 'B', icon: ['mirror', '#b07a48'], bonus: { armor: 1, maxHp: 20, counterMul: 0.3 }, desc: '가슴을 지키는 청동 거울. 반격 피해 +30%, 갑주 +1, 체력 +20' },
    { id: 'tr_gh_b2', name: '흑철 호심경', price: 2000, parent: 'tr_gh_b1', branch: 'B', icon: ['mirror', '#4a4d52'], bonus: { armor: 2, maxHp: 40, counterCd: 0.3, counterRadius: 0.25 }, desc: '반격 재사용 −30%, 반격 범위 +25%, 갑주 +2, 체력 +40' },
  ],
  gungye: [
    { id: 'tr_gy_0', name: '수정 염주', price: 250, parent: null, branch: null, icon: ['beads', '#cfe3ea'], bonus: { area: 0.05, xp: 0.05 }, desc: '공격 범위 +5%, 공훈 +5%' },
    { id: 'tr_gy_a1', name: '금강 염주', price: 800, parent: 'tr_gy_0', branch: 'A', icon: ['beads', '#e2b84a'], bonus: { mainDamage: 0.2, vajraCd: 0.15 }, desc: '석장 피해 +20%, 금강저 재사용 −15%' },
    { id: 'tr_gy_a2', name: '천안 보주', price: 2000, parent: 'tr_gy_a1', branch: 'A', icon: ['beads', '#4a8ad0'], bonus: { mainDamage: 0.25, focusFill: 0.5, bigOrbCd: 0.3 }, desc: '법력이 50% 빨리 모이고, 천안통 주기 −30%, 석장 피해 +25%' },
    { id: 'tr_gy_b1', name: '관심경', price: 800, parent: 'tr_gy_0', branch: 'B', icon: ['scroll', '#e8dfc6'], bonus: { chaosCd: 0.3, gwansimDur: 2 }, desc: '혼란의 기운 주기 −30%, 관심법 지속 +2초' },
    { id: 'tr_gy_b2', name: '미륵하생경', price: 2000, parent: 'tr_gy_b1', branch: 'B', icon: ['scroll', '#e2b84a'], bonus: { chaosCount: 1, gwansimCount: 3, momentum: 0.2 }, desc: '혼란의 기운이 한 번에 둘을 홀린다, 관심법 홀리는 적 +3, 기세 +20%' },
  ],
};

/** Every skill-tree node of a hero, root first. */
export function treeNodes(heroId) {
  const t = SKILL_TREES[heroId];
  return [t.root, ...t.branches.flatMap((b) => b.nodes)];
}

/** Which branch (A/B) a node belongs to, or null for the root. */
export function branchOf(heroId, nodeId) {
  return SKILL_TREES[heroId].branches.find((b) => b.nodes.some((n) => n.id === nodeId))?.id ?? null;
}
