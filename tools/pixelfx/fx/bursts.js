// 한 번 터지는 것들, top-down: floor shapes are true circles of radius r (the hit area where there is one).
//   lotus       미륵석장: a gold lotus opens flat on the floor and bursts.
//   thunderHit  벽력금강저: where a sky bolt lands: a white flash, a scorch, a ring and sparks.
//   arrival     통솔 / 신숭겸: someone steps in: a flash of light, a column, a ring of dust.
//   arrowVolley 고려 신궁대: fire arrows streak down into the circle and stick, flaring.
//   eye         관심법: an eye opens over a swayed soldier (or, big, over 궁예), looks round, and shuts.
import { Rng, fit, seg, ease, clamp, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, spark, puff, mote, floorRing, dottedRing } from "./_td.js";
import { eye } from "./marks.js";

export const meta = {
  name: "Bursts",
  desc: "Short top-down bursts: a gold lotus opening, a lightning strike's landing, a warrior arriving in light, fire arrows raining into a circle.",
  tags: ["burst", "top-down", "one-shot"],
  size: [300, 340],
  origin: [150, 210],
  duration: 1.0,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    kind: "lotus",
    palette: ["#3a2408", "#6e4710", "#a87418", "#e0a82a", "#ffd84a", "#fff09a", "#ffffff"],
    dust: "#8a7660",
    r: 46,
    h: 0,
    seed: 3,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), r = o.r, DUST = hex(o.dust);
  const bits = new Bodies(), soft = new Bodies();
  const k = o.kind;
  if (k === "lotus" || k === "thunderHit") {
    for (let i = 0; i < (k === "lotus" ? 16 : 20); i++) {
      const g = R.range(0, TAU), sp = R.range(70, 170) * (r / 40);
      bits.add({ kind: "spark", x: 0, y: 0, z: 3, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(30, 130), life: R.range(0.2, 0.4), drag: 3, delay: k === "lotus" ? 0.12 : 0 });
    }
    for (let i = 0; i < 10; i++) {
      const g = R.range(0, TAU), d = r * R.range(0.3, 0.9);
      bits.add({ kind: "mote", x: Math.cos(g) * d, y: Math.sin(g) * d, z: 2, vz: R.range(20, 40), g: 0, drag: 0.5, life: R.range(0.35, 0.6), delay: R.range(0.15, 0.35) });
    }
  }
  if (k === "arrival") {
    for (let i = 0; i < 12; i++) {
      const g = (i / 12) * TAU + R.range(-0.2, 0.2);
      soft.add({ x: Math.cos(g) * r * 0.5, y: Math.sin(g) * r * 0.5, z: 0, vx: Math.cos(g) * r * 2.4, vy: Math.sin(g) * r * 2.4, vz: R.range(5, 15), g: 0, drag: 5, life: R.range(0.4, 0.55), size: R.range(2.5, 4) * (r / 16), grow: 2, delay: 0.05 });
    }
    for (let i = 0; i < 8; i++) {
      const g = R.range(0, TAU), d = r * R.range(0.2, 0.8);
      bits.add({ kind: "mote", x: Math.cos(g) * d, y: Math.sin(g) * d, z: R.range(4, 20), vz: R.range(25, 50), g: 0, drag: 0.4, life: R.range(0.3, 0.5), delay: R.range(0.05, 0.2) });
    }
  }
  // Fire arrows: each lands at a spot inside the circle at its own moment.
  const arrows = [];
  if (k === "arrowVolley")
    for (let i = 0; i < 22; i++) {
      const g = R.range(0, TAU), d = r * Math.sqrt(R.next()) * 0.92;
      arrows.push({ x: Math.cos(g) * d, y: Math.sin(g) * d, t0: R.range(0, 0.28), sk: R.range(-0.25, 0.25) });
    }
  arrows.sort((a, b) => a.y - b.y);
  const FALL = 0.12, H = 150;
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      soft.update(dt);
    },
    draw(p) {
      if (k === "lotus") {
        // Eight petals open flat around the spot, out to r, then the bloom flares and fades.
        // Petals open to r, then fold shut toward the centre as it fades (no dither).
        const open = Math.min(1, ease.outCubic(seg(t, 0, 0.16))), shut = 1 - ease.inQuad(seg(t, 0.32, 0.62));
        const size = open * shut;
        if (size > 0.05)
          for (let layer = 0; layer < 2; layer++)
            for (let i = 0; i < 8; i++) {
              const g = (i / 8) * TAU + layer * (TAU / 16), L = r * size * (layer ? 0.6 : 1), w = L * 0.3;
              const pts = [];
              for (let a = 0; a <= 1.0001; a += 0.1) {
                const half = Math.sin(Math.PI * a) * w * (1 - a * 0.35);
                pts.push([Math.cos(g) * L * a - Math.sin(g) * half, Math.sin(g) * L * a + Math.cos(g) * half]);
              }
              for (let a = 1; a >= 0; a -= 0.1) {
                const half = Math.sin(Math.PI * a) * w * (1 - a * 0.35);
                pts.push([Math.cos(g) * L * a + Math.sin(g) * half, Math.sin(g) * L * a - Math.cos(g) * half]);
              }
              // A soft translucent body, a bright rim and a vein down the middle.
              p.poly(pts, layer ? C[4] : C[2], 0.999);
              p.polyline(pts, layer ? WHITE : C[5]);
              p.line(0, 0, Math.cos(g) * L * 0.8, Math.sin(g) * L * 0.8, layer ? C[6] : C[4]);
            }
        if (t < 0.12) p.circle(0, 0, 9 * (1 - t / 0.12) + 2, WHITE);
        p.glow(0, 0, r * 1.4, C[4], 0.6 * (1 - seg(t, 0.05, 0.5)));
        const ring = seg(t, 0.12, 0.35);
        if (ring > 0 && ring < 1) floorRing(p, r * (0.85 + 0.15 * ring), 1, C[5], 1 - ring);
      }
      if (k === "thunderHit") {
        const u = seg(t, 0, 0.5);
        p.disc(0, 0, r * 0.6, C[1], 0.25 * (1 - seg(t, 0.1, 0.45)));
        if (t < 0.08) p.circle(0, 0, r * 0.5 * (1 - t / 0.08) + 3, WHITE);
        p.glow(0, 0, r * 2, C[4], 0.7 * (1 - u));
        if (u < 1) {
          floorRing(p, r * ease.outQuart(u), 2, u < 0.3 ? WHITE : C[4], 1 - u);
          dottedRing(p, r * 0.6 * ease.outQuart(u), 18, C[5], 1 - u, t * 4);
        }
      }
      if (k === "arrival") {
        const u = seg(t, 0, 0.5);
        // A short column of light where they land.
        if (t < 0.3) {
          const w = r * 0.6 * (1 - seg(t, 0.08, 0.3));
          p.glowLine(0, -r * 4, 0, 0, w * 2, C[4], 0.5);
          // Tapers to a thread at the top instead of dithering out.
          p.poly([[-w / 2, 0], [w / 2, 0], [0.5, -r * 4], [-0.5, -r * 4]], C[5]);
          p.poly([[-w / 4, 0], [w / 4, 0], [0.2, -r * 3.5], [-0.2, -r * 3.5]], WHITE);
        }
        floorRing(p, r * ease.outQuart(u), 1, C[5], 1 - u);
        p.glow(0, -4, r * 1.5, C[4], 0.5 * (1 - u));
        for (const b of soft.live()) puff(p, b, DUST, 0.5);
      }
      if (k === "arrowVolley") {
        for (const a of arrows) {
          const q = (t - a.t0) / FALL;
          if (q < 0) continue;
          if (q < 1) {
            // Streaking down: the head at height H*(1-q), the trail above it.
            const z = H * (1 - ease.inQuad(q)), x = a.x + a.sk * z;
            p.line(x + a.sk * 28 - 1, a.y - z - 28, x - 1, a.y - z, (v) => (v > 0.5 ? C[4] : C[2]));
            p.line(x + a.sk * 28, a.y - z - 28, x, a.y - z, (v) => (v > 0.75 ? WHITE : v > 0.35 ? C[5] : C[3]));
            p.glow(x, a.y - z, 8, C[4], 0.6);
          } else {
            // Stuck: a short shaft standing up, its head buried, a flare that dies to an ember.
            const s = (t - a.t0 - FALL) / 0.5;
            if (s > 1) continue;
            p.line(a.x + a.sk * 10, a.y - 11, a.x, a.y, hex("#5a3a20"));
            p.line(a.x + a.sk * 10 + 1, a.y - 11, a.x + 1, a.y, hex("#2a1a10"));
            p.px(a.x + a.sk * 10, a.y - 11, s < 0.6 ? C[5] : C[3]);
            if (s < 0.35) {
              p.circle(a.x, a.y, 5 * (1 - s / 0.35) + 1, s < 0.12 ? WHITE : C[5]);
              p.glow(a.x, a.y, 20, C[4], 0.8 * (1 - s / 0.35));
            }
          }
        }
      }
      if (k === "eye") {
        // Opens fast, looks left and right, shuts; held o.h above the anchor (the head).
        const D = o.life ?? 0.9, open = Math.min(seg(t, 0, 0.12), 1 - seg(t, D - 0.18, D));
        if (open > 0) {
          const look = Math.sin(seg(t, 0.15, D - 0.2) * TAU);
          p.glow(0, -o.h, r * 2, C[4], 0.5 * open);
          eye(p, 0, -o.h, r, ease.outBack(open), C, look);
          if (t < 0.1) p.ring(0, -o.h, r * (1.2 + t * 8), 1, C[5]);
        }
      }
      for (const b of bits.live()) b.kind === "spark" ? spark(p, b, C) : mote(p, b, C[5]);
    },
  };
}
