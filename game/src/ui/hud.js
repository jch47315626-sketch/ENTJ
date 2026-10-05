import { UPGRADES, evolutionHint } from '../data/upgrades.js';
import { currentWeaponLevel } from '../systems/weapons.js';

const $ = (id) => document.getElementById(id);
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** In-battle HUD (DOM overlay), refreshed a few times per second. */
export class Hud {
  constructor() {
    this.root = $('hud');
    this.el = {
      xp: $('xpFill'), lv: $('lv'), name: $('heroName'),
      hp: $('hpFill'), hpText: $('hpText'), mom: $('momFill'), momBar: $('momFill').parentElement,
      timer: $('timer'), timerSub: $('timerSub'), kills: $('kills'),
      bossBar: $('bossBar'), bossName: $('bossName'), bossFill: $('bossFill'),
      owned: $('owned'), evo: $('evoHint'),
    };
    this.acc = 0;
    this.ownedKey = '';
    this.bannerTimer = null;
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
    e.name.textContent = g.player.hero.name;
    e.lv.textContent = `Lv ${h.level}`;
    e.xp.style.width = `${(h.xp / h.xpNext) * 100}%`;
    e.hp.style.width = `${(h.hp / h.maxHp) * 100}%`;
    e.hpText.textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    e.mom.style.width = `${h.momentum * 100}%`;
    e.momBar.classList.toggle('full', h.momentum > 0.9);
    e.kills.textContent = `처치 ${h.kills}`;
    e.timer.textContent = fmt(h.time);
    if (h.bossPhase) {
      e.timerSub.textContent = '진(陣) — 보스를 쓰러뜨려라';
    } else {
      e.timerSub.textContent = `보스 출현까지 ${fmt(h.remaining)}`;
    }
    e.bossBar.hidden = !h.boss;
    if (h.boss) {
      e.bossName.textContent = h.boss.name;
      e.bossFill.style.width = `${h.boss.ratio * 100}%`;
    }
    this.updateOwned(g);
  }

  updateOwned(g) {
    const p = g.player;
    const key = JSON.stringify([p.weapon.level, p.upgrades]);
    if (key === this.ownedKey) return;
    this.ownedKey = key;
    const parts = [`<span class="weapon">${currentWeaponLevel(p).name}</span>`];
    for (const u of UPGRADES) {
      const lv = p.upgrades[u.id];
      if (lv) parts.push(`<span>${u.name} ${lv}</span>`);
    }
    this.el.owned.innerHTML = parts.join('');
    const hint = evolutionHint(g);
    this.el.evo.hidden = !hint;
    this.el.evo.textContent = hint ? `진화 조건 — ${hint}` : '';
  }

  banner(text, size = 'normal') {
    const b = $('banner');
    b.textContent = text;
    b.className = `banner show ${size === 'normal' ? '' : size}`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), size === 'big' ? 2600 : 2000);
  }

  clearBanner() {
    clearTimeout(this.bannerTimer);
    $('banner').className = 'banner';
  }
}
