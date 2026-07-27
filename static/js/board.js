import Cell from "./cell.js";

// Difficulty presets
export const DIFFICULTIES = {
    easy:   { rows: 6,  cols: 6,  bombs: 4,  hearts: 3,  label: 'Easy',   multiplier: 1.0 },
    medium: { rows: 9,  cols: 9,  bombs: 10, hearts: 9,  label: 'Medium', multiplier: 1.5 },
    hard:   { rows: 12, cols: 12, bombs: 20, hearts: 19, label: 'Hard',   multiplier: 2.0 },
};

export default class Board {
    constructor(difficulty = 'medium') {
        const config = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
        this.rows = config.rows;
        this.cols = config.cols;
        this.bombs = config.bombs;
        this.hearts = config.hearts;
        this.difficulty = difficulty;
        this.difficultyMultiplier = config.multiplier;

        this.grid = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flagCount = 0;
        this.totalBombs = this.bombs;
        this.bombsRevealed = 0;
    }

    initialize() {
        this.grid = [];
        this.gameOver = false;
        this.firstClick = true;
        this.flagCount = 0;
        this.totalBombs = this.bombs;
        this.bombsRevealed = 0;

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(new Cell(r, c));
            }
            this.grid.push(row);
        }
    }

    getCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }
        return this.grid[row][col];
    }

    placeBombs(safeRow, safeCol) {
        let placed = 0;
        while (placed < this.bombs) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            const cell = this.getCell(r, c);
            if (cell.isBomb) continue;
            if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
            cell.isBomb = true;
            placed++;
        }
    }

    calculateNumbers() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (cell.isBomb) {
                    cell.number = -1;
                    continue;
                }
                let count = 0;
                const neighbors = this.getNeighbors(r, c);
                for (const neighbor of neighbors) {
                    if (neighbor.isBomb) count++;
                }
                cell.number = count;
            }
        }
    }

    getNeighbors(row, col) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const neighbor = this.getCell(row + dr, col + dc);
                if (neighbor) neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

/**
     * Reveal a single cell (no flood-fill — only the clicked cell opens).
     * Returns array of { row, col } cells that were revealed.
     * If bomb is revealed, does NOT set gameOver — returns { revealed, isBomb }.
     */
    revealCell(row, col) {
        const revealed = [];
        const cell = this.getCell(row, col);
        if (!cell) return { revealed, isBomb: false };
        if (cell.isRevealed) return { revealed, isBomb: false };
        if (cell.isFlagged || cell.isQuestion) return { revealed, isBomb: false };

        cell.reveal();
        revealed.push({ row, col });

        const isBomb = cell.isBomb;

        return { revealed, isBomb };
    }

    /**
     * Single-step reveal (used by chording — reveals one cell without flood).
     * Returns array of { row, col } cells that were revealed.
     */
    _revealSingle(row, col) {
        const cell = this.getCell(row, col);
        if (!cell) return [];
        if (cell.isRevealed) return [];
        if (cell.isFlagged || cell.isQuestion) return [];

        cell.reveal();
        const revealed = [{ row, col }];

        if (cell.isBomb) {
            this.gameOver = true;
        }

        return revealed;
    }

    /**
     * Chording: if a revealed number cell has the correct number of adjacent flags,
     * auto-reveal the remaining unflagged/unrevealed neighbors.
     * Returns array of revealed cells (for animation).
     */
    chordCell(row, col) {
        const cell = this.getCell(row, col);
        if (!cell || !cell.isRevealed || cell.isBomb || cell.number === 0) return [];

        // Count adjacent flags
        const neighbors = this.getNeighbors(row, col);
        let adjacentFlags = 0;
        for (const n of neighbors) {
            if (n.isFlagged) adjacentFlags++;
        }

        // Only chord if flags match the number
        if (adjacentFlags !== cell.number) return [];

        // Reveal all non-flagged, non-revealed neighbors
        const revealed = [];
        for (const n of neighbors) {
            if (!n.isRevealed && !n.isFlagged && !n.isQuestion) {
                const singleRevealed = this._revealSingle(n.row, n.col);
                revealed.push(...singleRevealed);
            }
        }
        return revealed;
    }

    checkWin() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (!cell.isBomb && !cell.isRevealed) return false;
            }
        }
        return true;
    }

    revealAllBombs() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (cell.isBomb) {
                    cell.isRevealed = true;
                }
            }
        }
    }

    /**
     * Reset all unrevealed, unflagged cells (they become hidden again).
     * Keeps already-revealed cells intact. Used after losing a life.
     */
    resetUnrevealedCells() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.getCell(r, c);
                if (!cell.isRevealed) {
                    cell.isFlagged = false;
                    cell.isQuestion = false;
                }
            }
        }
        this.flagCount = 0;
        this.gameOver = false;
        this.firstClick = true;
    }

    /**
     * Gets the next difficulty level after this one.
     * Returns null if this is the hardest difficulty.
     */
    getNextDifficulty() {
        const levels = ['easy', 'medium', 'hard'];
        const current = levels.indexOf(this.difficulty);
        if (current < levels.length - 1) {
            return levels[current + 1];
        }
        return null;
    }
}
