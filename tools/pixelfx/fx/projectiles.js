// 투사체: looping sprites the game turns to each projectile's heading (they face right). `r` is the size the
// game's projectile has (its hit radius, or a 검기's span), so the sheet is scaled to match it exactly.
import { fit, clamp, TAU, WHITE, hex, mix, rng } from "../../core/index.js";

export const meta = {
  name: "Projectiles",
  desc: "Looping projectiles seen from above, facing right: a sword wave, a red sword wave, a dharma orb ringed with beads, a light beam, a rolling boulder, an arrow.",
  tags: ["projectile", "top-down", "loop"],
  size: [220, 140],
  origin: [130, 70],
  duration: 0.5,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    kind: "orb",
    palette: ["#3a2408", "#6e4710", "#a87418", "#e0a82a", "#ffd84a", "#fff09a", "#ffffff"],
    r: 10,
    seed: 1,
  },
};

const PH = (t) => (t / meta.duration) * TAU;

/** A crescent bowed forward (toward +x): thick in the middle, pointed at the ends. */
function crescent(p, r, span, thick, C, ph, trail) {
  // Trail: faint arcs behind it.
  for (let k = 1; k <= 3; k++) {
    const off = -k * r * 0.45;
    for (let a = -1; a <= 1; a += 0.04) {
      const y = a * span, x = off + (1 - a * a) * r * 0.55;
      p.dot(x, y, C[2], 0.55 - k * 0.15);
    }
  }
  for (let a = -1; a <= 1; a += 0.02) {
    const y = a * span, bow = (1 - a * a), x = bow * r * 0.55, w = thick * Math.pow(bow, 0.6);
    for (let d = 0; d <= w; d += 0.7) {
      const v = d / (w + 1e-6);
      p.px(x - d, y, v < 0.25 ? WHITE : v < 0.55 ? C[5] : v < 0.8 ? C[4] : C[3]);
    }
  }
  p.glow(r * 0.3, 0, span * 1.1, C[4], 0.35 + 0.1 * Math.sin(ph * 2));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), r = o.r, ph = PH(t);
  if (o.kind === "wave" || o.kind === "redWave") {
    // 검기: span = r (the game's span or radius), a shimmer runs along it.
    const span = o.kind === "wave" ? r * 1.15 : r, thick = o.kind === "wave" ? r * 0.38 : Math.max(5, r * 0.22);
    crescent(p, o.kind === "wave" ? r : r * 0.6, span, thick, C, ph);
    const s = Math.sin(ph) * span * 0.8;
    p.px(o.kind === "wave" ? r * 0.55 * (1 - (s / span) ** 2) + 1 : r * 0.33 * (1 - (s / span) ** 2) + 1, s, WHITE);
    p.light(r * 0.3, s, C[5], 0.6);
    return;
  }
  if (o.kind === "orb") {
    // 법력구: a hot core inside a turning ring of six beads, motes shed behind.
    const R = rng(o.seed);
    for (let i = 0; i < 7; i++) {
      const u = ((t / meta.duration) + i / 7) % 1, y = Math.sin(i * 2.4) * r * 0.5;
      p.dot(-r * 0.6 - u * r * 3, y + Math.sin(u * 6 + i) * 1.5, u < 0.5 ? C[5] : C[3], 1 - u);
    }
    p.glow(0, 0, r * 2.2, C[4], 0.55);
    p.circle(0, 0, r * 0.62, (d) => (d < 0.4 ? WHITE : d < 0.75 ? C[5] : C[4]));
    p.ring(0, 0, r * 0.66, 1, C[2]);
    for (let i = 0; i < 6; i++) {
      const g = ph + (i / 6) * TAU, bx = Math.cos(g) * r * 1.35, by = Math.sin(g) * r * 1.35 * 0.55;
      p.circle(bx, by, Math.max(1.2, r * 0.16), Math.sin(g) > 0 ? C[6] : C[2]);
    }
    return;
  }
  if (o.kind === "beam") {
    // 빛줄기: a long streak with a white head, pulses running back along it.
    const L = r * 8;
    p.glowLine(-L, 0, 0, 0, r * 1.4, C[4], 0.45);
    p.beam(-L, 0, 2, 0, r * 1.2, (u, v) => (v < 0.35 ? (u > 0.6 ? WHITE : C[5]) : C[4]), (u) => (u < 0.25 ? u / 0.25 : 1));
    for (let k = 0; k < 3; k++) {
      const u = ((t / meta.duration) * 2 + k / 3) % 1, x = -u * L;
      p.line(x, -r * 0.5, x, r * 0.5, WHITE, 1 - u);
    }
    p.circle(0, 0, r * 0.7, WHITE);
    p.glow(0, 0, r * 2.5, C[5], 0.6);
    return;
  }
  if (o.kind === "boulder") {
    // 바위: rolling forward, its knobs and cracks coming over the top; shadow below, dust behind.
    const S = fit(o.stone ?? ["#2e241c", "#5a4e44", "#7d7468", "#a89e90", "#cfc6b6"], 5);
    p.disc(2, r * 0.35, r * 1.05, S[0], 0.35);
    for (let k = 0; k < 4; k++) {
      const u = ((t / meta.duration) + k / 4) % 1;
      p.disc(-r * (0.9 + u * 1.4), r * 0.5 + Math.sin(k * 3) * r * 0.3, r * (0.2 + u * 0.3), hex("#8a7660"), 0.4 * (1 - u));
    }
    const roll = (t / meta.duration) * TAU; // one turn a loop
    p.shade(-r - 1, -r - 1, r + 1, r + 1, (x, y, out) => {
      const rr = r * (0.9 + 0.1 * Math.sin(Math.atan2(y, x) * 5 + 1));
      const d = Math.hypot(x, y);
      if (d > rr) return;
      // Sphere surface: the x seen is sin of the longitude, spun by roll.
      const lon = Math.asin(clamp(x / rr, -1, 1)) + roll, lat = Math.asin(clamp(y / rr, -1, 1));
      const n = Math.sin(lon * 3) * Math.cos(lat * 2.5) + 0.5 * Math.sin(lon * 7 + lat * 5);
      const lit = -x * 0.35 - y * 0.55 + (rr - d) * 0.6;
      let i = 2 + (lit > r * 0.25 ? 1 : 0) + (lit > r * 0.6 ? 1 : 0) - (lit < -r * 0.25 ? 1 : 0);
      if (n > 0.95) i -= 1; // cracks and pits
      if (d > rr - 1.2) i = 0; // outline
      out.c = S[clamp(i, 0, 4)];
    });
    return;
  }
  if (o.kind === "arrow") {
    // 화살: a shaft, a steel head catching the light, fletching that flutters.
    const W = hex("#7a5a34"), H = hex("#c8ccd2"), F = hex("#e8e2d0"), D = hex("#2a2018");
    p.line(-r, 0, r * 0.7, 0, W);
    p.tri(r * 0.7, -2, r * 0.7, 2, r * 1.15, 0, H);
    p.px(r * 1.05, 0, WHITE);
    const fl = Math.sin(ph * 2) > 0 ? 1 : 0;
    p.line(-r, -1, -r * 0.6, -2 - fl, F);
    p.line(-r, 1, -r * 0.6, 2 + fl, F);
    p.px(-r - 1, 0, D);
    for (let k = 1; k <= 3; k++) p.dot(-r - k * 4, 0, F, 0.5 - k * 0.12);
    return;
  }
}
