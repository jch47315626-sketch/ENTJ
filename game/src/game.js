import { HEROES, MOMENTUM } from './data/heroes.js';
import { ENEMIES, VETERAN } from './data/enemies.js';
import { BOSSES } from './data/bosses.js';
import { afterSwing, onHurt, updateBuild } from './systems/builds.js';
import { STAGES, scaleStage } from './data/stages.js';
import { enemyHpScale, enemyDamageScale, ENEMY_BOOST, ENEMY_ARMOR, BOSS_BOOST, HP_REGEN } from './data/balance.js';
import { UPGRADES, FALLBACKS, LIFESTEAL } from './data/upgrades.js';
import { baseReward, REWARD_BY_STARS, BOSS_REWARD } from './data/meta.js';
import { SpatialGrid } from './core/grid.js';
import { clamp, rand, TAU, dist2, angleDiff } from './core/math.js';
import { updateWeapon, hitArc } from './systems/weapons.js';
import { SPECIALS } from './systems/specials.js';
import { BEHAVIORS } from './systems/enemyAI.js';
import { updateAllies } from './systems/allies.js';
import { planCrows, updateCrows, callCrow, CROW } from './systems/crows.js';
import { updateFieldObjects, breakObject } from './systems/fieldObjects.js';
import { applyDaily } from './data/daily.js';
import { ENDLESS, makeEndless } from './data/endless.js';
import { Spawner } from './systems/spawner.js';
import { updateSkills } from './systems/skills.js';

export const XP_TO_NEXT = (lv) => 5 + 3 * lv + Math.floor(0.2 * lv * lv);

const PLAYER_RADIUS = 14;
const INVULN_TIME = 0.6;
const MAX_ENEMIES = 420;

class Player {
  constructor(hero, meta = {}) {
    this.meta = meta; // bonuses from gear and camp training (data/meta.js)
    this.hero = hero;
    this.x = 0;
    this.y = 0;
    this.r = PLAYER_RADIUS;
    this.facing = 0;
    this.upgrades = {};
    this.weapon = { id: hero.weapon, level: 0, timer: 0.3 };
    this.subs = {}; // second weapons gained from level-ups, by id
    this.skillTimers = {}; // cooldown skills gained from level-ups, by id
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
    const m = this.meta;
    const u = (id) => this.upgrades[id] ?? 0;
    // 패왕의 분노: below half health the hero hits harder and faster.
    const maxHp = (b.maxHp + 25 * u('vitality') + (m.maxHp ?? 0)) * (m.hpMul ?? 1);
    this.enraged = !!m.berserk && this.hp !== undefined && this.hp < maxHp * 0.5;
    const rage = this.enraged ? m.berserk : 0;
    this.stats = {
      maxHp,
      // 전고 (war drum object): faster steps and swings while it beats.
      speed: b.speed * (1 + 0.08 * u('swift') + (m.speed ?? 0)) * (this.drumUntil ? 1.2 : 1),
      might: b.might * (1 + 0.15 * u('might') + (m.might ?? 0) + rage),
      haste: b.haste * (1 - 0.1 * u('haste') - (m.haste ?? 0) - (rage ? 0.2 : 0)) * (this.drumUntil ? 0.75 : 1),
      area: b.area * (1 + 0.12 * u('area') + (m.area ?? 0)),
      pickup: b.pickup * (1 + 0.35 * u('magnet') + (m.pickup ?? 0)),
      armor: b.armor + (m.armor ?? 0),
      momentumMul: 1 + 0.25 * u('momentum') + (m.momentum ?? 0),
      xpMul: 1 + (m.xp ?? 0),
      guard: u('guard'),
      caltrops: u('caltrops'),
      specialMul: 1 + 0.3 * u('fury') + (m.specialMul ?? 0),
      specialArea: 1 + (m.specialArea ?? 0),
      specialStun: 0.2 * u('fury'),
    };
  }

  heal(v) {
    this.hp = Math.min(this.stats.maxHp, this.hp + v);
    if (this.meta.berserk) this.recalc();
  }

  /** Main weapon first, then any second weapons. */
  weapons() {
    return [this.weapon, ...Object.values(this.subs)];
  }

  syncSubWeapons() {
    for (const id of this.hero.subWeapons ?? []) {
      const lv = this.upgrades[id] ?? 0;
      if (!lv) continue;
      this.subs[id] ??= { id, level: 0, timer: 0.4 };
      this.subs[id].level = lv - 1;
    }
  }
}

export class Game {
  /**
   * @param {object} opts { heroId, stageId, quick, onState(state), onBanner(text, size) }
   */
  constructor(opts) {
    this.opts = opts;
    const hero = HEROES[opts.heroId];
    // 오늘의 전장: the day's rules are folded into the stage's difficulty.
    // ♾️ 무한 전장: the same field, with no end (data/endless.js).
    const base = opts.daily ? applyDaily(STAGES[opts.stageId], opts.daily) : opts.endless ? makeEndless(STAGES[opts.stageId]) : STAGES[opts.stageId];
    this.endlessBosses = 0;
    this.stage = scaleStage(base, opts.quick ? 0.2 : 1);
    this.player = new Player(hero, opts.meta);
    this.enemies = [];
    this.projectiles = [];
    this.allies = [];
    // Per-battle counts for 업적 (core/achieve.js).
    this.runStats = { drained: 0, crowCalls: 0, crowBest: 0, hurtInBoss: 0 };
    planCrows(this);
    this.pickups = [];
    this.fx = [];
    this.texts = [];
    this.timers = [];
    this.damageLog = {}; // damage taken by source, for tuning
    this.taunts = []; // allies that draw enemies to themselves
    this.zones = []; // ground areas: { team, kind, x, y, r, life, t, dps?, slow? }
    this.shakeAmt = 0;
    this.sfx = opts.onSfx ?? (() => {});
    this.specialName = SPECIALS[hero.special].name;
    this.grid = new SpatialGrid(64);
    this.spawner = new Spawner(this.stage);
    this.time = 0;
    this.kills = 0;
    this.killsBy = {}; // enemy and boss ids defeated this run, for the 도감
    this.pendingLevels = 0;
    this.choices = null;
    this.boss = null;
    this.bosses = [];
    this.bossGroup = null;
    this.bossIntro = 0;
    this.darkUntil = 0; // 관심법의 밤: vision shrinks until this time
    this.arena = null;
    this.state = 'play'; // play | levelup | paused | over | clear
    this.endTimer = 0;
    this.view = { w: 1280, h: 720 }; // world-units visible; set by renderer
    this.applyStartPerks();
    this.spawnRetinue();
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

  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  isCharmed(e) {
    return e.charmUntil > this.time;
  }

  /**
   * What an enemy chases. Charmed units hunt their former comrades; others
   * go for a charmed unit right next to them, a luring decoy, or the hero.
   */
  targetFor(e) {
    if (this.isCharmed(e)) return e.charmTarget ?? this.player;
    if (e.nearCharmed && !e.nearCharmed.dead && this.isCharmed(e.nearCharmed)) return e.nearCharmed;
    if (!e.isBoss) {
      let best = null, bd = Infinity;
      for (const t of this.taunts) {
        const d = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
        if (d < t.lure * t.lure && d < bd) {
          bd = d;
          best = t;
        }
      }
      if (best) return best;
    }
    return this.player;
  }

  /** Friendly troops joining for a while (e.g. local lords' archers). */
  spawnAllies(kind, count, life) {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      this.allies.push({ kind, x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, r: 10, cd: 0.5, facing: a, life, maxLife: life });
      this.fx.push({ type: 'puff', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, t: 0, life: 0.5, size: 18, tone: 'light' });
    }
  }

  spawnDecoy(life) {
    const p = this.player;
    // Run toward the side with the most enemies so the lure pulls them away.
    let sx = 0, sy = 0;
    for (const e of this.enemies) {
      sx += e.x - p.x;
      sy += e.y - p.y;
    }
    const a = sx || sy ? Math.atan2(sy, sx) : rand(0, TAU);
    this.allies.push({ kind: 'decoy', x: p.x, y: p.y, r: 14, life, maxLife: life, facing: a, cd: 0, lure: 420 });
  }

  nearestEnemy(x, y, maxR) {
    let best = null, bd = maxR * maxR;
    this.grid.query(x, y, maxR, (e) => {
      if (e.dead || e.def.behavior === 'static' || this.isCharmed(e)) return;
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
      if (e.dead || e.def.behavior === 'static' || this.isCharmed(e)) return;
      const d = dist2(x, y, e.x, e.y);
      if (d <= maxR * maxR) found.push({ e, d });
    });
    found.sort((a, b) => a.d - b.d);
    return found.slice(0, n).map((f) => f.e);
  }

  // --------------------------------------------------------------- spawning

  spawnEnemy(id, x, y, { elite = false } = {}) {
    if (this.enemies.length >= MAX_ENEMIES && ENEMIES[id]?.behavior !== 'static') return null;
    const def = ENEMIES[id];
    const diff = this.stage.difficulty;
    const scale = def.noScaling ? 1 : enemyHpScale(this.time) * diff.enemyHp * ENEMY_BOOST.hp * (1 + (this.stage.endless ? Math.max(0, this.time - ENDLESS.rampFrom) / ENDLESS.hpGrowth : 0));
    const over = this.stage.endless ? Math.max(0, this.time - ENDLESS.rampFrom) : 0;
    const dmgScale = enemyDamageScale(this.time) * diff.enemyDamage * ENEMY_BOOST.damage * (1 + over / ENDLESS.damageGrowth);
    const v = elite ? VETERAN : null;
    const hp = def.hp * scale * (v ? v.hpMul : 1);
    const e = {
      def, x, y, elite,
      r: def.radius * (v ? v.sizeMul : 1),
      hp, maxHp: hp,
      speed: def.speed * rand(0.92, 1.08) * (diff.enemySpeed ?? 1),
      damage: def.damage * dmgScale * (v ? v.damageMul : 1),
      damageMul: dmgScale * (v ? v.damageMul : 1),
      // Tougher stages give more 공훈 per kill so levelling keeps pace.
      xp: def.xp * (v ? v.xpMul : 1) * (1 + (diff.enemyHp - 1) * (diff.xpScale ?? 0.6)) * (diff.xpMul ?? 1),
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
    this.zones = this.zones.filter((z) => z.team === 'player');

    const p = this.player;
    this.arena = { x: p.x, y: p.y, r: 460 };
    // A group boss (e.g. the four founding generals) enters all at once.
    this.bosses = [];
    const ids = def.group ?? [bossId];
    ids.forEach((id, i) => {
      const a = -Math.PI / 2 + (ids.length > 1 ? ((i - (ids.length - 1) / 2) * Math.PI) / 3.2 : 0);
      this.bosses.push(this.spawnBossUnit(id, p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300));
    });
    const b = this.bosses[0];
    this.bossGroup = def.group ? def : null;
    this.boss = b;
    this.runStats.bossSeen = true;
    this.bossIntro = 2.4;
    this.shake(8);
    this.sfx('boss');
    this.opts.onBoss?.(def);
  }

  /** One boss body (also used for 궁예's clones, which are `minion`s). */
  spawnBossUnit(id, x, y) {
    const def = BOSSES[id];
    const diff = this.stage.difficulty;
    const b = this.spawnEnemy('infantry', x, y); // reuse instance shape
    if (!b) return null;
    Object.assign(b, {
      def: { ...def, behavior: 'boss' },
      isBoss: true,
      elite: false,
      r: def.radius,
      hp: def.hp * diff.bossHp * ENEMY_BOOST.hp * BOSS_BOOST.hp * this.endlessBossMul('hp'), maxHp: def.hp * diff.bossHp * ENEMY_BOOST.hp * BOSS_BOOST.hp * this.endlessBossMul('hp'),
      speed: def.speed,
      damage: def.damage * diff.bossDamage * ENEMY_BOOST.damage * BOSS_BOOST.damage * this.endlessBossMul('damage'),
      damageMul: diff.bossDamage * ENEMY_BOOST.damage * BOSS_BOOST.damage * this.endlessBossMul('damage'),
      xp: 0,
      cooldownMul: 1,
      summoned: new Set(),
    });
    return b;
  }

  /** Boss bar: one boss, or the summed health of a group. */
  bossStatus() {
    if (!this.bosses?.length) return null;
    const main = this.bosses.filter((b) => !b.def.minion);
    const hp = main.reduce((a, b) => a + Math.max(0, b.dead ? 0 : b.hp), 0);
    if (hp <= 0) return null;
    const max = main.reduce((a, b) => a + b.maxHp, 0);
    const name = this.bossGroup ? `${this.bossGroup.name} (${main.filter((b) => !b.dead).length}/${main.length})` : main[0].def.name;
    return { name, ratio: clamp(hp / max, 0, 1) };
  }

  /**
   * 군세 (왕건 통솔의 길): standing troops from the skill tree. They never leave;
   * each kind has its own 군령 cycle (see systems/allies.js ORDERS).
   */
  spawnRetinue() {
    const m = this.player.meta;
    const roles = [
      ...Array(m.retinueSpear ?? 0).fill('spear'),
      ...Array(m.retinueArcher ?? 0).fill('archer'),
      ...Array(m.retinueGuard ?? 0).fill('guard'),
    ];
    this.orders = {};
    roles.forEach((role, i) => {
      this.allies.push({ kind: 'retinue', role, idx: roles.filter((r, j) => r === role && j < i).length, x: this.player.x, y: this.player.y, r: 11, cd: 0, facing: 0 });
      this.orders[role] ??= { t: 2 + Object.keys(this.orders).length * 1.3 };
    });
  }

  /**
   * 견훤 혈투: each foe struck by his own blade gives back a little health
   * (a share of max HP per foe, a few foes per swing at most).
   */
  heroDrain(hits) {
    const lv = this.player.upgrades.lifesteal ?? 0;
    if (!lv || !hits) return;
    const L = LIFESTEAL[lv];
    const p = this.player;
    const before = p.hp;
    p.heal(Math.min(hits, L.cap) * L.share * p.stats.maxHp);
    const got = p.hp - before;
    if (got <= 0) return;
    this.runStats.drained += got;
    // Show the healing as one number every half second, not per hit.
    this.drainShown = (this.drainShown ?? 0) + got;
    if (this.time - (this.drainAt ?? -9) > 0.5 && this.drainShown >= 1) {
      this.texts.push({ x: p.x, y: p.y - 30, v: `+${Math.round(this.drainShown)}`, t: 0, life: 0.7, heal: true });
      this.drainShown = 0;
      this.drainAt = this.time;
    }
  }

  /** After each main-weapon swing (견훤 패공의 길 lunges and dashes). */
  afterSwing() {
    afterSwing(this);
  }

  /** 마구니: one orbiting spirit per level of the upgrade. */
  syncMaguni() {
    const want = this.player.upgrades.maguni ?? 0;
    let have = this.allies.filter((a) => a.kind === 'maguni').length;
    while (have < want) {
      this.allies.push({ kind: 'maguni', x: this.player.x, y: this.player.y, r: 10, facing: 0, rest: 0, hitAt: new WeakMap() });
      have++;
    }
  }

  syncArcherAllies() {
    const want = this.player.upgrades.archers ?? 0;
    let have = this.allies.filter((a) => a.kind === 'archer' && !a.maxLife).length; // event archers don't count
    while (have < want) {
      this.allies.push({ kind: 'archer', x: this.player.x, y: this.player.y, r: 10, cd: 0.5, facing: 0 });
      have++;
    }
  }

  // ----------------------------------------------------------------- combat

  damageEnemy(e, amount, sx, sy, knockback = 0, opts) {
    if (e.dead) return;
    if (e.isBoss && this.bossIntro > 0) return;
    // Charmed units only take blows from other enemies; the hero spares them.
    if (this.isCharmed(e) && !opts?.byEnemy) return;
    if (e.invulnUntil > this.time) {
      if (Math.random() < 0.15) this.texts.push({ x: e.x, y: e.y - e.r, v: '막음', t: 0, life: 0.5 });
      return;
    }
    // Shield bearers shrug off blows from the front.
    const blk = e.def.params?.blockArc;
    if (blk && !(opts?.stun)) {
      const from = Math.atan2(sy - e.y, sx - e.x);
      if (Math.abs(angleDiff(from, e.facing)) < (blk * Math.PI) / 360) {
        amount *= e.def.params.blockMul;
        knockback *= 0.4;
        if (Math.random() < 0.3) this.fx.push({ type: 'spark', x: e.x + Math.cos(e.facing) * e.r, y: e.y + Math.sin(e.facing) * e.r, t: 0, life: 0.2 });
      }
    }
    if (e.def.armor) amount = Math.max(1, amount - e.def.armor);
    // Stage armour: harder battlefields shrug off a share of every blow (supply carts excepted).
    if (e.def.behavior !== 'static') amount = Math.max(1, amount * (1 - (ENEMY_ARMOR[this.stage.difficulty.stars] ?? 0)));
    if (opts?.stun) e.stun = Math.max(e.stun ?? 0, opts.stun * (e.isBoss ? 0.25 : 1));
    e.hp -= amount;
    this.sfx('hit');
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
    // 미륵의 대계: a swayed soldier bursts when it falls.
    if (this.isCharmed(e) && this.player.meta.charmBlast) {
      hitArc(this, e.x, e.y, 0, 70, 360, this.player.meta.charmBlast * this.player.stats.might, 80, 'burst');
    }
    this.sfx(e.isBoss && !e.def.minion ? 'bossDown' : 'kill');
    this.fx.push({ type: 'ink', x: e.x, y: e.y, t: 0, life: 0.8, size: e.r * (e.isBoss && !e.def.minion ? 4 : 1.6), seed: Math.random() });
    if (e.def.behavior === 'static') {
      this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.6, size: 26, tone: 'mud' });
      if (e.def.object && this.state === 'play') breakObject(this, e);
    } else {
      this.killsBy[e.def.id] = (this.killsBy[e.def.id] ?? 0) + 1;
      this.kills++;
      this.addMomentum(MOMENTUM.perKill);
    }
    if (e.xp > 0) this.dropCoin(e.x, e.y, e.xp);
    if (e.def.drop === 'rice') this.pickups.push({ kind: 'rice', x: e.x, y: e.y, heal: 25, magnet: false, t: 0 });
    if (e.isBoss && (e.def.minion || this.bosses.some((o) => !o.dead && !o.def.minion))) {
      // A clone, or one of several generals: the fight goes on.
      this.banner(`${e.def.name} 쓰러짐`, 'small');
    } else if (e.isBoss && this.stage.endless) {
      this.endBossWave(e);
    } else if (e.isBoss) {
      this.state = 'clearing';
      this.endTimer = 2.2;
      this.banner(`${e.def.name} 격파`, 'big');
      for (const o of this.enemies) if (!o.dead && o !== e) this.killEnemy(o);
    }
  }

  /** Later endless bosses are tougher: ×(1 + step × bosses already felled). */
  endlessBossMul(kind) {
    if (!this.stage.endless) return 1;
    return 1 + this.endlessBosses * (kind === 'hp' ? ENDLESS.bossHpStep : ENDLESS.bossDamageStep);
  }

  /** 무한 전장: a boss fell — the field opens again and the next one is on its way. */
  endBossWave(e) {
    this.endlessBosses++;
    for (const o of this.enemies) if (!o.dead && o !== e && o.isBoss) this.killEnemy(o);
    this.boss = null;
    this.bosses = [];
    this.bossGroup = null;
    this.arena = null;
    this.spawner.bossStarted = false;
    this.stage.bossAt = this.time + ENDLESS.bossEvery;
    // Spoils: a spray of coins and a rice ball.
    for (let i = 0; i < 12; i++) this.dropCoin(e.x + rand(-50, 50), e.y + rand(-50, 50), 5);
    this.pickups.push({ kind: 'rice', x: e.x, y: e.y, heal: 40, magnet: false, t: 0 });
    // Two more 감나무 branches before the next boss.
    this.crowPlan.push(this.time + rand(25, 70), this.time + rand(90, 150));
    this.crowPlan.sort((a, b) => a - b);
    this.banner(`${e.def.name} 격파! (${this.endlessBosses}번째) — 다음 적장까지 ${ENDLESS.bossEvery / 60}분`, 'big');
  }

  dropCoin(x, y, value) {
    const tier = value >= 5 ? 'gold' : value >= 3 ? 'silver' : 'bronze';
    this.pickups.push({ kind: 'coin', tier, value, x: x + rand(-4, 4), y: y + rand(-4, 4), magnet: false, t: 0 });
  }

  hurtPlayer(amount, source = 'unknown') {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'play') return false;
    if (p.mount && this.time < p.mount.invulnUntil) return false;
    // Armour cuts 7% per point (max 50%), so it helps against big hits and small ones alike.
    // 철벽 (견훤 반격의 길) adds armour for every foe close by.
    let dmg = Math.max(1, amount * (1 - Math.min(0.5, 0.07 * (p.stats.armor + (p.wall ?? 0)))));
    // 호위진: the bodyguards take a share of every blow.
    if (p.wardUntil > this.time) dmg = Math.max(1, dmg * 0.6);
    this.damageLog[source] = (this.damageLog[source] ?? 0) + dmg;
    if (this.boss) this.runStats.hurtInBoss += dmg;
    p.hp -= dmg;
    p.invuln = INVULN_TIME + (p.meta.invulBonus ?? 0);
    p.hurtFlash = 0.25;
    if (p.meta.berserk) p.recalc();
    this.shake(4);
    this.sfx('hurt');
    this.texts.push({ x: p.x, y: p.y - 20, v: Math.round(dmg), t: 0, life: 0.7, hurt: true });
    onHurt(this);
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'dying';
      this.endTimer = 1.2;
      this.fx.push({ type: 'ink', x: p.x, y: p.y, t: 0, life: 1.2, size: 40, seed: 0.3 });
    }
    return true;
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
    p.xp += v * p.stats.xpMul;
    while (p.xp >= XP_TO_NEXT(p.level)) {
      p.xp -= XP_TO_NEXT(p.level);
      p.level++;
      this.pendingLevels++;
      this.sfx('levelup');
    }
  }

  // ---------------------------------------------------------------- levelup

  buildChoices() {
    const p = this.player;
    const lvl = (u) => p.upgrades[u.id] ?? 0;
    const pool = UPGRADES.filter((u) => (!u.heroes || u.heroes.includes(p.hero.id)) && (!u.needs || p.meta[u.needs]) && (u.available ? u.available(this) : lvl(u) < u.maxLevel));
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
      sub: !!u.subWeapon,
    }));
  }

  choose(index) {
    if (this.state !== 'levelup' || !this.choices?.[index]) return;
    const c = this.choices[index];
    if (c.id !== 'weapon' && c.up.maxLevel !== Infinity) {
      this.player.upgrades[c.id] = (this.player.upgrades[c.id] ?? 0) + 1;
    }
    c.up.apply(this);
    if (c.evolution) {
      this.banner(`무기 진화 — ${c.name}`, 'big');
      this.sfx('evolve');
    }
    this.pendingLevels--;
    this.choices = null;
    this.setState('play');
  }

  /** 냥 earned so far this run, before any victory bonus (shown in the HUD). */
  liveReward() {
    const base = baseReward({ kills: this.kills, seconds: this.time, won: false, bossKilled: false });
    return Math.round(base * REWARD_BY_STARS[this.stage.difficulty.stars] * (1 + (this.opts.meta?.reward ?? 0)) * (this.stage.difficulty.rewardMul ?? 1));
  }

  /** 냥 for this run: base by performance, scaled by stage stars and 재물운. */
  computeReward(won) {
    const stars = this.stage.difficulty.stars;
    const base = baseReward({ kills: this.kills, seconds: this.time, won, bossKilled: won });
    const mul = REWARD_BY_STARS[stars] * (1 + (this.opts.meta?.reward ?? 0)) * (this.stage.difficulty.rewardMul ?? 1);
    const bossBonus = won ? Math.round(BOSS_REWARD * mul) : this.stage.endless ? Math.round(BOSS_REWARD * mul * ENDLESS.bossBounty * this.endlessBosses) : 0;
    return { base, mul, total: Math.round(base * mul) + (this.stage.endless ? bossBonus : 0), stars, bossBonus };
  }

  /** Start-of-run perks from the camp: secrets (비전) and free picks (병법서). */
  applyStartPerks() {
    const m = this.opts.meta ?? {};
    const p = this.player;
    for (const id of m.grants ?? []) {
      p.upgrades[id] = Math.max(p.upgrades[id] ?? 0, 1);
      const up = UPGRADES.find((u) => u.id === id);
      up?.apply(this);
    }
    p.recalc();
    p.hp = p.stats.maxHp;
    this.pendingLevels += m.freePicks ?? 0;
  }

  setState(s) {
    if ((s === 'clear' || s === 'over') && !this.reward) this.reward = this.computeReward(s === 'clear');
    this.state = s;
    if (s === 'clear') this.sfx('clear');
    if (s === 'over') this.sfx('defeat');
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
    p.vx = p.vy = 0;
    if (p.moving) {
      let spd = p.stats.speed;
      if (p.mount) spd *= p.mount.L.speed + (p.meta.mountSpeed ?? 0);
      for (const z of this.zones) {
        if (z.team === 'enemy' && z.slow && dist2(z.x, z.y, p.x, p.y) < z.r * z.r) spd *= 1 - z.slow;
      }
      p.vx = move.x * spd;
      p.vy = move.y * spd;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.dash) p.facing = Math.atan2(move.y, move.x);
    }
    updateBuild(this, dt);
    if (this.arena) {
      const dx = p.x - this.arena.x, dy = p.y - this.arena.y;
      const d = Math.hypot(dx, dy), lim = this.arena.r - p.r;
      if (d > lim) {
        p.x = this.arena.x + (dx / d) * lim;
        p.y = this.arena.y + (dy / d) * lim;
      }
    }
    p.invuln -= dt;
    // Natural recovery: 1% of max HP every 10 seconds.
    if (!this.stage.difficulty.noRegen && p.hp < p.stats.maxHp) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * HP_REGEN * dt);
    p.hurtFlash -= dt;
    this.updateMount(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);

    this.addMomentum(MOMENTUM.perSecond * dt);
    if (this.bossIntro > 0) this.bossIntro -= dt;

    this.spawner.update(this, dt);

    // Rebuild the spatial grid once per frame.
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    updateWeapon(this, dt);
    updateSkills(this, dt);
    updateAllies(this, dt);
    updateCrows(this, dt);
    updateFieldObjects(this, dt);
    this.taunts = this.allies.filter((a) => a.lure && !a.dead);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
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
      const charmed = this.isCharmed(e);
      if (charmed) {
        e.charmTarget = this.nearestEnemy(e.x, e.y, 520);
      } else if (e.charmUntil) {
        e.charmUntil = 0; // the spell wore off
        this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, size: 16, tone: 'light' });
      }
      e.atkCd = (e.atkCd ?? 0) - dt;
      if (e.pull) {
        this.updatePull(e, dt);
        continue;
      }
      if (e.stun > 0) {
        e.stun -= dt;
        e.vx = e.vy = 0;
      } else {
        BEHAVIORS[e.def.behavior](this, e, dt);
      }
      let mul = 1;
      if (p.stats.caltrops && !e.isBoss && dist2(e.x, e.y, p.x, p.y) < slowR * slowR) mul = slow;
      for (const z of this.zones) {
        if (z.team === 'player' && z.slow && dist2(z.x, z.y, e.x, e.y) < z.r * z.r) mul *= e.isBoss ? 1 - z.slow * 0.4 : 1 - z.slow;
      }
      e.x += (e.vx * mul + e.kx) * dt;
      e.y += (e.vy * mul + e.ky) * dt;
      const decay = Math.exp(-10 * dt);
      e.kx *= decay;
      e.ky *= decay;
      e.flash -= dt;

      // Separation from neighbours (static carts do not move); charmed and
      // uncharmed soldiers that touch trade blows.
      if (e.def.behavior !== 'static') {
        if (!charmed) e.nearCharmed = null;
        this.grid.query(e.x, e.y, e.r * 2 + 40, (o) => {
          if (o === e || o.dead) return;
          if (o.def.behavior !== 'static' && charmed !== this.isCharmed(o)) {
            const reach = e.r + o.r + 6;
            const d2 = dist2(e.x, e.y, o.x, o.y);
            if (!charmed && d2 < 150 * 150 && !o.isBoss) e.nearCharmed = o;
            if (d2 < reach * reach && e.atkCd <= 0) {
              e.atkCd = 0.6;
              const dmg = charmed ? e.def.damage * 3 * e.charmPower : e.damage * 1.5;
              this.damageEnemy(o, dmg, e.x, e.y, 40, { byEnemy: true });
              this.fx.push({ type: 'thrust', x: e.x, y: e.y, angle: Math.atan2(o.y - e.y, o.x - e.x), t: 0, life: 0.15 });
            }
          }
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

      // Blows at an ally who is drawing them in (신숭겸); the stage decoy has no HP.
      if (!charmed && !e.isBoss && e.atkCd <= 0) {
        for (const t of this.taunts) {
          if (t.hp === undefined) continue;
          const reach = t.r + e.r + 4;
          if (dist2(e.x, e.y, t.x, t.y) < reach * reach) {
            t.hp -= e.damage;
            t.hurtFlash = 0.12;
            e.atkCd = 0.6;
            break;
          }
        }
      }

      // Contact damage.
      const dmg = e.contactDamage ?? e.damage;
      if (dmg > 0 && !charmed) {
        const rr = e.r + p.r - 2;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr && this.hurtPlayer(dmg, e.isBoss ? 'boss' : e.def.id) && p.meta.thorns) {
          // 반격: whoever strikes the hero in melee takes a blow back.
          this.damageEnemy(e, p.meta.thorns * p.stats.might, p.x, p.y, 120);
          this.fx.push({ type: 'spark', x: e.x, y: e.y, t: 0, life: 0.25 });
        }
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
      if (pr.team === 'charm') {
        // Arrows loosed by charmed archers strike their own side.
        this.grid.query(pr.x, pr.y, pr.r + 30, (e) => {
          if (pr.life <= 0 || e.dead || this.isCharmed(e) || e.def.behavior === 'static') return;
          if (dist2(pr.x, pr.y, e.x, e.y) < (pr.r + e.r) ** 2) {
            this.damageEnemy(e, pr.damage, pr.x, pr.y, 20, { byEnemy: true });
            pr.life = 0;
          }
        });
      } else if (pr.team === 'enemy') {
        for (const t of this.taunts) {
          if (t.hp !== undefined && pr.life > 0 && dist2(pr.x, pr.y, t.x, t.y) < (pr.r + t.r) ** 2) {
            t.hp -= pr.damage;
            t.hurtFlash = 0.12;
            pr.life = 0;
          }
        }
        if (pr.life <= 0) continue;
        const rr = pr.r + p.r;
        if (dist2(pr.x, pr.y, p.x, p.y) < rr * rr) {
          this.hurtPlayer(pr.damage, pr.source ?? pr.kind);
          pr.life = 0;
        }
      } else {
        this.grid.query(pr.x, pr.y, pr.r + 30, (e) => {
          if (pr.life <= 0 || e.dead || pr.hit.has(e) || this.isCharmed(e)) return;
          const rr = pr.r + e.r;
          if (dist2(pr.x, pr.y, e.x, e.y) < rr * rr) {
            pr.hit.add(e);
            this.damageEnemy(e, pr.damage, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, pr.knockback, pr.stun ? { stun: pr.stun } : undefined);
            if (pr.burst) hitArc(this, e.x, e.y, 0, pr.burst.radius, 360, pr.burst.damage, 30, 'burst');
            pr.pierce -= 1;
            if (pr.pierce <= 0) pr.life = 0;
          }
        });
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }

  /** 철쇄: drag a hooked enemy to a spot just in front of the hero. */
  updatePull(e, dt) {
    const p = this.player;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    const tx = p.x + Math.cos(a) * (p.r + e.r + 26), ty = p.y + Math.sin(a) * (p.r + e.r + 26);
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const step = 900 * dt;
    e.facing = Math.atan2(-dy, -dx);
    if (d > step) {
      e.x += (dx / d) * step;
      e.y += (dy / d) * step;
      return;
    }
    e.x = tx;
    e.y = ty;
    e.kx = e.ky = 0;
    e.stun = Math.max(e.stun ?? 0, e.pull.stun);
    if (e.pull.slam) {
      hitArc(this, e.x, e.y, 0, e.pull.slam.radius, 360, e.pull.slam.damage * p.stats.might, 0, 'chop'); // no knockback: keep them at his feet
      this.shake(4);
    }
    this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.4, size: 18, tone: 'mud' });
    e.pull = null;
  }

  /** 말타기: hoofprints that hurt enemies, and trampling at the top tier. */
  updateMount(dt) {
    const p = this.player;
    const m = p.mount;
    if (!m) return;
    if (this.time >= m.until) {
      p.mount = null;
      this.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.5, size: 24, tone: 'mud' });
      return;
    }
    m.drop -= dt;
    if (p.moving && m.drop <= 0) {
      m.drop = 0.06;
      this.zones.push({
        team: 'player', kind: 'hoof', x: p.x - Math.cos(p.facing) * 12, y: p.y - Math.sin(p.facing) * 12,
        r: 26 * p.stats.area, dps: m.L.trailDps * p.stats.might * (1 + (p.meta.trailMul ?? 0)), life: m.L.trailLife, t: 0, angle: p.facing,
      });
    }
    if (m.L.trample) {
      this.grid.query(p.x, p.y, p.r + 40, (e) => {
        if (e.dead || this.isCharmed(e) || e.def.behavior === 'static') return;
        const rr = p.r + e.r + 8;
        if (dist2(e.x, e.y, p.x, p.y) > rr * rr) return;
        if (this.time - (e.trampledAt ?? -9) < 0.5) return;
        e.trampledAt = this.time;
        this.damageEnemy(e, m.L.trample * p.stats.might, p.x, p.y, 220);
      });
    }
  }

  updateZones(dt) {
    const p = this.player;
    for (const z of this.zones) {
      z.t += dt;
      if (z.team === 'enemy' && z.dps && dist2(z.x, z.y, p.x, p.y) < (z.r + p.r * 0.5) ** 2) {
        z.tick = (z.tick ?? 0) - dt;
        if (z.tick <= 0) {
          z.tick = 0.5;
          this.hurtPlayer(z.dps * 0.5, 'boss');
        }
      }
      if (z.team === 'player' && z.dps) {
        z.tick = (z.tick ?? 0) - dt;
        if (z.tick <= 0) {
          z.tick = 0.25;
          this.grid.query(z.x, z.y, z.r + 30, (e) => {
            if (e.dead || dist2(z.x, z.y, e.x, e.y) >= (z.r + e.r) ** 2) return;
            // Overlapping zones of one kind (a hoof trail) count once per tick.
            e.zoneHits ??= {};
            if (this.time - (e.zoneHits[z.kind] ?? -9) < 0.24) return;
            e.zoneHits[z.kind] = this.time;
            this.damageEnemy(e, z.dps * 0.25, z.x, z.y, 0);
          });
        }
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.life);
  }

  updatePickups(dt) {
    const p = this.player;
    const pr2 = p.stats.pickup ** 2;
    for (const k of this.pickups) {
      k.t += dt;
      const dx = p.x - k.x, dy = p.y - k.y;
      const d2 = dx * dx + dy * dy;
      // 감나무 가지 must be walked onto; it is not pulled in.
      if (k.kind === 'crowFeed') {
        if (d2 < (p.r + 22) ** 2) {
          k.taken = true;
          callCrow(this, p.x, p.y);
        } else if (k.t > CROW.feedLife) k.taken = true;
        continue;
      }
      if (!k.magnet && d2 < pr2) k.magnet = true;
      if (k.magnet) {
        const d = Math.sqrt(d2) || 1;
        const s = 260 + k.t * 120;
        k.x += (dx / d) * s * dt;
        k.y += (dy / d) * s * dt;
        if (d < p.r + 6) {
          k.taken = true;
          if (k.kind === 'coin') {
            this.gainXp(k.value);
            this.sfx('coin');
          }
          else if (k.kind === 'rice') {
            p.heal(k.heal);
            this.sfx('heal');
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
      boss: this.bossStatus(),
      bossPhase: !!this.boss,
    };
  }
}
