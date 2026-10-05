import { hash2 } from '../core/math.js';

const TILE = 200;

/**
 * Procedural terrain painters keyed by StageDef.ground. Each draws the
 * visible world rectangle; features are derived from a tile hash so the
 * field is stable as the camera moves.
 */
export const GROUNDS = {
  tidalFlat(ctx, v, time) {
    ctx.fillStyle = '#6f6857';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);

    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;

    // Pass 1: wet patches and puddles (low layer).
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 1);
        if (h < 0.55) {
          const cx = ox + hash2(tx, ty, 2) * TILE, cy = oy + hash2(tx, ty, 3) * TILE;
          ctx.fillStyle = 'rgba(64, 58, 46, 0.35)';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 70 + h * 120, 40 + h * 60, hash2(tx, ty, 4) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const h2 = hash2(tx, ty, 5);
        if (h2 < 0.22) {
          const cx = ox + hash2(tx, ty, 6) * TILE, cy = oy + hash2(tx, ty, 7) * TILE;
          const rx = 30 + h2 * 160, ry = 14 + h2 * 60, rot = hash2(tx, ty, 8) * 3;
          ctx.fillStyle = '#7d8a88';
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(226, 222, 204, 0.35)';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Slow shimmer on the water.
          const s = (Math.sin(time * 1.3 + tx * 3 + ty) + 1) / 2;
          ctx.strokeStyle = `rgba(240, 236, 220, ${0.12 + s * 0.18})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.45, ry * 0.3, rot, Math.PI * 1.1, Math.PI * 1.7);
          ctx.stroke();
        }
      }
    }

    // Pass 2: mud ridges, shells, reeds.
    ctx.lineCap = 'round';
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 9);
        if (h < 0.5) {
          ctx.strokeStyle = 'rgba(150, 140, 112, 0.22)';
          ctx.lineWidth = 2;
          const cx = ox + hash2(tx, ty, 10) * TILE, cy = oy + hash2(tx, ty, 11) * TILE;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy + i * 9, 40 + i * 6, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
          }
        }
        for (let i = 0; i < 4; i++) {
          if (hash2(tx, ty, 20 + i) < 0.6) {
            ctx.fillStyle = i % 2 ? 'rgba(214, 206, 182, 0.5)' : 'rgba(48, 42, 34, 0.45)';
            ctx.beginPath();
            ctx.arc(ox + hash2(tx, ty, 30 + i) * TILE, oy + hash2(tx, ty, 40 + i) * TILE, 2 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (hash2(tx, ty, 12) < 0.3) {
          const cx = ox + hash2(tx, ty, 13) * TILE, cy = oy + hash2(tx, ty, 14) * TILE;
          ctx.strokeStyle = '#4b5434';
          ctx.lineWidth = 2;
          for (let i = 0; i < 9; i++) {
            const a = -Math.PI / 2 + (hash2(tx, ty, 50 + i) - 0.5) * 1.2;
            const sway = Math.sin(time * 1.6 + i + tx) * 0.08;
            const len = 14 + hash2(tx, ty, 60 + i) * 18;
            const bx = cx + (i - 4) * 4;
            ctx.beginPath();
            ctx.moveTo(bx, cy);
            ctx.lineTo(bx + Math.cos(a + sway) * len, cy + Math.sin(a + sway) * len);
            ctx.stroke();
          }
        }
      }
    }
  },

  autumnHills(ctx, v, time) {
    ctx.fillStyle = '#6e5a3c';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const LEAVES = ['#a8442a', '#c7772e', '#d6a542', '#8a3324'];

    // Pass 1: grass and earth patches, a winding footpath.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 101);
        ctx.fillStyle = h < 0.5 ? 'rgba(92, 96, 58, 0.45)' : 'rgba(132, 104, 64, 0.35)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 102) * TILE, oy + hash2(tx, ty, 103) * TILE, 80 + h * 90, 50 + h * 50, h * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Pass 2: fallen leaves, rocks, then pine/maple clumps (tree shadows).
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        for (let i = 0; i < 14; i++) {
          const lx = ox + hash2(tx, ty, 110 + i) * TILE, ly = oy + hash2(tx, ty, 130 + i) * TILE;
          ctx.fillStyle = LEAVES[i % 4];
          ctx.beginPath();
          ctx.ellipse(lx, ly, 3.5, 2, hash2(tx, ty, 150 + i) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hash2(tx, ty, 170) < 0.35) {
          const rx = ox + hash2(tx, ty, 171) * TILE, ry = oy + hash2(tx, ty, 172) * TILE;
          ctx.fillStyle = '#857a68';
          ctx.strokeStyle = 'rgba(29,26,23,0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(rx, ry, 16, 11, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (hash2(tx, ty, 180) < 0.3) {
          const cx = ox + hash2(tx, ty, 181) * TILE, cy = oy + hash2(tx, ty, 182) * TILE;
          const red = hash2(tx, ty, 183) < 0.5;
          const sway = Math.sin(time * 0.8 + tx) * 2;
          ctx.fillStyle = 'rgba(22, 19, 15, 0.3)';
          ctx.beginPath();
          ctx.ellipse(cx + 10, cy + 14, 44, 30, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 + hash2(tx, ty, 184);
            ctx.fillStyle = red ? (k % 2 ? '#9c3a24' : '#b8562c') : k % 2 ? '#2f3f2c' : '#3c4f34';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * 16 + sway, cy + Math.sin(a) * 14, 20, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(29,26,23,0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx + sway, cy, 30, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  },
};
