const MAX_VISIBLE_CELLS = 8;

export function createBoardView(
  game,
  {
    debug = false,
    isBallPlaced = () => true,
    onBallPlace = () => {},
    onCellReveal = () => {},
    onFlagToggle = () => {},
    getActiveCell = () => null,
  } = {},
) {
  const element = document.createElement('main');
  element.className = 'board';
  const grid = document.createElement('div');
  grid.className = 'board-grid';
  const camera = { x: 0, y: 0 };

  element.append(grid);
  configureBoardSize();

  function render() {
    configureBoardSize();
    grid.innerHTML = '';

    for (let row = 0; row < game.rows; row += 1) {
      for (let col = 0; col < game.cols; col += 1) {
        const cell = document.createElement('button');
        const boardCell = game.board[row][col];
        const activeCell = getActiveCell();
        cell.className = getCellClassName(
          boardCell,
          debug,
          activeCell?.row === row && activeCell?.col === col,
          (row + col) % 2 === 0,
        );
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
        grid.append(cell);
      }
    }

    applyCamera();
  }

  function cellFromPoint(x, y) {
    const metrics = getMetrics();
    const col = Math.floor(x / metrics.stepX);
    const row = Math.floor(y / metrics.stepY);

    if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) {
      return null;
    }

    return { row, col };
  }

  function getCellCenter(row, col) {
    const metrics = getMetrics();
    if (metrics.cellSize === 0) return null;

    return {
      x: col * metrics.stepX + metrics.cellSize / 2,
      y: row * metrics.stepY + metrics.cellSize / 2,
    };
  }

  function getBounds() {
    const metrics = getMetrics();
    if (metrics.cellSize === 0) return null;

    return {
      width: game.cols * metrics.cellSize + Math.max(0, game.cols - 1) * metrics.gapX,
      height: game.rows * metrics.cellSize + Math.max(0, game.rows - 1) * metrics.gapY,
    };
  }

  function getViewportBounds() {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  function updateCamera(point) {
    const bounds = getBounds();
    const viewport = getViewportBounds();
    if (!bounds || viewport.width === 0 || viewport.height === 0) return;

    const canScrollX = bounds.width > viewport.width;
    const canScrollY = bounds.height > viewport.height;
    const marginX = viewport.width * 0.36;
    const marginY = viewport.height * 0.36;
    const screenX = point.x - camera.x;
    const screenY = point.y - camera.y;

    if (canScrollX) {
      if (screenX < marginX) {
        camera.x = point.x - marginX;
      } else if (screenX > viewport.width - marginX) {
        camera.x = point.x - (viewport.width - marginX);
      }
    } else {
      camera.x = 0;
    }

    if (canScrollY) {
      if (screenY < marginY) {
        camera.y = point.y - marginY;
      } else if (screenY > viewport.height - marginY) {
        camera.y = point.y - (viewport.height - marginY);
      }
    } else {
      camera.y = 0;
    }

    camera.x = clamp(camera.x, 0, Math.max(0, bounds.width - viewport.width));
    camera.y = clamp(camera.y, 0, Math.max(0, bounds.height - viewport.height));
    applyCamera();
  }

  function resetCamera() {
    camera.x = 0;
    camera.y = 0;
    applyCamera();
  }

  function worldToViewport(x, y) {
    return {
      x: x - camera.x,
      y: y - camera.y,
    };
  }

  function isCellRevealable(row, col) {
    const cell = game.board[row]?.[col];
    if (!cell || cell.isFlagged || game.status === 'lost' || game.status === 'won') {
      return false;
    }

    return !cell.isRevealed || game.canRevealFromNumber(row, col);
  }

  function updateActiveCell(activeCell) {
    for (const cell of grid.querySelectorAll('.cell-active')) {
      cell.classList.remove('cell-active');
    }

    if (!activeCell) return;

    const cell = grid.querySelector(`[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`);
    cell?.classList.add('cell-active');
  }

  function configureBoardSize() {
    element.style.setProperty('--cols', String(game.cols));
    element.style.setProperty('--rows', String(game.rows));
    element.style.setProperty('--visible-cols', String(Math.min(game.cols, MAX_VISIBLE_CELLS)));
    element.style.setProperty('--visible-rows', String(Math.min(game.rows, MAX_VISIBLE_CELLS)));
  }

  function getMetrics() {
    const firstCell = grid.querySelector('.cell');
    const cellRect = firstCell?.getBoundingClientRect();
    const styles = getComputedStyle(grid);
    const gapX = parseFloat(styles.columnGap) || 0;
    const gapY = parseFloat(styles.rowGap) || 0;
    const cellSize = cellRect?.width || 0;

    return {
      cellSize,
      gapX,
      gapY,
      stepX: cellSize + gapX,
      stepY: cellSize + gapY,
    };
  }

  function applyCamera() {
    grid.style.transform = `translate(${-camera.x}px, ${-camera.y}px)`;
  }

  return {
    element,
    render,
    cellFromPoint,
    getCellCenter,
    getBounds,
    getViewportBounds,
    isCellRevealable,
    resetCamera,
    updateCamera,
    updateActiveCell,
    worldToViewport,
  };
}

function getCellClassName(cell, debug, isActive, isLightSquare) {
  const classNames = ['cell'];

  classNames.push(isLightSquare ? 'cell-light' : 'cell-dark');

  if (isActive) {
    classNames.push('cell-active');
  }

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
