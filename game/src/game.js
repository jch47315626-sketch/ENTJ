import { HEROES, MOMENTUM } from './data/heroes.js';
import { ENEMIES, VETERAN } from './data/enemies.js';
import { BOSSES } from './data/bosses.js';
import { STAGES, scaleStage } from './data/stages.js';
import { enemyHpScale, enemyDamageScale, ENEMY_BOOST, ENEMY_ARMOR, BOSS_BOOST, HP_REGEN } from './data/balance.js';
import { UPGRADES, FALLBACKS, evolutionStatus } from './data/upgrades.js';
import { MAGUNI_LV } from './data/skills.js';
import { baseReward, REWARD_BY_STARS, BOSS_REWARD, armorCut } from './data/meta.js';
import { SpatialGrid } from './core/grid.js';
import { clamp, rand, TAU, dist2, angleDiff } from './core/math.js';
import { updateWeapon, hitArc } from './systems/weapons.js';
import { SPECIALS } from './systems/specials.js';
import { BEHAVIORS } from './systems/enemyAI.js';
import { updateAllies } from './systems/allies.js';
import { planCrows, updateCrows, callCrow, CROW } from './systems/crows.js';
import { updateFieldObjects, breakObject } from './systems/fieldObjects.js';
import { planFieldItems, updateFieldItems, takeFieldItem, ITEM_LIFE } from './systems/fieldItems.js';
import { applyDaily } from './data/daily.js';
import { ENDLESS, makeEndless, endlessSurge, crystalsOwed, WRATH } from './data/endless.js';
import { applyNanse } from './data/nanse.js';
import { Spawner } from './systems/spawner.js';
import { updateSkills } from './systems/skills.js';
import { updateTerrain, inBog } from './systems/terrain.js';

/** 공훈 needed for the next level: gentle at first, steeper and steeper later on. */
export const XP_TO_NEXT = (lv) => Math.floor((5 + 3 * lv + Math.floor(0.2 * lv * lv)) * (1 + 0.045 * Math.max(0, lv - 10)));

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
      might: b.might * (1 + 0.15 * u('might') + 0.02 * u('bMight') + (m.might ?? 0) + rage) * (this.tiger ? this.tiger.mul : 1),
      haste: b.haste * (1 - 0.1 * u('haste') - (m.haste ?? 0) - (rage ? 0.2 : 0)) * (this.drumUntil ? 0.75 : 1),
      area: b.area * (1 + 0.12 * u('area') + (m.area ?? 0)),
      pickup: b.pickup * (1 + 0.35 * u('magnet') + (m.pickup ?? 0)),
      armor: b.armor + (m.armor ?? 0),
      // 단단한 갑옷: each stack takes 2% off what is left of every blow.
      taken: 0.98 ** u('bArmor'),
      leech: (m.leech ?? 0) + 0.0001 * u('bLeech'),
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
    // 난세 단계: the chosen hardship cards fold into the stage (data/nanse.js).
    const raw = STAGES[opts.stageId];
    const base = opts.daily ? applyDaily(raw, opts.daily) : opts.endless ? makeEndless(raw) : opts.nanse ? applyNanse(raw, opts.nanse) : raw;
    this.endlessBosses = 0;
    this.stage = scaleStage(base, opts.quick ? 0.2 : 1);
    this.player = new Player(hero, opts.meta);
    this.enemies = [];
    this.projectiles = [];
    this.allies = [];
    // Per-battle counts for 업적 (core/achieve.js).
    this.runStats = { crowCalls: 0, crowBest: 0, hurtInBoss: 0 };
    planCrows(this);
    planFieldItems(this);
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
      if (e.dead || e.hidden || e.def.behavior === 'static' || this.isCharmed(e)) return;
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
      if (e.dead || e.hidden || e.def.behavior === 'static' || this.isCharmed(e)) return;
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
    const dmgScale = enemyDamageScale(this.time) * diff.enemyDamage * ENEMY_BOOST.damage * (1 + over / ENDLESS.damageGrowth) * (this.stage.endless ? endlessSurge(this.time) : 1);
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

  /** After each main-weapon swing (gear 연환). */
  afterSwing() {
    // 연환 (gear 비기): now and then the blade comes round again at once.
    const w = this.player.weapon;
    if (this.player.meta.echo && !w.echoed && Math.random() < 0.2) {
      w.timer = Math.min(w.timer, 0.12);
      w.echoed = true;
    } else w.echoed = false;
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
    if (e.dead || e.hidden) return; // 땅굴병 underground
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
    // 결기 · 피 회복: a sliver of the damage dealt comes back as health.
    const leech = this.player.stats.leech;
    if (leech && !opts?.byEnemy) {
      const p = this.player;
      p.leechBank = (p.leechBank ?? 0) + Math.min(amount, Math.max(0, e.hp + amount)) * leech;
      if (p.leechBank >= 1) {
        p.heal(Math.floor(p.leechBank));
        p.leechBank -= Math.floor(p.leechBank);
      }
    }
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
    this.sfx(e.isBoss && !e.def.minion ? 'bossDown' : 'kill');
    this.fx.push({ type: 'ink', x: e.x, y: e.y, t: 0, life: 0.8, size: e.r * (e.isBoss && !e.def.minion ? 4 : 1.6), seed: Math.random() });
    if (e.def.behavior === 'static') {
      this.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.6, size: 26, tone: 'mud' });
      if (e.def.object && this.state === 'play') breakObject(this, e);
    } else {
      this.killsBy[e.def.id] = (this.killsBy[e.def.id] ?? 0) + 1;
      this.kills++;
      this.addMomentum(MOMENTUM.perKill);
      this.killProcs(e);
    }
    if (e.xp > 0) this.dropCoin(e.x, e.y, e.xp);
    // 무한 전장: 결기수정 drop from the fallen as the run earns them.
    if (this.stage.endless && (this.crystalsDropped ?? 0) < Math.floor(crystalsOwed(this.time, this.stage.difficulty.stars))) {
      this.crystalsDropped = (this.crystalsDropped ?? 0) + 1;
      this.pickups.push({ kind: 'crystal', x: e.x, y: e.y, magnet: false, t: 0 });
    }
    if (e.def.drop === 'rice') this.pickups.push({ kind: 'rice', x: e.x, y: e.y, heal: 25 * (this.stage.difficulty.riceMul ?? 1), magnet: false, t: 0 });
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
    if (kind === 'hp') return 1 + this.endlessBosses * ENDLESS.bossHpStep;
    return (1 + this.endlessBosses * ENDLESS.bossDamageStep) * endlessSurge(this.time);
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

  /** Gear 비기 techniques that fire when a foe falls: 낙뢰, 사기충천. */
  killProcs(e) {
    const p = this.player;
    const m = p.meta;
    if (m.thunder && !e.isBoss && Math.random() < 0.15) {
      hitArc(this, e.x, e.y, 0, 80, 360, 30 * p.stats.might, 60, 'burst');
      this.fx.push({ type: 'spark', x: e.x, y: e.y, t: 0, life: 0.3 });
      this.sfx('thunder');
    }
    if (m.rally && this.kills % 10 === 0) {
      const before = p.hp;
      p.heal(p.stats.maxHp * 0.02);
      if (p.hp > before) this.texts.push({ x: p.x, y: p.y - 30, v: `+${Math.round(p.hp - before)}`, t: 0, life: 0.6, heal: true });
    }
  }

  dropCoin(x, y, value) {
    const tier = value >= 5 ? 'gold' : value >= 3 ? 'silver' : 'bronze';
    this.pickups.push({ kind: 'coin', tier, value, x: x + rand(-4, 4), y: y + rand(-4, 4), magnet: false, t: 0 });
  }

  /** `attacker`: the enemy that dealt the blow, when there is one (for 반격). */
  hurtPlayer(amount, source = 'unknown', attacker = null, opts = null) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'play') return false;
    if (p.mount && this.time < p.mount.invulnUntil) return false;
    // Armour cuts 7% per point (max 50%), so it helps against big hits and small ones alike.
    let dmg = Math.max(1, amount * (1 - armorCut(p.stats.armor)));
    dmg = Math.max(1, dmg * p.stats.taken);
    // 신의 분노 goes straight through armour and guards.
    if (opts?.pierce) dmg = amount;
    this.damageLog[source] = (this.damageLog[source] ?? 0) + dmg;
    if (this.boss) this.runStats.hurtInBoss += dmg;
    p.hp -= dmg;
    p.invuln = INVULN_TIME + (p.meta.invulBonus ?? 0);
    p.hurtFlash = 0.25;
    if (p.meta.berserk) p.recalc();
    this.shake(4);
    this.sfx('hurt');
    this.texts.push({ x: p.x, y: p.y - 20, v: Math.round(dmg), t: 0, life: 0.7, hurt: true });
    // 수호 깃발 (gear 비기): a moment of safety when health runs low.
    if (p.meta.lastStand && p.hp > 0 && p.hp < p.stats.maxHp * 0.3 && this.time >= (p.lastStandReady ?? 0)) {
      p.lastStandReady = this.time + 60;
      p.invuln = Math.max(p.invuln, 3);
      this.banner('🚩 수호 깃발 — 3초 동안 무적!', 'small');
      this.sfx('gong');
    }
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
    // 한계 돌파 (gear 비기): some 책략 may go one level higher.
    const cap = (u) => u.maxLevel + (p.meta.caps?.[u.id] ?? 0);
    const pool = UPGRADES.filter((u) => (!u.heroes || u.heroes.includes(p.hero.id)) && (u.available ? u.available(this) : lvl(u) < cap(u)));
    const choices = [];
    const evo = pool.find((u) => u.isEvolution?.(this));
    if (evo) choices.push(evo);
    const rest = pool.filter((u) => u !== evo);
    // 궁핍 (난세 패): fewer cards to choose from.
    const count = this.stage.difficulty.choiceCount ?? 3;
    while (choices.length < count && rest.length) {
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
    for (const f of FALLBACKS) if (choices.length < count) choices.push(f);
    // Cards that move an evolution forward get marked (진화 재료).
    const evoNeed = {};
    for (const e of evolutionStatus(this)) for (const c of e.checks) if (!c.done) (evoNeed[c.id] ??= []).push({ name: e.name, now: c.now, need: c.need });
    return choices.map((u) => ({
      up: u,
      id: u.id,
      category: u.category,
      name: typeof u.name === 'function' ? u.name(this) : u.name,
      desc: u.describe(this),
      level: u.id === 'weapon' ? p.weapon.level + 2 : u.maxLevel === Infinity ? (u.stack ? lvl(u) + 1 : null) : lvl(u) + 1,
      maxLevel: u.id === 'weapon' ? null : u.maxLevel,
      evolution: !!u.isEvolution?.(this),
      evoFor: u.isEvolution?.(this) ? null : evoNeed[u.id] ?? null,
      sub: !!u.subWeapon,
    }));
  }

  choose(index) {
    if (this.state !== 'levelup' || !this.choices?.[index]) return;
    const c = this.choices[index];
    if (c.id !== 'weapon' && (c.up.maxLevel !== Infinity || c.up.stack)) {
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
    if (this.stage.endless) return 0; // 무한 전장 pays in 결기수정 only
    const base = baseReward({ kills: this.kills, seconds: this.time, won: false, bossKilled: false });
    return Math.round(base * REWARD_BY_STARS[this.stage.difficulty.stars] * (1 + (this.opts.meta?.reward ?? 0)) * (this.stage.difficulty.rewardMul ?? 1));
  }

  /** 냥 for this run: base by performance, scaled by stage stars and 재물운. */
  computeReward(won) {
    // 무한 전장: no 냥 at all — the reward is the 결기수정 picked up.
    if (this.stage.endless) return { base: 0, mul: 0, total: 0, stars: this.stage.difficulty.stars, bossBonus: 0, crystals: this.runStats.crystals ?? 0 };
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
      const up = UPGRADES.find((u) => u.id === id);
      if (!up) continue; // a 책략 that no longer exists
      p.upgrades[id] = Math.max(p.upgrades[id] ?? 0, 1);
      up.apply(this);
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
      if (p.mount) spd *= p.mount.L.speed;
      for (const z of this.zones) {
        if (z.team === 'enemy' && z.slow && dist2(z.x, z.y, p.x, p.y) < z.r * z.r) spd *= 1 - z.slow;
      }
      // 늪: the hero's feet sink (not on horseback).
      p.inBog = !p.mount && inBog(this, p.x, p.y);
      if (p.inBog) spd *= 1 - (this.stage.terrain.bogSlow ?? 0.4);
      p.vx = move.x * spd;
      p.vy = move.y * spd;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
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
    updateFieldItems(this, dt);
    if (this.stage.endless) this.updateWrath(dt);
    this.taunts = this.allies.filter((a) => a.lure && !a.dead);
    this.updateEnemies(dt);
    updateTerrain(this);
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
      // 무당's blessing: faster for a while.
      if (e.hasteUntil > this.time) mul *= 1.35;
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
      const dmg = e.hidden ? 0 : e.contactDamage ?? e.damage;
      if (dmg > 0 && !charmed) {
        const rr = e.r + p.r - 2;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr && this.hurtPlayer(dmg, e.isBoss ? 'boss' : e.def.id, e) && p.meta.thorns) {
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
          // 마구니 결계: shots that reach 궁예 inside the ring hurt far less.
          const ward = MAGUNI_LV[(p.upgrades.maguni ?? 0) - 1]?.ward;
          this.hurtPlayer(pr.damage * (ward ? 1 - ward.reduce : 1), pr.source ?? pr.kind, pr.owner);
          pr.life = 0;
        }
      } else {
        this.grid.query(pr.x, pr.y, pr.r + (pr.span ?? 0) + 30, (e) => {
          if (pr.life <= 0 || e.dead || e.hidden || pr.hit.has(e) || this.isCharmed(e)) return;
          if (pr.span ? hitsBlade(pr, e) : dist2(pr.x, pr.y, e.x, e.y) < (pr.r + e.r) ** 2) {
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

  /** 무한 전장 · 신의 분노: standing still too long calls lightning down on the hero. */
  updateWrath(dt) {
    const p = this.player;
    const W = WRATH;
    if (this.stillAt === undefined || (p.x - this.stillAt.x) ** 2 + (p.y - this.stillAt.y) ** 2 > W.radius * W.radius) {
      this.stillAt = { x: p.x, y: p.y };
      this.stillT = 0;
      return;
    }
    this.stillT += dt;
    if (this.stillT < W.idle || this.time < (this.wrathNext ?? 0)) return;
    this.wrathNext = this.time + W.warn + W.again;
    const x = p.x, y = p.y;
    this.fx.push({ type: 'ringWarn', x, y, range: W.radius, t: 0, life: W.warn, tone: 'violet' });
    this.banner('⚡ 신의 분노 — 움직여라!', 'small');
    this.sfx('thunder');
    this.later(W.warn, () => {
      if (this.state !== 'play') return;
      const pts = [{ x: x + 30, y: y - 520 }];
      for (let i = 1; i < 6; i++) pts.push({ x: x + rand(-26, 26), y: y - 520 + i * 90 });
      pts.push({ x, y });
      this.fx.push({ type: 'bolt', points: pts, t: 0, life: 0.45, seed: Math.random() });
      this.fx.push({ type: 'smash', x, y, range: W.radius * 1.2, t: 0, life: 0.6 });
      this.shake(16);
      this.sfx('thunder');
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < (W.radius + p.r * 0.5) ** 2) this.hurtPlayer(p.stats.maxHp * W.share, 'wrath', null, { pierce: true });
    });
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
        r: 26 * p.stats.area, dps: m.L.trailDps * p.stats.might, life: m.L.trailLife, t: 0, angle: p.facing,
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
          this.hurtPlayer(z.dps * 0.5, z.source ?? 'boss');
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
      // 전장 아이템 (함정·노루고기·등유) are walked onto too.
      if (k.kind === 'item') {
        if (d2 < (p.r + 22) ** 2) {
          k.taken = true;
          takeFieldItem(this, k);
        } else if (k.t > ITEM_LIFE) k.taken = true;
        continue;
      }
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
        // Pulled in faster the longer it flies, but capped, and never past the hero
        // (an overshooting coin used to jitter around them like an afterimage).
        const step = Math.min(260 + k.t * 120, 1100) * dt;
        if (step >= d - p.r) {
          k.x = p.x;
          k.y = p.y;
        } else {
          k.x += (dx / d) * step;
          k.y += (dy / d) * step;
        }
        if (step >= d - p.r || d < p.r + 6) {
          k.taken = true;
          if (k.kind === 'coin') {
            this.gainXp(k.value);
            this.sfx('coin');
          }
          else if (k.kind === 'crystal') {
            this.runStats.crystals = (this.runStats.crystals ?? 0) + 1;
            this.texts.push({ x: p.x, y: p.y - 30, v: '💎 +1', t: 0, life: 0.8, order: true });
            this.sfx('buy');
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

/** A blade-shaped projectile: thin along its flight (`r`), wide across it (`span` each side). */
function hitsBlade(pr, e) {
  const c = Math.cos(pr.angle), sn = Math.sin(pr.angle);
  const dx = e.x - pr.x, dy = e.y - pr.y;
  return Math.abs(dx * c + dy * sn) < pr.r + e.r && Math.abs(-dx * sn + dy * c) < pr.span + e.r;
}
