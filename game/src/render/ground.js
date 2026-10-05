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

  winterRiver(ctx, v, time) {
    ctx.fillStyle = '#c9cfd2';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;

    // A frozen river meanders across the field (horizontal band, wobbling).
    ctx.fillStyle = 'rgba(150, 178, 196, 0.55)';
    ctx.beginPath();
    for (let x = v.x0 - 20; x <= v.x1 + 20; x += 20) {
      const y = Math.sin(x / 260) * 90 + Math.sin(x / 97) * 18 - 60;
      if (x === v.x0 - 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = v.x1 + 20; x >= v.x0 - 20; x -= 20) ctx.lineTo(x, Math.sin(x / 260) * 90 + Math.sin(x / 83) * 16 + 70);
    ctx.closePath();
    ctx.fill();

    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        // Snow drifts and bare earth showing through.
        const h = hash2(tx, ty, 201);
        ctx.fillStyle = h < 0.5 ? 'rgba(245, 247, 248, 0.7)' : 'rgba(120, 110, 96, 0.22)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 202) * TILE, oy + hash2(tx, ty, 203) * TILE, 60 + h * 80, 26 + h * 30, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Ice cracks.
        if (hash2(tx, ty, 204) < 0.35) {
          const cx = ox + hash2(tx, ty, 205) * TILE, cy = oy + hash2(tx, ty, 206) * TILE;
          ctx.strokeStyle = 'rgba(90, 120, 140, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = hash2(tx, ty, 210 + k) * Math.PI * 2;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
          }
          ctx.stroke();
        }
        // Bare winter trees: ink branches with a snow cap.
        if (hash2(tx, ty, 220) < 0.22) {
          const cx = ox + hash2(tx, ty, 221) * TILE, cy = oy + hash2(tx, ty, 222) * TILE;
          ctx.fillStyle = 'rgba(22, 19, 15, 0.18)';
          ctx.beginPath();
          ctx.ellipse(cx + 8, cy + 10, 30, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2a2420';
          ctx.lineCap = 'round';
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + hash2(tx, ty, 223);
            ctx.lineWidth = 3 - k * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 22);
            ctx.stroke();
          }
          ctx.fillStyle = '#f7f8f8';
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        // Falling snow flecks drift slowly.
        for (let k = 0; k < 3; k++) {
          const sx = ox + ((hash2(tx, ty, 230 + k) * TILE + time * 8) % TILE);
          const sy = oy + ((hash2(tx, ty, 240 + k) * TILE + time * 22) % TILE);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },
  /** 철원 궁성: flagstone courtyard, stone lanterns, red palace pillars. */
  palaceCourt(ctx, v, time) {
    ctx.fillStyle = '#8b857a';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const S = TILE / 4;

    // Pass 1: flagstones, each a slightly different grey, with dark joints.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            const h = hash2(tx * 4 + i, ty * 4 + j, 301);
            const shift = (j % 2) * S * 0.5;
            ctx.fillStyle = `rgba(${150 + h * 30 | 0}, ${144 + h * 28 | 0}, ${132 + h * 24 | 0}, 0.9)`;
            ctx.fillRect(ox + i * S + shift + 2, oy + j * S + 2, S - 4, S - 4);
            if (h < 0.08) {
              ctx.strokeStyle = 'rgba(40, 34, 28, 0.35)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(ox + i * S + shift + 8, oy + j * S + 10);
              ctx.lineTo(ox + i * S + shift + S * 0.6, oy + j * S + S * 0.7);
              ctx.stroke();
            }
          }
        }
        // Moss in the cracks and fallen leaves.
        if (hash2(tx, ty, 310) < 0.4) {
          ctx.fillStyle = 'rgba(90, 104, 60, 0.25)';
          ctx.beginPath();
          ctx.ellipse(ox + hash2(tx, ty, 311) * TILE, oy + hash2(tx, ty, 312) * TILE, 40, 14, hash2(tx, ty, 313) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Pass 2: stone lanterns (석등) with a flickering glow, and palace pillars.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const hl = hash2(tx, ty, 320);
        if (hl < 0.2) {
          const cx = ox + 40 + hash2(tx, ty, 321) * (TILE - 80), cy = oy + 40 + hash2(tx, ty, 322) * (TILE - 80);
          const fl = 0.8 + 0.2 * Math.sin(time * 9 + hl * 40) * Math.sin(time * 5.3 + hl * 11);
          const glow = ctx.createRadialGradient(cx, cy - 16, 4, cx, cy - 16, 70);
          glow.addColorStop(0, `rgba(255, 200, 110, ${0.35 * fl})`);
          glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(cx - 70, cy - 86, 140, 140);
          ctx.fillStyle = 'rgba(22, 19, 15, 0.25)';
          ctx.beginPath();
          ctx.ellipse(cx + 6, cy + 8, 22, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          // Base, pillar, fire chamber, roof cap.
          ctx.fillStyle = '#6e6a62';
          ctx.fillRect(cx - 14, cy - 2, 28, 8);
          ctx.fillStyle = '#7d786e';
          ctx.fillRect(cx - 5, cy - 14, 10, 13);
          ctx.fillStyle = '#5d5952';
          ctx.fillRect(cx - 11, cy - 28, 22, 15);
          ctx.fillStyle = `rgba(255, 196, 96, ${fl})`;
          ctx.fillRect(cx - 5, cy - 25, 10, 9);
          ctx.fillStyle = '#4a4740';
          ctx.beginPath();
          ctx.moveTo(cx - 17, cy - 28);
          ctx.lineTo(cx + 17, cy - 28);
          ctx.lineTo(cx + 7, cy - 37);
          ctx.lineTo(cx - 7, cy - 37);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy - 39, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (hl > 0.9) {
          // A lone red-lacquered pillar on a stone footing.
          const cx = ox + hash2(tx, ty, 323) * TILE, cy = oy + hash2(tx, ty, 324) * TILE;
          ctx.fillStyle = 'rgba(22, 19, 15, 0.22)';
          ctx.beginPath();
          ctx.ellipse(cx + 8, cy + 8, 24, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6e6a62';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 20, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8e2a1e';
          ctx.fillRect(cx - 11, cy - 46, 22, 46);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fillRect(cx - 7, cy - 46, 4, 46);
          ctx.fillStyle = '#2f5a4a';
          ctx.fillRect(cx - 13, cy - 52, 26, 7);
        }
      }
    }
  },
  /** 일리천: a broad late-summer plain cut by a shallow river, reeds on its banks. */
  riverPlain(ctx, v, time) {
    ctx.fillStyle = '#8f9460';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const riverX = (y) => Math.sin(y / 340) * 160 + Math.sin(y / 113) * 30 + 260;

    // Grass tones and trampled earth.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 401);
        ctx.fillStyle = h < 0.55 ? 'rgba(170, 170, 96, 0.35)' : 'rgba(110, 96, 64, 0.22)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 402) * TILE, oy + hash2(tx, ty, 403) * TILE, 70 + h * 70, 30 + h * 26, h * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The river (vertical band, wobbling) with lighter shallows and moving glints.
    ctx.fillStyle = 'rgba(96, 128, 136, 0.85)';
    ctx.beginPath();
    for (let y = v.y0 - 20; y <= v.y1 + 20; y += 20) {
      const x = riverX(y) - 70;
      if (y === v.y0 - 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let y = v.y1 + 20; y >= v.y0 - 20; y -= 20) ctx.lineTo(riverX(y) + 70 + Math.sin(y / 71) * 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(160, 186, 186, 0.35)';
    for (let y = Math.floor(v.y0 / 40) * 40; y <= v.y1; y += 40) {
      const k = hash2(0, y / 40, 410);
      const gx = riverX(y) + (k - 0.5) * 90 + Math.sin(time * 1.5 + k * 9) * 6;
      ctx.fillRect(gx, y + ((time * 30) % 40), 14 + k * 16, 2);
    }

    // Reeds along the banks, swaying; stones and lost arrows in the grass.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        for (let k = 0; k < 5; k++) {
          const y = oy + hash2(tx, ty, 420 + k) * TILE;
          const bank = riverX(y) + (hash2(tx, ty, 430 + k) < 0.5 ? -82 : 82);
          if (bank < ox || bank > ox + TILE) continue;
          const sway = Math.sin(time * 2 + y * 0.05) * 3;
          ctx.strokeStyle = '#5e5a2c';
          ctx.lineWidth = 1.6;
          for (let r = 0; r < 4; r++) {
            ctx.beginPath();
            ctx.moveTo(bank + r * 4 - 6, y);
            ctx.lineTo(bank + r * 4 - 6 + sway, y - 18 - r * 3);
            ctx.stroke();
          }
          ctx.fillStyle = '#7a5a34';
          ctx.fillRect(bank + sway - 2, y - 24, 3, 7);
        }
        if (hash2(tx, ty, 440) < 0.3) {
          const cx = ox + hash2(tx, ty, 441) * TILE, cy = oy + hash2(tx, ty, 442) * TILE;
          ctx.fillStyle = '#6e6a5a';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 10, 6, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hash2(tx, ty, 450) < 0.35) {
          const cx = ox + hash2(tx, ty, 451) * TILE, cy = oy + hash2(tx, ty, 452) * TILE;
          const a = hash2(tx, ty, 453) * Math.PI;
          ctx.strokeStyle = 'rgba(40, 30, 20, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 16, cy - Math.abs(Math.sin(a)) * 14 - 4);
          ctx.stroke();
        }
      }
    }
  },
};
