// 불길: fire arrows land and the ground catches. Top-down: a fire front spreads out over the floor to a true
// circle of radius r (the burning area), tongues of flame stand up all over the disc and burn down to embers.
import { Rng, fit, seg, ease, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, spark, puff, mote, floorRing, tongue } from "./_td.js";

export const meta = {
  name: "Fire bloom",
  desc: "A hot flash, then a ring of fire races across the floor to the edge of the burn, flames leaping up wherever it has passed and burning down to embers and smoke.",
  tags: ["fire", "ground", "aoe", "top-down", "one-shot"],
  size: [260, 300],
  origin: [130, 170],
  duration: 1.7,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#3a0e0c", "#7a1a12", "#c42c18", "#f0601c", "#ff9a2a", "#ffd04a", "#fff2a8"],
    smoke: "#3a302c",
    r: 110,
    seed: 3,
  },
};

const SPREAD = 0.42; // seconds for the front to reach r

export function create(o) {
  const C = fit(o.palette, 7), SM = hex(o.smoke), R = new Rng(o.seed), r = o.r;
  // Flames: spread evenly over the disc (sqrt for even area), lit when the front reaches them.
  const flames = [];
  const reach = (d) => SPREAD * (1 - Math.cbrt(1 - d / r)); // when ease.outCubic front gets to d
  for (let i = 0; i < 46; i++) {
    const g = R.range(0, TAU), d = r * Math.sqrt(R.range(0.01, 1)) * 0.9;
    flames.push({ x: Math.cos(g) * d, y: Math.sin(g) * d, t0: reach(d) + R.range(0, 0.06), life: R.range(0.55, 1.0), h: R.range(12, 22), w: R.range(2.6, 4.2), ph: R.range(0, TAU) });
  }
  // A wall of flame riding the front, standing on the edge once it gets there.
  for (let i = 0; i < 40; i++) {
    const g = (i / 40) * TAU + R.range(-0.05, 0.05), d = r * R.range(0.93, 0.99);
    flames.push({ x: Math.cos(g) * d, y: Math.sin(g) * d, t0: reach(Math.min(d, r * 0.995)) - 0.02, life: R.range(0.4, 0.7), h: R.range(14, 24), w: R.range(2.8, 4), ph: R.range(0, TAU) });
  }
  flames.sort((a, b) => a.y - b.y);
  const bits = new Bodies(), smoke = new Bodies();
  for (let i = 0; i < 26; i++) {
    const g = R.range(0, TAU), d = r * Math.sqrt(R.next()) * 0.9;
    bits.add({ kind: "ember", x: Math.cos(g) * d, y: Math.sin(g) * d, z: 4, vx: R.range(-8, 8), vy: R.range(-8, 8), vz: R.range(25, 60), g: 0, drag: 0.5, life: R.range(0.5, 1.0), delay: SPREAD * Math.pow(d / r, 1.6) + R.range(0.1, 0.5) });
  }
  for (let i = 0; i < 18; i++) {
    const g = R.range(0, TAU), sp = R.range(100, 220);
    bits.add({ kind: "spark", x: 0, y: 0, z: 3, vx: Math.cos(g) * sp, vy: Math.sin(g) * sp, vz: R.range(60, 150), life: R.range(0.2, 0.45), drag: 3 });
  }
  for (let i = 0; i < 14; i++) {
    const g = R.range(0, TAU), d = r * Math.sqrt(R.next()) * 0.85;
    smoke.add({ x: Math.cos(g) * d, y: Math.sin(g) * d, z: 10, vx: 0, vy: 0, vz: R.range(14, 26), g: 0, drag: 0.4, life: R.range(0.6, 0.9), size: R.range(5, 8), grow: 5, delay: R.range(0.55, 0.9) });
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      smoke.update(dt);
    },
    draw(p) {
      const u = seg(t, 0, SPREAD), front = r * ease.outCubic(u);
      // Scorch under it all, out to where the front has reached.
      const scorch = 1 - seg(t, 1.1, 1.6);
      if (scorch > 0) p.disc(0, 0, front, C[0], (d) => 0.3 * scorch * (1 - d * d * 0.5));
      // Warm light over the burn.
      p.glow(0, -4, front + 20, C[3], 0.45 * (1 - seg(t, 0.5, 1.4)));
      // The front: a bright crackling line on the floor.
      if (t < SPREAD + 0.15) {
        const k = 1 - seg(t, SPREAD, SPREAD + 0.15);
        floorRing(p, front, 2, (v, g) => (Math.sin(g * 23 + t * 40) > 0.2 ? C[6] : C[5]), k);
        p.glowRing(0, 0, front, 6, C[4], 0.6 * k);
      }
      // The edge of the burn: a dark-red line at exactly r while it burns.
      const edge = seg(t, SPREAD - 0.05, SPREAD) * (1 - seg(t, 1.0, 1.5));
      if (edge > 0) floorRing(p, r, 1, C[2], edge);
      // Flash at the strike.
      if (t < 0.1) {
        const k = 1 - t / 0.1;
        p.circle(0, 0, (10) * Math.min(1, k * 2.2), WHITE);
        p.glow(0, 0, 50, C[5], 0.9 * k);
      }
      for (const b of smoke.live()) puff(p, b, SM, 0.45);
      for (const f of flames) {
        const a = t - f.t0;
        if (a < 0 || a > f.life) continue;
        const q = a / f.life, k = q < 0.15 ? q / 0.15 : 1 - ease.inQuad(seg(q, 0.35, 1));
        tongue(p, f.x, f.y, f.h, f.w, C, f.ph + t * 14, k);
      }
      for (const b of bits.live()) b.kind === "spark" ? spark(p, b, C) : mote(p, b, (b.age / b.life) < 0.5 ? C[5] : C[3], 0.5);
    },
  };
}
