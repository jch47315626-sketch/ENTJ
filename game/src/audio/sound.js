/**
 * Synthesised sound (WebAudio, no files): effects named by the game, plus a
 * janggu-style drum loop whose tempo and weight follow the battle.
 */
const PENTA = [392, 440, 523.3, 587.3, 659.3, 784, 880]; // G-A-C-D-E 평조 계열

// Minimum seconds between two plays of the same effect.
const THROTTLE = { hit: 0.045, coin: 0.05, kill: 0.04, slash: 0.05, chop: 0.05, swing: 0.05, hurt: 0.15, heal: 0.1, levelup: 0.25 };

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem('samhan-muted') === '1';
    } catch {}
    this.last = {};
    this.music = { on: false, step: 0, next: 0, intensity: 0, timer: null };
  }

  /** Must be called from a user gesture (click / key) before anything plays. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, len);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    try {
      localStorage.setItem('samhan-muted', m ? '1' : '0');
    } catch {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  // ------------------------------------------------------------ primitives

  tone(freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, slide, at = 0, bus } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst(dur, { filter = 'bandpass', freq = 1200, slide, q = 1, gain = 0.2, at = 0, bus } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus ?? this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  drum(freq, dur, gain, at = 0, bus) {
    this.tone(freq, dur, { gain, slide: freq * 0.55, attack: 0.003, at, bus });
    this.burst(0.03, { filter: 'lowpass', freq: 1800, gain: gain * 0.35, at, bus });
  }

  /** Plucked string (가야금-like): bright attack, quick decay, slight bend. */
  pluck(freq, at = 0, gain = 0.16, dur = 0.7) {
    this.tone(freq * 1.01, dur, { type: 'triangle', gain, attack: 0.003, slide: freq, at });
    this.tone(freq * 2, dur * 0.4, { type: 'sine', gain: gain * 0.3, attack: 0.003, at });
  }

  /** Gong (징): inharmonic partials with a long tail. */
  gong(at = 0, gain = 0.14, base = 180) {
    for (const [m, gg] of [[1, 1], [1.51, 0.6], [2.2, 0.4], [3.05, 0.2]]) {
      this.tone(base * m, 2.4, { gain: gain * gg, attack: 0.01, slide: base * m * 0.985, at });
    }
  }

  // ---------------------------------------------------------------- effects

  sfx(name) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const th = THROTTLE[name];
    if (th && now - (this.last[name] ?? -9) < th) return;
    this.last[name] = now;
    const fx = EFFECTS[name];
    if (fx) fx(this);
  }

  // ------------------------------------------------------------------ music

  startMusic() {
    if (!this.ctx || this.music.on) return;
    this.music.on = true;
    this.music.step = 0;
    this.music.next = this.ctx.currentTime + 0.1;
    this.music.timer = setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    this.music.on = false;
    clearInterval(this.music.timer);
  }

  /** 0 = early stage, 1 = late rush, 2 = boss. */
  setIntensity(v) {
    this.music.intensity = v;
  }

  schedule() {
    const m = this.music;
    const c = this.ctx;
    // 12-step janggu cycle: D = 덩 (both heads), K = 쿵 (low), k = 덕 (rim)
    const PATTERN = ['D', '', 'k', 'K', '', 'k', 'D', '', 'k', 'K', 'k', 'k'];
    while (m.next < c.currentTime + 0.12) {
      const at = m.next - c.currentTime;
      const s = PATTERN[m.step % 12];
      const boss = m.intensity >= 2;
      const heavy = 0.12 + Math.min(1, m.intensity) * 0.08 + (boss ? 0.08 : 0);
      const bus = this.musicBus;
      if (s === 'D' || s === 'K') this.drum(boss ? 62 : 78, 0.28, heavy * 1.6, at, bus);
      if (s === 'D' || s === 'k') this.burst(0.05, { filter: 'highpass', freq: 2600, gain: heavy * 0.7, at, bus });
      if (boss && m.step % 3 === 0) this.drum(48, 0.35, 0.22, at, bus);
      // A sparse plucked phrase every two cycles.
      if (m.step % 24 === 0 && m.intensity < 2) this.pluck(PENTA[(m.step / 24) % 5], at, 0.06, 1.1);
      if (m.step % 48 === 36 && boss) this.gong(at, 0.05, 140);
      const eighth = boss ? 0.125 : 0.17 - Math.min(1, m.intensity) * 0.035;
      m.next += eighth;
      m.step++;
    }
  }
}

const EFFECTS = {
  slash: (s) => s.burst(0.12, { freq: 2200, slide: 700, q: 1.2, gain: 0.14 }),
  royal: (s) => {
    s.burst(0.16, { freq: 2600, slide: 600, q: 1, gain: 0.16 });
    s.tone(1318, 0.18, { type: 'triangle', gain: 0.05 });
  },
  chop: (s) => {
    s.burst(0.16, { filter: 'lowpass', freq: 1400, slide: 300, gain: 0.22 });
    s.drum(95, 0.14, 0.18);
  },
  quake: (s) => {
    s.drum(52, 0.45, 0.4);
    s.burst(0.4, { filter: 'lowpass', freq: 400, slide: 120, gain: 0.3 });
  },
  orb: (s) => s.tone(880, 0.12, { type: 'sine', gain: 0.05, slide: 1320 }),
  beam: (s) => {
    s.tone(1320, 0.25, { type: 'triangle', gain: 0.06, slide: 660 });
    s.burst(0.15, { freq: 4000, q: 2, gain: 0.05 });
  },
  thunder: (s) => {
    s.burst(0.08, { filter: 'highpass', freq: 3000, gain: 0.18 });
    s.burst(0.5, { filter: 'lowpass', freq: 500, slide: 90, gain: 0.25, at: 0.03 });
  },
  gwansim: (s) => {
    // A low chant under a bowl-like ring.
    s.tone(110, 1.1, { gain: 0.08, attack: 0.15 });
    s.tone(165, 1.1, { gain: 0.05, attack: 0.15 });
    for (const [f, d] of [[660, 1.4], [990, 1.1]]) s.tone(f, d, { gain: 0.05, at: 0.1 });
  },
  shin: (s) => {
    EFFECTS.horn(s);
    s.drum(70, 0.3, 0.25, 0.1);
  },
  blast: (s) => {
    s.drum(38, 0.8, 0.6);
    s.burst(0.7, { filter: 'lowpass', freq: 1200, slide: 80, gain: 0.45 });
    s.gong(0.1, 0.1, 110);
  },
  hit: (s) => s.tone(190, 0.05, { type: 'square', gain: 0.035, slide: 90 }),
  kill: (s) => {
    s.burst(0.09, { filter: 'lowpass', freq: 700, gain: 0.1 });
    s.tone(130, 0.08, { gain: 0.06, slide: 60 });
  },
  coin: (s) => s.tone(PENTA[3 + Math.floor(Math.random() * 4)] * 2, 0.07, { type: 'sine', gain: 0.04 }),
  heal: (s) => [523.3, 659.3, 784].forEach((f, i) => s.tone(f, 0.18, { gain: 0.07, at: i * 0.06 })),
  hurt: (s) => {
    s.tone(150, 0.2, { type: 'sawtooth', gain: 0.09, slide: 70 });
    s.burst(0.1, { filter: 'lowpass', freq: 600, gain: 0.12 });
  },
  levelup: (s) => [0, 1, 2, 4].forEach((n, i) => s.pluck(PENTA[n], i * 0.07, 0.12)),
  evolve: (s) => {
    [0, 2, 3, 4, 6].forEach((n, i) => s.pluck(PENTA[n], i * 0.08, 0.14));
    s.gong(0.4, 0.1, 220);
  },
  horn: (s) => {
    const c = s.ctx, t = c.currentTime;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(196, t);
    o.frequency.linearRampToValueAtTime(220, t + 0.25);
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(f).connect(g).connect(s.sfxBus);
    o.start(t);
    o.stop(t + 0.85);
  },
  boss: (s) => {
    for (let i = 0; i < 3; i++) s.drum(58, 0.6, 0.45, i * 0.32);
    s.gong(1.0, 0.16, 150);
  },
  gong: (s) => s.gong(0, 0.15, 170),
  bossSpin: (s) => s.burst(0.3, { freq: 300, slide: 1200, q: 1.5, gain: 0.2 }),
  throw: (s) => s.burst(0.12, { freq: 1500, slide: 3000, q: 3, gain: 0.08 }),
  volley: (s) => {
    for (let i = 0; i < 3; i++) s.burst(0.08, { freq: 3000, q: 4, gain: 0.06, at: i * 0.03 });
  },
  paewang: (s) => {
    s.drum(42, 0.6, 0.5);
    s.burst(0.45, { filter: 'lowpass', freq: 900, slide: 150, gain: 0.35 });
    s.gong(0.05, 0.08, 120);
  },
  bossDown: (s) => {
    s.drum(50, 0.7, 0.5);
    s.gong(0.1, 0.18, 160);
  },
  clear: (s) => {
    [0, 2, 4, 3, 5, 6].forEach((n, i) => s.pluck(PENTA[n], 0.3 + i * 0.16, 0.14, 1.2));
    s.gong(1.4, 0.12, 196);
  },
  defeat: (s) => [5, 4, 2, 1, 0].forEach((n, i) => s.pluck(PENTA[n] / 2, i * 0.28, 0.13, 1.4)),
};
