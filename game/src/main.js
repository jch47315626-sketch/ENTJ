import { Game } from './game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Hud } from './ui/hud.js';
import { showScreen, renderTitle, renderIntro, renderChoices, renderResult } from './ui/screens.js';
import { STAGES } from './data/stages.js';

const $ = (id) => document.getElementById(id);
const canvas = $('field');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new Hud();

let game = null;
let heroId = 'wanggeon';
const stageId = 'seonamhae';
let introTimer = 0;

function newGame() {
  input.reset();
  hud.clearBanner();
  game = new Game({
    heroId,
    stageId,
    quick: $('quickMode').checked,
    onBanner: (t, size) => hud.banner(t, size),
    onState: onState,
    onBoss: (def) => hud.banner(`${def.name}\n${def.epithet}`, 'big'),
  });
  window.__game = game; // handy for debugging from the console
  renderer.render(game, input, 0);
  hud.show(true);
  hud.update(game, 0, true);
  renderIntro(STAGES[stageId]);
  showScreen('intro');
  introTimer = 2.6;
}

function onState(state, g) {
  if (state === 'levelup') {
    renderChoices(g.choices, (i) => g.choose(i));
    showScreen('levelup');
  } else if (state === 'paused') {
    showScreen('pause');
  } else if (state === 'play') {
    showScreen(null);
  } else if (state === 'over' || state === 'clear') {
    renderResult(g, state === 'clear');
    showScreen('result');
  }
}

function toTitle() {
  game = null;
  hud.show(false);
  hud.clearBanner();
  renderTitle(heroId, (id) => {
    heroId = id;
    toTitle();
  });
  showScreen('title');
}

input.on('key', (k) => {
  if (!game) {
    if (k === 'enter' && !$('title').hidden) newGame();
    return;
  }
  if (k === 'p' || k === 'escape') game.togglePause();
  if (game.state === 'levelup' && ['1', '2', '3'].includes(k)) game.choose(Number(k) - 1);
  if ((game.state === 'over' || game.state === 'clear') && k === 'enter') newGame();
});

$('startBtn').addEventListener('click', newGame);
$('pauseBtn').addEventListener('click', () => game?.togglePause());
$('resumeBtn').addEventListener('click', () => game?.togglePause());
$('quitBtn').addEventListener('click', toTitle);
$('retryBtn').addEventListener('click', newGame);
$('homeBtn').addEventListener('click', toTitle);
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
  }
  requestAnimationFrame(frame);
}

toTitle();
requestAnimationFrame(frame);
