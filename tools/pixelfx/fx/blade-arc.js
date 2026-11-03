// 베기: a weapon's swing as seen from above. A crescent sweeps across the floor through `arc` degrees, facing
// right (the game turns it to the aim); its outer rim is exactly the reach r, so whatever the rim touches is hit.
// `heavy` swings (대도, 패왕) end in a slam: dust and a scar along the arc.
import { Rng, fit, seg, ease, clamp, TAU, WHITE, hex } from "../../core/index.js";
import { Bodies, spark, puff } from "./_td.js";

export const meta = {
  name: "Blade arc",
  desc: "A crescent of light sweeps across the floor through the swing's arc, white at its leading edge and rim, cooling behind; sparks fly off the tip. Heavy swings slam down in dust.",
  tags: ["melee", "slash", "top-down", "one-shot"],
  size: [480, 480],
  origin: [240, 240],
  duration: 0.42,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#0c1a3a", "#1c3a78", "#3a6ac0", "#6aa8f0", "#b0dcff", "#e8f6ff", "#ffffff"],
    r: 90,
    arc: 120,
    width: 0.42,
    heavy: false,
    dust: "#8a7660",
    seed: 2,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), r = o.r, full = o.arc >= 360;
  const span = (Math.min(o.arc, 360) * Math.PI) / 180, a0 = -span / 2;
  const SW = o.heavy ? 0.15 : 0.12; // the sweep
  const D = meta.duration;
  const bits = new Bodies(), dust = new Bodies();
  // Sparks thrown off the tip along the way, flying on along the swing.
  for (let i = 0; i < (o.heavy ? 14 : 9); i++) {
    const u = R.range(0.3, 1), g = a0 + span * ease.outQuart(u), d = r * R.range(0.85, 1);
    const tg = g + Math.PI / 2, sp = R.range(80, 200);
    bits.add({ x: Math.cos(g) * d, y: Math.sin(g) * d, z: 4, vx: Math.cos(tg) * sp + Math.cos(g) * 40, vy: Math.sin(tg) * sp + Math.sin(g) * 40, vz: R.range(20, 90), life: R.range(0.15, 0.3), delay: SW * u, drag: 4 });
  }
  if (o.heavy)
    for (let i = 0; i < 12; i++) {
      const g = a0 + span * R.next(), d = r * R.range(0.55, 0.95);
      dust.add({ x: Math.cos(g) * d, y: Math.sin(g) * d, z: 0, vx: Math.cos(g) * 20, vy: Math.sin(g) * 20, vz: R.range(8, 20), g: 0, drag: 2, life: R.range(0.25, 0.3), size: R.range(3, 6) * (r / 90), grow: 3, delay: SW * R.range(0.6, 1) });
    }
  const DUST = hex(o.dust);
  let t = 0;
  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      dust.update(dt);
    },
    draw(p) {
      const s = ease.outCubic(seg(t, 0, SW)), lead = a0 + span * s;
      const fade = 1 - seg(t, SW, D - 0.02);
      if (s <= 0 || fade <= 0) return;
      const thick = r * o.width * (0.15 + 0.85 * ease.outQuad(fade));
      // Heavy: a scar left on the floor along the arc.
      if (o.heavy && t > SW * 0.7) {
        const k = 1 - seg(t, SW, D);
        p.arc(0, 0, r * 0.8, 2, a0, a0 + span, C[1], 0.8 * k);
      }
      // The crescent: thickest just behind the leading edge, thinning to nothing at the tail.
      const tail = full ? Math.max(a0, lead - TAU * 0.85) : a0;
      if (lead - tail > 0.01) {
        p.arc(0, 0, r, (u) => thick * Math.pow(u, 0.7), tail, lead, (u, v) => {
          // Banded: deep at the inner edge and the tail, bright toward the rim and the edge.
          const hot = v * 0.65 + u * 0.35 - (1 - fade) * 0.3;
          return C[clamp(Math.floor(1 + hot * 4.4), 1, 5)];
        }, (u) => (u < 0.2 ? u / 0.2 : 1));
        // The rim at exactly r, white behind the edge.
        p.arc(0, 0, r, 1.6, Math.max(tail, lead - span * 0.6), lead, (u) => (u > 0.6 ? WHITE : C[5]), fade);
        // Light along the swept band only.
        for (let g = tail; g <= lead; g += 0.18) p.glow(Math.cos(g) * (r - thick * 0.4), Math.sin(g) * (r - thick * 0.4), thick * 0.9, C[4], 0.1 * fade * ((g - tail) / (lead - tail + 1e-6)));
        // Leading edge: a white blade line from the inner edge to the rim.
        if (s < 1 || t < SW + 0.04) {
          const c = Math.cos(lead), sn = Math.sin(lead);
          p.line(c * (r - thick), sn * (r - thick), c * r, sn * r, WHITE);
          p.glow(c * r * 0.9, sn * r * 0.9, 14, C[5], 0.6);
        }
      }
      for (const b of dust.live()) puff(p, b, DUST, 0.5);
      for (const b of bits.live()) spark(p, b, C, 0.02);
    },
  };
}
