import { drawUnit } from '../render/sprites.js';
import { GRADES } from '../data/meta.js';

const $ = (id) => document.getElementById(id);
const MENUS = ['home', 'heroes', 'grow', 'map', 'prep', 'codex'];
const SCREENS = [...MENUS, 'intro', 'levelup', 'pause', 'result'];
export const starText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Shows one overlay screen (or none during play). The bottom menu shows on menu screens. */
export function showScreen(name) {
  for (const s of SCREENS) $(s).hidden = s !== name;
  $('bottomNav').hidden = !MENUS.includes(name);
  for (const b of $('bottomNav').querySelectorAll('button')) b.classList.toggle('on', b.dataset.go === name);
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

export function renderIntro(stage) {
  $('introYear').textContent = `${stage.year} · ${stage.place} · 난이도 ${stage.difficulty.label}`;
  $('introName').textContent = stage.name;
  $('introText').textContent = stage.intro;
}

/** Icon and colour per 책략 category. */
const CAT = { 무예: '⚔️', 병법: '📜', 지세: '🌿', 보급: '🍙' };

/** Level-up: three sticker cards that flip in one after another. */
export function renderChoices(choices, onPick) {
  const box = $('choices');
  box.innerHTML = '';
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick-card${c.evolution ? ' evo' : ''}`;
    b.dataset.cat = c.category;
    b.style.setProperty('--i', i);
    const lvl = c.evolution
      ? '🌟 무기 진화'
      : c.level == null
        ? '보급'
        : c.id === 'weapon' || c.sub
          ? c.level === 1 ? '🆕 새 무기' : `무기 ${c.level}단계`
          : c.level === 1 ? '🆕 새 책략' : `Lv ${c.level - 1} → ${c.level}`;
    b.innerHTML = `
      <span class="pc-sticker">${CAT[c.category] ?? '✨'} ${c.category}</span>
      <span class="pc-key">${i + 1}</span>
      <span class="pc-icon">${c.evolution ? '🌟' : CAT[c.category] ?? '✨'}</span>
      <b class="pc-name">${c.name}</b>
      <span class="pc-lvl">${lvl}</span>
      <span class="pc-desc">${c.desc}</span>`;
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
  box.querySelector('button')?.focus({ preventScroll: true });
}

const fmt = (s) => `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, '0')}초`;

/**
 * Result card. `extra` = { unlocks: [text], newFoes: n } — what this run opened up.
 */
export function renderResult(g, won, extra = {}) {
  const seal = $('resultSeal');
  seal.textContent = won ? '平\n定' : '敗\n退';
  seal.classList.toggle('lose', !won);
  const boss = g.bossGroup ?? g.boss?.def;
  $('resultTitle').textContent = won ? '⚔️ 승리' : '패퇴';
  const stars = g.stage.difficulty.stars;
  $('resultStars').innerHTML = won
    ? Array.from({ length: 5 }, (_, i) => `<span class="rs${i < stars ? ' on' : ''}" style="--i:${i}">${i < stars ? '★' : '☆'}</span>`).join('')
    : '';
  $('resultText').textContent = won
    ? `${boss?.name ?? '적장'} 처치! ${g.stage.clearText}`
    : g.boss ? `${boss.name}의 진을 넘지 못했다. 책략을 바꿔 다시 도전하자.` : `${g.stage.name}에서 쓰러졌다. 장비나 빌드를 바꿔 보자.`;
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
  const rows = [];
  if (r) rows.push(['🪙', '냥', `<span class="count-up" data-to="${r.total}">+0</span>`]);
  if (r?.bossBonus) rows.push(['👑', '적장 토벌 보상', `+${r.bossBonus.toLocaleString()}`]);
  rows.push(['⭐', '공훈', `Lv ${g.player.level}`]);
  rows.push(['⚔️', '처치', `${g.kills}`]);
  rows.push(['⏱️', '버틴 시간', fmt(g.time)]);
  for (const u of extra.unlocks ?? []) rows.push(['🏆', `업적 · ${u}`, '달성!']);
  if (extra.newFoes) rows.push(['📖', '도감에 새 적', `+${extra.newFoes}`]);
  $('resultRows').innerHTML = rows.map(([i, k, v], n) => `<li style="--i:${n}"><span>${i} ${k}</span><b>${v}</b></li>`).join('');
  countUp($('resultRows').querySelector('.count-up'));
  confetti(won);
}

/** Grade name in its colour. */
export const gradeTag = (g) => `<i class="grade" style="color:${GRADES[g].color}">${GRADES[g].name}</i>`;

/** Money ticks up from 0 (차르르). */
function countUp(el) {
  if (!el) return;
  const to = Number(el.dataset.to);
  const start = performance.now() + 500;
  const step = (now) => {
    const t = Math.max(0, Math.min(1, (now - start) / 900));
    el.textContent = `+${Math.round(to * (1 - (1 - t) ** 3)).toLocaleString()}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Paper confetti over the result card when the battle is won. */
function confetti(on) {
  const box = $('resultConfetti');
  box.innerHTML = '';
  if (!on) return;
  const colors = ['#ff9fb8', '#8fe3c0', '#9ccfff', '#ffe08a', '#c9a8ff', '#ff8a72'];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.8}s`;
    p.style.animationDuration = `${2.2 + Math.random() * 1.4}s`;
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    box.appendChild(p);
  }
}
