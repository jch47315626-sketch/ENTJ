import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMIES } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import {
  SLOTS, EQUIPMENT, TRAINING, SECRETS, REWARD_BY_STARS, GRADES, FORGE,
  forgeCost, gradeOpen, itemBonus, bonusText, metaBonus, entryCheck, armorCut,
} from '../data/meta.js';
import { SKILL_TREES, TREASURES } from '../data/trees.js';
import { ACHIEVEMENTS, ACH_GROUPS, progressOf } from '../data/achievements.js';
import { dailyFor, todayKey, untilTomorrow } from '../data/daily.js';
import { josa } from '../core/korean.js';
import { lineText, lineMax, engraveCost } from '../data/gearOptions.js';
import { HELP } from '../data/help.js';
import { NANSE_CARDS, NANSE_MAX, NANSE_MILESTONES, nanseLevel, nanseRewardMul, bestNanse, milestoneBonus } from '../data/nanse.js';
import { SPECIALS } from '../systems/specials.js';
import { drawUnit } from '../render/sprites.js';
import { iconCanvas } from '../render/icons.js';
import { drawPortrait, starText, gradeTag } from './screens.js';

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

/** Icon for each build (branch) of each hero's skill tree. */
const BUILD_ICON = {
  wanggeon: { A: '🏯', B: '🐎' },
  gyeonhwon: { A: '⚔️', B: '🛡️' },
  gungye: { A: '☄️', B: '🌀' },
};
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
const ui = { heroTab: 'gear', slot: 'head', view: {}, codexTab: 'ach', mapStage: null };

/**
 * The hero's style is not chosen; it follows the skills learned.
 * Returns { name, counts: {A, B}, main } or null when nothing is learned.
 */
function buildOf(save, heroId) {
  const nodes = save.trees?.[heroId]?.nodes ?? [];
  const tree = SKILL_TREES[heroId];
  const counts = Object.fromEntries(tree.branches.map((b) => [b.id, b.nodes.filter((n) => nodes.includes(n.id)).length]));
  const learned = tree.branches.filter((b) => counts[b.id] > 0).sort((a, b) => counts[b.id] - counts[a.id]);
  if (!learned.length) return null;
  const tag = (b) => `${BUILD_ICON[heroId][b.id]} ${b.name.replace(/의 길$/, '')}`;
  const [main, second] = learned;
  const name = !second ? `${tag(main)}의 길`
    : counts[main.id] === counts[second.id] ? `${tag(main)} + ${tag(second)} 혼합`
    : `${tag(main)} 중심 + ${tag(second)}`;
  return { name, counts, main: main.id };
}

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
const priceBtn = (price, money, onClick) => button(`🪙 ${fmt(price)}`, 'buy-btn', onClick, money < price);

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

/** Page header with a home button and the purse. */
function header(title, save, act) {
  const h = el('div', 'page-head');
  h.append(button('🏠', 'icon-btn home-btn', () => act.go('home')));
  h.append(el('h2', 'page-title', title));
  h.append(el('span', 'coin-pill', `🪙 <b>${fmt(save.money)}</b>`));
  return h;
}

function portrait(hero, px) {
  const c = el('canvas', 'portrait');
  c.width = c.height = px * 2;
  c.style.width = c.style.height = `${px}px`;
  drawPortrait(c, hero);
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
  const body = $('homeBody');
  body.innerHTML = '';
  const h = HEROES[sel.hero];
  const build = buildOf(save, h.id);

  const hero = button('', 'home-hero', () => act.go('heroes'));
  hero.append(portrait(h, 120));
  const txt = el('div', 'hh-text');
  txt.append(el('div', 'hh-name', h.name));
  txt.append(el('div', 'hh-build', build ? build.name : '스타일 없음 — 스킬을 배우면 정해져요'));
  txt.append(gearRow(save, h.id));
  hero.append(txt);
  body.append(hero);

  const st = STAGES[sel.stage];
  const { boss, gate } = stageInfo(save, sel, st);
  const card = el('div', 'home-stage');
  const info = button(`
    <span class="hs-stars">${starText(st.difficulty.stars)}</span>
    <span class="hs-name">${st.numeral} ${st.name}</span>
    <span class="hs-meta">보상 ×${REWARD_BY_STARS[st.difficulty.stars]} · 적장 ${boss.name}</span>`, 'hs-info', () => act.go('map'));
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
  card.append(el('p', 'ec-rule', '적이 갈수록 많아지고, 적장은 <b>3분마다</b> 더 강해져 돌아와요. 영웅과 전장은 위에서 고른 그대로예요.'));
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
    ? '✅ 오늘 보상을 받았어요 — 다시 도전은 언제든 자유!'
    : `첫 승리 보상 <b>🪙 ${fmt(d.reward)}</b> <small>(판 보상과 별도)</small>`));
  card.append(button(done ? '🔁 다시 도전하기' : '📅 도전하기', 'daily-btn', () => act.startDaily()));
  return card;
}

// =================================================================== 영웅

export function renderHeroes(save, sel, act) {
  const body = $('heroesBody');
  body.innerHTML = '';
  body.append(header('👑 영웅', save, act));

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
  const tree = SKILL_TREES[h.id];
  const build = buildOf(save, h.id);
  const view = ui.view[h.id] ?? build?.main ?? 'A';
  const br = tree.branches.find((b) => b.id === view);

  // The two paths: tabs to look at, not a choice. Learning skills sets the style.
  const builds = el('div', 'build-pick');
  for (const b of tree.branches) {
    const n = build?.counts[b.id] ?? 0;
    const btn = button(`<span class="bp-icon">${BUILD_ICON[h.id][b.id]}</span><b>${b.name.replace(/의 길$/, '')}</b><small>${n}/${b.nodes.length}</small>`,
      `bp-btn${b.id === view ? ' on' : ''}${n ? ' chosen' : ''}`, () => {
        ui.view[h.id] = b.id;
        renderHeroes(save, sel, act);
      });
    builds.append(btn);
  }
  body.append(builds);
  const styleCard = el('div', 'style-card');
  styleCard.innerHTML = `<small>지금 스타일 · <b class="style-now">${build ? build.name : '없음 — 스킬을 배우면 자연스럽게 정해져요'}</b></small>
    <p>${BUILD_ICON[h.id][view]} ${br.style}</p>
    <small class="kit">고유기 <b>${SPECIALS[h.special].name}</b> · 무기 ${WEAPONS[h.weapon].levels.map((w) => w.name).join(' → ')}</small>`;
  body.append(styleCard);

  body.append(tabStrip([['gear', '🛡️ 장비'], ['skill', '📜 스킬'], ['treasure', '💎 보물']], ui.heroTab, (id) => {
    ui.heroTab = id;
    renderHeroes(save, sel, act);
  }));
  if (ui.heroTab === 'gear') body.append(gearPanel(save, h, act));
  else if (ui.heroTab === 'skill') body.append(skillPanel(save, h, view, act));
  else body.append(treasurePanel(save, h, act));
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
    if (lv < FORGE.max) {
      const cost = forgeCost(item, lv);
      const chance = FORGE.chance[lv];
      const stars = '★'.repeat(Math.round(chance * 5)) + '☆'.repeat(5 - Math.round(chance * 5));
      const fb = button(`🔨 +${lv}→+${lv + 1} <small>${stars}</small>`, 'forge-btn', () => act.forge(item), save.money < cost);
      fb.title = `제련 비용 ${fmt(cost)}냥 · 성공률 ${Math.round(chance * 100)}% · 실패해도 장비는 그대로`;
      ctrl.append(fb);
      ctrl.append(el('small', 'forge-cost', `🪙 ${fmt(cost)}`));
    } else ctrl.append(tag('+5 완성'));
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

/** Root node, then the viewed build's three steps. */
function skillPanel(save, h, view, act) {
  const tree = SKILL_TREES[h.id];
  const state = save.trees?.[h.id] ?? { nodes: [] };
  const has = (id) => state.nodes.includes(id);
  const box = el('div', 'skill-panel');
  const br = tree.branches.find((b) => b.id === view);
  box.append(el('p', 'hint', '두 길 모두 배울 수 있어요. 많이 배운 쪽이 지금 스타일이 되고, 섞으면 혼합 스타일이 돼요.'));

  const steps = [{ n: tree.root, branch: null, lv: '기본' }, ...br.nodes.map((n, i) => ({ n, branch: br.id, lv: `Lv.${i + 1}` }))];
  steps.forEach(({ n, branch, lv }, i) => {
    const prevOk = i === 0 || has(steps[i - 1].n.id);
    const got = has(n.id);
    const st = got ? 'got' : prevOk ? 'open' : 'locked';
    const card = el('div', `step ${st}`);
    card.innerHTML = `<span class="st-lv">${lv}</span><div class="st-text"><b>${n.name}</b><span>${n.desc}</span></div>`;
    if (got) card.append(tag('✓ 습득'));
    else if (st === 'open') card.append(priceBtn(n.price, save.money, () => act.buyNode(n, branch)));
    else card.append(tag('🔒', 'locked'));
    box.append(card);
  });
  return box;
}

/** Treasure tree: base treasure, then two per build. */
function treasurePanel(save, h, act) {
  const list = TREASURES[h.id] ?? [];
  const tree = SKILL_TREES[h.id];
  const wearing = outfit(save, h.id).treasure;
  const box = el('div', 'treasure-panel');
  box.append(el('p', 'hint', '보물은 보물 칸에 하나만 끼워요. 빌드와 같은 길의 보물이 잘 어울려요.'));
  const card = (t) => {
    const owned = save.owned.includes(t.id);
    const parentOk = !t.parent || save.owned.includes(t.parent);
    const c = el('div', `item-card${wearing === t.id ? ' worn' : ''}${!owned && !parentOk ? ' sealed' : ''}`);
    c.append(iconCanvas(t.id, 40, 'row-icon'));
    c.append(el('div', 'ic-text', `<b>${t.name}</b><span>${t.desc}</span>`));
    const ctrl = el('div', 'ic-ctrl');
    if (owned) ctrl.append(wearing === t.id ? tag('착용 중') : button('착용', 'wear-btn', () => act.wearTreasure(t)));
    else if (parentOk) ctrl.append(priceBtn(t.price, save.money, () => act.buyTreasure(t)));
    else ctrl.append(tag('🔒', 'locked'));
    c.append(ctrl);
    return c;
  };
  const base = list.find((t) => !t.parent);
  if (base) box.append(card(base));
  for (const b of tree.branches) {
    box.append(el('h4', 'list-title', `${BUILD_ICON[h.id][b.id]} ${b.name}`));
    for (const t of list.filter((x) => x.branch === b.id)) box.append(card(t));
  }
  return box;
}

// =================================================================== 성장

export function renderGrow(save, sel, act) {
  const body = $('growBody');
  body.innerHTML = '';
  body.append(header('📈 성장', save, act));
  const grid = el('div', 'grow-grid');

  const train = el('div', 'grow-card');
  train.append(el('h3', '', '🥋 수련 <small>모든 영웅 · 영구 성장</small>'));
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    const [icon, effect] = TRAIN_UI[t.id] ?? ['•', t.name];
    const row = el('div', `grow-row${lv ? ' on' : ''}`);
    row.innerHTML = `<span class="gr-icon">${icon}</span><div class="gr-text"><b>${t.name} <i>Lv ${lv}/${t.max}</i></b><span>${effect}</span><small>${t.desc}</small></div>`;
    row.append(lv >= t.max ? tag('완료') : priceBtn(t.price(lv), save.money, () => act.train(t)));
    train.append(row);
  }
  grid.append(train);

  const sec = el('div', 'grow-card');
  sec.append(el('h3', '', '📜 비전 <small>영웅별 · 출진할 때 이 스킬을 들고 시작</small>'));
  const mine = SECRETS.filter((s) => s.hero === sel.hero);
  const others = SECRETS.filter((s) => s.hero !== sel.hero);
  for (const sc of [...mine, ...others]) {
    const has = save.secrets.includes(sc.id);
    const row = el('div', `grow-row${has ? ' on' : ''}${sc.hero !== sel.hero ? ' other' : ''}`);
    row.innerHTML = `<span class="gr-icon">📜</span><div class="gr-text"><b>${sc.name} <i>${HEROES[sc.hero].name}</i></b><span>${sc.desc}</span></div>`;
    row.append(has ? tag('습득') : priceBtn(sc.price, save.money, () => act.learn(sc)));
    sec.append(row);
  }
  grid.append(sec);
  body.append(grid);
}

// =================================================================== 전장

/** Rough positions on a stylised peninsula (0–100 box). */
const MAP_POS = {
  seonamhae: [24, 82],
  gongsan: [70, 66],
  gochang: [74, 44],
  cheorwon: [44, 14],
  illicheon: [58, 56],
};

export function renderMap(save, sel, act) {
  const body = $('mapBody');
  body.innerHTML = '';
  body.append(header('🗺️ 전장', save, act));
  const cur = ui.mapStage ?? sel.stage;

  const map = el('div', 'war-map');
  map.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path class="land" d="M38 4 C52 2 62 8 66 16 C72 22 84 30 84 44 C86 58 82 70 78 80 C72 90 56 94 40 92 C28 92 18 88 16 80 C12 70 20 62 24 54 C28 44 22 36 26 26 C28 14 30 6 38 4 Z"/>
    <polyline class="route" points="${STAGE_ORDER.map((id) => MAP_POS[id].join(',')).join(' ')}"/>
  </svg>`;
  for (const id of STAGE_ORDER) {
    const st = STAGES[id];
    const { gate, cleared } = stageInfo(save, sel, st);
    const [x, y] = MAP_POS[id];
    const n = button(`<span class="mn-no">${st.numeral}</span><span class="mn-name">${st.name}</span><span class="mn-stars">${'★'.repeat(st.difficulty.stars)}</span>`,
      `map-node${id === cur ? ' on' : ''}${cleared ? ' cleared' : ''}${gate.ok ? '' : ' locked'}`, () => {
        ui.mapStage = id;
        act.selectStage(id);
      });
    n.style.left = `${x}%`;
    n.style.top = `${y}%`;
    map.append(n);
  }
  body.append(map);

  const st = STAGES[cur];
  const { boss, gate, cleared } = stageInfo(save, sel, st);
  const card = el('div', 'stage-detail');
  card.innerHTML = `
    <div class="sd-head"><b>${st.numeral} ${st.name}</b><span class="sd-stars">${starText(st.difficulty.stars)} ${st.difficulty.label}</span></div>
    <ul class="sd-rows">
      <li><span>🪙 보상</span><b>×${REWARD_BY_STARS[st.difficulty.stars]}</b></li>
      <li><span>⚔️ 적장</span><b>${boss.name}</b></li>
      <li><span>🛡️ 권장 장비</span><b>${st.difficulty.stars > 1 ? `${GRADES[st.difficulty.stars].name} 이상` : '없어도 OK'}</b></li>
      <li><span>🏆 기록</span><b>${cleared ? '평정함' : '아직'}</b></li>
    </ul>`;
  card.append(button('출진 준비 ▶', 'seal-btn', () => act.go('prep')));
  body.append(card);
}

// =============================================================== 출진 준비

export function renderPrep(save, sel, act) {
  const body = $('prepBody');
  body.innerHTML = '';
  body.append(header('출진 준비', save, act));
  const h = HEROES[sel.hero];
  const build = buildOf(save, h.id);
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
  t.append(el('div', 'hh-build', build ? build.name : '스타일 없음'));
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
  const tr = (TREASURES[h.id] ?? []).find((x) => x.id === outfit(save, h.id).treasure);
  sec('보물', tr ? tr.name : '없음', () => {
    ui.heroTab = 'treasure';
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
  body.append(header('🔥 난세 단계', save, act));
  // Battlefield chips: only pacified ones can carry 난세.
  const row = el('div', 'nanse-stages');
  for (const id of STAGE_ORDER) {
    const st = STAGES[id];
    const ok = !!save.best?.[id];
    const best = bestNanse(save, id);
    const b = button(`<b>${st.numeral} ${st.name}</b><small>${ok ? (best ? `최고 ${best}단계` : '평정 완료') : '🔒 미평정'}</small>`,
      `ns-stage${id === sel.stage ? ' on' : ''}`, () => act.selectStage(id), !ok);
    row.append(b);
  }
  body.append(row);
  const cleared = !!save.best?.[sel.stage];
  body.append(nansePanel(save, sel, act, cleared));
  if (cleared) body.append(button('⚔️ 이 난세로 출진 준비', 'seal-btn cta', () => act.go('prep')));
}

/** 🔥 난세 단계: stack hardship cards on a pacified field for more 냥 and a record. */
function nansePanel(save, sel, act, cleared) {
  const box = el('div', 'nanse-box');
  const st = STAGES[sel.stage];
  if (!cleared) {
    box.classList.add('locked');
    box.append(el('div', 'nb-head', `<b>🔥 난세 단계</b><span>🔒 ${josa(st.name, '을')} 평정하면 열려요</span>`));
    box.append(el('p', 'nb-note', '전장을 한 번 평정하면, 출진 전에 고난 카드를 골라 더 어려운 싸움에 도전할 수 있어요. 단계가 높을수록 냥을 더 받아요.'));
    return box;
  }
  const cards = save.nanseCards ?? {};
  const lv = nanseLevel(cards);
  const mine = bestNanse(save, sel.stage, sel.hero);
  const any = bestNanse(save, sel.stage);
  const next = NANSE_MILESTONES.find((m) => m > any);
  box.append(el('div', 'nb-head', `<b>🔥 난세 <em>${lv}</em><small> / ${NANSE_MAX}</small></b>
    <span>냥 ×${nanseRewardMul(lv).toFixed(1)} · ${HEROES[sel.hero].name} 최고 ${mine}단계</span>`));
  if (next) box.append(el('p', 'nb-note', `🏮 이 전장에서 처음으로 난세 ${next}단계를 평정하면 돌파 보상 <b>${fmt(Math.round(milestoneBonus(next, st.difficulty.stars)))}냥</b>`));
  const list = el('div', 'nb-list');
  for (const c of NANSE_CARDS) {
    const r = Math.min(c.ranks, cards[c.id] ?? 0);
    const row = el('div', `nb-card${r ? ' on' : ''}`);
    row.append(el('span', 'nb-icon', c.icon));
    const pips = c.ranks > 1 ? `<span class="nb-pips">${Array.from({ length: c.ranks }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span>` : '';
    row.append(el('div', 'nb-text', `<b>${c.name} <small>+${c.points}점${c.ranks > 1 ? ' / 단' : ''}</small></b><span>${c.desc(Math.max(1, r))}</span>${pips}`));
    const ctl = el('div', 'nb-ctl');
    ctl.append(button('−', 'nb-btn', () => act.setNanse(c.id, r - 1), r === 0));
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
  body.append(header('📖 도감', save, act));
  const tabs = [['ach', '🏆 업적'], ['hero', '영웅'], ['weapon', '무기'], ['gear', '장비'], ['treasure', '보물'], ['foe', '적'], ['record', '기록'], ['help', '📘 도움말']];
  body.append(tabStrip(tabs, ui.codexTab, (id) => {
    ui.codexTab = id;
    renderCodex(save, sel, act);
  }));
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
  } else if (ui.codexTab === 'treasure') {
    for (const h of Object.values(HEROES)) {
      for (const t of TREASURES[h.id] ?? []) {
        const has = save.owned.includes(t.id);
        grid.append(cell(iconCanvas(has ? t.id : 'empty:treasure', 48, 'row-icon'), t.name, h.name, !has));
      }
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

/** 업적: progress per goal, with a 받기 button once a reward is waiting. */
function achPanel(save, act) {
  const box = el('div', 'ach-box');
  const done = ACHIEVEMENTS.filter((a) => save.ach?.[a.id]).length;
  const ready = ACHIEVEMENTS.filter((a) => save.ach?.[a.id] === 'ready');
  const waiting = ready.reduce((n, a) => n + a.reward, 0);
  const top = el('div', 'ach-top');
  top.append(el('div', 'ach-count', `<b>${done}</b> / ${ACHIEVEMENTS.length} 달성
    <span class="ach-meter"><i style="width:${(done / ACHIEVEMENTS.length) * 100}%"></i></span>`));
  if (ready.length) top.append(button(`🎁 모두 받기 +${fmt(waiting)}냥`, 'ach-claim-all', () => act.claimAllAch()));
  box.append(top);
  for (const [gid, gname] of ACH_GROUPS) {
    box.append(el('h4', 'ach-group', gname));
    for (const a of ACHIEVEMENTS.filter((x) => x.group === gid)) {
      const st = save.ach?.[a.id];
      const row = el('div', `ach-card${st === 'ready' ? ' ready' : st === 'done' ? ' done' : ''}`);
      row.append(el('span', 'ach-icon', a.icon));
      const [now, need] = progressOf(a, save);
      const bar = a.goal && !st ? `<span class="ach-prog"><i style="width:${Math.min(100, (now / need) * 100)}%"></i><em>${fmt(Math.min(now, need))} / ${fmt(need)}</em></span>` : '';
      row.append(el('div', 'ach-text', `<b>${a.name}</b><small>${a.desc}</small>${bar}`));
      if (st === 'ready') row.append(button(`받기<br><small>+${fmt(a.reward)}</small>`, 'ach-claim', () => act.claimAch(a.id)));
      else row.append(el('span', 'ach-reward', st === 'done' ? '✅' : `🪙 ${fmt(a.reward)}`));
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
