export const DEFAULT_GAME_CONFIG = {
  rows: 12,
  cols: 12,
  mines: 22,
};

const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function createMinesweeperGame(config = DEFAULT_GAME_CONFIG) {
  const initialConfig = normalizeConfig(config);
  const game = {
    rows: initialConfig.rows,
    cols: initialConfig.cols,
    mines: initialConfig.mines,
    board: createMinefield(initialConfig),
    isInitialized: false,
    lastExplodedCell: null,
    status: 'ready',
    revealCell(row, col) {
      if (game.status === 'lost' || game.status === 'won') return;

      const cell = getCell(game.board, row, col);
      if (!cell || cell.isFlagged) return;

      if (cell.isRevealed) {
        revealNeighborCellsFromNumber(game, cell);
        return;
      }

      if (!game.isInitialized) {
        initializeMinefield(game.board, cell, game.mines);
        game.isInitialized = true;
      }

      if (cell.isMine) {
        cell.isRevealed = true;
        game.lastExplodedCell = { row: cell.row, col: cell.col };
        revealAllMines(game.board);
        game.status = 'lost';
        return;
      }

      revealSafeCells(game.board, cell);

      if (areAllSafeCellsRevealed(game.board)) {
        game.status = 'won';
      } else {
        game.status = 'playing';
      }
    },
    canRevealFromNumber(row, col) {
      if (game.status === 'lost' || game.status === 'won') return false;

      const cell = getCell(game.board, row, col);
      return Boolean(cell && canRevealNeighborCellsFromNumber(game.board, cell));
    },
    toggleFlag(row, col) {
      if (game.status === 'lost' || game.status === 'won') return;

      const cell = getCell(game.board, row, col);
      if (!cell || cell.isRevealed) return;

      cell.isFlagged = !cell.isFlagged;
    },
    failAt(cell) {
      if (game.status === 'lost' || game.status === 'won') return;

      game.lastExplodedCell = cell ? { row: cell.row, col: cell.col } : null;
      revealAllMines(game.board);
      game.status = 'lost';
    },
    reset(nextConfig) {
      const config = normalizeConfig(nextConfig ?? game);
      game.rows = config.rows;
      game.cols = config.cols;
      game.mines = config.mines;
      game.board = createMinefield(config);
      game.isInitialized = false;
      game.lastExplodedCell = null;
      game.status = 'ready';
    },
    getDebugState() {
      const cells = game.board.flat();

      return {
        status: game.status,
        isInitialized: game.isInitialized,
        opened: cells.filter((cell) => cell.isRevealed).length,
        flags: cells.filter((cell) => cell.isFlagged).length,
        mines: cells.filter((cell) => cell.isMine).length,
        lastExplodedCell: game.lastExplodedCell,
        safeCells: cells.filter((cell) => !cell.isMine).length,
      };
    },
  };

  return game;
}

export function createMinefield(config = DEFAULT_GAME_CONFIG) {
  const { rows, cols } = normalizeConfig(config);
  return createEmptyBoard(rows, cols);
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      isMine: false,
      adjacentMines: 0,
      isRevealed: false,
      isFlagged: false,
    })),
  );
}

function initializeMinefield(board, firstCell, mineCount) {
  placeMines(board, firstCell, mineCount);
  fillAdjacentMineCounts(board);
}

function placeMines(board, firstCell, mineCount) {
  const rows = board.length;
  const cols = board[0].length;
  const safePositions = new Set([firstCell, ...getNeighbors(board, firstCell.row, firstCell.col)].map(cellToKey));
  const positions = Array.from({ length: rows * cols }, (_, index) => index).filter(
    (position) => !safePositions.has(positionToKey(position, cols)),
  );

  if (positions.length < mineCount) {
    throw new Error('Not enough cells to place mines outside the first safe area.');
  }

  shuffle(positions);

  for (const position of positions.slice(0, mineCount)) {
    const row = Math.floor(position / cols);
    const col = position % cols;
    board[row][col].isMine = true;
  }
}

function fillAdjacentMineCounts(board) {
  for (const row of board) {
    for (const cell of row) {
      cell.adjacentMines = 0;
      if (cell.isMine) continue;

      cell.adjacentMines = getNeighbors(board, cell.row, cell.col).filter((neighbor) => neighbor.isMine).length;
    }
  }
}

function getNeighbors(board, row, col) {
  return NEIGHBOR_OFFSETS
    .map(([rowOffset, colOffset]) => getCell(board, row + rowOffset, col + colOffset))
    .filter(Boolean);
}

function revealSafeCells(board, startCell) {
  const pendingCells = [startCell];
  const visitedCells = new Set();

  while (pendingCells.length > 0) {
    const cell = pendingCells.pop();
    const cellKey = `${cell.row}:${cell.col}`;

    if (visitedCells.has(cellKey) || cell.isMine || cell.isFlagged) {
      continue;
    }

    visitedCells.add(cellKey);
    cell.isRevealed = true;

    if (cell.adjacentMines > 0) {
      continue;
    }

    for (const neighbor of getNeighbors(board, cell.row, cell.col)) {
      if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
        pendingCells.push(neighbor);
      }
    }
  }
}

function revealNeighborCellsFromNumber(game, cell) {
  if (!canRevealNeighborCellsFromNumber(game.board, cell)) return;

  for (const neighbor of getNeighbors(game.board, cell.row, cell.col)) {
    if (neighbor.isRevealed || neighbor.isFlagged) continue;

    if (neighbor.isMine) {
      neighbor.isRevealed = true;
      game.lastExplodedCell = { row: neighbor.row, col: neighbor.col };
      revealAllMines(game.board);
      game.status = 'lost';
      return;
    }

    revealSafeCells(game.board, neighbor);
  }

  if (areAllSafeCellsRevealed(game.board)) {
    game.status = 'won';
  }
}

function canRevealNeighborCellsFromNumber(board, cell) {
  if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) return false;

  const neighbors = getNeighbors(board, cell.row, cell.col);
  const flagCount = neighbors.filter((neighbor) => neighbor.isFlagged).length;
  const hiddenNeighborCount = neighbors.filter((neighbor) => !neighbor.isRevealed && !neighbor.isFlagged).length;

  return flagCount === cell.adjacentMines && hiddenNeighborCount > 0;
}

function revealAllMines(board) {
  for (const cell of board.flat()) {
    if (cell.isMine) {
      cell.isRevealed = true;
    }
  }
}

function areAllSafeCellsRevealed(board) {
  return board.flat().every((cell) => cell.isMine || cell.isRevealed);
}

function getCell(board, row, col) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    return null;
  }

  return board[row][col];
}

function cellToKey(cell) {
  return `${cell.row}:${cell.col}`;
}

function positionToKey(position, cols) {
  const row = Math.floor(position / cols);
  const col = position % cols;
  return `${row}:${col}`;
}

function normalizeConfig(config) {
  const rows = clampInteger(config.rows, 4, 30, DEFAULT_GAME_CONFIG.rows);
  const cols = clampInteger(config.cols, 4, 30, DEFAULT_GAME_CONFIG.cols);
  const maxMines = Math.max(1, rows * cols - 9);
  const mines = clampInteger(config.mines, 1, maxMines, DEFAULT_GAME_CONFIG.mines);

  return { rows, cols, mines };
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}
