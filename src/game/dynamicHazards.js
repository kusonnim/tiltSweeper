const WARNING_DURATION_MS = 1000;
const CIRCLE_WARNING_DURATION_MS = WARNING_DURATION_MS * 2;
const CELL_WARNING_DELAY_MS = 55;
const CELL_ACTIVE_POP_DURATION_MS = 520;
const AUTO_INTERVAL_MS = 8500;
const CIRCLE_GROUP_SIZE = 3;
const CIRCLE_GROUP_DELAY_MS = 520;
const EDGE_WARNING_DURATION_MS = 1400;
const EDGE_LINE_DELAY_MS = 360;
const SHELTER_EDGE_LINE_DELAY_MS = 85;
const SHELTER_WARNING_DURATION_MS = 1500;
const SHELTER_WAVE_DELAY_MS = 2600;
const SHELTER_WAVE_COUNT = 3;
const SHELTER_WAVE_START_INTERVAL_MS = 780;
const SHELTER_SHADOW_LENGTH = 3;
const FALLING_BOX_WARNING_MS = 900;
const FALLING_BOX_STAGGER_MS = 180;
const FALLING_BOX_BLOCKER_DURATION_MS = 2800;
const FALLING_BOX_WAVE_RADIUS = 2;
const FALLING_BOX_WAVE_STEP_MS = 90;
const FALLING_FOLLOWUP_DELAY_MS = 900;
const FALLING_SHELTER_WAVE_DELAY_MS = 900;
const BOX_LASER_WARNING_MS = 760;
const BOX_LASER_STAGGER_MS = 180;

export const DYNAMIC_MODE_SETTINGS = {
  customHazardCount: 4,
  instantLives: 1,
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
    const type = pickRandomHazardType();
    if (type === 'falling-boxes') {
      triggerFallingBoxes({ now });
      return;
    }

    if (type === 'shelter') {
      triggerShelterSweep({ now });
      return;
    }

    if (type === 'edge') {
      triggerEdgeWave({ now });
      return;
    }

    if (type === 'circle') {
      triggerCircleGroup(now);
      return;
    }

    triggerLineGroup(now);
  }

  function triggerRandom(now = performance.now()) {
    const type = pickRandomHazardType();
    if (type === 'falling-boxes') {
      triggerFallingBoxes({ now });
      return;
    }

    if (type === 'shelter') {
      triggerShelterSweep({ now });
      return;
    }

    if (type === 'circle') {
      triggerCircle({ now });
      return;
    }

    if (type === 'edge') {
      triggerEdgeWave({ now });
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

  function triggerEdgeWave({ now = performance.now() } = {}) {
    const verticalSide = ['top', 'bottom'][Math.floor(Math.random() * 2)];
    const horizontalSide = ['left', 'right'][Math.floor(Math.random() * 2)];

    hazards.push(createEdgeHazard(verticalSide, now), createEdgeHazard(horizontalSide, now));
    lastAutoAt = now;
  }

  function triggerShelterSweep({ now = performance.now() } = {}) {
    const side = ['top', 'right', 'bottom', 'left'][Math.floor(Math.random() * 4)];
    const length = ['top', 'bottom'].includes(side) ? getRows() : getCols();
    const boxes = createShelterBoxes(side, getRows(), getCols());

    hazards.push({
      type: 'shelter',
      boxes,
      length,
      side,
      startedAt: now,
    });
    lastAutoAt = now;
  }

  function triggerFallingBoxes({ now = performance.now() } = {}) {
    const rowCount = getRows();
    const colCount = getCols();
    const boxes = createDistributedBoxes(rowCount, colCount, getBoxCount(rowCount, colCount));
    const followUp = Math.random() < 0.5 ? 'shelter' : 'box-laser';
    const side = ['top', 'right', 'bottom', 'left'][Math.floor(Math.random() * 4)];

    hazards.push({
      type: 'falling-boxes',
      boxes,
      followUp,
      lasers: createBoxLasers(boxes, rowCount, colCount),
      length: ['top', 'bottom'].includes(side) ? rowCount : colCount,
      side,
      startedAt: now,
    });
    lastAutoAt = now;
  }

  function createEdgeHazard(side, now) {
    const length = ['top', 'bottom'].includes(side) ? getRows() : getCols();
    return {
      type: 'edge',
      length,
      side,
      startedAt: now,
      lineParity: 'odd',
    };
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

  function shiftTimers(durationMs) {
    hazards = hazards.map((hazard) => ({
      ...hazard,
      startedAt: hazard.startedAt + durationMs,
    }));
    lastAutoAt += durationMs;
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

    if (hazard.type === 'edge') {
      return getEdgeCellState(hazard, row, col, now);
    }

    if (hazard.type === 'shelter') {
      return getShelterCellState(hazard, row, col, now);
    }

    if (hazard.type === 'falling-boxes') {
      return getFallingBoxesCellState(hazard, row, col, now);
    }

    if ((hazard.axis === 'row' && row !== hazard.index) || (hazard.axis === 'col' && col !== hazard.index)) {
      return 'idle';
    }

    return getSequencedCellState(hazard, getLinePosition(row, col, hazard), now);
  }

  function isCellActive(cell) {
    if (!cell) return false;
    return ['active', 'active-pop', 'knockback-pop', 'blocker'].includes(getCellState(cell.row, cell.col));
  }

  function isCellBlocked(cell) {
    if (!cell) return false;
    return getCellState(cell.row, cell.col) === 'blocker';
  }

  function getCellEffect(cell, now = performance.now()) {
    if (!cell) return { type: 'none' };

    for (const hazard of hazards) {
      if (hazard.type === 'falling-boxes') {
        const source = getFallingBoxWaveSource(hazard, cell.row, cell.col, now);
        if (source) {
          return {
            source,
            type: 'knockback',
          };
        }
      }
    }

    return { type: getCellState(cell.row, cell.col, now) === 'idle' ? 'none' : 'hazard' };
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
    return now - hazard.startedAt >= getActivationDelay(hazard) ? 'active' : 'warning';
  }

  return {
    getCellState,
    getCellEffect,
    getDebugState,
    isCellActive,
    isCellBlocked,
    reset,
    shiftTimers,
    triggerCircle,
    triggerCircleGroup,
    triggerEdgeWave,
    triggerLine,
    triggerLineGroup,
    triggerRandom,
    triggerRandomGroup,
    triggerFallingBoxes,
    triggerShelterSweep,
    update,
  };
}

function pickStrongestState(states) {
  if (states.includes('active-pop')) return 'active-pop';
  if (states.includes('knockback-pop')) return 'knockback-pop';
  if (states.includes('blocker')) return 'blocker';
  if (states.includes('blocker-warning')) return 'blocker-warning';
  if (states.includes('shelter-shadow')) return 'shelter-shadow';
  if (states.includes('laser-warning')) return 'laser-warning';
  if (states.includes('warning')) return 'warning';
  if (states.includes('warning-pending')) return 'warning-pending';
  return 'idle';
}

function getHazardDuration(hazard) {
  if (hazard.type === 'shelter') {
    return getShelterHazardDuration(hazard);
  }

  if (hazard.type === 'falling-boxes') {
    return getFallingBoxesHazardDuration(hazard);
  }

  return getWarningDuration(hazard) + (Math.max(1, getSequenceLength(hazard)) - 1) * getStepDelay(hazard) + CELL_ACTIVE_POP_DURATION_MS;
}

function getSequencedCellState(hazard, position, now) {
  const elapsed = now - hazard.startedAt;
  const warningDuration = getWarningDuration(hazard);
  if (elapsed >= warningDuration) {
    if (elapsed >= getHazardDuration(hazard)) {
      return 'idle';
    }

    const activeElapsed = elapsed - warningDuration;
    const popStartsAt = position * getStepDelay(hazard);
    if (activeElapsed < popStartsAt) {
      return 'warning-pending';
    }

    return activeElapsed < popStartsAt + CELL_ACTIVE_POP_DURATION_MS ? 'active-pop' : 'idle';
  }

  return elapsed >= position * getStepDelay(hazard) ? 'warning' : 'warning-pending';
}

function getWarningDuration(hazard) {
  if (hazard.type === 'falling-boxes') {
    return FALLING_BOX_WARNING_MS;
  }

  if (hazard.type === 'shelter') {
    return SHELTER_WARNING_DURATION_MS;
  }

  if (hazard.type === 'edge') {
    return EDGE_WARNING_DURATION_MS;
  }

  return hazard.type === 'circle' ? CIRCLE_WARNING_DURATION_MS : WARNING_DURATION_MS;
}

function getActivationDelay(hazard) {
  if (hazard.type === 'falling-boxes') {
    return getFallingFollowUpStart(hazard);
  }

  if (hazard.type === 'shelter') {
    return SHELTER_WARNING_DURATION_MS + SHELTER_WAVE_DELAY_MS;
  }

  return getWarningDuration(hazard);
}

function getStepDelay(hazard) {
  if (hazard.type === 'shelter' || (hazard.type === 'falling-boxes' && hazard.followUp === 'shelter')) {
    return SHELTER_EDGE_LINE_DELAY_MS;
  }

  return hazard.type === 'edge' ? EDGE_LINE_DELAY_MS : CELL_WARNING_DELAY_MS;
}

function getCircleCellState(hazard, row, col, now) {
  const distance = Math.hypot(row - hazard.row, col - hazard.col);
  if (distance > hazard.radius) {
    return 'idle';
  }

  return getSequencedCellState(hazard, Math.floor(distance), now);
}

function getEdgeCellState(hazard, row, col, now) {
  const position = getEdgePosition(row, col, hazard);
  if (hazard.lineParity === 'odd' && position % 2 !== 0) {
    return 'idle';
  }

  return getEdgeSequencedCellState(hazard, hazard.lineParity === 'odd' ? position / 2 : position, now);
}

function getShelterCellState(hazard, row, col, now) {
  const elapsed = now - hazard.startedAt;
  const isBox = hasCell(hazard.boxes, row, col);
  if (elapsed < SHELTER_WARNING_DURATION_MS) {
    return isBox ? 'blocker-warning' : 'idle';
  }

  if (isBox) {
    return 'blocker';
  }

  if (isShelterShadowCell(hazard, row, col)) {
    return 'shelter-shadow';
  }

  const activeElapsed = elapsed - SHELTER_WARNING_DURATION_MS;
  const waveState = getShelterWaveCellState(hazard, row, col, activeElapsed);
  if (waveState !== 'idle') {
    return waveState;
  }

  return 'idle';
}

function getFallingBoxesCellState(hazard, row, col, now) {
  const box = hazard.boxes.find((candidate) => candidate.row === row && candidate.col === col);
  const elapsed = now - hazard.startedAt;
  if (box) {
    const warningStartsAt = box.order * FALLING_BOX_STAGGER_MS;
    const landsAt = FALLING_BOX_WARNING_MS + warningStartsAt;
    if (elapsed < warningStartsAt) {
      return 'warning-pending';
    }

    if (elapsed < landsAt) {
      return 'blocker-warning';
    }

    const blockerEndsAt = hazard.followUp ? getFallingBoxesHazardDuration(hazard) : landsAt + FALLING_BOX_BLOCKER_DURATION_MS;
    return elapsed < blockerEndsAt ? 'blocker' : 'idle';
  }

  const impactState = getFallingBoxWaveState(hazard, row, col, elapsed);
  if (impactState !== 'idle') {
    return impactState;
  }

  if (hazard.followUp === 'shelter') {
    return getFallingShelterCellState(hazard, row, col, elapsed);
  }

  if (hazard.followUp === 'box-laser') {
    return getBoxLaserCellState(hazard, row, col, elapsed);
  }

  return 'idle';
}

function getFallingBoxWaveState(hazard, row, col, elapsed) {
  return getFallingBoxWaveSourceFromElapsed(hazard, row, col, elapsed) ? 'knockback-pop' : 'idle';
}

function getFallingBoxWaveSource(hazard, row, col, now) {
  return getFallingBoxWaveSourceFromElapsed(hazard, row, col, now - hazard.startedAt);
}

function getFallingBoxWaveSourceFromElapsed(hazard, row, col, elapsed) {
  for (const box of hazard.boxes) {
    const distance = Math.floor(Math.hypot(row - box.row, col - box.col));
    if (distance === 0 || distance > FALLING_BOX_WAVE_RADIUS) {
      continue;
    }

    const landsAt = FALLING_BOX_WARNING_MS + box.order * FALLING_BOX_STAGGER_MS;
    const waveStartsAt = landsAt + distance * FALLING_BOX_WAVE_STEP_MS;
    if (elapsed >= waveStartsAt && elapsed < waveStartsAt + CELL_ACTIVE_POP_DURATION_MS) {
      return box;
    }
  }

  return null;
}

function getShelterWaveCellState(hazard, row, col, activeElapsed) {
  if (activeElapsed < SHELTER_WAVE_DELAY_MS) {
    return 'idle';
  }

  const waveElapsed = activeElapsed - SHELTER_WAVE_DELAY_MS;
  const popStartsAt = getEdgePosition(row, col, hazard) * getStepDelay(hazard);

  for (let waveIndex = 0; waveIndex < SHELTER_WAVE_COUNT; waveIndex += 1) {
    const elapsedInWave = waveElapsed - waveIndex * SHELTER_WAVE_START_INTERVAL_MS;
    if (elapsedInWave >= popStartsAt && elapsedInWave < popStartsAt + CELL_ACTIVE_POP_DURATION_MS) {
      return 'active-pop';
    }
  }

  return 'idle';
}

function getFallingShelterCellState(hazard, row, col, elapsed) {
  const followUpElapsed = elapsed - getFallingFollowUpStart(hazard);
  if (followUpElapsed < 0) {
    return 'idle';
  }

  if (isShelterShadowCell(hazard, row, col)) {
    return 'shelter-shadow';
  }

  if (followUpElapsed < FALLING_SHELTER_WAVE_DELAY_MS) {
    return 'idle';
  }

  return getShelterWaveCellState(hazard, row, col, SHELTER_WAVE_DELAY_MS + followUpElapsed - FALLING_SHELTER_WAVE_DELAY_MS);
}

function getBoxLaserCellState(hazard, row, col, elapsed) {
  const followUpStart = getFallingFollowUpStart(hazard);

  for (const laser of hazard.lasers) {
    if (!isCellOnLaser(row, col, laser)) {
      continue;
    }

    const startsAt = followUpStart + laser.order * BOX_LASER_STAGGER_MS;
    if (elapsed < startsAt) {
      continue;
    }

    if (elapsed < startsAt + BOX_LASER_WARNING_MS) {
      return 'laser-warning';
    }

    if (elapsed < startsAt + BOX_LASER_WARNING_MS + CELL_ACTIVE_POP_DURATION_MS) {
      return 'active-pop';
    }
  }

  return 'idle';
}

function getEdgeSequencedCellState(hazard, position, now) {
  const elapsed = now - hazard.startedAt;
  const warningDuration = getWarningDuration(hazard);
  if (elapsed >= getHazardDuration(hazard)) {
    return 'idle';
  }

  const stepDelay = getStepDelay(hazard);
  const warningStartsAt = position * stepDelay;
  const activeStartsAt = warningDuration + position * stepDelay;
  if (elapsed < warningStartsAt) {
    return 'warning-pending';
  }

  if (elapsed < activeStartsAt) {
    return 'warning';
  }

  return elapsed < activeStartsAt + CELL_ACTIVE_POP_DURATION_MS ? 'active-pop' : 'idle';
}

function getLinePosition(row, col, hazard) {
  const rawPosition = hazard.axis === 'row' ? col : row;
  return hazard.direction === 1 ? rawPosition : hazard.length - 1 - rawPosition;
}

function getEdgePosition(row, col, hazard) {
  if (hazard.side === 'top') return row;
  if (hazard.side === 'bottom') return hazard.length - 1 - row;
  if (hazard.side === 'left') return col;
  return hazard.length - 1 - col;
}

function getSequenceLength(hazard) {
  if (hazard.type === 'edge' && hazard.lineParity === 'odd') {
    return Math.ceil(hazard.length / 2);
  }

  return hazard.length;
}

function getShelterWaveDuration(hazard) {
  return (Math.max(1, hazard.length) - 1) * getStepDelay(hazard) + CELL_ACTIVE_POP_DURATION_MS;
}

function getShelterHazardDuration(hazard) {
  return (
    SHELTER_WARNING_DURATION_MS +
    SHELTER_WAVE_DELAY_MS +
    Math.max(0, SHELTER_WAVE_COUNT - 1) * SHELTER_WAVE_START_INTERVAL_MS +
    getShelterWaveDuration(hazard)
  );
}

function getFallingBoxesHazardDuration(hazard) {
  const baseDuration =
    FALLING_BOX_WARNING_MS +
    Math.max(0, hazard.boxes.length - 1) * FALLING_BOX_STAGGER_MS +
    FALLING_BOX_BLOCKER_DURATION_MS +
    FALLING_BOX_WAVE_RADIUS * FALLING_BOX_WAVE_STEP_MS +
    CELL_ACTIVE_POP_DURATION_MS;
  const followUpStart = getFallingFollowUpStart(hazard);

  if (hazard.followUp === 'shelter') {
    return Math.max(
      baseDuration,
      followUpStart + FALLING_SHELTER_WAVE_DELAY_MS + Math.max(0, SHELTER_WAVE_COUNT - 1) * SHELTER_WAVE_START_INTERVAL_MS + getShelterWaveDuration(hazard),
    );
  }

  if (hazard.followUp === 'box-laser') {
    return Math.max(
      baseDuration,
      followUpStart + Math.max(0, hazard.lasers.length - 1) * BOX_LASER_STAGGER_MS + BOX_LASER_WARNING_MS + CELL_ACTIVE_POP_DURATION_MS,
    );
  }

  return baseDuration;
}

function getFallingFollowUpStart(hazard) {
  return FALLING_BOX_WARNING_MS + Math.max(0, hazard.boxes.length - 1) * FALLING_BOX_STAGGER_MS + FALLING_FOLLOWUP_DELAY_MS;
}

function createShelterBoxes(side, rowCount, colCount) {
  const rows = getSafeDimension(rowCount);
  const cols = getSafeDimension(colCount);
  const targetCount = getBoxCount(rows, cols);
  const rowPlacementRange = getBoxPlacementRange(rows);
  const colPlacementRange = getBoxPlacementRange(cols);
  const rawRowRange = normalizeRange(
    side === 'bottom' ? Math.min(rows - 1, SHELTER_SHADOW_LENGTH) : 1,
    side === 'top' ? Math.max(0, rows - SHELTER_SHADOW_LENGTH - 1) : rows - 2,
    rows,
  );
  const rawColRange = normalizeRange(
    side === 'right' ? Math.min(cols - 1, SHELTER_SHADOW_LENGTH) : 1,
    side === 'left' ? Math.max(0, cols - SHELTER_SHADOW_LENGTH - 1) : cols - 2,
    cols,
  );
  const rowRange = clampRangeToPlacement(rawRowRange, rowPlacementRange);
  const colRange = clampRangeToPlacement(rawColRange, colPlacementRange);
  const maxBoxes = Math.min(targetCount, getRangeLength(rowRange) * getRangeLength(colRange));
  const spreadAxis = ['top', 'bottom'].includes(side) ? 'col' : 'row';
  const spreadRange = spreadAxis === 'col' ? colRange : rowRange;
  const depthRange = spreadAxis === 'col' ? rowRange : colRange;
  const segments = createSegments(spreadRange.min, spreadRange.max, maxBoxes);
  const boxes = segments.map((segment) => {
    const spreadValue = randomInteger(segment.min, segment.max);
    const depthValue = randomInteger(depthRange.min, depthRange.max);
    return spreadAxis === 'col' ? { row: depthValue, col: spreadValue } : { row: spreadValue, col: depthValue };
  });

  while (boxes.length < maxBoxes) {
    const row = randomInteger(rowRange.min, rowRange.max);
    const col = randomInteger(colRange.min, colRange.max);
    if (!hasCell(boxes, row, col)) {
      boxes.push({ row, col });
    }
  }

  return boxes;
}

function createDistributedBoxes(rowCount, colCount, targetCount) {
  const rows = getSafeDimension(rowCount);
  const cols = getSafeDimension(colCount);
  const boxes = [];
  const rowRange = getBoxPlacementRange(rows);
  const colRange = getBoxPlacementRange(cols);
  const maxBoxes = Math.min(targetCount, getRangeLength(rowRange) * getRangeLength(colRange));
  const spreadAxis = cols >= rows ? 'col' : 'row';
  const spreadRange = spreadAxis === 'col' ? colRange : rowRange;
  const depthRange = spreadAxis === 'col' ? rowRange : colRange;
  const segments = createSegments(spreadRange.min, spreadRange.max, maxBoxes);

  for (const [order, segment] of segments.entries()) {
    const spreadValue = randomInteger(segment.min, segment.max);
    const depthValue = randomInteger(depthRange.min, depthRange.max);
    const box = spreadAxis === 'col' ? { row: depthValue, col: spreadValue, order } : { row: spreadValue, col: depthValue, order };
    if (!hasCell(boxes, box.row, box.col)) {
      boxes.push(box);
    }
  }

  while (boxes.length < maxBoxes) {
    const box = {
      row: randomInteger(rowRange.min, rowRange.max),
      col: randomInteger(colRange.min, colRange.max),
      order: boxes.length,
    };
    if (!hasCell(boxes, box.row, box.col)) {
      boxes.push(box);
    }
  }

  return boxes;
}

function createBoxLasers(boxes, rowCount, colCount) {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  return boxes.map((box, order) => ({
    ...box,
    direction: directions[Math.floor(Math.random() * directions.length)],
    order,
    rows: rowCount,
    cols: colCount,
  }));
}

function isCellOnLaser(row, col, laser) {
  if (row === laser.row && col === laser.col) {
    return false;
  }

  if (laser.direction.row !== 0) {
    return col === laser.col && (row - laser.row) * laser.direction.row > 0;
  }

  return row === laser.row && (col - laser.col) * laser.direction.col > 0;
}

function getBoxCount(rows, cols) {
  return Math.max(1, Math.floor((rows * cols) / 36));
}

function getBoxPlacementRange(length) {
  if (length <= 2) {
    return normalizeRange(0, length - 1, length);
  }

  return normalizeRange(1, length - 2, length);
}

function clampRangeToPlacement(range, placementRange) {
  const min = Math.max(range.min, placementRange.min);
  const max = Math.min(range.max, placementRange.max);

  if (min > max) {
    return placementRange;
  }

  return { min, max };
}

function getRangeLength(range) {
  return Math.max(0, range.max - range.min + 1);
}

function createSegments(min, max, count) {
  const length = max - min + 1;
  const segmentCount = Math.min(count, length);

  return Array.from({ length: segmentCount }, (_, index) => {
    const start = min + Math.floor((index * length) / segmentCount);
    const end = min + Math.floor(((index + 1) * length) / segmentCount) - 1;
    return {
      min: start,
      max: Math.max(start, end),
    };
  });
}

function isShelterShadowCell(hazard, row, col) {
  return hazard.boxes.some((box) => {
    if (hazard.side === 'top') {
      return col === box.col && row > box.row && row <= box.row + SHELTER_SHADOW_LENGTH;
    }

    if (hazard.side === 'bottom') {
      return col === box.col && row < box.row && row >= box.row - SHELTER_SHADOW_LENGTH;
    }

    if (hazard.side === 'left') {
      return row === box.row && col > box.col && col <= box.col + SHELTER_SHADOW_LENGTH;
    }

    return row === box.row && col < box.col && col >= box.col - SHELTER_SHADOW_LENGTH;
  });
}

function hasCell(cells, row, col) {
  return cells.some((cell) => cell.row === row && cell.col === col);
}

function getSafeDimension(value) {
  return Math.max(1, value);
}

function normalizeRange(min, max, length) {
  const safeMax = Math.max(0, length - 1);
  const start = clampInteger(min, 0, safeMax);
  const end = clampInteger(max, 0, safeMax);
  return {
    min: Math.min(start, end),
    max: Math.max(start, end),
  };
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
  if (roll < 0.16) return 'falling-boxes';
  if (roll < 0.32) return 'shelter';
  if (roll < 0.50) return 'edge';
  if (roll < 0.72) return 'circle';
  return 'line';
}

function randomInteger(min, max) {
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
