export const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Easy',
    config: { rows: 8, cols: 8, mines: 10 },
  },
  {
    id: 'normal',
    label: 'Normal',
    config: { rows: 12, cols: 12, mines: 22 },
  },
  {
    id: 'hard',
    label: 'Hard',
    config: { rows: 16, cols: 16, mines: 48 },
  },
];

export function createDifficultyPanel({ getConfig, getDifficultyId, onPreset, onCustom }) {
  const element = document.createElement('section');
  element.className = 'difficulty-panel';

  function render() {
    const config = getConfig();
    const activeDifficultyId = getDifficultyId();
    element.innerHTML = '';

    const presets = document.createElement('div');
    presets.className = 'difficulty-presets';

    for (const difficulty of DIFFICULTIES) {
      const button = document.createElement('button');
      button.className = difficulty.id === activeDifficultyId ? 'difficulty-button difficulty-button-active' : 'difficulty-button';
      button.type = 'button';
      button.textContent = difficulty.label;
      button.addEventListener('click', () => onPreset(difficulty));
      presets.append(button);
    }

    const custom = document.createElement('form');
    custom.className = 'custom-difficulty';
    custom.innerHTML = `
      <label>Rows <input name="rows" type="number" min="4" max="30" value="${config.rows}" /></label>
      <label>Cols <input name="cols" type="number" min="4" max="30" value="${config.cols}" /></label>
      <label>Mines <input name="mines" type="number" min="1" max="${Math.max(1, config.rows * config.cols - 9)}" value="${config.mines}" /></label>
      <button type="submit">Apply</button>
    `;
    custom.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(custom);
      onCustom({
        rows: formData.get('rows'),
        cols: formData.get('cols'),
        mines: formData.get('mines'),
      });
    });

    element.append(presets, custom);
  }

  return {
    element,
    render,
  };
}
