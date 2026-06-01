import './styles/main.css';
import { createMinesweeperGame } from './game/minesweeper.js';
import { createBoardView } from './game/board.js';
import { createBallController } from './game/ball.js';
import { createInputController } from './game/input.js';
import { createHud } from './ui/hud.js';
import { createDifficultyPanel } from './ui/difficultyPanel.js';
import { createScreens } from './ui/screens.js';
import { createThemeController } from './ui/theme.js';
import { isDebugMode } from './debug/debug.js';
import { createDebugPanel } from './debug/debugPanel.js';

const app = document.querySelector('#app');
const debug = isDebugMode();
const theme = createThemeController();
theme.applyTheme();

const game = createMinesweeperGame();
let ball;
let isBallPlaced = false;
let debugPanel;
let difficultyId = 'normal';

const board = createBoardView(game, {
  debug,
  isBallPlaced: () => isBallPlaced,
  onBallPlace: placeBall,
  onCellReveal: revealCell,
  onFlagToggle: toggleFlag,
  getActiveCell: () => ball?.getDebugState().cell,
});
const input = createInputController();
const hud = createHud(game, {
  input,
  theme,
  onThemeNext: nextTheme,
  onTiltRequest: enableTilt,
});
const screens = createScreens(game, { onRestart: restartGame });
const difficultyPanel = createDifficultyPanel({
  getConfig: () => ({ rows: game.rows, cols: game.cols, mines: game.mines }),
  getDifficultyId: () => difficultyId,
  onPreset: applyPresetDifficulty,
  onCustom: applyCustomDifficulty,
});
const uiState = {
  isBallPlaced: () => isBallPlaced,
  isDebug: debug,
};

app.append(hud.element, difficultyPanel.element, board.element, screens.element);

ball = createBallController({ board, input });
debugPanel = debug ? createDebugPanel({ game, ball, input }) : null;
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
  difficultyPanel.render();
  screens.render(uiState);
  debugPanel?.render();
}

function revealCell(cell) {
  game.revealCell(cell.row, cell.col);
  renderGame();
}

function placeBall(cell) {
  isBallPlaced = true;
  ball.placeAtCell(cell);
  game.revealCell(cell.row, cell.col);
  renderGame();
}

function toggleFlag(cell) {
  game.toggleFlag(cell.row, cell.col);
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
  board.resetCamera();
  isBallPlaced = false;
  ball.reset();
  renderGame();
}

async function enableTilt() {
  await input.enableTilt();
  renderGame();
}

function nextTheme() {
  theme.nextTheme();
  renderGame();
}

renderGame();
if (debugPanel) {
  setInterval(() => {
    board.updateActiveCell(ball.getDebugState().cell);
    debugPanel.render();
  }, 120);
}
ball.start();
