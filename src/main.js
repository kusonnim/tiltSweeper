import './styles/main.css';
import { DYNAMIC_MODE_SETTINGS, createDynamicHazards } from './game/dynamicHazards.js';
import { createMinesweeperGame } from './game/minesweeper.js';
import { createBoardView } from './game/board.js';
import { createBallController } from './game/ball.js';
import { createHapticsController } from './game/haptics.js';
import { createInputController } from './game/input.js';
import { createHud } from './ui/hud.js';
import { DIFFICULTIES } from './ui/difficultyPanel.js';
import { createScreens } from './ui/screens.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { createThemeController } from './ui/theme.js';
import { isDebugMode } from './debug/debug.js';
import { createDebugPanel } from './debug/debugPanel.js';

const DIFFICULTY_STORAGE_KEY = 'minesweeper-tilt-difficulty';
const MODE_STORAGE_KEY = 'minesweeper-tilt-mode';
const app = document.querySelector('#app');
const debug = isDebugMode();
const theme = createThemeController();
theme.applyTheme();
if (debug) {
  document.body.dataset.debug = '1';
}

const game = createMinesweeperGame();
const storedDifficulty = getStoredDifficulty();
const modeSettings = getStoredModeSettings();
let ball;
let isBallPlaced = false;
let debugPanel;
let difficultyId = storedDifficulty.id;
let lastHazardHapticKey = '';
game.reset(storedDifficulty.config);

const board = createBoardView(game, {
  debug,
  isBallPlaced: () => isBallPlaced,
  onBallPlace: placeBall,
  onCellReveal: revealCell,
  onFlagToggle: toggleFlag,
  getActiveCell: () => ball?.getDebugState().cell,
  getHazardState: getHazardState,
});
const input = createInputController();
const haptics = createHapticsController();
const hazards = createDynamicHazards({
  getCircleRadius: getDynamicCircleRadius,
  getMaxHazards: getDynamicHazardCount,
  getRows: () => game.rows,
  getCols: () => game.cols,
  getSettings: () => modeSettings,
});
const hud = createHud(game, {
  input,
  onSettingsOpen: openSettings,
  onTiltRequest: enableTilt,
});
const screens = createScreens(game, { onRestart: restartGame });
const settingsPanel = createSettingsPanel({
  getConfig: () => ({ rows: game.rows, cols: game.cols, mines: game.mines }),
  getDifficultyId: () => difficultyId,
  getHapticsEnabled: () => haptics.isEnabled(),
  getHapticsIntensity: () => haptics.getIntensity(),
  getHapticsSupported: () => haptics.isSupported(),
  getInputSettings: () => input.getSettings(),
  getModeSettings: () => ({ ...modeSettings }),
  getThemeId: () => theme.getTheme(),
  onPreset: applyPresetDifficulty,
  onCustom: applyCustomDifficulty,
  onHapticsIntensityChange: updateHapticsIntensity,
  onHapticsToggle: setHapticsEnabled,
  onInputSettingsChange: updateInputSettings,
  onModeSettingsChange: updateModeSettings,
  onRecalibrate: recalibrateTilt,
  onThemeSelect: selectTheme,
  themes: theme.themes,
});
const uiState = {
  isBallPlaced: () => isBallPlaced,
  isDebug: debug,
};

app.append(hud.element, board.element, screens.element, settingsPanel.element);

ball = createBallController({
  board,
  input,
  getHazardHit: isHazardHit,
  isBlockedCell: isHazardBlocked,
  onHazardHit: handleHazardHit,
});
debugPanel = debug
  ? createDebugPanel({
      game,
      ball,
      input,
      hazards,
      haptics,
      onCircleHazardTest: triggerDebugCircleHazard,
      onEdgeHazardTest: triggerDebugEdgeHazard,
      onHazardTest: triggerDebugHazard,
      onLineHazardTest: triggerDebugLineHazard,
      onShelterHazardTest: triggerDebugShelterHazard,
      onWinPulseTest: playDebugWinPulse,
      onLosePulseTest: playDebugLosePulse,
    })
  : null;
if (debugPanel) {
  app.append(debugPanel.element);
}

ball.onEnterCell(revealCell);
input.onStatusChange(renderGame);

function renderGame() {
  board.render();
  if (ball) {
    board.element.append(ball.element);
  }
  hud.render();
  settingsPanel.render();
  screens.render(uiState);
  debugPanel?.render();
}

function revealCell(cell) {
  const previousStatus = game.status;
  game.revealCell(cell.row, cell.col);
  renderGame();
  if (previousStatus !== 'lost' && game.status === 'lost') {
    playLoseEffect(game.lastExplodedCell ?? cell);
  } else if (previousStatus !== 'won' && game.status === 'won') {
    haptics.trigger('win');
  } else {
    haptics.trigger('reveal');
  }
}

function placeBall(cell) {
  isBallPlaced = true;
  resetHazards();
  ball.placeAtCell(cell);
  revealCell(cell);
}

function toggleFlag(cell) {
  game.toggleFlag(cell.row, cell.col);
  haptics.trigger('flag');
  renderGame();
}

function restartGame() {
  game.reset();
  resetHazards();
  board.resetCamera();
  isBallPlaced = false;
  ball.reset();
  renderGame();
}

function applyPresetDifficulty(difficulty) {
  difficultyId = difficulty.id;
  resetWithConfig(difficulty.config);
}

function applyCustomDifficulty(config) {
  difficultyId = 'custom';
  resetWithConfig(config);
}

function resetWithConfig(config) {
  game.reset(config);
  resetHazards();
  storeDifficulty(difficultyId, { rows: game.rows, cols: game.cols, mines: game.mines });
  board.resetCamera();
  isBallPlaced = false;
  ball.reset();
  renderGame();
}

async function enableTilt() {
  await input.enableTilt();
  renderGame();
}

function openSettings() {
  settingsPanel.open();
}

function selectTheme(themeId) {
  theme.applyTheme(themeId);
  settingsPanel.render();
  renderGame();
}

function updateInputSettings(settings) {
  input.updateSettings(settings);
  settingsPanel.render();
}

function updateModeSettings(settings) {
  if (settings.mode === 'classic' || settings.mode === 'dynamic') {
    modeSettings.mode = settings.mode;
  }

  if (settings.hazardHitMode === 'penalty' || settings.hazardHitMode === 'instant') {
    modeSettings.hazardHitMode = settings.hazardHitMode;
  }

  if (settings.customHazardCount !== undefined) {
    modeSettings.customHazardCount = clampInteger(settings.customHazardCount, 1, 10, modeSettings.customHazardCount);
  }

  localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(modeSettings));
  resetHazards();
  board.updateHazardCells();
  settingsPanel.render();
}

function recalibrateTilt() {
  input.recalibrateTilt();
  haptics.trigger('flag');
  renderGame();
}

function setHapticsEnabled(isEnabled) {
  haptics.setEnabled(isEnabled);
  if (isEnabled) {
    haptics.trigger('flag');
  }
}

function updateHapticsIntensity(intensity) {
  haptics.setIntensity(intensity);
  haptics.trigger('flag');
}

function playDebugWinPulse(cell) {
  board.playWinPulse(cell);
}

function playDebugLosePulse(cell) {
  playLoseEffect(cell);
}

function playLoseEffect(cell) {
  board.playLosePulse(cell);
  ball.playImpact();
  haptics.trigger('lose');
}

function getHazardState(row, col) {
  return modeSettings.mode === 'dynamic' ? hazards.getCellState(row, col) : 'idle';
}

function isHazardHit(cell) {
  return modeSettings.mode === 'dynamic' && hazards.isCellActive(cell) && game.status !== 'lost' && game.status !== 'won';
}

function isHazardBlocked(cell) {
  return modeSettings.mode === 'dynamic' && hazards.isCellBlocked(cell) && game.status !== 'lost' && game.status !== 'won';
}

function handleHazardHit(cell) {
  if (modeSettings.hazardHitMode === 'instant') {
    game.failAt(cell);
    resetHazards();
    renderGame();
    playLoseEffect(cell);
    return;
  }

  ball.stun(760);
  ball.makeInvincible(1500);
  haptics.trigger('lose');
}

function triggerDebugHazard() {
  prepareDebugHazard();
  hazards.triggerRandomGroup();
  board.updateHazardCells();
}

function triggerDebugLineHazard() {
  prepareDebugHazard();
  hazards.triggerLineGroup();
  board.updateHazardCells();
}

function triggerDebugCircleHazard() {
  prepareDebugHazard();
  hazards.triggerCircleGroup();
  board.updateHazardCells();
}

function triggerDebugEdgeHazard() {
  prepareDebugHazard();
  hazards.triggerEdgeWave();
  board.updateHazardCells();
}

function triggerDebugShelterHazard() {
  prepareDebugHazard();
  hazards.triggerShelterSweep();
  board.updateHazardCells();
}

function prepareDebugHazard() {
  if (modeSettings.mode !== 'dynamic') {
    updateModeSettings({ mode: 'dynamic' });
  }

  lastHazardHapticKey = '';
}

function resetHazards() {
  hazards.reset();
  lastHazardHapticKey = '';
}

function triggerHazardHaptics() {
  const activeHazards = hazards.getDebugState().hazards.filter((hazard) => hazard.phase === 'active');
  if (activeHazards.length === 0) return;

  const hapticKey = activeHazards.map((hazard) => `${hazard.startedAt}:active`).join('|');
  if (hapticKey === lastHazardHapticKey) return;

  lastHazardHapticKey = hapticKey;
  haptics.trigger('hazard');
}

renderGame();
if (debugPanel) {
  setInterval(() => {
    board.updateActiveCell(ball.getDebugState().cell);
    debugPanel.update();
  }, 120);
}
setInterval(() => {
  if (modeSettings.mode !== 'dynamic' || game.status === 'lost' || game.status === 'won') return;

  const hasManualHazard = Boolean(hazards.getDebugState().hazard);
  if (!isBallPlaced && !hasManualHazard) return;

  hazards.update();
  triggerHazardHaptics();
  board.updateHazardCells();
}, 80);
ball.start();

function getStoredDifficulty() {
  try {
    const stored = JSON.parse(localStorage.getItem(DIFFICULTY_STORAGE_KEY));
    const preset = DIFFICULTIES.find((difficulty) => difficulty.id === stored?.id);

    if (preset) {
      return preset;
    }

    if (stored?.id === 'custom' && stored.config) {
      return {
        id: 'custom',
        config: stored.config,
      };
    }
  } catch {
    // Ignore invalid user storage and fall back to the default difficulty.
  }

  return DIFFICULTIES.find((difficulty) => difficulty.id === 'normal') ?? DIFFICULTIES[0];
}

function storeDifficulty(id, config) {
  localStorage.setItem(
    DIFFICULTY_STORAGE_KEY,
    JSON.stringify({
      id,
      config: {
        rows: config.rows,
        cols: config.cols,
        mines: config.mines,
      },
    }),
  );
}

function getStoredModeSettings() {
  try {
    const storedSettings = {
      ...DYNAMIC_MODE_SETTINGS,
      ...JSON.parse(localStorage.getItem(MODE_STORAGE_KEY)),
    };
    storedSettings.customHazardCount = clampInteger(storedSettings.customHazardCount, 1, 10, DYNAMIC_MODE_SETTINGS.customHazardCount);
    return storedSettings;
  } catch {
    return { ...DYNAMIC_MODE_SETTINGS };
  }
}

function getDynamicHazardCount() {
  const counts = {
    easy: 1,
    normal: 4,
    hard: 7,
  };

  return difficultyId === 'custom' ? modeSettings.customHazardCount : counts[difficultyId] ?? 4;
}

function getDynamicCircleRadius() {
  const radii = {
    easy: 1,
    normal: 2,
    hard: 3,
  };

  if (difficultyId === 'custom') {
    return Math.max(1, Math.min(4, Math.ceil(modeSettings.customHazardCount / 3)));
  }

  return radii[difficultyId] ?? 2;
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
