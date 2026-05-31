export function createScreens(game, { onRestart = () => {} } = {}) {
  const element = document.createElement('section');
  element.className = 'screens';

  function render() {
    const messages = {
      ready: 'Ready',
      playing: 'Playing',
      won: 'Clear',
      lost: 'Game over',
    };

    element.innerHTML = '';

    const message = document.createElement('span');
    message.textContent = messages[game.status] ?? game.status;
    element.append(message);

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
