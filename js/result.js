import { STAGES, getStageLabel } from './data.js';
import { loadLastResult } from './storage.js';

const result = loadLastResult();

if (!result) {
  location.href = 'index.html';
  throw new Error('No result data');
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${remainSeconds}초` : `${remainSeconds}초`;
}

document.getElementById('resultSummary').innerHTML = `
  <div class="result-row">
    <span class="result-row__label">타수</span>
    <span class="result-row__value">${result.kpm} KPM</span>
  </div>
  <div class="result-row">
    <span class="result-row__label">정확도</span>
    <span class="result-row__value">${result.accuracy}%</span>
  </div>
  <div class="result-row">
    <span class="result-row__label">소요 시간</span>
    <span class="result-row__value">${formatTime(result.elapsedSeconds)}</span>
  </div>
`;

let messageHtml = '';

if (result.isNewBest) {
  const previousBest = result.previousBestKpm > 0 ? ` (이전: ${result.previousBestKpm} KPM)` : '';
  messageHtml += `<div class="result-msg result-msg--best">최고 기록을 갱신했어요!${previousBest}</div>`;
}

if (result.unlockedStageId) {
  const unlockedStage = STAGES.find((stage) => stage.id === result.unlockedStageId);
  if (unlockedStage) {
    const { number, prefix } = getStageLabel(unlockedStage);
    messageHtml += `<div class="result-msg result-msg--unlock">${prefix} ${number}단계 ${unlockedStage.name}가 열렸어요!</div>`;
  }
}

if (!messageHtml) {
  messageHtml = '<div class="result-msg">차분하게 다시 도전해봐요!</div>';
}

document.getElementById('resultMessages').innerHTML = messageHtml;

document.getElementById('retryBtn').addEventListener('click', () => {
  location.href = `practice.html?stage=${result.stageOrder}`;
});
