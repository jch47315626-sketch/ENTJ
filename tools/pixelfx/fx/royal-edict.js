// 어명: the king's word falls on one foe as a bolt of gold light. Top-down: the seal on the floor is a true
// circle of radius r around the foe's feet; the bolt comes straight down the screen onto them.
import { Rng, fit, clamp, seg, ease, TAU, WHITE } from "../../core/index.js";
import { Bodies, spark, mote, floorRing, dottedRing } from "./_td.js";

export const meta = {
  name: "Royal edict",
  desc: "A gold seal draws itself round a foe's feet, a bolt of light drops on them with a white flash, sparks skip across the floor and gold motes rise as the seal fades.",
  tags: ["holy", "strike", "top-down", "one-shot"],
  size: [130, 270],
  origin: [65, 220],
  duration: 1.05,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#3a2408", "#6e4710", "#a87418", "#e0a82a", "#ffd84a", "#fff09a", "#ffffff"], r: 26, height: 170, seed: 9 },
};

const HIT = 0.1; // the bolt lands

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), r = o.r, H = o.height;
  const bits = new Bodies();
  for (let i = 0; i < 26; i++) {
    const g = R.range(0, TAU), sp = R.range(90, 210) * (r / 26);
    bits.add({ kind: "spark", x: Math.cos(g) * 3, y: Math.sin(g) * 3, z: 2, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(60, 170), life: R.range(0.3, 0.6), delay: HIT, drag: 3.2, bounce: 0.3 });
  }
  for (let i = 0; i < 14; i++) {
    const g = R.range(0, TAU), d = r * R.range(0.7, 1.05);
    bits.add({ kind: "mote", x: Math.cos(g) * d, y: Math.sin(g) * d, z: 0, vx: 0, vy: 0, vz: R.range(18, 40), g: 0, drag: 0.6, life: R.range(0.4, 0.75), delay: HIT + R.range(0.08, 0.35) });
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
    },
    draw(p) {
      // The seal: a ring that draws itself round, a second ring inside, ticks like the edge of a seal.
      const draw = ease.outCubic(seg(t, 0, HIT + 0.04)), fade = 1 - seg(t, 0.55, 0.95);
      if (fade > 0) {
        const hot = 1 - seg(t, HIT, HIT + 0.25);
        p.glowRing(0, 0, r, 5, C[4], 0.45 * fade * draw);
        p.ring(0, 0, r + 1, 2, hot > 0.3 ? WHITE : C[5], (v, g) => (((g + TAU * 1.25) % TAU) / TAU <= draw ? fade : 0));
        if (t > HIT) {
          floorRing(p, r - 5, 1, C[4], fade);
          for (let i = 0; i < 8; i++) {
            const g = (i / 8) * TAU + t * 0.6;
            p.line(Math.cos(g) * (r - 4), Math.sin(g) * (r - 4), Math.cos(g) * (r - 1), Math.sin(g) * (r - 1), C[5], fade);
          }
          dottedRing(p, r + 4, 24, C[3], fade * 0.8, -t * 0.8);
        }
      }
      // Guide: a thin falling line just before the bolt.
      if (t < HIT) {
        const y0 = -H * (1 - t / HIT);
        p.line(0, Math.max(-H, y0 - 30), 0, y0, (u) => C[3 + Math.round(u * 2)], 0.8);
      }
      // The bolt.
      if (t >= HIT && t < HIT + 0.24) {
        const u = seg(t, HIT, HIT + 0.24), w = 12 * (1 - ease.inQuad(seg(u, 0.25, 1))) + 1;
        p.glowLine(0, -H, 0, 0, 14 * (1 - u) + 4, C[4], 0.7 * (1 - u));
        // Wide at the floor, a thin thread at the top; it thins from the top down as it fades.
        const top = -H + H * 0.6 * ease.inQuad(u);
        p.poly([[-w / 2, 0], [w / 2, 0], [w * 0.2 + 0.5, top], [-w * 0.2 - 0.5, top]], C[4]);
        p.poly([[-w / 4, 0], [w / 4, 0], [w * 0.1 + 0.3, top + 8], [-w * 0.1 - 0.3, top + 8]], WHITE);
        // A white ring snaps out to the seal, flat on the floor.
        const sr = r * ease.outQuart(seg(t, HIT, HIT + 0.12));
        if (u < 0.6) floorRing(p, sr, 3 * (1 - u), u < 0.3 ? WHITE : C[5]);
        if (u < 0.15) p.circle(0, 0, 7, WHITE);
      }
      // Flash and light pool.
      const k = 1 - seg(t, HIT, HIT + 0.5);
      if (t >= HIT && k > 0) {
        p.glow(0, 0, r * 2.2, C[4], 0.55 * k);
        p.glow(0, -6, 12, WHITE, 0.9 * k * k);
      }
      for (const b of bits.live()) b.kind === "spark" ? spark(p, b, C) : mote(p, b, C[5]);
    },
  };
}
