import './styles/main.css';
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
const app = document.querySelector('#app');
const debug = isDebugMode();
const theme = createThemeController();
theme.applyTheme();
if (debug) {
  document.body.dataset.debug = '1';
}

const game = createMinesweeperGame();
const storedDifficulty = getStoredDifficulty();
let ball;
let isBallPlaced = false;
let debugPanel;
let difficultyId = storedDifficulty.id;
game.reset(storedDifficulty.config);

const board = createBoardView(game, {
  debug,
  isBallPlaced: () => isBallPlaced,
  onBallPlace: placeBall,
  onCellReveal: revealCell,
  onFlagToggle: toggleFlag,
  getActiveCell: () => ball?.getDebugState().cell,
});
const input = createInputController();
const haptics = createHapticsController();
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
  getInputSettings: () => input.getSettings(),
  getThemeId: () => theme.getTheme(),
  onPreset: applyPresetDifficulty,
  onCustom: applyCustomDifficulty,
  onHapticsToggle: setHapticsEnabled,
  onInputSettingsChange: updateInputSettings,
  onRecalibrate: recalibrateTilt,
  onThemeSelect: selectTheme,
  themes: theme.themes,
});
const uiState = {
  isBallPlaced: () => isBallPlaced,
  isDebug: debug,
};

app.append(hud.element, board.element, screens.element, settingsPanel.element);

ball = createBallController({ board, input });
debugPanel = debug
  ? createDebugPanel({ game, ball, input, onWinPulseTest: playDebugWinPulse, onLosePulseTest: playDebugLosePulse })
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

renderGame();
if (debugPanel) {
  setInterval(() => {
    board.updateActiveCell(ball.getDebugState().cell);
    debugPanel.update();
  }, 120);
}
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
