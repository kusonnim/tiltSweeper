const BALL_RADIUS = 14;
const ACCELERATION = 0.42;
const FRICTION = 0.94;
const MAX_SPEED = 6;
const DWELL_DURATION_MS = 650;

export function createBallController({ board, input }) {
  const position = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  let activeCellKey = '';
  let completedCellKey = '';
  let dwellStartedAt = 0;
  let onEnterCellCallback = () => {};
  let isPlaced = false;

  const ball = document.createElement('div');
  ball.className = 'ball ball-unplaced';
  ball.style.setProperty('--reveal-progress', '0deg');
  board.element.append(ball);

  function onEnterCell(callback) {
    onEnterCellCallback = callback;
  }

  function start() {
    input.start();
    requestAnimationFrame(tick);
  }

  function tick() {
    if (isPlaced) {
      applyInput();
      move();
      keepInsideBoard();
      updateBallPosition(position.x, position.y);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  function applyInput() {
    const direction = input.getDirection();
    velocity.x += direction.x * ACCELERATION;
    velocity.y += direction.y * ACCELERATION;
    velocity.x *= FRICTION;
    velocity.y *= FRICTION;
    limitSpeed();
  }

  function move() {
    position.x += velocity.x;
    position.y += velocity.y;
  }

  function keepInsideBoard() {
    const bounds = board.getBounds();
    if (!bounds) return;

    if (position.x < BALL_RADIUS) {
      position.x = BALL_RADIUS;
      velocity.x = 0;
    }

    if (position.x > bounds.width - BALL_RADIUS) {
      position.x = bounds.width - BALL_RADIUS;
      velocity.x = 0;
    }

    if (position.y < BALL_RADIUS) {
      position.y = BALL_RADIUS;
      velocity.y = 0;
    }

    if (position.y > bounds.height - BALL_RADIUS) {
      position.y = bounds.height - BALL_RADIUS;
      velocity.y = 0;
    }
  }

  function limitSpeed() {
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed <= MAX_SPEED) return;

    const scale = MAX_SPEED / speed;
    velocity.x *= scale;
    velocity.y *= scale;
  }

  function updateBallPosition(x, y) {
    ball.style.transform = `translate(${x}px, ${y}px)`;

    const cell = board.cellFromPoint(x, y);
    if (!cell) {
      resetDwell();
      return;
    }

    const cellKey = `${cell.row}:${cell.col}`;
    if (cellKey !== activeCellKey) {
      startDwell(cellKey);
      return;
    }

    updateDwell(cell);
  }

  function startDwell(cellKey) {
    activeCellKey = cellKey;
    completedCellKey = '';
    dwellStartedAt = performance.now();
    setRevealProgress(0);
  }

  function updateDwell(cell) {
    if (completedCellKey === activeCellKey) {
      setRevealProgress(0);
      return;
    }

    const progress = Math.min((performance.now() - dwellStartedAt) / DWELL_DURATION_MS, 1);
    setRevealProgress(progress);

    if (progress < 1) return;

    completedCellKey = activeCellKey;
    setRevealProgress(0);
    onEnterCellCallback(cell);
  }

  function resetDwell() {
    activeCellKey = '';
    completedCellKey = '';
    dwellStartedAt = 0;
    setRevealProgress(0);
  }

  function setRevealProgress(progress) {
    ball.style.setProperty('--reveal-progress', `${Math.round(progress * 360)}deg`);
  }

  function placeAtCell(cell) {
    const center = board.getCellCenter(cell.row, cell.col);
    if (!center) return;

    isPlaced = true;
    velocity.x = 0;
    velocity.y = 0;
    position.x = center.x;
    position.y = center.y;
    activeCellKey = `${cell.row}:${cell.col}`;
    completedCellKey = activeCellKey;
    dwellStartedAt = 0;
    setRevealProgress(0);
    ball.classList.remove('ball-unplaced');
    updateBallPosition(position.x, position.y);
  }

  function reset() {
    isPlaced = false;
    velocity.x = 0;
    velocity.y = 0;
    position.x = 0;
    position.y = 0;
    resetDwell();
    ball.classList.add('ball-unplaced');
  }

  return {
    element: ball,
    onEnterCell,
    placeAtCell,
    start,
    reset,
    updateBallPosition,
  };
}
