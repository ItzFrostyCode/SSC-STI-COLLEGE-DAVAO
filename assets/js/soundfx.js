class SoundManager {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.2;
        this.masterGain.connect(this.ctx.destination);

        this.lastHovered = null;

        this.init();
    }

    init() {
        const unlock = () => {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => console.log('AudioContext resumed'));
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };
        ['click', 'touchstart', 'keydown'].forEach(event => document.addEventListener(event, unlock));

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachDelegatedListeners());
        } else {
            this.attachDelegatedListeners();
        }
    }

    attachDelegatedListeners() {
        const selector = 'a, button, .card, .officer-card, .stat-card, .btn-primary, .btn-outline, .btn-audio, .search-toggle-btn, .hamburger, .theme-toggle, input[type="submit"], input[type="button"], [role="button"]';
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target.closest(selector);
            if (target) {
                if (this.lastHovered !== target) {
                    this.playSound('hover');
                    this.lastHovered = target;
                }
            } else {
                this.lastHovered = null;
            }
        });
        document.body.addEventListener('click', (e) => {
            if (e.target.closest(selector)) {
                this.playSound('click');
            }
        });

        console.log('Simplified SoundFX initialized.');
    }

    playSound(action) {
        if (this.ctx.state === 'suspended') return;
        const t = this.ctx.currentTime;

        if (action === 'hover') {
            this.synthesizePicker(t);
        } else if (action === 'click') {
            this.synthesizeWhoosh(t);
        }
    }

    synthesizePicker(t) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.start(t);
        osc.stop(t + 0.03);
    }

    synthesizeWhoosh(t) {
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const gain = this.ctx.createGain();

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(3000, t + 0.2);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.start(t);
        noise.stop(t + 0.2);
    }
}

const sfx = new SoundManager();
