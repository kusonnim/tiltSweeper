const BALL_RADIUS = 14;
const ACCELERATION = 0.294;
const FRICTION = 0.94;
const MAX_SPEED = 4.2;
const DWELL_DURATION_MS = 650;
const KNOCKBACK_SPEED = 7.4;

export function createBallController({
  board,
  input,
  getHazardHit = () => false,
  isPaused = () => false,
  isBlockedCell = () => false,
  onHazardHit = () => {},
}) {
  const position = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  let activeCellKey = '';
  let completedCellKey = '';
  let dwellStartedAt = 0;
  let currentCell = null;
  let dwellProgress = 0;
  let onEnterCellCallback = () => {};
  let isPlaced = false;
  let stunnedUntil = 0;
  let invincibleUntil = 0;
  let lastHazardHitAt = 0;
  let animationFrameId = 0;

  const ball = document.createElement('div');
  ball.className = 'ball ball-unplaced';
  ball.style.setProperty('--reveal-progress', '0deg');
  ball.style.setProperty('--life-progress', '0deg');
  ball.style.setProperty('--life-color', 'var(--cyan)');
  board.element.append(ball);

  function onEnterCell(callback) {
    onEnterCellCallback = callback;
  }

  function start() {
    input.start();
    requestAnimationFrame(tick);
  }

  function tick() {
    if (isPlaced && !isPaused()) {
      applyInput();
      const previousPosition = { x: position.x, y: position.y };
      move();
      keepInsideBoard();
      keepOutsideBlockedCells(previousPosition);
      updateBallPosition(position.x, position.y);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  function applyInput() {
    if (performance.now() < stunnedUntil) {
      velocity.x *= 0.72;
      velocity.y *= 0.72;
      return;
    }

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

  function keepOutsideBlockedCells(previousPosition) {
    const cell = board.cellFromPoint(position.x, position.y);
    if (!cell || !isBlockedCell(cell)) return;

    const previousCell = board.cellFromPoint(previousPosition.x, previousPosition.y);
    if (previousCell?.row === cell.row && previousCell?.col === cell.col) {
      checkHazardHit(cell);
    }
    position.x = previousPosition.x;
    position.y = previousPosition.y;
    velocity.x = 0;
    velocity.y = 0;
    resetDwell();
  }

  function limitSpeed() {
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed <= MAX_SPEED) return;

    const scale = MAX_SPEED / speed;
    velocity.x *= scale;
    velocity.y *= scale;
  }

  function updateBallPosition(x, y) {
    board.updateCamera({ x, y });
    const viewportPosition = board.worldToViewport(x, y);
    ball.style.transform = `translate(${viewportPosition.x}px, ${viewportPosition.y}px)`;

    const cell = board.cellFromPoint(x, y);
    if (!cell) {
      currentCell = null;
      resetDwell();
      return;
    }

    currentCell = cell;
    checkHazardHit(cell);

    if (!board.isCellRevealable(cell.row, cell.col)) {
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

    dwellProgress = Math.min((performance.now() - dwellStartedAt) / DWELL_DURATION_MS, 1);
    setRevealProgress(dwellProgress);

    if (dwellProgress < 1) return;

    completedCellKey = activeCellKey;
    setRevealProgress(0);
    onEnterCellCallback(cell);
  }

  function resetDwell() {
    activeCellKey = '';
    completedCellKey = '';
    dwellStartedAt = 0;
    dwellProgress = 0;
    setRevealProgress(0);
  }

  function setRevealProgress(progress) {
    ball.style.setProperty('--reveal-progress', `${Math.round(progress * 360)}deg`);
  }

  function setLives(currentLives, maxLives) {
    const max = Math.max(1, Number(maxLives) || 1);
    const current = Math.max(0, Math.min(max, Number(currentLives) || 0));
    const ratio = current / max;
    const color = ratio > 0.55 ? '#70ffba' : ratio > 0.25 ? 'var(--amber)' : 'var(--red)';

    ball.style.setProperty('--life-progress', `${Math.round(ratio * 360)}deg`);
    ball.style.setProperty('--life-color', color);
    ball.classList.toggle('ball-life-critical', ratio > 0 && ratio <= 0.25);
    ball.classList.toggle('ball-life-hidden', current === 0);
  }

  function hideLives() {
    ball.style.setProperty('--life-progress', '0deg');
    ball.style.setProperty('--life-color', 'var(--cyan)');
    ball.classList.remove('ball-life-critical');
    ball.classList.add('ball-life-hidden');
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
    currentCell = cell;
    dwellStartedAt = 0;
    dwellProgress = 0;
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
    currentCell = null;
    stunnedUntil = 0;
    invincibleUntil = 0;
    lastHazardHitAt = 0;
    resetDwell();
    ball.classList.add('ball-unplaced');
  }

  function playImpact() {
    if (!isPlaced) return;

    ball.classList.remove('ball-impact');
    void ball.offsetWidth;
    ball.classList.add('ball-impact');
    ball.addEventListener('animationend', clearImpact, { once: true });
    setTimeout(clearImpact, 700);
  }

  function clearImpact() {
    ball.classList.remove('ball-impact');
  }

  function stun(durationMs = 650) {
    stunnedUntil = performance.now() + durationMs;
    velocity.x = 0;
    velocity.y = 0;
    resetDwell();
    playImpact();
  }

  function knockbackFromCell(cell, durationMs = 520) {
    const center = board.getCellCenter(cell.row, cell.col);
    if (!center) return;

    const dx = position.x - center.x;
    const dy = position.y - center.y;
    const distance = Math.hypot(dx, dy) || 1;
    stunnedUntil = performance.now() + durationMs;
    velocity.x = (dx / distance) * KNOCKBACK_SPEED;
    velocity.y = (dy / distance) * KNOCKBACK_SPEED;
    resetDwell();
    playImpact();
  }

  function makeInvincible(durationMs = 1400) {
    invincibleUntil = performance.now() + durationMs;
    ball.classList.add('ball-invincible');
    setTimeout(() => {
      if (performance.now() >= invincibleUntil) {
        ball.classList.remove('ball-invincible');
      }
    }, durationMs);
  }

  function checkHazardHit(cell) {
    const now = performance.now();
    if (now < invincibleUntil) return;
    if (now - lastHazardHitAt < 900 || !getHazardHit(cell)) return;

    lastHazardHitAt = now;
    onHazardHit(cell);
  }

  function shiftTimers(durationMs) {
    if (dwellStartedAt > 0) {
      dwellStartedAt += durationMs;
    }

    if (stunnedUntil > 0) {
      stunnedUntil += durationMs;
    }

    if (invincibleUntil > 0) {
      invincibleUntil += durationMs;
    }

    if (lastHazardHitAt > 0) {
      lastHazardHitAt += durationMs;
    }
  }

  function getDebugState() {
    return {
      isPlaced,
      x: position.x,
      y: position.y,
      vx: velocity.x,
      vy: velocity.y,
      speed: Math.hypot(velocity.x, velocity.y),
      cell: currentCell,
      activeCellKey,
      dwellProgress,
      invincible: performance.now() < invincibleUntil,
      stunned: performance.now() < stunnedUntil,
    };
  }

  return {
    element: ball,
    onEnterCell,
    placeAtCell,
    playImpact,
    start,
    reset,
    getDebugState,
    hideLives,
    knockbackFromCell,
    makeInvincible,
    setLives,
    shiftTimers,
    stun,
    updateBallPosition,
  };
}
