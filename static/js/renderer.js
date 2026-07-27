/**
 * Darken a hex color by `amount` (negative = lighten).
 * Simple utility for generating gradient stops.
 */
function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Render a cell's visual state on the board.
 * @param {import('./cell.js').default} cell - The cell to render
 * @param {object} [options]
 * @param {boolean} [options.animate] - Whether to play flip animation
 * @param {number} [options.cascadeDelay] - Cascade delay index (0-6)
 * @param {boolean} [options.isHitMine] - Is this the mine that was clicked
 */
export default function renderCell(cell, { animate = false, cascadeDelay = -1, isHitMine = false } = {}) {
    if (!cell.element) return;

    const el = cell.element;

// Remove all dynamic classes
    el.classList.remove(
        'revealed', 'empty', 'hidden', 'flagged', 'question', 'mine', 'mine-hit',
        'flip-reveal',
        'cascade-0', 'cascade-1', 'cascade-2', 'cascade-3',
        'cascade-4', 'cascade-5', 'cascade-6',
        'color-1', 'color-2', 'color-3', 'color-4',
        'color-5', 'color-6', 'color-7', 'color-8'
    );
    el.style.color = '';
    el.style.background = '';

if (cell.isFlagged) {
        el.classList.add('flagged');
        el.textContent = '👁️';
    } else if (cell.isQuestion) {
        el.classList.add('question');
        el.textContent = '❓';
    } else if (cell.isRevealed && cell.isBomb) {
        el.classList.add('revealed', 'mine');
        if (isHitMine) {
            el.classList.add('mine-hit');
        }
        el.textContent = '💣';
} else if (cell.isRevealed && cell.isFlagRevealed) {
        el.classList.add('revealed');
        if (cell.number > 0) {
            el.textContent = '👁️' + cell.number;
            el.classList.add(`color-${cell.number}`);
        } else {
            el.textContent = '👁️';
            el.classList.add('empty');
        }
    } else if (cell.isRevealed) {
        el.classList.add('revealed');

        if (animate) {
            el.classList.add('flip-reveal');
            if (cascadeDelay >= 0 && cascadeDelay <= 6) {
                el.classList.add(`cascade-${cascadeDelay}`);
            }
        }

        if (cell.number > 0) {
            el.textContent = cell.number;
            el.classList.add(`color-${cell.number}`);
        } else {
            el.textContent = '';
            el.classList.add('empty');
        }
    } else {
        el.textContent = '';
        el.classList.add('hidden');
    }
}

/**
 * Render all cells on the board with optional cascade animation timing.
 * @param {import('./board.js').default} board
 * @param {Array<{row: number, col: number}>} [revealedCells] - Cells that were just revealed
 * @param {number} [hitRow] - Row of clicked mine
 * @param {number} [hitCol] - Col of clicked mine
 */
export function renderAll(board, revealedCells = [], hitRow = -1, hitCol = -1) {
    const revealedSet = new Set();
    for (const rc of revealedCells) {
        revealedSet.add(`${rc.row},${rc.col}`);
    }

    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            const cell = board.getCell(r, c);
            const key = `${r},${c}`;
            const wasRevealed = revealedSet.has(key);
            const animate = wasRevealed;
            const isHit = (r === hitRow && c === hitCol);
            // Compute cascade delay based on Manhattan distance from first revealed cell
            let cascadeDelay = -1;
            if (wasRevealed && revealedCells.length > 0) {
                const first = revealedCells[0];
                const dist = Math.abs(r - first.row) + Math.abs(c - first.col);
                cascadeDelay = Math.min(dist, 6);
            }
            renderCell(cell, { animate, cascadeDelay, isHitMine: isHit });
        }
    }
}


