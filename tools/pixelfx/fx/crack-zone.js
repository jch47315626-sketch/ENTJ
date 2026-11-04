// 패왕도 갈라진 땅: the floor splits where the blade lands. Top-down, the split runs along the aim (right); the
// zone hurts within a true circle of radius r, its edge scorched, a glowing fissure through it cooling to a scar.
import { Rng, fit, seg, ease, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, chunk, puff, mote, floorRing } from "./_td.js";

export const meta = {
  name: "Crack zone",
  desc: "The floor splits along the blow: a fissure glowing with heat runs through a scorched circle, branches crack off it, chips jump, embers rise and it cools to a dark scar.",
  tags: ["ground", "crack", "fire", "zone", "top-down", "one-shot"],
  size: [180, 200],
  origin: [90, 110],
  duration: 1.25,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1a0e08", "#4a1a0c", "#8a2a10", "#d0501a", "#ff8a2a", "#ffd060", "#fff4c0"],
    stone: ["#2e241c", "#5a4636", "#86705a", "#b39c80"],
    r: 54,
    seed: 4,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), S = fit(o.stone, 4), R = new Rng(o.seed), r = o.r;
  // The main fissure along x, and branches off it.
  const main = [];
  for (let x = -r * 0.95, y = 0; x <= r * 0.95; x += R.range(4, 7)) {
    y = Math.max(-5, Math.min(5, y + R.range(-2.2, 2.2)));
    main.push([x, y]);
  }
  const branches = [];
  for (let i = 0; i < 7; i++) {
    const s = main[1 + Math.floor(R.next() * (main.length - 2))];
    let g = (R.chance(0.5) ? 1 : -1) * R.range(0.6, 1.3) + (s[0] > 0 ? 0 : Math.PI) * 0, x = s[0], y = s[1];
    const pts = [[x, y]], L = r * R.range(0.25, 0.55);
    for (let d = 0; d < L; d += 5) {
      g += R.range(-0.4, 0.4);
      x += Math.cos(g) * 5 * (s[0] < 0 ? -1 : 1);
      y += Math.sin(g) * 5;
      if (Math.hypot(x, y) > r * 0.95) break;
      pts.push([x, y]);
    }
    branches.push(pts);
  }
  const bits = new Bodies();
  for (let i = 0; i < 10; i++) {
    const s = main[Math.floor(R.next() * main.length)], vz = R.range(90, 160);
    bits.add({ kind: "chip", x: s[0], y: s[1], z: 1, vx: R.range(-30, 30), vy: R.range(-40, 40), vz, life: R.range(0.6, 0.9), size: R.int(2, 3), seed: R.next() });
  }
  for (let i = 0; i < 14; i++) {
    const s = main[Math.floor(R.next() * main.length)];
    bits.add({ kind: "ember", x: s[0], y: s[1], z: 1, vx: R.range(-6, 6), vy: R.range(-6, 6), vz: R.range(20, 45), g: 0, drag: 0.6, life: R.range(0.4, 0.8), delay: R.range(0.05, 0.7) });
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
    },
    draw(p) {
      const D = meta.duration, fade = 1 - seg(t, D - 0.3, D - 0.02), heat = 1 - seg(t, 0.1, D - 0.2);
      if (fade <= 0) return;
      // The zone: a scorched disc out to r and its edge.
      p.disc(0, 0, r, C[0], (d) => 0.32 * fade * (0.6 + 0.4 * d));
      floorRing(p, r, 1, heat > 0.5 ? C[3] : C[2], fade * 0.9);
      const grow = ease.outQuart(seg(t, 0, 0.12));
      // Fissure: dark lips with a glowing seam, opening as it grows.
      const n = Math.max(2, Math.ceil(main.length * grow));
      const seam = main.slice(Math.floor((main.length - n) / 2), Math.floor((main.length - n) / 2) + n);
      for (let j = 1; j < seam.length; j++) {
        const [ax, ay] = seam[j - 1], [bx, by] = seam[j];
        p.line(ax, ay - 1, bx, by - 1, S[0], fade);
        p.line(ax, ay + 1, bx, by + 1, S[3], fade);
        p.line(ax, ay, bx, by, heat > 0.6 ? C[6] : heat > 0.3 ? C[4] : C[2], fade);
        if (heat > 0) p.glow(ax, ay, 9, C[4], 0.35 * heat);
      }
      for (const b of branches) {
        const m = Math.max(1, Math.ceil(b.length * seg(t, 0.04, 0.2)));
        p.polyline(b.slice(0, m), heat > 0.5 ? C[3] : S[0], fade);
      }
      if (t < 0.08) p.circle(0, 0, 8, WHITE);
      for (const b of bits.live()) b.kind === "chip" ? chunk(p, b, S) : mote(p, b, C[5], 0.5);
    },
  };
}
