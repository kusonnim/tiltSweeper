export function createBoardView(
  game,
  {
    debug = false,
    isBallPlaced = () => true,
    onBallPlace = () => {},
    onCellReveal = () => {},
    onFlagToggle = () => {},
  } = {},
) {
  const element = document.createElement('main');
  element.className = 'board';

  function render() {
    element.innerHTML = '';

    for (let row = 0; row < game.rows; row += 1) {
      for (let col = 0; col < game.cols; col += 1) {
        const cell = document.createElement('button');
        const boardCell = game.board[row][col];
        cell.className = getCellClassName(boardCell, debug);
        cell.type = 'button';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.textContent = getCellText(boardCell, debug);
        cell.addEventListener('click', (event) => {
          if (!isBallPlaced() && !event.shiftKey) {
            onBallPlace({ row, col });
            return;
          }

          if (debug && !event.shiftKey) {
            onCellReveal({ row, col });
            return;
          }

          onFlagToggle({ row, col });
        });
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          onFlagToggle({ row, col });
        });
        element.append(cell);
      }
    }
  }

  function cellFromPoint(x, y) {
    const rect = element.getBoundingClientRect();
    const col = Math.floor((x / rect.width) * game.cols);
    const row = Math.floor((y / rect.height) * game.rows);

    if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) {
      return null;
    }

    return { row, col };
  }

  function getCellCenter(row, col) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    return {
      x: ((col + 0.5) / game.cols) * rect.width,
      y: ((row + 0.5) / game.rows) * rect.height,
    };
  }

  function getBounds() {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    return {
      width: rect.width,
      height: rect.height,
    };
  }

  function isCellRevealable(row, col) {
    const cell = game.board[row]?.[col];
    return Boolean(cell && !cell.isRevealed && !cell.isFlagged && game.status !== 'lost' && game.status !== 'won');
  }

  return {
    element,
    render,
    cellFromPoint,
    getCellCenter,
    getBounds,
    isCellRevealable,
  };
}

function getCellClassName(cell, debug) {
  const classNames = ['cell'];

  if (cell.isRevealed) {
    classNames.push('cell-revealed');
  }

  if (cell.isFlagged) {
    classNames.push('cell-flagged');
  }

  if (debug) {
    classNames.push('cell-debug');
  }

  if (debug && cell.isMine) {
    classNames.push('cell-mine');
  }

  return classNames.join(' ');
}

function getCellText(cell, debug) {
  if (cell.isRevealed && cell.isMine) return 'M';
  if (cell.isRevealed && cell.adjacentMines > 0) return String(cell.adjacentMines);
  if (cell.isFlagged) return 'F';
  if (!debug) return '';
  if (cell.isMine) return 'M';
  if (cell.adjacentMines > 0) return String(cell.adjacentMines);
  return '';
}
