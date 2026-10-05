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
      { name: '대도', pattern: 'heavyChop', damage: 32, cooldown: 1.1, range: 84, arc: 100, knockback: 90,
        desc: '좁은 정면을 무겁게 내려찍는다.' },
      { name: '철대도', pattern: 'heavyChop', damage: 44, cooldown: 1.05, range: 90, arc: 106, knockback: 110,
        desc: '더 무겁게 찍어 적을 멀리 날린다.' },
      { name: '패왕도', pattern: 'heavyChop', damage: 54, cooldown: 1.0, range: 96, arc: 112, knockback: 120,
        crack: { radius: 54, dps: 30, life: 1.2 },
        desc: '찍은 자리에 땅이 갈라져 1초간 피해를 준다.' },
      { name: '백제의 대도', pattern: 'comboChop', damage: 56, cooldown: 1.0, range: 104, arc: 150, knockback: 120,
        comboGap: 0.45, wave: { damage: 1.4, speed: 520, life: 0.55, radius: 26, stun: 1.0 }, evolution: true,
        requires: { upgrade: 'might', level: 3 },
        desc: '횡베기 두 번 뒤 대지를 갈라 일직선 충격파를 날린다. 셋째 타격은 적을 기절시킨다.' },
    ],
  },

  // 궁예 — 철퇴 → 중철퇴 → 왕철퇴 → 미륵철퇴
  cheoltoe: {
    id: 'cheoltoe',
    levels: [
      { name: '철퇴', pattern: 'maceSwing', damage: 15, cooldown: 1.05, range: 70, arc: 360, knockback: 60,
        desc: '쇠사슬 철퇴로 주위를 한 바퀴 휘돈다.' },
      { name: '중철퇴', pattern: 'maceSwing', damage: 21, cooldown: 1.0, range: 78, arc: 360, knockback: 70,
        desc: '더 무거운 철퇴로 더 넓게 휘돈다.' },
      { name: '왕철퇴', pattern: 'maceSwing', damage: 27, cooldown: 0.95, range: 84, arc: 360, knockback: 80,
        slam: { damage: 1.0, radius: 1.5, delay: 0.22 },
        desc: '휘두른 끝에 바닥을 내려쳐 충격파를 일으킨다.' },
      { name: '미륵철퇴', pattern: 'mireukMace', damage: 22, cooldown: 6, range: 88, knockback: 50,
        orbit: { count: 2, speed: 3.8, size: 22, pulse: 0.45, rehit: 0.3 },
        halo: { damage: 2.6, radius: 175 }, evolution: true,
        requires: { upgrade: 'area', level: 3 },
        desc: '철퇴 두 개가 곁을 맴돌며 끊임없이 치고, 6초마다 금빛 광배가 터진다.' },
    ],
  },
};
