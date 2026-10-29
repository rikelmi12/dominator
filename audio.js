// DOMINATOR - Web Audio Procedural Sound Engine
// Zero external dependencies, pure Web Audio API

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicPlaying = false;
        this.masterVolume = 0.4;
        this.sfxVolume = 0.5;
        this.musicTimer = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
            this.startAmbientMusic();
        }
    }

    playTone(freq, type = 'sine', duration = 0.2, gain = 0.3, pitchDrop = 0) {
        if (!this.ctx || !this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            osc.type = type;
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(freq, now);
            if (pitchDrop !== 0) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDrop), now + duration);
            }
            gainNode.gain.setValueAtTime(gain * this.sfxVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            // Audio context might be restricted before user gesture
        }
    }

    playNoise(duration = 0.2, gain = 0.3, isExplosion = false) {
        if (!this.ctx || !this.enabled) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = isExplosion ? 'lowpass' : 'bandpass';
            filter.frequency.setValueAtTime(isExplosion ? 300 : 1200, this.ctx.currentTime);
            if (isExplosion) {
                filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);
            }

            const gainNode = this.ctx.createGain();
            const now = this.ctx.currentTime;
            gainNode.gain.setValueAtTime(gain * this.sfxVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + duration);
        } catch (e) {}
    }

    swordSwing() {
        this.playTone(450, 'sawtooth', 0.12, 0.2, -250);
        this.playNoise(0.08, 0.15, false);
    }

    swordHit() {
        this.playTone(320, 'square', 0.15, 0.35, -180);
        this.playNoise(0.12, 0.25, false);
    }

    arrowShoot() {
        this.playTone(600, 'triangle', 0.1, 0.25, -350);
    }

    spellCast() {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        [350, 520, 780].forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sine', 0.25, 0.2, 100);
            }, i * 60);
        });
    }

    meteorImpact() {
        this.playTone(120, 'sawtooth', 0.6, 0.6, -90);
        this.playNoise(0.7, 0.6, true);
    }

    warcry() {
        if (!this.ctx || !this.enabled) return;
        const freqs = [180, 220, 270, 360];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'triangle', 0.35, 0.3, 30);
            }, i * 80);
        });
    }

    dash() {
        this.playTone(280, 'sine', 0.18, 0.25, 200);
        this.playNoise(0.15, 0.15, false);
    }

    captureHorn(isPlayer = true) {
        if (!this.ctx || !this.enabled) return;
        const notes = isPlayer ? [261.63, 329.63, 392.00, 523.25] : [392.00, 329.63, 261.63, 196.00];
        notes.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'sawtooth', 0.45, 0.3, 0);
            }, i * 160);
        });
    }

    levelUp() {
        if (!this.ctx || !this.enabled) return;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'triangle', 0.3, 0.35, 10);
            }, i * 100);
        });
    }

    turretLaser() {
        this.playTone(900, 'sine', 0.12, 0.2, -600);
    }

    startAmbientMusic() {
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;

        // Medieval war drums & mystical pad synthesizer loop
        const drumNotes = [
            { beat: 0, low: true },
            { beat: 2, low: false },
            { beat: 4, low: true },
            { beat: 6, low: false },
            { beat: 7, low: false }
        ];

        let step = 0;
        const chordNotes = [
            [110, 164.81, 220], // A minor
            [98, 146.83, 196],  // G
            [87.31, 130.81, 174.61], // F
            [82.41, 123.47, 164.81]  // E
        ];
        let chordIdx = 0;

        const loop = () => {
            if (!this.enabled || !this.ctx) {
                this.musicTimer = setTimeout(loop, 400);
                return;
            }

            if (step % 8 === 0) {
                chordIdx = (chordIdx + 1) % chordNotes.length;
                const triad = chordNotes[chordIdx];
                triad.forEach(f => {
                    this.playTone(f, 'triangle', 2.8, 0.04 * this.masterVolume, 0);
                });
            }

            // Rhythm drum
            if (step % 2 === 0) {
                this.playTone(65, 'sine', 0.15, 0.08 * this.masterVolume, -25);
            } else if (step % 4 === 3) {
                this.playNoise(0.08, 0.03 * this.masterVolume, false);
            }

            step = (step + 1) % 16;
            this.musicTimer = setTimeout(loop, 280);
        };

        loop();
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const soundManager = new SoundEngine();
