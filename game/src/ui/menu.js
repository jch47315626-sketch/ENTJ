import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER, CHAPTERS, chapterOf } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMIES } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import {
  SLOTS, EQUIPMENT, SECRETS, REWARD_BY_STARS, GRADES, FORGE,
  forgeCost, gradeOpen, itemBonus, bonusText, metaBonus, entryCheck, armorCut,
} from '../data/meta.js';
import { ACHIEVEMENTS, ACH_GROUPS, progressOf } from '../data/achievements.js';
import { heroUltimates } from '../data/upgrades.js';
import { GYEOLGI, gyeolgiCost } from '../data/gyeolgi.js';
import { SPIRITS, SPIRIT_LIST, SPIRIT_GRADES, GACHA, STAR_DUPES, MAX_STARS, SASIN_STAR_ESSENCE, COMBOS, combosOf, companionSlots, spiritOf, dupesForNext, FIRST_SPIRIT_RUNS, altarRunsDone } from '../data/spirits.js';
import { GUARDIANS, ALTAR_TICKETS, ESSENCE_PER_SASIN, ALTAR_TIERS, ALTAR_MAX_TIER, guardianOf, dayNumber, refreshAltar, altarTierOpen, wispWorth, clearBonus } from '../data/altar.js';
import { ENDLESS_MAPS, ENDLESS_MAP_ORDER, endlessMapOpen, endlessMapOf, LAYER, endlessCrystals } from '../data/endless.js';
import { staminaOf, staminaText, staminaWait, endlessLeft, ENDLESS_PER_DAY } from '../data/entries.js';
import { josa } from '../core/korean.js';
import { lineText, lineMax, engraveCost } from '../data/gearOptions.js';
import { HELP } from '../data/help.js';
import { codexEntry, FOES, GENERALS } from '../data/codexTiers.js';
import { NANSE_CARDS } from '../data/nanse.js';
import { TRIAL, trialFor, trialDone, ATTR_ICON, ATTR_NAME } from '../data/trial.js';
import { untilTomorrow } from '../data/daily.js';
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

// Remembered between renders: which tab or card is open on each screen.
const ui = { heroTab: 'gear', growTab: 'secret', slot: 'head', codexTab: 'hero', mapStage: null };

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
/** Section title in brush strokes with a red seal, as on the 비전 board. */
const sealOf = (hanja) => `<i class="title-seal">${[...hanja].join('<br>')}</i>`;
const secHead = (title, seal, sub) => el('div', 'sec-head', `<b>${title}</b>${seal ? sealOf(seal) : ''}${sub ? `<small>${sub}</small>` : ''}`);
/** Centered heading between gold rules (도감 groups). */
const ruleHead = (icon, text) => el('h4', 'rule-head', `<span class="rh-line"></span>${icon}<b>${text}</b><span class="rh-line"></span>`);
/**
 * 꾹 누르기: hold a card to see its full description; letting go hides it.
 * A hold never counts as a tap, so holding a buy button does not buy.
 */
const HOLD_MS = 380;
let tipEl = null;
function holdTip(node, html) {
  let timer = 0, start = null, shown = false;
  const hide = () => {
    clearTimeout(timer);
    if (tipEl) tipEl.hidden = true;
  };
  node.classList.add('has-tip');
  node.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
    shown = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      shown = true;
      showTip(node, typeof html === 'function' ? html() : html);
    }, HOLD_MS);
  });
  node.addEventListener('pointermove', (e) => {
    // Scrolling the list is not a hold.
    if (start && !shown && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(timer);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) node.addEventListener(ev, hide);
  node.addEventListener('click', (e) => {
    if (!shown) return;
    shown = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  node.addEventListener('contextmenu', (e) => e.preventDefault());
  return node;
}
function showTip(node, html) {
  if (!tipEl) {
    tipEl = el('div', 'hold-tip');
    tipEl.setAttribute('role', 'tooltip');
    document.body.append(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.hidden = false;
  const r = node.getBoundingClientRect();
  const w = Math.min(340, window.innerWidth - 24);
  tipEl.style.width = `${w}px`;
  tipEl.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
  const h = tipEl.offsetHeight;
  // Above the finger if there is room, otherwise below the card.
  tipEl.style.top = `${r.top - h - 10 > 8 ? r.top - h - 10 : Math.min(window.innerHeight - h - 8, r.bottom + 10)}px`;
}
/** Tip body: a title, then lines. */
const tipHtml = (title, lines) => `<b class="ht-title">${title}</b>${lines.filter(Boolean).map((l) => `<p>${l}</p>`).join('')}`;
const holdHint = () => el('p', 'hold-hint', '💡 카드를 꾹 누르고 있으면 자세한 설명이 나와요');

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
  h.append(purse(save));
  return h;
}

/** The same purse on every screen: 냥, and 영주 · 결기수정 once the player has met them. */
function purse(save) {
  const box = el('span', 'purse');
  box.append(el('span', 'coin-pill', `${COIN()}<b>${fmt(save.money)}</b>`));
  if ((save.yeongju ?? 0) > 0 || (save.altarRuns ?? 0) > 0) box.append(el('span', 'coin-pill yj', `🔮<b>${fmt(save.yeongju ?? 0)}</b>`));
  if ((save.crystals ?? 0) > 0 || Object.keys(save.gyeolgi ?? {}).length) box.append(el('span', 'coin-pill gem', `💎<b>${fmt(save.crystals ?? 0)}</b>`));
  if ((save.attrStones ?? 0) > 0) box.append(el('span', 'coin-pill attr', `${ATTR_ICON}<b>${fmt(save.attrStones)}</b>`));
  return box;
}

// ------------------------------------------------------------ 메뉴 묶음


/** 💪 강화: 장비 · 제련 · 비전 · 결기 · 영물 (영물 once the altar has been tried). */
const POWER_TABS = [['gear', '🛡️ 장비', 'heroes'], ['forge', '🔨 제련', 'heroes'], ['secret', '📜 비전', 'grow'], ['gyeolgi', '💎 결기', 'grow'], ['spirit', '🐾 영물', 'spirit']];
export const spiritOpen = (save) => (save.altarRuns ?? 0) > 0 || Object.keys(save.spirits ?? {}).length > 0;
function powerTabs(save, act, current) {
  const tabs = POWER_TABS.filter(([id]) => id !== 'spirit' || spiritOpen(save));
  const strip = tabStrip(tabs.map(([id, name]) => [id, name]), current, (id) => goPower(act, id));
  strip.classList.add('power-tabs');
  return strip;
}
/** Opens one 강화 tab (whichever screen holds it). */
export function goPower(act, id) {
  const t = POWER_TABS.find((x) => x[0] === id) ?? POWER_TABS[0];
  if (t[2] === 'heroes') ui.heroTab = id;
  if (t[2] === 'grow') ui.growTab = id;
  act.go(t[2]);
}

/** The three heroes to choose between (장비 · 제련 · 비전 are per hero). */
function heroPicker(save, sel, act) {
  const pick = el('div', 'hero-pick');
  for (const h of Object.values(HEROES)) {
    const b = button('', `hp-card${h.id === sel.hero ? ' on' : ''}`, () => act.pickHero(h.id), !h.available);
    b.append(portrait(h, 56));
    b.append(el('span', 'hp-name', h.name));
    b.append(el('span', 'hp-role', h.role));
    pick.append(b);
  }
  return pick;
}

/** Banner colour behind each hero's portrait (as on the key art's flags). */
const HERO_BG = { wanggeon: ['#4f7fd8', '#16285a'], gyeonhwon: ['#d8513e', '#5a120c'], gungye: ['#f2c860', '#7a5414'] };

/** A hero's bust, drawn from their model, in a round gold frame. */
function portrait(hero, px) {
  const c = el('canvas', 'portrait bust');
  const W = (c.width = c.height = px * 2);
  c.style.width = c.style.height = `${px}px`;
  const ctx = c.getContext('2d');
  const [hi, lo] = HERO_BG[hero.id] ?? ['#6e5634', '#1a120c'];
  const g = ctx.createRadialGradient(W * 0.5, W * 0.35, W * 0.05, W * 0.5, W * 0.5, W * 0.7);
  g.addColorStop(0, hi);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, W);
  const r = W * 0.42;
  drawUnit(ctx, { ...hero.look, body: hero.look.robe }, W * 0.5, W * 0.58 + r * 0.66, r, 0.35, { scale: 1 });
  return c;
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
  $('homeYeongju').textContent = fmt(save.yeongju ?? 0);
  $('homeCrystals').textContent = fmt(save.crystals ?? 0);
  $('homeAttr').textContent = fmt(save.attrStones ?? 0);
  $('homeYeongjuPill').hidden = !((save.yeongju ?? 0) > 0 || (save.altarRuns ?? 0) > 0);
  $('homeCrystalPill').hidden = !((save.crystals ?? 0) > 0 || Object.keys(save.gyeolgi ?? {}).length);
  const body = $('homeBody');
  body.innerHTML = '';

  // 영웅 + 고른 전장 + 출진, all in one card.
  const h = HEROES[sel.hero];
  const st = STAGES[sel.stage];
  const { boss, gate } = stageInfo(save, sel, st);
  const card = el('div', 'home-main');
  const who = button('', 'hm-hero', () => act.go('heroes'));
  who.append(portrait(h, 78));
  const wt = el('div', 'hm-who', `<b>${h.name}</b><small>${h.title}</small>`);
  wt.append(gearRow(save, h.id, 18));
  who.append(wt);
  card.append(who);
  card.append(button(`<span class="hs-stars">${starText(st.difficulty.stars)}</span><span class="hm-stage">${st.numeral} ${st.name}</span><small>보상 ×${rewardOf(st)} · 적장 ${boss.name} · 전장 바꾸기 ›</small>`, 'hm-field', () => act.go('map')));
  if (!gate.ok) card.append(el('p', 'gate-msg', `🔒 ${gate.text}`));
  card.append(button('⚔️ 출진하기', 'seal-btn cta', () => act.go('prep')));
  card.append(staminaLine(save));
  body.append(card);

  // 던전: one line each; the full card opens in a sheet.
  const list = el('div', 'dg-list');
  const tr = trialFor(save);
  const tDone = trialDone(save);
  list.append(dungeonRow('🔥', '일일 던전', `난세 ${tr.level}단계 · ${STAGES[tr.stageId].name}`,
    tDone ? `✅ 오늘 도전함 · ${untilTomorrow()} 뒤 새 던전` : `하루 1번 · ${ATTR_ICON} ${ATTR_NAME} +${fmt(tr.reward)}`, !tDone, () => openSheet('trial', save, sel, act)));
  const a = refreshAltar(save);
  const g = GUARDIANS[guardianOf()];
  list.append(dungeonRow('🏯', '사신의 제단', `${g ? `${g.icon} ${g.name}` : '✨ 사신의 날'} · ${Math.max(1, save.altarTier ?? 1)}단계`,
    `🎟️ 입장권 ${a.tickets}/${ALTAR_TICKETS.cap}${save.spiritGift ? '' : ` · 🐾 ${Math.max(1, FIRST_SPIRIT_RUNS - altarRunsDone(save))}판 더 돌면 첫 영물`}`, a.tickets > 0, () => openSheet('altar', save, sel, act)));
  const em = ENDLESS_MAPS[endlessMapOf(save)];
  const best = save.endless?.[em.id];
  const mmss = (t) => `${Math.floor(t / 60)}분 ${String(Math.floor(t % 60)).padStart(2, '0')}초`;
  const eLeft = endlessLeft(save);
  list.append(dungeonRow('♾️', '무한 전장', `${h.name} · ${em.icon} ${em.name}`,
    `♾️ 오늘 ${eLeft}/${ENDLESS_PER_DAY}번${best?.cleared ? ` · 🏆 최단 ${mmss(best.time)}` : ''} · 💎 토벌 ${fmt(endlessCrystals(em.layer, { won: true }))}+`, eLeft > 0, () => openSheet('endless', save, sel, act)));
  body.append(list);
  if (ui.sheet === 'altar' || ui.sheet === 'endless' || ui.sheet === 'trial') openSheet(ui.sheet, save, sel, act);
  else ui.sheet = null;
}

/** One line of the home's dungeon list. */
function dungeonRow(icon, name, line, status, glow, onOpen) {
  const b = button(`<span class="dg-icon">${icon}</span><span class="dg-text"><b>${name}</b><span>${line}</span><small>${status}</small></span><span class="dg-go">›</span>`, `dg-row${glow ? ' glow' : ''}`, onOpen);
  return b;
}

/** ⚔️ 출진 횟수 n/5 as pips, with the live countdown to the next one. */
function staminaLine(save) {
  const st = staminaOf(save);
  const line = el('div', `stamina-line${st.n ? '' : ' empty'}`);
  const pips = Array.from({ length: st.max }, (_, i) => `<i class="${i < st.n ? 'on' : ''}"></i>`).join('');
  const wait = staminaWait(save);
  line.innerHTML = `<b>⚔️ 출진 횟수</b><span class="st-pips">${pips}</span><b class="st-n">${st.n}/${st.max}</b><small data-stamina-wait>${wait ? `${wait} 뒤 +1` : '가득'}</small>`;
  line.title = '일반 전장은 한 번에 5번까지, 30분마다 1번씩 회복돼요';
  return line;
}

/** A dungeon's full card in a sheet over the home screen (kept open across refreshes). */
function openSheet(kind, save, sel, act) {
  ui.sheet = kind;
  document.querySelector('.sheet-back')?.remove();
  const close = () => {
    ui.sheet = null;
    back.remove();
  };
  // Leaving for a battle or another menu closes the sheet.
  const leave = (fn) => (...args) => {
    close();
    fn(...args);
  };
  const sAct = { ...act, go: leave(act.go), startDaily: leave(act.startDaily), startEndless: leave(act.startEndless), startAltar: leave(act.startAltar), startTrial: leave(act.startTrial) };
  const back = el('div', 'sheet-back');
  const sheet = el('div', 'sheet');
  const x = button('✕', 'sheet-x', close);
  x.setAttribute('aria-label', '닫기');
  sheet.append(x);
  sheet.append(kind === 'trial' ? trialCard(save, sel, sAct) : kind === 'altar' ? altarCard(save, sel, sAct) : endlessCard(save, sel, sAct));
  back.append(sheet);
  back.addEventListener('click', (e) => e.target === back && close());
  // On top of everything (the bottom menu included) until closed.
  $('app').append(back);
}

/** 🔥 일일 던전: today's random 난세 패 on the field two below the furthest pacified one; once a day. */
function trialCard(save, sel, act) {
  const tr = trialFor(save);
  const st = STAGES[tr.stageId];
  const h = HEROES[sel.hero];
  const done = trialDone(save);
  const card = el('div', `trial-card${done ? ' done' : ''}`);
  card.append(el('div', 'dc-head', `<b>🔥 일일 던전</b><span>${done ? `새 던전까지 ${untilTomorrow()}` : '하루 1번'}</span>`));
  card.append(el('div', 'tc-level', `<b>난세 <em>${tr.level}</em>단계</b><span>${starText(st.difficulty.stars)} ${st.numeral} ${st.name}</span>`));
  const who = el('div', 'dc-who');
  who.append(portrait(h, 48));
  who.append(el('div', 'dc-where', `<b>${josa(h.name, '으로')} 출전</b><span>마지막으로 평정한 전장보다 두 단계 아래</span>`));
  card.append(who);
  const list = el('ul', 'tc-cards');
  for (const c of NANSE_CARDS) {
    const r = tr.cards[c.id];
    if (r) list.append(el('li', '', `<span>${c.icon}</span><b>${c.name}${c.ranks > 1 ? ` ${'Ⅰ Ⅱ Ⅲ'.split(' ')[r - 1]}` : ''}</b><small>${c.desc(r)}</small>`));
  }
  card.append(list);
  card.append(el('p', 'ec-rule', `오늘의 난세 패는 날마다 무작위로 바뀌어요. 평정하면 <b>${ATTR_ICON} ${ATTR_NAME} ${fmt(tr.reward)}개</b>, 패퇴해도 30%를 받아요.${tr.level >= TRIAL.relicFrom ? ` <b>🌟 난세 ${TRIAL.relicFrom}단계 이상 — 평정하면 신물이 나올 수 있어요!</b>` : ''}`));
  const btn = button(done ? (save.trial?.cleared ? '✅ 오늘 평정 완료' : '오늘 도전 끝 · 내일 다시') : '🔥 일일 던전 도전', 'trial-btn', () => act.startTrial(), done);
  card.append(btn);
  return card;
}

/** 🏯 사신의 제단: today's guardian (or a choice on 사신의 날), 단계, entries left, 영주 and 사신 정수. */
function altarCard(save, sel, act) {
  const a = refreshAltar(save);
  const gid = guardianOf();
  const g = GUARDIANS[gid];
  let tier = Math.max(1, Math.min(ALTAR_MAX_TIER, save.altarTier ?? 1));
  while (tier > 1 && !altarTierOpen(save, tier)) tier--;
  const card = el('div', 'altar-card');
  card.append(el('div', 'dc-head', `<b>🏯 사신의 제단</b><span>입장권 <b>${a.tickets}</b> / ${ALTAR_TICKETS.cap} · 하루 ${ALTAR_TICKETS.perDay}장</span>`));
  card.append(el('p', 'ac-guard', g
    ? `오늘의 수호 영수 <b style="color:${g.color}">${g.icon} ${g.name}</b> <small>(${g.dir}녘 · ${g.trait})</small>`
    : `<b>✨ 사신의 날</b> — 수호 영수를 골라 도전해요. 오늘 첫 평정에 <b>사신 정수</b>!`));
  card.append(el('div', 'ac-purse', `<span>🔮 영주 <b>${fmt(save.yeongju ?? 0)}</b></span><span>✨ 사신 정수 <b>${fmt(save.essence ?? 0)}</b> / ${ESSENCE_PER_SASIN}</span>`));
  // 단계: ◀ n단계 ▶, with what it borrows and pays.
  const T = ALTAR_TIERS[tier];
  const row = el('div', 'ac-tier');
  row.append(button('◀', 'ac-step', () => act.setAltarTier(tier - 1), tier <= 1));
  row.append(el('div', 'ac-tier-mid', `<b>${tier}단계</b><small>${STAGES[T.base].name}${T.mul > 1 ? ' · 강화' : ''} · 영기 ×${wispWorth(tier).toFixed(1)} · 평정 +${clearBonus(tier)}</small>`));
  const nextOpen = altarTierOpen(save, tier + 1);
  row.append(button('▶', 'ac-step', () => act.setAltarTier(tier + 1), !nextOpen));
  card.append(row);
  if (tier < ALTAR_MAX_TIER && !nextOpen) {
    const nb = ALTAR_TIERS[tier + 1].base;
    card.append(el('p', 'ac-lock', (save.altarBest ?? 0) < tier ? `🔒 ${tier}단계를 평정하면 ${tier + 1}단계가 열려요` : `🔒 ${tier + 1}단계: 전장 「${STAGES[nb].name}」을 먼저 평정하세요`));
  }
  if (!save.spiritGift) card.append(el('p', 'ac-lock', `🐾 제단을 <b>${Math.max(1, FIRST_SPIRIT_RUNS - altarRunsDone(save))}판</b> 더 돌면 첫 영물이 찾아와요`));
  card.append(button(`🐾 영물 뽑기·동행 <small>영물 ${Object.keys(save.spirits ?? {}).length}/${SPIRIT_LIST.length}</small>`, 'plain-btn small ac-spirit', () => goPower(act, 'spirit')));
  card.append(el('p', 'ec-rule', `${josa(HEROES[sel.hero].name, '으로')} 출전 · 떠도는 <b>영기</b>를 모으면 판이 끝날 때 <b>영주</b>가 돼요. 2분 30초 뒤 수호 영수를 쓰러뜨리면 보너스!`));
  const none = a.tickets <= 0;
  if (g) card.append(button(none ? '🎟️ 오늘의 입장권을 다 썼어요' : `${g.icon} ${g.name}의 제단 입장`, 'altar-btn go', () => act.startAltar(gid, tier), none));
  else {
    const pick = el('div', 'ac-pick');
    for (const G of Object.values(GUARDIANS)) {
      const b = button(`${G.icon}<b>${G.name}</b><small>${G.trait}</small>`, 'ac-guardian', () => act.startAltar(G.id, tier), none);
      b.style.setProperty('--gc', G.color);
      pick.append(b);
    }
    card.append(pick);
    if (none) card.append(el('p', 'ac-lock', '🎟️ 오늘의 입장권을 다 썼어요'));
  }
  return card;
}

/**
 * ♾️ 무한 전장: its own maps (◀ ▶ to browse), the chosen hero, best time per map.
 * The card opens on the map played last; browsing only changes what is shown
 * until a run is started there.
 */
function endlessCard(save, sel, act) {
  const order = ENDLESS_MAP_ORDER;
  const id = ui.endlessView && ENDLESS_MAPS[ui.endlessView] ? ui.endlessView : endlessMapOf(save);
  const m = ENDLESS_MAPS[id];
  const i = order.indexOf(id);
  const open = endlessMapOpen(save, id);
  const h = HEROES[sel.hero];
  const best = save.endless?.[id];
  const mmss = (s) => `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, '0')}초`;
  const view = (to) => {
    ui.endlessView = to;
    act.refresh();
  };
  const card = el('div', 'endless-card');
  const left = endlessLeft(save);
  card.append(el('div', 'dc-head', `<b>♾️ 무한 전장</b><span>오늘 남은 도전 <b>${left}</b> / ${ENDLESS_PER_DAY}</span>`));
  // Map picker: ◀ map ▶, with its rank and whether it is the one played last.
  const row = el('div', 'ac-tier ec-map');
  row.append(button('◀', 'ac-step', () => view(order[i - 1]), i <= 0));
  const last = id === endlessMapOf(save) && save.endlessMap ? ' · 마지막 도전' : '';
  row.append(el('div', 'ac-tier-mid', `<b>${m.icon} ${m.name}</b><small>${m.place} · 적 강함 ×${LAYER.hard ** (m.layer - 1)} · 💎 토벌 ${fmt(endlessCrystals(m.layer, { won: true }))}+${last}</small>`));
  row.append(button('▶', 'ac-step', () => view(order[i + 1]), i >= order.length - 1));
  card.append(row);
  const dots = el('div', 'ec-dots');
  order.forEach((mid, k) => {
    const d = el('i', `${k === i ? 'on' : ''}${endlessMapOpen(save, mid) ? '' : ' locked'}`);
    dots.append(d);
  });
  card.append(dots);
  card.append(el('p', 'ec-rule', m.intro));
  if (!open) card.append(el('p', 'ac-lock', `🔒 전장 「${STAGES[m.unlockAfter].name}」을 평정하면 열려요`));
  const who = el('div', 'dc-who');
  who.append(portrait(h, 48));
  who.append(el('div', 'dc-where', `<b>${josa(h.name, '으로')} 출전</b><span>적장 ${m.bosses.map((b) => BOSSES[b].name).join(' · ')} 중 하나</span>`));
  card.append(who);
  card.append(el('p', 'ec-rule', '적이 더 빠르고 많아요. <b>3분</b>을 버티면 적장이 나타나고, 쓰러뜨리면 <b>토벌</b> — 🎰 황금 룰렛을 돌려 <b>💎 결기수정</b>을 받아요. 한 층 내려갈 때마다 적은 2배 강해지고 결기수정은 5배. 적장을 못 잡으면 최대 10%만. <b>⚡ 한 자리에 20초 머물면 신의 분노!</b>'));
  card.append(el('p', 'ec-best', best?.cleared
    ? `🏆 최단 토벌 <b>${mmss(best.time)}</b> · ${HEROES[best.hero]?.name ?? ''}`
    : '아직 토벌하지 못했어요 — 첫 토벌에 도전해 보세요!'));
  const btns = el('div', 'ec-btns');
  btns.append(button('👑 영웅 바꾸기', 'plain-btn small', () => act.go('heroes')));
  btns.append(button(!open ? '🔒 잠긴 맵' : left > 0 ? `♾️ 도전하기 · ${left}/${ENDLESS_PER_DAY}` : '오늘 도전 끝 · 내일 다시', 'endless-btn', () => {
    ui.endlessView = null;
    act.startEndless(id);
  }, !open || left <= 0));
  card.append(btns);
  return card;
}


// =================================================================== 영웅

export function renderHeroes(save, sel, act) {
  const body = $('heroesBody');
  body.innerHTML = '';
  body.append(header('강화', save, act, '強化'));
  if (ui.heroTab !== 'forge') ui.heroTab = 'gear';
  body.append(powerTabs(save, act, ui.heroTab));
  body.append(heroPicker(save, sel, act));

  const h = HEROES[sel.hero];
  if (ui.heroTab === 'forge') {
    body.append(holdHint());
    body.append(forgePanel(save, h, act));
    return;
  }
  const about = el('div', 'style-card');
  about.innerHTML = `<small>${h.title} · ${h.role}</small><p>${h.blurb}</p>
    <small class="kit">고유기 <b>${SPECIALS[h.special].name}</b> · 무기 ${WEAPONS[h.weapon].levels.map((w) => w.name).join(' → ')}</small>`;
  body.append(about);
  // 궁극기: every hero has three; each shows what unlocks it.
  const ults = heroUltimates(h);
  const ultCard = el('div', 'ult-card');
  ultCard.append(el('b', 'ult-title', `🌟 궁극기 ${ults.length}`));
  for (const u of ults) {
    const row = el('div', 'ult-row', `<b>${u.name}</b><span class="ult-need">${u.need.map((n) => `☐ ${n}`).join(' · ')}</span><small>${u.desc}</small>`);
    ultCard.append(holdTip(row, tipHtml(`🌟 ${u.name}`, [u.desc, `조건: ${u.need.join(' + ')}`, '조건을 다 채운 뒤 레벨업하면 진화 카드가 꼭 나와요.'])));
  }
  body.append(ultCard);
  body.append(holdHint());
  body.append(gearPanel(save, h, act));
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
  const sub = item.relic && !owned ? `🔥 일일 던전에서 난세 ${TRIAL.relicFrom}단계 이상을 평정하면 얻을 수 있어요` : open || owned ? bonusText(itemBonus(item, lv)) : `★${GRADES[item.grade].needStars} 전장을 깨면 풀려요`;
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
    ctrl.append(tag('🔥 일일 던전', 'locked'));
  } else if (open) {
    ctrl.append(priceBtn(item.price, save.money, () => act.buy(item)));
  } else {
    ctrl.append(tag('🔒', 'locked'));
  }
  card.append(ctrl);
  if (opts) card.append(opts); // full-width row under the controls
  const G = GRADES[item.grade];
  holdTip(card, () => tipHtml(`${gradeTag(item.grade)} ${open || owned ? itemName(save, item) : '???'}`, [
    `${h.name} 전용 · ${SLOTS.find((s) => s.id === item.slot).name}`,
    open || owned ? `기본 능력: ${bonusText(itemBonus(item, lv))}${lv ? ` (제련 +${lv} 포함)` : ''}` : '',
    item.note ? item.note : '',
    lines.length ? `옵션: ${lines.map(lineText).join(' · ')}` : owned ? '' : '얻을 때 무작위 옵션이 1~4줄 붙어요 (진품 이상은 비기가 붙기도 해요).',
    owned ? (worn ? '지금 차고 있어요' : '가진 장비 — 눌러서 착용') : item.relic ? `일일 던전에서 난세 ${TRIAL.relicFrom}단계 이상을 평정하면 얻을 수 있어요.`
      : open ? `값: ${fmt(item.price)}냥` : `★${G.needStars} 전장을 평정하면 상점에 나와요.`,
  ]));
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
    holdTip(card, () => tipHtml(`🔨 ${itemName(save, item)}`, [
      `지금: ${bonusText(itemBonus(item, lv))}`,
      lv < FORGE.max ? `+${lv + 1} 성공 시: ${bonusText(itemBonus(item, lv + 1))}` : '최대 +5까지 제련했어요',
      lv < FORGE.max ? `비용 ${fmt(forgeCost(item, lv))}냥 · 성공 확률 ${Math.round(FORGE.chance[lv] * 100)}% — 실패해도 장비는 그대로예요` : '',
      `단계마다 기본 능력치 +${Math.round(FORGE.step * 100)}%`,
    ]));
    box.append(card);
  }
  return box;
}

// =================================================================== 성장

export function renderGrow(save, sel, act) {
  const body = $('growBody');
  body.innerHTML = '';
  body.append(header('강화', save, act, '強化'));
  if (ui.growTab !== 'gyeolgi') ui.growTab = 'secret';
  body.append(powerTabs(save, act, ui.growTab));
  if (ui.growTab === 'secret') body.append(heroPicker(save, sel, act));
  const grid = el('div', 'grow-grid');

  // 결기 상점: 무한 전장's 결기수정 buy permanent stacks.
  const gy = el('div', 'grow-card gyeolgi-card');
  gy.id = 'gyeolgiShop';
  body.append(holdHint());
  const banner = el('div', 'gy-banner', `<span class="gy-gem">${img('icon/crystal', 'gy-big')}<b class="gy-have">${GEM()}${fmt(save.crystals ?? 0)}</b></span>
    <h3>결기 상점</h3><small>모든 영웅 · 무한 전장에서 모은 결기수정</small>`);
  banner.style.setProperty('--art', `url(${UI}/row/gyeolgi-banner.webp)`);
  gy.append(banner);
  for (const g of GYEOLGI) {
    const lv = save.gyeolgi?.[g.id] ?? 0;
    const cost = gyeolgiCost(g, lv);
    const row = el('div', `grow-row art-row${lv ? ' on' : ''}`);
    row.style.setProperty('--art', `url(${UI}/row/${g.id}-art.webp)`);
    row.innerHTML = `${img(`row/${g.id}-icon`, 'gr-img')}<div class="gr-text"><b>${g.name} <i>${lv}${g.max ? `/${g.max}` : ''}스택</i></b><span>스택마다 ${g.text}</span><small>${g.max ? `스택마다 결기수정 ${g.cost} · 최대 ${g.max}스택` : (g.early && lv < g.early.length ? `처음 5스택은 싸요: ${g.early.join(' · ')}` : `다음 스택 ×${g.grow}씩 비싸져요`)}</small></div>`;
    if (g.max && lv >= g.max) row.append(doneSeal());
    else row.append(button(`${GEM()}${fmt(cost)}`, 'buy-btn gy-btn', () => act.buyGyeolgi(g), (save.crystals ?? 0) < cost));
    const total = Object.entries(g.per).map(([k, v]) => bonusText({ [k]: v * lv }) || '').join(', ');
    holdTip(row, () => tipHtml(`${g.icon} ${g.name}`, [
      `스택마다 <b>${g.text}</b> — 모든 영웅에게 영구 적용`,
      `지금 ${lv}${g.max ? `/${g.max}` : ''}스택${lv && g.id !== 'gLeech' ? ` · 합계 ${total}` : lv ? ` · 합계 ${(lv * 0.01).toFixed(2)}%` : ''}`,
      g.max && lv >= g.max ? '최대까지 올렸어요' : `다음 스택: 결기수정 <b>${fmt(cost)}</b> (가진 결기수정 ${fmt(save.crystals ?? 0)})`,
      g.cost ? `값: 스택마다 ${fmt(g.cost)} · 최대 ${g.max}스택`
        : g.early ? `값: 처음 ${g.early.join(' · ')}, 그 뒤 스택마다 ×${g.grow}` : `값: 첫 스택 100, 그 뒤 스택마다 ×${g.grow}`,
      '결기수정은 ♾️ 무한 전장에서만 모여요',
    ]));
    gy.append(row);
  }
  if (!(save.crystals ?? 0) && !Object.keys(save.gyeolgi ?? {}).length) gy.append(el('p', 'hint', '♾️ 무한 전장에서는 냥 대신 결기수정이 떨어져요. 오래 버틸수록, 어려운 전장일수록 많이 모여요.'));
  if (ui.growTab === 'gyeolgi') grid.append(gy);

  const sec = el('div', 'grow-card secret-card');
  sec.append(secHead('비전', '秘傳', '영웅별 · 출진할 때 이 스킬을 들고 시작'));
  const mine = SECRETS.filter((s) => s.hero === sel.hero);
  const others = SECRETS.filter((s) => s.hero !== sel.hero);
  for (const sc of [...mine, ...others]) {
    const has = save.secrets.includes(sc.id);
    const row = el('div', `grow-row scroll-row${has ? ' on' : ''}${sc.hero !== sel.hero ? ' other' : ''}`);
    row.innerHTML = `${img(`row/scroll-${SECRET_SCROLL[sc.id] ?? 'swords'}`, 'gr-scroll')}<div class="gr-text"><b>${sc.name} <i>${HEROES[sc.hero].name}</i></b><span>${sc.desc}</span></div>`;
    row.append(has ? tag('습득', 'got-tag') : priceBtn(sc.price, save.money, () => act.learn(sc)));
    holdTip(row, tipHtml(`📜 ${sc.name}`, [
      `${HEROES[sc.hero].name} 전용 · ${sc.desc}`,
      '배워 두면 출진할 때마다 이 책략을 Lv1로 들고 시작해요 (레벨업 카드 한 장을 아끼는 셈).',
      has ? '✅ 이미 배웠어요' : `값: ${fmt(sc.price)}냥 (가진 냥 ${fmt(save.money)})`,
    ]));
    sec.append(row);
  }
  if (ui.growTab === 'secret') grid.append(sec);
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

/** Hold tip for a battlefield: difficulty, reward, boss, gear and record. */
function stageTip(save, sel, st) {
  const { boss, gate, cleared } = stageInfo(save, sel, st);
  return tipHtml(`${st.numeral} ${st.name}`, [
    `${starRow(st)} ${st.difficulty.label} · 보상 ×${rewardOf(st)}`,
    `적장: ${boss.name}${boss.epithet ? ` (${boss.epithet})` : ''}`,
    `권장 장비: ${st.difficulty.stars > 1 ? `${GRADES[REC_GRADE[st.difficulty.stars]].name}${st.difficulty.stars > 5 ? ' +제련' : ' 이상'}` : '없어도 OK'}`,
    cleared ? '🏆 평정함' : gate.ok ? '아직 평정하지 못했어요' : `🔒 ${gate.text}`,
  ]);
}

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
  body.append(header('출진', save, act, '出陣'));
  body.append(staminaLine(save));
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
    holdTip(n, stageTip(save, sel, st));
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
  sec('비전', secrets.length ? `📜 ${secrets.join(', ')}` : '없음', () => goPower(act, 'secret'));
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
  const sta = staminaOf(save);
  body.append(staminaLine(save));
  body.append(button(sta.n <= 0 ? `⚔️ ${staminaWait(save)} 뒤 출진 가능` : `⚔️ 출진 · ${sta.n}/${sta.max}`, 'seal-btn cta', act.start, !gate.ok || sta.n <= 0));
}

// =================================================================== 도감

export function renderCodex(save, sel, act) {
  if (ui.codexTab === 'ach') ui.codexTab = 'hero'; // 업적 moved to 🎁 보상
  const body = $('codexBody');
  body.innerHTML = '';
  body.append(header('도감', save, act, '圖鑑'));
  const tabs = [['hero', '영웅'], ['weapon', '무기'], ['gear', '장비'], ['spirit', '영물'], ['foe', '적'], ['record', '기록'], ['help', '도움말']];
  const strip = tabStrip(tabs.map(([id, name]) => [id, `${id === 'spirit' ? '<span class="tab-img tab-emoji">🐾</span>' : img(`icon/tab-${id}`, 'tab-img')}<b>${name}</b>`]), ui.codexTab, (id) => {
    ui.codexTab = id;
    renderCodex(save, sel, act);
  });
  strip.classList.add('codex-tabs');
  body.append(strip);
  const grid = el('div', 'codex-grid');
  const kills = save.codex?.kills ?? {};
  // `tier` (data/codexTiers.js): the entry's 단계 pips, and a 🎁 to tap when one is reached.
  const cell = (iconNode, name, sub, locked, more = [], tier = null, lockedSub = '') => {
    const c = el('div', `codex-cell${locked ? ' locked' : ''}${tier?.ready > 0 ? ' tier-ready' : ''}`);
    c.append(iconNode);
    c.append(el('b', '', locked ? '???' : name));
    if (sub || lockedSub) c.append(el('small', '', locked ? lockedSub : sub));
    let tierLines = [];
    if (tier) {
      c.append(el('span', 'cx-tiers', tier.tiers.map((t, i) => `<i class="${i < tier.claimed ? 'on' : i < tier.reached ? 'ready' : ''}"></i>`).join('')));
      const unit = tier.kind === 'spirit' ? '★' : tier.kind === 'boss' ? '번 격파' : '명 처치';
      tierLines = tier.tiers.map((t, i) => `${i < tier.claimed ? '✅' : i < tier.reached ? '🎁' : '◻️'} ${tier.kind === 'spirit' ? `★${t.need}` : `${fmt(t.need)}${unit}`} — ${t.currency === 'yeongju' ? `영주 ${fmt(t.reward)}` : `${fmt(t.reward)}냥`}`);
      if (tier.ready > 0) {
        c.append(el('span', 'cx-gift', '🎁'));
        c.addEventListener('click', () => act.claimCodex(tier.kind, tier.id));
      }
    }
    holdTip(c, locked ? tipHtml('???', ['아직 만나지 못했어요.', lockedSub, ...(tierLines.length ? ['<b>도감 단계 보상</b>', tierLines.join('<br>')] : [])]) : tipHtml(name, [sub, ...more, ...(tierLines.length ? [`<b>도감 단계 보상</b>${tier.ready > 0 ? ' — 눌러서 받기!' : ''}`, tierLines.join('<br>')] : [])]));
    return c;
  };
  /** 🎁 모두 받기 for one tab, when anything is waiting. */
  const claimAllBtn = (kinds) => {
    let money = 0, yj = 0;
    for (const e of kinds.flatMap(([k, list]) => list.map((id) => codexEntry(save, k, id)))) {
      for (let i = e.claimed; i < e.reached; i++) (e.tiers[i].currency === 'yeongju' ? (yj += e.tiers[i].reward) : (money += e.tiers[i].reward));
    }
    if (!money && !yj) return null;
    return button(`🎁 도감 보상 모두 받기 ${[money && `+${fmt(money)}냥`, yj && `🔮 +${fmt(yj)}`].filter(Boolean).join(' · ')}`, 'ach-claim-all', () => act.claimCodexAll(kinds.map(([k]) => k)));
  };
  body.append(holdHint());

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
    for (const h of Object.values(HEROES)) grid.append(cell(portrait(h, 64), h.name, `${h.title} · ${h.role}`, false, [h.blurb, `고유기: ${SPECIALS[h.special].name}`]));
  } else if (ui.codexTab === 'weapon') {
    for (const h of Object.values(HEROES)) {
      for (const wid of [h.weapon, ...(h.subWeapons ?? [])]) {
        const W = WEAPONS[wid];
        const ic = iconCanvas(wid, 48, 'row-icon');
        grid.append(cell(ic, W.levels[0].name, `${h.name} · ${W.levels.map((l) => l.name).slice(1).join(' → ')}`, false,
          W.levels.map((l, i) => `${i + 1}단계 <b>${l.name}</b>${l.evolution ? ' 🌟' : ''} — ${l.desc ?? ''}`)));
      }
    }
  } else if (ui.codexTab === 'gear') {
    for (const it of EQUIPMENT) {
      const has = save.owned.includes(it.id);
      const c = cell(iconCanvas(has ? it.id : `empty:${it.slot}`, 48, 'row-icon'), it.name, `${HEROES[it.hero].name} · ${GRADES[it.grade].name} ${SLOTS.find((s) => s.id === it.slot).name}`, !has);
      c.style.setProperty('--grade', GRADES[it.grade].color);
      grid.append(c);
    }
  } else if (ui.codexTab === 'spirit') {
    // 영물: met ones show their grade, stars and 갈래; the rest stay as ??? with their grade.
    const all = claimAllBtn([['spirit', SPIRIT_LIST.map((x) => x.id)]]);
    if (all) body.append(all);
    for (const s of SPIRIT_LIST) {
      const own = spiritOf(save, s.id);
      const ic = el('span', 'row-icon codex-emoji', s.icon);
      ic.style.setProperty('--gc', SPIRIT_GRADES[s.grade].color);
      grid.append(cell(ic, s.name, `${SPIRIT_GRADES[s.grade].name} · ${s.role}${own ? ` · ★${own.stars}${own.branch ? ` · ${s.branches[own.branch].name}` : ''}` : ''}`, !own,
        [s.base, `갈래 A ${s.branches.a.name} — ${s.branches.a.desc}`, `갈래 B ${s.branches.b.name} — ${s.branches.b.desc}`, `★5 각성 — ${s.awaken}`],
        codexEntry(save, 'spirit', s.id), `${SPIRIT_GRADES[s.grade].name}${s.grade === 5 ? ' · 사신 정수로' : ' · 뽑기로'}`));
    }
    body.append(grid);
    body.append(comboCard(save));
    return;
  } else if (ui.codexTab === 'foe') {
    const foes = [...FOES(), ...GENERALS()];
    const all = claimAllBtn([['foe', FOES().map((x) => x.id)], ['boss', GENERALS().map((x) => x.id)]]);
    if (all) body.append(all);
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
      const boss = !!BOSSES[f.id] && !ENEMIES[f.id];
      grid.append(cell(cv, f.name, boss ? `적장 · 격파 ${n}` : `처치 ${fmt(n)}`, !n, [], codexEntry(save, boss ? 'boss' : 'foe', f.id), boss ? '적장' : ''));
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
  const waiting = ready.filter((a) => a.currency !== 'yeongju').reduce((n, a) => n + a.reward, 0);
  const waitingY = ready.filter((a) => a.currency === 'yeongju').reduce((n, a) => n + a.reward, 0);
  const pay = (a) => (a.currency === 'yeongju' ? `🔮${fmt(a.reward)}` : `${COIN()}${fmt(a.reward)}`);
  const top = el('div', 'ach-top');
  top.append(el('div', 'ach-count', `<span class="ach-num"><b>${done}</b> / ${ACHIEVEMENTS.length} 달성</span>
    <span class="ach-meter"><i style="width:${(done / ACHIEVEMENTS.length) * 100}%"></i></span>`));
  box.append(top);
  if (ready.length) box.append(button(`🎁 모두 받기 ${[waiting && `+${fmt(waiting)}냥`, waitingY && `🔮 +${fmt(waitingY)}`].filter(Boolean).join(' · ')}`, 'ach-claim-all', () => act.claimAllAch()));
  let n = 0;
  for (const [gid, gname] of ACH_GROUPS) {
    const [icon, ...words] = gname.split(' ');
    box.append(ruleHead(GROUP_ICON[gid] ?? `<span class="rh-emoji">${icon}</span>`, words.join(' ')));
    // 연속 업적: one row per series — the first tier not yet taken (or the last, all done).
    const shown = [];
    for (const x of ACHIEVEMENTS.filter((y) => y.group === gid)) {
      if (!x.series) { shown.push(x); continue; }
      if (shown.some((y) => y.series === x.series)) continue;
      const tiers = ACHIEVEMENTS.filter((y) => y.series === x.series);
      shown.push(tiers.find((y) => save.ach?.[y.id] !== 'done') ?? tiers.at(-1));
    }
    for (const a of shown) {
      const st = save.ach?.[a.id];
      const row = el('div', `ach-card${st === 'ready' ? ' ready' : st === 'done' ? ' done' : ''}`);
      row.style.setProperty('--art', `url(${UI}/ach/art${n++ % 6}.webp)`);
      row.append(el('span', 'ach-icon', ACH_ART.has(a.id) ? img(`ach/${a.id}`) : `<em>${a.icon}</em>`));
      const [now, need] = progressOf(a, save);
      const bar = a.goal && !st ? `<span class="ach-prog"><i style="width:${Math.min(100, (now / need) * 100)}%"></i><em>${fmt(Math.min(now, need))} / ${fmt(need)}</em></span>` : '';
      const pips = a.series ? `<span class="ach-tiers">${ACHIEVEMENTS.filter((y) => y.series === a.series).map((y) => `<i class="${save.ach?.[y.id] === 'done' ? 'on' : save.ach?.[y.id] === 'ready' ? 'ready' : ''}"></i>`).join('')}</span>` : '';
      row.append(el('div', 'ach-text', `<b>${a.name}${pips}</b><small>${a.desc}</small>${bar}`));
      holdTip(row, tipHtml(`${a.icon} ${a.name}`, [
        a.desc,
        a.goal ? `진행: ${fmt(Math.min(now, need))} / ${fmt(need)}` : '',
        a.series ? ACHIEVEMENTS.filter((y) => y.series === a.series).map((y) => `${save.ach?.[y.id] === 'done' ? '✅' : save.ach?.[y.id] === 'ready' ? '🎁' : '◻️'} ${y.desc} — ${y.currency === 'yeongju' ? `영주 ${fmt(y.reward)}` : `${fmt(y.reward)}냥`}`).join('<br>') : `보상 ${a.currency === 'yeongju' ? `영주 ${fmt(a.reward)}` : `${fmt(a.reward)}냥`}`,
        st === 'done' ? '✅ 달성하고 보상을 받았어요' : st === 'ready' ? '🎁 달성! 받기를 눌러 보상을 받아요' : '',
      ]));
      if (st === 'ready') row.append(button(`받기<br><small>+${a.currency === 'yeongju' ? '🔮' : ''}${fmt(a.reward)}</small>`, 'ach-claim', () => act.claimAch(a.id)));
      else row.append(el('span', `ach-reward${st === 'done' ? ' got' : ''}`, st === 'done' ? '<i class="ach-check">✓</i>' : pay(a)));
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

// =================================================================== 영물

/** The last draw, shown at the top of the 영물 screen until the next one. */
let lastDraw = null;
export const setLastDraw = (d) => (lastDraw = d);

const starPips = (n, max = 5) => `<span class="sp-stars">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`;

/** 🐾 영물: 뽑기 with 영주, the party, and every 영물 with its stars, 갈래 and 각성. */
export function renderSpirit(save, sel, act) {
  const body = $('spiritBody');
  body.innerHTML = '';
  body.append(header('강화', save, act, '強化'));
  body.append(powerTabs(save, act, 'spirit'));
  body.append(holdHint());

  // 뽑기
  const gc = el('div', 'grow-card sp-gacha');
  const toPity = GACHA.pity - (save.pity ?? 0);
  gc.append(el('div', 'sp-gacha-head', `<b>🔮 영물 뽑기</b><span>영주 <b>${fmt(save.yeongju ?? 0)}</b></span>`));
  gc.append(el('p', 'sp-rates', [1, 2, 3, 4].map((g) => `<i style="color:${SPIRIT_GRADES[g].color}">${SPIRIT_GRADES[g].name} ${Math.round(SPIRIT_GRADES[g].rate * 1000) / 10}%</i>`).join(' · ') + ` <br><small>신수 확정까지 <b>${toPity}</b>뽑 · 중복은 별 올리기에, ★5 뒤 중복은 영주로 돌려받아요</small>`));
  const row = el('div', 'sp-gacha-btns');
  row.append(button(`1회 뽑기<br><small>🔮 ${GACHA.one}</small>`, 'seal-btn sp-draw', () => act.drawSpirit(1), (save.yeongju ?? 0) < GACHA.one));
  row.append(button(`10회 뽑기<br><small>🔮 ${GACHA.ten} (10% 할인)</small>`, 'seal-btn sp-draw ten', () => act.drawSpirit(10), (save.yeongju ?? 0) < GACHA.ten));
  gc.append(row);
  if ((save.yeongju ?? 0) < GACHA.one) gc.append(el('p', 'hint', '🏯 사신의 제단에서 영기를 모으면 영주가 돼요.'));
  if (!save.spiritGift) gc.append(el('p', 'hint', `🐾 사신의 제단을 ${Math.max(1, FIRST_SPIRIT_RUNS - altarRunsDone(save))}판 더 돌면 범수 한 마리가 선물로 찾아와요.`));
  if (lastDraw?.length) {
    const res = el('div', `sp-result${lastDraw.length > 1 ? ' ten' : ''}`);
    lastDraw.forEach((d, i) => {
      const s = SPIRITS[d.id];
      const c = el('div', `sp-pull g${s.grade}${d.isNew ? ' new' : ''}`, `<span class="sp-ic">${s.icon}</span><b>${s.name}</b><small>${d.isNew ? 'NEW!' : d.refund ? `🔮+${d.refund}` : '중복 +1'}</small>`);
      c.style.setProperty('--gc', SPIRIT_GRADES[s.grade].color);
      c.style.setProperty('--i', i);
      res.append(c);
    });
    gc.append(res);
  }
  body.append(gc);

  // 동행
  const slots = companionSlots(save);
  const party = el('div', 'grow-card sp-party');
  party.append(el('div', 'sp-gacha-head', `<b>🐾 동행</b><span>${slots}칸${slots < 2 ? ' · 사신을 얻으면 2칸' : ''}</span>`));
  const pr = el('div', 'sp-slots');
  for (let i = 0; i < 2; i++) {
    const id = save.companions?.[i];
    const s = id && SPIRITS[id];
    pr.append(el('div', `sp-slot${s ? '' : ' empty'}${i >= slots ? ' locked' : ''}`, s
      ? `<span class="sp-ic">${s.icon}</span><b>${s.name}</b>${starPips(save.spirits[id].stars)}`
      : i >= slots ? '🔒<small>사신과 함께 열려요</small>' : '<small>아래에서 영물을 눌러<br>동행으로 데려가요</small>'));
  }
  party.append(pr);
  const active = combosOf(save.companions ?? []);
  party.append(el('p', 'hint', active.length
    ? active.map((c) => `<b class="sp-combo-on">${c.icon} 궁합 · ${c.name}</b> ${c.desc}`).join('<br>')
    : '동행 영물은 모든 영웅과 함께 싸워요. 두 마리가 <b>궁합</b>이 맞으면 힘이 더해져요.'));
  body.append(party);
  body.append(comboCard(save));

  // 도감: grade by grade.
  for (const g of [5, 4, 3, 2, 1]) {
    const box = el('div', 'grow-card sp-grade');
    const list = SPIRIT_LIST.filter((s) => s.grade === g);
    const have = list.filter((s) => spiritOf(save, s.id)).length;
    box.append(el('div', 'sp-grade-head', `<b style="color:${SPIRIT_GRADES[g].color}">${SPIRIT_GRADES[g].name}</b><small>${have}/${list.length}${g === 5 ? ` · 사신 정수 ${save.essence ?? 0}/${ESSENCE_PER_SASIN}로 불러요` : ''}</small>`));
    const grid = el('div', 'sp-grid');
    for (const s of list) grid.append(spiritCard(save, s, act));
    box.append(grid);
    body.append(box);
  }
}

/** 궁합: every pairing, lit when both are owned, marked when they march together. */
function comboCard(save) {
  const box = el('div', 'grow-card sp-combos');
  const owned = (id) => !!spiritOf(save, id);
  const known = COMBOS.filter((c) => c.ids.every(owned)).length;
  box.append(el('div', 'sp-gacha-head', `<b>💞 궁합</b><span>${known}/${COMBOS.length} 갖춤 · 두 마리를 함께 동행</span>`));
  for (const c of COMBOS) {
    const [a, b] = c.ids.map((id) => SPIRITS[id]);
    const have = c.ids.every(owned);
    const on = c.ids.every((id) => save.companions?.includes(id));
    box.append(el('div', `sp-combo${have ? '' : ' off'}${on ? ' on' : ''}`, `<span class="sp-combo-pair">${owned(a.id) ? a.icon : '❔'}${owned(b.id) ? b.icon : '❔'}</span><div><b>${c.icon} ${c.name}${on ? ' <i>발동 중</i>' : ''}</b><small>${a.name} + ${b.name} — ${c.desc}</small></div>`));
  }
  return box;
}

function spiritCard(save, s, act) {
  const own = spiritOf(save, s.id);
  const c = el('div', `sp-card g${s.grade}${own ? '' : ' locked'}${save.companions?.includes(s.id) ? ' party' : ''}`);
  c.style.setProperty('--gc', SPIRIT_GRADES[s.grade].color);
  const need = own ? (s.grade === 5 ? SASIN_STAR_ESSENCE[own.stars] : dupesForNext(own.stars)) : 0;
  const have = own ? (s.grade === 5 ? save.essence ?? 0 : own.dupes) : 0;
  const maxed = own && own.stars >= MAX_STARS;
  c.append(el('div', 'sp-top', `<span class="sp-ic">${own ? s.icon : '❔'}</span><div><b>${s.name}</b><small>${s.role}</small>${own ? starPips(own.stars) : ''}</div>`));
  if (own) {
    const pct = maxed ? 100 : Math.min(100, (have / need) * 100);
    c.append(el('div', 'sp-bar', `<i style="width:${pct}%"></i><span>${maxed ? '★5 각성' : s.grade === 5 ? `정수 ${have}/${need}` : `중복 ${have}/${need}`}</span>`));
    const btns = el('div', 'sp-btns');
    const inParty = save.companions?.includes(s.id);
    btns.append(button(inParty ? '동행 중' : '동행', `sp-btn${inParty ? ' on' : ''}`, () => act.toggleCompanion(s.id)));
    if (!maxed) btns.append(button('★ 올리기', 'sp-btn up', () => act.starSpirit(s.id), have < need));
    c.append(btns);
    if (own.stars >= 3) {
      const br = el('div', 'sp-branch');
      for (const k of ['a', 'b']) br.append(button(`${s.branches[k].name}`, `sp-br${own.branch === k ? ' on' : ''}`, () => act.branchSpirit(s.id, k)));
      c.append(br);
    }
  } else if (s.grade === 5) {
    c.append(button(`✨ 정수 ${ESSENCE_PER_SASIN}로 부르기`, 'sp-btn up', () => act.callSasin(s.id), (save.essence ?? 0) < ESSENCE_PER_SASIN));
  }
  holdTip(c, () => tipHtml(`${s.icon} ${s.name} <small>${SPIRIT_GRADES[s.grade].name} · ${s.role}</small>`, [
    s.base,
    `★마다 위력이 커져요${own ? ` — 지금 ★${own.stars}` : ''}`,
    `<b>★3 갈래</b> (언제든 바꿀 수 있어요)<br>A ${s.branches.a.name} — ${s.branches.a.desc}<br>B ${s.branches.b.name} — ${s.branches.b.desc}${own?.branch ? `<br>고른 갈래: <b>${s.branches[own.branch].name}</b>` : ''}`,
    `<b>★5 각성</b> — ${s.awaken}`,
    COMBOS.filter((c) => c.ids.includes(s.id)).map((c) => `💞 ${c.name} (${c.ids.filter((i) => i !== s.id).map((i) => SPIRITS[i].name).join('')}) — ${c.desc}`).join('<br>'),
    s.grade === 5 ? `사신 정수로만 불러요 (${ESSENCE_PER_SASIN}개) · 별도 정수로 올려요 (${SASIN_STAR_ESSENCE.slice(1).join(' · ')})` : `뽑기로 만나요 · ★5까지 중복 ${STAR_DUPES.reduce((a, b) => a + b, 0)}장`,
  ]));
  return c;
}

// =================================================================== 쿠폰

/** 🎁 쿠폰: a sheet with one input; the gift (or why not) shows under it. */
export function openCoupon(act) {
  document.querySelector('.sheet-back')?.remove();
  const back = el('div', 'sheet-back');
  const sheet = el('div', 'sheet coupon-sheet');
  const close = () => back.remove();
  const x = button('✕', 'sheet-x', close);
  x.setAttribute('aria-label', '닫기');
  sheet.append(x);
  sheet.append(el('div', 'dc-head', '<b>🎁 쿠폰 입력</b><span>코드 하나당 한 번</span>'));
  const input = el('input', 'coupon-input');
  Object.assign(input, { type: 'text', placeholder: '쿠폰 코드', autocomplete: 'off', spellcheck: false, maxLength: 40 });
  input.setAttribute('autocapitalize', 'characters');
  const out = el('div', 'coupon-out');
  const go = button('받기', 'seal-btn coupon-go', async () => {
    go.disabled = true;
    const r = await act.redeemCoupon(input.value);
    go.disabled = false;
    out.className = `coupon-out ${r.ok ? 'ok' : 'bad'}`;
    out.innerHTML = r.ok ? `<b>🎉 ${r.name}</b>${r.lines.map((l) => `<span>${l}</span>`).join('')}` : `⚠️ ${r.reason}`;
    if (r.ok) input.value = '';
  });
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go.click());
  const row = el('div', 'coupon-row');
  row.append(input, go);
  sheet.append(row, out);
  back.append(sheet);
  back.addEventListener('click', (e) => e.target === back && close());
  $('app').append(back);
  setTimeout(() => input.focus(), 50);
}

// =================================================================== 보상

/** Open a home dungeon sheet (사신의 제단 · 무한 전장) on the next home render. */
export const setSheet = (kind) => (ui.sheet = kind);

/** 🎁 보상: 오늘 할 일, rewards waiting (업적 · 도감), 쿠폰, and the 업적 list. */
export function renderReward(save, sel, act) {
  const body = $('rewardBody');
  body.innerHTML = '';
  body.append(header('보상', save, act, '報償'));

  // 오늘 할 일
  const today = el('div', 'grow-card todo-card');
  today.append(el('div', 'sp-gacha-head', '<b>📋 오늘 할 일</b><span>매일 0시에 새로</span>'));
  const a = refreshAltar(save);
  const trT = trialFor(save);
  const todo = (done, icon, text, sub, btnText, onGo) => {
    const row = el('div', `todo-row${done ? ' done' : ''}`, `<span class="todo-check">${done ? '✅' : icon}</span><div><b>${text}</b><small>${sub}</small></div>`);
    if (!done && onGo) row.append(button(btnText, 'plain-btn small', onGo));
    today.append(row);
  };
  todo(trialDone(save), '🔥', '일일 던전', trialDone(save) ? '오늘 도전했어요' : `난세 ${trT.level}단계 · ${ATTR_ICON} ${ATTR_NAME} +${fmt(trT.reward)}`, '도전', () => act.openSheet('trial'));
  const eLeft = endlessLeft(save);
  todo(eLeft <= 0, '♾️', '무한 전장', eLeft > 0 ? `오늘 ${eLeft}/${ENDLESS_PER_DAY}번 남음 · 💎 결기수정` : '오늘 도전을 다 했어요', '도전', () => act.openSheet('endless'));
  todo(a.tickets <= 0, '🏯', '사신의 제단', a.tickets > 0 ? `입장권 ${a.tickets}장 남음 · 영기를 모아 영주로` : '오늘 입장권을 다 썼어요', '입장', () => act.openSheet('altar'));
  if (!guardianOf()) {
    const got = (save.altar?.essenceDay ?? -1) >= dayNumber();
    todo(got, '✨', '사신의 날 · 사신 정수', got ? '오늘 정수를 받았어요' : '제단을 평정하면 사신 정수 +1', '입장', () => act.openSheet('altar'));
  }
  body.append(today);

  // 받을 보상
  const achReady = ACHIEVEMENTS.filter((x) => save.ach?.[x.id] === 'ready').length;
  const foeReady = [...FOES(), ...GENERALS()].reduce((n, f) => n + Math.max(0, codexEntry(save, BOSSES[f.id] && !ENEMIES[f.id] ? 'boss' : 'foe', f.id).ready), 0);
  const spReady = SPIRIT_LIST.reduce((n, x) => n + Math.max(0, codexEntry(save, 'spirit', x.id).ready), 0);
  const box = el('div', 'grow-card todo-card');
  box.append(el('div', 'sp-gacha-head', `<b>🎁 받을 보상</b><span>${achReady + foeReady + spReady ? `${achReady + foeReady + spReady}개` : '모두 받았어요'}</span>`));
  const line = (icon, text, n, onGet, onSee) => {
    const row = el('div', `todo-row${n ? '' : ' done'}`, `<span class="todo-check">${icon}</span><div><b>${text}</b><small>${n ? `${n}개 받을 수 있어요` : '받을 게 없어요'}</small></div>`);
    if (n) row.append(button('모두 받기', 'seal-btn small', onGet));
    else if (onSee) row.append(button('보기', 'plain-btn small', onSee));
    box.append(row);
  };
  line('🏆', '업적', achReady, () => act.claimAllAch(), null);
  line('⚔️', '도감 · 적과 적장', foeReady, () => act.claimCodexAll(['foe', 'boss']), () => act.openCodex('foe'));
  if (spiritOpen(save)) line('🐾', '도감 · 영물', spReady, () => act.claimCodexAll(['spirit']), () => act.openCodex('spirit'));
  const cp = el('div', 'todo-row', '<span class="todo-check">🎟️</span><div><b>쿠폰</b><small>코드를 넣으면 선물을 받아요</small></div>');
  cp.append(button('입력', 'plain-btn small', () => openCoupon(act)));
  box.append(cp);
  body.append(box);

  body.append(holdHint());
  body.append(achPanel(save, act));
}
