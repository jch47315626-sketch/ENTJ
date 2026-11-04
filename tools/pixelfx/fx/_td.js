// 삼한난세 top-down helpers. The battlefield is seen from above at a slant: the floor (x, y) is drawn
// undistorted, so a circle on the floor stays a circle of the same radius, and height z goes straight up
// the screen. A point (x, y, z) lands on screen at (x, y - z). Everything here works in that space.
import { clamp, TAU, mix } from "../../core/index.js";

export const G = 560; // px/s², pulling height down

/** Ballistic bodies with height: sparks, rocks, motes, puffs. */
export class Bodies {
  constructor() {
    this.list = [];
  }
  add(b) {
    this.list.push({ z: 0, vx: 0, vy: 0, vz: 0, delay: 0, age: 0, drag: 0, bounce: 0.35, g: G, size: 1, grow: 0, ...b });
  }
  update(dt) {
    for (const b of this.list) {
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.age += dt;
      const k = Math.exp(-b.drag * dt);
      b.vx *= k;
      b.vy *= k;
      if (b.g <= 0) b.vz *= k;
      b.vz -= b.g * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      if (b.g > 0 && b.z < 0) {
        b.z = 0;
        if (b.vz < -40) {
          b.vz = -b.vz * b.bounce;
          b.vx *= 0.55;
          b.vy *= 0.55;
        } else {
          b.vz = 0;
          b.vx *= 0.6;
          b.vy *= 0.6;
        }
      }
    }
  }
  /** Live bodies, back to front (smaller y is further away). */
  live() {
    return this.list.filter((b) => b.delay <= 0 && b.age < b.life).sort((a, b) => a.y - b.y);
  }
}

/** A streak of light thrown through the air; tail follows its velocity. C: dark..bright ramp. */
export function spark(p, b, C, len = 0.028) {
  const u = b.age / b.life, n = C.length;
  const hx = b.x, hy = b.y - b.z, tx = b.x - b.vx * len, ty = b.y - b.vy * len - (b.z - b.vz * len);
  const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
  p.line(tx, ty, hx, hy, (v) => C[clamp(Math.round(n - 4 + v * 3.4 - u * 1.5), 0, n - 1)], a);
  p.px(hx, hy, u < 0.4 ? C[n - 1] : C[n - 2]);
  p.light(hx, hy, C[n - 2], 0.5 * a);
}

/** A tumbling chip of stone with a lit top-left, and its shadow on the floor while it flies. */
export function chunk(p, b, R) {
  const u = b.age / b.life, a = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25, s = b.size, x = b.x, y = b.y - b.z;
  if (b.z > 1) p.disc(b.x, b.y + 1, s * 0.9, R[0], 0.35 * a);
  const spin = Math.floor(b.age * 14 + b.seed * 4) & 3;
  p.rect(Math.round(x - s / 2) - 1, Math.round(y - s / 2) - 1, s + 2, s + 2, R[0], a);
  for (let dy = 0; dy < s; dy++)
    for (let dx = 0; dx < s; dx++) {
      if (s > 2 && (dx + dy === 0 || dx + dy === 2 * s - 2) && spin & 1) continue;
      const lit = dx + dy < s - 1 ? 3 : dx + dy < s + 1 ? 2 : 1;
      p.dot(Math.round(x - s / 2) + dx, Math.round(y - s / 2) + dy, R[lit], a);
    }
}

/** A soft rising puff of dust or smoke. */
export function puff(p, b, c, k = 0.5) {
  const u = b.age / b.life, r = b.size * (0.6 + 0.8 * Math.sqrt(u)) + b.grow * u;
  p.disc(b.x, b.y - b.z, r, (d) => (d < 0.55 ? mix(c, 0xffffffff, 0.12) : c), (d) => k * (1 - u) * (1 - d * d));
}

/** A single drifting mote that blinks out. */
export function mote(p, b, c, k = 0.6) {
  const u = b.age / b.life;
  p.dot(b.x, b.y - b.z, c, 1 - u);
  p.light(b.x, b.y - b.z, c, k * (1 - u));
}

/** A thin circle lying on the floor, of exactly radius r. c/a may be functions of the angle. */
export function floorRing(p, r, w, c, a = 1) {
  if (r <= 0.5) return;
  p.ring(0, 0, r + w / 2, w, (v, g) => (typeof c === "function" ? c(v, g) : c), (v, g) => (typeof a === "function" ? a(v, g) : a));
}

/** A dotted circle on the floor (n dots), turning by `turn`. */
export function dottedRing(p, r, n, c, a = 1, turn = 0) {
  for (let i = 0; i < n; i++) {
    const g = turn + (i / n) * TAU;
    p.dot(Math.cos(g) * r, Math.sin(g) * r, c, a);
  }
}

/**
 * A tongue of flame standing on the floor at (x, y): h tall, w half-wide at its widest, cooling up the ramp
 * C (dark..bright) from a hot white-gold root to a dark red tip. k 0..1 burns it down.
 */
export function tongue(p, x, y, h, w, C, phase, k = 1) {
  const n = C.length;
  h *= k;
  if (h < 2) return;
  for (let j = 0; j <= h; j++) {
    const u = j / h, sway = Math.sin(phase + u * 3.2) * u * 1.6;
    const half = w * Math.pow(1 - u, 0.75) * (u < 0.18 ? 0.65 + u * 2 : 1);
    for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
      const e = Math.abs(dx) / (half + 0.01);
      if (e > 1) continue;
      const heat = (1 - u) * (1 - e * 0.65);
      p.px(x + dx + sway, y - j, C[clamp(Math.round(1 + heat * (n - 1.2)), 1, n - 1)]);
    }
  }
  p.light(x, y - h * 0.3, C[n - 2], 0.35 * k);
}
