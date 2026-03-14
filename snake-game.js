export const BOARD_SIZE = 16;
export const INITIAL_DIRECTION = "right";
export const TICK_MS = 140;

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function createInitialState(random = Math.random) {
  const snake = [
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 },
  ];

  return {
    boardSize: BOARD_SIZE,
    snake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    food: getRandomFreeCell(snake, BOARD_SIZE, random),
    score: 0,
    status: "ready",
  };
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTIONS[nextDirection]) {
    return state.pendingDirection;
  }

  if (OPPOSITES[state.direction] === nextDirection) {
    return state.pendingDirection;
  }

  return nextDirection;
}

export function togglePause(state) {
  if (state.status === "game-over") {
    return state;
  }

  if (state.status === "paused") {
    return { ...state, status: "running" };
  }

  if (state.status === "ready" || state.status === "running") {
    return { ...state, status: "paused" };
  }

  return state;
}

export function restartGame(random = Math.random) {
  return createInitialState(random);
}

export function stepGame(state, random = Math.random) {
  if (state.status === "paused" || state.status === "game-over") {
    return state;
  }

  if (!state.food) {
    return {
      ...state,
      status: "game-over",
    };
  }

  const direction = state.pendingDirection;
  const vector = DIRECTIONS[direction];
  const nextHead = {
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y,
  };

  const grows =
    nextHead.x === state.food.x && nextHead.y === state.food.y;
  const bodyToCheck = grows ? state.snake : state.snake.slice(0, -1);

  if (hitsWall(nextHead, state.boardSize) || occupiesCell(bodyToCheck, nextHead)) {
    return {
      ...state,
      direction,
      status: "game-over",
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!grows) {
    nextSnake.pop();
  }

  const nextFood = grows
    ? getRandomFreeCell(nextSnake, state.boardSize, random)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    pendingDirection: direction,
    food: nextFood,
    score: grows ? state.score + 1 : state.score,
    status: nextFood ? "running" : "game-over",
  };
}

export function getRandomFreeCell(snake, boardSize, random = Math.random) {
  const freeCells = [];

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!occupiesCell(snake, { x, y })) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * freeCells.length);
  return freeCells[index];
}

export function occupiesCell(segments, cell) {
  return segments.some((segment) => segment.x === cell.x && segment.y === cell.y);
}

export function hitsWall(cell, boardSize) {
  return (
    cell.x < 0 ||
    cell.y < 0 ||
    cell.x >= boardSize ||
    cell.y >= boardSize
  );
}
