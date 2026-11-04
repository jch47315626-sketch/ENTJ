import { SHIN, HORSE, CHAIN, RANGED_BEHAVIORS, TIGER, ARCHERS_LV, EDICT, BOULDER, CURSE } from '../data/skills.js';
import { hitArc, currentWeaponLevel } from './weapons.js';
import { enemyHpScale } from '../data/balance.js';
import { rand } from '../core/math.js';
import { withOver } from './over.js';
import { SCHOOLS, nodeCount } from '../data/schools.js';
import { pixelFx } from '../render/pixelFx.js';

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
      g.fx.push(pixelFx('shinArrive', p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60));
      g.banner('신숭겸 — 왕의 깃발 아래로 모여라!', 'small');
      g.sfx('shin');
    },
  },

  horse: {
    levels: HORSE,
    fire(g, L) {
      const p = g.player;
      p.mount = { until: g.time + L.duration, invulnUntil: g.time + L.invuln, L, drop: 0 };
      g.fx.push(pixelFx('mountDust', p.x, p.y));
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
    const pool = g.enemies.filter((e) => !e.dead && !e.isBoss && !e.pull && !g.isCharmed(e)
      && (L.targets === 'ranged' ? RANGED_BEHAVIORS.includes(e.def.behavior) : L.targets.includes(e.def.id))
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
    g.fx.push(pixelFx('rage', p.x, p.y));
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
    g.ultFlash('255, 70, 30', 0.35, 0.4);
    g.fx.push({ type: 'rageBurst', x: p.x, y: p.y, t: 0, life: 0.8, seed: Math.random() });
    g.fx.push(pixelFx('rage', p.x, p.y)); // the roar at the king; the swings ('eight') show the full reach
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
      const r = R.radius * Math.sqrt(p.stats.area);
      // The arrows fall first; the ground catches fire as they land.
      g.fx.push(pixelFx('arrowVolley', s.x, s.y, r));
      g.later(0.3, () => {
        g.zones.push({ team: 'player', kind: 'fire', x: s.x, y: s.y, r, dps, life: R.life, t: 0 });
        g.fx.push(pixelFx('fireRing', s.x, s.y, r));
      });
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
    // A bolt of light drops on each foe (pixel art for the nearest dozen, plain shafts for
    // the next few; every one is struck).
    foes.forEach((e, i) => {
      g.damageEnemy(e, dmg, e.x, e.y - 40, 40, L.stun ? { stun: e.isBoss ? L.bossStun : L.stun } : undefined);
      if (i < 12) g.fx.push(pixelFx(L.evolution ? 'edictBig' : 'edict', e.x, e.y));
      else if (i < 28) g.fx.push({ type: 'pillar', x: e.x, y: e.y, t: 0, life: 0.55, big: !!L.evolution, seed: Math.random() });
    });
    if (L.evolution) {
      g.banner('📜 훈요십조 — 어명이 전장을 내리친다!', 'small');
      g.fx.push({ type: 'edictScroll', x: p.x, y: p.y, t: 0, life: 1.4, seed: Math.random() });
      g.ultFlash('255, 230, 150', 0.35, 0.35);
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

// ------------------------------------------------- 장비 계열 책략 (data/schools.js)

// ⚔️ 무 — 검풍: blade waves fly at the nearest foes; 만검귀종 sends them all round.
ACTIVE_SKILLS.swordGale = {
  levels: SCHOOLS.mu.levels,
  fire(g, L) {
    const p = g.player;
    const N = p.meta.nodes ?? {};
    // ⚔️ 검심: two more blades.
    if (N['mu.charm']) L = { ...L, waves: L.waves + nodeCount(2, N['mu.charm']) };
    const dirs = [];
    if (L.ring) for (let i = 0; i < L.waves; i++) dirs.push(p.facing + (i / L.waves) * Math.PI * 2);
    else {
      for (const e of g.nearestEnemies(p.x, p.y, 520, L.waves)) dirs.push(Math.atan2(e.y - p.y, e.x - p.x));
      if (!dirs.length) return 0.6;
      while (dirs.length < L.waves) dirs.push(dirs[0] + (dirs.length % 2 ? 0.25 : -0.25) * dirs.length);
    }
    const size = (L.ring ? 26 : 18) * Math.sqrt(p.stats.area);
    for (const a of dirs) {
      g.projectiles.push({
        team: 'player', kind: 'wave', x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
        r: size, damage: weaponDmg(p) * L.mul * p.stats.might, knockback: 50, life: 0.8, pierce: Infinity, hit: new Set(), angle: a,
      });
    }
    g.sfx('royal');
  },
};

// 🚩 진 — 깃발 병사: a squad runs in; 팔진도 soldiers cry out as they fall.
ACTIVE_SKILLS.banner = {
  levels: SCHOOLS.jin.levels,
  fire(g, L) {
    const p = g.player;
    // 🚩 군령: two more soldiers.
    const J = p.meta.nodes?.['jin.head'];
    if (J) L = { ...L, count: L.count + nodeCount(2, J) };
    for (let i = 0; i < L.count; i++) {
      const a = (i / L.count) * Math.PI * 2 + rand(-0.2, 0.2);
      const x = p.x + Math.cos(a) * 70, y = p.y + Math.sin(a) * 70;
      g.allies.push({ kind: 'soldier', x, y, r: 11, life: L.life, maxLife: L.life, cd: rand(0, 0.4), facing: a, banner: L.burst ?? 0 });
      g.fx.push({ type: 'puff', x, y, t: 0, life: 0.5, size: 18, tone: 'light' });
    }
    if (L.evolution) g.banner('🚩 팔진도 — 진을 펼쳐라!', 'small');
    g.sfx('horn');
  },
};

// 📜 술 — 부적 폭탄: talismans stick to foes, then burst.
ACTIVE_SKILLS.talisman = {
  levels: SCHOOLS.sul.levels,
  fire(g, L) {
    const p = g.player;
    // 📜 부적술: two more talismans, wider bursts.
    const C = p.meta.nodes?.['sul.charm'];
    if (C) L = { ...L, count: L.count + nodeCount(2, C), radius: L.radius * (1 + 0.2 * C) };
    const foes = g.nearestEnemies(p.x, p.y, 480, 30).filter((e) => !g.isCharmed(e) && e.def.behavior !== 'static');
    if (!foes.length) return 0.6;
    const r = L.radius * Math.sqrt(p.stats.area);
    const dmg = weaponDmg(p) * L.mul * p.stats.might;
    for (let i = 0; i < L.count; i++) {
      const e = foes[Math.floor(Math.random() * foes.length)];
      const at = { x: e.x, y: e.y };
      g.fx.push({ type: 'curseMark', x: e.x, y: e.y, t: 0, life: 0.6, follow: e, seed: Math.random() });
      g.later(0.6 + i * 0.08, () => {
        const x = e.dead ? at.x : e.x, y = e.dead ? at.y : e.y;
        hitArc(g, x, y, 0, r, 360, dmg, 140, 'blast', L.stun ? { stun: L.stun } : undefined);
        g.shake(3);
      });
    }
    g.later(0.6, () => g.sfx('blast'));
  },
};

// 🏹 궁 — 연노: bolts at the nearest foes; 신기전 sets the thickest knots ablaze now and then.
ACTIVE_SKILLS.crossbow = {
  levels: SCHOOLS.gung.levels,
  fire(g, L) {
    const p = g.player;
    // 🏹 화전: two more bolts that pierce one more.
    const F = p.meta.nodes?.['gung.charm'];
    if (F) L = { ...L, bolts: L.bolts + nodeCount(2, F), pierce: L.pierce + (F >= 0.5 ? 1 : 0) };
    const foes = g.nearestEnemies(p.x, p.y, 460, L.bolts).filter((e) => !g.isCharmed(e));
    if (!foes.length) return 0.4;
    for (let i = 0; i < L.bolts; i++) {
      const e = foes[i % foes.length];
      const a = Math.atan2(e.y - p.y, e.x - p.x) + (i >= foes.length ? rand(-0.15, 0.15) : 0);
      g.projectiles.push({
        team: 'player', kind: 'arrow', x: p.x, y: p.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
        r: 6, damage: weaponDmg(p) * L.mul * p.stats.might, knockback: 20, life: 0.75, pierce: L.pierce, hit: new Set(), angle: a,
      });
    }
    const R = L.rocket;
    if (R) {
      p.rocketN = (p.rocketN ?? 0) + 1;
      if (p.rocketN % R.every === 0) {
        const dps = weaponDmg(p) * R.dps * p.stats.might;
        for (const s of crowdSpots(g, 520, R.spots, R.radius * 1.4)) {
          g.fx.push({ type: 'arrowRain', x: s.x, y: s.y, range: R.radius, t: 0, life: 0.9, seed: Math.random() });
          g.later(0.3, () => g.zones.push({ team: 'player', kind: 'fire', x: s.x, y: s.y, r: R.radius, dps, life: R.life, t: 0 }));
        }
      }
    }
    g.sfx('volley');
  },
};

// 🍃 도 — 선단: heal and a shield; 금강불괴 also a moment untouchable and a pulse.
ACTIVE_SKILLS.elixir = {
  levels: SCHOOLS.do.levels,
  fire(g, L) {
    const p = g.player;
    // 🍃 선단술: sooner, with a half again stronger shield.
    const art = p.meta.nodes?.['do.charm'];
    if (art) L = { ...L, shield: L.shield * (1 + 0.5 * art) };
    const before = p.hp;
    p.heal(p.stats.maxHp * L.heal);
    if (p.hp > before) g.texts.push({ x: p.x, y: p.y - 30, v: `+${Math.round(p.hp - before)}`, t: 0, life: 0.7, heal: true });
    p.shield = Math.max(p.shield ?? 0, p.stats.maxHp * L.shield);
    p.shieldMax = Math.max(p.shield, p.shieldMax ?? 0);
    p.shieldBy = null;
    if (L.invuln) p.invuln = Math.max(p.invuln, L.invuln);
    if (L.pulse) hitArc(g, p.x, p.y, 0, 150 * Math.sqrt(p.stats.area), 360, weaponDmg(p) * L.pulse * p.stats.might, 200, 'royal');
    g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.6, size: 34, tone: 'light' });
    g.sfx('heal');
    if (art) return L.cooldown * (1 - 0.3 * art);
  },
};

/** Marks one foe with 천안 (and, for 애꾸눈의 저주, the slow and the spread). */
export function curseFoe(g, e, L) {
  const p = g.player;
  // The curse burns too: `dot` × weapon damage every second, at the hero's might when cast.
  const dps = (L.dot ?? 0) * Math.max(currentWeaponLevel(p).damage, 30) * p.stats.might;
  e.curse = { until: g.time + L.duration, amp: L.amp, slow: L.slow ?? 0, spread: L.spread ?? 0, dps, tick: 0.5, L };
  g.fx.push(pixelFx(L.evolution ? 'curseEyeBig' : 'curseEye', e.x, e.y, null, { follow: e, dy: -e.r * 2.5 - 14, life: L.duration, fadeOut: 0.4 }));
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
      const wait = withOver(p, id, () => skill.fire(g, L));
      if (typeof wait === 'number') p.skillTimers[id] = wait;
    }
  }
}
