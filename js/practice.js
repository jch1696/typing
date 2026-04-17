import { STAGES, TEXTS } from './data.js';
import { updateStageResult, saveLastResult } from './storage.js';
import { TypingEngine } from './typing-engine.js';
import { Keyboard } from './keyboard.js';

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
  }

  return text;
}

const stageLabel = document.getElementById('stageLabel');
const timerEl = document.getElementById('timer');
const keyboardEl = document.getElementById('keyboard');
const countdownEl = document.getElementById('countdown');
const targetTextEl = document.getElementById('targetText');
const typingInput = document.getElementById('typingInput');
const kpmEl = document.getElementById('kpm');
const accuracyEl = document.getElementById('accuracy');
const progressBar = document.getElementById('progressBar');

stageLabel.textContent = `${stage.order}단계: ${stage.name}`;

const keyboard = new Keyboard(keyboardEl);
keyboard.render();
keyboard.highlightStageKeys(stage.keys);

let targetText = pickNextText();
let engine = new TypingEngine(targetText);
let timerInterval = null;
let remainingSeconds = PRACTICE_SECONDS;
let finished = false;
let waitingForNextText = false;
let advanceOnSpaceKeyup = false;
let totalCompletedChars = 0;

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

function loadNextText() {
  targetText = pickNextText();
  engine = new TypingEngine(targetText);
  waitingForNextText = false;
  typingInput.disabled = false;
  typingInput.value = '';
  typingInput.focus();
  renderTarget(null);
}

function calcStats() {
  const elapsed = PRACTICE_SECONDS - remainingSeconds;
  const partialCorrect = engine.getCorrectCount();
  const totalCorrect = totalCompletedChars + partialCorrect;
  const partialTyped = typingInput.value.length;
  const totalTyped = totalCompletedChars + partialTyped;

  const kpm = elapsed > 0 ? Math.round((totalCorrect / elapsed) * 60) : 0;
  const accuracy = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

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

  const partialCorrect = engine.getCorrectCount();
  const partialTyped = typingInput.value.length;
  const totalCorrect = totalCompletedChars + partialCorrect;
  const totalTyped = totalCompletedChars + partialTyped;

  const finalKpm = Math.round((totalCorrect / PRACTICE_SECONDS) * 60);
  const finalAccuracy = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

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

typingInput.addEventListener('input', () => {
  if (finished || waitingForNextText) {
    return;
  }

  const result = engine.update(typingInput.value);
  renderTarget(result.statusList);

  const { kpm, accuracy } = calcStats();
  kpmEl.textContent = `${kpm} KPM`;
  accuracyEl.textContent = `${accuracy}%`;

  if (result.completed) {
    totalCompletedChars += targetText.length;
    waitingForNextText = true;
    typingInput.disabled = true;
    renderTarget(result.statusList);
    showNextTextHint();
  }
});

typingInput.addEventListener('paste', (event) => {
  event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  keyboard.pressKey(event.key);

  if (!waitingForNextText || finished || event.code !== 'Space') {
    return;
  }

  event.preventDefault();
  advanceOnSpaceKeyup = true;
});

document.addEventListener('keyup', (event) => {
  keyboard.releaseKey(event.key);

  if (!waitingForNextText || finished || !advanceOnSpaceKeyup || event.code !== 'Space') {
    return;
  }

  advanceOnSpaceKeyup = false;
  loadNextText();
});

renderTarget(null);
startCountdown();
