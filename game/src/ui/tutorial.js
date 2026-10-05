/**
 * First-battle tutorial: speech-bubble steps that wait for the player to
 * actually do each thing (move, let the blade swing, pick up 엽전, choose a
 * 책략, fill 기세, dodge the boss). The game keeps running underneath.
 * Shown until a run ends once with it on; '튜토리얼 다시 보기' turns it back on.
 */
const $ = (id) => document.getElementById(id);
const touchFirst = () => window.matchMedia?.('(pointer: coarse)').matches;

const STEPS = [
  {
    id: 'move', icon: '🕹️', title: '움직여 볼까요?',
    text: () => (touchFirst() ? '화면을 꾹 누른 채 손가락을 끌면 움직여요.' : 'WASD나 방향키로 움직여요. 화면을 끌어도 돼요.'),
    done: (g, s) => s.moved > 160,
  },
  {
    id: 'attack', icon: '⚔️', title: '공격은 자동!',
    text: () => '적 가까이 가면 영웅이 알아서 베요. 맞지 않게 빙글빙글 피해 다녀요.',
    done: (g, s) => g.kills >= 3 || s.t > 9,
  },
  {
    id: 'coin', icon: '🪙', title: '엽전을 주워요',
    text: () => '쓰러진 적이 떨군 엽전을 주우면 아래 공훈 바가 차요. 가득 차면 레벨업!',
    glow: 'xpFill',
    done: (g, s) => g.player.level > 1 || s.t > 14,
  },
  {
    id: 'pick', icon: '📜', title: '책략 고르기',
    text: () => '카드 한 장을 골라요. 무예는 공격, 병법은 군사·전술, 지세는 몸놀림이에요.',
    levelup: true,
    done: (g, s) => s.picked,
  },
  {
    id: 'momentum', icon: '🔥', title: '기세가 차오른다!',
    text: (g) => `아래 기세 바가 가득 차면 고유기 「${g.specialName}」가 저절로 터져요.`,
    glow: 'momFill',
    wait: (g) => g.hud().momentum >= 0.5,
    done: (g, s) => s.t > 7,
  },
  {
    id: 'boss', icon: '⚠️', title: '적장이 나타났어요!',
    text: () => '빨간 범위·화살표는 적장의 공격 예고예요. 그 밖으로 피하면서 때려요!',
    top: true,
    wait: (g) => !!g.boss && g.bossIntro <= 0,
    done: (g, s) => s.t > 7,
  },
  {
    id: 'end', icon: '🎉', title: '튜토리얼 끝!',
    text: () => '이제 마음껏 싸워요. 장비와 스킬을 키우면 더 높은 전장도 깰 수 있어요.',
    top: true,
    done: (g, s) => s.t > 4,
  },
];

export class Tutorial {
  constructor() {
    this.active = false;
    $('tutorSkip').addEventListener('click', () => this.stop(true));
  }

  start() {
    this.active = true;
    this.finished = false;
    this.i = 0;
    this.enter();
  }

  /** `completed`: the player saw it through (or skipped it). */
  stop(completed = false) {
    if (completed) this.finished = true;
    this.active = false;
    this.show(false);
    this.glow(null);
  }

  enter() {
    this.s = { t: 0, moved: 0, picked: false, shown: false };
    this.show(false);
    this.glow(null);
  }

  get step() {
    return STEPS[this.i];
  }

  update(g, dt, move) {
    if (!this.active || !g) return;
    const step = this.step;
    if (!step) return this.stop(true);
    if (step.levelup) return; // waits for the level-up screen
    if (g.state !== 'play') return;
    if (!this.s.shown) {
      if (step.wait && !step.wait(g)) return;
      this.render(g);
    }
    this.s.t += dt;
    if (move && (move.x || move.y)) this.s.moved += Math.hypot(move.x, move.y) * g.player.stats.speed * dt;
    if (step.done(g, this.s)) this.next(g);
  }

  /** Level-up screen opened: show the 책략 step there. */
  onLevelup(g) {
    if (!this.active) return;
    // Skip ahead if the first level came before the earlier steps finished.
    if (!this.step?.levelup) this.i = STEPS.findIndex((x) => x.levelup);
    this.enter();
    this.render(g, true);
  }

  /** A card was chosen. */
  onPick(g) {
    if (!this.active || !this.step?.levelup) return;
    this.s.picked = true;
    this.next(g);
  }

  next(g) {
    this.i++;
    this.enter();
    if (this.i >= STEPS.length) this.stop(true);
  }

  render(g, overLevelup = false) {
    const step = this.step;
    this.s.shown = true;
    $('tutorIcon').textContent = step.icon;
    $('tutorTitle').textContent = step.title;
    $('tutorText').textContent = step.text(g);
    $('tutorDots').innerHTML = STEPS.map((_, k) => `<i class="${k < this.i ? 'done' : k === this.i ? 'now' : ''}"></i>`).join('');
    const box = $('tutor');
    box.classList.toggle('at-top', !!step.top);
    box.classList.toggle('over-levelup', overLevelup);
    this.show(true);
    this.glow(step.glow ?? null);
  }

  show(on) {
    const box = $('tutor');
    box.hidden = !on;
    if (on) {
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    }
  }

  /** Pulses the HUD bar the current step talks about. */
  glow(id) {
    for (const el of document.querySelectorAll('.tut-glow')) el.classList.remove('tut-glow');
    if (id) $(id)?.parentElement.classList.add('tut-glow');
  }
}
