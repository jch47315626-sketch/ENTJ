import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { Tutorial } from './ui/tutorial.js';
import { Sound } from './audio/sound.js';
import { themeFor } from './audio/music.js';
import { showScreen, renderIntro, renderChoices, renderResult } from './ui/screens.js';
import { renderHome, renderHeroes, renderGrow, renderMap, renderPrep, renderCodex, setCodexTab, renderSpirit, setLastDraw, openCoupon, renderReward, setSheet } from './ui/menu.js';
import { redeemCoupon } from './core/coupon.js';
import { GACHA, SPIRITS, SPIRIT_GRADES, drawSpirits, starUp, setBranch, toggleCompanion, callSasin, countRunForGift } from './data/spirits.js';
import { loadSave, writeSave, outfitOf, encodeSave, decodeSave } from './core/save.js';
import { runFacts, recordRun, checkAchievements, claimAchievement, readyCount } from './core/achieve.js';
import { codexReadyCount, claimCodex, claimCodexAll } from './data/codexTiers.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { dailyFor, dailyHeroBonus, todayKey } from './data/daily.js';
import { josa } from './core/korean.js';
import { TRIAL, trialFor, useTrial, trialDone, attrReward, ATTR_ICON, ATTR_NAME } from './data/trial.js';
import { gyeolgiCost } from './data/gyeolgi.js';
import { metaBonus, FORGE, forgeCost, gradeOpen, entryCheck, EQUIPMENT, RELICS } from './data/meta.js';
import { ensureGearOptions, rollOptions, rerollLine, engraveCost, lineText, NAMES } from './data/gearOptions.js';
import { UPGRADES } from './data/upgrades.js';
import { helpById } from './data/help.js';
import { STAGES } from './data/stages.js';
import { ENDLESS_MAPS, endlessMapOpen, endlessMapOf } from './data/endless.js';
import { staminaOf, useStamina, staminaWait, staminaText, endlessLeft, useEndlessEntry, ENDLESS_PER_DAY } from './data/entries.js';
import { untilTomorrow } from './data/daily.js';
import { ESSENCE_PER_SASIN, refreshAltar, useTicket, payAltar, ALTAR_TIERS, ALTAR_MAX_TIER, altarTierOpen } from './data/altar.js';
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
// 사신의 제단: top up today's entry tickets and keep the day it was done.
refreshAltar(save);
writeSave(save);
// Display names for gear 비기 lines (data/gearOptions.js).
for (const u of UPGRADES) NAMES.upgrade[u.id] = u.title ?? (typeof u.name === 'string' ? u.name : u.id);
ensureGearOptions(save, EQUIPMENT); // older saves: every owned piece gets its option lines
writeSave(save); // persist any format migration right away
let introTimer = 0;
/** The 오늘의 전장 being played (so 다시 출진 replays it), or null. */
let runDaily = null;
/** Playing ♾️ 무한 전장 (so 다시 도전 replays it, on the map last played). */
let runEndless = false;
const ENDLESS_RUN = { endless: true };
/** The 사신의 제단 run being played ({ guardian, tier }), or null. */
let runAltar = null;
/** 🔥 일일 던전 being played (today's draw), or null. Once a day, so never replayed. */
let runTrial = null;
/** The mode 다시 출진 replays. */
const replayMode = () => runDaily ?? (runAltar ? { altar: runAltar } : runEndless ? ENDLESS_RUN : null);

/** Starts a battle: the chosen hero and field, a daily challenge, or endless mode. */
function newGame(mode = null) {
  runDaily = mode?.rules ? mode : null;
  runEndless = !!mode?.endless;
  runAltar = mode?.altar ?? null;
  runTrial = mode?.trial ? trialFor(save) : null;
  const heroId = runDaily?.heroId ?? sel.hero;
  const stageId = runTrial?.stageId ?? runDaily?.stageId ?? (runAltar ? ALTAR_TIERS[runAltar.tier].base : sel.stage);
  // 🔥 일일 던전: once a day.
  if (runTrial && !useTrial(save)) {
    setSheet('trial');
    toMenu('home');
    toast(`🔥 오늘의 일일 던전은 이미 도전했어요. ${untilTomorrow()} 뒤 새 던전이 열려요!`, false);
    return;
  }
  // 사신의 제단: an open 단계 and one entry ticket.
  if (runAltar && (!altarTierOpen(save, runAltar.tier) || !useTicket(save))) {
    toMenu('home');
    toast(altarTierOpen(save, runAltar.tier) ? '🎟️ 오늘의 입장권을 다 썼어요. 내일 다시 3장이 채워져요!' : '🔒 아직 열리지 않은 단계예요.');
    return;
  }
  // ♾️ 무한 전장: the map picked on its card, else the one played last time.
  const endlessMap = runEndless ? (mode.map && endlessMapOpen(save, mode.map) ? mode.map : endlessMapOf(save)) : null;
  if (endlessMap) save.endlessMap = endlessMap;
  // Gear gate: send the player back to the menu, where the reason is shown.
  if (!runDaily && !runAltar && !runEndless && !runTrial && !entryCheck(save, sel.hero, STAGES[sel.stage]).ok) {
    toMenu('prep');
    return;
  }
  // 입장 횟수 (data/entries.js): 무한 전장 3 a day; 일반 전장 spends one 출진 횟수.
  if (runEndless && !useEndlessEntry(save)) {
    setSheet('endless');
    toMenu('home');
    toast(`♾️ 오늘의 무한 전장 ${ENDLESS_PER_DAY}번을 다 돌았어요. ${untilTomorrow()} 뒤 다시 ${ENDLESS_PER_DAY}번!`, false);
    return;
  }
  if (!runDaily && !runAltar && !runEndless && !runTrial && !useStamina(save)) {
    toMenu('prep');
    toast(`⚔️ 출진 횟수가 없어요. ${staminaWait(save)} 뒤 1번 회복돼요`, false);
    writeSave(save);
    return;
  }
  // Remember the choice so the next visit opens on the same hero and field.
  if (!runDaily && !runTrial) save.sel = { hero: sel.hero, stage: sel.stage };
  writeSave(save);
  // 난세 패 now only come with the 일일 던전 (today's random draw).
  const nanse = runTrial ? { ...runTrial.cards } : null;
  const meta = metaBonus(save, heroId);
  if (runDaily) {
    const hb = dailyHeroBonus(runDaily);
    if (hb.might) meta.might = (meta.might ?? 0) + hb.might;
    if (hb.hpMul) meta.hpMul = hb.hpMul;
  }
  sound.unlock();
  input.reset();
  hud.clearBanner();
  hud.hideEvoProgress();
  game = new Game({
    heroId,
    stageId,
    daily: runDaily,
    endless: runEndless,
    endlessMap,
    altar: runAltar,
    // 🐾 동행 영물 (data/spirits.js), whoever the hero.
    spirits: (save.companions ?? []).filter((id) => save.spirits?.[id]).map((id) => ({ id, ...save.spirits[id] })),
    nanse,
    trial: runTrial ? { level: runTrial.level, day: runTrial.day } : null,
    objectsTip: !save.tipsSeen?.objects,
    quick: !runDaily && !runEndless && !runAltar && !runTrial && $('quickMode').checked,
    onBanner: (t, size) => hud.banner(t, size),
    onState,
    onBoss: (def) => hud.bossIntro(def),
    onRoulette: (r) => hud.roulette(r),
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
  sound.startMusic(themeFor(endlessMap ? ENDLESS_MAPS[endlessMap].music : stageId));
  if (runDaily) sound.sfx('daily');
}

function onState(state, g) {
  if (state === 'levelup') {
    hud.hideEvoProgress(); // the card picker comes first; the next pick shows its own
    const pick = (i) => {
      sound.sfx('pick');
      const c = g.choices?.[i];
      g.choose(i);
      // 🌟 Which 궁극기 that 책략 feeds, and how far along each is (top right, a few seconds).
      if (c && !c.evolution) hud.evoProgress(g, c.id);
    };
    // 🦉 부엉이 · 다시 뽑기: a new hand while rerolls last.
    const reroll = () => {
      if (!g.reroll()) return;
      sound.sfx('flip');
      renderChoices(g.choices, pick, g.rerolls > 0 ? reroll : null, g.rerolls);
    };
    renderChoices(g.choices, pick, g.rerolls > 0 ? reroll : null, g.rerolls);
    sound.sfx('flip');
    showScreen('levelup');
    tutor.onLevelup(g);
  } else if (state === 'paused') {
    sound.stopMusic();
    hud.fillPause(g);
    $('quitBtn').textContent = { trial: '🔥 일일 던전으로', altar: '🏯 제단으로', daily: '📅 오늘의 전장으로', endless: '♾️ 무한 전장으로' }[dungeonOfRun()] ?? '처음으로';
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
    // 사신의 제단: 영기 → 영주 (and 사신 정수 on a 사신의 날); no 냥, records or 업적.
    if (g.stage.altar && g.reward && !g.rewardBanked) {
      g.rewardBanked = true;
      const known = new Set(Object.keys(save.codex.kills));
      const A = g.reward.altar;
      const pay = payAltar(save, { yeongju: A.yeongju, cleared: state === 'clear' });
      const newTier = state === 'clear' && A.tier > (save.altarBest ?? 0);
      if (newTier) save.altarBest = A.tier;
      if (state === 'clear') save.altarTier = Math.min(ALTAR_MAX_TIER, Math.max(save.altarTier ?? 1, newTier && altarTierOpen(save, A.tier + 1) ? A.tier + 1 : A.tier));
      for (const [id, n] of Object.entries(g.killsBy)) save.codex.kills[id] = (save.codex.kills[id] ?? 0) + n;
      save.altarRuns = (save.altarRuns ?? 0) + 1;
      const altarUnlocks = checkAchievements(save);
      writeSave(save);
      updateBadge();
      g.resultExtra = {
        altar: { ...A, essence: pay.essence, newTier, maxTier: ALTAR_MAX_TIER, tickets: refreshAltar(save).tickets },
        unlocks: altarUnlocks.map((a) => `${a.icon} ${a.name}`),
        newFoes: Object.keys(g.killsBy).filter((id) => !known.has(id)).length,
      };
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
      // ♾️ 무한 전장: keep the best time per map.
      let endless = null;
      if (g.stage.endless) {
        save.endless ??= {};
        const key = g.stage.endlessMap;
        const prev = save.endless[key];
        const isNew = !prev || g.time > prev.time;
        if (isNew) save.endless[key] = { time: Math.floor(g.time), kills: g.kills, bosses: g.endlessBosses, hero: g.player.hero.id };
        endless = { time: g.time, bosses: g.endlessBosses, isNew, best: save.endless[key] };
      }
      // 🔥 일일 던전: 속성결정 (a share on defeat); at 난세 10+ a clear may bring a 신물.
      let trialInfo = null;
      if (g.stage.trial) {
        const won = state === 'clear';
        const lv = g.stage.nanse?.level ?? 0;
        const attr = attrReward(g.stage.difficulty.stars, lv, won);
        save.attrStones = (save.attrStones ?? 0) + attr;
        if (save.trial) save.trial.cleared = won;
        let relic = null;
        if (won) {
          save.stats.nanseBest = Math.max(save.stats.nanseBest ?? 0, lv);
          save.stats.trialWins = (save.stats.trialWins ?? 0) + 1;
          const missing = RELICS.filter((r) => r.hero === g.player.hero.id && !save.owned.includes(r.id));
          if (lv >= TRIAL.relicFrom && missing.length && Math.random() < Math.min(0.9, 0.3 + 0.03 * (lv - TRIAL.relicFrom))) {
            relic = missing[Math.floor(Math.random() * missing.length)];
            save.owned.push(relic.id);
            save.gearOpts ??= {};
            save.gearOpts[relic.id] = rollOptions(relic);
            save.stats.relics = (save.stats.relics ?? 0) + 1;
          }
        }
        trialInfo = { level: lv, attr, won, relic: relic?.name };
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
      g.resultExtra = { dailyBonus, endless, trial: trialInfo, unlocks: unlocked.map((a) => `${a.icon} ${a.name}`), newFoes: Object.keys(g.killsBy).filter((id) => !known.has(id)).length };
    }
    // 🐾 첫 영물: the fifth 사신의 제단 run brings a 범수 along.
    if (g.stage.altar && g.resultExtra && !g.giftCounted) {
      g.giftCounted = true;
      const gift = countRunForGift(save);
      if (gift) {
        g.resultExtra.spiritGift = gift;
        writeSave(save);
        setTimeout(() => sound.sfx('achieve'), 1400);
      }
    }
    renderResult(g, state === 'clear', g.resultExtra);
    entryButtons(g);
    if (g.resultExtra?.unlocks.length && !g.achieveSounded) {
      g.achieveSounded = true;
      setTimeout(() => sound.sfx('achieve'), 1900);
    }
    showScreen('result');
  }
}

// ------------------------------------------------------------------ menus

const RENDER = { home: renderHome, heroes: renderHeroes, grow: renderGrow, map: renderMap, prep: renderPrep, nanse: renderMap, codex: renderCodex, spirit: renderSpirit, reward: renderReward };
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
  if (name === 'home' && save.codex.runs >= 1) showTip('trial');
  if (name === 'heroes' && save.codex.runs >= 1) showTip('gear');
  if (name === 'reward' && readyCount(save)) showTip('ach');
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

/**
 * Result card: 다시 출진 / 다음 전장 / 다시 도전 show how many entries are left
 * and are disabled when none are.
 */
function entryButtons(g) {
  $('nextBtn').disabled = false;
  if (g.stage.trial) {
    $('retryBtn').textContent = '🔥 내일 다시 도전';
    $('retryBtn').disabled = true;
  } else if (g.stage.endless) {
    const left = endlessLeft(save);
    $('retryBtn').textContent = `🔁 다시 도전 · ♾️ ${left}/${ENDLESS_PER_DAY}`;
    $('retryBtn').disabled = left <= 0;
  } else if (!g.stage.daily && !g.stage.altar) {
    const st = staminaOf(save);
    const wait = staminaWait(save);
    $('retryBtn').textContent = st.n > 0 ? `다시 출진 · ⚔️ ${st.n}/${st.max}` : `⚔️ ${wait} 뒤 출진`;
    $('retryBtn').disabled = st.n <= 0;
    $('nextBtn').disabled = st.n <= 0;
  }
}

/**
 * Once a second: the 출진 횟수 countdowns in the menus tick, and when a
 * 출진 횟수 (or a new day's 무한 전장) comes back, the open menu redraws.
 */
let lastEntries = '';
setInterval(() => {
  const key = `${staminaOf(save).n}/${endlessLeft(save)}`;
  for (const el of document.querySelectorAll('[data-stamina]')) el.textContent = staminaText(save);
  for (const el of document.querySelectorAll('[data-stamina-wait]')) {
    const w = staminaWait(save);
    el.textContent = w ? `${w} 뒤 +1` : '가득';
  }
  if (key !== lastEntries) {
    const changed = lastEntries !== '';
    lastEntries = key;
    writeSave(save);
    if (changed && !game) refresh();
  }
  // Result card: keep the "mm:ss 뒤 출진" countdown and counts current.
  if (game && !$('result').hidden) entryButtons(game);
}, 1000);

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
    toast(`🏆 업적 달성! ${fresh.map((a) => a.name).join(', ')} — 🎁 보상에서 받기`);
    setTimeout(() => sound.sfx('achieve'), 250);
  }
  updateBadge();
}

/** Red dot on 📖 도감 while some 업적 reward is waiting. */
/** After a reward was taken: save, sound, badge, and a toast with what came in. */
function paidToast(label, got) {
  if (!got.money && !got.yeongju) return;
  writeSave(save);
  sound.unlock();
  sound.sfx('achieve');
  updateBadge();
  refresh();
  toast(`${label} ${[got.money && `🪙 +${got.money.toLocaleString()}냥`, got.yeongju && `🔮 +${got.yeongju.toLocaleString()} 영주`].filter(Boolean).join(' · ')}`);
}

function updateBadge() {
  const n = readyCount(save) + codexReadyCount(save);
  // Everything waiting to be taken (업적 · 도감 단계) shows on 🎁 보상.
  const b = $('bottomNav').querySelector('[data-go="reward"]');
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
  /** ♾️ 무한 전장 on `map` (or the one played last). */
  /** 🔥 일일 던전 (once a day). */
  startTrial: () => newGame({ trial: true }),
  startEndless: (map) => newGame(map ? { endless: true, map } : ENDLESS_RUN),
  /** 사신의 제단: enter at 단계 `tier` against `guardian` (today's, or the one picked on a 사신의 날). */
  startAltar: (guardian, tier) => newGame({ altar: { guardian, tier } }),
  /** From 🎁 보상: open a home dungeon sheet, or a 도감 tab. */
  openSheet(kind) {
    setSheet(kind);
    go('home');
  },
  openCodex(tab) {
    setCodexTab(tab);
    go('codex');
  },
  /** 🎁 쿠폰: check the code, pay the gift, and report back to the sheet. */
  async redeemCoupon(code) {
    const r = await redeemCoupon(save, code);
    sound.unlock();
    if (!r.ok) {
      sound.sfx('forgeFail');
      return r;
    }
    ensureGearOptions(save, EQUIPMENT); // gifted gear gets its option lines
    checkAchievements(save);
    writeSave(save);
    sound.sfx('achieve');
    updateBadge();
    if (menu === 'home') renderHome(save, sel, act);
    return r;
  },
  /** 영물 뽑기: 1 or 10 draws for 영주. */
  drawSpirit(n) {
    const out = drawSpirits(save, n, n === 10 ? GACHA.ten : GACHA.one * n);
    if (!out) return toast('🔮 영주가 모자라요. 사신의 제단에서 영기를 모아요!', false);
    setLastDraw(out);
    checkAchievements(save);
    updateBadge();
    const best = Math.max(...out.map((d) => SPIRITS[d.id].grade));
    sound.sfx(best >= 4 ? 'achieve' : best >= 3 ? 'evolve' : 'buy');
    if (best >= 4) toast(`🌟 ${SPIRIT_GRADES[4].name} ${out.filter((d) => SPIRITS[d.id].grade === 4).map((d) => SPIRITS[d.id].name).join(', ')}!`);
    writeSave(save);
    refresh();
  },
  starSpirit(id) {
    if (!starUp(save, id)) return;
    const st = save.spirits[id].stars;
    checkAchievements(save);
    updateBadge();
    sound.sfx(st >= 5 ? 'achieve' : 'evolve');
    toast(st >= 5 ? `🌟 ${SPIRITS[id].name} 각성!` : st === 3 ? `★3 ${SPIRITS[id].name} — 갈래를 골라요!` : `★${st} ${SPIRITS[id].name}`);
    writeSave(save);
    refresh();
  },
  branchSpirit(id, k) {
    if (!setBranch(save, id, k)) return;
    sound.sfx('pick');
    writeSave(save);
    refresh();
  },
  toggleCompanion(id) {
    if (!toggleCompanion(save, id)) return;
    sound.sfx('pick');
    writeSave(save);
    refresh();
  },
  callSasin(id) {
    if (!callSasin(save, id, ESSENCE_PER_SASIN)) return;
    checkAchievements(save);
    updateBadge();
    sound.sfx('achieve');
    toast(`✨ ${josa(SPIRITS[id].name, '이')} 응답했다! 동행 칸이 2칸이 돼요`);
    writeSave(save);
    refresh();
  },
  /** Remember the 단계 chosen on the altar card. */
  setAltarTier(t) {
    save.altarTier = Math.max(1, Math.min(ALTAR_MAX_TIER, t));
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
    paidToast('🏆 보상', claimAchievement(save, id));
  },
  claimAllAch() {
    const got = { money: 0, yeongju: 0 };
    for (const a of ACHIEVEMENTS) {
      const g = claimAchievement(save, a.id);
      got.money += g.money;
      got.yeongju += g.yeongju;
    }
    paidToast('🏆 보상 모두 받기', got);
  },
  /** 도감 단계 보상: one entry, or everything waiting in a tab. */
  claimCodex(kind, id) {
    paidToast('📖 도감 보상', claimCodex(save, kind, id));
  },
  claimCodexAll(kinds) {
    paidToast('📖 도감 보상 모두 받기', claimCodexAll(save, kinds.includes('foe') ? [...kinds, 'boss'] : kinds));
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
  if ((game.state === 'over' || game.state === 'clear') && k === 'enter') newGame(replayMode());
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
$('homeCoupon').addEventListener('click', () => openCoupon(act));
$('homeSave').addEventListener('click', () => {
  setCodexTab('record');
  go('codex');
});
$('pauseBtn').addEventListener('click', () => game?.togglePause());
$('resumeBtn').addEventListener('click', () => game?.togglePause());
/** After a dungeon run, its own screen (the home sheet) is where the player goes back to. */
const dungeonOfRun = () => (runTrial ? 'trial' : runAltar ? 'altar' : runDaily ? 'daily' : runEndless ? 'endless' : null);
function backFromRun(fallback) {
  const k = dungeonOfRun();
  if (!k) return toMenu(fallback);
  setSheet(k);
  toMenu('home');
}
$('quitBtn').addEventListener('click', () => askLeave(() => backFromRun('home')));
$('retryBtn').addEventListener('click', () => newGame(replayMode()));
$('homeBtn').addEventListener('click', () => toMenu('home'));
$('toMapBtn').addEventListener('click', () => backFromRun('map'));
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
