export function createDebugPanel({ game, ball, input, onWinPulseTest = () => {}, onLosePulseTest = () => {} }) {
  const element = document.createElement('aside');
  element.className = 'debug-panel';

  function render() {
    const gameState = game.getDebugState();
    const ballState = ball.getDebugState();
    const inputState = input.getDebugState();
    const cell = ballState.cell;

    element.innerHTML = `
      <div><strong>Cell</strong><span>${formatCell(cell)}</span></div>
      <div><strong>Ball</strong><span>${formatNumber(ballState.x)}, ${formatNumber(ballState.y)}</span></div>
      <div><strong>Speed</strong><span>${formatNumber(ballState.vx)}, ${formatNumber(ballState.vy)} (${formatNumber(ballState.speed)})</span></div>
      <div><strong>Tilt</strong><span>${inputState.status} / ${formatNumber(inputState.direction.x)}, ${formatNumber(inputState.direction.y)}</span></div>
      <div><strong>Tilt raw</strong><span>${formatNumber(inputState.gamma)}, ${formatNumber(inputState.beta)}</span></div>
      <div><strong>Dwell</strong><span>${formatPercent(ballState.dwellProgress)} ${ballState.activeCellKey || ''}</span></div>
      <div><strong>Game</strong><span>${gameState.status} / initialized: ${gameState.isInitialized ? 'yes' : 'no'}</span></div>
      <div><strong>Cells</strong><span>opened ${gameState.opened}, flags ${gameState.flags}, mines ${gameState.mines}</span></div>
      <div><strong>Exploded</strong><span>${formatCell(gameState.lastExplodedCell)}</span></div>
      <section class="debug-actions">
        <button class="debug-action" data-action="win" type="button" ${cell ? '' : 'disabled'}>${cell ? 'Win pulse test' : 'Place ball first'}</button>
        <button class="debug-action debug-action-danger" data-action="lose" type="button" ${cell ? '' : 'disabled'}>${cell ? 'Lose shock test' : 'Place ball first'}</button>
      </section>
    `;

    element.querySelector('[data-action="win"]')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onWinPulseTest(cell);
    });
    element.querySelector('[data-action="lose"]')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onLosePulseTest(cell);
    });
  }

  return {
    element,
    render,
  };
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
