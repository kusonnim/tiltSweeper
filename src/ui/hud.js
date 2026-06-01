export function createHud(
  game,
  {
    getLives = () => null,
    getModeSettings = () => null,
    getPaused = () => false,
    input,
    onPauseToggle = () => {},
    onSettingsOpen = () => {},
    onTiltRequest = () => {},
  } = {},
) {
  const element = document.createElement('header');
  element.className = 'hud';

  function render() {
    element.innerHTML = '';

    const title = document.createElement('strong');
    title.textContent = 'Minesweeper Tilt';

    const size = document.createElement('span');
    size.textContent = `${game.rows} x ${game.cols}`;

    const mines = document.createElement('span');
    mines.textContent = `${game.mines} mines`;

    const lives = document.createElement('span');
    const modeSettings = getModeSettings();
    const currentLives = getLives();
    lives.textContent = `Lives ${currentLives}`;
    lives.hidden = modeSettings?.mode !== 'dynamic' || modeSettings?.hazardHitMode !== 'instant';

    const hint = document.createElement('span');
    hint.className = 'hud-hint';
    hint.textContent = 'Tap flags';

    const settingsButton = document.createElement('button');
    settingsButton.className = 'settings-open-button';
    settingsButton.type = 'button';
    settingsButton.textContent = 'Settings';
    settingsButton.addEventListener('click', onSettingsOpen);

    const pauseButton = document.createElement('button');
    pauseButton.className = getPaused() ? 'pause-button pause-button-active' : 'pause-button';
    pauseButton.type = 'button';
    pauseButton.textContent = getPaused() ? 'Resume' : 'Pause';
    pauseButton.title = getPaused() ? 'Resume the game' : 'Pause the game';
    pauseButton.addEventListener('click', onPauseToggle);

    const tiltButton = document.createElement('button');
    const tiltStatus = input?.getStatus();
    tiltButton.className = `tilt-button tilt-button-${tiltStatus ?? 'ready'}`;
    tiltButton.type = 'button';
    tiltButton.textContent = getTiltButtonText(tiltStatus);
    tiltButton.title = getTiltButtonTitle(tiltStatus);
    tiltButton.disabled = ['waiting', 'active'].includes(tiltStatus);
    tiltButton.addEventListener('click', onTiltRequest);

    element.append(title, size, mines, lives, hint, settingsButton, pauseButton, tiltButton);
  }

  return {
    element,
    render,
  };
}

function getTiltButtonText(status) {
  const labels = {
    ready: 'Tilt',
    waiting: 'Tilt waiting',
    active: 'Tilt active',
    denied: 'Retry tilt',
    unsupported: 'Try tilt',
    'needs-https': 'Needs HTTPS',
  };

  return labels[status] ?? 'Tilt';
}

function getTiltButtonTitle(status) {
  const titles = {
    ready: 'Enable phone tilt controls',
    waiting: 'Waiting for sensor permission',
    active: 'Tilt controls are active',
    denied: 'Sensor permission was denied. Tap to retry.',
    unsupported: 'This browser may not support tilt controls.',
    'needs-https': 'Tilt controls require HTTPS or localhost.',
  };

  return titles[status] ?? titles.ready;
}
