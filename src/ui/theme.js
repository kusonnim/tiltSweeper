const STORAGE_KEY = 'minesweeper-tilt-theme';

export const THEMES = [
  {
    id: 'neon',
    label: 'Neon',
  },
  {
    id: 'chess',
    label: 'Chess',
  },
  {
    id: 'garden',
    label: 'Garden',
  },
];

export function createThemeController() {
  let currentTheme = getStoredTheme();

  function applyTheme(themeId = currentTheme) {
    currentTheme = normalizeTheme(themeId);
    document.body.dataset.theme = currentTheme;
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }

  function getTheme() {
    return currentTheme;
  }

  function getThemeLabel() {
    return THEMES.find((theme) => theme.id === currentTheme)?.label ?? currentTheme;
  }

  function nextTheme() {
    const currentIndex = THEMES.findIndex((theme) => theme.id === currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    applyTheme(THEMES[nextIndex].id);
    return currentTheme;
  }

  return {
    applyTheme,
    getTheme,
    getThemeLabel,
    nextTheme,
    themes: THEMES,
  };
}

function getStoredTheme() {
  return normalizeTheme(localStorage.getItem(STORAGE_KEY));
}

function normalizeTheme(themeId) {
  return THEMES.some((theme) => theme.id === themeId) ? themeId : THEMES[0].id;
}
