// Procedural forest ambience via the Web Audio API — no audio files.
// Layers: gentle filtered-noise "wind", a slower swelling rustle, and
// randomly-timed synthesized bird chirps. Starts on first user interaction
// (browsers block audio before that) and can be muted with a corner button.

export class Ambience {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.started = false;
    this._birdTimer = null;

    this._buildButton();

    // Browsers require a user gesture before audio can play. Start on the first
    // interaction anywhere, then stop listening.
    const kick = () => this._start();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
  }

  _buildButton() {
    const btn = document.createElement('button');
    btn.dataset.control = 'sound';
    btn.textContent = '🔇'; // starts silent until first interaction
    btn.title = 'Toggle sound';
    btn.style.cssText = `
      position: fixed; right: 60px; top: 12px; z-index: 40;
      width: 40px; height: 40px; border-radius: 8px; border: none;
      background: rgba(0,0,0,.45); color: #fff; font-size: 18px;
      cursor: pointer; touch-action: none; user-select: none;
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._start();      // ensure context exists / resumes
      this.toggleMute();
    });
    document.body.appendChild(btn);
    this.btn = btn;
  }

  // Create a looping buffer of white noise we can reuse for wind/rustle.
  _noiseSource() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  _start() {
    if (this.started) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.started = true;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(this.ctx.destination);
    // Fade in to a gentle level.
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2);

    this._buildWind();
    this._scheduleBird();

    this.muted = false;
    this.btn.textContent = '🔊';
  }

  _buildWind() {
    // Steady airy wind: white noise through a gently moving low-pass filter.
    const wind = this._noiseSource();
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 500;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.25;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();

    // Slow LFO to make the wind breathe (swell up and down).
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(windGain.gain);
    lfo.start();

    // Higher "leaf rustle" layer, quieter and brighter.
    const rustle = this._noiseSource();
    const rustleFilter = this.ctx.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.value = 3000;
    rustleFilter.Q.value = 0.5;
    const rustleGain = this.ctx.createGain();
    rustleGain.gain.value = 0.05;
    rustle.connect(rustleFilter).connect(rustleGain).connect(this.master);
    rustle.start();
  }

  // One short bird chirp: a couple of quick frequency-swept blips.
  _chirp() {
    const t0 = this.ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let i = 0; i < notes; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const base = 2200 + Math.random() * 1800;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.06);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.14);
      t += 0.09 + Math.random() * 0.06;
    }
  }

  // Schedule chirps at random intervals so the forest feels alive.
  _scheduleBird() {
    const next = 2500 + Math.random() * 6000; // 2.5–8.5s
    this._birdTimer = setTimeout(() => {
      if (!this.muted && this.ctx?.state === 'running') this._chirp();
      this._scheduleBird();
    }, next);
  }

  toggleMute() {
    if (!this.ctx) return;
    this.muted = !this.muted;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.5, now + 0.3);
    this.btn.textContent = this.muted ? '🔇' : '🔊';
  }
}
