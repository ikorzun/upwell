# The gallery's composer (tools/gallery): each element's variant shots, drawn by the game, laid out as the OpenAI sheets are (a 3 x 2 grid of 512 x 512
# cells labelled A-F; a far layer as wide cells, the shaft across) into research/variants/<world>-<el>-game.png. Usage, with the dev server on:
#   Q='?play=sea' node tools/gallery/look.mjs tools/gallery/sea-ledges-props.js /tmp/g > /tmp/g.log   (window.__galEls picks the elements)
#   python3 tools/gallery/compose.py /tmp/g /tmp/g.log research/variants [world, default sea]
import json, sys
from PIL import Image, ImageDraw, ImageFont
prefix, log, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
world = sys.argv[4] if len(sys.argv) > 4 else 'sea'   # the sheets' name: <world>-<el>-game.png
rows = [json.loads(l) for l in open(log) if l.startswith('{')]
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Courier New Bold.ttf', 40)
except Exception: f = None
DPR, TILE = 3, 23.0625
by = {}
for i, r in enumerate(rows): by.setdefault(r['el'], []).append((i, r))
for el, items in by.items():
    wide = items[0][1].get('far')
    cw, ch = (1024, round(470 * items[0][1].get('h', 7.8) / 7.8)) if wide else (512, 512)
    cols = 2 if wide else 3
    S = Image.new('RGB', (cols * (cw + 4), ((len(items) + cols - 1) // cols) * (ch + 4)), (200, 200, 200))
    for j, (i, r) in enumerate(items):
        im = Image.open(f'{prefix}-{i}.jpg').convert('RGB')
        if wide: y1 = int((r['band'] + 0.6 * TILE) * DPR); cell = im.crop((0, y1 - int(r.get('h', 7.8) * TILE * DPR), im.width, y1))   # (h: a taller band, tiles)
        else: side = int((12 + r['w'] * TILE) * DPR); y0 = int(r['sy'] * DPR - r.get('at', 0.53) * side); cell = im.crop((0, y0, side, y0 + side))
        cell = cell.resize((cw, ch), Image.LANCZOS); d = ImageDraw.Draw(cell); d.text((24, 14), 'ABCDEF'[r['k']], fill=(243, 243, 243), font=f)
        S.paste(cell, ((j % cols) * (cw + 4), (j // cols) * (ch + 4)))
    S.save(f'{out_dir}/{world}-{el}-game.png'); print(el, len(items))
