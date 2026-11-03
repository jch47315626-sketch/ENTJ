// 독심 관심법: a violet wave runs out over the floor to a true circle of radius r (the sway reach), ringed with
// small open eyes, under a great eye's glow; it hangs a moment at the edge and fades.
import { Rng, fit, seg, ease, TAU, WHITE } from "../../core/index.js";
import { floorRing, dottedRing } from "./_td.js";
import { eye } from "./marks.js";

export const meta = {
  name: "Mind wave",
  desc: "A violet wave races out across the floor to the edge of the sway, eyes opening round its rim, a ring of runes turning inside it, then it hangs and fades.",
  tags: ["arcane", "shadow", "wave", "top-down", "one-shot"],
  size: [380, 380],
  origin: [190, 190],
  duration: 1.2,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#12081e", "#2c1248", "#4e1e80", "#7a34b8", "#a85ce8", "#d4a0ff", "#f6e8ff"],
    r: 170,
    seed: 6,
  },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 7), r = o.r;
  const u = seg(t, 0, 0.45), front = r * ease.outCubic(u), fade = 1 - seg(t, 0.75, 1.15);
  if (fade <= 0) return;
  p.disc(0, 0, front, C[2], (d) => 0.18 * fade * d * d);
  p.glowRing(0, 0, front, 10, C[4], 0.45 * fade);
  floorRing(p, front, 2, u < 0.5 ? WHITE : C[5], fade);
  dottedRing(p, front * 0.7, 48, C[4], fade, t * 1.5);
  dottedRing(p, front * 0.45, 32, C[3], fade, -t * 2);
  // Eyes open round the rim once the wave gets there.
  const eyes = 10;
  for (let i = 0; i < eyes; i++) {
    const g = (i / eyes) * TAU + 0.3, open = Math.min(seg(t, 0.35 + i * 0.015, 0.5 + i * 0.015), fade);
    if (open > 0) eye(p, Math.cos(g) * r * 0.86, Math.sin(g) * r * 0.86, 7, open, C, Math.cos(g));
  }
}
