/**
 * Music themes (all synthesised in audio/sound.js). Each theme is a loop on
 * a step grid: a janggu rhythm (`rhythm`, one symbol per step: D = 덩,
 * K = 쿵, k = 덕, '' = rest), a melody (`melody`, scale degrees per step,
 * null = rest) played on `lead`, and optional `drone` / `ambience`.
 * `step` is seconds per step at intensity 0; `rush` is how much faster the
 * loop gets as the battle heats up.
 */

/** 평조 (bright) and 계면조 (plaintive) scales, low to high. */
const PYEONG = [196, 220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784];
const GYEMYEON = [164.8, 196, 220, 246.9, 293.7, 329.6, 392, 440, 493.9, 587.3, 659.3];

// Janggu cycles.
const JUNGMORI = ['D', '', '', 'K', '', '', 'k', '', '', 'K', '', 'k'];
const SEMACHI = ['D', '', 'k', 'K', '', 'k', 'D', 'k', ''];
const GUTGEORI = ['D', '', 'k', 'K', '', 'k', 'D', '', 'k', 'K', 'k', 'k'];
const JAJINMORI = ['D', '', 'k', 'K', 'k', '', 'D', '', 'k', 'K', '', 'k'];
const HWIMORI = ['D', 'k', 'K', 'k', 'D', 'k', 'K', 'k'];

const _ = null;

export const THEMES = {
  // 군영 (menus): slow 중모리, 가야금 with a soft 대금 line.
  menu: {
    scale: PYEONG, rhythm: JUNGMORI, step: 0.24, rush: 0, drumGain: 0.08, lead: 'gayageum', second: 'daegeum',
    melody: [4, _, _, 5, _, _, 4, _, 3, _, _, _, 2, _, _, 3, _, 4, 3, _, 2, _, _, _],
    counter: [_, _, _, _, _, _, _, _, _, _, _, _, 7, _, _, _, _, _, 6, _, _, _, _, _],
    drone: 98,
  },
  // 서남해 갯벌: 세마치 with 대금 over the sound of the tide.
  seonamhae: {
    scale: PYEONG, rhythm: SEMACHI, step: 0.19, rush: 0.04, lead: 'daegeum',
    melody: [4, _, _, 5, _, 6, 5, _, _, 4, _, 3, 2, _, _, 3, _, _],
    drone: 98, ambience: 'waves',
  },
  // 공산 동수: autumn hills, bright 굿거리 on 가야금.
  gongsan: {
    scale: PYEONG, rhythm: GUTGEORI, step: 0.17, rush: 0.035, lead: 'gayageum',
    melody: [5, _, 6, 5, _, 4, 3, _, 4, 5, _, _, 7, _, 6, 5, _, 4, 3, _, 2, 3, _, _],
    ambience: 'wind',
  },
  // 고창 병산: tense 자진모리, 해금 in 계면조.
  gochang: {
    scale: GYEMYEON, rhythm: JAJINMORI, step: 0.15, rush: 0.03, lead: 'haegeum',
    melody: [4, _, 5, 4, _, 3, 2, _, _, 3, 4, _, 5, _, 4, 3, _, 2, 1, _, _, 2, _, _],
    drone: 82.4,
  },
  // 철원 궁궐: stately, 편경 bells answering a 대금.
  cheorwon: {
    scale: PYEONG, rhythm: JUNGMORI, step: 0.2, rush: 0.04, lead: 'daegeum', second: 'bells',
    melody: [7, _, _, 6, _, _, 5, _, _, 4, _, _, 5, _, _, 6, _, _, 4, _, _, _, _, _],
    counter: [_, _, 9, _, _, _, _, _, 8, _, _, _, _, _, 9, _, _, 7, _, _, _, 6, _, _],
    ambience: 'wind',
  },
  // 일리천: the last battle, fast 휘모리 with a 태평소 call.
  illicheon: {
    scale: GYEMYEON, rhythm: HWIMORI, step: 0.14, rush: 0.025, lead: 'taepyeongso',
    melody: [5, 5, 6, 5, 4, _, 3, 4, 5, _, 7, 6, 5, 4, 3, _],
    drone: 82.4, drumGain: 0.16,
  },
  // 적장 출현: every field switches to this — 휘모리, 태평소, 징.
  boss: {
    scale: GYEMYEON, rhythm: HWIMORI, step: 0.125, rush: 0, lead: 'taepyeongso', gongEvery: 32, heavy: true,
    melody: [4, _, 5, 4, 6, _, 5, 4, 3, _, 4, 3, 2, _, 1, _],
    drone: 65.4, drumGain: 0.2,
  },
};

/** Which theme a battlefield plays (unknown fields fall back to 공산). */
export const themeFor = (stageId) => (THEMES[stageId] ? stageId : 'gongsan');
