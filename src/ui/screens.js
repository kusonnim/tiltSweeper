export function createScreens(game, { onRestart = () => {} } = {}) {
  const element = document.createElement('section');
  element.className = 'screens';

  function render({ isBallPlaced = () => true, isDebug = false } = {}) {
    element.innerHTML = '';
    element.className = `screens screens-${game.status}`;

    const copy = getScreenCopy(game.status, isBallPlaced(), isDebug, game.lossReason);

    const text = document.createElement('div');
    text.className = 'screen-copy';

    const message = document.createElement('strong');
    message.textContent = copy.title;

    const detail = document.createElement('span');
    detail.textContent = copy.detail;

    text.append(message, detail);
    element.append(text);

    const restartButton = document.createElement('button');
    restartButton.className = 'restart-button';
    restartButton.type = 'button';
    restartButton.textContent = 'Restart';
    restartButton.addEventListener('click', onRestart);
    element.append(restartButton);
  }

  return {
    element,
    render,
  };
}

function getScreenCopy(status, isBallPlaced, isDebug, lossReason) {
  if (!isBallPlaced) {
    return {
      title: 'Choose start',
      detail: isDebug ? 'Tap a cell to place the ball. After that, tap reveals cells.' : 'Tap a cell to place the ball. After that, tap marks flags.',
    };
  }

  const copy = {
    ready: {
      title: 'Ready',
      detail: 'Tilt or use WASD to roll.',
    },
    playing: {
      title: 'Playing',
      detail: isDebug ? 'Tap reveals. Shift+tap marks flags.' : 'Tap marks flags. The ball opens cells.',
    },
    won: {
      title: 'Clear',
      detail: 'All safe cells are open.',
    },
    lost: getLostCopy(lossReason),
  };

  return copy[status] ?? {
    title: status,
    detail: '',
  };
}

function getLostCopy(lossReason) {
  if (lossReason === 'hazard') {
    return {
      title: 'Game over',
      detail: 'The ball was caught by a hazard.',
    };
  }

  return {
    title: 'Game over',
    detail: 'The ball found a mine.',
  };
}
