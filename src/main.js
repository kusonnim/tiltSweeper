import './styles/main.css';
import { createMinesweeperGame } from './game/minesweeper.js';
import { createBoardView } from './game/board.js';
import { createBallController } from './game/ball.js';
import { createInputController } from './game/input.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';
import { isDebugMode } from './debug/debug.js';

const app = document.querySelector('#app');
const debug = isDebugMode();

const game = createMinesweeperGame();
let ball;
let isBallPlaced = false;

const board = createBoardView(game, {
  debug,
  isBallPlaced: () => isBallPlaced,
  onBallPlace: placeBall,
  onCellReveal: revealCell,
  onFlagToggle: toggleFlag,
});
const input = createInputController();
const hud = createHud(game, {
  input,
  onTiltRequest: enableTilt,
});
const screens = createScreens(game, { onRestart: restartGame });

app.append(hud.element, board.element, screens.element);

ball = createBallController({ board, input });

ball.onEnterCell(revealCell);
input.onStatusChange(renderGame);

function renderGame() {
  board.render();
  if (ball) {
    board.element.append(ball.element);
  }
  hud.render();
  screens.render();
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
  isBallPlaced = false;
  ball.reset();
  renderGame();
}

async function enableTilt() {
  await input.enableTilt();
  renderGame();
}

renderGame();
ball.start();
