import { hitArc, currentWeaponLevel } from './weapons.js';

/**
 * 견훤's two builds move differently on purpose.
 *
 * 패공 (A): swing → lunge in (기습) → after the swing, dash to another foe
 *   and cut (연참) → hop back out (이탈) → go again. 패왕의 대도 adds a 검기.
 * 반격 (B): wade in. 철벽 adds armour for every foe close by; when hit,
 *   되받아치기 answers with a ring cut that clears space, and 패왕의 반격
 *   then dashes onto the nearest foe for a follow-up.
 *
 * Hooks: afterSwing(g) from the weapon system, onHurt(g) from hurtPlayer,
 * updateBuild(g, dt) every frame (dash movement, timers, 철벽 count).
 */
const PAEGONG = {
  lunge: { reach: 210, speed: 620, time: 0.1 },
  rush: { cooldown: 1.4, delay: 0.16, range: 250, speed: 760, mul: 1.2, arc: 150, back: 0.12, backSpeed: 420 },
  wave: { speed: 620, life: 0.45, mul: 0.9, radius: 20 },
};
const BANGYEOK = {
  wall: { radius: 100, perFoe: 0.6, max: 4 },
  counter: { cooldown: 0.9, delay: 0.18, radius: 125, mul: 2.2, knockback: 300, stun: 0.35 },
  chase: { range: 270, speed: 760, mul: 1.3, arc: 140 },
};

const weaponDamage = (p) => Math.max(currentWeaponLevel(p).damage, 30);

/** Moves the hero in a straight line for a short time (overrides steering). */
function dash(p, angle, speed, time, then) {
  p.dash = { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, t: time, then };
  p.facing = angle;
}

/** A front cut where the hero stands. */
function strike(g, mul, arc) {
  const p = g.player;
  const lv = currentWeaponLevel(p);
  hitArc(g, p.x, p.y, p.facing, (lv.range + 10) * p.stats.area, arc, weaponDamage(p) * mul * p.stats.might, 140, 'chop');
}

/** 패공: called right after each main-weapon swing. */
export function afterSwing(g) {
  const p = g.player;
  const m = p.meta;
  if (p.hero.id !== 'gyeonhwon') return;
  // 기습: close the gap to the target before the blade lands.
  if (m.lunge && !p.dash) {
    const t = g.nearestEnemy(p.x, p.y, PAEGONG.lunge.reach);
    if (t) {
      const d = Math.hypot(t.x - p.x, t.y - p.y) - t.r - p.r - 18;
      if (d > 8) {
        const L = PAEGONG.lunge;
        dash(p, Math.atan2(t.y - p.y, t.x - p.x), L.speed, Math.min(L.time, d / L.speed));
      }
    }
  }
  // 연참: a moment later, dash to a different foe and cut, then step out.
  if (m.rush && g.time >= (p.rushReadyAt ?? 0)) {
    const R = PAEGONG.rush;
    p.rushReadyAt = g.time + R.cooldown;
    const first = g.nearestEnemy(p.x, p.y, R.range);
    g.later(R.delay, () => {
      if (g.state !== 'play') return;
      const pool = g.nearestEnemies(p.x, p.y, R.range, 6).filter((e) => e !== first);
      const t = pool[0] ?? first;
      if (!t) return;
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      const d = Math.max(0, Math.hypot(t.x - p.x, t.y - p.y) - t.r - p.r - 14);
      p.invuln = Math.max(p.invuln, d / R.speed + 0.1);
      g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.4, size: 18, tone: 'mud' });
      dash(p, ang, R.speed, d / R.speed, () => {
        strike(g, R.mul, R.arc);
        if (m.rushWave) {
          const W = PAEGONG.wave;
          g.projectiles.push({
            team: 'player', kind: 'wave', x: p.x, y: p.y,
            vx: Math.cos(ang) * W.speed, vy: Math.sin(ang) * W.speed,
            r: W.radius * p.stats.area, damage: weaponDamage(p) * W.mul * p.stats.might, knockback: 80,
            life: W.life, pierce: Infinity, hit: new Set(), angle: ang,
          });
        }
        g.sfx('chop');
        // 이탈: hop back out of the crowd.
        dash(p, ang + Math.PI, R.backSpeed, R.back);
      });
    });
  }
}

/** 반격: the hero just took a hit. */
export function onHurt(g) {
  const p = g.player;
  if (!p.meta.counter || g.time < (p.counterReadyAt ?? 0)) return;
  const C = BANGYEOK.counter;
  p.counterReadyAt = g.time + C.cooldown;
  p.countering = true;
  g.later(C.delay, () => {
    p.countering = false;
    if (g.state !== 'play') return;
    hitArc(g, p.x, p.y, 0, C.radius * p.stats.area, 360, weaponDamage(p) * C.mul * p.stats.might, C.knockback, 'paewang', { stun: C.stun });
    g.shake(6);
    g.sfx('quake');
    g.texts.push({ x: p.x, y: p.y - 44, v: '💥 반격!', t: 0, life: 0.8, order: true });
    // 패왕의 반격: chase the nearest survivor and cut again.
    if (p.meta.counterRush) {
      const H = BANGYEOK.chase;
      const t = g.nearestEnemy(p.x, p.y, H.range);
      if (!t) return;
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      const d = Math.max(0, Math.hypot(t.x - p.x, t.y - p.y) - t.r - p.r - 14);
      p.invuln = Math.max(p.invuln, d / H.speed + 0.1);
      dash(p, ang, H.speed, d / H.speed, () => strike(g, H.mul, H.arc));
    }
  });
}

/** Every frame: dash movement, 철벽 armour from the crowd around the hero. */
export function updateBuild(g, dt) {
  const p = g.player;
  if (p.dash) {
    const D = p.dash;
    const step = Math.min(dt, D.t);
    p.x += D.vx * step;
    p.y += D.vy * step;
    D.t -= dt;
    if (D.t <= 0) {
      p.dash = null;
      D.then?.();
    }
  }
  if (p.meta.proxArmor) {
    p.wallTimer = (p.wallTimer ?? 0) - dt;
    if (p.wallTimer <= 0) {
      p.wallTimer = 0.2;
      const W = BANGYEOK.wall;
      let n = 0;
      g.grid.query(p.x, p.y, W.radius + 20, (e) => {
        if (!e.dead && !g.isCharmed(e) && e.def.behavior !== 'static' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < W.radius * W.radius) n++;
      });
      p.wall = Math.min(W.max, n * W.perFoe);
    }
  }
}

/** Short status for the HUD chips. */
export function buildStatus(g) {
  const p = g.player;
  const m = p.meta;
  const chips = [];
  const wait = (at) => (g.time >= (at ?? 0) ? '준비' : `${Math.ceil(at - g.time)}초`);
  if (m.proxArmor) chips.push(`🛡️ 철벽 +${(p.wall ?? 0).toFixed(1)}`);
  if (m.counter) chips.push(p.countering ? '💥 반격!' : `💥 반격 ${wait(p.counterReadyAt)}`);
  if (m.rush) chips.push(`⚔️ 연참 ${wait(p.rushReadyAt)}`);
  else if (m.lunge) chips.push('⚔️ 기습');
  return chips;
}
