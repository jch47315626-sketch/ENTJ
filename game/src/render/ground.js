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

  /** 치악산 북원: dark mountain scree, moss, pine litter and drifting mist. */
  mountainPass(ctx, v, time) {
    ctx.fillStyle = '#4a4d42';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 601);
        // Moss and bare earth.
        ctx.fillStyle = h < 0.5 ? 'rgba(84, 104, 60, 0.45)' : 'rgba(96, 82, 62, 0.35)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 602) * TILE, oy + hash2(tx, ty, 603) * TILE, 60 + h * 80, 34 + h * 30, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Scree: little grey stones.
        ctx.fillStyle = 'rgba(150, 146, 136, 0.55)';
        for (let i = 0; i < 6; i++) {
          const x = ox + hash2(tx, ty, 610 + i) * TILE, y = oy + hash2(tx, ty, 620 + i) * TILE;
          ctx.beginPath();
          ctx.ellipse(x, y, 3 + hash2(tx, ty, 630 + i) * 5, 2 + hash2(tx, ty, 640 + i) * 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Pine needles.
        ctx.strokeStyle = 'rgba(110, 72, 40, 0.5)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const x = ox + hash2(tx, ty, 650 + i) * TILE, y = oy + hash2(tx, ty, 660 + i) * TILE, a = hash2(tx, ty, 670 + i) * 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
          ctx.stroke();
        }
      }
    }
    // Mountain mist drifting across.
    for (let k = 0; k < 3; k++) {
      const y = v.y0 + ((k * 0.37 + time * 0.01) % 1) * (v.y1 - v.y0);
      const x = v.x0 + ((k * 0.61 + time * 0.02) % 1) * (v.x1 - v.x0);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 260);
      grd.addColorStop(0, 'rgba(220, 224, 230, 0.12)');
      grd.addColorStop(1, 'rgba(220, 224, 230, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - 260, y - 260, 520, 520);
    }
  },

  /** 신림 솔숲: dark needle-strewn floor under pine crowns, shafts of light. */
  pineForest(ctx, v, time) {
    ctx.fillStyle = '#3d4632';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 701);
        ctx.fillStyle = h < 0.5 ? 'rgba(92, 70, 40, 0.4)' : 'rgba(60, 84, 46, 0.4)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 702) * TILE, oy + hash2(tx, ty, 703) * TILE, 70 + h * 70, 40 + h * 30, h * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(130, 90, 50, 0.55)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 9; i++) {
          const x = ox + hash2(tx, ty, 710 + i) * TILE, y = oy + hash2(tx, ty, 720 + i) * TILE, a = hash2(tx, ty, 730 + i) * 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
          ctx.stroke();
        }
        // Pine crowns seen from above (their shade on the floor).
        if (hash2(tx, ty, 740) < 0.4) {
          const cx = ox + hash2(tx, ty, 741) * TILE, cy = oy + hash2(tx, ty, 742) * TILE;
          ctx.fillStyle = 'rgba(14, 22, 12, 0.35)';
          ctx.beginPath();
          ctx.arc(cx + 12, cy + 14, 46, 0, Math.PI * 2);
          ctx.fill();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + hash2(tx, ty, 743);
            ctx.fillStyle = k % 2 ? '#24361f' : '#2e4426';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * 20, cy + Math.sin(a) * 18, 24, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#5a3a20';
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Slanted shafts of light.
    for (let k = 0; k < 3; k++) {
      const x = v.x0 + ((k * 0.33 + time * 0.005) % 1) * (v.x1 - v.x0);
      ctx.fillStyle = 'rgba(255, 240, 190, 0.06)';
      ctx.beginPath();
      ctx.moveTo(x, v.y0);
      ctx.lineTo(x + 80, v.y0);
      ctx.lineTo(x - 120, v.y1);
      ctx.lineTo(x - 200, v.y1);
      ctx.closePath();
      ctx.fill();
    }
  },

  /** 비로봉 눈길: wind-packed snow, bare rock showing through, blowing snow. */
  snowPeak(ctx, v, time) {
    ctx.fillStyle = '#d9dee2';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 801);
        ctx.fillStyle = h < 0.4 ? 'rgba(120, 124, 128, 0.35)' : 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 802) * TILE, oy + hash2(tx, ty, 803) * TILE, 60 + h * 80, 24 + h * 26, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Wind ripples in the snow.
        ctx.strokeStyle = 'rgba(160, 176, 190, 0.45)';
        ctx.lineWidth = 1.5;
        const cx = ox + hash2(tx, ty, 804) * TILE, cy = oy + hash2(tx, ty, 805) * TILE;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy + i * 8, 34 + i * 6, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
        // Blowing snow.
        for (let k = 0; k < 4; k++) {
          const sx = ox + ((hash2(tx, ty, 810 + k) * TILE + time * 60) % TILE);
          const sy = oy + ((hash2(tx, ty, 820 + k) * TILE + time * 14) % TILE);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(sx, sy, 5, 1.6);
        }
      }
    }
  },

  // ------------------------------------------------ ♾️ 무한 전장 전용 맵

  /** 혈월 갯벌: dark red mud under a blood moon, crimson pools with the moon in them. */
  bloodTide(ctx, v, time) {
    ctx.fillStyle = '#2a1416';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 1001);
        ctx.fillStyle = h < 0.5 ? 'rgba(70, 30, 30, 0.6)' : 'rgba(40, 22, 26, 0.6)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 1002) * TILE, oy + hash2(tx, ty, 1003) * TILE, 70 + h * 110, 36 + h * 50, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Crimson tide pools, each with the red moon shimmering in it.
        if (hash2(tx, ty, 1004) < 0.3) {
          const cx = ox + hash2(tx, ty, 1005) * TILE, cy = oy + hash2(tx, ty, 1006) * TILE;
          const rx = 36 + hash2(tx, ty, 1007) * 70, ry = 16 + hash2(tx, ty, 1008) * 26, rot = hash2(tx, ty, 1009) * 3;
          ctx.fillStyle = 'rgba(120, 20, 26, 0.75)';
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();
          const s = (Math.sin(time * 1.4 + tx * 2 + ty) + 1) / 2;
          ctx.fillStyle = `rgba(255, 120, 90, ${0.25 + s * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(cx - rx * 0.25, cy - ry * 0.1, Math.min(rx, ry) * 0.45, Math.min(rx, ry) * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Mud ridges and broken shells.
        ctx.strokeStyle = 'rgba(150, 70, 60, 0.25)';
        ctx.lineWidth = 2;
        const rx = ox + hash2(tx, ty, 1010) * TILE, ry = oy + hash2(tx, ty, 1011) * TILE;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(rx, ry + i * 9, 36 + i * 6, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? 'rgba(220, 180, 170, 0.45)' : 'rgba(10, 4, 6, 0.5)';
          ctx.beginPath();
          ctx.arc(ox + hash2(tx, ty, 1020 + i) * TILE, oy + hash2(tx, ty, 1030 + i) * TILE, 2 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
        // Dead reeds, black against the red.
        if (hash2(tx, ty, 1040) < 0.28) {
          const cx = ox + hash2(tx, ty, 1041) * TILE, cy = oy + hash2(tx, ty, 1042) * TILE;
          ctx.strokeStyle = '#140808';
          ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (hash2(tx, ty, 1050 + i) - 0.5) * 1.1 + Math.sin(time * 1.3 + i + tx) * 0.07;
            const len = 12 + hash2(tx, ty, 1060 + i) * 18;
            ctx.beginPath();
            ctx.moveTo(cx + (i - 3) * 4, cy);
            ctx.lineTo(cx + (i - 3) * 4 + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();
          }
        }
      }
    }
    // A red haze rolling across from the moon.
    const grd = ctx.createLinearGradient(v.x0, v.y0, v.x0, v.y1);
    grd.addColorStop(0, `rgba(255, 60, 40, ${0.1 + 0.04 * Math.sin(time * 0.7)})`);
    grd.addColorStop(1, 'rgba(255, 60, 40, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  },

  /** 도깨비불 무덤골: blue-grey grass, burial mounds, stone markers and drifting will-o'-wisps. */
  ghostBarrow(ctx, v, time) {
    ctx.fillStyle = '#1f2a2e';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 1101);
        ctx.fillStyle = h < 0.5 ? 'rgba(52, 72, 70, 0.6)' : 'rgba(36, 44, 54, 0.55)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 1102) * TILE, oy + hash2(tx, ty, 1103) * TILE, 70 + h * 90, 40 + h * 40, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Withered grass tufts.
        ctx.strokeStyle = 'rgba(120, 140, 130, 0.35)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          const x = ox + hash2(tx, ty, 1110 + i) * TILE, y = oy + hash2(tx, ty, 1120 + i) * TILE;
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x - 5, y - 8);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 10);
          ctx.moveTo(x + 3, y);
          ctx.lineTo(x + 5, y - 8);
          ctx.stroke();
        }
        // 봉분: a round grave mound with its shadow and a little stone before it.
        if (hash2(tx, ty, 1130) < 0.32) {
          const cx = ox + 40 + hash2(tx, ty, 1131) * (TILE - 80), cy = oy + 40 + hash2(tx, ty, 1132) * (TILE - 80);
          const r = 26 + hash2(tx, ty, 1133) * 14;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(cx + 8, cy + r * 0.45, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 2, cx, cy, r);
          g.addColorStop(0, '#4f6a5e');
          g.addColorStop(1, '#2b3c36');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7d8584';
          ctx.fillRect(cx - 7, cy + r * 0.62, 14, 8);
        }
      }
    }
    // 도깨비불: blue flames bobbing above the ground, fading in and out.
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        if (hash2(tx, ty, 1140) > 0.45) continue;
        const ox = tx * TILE, oy = ty * TILE;
        const k = hash2(tx, ty, 1141) * 10;
        const x = ox + hash2(tx, ty, 1142) * TILE + Math.sin(time * 0.9 + k) * 18;
        const y = oy + hash2(tx, ty, 1143) * TILE + Math.cos(time * 1.3 + k) * 10;
        const a = 0.5 + 0.5 * Math.sin(time * 1.7 + k);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, `rgba(160, 230, 255, ${0.75 * a})`);
        g.addColorStop(0.4, `rgba(80, 160, 255, ${0.35 * a})`);
        g.addColorStop(1, 'rgba(80, 160, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 26, y - 26, 52, 52);
      }
    }
  },

  /** 한빙 지옥: blue-black ice, glowing cyan cracks, frozen spikes and drifting frost. */
  frostHell(ctx, v, time) {
    ctx.fillStyle = '#16233a';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const pulse = 0.6 + 0.4 * Math.sin(time * 1.6);
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 1201);
        // Ice sheets of different depth.
        ctx.fillStyle = h < 0.5 ? 'rgba(70, 110, 150, 0.4)' : 'rgba(30, 50, 80, 0.5)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 1202) * TILE, oy + hash2(tx, ty, 1203) * TILE, 70 + h * 100, 40 + h * 40, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // A pale sheen on the ice.
        ctx.strokeStyle = 'rgba(210, 235, 255, 0.18)';
        ctx.lineWidth = 3;
        const sx = ox + hash2(tx, ty, 1204) * TILE, sy = oy + hash2(tx, ty, 1205) * TILE;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 40, sy - 16);
        ctx.stroke();
        // Glowing cracks.
        if (hash2(tx, ty, 1206) < 0.5) {
          const cx = ox + hash2(tx, ty, 1207) * TILE, cy = oy + hash2(tx, ty, 1208) * TILE;
          ctx.lineCap = 'round';
          for (const [w, c] of [[6, `rgba(80, 220, 255, ${0.18 * pulse})`], [1.8, `rgba(170, 245, 255, ${0.8 * pulse})`]]) {
            ctx.strokeStyle = c;
            ctx.lineWidth = w;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              let x = cx, y = cy;
              ctx.moveTo(x, y);
              for (let j = 0; j < 3; j++) {
                x += (hash2(tx, ty, 1210 + k * 5 + j) - 0.5) * 60;
                y += (hash2(tx, ty, 1230 + k * 5 + j) - 0.5) * 60;
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();
          }
        }
        // Frozen spikes jutting up.
        if (hash2(tx, ty, 1250) < 0.25) {
          const cx = ox + hash2(tx, ty, 1251) * TILE, cy = oy + hash2(tx, ty, 1252) * TILE;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(cx + 6, cy + 4, 20, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let k = 0; k < 3; k++) {
            const bx = cx + (k - 1) * 9, hgt = 18 + hash2(tx, ty, 1253 + k) * 22;
            ctx.fillStyle = k === 1 ? '#bfe6ff' : '#8fc4e8';
            ctx.beginPath();
            ctx.moveTo(bx - 5, cy);
            ctx.lineTo(bx, cy - hgt);
            ctx.lineTo(bx + 5, cy);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Frost motes drifting sideways.
        for (let k = 0; k < 3; k++) {
          const fx = ox + ((hash2(tx, ty, 1260 + k) * TILE + time * 26) % TILE);
          const fy = oy + ((hash2(tx, ty, 1270 + k) * TILE + time * 10) % TILE);
          ctx.fillStyle = 'rgba(220, 245, 255, 0.85)';
          ctx.fillRect(fx, fy, 2, 2);
        }
      }
    }
  },

  /** 화염 궁궐: charred flagstones, toppled burning pillars and falling ash. */
  ashPalace(ctx, v, time) {
    ctx.fillStyle = '#2b2422';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const S = TILE / 4;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        // Scorched flagstones.
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            const h = hash2(tx * 4 + i, ty * 4 + j, 1301);
            const shift = (j % 2) * S * 0.5;
            ctx.fillStyle = `rgba(${58 + h * 26 | 0}, ${48 + h * 18 | 0}, ${44 + h * 14 | 0}, 0.95)`;
            ctx.fillRect(ox + i * S + shift + 2, oy + j * S + 2, S - 4, S - 4);
            if (h < 0.1) {
              // Embers glowing in the joints.
              ctx.fillStyle = `rgba(255, 110, 40, ${0.35 + 0.25 * Math.sin(time * 3 + h * 90)})`;
              ctx.fillRect(ox + i * S + shift, oy + j * S + S - 3, S, 2);
            }
          }
        }
        // Soot stains.
        if (hash2(tx, ty, 1310) < 0.5) {
          ctx.fillStyle = 'rgba(8, 6, 6, 0.35)';
          ctx.beginPath();
          ctx.ellipse(ox + hash2(tx, ty, 1311) * TILE, oy + hash2(tx, ty, 1312) * TILE, 50, 26, hash2(tx, ty, 1313) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // A toppled red pillar, still burning at one end.
        if (hash2(tx, ty, 1320) < 0.18) {
          const cx = ox + hash2(tx, ty, 1321) * TILE, cy = oy + hash2(tx, ty, 1322) * TILE;
          const a = hash2(tx, ty, 1323) * Math.PI;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(-40, 4, 84, 12);
          ctx.fillStyle = '#5e1a12';
          ctx.fillRect(-42, -9, 84, 18);
          ctx.fillStyle = '#1c1210';
          ctx.fillRect(-42, -9, 26, 18);
          ctx.restore();
          const fl = 0.7 + 0.3 * Math.sin(time * 9 + cx) * Math.sin(time * 5.7 + cy);
          const fx = cx + Math.cos(a) * 36, fy = cy + Math.sin(a) * 36;
          const g = ctx.createRadialGradient(fx, fy - 10, 2, fx, fy - 10, 48);
          g.addColorStop(0, `rgba(255, 200, 90, ${0.7 * fl})`);
          g.addColorStop(0.5, `rgba(255, 90, 30, ${0.35 * fl})`);
          g.addColorStop(1, 'rgba(255, 90, 30, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(fx - 48, fy - 58, 96, 96);
        }
        // Falling ash.
        for (let k = 0; k < 3; k++) {
          const ax = ox + ((hash2(tx, ty, 1330 + k) * TILE + Math.sin(time + k) * 10 + time * 6) % TILE);
          const ay = oy + ((hash2(tx, ty, 1340 + k) * TILE + time * 18) % TILE);
          ctx.fillStyle = k === 0 ? 'rgba(255, 140, 60, 0.8)' : 'rgba(190, 180, 170, 0.6)';
          ctx.fillRect(ax, ay, 2.5, 2.5);
        }
      }
    }
  },

  /** 백골 벌판: ash-grey plain, piles of bones and skulls, a black river of souls. */
  boneField(ctx, v, time) {
    ctx.fillStyle = '#5a5650';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const riverY = (x) => Math.sin(x / 300) * 140 + Math.sin(x / 107) * 26 - 280;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 1401);
        ctx.fillStyle = h < 0.5 ? 'rgba(80, 76, 70, 0.55)' : 'rgba(110, 104, 94, 0.4)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 1402) * TILE, oy + hash2(tx, ty, 1403) * TILE, 70 + h * 90, 34 + h * 34, h * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The river of souls: black water with pale faces of light drifting along it.
    ctx.fillStyle = 'rgba(18, 16, 24, 0.9)';
    ctx.beginPath();
    for (let x = v.x0 - 20; x <= v.x1 + 20; x += 20) {
      const y = riverY(x) - 60;
      if (x === v.x0 - 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = v.x1 + 20; x >= v.x0 - 20; x -= 20) ctx.lineTo(x, riverY(x) + 60 + Math.sin(x / 61) * 8);
    ctx.closePath();
    ctx.fill();
    for (let x = Math.floor(v.x0 / 60) * 60; x <= v.x1; x += 60) {
      const k = hash2(x / 60, 0, 1410);
      const gx = x + ((time * 40 + k * 60) % 60);
      const gy = riverY(gx) + (k - 0.5) * 70;
      ctx.fillStyle = `rgba(200, 210, 255, ${0.15 + 0.2 * Math.sin(time * 2 + k * 9) ** 2})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        // Scattered bones.
        for (let i = 0; i < 3; i++) {
          if (hash2(tx, ty, 1420 + i) > 0.55) continue;
          const bx = ox + hash2(tx, ty, 1430 + i) * TILE, by = oy + hash2(tx, ty, 1440 + i) * TILE, a = hash2(tx, ty, 1450 + i) * 3;
          ctx.strokeStyle = 'rgba(226, 218, 200, 0.75)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx - Math.cos(a) * 9, by - Math.sin(a) * 9);
          ctx.lineTo(bx + Math.cos(a) * 9, by + Math.sin(a) * 9);
          ctx.stroke();
          ctx.fillStyle = 'rgba(226, 218, 200, 0.75)';
          for (const k of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(bx + Math.cos(a) * 10 * k, by + Math.sin(a) * 10 * k, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // A heap of skulls.
        if (hash2(tx, ty, 1460) < 0.2) {
          const cx = ox + hash2(tx, ty, 1461) * TILE, cy = oy + hash2(tx, ty, 1462) * TILE;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(cx + 5, cy + 10, 26, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          for (const [dx, dy] of [[-10, 2], [10, 2], [0, -8]]) {
            ctx.fillStyle = '#e4dccb';
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a2622';
            ctx.beginPath();
            ctx.arc(cx + dx - 3, cy + dy - 1, 1.8, 0, Math.PI * 2);
            ctx.arc(cx + dx + 3, cy + dy - 1, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Broken spears stuck in the ground.
        if (hash2(tx, ty, 1470) < 0.3) {
          const cx = ox + hash2(tx, ty, 1471) * TILE, cy = oy + hash2(tx, ty, 1472) * TILE, a = -Math.PI / 2 + (hash2(tx, ty, 1473) - 0.5) * 0.9;
          ctx.strokeStyle = 'rgba(40, 30, 24, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
          ctx.stroke();
        }
      }
    }
    // Grey mist over the field.
    for (let k = 0; k < 3; k++) {
      const y = v.y0 + ((k * 0.41 + time * 0.012) % 1) * (v.y1 - v.y0);
      const x = v.x0 + ((k * 0.57 + time * 0.018) % 1) * (v.x1 - v.x0);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 240);
      grd.addColorStop(0, 'rgba(200, 200, 210, 0.12)');
      grd.addColorStop(1, 'rgba(200, 200, 210, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - 240, y - 240, 480, 480);
    }
  },

  /** 마계 심연 (무한 전장 6층): black-red rock, glowing lava cracks, bones and drifting embers. */
  demonRealm(ctx, v, time) {
    ctx.fillStyle = '#160b12';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
    const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
    const glow = 0.6 + 0.4 * Math.sin(time * 2.2);
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const ox = tx * TILE, oy = ty * TILE;
        const h = hash2(tx, ty, 901);
        // Scorched patches.
        ctx.fillStyle = h < 0.5 ? 'rgba(60, 20, 34, 0.7)' : 'rgba(34, 18, 40, 0.6)';
        ctx.beginPath();
        ctx.ellipse(ox + hash2(tx, ty, 902) * TILE, oy + hash2(tx, ty, 903) * TILE, 70 + h * 80, 40 + h * 30, h * 3, 0, Math.PI * 2);
        ctx.fill();
        // Lava cracks, glowing and pulsing.
        if (hash2(tx, ty, 904) < 0.55) {
          const cx = ox + hash2(tx, ty, 905) * TILE, cy = oy + hash2(tx, ty, 906) * TILE;
          ctx.lineCap = 'round';
          for (const [w, c] of [[7, `rgba(255, 60, 20, ${0.25 * glow})`], [2.5, `rgba(255, 150, 60, ${0.85 * glow})`]]) {
            ctx.strokeStyle = c;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            let x = cx, y = cy;
            for (let k = 0; k < 5; k++) {
              x += (hash2(tx, ty, 910 + k) - 0.5) * 70;
              y += (hash2(tx, ty, 920 + k) - 0.5) * 70;
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
        // Bones.
        if (hash2(tx, ty, 930) < 0.3) {
          const bx = ox + hash2(tx, ty, 931) * TILE, by = oy + hash2(tx, ty, 932) * TILE, a = hash2(tx, ty, 933) * 3;
          ctx.strokeStyle = 'rgba(200, 190, 180, 0.55)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx - Math.cos(a) * 10, by - Math.sin(a) * 10);
          ctx.lineTo(bx + Math.cos(a) * 10, by + Math.sin(a) * 10);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200, 190, 180, 0.55)';
          for (const k of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(bx + Math.cos(a) * 11 * k, by + Math.sin(a) * 11 * k, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Rising embers.
        for (let k = 0; k < 3; k++) {
          const ex = ox + hash2(tx, ty, 940 + k) * TILE + Math.sin(time + k) * 6;
          const ey = oy + ((hash2(tx, ty, 950 + k) * TILE - time * 30) % TILE + TILE) % TILE;
          ctx.fillStyle = `rgba(255, ${120 + k * 40}, 60, 0.8)`;
          ctx.fillRect(ex, ey, 2.5, 2.5);
        }
      }
    }
  },
};
