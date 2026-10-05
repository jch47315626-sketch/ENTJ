/** Uniform spatial hash for fast neighbour queries. */
export class SpatialGrid {
  constructor(cell = 64) {
    this.cell = cell;
    this.map = new Map();
  }
  clear() {
    this.map.clear();
  }
  key(cx, cy) {
    return cx * 73856093 ^ cy * 19349663;
  }
  insert(e) {
    const cx = Math.floor(e.x / this.cell);
    const cy = Math.floor(e.y / this.cell);
    const k = this.key(cx, cy);
    let bucket = this.map.get(k);
    if (!bucket) this.map.set(k, (bucket = []));
    bucket.push(e);
  }
  /** Calls fn(e) for every entity whose cell overlaps the circle (x, y, r). */
  query(x, y, r, fn) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const bucket = this.map.get(this.key(cx, cy));
        if (bucket) for (let i = 0; i < bucket.length; i++) fn(bucket[i]);
      }
    }
  }
}
