/**
 * Item icons drawn on canvas (no image files). Each painter draws into a
 * 100×100 box. Keys are equipment ids, weapon ids, or `empty:<slotId>` for
 * the faint silhouette of an empty slot.
 */
const INK = '#1d1a17';

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
const STEEL = (ctx) => grad(ctx, 20, 10, 80, 90, ['#eef0f2', '#9aa1a8', '#5d636a']);
const GOLD = (ctx) => grad(ctx, 20, 10, 80, 90, ['#fbe7a1', '#d6a63e', '#8a5a14']);
const LEATHER = (ctx) => grad(ctx, 20, 10, 80, 90, ['#b07a48', '#7a4e2a', '#4a2e18']);
const SILVER = (ctx) => grad(ctx, 20, 10, 80, 90, ['#ffffff', '#c9ccd0', '#7d8288']);

function line(ctx, pts, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}

function fillPath(ctx, pts, fill, stroke = INK, w = 2) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

function circle(ctx, x, y, r, fill, stroke = INK, w = 1.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

/** Torso shape shared by the three armours. */
function torso(ctx, fill) {
  fillPath(ctx, [30, 14, 42, 20, 58, 20, 70, 14, 84, 26, 78, 44, 72, 42, 72, 88, 28, 88, 28, 42, 22, 44, 16, 26], fill);
}

export const ICONS = {
  // ------------------------------------------------------------ weapons
  goryeoSword(ctx) {
    line(ctx, [24, 82, 76, 16], INK, 9);
    line(ctx, [24, 82, 76, 16], STEEL(ctx), 6);
    line(ctx, [30, 74, 74, 18], 'rgba(255,255,255,0.6)', 1.2);
    line(ctx, [20, 70, 36, 86], GOLD(ctx), 6);
    line(ctx, [22, 84, 12, 94], '#3a2416', 7);
    circle(ctx, 11, 95, 4, GOLD(ctx));
  },
  daedo(ctx) {
    line(ctx, [20, 92, 50, 44], '#4a3020', 7);
    fillPath(ctx, [46, 50, 54, 38, 70, 12, 84, 8, 80, 28, 64, 50, 54, 56], STEEL(ctx));
    line(ctx, [56, 44, 78, 14], 'rgba(255,255,255,0.6)', 1.5);
    line(ctx, [40, 52, 58, 62], GOLD(ctx), 5);
  },
  seokjang(ctx) {
    line(ctx, [30, 94, 62, 30], '#5a3f26', 6);
    ctx.strokeStyle = GOLD(ctx);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(68, 20, 14, 16, 0.45, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, y] of [[54, 14], [58, 34], [80, 10], [84, 28]]) circle(ctx, x, y, 4, null, '#d6a63e', 2.5);
  },

  // ----------------------------------------------------------- armour
  leather(ctx) {
    torso(ctx, LEATHER(ctx));
    ctx.setLineDash([3, 3]);
    line(ctx, [50, 22, 50, 86], '#2e1c0e', 1.5);
    line(ctx, [32, 50, 68, 50], '#2e1c0e', 1.5);
    ctx.setLineDash([]);
  },
  lamellar(ctx) {
    torso(ctx, '#5d6268');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(30, 14); ctx.lineTo(42, 20); ctx.lineTo(58, 20); ctx.lineTo(70, 14); ctx.lineTo(84, 26); ctx.lineTo(78, 44);
    ctx.lineTo(72, 42); ctx.lineTo(72, 88); ctx.lineTo(28, 88); ctx.lineTo(28, 42); ctx.lineTo(22, 44); ctx.lineTo(16, 26);
    ctx.closePath();
    ctx.clip();
    // Rows of small laced plates (찰).
    for (let y = 16; y < 90; y += 8) {
      for (let x = 14 + ((y / 8) % 2) * 4; x < 88; x += 8) {
        ctx.fillStyle = STEEL(ctx);
        ctx.fillRect(x, y, 6.5, 7);
        ctx.strokeStyle = 'rgba(29,26,23,0.7)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, y, 6.5, 7);
      }
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    torso(ctx, 'rgba(0,0,0,0)');
    line(ctx, [28, 60, 72, 60], '#8e2a1e', 3);
  },
  myeonggwang(ctx) {
    torso(ctx, grad(ctx, 20, 10, 80, 90, ['#9c3a2a', '#6e2418', '#3d120c']));
    // Two round mirror plates that gave the armour its name (明光鎧).
    for (const x of [38, 62]) {
      circle(ctx, x, 44, 11, SILVER(ctx), INK, 2);
      circle(ctx, x - 3, 41, 3, 'rgba(255,255,255,0.9)', null);
    }
    line(ctx, [28, 64, 72, 64], GOLD(ctx), 4);
    line(ctx, [30, 14, 42, 20, 58, 20, 70, 14], GOLD(ctx), 3);
  },

  // ---------------------------------------------------------- helmets
  ironHelm(ctx) {
    fillPath(ctx, [22, 64, 24, 40, 34, 22, 50, 16, 66, 22, 76, 40, 78, 64], STEEL(ctx));
    fillPath(ctx, [16, 66, 84, 66, 80, 72, 20, 72], '#7a8086');
    fillPath(ctx, [26, 72, 36, 72, 34, 90, 26, 86], '#8a9096');
    fillPath(ctx, [64, 72, 74, 72, 74, 86, 66, 90], '#8a9096');
    line(ctx, [50, 16, 50, 66], 'rgba(29,26,23,0.5)', 2);
    circle(ctx, 50, 14, 4, GOLD(ctx));
  },
  plumeHelm(ctx) {
    ICONS.ironHelm(ctx);
    ctx.fillStyle = '#b3261e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 12);
    ctx.quadraticCurveTo(70, -2, 86, 10);
    ctx.quadraticCurveTo(72, 12, 58, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  gilt(ctx) {
    // Silla gold crown: band with 出-shaped uprights and dangling spangles.
    const G = GOLD(ctx);
    fillPath(ctx, [14, 70, 86, 70, 86, 82, 14, 82], G);
    for (const x of [26, 50, 74]) {
      line(ctx, [x, 70, x, 22], INK, 6);
      line(ctx, [x, 70, x, 22], G, 4);
      for (const y of [32, 46, 58]) {
        line(ctx, [x - 9, y + 6, x - 9, y, x + 9, y, x + 9, y + 6], INK, 5);
        line(ctx, [x - 9, y + 6, x - 9, y, x + 9, y, x + 9, y + 6], G, 3);
      }
    }
    for (const [x, y] of [[20, 88], [34, 90], [50, 91], [66, 90], [80, 88], [26, 40], [74, 40], [50, 28]]) circle(ctx, x, y, 3, G, INK, 1);
    for (const [x, y] of [[38, 76], [62, 76]]) circle(ctx, x, y, 3.5, '#3f8f66', INK, 1);
  },

  // ----------------------------------------------------------- charms
  gogok(ctx) {
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(50, 30, 30, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    for (let i = 0; i <= 8; i++) {
      const a = (0.15 + 0.7 * (i / 8)) * Math.PI;
      circle(ctx, 50 + Math.cos(a) * 30, 30 + Math.sin(a) * 30, 3.2, i % 2 ? '#d6a63e' : '#3c6f9a', INK, 1);
    }
    // Comma-shaped jade (曲玉).
    ctx.fillStyle = grad(ctx, 40, 60, 62, 92, ['#8fd6a8', '#2f8a58', '#175a36']);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(52, 72, 12, -Math.PI * 0.6, Math.PI * 0.9);
    ctx.quadraticCurveTo(30, 96, 34, 72);
    ctx.quadraticCurveTo(38, 60, 46, 61);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    circle(ctx, 53, 67, 2.5, '#0e2a1a', null);
  },
  hobu(ctx) {
    fillPath(ctx, [30, 10, 70, 10, 70, 92, 30, 92], grad(ctx, 30, 10, 70, 92, ['#f6dc6a', '#e0b83a']));
    line(ctx, [36, 20, 64, 20], '#b3261e', 3);
    line(ctx, [50, 24, 50, 84], '#b3261e', 3);
    line(ctx, [38, 36, 62, 44, 38, 52, 62, 60, 38, 68], '#b3261e', 2.5);
    circle(ctx, 50, 80, 6, null, '#b3261e', 2.5);
  },
  chunma(ctx) {
    // Birch-bark saddle flap with the flying white horse (天馬圖).
    fillPath(ctx, [10, 22, 90, 22, 90, 82, 10, 82], '#5a3d22');
    ctx.strokeStyle = '#d6a63e';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 27, 70, 50);
    ctx.fillStyle = '#f4efe2';
    ctx.beginPath();
    ctx.moveTo(26, 58);
    ctx.quadraticCurveTo(40, 46, 58, 50);
    ctx.lineTo(66, 40);
    ctx.lineTo(72, 44);
    ctx.lineTo(66, 54);
    ctx.quadraticCurveTo(64, 62, 56, 62);
    ctx.lineTo(60, 72);
    ctx.lineTo(54, 72);
    ctx.lineTo(50, 63);
    ctx.lineTo(38, 64);
    ctx.lineTo(32, 72);
    ctx.lineTo(28, 70);
    ctx.lineTo(32, 62);
    ctx.closePath();
    ctx.fill();
    line(ctx, [30, 58, 20, 50], '#f4efe2', 2.5);
    line(ctx, [44, 52, 36, 38, 30, 34], '#f4efe2', 2);
  },

  // ------------------------------------------------------- wrist, belt, feet
  silverBangle(ctx) {
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(50, 52, 30, 20, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = SILVER(ctx);
    ctx.stroke();
  },
  goldBangle(ctx) {
    ctx.lineWidth = 11;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(50, 52, 30, 20, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = GOLD(ctx);
    ctx.stroke();
    // Raised dragon-scale studs.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = 50 + Math.cos(a) * 30 * Math.cos(-0.3) - Math.sin(a) * 20 * Math.sin(-0.3);
      const y = 52 + Math.cos(a) * 30 * Math.sin(-0.3) + Math.sin(a) * 20 * Math.cos(-0.3);
      circle(ctx, x, y, 1.8, '#fff3c4', null);
    }
  },
  leatherBelt(ctx) {
    fillPath(ctx, [6, 40, 94, 40, 94, 58, 6, 58], LEATHER(ctx));
    fillPath(ctx, [40, 36, 60, 36, 60, 62, 40, 62], 'rgba(0,0,0,0)', INK, 3);
    ctx.strokeStyle = '#b9b6aa';
    ctx.lineWidth = 3;
    ctx.strokeRect(41, 37, 18, 24);
    line(ctx, [50, 42, 50, 56], '#b9b6aa', 3);
  },
  goldBelt(ctx) {
    const G = GOLD(ctx);
    fillPath(ctx, [6, 30, 94, 30, 94, 44, 6, 44], G);
    for (let x = 10; x < 92; x += 14) {
      fillPath(ctx, [x, 31, x + 10, 31, x + 10, 43, x, 43], 'rgba(0,0,0,0)', 'rgba(29,26,23,0.6)', 1.2);
      // Hanging pendants (드리개) of different lengths.
      const len = 18 + ((x * 7) % 30);
      line(ctx, [x + 5, 44, x + 5, 44 + len], INK, 3.5);
      line(ctx, [x + 5, 44, x + 5, 44 + len], G, 2);
      circle(ctx, x + 5, 46 + len, 3, (x / 14) % 2 ? '#3f8f66' : G, INK, 1);
    }
  },
  straw(ctx) {
    ctx.fillStyle = '#c9a65a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(50, 56, 20, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let y = 26; y < 90; y += 6) line(ctx, [34, y, 66, y + 2], 'rgba(90,60,20,0.6)', 1.5);
    line(ctx, [32, 40, 50, 30, 68, 40], '#7a5a2a', 3);
  },
  giltShoes(ctx) {
    // Gilt-bronze shoe in side view, spiked sole and openwork.
    const G = GOLD(ctx);
    fillPath(ctx, [12, 70, 14, 50, 36, 44, 52, 30, 64, 30, 70, 46, 90, 58, 90, 70], G);
    for (let x = 18; x <= 86; x += 9) fillPath(ctx, [x - 3, 70, x + 3, 70, x, 80], G, INK, 1.2);
    for (const [x, y] of [[30, 58], [44, 54], [58, 46], [72, 60], [44, 64], [60, 62]]) {
      ctx.strokeStyle = 'rgba(29,26,23,0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath();
      ctx.stroke();
    }
  },
};

/** The cheapest item of each slot, drawn faint, marks an empty slot. */
const EMPTY_SHAPE = { head: 'ironHelm', body: 'leather', charm: 'gogok', wrist: 'silverBangle', belt: 'leatherBelt', feet: 'straw' };

/** Paints icon `key` into `canvas`, scaled to fit. */
export function paintIcon(canvas, key) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / 100, canvas.height / 100);
  if (key.startsWith('empty:')) {
    // Flat pale silhouette: draw the shape, then recolour its pixels.
    ICONS[EMPTY_SHAPE[key.slice(6)]]?.(ctx);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(185, 173, 146, 0.22)';
    ctx.fillRect(0, 0, 100, 100);
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  ICONS[key]?.(ctx);
}

/** Creates a canvas element already painted with an icon. */
export function iconCanvas(key, px = 64, cls = 'icon') {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = c.height = Math.round(px * dpr);
  c.className = cls;
  c.style.width = c.style.height = `${px}px`;
  paintIcon(c, key);
  return c;
}
