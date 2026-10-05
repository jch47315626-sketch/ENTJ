import { HEROES } from '../data/heroes.js';
import { STAGES, STAGE_ORDER } from '../data/stages.js';
import { BOSSES } from '../data/bosses.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['title', 'intro', 'levelup', 'pause', 'result'];

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
        <small class="diff" data-stars="${st.difficulty.stars}">난이도 ${'★'.repeat(st.difficulty.stars)}${'☆'.repeat(3 - st.difficulty.stars)} ${st.difficulty.label}</small>
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
  $('resultStats').innerHTML = `
    <div><dt>버틴 시간</dt><dd>${fmt(g.time)}</dd></div>
    <div><dt>레벨</dt><dd>${g.player.level}</dd></div>
    <div><dt>처치</dt><dd>${g.kills}</dd></div>`;
}
