import { WEAPONS } from '../data/weapons.js';
import { TAU, angleDiff } from '../core/math.js';

/**
 * Attack patterns, keyed by the `pattern` field of a weapon level.
 * Each receives (game, player, levelDef, stats) and performs one attack.
 */
export const PATTERNS = {
  arcSlash(g, p, lv, s) {
    const aim = aimAngle(g, p, lv.range * s.area);
    const range = lv.range * s.area;
    hitArc(g, p.x, p.y, aim, range, lv.arc, lv.damage * s.might, lv.knockback, 'slash');
    if (lv.double) {
      g.later(0.15, () => hitArc(g, p.x, p.y, aim + Math.PI, range, lv.arc, lv.damage * s.might, lv.knockback, 'slash'));
    }
  },

  royalSword(g, p, lv, s) {
    const range = lv.range * s.area;
    hitArc(g, p.x, p.y, p.facing, range, 360, lv.damage * s.might, lv.knockback, 'royal');
    // Sword waves toward the nearest distinct enemies; fill the rest evenly.
    const dirs = [];
    const near = g.nearestEnemies(p.x, p.y, 520, lv.waves);
    for (const e of near) dirs.push(Math.atan2(e.y - p.y, e.x - p.x));
    for (let i = dirs.length; i < lv.waves; i++) dirs.push(p.facing + (i * TAU) / lv.waves);
    for (const a of dirs) {
      g.projectiles.push({
        team: 'player', kind: 'wave', x: p.x, y: p.y,
        vx: Math.cos(a) * lv.waveSpeed, vy: Math.sin(a) * lv.waveSpeed,
        r: 18 * s.area, damage: lv.damage * lv.waveDamage * s.might, knockback: 40,
        life: lv.waveLife, pierce: Infinity, hit: new Set(), angle: a,
      });
    }
  },
};

/** Ticks the player's weapon cooldown and fires when ready. */
export function updateWeapon(g, dt) {
  const p = g.player;
  const w = p.weapon;
  const lv = WEAPONS[w.id].levels[w.level];
  w.timer -= dt;
  if (w.timer > 0) return;
  w.timer = lv.cooldown * p.stats.haste;
  PATTERNS[lv.pattern](g, p, lv, p.stats);
}

export function currentWeaponLevel(p) {
  return WEAPONS[p.weapon.id].levels[p.weapon.level];
}

/** Face the nearest enemy in reach; otherwise keep the movement direction. */
function aimAngle(g, p, range) {
  const e = g.nearestEnemy(p.x, p.y, range * 1.8);
  if (e) p.facing = Math.atan2(e.y - p.y, e.x - p.x);
  return p.facing;
}

/** Damages every enemy inside a circular sector and leaves a slash effect. */
export function hitArc(g, x, y, angle, range, arcDeg, damage, knockback, style) {
  const half = (arcDeg * Math.PI) / 360;
  g.grid.query(x, y, range + 40, (e) => {
    if (e.dead) return;
    const dx = e.x - x, dy = e.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.r) return;
    if (arcDeg < 360 && d > e.r + 8 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > half + e.r / Math.max(d, 1)) return;
    g.damageEnemy(e, damage, x, y, knockback);
  });
  g.fx.push({ type: style, x, y, angle, range, arc: arcDeg, t: 0, life: style === 'royal' ? 0.28 : 0.2 });
}
