const WARNING_DURATION_MS = 1000;
const CELL_WARNING_DELAY_MS = 55;
const CELL_ACTIVE_POP_DURATION_MS = 520;
const AUTO_INTERVAL_MS = 8500;

export const DYNAMIC_MODE_SETTINGS = {
  mode: 'classic',
  hazardHitMode: 'penalty',
};

export function createDynamicHazards({ getRows, getCols, getSettings }) {
  let hazard = null;
  let lastAutoAt = performance.now();

  function update(now = performance.now()) {
    if (hazard && now - hazard.startedAt >= getHazardDuration(hazard)) {
      hazard = null;
    }

    if (getSettings().mode !== 'dynamic' || hazard) {
      return;
    }

    if (now - lastAutoAt >= AUTO_INTERVAL_MS) {
      triggerRandom(now);
    }
  }

  function triggerRandom(now = performance.now()) {
    const axis = Math.random() < 0.5 ? 'row' : 'col';
    const maxIndex = axis === 'row' ? getRows() : getCols();

    trigger({ axis, direction: Math.random() < 0.5 ? 1 : -1, index: Math.floor(Math.random() * maxIndex), now });
  }

  function trigger({ axis = 'row', direction = 1, index = 0, now = performance.now() } = {}) {
    const maxIndex = axis === 'row' ? getRows() : getCols();
    const lineLength = axis === 'row' ? getCols() : getRows();
    hazard = {
      axis,
      direction: direction === -1 ? -1 : 1,
      index: clampInteger(index, 0, Math.max(0, maxIndex - 1)),
      length: lineLength,
      startedAt: now,
    };
    lastAutoAt = now;
  }

  function reset(now = performance.now()) {
    hazard = null;
    lastAutoAt = now;
  }

  function getCellState(row, col, now = performance.now()) {
    if (!hazard) return 'idle';
    if ((hazard.axis === 'row' && row !== hazard.index) || (hazard.axis === 'col' && col !== hazard.index)) {
      return 'idle';
    }

    const elapsed = now - hazard.startedAt;
    if (elapsed >= WARNING_DURATION_MS) {
      if (elapsed >= getHazardDuration(hazard)) {
        return 'idle';
      }

      const activeElapsed = elapsed - WARNING_DURATION_MS;
      const position = getLinePosition(row, col, hazard);
      const popStartsAt = position * CELL_WARNING_DELAY_MS;
      if (activeElapsed < popStartsAt) {
        return 'warning-pending';
      }

      return activeElapsed < popStartsAt + CELL_ACTIVE_POP_DURATION_MS ? 'active-pop' : 'idle';
    }

    const position = getLinePosition(row, col, hazard);
    return elapsed >= position * CELL_WARNING_DELAY_MS ? 'warning' : 'warning-pending';
  }

  function isCellActive(cell) {
    if (!cell) return false;
    return ['active', 'active-pop'].includes(getCellState(cell.row, cell.col));
  }

  function getDebugState() {
    return {
      mode: getSettings().mode,
      hitMode: getSettings().hazardHitMode,
      hazard: hazard ? { ...hazard, phase: getPhase() } : null,
    };
  }

  function getPhase(now = performance.now()) {
    if (!hazard) return 'idle';
    return now - hazard.startedAt >= WARNING_DURATION_MS ? 'active' : 'warning';
  }

  return {
    getCellState,
    getDebugState,
    isCellActive,
    reset,
    triggerRandom,
    update,
  };
}

function getHazardDuration(hazard) {
  return WARNING_DURATION_MS + (Math.max(1, hazard.length) - 1) * CELL_WARNING_DELAY_MS + CELL_ACTIVE_POP_DURATION_MS;
}

function getLinePosition(row, col, hazard) {
  const rawPosition = hazard.axis === 'row' ? col : row;
  return hazard.direction === 1 ? rawPosition : hazard.length - 1 - rawPosition;
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
