import { SPIRITS, combosOf } from '../data/spirits.js';

/**
 * 영물 in battle (data/spirits.js has their names and texts). Each companion
 * follows the hero and acts on its own cooldown; a few also step in through
 * hooks the game calls: when the hero is hurt or would fall, when a foe
 * dies, when 기세 is spent.
 *
 * Strength: `pw` = 1 at ★1 … 2 at ★5. Damage is SPIRIT_HIT × hero 공격력 × pw.
 * ★3 picks a 갈래 (`br` 'a' | 'b'), ★5 is 각성 (`awake`).
 */
export const SPIRIT_HIT = 12;

const TAU = Math.PI * 2;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

/** Battle state for the companions taken along ([{ id, stars, branch }]). */
export function makeSpirits(list) {
  const combos = combosOf(list.map((c) => c.id));
  // 궁합: each 영물's modifiers from every pairing it is part of.
  const modsOf = (id) => {
    const m = { dmg: 1, cd: 1 };
    for (const c of combos) for (const [k, v] of Object.entries(c.mods[id] ?? {})) m[k] = k === 'dmg' || k === 'cd' ? m[k] * v : v;
    return m;
  };
  return list
    .filter((c) => SPIRITS[c.id])
    .map((c, i) => ({
      mod: modsOf(c.id),
      id: c.id, def: SPIRITS[c.id], slot: i, spirit: true,
      stars: c.stars, br: c.stars >= 3 ? c.branch : null, awake: c.stars >= 5,
      pw: 1 + 0.25 * (c.stars - 1),
      x: 0, y: 0, cd: 1 + i * 0.5, lunge: null, data: {},
    }));
}

/** Passive gifts folded into the hero's bonuses before the battle (returns a new meta). */
export function spiritMeta(meta, list) {
  const m = { ...meta };
  for (const c of combosOf(list.map((x) => x.id))) for (const [k, v] of Object.entries(c.meta ?? {})) m[k] = (m[k] ?? 0) + v;
  for (const c of list) {
    const pw = 1 + 0.25 * (c.stars - 1), br = c.stars >= 3 ? c.branch : null;
    if (c.id === 'crow' && br === 'a') { m.pickup = (m.pickup ?? 0) + 0.5; m.xp = (m.xp ?? 0) + 0.1; }
    if (c.id === 'owl') m.xp = (m.xp ?? 0) + 0.03 * c.stars;
    if (c.id === 'crane') m.momentum = (m.momentum ?? 0) + 0.2 * pw * (br === 'a' ? 2 : 1);
    if (c.id === 'dragonmaid') m.allyMul = (m.allyMul ?? 0) + 0.1 * pw + (br === 'b' ? 0.4 : 0);
  }
  return m;
}

/** Set-up that needs the game: extra cards, rerolls, revives. */
export function initSpirits(g) {
  const combos = combosOf(g.spirits.map((s) => s.id));
  if (combos.length) g.later(3, () => g.banner(combos.map((c) => `${c.icon} 궁합 · ${c.name}`).join('  '), 'small'));
  for (const s of g.spirits) {
    s.x = g.player.x - 30 + s.slot * 60;
    s.y = g.player.y + 24;
    if (s.id === 'owl') {
      g.spiritCards = (g.spiritCards ?? 0) + (s.br === 'a' ? 2 : 1) + (s.mod.cards ?? 0);
      if (s.br === 'b') g.rerolls = 3;
      if (s.awake) g.evoPullMul = 2;
    }
    if (s.id === 'jujak') s.data.revives = s.awake ? 2 : 1;
    if (s.id === 'bear' && s.awake) s.data.guard = 1;
    if (s.id === 'otter' && s.awake) s.data.saved = 1;
    if (s.id === 'cub' && s.awake) s.data.grow = 1;
    if (s.id === 'cub') s.data.grow0 = s.mod.grow0 ?? 0;
  }
}

// ---------------------------------------------------------------- helpers

const D = (g, s, mul = 1) => SPIRIT_HIT * g.player.stats.might * s.pw * mul * s.mod.dmg;
const foes = (g, x, y, r, n = 8) => g.nearestEnemies(x, y, r, n).filter((e) => !e.dead && !g.isCharmed(e) && e.def.behavior !== 'static');
const nearestFoe = (g, x, y, r) => foes(g, x, y, r, 1)[0] ?? null;

function hit(g, s, e, amount, opts = {}) {
  if (!e || e.dead) return;
  g.runStats.spiritDmg = (g.runStats.spiritDmg ?? 0) + Math.min(amount, Math.max(0, e.hp));
  g.damageEnemy(e, amount, opts.from?.x ?? s.x, opts.from?.y ?? s.y, opts.kb ?? 0, opts.stun ? { stun: opts.stun } : undefined);
}

/** Everything (not charmed) within r of a point. */
function area(g, x, y, r, fn) {
  g.grid.query(x, y, r + 30, (e) => {
    if (e.dead || e.hidden || g.isCharmed(e) || e.def.behavior === 'static') return;
    if (dist2(x, y, e.x, e.y) < (r + e.r) ** 2) fn(e);
  });
}

const ring = (g, x, y, range, color, life = 0.4) => g.fx.push({ type: 'spRing', x, y, range, color, t: 0, life });
const line = (g, x, y, tx, ty, color, width = 4, life = 0.25) => g.fx.push({ type: 'spLine', x, y, tx, ty, color, width, t: 0, life });
const lungeTo = (s, x, y, dur = 0.25) => (s.lunge = { x, y, t: 0, dur });

/** The spot with the most foes around it, among the nearest few. */
function crowdSpot(g, x, y, r) {
  let best = null, bn = 0;
  for (const e of foes(g, x, y, r, 6)) {
    let n = 0;
    area(g, e.x, e.y, 70, () => n++);
    if (n > bn) { bn = n; best = e; }
  }
  return best;
}

function shield(g, s, amount) {
  const p = g.player;
  p.shield = Math.max(p.shield ?? 0, amount);
  p.shieldMax = Math.max(p.shield, p.shieldMax ?? 0);
  p.shieldBy = s;
  ring(g, p.x, p.y, 40, s.def.grade === 5 ? '#7ad8a0' : '#8fd0ff');
}

/** A zone that follows the hero (storm, venom aura): kept alive and moved each frame. */
function aura(g, s, key, z) {
  let a = s.data[key];
  if (!a || !g.zones.includes(a)) {
    a = { team: 'player', t: 0, aura: true, spirit: true, ...z };
    s.data[key] = a;
    g.zones.push(a);
  }
  a.x = g.player.x;
  a.y = g.player.y;
  a.r = z.r;
  a.dps = z.dps;
  a.life = a.t + 1;
}

// ---------------------------------------------------------------- per 영물

const ACT = {
  jindo(g, s) {
    if (s.br === 'b') return 0.5; // 충견 stays by the hero and answers in onHurt
    const bite = (e) => {
      if (!e) return;
      lungeTo(s, e.x, e.y);
      hit(g, s, e, D(g, s, 1.5), { stun: s.br === 'a' ? 1.6 : 0.8 });
      if (s.br === 'a') e.spiritAmp = { amp: 0.2, until: g.time + 1.6 };
    };
    const t = foes(g, g.player.x, g.player.y, 300, s.awake ? 2 : 1);
    t.forEach(bite);
    return t.length ? 3 : 0.5;
  },
  crow(g, s) {
    const p = g.player;
    let n = 0;
    for (const k of g.pickups) {
      if ((k.kind === 'coin' || k.kind === 'rice') && !k.magnet && (s.awake || s.mod.allCoins || dist2(k.x, k.y, p.x, p.y) < 420 ** 2)) {
        k.magnet = true;
        if (++n >= (s.awake || s.mod.allCoins ? 99 : 3)) break;
      }
    }
    if (s.br === 'b') {
      const e = nearestFoe(g, p.x, p.y, 260);
      if (e) {
        lungeTo(s, e.x, e.y);
        hit(g, s, e, D(g, s, 0.8));
        e.spiritAmp = { amp: 0.15, until: g.time + 4 };
      }
    }
    return s.awake ? 2 : 1;
  },
  otter(g, s) {
    const p = g.player;
    p.heal(p.stats.maxHp * 0.04 * s.pw * (s.br === 'a' ? 2 : 1) * (s.mod.heal ?? 1));
    g.texts.push({ x: p.x, y: p.y - 30, v: '🐟', t: 0, life: 0.8, order: true });
    if (s.br === 'b') {
      g.zones.push({ team: 'player', kind: 'water', x: p.x, y: p.y, r: 110, slow: 0.4, life: 2, t: 0 });
      ring(g, p.x, p.y, 110, '#8fd0ff');
    }
    return 10;
  },
  gull(g, s) {
    const dives = (s.awake ? 5 : s.br === 'a' ? 3 : 1) + (s.mod.dives ?? 0);
    const r = s.br === 'b' ? 140 : 70;
    const first = crowdSpot(g, g.player.x, g.player.y, 420);
    if (!first) return 0.5;
    for (let i = 0; i < dives; i++) {
      g.later(i * 0.25, () => {
        const t = i === 0 ? first : crowdSpot(g, g.player.x, g.player.y, 420);
        if (!t) return;
        lungeTo(s, t.x, t.y, 0.2);
        area(g, t.x, t.y, r, (e) => hit(g, s, e, D(g, s, 1.3), { from: t }));
        ring(g, t.x, t.y, r, '#f1e8d2');
      });
    }
    return 5.5;
  },
  boar(g, s) {
    const p = g.player;
    const e = nearestFoe(g, p.x, p.y, 350);
    if (!e) return 0.5;
    const a = Math.atan2(e.y - p.y, e.x - p.x), len = s.awake ? 450 : 300;
    const c = Math.cos(a), sn = Math.sin(a);
    const ex = p.x + c * len, ey = p.y + sn * len;
    g.grid.query((p.x + ex) / 2, (p.y + ey) / 2, len / 2 + 40, (o) => {
      if (o.dead || g.isCharmed(o) || o.def.behavior === 'static') return;
      const dx = o.x - p.x, dy = o.y - p.y, along = dx * c + dy * sn;
      if (along < 0 || along > len || Math.abs(-dx * sn + dy * c) > 22 + o.r) return;
      hit(g, s, o, D(g, s, s.br === 'a' ? 4.5 : 3), { from: p, kb: s.awake ? 240 : 120, stun: s.br === 'b' ? 1 : 0 });
    });
    lungeTo(s, ex, ey, 0.35);
    line(g, p.x, p.y, ex, ey, 'rgba(150, 110, 70, 0.7)', 30, 0.35);
    // 땅울림: the worm bursts up where the charge ends.
    const worm = s.mod.quake && g.spirits.find((o) => o.id === 'worm');
    if (worm) g.later(0.35, () => {
      area(g, ex, ey, 100, (o) => hit(g, worm, o, D(g, worm, 2), { from: { x: ex, y: ey }, stun: 1 }));
      ring(g, ex, ey, 100, '#a8784a', 0.5);
      g.fx.push({ type: 'puff', x: ex, y: ey, t: 0, life: 0.6, size: 50, tone: 'mud' });
    });
    return 4;
  },
  bat(g, s) {
    const p = g.player;
    const t = foes(g, p.x, p.y, 220, s.br === 'b' ? 3 : 1);
    for (const e of t) {
      const amt = D(g, s, 0.8);
      hit(g, s, e, amt);
      line(g, e.x, e.y, p.x, p.y, 'rgba(200, 40, 60, 0.6)', 2);
      p.heal(amt * (s.br === 'a' ? 0.5 : 0.25));
    }
    if (t[0]) lungeTo(s, t[0].x, t[0].y, 0.2);
    return t.length ? 1.4 : 0.4;
  },
  falcon(g, s) {
    const p = g.player;
    const near = foes(g, p.x, p.y, 450, 30);
    const RANGED = new Set(['archer', 'eliteArcher', 'slinger', 'shaman']);
    const e = near.find((o) => !o.isBoss && (o.elite || RANGED.has(o.def.id))) ?? (s.awake && g.boss && !g.boss.dead ? g.boss : null) ?? near.find((o) => !o.isBoss) ?? near[0];
    if (!e) return 0.5;
    lungeTo(s, e.x, e.y, 0.2);
    hit(g, s, e, D(g, s, 3) * (e.isBoss && s.awake ? 1.3 : 1));
    if (s.br === 'a' && !e.dead && !e.isBoss && e.hp < e.maxHp * 0.25) hit(g, s, e, e.hp + 1);
    return s.br === 'b' ? 1.2 : 2.4;
  },
  fox(g, s) {
    const n = s.br === 'a' ? 2 : 1;
    const life = 3.5 * (s.awake ? 1.5 : 1) * (s.mod.life ?? 1);
    for (let i = 0; i < n; i++) {
      g.spawnDecoy(life);
      const d = g.allies.at(-1);
      d.fox = true;
      if (s.br === 'b') g.later(life, () => {
        area(g, d.x, d.y, 110, (e) => hit(g, s, e, D(g, s, 3), { from: d }));
        ring(g, d.x, d.y, 110, '#ff9a3a', 0.5);
      });
    }
    return 9;
  },
  snake(g, s) {
    const p = g.player;
    g.zones.push({ team: 'player', spirit: true, kind: 'poison', x: p.x, y: p.y, r: s.awake ? 70 : 46, dps: D(g, s, s.br === 'a' ? 2 : 1), slow: s.br === 'b' ? 0.35 : 0, life: 2.5, t: 0 });
    return 0.7;
  },
  bear: () => 1, // all in onHurt
  owl: () => 5, // all in initSpirits
  wolf(g, s) {
    const pack = (s.data.pack ??= []);
    const p = g.player;
    pack.forEach((w, i) => {
      const a = g.time * 0.8 + (i / Math.max(1, pack.length)) * TAU;
      const hx = p.x + Math.cos(a) * 70, hy = p.y + Math.sin(a) * 50;
      w.x += (hx - w.x) * 0.2;
      w.y += (hy - w.y) * 0.2;
      w.cd -= 0.2;
      if (w.cd > 0) return;
      const e = nearestFoe(g, w.x, w.y, 160);
      if (!e) return;
      w.cd = 1;
      w.bite = 0.2;
      hit(g, s, e, D(g, s, 0.6 * (s.br === 'b' && i === 0 ? 3 : 1)), { from: w });
    });
    const max = (s.br === 'a' ? 8 : 5) + (s.mod.packMax ?? 0);
    if (s.awake && pack.length >= max && g.time >= (s.data.howl ?? 0)) {
      s.data.howl = g.time + 10;
      area(g, p.x, p.y, 250, (e) => (e.stun = Math.max(e.stun ?? 0, e.isBoss ? 0.25 : 1)));
      ring(g, p.x, p.y, 250, '#c9d0e0', 0.6);
      g.texts.push({ x: p.x, y: p.y - 40, v: '🐺 아우우!', t: 0, life: 1, order: true });
    }
    return 0.2;
  },
  crane(g, s) {
    // 선율: skill cooldowns run a third faster (−25%).
    if (s.br === 'b') for (const id in g.player.skillTimers) g.player.skillTimers[id] -= 0.25 * 0.33;
    return 0.25;
  },
  worm(g, s) {
    const e = crowdSpot(g, g.player.x, g.player.y, 400);
    if (!e) return 0.5;
    const r = s.br === 'a' ? 160 : 80, mul = s.awake && g.player.hero.id === 'gyeonhwon' ? 2 : 1;
    const erupt = (x, y) => {
      area(g, x, y, r, (o) => hit(g, s, o, D(g, s, 2.4 * mul), { from: { x, y }, stun: 1 }));
      ring(g, x, y, r, '#a8784a', 0.5);
      g.fx.push({ type: 'puff', x, y, t: 0, life: 0.6, size: r * 0.5, tone: 'mud' });
      lungeTo(s, x, y, 0.3);
    };
    const { x, y } = e;
    erupt(x, y);
    if (s.br === 'b') g.later(0.5, () => erupt(x, y));
    return 5;
  },
  cub(g, s) {
    const grow = (s.data.grow = s.awake ? 1 : Math.min(1, s.data.grow0 + (g.kills - (s.data.k0 ??= g.kills)) / 250));
    const stage = Math.floor(grow * 4);
    if (s.br === 'b' && stage > (s.data.roared ?? 0)) {
      s.data.roared = stage;
      area(g, g.player.x, g.player.y, 200, (e) => (e.stun = Math.max(e.stun ?? 0, e.isBoss ? 0.25 : 1)));
      ring(g, g.player.x, g.player.y, 200, '#ffb84a', 0.6);
    }
    const e = nearestFoe(g, g.player.x, g.player.y, 200);
    if (!e) return 0.4;
    lungeTo(s, e.x, e.y);
    hit(g, s, e, D(g, s, (0.6 + 1.8 * grow) * (s.br === 'a' && grow >= 1 ? 2 : 1)));
    return 1.2;
  },
  turtle(g, s) {
    shield(g, s, g.player.stats.maxHp * 0.08 * s.pw * (s.br === 'a' ? 2 : 1) * (s.mod.shield ?? 1));
    return 10;
  },
  samjogo(g, s, dt) {
    const p = g.player;
    const beams = (s.br === 'a' ? 2 : 1) + (s.awake ? 1 : 0) + (s.mod.beams ?? 0);
    s.data.angle = (s.data.angle ?? 0) + 2.2 * dt;
    s.data.beams = beams;
    s.data.tick = (s.data.tick ?? 0) - dt;
    if (s.data.tick > 0) return 0;
    s.data.tick = 0.25;
    const len = 210;
    g.grid.query(p.x, p.y, len + 30, (e) => {
      if (e.dead || g.isCharmed(e) || e.def.behavior === 'static') return;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > len + e.r || d < 10) return;
      const ea = Math.atan2(dy, dx);
      for (let i = 0; i < beams; i++) {
        const a = s.data.angle + (i * TAU) / beams;
        if (Math.cos(ea - a) > 0 && Math.abs(Math.sin(ea - a)) * d < 14 + e.r) {
          hit(g, s, e, D(g, s, 0.55 * (s.br === 'b' ? 1.6 : 1)), { from: p });
          break;
        }
      }
    });
    return 0;
  },
  dragonmaid(g, s) {
    const p = g.player, r = (s.br === 'a' ? 280 : 200) * (s.mod.radius ?? 1);
    const wave = () => {
      area(g, p.x, p.y, r, (e) => hit(g, s, e, D(g, s), { from: p }));
      g.zones.push({ team: 'player', kind: 'water', x: p.x, y: p.y, r, slow: 0.5, life: 2, t: 0 });
      ring(g, p.x, p.y, r, '#6ac8ff', 0.6);
    };
    wave();
    if (s.awake) g.later(0.6, wave);
    return s.br === 'a' ? 4 : 6;
  },
  elephant(g, s) {
    const p = g.player;
    s.data.until = g.time + 4;
    p.spiritSpeed = s.br === 'b' ? 1.55 : 1.3;
    p.recalc();
    p.invuln = Math.max(p.invuln, s.br === 'b' ? 2 : 1);
    if (s.awake) {
      area(g, p.x, p.y, 150, (e) => (e.stun = Math.max(e.stun ?? 0, e.isBoss ? 0.25 : 1)));
      ring(g, p.x, p.y, 150, '#f1e8d2', 0.5);
    }
    g.texts.push({ x: p.x, y: p.y - 40, v: '🐘 백상!', t: 0, life: 1, order: true });
    return 14;
  },
  haetae: () => 1, // every frame in tick()
  cheongnyong(g, s) {
    const p = g.player;
    let from = p, e = nearestFoe(g, p.x, p.y, 320);
    if (!e) return 0.5;
    const seen = new Set();
    for (let j = 0; j < (s.br === 'a' ? 8 : 4) + (s.mod.jumps ?? 0) && e; j++) {
      seen.add(e);
      line(g, from.x, from.y, e.x, e.y, 'rgba(160, 240, 255, 0.95)', 3, 0.3);
      hit(g, s, e, D(g, s, 2), { stun: s.awake ? 0.3 : 0 });
      from = e;
      e = foes(g, from.x, from.y, 180, 6).find((o) => !seen.has(o));
    }
    g.sfx('thunder');
    return 2.4;
  },
  jujak(g, s) {
    const p = g.player;
    g.zones.push({ team: 'player', spirit: true, kind: 'fire', x: p.x, y: p.y, r: s.br === 'a' ? 64 : 40, dps: D(g, s, 1.2), life: 2.4, t: 0 });
    return 0.35;
  },
  baekho(g, s) {
    const p = g.player;
    const line = (s.br === 'a' ? 0.6 : 0.3) + (s.mod.execute ?? 0);
    const near = foes(g, p.x, p.y, 320, 20);
    const prey = near.find((e) => !e.isBoss && e.hp < e.maxHp * line) ?? (s.awake ? near.find((e) => e.isBoss && e.hp < e.maxHp * 0.1) : null);
    if (prey) {
      lungeTo(s, prey.x, prey.y, 0.2);
      hit(g, s, prey, prey.hp + 1);
      g.fx.push({ type: 'spLine', x: prey.x - 20, y: prey.y - 20, tx: prey.x + 20, ty: prey.y + 20, color: '#ffffff', width: 5, t: 0, life: 0.3 });
      return 1.5;
    }
    const e = near[0];
    if (!e) return 0.5;
    lungeTo(s, e.x, e.y, 0.2);
    hit(g, s, e, D(g, s, 2 * (s.br === 'b' ? 1.5 : 1)));
    return 1.5;
  },
  hyeonmu(g, s) {
    const p = g.player;
    if (g.time >= (s.data.shieldAt ?? 0)) {
      s.data.shieldAt = g.time + 8;
      shield(g, s, p.stats.maxHp * 0.1 * s.pw * (s.br === 'a' ? 2 : 1) * (s.mod.shield ?? 1));
    }
    aura(g, s, 'venom', { kind: 'poison', r: 90 * (s.br === 'b' ? 1.5 : 1), dps: D(g, s, 0.8 * (s.br === 'b' ? 2 : 1)) });
    return 0;
  },
};

/** Every frame, before ACT's cooldowns. */
function tick(g, s, dt) {
  const p = g.player;
  if (s.id === 'elephant' && s.data.until) {
    if (g.time < s.data.until) {
      s.data.trample = (s.data.trample ?? 0) - dt;
      if (s.data.trample <= 0) {
        s.data.trample = 0.3;
        area(g, p.x, p.y, 60, (e) => hit(g, s, e, D(g, s, 1.2 * (s.br === 'a' ? 2 : 1)), { from: p, kb: 60 }));
      }
    } else {
      s.data.until = 0;
      p.spiritSpeed = 1;
      p.recalc();
    }
  }
  if (s.id === 'haetae') {
    const R = (60 + 15 * s.stars) * (s.br === 'a' ? 2 : 1) * (s.mod.range ?? 1);
    let eaten = 0;
    g.projectiles = g.projectiles.filter((pr) => {
      if (pr.team !== 'enemy' || dist2(pr.x, pr.y, p.x, p.y) > R * R) return true;
      eaten++;
      return false;
    });
    if (eaten) {
      ring(g, p.x, p.y, R, 'rgba(255, 210, 120, 0.8)', 0.25);
      if (s.br === 'b') {
        s.data.fire = Math.min(4, (s.data.fire ?? 0) + eaten);
      }
    }
    if (s.data.fire > 0 && g.time >= (s.data.fireAt ?? 0)) {
      const e = nearestFoe(g, p.x, p.y, 300);
      if (e) {
        s.data.fire--;
        s.data.fireAt = g.time + 0.25;
        line(g, s.x, s.y, e.x, e.y, 'rgba(255, 140, 40, 0.9)', 6);
        hit(g, s, e, D(g, s, 1.2));
      }
    }
    if (s.awake && g.time >= (s.data.cleanAt ?? 0)) {
      s.data.cleanAt = g.time + 0.5;
      g.zones = g.zones.filter((z) => z.team !== 'enemy' || dist2(z.x, z.y, p.x, p.y) > (100 + z.r) ** 2);
    }
  }
  if (s.id === 'cheongnyong' && s.br === 'b') aura(g, s, 'storm', { kind: 'storm', r: 110, dps: D(g, s, 1) });
}

export function updateSpirits(g, dt) {
  const p = g.player;
  for (const s of g.spirits) {
    // Follow: a step behind the hero, one on each side.
    const side = s.slot === 0 ? -1 : 1;
    const tx = p.x + side * 34, ty = p.y + 18 + Math.sin(g.time * 3 + s.slot) * 4;
    const k = Math.min(1, dt * 7);
    s.x += (tx - s.x) * k;
    s.y += (ty - s.y) * k;
    if (s.lunge) {
      s.lunge.t += dt;
      if (s.lunge.t >= s.lunge.dur * 2) s.lunge = null;
    }
    tick(g, s, dt);
    s.cd -= dt;
    if (s.cd > 0) continue;
    const next = ACT[s.id]?.(g, s, dt) ?? 1;
    s.cd = Math.max(0, next * (next > 0.3 ? s.mod.cd : 1));
  }
}

// ---------------------------------------------------------------- hooks

/** Hero is about to take `dmg` (after armour): 산곰 takes a share, shields soak the rest. */
export function spiritAbsorb(g, dmg, attacker) {
  const p = g.player;
  for (const s of g.spirits) if (s.id === 'bear') dmg *= 1 - 0.08 * s.pw * (s.br === 'a' ? 2 : 1);
  if (p.shield > 0) {
    const soak = Math.min(p.shield, dmg);
    p.shield -= soak;
    dmg -= soak;
    const by = p.shieldBy;
    // 반사 / 철갑: what the shell caught goes back to whoever struck.
    if (by && attacker && !attacker.dead && by.br === (by.id === 'turtle' ? 'b' : 'a')) hit(g, by, attacker, soak * 2);
    if (p.shield <= 0 && by?.awake) {
      if (by.id === 'turtle') area(g, p.x, p.y, 150, (e) => hit(g, by, e, D(g, by, 0.5), { from: p, kb: 220 }));
      if (by.id === 'hyeonmu') area(g, p.x, p.y, 150, (e) => hit(g, by, e, D(g, by, 4), { from: p }));
      ring(g, p.x, p.y, 150, '#7ad8a0', 0.5);
    }
    if (p.shield <= 0) p.shieldMax = 0;
  }
  return dmg;
}

/** After the hero was hurt by `attacker`. */
export function spiritOnHurt(g, attacker) {
  const p = g.player;
  for (const s of g.spirits) {
    if (s.id === 'jindo' && s.br === 'b' && attacker && !attacker.dead && g.time >= (s.data.bite ?? 0)) {
      s.data.bite = g.time + 0.5;
      lungeTo(s, attacker.x, attacker.y, 0.15);
      hit(g, s, attacker, D(g, s, 2));
    }
    if (s.id === 'bear' && s.br === 'b' && g.time >= (s.data.swipe ?? 0)) {
      s.data.swipe = g.time + 1;
      area(g, p.x, p.y, 90, (e) => hit(g, s, e, D(g, s, 1.5), { from: p, kb: 80 }));
      ring(g, p.x, p.y, 90, '#c08a5a');
    }
    if (s.id === 'otter' && s.data.saved && p.hp > 0 && p.hp < p.stats.maxHp * 0.3) {
      s.data.saved = 0;
      p.heal(p.stats.maxHp * 0.4);
      g.texts.push({ x: p.x, y: p.y - 36, v: '🦦 큰 물고기!', t: 0, life: 1.2, order: true });
    }
  }
}

/** The hero would fall: 주작 brings them back, 산곰 (각성) takes the blow. True if saved. */
export function spiritRevive(g) {
  const p = g.player;
  for (const s of g.spirits) {
    if (s.id === 'bear' && s.data.guard) {
      s.data.guard = 0;
      p.hp = 1;
      p.invuln = 2;
      g.banner('🐻 산곰이 마지막 일격을 대신 맞았다!', 'small');
      return true;
    }
    if (s.id === 'jujak' && s.data.revives > 0) {
      s.data.revives--;
      p.hp = p.stats.maxHp * (s.br === 'b' ? 1 : 0.5);
      p.invuln = 2.5;
      if (s.br === 'b') area(g, p.x, p.y, 220, (e) => hit(g, s, e, D(g, s, 6), { from: p, kb: 200 }));
      ring(g, p.x, p.y, 220, '#ff7a3a', 0.8);
      g.banner('🐦‍🔥 주작의 불꽃 — 다시 일어선다!', 'big');
      g.ultFlash?.('255, 140, 60', 0.4, 0.5);
      return true;
    }
  }
  return false;
}

export function spiritOnKill(g, e) {
  for (const s of g.spirits) {
    if (s.id === 'wolf') {
      const pack = (s.data.pack ??= []);
      if (pack.length < (s.br === 'a' ? 8 : 5) + (s.mod.packMax ?? 0) && Math.random() < 0.1) {
        pack.push({ x: e.x, y: e.y, cd: 0.5, bite: 0 });
        g.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, size: 16, tone: 'light' });
      }
    }
    if (s.id === 'bat' && s.awake) g.player.heal(1);
  }
}

/** 기세 was just spent on the hero's special: 학 (각성) gives half back. */
export function spiritOnSpecial(g, max) {
  for (const s of g.spirits) if (s.id === 'crane' && s.awake) g.player.momentum = Math.max(g.player.momentum, max * 0.5);
}
