export function createDebugPanel({
  game,
  ball,
  haptics = null,
  input,
  hazards = null,
  onCircleHazardTest = () => {},
  onEdgeHazardTest = () => {},
  onHazardTest = () => {},
  onLineHazardTest = () => {},
  onShelterHazardTest = () => {},
  onWinPulseTest = () => {},
  onLosePulseTest = () => {},
}) {
  const element = document.createElement('aside');
  element.className = 'debug-panel';
  const fields = new Map();
  let winButton;
  let loseButton;

  function render() {
    element.innerHTML = '';

    appendRow('cell', 'Cell');
    appendRow('ball', 'Ball');
    appendRow('speed', 'Speed');
    appendRow('tilt', 'Tilt');
    appendRow('tiltRaw', 'Tilt raw');
    appendRow('dwell', 'Dwell');
    appendRow('game', 'Game');
    appendRow('cells', 'Cells');
    appendRow('exploded', 'Exploded');
    appendRow('hazard', 'Hazard');
    appendRow('haptics', 'Haptics');

    const actions = document.createElement('section');
    actions.className = 'debug-actions';

    winButton = document.createElement('button');
    winButton.className = 'debug-action';
    winButton.type = 'button';
    addDebugAction(winButton, () => onWinPulseTest(ball.getDebugState().cell));

    loseButton = document.createElement('button');
    loseButton.className = 'debug-action debug-action-danger';
    loseButton.type = 'button';
    addDebugAction(loseButton, () => onLosePulseTest(ball.getDebugState().cell));

    const hazardButton = document.createElement('button');
    hazardButton.className = 'debug-action debug-action-danger';
    hazardButton.type = 'button';
    hazardButton.textContent = 'Trigger random';
    addDebugAction(hazardButton, onHazardTest);

    const lineHazardButton = document.createElement('button');
    lineHazardButton.className = 'debug-action debug-action-danger';
    lineHazardButton.type = 'button';
    lineHazardButton.textContent = 'Trigger line';
    addDebugAction(lineHazardButton, onLineHazardTest);

    const circleHazardButton = document.createElement('button');
    circleHazardButton.className = 'debug-action debug-action-danger';
    circleHazardButton.type = 'button';
    circleHazardButton.textContent = 'Trigger circle';
    addDebugAction(circleHazardButton, onCircleHazardTest);

    const edgeHazardButton = document.createElement('button');
    edgeHazardButton.className = 'debug-action debug-action-danger';
    edgeHazardButton.type = 'button';
    edgeHazardButton.textContent = 'Trigger edge';
    addDebugAction(edgeHazardButton, onEdgeHazardTest);

    const shelterHazardButton = document.createElement('button');
    shelterHazardButton.className = 'debug-action debug-action-danger';
    shelterHazardButton.type = 'button';
    shelterHazardButton.textContent = 'Trigger shelter';
    addDebugAction(shelterHazardButton, onShelterHazardTest);

    actions.append(winButton, loseButton, hazardButton, lineHazardButton, circleHazardButton, edgeHazardButton, shelterHazardButton);
    element.append(actions);
    update();
  }

  function update() {
    const gameState = game.getDebugState();
    const ballState = ball.getDebugState();
    const inputState = input.getDebugState();
    const cell = ballState.cell;
    const hasCell = Boolean(cell);

    setField('cell', formatCell(cell));
    setField('ball', `${formatNumber(ballState.x)}, ${formatNumber(ballState.y)}`);
    setField('speed', `${formatNumber(ballState.vx)}, ${formatNumber(ballState.vy)} (${formatNumber(ballState.speed)})`);
    setField('tilt', `${inputState.status} / ${formatNumber(inputState.direction.x)}, ${formatNumber(inputState.direction.y)}`);
    setField('tiltRaw', `${formatNumber(inputState.gamma)}, ${formatNumber(inputState.beta)}`);
    setField('dwell', `${formatPercent(ballState.dwellProgress)} ${ballState.activeCellKey || ''}`);
    setField('game', `${gameState.status} / initialized: ${gameState.isInitialized ? 'yes' : 'no'}`);
    setField('cells', `opened ${gameState.opened}, flags ${gameState.flags}, mines ${gameState.mines}`);
    setField('exploded', formatCell(gameState.lastExplodedCell));
    setField('hazard', formatHazard(hazards?.getDebugState()));
    setField('haptics', formatHaptics(haptics));

    updateButton(winButton, hasCell, 'Win pulse test');
    updateButton(loseButton, hasCell, 'Lose shock test');
  }

  function appendRow(id, label) {
    const row = document.createElement('div');
    const title = document.createElement('strong');
    const value = document.createElement('span');

    title.textContent = label;
    row.append(title, value);
    element.append(row);
    fields.set(id, value);
  }

  function setField(id, value) {
    const field = fields.get(id);
    if (field) {
      field.textContent = value;
    }
  }

  return {
    element,
    render,
    update,
  };
}

function updateButton(button, isEnabled, label) {
  if (!button) return;

  button.disabled = !isEnabled;
  button.textContent = isEnabled ? label : 'Place ball first';
}

function addDebugAction(button, action) {
  let pointerHandledAt = 0;

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointerHandledAt = performance.now();
    action();
  });

  button.addEventListener('click', () => {
    if (performance.now() - pointerHandledAt < 350) return;
    action();
  });
}

function formatCell(cell) {
  return cell ? `${cell.row}, ${cell.col}` : '-';
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatHazard(state) {
  if (!state) return '-';
  if (!state.hazards?.length) return `${state.mode} / ${state.hitMode} / ${state.maxHazards}x / idle`;

  const hazards = state.hazards
    .map((hazard) => `${formatHazardShape(hazard)} ${hazard.phase}`)
    .join(' | ');
  return `${state.mode} / ${state.hitMode} / ${state.maxHazards}x / ${hazards}`;
}

function formatHaptics(haptics) {
  if (!haptics) return '-';
  return `${haptics.isEnabled() ? 'enabled' : 'disabled'} / ${haptics.isSupported() ? 'supported' : 'unsupported'}`;
}

function formatDirection(hazard) {
  if (hazard.axis === 'row') {
    return hazard.direction === 1 ? 'right' : 'left';
  }

  return hazard.direction === 1 ? 'down' : 'up';
}

function formatHazardShape(hazard) {
  if (hazard.type === 'circle') {
    return `circle ${hazard.row},${hazard.col} r${hazard.radius}`;
  }

  if (hazard.type === 'edge') {
    return `edge ${hazard.side}`;
  }

  if (hazard.type === 'shelter') {
    return `shelter ${hazard.side} ${hazard.boxes?.length ?? 0} boxes`;
  }

  return `${hazard.axis} ${hazard.index} ${formatDirection(hazard)}`;
}
