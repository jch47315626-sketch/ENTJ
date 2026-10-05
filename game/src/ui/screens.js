import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';
import { SLOTS, EQUIPMENT, TRAINING, SECRETS, REWARD_BY_STARS } from '../data/meta.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['title', 'intro', 'levelup', 'pause', 'result', 'camp'];
const starText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export function showScreen(name) {
  for (const s of SCREENS) $(s).hidden = s !== name;
}

/** Hero slips and stage cards on the title screen. */
export function renderTitle(sel, onHero, onStage) {
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
      <span class="blurb">${h.blurb}</span>
      ${h.available ? '' : '<span class="lock">준비 중</span>'}`;
    b.addEventListener('click', () => onHero(h.id));
    list.appendChild(b);
  }
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
        <small>${st.year} · ${st.place} · 적장 ${BOSSES[bossId].name}</small>
        <small class="diff" data-stars="${st.difficulty.stars}">난이도 ${starText(st.difficulty.stars)} ${st.difficulty.label} <span class="reward-mul">· 보상 ×${REWARD_BY_STARS[st.difficulty.stars]}</span></small>
        <small>${st.intro}</small>
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
  const boss = g.boss?.def;
  $('resultTitle').textContent = won ? '평정 — 스테이지 클리어' : '패퇴';
  $('resultText').textContent = won
    ? `${withObject(boss?.name ?? '적장')} 꺾었다. ${g.stage.clearText}`
    : g.boss ? `${boss.name}의 진을 넘지 못했다. 책략을 바꿔 다시 도전하라.` : `${g.stage.name}에서 쓰러졌다. 이동 동선과 책략을 바꿔 다시 도전하라.`;
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
export function renderCamp(save, heroId, act) {
  $('campMoney').textContent = fmtMoney(save.money);

  const gear = $('campGear');
  gear.innerHTML = '';
  for (const slot of SLOTS) {
    const col = document.createElement('div');
    col.className = 'camp-slot';
    col.innerHTML = `<h4>${slot.name}</h4>`;
    for (const item of EQUIPMENT.filter((e) => e.slot === slot.id)) {
      const owned = save.owned.includes(item.id);
      const worn = save.equipped[slot.id] === item.id;
      col.appendChild(itemRow(item.name, item.desc, worn, owned
        ? worn ? doneTag('착용 중') : button('착용', 'wear-btn', () => act.wear(item))
        : button(`${fmtMoney(item.price)}냥`, 'buy-btn', () => act.buy(item), save.money < item.price)));
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

function itemRow(nameHtml, desc, on, control) {
  const row = document.createElement('div');
  row.className = `camp-item${on ? ' on' : ''}`;
  row.innerHTML = `<span class="nm">${nameHtml}</span><span class="ds">${desc}</span>`;
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
