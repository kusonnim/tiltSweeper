const STORAGE_KEY = 'minesweeper-tilt-haptics';

const PATTERNS = {
  flag: 18,
  hazard: [45, 24, 45],
  reveal: 12,
  win: [24, 36, 48],
  lose: [70, 30, 90],
};

export function createHapticsController() {
  let enabled = getStoredEnabled();

  function trigger(type) {
    if (!enabled || !isSupported()) return false;

    navigator.vibrate(PATTERNS[type] ?? 10);
    return true;
  }

  function isEnabled() {
    return enabled;
  }

  function isSupported() {
    return 'vibrate' in navigator;
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  }

  return {
    isEnabled,
    isSupported,
    setEnabled,
    trigger,
  };
}

function getStoredEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== '0';
}
