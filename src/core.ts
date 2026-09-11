// ============================================================
// LEONIS — core.ts · RNG, noise, input, áudio procedural, save
// ============================================================

// ---------- RNG determinístico ----------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Noise ----------
function hash2(ix: number, iz: number, seed: number): number {
  let n = (ix * 374761393 + iz * 668265263 + seed * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967295;
}

export function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

export function fbm(x: number, z: number, seed: number, oct = 4): number {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    v += valueNoise(x * f, z * f, seed + i * 101) * amp;
    tot += amp; amp *= 0.5; f *= 2;
  }
  return v / tot;
}

// ---------- Helpers ----------
export const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export const dist2d = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// ---------- Input (mouse + teclado, top-down) ----------
export class Input {
  keys = new Set<string>();
  just = new Set<string>();
  lmb = false; rmb = false;
  lmbJust = false; rmbJust = false;
  mx = 0; my = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['F5', 'F9', 'Tab', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.just.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.lmb = this.rmb = false; });

    window.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('button, input, .panel, #dialog, #title, #intro, #creation')) return;
      if (e.button === 0) { this.lmb = true; this.lmbJust = true; }
      if (e.button === 2) { this.rmb = true; this.rmbJust = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; });
  }

  down(code: string) { return this.keys.has(code); }
  pressed(code: string) { return this.just.has(code); }
  endFrame() {
    this.just.clear();
    this.lmbJust = false; this.rmbJust = false;
  }
}

// ---------- Áudio procedural ----------
export class AudioSys {
  private ctx: AudioContext | null = null;
  muted = false;

  private ac(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  startAmbient() {
    const ctx = this.ac(); if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 320;
    const g = ctx.createGain(); g.gain.value = 0.03;
    src.connect(flt); flt.connect(g); g.connect(ctx.destination);
    src.start();
  }

  sfx(name: string) {
    const ctx = this.ac(); if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.connect(ctx.destination);
    const osc = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number) => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      const og = ctx.createGain();
      og.gain.setValueAtTime(vol, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 0.02);
    };
    const noise = (dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass') => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const ng = ctx.createGain(); ng.gain.value = vol;
      s.connect(f); f.connect(ng); ng.connect(g);
      s.start(t);
    };
    switch (name) {
      case 'swing': noise(0.1, 0.16, 1800, 'bandpass'); break;
      case 'hit': noise(0.09, 0.3, 500); osc('square', 160, 70, 0.1, 0.1); break;
      case 'hurt': osc('sawtooth', 220, 90, 0.22, 0.14); break;
      case 'pickup': osc('triangle', 660, 990, 0.09, 0.12); break;
      case 'coin': osc('square', 880, 1320, 0.08, 0.09); break;
      case 'eat': noise(0.16, 0.18, 900); break;
      case 'open': osc('sawtooth', 90, 60, 0.25, 0.1); noise(0.14, 0.1, 400); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => { const c2 = this.ac(); if (!c2) return; const o = c2.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const gg = c2.createGain(); gg.gain.setValueAtTime(0.1, c2.currentTime); gg.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.25); o.connect(gg); gg.connect(c2.destination); o.start(); o.stop(c2.currentTime + 0.3); }, i * 90)); break;
      case 'quest': osc('triangle', 784, 784, 0.15, 0.1); osc('triangle', 1175, 1175, 0.22, 0.09); break;
      case 'gallop': noise(0.07, 0.14, 220); break;
      case 'ui': osc('square', 440, 440, 0.05, 0.06); break;
      case 'note': osc('sine', 1047, 1319, 0.3, 0.09); break;
      case 'tame': osc('triangle', 392, 392, 0.2, 0.1); osc('triangle', 523, 523, 0.2, 0.1); osc('triangle', 659, 659, 0.35, 0.1); break;
      case 'splash': noise(0.25, 0.2, 800); break;
    }
  }
}

// ---------- Save ----------
const SAVE_KEY = 'leonis-m2d-1';

export function saveGame(data: unknown) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function loadGame(): any | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearSave() { localStorage.removeItem(SAVE_KEY); }
export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
