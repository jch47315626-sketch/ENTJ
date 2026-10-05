import { GROUNDS } from './ground.js';
import { drawUnit, drawCart, drawCoin, drawRice, drawProjectile, drawMaceHead } from './sprites.js';
import { clamp, TAU } from '../core/math.js';

const ALLY_LOOKS = {
  soldier: { body: '#3e5a7a', accent: '#1f2d3d', hat: 'helmetBlue', weapon: 'spear', skin: '#e3c39c' },
  archer: { body: '#3e5a7a', accent: '#1f2d3d', hat: 'hoodBlue', weapon: 'bow', skin: '#e3c39c' },
  decoy: { body: '#2d3b5c', trim: '#c9a24a', plume: '#b3261e', hat: 'hero', weapon: 'sword', skin: '#e3c39c' },
};

/** Fill / edge colours for arc-shaped attack effects. */
const ARC_STYLE = {
  slash: { fill: [244, 236, 216, 0.5], edge: [29, 26, 23, 0.55], width: 2 },
  royal: { fill: [240, 210, 130, 0.55], edge: [29, 26, 23, 0.55], width: 2 },
  chop: { fill: [236, 222, 196, 0.6], edge: [142, 31, 23, 0.8], width: 3.5 },
  paewang: { fill: [200, 64, 44, 0.55], edge: [29, 26, 23, 0.8], width: 4 },
  swing: { fill: [196, 190, 178, 0.3], edge: [29, 26, 23, 0.5], width: 2.5 },
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
    if (g.arena) this.drawArenaFloor(ctx, g, v);
    this.drawCaltrops(ctx, g);
    this.drawZones(ctx, g);

    for (const k of g.pickups) {
      if (k.kind === 'coin') drawCoin(ctx, k.x, k.y, k.tier, k.t);
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

    this.drawOrbit(ctx, g);
    for (const pr of g.projectiles) drawProjectile(ctx, pr);
    this.drawFx(ctx, g);
    if (g.arena) this.drawArenaBanners(ctx, g);
    this.drawTexts(ctx, g);
    ctx.restore();

    this.drawVignette(ctx, p.hurtFlash > 0 ? p.hurtFlash : 0);
    this.drawStick(ctx, input);
  }

  drawPlayer(ctx, g) {
    const p = g.player;
    const look = p.hero.look;
    const blink = p.invuln > 0 && Math.floor(g.time * 30) % 2 === 0;
    drawUnit(ctx, { ...look, body: look.robe, weapon: p.orbit ? null : look.weapon },
      p.x, p.y, p.r, p.facing, { alpha: blink ? 0.45 : 1 });
    // Health strip under the hero.
    const w = 36, ratio = p.hp / p.stats.maxHp;
    ctx.fillStyle = 'rgba(29,26,23,0.75)';
    ctx.fillRect(p.x - w / 2 - 1, p.y + p.r + 9, w + 2, 5);
    ctx.fillStyle = ratio > 0.35 ? '#c8b277' : '#b3261e';
    ctx.fillRect(p.x - w / 2, p.y + p.r + 10, w * ratio, 3);
  }

  drawAlly(ctx, a) {
    const fade = a.maxLife ? clamp(a.life / 1.2, 0, 1) : 1;
    drawUnit(ctx, ALLY_LOOKS[a.kind], a.x, a.y, a.r, a.facing, { alpha: fade });
    if (a.kind === 'decoy') {
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

  drawOrbit(ctx, g) {
    const p = g.player;
    if (!p.orbit) return;
    ctx.strokeStyle = 'rgba(80, 74, 66, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    for (const m of p.orbit) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const m of p.orbit) {
      ctx.fillStyle = 'rgba(224, 178, 76, 0.25)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, TAU);
      ctx.fill();
      drawMaceHead(ctx, m.x, m.y, m.size * 0.45);
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
      } else if (z.kind === 'lotus') {
        ctx.fillStyle = `rgba(224, 178, 76, ${0.18 * a})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(224, 178, 76, ${0.6 * a})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * TAU + g.time * 0.4;
          ctx.beginPath();
          ctx.ellipse(z.x + Math.cos(ang) * z.r * 0.55, z.y + Math.sin(ang) * z.r * 0.55, z.r * 0.3, z.r * 0.12, ang, 0, TAU);
          ctx.stroke();
        }
      } else if (z.kind === 'dust') {
        ctx.fillStyle = `rgba(150, 126, 90, ${0.35 * a})`;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (0.7 + 0.3 * (1 - a)), 0, TAU);
        ctx.fill();
      }
    }
  }

  drawEnemy(ctx, g, e) {
    if (e.def.behavior === 'static') {
      drawCart(ctx, e.x, e.y, e.r, e.flash > 0);
      return;
    }
    const windup = e.state === 'windup' || (e.isBoss && e.ps === 'windup');
    let aura;
    if (e.isBoss && e.enraged) aura = `rgba(179, 38, 30, ${0.18 + 0.08 * Math.sin(g.time * 8)})`;
    drawUnit(ctx, e.def.look, e.x, e.y, e.r, e.facing, { flash: e.flash > 0, elite: e.elite, shake: windup, aura });
    if (e.stun > 0) {
      ctx.strokeStyle = 'rgba(240, 200, 110, 0.85)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ang = g.time * 6 + (i * TAU) / 3;
        const sx = e.x + Math.cos(ang) * e.r * 0.8, sy = e.y - e.r * 1.1 + Math.sin(ang) * e.r * 0.3;
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
        ctx.fillStyle = `rgba(179, 38, 30, ${0.1 + 0.22 * p})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.range, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(179, 38, 30, 0.8)';
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
        case 'paewang':
        case 'swing': {
          const st = ARC_STYLE[f.type];
          const full = f.arc >= 360;
          const half = full ? Math.PI : (f.arc * Math.PI) / 360;
          const sweep = Math.min(1, p / 0.35);
          const a0 = f.angle - half, a1 = f.angle - half + 2 * half * sweep;
          const alpha = 1 - Math.max(0, (p - 0.35) / 0.65);
          ctx.fillStyle = rgba(st.fill, alpha);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, a0, a1);
          ctx.arc(f.x, f.y, f.range * (f.type === 'swing' ? 0.72 : 0.6), a1, a0, true);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = rgba(st.edge, alpha);
          ctx.lineWidth = st.width;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, a0, a1);
          ctx.stroke();
          if (f.type === 'swing') drawMaceHead(ctx, f.x + Math.cos(a1) * f.range * 0.86, f.y + Math.sin(a1) * f.range * 0.86, 7);
          break;
        }
        case 'ring':
        case 'halo':
        case 'burst': {
          const gold = f.type !== 'ring';
          const rr = f.range * (0.4 + 0.6 * Math.min(1, p * 1.8));
          const a = 1 - p;
          if (f.type === 'burst') {
            ctx.fillStyle = `rgba(240, 200, 110, ${0.35 * a})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, rr, 0, TAU);
            ctx.fill();
          }
          ctx.strokeStyle = gold ? `rgba(240, 200, 110, ${0.9 * a})` : `rgba(29, 26, 23, ${0.7 * a})`;
          ctx.lineWidth = gold ? 6 : 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, rr, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'mark': {
          // 법륜 telegraph: a turning eight-spoked wheel.
          const a = 0.4 + 0.5 * p;
          ctx.strokeStyle = `rgba(240, 200, 110, ${a})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.range * 0.3, 0, TAU);
          ctx.stroke();
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * TAU + p * 2;
            ctx.beginPath();
            ctx.moveTo(f.x + Math.cos(ang) * f.range * 0.3, f.y + Math.sin(ang) * f.range * 0.3);
            ctx.lineTo(f.x + Math.cos(ang) * f.range, f.y + Math.sin(ang) * f.range);
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
      ctx.font = `700 ${t.big ? 17 : t.hurt ? 16 : 13}px "Gowun Batang", serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(29, 26, 23, ${a})`;
      ctx.fillStyle = t.hurt ? `rgba(224, 72, 56, ${a})` : t.heal ? `rgba(160, 214, 140, ${a})` : `rgba(246, 239, 220, ${a})`;
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
