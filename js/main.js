import { STAGES, getStageLabel } from './data.js';
import { loadProgress, resetProgress } from './storage.js';

const TRACKS = [
  { lang: 'ko', title: '한글 연습' },
  { lang: 'en', title: '영어 연습' }
];

function createStageCard(stage, stageProgress) {
  const { number } = getStageLabel(stage);
  const card = document.createElement('article');
  card.className = `stage-card${stageProgress.unlocked ? '' : ' stage-card--locked'}`;

  if (stageProgress.unlocked) {
    const bestText = stageProgress.bestKpm > 0
      ? `최고 <strong>${stageProgress.bestKpm} KPM</strong>`
      : '기록 없음';

    card.innerHTML = `
      <div class="stage-card__order">${number}단계</div>
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
      <div class="stage-card__order">${number}단계</div>
      <div class="stage-card__name">${stage.name}</div>
      <div class="stage-card__lock">🔒</div>
      <div class="stage-card__unlock-hint">${hint}</div>
    `;
  }

  return card;
}

function renderStageCards() {
  const progress = loadProgress();
  const container = document.getElementById('stageGrid');

  container.innerHTML = '';

  TRACKS.forEach((track) => {
    const title = document.createElement('h2');
    title.className = 'track-title';
    title.textContent = track.title;
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'stage-grid';

    STAGES
      .filter((stage) => stage.lang === track.lang)
      .forEach((stage) => {
        grid.appendChild(createStageCard(stage, progress[stage.id]));
      });

    container.appendChild(grid);
  });
}

document.getElementById('resetButton').addEventListener('click', () => {
  if (window.confirm('모든 기록이 초기화됩니다. 계속하시겠어요?')) {
    resetProgress();
    renderStageCards();
  }
});

renderStageCards();
