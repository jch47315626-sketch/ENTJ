/**
 * Korean particles that depend on the last syllable of the word before
 * them: 왕건 + 으로 → 왕건으로, 궁예 + 로 → 궁예로, 철투구 + 는 → 철투구는.
 */
const PAIRS = { 으로: ['으로', '로'], 로: ['으로', '로'], 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] };

/** Final consonant (받침) index of the last Hangul syllable: 0 = none, 8 = ㄹ. */
function finalOf(word) {
  const code = String(word).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return 0;
  return code % 28;
}

/** `word` followed by the right form of `particle` (e.g. josa('견훤', '으로') → '견훤으로'). */
export function josa(word, particle) {
  const [withFinal, without] = PAIRS[particle];
  const f = finalOf(word);
  // 으로/로: a word ending in ㄹ takes 로, like a vowel.
  const useFinal = particle === '으로' || particle === '로' ? f !== 0 && f !== 8 : f !== 0;
  return word + (useFinal ? withFinal : without);
}
