// 한글 타수(자모 키 입력 수) 계산
// 완성형 글자를 초성/중성/종성으로 분해해서 실제 키 입력 수를 셉니다.
// 된소리(ㄲ 등)는 Shift+키 1타, 복합 모음(ㅘ 등)과 겹받침(ㄳ 등)은 2타로 계산합니다.

const JUNGSEONG_STROKES = [
  1, 1, 1, 1, 1, 1, 1, 1, // ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ
  1, 2, 2, 2, 1, 1, 2, 2, // ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ
  2, 1, 1, 2, 1           // ㅟ ㅠ ㅡ ㅢ ㅣ
];

const JONGSEONG_STROKES = [
  0, 1, 1, 2, 1, 2, 2, 1, // (없음) ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ
  1, 2, 2, 2, 2, 2, 2, 2, // ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ
  1, 2, 1, 1, 1, 1, 1, 1, // ㅁ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ
  1, 1, 1                 // ㅌ ㅍ ㅎ
];

export function charStrokes(char) {
  const code = char.charCodeAt(0);

  // 완성형 한글 음절
  if (code >= 0xac00 && code <= 0xd7a3) {
    const offset = code - 0xac00;
    const jung = Math.floor((offset % (21 * 28)) / 28);
    const jong = offset % 28;
    return 1 + JUNGSEONG_STROKES[jung] + JONGSEONG_STROKES[jong];
  }

  // 낱자모, 공백, 문장부호 등은 1타
  return 1;
}

export function countStrokes(text) {
  let total = 0;
  for (const char of text) {
    total += charStrokes(char);
  }
  return total;
}
