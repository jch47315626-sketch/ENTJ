import { SHIN, HORSE, CHAIN, TIGER, ARCHERS_LV, EDICT, BOULDER, CURSE } from '../data/skills.js';
import { hitArc, currentWeaponLevel } from './weapons.js';
import { enemyHpScale } from '../data/balance.js';
import { rand } from '../core/math.js';

/**
 * Cooldown skills gained from level-ups (separate from the momentum
 * special). Keyed by the upgrade id that grants them.
 */
export const ACTIVE_SKILLS = {
  shin: {
    levels: SHIN,
    fire(g, L) {
      const p = g.player;
      // He steps out a little ahead of the king.
      const a = p.facing + rand(-0.4, 0.4);
      const hp = L.hp * (0.6 + 0.4 * enemyHpScale(g.time)) * (1 + (p.meta.shinHpMul ?? 0));
      g.allies.push({
        kind: 'shin', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, r: 15,
        hp, maxHp: hp, life: L.duration, maxLife: L.duration, lure: L.lure,
        damage: L.damage * (1 + (p.meta.allyMul ?? 0)), explode: L.explode, cd: 0.5, facing: a,
      });
      g.fx.push({ type: 'puff', x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, t: 0, life: 0.6, size: 26, tone: 'light' });
      g.banner('신숭겸 — 왕의 깃발 아래로 모여라!', 'small');
      g.sfx('shin');
    },
  },

  horse: {
    levels: HORSE,
    fire(g, L) {
      const p = g.player;
      p.mount = { until: g.time + L.duration, invulnUntil: g.time + L.invuln, L, drop: 0 };
      g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.6, size: 30, tone: 'mud' });
      g.banner(`${L.name} — 말에 오른다`, 'small');
      g.sfx('gallop');
    },
  },
};

// 견훤 — 철쇄: ranged soldiers are hooked and dragged to his feet.
ACTIVE_SKILLS.chain = {
  levels: CHAIN,
  fire(g, L) {
    const p = g.player;
    const pool = g.enemies.filter((e) => !e.dead && !e.isBoss && !e.pull && !g.isCharmed(e) && L.targets.includes(e.def.id)
      && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < L.range * L.range);
    // Nothing to hook: look again shortly instead of wasting the cooldown.
    if (!pool.length) return 1;
    pool.sort((a, b) => ((b.x - p.x) ** 2 + (b.y - p.y) ** 2) - ((a.x - p.x) ** 2 + (a.y - p.y) ** 2));
    for (const e of pool.slice(0, L.count + (p.meta.chainBonus ?? 0))) e.pull = { stun: L.stun, slam: L.slam };
    g.sfx('chain');
  },
};

// 견훤 — 호랑이 젖먹기: a burst of fury (all damage ×mul); the last tier adds 무자식이 상팔자.
ACTIVE_SKILLS.tiger = {
  levels: TIGER,
  fire(g, L) {
    const p = g.player;
    p.tiger = { mul: L.mul, until: g.time + L.duration };
    p.recalc();
    g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.6, size: 34, tone: 'light' });
    g.sfx('paewang');
    if (!L.eight) {
      g.banner(`🐯 ${L.name} — ${L.duration}초 동안 피해 ${L.mul}배`, 'small');
      return;
    }
    // 무자식이 상팔자: wild swings tracing a huge 八 / ∞ across the field.
    const E = L.eight;
    const radius = E.radius * Math.sqrt(p.stats.area);
    const dmg = Math.max(currentWeaponLevel(p).damage, 30) * E.damage;
    g.banner('🐯 무자식이 상팔자!', 'big');
    g.fx.push({ type: 'eight', x: p.x, y: p.y, range: radius, angle: p.facing, t: 0, life: 1.2 });
    for (let i = 0; i < E.swings; i++) {
      g.later(i * E.gap, () => {
        hitArc(g, p.x, p.y, 0, radius, 360, dmg * p.stats.might, 140, 'eightHit', { stun: E.stun });
        g.shake(7);
        g.sfx('chop');
      });
    }
  },
};

const weaponDmg = (p) => Math.max(currentWeaponLevel(p).damage, 30);

/** How far "the field around the hero" reaches for 어명 and 천안 — the same on every screen size. */
export const FIELD_REACH = 460;

/** Foes within reach of the hero (not underground, not swayed, not carts). */
function onScreen(g) {
  const p = g.player;
  return g.enemies.filter((e) => !e.dead && !e.hidden && !g.isCharmed(e) && e.def.behavior !== 'static'
    && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < FIELD_REACH * FIELD_REACH);
}

/** Up to `n` spots where foes stand thickest, at least `gap` apart. */
function crowdSpots(g, range, n, gap) {
  const p = g.player;
  const near = g.nearestEnemies(p.x, p.y, range, 60).filter((e) => !g.isCharmed(e) && e.def.behavior !== 'static');
  const scored = near.map((e) => ({ e, n: near.filter((o) => (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 110 * 110).length }))
    .sort((a, b) => b.n - a.n);
  const spots = [];
  for (const { e } of scored) {
    if (spots.length >= n) break;
    if (spots.some((s) => (s.x - e.x) ** 2 + (s.y - e.y) ** 2 < gap * gap)) continue;
    spots.push({ x: e.x, y: e.y });
  }
  return spots;
}

// 왕건 — 궁수대: only the 궁극기 (고려 신궁대) casts anything — a rain of fire arrows.
ACTIVE_SKILLS.archers = {
  levels: ARCHERS_LV,
  fire(g, L) {
    if (!L.rain) return;
    const p = g.player;
    const R = L.rain;
    const spots = crowdSpots(g, R.range, R.spots, R.radius * 1.4);
    if (!spots.length) return 1;
    const dps = weaponDmg(p) * R.mul * p.stats.might;
    for (const s of spots) {
      g.zones.push({ team: 'player', kind: 'fire', x: s.x, y: s.y, r: R.radius * Math.sqrt(p.stats.area), dps, life: R.life, t: 0 });
      g.fx.push({ type: 'pulse', x: s.x, y: s.y, range: R.radius, t: 0, life: 0.5 });
    }
    g.sfx('volley');
  },
};

// 왕건 — 어명: the king's word strikes foes across the screen; 훈요십조 strikes them all.
ACTIVE_SKILLS.edict = {
  levels: EDICT,
  fire(g, L) {
    const p = g.player;
    let foes = onScreen(g);
    if (!foes.length) return 1;
    if (Number.isFinite(L.count)) {
      foes.sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2));
      foes = foes.slice(0, L.count);
    }
    const dmg = weaponDmg(p) * L.mul * p.stats.might;
    for (const e of foes) {
      g.damageEnemy(e, dmg, e.x, e.y - 40, 40, L.stun ? { stun: e.isBoss ? L.bossStun : L.stun } : undefined);
      g.fx.push({ type: 'spark', x: e.x, y: e.y - 6, t: 0, life: 0.35 });
    }
    if (L.evolution) {
      g.banner('📜 훈요십조 — 어명이 전장을 내리친다!', 'small');
      g.fx.push({ type: 'pulse', x: p.x, y: p.y, range: FIELD_REACH, t: 0, life: 0.6 });
      g.shake(8);
    }
    g.sfx('gong');
  },
};

// 견훤 — 바위 던지기: boulders roll straight on, crushing whatever is in the way.
ACTIVE_SKILLS.boulder = {
  levels: BOULDER,
  fire(g, L) {
    const p = g.player;
    const t = g.nearestEnemy(p.x, p.y, L.range);
    if (!t) return 1;
    const aim = Math.atan2(t.y - p.y, t.x - p.x);
    const size = L.size * Math.sqrt(p.stats.area);
    for (let i = 0; i < L.count; i++) {
      const a = aim + (L.count > 1 ? -L.spread / 2 + (L.spread * i) / (L.count - 1) : 0);
      g.projectiles.push({
        team: 'player', kind: 'boulder', x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * L.speed, vy: Math.sin(a) * L.speed, r: size, spin: 0,
        damage: weaponDmg(p) * L.mul * p.stats.might, knockback: 140, life: L.range / L.speed,
        pierce: Infinity, hit: new Set(), angle: a,
        shatter: L.shatter && { radius: L.shatter.radius * Math.sqrt(p.stats.area), damage: weaponDmg(p) * L.shatter.mul * p.stats.might, stun: L.shatter.stun },
      });
    }
    g.sfx('throw');
  },
};

// 궁예 — 천안: the strongest foes on screen are marked and take more damage.
ACTIVE_SKILLS.curse = {
  levels: CURSE,
  fire(g, L) {
    const foes = onScreen(g).filter((e) => !(e.curse?.until > g.time));
    if (!foes.length) return 1;
    foes.sort((a, b) => b.maxHp - a.maxHp);
    for (const e of foes.slice(0, L.count)) curseFoe(g, e, L);
    g.sfx('beam');
  },
};

/** Marks one foe with 천안 (and, for 애꾸눈의 저주, the slow and the spread). */
export function curseFoe(g, e, L) {
  const p = g.player;
  // The curse burns too: `dot` × weapon damage every second, at the hero's might when cast.
  const dps = (L.dot ?? 0) * Math.max(currentWeaponLevel(p).damage, 30) * p.stats.might;
  e.curse = { until: g.time + L.duration, amp: L.amp, slow: L.slow ?? 0, spread: L.spread ?? 0, dps, tick: 0.5, L };
  g.fx.push({ type: 'eye', x: e.x, y: e.y, t: 0, life: L.duration, follow: e, size: 10, big: !!L.evolution });
}

/** Counts down each owned skill and casts it when ready. */
export function updateSkills(g, dt) {
  const p = g.player;
  // 호랑이 젖먹기 wears off.
  if (p.tiger && g.time >= p.tiger.until) {
    p.tiger = null;
    p.recalc();
  }
  for (const id in ACTIVE_SKILLS) {
    const lv = p.upgrades[id];
    if (!lv) continue;
    const skill = ACTIVE_SKILLS[id];
    const L = skill.levels[lv - 1];
    const cooldown = L.cooldown;
    p.skillTimers[id] = (p.skillTimers[id] ?? cooldown) - dt;
    if (p.skillTimers[id] <= 0) {
      p.skillTimers[id] = cooldown;
      // A skill may return a shorter wait (e.g. no valid target yet).
      const wait = skill.fire(g, L);
      if (typeof wait === 'number') p.skillTimers[id] = wait;
    }
  }
}
