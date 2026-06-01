const STORAGE_KEY = 'minesweeper-tilt-haptics';

const PATTERNS = {
  flag: 18,
  reveal: 12,
  win: [24, 36, 48],
  lose: [70, 30, 90],
};

export function createHapticsController() {
  let enabled = getStoredEnabled();

  function trigger(type) {
    if (!enabled || !('vibrate' in navigator)) return;

    navigator.vibrate(PATTERNS[type] ?? 10);
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  }

  return {
    isEnabled,
    setEnabled,
    trigger,
  };
}

function getStoredEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== '0';
}
