import { GRADES } from '../data/meta.js';
import { NANSE_CARDS } from '../data/nanse.js';
import { SPIRITS } from '../data/spirits.js';
import { josa } from '../core/korean.js';

const $ = (id) => document.getElementById(id);
const MENUS = ['home', 'heroes', 'grow', 'map', 'prep', 'nanse', 'codex', 'spirit', 'reward'];
/** Which bottom-menu button a screen belongs to: 출진 · 강화 · 보상 · 도감. */
const NAV_OF = { map: 'map', nanse: 'map', prep: 'map', heroes: 'heroes', grow: 'heroes', spirit: 'heroes', reward: 'reward', codex: 'codex' };
const SCREENS = [...MENUS, 'intro', 'levelup', 'pause', 'result'];
export const starText = (n) => (n > 5 ? '★★★★★💀' : '★'.repeat(n) + '☆'.repeat(5 - n));

/** Shows one overlay screen (or none during play). The bottom menu shows on menu screens. */
export function showScreen(name) {
  for (const s of SCREENS) $(s).hidden = s !== name;
  // A home dungeon sheet never outlives the home screen.
  if (name !== 'home') document.querySelector('.sheet-back')?.remove();
  $('bottomNav').hidden = !MENUS.includes(name);
  for (const b of $('bottomNav').querySelectorAll('button')) b.classList.toggle('on', b.dataset.go === NAV_OF[name]);
}

export function renderIntro(stage, daily = null, endless = false) {
  const tag = daily ? '📅 오늘의 전장 · ' : endless ? '♾️ 무한 전장 · ' : stage.altar ? '🏯 사신의 제단 · ' : stage.nanse ? `🔥 난세 ${stage.nanse.level}단계 · ` : '';
  $('introYear').textContent = `${tag}${stage.year} · ${stage.place} · 난이도 ${stage.difficulty.label}`;
  $('introName').textContent = stage.name;
  $('introText').textContent = daily
    ? daily.rules.map((r) => `${r.icon} ${r.name} — ${r.desc}`).join('\n')
    : endless ? '빛이 닿지 않는 마계. 적은 갈수록 많아지고, 적장은 3분마다 더 강해져 돌아온다.\n한 자리에 머물면 신의 분노가 떨어진다 — 쓰러질 때까지 움직이며 버텨라!'
    : stage.nanse ? NANSE_CARDS.filter((c) => stage.nanse.cards[c.id]).map((c) => `${c.icon} ${c.name} — ${c.desc(stage.nanse.cards[c.id])}`).join('\n') : stage.intro;
}

/** Icon and colour per 책략 category. */
const CAT = { 무예: '⚔️', 병법: '📜', 지세: '🌿', 보급: '🍙' };

/** Level-up: three sticker cards that flip in one after another. */
export function renderChoices(choices, onPick, onReroll = null, rerolls = 0) {
  const box = $('choices');
  box.innerHTML = '';
  box.dataset.n = choices.length;
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pick-card${c.evolution ? ' evo' : c.evoFor ? ' evo-need' : ''}`;
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
      <span class="pc-desc">${c.desc}</span>${c.evoFor ? c.evoFor.map((e) => `
      <span class="pc-evo">🌟 진화 재료 · ${e.name}<em>${e.now} → ${e.now + 1} / ${e.need}</em></span>`).join('') : ''}`;
    b.addEventListener('click', () => onPick(i));
    box.appendChild(b);
  });
  if (onReroll) {
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'reroll-btn';
    r.textContent = `🦉 다시 뽑기 (${rerolls})`;
    r.addEventListener('click', onReroll);
    box.appendChild(r);
  }
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
    : g.boss ? `${boss.name}의 진을 넘지 못했다. 책략을 바꿔 다시 도전하자.` : `${g.stage.name}에서 쓰러졌다. 장비를 갖추고 다시 도전하자.`;
  // The last battlefield closes the story with its own ending.
  const end = won && g.stage.ending;
  seal.classList.toggle('ending', !!end);
  if (end) {
    seal.textContent = end.seal;
    $('resultTitle').textContent = end.title;
    $('resultText').textContent = end.alt?.[g.player.hero.id] ?? end.text;
  }
  // ♾️ 무한 전장 ends only in defeat: show it as a record, not a loss.
  const en = extra.endless;
  if (en) {
    seal.textContent = '無\n限';
    seal.classList.remove('lose');
    $('resultTitle').textContent = en.isNew ? '♾️ 새 최고 기록!' : '♾️ 무한 전장';
    $('resultText').textContent = `${fmt(en.time)} 버티고 적장 ${en.bosses}명을 쓰러뜨렸다.${en.isNew ? '' : ` (최고 ${fmt(en.best.time)})`}`;
  }
  $('nextBtn').hidden = !(won && g.stage.next) || !!g.stage.daily || !!en;
  // Dungeons: try again right away, or go back to that dungeon's own screen.
  const mode = g.stage.altar ? 'altar' : g.stage.daily ? 'daily' : g.stage.endless ? 'endless' : null;
  $('toMapBtn').textContent = { altar: '🏯 제단으로', daily: '📅 오늘의 전장으로', endless: '♾️ 무한 전장으로' }[mode] ?? '🗺️ 전장으로';
  const tickets = extra.altar?.tickets;
  $('retryBtn').textContent = mode === 'altar' ? `🔁 다시 도전 · 🎟️ ${tickets ?? 0}` : mode ? '🔁 다시 도전' : '다시 출진';
  $('retryBtn').disabled = mode === 'altar' && !(tickets > 0);
  const r = g.reward;
  const rows = [];
  const al = extra.altar;
  if (al) {
    rows.push(['🔮', '영주', `<span class="count-up" data-to="${al.yeongju}">+0</span>`]);
    rows.push(['✨', '모은 영기', `${al.wisps}개 × ${al.tier}단계${won ? ' + 평정 보너스' : ''}`]);
    if (al.essence) rows.push(['🌟', '사신 정수', `+${al.essence}`]);
    if (al.newTier) rows.push(['🏯', `제단 ${al.tier}단계 첫 평정`, `${al.tier + 1 <= al.maxTier ? `${al.tier + 1}단계 열림!` : '최고 단계!'}`]);
    rows.push(['🎟️', '남은 입장권', `${al.tickets}장`]);
  } else if (r && en) rows.push(['💎', '결기수정', `<span class="count-up" data-to="${r.crystals ?? 0}">+0</span>`]);
  else if (r) rows.push(['🪙', '냥', `<span class="count-up" data-to="${r.total}">+0</span>`]);
  if (r && g.opts.quick) rows.push(['⚡', '빠른 시험 모드', '냥 35%']);
  if (r?.bossBonus) rows.push(['👑', '적장 토벌 보상', `+${r.bossBonus.toLocaleString()}`]);
  if (extra.dailyBonus) rows.push(['📅', '오늘의 전장 보상', `+${extra.dailyBonus.toLocaleString()}`]);
  if (extra.nanse) rows.push(['🔥', `난세 ${extra.nanse.level}단계 평정`, extra.nanse.isNew ? '최고 기록!' : '']);
  if (extra.nanse?.bonus) rows.push(['🏮', '난세 돌파 보상', `+${extra.nanse.bonus.toLocaleString()}`]);
  if (extra.nanse?.relic) rows.push(['🌟', `신물 획득 · ${extra.nanse.relic}`, '획득!']);
  if (en) rows.push(['♾️', '적장 격파', `${en.bosses}명`]);
  rows.push(['⭐', '공훈', `Lv ${g.player.level}`]);
  rows.push(['⚔️', '처치', `${g.kills}`]);
  rows.push(['⏱️', '버틴 시간', fmt(g.time)]);
  for (const u of extra.unlocks ?? []) rows.push(['🏆', `업적 · ${u}`, '달성!']);
  if (extra.newFoes) rows.push(['📖', '도감에 새 적', `+${extra.newFoes}`]);
  if (extra.spiritGift) rows.push([SPIRITS[extra.spiritGift].icon, `첫 영물 · ${josa(SPIRITS[extra.spiritGift].name, '이')} 따라왔다!`, '동행!']);
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
