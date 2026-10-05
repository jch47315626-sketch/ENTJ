/**
 * Movement-only input: keyboard (WASD / arrows) and a floating touch stick
 * that appears wherever the player presses on the canvas.
 */
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.stick = null; // { id, ox, oy, x, y }
    this.handlers = {};
    this.stickRadius = 56;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
      this.handlers.key?.(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.stick = null;
    });

    const down = (e) => {
      if (this.stick) return;
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
    };
    const up = (e) => {
      if (this.stick && e.pointerId === this.stick.id) this.stick = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  /** Returns a movement vector with length in [0, 1]. */
  move() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
      const l = Math.hypot(dx, dy);
      if (l < 6) return { x: 0, y: 0 };
      const m = Math.min(1, l / this.stickRadius);
      return { x: (dx / l) * m, y: (dy / l) * m };
    }
    return { x: 0, y: 0 };
  }

  reset() {
    this.keys.clear();
    this.stick = null;
  }
}
