import { TAU, rand } from '../core/math.js';

/**
 * Hero special abilities (고유기). Fired automatically when the momentum
 * (기세) gauge fills.
 */
export const SPECIALS = {
  tongsol: {
    name: '통솔',
    fire(g) {
      const p = g.player;
      const count = 2 + p.stats.guard;
      const life = 12 + 2 * p.stats.guard;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rand(-0.2, 0.2);
        g.allies.push({
          kind: 'soldier', x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
          r: 11, life, maxLife: life, cd: rand(0, 0.4), facing: a,
        });
        g.fx.push({ type: 'puff', x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40, t: 0, life: 0.5, size: 18, tone: 'light' });
      }
      g.banner(`통솔 — 고려 창병 ${count}명 합류`, 'small');
    },
  },
  // Next heroes: paewang (견훤), mireuk (궁예). See docs/GAME_DESIGN.md §3.
};
