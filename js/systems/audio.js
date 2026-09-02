// systems/audio.js — Web Audio API synthesizer for in-game SFX.
// No external audio files needed; all sounds are generated in the browser.
// This is our own "mix": attack swipes, coin jingles, level-up arpeggios, etc.

const AudioManager = {
  ctx: null,
  enabled: false,
  muted: false,

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.enabled = true;
    } catch (e) {
      // Browser doesn't support Web Audio — the game stays silent.
    }
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(value) { this.muted = value; },
  toggleMute() { this.muted = !this.muted; return this.muted; },

  play(type) {
    if (this.muted) return;
    this.resume();
    if (!this.enabled || !this.ctx) return;

    switch (type) {
      case 'attack': this._sweep(280, 90, 0.16, 'sawtooth', 0.08); break;
      case 'hit':    this._tone(160, 0.10, 'square', 0.06); break;
      case 'coin':   this._coin(); break;
      case 'pickup': this._tone(880, 0.12, 'sine', 0.05); break;
      case 'levelup': this._arpeggio([523, 659, 784, 1046], 0.10); break;
      case 'buy':    this._arpeggio([880, 1100, 1320], 0.08); break;
      case 'openShop': this._sweep(600, 900, 0.25, 'sine', 0.05); break;
      case 'ui':     this._tone(1250, 0.05, 'sine', 0.03); break;
      case 'error':  this._sweep(160, 80, 0.30, 'sawtooth', 0.06); break;
      default: break;
    }
  },

  _tone(freq, duration, wave = 'square', gain = 0.05) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  _sweep(startFreq, endFreq, duration, wave = 'sawtooth', gain = 0.05) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  _arpeggio(notes, noteDuration, wave = 'square', gain = 0.05) {
    for (let i = 0; i < notes.length; i++) {
      const t = this.ctx.currentTime + i * noteDuration;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(notes[i], t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + noteDuration);
    }
  },

  _coin() {
    const t = this.ctx.currentTime;
    const notes = [987, 1318];
    const noteDuration = 0.08;
    for (let i = 0; i < notes.length; i++) {
      const tt = t + i * noteDuration;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[i], tt);
      g.gain.setValueAtTime(0.05, tt);
      g.gain.exponentialRampToValueAtTime(0.001, tt + noteDuration);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(tt);
      osc.stop(tt + noteDuration);
    }
  },
};
