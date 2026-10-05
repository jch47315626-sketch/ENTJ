import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { Tutorial } from './ui/tutorial.js';
import { Sound } from './audio/sound.js';
import { showScreen, renderIntro, renderChoices, renderResult } from './ui/screens.js';
import { renderHome, renderHeroes, renderGrow, renderMap, renderPrep, renderCodex, setCodexTab } from './ui/menu.js';
import { loadSave, writeSave, outfitOf, treeOf, encodeSave, decodeSave } from './core/save.js';
import { SKILL_TREES } from './data/trees.js';
import { runFacts, recordRun, checkAchievements, claimAchievement, readyCount } from './core/achieve.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { dailyFor, dailyHeroBonus, todayKey } from './data/daily.js';
import { metaBonus, FORGE, forgeCost, gradeOpen, entryCheck } from './data/meta.js';
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
writeSave(save); // persist any format migration right away
let introTimer = 0;
/** The 오늘의 전장 being played (so 다시 출진 replays it), or null. */
let runDaily = null;

/** Starts a battle: the chosen hero and field, or a daily challenge. */
function newGame(daily = null) {
  runDaily = daily?.rules ? daily : null;
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
    quick: !runDaily && $('quickMode').checked,
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
  renderIntro(STAGES[stageId], runDaily);
  showScreen('intro');
  introTimer = 2.6;
  // First battle ever: guided steps. After that, no hints — the player knows the controls.
  if (!save.tutorialDone) tutor.start();
  else tutor.stop();
  sound.startMusic();
  sound.setIntensity(0);
}

function onState(state, g) {
  if (state === 'levelup') {
    renderChoices(g.choices, (i) => g.choose(i));
    showScreen('levelup');
    tutor.onLevelup(g);
  } else if (state === 'paused') {
    sound.stopMusic();
    hud.fillPause(g);
    showScreen('pause');
  } else if (state === 'play') {
    sound.startMusic();
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
      const known = new Set(Object.keys(save.codex.kills));
      save.money += g.reward.total;
      if (state === 'clear') save.best[g.stage.id] = Math.max(save.best[g.stage.id] ?? 0, g.reward.stars);
      const c = save.codex;
      c.runs += 1;
      if (state === 'clear') c.wins += 1;
      c.earned += g.reward.total;
      for (const [id, n] of Object.entries(g.killsBy)) c.kills[id] = (c.kills[id] ?? 0) + n;
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
      g.resultExtra = { dailyBonus, unlocks: unlocked.map((a) => `${a.icon} ${a.name}`), newFoes: Object.keys(g.killsBy).filter((id) => !known.has(id)).length };
    }
    renderResult(g, state === 'clear', g.resultExtra);
    showScreen('result');
  }
}

// ------------------------------------------------------------------ menus

const RENDER = { home: renderHome, heroes: renderHeroes, grow: renderGrow, map: renderMap, prep: renderPrep, codex: renderCodex };
let menu = 'home';

/** Leaves any run and opens a menu screen. */
function toMenu(name = 'home') {
  game = null;
  tutor.stop();
  sound.stopMusic();
  hud.show(false);
  hud.clearBanner();
  go(name);
}

function go(name) {
  menu = name;
  RENDER[name](save, sel, act);
  showScreen(name);
  $(name).scrollTop = 0;
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
  if (fresh.length) toast(`🏆 업적 달성! ${fresh.map((a) => a.name).join(', ')} — 도감에서 보상 받기`);
  updateBadge();
}

/** Red dot on 📖 도감 while some 업적 reward is waiting. */
function updateBadge() {
  const n = readyCount(save);
  const b = $('bottomNav').querySelector('[data-go="codex"]');
  b.dataset.badge = n ? String(n) : '';
}

/** Saves, plays the coin sound and redraws. */
function done() {
  checkMenuAchievements();
  writeSave(save);
  sound.unlock();
  sound.sfx('coin');
  refresh();
}

const act = {
  go,
  refresh,
  toast,
  start: () => newGame(),
  startDaily: () => newGame(dailyFor(todayKey())),
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
    if (item.hero !== sel.hero || save.owned.includes(item.id)) return;
    if (!gradeOpen(save, item) || !spend(item.price)) return;
    save.owned.push(item.id);
    outfitOf(save, sel.hero)[item.slot] = item.id;
    done();
  },
  wear(item) {
    if (item.hero !== sel.hero) return;
    outfitOf(save, sel.hero)[item.slot] = item.id;
    done();
  },
  forge(item) {
    const lv = save.forge[item.id] ?? 0;
    if (lv >= FORGE.max || !spend(forgeCost(item, lv))) return;
    const ok = Math.random() < FORGE.chance[lv];
    if (ok) save.forge[item.id] = lv + 1;
    checkMenuAchievements();
    writeSave(save);
    sound.unlock();
    sound.sfx(ok ? 'coin' : 'hit');
    refresh();
    toast(ok ? `🔨 제련 성공! ${item.name} +${lv + 1}` : `제련 실패… ${item.name}은(는) +${lv} 그대로`, ok);
  },
  train(t) {
    const lv = save.training[t.id] ?? 0;
    if (lv >= t.max || !spend(t.price(lv))) return;
    save.training[t.id] = lv + 1;
    done();
  },
  learn(sc) {
    if (!spend(sc.price)) return;
    save.secrets.push(sc.id);
    done();
  },
  // Skills from either path can be learned; the style follows what is learned.
  buyNode(node) {
    const t = treeOf(save, sel.hero);
    if (t.nodes.includes(node.id) || save.money < node.price) return;
    save.money -= node.price;
    t.nodes.push(node.id);
    done();
  },
  buyTreasure(item) {
    if (save.owned.includes(item.id) || save.money < item.price) return;
    if (item.parent && !save.owned.includes(item.parent)) return;
    save.money -= item.price;
    save.owned.push(item.id);
    outfitOf(save, sel.hero).treasure = item.id;
    done();
  },
  wearTreasure(item) {
    outfitOf(save, sel.hero).treasure = item.id;
    done();
  },
  claimAch(id) {
    const got = claimAchievement(save, id);
    if (!got) return;
    writeSave(save);
    sound.unlock();
    sound.sfx('coin');
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
    sound.sfx('coin');
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
  if (game.state === 'levelup' && ['1', '2', '3'].includes(k)) game.choose(Number(k) - 1);
  if ((game.state === 'over' || game.state === 'clear') && k === 'enter') newGame(runDaily);
});

for (const b of $('bottomNav').querySelectorAll('button')) b.addEventListener('click', () => go(b.dataset.go));
// 💾 저장: straight to the save code (도감 → 기록).
$('howtoSave').addEventListener('click', () => $('homeSave').click());
$('tutorReplay').addEventListener('click', () => {
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
$('retryBtn').addEventListener('click', () => newGame(runDaily));
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

let installPrompt = null;
const installBtn = $('installBtn');
// Android / desktop Chrome: the browser offers installation; keep it for our button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  installBtn.hidden = standalone();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installBtn.hidden = true;
  toast('📲 설치 완료! 홈 화면에서 삼한난세를 눌러 보세요');
});
// iPhone: no install prompt exists, so the button shows the Safari steps instead.
if (topLevel && isIos && !standalone()) installBtn.hidden = false;
installBtn.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') installBtn.hidden = true;
    installPrompt = null;
    return;
  }
  $('iosGuide').hidden = false;
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
