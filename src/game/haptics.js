const STORAGE_KEY = 'minesweeper-tilt-haptics';
const INTENSITY_STORAGE_KEY = 'minesweeper-tilt-haptics-intensity';

const PATTERNS = {
  flag: 18,
  hazard: [45, 24, 45],
  reveal: 12,
  win: [24, 36, 48],
  lose: [70, 30, 90],
};

export function createHapticsController() {
  let enabled = getStoredEnabled();
  let intensity = getStoredIntensity();

  function trigger(type) {
    if (!enabled || !isSupported()) return false;

    navigator.vibrate(scalePattern(PATTERNS[type] ?? 10, intensity));
    return true;
  }

  function getIntensity() {
    return intensity;
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

  function setIntensity(nextIntensity) {
    intensity = clampNumber(nextIntensity, 0.4, 2.2, intensity);
    localStorage.setItem(INTENSITY_STORAGE_KEY, String(intensity));
  }

  return {
    getIntensity,
    isEnabled,
    isSupported,
    setEnabled,
    setIntensity,
    trigger,
  };
}

function getStoredEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== '0';
}

function getStoredIntensity() {
  return clampNumber(localStorage.getItem(INTENSITY_STORAGE_KEY), 0.4, 2.2, 1);
}

function scalePattern(pattern, intensity) {
  if (Array.isArray(pattern)) {
    return pattern.map((duration) => scaleDuration(duration, intensity));
  }

  return scaleDuration(pattern, intensity);
}

function scaleDuration(duration, intensity) {
  return Math.max(5, Math.round(duration * intensity));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
