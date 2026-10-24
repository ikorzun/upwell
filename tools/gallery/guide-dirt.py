# The guide's cluster rule measured on real screens: each shot sampled at game-pixel centres (4 device px a game pixel on the 393 x 660 phone shot), a
# pixel is lone when none of its 8 neighbours has its colour (black aside). Usage: python3 dirt.py <prefix> <log> [maps]
import json, sys
from collections import Counter
from PIL import Image
pre, log = sys.argv[1], sys.argv[2]; maps = len(sys.argv) > 3
rows = [json.loads(l) for l in open(log) if l.startswith('{')]
res = []
for i, r in enumerate(rows):
    im = Image.open(f'{pre}-{i}.jpg').convert('RGB'); W, H = im.size; px = im.load(); g = 4
    gw, gh = W // g, H // g
    INK = {'w': (243, 243, 243), 's': (200, 200, 200), 'b': (91, 184, 255), 'o': (250, 162, 62), 'p': (201, 150, 255), 'c': (111, 224, 238), 'g': (51, 156, 57), 'r': (244, 62, 52), 'y': (255, 237, 87)}
    PALS = [(k, f, tuple(20 + (v - 20) * f for v in c)) for k, c in INK.items() for f in (1.0, 0.62, 0.38)] + [('k', 1, (20, 20, 20))]
    cache = {}
    def q(c):   # (jpeg: each pixel to its nearest ink and tone)
        key = tuple(v // 8 for v in c)
        if key not in cache: cache[key] = min(PALS, key=lambda P: sum((a - b) ** 2 for a, b in zip(c, P[2])))[:2]
        return cache[key]
    G = [[q(px[x * g + 2, y * g + 2]) for x in range(gw)] for y in range(gh)]
    y0, y1 = int(70 * 3 / g), int((r['h'] - r['keep']) * 3 / g)   # (under the HUD, over the keys)
    x0, x1 = int((r['l'] + 2) * 3 / g), int((r['r'] - 2) * 3 / g)
    blackish = lambda c: c[0] == 'k'
    lone = 0; tot = 0; mark = Image.new('RGB', (gw, gh)) if maps else None
    for y in range(y0 + 1, y1 - 1):
        for x in range(x0 + 1, x1 - 1):
            c = G[y][x]
            if blackish(c): continue
            tot += 1
            if not any(G[y + dy][x + dx] == c for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx) and \
               sum(1 for dy, dx in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2), (-2, 2), (2, -2), (0, 3), (0, -3), (0, 4), (0, -4)) if 0 <= y + dy < gh and 0 <= x + dx < gw and G[y + dy][x + dx] == c) < 2:   # (not a pattern's dot)
                lone += 1
                if maps: mark.putpixel((x, y), (255, 0, 0))
    res.append((r['world'], r['s'] + 1, lone, tot, round(1000 * lone / max(1, tot), 1), r['nf']))
    if maps:
        base = im.resize((gw, gh)).convert('L').convert('RGB'); base = Image.blend(base, Image.new('RGB', base.size), 0.5)
        mp = mark.load(); bp = base.load()
        for y in range(gh):
            for x in range(gw):
                if mp[x, y] != (0, 0, 0): bp[x, y] = (255, 40, 40)
        base.resize((gw * 2, gh * 2), Image.NEAREST).save(f'map-{i}.png')
for w, s, lone, tot, pm, nf in res: print(f'{w:8s} {s}  lone {lone:5d} of {tot:6d}  {pm:6.1f}/1000  nf {nf}')
