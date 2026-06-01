const WARNING_DURATION_MS = 1000;
const CIRCLE_WARNING_DURATION_MS = WARNING_DURATION_MS * 2;
const CELL_WARNING_DELAY_MS = 55;
const CELL_ACTIVE_POP_DURATION_MS = 520;
const AUTO_INTERVAL_MS = 8500;
const CIRCLE_GROUP_SIZE = 3;
const CIRCLE_GROUP_DELAY_MS = 520;

export const DYNAMIC_MODE_SETTINGS = {
  customHazardCount: 4,
  mode: 'classic',
  hazardHitMode: 'penalty',
};

export function createDynamicHazards({ getCircleRadius = () => 1, getMaxHazards = () => 1, getRows, getCols, getSettings }) {
  let hazards = [];
  let lastAutoAt = performance.now();

  function update(now = performance.now()) {
    hazards = hazards.filter((hazard) => now - hazard.startedAt < getHazardDuration(hazard));

    if (getSettings().mode !== 'dynamic' || hazards.length > 0) {
      return;
    }

    if (now - lastAutoAt >= AUTO_INTERVAL_MS) {
      triggerRandomGroup(now);
    }
  }

  function triggerRandomGroup(now = performance.now()) {
    if (pickRandomHazardType() === 'circle') {
      triggerCircleGroup(now);
      return;
    }

    triggerLineGroup(now);
  }

  function triggerRandom(now = performance.now()) {
    const type = pickRandomHazardType();
    if (type === 'circle') {
      triggerCircle({ now });
      return;
    }

    triggerLine({ now });
  }

  function triggerLineGroup(now = performance.now()) {
    const maxHazards = Math.max(1, getMaxHazards());
    for (let index = 0; index < maxHazards; index += 1) {
      triggerLine({ now });
    }
  }

  function triggerCircleGroup(now = performance.now()) {
    for (let index = 0; index < CIRCLE_GROUP_SIZE; index += 1) {
      triggerCircle({ now: now + index * CIRCLE_GROUP_DELAY_MS });
    }
  }

  function triggerLine({ now = performance.now() } = {}) {
    const axis = Math.random() < 0.5 ? 'row' : 'col';
    const maxIndex = axis === 'row' ? getRows() : getCols();

    trigger({ axis, direction: Math.random() < 0.5 ? 1 : -1, index: Math.floor(Math.random() * maxIndex), now });
  }

  function triggerCircle({ now = performance.now() } = {}) {
    const radius = clampInteger(getCircleRadius(), 1, Math.max(getRows(), getCols()));
    const row = Math.floor(Math.random() * getRows());
    const col = Math.floor(Math.random() * getCols());
    const maxDistance = getMaxCircleDistance(row, col, radius);

    hazards.push({
      type: 'circle',
      col,
      length: maxDistance + 1,
      radius,
      row,
      startedAt: now,
    });
    lastAutoAt = now;
  }

  function trigger({ axis = 'row', direction = 1, index = 0, now = performance.now() } = {}) {
    const maxIndex = axis === 'row' ? getRows() : getCols();
    const lineLength = axis === 'row' ? getCols() : getRows();
    const hazard = {
      axis,
      direction: direction === -1 ? -1 : 1,
      index: clampInteger(index, 0, Math.max(0, maxIndex - 1)),
      length: lineLength,
      startedAt: now,
      type: 'line',
    };
    hazards.push(hazard);
    lastAutoAt = now;
  }

  function reset(now = performance.now()) {
    hazards = [];
    lastAutoAt = now;
  }

  function getCellState(row, col, now = performance.now()) {
    const states = hazards.map((hazard) => getSingleHazardCellState(hazard, row, col, now));
    return pickStrongestState(states);
  }

  function getSingleHazardCellState(hazard, row, col, now = performance.now()) {
    if (now < hazard.startedAt) {
      return 'idle';
    }

    if (hazard.type === 'circle') {
      return getCircleCellState(hazard, row, col, now);
    }

    if ((hazard.axis === 'row' && row !== hazard.index) || (hazard.axis === 'col' && col !== hazard.index)) {
      return 'idle';
    }

    return getSequencedCellState(hazard, getLinePosition(row, col, hazard), now);
  }

  function isCellActive(cell) {
    if (!cell) return false;
    return ['active', 'active-pop'].includes(getCellState(cell.row, cell.col));
  }

  function getDebugState() {
    return {
      mode: getSettings().mode,
      hitMode: getSettings().hazardHitMode,
      hazard: hazards[0] ? { ...hazards[0], phase: getPhase(hazards[0]) } : null,
      hazards: hazards.map((hazard) => ({ ...hazard, phase: getPhase(hazard) })),
      maxHazards: getMaxHazards(),
    };
  }

  function getPhase(hazard, now = performance.now()) {
    if (!hazard) return 'idle';
    return now - hazard.startedAt >= getWarningDuration(hazard) ? 'active' : 'warning';
  }

  return {
    getCellState,
    getDebugState,
    isCellActive,
    reset,
    triggerCircle,
    triggerCircleGroup,
    triggerLine,
    triggerLineGroup,
    triggerRandom,
    triggerRandomGroup,
    update,
  };
}

function pickStrongestState(states) {
  if (states.includes('active-pop')) return 'active-pop';
  if (states.includes('warning')) return 'warning';
  if (states.includes('warning-pending')) return 'warning-pending';
  return 'idle';
}

function getHazardDuration(hazard) {
  return getWarningDuration(hazard) + (Math.max(1, hazard.length) - 1) * CELL_WARNING_DELAY_MS + CELL_ACTIVE_POP_DURATION_MS;
}

function getSequencedCellState(hazard, position, now) {
  const elapsed = now - hazard.startedAt;
  const warningDuration = getWarningDuration(hazard);
  if (elapsed >= warningDuration) {
    if (elapsed >= getHazardDuration(hazard)) {
      return 'idle';
    }

    const activeElapsed = elapsed - warningDuration;
    const popStartsAt = position * CELL_WARNING_DELAY_MS;
    if (activeElapsed < popStartsAt) {
      return 'warning-pending';
    }

    return activeElapsed < popStartsAt + CELL_ACTIVE_POP_DURATION_MS ? 'active-pop' : 'idle';
  }

  return elapsed >= position * CELL_WARNING_DELAY_MS ? 'warning' : 'warning-pending';
}

function getWarningDuration(hazard) {
  return hazard.type === 'circle' ? CIRCLE_WARNING_DURATION_MS : WARNING_DURATION_MS;
}

function getCircleCellState(hazard, row, col, now) {
  const distance = Math.hypot(row - hazard.row, col - hazard.col);
  if (distance > hazard.radius) {
    return 'idle';
  }

  return getSequencedCellState(hazard, Math.floor(distance), now);
}

function getLinePosition(row, col, hazard) {
  const rawPosition = hazard.axis === 'row' ? col : row;
  return hazard.direction === 1 ? rawPosition : hazard.length - 1 - rawPosition;
}

function getMaxCircleDistance(centerRow, centerCol, radius) {
  let maxDistance = 0;

  for (let row = Math.max(0, centerRow - radius); row <= centerRow + radius; row += 1) {
    for (let col = Math.max(0, centerCol - radius); col <= centerCol + radius; col += 1) {
      if (Math.hypot(row - centerRow, col - centerCol) <= radius) {
        maxDistance = Math.max(maxDistance, Math.floor(Math.hypot(row - centerRow, col - centerCol)));
      }
    }
  }

  return maxDistance;
}

function pickRandomHazardType() {
  const roll = Math.random();
  if (roll < 0.36) return 'circle';
  return 'line';
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
