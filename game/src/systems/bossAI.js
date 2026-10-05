/**
 * Boss pattern runner. A boss cycles through BossDef.patterns; every
 * attacking pattern has a wind-up with a visible telegraph.
 */
export const BOSS_PATTERNS = {
  chase: {
    start(g, b, P) {
      b.pt = P.time;
    },
    update(g, b, P, dt) {
      const dx = g.player.x - b.x, dy = g.player.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.vx = (dx / d) * b.speed;
      b.vy = (dy / d) * b.speed;
      b.facing = Math.atan2(dy, dx);
      b.pt -= dt / b.cooldownMul;
      return b.pt <= 0;
    },
  },

  dash: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.left = P.repeat ?? 1;
      aimDash(g, b, P);
    },
    update(g, b, P, dt) {
      if (b.ps === 'windup') {
        b.vx = b.vy = 0;
        b.pt -= dt;
        if (b.pt <= 0) {
          b.ps = 'dash';
          b.travel = 0;
          b.hitWall = false;
          b.contactDamage = P.damage;
        }
        return false;
      }
      const s = P.speed;
      b.vx = Math.cos(b.dashDir) * s;
      b.vy = Math.sin(b.dashDir) * s;
      b.travel += s * dt;
      if (Math.random() < 0.6) g.fx.push({ type: 'puff', x: b.x, y: b.y, t: 0, life: 0.45, size: 14, tone: 'mud' });
      if (b.travel >= P.distance || b.hitWall) {
        b.contactDamage = null;
        b.hitWall = false;
        b.left -= 1;
        if (b.left > 0) {
          b.ps = 'windup';
          b.pt = P.windup * 0.7 * b.cooldownMul;
          aimDash(g, b, P);
          return false;
        }
        return true;
      }
      return false;
    },
  },

  hookFan: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.aim = Math.atan2(g.player.y - b.y, g.player.x - b.x);
      g.fx.push({ type: 'cone', x: b.x, y: b.y, angle: b.aim, arc: P.spread + 14, range: 320, t: 0, life: b.pt, follow: b });
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      const step = P.count > 1 ? P.spread / (P.count - 1) : 0;
      for (let i = 0; i < P.count; i++) {
        const a = b.aim + ((-P.spread / 2 + step * i) * Math.PI) / 180;
        g.projectiles.push({
          team: 'enemy', kind: 'hook', x: b.x, y: b.y,
          vx: Math.cos(a) * P.speed, vy: Math.sin(a) * P.speed,
          r: 8, damage: P.damage, life: 1.6, angle: a, spin: 0,
        });
      }
      return true;
    },
  },
};

function aimDash(g, b, P) {
  b.dashDir = Math.atan2(g.player.y - b.y, g.player.x - b.x);
  b.facing = b.dashDir;
  g.fx.push({ type: 'dashLine', x: b.x, y: b.y, angle: b.dashDir, length: P.distance, width: b.r * 2, t: 0, life: b.pt, follow: b });
}

export function updateBoss(g, b, dt) {
  const def = b.def;
  if (g.bossIntro > 0) {
    b.vx = b.vy = 0;
    return;
  }

  // One-shot summons at HP thresholds.
  for (const s of def.summons ?? []) {
    if (!b.summoned.has(s) && b.hp / b.maxHp <= s.atHpRatio) {
      b.summoned.add(s);
      g.summonAround(s.enemy, s.count, b.x, b.y, 140);
      g.banner(s.banner);
    }
  }
  if (def.enrage && !b.enraged && b.hp / b.maxHp <= def.enrage.below) {
    b.enraged = true;
    b.speed *= def.enrage.speedMul;
    b.cooldownMul = def.enrage.cooldownMul;
    g.banner(def.enrage.banner);
  }

  if (b.pi === undefined) {
    b.pi = 0;
    BOSS_PATTERNS[def.patterns[0].type].start(g, b, def.patterns[0]);
  }
  const P = def.patterns[b.pi];
  const done = BOSS_PATTERNS[P.type].update(g, b, P, dt);
  if (done) {
    b.pi = (b.pi + 1) % def.patterns.length;
    const N = def.patterns[b.pi];
    BOSS_PATTERNS[N.type].start(g, b, N);
  }
}
