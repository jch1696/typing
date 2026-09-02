export class TypingEngine {
  constructor(targetText) {
    this.targetText = targetText;
    this.inputText = '';
  }

  // composingIndex: IME로 조합 중인 글자 위치(없으면 -1)
  // 조합 중인 글자는 아직 완성 전이므로 틀림으로 표시하지 않는다.
  update(inputText, composingIndex = -1) {
    this.inputText = inputText;
    const target = this.targetText;
    const input = inputText;

    let correctCount = 0;
    let wrongCount = 0;
    const statusList = [];

    for (let i = 0; i < target.length; i++) {
      const char = target[i];
      if (i >= input.length) {
        statusList.push({ char, status: 'pending' });
      } else if (input[i] === char) {
        statusList.push({ char, status: 'correct' });
        correctCount++;
      } else if (i === composingIndex) {
        statusList.push({ char, status: 'pending' });
      } else {
        statusList.push({ char, status: 'wrong' });
        wrongCount++;
      }
    }

    return {
      correctCount,
      wrongCount,
      remainingCount: Math.max(0, target.length - input.length),
      progress: Math.min(100, Math.round((input.length / target.length) * 100)),
      completed: this.isComplete(),
      statusList
    };
  }

  // 확정 문자열 길이 기준 KPM (IME 조합 중간값 제외)
  getKpm(elapsedSeconds) {
    if (elapsedSeconds <= 0) return 0;
    return Math.round((this.inputText.length / elapsedSeconds) * 60);
  }

  getAccuracy() {
    const input = this.inputText;
    const target = this.targetText;
    if (input.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === target[i]) correct++;
    }
    return Math.round((correct / input.length) * 100);
  }

  getProgress() {
    return Math.min(100, Math.round((this.inputText.length / this.targetText.length) * 100));
  }

  // 현재 입력에서 맞은 글자 수 (30초 모드에서 부분 계산용)
  getCorrectCount() {
    const input = this.inputText;
    const target = this.targetText;
    let count = 0;
    for (let i = 0; i < input.length && i < target.length; i++) {
      if (input[i] === target[i]) count++;
    }
    return count;
  }

  // 입력 문자열이 목표 문자열과 완전히 일치할 때만 true
  isComplete() {
    return this.inputText === this.targetText;
  }
}
