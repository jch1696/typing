import { STAGES, TEXTS } from './data.js';
import { updateStageResult, saveLastResult } from './storage.js';
import { TypingEngine } from './typing-engine.js';
import { Keyboard } from './keyboard.js';
import { charStrokes, countStrokes } from './hangul.js';

const PRACTICE_SECONDS = 30;

const params = new URLSearchParams(location.search);
const stageOrder = Number.parseInt(params.get('stage'), 10);
const stage = STAGES.find((item) => item.order === stageOrder);

if (!stage) {
  location.href = 'index.html';
  throw new Error('Invalid stage');
}

function shuffle(items) {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
}

let textPool = shuffle(TEXTS[stage.id]);
let textIndex = 0;

function pickNextText() {
  const text = textPool[textIndex];
  textIndex += 1;

  if (textIndex >= textPool.length) {
    textPool = shuffle(TEXTS[stage.id]);
    textIndex = 0;

    // 재셔플 직후 방금 친 문장이 연속으로 나오지 않게 한다
    if (textPool.length > 1 && textPool[0] === text) {
      const swapIndex = 1 + Math.floor(Math.random() * (textPool.length - 1));
      [textPool[0], textPool[swapIndex]] = [textPool[swapIndex], textPool[0]];
    }
  }

  return text;
}

const stageLabel = document.getElementById('stageLabel');
const timerEl = document.getElementById('timer');
const keyboardEl = document.getElementById('keyboard');
const countdownEl = document.getElementById('countdown');
const targetTextEl = document.getElementById('targetText');
const typingInput = document.getElementById('typingInput');
const typingDisplay = document.getElementById('typingDisplay');
const kpmEl = document.getElementById('kpm');
const accuracyEl = document.getElementById('accuracy');
const progressBar = document.getElementById('progressBar');
const imeHint = document.getElementById('imeHint');

stageLabel.textContent = `${stage.order}단계: ${stage.name}`;
timerEl.textContent = `${PRACTICE_SECONDS}초`;

const keyboard = new Keyboard(keyboardEl);
keyboard.render();
keyboard.highlightStageKeys(stage.keys);

let targetText = pickNextText();
let engine = new TypingEngine(targetText);
let timerInterval = null;
let remainingSeconds = PRACTICE_SECONDS;
let finished = false;
let waitingForNextText = false;
let isComposing = false;
let pendingAdvance = false;
// 입력창 값은 연습 내내 절대 지우지 않고 누적시킨다.
// 값을 지우거나 blur하면 IME 조합이 깨져 글자가 사라지므로,
// 현재 문장은 baseOffset 이후의 부분 문자열로만 읽는다.
let baseOffset = 0;
// 완료한 문장들의 누적 타수 (자모 키 입력 수 기준)
let totalCorrectStrokes = 0;
let totalTypedStrokes = 0;

function renderTarget(statusList) {
  if (!statusList) {
    targetTextEl.innerHTML = Array.from(targetText)
      .map((char) => `<span class="char char--pending">${char === ' ' ? '&nbsp;' : char}</span>`)
      .join('');
    return;
  }

  targetTextEl.innerHTML = statusList
    .map(({ char, status }) => `<span class="char char--${status}">${char === ' ' ? '&nbsp;' : char}</span>`)
    .join('');
}

function showNextTextHint() {
  targetTextEl.innerHTML += '<span class="finish-hint">스페이스를 누르면 다음 문장이 나와요</span>';
}

// 현재 문장에 해당하는 입력 (누적 입력에서 baseOffset 이후)
function currentInput() {
  return typingInput.value.slice(baseOffset);
}

// 실제 입력창은 투명하므로, 현재 문장 부분만 표시 영역에 그린다
function renderTypedDisplay(text) {
  typingDisplay.textContent = text;
  const caret = document.createElement('span');
  caret.className = 'typing-caret';
  typingDisplay.appendChild(caret);
}

function loadNextText() {
  targetText = pickNextText();
  engine = new TypingEngine(targetText);
  waitingForNextText = false;
  pendingAdvance = false;
  // 입력창은 건드리지 않고, 지금까지의 값 전체를 소비한 것으로 표시
  baseOffset = typingInput.value.length;
  imeHint.classList.add('hidden');
  renderTypedDisplay('');
  renderTarget(null);
}

// 현재 입력 중인 문장의 타수 (조합 중인 글자는 제외)
function partialStrokes() {
  // 문장 사이 대기 중에 친 글자는 통계에 넣지 않는다
  if (waitingForNextText) {
    return { correct: 0, typed: 0 };
  }

  const input = currentInput();
  const composingIndex = isComposing ? input.length - 1 : -1;
  let correct = 0;
  let typed = 0;

  for (let i = 0; i < input.length; i += 1) {
    if (i === composingIndex) {
      continue;
    }
    const strokes = charStrokes(input[i]);
    typed += strokes;
    if (input[i] === targetText[i]) {
      correct += strokes;
    }
  }

  return { correct, typed };
}

function totalStrokes() {
  const partial = partialStrokes();
  return {
    correct: totalCorrectStrokes + partial.correct,
    typed: totalTypedStrokes + partial.typed
  };
}

function calcStats() {
  const elapsed = PRACTICE_SECONDS - remainingSeconds;
  const { correct, typed } = totalStrokes();

  const kpm = elapsed > 0 ? Math.round((correct / elapsed) * 60) : 0;
  const accuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100;

  return { kpm, accuracy };
}

function tick() {
  remainingSeconds -= 1;

  timerEl.textContent = `${remainingSeconds}초`;
  if (remainingSeconds <= 10) {
    timerEl.classList.add('timer--danger');
  }

  progressBar.style.width = `${(remainingSeconds / PRACTICE_SECONDS) * 100}%`;
  if (remainingSeconds <= 10) {
    progressBar.classList.add('progress-bar--danger');
  }

  const { kpm, accuracy } = calcStats();
  kpmEl.textContent = `${kpm} KPM`;
  accuracyEl.textContent = `${accuracy}%`;

  if (remainingSeconds <= 0) {
    finish();
  }
}

function startTimer() {
  timerEl.textContent = `${PRACTICE_SECONDS}초`;
  progressBar.style.width = '100%';
  timerInterval = window.setInterval(tick, 1000);
}

function startCountdown() {
  let count = 3;
  countdownEl.classList.remove('hidden');
  countdownEl.textContent = String(count);

  const intervalId = window.setInterval(() => {
    count -= 1;

    if (count <= 0) {
      window.clearInterval(intervalId);
      countdownEl.classList.add('hidden');
      typingInput.disabled = false;
      typingInput.focus();
      startTimer();
      return;
    }

    countdownEl.textContent = String(count);
  }, 1000);
}

function finish() {
  if (finished) {
    return;
  }

  finished = true;
  waitingForNextText = false;
  window.clearInterval(timerInterval);
  typingInput.disabled = true;

  const { correct, typed } = totalStrokes();

  const finalKpm = Math.round((correct / PRACTICE_SECONDS) * 60);
  const finalAccuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100;

  const { isNewBest, previousBestKpm, unlockedStageId } = updateStageResult(stage.id, {
    kpm: finalKpm,
    accuracy: finalAccuracy
  });

  saveLastResult({
    stageId: stage.id,
    stageOrder: stage.order,
    stageName: stage.name,
    kpm: finalKpm,
    accuracy: finalAccuracy,
    elapsedSeconds: PRACTICE_SECONDS,
    isNewBest,
    previousBestKpm,
    unlockedStageId
  });

  targetTextEl.innerHTML = '<span class="finish-hint">스페이스를 누르면 결과 화면으로 이동해요</span>';

  document.addEventListener('keydown', function onSpacebar(event) {
    if (event.code !== 'Space') {
      return;
    }

    event.preventDefault();
    document.removeEventListener('keydown', onSpacebar);
    location.href = `result.html?stage=${stage.order}`;
  });
}

typingInput.addEventListener('compositionstart', () => {
  isComposing = true;
});

typingInput.addEventListener('compositionend', () => {
  isComposing = false;

  // 조합 중에 스페이스가 눌린 경우: 커밋이 끝난 지금 전환한다
  if (pendingAdvance && waitingForNextText && !finished) {
    loadNextText();
  }
});

typingInput.addEventListener('input', (event) => {
  if (finished || waitingForNextText) {
    return;
  }

  isComposing = Boolean(event.isComposing);

  // 백스페이스로 이전 문장 영역까지 지운 경우 오프셋 보정
  if (typingInput.value.length < baseOffset) {
    baseOffset = typingInput.value.length;
  }

  // 문장 전환 스페이스는 preventDefault를 해도 IME 상태에 따라
  // 입력창에 끼어들 수 있다. 문장 맨 앞의 스페이스는 소비 처리
  while (typingInput.value[baseOffset] === ' ' && targetText[0] !== ' ') {
    baseOffset += 1;
  }

  const inputValue = currentInput();
  const composingIndex = isComposing ? inputValue.length - 1 : -1;

  // 영문 자판 상태 감지: 한/영 전환 안내
  imeHint.classList.toggle('hidden', !/[a-zA-Z]/.test(inputValue));

  const result = engine.update(inputValue, composingIndex);
  renderTypedDisplay(inputValue);
  renderTarget(result.statusList);

  const { kpm, accuracy } = calcStats();
  kpmEl.textContent = `${kpm} KPM`;
  accuracyEl.textContent = `${accuracy}%`;

  if (result.completed) {
    // 완료한 문장의 타수를 누적한다. 입력창은 절대 건드리지 않는다
    // (값 초기화·blur가 IME 조합을 깨서 글자가 사라지는 원인이었다)
    const strokes = countStrokes(targetText);
    totalCorrectStrokes += strokes;
    totalTypedStrokes += strokes;

    // 완료한 문장 구간을 소비 처리해 이중 계산을 막는다
    baseOffset = typingInput.value.length;

    waitingForNextText = true;
    renderTypedDisplay('');
    renderTarget(result.statusList);
    showNextTextHint();
  }
});

typingInput.addEventListener('paste', (event) => {
  event.preventDefault();
});

// 다른 곳을 클릭해도 입력이 끊기지 않게 포커스를 되찾는다
typingInput.addEventListener('blur', () => {
  if (!finished && !typingInput.disabled) {
    window.setTimeout(() => typingInput.focus(), 0);
  }
});

document.addEventListener('keydown', (event) => {
  keyboard.pressKey(event.code);

  if (!waitingForNextText || finished || event.code !== 'Space') {
    return;
  }

  event.preventDefault();

  // 마지막 글자가 아직 조합 중이면 IME가 이 스페이스로 커밋을
  // 진행하므로, compositionend 후에 전환한다 (leftover 흡수)
  if (isComposing) {
    pendingAdvance = true;
    return;
  }

  loadNextText();
});

document.addEventListener('keyup', (event) => {
  keyboard.releaseKey(event.code);
});

renderTarget(null);
startCountdown();
