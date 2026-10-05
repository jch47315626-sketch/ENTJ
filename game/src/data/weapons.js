/**
 * Weapons and their growth path. Each level names an attack `pattern`
 * registered in systems/weapons.js. The last level is the evolution and
 * changes the pattern itself; it needs `requires` to be met first.
 */
export const WEAPONS = {
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
  // Placeholders for the next heroes (not used by the prototype).
  daedo: { id: 'daedo', levels: [{ name: '대도', pattern: 'arcSlash', damage: 30, cooldown: 1.3, range: 70, arc: 70, knockback: 140 }] },
  cheoltoe: { id: 'cheoltoe', levels: [{ name: '철퇴', pattern: 'arcSlash', damage: 10, cooldown: 1.1, range: 70, arc: 360, knockback: 50 }] },
};
