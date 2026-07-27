/**
 * Timer class with elapsed time tracking.
 */
export default class Timer {
    constructor() {
        this._startTime = null;
        this._intervalId = null;
        this._elapsed = 0;
        this._running = false;
        this._callback = null;
    }

    /**
     * Start the timer.
     * @param {function(number): void} onTick - Callback receiving elapsed seconds
     */
    start(onTick) {
        if (this._running) return;
        this._running = true;
        this._startTime = Date.now() - this._elapsed * 1000;
        this._callback = onTick;

        this._intervalId = setInterval(() => {
            this._elapsed = Math.floor((Date.now() - this._startTime) / 1000);
            if (this._callback) {
                this._callback(this._elapsed);
            }
        }, 200); // Update every 200ms for smoother display
    }

    stop() {
        if (!this._running) return;
        this._running = false;
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        // Final update
        if (this._startTime) {
            this._elapsed = Math.floor((Date.now() - this._startTime) / 1000);
        }
    }

    reset() {
        this.stop();
        this._elapsed = 0;
        this._startTime = null;
    }

    get elapsed() {
        return this._elapsed;
    }

    get isRunning() {
        return this._running;
    }

    /**
     * Format seconds as MM:SS.
     * @param {number} seconds
     * @returns {string}
     */
    static format(seconds) {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }
}

