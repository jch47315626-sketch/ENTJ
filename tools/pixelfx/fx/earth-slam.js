// 땅 울림: a boulder bursts or a foe is slammed down. Top-down: the shock front runs out to a true circle of
// radius r (the hit area) on the floor, cracks split out from the centre, rocks fly up and land inside it.
import { Rng, fit, seg, ease, TAU, WHITE, mix, hex } from "../../core/index.js";
import { Bodies, spark, chunk, puff, floorRing } from "./_td.js";

export const meta = {
  name: "Earth slam",
  desc: "A white flash, a shock front races across the floor to the edge of the blast, cracks split from a crater, rocks fly up and clatter down inside the ring, dust rolls up.",
  tags: ["impact", "ground", "rocks", "dust", "top-down", "one-shot"],
  size: [260, 330],
  origin: [130, 200],
  duration: 1.5,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2a1712", "#5e2c1c", "#a4502a", "#e8893a", "#ffc764", "#fff0b4", "#ffffff"],
    stone: ["#2e241c", "#5a4636", "#86705a", "#b39c80"],
    dust: "#8a7660",
    r: 100,
    seed: 5,
  },
};

const WAVE = 0.32; // seconds for the front to reach r

export function create(o) {
  const C = fit(o.palette, 7), S = fit(o.stone, 4), D = hex(o.dust), R = new Rng(o.seed), r = o.r;
  const bits = new Bodies(), dust = new Bodies();
  // Rocks: thrown so they come down inside the ring.
  for (let i = 0; i < 16; i++) {
    const g = R.range(0, TAU), vz = R.range(150, 260), flight = (2 * vz) / 560, land = r * R.range(0.25, 0.85);
    const sp = land / flight;
    bits.add({ kind: "rock", x: Math.cos(g) * 4, y: Math.sin(g) * 4, z: 3, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz, life: R.range(0.9, 1.3), size: R.int(3, 5), seed: R.next(), bounce: 0.3, delay: R.range(0, 0.04) });
  }
  for (let i = 0; i < 22; i++) {
    const g = R.range(0, TAU), sp = R.range(120, 260);
    bits.add({ kind: "spark", x: 0, y: 0, z: 2, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(40, 160), life: R.range(0.2, 0.42), drag: 3, bounce: 0.25 });
  }
  // Dust rolls up where the front passes, the ring of it sitting on the edge at the end.
  for (let i = 0; i < 30; i++) {
    const g = (i / 30) * TAU + R.range(-0.08, 0.08), d = r * R.range(0.85, 1.0);
    dust.add({ x: Math.cos(g) * d, y: Math.sin(g) * d, z: 0, vx: Math.cos(g) * 14, vy: Math.sin(g) * 14, vz: R.range(6, 18), g: 0, drag: 1.5, life: R.range(0.7, 1.05), size: R.range(4, 7), grow: 4, delay: WAVE * R.range(0.85, 1.0) });
  }
  for (let i = 0; i < 10; i++) {
    const g = R.range(0, TAU), d = R.range(0, 14);
    dust.add({ x: Math.cos(g) * d, y: Math.sin(g) * d, z: R.range(2, 10), vx: Math.cos(g) * 20, vy: Math.sin(g) * 20, vz: R.range(20, 45), g: 0, drag: 1.2, life: R.range(0.8, 1.2), size: R.range(5, 9), grow: 6, delay: R.range(0.05, 0.15) });
  }
  // Cracks: jagged lines out from the crater.
  const cracks = [];
  for (let i = 0; i < 8; i++) {
    let g = (i / 8) * TAU + R.range(-0.25, 0.25), x = Math.cos(g) * 9, y = Math.sin(g) * 9;
    const pts = [[x, y]], len = r * R.range(0.45, 0.75);
    for (let d = 9; d < len; d += R.range(5, 9)) {
      g += R.range(-0.4, 0.4);
      x += Math.cos(g) * 7;
      y += Math.sin(g) * 7;
      pts.push([x, y]);
    }
    cracks.push(pts);
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      dust.update(dt);
    },
    draw(p) {
      const fade = 1 - seg(t, 0.95, 1.4);
      // Crater: a dent, its far rim in shadow and its near rim catching the light.
      if (fade > 0) {
        p.circle(0, 0, 11, S[0], 0.85 * fade);
        p.arc(0, 0, 12, 2, Math.PI * 1.05, Math.PI * 1.95, S[1], fade);
        p.arc(0, 0, 12, 2, Math.PI * 0.05, Math.PI * 0.95, S[3], fade);
      }
      // Cracks: glowing hot at first, then dark seams.
      const grow = ease.outQuart(seg(t, 0, WAVE * 0.8)), hot = 1 - seg(t, 0.1, 0.6);
      for (const pts of cracks) {
        const n = Math.max(2, Math.ceil(pts.length * grow));
        const sub = pts.slice(0, n);
        p.polyline(sub, hot > 0.4 ? C[4] : S[0], fade);
        if (hot > 0) for (const [x, y] of sub) p.light(x, y, C[3], 0.5 * hot);
      }
      // The shock front: a bright line on the floor running out to r, a thin trailing ring behind it.
      const u = seg(t, 0, WAVE), front = r * ease.outQuart(u);
      if (t < WAVE + 0.25) {
        const k = 1 - seg(t, WAVE, WAVE + 0.25);
        p.glowRing(0, 0, front, 7, C[4], 0.55 * k);
        floorRing(p, front, 3, u < 0.5 ? WHITE : C[5], k);
        floorRing(p, front * 0.82, 1, C[3], 0.7 * k);
      }
      // The edge of the blast stays marked a moment so the area reads.
      const edge = seg(t, WAVE, WAVE + 0.05) * (1 - seg(t, 0.6, 1.1));
      if (edge > 0) floorRing(p, r, 1, C[3], edge);
      // Flash.
      if (t < 0.12) {
        const k = 1 - t / 0.12;
        p.circle(0, 0, (14 * (1 - k * 0.3)) * Math.min(1, k * 2.2), WHITE);
        p.glow(0, 0, 60, C[5], 0.8 * k);
      }
      p.glow(0, 0, r * 1.1, C[3], 0.25 * (1 - seg(t, 0, 0.5)));
      for (const b of dust.live()) puff(p, b, D, 0.55);
      for (const b of bits.live()) b.kind === "rock" ? chunk(p, b, S) : spark(p, b, C);
    },
  };
}
