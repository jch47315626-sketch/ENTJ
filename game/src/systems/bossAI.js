import { rockfall } from './terrain.js';
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
      // Casters (`keep`) hold their distance instead of closing in.
      const dir = P.keep ? (d < P.keep - 30 ? -1 : d > P.keep + 30 ? 1 : 0) : 1;
      b.vx = (dx / d) * b.speed * dir;
      b.vy = (dy / d) * b.speed * dir;
      // A caster pressed into melee slips away.
      if (P.keep && d < 90 && (b.blinkCd ?? 0) <= g.time) blink(g, b);
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
          b.contactDamage = P.damage * b.damageMul;
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

  /** Telegraphed cone, then a fan of projectiles (`kind`: hook, arrow). */
  fan: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.aim = Math.atan2(g.player.y - b.y, g.player.x - b.x);
      b.facing = b.aim;
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
          team: 'enemy', kind: P.kind ?? 'hook', x: b.x, y: b.y,
          vx: Math.cos(a) * P.speed, vy: Math.sin(a) * P.speed,
          r: P.kind === 'arrow' ? 6 : P.kind === 'wave' ? 14 : 8, damage: P.damage * b.damageMul, source: 'boss', owner: b, life: 1.6, angle: a, spin: P.kind === 'arrow' ? undefined : 0,
        });
      }
      g.sfx(P.kind === 'arrow' ? 'volley' : 'throw');
      return true;
    },
  },

  /** Fire pots lobbed around the hero: warning rings, then burning ground. */
  firePots: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.pots = [];
      const p = g.player;
      for (let i = 0; i < P.count; i++) {
        // First pot lands on the hero; the rest scatter around them.
        const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : P.spread * (0.4 + 0.6 * Math.random());
        const pot = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
        b.pots.push(pot);
        g.fx.push({ type: 'ringWarn', x: pot.x, y: pot.y, range: P.radius, t: 0, life: b.pt });
      }
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      for (const pot of b.pots) {
        g.zones.push({ team: 'enemy', kind: 'fire', x: pot.x, y: pot.y, r: P.radius, dps: P.dps * b.damageMul, life: P.life, t: 0 });
        g.fx.push({ type: 'puff', x: pot.x, y: pot.y, t: 0, life: 0.5, size: 30, tone: 'mud' });
      }
      g.sfx('firePot');
      return true;
    },
  },

  /** Telegraphed ring around the boss, then a full-circle slash. */
  spin: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.left = P.repeat ?? 1;
      g.fx.push({ type: 'ringWarn', x: b.x, y: b.y, range: P.radius, t: 0, life: b.pt, follow: b });
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      const rr = P.radius + g.player.r;
      if ((g.player.x - b.x) ** 2 + (g.player.y - b.y) ** 2 < rr * rr) g.hurtPlayer(P.damage * b.damageMul, 'boss', b);
      g.fx.push({ type: 'bossSpin', x: b.x, y: b.y, range: P.radius, t: 0, life: 0.3 });
      g.shake(5);
      g.sfx('bossSpin');
      b.left -= 1;
      if (b.left > 0) {
        b.ps = 'windup';
        b.pt = P.windup * 0.6 * b.cooldownMul;
        g.fx.push({ type: 'ringWarn', x: b.x, y: b.y, range: P.radius, t: 0, life: b.pt, follow: b });
        return false;
      }
      return true;
    },
  },
};

/** Shared by 궁예's patterns: angle from the boss to a point. */
const PRED = (g, lead) => {
  const p = g.player;
  return { x: p.x + (p.vx ?? 0) * lead, y: p.y + (p.vy ?? 0) * lead };
};

Object.assign(BOSS_PATTERNS, {
  /** 궁극기 · 치악산 부수기: a huge ring around the boss, then the mountain cracks. */
  smash: {
    start(g, b, P) {
      b.pt = P.windup * b.cooldownMul;
      g.fx.push({ type: 'ringWarn', x: b.x, y: b.y, range: P.radius, t: 0, life: b.pt, follow: b });
      g.banner('⛰️ 치악산 부수기!', 'big');
      g.sfx('horn');
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      const p = g.player;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (P.radius + p.r * 0.5) ** 2) g.hurtPlayer(P.damage * b.damageMul, 'boss', b);
      g.fx.push({ type: 'smash', x: b.x, y: b.y, range: P.radius, t: 0, life: 0.9 });
      // The mountain cracks: a few boulders fall around the rim and stay.
      if (P.rocks) {
        g.tempRocks ??= [];
        for (let i = 0; i < P.rocks; i++) {
          const a = (i / P.rocks) * Math.PI * 2 + Math.random() * 0.4;
          const d = P.radius * (0.75 + 0.2 * Math.random());
          g.tempRocks.push({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, r: 30, seed: Math.random(), until: g.time + 12, fallen: true });
        }
      }
      g.shake(16);
      g.sfx('quake');
      return true;
    },
  },

  /** 궁극기 · 꿩의 전설: a column of pheasants streaks down a warned lane (or several). */
  pheasants: {
    start(g, b, P) {
      b.pt = P.windup * b.cooldownMul;
      const p = g.player;
      const aim = Math.atan2(p.y - b.y, p.x - b.x);
      const lanes = P.lanes ?? 1;
      b.lanes = [];
      for (let i = 0; i < lanes; i++) {
        const a = aim + (lanes > 1 ? (i - (lanes - 1) / 2) * (P.spread ?? 0.5) : 0);
        b.lanes.push(a);
        g.fx.push({ type: 'dashLine', x: b.x, y: b.y, angle: a, length: P.length, width: 46, t: 0, life: b.pt });
      }
      g.banner('🐦 꿩의 전설!', 'big');
      g.sfx('crow');
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      for (const a of b.lanes) {
        for (let i = 0; i < P.count; i++) {
          const back = i * P.gap;
          g.projectiles.push({
            team: 'enemy', kind: 'pheasant', x: b.x - Math.cos(a) * back, y: b.y - Math.sin(a) * back,
            vx: Math.cos(a) * P.speed, vy: Math.sin(a) * P.speed, r: 12, damage: P.damage * b.damageMul,
            life: (P.length + back) / P.speed, angle: a, source: 'pheasant', owner: b, flap: Math.random() * 6,
          });
        }
      }
      g.sfx('throw');
      return true;
    },
  },

  /** 낙석: boulders crash on warned spots around the hero and stay as obstacles a while. */
  rockfall: {
    start(g, b, P) {
      const p = g.player;
      b.pt = P.windup * b.cooldownMul;
      const spots = [{ x: p.x + p.vx * 0.5, y: p.y + p.vy * 0.5 }];
      for (let i = 1; i < P.count; i++) {
        const a = Math.random() * Math.PI * 2, d = P.spread * (0.35 + 0.65 * Math.random());
        spots.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d });
      }
      rockfall(g, spots, { warn: b.pt, radius: P.radius, damage: P.damage * b.damageMul, life: P.life });
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      return b.pt <= 0;
    },
  },

  /** Calls a squad in a ring around the boss (capped so it cannot snowball). */
  summon: {
    start(g, b, P) {
      const alive = g.enemies.filter((e) => !e.dead && !e.isBoss).length;
      if (alive > 14) return;
      g.summonAround(P.enemy, P.count, b.x, b.y, 130);
      if (P.banner) g.banner(P.banner, 'small');
      g.sfx('horn');
    },
    update() {
      return true;
    },
  },

  /**
   * 관심법 낙뢰: reads where the hero is going and marks it; the first bolt
   * lands on that predicted spot, the rest scatter around it.
   */
  lightning: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      const c = PRED(g, P.lead);
      b.strikes = [];
      for (let i = 0; i < P.count; i++) {
        const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : P.spread * (0.45 + 0.55 * Math.random());
        const s = { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d };
        b.strikes.push(s);
        g.fx.push({ type: 'ringWarn', x: s.x, y: s.y, range: P.radius, t: 0, life: b.pt, tone: 'violet' });
      }
      g.fx.push({ type: 'eye', x: b.x, y: b.y - b.r - 10, t: 0, life: b.pt, follow: b, size: 14 });
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.pt > 0) return false;
      const p = g.player;
      for (const s of b.strikes) {
        const rr = P.radius + p.r;
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < rr * rr) g.hurtPlayer(P.damage * b.damageMul, 'boss', b);
        g.fx.push({ type: 'bolt', points: [{ x: s.x + 12, y: s.y - 260 }, { x: s.x - 6, y: s.y - 120 }, { x: s.x, y: s.y }], t: 0, life: 0.32, seed: Math.random() });
        g.fx.push({ type: 'puff', x: s.x, y: s.y, t: 0, life: 0.45, size: P.radius * 0.6, tone: 'light' });
      }
      g.shake(4);
      g.sfx('thunder');
      return true;
    },
  },

  /** 미륵 광배: beams of light radiate from the boss and sweep around. */
  halo: {
    start(g, b, P) {
      b.ps = 'windup';
      b.pt = P.windup * b.cooldownMul;
      b.haloAngle = Math.atan2(g.player.y - b.y, g.player.x - b.x) + Math.PI / P.beams;
      b.haloDir = Math.random() < 0.5 ? 1 : -1;
      b.halo = { beams: P.beams, length: P.length, width: P.width, live: false };
      g.sfx('gwansim');
    },
    update(g, b, P, dt) {
      b.vx = b.vy = 0;
      b.pt -= dt;
      if (b.ps === 'windup') {
        if (b.pt > 0) return false;
        b.ps = 'sweep';
        b.pt = P.time;
        b.halo.live = true;
        b.haloTick = 0;
        g.sfx('beam');
      }
      b.haloAngle += b.haloDir * P.turn * dt / b.cooldownMul;
      // Damage the hero if they stand inside any beam (ticks every 0.25 s).
      b.haloTick -= dt;
      const p = g.player;
      const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
      if (b.haloTick <= 0 && d < P.length && d > b.r * 0.5) {
        const pa = Math.atan2(dy, dx);
        for (let i = 0; i < P.beams; i++) {
          const a = b.haloAngle + (i * Math.PI * 2) / P.beams;
          const off = Math.abs(Math.sin(pa - a)) * d;
          if (off < P.width / 2 + p.r && Math.cos(pa - a) > 0) {
            g.hurtPlayer(P.dps * 0.25 * b.damageMul, 'boss');
            b.haloTick = 0.25;
            break;
          }
        }
      }
      if (b.pt > 0) return false;
      b.halo = null;
      return true;
    },
  },

  /** 분신: calls mind-images of himself (every `every` cycles at most). */
  clones: {
    start(g, b, P) {
      b.cloneCycle = (b.cloneCycle ?? 0) + 1;
      const alive = g.enemies.filter((e) => !e.dead && e.def.minion).length;
      if (b.cloneCycle % P.every !== 1 % P.every || alive >= 4) return;
      for (let i = 0; i < P.count; i++) {
        const a = Math.random() * Math.PI * 2;
        const c = g.spawnBossUnit('gungyeClone', b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90);
        if (!c) continue;
        g.fx.push({ type: 'eye', x: c.x, y: c.y, t: 0, life: 0.9, follow: c, size: 20 });
      }
      g.banner('분신 — 어느 쪽이 진짜 궁예인가', 'small');
      g.sfx('gwansim');
    },
    update() {
      return true;
    },
  },
});

/** 궁예 vanishes and reappears across the arena, leaving a burst behind. */
function blink(g, b) {
  const a = g.arena, p = g.player;
  g.fx.push({ type: 'eye', x: b.x, y: b.y, t: 0, life: 0.6, size: 24 });
  g.fx.push({ type: 'puff', x: b.x, y: b.y, t: 0, life: 0.5, size: 26, tone: 'light' });
  let best = null;
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2, r = (a?.r ?? 400) * (0.4 + 0.45 * Math.random());
    const c = { x: (a?.x ?? p.x) + Math.cos(ang) * r, y: (a?.y ?? p.y) + Math.sin(ang) * r };
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (!best || d > best.d) best = { ...c, d };
  }
  b.x = best.x;
  b.y = best.y;
  b.blinkCd = g.time + 3.5 * b.cooldownMul;
  g.sfx('gwansim');
}

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

  // 궁극기 · 복숭아 먹기: once a minute, when hurt, the boss eats a peach and heals.
  const peach = def.peach;
  if (peach) b.peachAt ??= g.time - peach.every + 30; // the first peach no sooner than 30 s in
  if (peach && b.peachAt + peach.every <= g.time && b.hp < b.maxHp * (1 - peach.heal * 0.5) && !b.eating) {
    b.eating = g.time + peach.eat;
    b.peachAt = g.time;
    g.banner('🍑 복숭아 먹기 — 양길이 체력을 되찾는다! 먹는 동안 몰아쳐라', 'small');
    g.texts.push({ x: b.x, y: b.y - b.r - 30, v: '🍑', t: 0, life: peach.eat, order: true });
  }
  if (b.eating) {
    b.vx = b.vy = 0;
    if (g.time < b.eating) return;
    b.eating = 0;
    const before = b.hp;
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * peach.heal);
    g.texts.push({ x: b.x, y: b.y - b.r - 20, v: `+${Math.round(b.hp - before)}`, t: 0, life: 1, heal: true });
    g.fx.push({ type: 'burst', x: b.x, y: b.y, range: b.r * 2, t: 0, life: 0.5 });
    g.sfx('heal');
  }

  // One-shot summons at HP thresholds.
  for (const s of def.summons ?? []) {
    if (!b.summoned.has(s) && b.hp / b.maxHp <= s.atHpRatio) {
      b.summoned.add(s);
      g.summonAround(s.enemy, s.count, b.x, b.y, 140);
      g.banner(s.banner);
      g.sfx('horn');
    }
  }
  if (def.lastStand && !b.lastStood && b.hp / b.maxHp <= def.lastStand.below) {
    b.lastStood = true;
    b.invulnUntil = g.time + def.lastStand.time;
    g.banner(def.lastStand.banner);
    g.sfx('gong');
  }
  if (def.enrage && !b.enraged && b.hp / b.maxHp <= def.enrage.below) {
    b.enraged = true;
    b.speed *= def.enrage.speedMul;
    b.cooldownMul = def.enrage.cooldownMul;
    if (def.enrage.banner) g.banner(def.enrage.banner);
  }

  // Two-phase bosses: new look, new pattern cycle and a short breather.
  const P2 = def.phase2;
  if (P2 && !b.phase2 && b.hp / b.maxHp <= P2.below) {
    b.phase2 = true;
    b.patterns = P2.patterns;
    b.pi = undefined;
    b.halo = null;
    b.contactDamage = null;
    b.speed *= P2.speedMul ?? 1;
    if (P2.look) b.def = { ...b.def, look: P2.look };
    b.invulnUntil = g.time + (P2.invuln ?? 0);
    g.banner(P2.banner);
    g.shake(10);
    g.sfx('gong');
    g.fx.push({ type: 'bossSpin', x: b.x, y: b.y, range: 120, t: 0, life: 0.5 });
  }

  const patterns = b.patterns ?? def.patterns;
  if (b.pi === undefined) {
    b.pi = 0;
    BOSS_PATTERNS[patterns[0].type].start(g, b, patterns[0]);
  }
  const P = patterns[b.pi];
  const done = BOSS_PATTERNS[P.type].update(g, b, P, dt);
  if (done) {
    b.pi = (b.pi + 1) % patterns.length;
    const N = patterns[b.pi];
    BOSS_PATTERNS[N.type].start(g, b, N);
  }
}
