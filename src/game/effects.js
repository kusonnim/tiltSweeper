export function playCellWave(cells, origin, { className, clearClassNames = [], delayPerCell, originClassName = className } = {}) {
  if (!origin || !className) return;

  for (const cell of cells) {
    const row = Number.parseInt(cell.dataset.row, 10);
    const col = Number.parseInt(cell.dataset.col, 10);
    const isOrigin = row === origin.row && col === origin.col;
    const effectClassName = isOrigin ? originClassName : className;

    for (const clearClassName of new Set([className, originClassName, ...clearClassNames])) {
      cell.classList.remove(clearClassName);
    }

    cell.style.animationDelay = `${getCellDistanceDelay(row, col, origin, delayPerCell)}ms`;
    void cell.offsetWidth;
    cell.classList.add(effectClassName);
  }
}

export function getCellDistanceDelay(row, col, origin, delayPerCell) {
  const distance = Math.hypot(row - origin.row, col - origin.col);
  return Math.round(distance * delayPerCell);
}
