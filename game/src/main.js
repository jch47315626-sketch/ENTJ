import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { Sound } from './audio/sound.js';
import { showScreen, renderTitle, renderIntro, renderChoices, renderResult } from './ui/screens.js';
import { STAGES } from './data/stages.js';

const $ = (id) => document.getElementById(id);
const canvas = $('field');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new Hud();
const sound = new Sound();

let game = null;
const sel = { hero: 'wanggeon', stage: 'seonamhae' };
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

function drawTitle() {
  renderTitle(
    sel,
    (id) => {
      sel.hero = id;
      drawTitle();
    },
    (id) => {
      sel.stage = id;
      drawTitle();
    },
  );
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
