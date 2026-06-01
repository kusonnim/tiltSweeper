import { DIFFICULTIES } from './difficultyPanel.js';

export function createSettingsPanel({
  getConfig,
  getDifficultyId,
  getHapticsEnabled,
  getInputSettings,
  getThemeId,
  onClose = () => {},
  onCustom = () => {},
  onHapticsToggle = () => {},
  onInputSettingsChange = () => {},
  onPreset = () => {},
  onRecalibrate = () => {},
  onThemeSelect = () => {},
  themes = [],
}) {
  const element = document.createElement('section');
  element.className = 'settings-panel settings-panel-hidden';
  element.setAttribute('aria-hidden', 'true');
  let isOpen = false;

  function open() {
    isOpen = true;
    render();
  }

  function close() {
    isOpen = false;
    render();
    onClose();
  }

  function render() {
    const config = getConfig();
    const activeDifficultyId = getDifficultyId();
    const inputSettings = getInputSettings();
    const activeThemeId = getThemeId();

    element.className = isOpen ? 'settings-panel' : 'settings-panel settings-panel-hidden';
    element.setAttribute('aria-hidden', String(!isOpen));

    if (!isOpen) {
      element.innerHTML = '';
      return;
    }

    element.innerHTML = `
      <div class="settings-dialog" role="dialog" aria-modal="true" aria-label="Settings">
        <header class="settings-header">
          <strong>Settings</strong>
          <button class="settings-close" type="button" aria-label="Close settings">Close</button>
        </header>
        <section class="settings-group">
          <strong>Difficulty</strong>
          <div class="settings-options" data-role="difficulty-presets"></div>
          <form class="custom-difficulty settings-custom">
            <label>Rows <input name="rows" type="number" min="4" max="30" value="${config.rows}" /></label>
            <label>Cols <input name="cols" type="number" min="4" max="30" value="${config.cols}" /></label>
            <label>Mines <input name="mines" type="number" min="1" max="${Math.max(1, config.rows * config.cols - 9)}" value="${config.mines}" /></label>
            <button type="submit">Apply</button>
          </form>
        </section>
        <section class="settings-group">
          <strong>Theme</strong>
          <div class="settings-options" data-role="themes"></div>
        </section>
        <section class="settings-group">
          <strong>Controls</strong>
          <label class="settings-range">Sensitivity <input name="tiltSensitivity" type="range" min="10" max="40" step="1" value="${inputSettings.tiltSensitivity}" /><span>${Math.round(inputSettings.tiltSensitivity)}</span></label>
          <label class="settings-range">Dead zone <input name="tiltDeadZone" type="range" min="0" max="0.3" step="0.01" value="${inputSettings.tiltDeadZone}" /><span>${inputSettings.tiltDeadZone.toFixed(2)}</span></label>
          <button class="settings-button" data-action="recalibrate" type="button">Recalibrate</button>
        </section>
        <section class="settings-group">
          <strong>Feedback</strong>
          <label class="settings-toggle"><input name="haptics" type="checkbox" ${getHapticsEnabled() ? 'checked' : ''} /> Haptics</label>
        </section>
      </div>
    `;

    element.querySelector('.settings-close')?.addEventListener('click', close);
    element.onpointerdown = handleBackdropPointerDown;
    renderDifficultyButtons(element.querySelector('[data-role="difficulty-presets"]'), activeDifficultyId);
    renderThemeButtons(element.querySelector('[data-role="themes"]'), themes, activeThemeId);
    bindCustomForm(element.querySelector('.settings-custom'));
    bindControlSettings();
  }

  function renderDifficultyButtons(container, activeDifficultyId) {
    if (!container) return;

    for (const difficulty of DIFFICULTIES) {
      const button = document.createElement('button');
      button.className = difficulty.id === activeDifficultyId ? 'settings-chip settings-chip-active' : 'settings-chip';
      button.type = 'button';
      button.textContent = difficulty.label;
      button.addEventListener('click', () => onPreset(difficulty));
      container.append(button);
    }
  }

  function renderThemeButtons(container, themes, activeThemeId) {
    if (!container) return;

    for (const theme of themes) {
      const button = document.createElement('button');
      button.className = theme.id === activeThemeId ? 'settings-chip settings-chip-active' : 'settings-chip';
      button.type = 'button';
      button.textContent = theme.label;
      button.addEventListener('click', () => onThemeSelect(theme.id));
      container.append(button);
    }
  }

  function bindCustomForm(form) {
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      onCustom({
        rows: formData.get('rows'),
        cols: formData.get('cols'),
        mines: formData.get('mines'),
      });
    });
  }

  function bindControlSettings() {
    const sensitivity = element.querySelector('[name="tiltSensitivity"]');
    const deadZone = element.querySelector('[name="tiltDeadZone"]');
    const haptics = element.querySelector('[name="haptics"]');

    sensitivity?.addEventListener('input', () => {
      onInputSettingsChange({ tiltSensitivity: sensitivity.value, tiltDeadZone: deadZone?.value });
      sensitivity.nextElementSibling.textContent = String(Math.round(Number(sensitivity.value)));
    });
    deadZone?.addEventListener('input', () => {
      onInputSettingsChange({ tiltSensitivity: sensitivity?.value, tiltDeadZone: deadZone.value });
      deadZone.nextElementSibling.textContent = Number(deadZone.value).toFixed(2);
    });
    haptics?.addEventListener('change', () => onHapticsToggle(haptics.checked));
    element.querySelector('[data-action="recalibrate"]')?.addEventListener('click', onRecalibrate);
  }

  function handleBackdropPointerDown(event) {
    if (event.target === element) {
      close();
    }
  }

  return {
    close,
    element,
    open,
    render,
  };
}
