import { GROUNDS } from './ground.js';
import { drawBogs, drawRocks } from './terrain.js';
import { drawUnit, drawCart, drawCoin, drawRice, drawProjectile } from './sprites.js';
import { clamp, TAU } from '../core/math.js';

const ALLY_LOOKS = {
  soldier: { body: '#3e5a7a', accent: '#1f2d3d', hat: 'helmetBlue', weapon: 'spear', skin: '#e3c39c' },
  archer: { body: '#3e5a7a', accent: '#1f2d3d', hat: 'hoodBlue', weapon: 'bow', skin: '#e3c39c' },
  decoy: { body: '#2d3b5c', trim: '#c9a24a', plume: '#b3261e', hat: 'hero', weapon: 'sword', skin: '#e3c39c' },
  shin: { body: '#2d3b5c', trim: '#c9a24a', plume: '#b3261e', hat: 'hero', weapon: 'sword', skin: '#e3c39c' },
};
/** 군세 (standing troops of 통솔의 길), by role. */
const RETINUE_LOOKS = {
  spear: { body: '#2d5a9c', accent: '#1e2a48', hat: 'helmetBlue', weapon: 'spear', trim: '#e8c060', skin: '#f0d0aa' },
  archer: { body: '#3e6a8c', accent: '#1f2d3d', hat: 'hoodBlue', weapon: 'bow', trim: '#e8c060', skin: '#f0d0aa' },
  guard: { body: '#1e3a78', accent: '#0e1424', hat: 'heavyHelmet', weapon: 'shield', trim: '#ffd76a', skin: '#f0d0aa', bulk: 1.15, brows: 'angry' },
};

/** 마구니: a little horned violet wisp with a flame tail; dim while recharging. */
function drawMaguni(ctx, a) {
  const ready = a.rest <= 0;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.globalAlpha = ready ? 1 : 0.45;
  // Flame tail trailing behind the orbit.
  ctx.rotate(a.facing + Math.PI);
  ctx.fillStyle = 'rgba(150, 90, 210, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, -a.r * 0.8);
  ctx.quadraticCurveTo(a.r * 2.2, Math.sin(t * 12) * 4, 0, a.r * 0.8);
  ctx.fill();
  ctx.rotate(-(a.facing + Math.PI));
  const bob = Math.sin(t * 8 + a.x * 0.1) * 2;
  ctx.translate(0, bob);
  // Horns.
  ctx.fillStyle = '#2e1a40';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * a.r * 0.35, -a.r * 0.7);
    ctx.lineTo(k * a.r * 0.75, -a.r * 1.35);
    ctx.lineTo(k * a.r * 0.75, -a.r * 0.55);
    ctx.fill();
  }
  // Body.
  const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, a.r);
  g.addColorStop(0, '#c8a0f0');
  g.addColorStop(1, '#5a2e8a');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#1d1a17';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, a.r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Mischievous eyes and grin.
  ctx.fillStyle = '#fff';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * a.r * 0.35, -a.r * 0.1, a.r * 0.22, a.r * 0.28, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#1d1a17';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * a.r * 0.35, -a.r * 0.05, a.r * 0.11, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, a.r * 0.25, a.r * 0.3, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.restore();
}

/** Fill / edge colours for arc-shaped attack effects. */
const ARC_STYLE = {
  slash: { fill: [244, 236, 216, 0.5], edge: [29, 26, 23, 0.55], width: 2 },
  royal: { fill: [240, 210, 130, 0.55], edge: [29, 26, 23, 0.55], width: 2 },
  chop: { fill: [236, 222, 196, 0.6], edge: [142, 31, 23, 0.8], width: 3.5 },
  paewang: { fill: [200, 64, 44, 0.55], edge: [29, 26, 23, 0.8], width: 4 },
};
const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] * a})`;

/** Draws the world from the game state. Owns the camera and canvas sizing. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    // Keep roughly the same battlefield area visible on any screen shape.
    this.cam.zoom = clamp(Math.sqrt(w * h) / 710, 0.75, 1.6);
  }

  render(g, input, dt) {
    const { ctx, cam } = this;
    const p = g.player;
    const k = 1 - Math.exp(-8 * dt);
    cam.x += (p.x - cam.x) * k;
    cam.y += (p.y - cam.y) * k;
    if (dt === 0) {
      cam.x = p.x;
      cam.y = p.y;
    }
    const z = cam.zoom;
    g.view.w = this.w / z;
    g.view.h = this.h / z;
    const v = {
      x0: cam.x - g.view.w / 2, x1: cam.x + g.view.w / 2,
      y0: cam.y - g.view.h / 2, y1: cam.y + g.view.h / 2,
    };

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    if (g.shakeAmt > 0) ctx.translate((Math.random() - 0.5) * g.shakeAmt, (Math.random() - 0.5) * g.shakeAmt);
    ctx.scale(z, z);
    ctx.translate(-cam.x, -cam.y);

    GROUNDS[g.stage.ground](ctx, v, g.time);
    drawBogs(ctx, g, v);
    // Soft dusk tint: keeps the field calm so units and pickups stand out.
    ctx.fillStyle = 'rgba(24, 20, 36, 0.18)';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (g.arena) this.drawArenaFloor(ctx, g, v);
    this.drawCaltrops(ctx, g);
    this.drawZones(ctx, g);
    drawRocks(ctx, g, v);
    this.drawHalos(ctx, g);

    for (const k of g.pickups) {
      if (k.kind === 'coin') drawCoin(ctx, k.x, k.y, k.tier, k.t);
      else if (k.kind === 'crowFeed') this.drawCrowFeed(ctx, k, g.time);
      else drawRice(ctx, k.x, k.y, k.t);
    }

    this.drawGroundFx(ctx, g);

    // Units sorted by y for overlap.
    const units = [];
    for (const e of g.enemies) if (!e.dead && e.x > v.x0 - 80 && e.x < v.x1 + 80 && e.y > v.y0 - 80 && e.y < v.y1 + 80) units.push(e);
    for (const a of g.allies) units.push(a);
    units.push(p);
    units.sort((a, b) => a.y - b.y);
    for (const u of units) {
      if (u === p) this.drawPlayer(ctx, g);
      else if (u.kind) this.drawAlly(ctx, u);
      else this.drawEnemy(ctx, g, u);
    }

    for (const pr of g.projectiles) drawProjectile(ctx, pr);
    this.drawFx(ctx, g);
    if (g.arena) this.drawArenaBanners(ctx, g);
    this.drawNight(ctx, g, v);
    for (const c of g.crows) this.drawCrow(ctx, c);
    for (const k of g.pickups) if (k.kind === 'crowFeed') this.drawFeedPointer(ctx, k, g.time, v);
    this.drawTexts(ctx, g);
    ctx.restore();

    this.drawVignette(ctx, p.hurtFlash > 0 ? p.hurtFlash : 0);
    this.drawStick(ctx, input);
  }

  drawPlayer(ctx, g) {
    const p = g.player;
    if ((p.upgrades.maguni ?? 0) >= 4) {
      // 마구니 결계: a violet floor fills the ring the 마구니 circle.
      const n = g.allies.filter((a) => a.kind === 'maguni').length || 4;
      const R = 64 + n * 4;
      const pulse = 0.5 + 0.5 * Math.sin(g.time * 4);
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      grd.addColorStop(0, `rgba(170, 90, 240, ${0.15 + 0.08 * pulse})`);
      grd.addColorStop(0.75, `rgba(140, 60, 220, ${0.32 + 0.1 * pulse})`);
      grd.addColorStop(1, 'rgba(120, 40, 200, 0.55)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, R * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(210, 160, 255, ${0.6 + 0.3 * pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -g.time * 40;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      // Runes turning on the floor.
      ctx.fillStyle = `rgba(230, 200, 255, ${0.5 + 0.3 * pulse})`;
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) {
        const a = -g.time * 1.5 + (i / 6) * TAU;
        ctx.fillText('☸', p.x + Math.cos(a) * R * 0.62, p.y + Math.sin(a) * R * 0.62 * 0.8);
      }
    }
    if (p.meta.chaosAura) {
      // 혼란의 기운: a slow violet ring marks how close a soldier must come.
      ctx.strokeStyle = `rgba(150, 100, 210, ${0.25 + 0.1 * Math.sin(g.time * 3)})`;
      ctx.setLineDash([8, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 150, g.time * 0.5, g.time * 0.5 + TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const look = p.hero.look;
    const blink = p.invuln > 0 && Math.floor(g.time * 30) % 2 === 0;
    const m = p.mount;
    const shielded = m && g.time < m.invulnUntil;
    drawUnit(ctx, { ...look, body: look.robe, mount: m ? '#f2ede0' : undefined },
      p.x, p.y, p.r, p.facing, {
        alpha: blink ? 0.45 : 1,
        aura: p.tiger ? `rgba(255, 110, 20, ${0.45 + 0.2 * Math.sin(g.time * 16)})`
          : shielded ? `rgba(240, 200, 110, ${0.35 + 0.15 * Math.sin(g.time * 20)})`
          : p.wardUntil > g.time ? `rgba(110, 160, 230, ${0.28 + 0.1 * Math.sin(g.time * 10)})`
          : p.focus > 0.15 ? `rgba(255, 210, 110, ${0.12 + 0.3 * p.focus + (p.focus >= 1 ? 0.1 * Math.sin(g.time * 12) : 0)})` : undefined,
      });
    // Health strip under the hero.
    const w = 36, ratio = p.hp / p.stats.maxHp;
    ctx.fillStyle = 'rgba(29,26,23,0.75)';
    ctx.fillRect(p.x - w / 2 - 1, p.y + p.r + 13, w + 2, 5);
    ctx.fillStyle = ratio > 0.35 ? '#c8b277' : '#b3261e';
    ctx.fillRect(p.x - w / 2, p.y + p.r + 14, w * ratio, 3);
  }

  drawAlly(ctx, a) {
    if (a.kind === 'maguni') return drawMaguni(ctx, a);
    if (a.kind === 'maguniBomb') {
      // 마구니 폭탄: a swollen, red-hot 마구니 with a glow.
      const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 2.4);
      glow.addColorStop(0, 'rgba(255, 120, 200, 0.55)');
      glow.addColorStop(1, 'rgba(160, 40, 200, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 2.4, 0, TAU);
      ctx.fill();
      return drawMaguni(ctx, a);
    }
    const fade = a.maxLife ? clamp(a.life / 1.2, 0, 1) : 1;
    if (a.kind === 'shin') {
      // Faint ring showing how far his banner draws the enemy.
      ctx.strokeStyle = 'rgba(179, 38, 30, 0.22)';
      ctx.setLineDash([6, 10]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.lure, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const look = a.kind === 'retinue' ? RETINUE_LOOKS[a.role] : ALLY_LOOKS[a.kind];
    drawUnit(ctx, look, a.x, a.y, a.r, a.facing, { alpha: fade, flash: a.hurtFlash > 0 });
    if (a.kind === 'shin') {
      const w = 38, ratio = clamp(a.hp / a.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(29,26,23,0.75)';
      ctx.fillRect(a.x - w / 2 - 1, a.y + a.r + 9, w + 2, 5);
      ctx.fillStyle = a.explode ? '#e0a040' : '#7fa0c8';
      ctx.fillRect(a.x - w / 2, a.y + a.r + 10, w * ratio, 3);
    }
    if (a.kind === 'decoy' || a.kind === 'shin') {
      // The royal banner he carries.
      ctx.globalAlpha = fade;
      ctx.strokeStyle = '#2a2018';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a.x - 6, a.y);
      ctx.lineTo(a.x - 6, a.y - 52);
      ctx.stroke();
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(a.x - 6, a.y - 52, 26, 18);
      ctx.fillStyle = '#b3261e';
      ctx.font = '700 12px "Gowun Batang", serif';
      ctx.textAlign = 'center';
      ctx.fillText('王', a.x + 7, a.y - 38);
      ctx.globalAlpha = 1;
    }
    if (a.kind === 'shin' && a.shout > 0) this.drawShout(ctx, a.x, a.y - 74, '내가 왕건이다!', Math.min(1, a.shout * 3));
  }

  /** 전장 오브젝트: oil jar, war drum, roadside cairn — with a bobbing hint icon. */
  drawFieldObject(ctx, g, e) {
    const { x, y, r } = e;
    const flash = e.flash > 0;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.8, r * 1.1, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1d1a17';
    let icon;
    if (e.def.object === 'oil') {
      icon = '🔥';
      // Round-bellied jar with a dark, glistening mouth.
      ctx.fillStyle = flash ? '#fff3d6' : '#8a5a32';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.95, r, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5e3a1e';
      ctx.fillRect(x - r * 0.95, y - r * 0.1, r * 1.9, r * 0.25);
      ctx.fillStyle = '#2b1d14';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.85, r * 0.45, r * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 210, 120, 0.7)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.4, y - r * 0.3, r * 0.15, r * 0.3, -0.4, 0, TAU);
      ctx.fill();
    } else if (e.def.object === 'drum') {
      icon = '🥁';
      // Barrel drum on a little stand, red body, pale skin, 태극 on the head.
      ctx.strokeStyle = '#3b2a1c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.8, y + r);
      ctx.lineTo(x - r * 0.5, y + r * 0.3);
      ctx.moveTo(x + r * 0.8, y + r);
      ctx.lineTo(x + r * 0.5, y + r * 0.3);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1d1a17';
      ctx.fillStyle = flash ? '#fff3d6' : '#b3261e';
      ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.1);
      ctx.strokeRect(x - r, y - r * 0.6, r * 2, r * 1.1);
      ctx.fillStyle = '#f0e2c0';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.6, r, r * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.6, r * 0.35, r * 0.13, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#2d5a9c';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.6, r * 0.35, r * 0.13, 0, 0, Math.PI);
      ctx.fill();
      for (const sx of [-0.6, 0, 0.6]) {
        ctx.fillStyle = '#e8c060';
        ctx.beginPath();
        ctx.arc(x + sx * r, y - r * 0.1, 2, 0, TAU);
        ctx.fill();
      }
    } else {
      icon = '✨';
      // A cairn of stones with coloured cloth strips (서낭당).
      const stones = [[0, 0.55, 1, 0.42], [-0.05, 0.05, 0.75, 0.36], [0.05, -0.38, 0.52, 0.3], [0, -0.75, 0.3, 0.22]];
      for (const [sx, sy, w, h] of stones) {
        ctx.fillStyle = flash ? '#fff3d6' : '#8d8a80';
        ctx.beginPath();
        ctx.ellipse(x + sx * r, y + sy * r, w * r, h * r, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      const t = g.time;
      [['#c0392b', -0.7], ['#2d5a9c', 0.75], ['#e8c060', -0.3], ['#3f8f66', 0.4]].forEach(([c, sx], i) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + sx * r * 0.6, y - r * 0.2);
        ctx.quadraticCurveTo(x + sx * r * 1.2, y + r * 0.1 + Math.sin(t * 3 + i) * 3, x + sx * r * 1.4, y + r * 0.5);
        ctx.stroke();
      });
    }
    // Hint icon bobbing above, so it reads as "break me".
    const bob = Math.sin(g.time * 3 + x * 0.01) * 3;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    ctx.fillText(icon, x, y - r - 16 + bob);
    ctx.restore();
  }

  /** A small speech bubble with a tail pointing down. */
  drawShout(ctx, x, y, text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '400 15px "Jua", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 18, h = 26;
    ctx.fillStyle = 'rgba(28, 24, 44, 0.9)';
    ctx.strokeStyle = 'rgba(255, 213, 107, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 12);
    ctx.moveTo(x - 6, y + h / 2);
    ctx.lineTo(x, y + h / 2 + 8);
    ctx.lineTo(x + 6, y + h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe08a';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  drawZones(ctx, g) {
    for (const z of g.zones) {
      const a = 1 - z.t / z.life;
      if (z.kind === 'spikes') {
        // 덫꾼's spike trap: a dark ring of iron spikes.
        const al = Math.min(1, a * 4);
        ctx.fillStyle = `rgba(60, 20, 16, ${0.45 * al})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(200, 60, 40, ${0.8 * al})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = `rgba(190, 190, 200, ${0.95 * al})`;
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * TAU + z.x * 0.01;
          const rr = i === 0 ? 0 : z.r * 0.6;
          const x = z.x + Math.cos(ang) * rr, y = z.y + Math.sin(ang) * rr;
          ctx.beginPath();
          ctx.moveTo(x, y - 7);
          ctx.lineTo(x - 4, y + 3);
          ctx.lineTo(x + 4, y + 3);
          ctx.closePath();
          ctx.fill();
        }
        continue;
      }
      if (z.kind === 'crack') {
        ctx.fillStyle = `rgba(40, 28, 20, ${0.35 * a})`;
        ctx.beginPath();
        ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, z.angle, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(160, 60, 30, ${0.8 * a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = z.angle + (i - 2) * 0.5;
          ctx.moveTo(z.x, z.y);
          ctx.lineTo(z.x + Math.cos(ang) * z.r * 0.9, z.y + Math.sin(ang) * z.r * 0.55);
        }
        ctx.stroke();
      } else if (z.kind === 'hoof') {
        // Burning hoofprints: a scorched patch with bright, licking flames.
        const flick = 0.8 + 0.2 * Math.sin(g.time * 22 + z.x * 0.3);
        const glow = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r * 1.15);
        glow.addColorStop(0, `rgba(255, 210, 90, ${0.75 * a * flick})`);
        glow.addColorStop(0.45, `rgba(255, 110, 30, ${0.6 * a})`);
        glow.addColorStop(1, 'rgba(200, 40, 10, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 1.15, 0, TAU);
        ctx.fill();
        for (let k = 0; k < 3; k++) {
          const ox = Math.sin(z.x * 0.7 + k * 2.1) * z.r * 0.45;
          const h = z.r * (0.7 + 0.35 * Math.sin(g.time * 14 + k * 1.7 + z.y)) * a;
          ctx.fillStyle = k === 1 ? `rgba(255, 236, 160, ${0.9 * a})` : `rgba(255, 140, 40, ${0.85 * a})`;
          ctx.beginPath();
          ctx.moveTo(z.x + ox - 6, z.y + 4);
          ctx.quadraticCurveTo(z.x + ox - 7, z.y - h * 0.5, z.x + ox, z.y - h);
          ctx.quadraticCurveTo(z.x + ox + 7, z.y - h * 0.5, z.x + ox + 6, z.y + 4);
          ctx.closePath();
          ctx.fill();
        }
      } else if (z.kind === 'fire') {
        // Burning pitch from a fire pot, flickering.
        const flick = 0.85 + 0.15 * Math.sin(g.time * 18 + z.x);
        ctx.fillStyle = `rgba(200, 70, 20, ${0.35 * a * flick})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, TAU);
        ctx.fill();
        for (let k = 0; k < 7; k++) {
          const ang = k * 0.9 + g.time * 2;
          const rr = z.r * (0.25 + 0.55 * ((k * 37) % 10) / 10);
          ctx.fillStyle = `rgba(250, ${150 + k * 12}, 60, ${0.55 * a})`;
          ctx.beginPath();
          ctx.arc(z.x + Math.cos(ang) * rr, z.y + Math.sin(ang) * rr - 4 * Math.sin(g.time * 9 + k), 6 + (k % 3) * 2, 0, TAU);
          ctx.fill();
        }
      } else if (z.kind === 'dust') {
        ctx.fillStyle = `rgba(150, 126, 90, ${0.35 * a})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (0.7 + 0.3 * (1 - a)), 0, TAU);
        ctx.fill();
      }
    }
  }

  /** 미륵 광배: faint guide lines while winding up, bright beams once live. */
  drawHalos(ctx, g) {
    for (const b of g.enemies) {
      if (b.dead || !b.halo) continue;
      const H = b.halo;
      for (let i = 0; i < H.beams; i++) {
        const a = b.haloAngle + (i * TAU) / H.beams;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        if (H.live) {
          const flick = 0.75 + 0.25 * Math.sin(g.time * 30 + i);
          ctx.fillStyle = `rgba(255, 226, 140, ${0.35 * flick})`;
          ctx.fillRect(0, -H.width / 2, H.length, H.width);
          ctx.fillStyle = `rgba(255, 250, 225, ${0.8 * flick})`;
          ctx.fillRect(0, -H.width / 6, H.length, H.width / 3);
        } else {
          ctx.fillStyle = 'rgba(150, 100, 210, 0.18)';
          ctx.fillRect(0, -H.width / 2, H.length, H.width);
          ctx.strokeStyle = 'rgba(150, 100, 210, 0.8)';
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 2;
          ctx.strokeRect(0, -H.width / 2, H.length, H.width);
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      if (H.live) {
        // The halo ring behind the head.
        ctx.strokeStyle = 'rgba(255, 220, 120, 0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 10, 0, TAU);
        ctx.stroke();
      }
    }
  }

  /** 관심법의 밤: everything beyond a small circle around the hero goes dark. */
  drawNight(ctx, g, v) {
    const left = g.darkUntil - g.time;
    if (left <= 0) return;
    const fade = Math.min(1, left / 1.5, (g.darkTotal - left) / 1.5);
    const p = g.player;
    const r0 = 150, r1 = 290;
    const grd = ctx.createRadialGradient(p.x, p.y, r0, p.x, p.y, r1);
    grd.addColorStop(0, 'rgba(12, 8, 20, 0)');
    grd.addColorStop(1, `rgba(12, 8, 20, ${0.93 * fade})`);
    ctx.fillStyle = grd;
    ctx.fillRect(v.x0 - 40, v.y0 - 40, v.x1 - v.x0 + 80, v.y1 - v.y0 + 80);
  }

  drawEnemy(ctx, g, e) {
    if (e.def.object) return this.drawFieldObject(ctx, g, e);
    if (e.def.behavior === 'static') {
      drawCart(ctx, e.x, e.y, e.r, e.flash > 0);
      return;
    }
    if (e.hidden) {
      // 땅굴병 underground: only a moving mound of earth shows.
      const w = Math.sin(g.time * 20 + e.seed * 9) * 2;
      ctx.fillStyle = 'rgba(92, 70, 44, 0.9)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 4, e.r * 1.2 + w, e.r * 0.6, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(60, 44, 28, 0.9)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(e.x - e.r + i * e.r, e.y + 4 - Math.abs(Math.sin(g.time * 14 + i)) * 6, 3, 0, TAU);
        ctx.fill();
      }
      return;
    }
    const windup = e.state === 'windup' || e.state === 'rise' || (e.isBoss && e.ps === 'windup');
    let aura;
    if (e.hasteUntil > g.time) aura = `rgba(230, 90, 160, ${0.3 + 0.12 * Math.sin(g.time * 10 + e.seed * 6)})`;
    if (e.isBoss && e.enraged) aura = `rgba(179, 38, 30, ${0.18 + 0.08 * Math.sin(g.time * 8)})`;
    const charmed = g.isCharmed(e);
    if (charmed) aura = `rgba(150, 100, 210, ${0.3 + 0.12 * Math.sin(g.time * 6 + e.seed * 6)})`;
    drawUnit(ctx, e.def.look, e.x, e.y, e.r, e.facing, { flash: e.flash > 0, elite: e.elite, shake: windup, aura });
    if (e.pull) {
      // 철쇄: the iron chain from 견훤's hand to the hooked soldier.
      const p = g.player;
      ctx.strokeStyle = 'rgba(29, 26, 23, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.strokeStyle = '#a7aab0';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (charmed) {
      // Small violet eye over swayed soldiers, fading as the spell runs out.
      const left = Math.min(1, (e.charmUntil - g.time) / 2);
      ctx.fillStyle = `rgba(150, 100, 210, ${0.4 + 0.5 * left})`;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - e.r * 2.5 - 6, 6, 3.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1d1a17';
      ctx.beginPath();
      ctx.arc(e.x, e.y - e.r * 2.5 - 6, 1.8, 0, TAU);
      ctx.fill();
    }
    if (e.stun > 0) {
      ctx.strokeStyle = 'rgba(240, 200, 110, 0.85)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ang = g.time * 6 + (i * TAU) / 3;
        const sx = e.x + Math.cos(ang) * e.r * 0.8, sy = e.y - e.r * 2.3 + Math.sin(ang) * e.r * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy);
        ctx.lineTo(sx + 3, sy);
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx, sy + 3);
        ctx.stroke();
      }
    }
    if ((e.state === 'windup' || e.state === 'charge') && !e.isBoss && e.dashDir !== undefined) {
      ctx.strokeStyle = 'rgba(179, 38, 30, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.dashDir) * (e.state === 'charge' ? 50 : 90), e.y + Math.sin(e.dashDir) * (e.state === 'charge' ? 50 : 90));
      ctx.stroke();
    }
  }

  drawCaltrops(ctx, g) {
    const lv = g.player.stats.caltrops;
    if (!lv) return;
    const p = g.player;
    ctx.strokeStyle = 'rgba(29, 26, 23, 0.25)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 120, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** 감나무 가지: a twig with two ripe persimmons, bobbing with a soft glow. */
  drawCrowFeed(ctx, k, time) {
    const bob = Math.sin(time * 3 + k.x) * 3;
    const y = k.y + bob;
    ctx.fillStyle = `rgba(255, 170, 70, ${0.18 + 0.12 * Math.sin(time * 4)})`;
    ctx.beginPath();
    ctx.arc(k.x, y, 24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(k.x - 14, y + 8);
    ctx.quadraticCurveTo(k.x, y - 2, k.x + 14, y - 8);
    ctx.stroke();
    ctx.fillStyle = '#6aa04a';
    ctx.beginPath();
    ctx.ellipse(k.x + 6, y - 10, 6, 3, -0.6, 0, TAU);
    ctx.fill();
    for (const [ox, oy] of [[-5, 4], [6, 2]]) {
      ctx.fillStyle = '#f08a2a';
      ctx.beginPath();
      ctx.arc(k.x + ox, y + oy, 6.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 230, 180, 0.7)';
      ctx.beginPath();
      ctx.arc(k.x + ox - 2, y + oy - 2, 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3d5a2a';
      ctx.fillRect(k.x + ox - 2, y + oy - 7, 4, 2);
    }
    ctx.lineCap = 'butt';
  }

  /**
   * Where the 감나무 가지 is: a bouncing marker above it, or an arrow at the
   * screen edge pointing to it when it is off-screen.
   */
  drawFeedPointer(ctx, k, time, v) {
    const m = 50;
    const inside = k.x > v.x0 + m && k.x < v.x1 - m && k.y > v.y0 + m && k.y < v.y1 - m;
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save();
    if (inside) {
      // Expanding rings and a bouncing "!" badge.
      for (let i = 0; i < 2; i++) {
        const t = (time * 0.9 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(255, 210, 100, ${0.8 * (1 - t)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(k.x, k.y, 20 + t * 46, 0, TAU);
        ctx.stroke();
      }
      const by = k.y - 46 - Math.abs(Math.sin(time * 4)) * 10;
      ctx.fillStyle = '#ffd56b';
      ctx.beginPath();
      ctx.arc(k.x, by, 13, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2b2236';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2b2236';
      ctx.font = 'bold 18px "Jua", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', k.x, by + 1);
      ctx.restore();
      return;
    }
    // Off-screen: an arrow on the edge, toward the branch.
    const cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
    const dx = k.x - cx, dy = k.y - cy;
    const sx = (v.x1 - v.x0) / 2 - m, sy = (v.y1 - v.y0) / 2 - m;
    const s = Math.min(sx / Math.abs(dx || 1e-6), sy / Math.abs(dy || 1e-6));
    const ax = cx + dx * s, ay = cy + dy * s;
    const ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.fillStyle = 'rgba(28, 24, 44, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 213, 107, ${0.6 + 0.4 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐦‍⬛', 0, 1);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd56b';
    ctx.beginPath();
    ctx.moveTo(38 + pulse * 4, 0);
    ctx.lineTo(26, -9);
    ctx.lineTo(26, 9);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  /** 까마귀: a chubby black bird with flapping wings. */
  drawCrow(ctx, c) {
    const f = Math.sin(c.flap) * 0.9;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.facing * 1.4, 1.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 34, 10, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1f1b26';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.quadraticCurveTo(-8, -2 - s * 4 - f * 12 * s, -16, -4 - f * 14);
      ctx.quadraticCurveTo(-8, 4, -2, 3);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 8, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9, -5, 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0b040';
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(21, -4);
    ctx.lineTo(14, -2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10.5, -6.5, 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1f1b26';
    ctx.beginPath();
    ctx.arc(11, -6.5, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawArenaFloor(ctx, g, v) {
    const a = g.arena;
    // Darken everything outside the ring.
    ctx.fillStyle = 'rgba(20, 17, 14, 0.45)';
    ctx.beginPath();
    ctx.rect(v.x0 - 10, v.y0 - 10, v.x1 - v.x0 + 20, v.y1 - v.y0 + 20);
    ctx.arc(a.x, a.y, a.r, 0, TAU, true);
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 42, 26, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, TAU);
    ctx.stroke();
  }

  drawArenaBanners(ctx, g) {
    const a = g.arena;
    const n = 28;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU;
      const x = a.x + Math.cos(ang) * a.r, y = a.y + Math.sin(ang) * a.r;
      ctx.strokeStyle = '#2a2018';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 34);
      ctx.stroke();
      const wave = Math.sin(g.time * 3 + i) * 3;
      ctx.fillStyle = i % 2 ? '#b3261e' : '#1d1a17';
      ctx.beginPath();
      ctx.moveTo(x, y - 34);
      ctx.lineTo(x + 16, y - 31 + wave);
      ctx.lineTo(x + 15, y - 20 + wave);
      ctx.lineTo(x, y - 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawGroundFx(ctx, g) {
    for (const f of g.fx) {
      const p = f.t / f.life;
      if (f.type === 'dashLine') {
        const pulse = 0.18 + 0.2 * p;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.fillStyle = `rgba(179, 38, 30, ${pulse})`;
        ctx.fillRect(0, -f.width / 2, f.length, f.width);
        ctx.strokeStyle = 'rgba(179, 38, 30, 0.8)';
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -f.width / 2, f.length, f.width);
        ctx.setLineDash([]);
        ctx.restore();
      } else if (f.type === 'trapWarn') {
        // 덫꾼: where spikes will spring up (brown, filling in as it arms).
        ctx.fillStyle = `rgba(120, 72, 32, ${0.25 + 0.35 * p})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.range, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 95, 45, 0.95)';
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(170, 110, 50, 0.9)';
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.range * 0.55, -Math.PI / 2, -Math.PI / 2 + TAU * p);
        ctx.closePath();
        ctx.fill();
      } else if (f.type === 'ringWarn') {
        const rgb = f.tone === 'violet' ? '150, 100, 210' : '179, 38, 30';
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + 0.22 * p})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.range, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb}, 0.85)`;
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (f.type === 'cone') {
        const half = (f.arc * Math.PI) / 360;
        ctx.fillStyle = `rgba(179, 38, 30, ${0.12 + 0.22 * p})`;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.range, f.angle - half, f.angle + half);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawFx(ctx, g) {
    for (const f of g.fx) {
      const p = f.t / f.life;
      switch (f.type) {
        case 'kingSlash':
        case 'royal': {
          // 왕건 — 청룡 검광: three thin, glowing blue-white sword trails sweep fast,
          // with sparkles riding the leading edge (gold for 태조의 검).
          const full = f.arc >= 360;
          const half = full ? Math.PI : (f.arc * Math.PI) / 360;
          const sweep = Math.min(1, p / 0.3);
          const a0 = f.angle - half, a1 = f.angle - half + 2 * half * sweep;
          const alpha = 1 - Math.max(0, (p - 0.3) / 0.7);
          const gold = f.type === 'royal';
          ctx.save();
          ctx.lineCap = 'round';
          ctx.shadowColor = gold ? 'rgba(255, 210, 110, 0.9)' : 'rgba(120, 190, 255, 0.9)';
          ctx.shadowBlur = 12;
          [[1, 4, gold ? '255, 236, 170' : '220, 240, 255'], [0.86, 2.5, gold ? '255, 200, 90' : '130, 190, 255'], [0.72, 1.6, gold ? '250, 170, 60' : '80, 140, 230']].forEach(([k, w, c], i) => {
            ctx.strokeStyle = `rgba(${c}, ${alpha * (1 - i * 0.18)})`;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.range * k, a0 + i * 0.05, a1);
            ctx.stroke();
          });
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          for (let i = 0; i < 3; i++) {
            const r = f.range * (0.78 + i * 0.1);
            const x = f.x + Math.cos(a1) * r, y = f.y + Math.sin(a1) * r;
            const s = 3 - i * 0.6;
            ctx.beginPath();
            ctx.moveTo(x, y - s * 2);
            ctx.lineTo(x + s * 0.6, y);
            ctx.lineTo(x, y + s * 2);
            ctx.lineTo(x - s * 0.6, y);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'chop': {
          // 견훤 — 패왕 내려찍기: no sweep. A heavy crimson wedge lands at once,
          // the ground cracks where the blade bites and stone chips fly out.
          const full = f.arc >= 360;
          const half = full ? Math.PI : (f.arc * Math.PI) / 360;
          const a = 1 - p;
          const grow = 0.85 + 0.15 * Math.min(1, p * 4);
          const R = f.range * grow;
          const grd = ctx.createRadialGradient(f.x, f.y, R * 0.2, f.x, f.y, R);
          grd.addColorStop(0, `rgba(90, 14, 10, ${0.1 * a})`);
          grd.addColorStop(0.65, `rgba(180, 34, 20, ${0.55 * a})`);
          grd.addColorStop(1, `rgba(255, 120, 40, ${0.75 * a})`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.arc(f.x, f.y, R, f.angle - half, f.angle + half);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = `rgba(40, 6, 4, ${0.9 * a})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(f.x, f.y, R, f.angle - half, f.angle + half);
          ctx.stroke();
          // Cracks from the point of impact.
          const ix = f.x + Math.cos(f.angle) * R * 0.75, iy = f.y + Math.sin(f.angle) * R * 0.75;
          ctx.strokeStyle = `rgba(30, 18, 10, ${0.85 * a})`;
          ctx.lineWidth = 2.5;
          for (let i = 0; i < 5; i++) {
            const ca = f.angle + (i - 2) * 0.7 + Math.sin(f.x + i) * 0.2;
            const len = R * (0.25 + 0.12 * ((i * 37 + Math.round(f.x)) % 5) / 5);
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix + Math.cos(ca + 0.3) * len * 0.5, iy + Math.sin(ca + 0.3) * len * 0.5);
            ctx.lineTo(ix + Math.cos(ca) * len, iy + Math.sin(ca) * len);
            ctx.stroke();
          }
          // Flying stone chips.
          ctx.fillStyle = `rgba(110, 90, 70, ${a})`;
          for (let i = 0; i < 6; i++) {
            const ca = f.angle + (i - 2.5) * 0.45;
            const d = 10 + p * 60 + i * 4;
            ctx.fillRect(ix + Math.cos(ca) * d - 2.5, iy + Math.sin(ca) * d - 2.5 - Math.sin(p * Math.PI) * 14, 5, 5);
          }
          break;
        }
        case 'slash':
        case 'paewang': {
          const st = ARC_STYLE[f.type];
          const full = f.arc >= 360;
          const half = full ? Math.PI : (f.arc * Math.PI) / 360;
          const sweep = Math.min(1, p / 0.35);
          const a0 = f.angle - half, a1 = f.angle - half + 2 * half * sweep;
          const alpha = 1 - Math.max(0, (p - 0.35) / 0.65);
          ctx.fillStyle = rgba(st.fill, alpha);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, a0, a1);
          ctx.arc(f.x, f.y, f.range * 0.6, a1, a0, true);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rgba(st.edge, alpha);
          ctx.lineWidth = st.width;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, a0, a1);
          ctx.stroke();
          break;
        }
        case 'smash': {
          // 치악산 부수기: a shockwave ring racing out with cracks behind it.
          const a = 1 - p;
          const R = f.range * (0.3 + 0.7 * Math.min(1, p * 2));
          ctx.fillStyle = `rgba(120, 80, 40, ${0.28 * a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, R, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 200, 120, ${0.9 * a})`;
          ctx.lineWidth = 10 * a + 2;
          ctx.stroke();
          ctx.strokeStyle = `rgba(40, 26, 14, ${0.8 * a})`;
          ctx.lineWidth = 3;
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * TAU + 0.3;
            ctx.beginPath();
            ctx.moveTo(f.x + Math.cos(ang) * 30, f.y + Math.sin(ang) * 30);
            ctx.lineTo(f.x + Math.cos(ang + 0.12) * R * 0.55, f.y + Math.sin(ang + 0.12) * R * 0.55);
            ctx.lineTo(f.x + Math.cos(ang - 0.05) * R * 0.95, f.y + Math.sin(ang - 0.05) * R * 0.95);
            ctx.stroke();
          }
          break;
        }
        case 'lob': {
          // 투석병's stone arcing through the air.
          const k = Math.min(1, p);
          const x = f.x + (f.x1 - f.x) * k, y = f.y + (f.y1 - f.y) * k - Math.sin(k * Math.PI) * 90;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(f.x + (f.x1 - f.x) * k, f.y + (f.y1 - f.y) * k, 6, 3, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#7a7268';
          ctx.strokeStyle = '#26231f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, TAU);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'whirl': {
          // 도끼 광전사's whirl: a ring of blurred axe blades.
          const a = 1 - p;
          ctx.strokeStyle = `rgba(200, 60, 40, ${0.7 * a})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range * 0.85, f.angle, f.angle + Math.PI * 1.4);
          ctx.stroke();
          ctx.strokeStyle = `rgba(230, 230, 220, ${0.8 * a})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range * 0.85, f.angle + 0.3, f.angle + Math.PI * 1.2);
          ctx.stroke();
          break;
        }
        case 'pulse': {
          // 무당's blessing spreading out.
          const a = 1 - p;
          ctx.strokeStyle = `rgba(230, 90, 160, ${0.75 * a})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range * (0.2 + 0.8 * p), 0, TAU);
          ctx.stroke();
          break;
        }
        case 'eight': {
          // 무자식이 상팔자: a huge figure-eight of blade light plus a brushed 八.
          const a = 1 - p;
          const R = f.range;
          const draw = Math.min(1, p / 0.45);
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.angle);
          ctx.lineCap = 'round';
          for (const [w, col] of [[34, `rgba(255, 60, 30, ${0.35 * a})`], [14, `rgba(255, 170, 60, ${0.85 * a})`], [5, `rgba(255, 245, 210, ${a})`]]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.beginPath();
            const steps = 90;
            for (let i = 0; i <= steps * draw; i++) {
              const t = (i / steps) * TAU;
              const d = 1 + Math.sin(t) ** 2;
              const x = (R * Math.cos(t)) / d, y = (R * Math.sin(t) * Math.cos(t)) / d;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.rotate(-f.angle);
          ctx.font = `bold ${Math.round(R * 0.5)}px 'Nanum Brush Script', serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(255, 220, 160, ${0.8 * a})`;
          ctx.strokeStyle = `rgba(120, 20, 10, ${0.8 * a})`;
          ctx.lineWidth = 4;
          ctx.strokeText('八', 0, -R * 0.05);
          ctx.fillText('八', 0, -R * 0.05);
          ctx.restore();
          break;
        }
        case 'burst': {
          // Golden lotus pop.
          const rr = f.range * (0.4 + 0.6 * Math.min(1, p * 1.8));
          const a = 1 - p;
          ctx.fillStyle = `rgba(240, 200, 110, ${0.3 * a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, rr, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(240, 200, 110, ${0.9 * a})`;
          ctx.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * TAU;
            ctx.beginPath();
            ctx.ellipse(f.x + Math.cos(ang) * rr * 0.5, f.y + Math.sin(ang) * rr * 0.5, rr * 0.45, rr * 0.18, ang, 0, TAU);
            ctx.stroke();
          }
          break;
        }
        case 'blast': {
          // 순절: red-gold shockwave with an ink core.
          const rr = f.range * (0.3 + 0.7 * Math.min(1, p * 2.2));
          const a = 1 - p;
          ctx.fillStyle = `rgba(200, 70, 40, ${0.35 * a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, rr, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(240, 190, 90, ${0.95 * a})`;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.fillStyle = `rgba(29, 26, 23, ${0.5 * a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, rr * 0.35, 0, TAU);
          ctx.fill();
          break;
        }
        case 'bolt': {
          // Lightning: a jagged white-blue line through every struck point.
          const a = 1 - p;
          ctx.lineCap = 'round';
          for (const [w, col] of [[7, `rgba(140, 180, 255, ${0.35 * a})`], [2.5, `rgba(240, 248, 255, ${a})`]]) {
            let seed = Math.floor(f.seed * 233280);
            const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5;
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(f.points[0].x, f.points[0].y);
            for (let i = 1; i < f.points.length; i++) {
              const A = f.points[i - 1], B = f.points[i];
              for (let k = 1; k <= 4; k++) {
                const t = k / 4;
                const j = k === 4 ? 0 : 14;
                ctx.lineTo(A.x + (B.x - A.x) * t + rnd() * j, A.y + (B.y - A.y) * t + rnd() * j);
              }
            }
            ctx.stroke();
          }
          break;
        }
        case 'eye': {
          // 관심법: an opened eye drawn in violet and gold.
          const a = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
          const w = f.size * (f.big ? 1.6 : 1.3), h = f.size * 0.7;
          ctx.strokeStyle = `rgba(150, 100, 210, ${a})`;
          ctx.lineWidth = f.big ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(f.x - w, f.y);
          ctx.quadraticCurveTo(f.x, f.y - h * 1.6, f.x + w, f.y);
          ctx.quadraticCurveTo(f.x, f.y + h * 1.6, f.x - w, f.y);
          ctx.stroke();
          ctx.fillStyle = `rgba(224, 178, 76, ${a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, h * 0.75, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(29, 26, 23, ${a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, h * 0.35, 0, TAU);
          ctx.fill();
          if (f.big) {
            ctx.strokeStyle = `rgba(150, 100, 210, ${0.5 * a})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 340 * Math.min(1, p * 2), 0, TAU);
            ctx.stroke();
          }
          break;
        }
        case 'spark': {
          ctx.strokeStyle = `rgba(250, 240, 210, ${1 - p})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * TAU + 0.4;
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x + Math.cos(ang) * 9, f.y + Math.sin(ang) * 9);
          }
          ctx.stroke();
          break;
        }
        case 'bossSpin': {
          const a = 1 - p;
          ctx.fillStyle = `rgba(29, 26, 23, ${0.35 * a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, 0, TAU);
          ctx.arc(f.x, f.y, f.range * 0.55, 0, TAU, true);
          ctx.fill();
          ctx.strokeStyle = `rgba(179, 38, 30, ${0.9 * a})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'thrust': {
          ctx.strokeStyle = `rgba(244, 236, 216, ${1 - p})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(f.angle) * 14, f.y + Math.sin(f.angle) * 14);
          ctx.lineTo(f.x + Math.cos(f.angle) * 34, f.y + Math.sin(f.angle) * 34);
          ctx.stroke();
          break;
        }
        case 'ink': {
          // Ink splatter: a main blot plus seeded droplets.
          const a = (1 - p) * 0.75;
          ctx.fillStyle = `rgba(29, 26, 23, ${a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size * (0.6 + p * 0.4), 0, TAU);
          ctx.fill();
          for (let i = 0; i < 7; i++) {
            const ang = f.seed * 40 + i * 2.39;
            const dd = f.size * (0.9 + ((f.seed * 13 + i * 0.37) % 1) * 1.1) * (0.7 + p * 0.5);
            ctx.beginPath();
            ctx.arc(f.x + Math.cos(ang) * dd, f.y + Math.sin(ang) * dd, f.size * 0.18 * (1 - ((i * 0.13) % 0.5)), 0, TAU);
            ctx.fill();
          }
          break;
        }
        case 'puff': {
          const a = (1 - p) * 0.5;
          ctx.fillStyle = f.tone === 'mud' ? `rgba(90, 78, 58, ${a})` : `rgba(241, 232, 210, ${a})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size * (0.5 + p), 0, TAU);
          ctx.fill();
          break;
        }
      }
    }
  }

  drawTexts(ctx, g) {
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const t of g.texts) {
      const a = 1 - t.t / t.life;
      ctx.font = `700 ${t.order ? 15 : t.big ? 17 : t.hurt ? 16 : 13}px "Jua", "Gowun Dodum", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(29, 26, 23, ${a})`;
      ctx.fillStyle = t.order ? `rgba(255, 203, 107, ${a})` : t.hurt ? `rgba(224, 72, 56, ${a})` : t.heal ? `rgba(160, 214, 140, ${a})` : `rgba(246, 239, 220, ${a})`;
      ctx.strokeText(t.v, t.x, t.y);
      ctx.fillText(t.v, t.x, t.y);
    }
  }

  drawVignette(ctx, hurt) {
    const { w, h } = this;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(20, 17, 14, 0)');
    grad.addColorStop(1, hurt > 0 ? `rgba(120, 20, 14, ${0.35 + hurt})` : 'rgba(20, 17, 14, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawStick(ctx, input) {
    const s = input.stick;
    if (!s) return;
    const R = input.stickRadius;
    const dx = s.x - s.ox, dy = s.y - s.oy;
    const l = Math.hypot(dx, dy);
    const m = l > R ? R / l : 1;
    ctx.strokeStyle = 'rgba(241, 232, 210, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.ox, s.oy, R, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(241, 232, 210, 0.55)';
    ctx.beginPath();
    ctx.arc(s.ox + dx * m, s.oy + dy * m, 20, 0, TAU);
    ctx.fill();
  }
}
