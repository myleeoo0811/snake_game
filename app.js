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
const controlButtons = document.querySelectorAll("[data-direction]");

let state = createInitialState();

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
}

function formatStatus(status) {
  if (status === "game-over") {
    return "Game Over";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function setDirection(direction) {
  state = {
    ...state,
    pendingDirection: queueDirection(state, direction),
    status: state.status === "ready" ? "running" : state.status,
  };
  render();
}

function tick() {
  state = stepGame(state);
  render();
}

document.addEventListener("keydown", (event) => {
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
    state = togglePause(state);
    render();
    return;
  }

  if (key === "enter") {
    event.preventDefault();
    state = restartGame();
    render();
  }
});

pauseButton.addEventListener("click", () => {
  state = togglePause(state);
  render();
});

restartButton.addEventListener("click", () => {
  state = restartGame();
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
