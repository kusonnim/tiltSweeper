export function createHud(game, { input, theme, onThemeNext = () => {}, onTiltRequest = () => {} } = {}) {
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

    const hint = document.createElement('span');
    hint.className = 'hud-hint';
    hint.textContent = 'Tap flags';

    const themeButton = document.createElement('button');
    themeButton.className = 'theme-button';
    themeButton.type = 'button';
    themeButton.textContent = theme?.getThemeLabel() ?? 'Theme';
    themeButton.title = 'Next theme';
    themeButton.addEventListener('click', onThemeNext);

    const tiltButton = document.createElement('button');
    tiltButton.className = 'tilt-button';
    tiltButton.type = 'button';
    tiltButton.textContent = getTiltButtonText(input?.getStatus());
    tiltButton.disabled = ['waiting', 'active'].includes(input?.getStatus());
    tiltButton.addEventListener('click', onTiltRequest);

    element.append(title, size, mines, hint, themeButton, tiltButton);
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
