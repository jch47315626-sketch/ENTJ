// 호랑이 기세: the hero's fury bursts out. Top-down: two shock rings run out over the floor to a true circle of
// radius r, roar lines streak outward along the floor, and a crown of red flame flares up round the hero.
import { Rng, fit, seg, ease, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, spark, mote, puff, floorRing, tongue } from "./_td.js";

export const meta = {
  name: "Tiger roar",
  desc: "A white-hot flash at the hero, two red shock rings race out across the floor, roar streaks fly outward, a crown of red flame leaps up round the hero and sheds embers.",
  tags: ["buff", "rage", "fire", "shockwave", "top-down", "one-shot"],
  size: [300, 330],
  origin: [150, 190],
  duration: 1.3,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2a0608", "#5a0e10", "#9a1a14", "#d8341a", "#ff6a24", "#ffb04a", "#fff0c0"],
    smoke: "#2e2224",
    r: 130,
    seed: 7,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), SM = hex(o.smoke), R = new Rng(o.seed), r = o.r;
  const bits = new Bodies(), smoke = new Bodies();
  for (let i = 0; i < 30; i++) {
    const g = R.range(0, TAU), sp = R.range(140, 300);
    bits.add({ kind: "spark", x: Math.cos(g) * 8, y: Math.sin(g) * 8, z: 6, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(30, 140), life: R.range(0.25, 0.5), drag: 2.6 });
  }
  for (let i = 0; i < 24; i++) {
    const g = R.range(0, TAU), d = R.range(6, 20);
    bits.add({ kind: "ember", x: Math.cos(g) * d, y: Math.sin(g) * d, z: R.range(4, 20), vx: Math.cos(g) * 12, vy: Math.sin(g) * 12, vz: R.range(30, 70), g: 0, drag: 0.6, life: R.range(0.5, 0.9), delay: R.range(0.05, 0.4) });
  }
  for (let i = 0; i < 8; i++) {
    const g = R.range(0, TAU);
    smoke.add({ x: Math.cos(g) * 10, y: Math.sin(g) * 10, z: 20, vx: Math.cos(g) * 10, vy: Math.sin(g) * 10, vz: R.range(18, 30), g: 0, drag: 0.5, life: R.range(0.6, 0.85), size: R.range(5, 8), grow: 5, delay: R.range(0.3, 0.5) });
  }
  // Flames ringing the hero, back ones first.
  const crown = [];
  for (let i = 0; i < 14; i++) {
    const g = (i / 14) * TAU, d = 16 + R.range(-2, 3);
    crown.push({ x: Math.cos(g) * d, y: Math.sin(g) * d * 0.9, h: R.range(18, 30), w: R.range(3, 4.5), ph: R.range(0, TAU), t0: R.range(0, 0.06), life: R.range(0.55, 0.85) });
  }
  crown.sort((a, b) => a.y - b.y);
  // Roar streaks along the floor.
  const lines = [];
  for (let i = 0; i < 18; i++) lines.push({ g: (i / 18) * TAU + R.range(-0.08, 0.08), t0: R.range(0, 0.08), len: R.range(18, 34), sp: R.range(0.9, 1.1) });
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      smoke.update(dt);
    },
    draw(p) {
      // Scorched ring under the hero.
      const sc = 1 - seg(t, 0.7, 1.2);
      if (sc > 0) p.disc(0, 0, 24, C[0], (d) => 0.5 * sc * (1 - d * d));
      // Two shock rings to r.
      for (const [d0, w, k0] of [[0, 3, 1], [0.08, 2, 0.7]]) {
        const u = seg(t, d0, d0 + 0.38), rr = r * ease.outQuart(u), k = k0 * (1 - seg(t, d0 + 0.3, d0 + 0.55));
        if (k <= 0 || u <= 0) continue;
        p.glowRing(0, 0, rr, 7, C[4], 0.5 * k);
        floorRing(p, rr, w, u < 0.35 ? WHITE : C[5], k);
        floorRing(p, rr - w - 2, 1, C[3], 0.7 * k);
      }
      // The edge, held a moment.
      const edge = seg(t, 0.36, 0.42) * (1 - seg(t, 0.6, 1.0));
      if (edge > 0) floorRing(p, r, 1, C[3], edge);
      // Roar streaks.
      for (const L of lines) {
        const u = seg(t, L.t0, L.t0 + 0.4 * L.sp);
        if (u <= 0 || u >= 1) continue;
        const d = r * 0.15 + r * 0.8 * ease.outCubic(u), c = Math.cos(L.g), s = Math.sin(L.g), len = L.len * (1 - u * 0.6);
        p.line(c * (d - len), s * (d - len), c * d, s * d, (v) => C[3 + Math.round(v * 3)], 1 - u);
      }
      // Flash.
      if (t < 0.1) {
        const k = 1 - t / 0.1;
        p.circle(0, -12, (14) * Math.min(1, k * 2.2), WHITE);
        p.glow(0, -10, 70, C[5], 0.9 * k);
      }
      p.glow(0, -14, 50, C[4], 0.45 * (1 - seg(t, 0.1, 0.9)));
      for (const b of smoke.live()) puff(p, b, SM, 0.45);
      for (const f of crown) {
        const a = t - f.t0;
        if (a < 0 || a > f.life) continue;
        const q = a / f.life, k = q < 0.12 ? q / 0.12 : 1 - ease.inQuad(seg(q, 0.3, 1));
        tongue(p, f.x, f.y, f.h, f.w, C, f.ph + t * 16, k);
      }
      for (const b of bits.live()) b.kind === "spark" ? spark(p, b, C) : mote(p, b, (b.age / b.life) < 0.5 ? C[5] : C[3], 0.5);
    },
  };
}
