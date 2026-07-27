export default class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;

        this.isBomb = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.isQuestion = false;
        this.isFlagRevealed = false;

        this.number = 0;

        this.element = null;
    }

    reveal() {
        this.isRevealed = true;
    }

    toggleFlag() {
        if (this.isRevealed) return;

        if (this.isFlagged) {
            // Flag -> Question
            this.isFlagged = false;
            this.isQuestion = true;
        } else if (this.isQuestion) {
            // Question -> Unmarked
            this.isQuestion = false;
        } else {
            // Unmarked -> Flag
            this.isFlagged = true;
        }
    }

    reset() {
        this.isBomb = false;
        this.isRevealed = false;
        this.isFlagged = false;
        this.isQuestion = false;
        this.isFlagRevealed = false;
        this.number = 0;
    }
}
