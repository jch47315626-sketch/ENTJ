import { pickWeighted, rand, lerp, TAU } from '../core/math.js';

/** Drives the stage timeline: spawn rates, events, supply carts and the boss. */
export class Spawner {
  constructor(stage) {
    this.stage = stage;
    this.acc = 0;
    this.firedEvents = new Set();
    this.supplyTimer = stage.supplyEvery * 0.5;
    this.bossStarted = false;
  }

  phaseAt(t) {
    const phases = this.stage.phases;
    let start = 0;
    for (const p of phases) {
      if (t < p.until) return { phase: p, progress: (t - start) / (p.until - start) };
      start = p.until;
    }
    const last = phases[phases.length - 1];
    return { phase: last, progress: 1 };
  }

  update(g, dt) {
    if (this.bossStarted) return;
    const t = g.time;
    if (t >= this.stage.bossAt) {
      this.bossStarted = true;
      g.startBoss(this.stage.bossAlt[g.player.hero.id] ?? this.stage.boss);
      return;
    }

    const { phase, progress } = this.phaseAt(t);
    const diff = this.stage.difficulty;
    this.acc += lerp(phase.rate[0], phase.rate[1], progress) * diff.spawnRate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      const id = pickWeighted(phase.mix);
      const a = rand(0, TAU);
      const d = g.spawnDistance();
      g.spawnEnemy(id, g.player.x + Math.cos(a) * d, g.player.y + Math.sin(a) * d, {
        elite: Math.random() < phase.eliteChance + (t >= 60 ? diff.eliteBonus : 0),
      });
    }

    for (const ev of this.stage.events) {
      if (t >= ev.at && !this.firedEvents.has(ev)) {
        this.firedEvents.add(ev);
        this.fireEvent(g, ev);
      }
    }

    this.supplyTimer -= dt;
    if (this.supplyTimer <= 0) {
      this.supplyTimer = this.stage.supplyEvery;
      const a = rand(0, TAU);
      const d = g.spawnDistance() * 0.8;
      g.spawnEnemy('cart', g.player.x + Math.cos(a) * d, g.player.y + Math.sin(a) * d);
    }
  }

  fireEvent(g, ev) {
    const p = g.player;
    ev = ev.altForHero?.[p.hero.id] ?? ev;
    if (ev.type === 'pack') {
      const a = rand(0, TAU);
      const d = g.spawnDistance();
      for (let i = 0; i < ev.count; i++) {
        const aa = a + rand(-0.35, 0.35);
        const dd = d + rand(0, 90);
        g.spawnEnemy(ev.enemy, p.x + Math.cos(aa) * dd, p.y + Math.sin(aa) * dd);
      }
    } else if (ev.type === 'ring') {
      const d = g.spawnDistance() * 0.85;
      for (let i = 0; i < ev.count; i++) {
        const a = (i / ev.count) * TAU;
        g.spawnEnemy(ev.enemy, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      }
    } else if (ev.type === 'allies') {
      g.spawnAllies(ev.ally, ev.count, ev.life);
    } else if (ev.type === 'decoy') {
      g.spawnDecoy(ev.life);
    } else if (ev.type === 'night') {
      // 관심법의 밤: sight shrinks; an assassin squad slips in under it.
      g.darkTotal = ev.life;
      g.darkUntil = g.time + ev.life;
      if (ev.enemy) {
        for (let i = 0; i < ev.count; i++) {
          const a = (i / ev.count) * TAU;
          g.spawnEnemy(ev.enemy, p.x + Math.cos(a) * 330, p.y + Math.sin(a) * 330, { elite: true });
        }
      }
    }
    if (ev.banner) g.banner(ev.banner);
    g.sfx('horn');
  }
}
