export function createHud(game, { input, onTiltRequest = () => {} } = {}) {
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

    const tiltButton = document.createElement('button');
    tiltButton.className = 'tilt-button';
    tiltButton.type = 'button';
    tiltButton.textContent = getTiltButtonText(input?.getStatus());
    tiltButton.disabled = ['waiting', 'active'].includes(input?.getStatus());
    tiltButton.addEventListener('click', onTiltRequest);

    element.append(title, size, mines, tiltButton);
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
