/**
 * Bosses. `patterns` are cycled in order; each `type` is a routine in
 * systems/bossAI.js. All patterns show a telegraph before they hit.
 */
export const BOSSES = {
  neungchang: {
    id: 'neungchang',
    name: '수달 능창',
    hanja: '水獺 能昌',
    epithet: '압해도의 해적 두령',
    hp: 2400, speed: 85, radius: 30, damage: 15, knockResist: 0.92, xp: 0,
    look: { body: '#3e5560', accent: '#1d2a30', hat: 'pirateBoss', weapon: 'hook' },
    patterns: [
      { type: 'chase', time: 2.2 },
      { type: 'dash', windup: 0.75, speed: 560, distance: 440, damage: 22 },
      { type: 'chase', time: 1.6 },
      { type: 'fan', windup: 0.5, count: 5, spread: 50, speed: 300, damage: 12, kind: 'hook' },
      { type: 'chase', time: 1.8 },
      { type: 'dash', windup: 0.6, speed: 600, distance: 380, damage: 22, repeat: 2 },
    ],
    summons: [
      { atHpRatio: 0.66, enemy: 'bandit', count: 6, banner: '능창이 졸개들을 부른다!' },
      { atHpRatio: 0.33, enemy: 'bandit', count: 8, banner: '해적들이 갯벌에서 솟아오른다!' },
    ],
    enrage: { below: 0.4, speedMul: 1.3, cooldownMul: 0.7, banner: '능창이 격노했다!' },
  },

  gyeonhwon: {
    id: 'gyeonhwon',
    name: '견훤',
    hanja: '甄萱',
    epithet: '후백제의 대왕',
    hp: 3200, speed: 78, radius: 32, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#6b2a22', accent: '#2e120e', hat: 'crown', weapon: 'greatsword', trim: '#d8b46a', skin: '#dcb58c' },
    patterns: [
      { type: 'chase', time: 2.0 },
      { type: 'spin', windup: 0.9, radius: 150, damage: 22 },
      { type: 'chase', time: 1.4 },
      { type: 'dash', windup: 0.7, speed: 540, distance: 420, damage: 24 },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.6, count: 7, spread: 70, speed: 320, damage: 11, kind: 'arrow' },
      { type: 'spin', windup: 0.7, radius: 165, damage: 22, repeat: 2 },
    ],
    summons: [
      { atHpRatio: 0.66, enemy: 'eliteArcher', count: 5, banner: '매복한 궁수들이 일어선다!' },
      { atHpRatio: 0.33, enemy: 'cavalry', count: 6, banner: '후백제 기병이 짓쳐 들어온다!' },
    ],
    enrage: { below: 0.35, speedMul: 1.2, cooldownMul: 0.8, banner: '견훤의 대도가 붉게 달아오른다!' },
  },
  shinsunggyeom: {
    id: 'shinsunggyeom',
    name: '신숭겸',
    hanja: '申崇謙',
    epithet: '왕의 갑옷을 입은 대역',
    hp: 3600, speed: 90, radius: 30, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'hero', weapon: 'shield', trim: '#c9a24a', plume: '#b3261e', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 1.8 },
      { type: 'dash', windup: 0.65, speed: 560, distance: 400, damage: 22 },
      { type: 'chase', time: 1.4 },
      { type: 'spin', windup: 0.7, radius: 130, damage: 22 },
      { type: 'chase', time: 1.2 },
      { type: 'dash', windup: 0.55, speed: 600, distance: 360, damage: 22, repeat: 3 },
    ],
    summons: [
      { atHpRatio: 0.6, enemy: 'shield', count: 6, banner: '고려 방패병이 장수를 감싼다!' },
    ],
    lastStand: { below: 0.3, time: 5, banner: '결사 — 신숭겸이 물러서지 않는다!' },
    enrage: { below: 0.3, speedMul: 1.2, cooldownMul: 0.75, banner: '' },
  },
  kimak: {
    id: 'kimak',
    name: '김악',
    hanja: '金渥',
    epithet: '후백제의 시랑',
    hp: 3600, speed: 82, radius: 30, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#5a2a3a', accent: '#24101a', hat: 'heavyHelmet', weapon: 'glaive', trim: '#d8b46a', skin: '#dcb58c' },
    patterns: [
      { type: 'chase', time: 1.8 },
      { type: 'firePots', windup: 0.9, count: 3, spread: 110, radius: 62, dps: 20, life: 3.2 },
      { type: 'chase', time: 1.4 },
      { type: 'dash', windup: 0.7, speed: 520, distance: 420, damage: 22 },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.6, count: 7, spread: 60, speed: 320, damage: 12, kind: 'arrow' },
      { type: 'firePots', windup: 0.7, count: 5, spread: 160, radius: 58, dps: 20, life: 3.2 },
    ],
    summons: [
      { atHpRatio: 0.7, enemy: 'shield', count: 8, banner: '방패진이 시랑을 감싼다!' },
      { atHpRatio: 0.4, enemy: 'eliteArcher', count: 6, banner: '강 건너에서 화살이 쏟아진다!' },
    ],
    enrage: { below: 0.3, speedMul: 1.25, cooldownMul: 0.75, banner: '김악이 화공을 퍼붓는다!' },
  },
  yugeumpil: {
    id: 'yugeumpil',
    name: '유금필',
    hanja: '庾黔弼',
    epithet: '고려의 맹장',
    hp: 3600, speed: 95, radius: 30, damage: 17, knockResist: 0.95, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'heavyHelmet', weapon: 'spear', trim: '#c9a24a', skin: '#e3c39c', mount: '#3a2a1c' },
    patterns: [
      { type: 'chase', time: 1.6 },
      { type: 'dash', windup: 0.6, speed: 600, distance: 460, damage: 24, repeat: 2 },
      { type: 'chase', time: 1.2 },
      { type: 'spin', windup: 0.75, radius: 150, damage: 24 },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.55, count: 5, spread: 40, speed: 360, damage: 13, kind: 'arrow' },
      { type: 'dash', windup: 0.5, speed: 640, distance: 400, damage: 24, repeat: 3 },
    ],
    summons: [
      { atHpRatio: 0.6, enemy: 'eliteCavalry', count: 5, banner: '고려 기병이 장수를 따른다!' },
      { atHpRatio: 0.3, enemy: 'ironclad', count: 6, banner: '호족의 철갑병이 가세한다!' },
    ],
    enrage: { below: 0.3, speedMul: 1.25, cooldownMul: 0.75, banner: '유금필이 말을 박차고 달려든다!' },
  },

  // 철원 궁성 (★4) — 미륵을 자처한 왕
  gungyeBoss: {
    id: 'gungyeBoss',
    name: '궁예',
    hanja: '弓裔',
    epithet: '미륵을 자처한 태봉의 왕',
    hp: 6000, speed: 80, radius: 30, damage: 16, knockResist: 0.95, xp: 0,
    look: { body: '#4a2f5e', accent: '#1d1a17', hat: 'monk', weapon: 'staff', trim: '#e0b24c', plume: '#e0b24c', skin: '#e3c19a' },
    patterns: [
      { type: 'chase', time: 1.6, keep: 230 },
      { type: 'lightning', windup: 0.9, count: 3, spread: 120, radius: 70, damage: 26, lead: 0.7 },
      { type: 'chase', time: 1.2, keep: 230 },
      { type: 'halo', windup: 1.0, beams: 4, length: 360, width: 26, turn: 1.1, time: 3.2, dps: 34 },
      { type: 'chase', time: 1.0, keep: 230 },
      { type: 'fan', windup: 0.55, count: 9, spread: 100, speed: 280, damage: 13, kind: 'orb' },
      { type: 'lightning', windup: 0.7, count: 5, spread: 170, radius: 64, damage: 26, lead: 0.8 },
      { type: 'clones', count: 2, every: 2 },
    ],
    summons: [
      { atHpRatio: 0.7, enemy: 'ironclad', count: 6, banner: '호위 철갑병이 궁문을 막는다!' },
      { atHpRatio: 0.4, enemy: 'eliteArcher', count: 6, banner: '궁성 누각에서 화살이 쏟아진다!' },
    ],
    enrage: { below: 0.3, speedMul: 1.2, cooldownMul: 0.7, banner: '궁예 — "누가 감히 내 마음을 읽으려 드느냐!"' },
  },
  /** 궁예's mind-image: weak, but it throws the same lightning. */
  gungyeClone: {
    id: 'gungyeClone',
    name: '궁예의 분신',
    hp: 420, speed: 95, radius: 26, damage: 12, knockResist: 0.6, xp: 0, minion: true,
    look: { body: '#6a5280', accent: '#1d1a17', hat: 'monk', weapon: 'staff', trim: '#b9a0d8', plume: '#b9a0d8', skin: '#d6c6e6' },
    patterns: [
      { type: 'chase', time: 1.4, keep: 200 },
      { type: 'lightning', windup: 1.0, count: 1, spread: 0, radius: 60, damage: 18, lead: 0.5 },
      { type: 'chase', time: 1.6 },
      { type: 'fan', windup: 0.6, count: 5, spread: 60, speed: 260, damage: 10, kind: 'orb' },
    ],
  },

  // 궁예로 출진하면: 정변을 일으킨 네 공신이 한꺼번에 덤빈다.
  gongsin: {
    id: 'gongsin',
    name: '개국 4공신',
    epithet: '홍유 · 배현경 · 신숭겸 · 복지겸',
    group: ['hongyu', 'baehyeongyeong', 'shinGongsin', 'bokjigyeom'],
  },
  hongyu: {
    id: 'hongyu', name: '홍유', hanja: '洪儒', epithet: '창을 든 공신',
    hp: 1500, speed: 92, radius: 28, damage: 15, knockResist: 0.95, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'heavyHelmet', weapon: 'spear', trim: '#c9a24a', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 2.0 },
      { type: 'dash', windup: 0.7, speed: 560, distance: 420, damage: 22, repeat: 2 },
    ],
  },
  baehyeongyeong: {
    id: 'baehyeongyeong', name: '배현경', hanja: '裵玄慶', epithet: '활을 든 공신',
    hp: 1500, speed: 78, radius: 28, damage: 14, knockResist: 0.95, xp: 0,
    look: { body: '#3b4a2d', accent: '#1c2414', hat: 'helmetBlue', weapon: 'bow', trim: '#c9a24a', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 2.2 },
      { type: 'fan', windup: 0.7, count: 7, spread: 70, speed: 320, damage: 12, kind: 'arrow' },
    ],
  },
  shinGongsin: {
    id: 'shinGongsin', name: '신숭겸', hanja: '申崇謙', epithet: '방패를 든 공신',
    hp: 1500, speed: 84, radius: 30, damage: 15, knockResist: 0.97, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'hero', weapon: 'shield', trim: '#c9a24a', plume: '#b3261e', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 2.0 },
      { type: 'spin', windup: 0.8, radius: 140, damage: 22 },
    ],
    lastStand: { below: 0.25, time: 4, banner: '신숭겸이 동료들을 감싼다!' },
  },
  bokjigyeom: {
    id: 'bokjigyeom', name: '복지겸', hanja: '卜智謙', epithet: '불을 놓는 공신',
    hp: 1500, speed: 80, radius: 28, damage: 14, knockResist: 0.95, xp: 0,
    look: { body: '#5a3a2a', accent: '#24140c', hat: 'helmet', weapon: 'glaive', trim: '#c9a24a', skin: '#e3c39c' },
    patterns: [
      { type: 'chase', time: 2.2 },
      { type: 'firePots', windup: 0.9, count: 3, spread: 120, radius: 58, dps: 18, life: 3 },
    ],
  },

  // 일리천 (★5) — 아버지를 가두고 왕위를 빼앗은 후백제의 마지막 왕
  singeom: {
    id: 'singeom',
    name: '신검',
    hanja: '神劍',
    epithet: '후백제의 마지막 왕',
    hp: 8000, speed: 92, radius: 32, damage: 17, knockResist: 0.96, xp: 0,
    look: { body: '#5a1e1a', accent: '#24100c', hat: 'crown', weapon: 'spear', trim: '#d8b46a', skin: '#dcb58c', mount: '#2d241c' },
    // 1단계: 말 위에서 기병을 지휘한다.
    patterns: [
      { type: 'chase', time: 1.6 },
      { type: 'dash', windup: 0.65, speed: 620, distance: 480, damage: 24, repeat: 2 },
      { type: 'summon', enemy: 'eliteCavalry', count: 4, banner: '신검이 기병을 부른다!' },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.55, count: 7, spread: 60, speed: 340, damage: 13, kind: 'arrow' },
      { type: 'dash', windup: 0.55, speed: 640, distance: 440, damage: 24, repeat: 3 },
    ],
    // 2단계: 말에서 내려 미친 듯이 휘두른다.
    phase2: {
      below: 0.5, speedMul: 1.25, invuln: 1.6,
      banner: '찬탈자의 광기 — 신검이 말에서 뛰어내린다!',
      look: { body: '#7a1e16', accent: '#24100c', hat: 'crown', weapon: 'greatsword', trim: '#ffd76a', skin: '#dcb58c' },
      patterns: [
        { type: 'chase', time: 1.0 },
        { type: 'spin', windup: 0.6, radius: 160, damage: 26, repeat: 2 },
        { type: 'firePots', windup: 0.7, count: 5, spread: 170, radius: 60, dps: 22, life: 3 },
        { type: 'chase', time: 0.9 },
        { type: 'dash', windup: 0.5, speed: 600, distance: 420, damage: 26, repeat: 3 },
        { type: 'fan', windup: 0.5, count: 11, spread: 140, speed: 320, damage: 13, kind: 'arrow' },
      ],
    },
    summons: [
      { atHpRatio: 0.75, enemy: 'ironclad', count: 6, banner: '후백제 철갑병이 왕을 감싼다!' },
      { atHpRatio: 0.25, enemy: 'eliteArcher', count: 6, banner: '마지막 궁수대가 활을 든다!' },
    ],
    enrage: { below: 0.2, speedMul: 1.15, cooldownMul: 0.75, banner: '신검 — "이 나라는 내 것이다!"' },
  },

  // 견훤·궁예로 출진하면: 삼한을 하나로 묶으려는 왕건과의 가상 결전.
  wanggeonBoss: {
    id: 'wanggeonBoss',
    name: '왕건',
    hanja: '王建',
    epithet: '고려 태조 · 삼한을 하나로',
    hp: 8000, speed: 88, radius: 30, damage: 16, knockResist: 0.96, xp: 0,
    look: { body: '#2d3b5c', accent: '#151c2c', hat: 'hero', weapon: 'sword', trim: '#c9a24a', plume: '#b3261e', skin: '#e8c9a0' },
    patterns: [
      { type: 'chase', time: 1.6 },
      { type: 'spin', windup: 0.75, radius: 150, damage: 24 },
      { type: 'summon', enemy: 'shield', count: 5, banner: '통솔 — 고려 방패병이 왕을 지킨다!' },
      { type: 'chase', time: 1.2 },
      { type: 'fan', windup: 0.6, count: 5, spread: 50, speed: 360, damage: 16, kind: 'wave' },
      { type: 'dash', windup: 0.6, speed: 560, distance: 420, damage: 24 },
    ],
    phase2: {
      below: 0.5, speedMul: 1.15, invuln: 1.6,
      banner: '태조의 검 — 왕건이 검을 뽑아 든다!',
      look: { body: '#1e2a48', accent: '#0e1424', hat: 'crown', weapon: 'sword', trim: '#ffd76a', plume: '#ffd76a', skin: '#e8c9a0', mount: '#6b4a2e' },
      patterns: [
        { type: 'chase', time: 1.0 },
        { type: 'spin', windup: 0.6, radius: 165, damage: 26, repeat: 2 },
        { type: 'fan', windup: 0.55, count: 12, spread: 330, speed: 320, damage: 15, kind: 'wave' },
        { type: 'summon', enemy: 'eliteCavalry', count: 4, banner: '고려 기병대가 돌진한다!' },
        { type: 'dash', windup: 0.5, speed: 620, distance: 440, damage: 26, repeat: 2 },
        { type: 'fan', windup: 0.5, count: 7, spread: 70, speed: 380, damage: 16, kind: 'wave' },
      ],
    },
    summons: [
      { atHpRatio: 0.7, enemy: 'ironclad', count: 6, banner: '고려 철갑병이 가세한다!' },
    ],
    enrage: { below: 0.2, speedMul: 1.15, cooldownMul: 0.75, banner: '왕건 — "삼한은 하나가 되어야 한다!"' },
  },
};
