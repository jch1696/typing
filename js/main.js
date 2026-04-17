import { STAGES } from './data.js';
import { loadProgress, resetProgress } from './storage.js';

function renderStageCards() {
  const progress = loadProgress();
  const grid = document.getElementById('stageGrid');

  grid.innerHTML = '';

  STAGES.forEach((stage) => {
    const stageProgress = progress[stage.id];
    const card = document.createElement('article');
    card.className = `stage-card${stageProgress.unlocked ? '' : ' stage-card--locked'}`;

    if (stageProgress.unlocked) {
      const bestText = stageProgress.bestKpm > 0
        ? `최고 <strong>${stageProgress.bestKpm} KPM</strong>`
        : '기록 없음';

      card.innerHTML = `
        <div class="stage-card__order">${stage.order}단계</div>
        <div class="stage-card__name">${stage.name}</div>
        <div class="stage-card__best">${bestText}</div>
        <span class="stage-card__btn">시작하기</span>
      `;

      card.addEventListener('click', () => {
        location.href = `practice.html?stage=${stage.order}`;
      });
    } else {
      const previousStage = STAGES.find((item) => item.id === stage.unlock?.stageId);
      const hint = previousStage
        ? `${previousStage.name}에서 ${stage.unlock.minKpm} KPM 이상 달성하면 열려요!`
        : '아직 열리지 않은 단계예요.';

      card.innerHTML = `
        <div class="stage-card__order">${stage.order}단계</div>
        <div class="stage-card__name">${stage.name}</div>
        <div class="stage-card__lock">🔒</div>
        <div class="stage-card__unlock-hint">${hint}</div>
      `;
    }

    grid.appendChild(card);
  });
}

document.getElementById('resetButton').addEventListener('click', () => {
  if (window.confirm('모든 기록이 초기화됩니다. 계속하시겠어요?')) {
    resetProgress();
    renderStageCards();
  }
});

renderStageCards();
