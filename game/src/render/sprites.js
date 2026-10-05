const INK = '#1d1a17';
const HANJI = '#f1e8d2';

/** Soft ground shadow under every unit. */
export function drawShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(22, 19, 15, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.55, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws a top-down soldier figure: shoulders, weapon, head and headgear.
 * look = { body, accent, hat, weapon, skin?, trim?, plume? }
 */
export function drawUnit(ctx, look, x, y, r, facing, o = {}) {
  drawShadow(ctx, x, y, r);
  ctx.save();
  ctx.translate(x, y);
  if (o.shake) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;

  if (o.elite) {
    ctx.strokeStyle = 'rgba(142, 31, 23, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (o.aura) {
    ctx.fillStyle = o.aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.rotate(facing);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';

  drawWeapon(ctx, look.weapon, r, look);

  // Shoulders / torso.
  ctx.fillStyle = o.flash ? HANJI : look.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (look.trim) {
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.78, 0, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
  }

  drawHead(ctx, look, r, o.flash);
  ctx.restore();
}

function drawWeapon(ctx, kind, r, look) {
  switch (kind) {
    case 'spear':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.62);
      ctx.lineTo(r * 2.0, r * 0.62);
      ctx.stroke();
      ctx.fillStyle = '#b9b6aa';
      ctx.beginPath();
      ctx.moveTo(r * 2.0, r * 0.45);
      ctx.lineTo(r * 2.55, r * 0.62);
      ctx.lineTo(r * 2.0, r * 0.79);
      ctx.fill();
      break;
    case 'bow':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(r * 0.35, 0, r * 1.05, -1.05, 1.05);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(241,232,210,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 0.35 + Math.cos(-1.05) * r * 1.05, Math.sin(-1.05) * r * 1.05);
      ctx.lineTo(r * 0.35 + Math.cos(1.05) * r * 1.05, Math.sin(1.05) * r * 1.05);
      ctx.stroke();
      break;
    case 'knife':
      ctx.strokeStyle = '#cfcabb';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.35, r * 0.7);
      ctx.stroke();
      break;
    case 'hook':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.7);
      ctx.lineTo(r * 1.5, r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#b9b6aa';
      ctx.beginPath();
      ctx.arc(r * 1.5, r * 0.4, r * 0.3, Math.PI * 0.5, Math.PI * 1.9);
      ctx.stroke();
      break;
    case 'sword':
      ctx.strokeStyle = '#dcdbd2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.68);
      ctx.lineTo(r * 1.85, r * 0.68);
      ctx.stroke();
      ctx.strokeStyle = look.trim ?? '#c9a24a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.42);
      ctx.lineTo(r * 0.45, r * 0.94);
      ctx.stroke();
      break;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
}

function drawHead(ctx, look, r, flash) {
  const hr = r * 0.5;
  ctx.fillStyle = flash ? HANJI : look.skin ?? '#d9b48a';
  ctx.beginPath();
  ctx.arc(r * 0.05, 0, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  switch (look.hat) {
    case 'helmet':
    case 'helmetBlue':
      ctx.fillStyle = look.hat === 'helmet' ? '#3b3328' : '#24324a';
      ctx.beginPath();
      ctx.arc(-r * 0.02, 0, hr * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9a8f78';
      ctx.beginPath();
      ctx.arc(-r * 0.02, 0, hr * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hood':
    case 'hoodBlue':
      ctx.fillStyle = look.hat === 'hood' ? look.accent : '#2c4058';
      ctx.beginPath();
      ctx.arc(-r * 0.1, 0, hr * 1.02, Math.PI * 0.35, Math.PI * 1.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'band':
      ctx.strokeStyle = '#b3261e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, hr * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hr * 0.8, 0);
      ctx.lineTo(-hr * 1.7, hr * 0.5);
      ctx.stroke();
      break;
    case 'pirateBoss':
      ctx.fillStyle = '#a58c56';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(29,26,23,0.45)';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
        ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
        ctx.stroke();
      }
      ctx.strokeStyle = INK;
      ctx.fillStyle = '#6e5a32';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'hero':
      ctx.fillStyle = '#2a2a2e';
      ctx.beginPath();
      ctx.arc(-r * 0.02, 0, hr * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = look.trim;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Plume trailing behind the helmet.
      ctx.strokeStyle = look.plume;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.2, 0);
      ctx.quadraticCurveTo(-hr * 1.6, hr * 0.2, -hr * 2.3, -hr * 0.35);
      ctx.stroke();
      ctx.fillStyle = look.trim;
      ctx.beginPath();
      ctx.arc(-r * 0.02, 0, hr * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

export function drawCart(ctx, x, y, r, flash) {
  drawShadow(ctx, x, y, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#2a2420';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.95, r * 0.15, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = flash ? HANJI : '#8b6a3e';
  ctx.fillRect(-r * 0.85, -r * 0.6, r * 1.7, r * 1.2);
  ctx.strokeRect(-r * 0.85, -r * 0.6, r * 1.7, r * 1.2);
  ctx.fillStyle = '#e8dfc6';
  for (const [sx, sy] of [[-0.4, -0.15], [0.35, -0.2], [0, 0.25]]) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.38, r * 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = '#4a3622';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.85, -r * 0.4);
  ctx.lineTo(r * 1.6, -r * 0.55);
  ctx.moveTo(r * 0.85, r * 0.4);
  ctx.lineTo(r * 1.6, r * 0.55);
  ctx.stroke();
  ctx.restore();
}

const COIN = { bronze: '#a8763e', silver: '#c9c6bb', gold: '#e2b84a' };

/** Yeopjeon coin: round with a square hole. */
export function drawCoin(ctx, x, y, tier, t) {
  const r = tier === 'bronze' ? 4.5 : 5.5;
  const bob = Math.sin(t * 5 + x) * 1;
  ctx.fillStyle = COIN[tier];
  ctx.strokeStyle = 'rgba(29,26,23,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y + bob, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(29,26,23,0.85)';
  ctx.fillRect(x - r * 0.32, y + bob - r * 0.32, r * 0.64, r * 0.64);
}

export function drawRice(ctx, x, y, t) {
  const bob = Math.sin(t * 4) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(244, 226, 150, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3efe2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(10, 6, 7, 7);
  ctx.lineTo(-7, 7);
  ctx.quadraticCurveTo(-10, 6, 0, -9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#26302a';
  ctx.fillRect(-4, 1, 8, 6);
  ctx.restore();
}

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (p.kind === 'arrow') {
    const ally = p.team === 'player';
    ctx.strokeStyle = ally ? '#2c4058' : '#2a2018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.fillStyle = '#cfcabb';
    ctx.beginPath();
    ctx.moveTo(9, -3);
    ctx.lineTo(14, 0);
    ctx.lineTo(9, 3);
    ctx.fill();
    ctx.strokeStyle = ally ? '#8fb0d0' : '#b3261e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 3);
    ctx.stroke();
  } else if (p.kind === 'hook') {
    ctx.rotate(p.spin);
    ctx.strokeStyle = '#d2cfc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0.3, Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = '#1d1a17';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (p.kind === 'wave') {
    const a = Math.min(1, p.life * 3);
    ctx.fillStyle = `rgba(246, 226, 160, ${0.85 * a})`;
    ctx.strokeStyle = `rgba(29, 26, 23, ${0.6 * a})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-p.r * 0.6, 0, p.r * 1.2, -1.1, 1.1);
    ctx.arc(-p.r * 1.0, 0, p.r * 1.0, 1.0, -1.0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
