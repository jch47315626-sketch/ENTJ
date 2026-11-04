#!/usr/bin/env python3
"""
영물 그림 가져오기: turns the large "pixel art" images an image model made
(1024-1254 px, each art pixel drawn as a block of roughly 16-20 px, sometimes on
white) into real small pixel sprites for the game.

  python3 tools/spirits/import.py <id> <image> [<id> <image> ...]
  python3 tools/spirits/import.py hero:wanggeon_front 앞.png hero:wanggeon_back 뒤.png hero:wanggeon_weapon 검.png

Ids starting with "unit:" are soldiers and generals (enemy, boss or ally id; a boss's second form is <id>_2)
and go to game/assets/units/ and game/src/data/unitSprites.js. Ids starting with "hero:" are hero pictures (<hero>_front, _back, _weapon) and go to
game/assets/heroes/ and game/src/data/heroSprites.js instead.

For each: the white background (if any) touching the edge is removed, the
picture is cropped, the size of one art pixel is measured from the image's
own blocks, and every block is replaced by its most common colour. Pictures
that are not pixel art (smooth drawings) are cut into a 64-pixel grid and
reduced to 48 colours instead. Writes game/assets/spirits/<id>.png and
updates game/src/data/spiritSprites.js (id → { w, h }). The four 사신 also get
<id>_big.png on a 128-cell grid for when they are bosses.
"""
import json, os, re, sys
from collections import Counter, deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'game/assets/spirits')
MANIFEST = os.path.join(ROOT, 'game/src/data/spiritSprites.js')
UNIT_OUT = os.path.join(ROOT, 'game/assets/units')
UNIT_MANIFEST = os.path.join(ROOT, 'game/src/data/unitSprites.js')
HERO_OUT = os.path.join(ROOT, 'game/assets/heroes')
HERO_MANIFEST = os.path.join(ROOT, 'game/src/data/heroSprites.js')
# Pictures with stray leftovers (a cart that came with a floating helmet and boots): keep the main body only.
KEEP_MAIN = {'cart'}
# Areas to blank in the source (fractions x0, y0, x1, y1): the cart's leftover boots under it.
ERASE = {'cart': [(0.2, 0.82, 0.42, 1.0), (0.55, 0.82, 0.8, 1.0)]}
SASIN = {'cheongnyong', 'jujak', 'baekho', 'hyeonmu'}


def clear_white(im):
    """Make near-white pixels connected to the border transparent."""
    w, h = im.size
    px = im.load()
    seen = set()
    # A dark fake checkerboard (dark greys) shows as a dark border: clear dark neutral greys then too.
    edge = [px[x, y] for x in range(0, w, 7) for y in (0, h - 1)] + [px[x, y] for y in range(0, h, 7) for x in (0, w - 1)]
    dark_bg = sum(1 for c in edge if max(c[:3]) < 110 and max(c[:3]) - min(c[:3]) < 14) > len(edge) * 0.5
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        # White, or the light neutral grey of a fake 'transparent' checkerboard baked into the picture.
        if a < 20 or (r > 232 and g > 232 and b > 232) or (min(r, g, b) > 165 and max(r, g, b) - min(r, g, b) < 16) \
                or (dark_bg and 25 < max(r, g, b) < 115 and max(r, g, b) - min(r, g, b) < 14):
            px[x, y] = (0, 0, 0, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # A checkerboard background shows as many cleared pixels that were not pure white.
    checker = dark_bg or sum(1 for p in seen if 0 <= p[0] < w and 0 <= p[1] < h and min(px[p][:3] if px[p][3] else (255, 255, 255)) < 232) > 0
    if checker or dark_bg:
        clear_enclosed_checker(im, seen, any_shade=True, dark=dark_bg)
        # The image generator's sparkle watermark sits in the bottom-right corner.
        for y in range(int(h * 0.9), h):
            for x in range(int(w * 0.9), w):
                px[x, y] = (0, 0, 0, 0)
    else:
        clear_enclosed_checker(im, seen)
    return im


def clear_enclosed_checker(im, done, any_shade=False, dark=False):
    """
    A fake checkerboard also shows through closed gaps (inside a bow and its string). On pictures whose
    background was one, clear enclosed patches that are themselves checkerboard: both the light and
    the grey squares in good measure. (White fur or a grey beard is one shade with shading, not two.)
    """
    w, h = im.size
    px = im.load()
    neutral = (lambda c: c[3] > 20 and 25 < max(c[:3]) < 115 and max(c[:3]) - min(c[:3]) < 14) if dark else \
        (lambda c: c[3] > 20 and min(c[:3]) > 165 and max(c[:3]) - min(c[:3]) < 16)
    light = lambda c: min(c[:3]) > 222
    seen = set()
    for sy in range(0, h, 4):
        for sx in range(0, w, 4):
            if (sx, sy) in seen or (sx, sy) in done or not neutral(px[sx, sy]):
                continue
            comp, q = [], deque([(sx, sy)])
            seen.add((sx, sy))
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and neutral(px[nx, ny]):
                        seen.add((nx, ny))
                        q.append((nx, ny))
            if len(comp) < 600:
                continue
            nl = sum(1 for x, y in comp if light(px[x, y]))
            # On a checkerboard picture any big light-grey patch is a hole; otherwise it must be two-tone.
            if any_shade or 0.25 < nl / len(comp) < 0.75:
                for x, y in comp:
                    px[x, y] = (0, 0, 0, 0)


def block_size(im):
    """
    The size of one art pixel: colour changes along rows and columns fall on a
    regular grid, so try every candidate size and keep the largest one whose
    grid lines up with most of the changes (a half-size grid lines up too,
    but bigger is the real one when both fit).
    """
    w, h = im.size
    px = im.load()
    diff = lambda a, b: abs(a[3] - b[3]) > 100 or (a[3] > 128 and b[3] > 128 and sum(abs(a[i] - b[i]) for i in range(3)) > 60)
    xs, ys = [], []
    for y in range(0, h, 5):
        for x in range(1, w):
            if diff(px[x, y], px[x - 1, y]): xs.append(x)
    for x in range(0, w, 5):
        for y in range(1, h):
            if diff(px[x, y], px[x, y - 1]): ys.append(y)
    if len(xs) < 50:
        return None

    def score(pos, p):
        bins = Counter(int((v % p) / p * 8) for v in pos)
        # The changes of a real grid crowd into one or two neighbouring phase bins.
        top = bins.most_common(1)[0][0]
        return (bins[top] + bins[(top + 1) % 8] + bins[(top - 1) % 8]) / len(pos)

    cands = [10 + i * 0.1 for i in range(250)]
    scored = [(p, (score(xs, p) + score(ys, p)) / 2) for p in cands]
    best = max(v for _, v in scored)
    if best < 0.6:
        return None  # no grid: a smooth drawing
    good = [p for p, v in scored if v >= best * 0.93]
    return max(good)


def downsample(im, bs):
    w, h = im.size
    gw, gh = max(1, round(w / bs)), max(1, round(h / bs))
    sx, sy = w / gw, h / gh
    px = im.load()
    out = Image.new('RGBA', (gw, gh))
    op = out.load()
    for gy in range(gh):
        for gx in range(gw):
            # Sample the middle of the cell (edges are blurred), most common colour wins.
            c = Counter()
            for yy in range(int(gy * sy + sy * 0.25), int(gy * sy + sy * 0.75) + 1):
                for xx in range(int(gx * sx + sx * 0.25), int(gx * sx + sx * 0.75) + 1):
                    if 0 <= xx < w and 0 <= yy < h:
                        r, g, b, a = px[xx, yy]
                        c[(r >> 3 << 3, g >> 3 << 3, b >> 3 << 3, 255 if a > 140 else 0)] += 1
            op[gx, gy] = c.most_common(1)[0][0] if c else (0, 0, 0, 0)
    return out


def load_manifest(path):
    if os.path.exists(path):
        m = re.search(r'=\s*(\{.*\});', open(path).read(), re.S)
        if m: return json.loads(m.group(1))
    return {}


def write_manifest(path, name, what, manifest):
    with open(path, 'w') as f:
        f.write(f'// Generated by tools/spirits/import.py: {what}\n')
        f.write(f'export const {name} = ' + json.dumps(manifest, indent=2, ensure_ascii=False) + ';\n')


def clean_edges(im):
    """Drop leftover background on the rim (light neutral greys touching transparency) and lone pixels."""
    w, h = im.size
    px = im.load()
    stray = lambda c: c[3] and min(c[:3]) > 160 and max(c[:3]) - min(c[:3]) < 20
    for _ in range(2):
        kill = []
        for y in range(h):
            for x in range(w):
                c = px[x, y]
                if not c[3]:
                    continue
                n = [px[nx, ny] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if 0 <= nx < w and 0 <= ny < h]
                open_sides = 4 - sum(1 for d in n if d[3])
                if (stray(c) and open_sides) or open_sides >= 4:
                    kill.append((x, y))
        for p in kill:
            px[p] = (0, 0, 0, 0)
    return im


def keep_main(im):
    """Only the largest connected shape (and anything at least a fifth its size)."""
    w, h = im.size
    px = im.load()
    seen, comps = set(), []
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or px[x, y][3] == 0:
                continue
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3]:
                            seen.add((nx, ny))
                            q.append((nx, ny))
            comps.append(comp)
    big = max(len(c) for c in comps)
    for c in comps:
        if len(c) < big * 0.2:
            for x, y in c:
                px[x, y] = (0, 0, 0, 0)
    return im.crop(im.getbbox())


def to_pixels(path, cells=64, colours=48, erase=None):
    im = Image.open(path).convert('RGBA')
    for x0, y0, x1, y1 in erase or []:
        W, H = im.size
        im.paste((0, 0, 0, 0), (int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    im = clear_white(im)
    im = im.crop(im.getbbox())
    bs = block_size(im)
    smooth = bs is None or bs > 30
    # A grid finer than the set's (a model drawing tiny "pixels") is treated like a drawing too.
    if not smooth and max(im.size) / bs > cells * 1.15:
        smooth = True
    if smooth:
        bs = max(im.size) / cells
    small = downsample(im, bs)
    if smooth:
        # A drawing, not pixel art: fewer colours so it sits with the rest.
        alpha = small.getchannel('A')
        small = small.convert('RGB').quantize(colours, method=Image.Quantize.FASTOCTREE).convert('RGBA')
        small.putalpha(alpha)
    small = clean_edges(small)
    return im, small.crop(small.getbbox()), bs, smooth


def main(pairs):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(HERO_OUT, exist_ok=True)
    manifest, heroes, units = load_manifest(MANIFEST), load_manifest(HERO_MANIFEST), load_manifest(UNIT_MANIFEST)
    os.makedirs(UNIT_OUT, exist_ok=True)
    for sid, path in pairs:
        if sid.startswith('unit:'):
            # Soldiers and generals, enemy or ally: one front picture with its weapon.
            uid = sid[5:]
            im, small, bs, smooth = to_pixels(path, erase=ERASE.get(uid))
            if uid in KEEP_MAIN:
                small = keep_main(small)
            small.save(os.path.join(UNIT_OUT, f'{uid}.png'))
            units[uid] = {'w': small.width, 'h': small.height}
            print(f'{sid:22s} {path}  ->  {small.width}x{small.height}')
            continue
        if sid.startswith('hero:'):
            # Hero pictures: <hero>_front / _back / _weapon. Weapons are long and thin: keep 64 cells along them.
            hid, part = sid[5:].rsplit('_', 1)
            im, small, bs, smooth = to_pixels(path)
            small.save(os.path.join(HERO_OUT, f'{hid}_{part}.png'))
            heroes.setdefault(hid, {})[part] = {'w': small.width, 'h': small.height}
            print(f'{sid:22s} {path}  ->  {small.width}x{small.height}')
            continue
        im, small, bs, smooth = to_pixels(path)
        small.save(os.path.join(OUT, f'{sid}.png'))
        manifest[sid] = {'w': small.width, 'h': small.height}
        # 사신 are also bosses, drawn three times larger: keep a 128-cell version for them.
        if sid in SASIN:
            big = downsample(im, max(im.size) / 128)
            alpha = big.getchannel('A')
            big = big.convert('RGB').quantize(64, method=Image.Quantize.FASTOCTREE).convert('RGBA')
            big.putalpha(alpha)
            big = big.crop(big.getbbox())
            big.save(os.path.join(OUT, f'{sid}_big.png'))
            manifest[sid]['big'] = {'w': big.width, 'h': big.height}
        print(f'{sid:12s} {path}  block {bs:.1f}px  ->  {small.width}x{small.height}{"  (smooth drawing, pixelated)" if smooth else ""}')
    write_manifest(MANIFEST, 'SPIRIT_SPRITES', '영물 sprites in game/assets/spirits/ (id → size in pixels).', manifest)
    write_manifest(UNIT_MANIFEST, 'UNIT_SPRITES', 'soldier and general sprites in game/assets/units/ (enemy/boss/ally id → size).', units)
    write_manifest(HERO_MANIFEST, 'HERO_SPRITES', 'hero sprites in game/assets/heroes/ (hero → front/back/weapon sizes).', heroes)


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 2 or len(a) % 2:
        sys.exit(__doc__)
    main(list(zip(a[::2], a[1::2])))
