import { UPGRADES, FALLBACKS, evolutionStatus } from '../data/upgrades.js';
import { currentWeaponLevel } from '../systems/weapons.js';
import { WEAPONS } from '../data/weapons.js';

import { CROW } from '../systems/crows.js';
import { FIELD_ITEMS, ITEM_LIFE } from '../systems/fieldItems.js';
import { WRATH, endlessCrystals } from '../data/endless.js';

const $ = (id) => document.getElementById(id);
/** Screen direction (east first, clockwise, y down) as an arrow. */
const ARROWS = ['➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '⬆️', '↗️'];
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** In-battle HUD (DOM overlay), refreshed a few times per second. */
export class Hud {
  constructor() {
    this.root = $('hud');
    this.el = {
      xp: $('xpFill'), xpText: $('xpText'),
      hp: $('hpFill'), hpText: $('hpText'), mom: $('momFill'), momBar: $('momFill').parentElement, momLabel: $('momLabel'),
      timer: $('timer'), timerSub: $('timerSub'), loot: $('loot'), status: $('heroStatus'),
      bossBar: $('bossBar'), bossName: $('bossName'), bossFill: $('bossFill'),
      evo: $('evoHint'),
    };
    this.acc = 0;
    this.evoKey = '';
    this.bannerTimer = null;
    this.introTimer = null;
  }

  show(on) {
    this.root.hidden = !on;
  }

  update(g, dt, force = false) {
    this.acc += dt;
    if (!force && this.acc < 0.08) return;
    this.acc = 0;
    const h = g.hud();
    const e = this.el;
    e.momLabel.textContent = `기세 · ${g.specialName}`;
    e.xp.style.width = `${(h.xp / h.xpNext) * 100}%`;
    e.xpText.textContent = `공훈 · Lv ${h.level}`;
    e.hp.style.width = `${(h.hp / h.maxHp) * 100}%`;
    e.hpText.textContent = `❤️ ${Math.ceil(h.hp)} / ${Math.round(h.maxHp)}`;
    e.mom.style.width = `${h.momentum * 100}%`;
    e.momBar.classList.toggle('full', h.momentum > 0.9);
    // Full and waiting for a good moment to burst.
    e.momBar.classList.toggle('held', !!h.momHeld);
    e.loot.textContent = g.stage.endless ? `💎 토벌 ${endlessCrystals(g.stage.layer, { won: true }).toLocaleString()}+` : g.stage.altar ? `🔮 영기 ${g.runStats.wisps ?? 0}` : `🪙 +${g.liveReward().toLocaleString()}`;
    e.timer.textContent = fmt(h.time);
    e.timerSub.textContent = h.bossPhase ? '적장을 쓰러뜨려라' : `적장 출현까지 ${fmt(h.remaining)}`;
    e.bossBar.hidden = !h.boss;
    if (h.boss) {
      e.bossName.textContent = h.boss.name;
      e.bossFill.style.width = `${h.boss.ratio * 100}%`;
    }
    e.status.innerHTML = heroStatus(g);
    // 🌳 A branch is waiting on the ground: keep reminding until it is picked up.
    const feed = g.pickups.find((k) => k.kind === 'crowFeed') ?? g.pickups.find((k) => k.kind === 'item');
    $('crowAlert').hidden = !feed;
    if (feed) {
      const p = g.player;
      const dir = ARROWS[Math.round(((Math.atan2(feed.y - p.y, feed.x - p.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
      const it = feed.kind === 'item' ? FIELD_ITEMS[feed.item] : null;
      $('crowAlert').textContent = it
        ? `${it.icon} ${it.name} ${dir} 주우러 가요! ${Math.max(0, Math.ceil(ITEM_LIFE - feed.t))}초`
        : `🐦‍⬛ 감나무 가지 ${dir} 주우러 가요! ${Math.max(0, Math.ceil(CROW.feedLife - feed.t))}초`;
    }
    this.updateEvo(g);
  }

  /** 궁극기 진행 체크 is no longer shown in battle (강화 → 🛡️ 장비 lists the conditions). */
  updateEvo() {
    this.el.evo.hidden = true;
  }

  /**
   * After a 책략 is picked: a card at the bottom right (above the bars) shows each
   * 궁극기 that 책략 counts toward — its skills and how far each is — for a
   * few seconds, then slides away.
   */
  evoProgress(g, id) {
    const box = $('evoPop');
    clearTimeout(this.evoPopTimer);
    const list = evolutionStatus(g).filter((e) => e.checks.some((c) => c.id === id));
    if (!list.length) {
      box.hidden = true;
      return;
    }
    box.innerHTML = list.slice(0, 3).map((e) => `<div class="ep-card${e.ready ? ' ready' : ''}">
      <b class="ep-name">🌟 ${e.name}</b>${e.checks.map((c) => `
      <div class="ep-row${c.done ? ' done' : ''}${c.id === id ? ' now' : ''}"><span>${c.done ? '✔' : '·'} ${c.label}</span><em>${c.now}/${c.need}</em>
        <i class="ep-bar"><i style="width:${Math.round((100 * c.now) / c.need)}%"></i></i></div>`).join('')}
      ${e.ready ? '<span class="ep-go">다음 레벨업에 진화!</span>' : `<small>남은 책략 ${e.checks.reduce((n, c) => n + Math.max(0, c.need - c.now), 0)}장</small>`}
    </div>`).join('');
    box.hidden = false;
    // Bottom right, just above the bars and the 궁극기 checklist at the bottom of the screen.
    const bottom = document.querySelector('#hud .hud-bottom');
    box.style.bottom = `${Math.round(window.innerHeight - (bottom?.getBoundingClientRect().top ?? window.innerHeight - 140) + 8)}px`;
    box.classList.remove('out');
    void box.offsetWidth; // restart the slide-in
    box.classList.add('in');
    this.evoPopTimer = setTimeout(() => {
      box.classList.add('out');
      this.evoPopTimer = setTimeout(() => (box.hidden = true), 350);
    }, 4200);
  }

  hideEvoProgress() {
    clearTimeout(this.evoPopTimer);
    $('evoPop').hidden = true;
  }

  /** Pause screen: the weapons and 책략 taken so far (kept off the battle HUD). */
  fillPause(g) {
    const p = g.player;
    const parts = [`<span class="weapon">${currentWeaponLevel(p).name}</span>`];
    for (const w of Object.values(p.subs)) parts.push(`<span class="weapon">${WEAPONS[w.id].levels[w.level].name}</span>`);
    for (const u of [...UPGRADES, ...FALLBACKS]) {
      const lv = p.upgrades[u.id];
      if (!lv || u.subWeapon) continue;
      parts.push(u.ownedName ? `<span class="weapon">${u.ownedName(g)}</span>` : `<span>${u.name} ${lv}</span>`);
    }
    $('pauseOwned').innerHTML = parts.join('');
  }

  /** ⚠️ 적장 출현 — a short full-width card, then the boss bar takes over. */
  bossIntro(def) {
    $('biName').textContent = def.name;
    $('biEpithet').textContent = def.epithet ?? '';
    const box = $('bossIntro');
    box.hidden = false;
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(() => (box.hidden = true), 2400);
  }

  /** 🎰 황금 룰렛: a gold wheel spins over the field and stops on the 토벌 multiplier. */
  roulette(r) {
    document.getElementById('roulette')?.remove();
    clearTimeout(this.rouletteTimer);
    const n = r.wheel.length, seg = 360 / n;
    const color = (m) => (m >= 10 ? '#ff4a2e' : m >= 5 ? '#ff9a2a' : m >= 2 ? '#f2c84a' : m >= 1 ? '#e8b448' : '#b8873a');
    const stops = r.wheel.map((m, i) => `${color(m)} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ');
    const box = document.createElement('div');
    box.id = 'roulette';
    box.className = 'roulette';
    box.innerHTML = `<div class="rl-title">🎰 황금 룰렛</div><div class="rl-pointer">▼</div>
      <div class="rl-wheel" style="background: conic-gradient(${stops})">${r.wheel
        .map((m, i) => `<span class="rl-slice${m >= 5 ? ' big' : ''}" style="transform: rotate(${i * seg + seg / 2}deg) translateY(-78px)">×${m}</span>`)
        .join('')}<i class="rl-lines" style="background: repeating-conic-gradient(rgba(60,30,0,0.55) 0deg 1deg, transparent 1deg ${seg}deg)"></i><b class="rl-hub">金</b></div>
      <div class="rl-result"></div>`;
    document.getElementById('app').append(box);
    const wheel = box.querySelector('.rl-wheel');
    const turn = 360 * 6 - (r.slot * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.5;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wheel.style.transition = `transform ${r.spin}s cubic-bezier(0.12, 0.7, 0.12, 1)`;
      wheel.style.transform = `rotate(${turn}deg)`;
    }));
    this.rouletteTimer = setTimeout(() => {
      const res = box.querySelector('.rl-result');
      res.textContent = r.mul >= 5 ? `×${r.mul} 대박!` : `×${r.mul}`;
      box.classList.add('done', r.mul >= 5 ? 'jackpot' : r.mul < 1 ? 'low' : 'mid');
      this.rouletteTimer = setTimeout(() => box.remove(), 1800);
    }, r.spin * 1000);
  }

  banner(text, size = 'normal') {
    const b = $('banner');
    b.textContent = text;
    b.className = `banner show ${size === 'normal' ? '' : size}`;
    clearTimeout(this.bannerTimer);
    const ms = size === 'crow' ? 5500 : size === 'big' ? 2600 : 2000;
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
  }

  clearBanner() {
    clearTimeout(this.bannerTimer);
    clearTimeout(this.rouletteTimer);
    document.getElementById('roulette')?.remove();
    clearTimeout(this.introTimer);
    $('banner').className = 'banner';
    $('bossIntro').hidden = true;
  }
}

/** One line of each hero's own state, shown as words and counts, not buttons. */
function heroStatus(g) {
  const p = g.player;
  const allies = (k) => g.allies.filter((a) => a.kind === k && !a.dead).length;
  const ready = (id) => {
    if (!p.upgrades[id]) return null;
    const t = p.skillTimers[id] ?? 0;
    return t <= 0.2 ? '준비' : `${Math.ceil(t)}초`;
  };
  const chips = [];
  if (p.hero.id === 'wanggeon') {
    const army = allies('soldier') + allies('archer') + allies('shin');
    chips.push(`🏯 군세 ${army}명`);
    if (ready('shin')) chips.push(`🛡️ 신숭겸 ${ready('shin')}`);
    if (ready('horse')) chips.push(p.mount ? '🐎 기마 중' : `🐎 말 ${ready('horse')}`);
    if (ready('edict')) chips.push(`📜 어명 ${ready('edict')}`);
    if ((p.upgrades.archers ?? 0) > 3) chips.push(`🔥 불화살 ${ready('archers')}`);
  } else if (p.hero.id === 'gyeonhwon') {
    chips.push(`🛡️ 갑주 ${Math.round(p.stats.armor)}`);
    if (p.enraged) chips.push(`<b class="wrath-chip">👹 패왕 ${p.hp < p.stats.maxHp * 0.3 ? '피해 2배' : '피해 +60%'}</b>`);
    else if (p.upgrades.fury) chips.push(`🔥 패기 ${Math.min(3, p.upgrades.fury)}`);
    if (ready('boulder')) chips.push(`🪨 바위 ${ready('boulder')}`);
    if (ready('chain')) chips.push(`⛓️ 철쇄 ${ready('chain')}`);
    if (p.tiger) chips.push(`🐯 ${p.tiger.mul}배 ${Math.ceil(p.tiger.until - g.time)}초`);
    else if (ready('tiger')) chips.push(`🐯 호랑이 ${ready('tiger')}`);
  } else if (p.hero.id === 'gungye') {
    const swayed = g.enemies.filter((e) => !e.dead && g.isCharmed(e)).length;
    chips.push(`🌀 홀린 적 ${swayed}`);
    if (p.upgrades.maguni) chips.push(`👹 마구니 ${allies('maguni')}/4`);
    if (ready('curse')) chips.push(`👁️ 천안 ${ready('curse')}`);
    if (Object.keys(p.subs).length) chips.push('☄️ 금강저');
  }
  // 🐾 동행 영물: what is worth knowing at a glance.
  for (const s of g.spirits ?? []) {
    if (s.id === 'jujak') chips.push(`🐦‍🔥 부활 ${s.data.revives}`);
    else if (s.id === 'owl' && g.rerolls !== undefined) chips.push(`🦉 다시 뽑기 ${g.rerolls}`);
    else if (s.id === 'wolf') chips.push(`🐺 ${(s.data.pack ?? []).length}/${s.br === 'a' ? 8 : 5}`);
    else if (s.id === 'cub') chips.push(`🐯 ${Math.round((s.data.grow ?? 0) * 100)}%`);
    else if (s.id === 'bear' && s.data.guard) chips.push('🐻 버팀');
  }
  if (p.shield > 0) chips.push(`🛡️ 보호막 ${Math.ceil(p.shield)}`);
  if (p.drumUntil) chips.push(`🥁 전고 ${Math.ceil(p.drumUntil - g.time)}초`);
  if (p.keroseneUntil > g.time) chips.push(`🛢️ 불길 ${Math.ceil(p.keroseneUntil - g.time)}초`);
  // 무한 전장: warn before 신의 분노 strikes a hero who stands still.
  if (g.stage.endless && (g.stillT ?? 0) > WRATH.hint) chips.push(`<b class="wrath-chip">⚡ ${g.stillT >= WRATH.idle ? '신의 분노!' : `신의 분노까지 ${Math.ceil(WRATH.idle - g.stillT)}초`} — 움직여라</b>`);
  return chips.map((c) => `<span>${c}</span>`).join('');
}
