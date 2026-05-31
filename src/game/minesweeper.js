export const BOARD_ROWS = 8;
export const BOARD_COLS = 8;
export const MINE_COUNT = 10;

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

export function createMinesweeperGame() {
  const game = {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    mines: MINE_COUNT,
    board: createMinefield(),
    isInitialized: false,
    status: 'ready',
    revealCell(row, col) {
      if (game.status === 'lost' || game.status === 'won') return;

      const cell = getCell(game.board, row, col);
      if (!cell || cell.isRevealed || cell.isFlagged) return;

      if (!game.isInitialized) {
        initializeMinefield(game.board, cell);
        game.isInitialized = true;
      }

      if (cell.isMine) {
        cell.isRevealed = true;
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
    toggleFlag(row, col) {
      if (game.status === 'lost' || game.status === 'won') return;

      const cell = getCell(game.board, row, col);
      if (!cell || cell.isRevealed) return;

      cell.isFlagged = !cell.isFlagged;
    },
    reset() {
      game.board = createMinefield();
      game.isInitialized = false;
      game.status = 'ready';
    },
  };

  return game;
}

export function createMinefield() {
  return createEmptyBoard();
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLS }, (_, col) => ({
      row,
      col,
      isMine: false,
      adjacentMines: 0,
      isRevealed: false,
      isFlagged: false,
    })),
  );
}

function initializeMinefield(board, firstCell) {
  placeMines(board, firstCell);
  fillAdjacentMineCounts(board);
}

function placeMines(board, firstCell) {
  const safePositions = new Set([firstCell, ...getNeighbors(board, firstCell.row, firstCell.col)].map(cellToKey));
  const positions = Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, index) => index).filter(
    (position) => !safePositions.has(positionToKey(position)),
  );

  if (positions.length < MINE_COUNT) {
    throw new Error('Not enough cells to place mines outside the first safe area.');
  }

  shuffle(positions);

  for (const position of positions.slice(0, MINE_COUNT)) {
    const row = Math.floor(position / BOARD_COLS);
    const col = position % BOARD_COLS;
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
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
    return null;
  }

  return board[row][col];
}

function cellToKey(cell) {
  return `${cell.row}:${cell.col}`;
}

function positionToKey(position) {
  const row = Math.floor(position / BOARD_COLS);
  const col = position % BOARD_COLS;
  return `${row}:${col}`;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}
