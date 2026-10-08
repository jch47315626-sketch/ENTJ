import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER, CHAPTERS, chapterOf } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMIES } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import {
  SLOTS, EQUIPMENT, TRAINING, SECRETS, REWARD_BY_STARS, GRADES, FORGE,
  forgeCost, gradeOpen, itemBonus, bonusText, metaBonus, entryCheck, armorCut,
} from '../data/meta.js';
import { ACHIEVEMENTS, ACH_GROUPS, progressOf } from '../data/achievements.js';
import { heroUltimates } from '../data/upgrades.js';
import { GYEOLGI, gyeolgiCost } from '../data/gyeolgi.js';
import { dailyFor, todayKey, untilTomorrow } from '../data/daily.js';
import { josa } from '../core/korean.js';
import { lineText, lineMax, engraveCost } from '../data/gearOptions.js';
import { HELP } from '../data/help.js';
import { NANSE_CARDS, NANSE_MAX, NANSE_MILESTONES, nanseLevel, nanseRewardMul, bestNanse, milestoneBonus } from '../data/nanse.js';
import { SPECIALS } from '../systems/specials.js';
import { drawUnit } from '../render/sprites.js';
import { iconCanvas } from '../render/icons.js';
import { starText, gradeTag } from './screens.js';

/**
 * Menu screens: 홈 · 영웅 · 성장 · 전장 · 출진 준비 · 도감.
 * Each render(save, sel, act) rebuilds its screen body from the save; `act`
 * holds the actions from main.js (buying, wearing, picking, starting).
 * Words first, numbers second: every card leads with what a thing does.
 */

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString();
const outfit = (save, heroId) => save.equipped[heroId] ?? {};
const itemById = (id) => EQUIPMENT.find((e) => e.id === id);
const forgeLv = (save, item) => save.forge?.[item.id] ?? 0;
const itemName = (save, item) => `${item.name}${forgeLv(save, item) ? ` +${forgeLv(save, item)}` : ''}`;

const SLOT_ICON = { head: '🪖', body: '🛡️', charm: '📿', wrist: '💠', belt: '🎗️', feet: '👢' };

/** Training rows lead with what they do. */
const TRAIN_UI = {
  swordDrill: ['⚔️', '모든 공격이 더 아파진다'],
  body: ['❤️', '더 오래 버틴다'],
  riding: ['🐎', '더 빨리 달린다'],
  fortune: ['🪙', '판마다 냥을 더 받는다'],
  tactics: ['📜', '출진하자마자 책략 하나'],
};

// Remembered between renders: which tab or card is open on each screen.
const ui = { heroTab: 'gear', slot: 'head', codexTab: 'ach', mapStage: null };

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function button(label, cls, onClick, disabled = false) {
  const b = el('button', cls);
  b.type = 'button';
  b.innerHTML = label;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

const tag = (text, cls = '') => el('span', `done-tag ${cls}`, text);
/** Painted UI art cut from the key screens (assets/ui). */
const UI = 'assets/ui';
const img = (src, cls = '') => `<img class="${cls}" src="${UI}/${src}.webp" alt="" decoding="async">`;
const COIN = () => img('icon/coin', 'coin-img');
const GEM = () => img('icon/crystal', 'gem-img');
const priceBtn = (price, money, onClick) => button(`${COIN()}${fmt(price)}`, 'buy-btn', onClick, money < price);
/** 완료 stamp: a gold tick in a ring over a small plaque. */
const doneSeal = (text = '완료') => el('span', 'done-seal', `<i>✓</i><em>${text}</em>`);
/** Section title in brush strokes with a red seal, as on the 수련 · 비전 boards. */
const sealOf = (hanja) => `<i class="title-seal">${[...hanja].join('<br>')}</i>`;
const secHead = (title, seal, sub) => el('div', 'sec-head', `<b>${title}</b>${seal ? sealOf(seal) : ''}${sub ? `<small>${sub}</small>` : ''}`);
/** Centered heading between gold rules (도감 groups). */
const ruleHead = (icon, text) => el('h4', 'rule-head', `<span class="rh-line"></span>${icon}<b>${text}</b><span class="rh-line"></span>`);
const STAGE_ART = (id) => `url(${UI}/stage/${id}.webp)`;
/** Bigger scene for the stage panel: the painted map around the node (삼한), or the field's own card art. */
const STAGE_SCENE = (id) => (chapterOf(STAGES[id]) === 'samhan' ? `url(${UI}/scene/${id}.webp)` : STAGE_ART(id));

function tabStrip(tabs, current, onPick) {
  const nav = el('div', 'sub-tabs');
  nav.setAttribute('role', 'tablist');
  for (const [id, label] of tabs) {
    const b = button(label, `sub-tab${id === current ? ' on' : ''}`, () => onPick(id));
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(id === current));
    nav.appendChild(b);
  }
  return nav;
}

/** Page header: home button, brush title with its red seal, and the purse. */
function header(title, save, act, seal = '') {
  const h = el('div', 'page-head');
  const home = button(img('icon/home', 'home-img'), 'home-btn', () => act.go('home'));
  home.setAttribute('aria-label', '홈으로');
  h.append(home);
  h.append(el('h2', 'page-title', `<span>${title}</span>${seal ? sealOf(seal) : ''}`));
  h.append(el('span', 'coin-pill', `${COIN()}<b>${fmt(save.money)}</b>`));
  return h;
}

/** A hero's painted bust from the key art, in a round gold frame. */
function portrait(hero, px) {
  const im = el('img', 'portrait bust');
  im.src = `${UI}/hero/${hero.id}.webp`;
  im.alt = hero.name;
  im.decoding = 'async';
  im.style.width = im.style.height = `${px}px`;
  return im;
}

/** Row of the six worn gear icons. */
function gearRow(save, heroId, px = 26) {
  const row = el('div', 'gear-row');
  const wear = outfit(save, heroId);
  for (const sl of SLOTS) {
    const it = itemById(wear[sl.id]);
    const c = iconCanvas(it ? it.id : `empty:${sl.id}`, px, `mini-icon${it ? '' : ' empty'}`);
    if (it) c.style.borderColor = GRADES[it.grade].color;
    c.title = it ? `${sl.name}: ${itemName(save, it)}` : `${sl.name}: 비어 있음`;
    row.append(c);
  }
  return row;
}

/** Stage summary used on the home card, map card and prep screen. */
function stageInfo(save, sel, st) {
  const boss = BOSSES[st.bossAlt[sel.hero] ?? st.boss];
  const gate = entryCheck(save, sel.hero, st);
  const cleared = save.best?.[st.id];
  return { boss, gate, cleared };
}

// ===================================================================== 홈

export function renderHome(save, sel, act) {
  $('homeMoney').textContent = fmt(save.money);
  const body = $('homeBody');
  body.innerHTML = '';
  const h = HEROES[sel.hero];
  const hero = button('', 'home-hero', () => act.go('heroes'));
  hero.append(portrait(h, 120));
  const txt = el('div', 'hh-text');
  txt.append(el('div', 'hh-name', h.name));
  txt.append(el('div', 'hh-build', `${h.title} · ${h.role}`));
  txt.append(gearRow(save, h.id));
  hero.append(txt);
  body.append(hero);

  const st = STAGES[sel.stage];
  const { boss, gate } = stageInfo(save, sel, st);
  const card = el('div', 'home-stage');
  const info = button(`
    <span class="hs-stars">${starText(st.difficulty.stars)}</span>
    <span class="hs-name">${st.numeral} ${st.name}</span>
    <span class="hs-meta">보상 ×${rewardOf(st)} · 적장 ${boss.name}</span>`, 'hs-info', () => act.go('map'));
  card.append(info);
  if (!gate.ok) card.append(el('p', 'gate-msg', `🔒 ${gate.text}`));
  const cta = button('⚔️ 출진하기', 'seal-btn cta', () => act.go('prep'));
  card.append(cta);
  body.append(card);
  body.append(dailyCard(save, act));
  body.append(endlessCard(save, sel, act));
}

/** ♾️ 무한 전장: the chosen hero and field with no end; best time per field. */
function endlessCard(save, sel, act) {
  const st = STAGES[sel.stage];
  const h = HEROES[sel.hero];
  const best = save.endless?.[sel.stage];
  const mmss = (s) => `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, '0')}초`;
  const card = el('div', 'endless-card');
  card.append(el('div', 'dc-head', `<b>♾️ 무한 전장</b><span>쓰러질 때까지 버티기</span>`));
  const who = el('div', 'dc-who');
  who.append(portrait(h, 56));
  who.append(el('div', 'dc-where', `<b>${josa(h.name, '으로')} 출전</b><span>${starText(st.difficulty.stars)} ${st.numeral} ${st.name}</span>`));
  card.append(who);
  card.append(el('p', 'ec-rule', '어둠의 <b>마계</b>에서 싸워요. 적이 더 빠르고 많으며, 적장은 <b>3분마다</b> 더 강해져 돌아와요. 냥 대신 <b>💎 결기수정</b>이 떨어져요. <b>⚡ 한 자리에 20초 머물면 신의 분노!</b> 고른 전장이 난이도와 적을 정해요.'));
  card.append(el('p', 'ec-best', best
    ? `🏆 이 전장 최고 기록 <b>${mmss(best.time)}</b> · 적장 ${best.bosses}명 · ${HEROES[best.hero]?.name ?? ''}`
    : '아직 기록이 없어요 — 첫 기록을 세워 보세요!'));
  const row = el('div', 'ec-btns');
  row.append(button('🗺️ 전장 바꾸기', 'plain-btn small', () => act.go('map')));
  row.append(button('♾️ 무한 전장 도전', 'endless-btn', () => act.startEndless()));
  card.append(row);
  return card;
}

/** 📅 오늘의 전장: today's hero, field and rules, and whether its bonus is taken. */
function dailyCard(save, act) {
  const d = dailyFor(todayKey());
  const st = STAGES[d.stageId];
  const h = HEROES[d.heroId];
  const done = save.daily?.date === d.date && save.daily.cleared;
  const [, mm, dd] = d.date.split('-').map(Number);
  const card = el('div', `daily-card${done ? ' done' : ''}`);
  card.append(el('div', 'dc-head', `<b>📅 오늘의 전장</b><span>${mm}월 ${dd}일 · 새 도전까지 ${untilTomorrow()}</span>`));
  const who = el('div', 'dc-who');
  who.append(portrait(h, 56));
  who.append(el('div', 'dc-where', `<b>${josa(h.name, '으로')} 출전</b><span>${starText(st.difficulty.stars)} ${st.numeral} ${st.name}</span>`));
  card.append(who);
  const [hard, boon] = d.rules;
  card.append(el('div', 'dc-rules', `
    <span class="dc-rule hard">${hard.icon} <b>${hard.name}</b> ${hard.desc}</span>
    <span class="dc-rule boon">${boon.icon} <b>${boon.name}</b> ${boon.desc}</span>`));
  card.append(el('p', 'dc-reward', done
    ? `✅ 오늘의 첫 승리 보상 🪙 ${fmt(d.reward)}은 받았어요. 다시 도전하면 <b>판 보상(냥)만</b> 받아요 — 첫 승리 보상은 내일 다시!`
    : `첫 승리 보상 <b>🪙 ${fmt(d.reward)}</b> <small>(하루 한 번 · 판 보상과 별도, 지면 다시 도전 가능)</small>`));
  card.append(button(done ? '🔁 다시 도전하기' : '📅 도전하기', 'daily-btn', () => act.startDaily()));
  return card;
}

// =================================================================== 영웅

export function renderHeroes(save, sel, act) {
  const body = $('heroesBody');
  body.innerHTML = '';
  body.append(header('영웅', save, act, '英雄'));

  // Hero picker.
  const pick = el('div', 'hero-pick');
  for (const h of Object.values(HEROES)) {
    const b = button('', `hp-card${h.id === sel.hero ? ' on' : ''}`, () => act.pickHero(h.id), !h.available);
    b.append(portrait(h, 56));
    b.append(el('span', 'hp-name', h.name));
    b.append(el('span', 'hp-role', h.role));
    pick.append(b);
  }
  body.append(pick);

  const h = HEROES[sel.hero];
  const about = el('div', 'style-card');
  about.innerHTML = `<small>${h.title} · ${h.role}</small><p>${h.blurb}</p>
    <small class="kit">고유기 <b>${SPECIALS[h.special].name}</b> · 무기 ${WEAPONS[h.weapon].levels.map((w) => w.name).join(' → ')}</small>`;
  body.append(about);
  // 궁극기: every hero has three; each shows what unlocks it.
  const ults = heroUltimates(h);
  const ultCard = el('div', 'ult-card');
  ultCard.append(el('b', 'ult-title', `🌟 궁극기 ${ults.length}`));
  for (const u of ults) {
    ultCard.append(el('div', 'ult-row', `<b>${u.name}</b><span class="ult-need">${u.need.map((n) => `☐ ${n}`).join(' · ')}</span><small>${u.desc}</small>`));
  }
  body.append(ultCard);

  body.append(tabStrip([['gear', '🛡️ 장비'], ['forge', '🔨 제련']], ui.heroTab, (id) => {
    ui.heroTab = id;
    renderHeroes(save, sel, act);
  }));
  if (ui.heroTab === 'forge') body.append(forgePanel(save, h, act));
  else body.append(gearPanel(save, h, act));
}

/** Paper doll around the hero, then the chosen slot's grades. */
function gearPanel(save, h, act) {
  const box = el('div', 'gear-panel');
  const wear = outfit(save, h.id);
  const doll = el('div', 'doll2');
  const center = el('div', 'd2-hero');
  center.append(portrait(h, 84));
  center.append(el('small', '', WEAPONS[h.weapon].levels[0].name));
  doll.append(center);
  for (const sl of SLOTS) {
    const it = itemById(wear[sl.id]);
    const b = button('', `d2-slot${sl.id === ui.slot ? ' on' : ''}${it ? '' : ' empty'}`, () => {
      ui.slot = sl.id;
      act.refresh();
    });
    b.style.gridArea = sl.id;
    if (it) b.style.setProperty('--grade', GRADES[it.grade].color);
    b.append(iconCanvas(it ? it.id : `empty:${sl.id}`, 40, 'icon'));
    b.append(el('span', 'd2-label', it ? itemName(save, it) : `${SLOT_ICON[sl.id]} ${sl.name}`));
    doll.append(b);
  }
  box.append(doll);

  const slot = SLOTS.find((s) => s.id === ui.slot);
  box.append(el('h4', 'list-title', `${SLOT_ICON[slot.id]} ${h.name}의 ${slot.name} <small>영웅마다 장비가 따로예요 — ${h.name}만 찰 수 있어요</small>`));
  const list = el('div', 'item-list');
  for (const item of EQUIPMENT.filter((e) => e.slot === slot.id && e.hero === h.id)) list.append(itemCard(save, h, item, act));
  box.append(list);
  return box;
}

function itemCard(save, h, item, act) {
  const owned = save.owned.includes(item.id);
  const worn = outfit(save, h.id)[item.slot] === item.id;
  const open = gradeOpen(save, item);
  const lv = forgeLv(save, item);
  const card = el('div', `item-card${worn ? ' worn' : ''}${!owned && !open ? ' sealed' : ''}`);
  card.style.setProperty('--grade', GRADES[item.grade].color);
  card.append(iconCanvas(open || owned ? item.id : `empty:${item.slot}`, 40, 'row-icon'));
  const txt = el('div', 'ic-text');
  const sub = item.relic && !owned ? '🔥 난세 10단계 이상을 평정하면 얻을 수 있어요' : open || owned ? bonusText(itemBonus(item, lv)) : `★${GRADES[item.grade].needStars} 전장을 깨면 풀려요`;
  txt.innerHTML = `<b>${gradeTag(item.grade)} ${open || owned ? itemName(save, item) : '???'}</b><span>${sub}</span>`;
  card.append(txt);
  // 장비 옵션: random lines; each can be rerolled (각인) for 냥.
  const lines = owned ? save.gearOpts?.[item.id] ?? [] : [];
  let opts = null;
  if (lines.length) {
    opts = el('div', 'ic-opts');
    const cost = engraveCost(item);
    lines.forEach((l, i) => {
      const q = l.special ? 0 : l.v / Math.max(1e-9, lineMax(l.k, item.grade));
      const row = el('div', `ic-opt${l.special ? ' special' : q >= 0.9 ? ' top' : ''}`);
      row.append(el('span', 'io-text', lineText(l)));
      const b = button(`🔁 <small>${fmt(cost)}</small>`, 'io-btn', () => act.engrave(item, i), save.money < cost);
      b.title = `각인: 이 줄을 새로 뽑아요 (${fmt(cost)}냥)`;
      row.append(b);
      opts.append(row);
    });
  }
  const ctrl = el('div', 'ic-ctrl');
  if (owned) {
    ctrl.append(worn ? tag('착용 중') : button('착용', 'wear-btn', () => act.wear(item)));
  } else if (item.relic) {
    ctrl.append(tag('🔥 난세 전용', 'locked'));
  } else if (open) {
    ctrl.append(priceBtn(item.price, save.money, () => act.buy(item)));
  } else {
    ctrl.append(tag('🔒', 'locked'));
  }
  card.append(ctrl);
  if (opts) card.append(opts); // full-width row under the controls
  return card;
}

/** 제련 (대장간): every piece this hero owns, worn ones first, with what the next level gives. */
function forgePanel(save, h, act) {
  const box = el('div', 'forge-panel');
  box.append(el('p', 'hint', `냥을 써서 장비를 +1~+${FORGE.max}까지 강화해요. 한 단계마다 기본 능력치 +${Math.round(FORGE.step * 100)}%. 실패해도 장비는 그대로예요.`));
  const wear = outfit(save, h.id);
  const worn = new Set(Object.values(wear));
  const mine = EQUIPMENT.filter((e) => e.hero === h.id && save.owned.includes(e.id))
    .sort((a, b) => worn.has(b.id) - worn.has(a.id) || b.grade - a.grade);
  if (!mine.length) {
    box.append(el('p', 'empty-note', '아직 가진 장비가 없어요. 🛡️ 장비 탭에서 먼저 사 주세요.'));
    return box;
  }
  for (const item of mine) {
    const lv = forgeLv(save, item);
    const card = el('div', `item-card forge-card${worn.has(item.id) ? ' worn' : ''}`);
    card.style.setProperty('--grade', GRADES[item.grade].color);
    card.append(iconCanvas(item.id, 40, 'row-icon'));
    const txt = el('div', 'ic-text');
    const pips = Array.from({ length: FORGE.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    const next = lv < FORGE.max ? `<span class="fc-next">다음 +${lv + 1} → ${bonusText(itemBonus(item, lv + 1))}</span>` : '';
    txt.innerHTML = `<b>${gradeTag(item.grade)} ${itemName(save, item)}${worn.has(item.id) ? ' <small class="fc-worn">착용 중</small>' : ''}</b>
      <span class="fc-pips">${pips}</span><span>${bonusText(itemBonus(item, lv))}</span>${next}`;
    card.append(txt);
    const ctrl = el('div', 'ic-ctrl');
    if (lv < FORGE.max) {
      const cost = forgeCost(item, lv);
      const fb = button(`🔨 +${lv + 1} 제련`, 'forge-btn', () => act.forge(item), save.money < cost);
      ctrl.append(fb);
      ctrl.append(el('small', 'forge-cost', `🪙 ${fmt(cost)} · 성공 ${Math.round(FORGE.chance[lv] * 100)}%`));
    } else ctrl.append(tag(`+${FORGE.max} 완성`));
    card.append(ctrl);
    box.append(card);
  }
  return box;
}

// =================================================================== 성장

export function renderGrow(save, sel, act) {
  const body = $('growBody');
  body.innerHTML = '';
  body.append(header('성장', save, act, '成長'));
  const grid = el('div', 'grow-grid');

  // 결기 상점: 무한 전장's 결기수정 buy permanent stacks.
  const gy = el('div', 'grow-card gyeolgi-card');
  gy.id = 'gyeolgiShop';
  const banner = el('div', 'gy-banner', `<span class="gy-gem">${img('icon/crystal', 'gy-big')}<b class="gy-have">${GEM()}${fmt(save.crystals ?? 0)}</b></span>
    <h3>결기 상점</h3><small>모든 영웅 · 무한 전장에서 모은 결기수정</small>`);
  banner.style.setProperty('--art', `url(${UI}/row/gyeolgi-banner.webp)`);
  gy.append(banner);
  for (const g of GYEOLGI) {
    const lv = save.gyeolgi?.[g.id] ?? 0;
    const cost = gyeolgiCost(g, lv);
    const row = el('div', `grow-row art-row${lv ? ' on' : ''}`);
    row.style.setProperty('--art', `url(${UI}/row/${g.id}-art.webp)`);
    row.innerHTML = `${img(`row/${g.id}-icon`, 'gr-img')}<div class="gr-text"><b>${g.name} <i>${lv}${g.max ? `/${g.max}` : ''}스택</i></b><span>스택마다 ${g.text}</span><small>${g.max ? `스택마다 결기수정 ${g.cost} · 최대 ${g.max}스택` : `다음 스택 ×${g.grow}씩 비싸져요`}</small></div>`;
    if (g.max && lv >= g.max) row.append(doneSeal());
    else row.append(button(`${GEM()}${fmt(cost)}`, 'buy-btn gy-btn', () => act.buyGyeolgi(g), (save.crystals ?? 0) < cost));
    gy.append(row);
  }
  if (!(save.crystals ?? 0) && !Object.keys(save.gyeolgi ?? {}).length) gy.append(el('p', 'hint', '♾️ 무한 전장에서는 냥 대신 결기수정이 떨어져요. 오래 버틸수록, 어려운 전장일수록 많이 모여요.'));
  grid.append(gy);

  const train = el('div', 'grow-card');
  train.append(secHead('수련', '修鍊', '모든 영웅 · 영구 성장'));
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    const [icon, effect] = TRAIN_UI[t.id] ?? ['•', t.name];
    const row = el('div', `grow-row art-row${lv ? ' on' : ''}`);
    row.style.setProperty('--art', `url(${UI}/row/${t.id}-art.webp)`);
    row.innerHTML = `${TRAIN_UI[t.id] ? img(`row/${t.id}-icon`, 'gr-img') : `<span class="gr-icon">${icon}</span>`}<div class="gr-text"><b>${t.name} <i>Lv ${lv}/${t.max}</i></b><span>${effect}</span><small>${t.desc}</small></div>`;
    row.append(lv >= t.max ? doneSeal() : priceBtn(t.price(lv), save.money, () => act.train(t)));
    train.append(row);
  }
  grid.append(train);

  const sec = el('div', 'grow-card secret-card');
  sec.append(secHead('비전', '秘傳', '영웅별 · 출진할 때 이 스킬을 들고 시작'));
  const mine = SECRETS.filter((s) => s.hero === sel.hero);
  const others = SECRETS.filter((s) => s.hero !== sel.hero);
  for (const sc of [...mine, ...others]) {
    const has = save.secrets.includes(sc.id);
    const row = el('div', `grow-row scroll-row${has ? ' on' : ''}${sc.hero !== sel.hero ? ' other' : ''}`);
    row.innerHTML = `${img(`row/scroll-${SECRET_SCROLL[sc.id] ?? 'swords'}`, 'gr-scroll')}<div class="gr-text"><b>${sc.name} <i>${HEROES[sc.hero].name}</i></b><span>${sc.desc}</span></div>`;
    row.append(has ? tag('습득', 'got-tag') : priceBtn(sc.price, save.money, () => act.learn(sc)));
    sec.append(row);
  }
  grid.append(sec);
  body.append(grid);
}

/** Which painted scroll stands for each 비전. */
const SECRET_SCROLL = { secretVajra: 'dragon', secretGwansim: 'eye', secretShin: 'swords', secretHorse: 'horse', secretFury: 'swords', secretChain: 'dragon' };

// =================================================================== 전장

/**
 * Node spots on each theme's painted map (percent of its width and height).
 * 삼한 통일 follows the road painted on the map: 갯벌 → 동수 → 병산 → 궁성 → 일리천.
 */
const MAP_POS = {
  seonamhae: [20.5, 79.5],
  gongsan: [39, 67],
  gochang: [52.4, 48],
  cheorwon: [60.8, 29],
  illicheon: [76.4, 12.5],
  // 🏔️ 양길의 등장: a winding climb from 섬강 to 북원성.
  seomgang: [80, 84],
  munmak: [60, 74],
  yeongwon: [37, 66],
  sillim: [19, 48],
  guryong: [42, 40],
  birobong: [63, 26],
  bukwon: [40, 11],
};
const MAP_W = 124; // the painted maps are 1.24 times as wide as tall

/** 보상 배율 shown for a field (stars × the field's own rewardMul). */
const rewardOf = (st) => +(REWARD_BY_STARS[st.difficulty.stars] * (st.difficulty.rewardMul ?? 1)).toFixed(1);

/** Gear grade worth wearing for each difficulty (data/meta.js GRADES). */
const REC_GRADE = { 2: 3, 3: 5, 4: 6, 5: 8, 6: 8 };

/** Red stars as on the map, or the label past ★5. */
const starRow = (st) => (st.difficulty.stars > 5 ? `<em class="hell">${st.difficulty.label}</em>` : '★'.repeat(st.difficulty.stars));

/** Dotted gold road between nodes, stopping short of each badge, with an arrowhead. */
function routeSvg(ids, save) {
  const pts = ids.map((id) => [(MAP_POS[id][0] * MAP_W) / 100, MAP_POS[id][1]]);
  let segs = '';
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay), cut = 6.5 / d;
    const open = !!save.best?.[ids[i - 1]];
    segs += `<line class="route${open ? ' open' : ''}" x1="${ax + (bx - ax) * cut}" y1="${ay + (by - ay) * cut}" x2="${bx - (bx - ax) * cut}" y2="${by - (by - ay) * cut}" marker-end="url(#arw${open ? 'O' : ''})"/>`;
  }
  return `<svg viewBox="0 0 ${MAP_W} 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <marker id="arw" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="arw"/></marker>
      <marker id="arwO" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="arw open"/></marker>
    </defs>${segs}</svg>`;
}

export function renderMap(save, sel, act) {
  const body = $('mapBody');
  body.innerHTML = '';
  body.append(header('전장', save, act, '戰場'));
  const cur = ui.mapStage ?? sel.stage;
  // Themes: 삼한 통일 · 양길의 등장 (each its own map).
  ui.mapChapter ??= chapterOf(STAGES[cur]);
  const chap = ui.mapChapter;
  const tabs = tabStrip(CHAPTERS.map((c) => {
    const ids = STAGE_ORDER.filter((id) => chapterOf(STAGES[id]) === c.id);
    const done = ids.filter((id) => save.best?.[id]).length;
    return [c.id, `${img(`icon/ch-${c.id}`, 'tab-img')}<b>${c.name}</b><small>${done}/${ids.length}</small>`];
  }), chap, (id) => {
    ui.mapChapter = id;
    renderMap(save, sel, act);
  });
  tabs.classList.add('chapter-tabs');
  body.append(tabs);
  const ids = STAGE_ORDER.filter((id) => chapterOf(STAGES[id]) === chap);
  const info = CHAPTERS.find((c) => c.id === chap);
  if (chap !== 'samhan') body.append(el('p', 'chapter-sub', `${info.icon} ${info.name} — ${info.sub}. 일곱 전장을 차례로 평정하고 북원성의 양길을 정복하라!`));

  const map = el('div', `war-map map-${chap}`);
  map.style.backgroundImage = `url(${UI}/map/${chap}.webp)`;
  map.innerHTML = routeSvg(ids, save);
  for (const id of ids) {
    const st = STAGES[id];
    const { gate, cleared } = stageInfo(save, sel, st);
    const [x, y] = MAP_POS[id];
    const n = button(`<span class="mn-no">${st.numeral}</span><span class="mn-name">${st.name}</span><span class="mn-stars">${starRow(st)}</span>`,
      `map-node${id === cur ? ' on' : ''}${cleared ? ' cleared' : ''}${gate.ok ? '' : ' locked'}`, () => {
        ui.mapStage = id;
        act.selectStage(id);
      });
    n.style.left = `${x}%`;
    n.style.top = `${y}%`;
    map.append(n);
  }
  body.append(map);

  const st = STAGES[ids.includes(cur) ? cur : ids[0]];
  const { boss, cleared } = stageInfo(save, sel, st);
  const card = el('div', 'stage-detail');
  card.style.setProperty('--art', STAGE_SCENE(st.id));
  card.innerHTML = `
    <div class="sd-head"><span class="sd-no">${st.numeral}</span><b>${st.name}</b><span class="sd-stars">${starRow(st)} <em>${st.difficulty.label}</em></span></div>
    <ul class="sd-rows">
      <li>${img('icon/sd-coin', 'sd-ic')}<span>보상</span><b>×${rewardOf(st)}</b></li>
      <li>${img('icon/sd-boss', 'sd-ic')}<span>적장</span><b>${boss.name}</b></li>
      <li>${img('icon/sd-gear', 'sd-ic')}<span>권장 장비</span><b>${st.difficulty.stars > 1 ? `${GRADES[REC_GRADE[st.difficulty.stars]].name}${st.difficulty.stars > 5 ? ' +제련' : ' 이상'}` : '없어도 OK'}</b></li>
      <li>${img('icon/sd-record', 'sd-ic')}<span>기록</span><b>${cleared ? '평정함' : '아직'}</b></li>
    </ul>`;
  card.append(button('출진 준비 ▶', 'seal-btn', () => {
    if (sel.stage !== st.id) act.selectStage(st.id);
    act.go('prep');
  }));
  body.append(card);
}

// =============================================================== 출진 준비

export function renderPrep(save, sel, act) {
  const body = $('prepBody');
  body.innerHTML = '';
  body.append(header('출진 준비', save, act, '出陣'));
  const h = HEROES[sel.hero];
  const st = STAGES[sel.stage];
  const { boss, gate } = stageInfo(save, sel, st);
  const m = metaBonus(save, h.id);

  // Switch hero right here, without going back to the 영웅 screen.
  const pick = el('div', 'prep-pick');
  for (const hh of Object.values(HEROES)) {
    const b = button('', `pp-hero${hh.id === sel.hero ? ' on' : ''}`, () => act.pickHero(hh.id), !hh.available);
    b.append(portrait(hh, 44));
    b.append(el('b', '', hh.name));
    pick.append(b);
  }
  body.append(pick);

  const card = el('div', 'prep-card');
  const top = el('div', 'prep-hero');
  top.append(portrait(h, 96));
  const t = el('div', 'hh-text');
  t.append(el('div', 'hh-name', h.name));
  t.append(el('div', 'hh-build', `${h.title} · ${h.role}`));
  top.append(t);
  card.append(top);

  const sec = (label, content, go) => {
    const row = el('div', 'prep-row');
    row.append(el('span', 'pr-label', label));
    if (typeof content === 'string') row.append(el('span', 'pr-val', content));
    else row.append(content);
    if (go) row.append(button('바꾸기', 'plain-btn small', go));
    card.append(row);
  };
  sec('장비', gearRow(save, h.id, 30), () => {
    ui.heroTab = 'gear';
    act.go('heroes');
  });
  const secrets = SECRETS.filter((s) => s.hero === h.id && save.secrets.includes(s.id)).map((s) => s.name);
  sec('비전', secrets.length ? `📜 ${secrets.join(', ')}` : '없음', () => act.go('grow'));
  sec('전장', `${starText(st.difficulty.stars)} ${st.name} · 적장 ${boss.name}`, () => act.go('map'));
  sec('전투력', `❤️ ${Math.round(h.stats.maxHp + (m.maxHp ?? 0))} · ⚔️ ×${(h.stats.might * (1 + (m.might ?? 0))).toFixed(2)} · 🛡️ ${+(h.stats.armor + (m.armor ?? 0)).toFixed(1)} (피해 −${Math.round(armorCut(h.stats.armor + (m.armor ?? 0)) * 100)}%)`);
  body.append(card);

  if (!gate.ok) {
    body.append(el('p', 'gate-msg', `🔒 출진 불가 — ${gate.text}`));
    body.append(button('🛡️ 장비 갖추러 가기', 'plain-btn', () => {
      ui.heroTab = 'gear';
      act.go('heroes');
    }));
  }
  const cleared = !!save.best?.[sel.stage];
  const lv = cleared ? nanseLevel(save.nanseCards) : 0;
  // 난세 단계: chosen on its own tab; here just what will apply.
  const nr = el('div', `prep-nanse${lv ? ' on' : ''}`);
  nr.append(el('span', 'pn-text', !cleared ? `🔥 난세 — 🔒 ${josa(st.name, '을')} 평정하면 열려요`
    : lv ? `🔥 난세 <b>${lv}단계</b> · 냥 ×${nanseRewardMul(lv).toFixed(1)}` : '🔥 난세 꺼짐 — 보통 난이도'));
  if (cleared) nr.append(button(lv ? '바꾸기' : '고르기', 'plain-btn small', () => act.go('nanse')));
  body.append(nr);
  body.append(button(lv ? `🔥 난세 ${lv}단계 출진` : '⚔️ 출진', 'seal-btn cta', act.start, !gate.ok));
}

// =================================================================== 난세

/** 🔥 난세 tab: pick the battlefield and stack hardship cards before setting out. */
export function renderNanse(save, sel, act) {
  const body = $('nanseBody');
  body.innerHTML = '';
  body.append(header('난세 단계', save, act, '亂世'));
  // Battlefield cards: only pacified ones can carry 난세.
  const row = el('div', 'nanse-stages');
  for (const id of STAGE_ORDER) {
    const st = STAGES[id];
    const ok = !!save.best?.[id];
    const best = bestNanse(save, id);
    const b = button(`<span class="ns-no">${st.numeral}${ok ? '' : '<i class="ns-lock">🔒</i>'}</span><span class="ns-text"><b>${st.name}</b><small>${ok ? (best ? `최고 ${best}단계` : '평정 완료') : '미평정'}</small></span>`,
      `ns-stage${id === sel.stage ? ' on' : ''}${ok ? '' : ' locked'}`, () => act.selectStage(id), !ok);
    b.style.setProperty('--art', STAGE_ART(id));
    row.append(b);
  }
  body.append(row);
  const cleared = !!save.best?.[sel.stage];
  body.append(nansePanel(save, sel, act, cleared));
  if (cleared) body.append(button('⚔️ 이 난세로 출진 준비', 'seal-btn cta', () => act.go('prep')));
}

/** Painted icons for the first hardship cards; the rest keep their emoji. */
const NANSE_ICON = { iron: 'nanse-iron', blade: 'nanse-blade' };

/** 🔥 난세 단계: stack hardship cards on a pacified field for more 냥 and a record. */
function nansePanel(save, sel, act, cleared) {
  const box = el('div', 'nanse-box');
  const st = STAGES[sel.stage];
  if (!cleared) {
    box.classList.add('locked');
    box.append(el('div', 'nb-head', `${img('icon/nanse-flame', 'nb-flame')}<b>난세 단계</b><span>🔒 ${josa(st.name, '을')} 평정하면 열려요</span>`));
    box.append(el('p', 'nb-note', '전장을 한 번 평정하면, 출진 전에 고난 카드를 골라 더 어려운 싸움에 도전할 수 있어요. 단계가 높을수록 냥을 더 받아요.'));
    return box;
  }
  const cards = save.nanseCards ?? {};
  const lv = nanseLevel(cards);
  const mine = bestNanse(save, sel.stage, sel.hero);
  const any = bestNanse(save, sel.stage);
  const next = NANSE_MILESTONES.find((m) => m > any);
  box.append(el('div', 'nb-head', `${img('icon/nanse-flame', 'nb-flame')}<b>난세 <em>${lv}</em><small> / ${NANSE_MAX}</small></b>
    <span>냥 ×${nanseRewardMul(lv).toFixed(1)} · ${HEROES[sel.hero].name} 최고 ${mine}단계</span>`));
  if (next) box.append(el('p', 'nb-note', `${COIN()} 이 전장에서 처음으로 난세 ${next}단계를 평정하면 돌파 보상 <b>${fmt(Math.round(milestoneBonus(next, st.difficulty.stars)))}냥</b>`));
  const list = el('div', 'nb-list');
  for (const c of NANSE_CARDS) {
    const r = Math.min(c.ranks, cards[c.id] ?? 0);
    const row = el('div', `nb-card${r ? ' on' : ''}`);
    row.append(el('span', 'nb-icon', NANSE_ICON[c.id] ? img(`icon/${NANSE_ICON[c.id]}`) : c.icon));
    const pips = c.ranks > 1 ? `<span class="nb-pips">${Array.from({ length: c.ranks }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span>` : '';
    row.append(el('div', 'nb-text', `<b>${c.name} <small>+${c.points}점${c.ranks > 1 ? ' / 단' : ''}</small></b><span>${c.desc(Math.max(1, r))}</span>${pips}`));
    const ctl = el('div', 'nb-ctl');
    ctl.append(button('−', 'nb-btn', () => act.setNanse(c.id, r - 1), r === 0));
    ctl.append(el('span', 'nb-count', String(r)));
    ctl.append(button('+', 'nb-btn', () => act.setNanse(c.id, r + 1), r >= c.ranks));
    row.append(ctl);
    list.append(row);
  }
  box.append(list);
  if (lv) box.append(button('모두 끄기', 'plain-btn small nb-clear', () => act.clearNanse()));
  return box;
}

// =================================================================== 도감

export function renderCodex(save, sel, act) {
  const body = $('codexBody');
  body.innerHTML = '';
  body.append(header('도감', save, act, '圖鑑'));
  const tabs = [['ach', '업적'], ['hero', '영웅'], ['weapon', '무기'], ['gear', '장비'], ['foe', '적'], ['record', '기록'], ['help', '도움말']];
  const strip = tabStrip(tabs.map(([id, name]) => [id, `${img(`icon/tab-${id}`, 'tab-img')}<b>${name}</b>`]), ui.codexTab, (id) => {
    ui.codexTab = id;
    renderCodex(save, sel, act);
  });
  strip.classList.add('codex-tabs');
  body.append(strip);
  const grid = el('div', 'codex-grid');
  const kills = save.codex?.kills ?? {};
  const cell = (iconNode, name, sub, locked) => {
    const c = el('div', `codex-cell${locked ? ' locked' : ''}`);
    c.append(iconNode);
    c.append(el('b', '', locked ? '???' : name));
    if (sub) c.append(el('small', '', locked ? '' : sub));
    return c;
  };

  if (ui.codexTab === 'ach') {
    body.append(achPanel(save, act));
    return;
  }
  if (ui.codexTab === 'help') {
    const box = el('div', 'help-box');
    const replay = button('▶ 첫 판 튜토리얼 다시 보기', 'plain-btn small replay-btn');
    replay.id = 'tutorReplay';
    box.append(replay);
    for (const h of HELP) box.append(el('div', 'help-card', `<h4>${h.icon} ${h.title}</h4><ul>${h.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`));
    body.append(box);
    return;
  }
  if (ui.codexTab === 'hero') {
    for (const h of Object.values(HEROES)) grid.append(cell(portrait(h, 64), h.name, `${h.title} · ${h.role}`));
  } else if (ui.codexTab === 'weapon') {
    for (const h of Object.values(HEROES)) {
      for (const wid of [h.weapon, ...(h.subWeapons ?? [])]) {
        const W = WEAPONS[wid];
        const ic = iconCanvas(wid, 48, 'row-icon');
        grid.append(cell(ic, W.levels[0].name, `${h.name} · ${W.levels.map((l) => l.name).slice(1).join(' → ')}`));
      }
    }
  } else if (ui.codexTab === 'gear') {
    for (const it of EQUIPMENT) {
      const has = save.owned.includes(it.id);
      const c = cell(iconCanvas(has ? it.id : `empty:${it.slot}`, 48, 'row-icon'), it.name, `${HEROES[it.hero].name} · ${GRADES[it.grade].name} ${SLOTS.find((s) => s.id === it.slot).name}`, !has);
      c.style.setProperty('--grade', GRADES[it.grade].color);
      grid.append(c);
    }
  } else if (ui.codexTab === 'foe') {
    const foes = [
      ...Object.values(ENEMIES).filter((e) => e.behavior !== 'static'),
      ...Object.values(BOSSES).filter((b) => b.look && !b.minion),
    ];
    for (const f of foes) {
      const n = kills[f.id] ?? 0;
      const cv = el('canvas', 'foe-icon');
      cv.width = cv.height = 112;
      cv.style.width = cv.style.height = '56px';
      const ctx = cv.getContext('2d');
      ctx.translate(56, 70);
      ctx.scale(2, 2);
      drawUnit(ctx, f.look, 0, 0, 12, 0.35, { scale: 1 });
      if (!n) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(30, 24, 40, 0.9)';
        ctx.fillRect(0, 0, 112, 112);
      }
      grid.append(cell(cv, f.name, f.epithet ? `적장 · 격파 ${n}` : `처치 ${fmt(n)}`, !n));
    }
  } else {
    body.append(recordPanel(save, act));
    return;
  }
  body.append(grid);
}

/** Painted badges for some 업적; the rest show their emoji in the same gold ring. */
const ACH_ART = new Set(['firstRun', 'firstWin', 'runs30', 'star2', 'star3', 'star4']);
const GROUP_ICON = { start: img('icon/sec-start', 'rh-img'), war: img('icon/sec-war', 'rh-img') };

/** 업적: progress per goal, with a 받기 button once a reward is waiting. */
function achPanel(save, act) {
  const box = el('div', 'ach-box');
  const done = ACHIEVEMENTS.filter((a) => save.ach?.[a.id]).length;
  const ready = ACHIEVEMENTS.filter((a) => save.ach?.[a.id] === 'ready');
  const waiting = ready.reduce((n, a) => n + a.reward, 0);
  const top = el('div', 'ach-top');
  top.append(el('div', 'ach-count', `<span class="ach-num"><b>${done}</b> / ${ACHIEVEMENTS.length} 달성</span>
    <span class="ach-meter"><i style="width:${(done / ACHIEVEMENTS.length) * 100}%"></i></span>`));
  box.append(top);
  if (ready.length) box.append(button(`🎁 모두 받기 +${fmt(waiting)}냥`, 'ach-claim-all', () => act.claimAllAch()));
  let n = 0;
  for (const [gid, gname] of ACH_GROUPS) {
    const [icon, ...words] = gname.split(' ');
    box.append(ruleHead(GROUP_ICON[gid] ?? `<span class="rh-emoji">${icon}</span>`, words.join(' ')));
    for (const a of ACHIEVEMENTS.filter((x) => x.group === gid)) {
      const st = save.ach?.[a.id];
      const row = el('div', `ach-card${st === 'ready' ? ' ready' : st === 'done' ? ' done' : ''}`);
      row.style.setProperty('--art', `url(${UI}/ach/art${n++ % 6}.webp)`);
      row.append(el('span', 'ach-icon', ACH_ART.has(a.id) ? img(`ach/${a.id}`) : `<em>${a.icon}</em>`));
      const [now, need] = progressOf(a, save);
      const bar = a.goal && !st ? `<span class="ach-prog"><i style="width:${Math.min(100, (now / need) * 100)}%"></i><em>${fmt(Math.min(now, need))} / ${fmt(need)}</em></span>` : '';
      row.append(el('div', 'ach-text', `<b>${a.name}</b><small>${a.desc}</small>${bar}`));
      if (st === 'ready') row.append(button(`받기<br><small>+${fmt(a.reward)}</small>`, 'ach-claim', () => act.claimAch(a.id)));
      else row.append(el('span', `ach-reward${st === 'done' ? ' got' : ''}`, st === 'done' ? '<i class="ach-check">✓</i>' : `${COIN()}${fmt(a.reward)}`));
      box.append(row);
    }
  }
  return box;
}

/** 기록: lifetime numbers, battlefield records and the save code. */
function recordPanel(save, act) {
  const box = el('div', 'record-box');
  const c = save.codex ?? {};
  const totalKills = Object.values(c.kills ?? {}).reduce((a, b) => a + b, 0);
  box.append(el('ul', 'sd-rows', `
    <li><span>⚔️ 출진</span><b>${fmt(c.runs ?? 0)}회</b></li>
    <li><span>🏆 승리</span><b>${fmt(c.wins ?? 0)}회</b></li>
    <li><span>💀 처치한 적</span><b>${fmt(totalKills)}</b></li>
    <li><span>🪙 모은 냥</span><b>${fmt(c.earned ?? 0)}</b></li>
    ${STAGE_ORDER.map((id) => `<li><span>${STAGES[id].numeral} ${STAGES[id].name}</span><b>${save.best?.[id] ? '평정' : '—'}</b></li>`).join('')}`));

  const rec = el('div', 'record');
  rec.innerHTML = `
    <div class="record-card">
      <h4>내 기록 내보내기</h4>
      <p>이 코드를 복사해 두면 다른 기기나 브라우저에서 그대로 이어서 할 수 있어요.</p>
      <textarea id="saveCodeOut" class="save-code" readonly rows="3"></textarea>
      <div class="record-btns"><button type="button" class="buy-btn" id="saveCopy">코드 복사</button></div>
    </div>
    <div class="record-card">
      <h4>기록 불러오기</h4>
      <p>다른 곳에서 복사한 코드를 붙여 넣으세요. <b>지금 이 브라우저의 기록은 덮어써져요.</b></p>
      <textarea id="saveCodeIn" class="save-code" rows="3" placeholder="SAMHAN1-로 시작하는 코드"></textarea>
      <div class="record-btns"><button type="button" class="wear-btn" id="saveLoad">불러오기</button></div>
      <p id="saveMsg" class="record-msg" role="status"></p>
    </div>`;
  box.append(rec);
  const out = rec.querySelector('#saveCodeOut');
  out.value = act.exportCode();
  out.addEventListener('focus', () => out.select());
  const msg = rec.querySelector('#saveMsg');
  rec.querySelector('#saveCopy').addEventListener('click', async () => {
    out.select();
    let ok = false;
    try {
      await navigator.clipboard.writeText(out.value);
      ok = true;
    } catch {
      try {
        ok = document.execCommand('copy');
      } catch {}
    }
    msg.textContent = ok ? '복사했어요. 메모장이나 메신저에 붙여 넣어 보관하세요.' : '자동 복사가 막혀 있어요. 위 칸을 길게 눌러 직접 복사해 주세요.';
    msg.className = 'record-msg ok';
  });
  // Two steps: the first press shows what the code holds, the second overwrites.
  const load = rec.querySelector('#saveLoad');
  const input = rec.querySelector('#saveCodeIn');
  let armed = false;
  input.addEventListener('input', () => {
    armed = false;
    load.textContent = '불러오기';
    load.className = 'wear-btn';
  });
  load.addEventListener('click', () => {
    const r = act.importCode(input.value, armed);
    if (r.ok) {
      act.toast(r.message, true);
      return;
    }
    armed = !!r.needConfirm;
    load.textContent = armed ? '정말 덮어쓰기' : '불러오기';
    load.className = armed ? 'buy-btn' : 'wear-btn';
    msg.textContent = r.message;
    msg.className = `record-msg ${armed ? 'warn' : 'fail'}`;
  });
  return box;
}

/** Lets other screens open the hero page on a given tab. */
export function setHeroTab(tab, slot) {
  ui.heroTab = tab;
  if (slot) ui.slot = slot;
}

/** Opens the 도감 on its 기록 tab (save code). */
export function setCodexTab(tab) {
  ui.codexTab = tab;
}
