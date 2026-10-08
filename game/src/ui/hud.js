import { UPGRADES, evolutionStatus } from '../data/upgrades.js';
import { currentWeaponLevel } from '../systems/weapons.js';
import { WEAPONS } from '../data/weapons.js';
import { ORDERS, orderEvery } from '../systems/allies.js';
import { buildStatus } from '../systems/builds.js';

import { CROW } from '../systems/crows.js';

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
    e.loot.textContent = `🪙 +${g.liveReward().toLocaleString()}`;
    e.timer.textContent = fmt(h.time);
    e.timerSub.textContent = h.bossPhase ? '적장을 쓰러뜨려라' : `적장 출현까지 ${fmt(h.remaining)}`;
    e.bossBar.hidden = !h.boss;
    if (h.boss) {
      e.bossName.textContent = h.boss.name;
      e.bossFill.style.width = `${h.boss.ratio * 100}%`;
    }
    e.status.innerHTML = heroStatus(g);
    // 🌳 A branch is waiting on the ground: keep reminding until it is picked up.
    const feed = g.pickups.find((k) => k.kind === 'crowFeed');
    $('crowAlert').hidden = !feed;
    if (feed) {
      const p = g.player;
      const dir = ARROWS[Math.round(((Math.atan2(feed.y - p.y, feed.x - p.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
      $('crowAlert').textContent = `🐦‍⬛ 감나무 가지 ${dir} 주우러 가요! ${Math.max(0, Math.ceil(CROW.feedLife - feed.t))}초`;
    }
    // 🏯 군령: fills toward the next order of any troop kind; flashes just before.
    const orders = Object.entries(g.orders ?? {});
    $('orderBar').hidden = !orders.length;
    if (orders.length) {
      const [role, o] = orders.reduce((a, b) => (b[1].t < a[1].t ? b : a));
      const ratio = 1 - Math.max(0, o.t) / orderEvery(g, role);
      $('orderFill').style.width = `${ratio * 100}%`;
      $('orderBar').classList.toggle('full', o.t < 0.5);
      $('orderLabel').textContent = o.t < 0.5 ? `⚔️ 군령 발동! ${ORDERS[role].name}` : `🏯 군령 · 다음 ${ORDERS[role].name}`;
    }
    this.updateEvo(g);
  }

  updateEvo(g) {
    const p = g.player;
    const key = JSON.stringify([p.weapon.level, p.upgrades]);
    if (key === this.evoKey) return;
    this.evoKey = key;
    const list = evolutionStatus(g);
    this.el.evo.hidden = !list.length;
    this.el.evo.innerHTML = list
      .map((e) => `<div class="evo-row${e.ready ? ' ready' : ''}${e.owned ? '' : ' off'}"><b class="evo-name">🌟 ${e.name}</b>${e.checks
        .map((c) => `<span class="evo-check${c.done ? ' done' : ''}"><i>${c.done ? '✔' : ''}</i>${c.label} <em>${c.now}/${c.need}</em></span>`)
        .join('')}${e.ready ? '<span class="evo-go">다음 레벨업에 진화!</span>' : ''}</div>`)
      .join('');
  }

  /** Pause screen: the weapons and 책략 taken so far (kept off the battle HUD). */
  fillPause(g) {
    const p = g.player;
    const parts = [`<span class="weapon">${currentWeaponLevel(p).name}</span>`];
    for (const w of Object.values(p.subs)) parts.push(`<span class="weapon">${WEAPONS[w.id].levels[w.level].name}</span>`);
    for (const u of UPGRADES) {
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
    const army = allies('retinue') + allies('soldier') + allies('archer') + allies('shin');
    chips.push(`🏯 군세 ${army}명`);
    if (p.wardUntil > g.time) chips.push('🛡️ 호위진');
    if (ready('shin')) chips.push(`🛡️ 신숭겸 ${ready('shin')}`);
    if (ready('horse')) chips.push(p.mount ? '🐎 기마 중' : `🐎 말 ${ready('horse')}`);
  } else if (p.hero.id === 'gyeonhwon') {
    chips.push(...buildStatus(g));
    if (!p.meta.proxArmor) chips.push(`🛡️ 갑주 ${Math.round(p.stats.armor)}`);
    if (p.upgrades.fury) chips.push(`🔥 패기 ${p.upgrades.fury}`);
    if (ready('chain')) chips.push(`⛓️ 철쇄 ${ready('chain')}`);
    if (p.tiger) chips.push(`🐯 ${p.tiger.mul}배 ${Math.ceil(p.tiger.until - g.time)}초`);
    else if (ready('tiger')) chips.push(`🐯 호랑이 ${ready('tiger')}`);
  } else if (p.hero.id === 'gungye') {
    const swayed = g.enemies.filter((e) => !e.dead && g.isCharmed(e)).length;
    chips.push(`🌀 홀린 적 ${swayed}`);
    chips.push(...buildStatus(g));
    if (p.upgrades.maguni) chips.push(`👹 마구니 ${allies('maguni')}/4`);
    if (Object.keys(p.subs).length) chips.push('☄️ 금강저');
  }
  if (p.drumUntil) chips.push(`🥁 전고 ${Math.ceil(p.drumUntil - g.time)}초`);
  return chips.map((c) => `<span>${c}</span>`).join('');
}
