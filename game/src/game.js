import { HEROES, MOMENTUM } from './data/heroes.js';
import { ENEMIES, VETERAN } from './data/enemies.js';
import { BOSSES } from './data/bosses.js';
import { STAGES, scaleStage } from './data/stages.js';
import { UPGRADES, FALLBACKS } from './data/upgrades.js';
import { SpatialGrid } from './core/grid.js';
import { clamp, rand, TAU, dist2 } from './core/math.js';
import { updateWeapon } from './systems/weapons.js';
import { SPECIALS } from './systems/specials.js';
import { BEHAVIORS } from './systems/enemyAI.js';
import { updateAllies } from './systems/allies.js';
import { Spawner } from './systems/spawner.js';

export const XP_TO_NEXT = (lv) => 5 + 3 * lv + Math.floor(0.2 * lv * lv);

const PLAYER_RADIUS = 14;
const INVULN_TIME = 0.5;
const MAX_ENEMIES = 420;

class Player {
  constructor(hero) {
    this.hero = hero;
    this.x = 0;
    this.y = 0;
    this.r = PLAYER_RADIUS;
    this.facing = 0;
    this.upgrades = {};
    this.weapon = { id: hero.weapon, level: 0, timer: 0.3 };
    this.level = 1;
    this.xp = 0;
    this.momentum = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.moving = false;
    this.recalc();
    this.hp = this.stats.maxHp;
  }

  /** Derives live stats from the hero base and owned upgrades. */
  recalc() {
    const b = this.hero.stats;
    const u = (id) => this.upgrades[id] ?? 0;
    this.stats = {
      maxHp: b.maxHp + 25 * u('vitality'),
      speed: b.speed * (1 + 0.08 * u('swift')),
      might: b.might * (1 + 0.15 * u('might')),
      haste: b.haste * (1 - 0.1 * u('haste')),
      area: b.area * (1 + 0.12 * u('area')),
      pickup: b.pickup * (1 + 0.35 * u('magnet')),
      armor: b.armor,
      momentumMul: 1 + 0.25 * u('momentum'),
      guard: u('guard'),
      caltrops: u('caltrops'),
    };
  }

  heal(v) {
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
  }
}

export class Game {
  /**
   * @param {object} opts { heroId, stageId, quick, onState(state), onBanner(text, size) }
   */
  constructor(opts) {
    this.opts = opts;
    const hero = HEROES[opts.heroId];
    this.stage = scaleStage(STAGES[opts.stageId], opts.quick ? 0.2 : 1);
    this.player = new Player(hero);
    this.enemies = [];
    this.projectiles = [];
    this.allies = [];
    this.pickups = [];
    this.fx = [];
    this.texts = [];
    this.timers = [];
    this.grid = new SpatialGrid(64);
    this.spawner = new Spawner(this.stage);
    this.time = 0;
    this.kills = 0;
    this.pendingLevels = 0;
    this.choices = null;
    this.boss = null;
    this.bossIntro = 0;
    this.arena = null;
    this.state = 'play'; // play | levelup | paused | over | clear
    this.endTimer = 0;
    this.view = { w: 1280, h: 720 }; // world-units visible; set by renderer
  }

  // ---------------------------------------------------------------- helpers

  spawnDistance() {
    return Math.hypot(this.view.w, this.view.h) / 2 + 50;
  }

  later(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  banner(text, size = 'normal') {
    this.opts.onBanner?.(text, size);
  }

  nearestEnemy(x, y, maxR) {
    let best = null, bd = maxR * maxR;
    this.grid.query(x, y, maxR, (e) => {
      if (e.dead || e.def.behavior === 'static') return;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    });
    return best;
  }

  nearestEnemies(x, y, maxR, n) {
    const found = [];
    this.grid.query(x, y, maxR, (e) => {
      if (e.dead || e.def.behavior === 'static') return;
      const d = dist2(x, y, e.x, e.y);
      if (d <= maxR * maxR) found.push({ e, d });
    });
    found.sort((a, b) => a.d - b.d);
    return found.slice(0, n).map((f) => f.e);
  }

  // --------------------------------------------------------------- spawning

  spawnEnemy(id, x, y, { elite = false } = {}) {
    if (this.enemies.length >= MAX_ENEMIES && id !== 'cart') return null;
    const def = ENEMIES[id];
    const scale = def.noScaling ? 1 : 1 + this.time / 150;
    const v = elite ? VETERAN : null;
    const hp = def.hp * scale * (v ? v.hpMul : 1);
    const e = {
      def, x, y, elite,
      r: def.radius * (v ? v.sizeMul : 1),
      hp, maxHp: hp,
      speed: def.speed * rand(0.92, 1.08),
      damage: def.damage * (v ? v.damageMul : 1),
      damageMul: v ? v.damageMul : 1,
      xp: def.xp * (v ? v.xpMul : 1),
      vx: 0, vy: 0, kx: 0, ky: 0,
      facing: 0, flash: 0, seed: Math.random(),
    };
    this.enemies.push(e);
    return e;
  }

  summonAround(id, count, x, y, radius) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const e = this.spawnEnemy(id, x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      if (e) this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, size: 20, tone: 'mud' });
    }
  }

  startBoss(bossId) {
    const def = BOSSES[bossId];
    // Every regular enemy scatters into ink.
    for (const e of this.enemies) {
      e.dead = true;
      this.fx.push({ type: 'ink', x: e.x, y: e.y, t: 0, life: 0.7, size: e.r * 1.6, seed: Math.random() });
    }
    this.enemies = [];
    this.projectiles = this.projectiles.filter((p) => p.team === 'player');

    const p = this.player;
    this.arena = { x: p.x, y: p.y, r: 460 };
    const b = this.spawnEnemy('infantry', p.x, p.y - 300); // reuse instance shape
    Object.assign(b, {
      def: { ...def, behavior: 'boss' },
      isBoss: true,
      r: def.radius,
      hp: def.hp, maxHp: def.hp,
      speed: def.speed,
      damage: def.damage,
      xp: 0,
      cooldownMul: 1,
      summoned: new Set(),
    });
    this.boss = b;
    this.bossIntro = 2.4;
    this.opts.onBoss?.(def);
  }

  syncArcherAllies() {
    const want = this.player.upgrades.archers ?? 0;
    let have = this.allies.filter((a) => a.kind === 'archer').length;
    while (have < want) {
      this.allies.push({ kind: 'archer', x: this.player.x, y: this.player.y, r: 10, cd: 0.5, facing: 0 });
      have++;
    }
  }

  // ----------------------------------------------------------------- combat

  damageEnemy(e, amount, sx, sy, knockback = 0) {
    if (e.dead) return;
    if (e.isBoss && this.bossIntro > 0) return;
    e.hp -= amount;
    e.flash = 0.1;
    const dx = e.x - sx, dy = e.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    const k = knockback * (1 - (e.def.knockResist ?? 0));
    e.kx += (dx / d) * k * 4;
    e.ky += (dy / d) * k * 4;
    this.texts.push({ x: e.x + rand(-6, 6), y: e.y - e.r, v: Math.round(amount), t: 0, life: 0.6, big: amount >= 30 });
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true;
    this.fx.push({ type: 'ink', x: e.x, y: e.y, t: 0, life: 0.8, size: e.r * (e.isBoss ? 4 : 1.6), seed: Math.random() });
    if (e.def.behavior === 'static') {
      this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.6, size: 26, tone: 'mud' });
    } else {
      this.kills++;
      this.addMomentum(MOMENTUM.perKill);
    }
    if (e.xp > 0) this.dropCoin(e.x, e.y, e.xp);
    if (e.def.drop === 'rice') this.pickups.push({ kind: 'rice', x: e.x, y: e.y, heal: 25, magnet: false, t: 0 });
    if (e.isBoss) {
      this.state = 'clearing';
      this.endTimer = 2.2;
      this.banner(`${e.def.name} 격파`, 'big');
      for (const o of this.enemies) if (!o.dead && o !== e) this.killEnemy(o);
    }
  }

  dropCoin(x, y, value) {
    const tier = value >= 5 ? 'gold' : value >= 3 ? 'silver' : 'bronze';
    this.pickups.push({ kind: 'coin', tier, value, x: x + rand(-4, 4), y: y + rand(-4, 4), magnet: false, t: 0 });
  }

  hurtPlayer(amount) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'play') return;
    const dmg = Math.max(1, amount - p.stats.armor);
    p.hp -= dmg;
    p.invuln = INVULN_TIME;
    p.hurtFlash = 0.25;
    this.texts.push({ x: p.x, y: p.y - 20, v: Math.round(dmg), t: 0, life: 0.7, hurt: true });
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'dying';
      this.endTimer = 1.2;
      this.fx.push({ type: 'ink', x: p.x, y: p.y, t: 0, life: 1.2, size: 40, seed: 0.3 });
    }
  }

  addMomentum(v) {
    const p = this.player;
    p.momentum += v * p.stats.momentumMul;
    if (p.momentum >= MOMENTUM.max) {
      p.momentum = 0;
      SPECIALS[p.hero.special].fire(this);
    }
  }

  gainXp(v) {
    const p = this.player;
    p.xp += v;
    while (p.xp >= XP_TO_NEXT(p.level)) {
      p.xp -= XP_TO_NEXT(p.level);
      p.level++;
      this.pendingLevels++;
    }
  }

  // ---------------------------------------------------------------- levelup

  buildChoices() {
    const p = this.player;
    const lvl = (u) => p.upgrades[u.id] ?? 0;
    const pool = UPGRADES.filter((u) => (u.available ? u.available(this) : lvl(u) < u.maxLevel));
    const choices = [];
    const evo = pool.find((u) => u.isEvolution?.(this));
    if (evo) choices.push(evo);
    const rest = pool.filter((u) => u !== evo);
    while (choices.length < 3 && rest.length) {
      let total = 0;
      const w = rest.map((u) => {
        const x = u.weight * (u.category === p.hero.favoredCategory ? 1.5 : 1);
        total += x;
        return x;
      });
      let r = Math.random() * total;
      let i = 0;
      while (r > w[i]) r -= w[i++];
      choices.push(rest.splice(Math.min(i, rest.length - 1), 1)[0]);
    }
    for (const f of FALLBACKS) if (choices.length < 3) choices.push(f);
    return choices.map((u) => ({
      up: u,
      id: u.id,
      category: u.category,
      name: typeof u.name === 'function' ? u.name(this) : u.name,
      desc: u.describe(this),
      level: u.id === 'weapon' ? p.weapon.level + 2 : u.maxLevel === Infinity ? null : lvl(u) + 1,
      maxLevel: u.id === 'weapon' ? null : u.maxLevel,
      evolution: !!u.isEvolution?.(this),
    }));
  }

  choose(index) {
    if (this.state !== 'levelup' || !this.choices?.[index]) return;
    const c = this.choices[index];
    if (c.id !== 'weapon' && c.up.maxLevel !== Infinity) {
      this.player.upgrades[c.id] = (this.player.upgrades[c.id] ?? 0) + 1;
    }
    c.up.apply(this);
    if (c.evolution) this.banner(`무기 진화 — ${c.name}`, 'big');
    this.pendingLevels--;
    this.choices = null;
    this.setState('play');
  }

  setState(s) {
    this.state = s;
    this.opts.onState?.(s, this);
  }

  togglePause() {
    if (this.state === 'play') this.setState('paused');
    else if (this.state === 'paused') this.setState('play');
  }

  // ----------------------------------------------------------------- update

  update(dt, move) {
    if (this.state === 'levelup' || this.state === 'paused' || this.state === 'over' || this.state === 'clear') return;

    if (this.state === 'dying' || this.state === 'clearing') {
      // Slow-motion wind-down before the result screen.
      this.endTimer -= dt;
      this.updateFx(dt * 0.4);
      if (this.endTimer <= 0) this.setState(this.state === 'dying' ? 'over' : 'clear');
      return;
    }

    this.time += dt;
    const p = this.player;

    // Delayed actions (double slash etc.).
    for (const t of this.timers) {
      t.t -= dt;
      if (t.t <= 0) t.fn();
    }
    this.timers = this.timers.filter((t) => t.t > 0);

    // Player movement.
    p.moving = move.x !== 0 || move.y !== 0;
    if (p.moving) {
      p.x += move.x * p.stats.speed * dt;
      p.y += move.y * p.stats.speed * dt;
      p.facing = Math.atan2(move.y, move.x);
    }
    if (this.arena) {
      const dx = p.x - this.arena.x, dy = p.y - this.arena.y;
      const d = Math.hypot(dx, dy), lim = this.arena.r - p.r;
      if (d > lim) {
        p.x = this.arena.x + (dx / d) * lim;
        p.y = this.arena.y + (dy / d) * lim;
      }
    }
    p.invuln -= dt;
    p.hurtFlash -= dt;

    this.addMomentum(MOMENTUM.perSecond * dt);
    if (this.bossIntro > 0) this.bossIntro -= dt;

    this.spawner.update(this, dt);

    // Rebuild the spatial grid once per frame.
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    updateWeapon(this, dt);
    updateAllies(this, dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateFx(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.pendingLevels > 0 && this.state === 'play') {
      this.choices = this.buildChoices();
      this.setState('levelup');
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    const slowR = 120;
    const slow = 1 - 0.15 * p.stats.caltrops;
    for (const e of this.enemies) {
      if (e.dead) continue;
      BEHAVIORS[e.def.behavior](this, e, dt);
      let mul = 1;
      if (p.stats.caltrops && !e.isBoss && dist2(e.x, e.y, p.x, p.y) < slowR * slowR) mul = slow;
      e.x += (e.vx * mul + e.kx) * dt;
      e.y += (e.vy * mul + e.ky) * dt;
      const decay = Math.exp(-10 * dt);
      e.kx *= decay;
      e.ky *= decay;
      e.flash -= dt;

      // Separation from neighbours (static carts do not move).
      if (e.def.behavior !== 'static') {
        this.grid.query(e.x, e.y, e.r * 2, (o) => {
          if (o === e || o.dead) return;
          const dx = e.x - o.x, dy = e.y - o.y;
          const min = e.r + o.r;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0 && d2 < min * min) {
            const d = Math.sqrt(d2);
            const push = ((min - d) / d) * (o.def.behavior === 'static' || o.isBoss ? 1 : 0.5);
            e.x += dx * push;
            e.y += dy * push;
          }
        });
      }

      if (this.arena && (e.isBoss || e.def.behavior !== 'static')) {
        const dx = e.x - this.arena.x, dy = e.y - this.arena.y;
        const d = Math.hypot(dx, dy), lim = this.arena.r - e.r;
        if (d > lim) {
          e.x = this.arena.x + (dx / d) * lim;
          e.y = this.arena.y + (dy / d) * lim;
          if (e.isBoss) e.hitWall = true;
        }
      }

      // Contact damage.
      const dmg = e.contactDamage ?? e.damage;
      if (dmg > 0) {
        const rr = e.r + p.r - 2;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) this.hurtPlayer(dmg);
      }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.spin !== undefined) pr.spin += dt * 14;
      if (pr.team === 'enemy') {
        const rr = pr.r + p.r;
        if (dist2(pr.x, pr.y, p.x, p.y) < rr * rr) {
          this.hurtPlayer(pr.damage);
          pr.life = 0;
        }
      } else {
        this.grid.query(pr.x, pr.y, pr.r + 30, (e) => {
          if (pr.life <= 0 || e.dead || pr.hit.has(e)) return;
          const rr = pr.r + e.r;
          if (dist2(pr.x, pr.y, e.x, e.y) < rr * rr) {
            pr.hit.add(e);
            this.damageEnemy(e, pr.damage, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, pr.knockback);
            pr.pierce -= 1;
            if (pr.pierce <= 0) pr.life = 0;
          }
        });
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }

  updatePickups(dt) {
    const p = this.player;
    const pr2 = p.stats.pickup ** 2;
    for (const k of this.pickups) {
      k.t += dt;
      const dx = p.x - k.x, dy = p.y - k.y;
      const d2 = dx * dx + dy * dy;
      if (!k.magnet && d2 < pr2) k.magnet = true;
      if (k.magnet) {
        const d = Math.sqrt(d2) || 1;
        const s = 260 + k.t * 120;
        k.x += (dx / d) * s * dt;
        k.y += (dy / d) * s * dt;
        if (d < p.r + 6) {
          k.taken = true;
          if (k.kind === 'coin') this.gainXp(k.value);
          else if (k.kind === 'rice') {
            p.heal(k.heal);
            this.texts.push({ x: p.x, y: p.y - 24, v: `+${k.heal}`, t: 0, life: 0.8, heal: true });
          }
        }
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.t += dt;
      if (f.follow) {
        f.x = f.follow.x;
        f.y = f.follow.y;
      }
    }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const t of this.texts) {
      t.t += dt;
      t.y -= 30 * dt;
    }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  /** Snapshot for the HUD. */
  hud() {
    const p = this.player;
    const remaining = Math.max(0, this.stage.bossAt - this.time);
    return {
      hp: p.hp, maxHp: p.stats.maxHp,
      level: p.level, xp: p.xp, xpNext: XP_TO_NEXT(p.level),
      momentum: p.momentum / MOMENTUM.max,
      time: this.time, remaining, bossAt: this.stage.bossAt,
      kills: this.kills,
      boss: this.boss && !this.boss.dead ? { name: this.boss.def.name, ratio: clamp(this.boss.hp / this.boss.maxHp, 0, 1) } : null,
      bossPhase: !!this.boss,
    };
  }
}
