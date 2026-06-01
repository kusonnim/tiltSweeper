import { DIFFICULTIES } from './difficultyPanel.js';

export function createSettingsPanel({
  getConfig,
  getDifficultyId,
  getHapticsEnabled,
  getHapticsIntensity,
  getHapticsSupported,
  getInputSettings,
  getModeSettings,
  getThemeId,
  onClose = () => {},
  onCustom = () => {},
  onHapticsToggle = () => {},
  onHapticsIntensityChange = () => {},
  onInputSettingsChange = () => {},
  onModeSettingsChange = () => {},
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
    const hapticsSupported = getHapticsSupported();
    const hapticsIntensity = getHapticsIntensity();
    const modeSettings = getModeSettings();
    const activeThemeId = getThemeId();
    const isCustomDifficulty = activeDifficultyId === 'custom';

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
          <strong>Mode</strong>
          <div class="settings-options">
            <button class="${modeSettings.mode === 'classic' ? 'settings-chip settings-chip-active' : 'settings-chip'}" data-mode="classic" type="button">Classic</button>
            <button class="${modeSettings.mode === 'dynamic' ? 'settings-chip settings-chip-active' : 'settings-chip'}" data-mode="dynamic" type="button">Dynamic</button>
          </div>
          <div class="settings-options">
            <button class="${modeSettings.hazardHitMode === 'penalty' ? 'settings-chip settings-chip-active' : 'settings-chip'}" data-hit-mode="penalty" type="button">Penalty</button>
            <button class="${modeSettings.hazardHitMode === 'instant' ? 'settings-chip settings-chip-active' : 'settings-chip'}" data-hit-mode="instant" type="button">Instant death</button>
          </div>
          ${
            modeSettings.hazardHitMode === 'instant'
              ? `<label class="settings-range">Lives <input name="instantLives" type="range" min="1" max="10" step="1" value="${modeSettings.instantLives}" /><span>${modeSettings.instantLives}</span></label>`
              : ''
          }
          ${
            isCustomDifficulty
              ? `<label class="settings-range">Patterns <input name="customHazardCount" type="range" min="1" max="10" step="1" value="${modeSettings.customHazardCount}" /><span>${modeSettings.customHazardCount}</span></label>`
              : `<span class="settings-note">Patterns ${getPresetHazardCount(activeDifficultyId)}</span>`
          }
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
          <label class="settings-toggle"><input name="haptics" type="checkbox" ${getHapticsEnabled() ? 'checked' : ''} ${hapticsSupported ? '' : 'disabled'} /> Haptics</label>
          <label class="settings-range">Strength <input name="hapticIntensity" type="range" min="0.4" max="2.2" step="0.1" value="${hapticsIntensity}" ${hapticsSupported ? '' : 'disabled'} /><span>${hapticsIntensity.toFixed(1)}x</span></label>
          <span class="${hapticsSupported ? 'settings-note' : 'settings-note settings-note-warning'}">${hapticsSupported ? 'Vibration API supported' : 'Vibration API not supported'}</span>
        </section>
      </div>
    `;

    element.querySelector('.settings-close')?.addEventListener('click', close);
    element.onpointerdown = handleBackdropPointerDown;
    renderDifficultyButtons(element.querySelector('[data-role="difficulty-presets"]'), activeDifficultyId);
    renderThemeButtons(element.querySelector('[data-role="themes"]'), themes, activeThemeId);
    bindCustomForm(element.querySelector('.settings-custom'));
    bindControlSettings();
    bindModeSettings();
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
    const hapticIntensity = element.querySelector('[name="hapticIntensity"]');

    sensitivity?.addEventListener('input', () => {
      onInputSettingsChange({ tiltSensitivity: sensitivity.value, tiltDeadZone: deadZone?.value });
      sensitivity.nextElementSibling.textContent = String(Math.round(Number(sensitivity.value)));
    });
    deadZone?.addEventListener('input', () => {
      onInputSettingsChange({ tiltSensitivity: sensitivity?.value, tiltDeadZone: deadZone.value });
      deadZone.nextElementSibling.textContent = Number(deadZone.value).toFixed(2);
    });
    haptics?.addEventListener('change', () => onHapticsToggle(haptics.checked));
    hapticIntensity?.addEventListener('input', () => {
      onHapticsIntensityChange(hapticIntensity.value);
      hapticIntensity.nextElementSibling.textContent = `${Number(hapticIntensity.value).toFixed(1)}x`;
    });
    element.querySelector('[data-action="recalibrate"]')?.addEventListener('click', onRecalibrate);
  }

  function bindModeSettings() {
    for (const button of element.querySelectorAll('[data-mode]')) {
      button.addEventListener('click', () => onModeSettingsChange({ mode: button.dataset.mode }));
    }

    for (const button of element.querySelectorAll('[data-hit-mode]')) {
      button.addEventListener('click', () => onModeSettingsChange({ hazardHitMode: button.dataset.hitMode }));
    }

    const customHazards = element.querySelector('[name="customHazardCount"]');
    customHazards?.addEventListener('input', () => {
      onModeSettingsChange({ customHazardCount: customHazards.value });
      customHazards.nextElementSibling.textContent = customHazards.value;
    });

    const instantLives = element.querySelector('[name="instantLives"]');
    instantLives?.addEventListener('input', () => {
      onModeSettingsChange({ instantLives: instantLives.value });
      instantLives.nextElementSibling.textContent = instantLives.value;
    });
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

function getPresetHazardCount(difficultyId) {
  const counts = {
    easy: 1,
    normal: 4,
    hard: 7,
  };

  return counts[difficultyId] ?? 4;
}
