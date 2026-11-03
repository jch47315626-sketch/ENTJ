// 걸려 있는 것들 (loops the game holds as long as they last), top-down:
//   curseEye   천안: a third eye burning over a marked foe, a ring turning round it, drips falling.
//   hoofFire   말발굽: a burning hoofprint on the floor, radius r (the hurt circle).
//   maguni     마구니: a little horned violet fire-spirit, bobbing and flickering.
import { fit, clamp, TAU, WHITE, hex, rand } from "../../core/index.js";
import { tongue, floorRing } from "./_td.js";

export const meta = {
  name: "Marks",
  desc: "Held loops seen from above: a burning third eye over a cursed foe, a burning hoofprint, a little horned fire-spirit.",
  tags: ["status", "top-down", "loop"],
  size: [120, 120],
  origin: [60, 80],
  duration: 1.0,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    kind: "curseEye",
    palette: ["#1a0a12", "#4a0e22", "#8a1a3a", "#c83a5a", "#f07a8a", "#ffc0c8", "#ffffff"],
    r: 10,
    h: 0,
    seed: 2,
  },
};

/** An almond eye, half-width s, opened by `open` (0 shut .. 1 wide), iris looking along dx. */
export function eye(p, x, y, s, open, C, dx = 0) {
  const h = s * 0.55 * open;
  const lid = (u, k) => y + k * h * Math.sin(Math.PI * u);
  // Lids: outline from corner to corner.
  for (let u = 0; u <= 1.0001; u += 1 / (s * 2)) {
    const px = x - s + u * s * 2;
    p.px(px, lid(u, -1), C[1]);
    p.px(px, lid(u, 1), C[1]);
    if (open > 0.2) for (let yy = lid(u, -1) + 1; yy < lid(u, 1); yy++) p.px(px, yy, C[5]);
  }
  if (open > 0.3) {
    const ir = Math.max(1.5, s * 0.36 * Math.min(1, open * 1.4)), ix = x + dx * s * 0.25;
    p.shade(ix - ir, y - ir, ix + ir, y + ir, (qx, qy, out) => {
      const d = Math.hypot(qx - ix, qy - y);
      if (d > ir || qy < lid((qx - x + s) / (2 * s), -1) || qy > lid((qx - x + s) / (2 * s), 1)) return;
      out.c = d < ir * 0.4 ? C[0] : d < ir * 0.75 ? C[3] : C[2];
    });
    p.px(ix - ir * 0.35, y - ir * 0.35, WHITE);
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7), r = o.r, ph = (t / meta.duration) * TAU;
  if (o.kind === "curseEye") {
    // Drawn h above the sheet's origin (the game places the origin over the foe's head).
    const y = -o.h;
    const pulse = 0.5 + 0.5 * Math.sin(ph * 2);
    p.glow(0, y, r * 2.4, C[3], 0.35 + 0.25 * pulse);
    // A ring of ticks turning round it.
    for (let i = 0; i < 12; i++) {
      const g = ph + (i / 12) * TAU;
      p.px(Math.cos(g) * r * 1.5, y + Math.sin(g) * r * 1.5 * 0.6, i % 3 ? C[2] : C[4]);
    }
    // The eye stands upright: draw it on its side by swapping axes through a vertical almond.
    const s = r, open = 0.85 + 0.15 * pulse;
    for (let v = -s; v <= s; v++) {
      const u = (v + s) / (2 * s), w = s * 0.5 * open * Math.sin(Math.PI * u);
      p.px(-w, y + v, C[1]);
      p.px(w, y + v, C[1]);
      for (let xx = -w + 1; xx < w; xx++) p.px(xx, y + v, Math.abs(v) < s * 0.3 && Math.abs(xx) < w * 0.5 ? C[0] : C[3]);
    }
    p.px(0, y - 1, C[6]);
    p.light(0, y, C[4], 0.8);
    // Drips falling off it.
    for (let k = 0; k < 2; k++) {
      const u = ((t / meta.duration) * 1.0 + k * 0.5) % 1;
      p.px(k ? 2 : -2, y + s + u * r * 2, C[3]);
      p.dot(k ? 2 : -2, y + s + u * r * 2 - 1, C[2], 1 - u);
    }
    return;
  }
  if (o.kind === "hoofFire") {
    // A scorch the size of the hurt circle, a hoofprint burnt into it, flames licking off the print.
    p.disc(0, 0, r, C[0], (d) => 0.35 * (1 - d * d));
    // No rim: prints are dropped every few hundredths and overlap into a trail.
    // A horseshoe burnt into the floor: a U open toward the back (left), glowing.
    const shoe = (cx, cy) => {
      p.arc(cx, cy, 5, 2, -Math.PI * 0.62, Math.PI * 0.62, C[1]);
      p.arc(cx, cy, 4, 1, -Math.PI * 0.6, Math.PI * 0.6, C[4]);
    };
    shoe(-6, -3);
    shoe(6, 4);
    for (let i = 0; i < 4; i++) {
      const x = [-8, -3, 4, 9][i], y = [-1, -6, 6, 1][i];
      tongue(p, x, y, 7 + 4 * Math.sin(ph * 2 + i * 1.7), 2.4, C, ph * 3 + i * 2);
    }
    p.glow(0, -2, r * 1.2, C[4], 0.4);
    return;
  }
  if (o.kind === "maguni") {
    // 마구니: a violet flame with two horns and white eyes, bobbing; its tail flickers up off its crown.
    const bob = Math.sin(ph) * 1.5, y = -r - 2 + bob;
    p.disc(0, 0, r * 0.7, hex("#1a1020"), 0.35);
    tongue(p, 0, y - r * 0.4, r * 1.3, r * 0.45, C, ph * 2);
    p.circle(0, y, r, (d, a) => (d > 0.85 ? C[1] : d < 0.45 && a < -0.5 ? C[5] : d < 0.7 ? C[4] : C[3]));
    for (const k of [-1, 1]) {
      p.line(k * r * 0.45, y - r * 0.7, k * r * 0.8, y - r * 1.5, C[0]);
      p.line(k * r * 0.5, y - r * 0.75, k * r * 0.82, y - r * 1.45, C[1]);
      p.px(k * r * 0.38, y - r * 0.05, WHITE);
      p.px(k * r * 0.38, y + 1 - r * 0.05, WHITE);
      p.px(k * r * 0.38 + (k < 0 ? 1 : -1) * 0, y + r * 0.02, C[0]);
    }
    p.line(-r * 0.3, y + r * 0.35, r * 0.3, y + r * 0.35, C[0]);
    p.glow(0, y, r * 2.2, C[4], 0.45);
    return;
  }
}
