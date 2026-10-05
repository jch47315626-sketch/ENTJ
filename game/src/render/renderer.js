import { GROUNDS } from './ground.js';
import { drawUnit, drawCart, drawCoin, drawRice, drawProjectile } from './sprites.js';
import { clamp, TAU } from '../core/math.js';
import { TRAP } from '../systems/traps.js';

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
    // Soft dusk tint: keeps the field calm so units and pickups stand out.
    ctx.fillStyle = 'rgba(24, 20, 36, 0.18)';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (g.arena) this.drawArenaFloor(ctx, g, v);
    this.drawCaltrops(ctx, g);
    this.drawTraps(ctx, g);
    this.drawZones(ctx, g);
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
    this.drawTexts(ctx, g);
    ctx.restore();

    this.drawVignette(ctx, p.hurtFlash > 0 ? p.hurtFlash : 0);
    this.drawStick(ctx, input);
  }

  drawPlayer(ctx, g) {
    const p = g.player;
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
        aura: shielded ? `rgba(240, 200, 110, ${0.35 + 0.15 * Math.sin(g.time * 20)})`
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
  }

  drawZones(ctx, g) {
    for (const z of g.zones) {
      const a = 1 - z.t / z.life;
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
        // Churned earth with a hoofprint, glowing faintly while it still burns.
        ctx.fillStyle = `rgba(120, 82, 48, ${0.35 * a})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.8, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(230, 150, 70, ${0.55 * a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.35, z.angle + 0.6, z.angle + TAU - 0.6);
        ctx.stroke();
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
    if (e.def.behavior === 'static') {
      drawCart(ctx, e.x, e.y, e.r, e.flash > 0);
      return;
    }
    const windup = e.state === 'windup' || (e.isBoss && e.ps === 'windup');
    let aura;
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

  /** 까마귀: a chubby black bird with flapping wings (carries a coin when busy). */
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
    if (c.carry) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(20, -2, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 견훤's 함정: a buried pot with a fuse that glows once armed. */
  drawTraps(ctx, g) {
    for (const tr of g.traps) {
      const armed = tr.t >= TRAP.arm;
      const fade = Math.min(1, (TRAP.life - tr.t) / 2);
      ctx.globalAlpha = Math.max(0.2, fade);
      ctx.fillStyle = 'rgba(30, 22, 16, 0.55)';
      ctx.beginPath();
      ctx.ellipse(tr.x, tr.y + 3, 14, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5a3d2a';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2b1d14';
      ctx.lineWidth = 2;
      ctx.stroke();
      const blink = armed ? 0.55 + 0.45 * Math.sin(g.time * 8 + tr.x) : 0.25;
      ctx.fillStyle = `rgba(255, 120, 60, ${blink})`;
      ctx.beginPath();
      ctx.arc(tr.x + 4, tr.y - 7, 3.5, 0, TAU);
      ctx.fill();
      if (armed) {
        ctx.strokeStyle = `rgba(255, 140, 70, ${0.25 * blink})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, TRAP.trigger + 6, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
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
        case 'slash':
        case 'royal':
        case 'chop':
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
