import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { Tutorial } from './ui/tutorial.js';
import { Sound } from './audio/sound.js';
import { themeFor } from './audio/music.js';
import { showScreen, renderIntro, renderChoices, renderResult } from './ui/screens.js';
import { renderHome, renderHeroes, renderGrow, renderMap, renderPrep, renderNanse, renderCodex, setCodexTab } from './ui/menu.js';
import { loadSave, writeSave, outfitOf, encodeSave, decodeSave } from './core/save.js';
import { runFacts, recordRun, checkAchievements, claimAchievement, readyCount } from './core/achieve.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { dailyFor, dailyHeroBonus, todayKey } from './data/daily.js';
import { josa } from './core/korean.js';
import { NANSE_CARDS, NANSE_MILESTONES, milestoneBonus, nanseLevel } from './data/nanse.js';
import { gyeolgiCost } from './data/gyeolgi.js';
import { metaBonus, FORGE, forgeCost, gradeOpen, entryCheck, EQUIPMENT, RELICS } from './data/meta.js';
import { ensureGearOptions, rollOptions, rerollLine, engraveCost, lineText, NAMES } from './data/gearOptions.js';
import { UPGRADES } from './data/upgrades.js';
import { helpById } from './data/help.js';
import { STAGES } from './data/stages.js';
import { HEROES } from './data/heroes.js';

const $ = (id) => document.getElementById(id);
const canvas = $('field');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new Hud();
const sound = new Sound();
const tutor = new Tutorial();

let game = null;
const sel = { hero: 'wanggeon', stage: 'seonamhae' };
const save = loadSave();
// Display names for gear 비기 lines (data/gearOptions.js).
for (const u of UPGRADES) NAMES.upgrade[u.id] = u.title ?? (typeof u.name === 'string' ? u.name : u.id);
ensureGearOptions(save, EQUIPMENT); // older saves: every owned piece gets its option lines
writeSave(save); // persist any format migration right away
let introTimer = 0;
/** The 오늘의 전장 being played (so 다시 출진 replays it), or null. */
let runDaily = null;
/** Playing ♾️ 무한 전장 (so 다시 출진 replays it). */
let runEndless = false;
const ENDLESS_RUN = { endless: true };

/** Starts a battle: the chosen hero and field, a daily challenge, or endless mode. */
function newGame(mode = null) {
  runDaily = mode?.rules ? mode : null;
  runEndless = !!mode?.endless;
  const heroId = runDaily?.heroId ?? sel.hero;
  const stageId = runDaily?.stageId ?? sel.stage;
  // Gear gate: send the player back to the menu, where the reason is shown.
  if (!runDaily && !entryCheck(save, sel.hero, STAGES[sel.stage]).ok) {
    toMenu('prep');
    return;
  }
  // Remember the choice so the next visit opens on the same hero and field.
  if (!runDaily) save.sel = { hero: sel.hero, stage: sel.stage };
  writeSave(save);
  // 난세 단계: only on a battlefield already pacified, in a normal run.
  const nanse = !runDaily && !runEndless && save.best?.[stageId] && nanseLevel(save.nanseCards) > 0 ? { ...save.nanseCards } : null;
  const meta = metaBonus(save, heroId);
  if (runDaily) {
    const hb = dailyHeroBonus(runDaily);
    if (hb.might) meta.might = (meta.might ?? 0) + hb.might;
    if (hb.hpMul) meta.hpMul = hb.hpMul;
  }
  sound.unlock();
  input.reset();
  hud.clearBanner();
  game = new Game({
    heroId,
    stageId,
    daily: runDaily,
    endless: runEndless,
    nanse,
    objectsTip: !save.tipsSeen?.objects,
    quick: !runDaily && !runEndless && $('quickMode').checked,
    onBanner: (t, size) => hud.banner(t, size),
    onState,
    onBoss: (def) => hud.bossIntro(def),
    onSfx: (name) => sound.sfx(name),
    meta,
  });
  window.__game = game; // handy for debugging from the console
  renderer.render(game, input, 0);
  hud.show(true);
  hud.update(game, 0, true);
  renderIntro(game.stage, runDaily, runEndless);
  showScreen('intro');
  introTimer = 2.6;
  // First battle ever: guided steps. After that, no hints — the player knows the controls.
  if (!save.tutorialDone) tutor.start();
  else tutor.stop();
  sound.setIntensity(0);
  sound.startMusic(themeFor(stageId));
  if (runDaily) sound.sfx('daily');
}

function onState(state, g) {
  if (state === 'levelup') {
    renderChoices(g.choices, (i) => {
      sound.sfx('pick');
      g.choose(i);
    });
    sound.sfx('flip');
    showScreen('levelup');
    tutor.onLevelup(g);
  } else if (state === 'paused') {
    sound.stopMusic();
    hud.fillPause(g);
    showScreen('pause');
  } else if (state === 'play') {
    sound.startMusic(); // resume this field's theme
    showScreen(null);
    tutor.onPick(g);
  } else if (state === 'over' || state === 'clear') {
    sound.stopMusic();
    // One run with the tutorial on is enough; it can be replayed from home.
    if (tutor.active || tutor.finished) {
      tutor.stop();
      save.tutorialDone = true;
    }
    // Bank the run's money and records once.
    if (g.reward && !g.rewardBanked) {
      g.rewardBanked = true;
      if (g.objectsTipShown) (save.tipsSeen ??= {}).objects = true;
      const known = new Set(Object.keys(save.codex.kills));
      save.money += g.reward.total;
      if (g.reward.crystals) save.crystals = (save.crystals ?? 0) + g.reward.crystals;
      if (state === 'clear') save.best[g.stage.id] = Math.max(save.best[g.stage.id] ?? 0, g.reward.stars);
      const c = save.codex;
      c.runs += 1;
      if (state === 'clear') c.wins += 1;
      c.earned += g.reward.total;
      for (const [id, n] of Object.entries(g.killsBy)) c.kills[id] = (c.kills[id] ?? 0) + n;
      // ♾️ 무한 전장: keep the best time per battlefield.
      let endless = null;
      if (g.stage.endless) {
        save.endless ??= {};
        const prev = save.endless[g.stage.id];
        const isNew = !prev || g.time > prev.time;
        if (isNew) save.endless[g.stage.id] = { time: Math.floor(g.time), kills: g.kills, bosses: g.endlessBosses, hero: g.player.hero.id };
        endless = { time: g.time, bosses: g.endlessBosses, isNew, best: save.endless[g.stage.id] };
      }
      // 난세 단계: best 단계 per field and hero, and one-time milestone bonuses.
      let nanseInfo = null;
      if (g.stage.nanse && state === 'clear') {
        const lv = g.stage.nanse.level;
        save.nanse ??= {};
        const rec = (save.nanse[g.stage.id] ??= {});
        const prevBest = Math.max(0, ...Object.values(rec));
        const isNew = lv > (rec[g.player.hero.id] ?? 0);
        if (isNew) rec[g.player.hero.id] = lv;
        let bonus = 0;
        for (const m of NANSE_MILESTONES) if (lv >= m && prevBest < m) bonus += milestoneBonus(m, g.stage.difficulty.stars);
        bonus = Math.round(bonus);
        save.money += bonus;
        c.earned += bonus;
        save.stats.nanseBest = Math.max(save.stats.nanseBest ?? 0, lv);
        // 신물: clearing 난세 10+ may grant one of this hero's relics not yet owned.
        let relic = null;
        const missing = RELICS.filter((r) => r.hero === g.player.hero.id && !save.owned.includes(r.id));
        if (lv >= 10 && missing.length && Math.random() < Math.min(0.9, 0.3 + 0.03 * (lv - 10))) {
          relic = missing[Math.floor(Math.random() * missing.length)];
          save.owned.push(relic.id);
          save.gearOpts ??= {};
          save.gearOpts[relic.id] = rollOptions(relic);
          save.stats.relics = (save.stats.relics ?? 0) + 1;
        }
        nanseInfo = { level: lv, isNew, bonus, relic: relic?.name };
      }
      const run = runFacts(g, state === 'clear', save);
      recordRun(save, run);
      // 오늘의 전장: the first win of that day pays its bonus once.
      let dailyBonus = 0;
      const dd = g.stage.daily;
      if (dd && state === 'clear') {
        if (save.daily?.date !== dd.date) save.daily = { date: dd.date, cleared: false };
        if (!save.daily.cleared) {
          save.daily.cleared = true;
          dailyBonus = dd.reward;
          save.money += dailyBonus;
          c.earned += dailyBonus;
          save.stats.dailyWins = (save.stats.dailyWins ?? 0) + 1;
        }
      }
      const unlocked = checkAchievements(save, run);
      writeSave(save);
      updateBadge();
      // What this run added to the 도감, for the result card.
      g.resultExtra = { dailyBonus, endless, nanse: nanseInfo, unlocks: unlocked.map((a) => `${a.icon} ${a.name}`), newFoes: Object.keys(g.killsBy).filter((id) => !known.has(id)).length };
    }
    renderResult(g, state === 'clear', g.resultExtra);
    if (g.resultExtra?.unlocks.length && !g.achieveSounded) {
      g.achieveSounded = true;
      setTimeout(() => sound.sfx('achieve'), 1900);
    }
    showScreen('result');
  }
}

// ------------------------------------------------------------------ menus

const RENDER = { home: renderHome, heroes: renderHeroes, grow: renderGrow, map: renderMap, prep: renderPrep, nanse: renderNanse, codex: renderCodex };
let menu = 'home';

/** Leaves any run and opens a menu screen. */
function toMenu(name = 'home') {
  game = null;
  tutor.stop();
  sound.setIntensity(0);
  sound.startMusic('menu');
  hud.show(false);
  hud.clearBanner();
  go(name);
}

function go(name) {
  menu = name;
  RENDER[name](save, sel, act);
  showScreen(name);
  $(name).scrollTop = 0;
  menuTips(name);
}

// ------------------------------------------------------------ 새 기능 안내

/** One-time explainer cards, shown the first time each system comes into view. */
const tipQueue = [];
function showTip(id) {
  save.tipsSeen ??= {};
  if (save.tipsSeen[id] || tipQueue.includes(id)) return;
  tipQueue.push(id);
  if (tipQueue.length === 1) openTip();
}
function openTip() {
  const h = helpById(tipQueue[0]);
  if (!h) return tipQueue.shift();
  $('tipIcon').textContent = h.icon;
  $('tipTitle').textContent = h.title;
  $('tipText').innerHTML = h.lines.map((l) => `<li>${l}</li>`).join('');
  $('tipBox').hidden = false;
}
$('tipOk').addEventListener('click', () => {
  const id = tipQueue.shift();
  save.tipsSeen ??= {};
  save.tipsSeen[id] = true;
  writeSave(save);
  $('tipBox').hidden = true;
  if (tipQueue.length) openTip();
});

/** Which systems a menu screen shows, once the player can actually use them. */
function menuTips(name) {
  if (!save.tutorialDone) return;
  const mine = save.owned.filter((id) => save.gearOpts?.[id] && EQUIPMENT.some((e) => e.id === id));
  const lines = mine.flatMap((id) => save.gearOpts[id]);
  if (name === 'home' && save.codex.runs >= 1) showTip('modes');
  if ((name === 'nanse' || name === 'prep') && save.best?.[sel.stage]) showTip('nanse');
  if (name === 'heroes' && save.codex.runs >= 1) showTip('gear');
  if (name === 'codex' && readyCount(save)) showTip('ach');
  if (name === 'heroes' && mine.length) {
    showTip('gearOpts');
    if (lines.some((l) => l.special)) showTip('bigi');
    if (mine.some((id) => id.includes('.relic_'))) showTip('relic');
  }
  if (name === 'grow') showTip('tree');
}

/** Redraw the open menu in place (after buying or wearing something). */
function refresh() {
  const y = $(menu).scrollTop;
  RENDER[menu](save, sel, act);
  $(menu).scrollTop = y;
}

function toast(text, ok = true) {
  const el = $('toast');
  el.textContent = text;
  el.className = `toast ${ok ? 'ok' : 'fail'}`;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 1800);
}

const spend = (cost) => {
  if (save.money < cost) return false;
  save.money -= cost;
  return true;
};

/** 업적 met outside battle (buying, forging): toast them. */
function checkMenuAchievements() {
  const fresh = checkAchievements(save);
  if (fresh.length) {
    toast(`🏆 업적 달성! ${fresh.map((a) => a.name).join(', ')} — 도감에서 보상 받기`);
    setTimeout(() => sound.sfx('achieve'), 250);
  }
  updateBadge();
}

/** Red dot on 📖 도감 while some 업적 reward is waiting. */
function updateBadge() {
  const n = readyCount(save);
  const b = $('bottomNav').querySelector('[data-go="codex"]');
  b.dataset.badge = n ? String(n) : '';
}

/** Saves, plays a purchase sound and redraws. */
function done(sfx = 'buy') {
  checkMenuAchievements();
  writeSave(save);
  sound.unlock();
  sound.sfx(sfx);
  refresh();
}

const act = {
  go,
  refresh,
  toast,
  start: () => newGame(),
  startDaily: () => newGame(dailyFor(todayKey())),
  startEndless: () => newGame(ENDLESS_RUN),
  /** 난세 패: change one card's rank (clamped), remembered for the next runs. */
  setNanse(id, rank) {
    const card = NANSE_CARDS.find((c) => c.id === id);
    if (!card) return;
    save.nanseCards ??= {};
    save.nanseCards[id] = Math.max(0, Math.min(card.ranks, rank));
    writeSave(save);
    refresh();
  },
  clearNanse() {
    save.nanseCards = {};
    writeSave(save);
    refresh();
  },
  pickHero(id) {
    sel.hero = id;
    refresh();
  },
  selectStage(id) {
    sel.stage = id;
    refresh();
  },
  // Gear belongs to one hero only.
  buy(item) {
    if (item.hero !== sel.hero || item.relic || save.owned.includes(item.id)) return;
    if (!gradeOpen(save, item) || !spend(item.price)) return;
    save.owned.push(item.id);
    save.gearOpts ??= {};
    save.gearOpts[item.id] = rollOptions(item);
    outfitOf(save, sel.hero)[item.slot] = item.id;
    done();
  },
  wear(item) {
    if (item.hero !== sel.hero) return;
    outfitOf(save, sel.hero)[item.slot] = item.id;
    done('click');
  },
  forge(item) {
    const lv = save.forge[item.id] ?? 0;
    if (lv >= FORGE.max || !spend(forgeCost(item, lv))) return;
    const ok = Math.random() < FORGE.chance[lv];
    if (ok) save.forge[item.id] = lv + 1;
    checkMenuAchievements();
    writeSave(save);
    sound.unlock();
    sound.sfx(ok ? 'forgeOk' : 'forgeFail');
    refresh();
    toast(ok ? `🔨 제련 성공! ${item.name} +${lv + 1}` : `제련 실패… ${josa(item.name, '은')} +${lv} 그대로`, ok);
  },
  buyGyeolgi(gy) {
    const lv = save.gyeolgi?.[gy.id] ?? 0;
    const cost = gyeolgiCost(gy, lv);
    if ((save.crystals ?? 0) < cost || (gy.max && lv >= gy.max)) return;
    save.crystals -= cost;
    (save.gyeolgi ??= {})[gy.id] = lv + 1;
    sound.sfx('forgeOk');
    done();
  },
  learn(sc) {
    if (!spend(sc.price)) return;
    save.secrets.push(sc.id);
    done();
  },
  /** 각인: reroll one option line of an owned piece for 냥. */
  engrave(item, index) {
    const lines = save.gearOpts?.[item.id];
    if (!lines?.[index] || !spend(engraveCost(item))) return;
    const before = lineText(lines[index]);
    save.gearOpts[item.id] = rerollLine(item, lines, index);
    writeSave(save);
    sound.unlock();
    sound.sfx('forgeOk');
    refresh();
    toast(`🔁 각인 — ${before} → ${lineText(save.gearOpts[item.id][index])}`);
  },
  claimAch(id) {
    const got = claimAchievement(save, id);
    if (!got) return;
    writeSave(save);
    sound.unlock();
    sound.sfx('achieve');
    updateBadge();
    refresh();
    toast(`🏆 보상 +${got.toLocaleString()}냥`);
  },
  claimAllAch() {
    let got = 0;
    for (const a of ACHIEVEMENTS) got += claimAchievement(save, a.id);
    if (!got) return;
    writeSave(save);
    sound.unlock();
    sound.sfx('achieve');
    updateBadge();
    refresh();
    toast(`🏆 보상 모두 받기 +${got.toLocaleString()}냥`);
  },
  exportCode() {
    return encodeSave(save);
  },
  /** First call previews the code; call again with confirmed=true to overwrite. */
  importCode(text, confirmed) {
    let next;
    try {
      next = decodeSave(text);
    } catch (e) {
      return { ok: false, message: e.message };
    }
    const won = Object.keys(next.best ?? {}).length;
    if (!confirmed) {
      return { ok: false, needConfirm: true, message: `냥 ${next.money.toLocaleString()} · 장비 ${next.owned.length}개 · 깬 전장 ${won}곳 — 이 기록으로 덮어쓸까요? 지금 기록은 사라져요.` };
    }
    // Replace the save in place: other code keeps a reference to `save`.
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, next);
    ensureGearOptions(save, EQUIPMENT);
    checkAchievements(save);
    updateBadge();
    writeSave(save);
    refresh();
    return { ok: true, message: `불러왔어요! 냥 ${save.money.toLocaleString()}, 장비 ${save.owned.length}개.` };
  },
};

function setMuted(m) {
  sound.setMuted(m);
  $('soundOn').checked = !m;
  $('muteBtn').textContent = m ? '🔇' : '🔊';
  $('muteToggle').textContent = m ? '소리 켜기' : '소리 끄기';
}

function setVolume(pct) {
  sound.setVolume(pct / 100);
  $('volume').value = String(pct);
  $('volumeText').textContent = String(pct);
  if (pct > 0 && sound.muted) setMuted(false);
}

input.on('key', (k) => {
  if (!game) {
    if (k === 'enter' && (menu === 'home' || menu === 'prep')) newGame();
    return;
  }
  if (k === 'p' || k === 'escape') game.togglePause();
  if (k === 'm') setMuted(!sound.muted);
  if (game.state === 'levelup' && ['1', '2', '3'].includes(k)) {
    sound.sfx('pick');
    game.choose(Number(k) - 1);
  }
  if ((game.state === 'over' || game.state === 'clear') && k === 'enter') newGame(runDaily ?? (runEndless ? ENDLESS_RUN : null));
});

for (const b of $('bottomNav').querySelectorAll('button')) b.addEventListener('click', () => go(b.dataset.go));
// 💾 저장: straight to the save code (도감 → 기록).
// 도감 → 도움말: replay the first-battle tutorial.
document.addEventListener('click', (e) => {
  if (!e.target.closest('#tutorReplay')) return;
  save.tutorialDone = false;
  writeSave(save);
  toast('🎮 다음 출진에서 튜토리얼이 나와요!');
});
$('homeSave').addEventListener('click', () => {
  setCodexTab('record');
  go('codex');
});
$('pauseBtn').addEventListener('click', () => game?.togglePause());
$('resumeBtn').addEventListener('click', () => game?.togglePause());
$('quitBtn').addEventListener('click', () => askLeave(() => toMenu('home')));
$('retryBtn').addEventListener('click', () => newGame(runDaily ?? (runEndless ? ENDLESS_RUN : null)));
$('homeBtn').addEventListener('click', () => toMenu('home'));
$('toMapBtn').addEventListener('click', () => toMenu('map'));
$('nextBtn').addEventListener('click', () => {
  const next = game?.stage.next;
  if (!next) return;
  sel.stage = next;
  newGame();
});
// 🔊 opens a small volume panel under the corner buttons.
$('muteBtn').addEventListener('click', () => {
  const panel = $('soundPanel');
  panel.hidden = !panel.hidden;
  $('muteBtn').setAttribute('aria-expanded', String(!panel.hidden));
});
$('volume').addEventListener('input', (e) => setVolume(Number(e.target.value)));
// Tapping anywhere outside the corner closes the volume panel.
document.addEventListener('pointerdown', (e) => {
  if ($('soundPanel').hidden || e.target.closest('.hud-corner')) return;
  $('soundPanel').hidden = true;
  $('muteBtn').setAttribute('aria-expanded', 'false');
});
$('muteToggle').addEventListener('click', () => setMuted(!sound.muted));
const bindSlider = (id, get, set) => {
  const input = $(id);
  const show = () => ($(`${id}Text`).textContent = input.value);
  input.value = String(Math.round(get() * 100));
  show();
  input.addEventListener('input', () => {
    set(Number(input.value) / 100);
    show();
  });
};
bindSlider('musicVol', () => sound.musicVol, (v) => sound.setMusicVolume(v));
bindSlider('sfxVol', () => sound.sfxVol, (v) => {
  sound.setSfxVolume(v);
  sound.sfx('coin'); // a sample at the new level
});

// Browsers only allow sound after the first tap or key: start the 군영 music then.
const firstGesture = () => {
  sound.unlock();
  if (!game) sound.startMusic('menu');
};
document.addEventListener('pointerdown', firstGesture, { once: true, capture: true });
document.addEventListener('keydown', firstGesture, { once: true, capture: true });
// A soft tick on menu buttons (purchases and battle buttons have their own sounds).
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || game?.state === 'play') return;
  if (b.matches('.buy-btn, .forge-btn, .ach-claim, .ach-claim-all, .pick-card, .wear-btn')) return;
  sound.sfx('click');
});
$('soundOn').addEventListener('change', (e) => setMuted(!e.target.checked));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game?.state === 'play') game.togglePause();
});

// ------------------------------------------------------------ leave guard

/** A run is "in progress" until its result screen shows. */
const inRun = () => game && !['over', 'clear'].includes(game.state);

/** In-page 나가겠습니까? dialog. The run pauses while it is open. */
function askLeave(onYes, sub = '지금 나가면 이번 전투의 진행과 보상이 사라져요.') {
  const wasPlaying = game?.state === 'play';
  if (wasPlaying) game.togglePause();
  $('confirmText').textContent = '나가겠습니까?';
  $('confirmSub').textContent = sub;
  $('confirmBox').hidden = false;
  $('confirmNo').focus();
  $('confirmYes').onclick = () => {
    $('confirmBox').hidden = true;
    onYes();
  };
  // 계속하기: back to exactly where the player was (the fight resumes).
  $('confirmNo').onclick = () => {
    $('confirmBox').hidden = true;
    if (wasPlaying && game?.state === 'paused') game.togglePause();
  };
}

// Back button / swipe-back: keep one extra history entry so "back" lands
// here first and asks, instead of leaving the game.
try {
  history.pushState({ samhan: true }, '');
  window.addEventListener('popstate', () => {
    history.pushState({ samhan: true }, '');
    if (!$('confirmBox').hidden) return;
    if (inRun()) askLeave(() => toMenu('home'));
    else if (menu !== 'home') go('home');
    else askLeave(() => history.go(-2), '게임 화면을 떠나요. 진행은 이 브라우저에 저장되어 있어요.');
  });
} catch {}

// Closing or reloading the tab mid-battle: the browser's own warning.
window.addEventListener('beforeunload', (e) => {
  if (!inRun()) return;
  e.preventDefault();
  e.returnValue = '';
});

// ------------------------------------------------------------ 📲 app install

/** Installed and opened from the home screen. */
const standalone = () => window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
// Inside another page (e.g. the claude.ai preview) the app cannot be installed.
const topLevel = (() => {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
})();
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (topLevel && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/** Where the game can actually be installed from (a page inside another page cannot). */
const PUBLIC_URL = 'https://jch47315626-sketch.github.io/ENTJ/';
let installPrompt = null;
const installBtn = $('installBtn');
// Already running as the installed app: nothing to install.
installBtn.hidden = standalone();
// Android / desktop Chrome: the browser offers installation; keep it for our button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installBtn.hidden = true;
  toast('📲 설치 완료! 홈 화면에서 삼한난세를 눌러 보세요');
});

/** The install guide card, with steps for this situation. */
function installGuide(title, steps, note) {
  $('iosGuideTitle').textContent = title;
  $('iosGuideSteps').innerHTML = steps.map((s) => `<li>${s}</li>`).join('');
  $('iosGuideNote').innerHTML = note;
  $('iosGuide').hidden = false;
}
installBtn.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') installBtn.hidden = true;
    installPrompt = null;
    return;
  }
  if (!topLevel) {
    // Inside a preview (e.g. claude.ai): installing only works from the public address.
    installGuide('📲 핸드폰에 설치하기', [
      `휴대폰에서 이 주소를 열어요<br><b class="ig-url">${PUBLIC_URL}</b>`,
      '그 화면 오른쪽 위 <b>📲 핸드폰에 설치</b>를 누르면 끝!',
    ], '지금 보고 있는 화면은 다른 페이지 안이라 여기서는 설치할 수 없어요.');
    return;
  }
  if (isIos) {
    installGuide('📲 아이폰에 설치하기', [
      'Safari 아래쪽의 <b>공유 버튼</b> <span class="ios-share" aria-hidden="true">⬆︎</span> 누르기',
      '목록을 내려 <b>홈 화면에 추가</b> 누르기',
      '오른쪽 위 <b>추가</b> 누르면 끝!',
    ], 'Safari에서만 돼요. 다른 앱 안의 브라우저라면 Safari로 열어 주세요.');
    return;
  }
  installGuide('📲 핸드폰에 설치하기', [
    '브라우저 오른쪽 위 <b>⋮ 메뉴</b> 누르기',
    '<b>앱 설치</b> 또는 <b>홈 화면에 추가</b> 누르기',
    '<b>설치</b>를 누르면 홈 화면에 삼한난세 아이콘이 생겨요',
  ], '이미 설치했다면 홈 화면의 아이콘으로 열어 주세요.');
});
$('iosGuideClose').addEventListener('click', () => ($('iosGuide').hidden = true));

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  if (game) {
    if (introTimer > 0) {
      introTimer -= dt;
      if (introTimer <= 0) showScreen(null);
    } else {
      const mv = input.move();
      game.update(dt, mv);
      tutor.update(game, dt, mv);
    }
    renderer.render(game, input, dt);
    hud.update(game, dt);
    sound.setIntensity(game.boss ? 2 : Math.min(1, game.time / game.stage.bossAt) * 1.0);
    // Low health: a heartbeat under everything.
    const p = game.player;
    if (game.state === 'play' && p.hp > 0 && p.hp < p.stats.maxHp * 0.25) sound.sfx('heartbeat');
  }
  requestAnimationFrame(frame);
}

// Open on the hero and field chosen last time.
if (save.sel && HEROES[save.sel.hero] && STAGES[save.sel.stage]) Object.assign(sel, save.sel);
setMuted(sound.muted);
setVolume(Math.round(sound.volume * 100));
// Older saves: anything already achieved shows up as a reward to collect.
checkAchievements(save);
writeSave(save);
updateBadge();
toMenu('home');
requestAnimationFrame(frame);
