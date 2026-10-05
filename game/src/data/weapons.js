/**
 * Weapons and their growth path. Each level names an attack `pattern`
 * registered in systems/weapons.js. The last level is the evolution and
 * changes the pattern itself; it needs `requires` to be met first.
 */
export const WEAPONS = {
  // 왕건 — 고려검 → 철검 → 왕검 → 태조의 검
  goryeoSword: {
    id: 'goryeoSword',
    levels: [
      { name: '고려검', pattern: 'arcSlash', damage: 16, cooldown: 0.9, range: 78, arc: 110, knockback: 70,
        desc: '바라보는 방향으로 부채꼴 베기.' },
      { name: '철검', pattern: 'arcSlash', damage: 20, cooldown: 0.85, range: 86, arc: 120, knockback: 80,
        desc: '더 넓고 강한 베기.' },
      { name: '왕검', pattern: 'arcSlash', damage: 26, cooldown: 0.8, range: 95, arc: 130, knockback: 90, double: true,
        desc: '앞을 벤 뒤 곧바로 뒤를 벤다.' },
      { name: '태조의 검', pattern: 'royalSword', damage: 34, cooldown: 0.95, range: 110, arc: 360, knockback: 110,
        waves: 4, waveDamage: 0.6, waveSpeed: 430, waveLife: 0.6, evolution: true,
        requires: { upgrade: 'guard', level: 2 },
        desc: '회전베기와 함께 네 갈래 검기가 적을 꿰뚫는다.' },
    ],
  },

  // 견훤 — 대도 → 철대도 → 패왕도 → 백제의 대도
  daedo: {
    id: 'daedo',
    levels: [
      { name: '대도', pattern: 'heavyChop', damage: 30, cooldown: 1.0, range: 88, arc: 120, knockback: 90,
        desc: '좁은 정면을 무겁게 내려찍는다.' },
      { name: '철대도', pattern: 'heavyChop', damage: 40, cooldown: 0.95, range: 94, arc: 126, knockback: 110,
        desc: '더 무겁게 찍어 적을 멀리 날린다.' },
      { name: '패왕도', pattern: 'heavyChop', damage: 49, cooldown: 0.9, range: 100, arc: 132, knockback: 120,
        crack: { radius: 54, dps: 30, life: 1.2 },
        desc: '찍은 자리에 땅이 갈라져 1초간 피해를 준다.' },
      { name: '백제의 대도', pattern: 'comboChop', damage: 52, cooldown: 0.9, range: 110, arc: 160, knockback: 120,
        comboGap: 0.45, wave: { damage: 1.4, speed: 520, life: 0.55, radius: 26, stun: 1.0 }, evolution: true,
        requires: { upgrade: 'might', level: 3 },
        desc: '횡베기 두 번 뒤 대지를 갈라 일직선 충격파를 날린다. 셋째 타격은 적을 기절시킨다.' },
    ],
  },

  // 궁예 주무기 — 석장 → 철석장 → 육환장 → 미륵석장 (원거리)
  seokjang: {
    id: 'seokjang',
    levels: [
      { name: '석장', pattern: 'orbShot', damage: 15.6, cooldown: 0.75, range: 380, speed: 430, count: 1, spread: 0, pierce: 1, size: 9, knockback: 30,
        desc: '가장 가까운 적에게 법력구를 쏜다.' },
      { name: '철석장', pattern: 'orbShot', damage: 20.4, cooldown: 0.7, range: 400, speed: 460, count: 1, spread: 0, pierce: 2, size: 10, knockback: 35,
        desc: '법력구가 적 둘을 꿰뚫는다.' },
      { name: '육환장', pattern: 'orbShot', damage: 22.8, cooldown: 0.7, range: 410, speed: 470, count: 3, spread: 22, pierce: 2, size: 10, knockback: 35,
        desc: '고리 여섯 개가 울리며 법력구 세 발이 부채꼴로 나간다.' },
      { name: '미륵석장', pattern: 'lightBeam', damage: 31.2, cooldown: 0.8, range: 460, speed: 950, beams: 3, size: 9, knockback: 40,
        burst: { radius: 46, damage: 0.5 }, evolution: true,
        requires: { upgrade: 'area', level: 2 },
        desc: '법력구 대신 꿰뚫는 빛줄기 세 갈래. 닿는 자리마다 금빛 연꽃이 터진다.' },
    ],
  },

  // 궁예 둘째 무기 (책략으로 획득) — 금강저 → 쌍금강저 → 오고금강저 → 벽력금강저
  vajra: {
    id: 'vajra',
    sub: true,
    levels: [
      { name: '금강저', pattern: 'chainBolt', damage: 10, cooldown: 2.6, range: 340, bolts: 1, chains: 2, chainRange: 120,
        desc: '금강저를 던져 벼락이 적 셋을 타고 흐른다.' },
      { name: '쌍금강저', pattern: 'chainBolt', damage: 10, cooldown: 2.5, range: 360, bolts: 2, chains: 2, chainRange: 125,
        desc: '벼락 두 줄기가 각각 적 셋을 탄다.' },
      { name: '오고금강저', pattern: 'chainBolt', damage: 12, cooldown: 2.4, range: 380, bolts: 2, chains: 3, chainRange: 135,
        desc: '다섯 갈래 금강저. 벼락 두 줄기가 각각 적 넷을 탄다.' },
      { name: '벽력금강저', pattern: 'thunderStorm', damage: 20, cooldown: 2.3, range: 440, strikes: 4, chains: 2, chainRange: 140, evolution: true,
        requires: { upgrade: 'gwansim', level: 2 },
        desc: '하늘에서 벼락 네 줄기가 내리꽂히고, 각각 적 셋을 타고 번진다.' },
    ],
  },
};
