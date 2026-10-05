import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { Sound } from './audio/sound.js';
import { showScreen, renderMain, renderHeroSelect, renderMapSelect, renderIntro, renderChoices, renderResult, renderCamp } from './ui/screens.js';
import { loadSave, writeSave, outfitOf, treeOf } from './core/save.js';
import { SKILL_TREES } from './data/trees.js';
import { metaBonus } from './data/meta.js';
import { STAGES } from './data/stages.js';

const $ = (id) => document.getElementById(id);
const canvas = $('field');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new Hud();
const sound = new Sound();

let game = null;
const sel = { hero: 'wanggeon', stage: 'seonamhae' };
const save = loadSave();
writeSave(save); // persist any format migration right away
let introTimer = 0;

function newGame() {
  sound.unlock();
  input.reset();
  hud.clearBanner();
  game = new Game({
    heroId: sel.hero,
    stageId: sel.stage,
    quick: $('quickMode').checked,
    onBanner: (t, size) => hud.banner(t, size),
    onState,
    onBoss: (def) => hud.banner(`${def.name}\n${def.epithet}`, 'big'),
    onSfx: (name) => sound.sfx(name),
    meta: metaBonus(save, sel.hero),
  });
  window.__game = game; // handy for debugging from the console
  renderer.render(game, input, 0);
  hud.show(true);
  hud.update(game, 0, true);
  renderIntro(STAGES[sel.stage]);
  showScreen('intro');
  introTimer = 2.6;
  sound.startMusic();
  sound.setIntensity(0);
}

function onState(state, g) {
  if (state === 'levelup') {
    renderChoices(g.choices, (i) => g.choose(i));
    showScreen('levelup');
  } else if (state === 'paused') {
    sound.stopMusic();
    showScreen('pause');
  } else if (state === 'play') {
    sound.startMusic();
    showScreen(null);
  } else if (state === 'over' || state === 'clear') {
    sound.stopMusic();
    // Bank the run's money once.
    if (g.reward && !g.rewardBanked) {
      g.rewardBanked = true;
      save.money += g.reward.total;
      if (state === 'clear') save.best[g.stage.id] = Math.max(save.best[g.stage.id] ?? 0, g.reward.stars);
      writeSave(save);
    }
    renderResult(g, state === 'clear');
    showScreen('result');
  }
}

function toTitle() {
  game = null;
  sound.stopMusic();
  hud.show(false);
  hud.clearBanner();
  drawTitle();
  showScreen('title');
}

/** Shop. Gear goes on the hero chosen in the menu; `back` is where 돌아가기 leads. */
function openCamp(focusSlot = null, back = toTitle) {
  campBack = back;
  const spend = (cost) => {
    if (save.money < cost) return false;
    save.money -= cost;
    return true;
  };
  const act = {
    buy(item) {
      if (!spend(item.price)) return;
      save.owned.push(item.id);
      outfitOf(save, sel.hero)[item.slot] = item.id;
      done();
    },
    wear(item) {
      outfitOf(save, sel.hero)[item.slot] = item.id;
      done();
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
  };
  function done() {
    writeSave(save);
    sound.unlock();
    sound.sfx('coin');
    renderCamp(save, sel.hero, act);
  }
  renderCamp(save, sel.hero, act, focusSlot);
  showScreen('camp');
}
let campBack = toTitle;

function drawTitle() {
  renderMain(save, sel);
}

function openHeroSelect() {
  renderHeroSelect(save, sel, {
    pick(id) {
      sel.hero = id;
      openHeroSelect();
    },
    // An outfit slot sends the player to that part of the shop, then back here.
    openSlot(slot) {
      openCamp(slot, openHeroSelect);
    },
    buyNode(node, branchId) {
      const t = treeOf(save, sel.hero);
      if (t.nodes.includes(node.id) || save.money < node.price) return;
      if (branchId && t.branch && t.branch !== branchId) return;
      save.money -= node.price;
      t.nodes.push(node.id);
      if (branchId) t.branch = branchId;
      buildChanged();
    },
    // 길 바꾸기: drop the chosen branch for 90% of what it cost.
    respec() {
      const t = treeOf(save, sel.hero);
      const br = SKILL_TREES[sel.hero].branches.find((b) => b.id === t.branch);
      if (!br) return;
      const bought = br.nodes.filter((n) => t.nodes.includes(n.id));
      save.money += Math.floor(0.9 * bought.reduce((a, n) => a + n.price, 0));
      t.nodes = t.nodes.filter((id) => !bought.some((n) => n.id === id));
      t.branch = null;
      buildChanged();
    },
    buyTreasure(item) {
      if (save.owned.includes(item.id) || save.money < item.price) return;
      if (item.parent && !save.owned.includes(item.parent)) return;
      save.money -= item.price;
      save.owned.push(item.id);
      outfitOf(save, sel.hero).treasure = item.id;
      buildChanged();
    },
    wearTreasure(item) {
      outfitOf(save, sel.hero).treasure = item.id;
      buildChanged();
    },
  });
  showScreen('heroSelect');
}

/** Save, play the purchase sound and redraw the hero screen in place. */
function buildChanged() {
  writeSave(save);
  sound.unlock();
  sound.sfx('coin');
  const y = $('heroSelect').scrollTop;
  openHeroSelect();
  $('heroSelect').scrollTop = y;
}

function openMapSelect() {
  renderMapSelect(sel, (id) => {
    sel.stage = id;
    openMapSelect();
  });
  showScreen('mapSelect');
}

function setMuted(m) {
  sound.setMuted(m);
  $('soundOn').checked = !m;
  $('muteBtn').setAttribute('aria-pressed', String(m));
  $('muteBtn').textContent = m ? '소리 꺼짐' : '소리';
}

input.on('key', (k) => {
  if (!game) {
    if (k === 'enter' && !$('title').hidden) newGame();
    return;
  }
  if (k === 'p' || k === 'escape') game.togglePause();
  if (k === 'm') setMuted(!sound.muted);
  if (game.state === 'levelup' && ['1', '2', '3'].includes(k)) game.choose(Number(k) - 1);
  if ((game.state === 'over' || game.state === 'clear') && k === 'enter') newGame();
});

$('startBtn').addEventListener('click', newGame);
$('tabShop').addEventListener('click', () => openCamp());
$('tabHero').addEventListener('click', openHeroSelect);
$('tabMap').addEventListener('click', openMapSelect);
$('mainHero').addEventListener('click', openHeroSelect);
$('mainMap').addEventListener('click', openMapSelect);
$('heroBack').addEventListener('click', toTitle);
$('mapBack').addEventListener('click', toTitle);
$('campBack').addEventListener('click', () => campBack());
$('pauseBtn').addEventListener('click', () => game?.togglePause());
$('resumeBtn').addEventListener('click', () => game?.togglePause());
$('quitBtn').addEventListener('click', toTitle);
$('retryBtn').addEventListener('click', newGame);
$('homeBtn').addEventListener('click', toTitle);
$('nextBtn').addEventListener('click', () => {
  const next = game?.stage.next;
  if (!next) return;
  sel.stage = next;
  newGame();
});
$('muteBtn').addEventListener('click', () => setMuted(!sound.muted));
$('soundOn').addEventListener('change', (e) => setMuted(!e.target.checked));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game?.state === 'play') game.togglePause();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  if (game) {
    if (introTimer > 0) {
      introTimer -= dt;
      if (introTimer <= 0) showScreen(null);
    } else {
      game.update(dt, input.move());
    }
    renderer.render(game, input, dt);
    hud.update(game, dt);
    sound.setIntensity(game.boss ? 2 : Math.min(1, game.time / game.stage.bossAt) * 1.0);
  }
  requestAnimationFrame(frame);
}

setMuted(sound.muted);
toTitle();
requestAnimationFrame(frame);
