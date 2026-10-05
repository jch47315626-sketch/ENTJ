import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { SLOTS, EQUIPMENT, TRAINING, SECRETS, REWARD_BY_STARS, GRADES, FORGE, forgeCost, gradeOpen, itemBonus, bonusText, metaBonus, entryCheck } from '../data/meta.js';
import { WEAPONS } from '../data/weapons.js';
import { UPGRADES } from '../data/upgrades.js';
import { SPECIALS } from '../systems/specials.js';
import { drawUnit } from '../render/sprites.js';
import { iconCanvas } from '../render/icons.js';
import { SKILL_TREES, TREASURES } from '../data/trees.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['title', 'heroSelect', 'mapSelect', 'intro', 'levelup', 'pause', 'result', 'camp'];
const starText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function showScreen(name) {
  for (const s of SCREENS) $(s).hidden = s !== name;
}

/** Draws a hero, large, into a portrait canvas. */
export function drawPortrait(canvas, hero) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  ctx.translate(W * 0.5, W * 0.6);
  ctx.scale(W / 44, W / 44);
  const look = hero.look;
  drawUnit(ctx, { ...look, body: look.robe }, 0, 0, 12, 0.35, { scale: 1 });
}

const outfit = (save, heroId) => save.equipped[heroId] ?? {};
const itemById = (id) => EQUIPMENT.find((e) => e.id === id);
const forgeLv = (save, item) => save.forge?.[item.id] ?? 0;
/** "금관 +2" — the item name with its forge level. */
const itemName = (save, item) => `${item.name}${forgeLv(save, item) ? ` +${forgeLv(save, item)}` : ''}`;

/** Main menu: chosen hero and battlefield, start button and tabs. */
export function renderMain(save, sel) {
  const h = HEROES[sel.hero];
  drawPortrait($('mainPortrait'), h);
  $('mainHeroName').textContent = h.name;
  $('mainHeroMeta').textContent = `${h.title} · ${h.role}`;
  const wear = outfit(save, sel.hero);
  const gear = $('mainGear');
  gear.innerHTML = '';
  for (const sl of SLOTS) {
    const it = itemById(wear[sl.id]);
    const c = iconCanvas(it ? it.id : `empty:${sl.id}`, 30, `mini-icon${it ? '' : ' empty'}`);
    if (it) c.style.borderColor = GRADES[it.grade].color;
    c.title = it ? `${sl.name}: [${GRADES[it.grade].name}] ${itemName(save, it)}` : `${sl.name}: 비어 있음`;
    gear.appendChild(c);
  }
  gear.setAttribute('aria-label', SLOTS.map((sl) => `${sl.name} ${itemById(wear[sl.id])?.name ?? '없음'}`).join(', '));
  const st = STAGES[sel.stage];
  const boss = BOSSES[st.bossAlt[sel.hero] ?? st.boss];
  $('mainMapName').textContent = `${st.numeral} ${st.name}`;
  $('mainMapMeta').textContent = `${starText(st.difficulty.stars)} ${st.difficulty.label} · 보상 ×${REWARD_BY_STARS[st.difficulty.stars]} · 적장 ${boss.name}`;
  // Gear gate: without the required gear the march button stays shut.
  const gate = entryCheck(save, sel.hero, st);
  const req = $('mainReq');
  req.hidden = gate.ok;
  req.textContent = gate.ok ? '' : `출진 불가 — ${h.name}: ${gate.text}`;
  $('startBtn').disabled = !gate.ok;
  $('titleMoney').textContent = save.money.toLocaleString();
}

/**
 * Character select: hero cards, then the chosen hero's stats and outfit.
 * act = { pick(heroId), openSlot(slotId) }
 */
let heroTab = 'gear';

/** Small tab strip; `onPick(id)` re-renders with the chosen tab. */
function tabStrip(tabs, current, onPick) {
  const nav = document.createElement('div');
  nav.className = 'sub-tabs';
  nav.setAttribute('role', 'tablist');
  for (const [id, label] of tabs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `sub-tab${id === current ? ' on' : ''}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(id === current));
    b.textContent = label;
    b.addEventListener('click', () => onPick(id));
    nav.appendChild(b);
  }
  return nav;
}

export function renderHeroSelect(save, sel, act) {
  const list = $('heroList');
  list.innerHTML = '';
  for (const h of Object.values(HEROES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slip hero-card';
    b.disabled = !h.available;
    b.setAttribute('aria-pressed', String(h.id === sel.hero));
    b.innerHTML = `
      <span class="name">${h.name}</span>
      <span class="meta">${h.title} · ${h.role}</span>
`;
    b.addEventListener('click', () => act.pick(h.id));
    list.appendChild(b);
  }

  const h = HEROES[sel.hero];
  const m = metaBonus(save, h.id);
  const st = h.stats;
  const stat = (label, base, total, fmt = (v) => v) =>
    `<div><dt>${label}</dt><dd>${fmt(total)}${total !== base ? `<span class="up">기본 ${fmt(base)}</span>` : ''}</dd></div>`;
  const pct = (v) => `×${v.toFixed(2)}`;
  const weapon = WEAPONS[h.weapon].levels;
  const own = UPGRADES.filter((u) => u.heroes?.includes(h.id)).map((u) => u.title ?? u.name);
  const wear = outfit(save, h.id);

  const box = $('heroDetail');
  box.innerHTML = `
    <canvas class="portrait" width="280" height="280"></canvas>
    <div class="hd-body">
      <div class="hd-name">${h.name}<small>${h.hanja} · ${h.title}</small></div>
      <p class="hd-kit">
        <b>무기</b> ${weapon.map((w) => w.name).join(' → ')}<br>
        <b>고유기</b> ${SPECIALS[h.special].name} &nbsp; <b>전용 책략</b> ${own.join(', ')}
      </p>
      <dl class="hd-stats">
        ${stat('체력', st.maxHp, st.maxHp + (m.maxHp ?? 0))}
        ${stat('갑주', st.armor, st.armor + (m.armor ?? 0))}
        ${stat('위력', st.might, st.might * (1 + (m.might ?? 0)), pct)}
        ${stat('속공', st.haste, st.haste * (1 - (m.haste ?? 0)), pct)}
        ${stat('범위', st.area, st.area, pct)}
        ${stat('이동', st.speed, Math.round(st.speed * (1 + (m.speed ?? 0))))}
      </dl>
    </div>
    <div class="doll"></div>`;
  drawPortrait(box.querySelector('canvas'), h);
  // Paper-doll: weapon on the left, then the six gear slots in two rows.
  const doll = box.querySelector('.doll');
  const wpn = document.createElement('div');
  wpn.className = 'doll-slot weapon';
  wpn.style.gridArea = 'weapon';
  wpn.append(iconCanvas(h.weapon, 84, 'icon'));
  wpn.insertAdjacentHTML('beforeend', `<span class="dl">무기</span><span class="dn">${weapon[0].name}</span>`);
  doll.appendChild(wpn);
  const tr = (TREASURES[h.id] ?? []).find((t) => t.id === wear.treasure);
  const trCell = document.createElement('button');
  trCell.type = 'button';
  trCell.className = `doll-slot treasure${tr ? '' : ' empty'}`;
  trCell.style.gridArea = 'treasure';
  trCell.title = tr ? `${tr.name} — ${tr.desc}` : '보물: 비어 있음. 아래 보물 트리에서 고르세요';
  trCell.append(iconCanvas(tr ? tr.id : 'empty:treasure', 56, 'icon'));
  trCell.insertAdjacentHTML('beforeend', `<span class="dl">보물</span><span class="dn${tr ? '' : ' plus'}">${tr ? tr.name : '보물 탭에서'}</span>`);
  trCell.addEventListener('click', () => {
    heroTab = 'treasure';
    renderHeroSelect(save, sel, act);
  });
  doll.appendChild(trCell);
  for (const sl of SLOTS) {
    const it = itemById(wear[sl.id]);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `doll-slot${it ? '' : ' empty'}`;
    b.style.gridArea = sl.id;
    b.title = it ? `[${GRADES[it.grade].name}] ${itemName(save, it)} — ${bonusText(itemBonus(it, forgeLv(save, it)))}` : `${sl.name}: 비어 있음. 눌러서 상점으로`;
    if (it) b.style.setProperty('--grade', GRADES[it.grade].color);
    b.append(iconCanvas(it ? it.id : `empty:${sl.id}`, sl.id === 'body' ? 84 : 56, 'icon'));
    b.insertAdjacentHTML('beforeend', it
      ? `<span class="dl">${sl.name} · <i class="grade" style="color:${GRADES[it.grade].color}">${GRADES[it.grade].name}</i></span><span class="dn">${itemName(save, it)}</span>`
      : `<span class="dl">${sl.name}</span><span class="dn plus">+ 상점</span>`);
    b.addEventListener('click', () => act.openSlot(sl.id));
    doll.appendChild(b);
  }
  // Gear, skill tree and treasures share one panel, one tab at a time.
  const pick = (id) => {
    heroTab = id;
    renderHeroSelect(save, sel, act);
  };
  box.querySelector('.doll').before(tabStrip([['gear', '장비'], ['skill', '스킬 트리'], ['treasure', '보물']], heroTab, pick));
  renderBuild(box, save, h, act);
  box.querySelector('.doll').hidden = heroTab !== 'gear';
  box.querySelector('.build').hidden = heroTab !== 'skill';
  box.querySelector('.treasure-tree').hidden = heroTab !== 'treasure';
}

/**
 * Hero build: skill tree (two exclusive branches) and treasure tree.
 * act = { buyNode(node, branchId), respec(), buyTreasure(t), wearTreasure(t) }
 */
function renderBuild(box, save, h, act) {
  const tree = SKILL_TREES[h.id];
  const state = save.trees?.[h.id] ?? { nodes: [], branch: null };
  const has = (id) => state.nodes.includes(id);

  const sec = document.createElement('div');
  sec.className = 'build';
  sec.innerHTML = `<h3 class="build-title">영웅 수련 <small>스킬 트리 — 한 갈래를 골라 다른 방식으로 싸운다</small></h3>`;
  const grid = document.createElement('div');
  grid.className = 'tree';
  // Root
  const root = nodeCard(tree.root.name, tree.root.desc, has(tree.root.id) ? 'got' : 'open',
    has(tree.root.id) ? null : priceBtn(tree.root.price, save.money, () => act.buyNode(tree.root, null)));
  root.classList.add('root');
  grid.appendChild(root);
  for (const br of tree.branches) {
    const col = document.createElement('div');
    const chosen = state.branch === br.id;
    const locked = state.branch && !chosen;
    col.className = `branch${chosen ? ' chosen' : ''}${locked ? ' locked' : ''}`;
    col.innerHTML = `<div class="branch-head"><b>${br.name}</b><span>${br.style}</span></div>`;
    br.nodes.forEach((n, i) => {
      const prevOk = i === 0 ? has(tree.root.id) : has(br.nodes[i - 1].id);
      let st = 'locked';
      if (has(n.id)) st = 'got';
      else if (!locked && prevOk) st = 'open';
      const ctrl = st === 'open' ? priceBtn(n.price, save.money, () => act.buyNode(n, br.id)) : null;
      const note = st === 'locked' ? (locked ? '다른 길을 걷는 중' : i === 0 ? '뿌리 먼저' : '앞 단계 먼저') : null;
      col.appendChild(nodeCard(n.name, n.desc, st, ctrl, note));
    });
    grid.appendChild(col);
  }
  sec.appendChild(grid);
  if (state.branch) {
    const refund = Math.floor(0.9 * tree.branches.find((b) => b.id === state.branch).nodes.filter((n) => has(n.id)).reduce((a, n) => a + n.price, 0));
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'plain-btn respec';
    r.textContent = `길 바꾸기 (+${refund.toLocaleString()}냥 돌려받음)`;
    r.addEventListener('click', act.respec);
    sec.appendChild(r);
  }

  // Treasure tree
  const list = TREASURES[h.id] ?? [];
  const wearing = save.equipped?.[h.id]?.treasure;
  const owned = (t) => save.owned.includes(t.id);
  const tsec = document.createElement('div');
  tsec.className = 'treasure-tree';
  tsec.innerHTML = `<h3 class="build-title">보물 <small>아이템 트리 — 보물 칸에 하나를 끼운다</small></h3>`;
  const tgrid = document.createElement('div');
  tgrid.className = 'tree';
  const card = (t) => {
    const parentOk = !t.parent || save.owned.includes(t.parent);
    let st = owned(t) ? 'got' : parentOk ? 'open' : 'locked';
    let ctrl = null;
    if (owned(t)) ctrl = wearing === t.id ? tag('착용 중') : smallBtn('착용', () => act.wearTreasure(t));
    else if (parentOk) ctrl = priceBtn(t.price, save.money, () => act.buyTreasure(t));
    const c = nodeCard(t.name, t.desc, st, ctrl, st === 'locked' ? '앞 보물 먼저' : null, t.id);
    if (wearing === t.id) c.classList.add('worn');
    return c;
  };
  const base = list.find((t) => !t.parent);
  const rootCard = card(base);
  rootCard.classList.add('root');
  tgrid.appendChild(rootCard);
  for (const bid of ['A', 'B']) {
    const col = document.createElement('div');
    col.className = 'branch';
    const brName = tree.branches.find((b) => b.id === bid).name;
    col.innerHTML = `<div class="branch-head"><b>${brName} 보물</b></div>`;
    for (const t of list.filter((x) => x.branch === bid)) col.appendChild(card(t));
    tgrid.appendChild(col);
  }
  tsec.appendChild(tgrid);
  box.append(sec, tsec);
}

function nodeCard(name, desc, state, control, note, icon) {
  const c = document.createElement('div');
  c.className = `node ${state}`;
  if (icon) c.appendChild(iconCanvas(icon, 44, 'row-icon'));
  c.insertAdjacentHTML('beforeend', `<span class="nn">${name}</span><span class="nd">${desc}</span>`);
  if (control) c.appendChild(control);
  else if (state === 'got') c.appendChild(tag('습득'));
  else if (note) c.appendChild(tag(note));
  return c;
}

function priceBtn(price, money, onClick) {
  return button(`${price.toLocaleString()}냥`, 'buy-btn', onClick, money < price);
}

function smallBtn(label, onClick) {
  return button(label, 'wear-btn', onClick);
}

function tag(text) {
  return doneTag(text);
}

/** Battlefield picker. */
export function renderMapSelect(sel, onStage, save) {
  const stages = $('stageList');
  stages.innerHTML = '';
  for (const id of STAGE_ORDER) {
    const st = STAGES[id];
    const bossId = st.bossAlt[sel.hero] ?? st.boss;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stage-card';
    b.setAttribute('aria-pressed', String(id === sel.stage));
    b.innerHTML = `
      <span class="no">${st.numeral}</span>
      <span class="info">
        <b>${st.name}</b>
        <small class="diff" data-stars="${st.difficulty.stars}">${starText(st.difficulty.stars)} ${st.difficulty.label} <span class="reward-mul">· 보상 ×${REWARD_BY_STARS[st.difficulty.stars]} · 적장 ${BOSSES[bossId].name}</span></small>
        ${st.require ? (() => {
          const gate = entryCheck(save, sel.hero, st);
          return `<small class="req${gate.ok ? ' ok' : ''}">${gate.ok ? '출진 가능' : `🔒 ${gate.text}`}</small>`;
        })() : ''}
      </span>`;
    b.addEventListener('click', () => onStage(id));
    stages.appendChild(b);
  }
}

export function renderIntro(stage) {
  $('introYear').textContent = `${stage.year} · ${stage.place} · 난이도 ${stage.difficulty.label}`;
  $('introName').textContent = stage.name;
  $('introText').textContent = stage.intro;
}

export function renderChoices(choices, onPick) {
  const box = $('choices');
  box.innerHTML = '';
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `slip choice${c.evolution ? ' evo' : ''}`;
    const lvl = c.evolution
      ? '무기 진화'
      : c.level == null
        ? '보급'
        : c.id === 'weapon' || c.sub
          ? c.level === 1 ? '새 무기' : `무기 ${c.level}단계`
          : c.level === 1 ? '새 책략' : `Lv ${c.level - 1} → ${c.level}`;
    b.innerHTML = `
      <span class="key">${i + 1}</span>
      <span class="cat" data-cat="${c.category}">${c.category}</span>
      <span class="nm">${c.name}</span>
      <span class="lvl">${lvl}</span>
      <span class="ds">${c.desc}</span>`;
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
  box.querySelector('button')?.focus({ preventScroll: true });
}

/** Appends the right object particle (을/를) to a Korean word. */
function withObject(word) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (c >= 0 && c <= 11171 && c % 28 !== 0 ? '을' : '를');
}

const fmt = (s) => `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, '0')}초`;

export function renderResult(g, won) {
  const seal = $('resultSeal');
  seal.textContent = won ? '平\n定' : '敗\n退';
  seal.classList.toggle('lose', !won);
  const boss = g.bossGroup ?? g.boss?.def;
  $('resultTitle').textContent = won ? '평정 — 스테이지 클리어' : '패퇴';
  $('resultText').textContent = won
    ? `${withObject(boss?.name ?? '적장')} 꺾었다. ${g.stage.clearText}`
    : g.boss ? `${boss.name}의 진을 넘지 못했다. 책략을 바꿔 다시 도전하라.` : `${g.stage.name}에서 쓰러졌다. 이동 동선과 책략을 바꿔 다시 도전하라.`;
  // The last battlefield closes the story with its own ending.
  const end = won && g.stage.ending;
  seal.classList.toggle('ending', !!end);
  if (end) {
    seal.textContent = end.seal;
    $('resultTitle').textContent = end.title;
    $('resultText').textContent = end.alt?.[g.player.hero.id] ?? end.text;
  }
  $('nextBtn').hidden = !(won && g.stage.next);
  const r = g.reward;
  $('resultReward').innerHTML = r
    ? `획득 <b>+${r.total.toLocaleString()}</b>냥 <small>(전과 ${r.base} × 보상 ${r.mul.toFixed(2).replace(/\.?0+$/, '')})</small>`
    : '';
  $('resultStats').innerHTML = `
    <div><dt>버틴 시간</dt><dd>${fmt(g.time)}</dd></div>
    <div><dt>레벨</dt><dd>${g.player.level}</dd></div>
    <div><dt>처치</dt><dd>${g.kills}</dd></div>`;
}

const fmtMoney = (n) => n.toLocaleString();

/**
 * Camp: buy and wear gear (one item per slot), level training, learn hero
 * secrets. `act` = { buy(item), wear(item), train(t), learn(secret) }.
 */
let campTab = 'gear';
let campSlot = 'head';

export function renderCamp(save, heroId, act, focusSlot) {
  $('campMoney').textContent = fmtMoney(save.money);
  $('campHero').textContent = HEROES[heroId].name;
  const wearing = outfit(save, heroId);
  if (focusSlot) {
    campTab = 'gear';
    campSlot = focusSlot;
  }
  const again = () => renderCamp(save, heroId, act);
  const tabs = $('campTabs');
  tabs.innerHTML = '';
  tabs.append(tabStrip([['gear', '장비'], ['train', '수련'], ['secret', '비전'], ['record', '기록']], campTab, (id) => {
    campTab = id;
    again();
  }));
  $('campGearBox').hidden = campTab !== 'gear';
  $('campTraining').hidden = campTab !== 'train';
  $('campSecrets').hidden = campTab !== 'secret';
  $('campRecord').hidden = campTab !== 'record';
  if (campTab === 'record') renderRecord(save, act);

  // Slot chips: each shows what the hero wears there.
  const chips = $('campSlots');
  chips.innerHTML = '';
  for (const slot of SLOTS) {
    const it = itemById(wearing[slot.id]);
    const c = document.createElement('button');
    c.type = 'button';
    c.className = `slot-chip${slot.id === campSlot ? ' on' : ''}`;
    c.append(iconCanvas(it ? it.id : `empty:${slot.id}`, 28, 'mini-icon'));
    c.insertAdjacentHTML('beforeend', `<span>${slot.name}</span>`);
    if (it) c.style.setProperty('--grade', GRADES[it.grade].color);
    c.addEventListener('click', () => {
      campSlot = slot.id;
      again();
    });
    chips.appendChild(c);
  }

  const gear = $('campGear');
  gear.innerHTML = '';
  for (const slot of SLOTS.filter((sl) => sl.id === campSlot)) {
    const col = document.createElement('div');
    col.className = 'camp-slot';
    col.dataset.slot = slot.id;
    for (const item of EQUIPMENT.filter((e) => e.slot === slot.id)) {
      const owned = save.owned.includes(item.id);
      const worn = wearing[slot.id] === item.id;
      const grade = GRADES[item.grade];
      const lv = forgeLv(save, item);
      const name = `<i class="grade" style="color:${grade.color}">${grade.name}</i> ${itemName(save, item)}`;
      let control;
      if (owned) {
        control = document.createElement('span');
        control.className = 'ctrl-pair';
        control.append(worn ? doneTag('착용 중') : button('착용', 'wear-btn', () => act.wear(item)));
        if (lv < FORGE.max) {
          const cost = forgeCost(item, lv);
          const fb = button(`제련 ${fmtMoney(cost)}냥 · ${Math.round(FORGE.chance[lv] * 100)}%`, 'forge-btn', () => act.forge(item), save.money < cost);
          fb.title = `+${lv + 1} 제련: 성공하면 능력치 +${Math.round(FORGE.step * 100)}%p. 실패해도 냥은 사라진다.`;
          control.append(fb);
        } else control.append(doneTag('+5 완성'));
      } else if (!gradeOpen(save, item)) {
        control = doneTag(`★${grade.needStars} 전장 격파 시 해금`);
        control.classList.add('locked');
      } else {
        control = button(`${fmtMoney(item.price)}냥`, 'buy-btn', () => act.buy(item), save.money < item.price);
      }
      const desc = lv ? bonusText(itemBonus(item, lv)) + (item.note ? `. ${item.note}` : '') : item.desc;
      const row = itemRow(name, desc, worn, control, item.id);
      row.style.setProperty('--grade', grade.color);
      if (!owned && !gradeOpen(save, item)) row.classList.add('sealed');
      col.appendChild(row);
    }
    gear.appendChild(col);
  }

  const tr = $('campTraining');
  tr.innerHTML = '';
  for (const t of TRAINING) {
    const lv = save.training[t.id] ?? 0;
    const maxed = lv >= t.max;
    const cost = maxed ? 0 : t.price(lv);
    tr.appendChild(itemRow(`${t.name} <span class="lv">Lv ${lv}/${t.max}</span>`, t.desc, lv > 0,
      maxed ? doneTag('완료') : button(`${fmtMoney(cost)}냥`, 'buy-btn', () => act.train(t), save.money < cost)));
  }

  const se = $('campSecrets');
  se.innerHTML = '';
  for (const sc of SECRETS) {
    const has = save.secrets.includes(sc.id);
    const hero = HEROES[sc.hero].name;
    se.appendChild(itemRow(`${sc.name} <span class="lv">${hero}</span>`, sc.desc, has,
      has ? doneTag('습득') : button(`${fmtMoney(sc.price)}냥`, 'buy-btn', () => act.learn(sc), save.money < sc.price)));
  }
}

/**
 * 기록 tab: copy the save as a code, or paste a code from another device.
 * act.exportCode() → string, act.importCode(text) → { ok, message }.
 */
function renderRecord(save, act) {
  const box = $('campRecord');
  box.innerHTML = `
    <div class="record-card">
      <h4>내 기록 내보내기</h4>
      <p>이 코드를 복사해 두면 다른 기기나 브라우저에서 그대로 이어서 할 수 있어요. 백업용으로도 좋아요.</p>
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
  const out = box.querySelector('#saveCodeOut');
  out.value = act.exportCode();
  out.addEventListener('focus', () => out.select());
  const msg = box.querySelector('#saveMsg');
  box.querySelector('#saveCopy').addEventListener('click', async () => {
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
  const load = box.querySelector('#saveLoad');
  const input = box.querySelector('#saveCodeIn');
  let armed = false;
  input.addEventListener('input', () => {
    armed = false;
    load.textContent = '불러오기';
    load.className = 'wear-btn';
  });
  load.addEventListener('click', () => {
    const r = act.importCode(input.value, armed);
    if (r.ok) {
      // renderCamp rebuilt this tab; report on the fresh message line.
      const m = $('saveMsg');
      m.textContent = r.message;
      m.className = 'record-msg ok';
      return;
    }
    armed = !!r.needConfirm;
    load.textContent = armed ? '정말 덮어쓰기' : '불러오기';
    load.className = armed ? 'buy-btn' : 'wear-btn';
    msg.textContent = r.message;
    msg.className = `record-msg ${armed ? 'warn' : 'fail'}`;
  });
}

function itemRow(nameHtml, desc, on, control, icon) {
  const row = document.createElement('div');
  row.className = `camp-item${on ? ' on' : ''}${icon ? ' with-icon' : ''}`;
  if (icon) row.appendChild(iconCanvas(icon, 44, 'row-icon'));
  row.insertAdjacentHTML('beforeend', `<span class="nm">${nameHtml}</span><span class="ds">${desc}</span>`);
  row.appendChild(control);
  return row;
}

function button(label, cls, onClick, disabled = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function doneTag(text) {
  const t = document.createElement('span');
  t.className = 'done-tag';
  t.textContent = text;
  return t;
}
