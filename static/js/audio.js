/**
 * Procedural audio system using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        this._initOnInteraction = this._initOnInteraction.bind(this);
        // Lazy init on first user interaction
        document.addEventListener('click', this._initOnInteraction, { once: true });
        document.addEventListener('keydown', this._initOnInteraction, { once: true });
    }

    _initOnInteraction() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    _ensureContext() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                this.enabled = false;
                return false;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    _playTone(frequency, duration, type = 'sine', volumeMod = 1) {
        if (!this.enabled || !this._ensureContext()) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        gain.gain.setValueAtTime(this.volume * volumeMod, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    _playNoise(duration, volumeMod = 1) {
        if (!this.enabled || !this._ensureContext()) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.3 * volumeMod, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(this.ctx.currentTime);
    }

    /** Click sound — short crisp tap */
    click() {
        this._playTone(800, 0.06, 'sine', 0.5);
        this._playTone(1200, 0.04, 'sine', 0.2);
    }

    /** Flag sound — a quick two-note */
    flag() {
        this._playTone(600, 0.08, 'square', 0.3);
        setTimeout(() => this._playTone(900, 0.08, 'square', 0.3), 50);
    }

    /** Unflag sound — descending tone */
    unflag() {
        this._playTone(900, 0.08, 'sine', 0.3);
        setTimeout(() => this._playTone(600, 0.08, 'sine', 0.3), 50);
    }

    /** Explosion — noise burst + low rumble */
    explode() {
        this._playNoise(0.5, 1.5);
        this._playTone(60, 0.6, 'sawtooth', 1);
        this._playTone(40, 0.8, 'sine', 0.8);
        // Shockwave low boom
        setTimeout(() => this._playTone(30, 0.4, 'sine', 0.5), 100);
    }

    /** Reveal cascade — rising sparkle */
    reveal() {
        this._playTone(1000, 0.05, 'sine', 0.2);
    }

    /** Win jingle */
    win() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.4), i * 120);
        });
        // Final chord
        setTimeout(() => {
            [523, 659, 784, 1047].forEach(f => {
                this._playTone(f, 0.6, 'sine', 0.2);
            });
        }, 500);
    }

    /** Chording sound — satisfying chord */
    chord() {
        this._playTone(440, 0.1, 'sine', 0.3);
        setTimeout(() => this._playTone(554, 0.1, 'sine', 0.3), 40);
        setTimeout(() => this._playTone(659, 0.15, 'sine', 0.3), 80);
    }

    /** Error / can't do that */
    error() {
        this._playTone(200, 0.15, 'square', 0.2);
        setTimeout(() => this._playTone(180, 0.2, 'square', 0.2), 100);
    }
}

// Singleton
const audio = new AudioManager();
export default audio;

