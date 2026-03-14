import {
  BOARD_SIZE,
  createInitialState,
  occupiesCell,
  queueDirection,
  restartGame,
  stepGame,
  togglePause,
} from "./snake-game.js";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const statusElement = document.querySelector("#status");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const soundButton = document.querySelector("#sound-button");
const difficultySelect = document.querySelector("#difficulty-select");
const overlayElement = document.querySelector("#overlay");
const overlayLabelElement = document.querySelector("#overlay-label");
const overlayTitleElement = document.querySelector("#overlay-title");
const overlayTextElement = document.querySelector("#overlay-text");
const overlayButton = document.querySelector("#overlay-button");
const controlButtons = document.querySelectorAll("[data-direction]");

const STORAGE_KEYS = {
  bestScore: "snake-best-score",
  soundEnabled: "snake-sound-enabled",
  difficulty: "snake-difficulty",
};

const DIFFICULTY_LEVELS = {
  easy: { label: "Easy", tickMs: 180 },
  normal: { label: "Normal", tickMs: 140 },
  hard: { label: "Hard", tickMs: 95 },
};

let audioContext;
let soundEnabled = loadStoredBoolean(STORAGE_KEYS.soundEnabled, true);
let audioUnlockAttempted = false;
let bestScore = loadStoredNumber(STORAGE_KEYS.bestScore, 0);
let difficulty = loadStoredDifficulty();
let tickHandle;
let touchStartX = 0;
let touchStartY = 0;
let state = createInitialState();

function loadStoredNumber(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : Number(value) || fallback;
  } catch {
    return fallback;
  }
}

function loadStoredBoolean(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) {
      return fallback;
    }

    return value === "true";
  } catch {
    return fallback;
  }
}

function loadStoredDifficulty() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.difficulty);
    return DIFFICULTY_LEVELS[value] ? value : "normal";
  } catch {
    return "normal";
  }
}

function saveSetting(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {}
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function unlockAudio() {
  if (audioUnlockAttempted) {
    return;
  }

  audioUnlockAttempted = true;
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state !== "running") {
    context.resume().catch(() => {
      audioUnlockAttempted = false;
    });
  }
}

function playTone({ frequency, duration, type = "square", volume = 0.04, delay = 0 }) {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state !== "running") {
    context.resume().then(() => {
      playTone({ frequency, duration, type, volume, delay });
    }).catch(() => {});
    return;
  }

  const startTime = context.currentTime + delay;
  const endTime = startTime + duration;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime);
}

function playMoveSound() {
  playTone({ frequency: 420, duration: 0.05, type: "square", volume: 0.03 });
}

function playEatSound() {
  playTone({ frequency: 520, duration: 0.06, type: "triangle", volume: 0.05 });
  playTone({
    frequency: 780,
    duration: 0.09,
    type: "triangle",
    volume: 0.045,
    delay: 0.04,
  });
}

function playPauseSound() {
  playTone({ frequency: 340, duration: 0.06, type: "square", volume: 0.035 });
}

function playResumeSound() {
  playTone({ frequency: 430, duration: 0.06, type: "square", volume: 0.035 });
}

function playRestartSound() {
  playTone({ frequency: 390, duration: 0.05, type: "triangle", volume: 0.04 });
  playTone({
    frequency: 590,
    duration: 0.08,
    type: "triangle",
    volume: 0.045,
    delay: 0.05,
  });
}

function playGameOverSound() {
  playTone({ frequency: 240, duration: 0.12, type: "sawtooth", volume: 0.05 });
  playTone({
    frequency: 180,
    duration: 0.18,
    type: "sawtooth",
    volume: 0.045,
    delay: 0.08,
  });
}

function buildBoard() {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    fragment.appendChild(cell);
  }

  boardElement.replaceChildren(fragment);
}

function getCellIndex(x, y) {
  return y * BOARD_SIZE + x;
}

function render() {
  const cells = boardElement.children;

  for (const cell of cells) {
    cell.className = "cell";
  }

  state.snake.forEach((segment, index) => {
    const cell = cells[getCellIndex(segment.x, segment.y)];
    if (!cell) {
      return;
    }

    cell.classList.add("snake");
    if (index === 0) {
      cell.classList.add("head");
    }
  });

  if (state.food && !occupiesCell(state.snake, state.food)) {
    const foodCell = cells[getCellIndex(state.food.x, state.food.y)];
    foodCell?.classList.add("food");
  }

  scoreElement.textContent = String(state.score);
  if (state.score > bestScore) {
    bestScore = state.score;
    saveSetting(STORAGE_KEYS.bestScore, bestScore);
  }

  bestScoreElement.textContent = String(bestScore);
  statusElement.textContent = formatStatus(state.status);
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = state.status === "ready" || state.status === "game-over";
  soundButton.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  difficultySelect.value = difficulty;
  difficultySelect.disabled = state.status === "running" || state.status === "paused";
  renderOverlay();
}

function formatStatus(status) {
  if (status === "game-over") {
    return "Game Over";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderOverlay() {
  if (state.status === "running") {
    overlayElement.classList.add("hidden");
    return;
  }

  overlayElement.classList.remove("hidden");

  if (state.status === "ready") {
    overlayLabelElement.textContent = "Snake";
    overlayTitleElement.textContent = "Classic Snake";
    overlayTextElement.textContent =
      `Difficulty: ${DIFFICULTY_LEVELS[difficulty].label}. Press start or use any direction key.`;
    overlayButton.textContent = "Start Game";
    return;
  }

  if (state.status === "paused") {
    overlayLabelElement.textContent = "Paused";
    overlayTitleElement.textContent = "Game Paused";
    overlayTextElement.textContent =
      "Press resume, Space, or a direction key to continue.";
    overlayButton.textContent = "Resume Game";
    return;
  }

  overlayLabelElement.textContent = "Game Over";
  overlayTitleElement.textContent = "Round Over";
  overlayTextElement.textContent =
    `Final score: ${state.score}. Best score: ${bestScore}. Press restart to try again.`;
  overlayButton.textContent = "Play Again";
}

function scheduleTick() {
  window.clearTimeout(tickHandle);
  tickHandle = window.setTimeout(runTick, DIFFICULTY_LEVELS[difficulty].tickMs);
}

function runTick() {
  tick();
  scheduleTick();
}

function startRunningFromReady() {
  if (state.status !== "ready") {
    return;
  }

  state = {
    ...state,
    status: "running",
  };
}

function setDirection(direction) {
  const nextDirection = queueDirection(state, direction);
  const shouldPlayMoveSound =
    nextDirection !== state.pendingDirection || state.status === "ready";

  startRunningFromReady();
  state = {
    ...state,
    pendingDirection: nextDirection,
  };

  if (shouldPlayMoveSound) {
    playMoveSound();
  }

  render();
}

function tick() {
  const previousScore = state.score;
  const previousStatus = state.status;
  state = stepGame(state);

  if (state.score > previousScore) {
    playEatSound();
  }

  if (previousStatus !== "game-over" && state.status === "game-over") {
    playGameOverSound();
  }

  render();
}

function handlePauseToggle() {
  const nextState = togglePause(state);

  if (nextState.status !== state.status) {
    if (nextState.status === "paused") {
      playPauseSound();
    } else if (state.status === "paused" && nextState.status === "running") {
      playResumeSound();
    }
  }

  state = nextState;
  render();
}

function handleRestart() {
  state = restartGame();
  playRestartSound();
  render();
}

function handleOverlayAction() {
  unlockAudio();

  if (state.status === "paused") {
    handlePauseToggle();
    return;
  }

  if (state.status === "game-over") {
    handleRestart();
    return;
  }

  startRunningFromReady();
  render();
}

function handleDifficultyChange(nextDifficulty) {
  if (!DIFFICULTY_LEVELS[nextDifficulty]) {
    return;
  }

  difficulty = nextDifficulty;
  saveSetting(STORAGE_KEYS.difficulty, difficulty);
  scheduleTick();
  render();
}

function handleSwipeDirection(startX, startY, endX, endY) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance < 24) {
    return;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    setDirection(deltaX > 0 ? "right" : "left");
    return;
  }

  setDirection(deltaY > 0 ? "down" : "up");
}

document.addEventListener("keydown", (event) => {
  unlockAudio();
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "w") {
    event.preventDefault();
    setDirection("up");
    return;
  }

  if (key === "arrowdown" || key === "s") {
    event.preventDefault();
    setDirection("down");
    return;
  }

  if (key === "arrowleft" || key === "a") {
    event.preventDefault();
    setDirection("left");
    return;
  }

  if (key === "arrowright" || key === "d") {
    event.preventDefault();
    setDirection("right");
    return;
  }

  if (key === " " || key === "p") {
    event.preventDefault();
    handlePauseToggle();
    return;
  }

  if (key === "enter") {
    event.preventDefault();
    handleRestart();
  }
});

document.addEventListener("pointerdown", unlockAudio, { passive: true });

pauseButton.addEventListener("click", handlePauseToggle);

restartButton.addEventListener("click", handleRestart);
overlayButton.addEventListener("click", handleOverlayAction);

difficultySelect.addEventListener("change", (event) => {
  handleDifficultyChange(event.target.value);
});

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  saveSetting(STORAGE_KEYS.soundEnabled, soundEnabled);
  render();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    unlockAudio();
    setDirection(button.dataset.direction);
  });
});

boardElement.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  unlockAudio();
}, { passive: true });

boardElement.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  handleSwipeDirection(touchStartX, touchStartY, touch.clientX, touch.clientY);
}, { passive: true });

buildBoard();
render();
scheduleTick();
