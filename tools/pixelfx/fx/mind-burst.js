// 독심 폭발: a swayed soldier falls and bursts. Top-down: violet motes spiral in, a dark orb swells over the
// spot, then a shock ring runs out over the floor to a true circle of radius r and wisps roll outward.
import { Rng, fit, seg, ease, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, spark, mote, puff, floorRing, dottedRing } from "./_td.js";

export const meta = {
  name: "Mind burst",
  desc: "Violet motes spiral in to a dark orb over the fallen, it pops in a white-violet flash, a shock ring runs out across the floor and violet wisps roll outward and thin.",
  tags: ["shadow", "arcane", "burst", "top-down", "one-shot"],
  size: [280, 300],
  origin: [140, 160],
  duration: 1.25,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#12081e", "#2c1248", "#4e1e80", "#7a34b8", "#a85ce8", "#d4a0ff", "#f6e8ff"],
    r: 80,
    seed: 6,
  },
};

const POP = 0.22, Z = 14; // when it bursts; the orb's height

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), r = o.r;
  const bits = new Bodies(), wisps = new Bodies();
  for (let i = 0; i < 26; i++) {
    const g = R.range(0, TAU), sp = R.range(110, 230) * (r / 80);
    bits.add({ kind: "spark", x: 0, y: 0, z: Z, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(-20, 90), life: R.range(0.25, 0.5), drag: 3, delay: POP });
  }
  for (let i = 0; i < 18; i++) {
    const g = R.range(0, TAU), d = r * R.range(0.4, 0.9);
    bits.add({ kind: "mote", x: Math.cos(g) * d, y: Math.sin(g) * d, z: R.range(0, 6), vx: 0, vy: 0, vz: R.range(15, 35), g: 0, drag: 0.6, life: R.range(0.4, 0.7), delay: POP + R.range(0.1, 0.4) });
  }
  for (let i = 0; i < 16; i++) {
    const g = (i / 16) * TAU + R.range(-0.1, 0.1), sp = r * R.range(1.3, 1.8);
    wisps.add({ x: Math.cos(g) * 6, y: Math.sin(g) * 6, z: R.range(2, 10), vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(5, 20), g: 0, drag: 3.2, life: R.range(0.55, 0.85), size: R.range(4, 7), grow: 4, delay: POP + R.range(0, 0.05) });
  }
  // Motes that spiral in before the pop.
  const inward = [];
  for (let i = 0; i < 16; i++) inward.push({ g: R.range(0, TAU), d: r * R.range(0.6, 1.0), t0: R.range(0, 0.06) });
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      wisps.update(dt);
    },
    draw(p) {
      // Gathering: motes swirl in to the orb.
      for (const m of inward) {
        const u = seg(t, m.t0, POP);
        if (u <= 0 || u >= 1) continue;
        const d = m.d * (1 - ease.inQuad(u)), g = m.g + u * 2.4;
        const x = Math.cos(g) * d, y = Math.sin(g) * d - Z * u;
        p.line(x, y, x + Math.cos(g + 1.2) * 4, y + Math.sin(g + 1.2) * 4, C[4], 1);
        p.px(x, y, C[6]);
        p.light(x, y, C[5], 0.4);
      }
      // The orb: dark core with a lit rim, swelling until the pop.
      if (t < POP + 0.05) {
        const u = seg(t, 0, POP), rr = 3 + 7 * ease.inQuad(u);
        p.glow(0, -Z, rr * 3, C[4], 0.6 * u);
        p.circle(0, -Z, rr + 1, C[5]);
        p.circle(0, -Z, rr, C[0]);
        p.disc(0, 0, rr, C[0], 0.4);
      }
      // Pop.
      if (t >= POP && t < POP + 0.12) {
        const k = 1 - (t - POP) / 0.12;
        p.circle(0, -Z, (12 * (1.3 - k * 0.3)) * Math.min(1, k * 2.2), WHITE);
        p.glow(0, -Z, 60, C[5], 0.9 * k);
      }
      // Shock ring to r.
      const u = seg(t, POP, POP + 0.3), rr = r * ease.outQuart(u), k = 1 - seg(t, POP + 0.25, POP + 0.5);
      if (u > 0 && k > 0) {
        p.glowRing(0, 0, rr, 6, C[4], 0.55 * k);
        floorRing(p, rr, 2, u < 0.35 ? WHITE : C[5], k);
        dottedRing(p, rr * 0.75, 28, C[4], 0.8 * k, t * 3);
      }
      // The edge, held a moment.
      const edge = seg(t, POP + 0.28, POP + 0.32) * (1 - seg(t, 0.7, 1.05));
      if (edge > 0) floorRing(p, r, 1, C[3], edge);
      for (const b of wisps.live()) puff(p, b, C[3], 0.5);
      for (const b of bits.live()) b.kind === "spark" ? spark(p, b, C) : mote(p, b, C[5]);
    },
  };
}
