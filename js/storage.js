import { STAGES } from './data.js';

const STORAGE_KEY = 'tadak_progress';
const LAST_RESULT_KEY = 'tadak_last_result';

function createDefaultProgress() {
  const progress = {};
  STAGES.forEach((stage) => {
    progress[stage.id] = {
      unlocked: stage.unlock === null,
      bestKpm: 0,
      bestAccuracy: 0,
      playCount: 0
    };
  });
  return progress;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultProgress();
    STAGES.forEach(stage => {
      if (!parsed[stage.id]) parsed[stage.id] = defaults[stage.id];
    });
    return parsed;
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getStageProgress(stageId) {
  return loadProgress()[stageId];
}

export function updateStageResult(stageId, { kpm, accuracy }) {
  const progress = loadProgress();
  const stage = progress[stageId];

  stage.playCount += 1;

  const isNewBest = kpm > stage.bestKpm;
  const previousBestKpm = stage.bestKpm;

  if (isNewBest) {
    stage.bestKpm = kpm;
    stage.bestAccuracy = accuracy;
  }

  // 다음 단계 잠금 해제 확인
  let unlockedStageId = null;
  const nextStage = STAGES.find(s => s.unlock?.stageId === stageId);
  if (nextStage && !progress[nextStage.id].unlocked && kpm >= nextStage.unlock.minKpm) {
    progress[nextStage.id].unlocked = true;
    unlockedStageId = nextStage.id;
  }

  saveProgress(progress);
  return { isNewBest, previousBestKpm, unlockedStageId };
}

export function saveLastResult(result) {
  sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
}

export function loadLastResult() {
  try {
    const raw = sessionStorage.getItem(LAST_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
