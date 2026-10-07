import { hitArc, currentWeaponLevel } from './weapons.js';

/**
 * 견훤's two builds. Neither ever moves him on its own: the player steers.
 *
 * 패공 (A): a longer reach (기습), and after a swing an extra cut turned on
 *   another foe where he stands (연참). 패왕의 대도 adds a 검기.
 * 반격 (B): wade in. 철벽 adds armour for every foe close by; whoever hits
 *   him takes the blow back (되받아치기), and 패왕의 반격 spreads it around.
 *
 * Hooks: afterSwing(g) from the weapon system, onHurt(g) from hurtPlayer,
 * updateBuild(g, dt) every frame (timers, 철벽 count, 궁예's focus and aura).
 */
const PAEGONG = {
  rush: { cooldown: 2.0, delay: 0.16, gap: 0.14, range: 230, mul: 0.95, arc: 200 },
  wave: { speed: 620, life: 0.45, mul: 0.7, radius: 20 },
};
const BANGYEOK = {
  wall: { radius: 100, perFoe: 0.6, max: 4 },
  // 반격: the attacker takes `mul` × the weapon's damage; nothing moves 견훤.
  counter: { cooldown: 0.6, mul: 1.6, knockback: 160, stun: 0.35, fallbackRange: 180 },
  // 패왕의 반격: a shock around the struck attacker.
  chase: { radius: 90, mul: 0.6 },
};

// 궁예 법력 (A): stand still to gather power; 혼란 (B): sway soldiers nearby.
const BEOPRYEOK = {
  focus: { fill: 1.5, drain: 2.5, mul: 0.5 },
  bigOrb: { every: 3.5, speed: 380, size: 24, mul: 4, burst: { radius: 80, mul: 1.2 } },
};
const HONRAN = { every: 1.5, radius: 150, time: 3, maxTier: 2, power: 2 };

const weaponDamage = (p) => Math.max(currentWeaponLevel(p).damage, 30);

/** A front cut where the hero stands (연참). */
function strike(g, mul, arc) {
  const p = g.player;
  const lv = currentWeaponLevel(p);
  hitArc(g, p.x, p.y, p.facing, (lv.range + 10) * p.stats.area, arc, weaponDamage(p) * mul * p.stats.might, 140, 'chop');
}

/**
 * 패공: called right after each main-weapon swing. 견훤 never moves on his
 * own — every extra cut is struck where he stands, turning toward a foe.
 */
export function afterSwing(g) {
  const p = g.player;
  const m = p.meta;
  if (p.hero.id !== 'gyeonhwon') return;
  // 연참: a moment later, turn on a different foe and cut again (no dash).
  if (m.rush && g.time >= (p.rushReadyAt ?? 0)) {
    const R = PAEGONG.rush;
    const drill = p.upgrades.rushDrill ?? 0;
    p.rushReadyAt = g.time + R.cooldown * Math.max(0.3, 1 - (m.rushCd ?? 0) - 0.12 * drill);
    const rushMul = R.mul * (1 + 0.15 * drill);
    const first = g.nearestEnemy(p.x, p.y, R.range);
    g.later(R.delay, () => {
      if (g.state !== 'play') return;
      // 천하패왕인 (rushChain): one more turn-and-cut on yet another foe.
      const targets = g.nearestEnemies(p.x, p.y, R.range, 6).filter((e) => e !== first);
      if (!targets.length && first && !first.dead) targets.push(first);
      const cuts = targets.slice(0, 1 + (m.rushChain ?? 0));
      cuts.forEach((t, i) => g.later(i * R.gap, () => {
        if (g.state !== 'play' || t.dead) return;
        const angle = Math.atan2(t.y - p.y, t.x - p.x);
        p.facing = angle;
        strike(g, rushMul, R.arc);
        g.sfx('chop');
        // 패왕의 대도: the last cut throws a sword wave toward that foe.
        if (m.rushWave && i === cuts.length - 1) {
          const W = PAEGONG.wave;
          g.projectiles.push({
            team: 'player', kind: 'wave', x: p.x, y: p.y,
            vx: Math.cos(angle) * W.speed, vy: Math.sin(angle) * W.speed,
            r: W.radius * p.stats.area, damage: weaponDamage(p) * W.mul * p.stats.might, knockback: 80,
            life: W.life, pierce: Infinity, hit: new Set(), angle,
          });
        }
      }));
    });
  }
}

/** 반격: the hero just took a hit. */
/**
 * 되받아치기 (견훤 반격의 길): whoever wounds him takes the blow back — the
 * attacker itself is struck, wherever it stands; 견훤 keeps moving freely.
 * 패왕의 반격 also sends a shock through the foes around the attacker.
 */
export function onHurt(g, attacker) {
  const p = g.player;
  if (!p.meta.counter || g.time < (p.counterReadyAt ?? 0)) return;
  const C = BANGYEOK.counter;
  const m = p.meta;
  const drill = p.upgrades.counterDrill ?? 0;
  // Blows with no one behind them (fire, auras) strike back at the nearest foe.
  const target = attacker && !attacker.dead ? attacker : g.nearestEnemy(p.x, p.y, C.fallbackRange);
  if (!target) return;
  p.counterReadyAt = g.time + C.cooldown * Math.max(0.3, 1 - (m.counterCd ?? 0));
  const dmg = weaponDamage(p) * C.mul * (1 + (m.counterMul ?? 0) + 0.25 * drill) * p.stats.might;
  g.damageEnemy(target, dmg, p.x, p.y, C.knockback, { stun: C.stun });
  g.fx.push({ type: 'spark', x: target.x, y: target.y, t: 0, life: 0.3 });
  g.fx.push({ type: 'thrust', x: p.x, y: p.y, angle: Math.atan2(target.y - p.y, target.x - p.x), t: 0, life: 0.15 });
  g.texts.push({ x: target.x, y: target.y - target.r - 18, v: '💥 반격!', t: 0, life: 0.7, order: true });
  g.sfx('chop');
  if (m.counterRush) {
    const H = BANGYEOK.chase;
    const radius = H.radius * (1 + (m.counterRadius ?? 0) + 0.1 * drill) * p.stats.area;
    hitArc(g, target.x, target.y, 0, radius, 360, dmg * H.mul, C.knockback * 0.6, 'paewang', { stun: C.stun });
    g.shake(5);
  }
}

/** Every frame: 철벽 armour, 법력 focus, 혼란 aura. */
export function updateBuild(g, dt) {
  const p = g.player;
  const m = p.meta;
  if (m.focus) updateFocus(g, dt);
  if (m.chaosAura) updateChaos(g, dt);
  if (p.meta.proxArmor) {
    p.wallTimer = (p.wallTimer ?? 0) - dt;
    if (p.wallTimer <= 0) {
      p.wallTimer = 0.2;
      const W = BANGYEOK.wall;
      let n = 0;
      g.grid.query(p.x, p.y, W.radius + 20, (e) => {
        if (!e.dead && !g.isCharmed(e) && e.def.behavior !== 'static' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < W.radius * W.radius) n++;
      });
      p.wall = Math.min(W.max, n * W.perFoe);
    }
  }
}

/** 법력 집중: fills while standing, drains while walking; 천안통 fires at full. */
function updateFocus(g, dt) {
  const p = g.player;
  const F = BEOPRYEOK.focus;
  const drill = p.upgrades.focusDrill ?? 0;
  const fill = F.fill / (1 + (p.meta.focusFill ?? 0) + 0.3 * drill);
  p.focus = p.moving ? Math.max(0, (p.focus ?? 0) - dt * F.drain) : Math.min(1, (p.focus ?? 0) + dt / fill);
  if (!p.meta.bigOrb) return;
  const B = BEOPRYEOK.bigOrb;
  const every = B.every * Math.max(0.3, 1 - (p.meta.bigOrbCd ?? 0) - 0.1 * drill);
  p.orbTimer = p.focus >= 1 ? Math.min(p.orbTimer ?? every, every) - dt : every;
  if (p.orbTimer > 0) return;
  const t = g.nearestEnemy(p.x, p.y, 520);
  if (!t) return;
  p.orbTimer = every;
  const ang = Math.atan2(t.y - p.y, t.x - p.x);
  const dmg = currentWeaponLevel(p).damage * B.mul * p.stats.might;
  g.projectiles.push({
    team: 'player', kind: 'orb', x: p.x, y: p.y, vx: Math.cos(ang) * B.speed, vy: Math.sin(ang) * B.speed,
    r: B.size * p.stats.area, damage: dmg, knockback: 120, life: 1.6, pierce: Infinity, hit: new Set(), angle: ang,
    burst: { radius: B.burst.radius * p.stats.area, damage: dmg * B.burst.mul / B.mul },
  });
  g.shake(4);
  g.sfx('beam');
  g.texts.push({ x: p.x, y: p.y - 44, v: '☄️ 천안통!', t: 0, life: 0.8, order: true });
}

/** 혼란의 기운: every so often one plain soldier near 궁예 turns on its own side. */
function updateChaos(g, dt) {
  const p = g.player;
  const H = HONRAN;
  const drill = p.upgrades.chaosDrill ?? 0;
  const every = H.every * Math.max(0.3, 1 - (p.meta.chaosCd ?? 0) - 0.12 * drill);
  p.chaosTimer = Math.min(p.chaosTimer ?? every, every) - dt;
  if (p.chaosTimer > 0) return;
  p.chaosTimer = every;
  // 미륵하생경: sway the two nearest instead of one.
  const picks = [];
  const maxTier = p.meta.gwansimAllTiers ? 99 : H.maxTier;
  g.grid.query(p.x, p.y, H.radius + 20, (e) => {
    if (e.dead || e.isBoss || e.def.behavior === 'static' || g.isCharmed(e)) return;
    if ((e.def.tier ?? 1) + (e.elite ? 1 : 0) > maxTier) return;
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < H.radius * H.radius) picks.push({ e, d });
  });
  picks.sort((a, b) => a.d - b.d);
  for (const { e } of picks.slice(0, 1 + (p.meta.chaosCount ?? 0))) {
    e.charmUntil = g.time + H.time + drill;
    e.charmPower = H.power;
    g.fx.push({ type: 'eye', x: e.x, y: e.y - e.r - 6, t: 0, life: 0.8, follow: e, size: 9 });
  }
}

/** Short status for the HUD chips. */
export function buildStatus(g) {
  const p = g.player;
  const m = p.meta;
  const chips = [];
  const wait = (at) => (g.time >= (at ?? 0) ? '준비' : `${Math.ceil(at - g.time)}초`);
  if (m.proxArmor) chips.push(`🛡️ 철벽 +${(p.wall ?? 0).toFixed(1)}`);
  if (m.counter) chips.push(`💥 반격 ${wait(p.counterReadyAt)}`);
  if (m.rush) chips.push(`⚔️ 연참 ${wait(p.rushReadyAt)}`);
  if (m.focus) chips.push(p.focus >= 1 ? '☄️ 법력 가득' : `☄️ 법력 ${Math.round((p.focus ?? 0) * 100)}%`);
  if (m.chaosAura) chips.push(`🌀 혼란 ${Math.max(0, p.chaosTimer ?? 0).toFixed(1)}초`);
  return chips;
}
