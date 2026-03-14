import {
  BOARD_SIZE,
  TICK_MS,
  createInitialState,
  occupiesCell,
  queueDirection,
  restartGame,
  stepGame,
  togglePause,
} from "./snake-game.js";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const statusElement = document.querySelector("#status");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const soundButton = document.querySelector("#sound-button");
const controlButtons = document.querySelectorAll("[data-direction]");

let state = createInitialState();
let audioContext;
let soundEnabled = true;
let audioUnlockAttempted = false;

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
  statusElement.textContent = formatStatus(state.status);
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  soundButton.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

function formatStatus(status) {
  if (status === "game-over") {
    return "Game Over";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function setDirection(direction) {
  const nextDirection = queueDirection(state, direction);
  const shouldPlayMoveSound =
    nextDirection !== state.pendingDirection || state.status === "ready";

  state = {
    ...state,
    pendingDirection: nextDirection,
    status: state.status === "ready" ? "running" : state.status,
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

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  render();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

buildBoard();
render();
window.setInterval(tick, TICK_MS);
