/**
 * Synthesised sound (WebAudio, no files): effects named by the game, and
 * music themes (audio/music.js) played on synthesised Korean instruments —
 * 가야금, 대금, 해금, 태평소, 편경 — over a janggu rhythm that speeds up as
 * the battle heats up. Music and effects have their own volume.
 */
import { THEMES } from './music.js';

const PENTA = [392, 440, 523.3, 587.3, 659.3, 784, 880]; // G-A-C-D-E 평조 계열

// Minimum seconds between two plays of the same effect.
const THROTTLE = { hit: 0.045, coin: 0.05, kill: 0.04, slash: 0.05, chop: 0.05, swing: 0.05, hurt: 0.15, heal: 0.1, levelup: 0.25, click: 0.04, flip: 0.05, dig: 0.3, heartbeat: 0.6, crow: 0.4 };

const readNum = (key, def) => {
  try {
    const v = parseFloat(localStorage.getItem(key));
    if (v >= 0 && v <= 1) return v;
  } catch {}
  return def;
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
    try {
      this.muted = localStorage.getItem('samhan-muted') === '1';
      const v = parseFloat(localStorage.getItem('samhan-volume'));
      if (v >= 0 && v <= 1) this.volume = v;
    } catch {}
    this.musicVol = readNum('samhan-music-vol', 0.7);
    this.sfxVol = readNum('samhan-sfx-vol', 0.9);
    this.last = {};
    this.music = { on: false, theme: 'menu', playing: null, step: 0, next: 0, intensity: 0, timer: null, ambAt: 0 };
  }

  /** Must be called from a user gesture (click / key) before anything plays. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVol * 0.6;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, len);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Master volume 0–1 (remembered in this browser). */
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('samhan-volume', String(this.volume));
    } catch {}
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /** Music / effects volume 0–1, each remembered separately. */
  setMusicVolume(v) {
    this.musicVol = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('samhan-music-vol', String(this.musicVol));
    } catch {}
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVol * 0.6, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(v) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('samhan-sfx-vol', String(this.sfxVol));
    } catch {}
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.05);
  }

  setMuted(m) {
    this.muted = m;
    try {
      localStorage.setItem('samhan-muted', m ? '1' : '0');
    } catch {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
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
  pluck(freq, at = 0, gain = 0.16, dur = 0.7, bus) {
    this.tone(freq * 1.01, dur, { type: 'triangle', gain, attack: 0.003, slide: freq, at, bus });
    this.tone(freq * 2, dur * 0.4, { type: 'sine', gain: gain * 0.3, attack: 0.003, at, bus });
  }

  /** Gong (징): inharmonic partials with a long tail. */
  gong(at = 0, gain = 0.14, base = 180, bus) {
    for (const [m, gg] of [[1, 1], [1.51, 0.6], [2.2, 0.4], [3.05, 0.2]]) {
      this.tone(base * m, 2.4, { gain: gain * gg, attack: 0.01, slide: base * m * 0.985, at, bus });
    }
  }

  /**
   * A held, breathing note: oscillator(s) → optional filter → envelope,
   * with vibrato. The building block of the wind and bowed instruments.
   */
  voice(freq, dur, { types = ['sine'], gain = 0.1, attack = 0.05, release = 0.2, vib = 5, depth = 0.008, filter, q = 1, at = 0, bus } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      f.Q.value = q;
      f.connect(g);
      out = f;
    }
    g.connect(bus ?? this.sfxBus);
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = vib;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(freq * depth, t + Math.min(dur, 0.35)); // vibrato blooms in
    lfo.connect(lg);
    for (const type of types) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      lg.connect(o.frequency);
      o.connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  /** 대금: soft flute with breath noise. */
  daegeum(freq, dur, at, gain = 0.07, bus) {
    this.voice(freq, dur, { types: ['sine', 'triangle'], gain, attack: 0.09, release: 0.3, vib: 5, depth: 0.012, filter: 2400, at, bus });
    this.burst(Math.min(0.35, dur), { freq: freq * 3, q: 2, gain: gain * 0.25, at, bus });
  }

  /** 해금: nasal bowed string, a little rough. */
  haegeum(freq, dur, at, gain = 0.05, bus) {
    this.voice(freq, dur, { types: ['sawtooth'], gain, attack: 0.06, release: 0.18, vib: 6, depth: 0.014, filter: 1600, q: 2, at, bus });
  }

  /** 태평소: bright, buzzing shawm for battle calls. */
  taepyeongso(freq, dur, at, gain = 0.04, bus) {
    this.voice(freq, dur, { types: ['square', 'sawtooth'], gain, attack: 0.03, release: 0.1, vib: 7, depth: 0.018, filter: 2600, q: 3, at, bus });
  }

  /** 편경: stone chime, metallic partials with a clean ring. */
  bells(freq, at = 0, gain = 0.06, bus) {
    for (const [m, gg, d] of [[1, 1, 1.6], [2.76, 0.4, 0.8], [5.4, 0.18, 0.4]]) {
      this.tone(freq * m, d, { gain: gain * gg, attack: 0.002, at, bus });
    }
  }

  /** One melody note on the named instrument. */
  play(inst, freq, dur, at, bus, gain) {
    if (inst === 'gayageum') this.pluck(freq, at, gain ?? 0.09, Math.max(0.6, dur * 1.4));
    else if (inst === 'daegeum') this.daegeum(freq, dur, at, gain, bus);
    else if (inst === 'haegeum') this.haegeum(freq, dur, at, gain, bus);
    else if (inst === 'taepyeongso') this.taepyeongso(freq, dur, at, gain, bus);
    else if (inst === 'bells') this.bells(freq, at, gain ?? 0.05, bus);
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

  /**
   * Plays a theme from audio/music.js ('menu', a stage id, …). Called with
   * no theme it resumes the last one (after a pause or level-up).
   */
  startMusic(theme) {
    if (theme) this.music.theme = theme;
    if (!this.ctx) return;
    const m = this.music;
    if (m.on && m.playing === m.theme) return;
    if (m.on) clearInterval(m.timer);
    m.on = true;
    m.playing = m.theme;
    m.step = 0;
    m.next = this.ctx.currentTime + 0.1;
    m.timer = setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    this.music.on = false;
    this.music.playing = null;
    clearInterval(this.music.timer);
  }

  /** 0 = early stage, 1 = late rush, 2 = boss (switches to the boss theme). */
  setIntensity(v) {
    this.music.intensity = v;
  }

  schedule() {
    const m = this.music;
    const c = this.ctx;
    const bus = this.musicBus;
    const boss = m.intensity >= 2 && m.playing !== 'menu';
    const T = THEMES[boss ? 'boss' : m.playing] ?? THEMES.menu;
    if (boss !== !!m.bossOn) {
      m.bossOn = boss;
      m.step = 0;
    }
    while (m.next < c.currentTime + 0.15) {
      const at = m.next - c.currentTime;
      const heat = Math.min(1, m.intensity);
      const step = T.step - (T.rush ?? 0) * heat;
      const R = T.rhythm, s = R[m.step % R.length];
      const dg = (T.drumGain ?? 0.12) + heat * 0.05;
      // Janggu: 덩 = both heads, 쿵 = low head, 덕 = rim.
      if (s === 'D' || s === 'K') this.drum(T.heavy ? 62 : 78, 0.28, dg * 1.6, at, bus);
      if (s === 'D' || s === 'k') this.burst(0.05, { filter: 'highpass', freq: 2600, gain: dg * 0.7, at, bus });
      if (T.heavy && m.step % 2 === 0) this.drum(48, 0.3, 0.16, at, bus);
      if (heat > 0.6 && !T.heavy && m.step % 2 === 1) this.burst(0.03, { filter: 'highpass', freq: 5000, gain: 0.03, at, bus });
      if (T.gongEvery && m.step % T.gongEvery === 0) this.gong(at, 0.05, 140, bus);
      // Drone: a low held note at the top of every rhythm cycle.
      if (T.drone && m.step % R.length === 0) this.voice(T.drone, step * R.length * 0.95, { types: ['sine'], gain: 0.035, attack: 0.4, release: 0.6, vib: 0.5, depth: 0.002, at, bus });
      // Melody and counter-line.
      const note = T.melody[m.step % T.melody.length];
      if (note != null) this.play(T.lead, T.scale[note], step * 1.8, at, bus);
      const cn = T.counter?.[m.step % T.counter.length];
      if (cn != null) this.play(T.second, T.scale[cn], step * 2.5, at, bus, 0.035);
      // Ambience between phrases.
      if (T.ambience && c.currentTime + at >= m.ambAt) {
        m.ambAt = c.currentTime + at + 3.5 + Math.random() * 2;
        this.ambience(T.ambience, at);
      }
      m.next += step;
      m.step++;
    }
  }

  /** Background texture: rolling waves or a passing gust. */
  ambience(kind, at) {
    const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const dur = kind === 'waves' ? 3.2 : 2.6;
    f.type = kind === 'waves' ? 'lowpass' : 'bandpass';
    f.frequency.setValueAtTime(kind === 'waves' ? 300 : 500, t);
    f.frequency.linearRampToValueAtTime(kind === 'waves' ? 900 : 1400, t + dur * 0.45);
    f.frequency.linearRampToValueAtTime(kind === 'waves' ? 250 : 400, t + dur);
    f.Q.value = kind === 'waves' ? 0.7 : 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(kind === 'waves' ? 0.07 : 0.035, t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t);
    src.stop(t + dur + 0.05);
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
  gallop: (s) => {
    EFFECTS.horn(s);
    for (let i = 0; i < 6; i++) s.drum(i % 3 === 2 ? 70 : 110, 0.09, 0.14, 0.15 + i * 0.09 + (i >= 3 ? 0.08 : 0));
  },
  chain: (s) => {
    // Rattling chain: a burst of short metallic clinks.
    for (let i = 0; i < 6; i++) s.tone(1800 + Math.random() * 900, 0.05, { type: 'square', gain: 0.025, at: i * 0.035 });
    s.burst(0.25, { freq: 2500, slide: 900, q: 3, gain: 0.08 });
  },
  firePot: (s) => {
    s.burst(0.15, { filter: 'highpass', freq: 2000, gain: 0.12 });
    s.burst(0.9, { filter: 'lowpass', freq: 800, slide: 200, gain: 0.25, at: 0.05 });
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
  // ------------------------------------------------ newer effects
  /** UI button tap. */
  click: (s) => s.tone(1400, 0.035, { type: 'triangle', gain: 0.03, slide: 1000 }),
  /** Level-up cards flipping in. */
  flip: (s) => {
    for (let i = 0; i < 3; i++) s.burst(0.09, { freq: 1800 + i * 500, slide: 4000, q: 2, gain: 0.05, at: i * 0.12 });
  },
  /** A 책략 card chosen. */
  pick: (s) => {
    s.pluck(PENTA[4] * 2, 0, 0.1, 0.5);
    s.pluck(PENTA[6] * 2, 0.06, 0.1, 0.6);
  },
  /** Bought something in the camp: a cascade of coins. */
  buy: (s) => {
    for (let i = 0; i < 5; i++) s.tone(PENTA[2 + (i % 5)] * 2, 0.08, { gain: 0.05, at: i * 0.045 });
  },
  /** 제련 성공: anvil ring and sparkle. 실패: a dull clunk. */
  forgeOk: (s) => {
    s.bells(880, 0, 0.09);
    s.burst(0.06, { filter: 'highpass', freq: 4000, gain: 0.08 });
    [0, 2, 4].forEach((n, i) => s.pluck(PENTA[n] * 2, 0.15 + i * 0.07, 0.08));
  },
  forgeFail: (s) => {
    s.drum(110, 0.2, 0.2);
    s.tone(220, 0.35, { type: 'triangle', gain: 0.06, slide: 140, at: 0.05 });
  },
  /** 업적 달성: a fanfare on 가야금 with a stone chime. */
  achieve: (s) => {
    [0, 2, 4, 5].forEach((n, i) => s.pluck(PENTA[n] * 2, i * 0.08, 0.12, 0.9));
    s.bells(1046.5, 0.34, 0.08);
  },
  /** 까마귀: two hoarse caws. */
  crow: (s) => {
    for (const at of [0, 0.22]) {
      s.voice(620, 0.16, { types: ['sawtooth'], gain: 0.06, attack: 0.01, release: 0.1, vib: 30, depth: 0.04, filter: 1500, q: 4, at });
      s.burst(0.14, { freq: 1100, q: 3, gain: 0.05, at });
    }
  },
  /** 함정 묻기: a short scrape of earth. */
  dig: (s) => s.burst(0.12, { filter: 'lowpass', freq: 700, slide: 300, gain: 0.07 }),
  /** Low health: a heartbeat. */
  heartbeat: (s) => {
    s.drum(55, 0.14, 0.22);
    s.drum(50, 0.16, 0.16, 0.16);
  },
  /** 기세 가득: the special is ready to burst. */
  ready: (s) => {
    s.taepyeongso(587.3, 0.25, 0, 0.05);
    s.taepyeongso(784, 0.4, 0.2, 0.05);
  },
  /** 오늘의 전장 시작. */
  daily: (s) => {
    s.gong(0, 0.1, 196);
    s.taepyeongso(392, 0.3, 0.1, 0.05);
    s.taepyeongso(523.3, 0.5, 0.35, 0.05);
  },
};
