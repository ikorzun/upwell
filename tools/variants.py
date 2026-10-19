#!/usr/bin/env python3
"""Variants of one world element, drawn by OpenAI's GPT Image, to choose a look before it is coded (owner 2026-10-19: a prompt
for OpenAI that offers different variants of one detail; the owner picks one, and it is then drawn in code).

Each element is described the way the parts catalog does (https://claude.ai/artifact/CPtyrzSxgfXjWWmYtzpQEx): its world, what it
is, what it does in play (or, for a prop, where it sits), its material and its size in tiles. The prompt carries the game's own rules (the nine inks and what
they mean, the black night, dithered shading, side view, the hero for scale), and asks for flat boxes and discs, so whichever
variant is picked can be drawn with the renderer's own.

So that a sheet looks like the game and keeps to its pixels (owner: it smeared), the call sends a real screenshot of the world as
the style to copy, research/variants/ref-<world>.png, cut from the game at exactly 4 x 4 image pixels a game pixel (1280 x 953 at
2x on a desktop: a tile is 16 game pixels there); the prompt asks for that grid; and the sheet that comes back is put onto it and
onto the nine inks (snap), as <id>-<n>-px.png beside the raw one.

    python3 tools/variants.py list              # the elements described so far
    python3 tools/variants.py <id> --prompt     # print the prompt, to paste into ChatGPT by hand (with the reference attached)
    python3 tools/variants.py <id>              # one 3 x 2 sheet of six variants, A to F: research/variants/<id>-<n>.png and -px.png
    python3 tools/variants.py <id> --model sunburst --no-ref   # the finer model; no reference

Needs OPENAI_API_KEY: from the shell, or else from "env" in ~/.claude/settings.json, where Claude Code keeps it for its own tools
only. The gpt-image skill's script makes the call.
"""
import argparse, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.expanduser('~/.claude/skills/gpt-image/scripts/gpt_image.py')

# world: (name, what it is like, its own ink, what the other inks already mean there, what is behind it all)
WORLDS = {
    'tokyo': ('Tokyo', 'a Japanese suburb at night: narrow alleys between small houses and apartment blocks, power lines, vending '
              'machines, shop signs', 'blue #5bb8ff', 'purple marks moving platforms and grey blocks crumble', 'the plain black night, nothing far off'),
    # (owner 2026-10-19: the Cave and the Glacier Japanese too, cute and cosy; the Glacier as on Mount Fuji)
    'cave': ('the Cave', 'a cosy Japanese cave under a little mountain shrine: soft moss, stone lanterns, small stone jizo statues, paper lanterns, bamboo, '
             'the steam of a hot spring; cute and warm, kawaii', 'grey #c8c8c8',
             'green is moss you can hold on to, purple marks springs and rubber walls, blue is ice and moving planks, orange blocks crumble',
             'the black dark of the cave, nothing far off'),
    'fuji': ('Mount Fuji', 'the slopes of Mount Fuji in winter, cosy and cute, kawaii: snow on pine trees tied up with yukitsuri ropes, stone lanterns capped '
             'with snow, kamakura snow huts lit from inside, snow monkeys in a hot spring', 'blue #5bb8ff',
             'white is ice you slip on (a whole block or wall of it), grey blocks crumble, purple marks moving planks and springs, green is moss you can hold on to',
             'the black winter night, nothing far off'),
}
LEDGE_AT = 'a blue concrete ledge with a white top edge sticking out of the wall'
CAVE_AT = 'a grey stone ledge with a white top edge sticking out of the wall'
FUJI_AT = 'a blue rock ledge with a soft cap of snow and a white top edge sticking out of the wall'
FUJI_RULE = ('In this world white is ice you slip on (a whole block or wall of white), grey blocks crumble and purple marks moving planks and springs: '
             'so the snow is only a cap on top, and its top is the white edge you stand on.')
# A ledge: what it is, what it does in play, its material and size; where it is, its main colour, what its variants vary and the inks' rule,
# when not a slab's (LEDGE_AT). A prop, decor fixed to its place (the catalog's kit: a sign on
# a wall, a vending machine in a niche on a shelf, a wire between poles): what it is, where it sits, its material, size, the inks it
# may take, what else the cell shows, and any lettering it may carry.
ELEMENTS = {
    'tokyo-slab': dict(world='tokyo', kind='ledge', what='the basic ledge, a solid ledge sticking out of the shaft wall',
                       does='solid on every side: you stand on it, cling to its sides and jump off it',
                       material='concrete, as on the houses and apartment blocks of the suburb', size='4 tiles long and 1 tile thick'),
    'tokyo-awning': dict(world='tokyo', kind='ledge', what="a shop's awning, a canvas awning sticking out of the shaft wall over a shop's door",
                         does='a thin platform: you jump up through it from below and stand on it, and it throws you up like a trampoline, its canvas sagging as you land',
                         material='striped canvas on a light steel frame, held to the wall by rods or chains', size='4 tiles long and a third of a tile thick, its hem hanging a little lower',
                         main='blue, striped with white or black', vary='the stripes, the hem (scalloped, straight or fringed), the slope and curve of the canvas, how it hangs from the '
                         "wall (rods, chains, brackets) and the small details on it (a paper lantern under its edge, a shop's mark on the hem)"),
    'tokyo-beam': dict(world='tokyo', kind='ledge', what='a steel beam, a thin girder hanging free in the middle of the shaft',
                       does='a thin platform: you jump up through it from below and stand on it', material='riveted steel, as on a building site among the houses',
                       size='4 tiles long and a third of a tile thick', place='the beam in the middle of the shaft, clear of the wall (it may hang on thin cables from above, out of the cell, or simply float)',
                       main='steel grey', vary='its profile (an I-beam, a lattice girder, a channel, a box), its ends, the rivets and bolts, how it hangs (cables, hooks or nothing) and the small details on it (a chain, a hook)',
                       rule='In this world purple marks moving platforms and grey chequered blocks crumble, so keep the beam clearly a steel beam, and purple only for small details.'),
    'tokyo-gondola': dict(world='tokyo', kind='ledge', what="a window cleaner's gondola, a small platform hanging on two cables",
                          does='a thin platform that rides sideways along its row, from wall to wall and back, carrying you; you jump up through its floor from below and stand on it',
                          material='a steel floor with a railing round it, two cables going up out of sight', size='3 tiles long, its floor a third of a tile thick, its railing about half a tile high',
                          place='the gondola hanging on two cables in the middle of the shaft (the cables go up out of the cell)', main='purple',
                          vary='the floor and its railing (bars, mesh or panels), the cables and how they join it (a frame, pulleys, a winch), its ends and the small details on it (a bucket, a squeegee, a little motor)',
                          rule="Purple is this world's mark for what moves, so it is its main colour; grey only for the cables and small details."),
    'tokyo-aircon2': dict(world='tokyo', kind='ledge', what="an air conditioner's outdoor unit on a steel bracket on the shaft wall, big enough to stand on",
                          does='you can stand on its top, but it holds you only 3 seconds: it rattles, then falls off the wall',
                          material='a sheet-steel casing, a big round fan behind a grille, a side panel with louvers, pipes into the wall',
                          size='2.2 tiles wide and 1.4 tiles tall, on a bracket under it', place='the unit on its bracket against that wall', main='grey (steel)',
                          vary='the fan grille (rings, spokes or a spiral), the side panel and its louvers, the bracket, the pipes, the labels and the small details on it',
                          rule='In this world purple marks moving platforms and grey blocks crumble; keep it clearly an air conditioner, and purple only for small details.'),
    'tokyo-vault': dict(world='tokyo', kind='ledge', what='a vault: a cage of bars holding six gold coins, built against the shaft wall',
                        does='its walls and roof are solid (you stand on its roof); its floor is cracked: a head-butt from below breaks it and lets you in to '
                        'the coins, and a gap in its roof lets you on up', material='steel bars', size='about 6 tiles wide and 4 tiles tall, its inside 4 tiles wide '
                        'and 2 tall, its walls 1 tile thick', place='the cage built against that wall, six gold coins inside it', main='blue',
                        vary='how few bars it needs (keep it light and simple: a clear outline, the coins easy to see), its corners and rails, how its cracked floor '
                        'shows it can be broken from below, and the gap in its roof',
                        rule='In this world purple marks moving platforms and grey blocks crumble, so use those only for small details; the coins are gold, yellow '
                        'and orange, as they can be taken.'),
    'cave-slab': dict(world='cave', kind='ledge', what='the basic ledge, a solid ledge of old stone sticking out of the shaft wall',
                      does='solid on every side: you stand on it, cling to its sides and jump off it',
                      material='old dressed stone, as the stone walls and steps of a little mountain shrine', size='4 tiles long and 1 tile thick',
                      rule='In this world green is moss you can hold on to (under a ledge or on a wall), purple marks springs and rubber walls, blue is ice and '
                      'moving planks and orange blocks crumble: so no moss on it, and those colours only for tiny details.'),
    'cave-plank': dict(world='cave', kind='ledge', what='a bamboo plank: a few thick bamboo poles lashed side by side with rope, a thin platform',
                       does='a thin platform: you jump up through it from below and stand on it', material='dry bamboo, its nodes and the rope lashings',
                       size='4 tiles long and a third of a tile thick', place='the plank sticking out of that wall', main='grey (dry bamboo)',
                       vary='the poles (two or three, thin or thick), their nodes, the lashings, the cut ends, how it is fixed to the wall (pegs, ropes up to the '
                       'wall) and the small details on it (a hanging charm, a strip of paper)',
                       rule='In this world green is moss you can hold on to, so the bamboo is dry and grey; purple, blue and orange only for tiny details.'),
    'cave-toro': dict(world='cave', kind='prop', what='a toro, a Japanese stone lantern', where='on the top of a ledge at its wall end',
                      material='carved stone: a base, a post, a light box with a window, a curved roof cap', size='about 1 tile wide and 2 tiles tall',
                      inks='grey stone, its window glowing a warm orange with a dither halo of orange round it', scene=CAVE_AT),
    'cave-jizo': dict(world='cave', kind='prop', what='a small stone jizo statue, a cute round little monk, or two of them side by side',
                      where='on the top of a ledge at its wall end', material='smooth stone, a knitted cap and a little cloth bib',
                      size='about 0.8 tiles wide and 1.2 tiles tall each', inks='grey stone, the cap and bib orange (never red: red is danger here), '
                      'a face drawn in black, its eyes closed and smiling', scene=CAVE_AT),
    'cave-torii': dict(world='cave', kind='prop', what='a small torii gate of a mountain shrine, standing against the back wall of the cave like a gateway behind the play',
                       where='against the back wall over a ledge, drawn as part of the far back (its colours dithered with black, so it reads as behind the play '
                       'and its beams never look like ledges)', material='lacquered wood: two posts, a curved top beam, a straight tie beam, a shimenawa rope with zigzag paper',
                       size='about 3 tiles wide and 3 tiles tall', inks='orange posts and beams (never red), a grey rope and grey paper zigzags', scene=CAVE_AT),
    'cave-lanterns': dict(world='cave', kind='prop', what='a string of round paper lanterns (chochin) hung across the shaft for a little festival',
                          where='on a rope sagging across the shaft from wall to wall', material='paper lanterns ribbed with black, grey caps top and bottom, a rope',
                          size='each lantern about 0.6 tiles wide and 0.8 tiles tall, four to six on the rope',
                          inks='orange lanterns glowing with a dither halo of orange, black ribs, grey caps and rope', scene=CAVE_AT + ' below them'),
    'fuji-slab': dict(world='fuji', kind='ledge', what='the basic ledge, a solid ledge of dark volcanic rock with a soft cap of snow, sticking out of the shaft wall',
                      does='solid on every side: you stand on it, cling to its sides and jump off it', material='rough volcanic rock of Mount Fuji, snow on top',
                      size='4 tiles long and 1 tile thick', main='blue (the rock)',
                      vary="the rock's silhouette and cracks, the snow cap (its thickness, its soft rounded edge, a few lumps and drips over the sides), its free end, "
                      'how it meets the wall, and the small details on it (a tuft of dry grass, a little icicle)', rule=FUJI_RULE),
    'fuji-plank': dict(world='fuji', kind='ledge', what='a wooden boardwalk of the mountain trail: a few short boards on a light frame, a thin platform',
                       does='a thin platform: you jump up through it from below and stand on it', material='weathered wood boards, a frame, a little snow on top',
                       size='4 tiles long and a third of a tile thick', place='the plank sticking out of that wall', main="blue (the world's own colour)",
                       vary='the boards and the gaps between them, the frame under them, how it is held to the wall (a post down to the wall, ropes, brackets), '
                       'the snow on it, and the small details on it (a trail marker, a little bell)', rule=FUJI_RULE),
    'fuji-kamakura': dict(world='fuji', kind='prop', what='a kamakura, a little snow hut like an igloo, lit warm from inside by a candle',
                          where='on the top of a ledge at its wall end', material='packed snow, a round doorway, a candle inside',
                          size='about 2 tiles wide and 1.5 tiles tall', inks='snow in grey with white glints (not flat white: white is ice and the edges you stand on), '
                          'the doorway black with a warm orange glow inside and a tiny candle', scene=FUJI_AT),
    'fuji-monkey': dict(world='fuji', kind='prop', what='a snow monkey (a Japanese macaque) bathing in a little hot spring tub, eyes closed, happy',
                        where='on the top of a ledge at its wall end, in a small wooden tub', material='fluffy fur, a round face, the water, steam rising',
                        size='about 1.5 tiles wide and 1.2 tiles tall with its tub', inks='grey fur, an orange face (never red: red is danger), blue water, '
                        'the steam a grey dither rising', scene=FUJI_AT),
    'fuji-pine': dict(world='fuji', kind='prop', what='a pine tree tied up for winter with yukitsuri: straw ropes from a pole at its top fanning down to hold its branches',
                      where='on the top of a ledge at its wall end, as in a Japanese garden', material='a twisted trunk, pads of needles, straw ropes, snow on the branches',
                      size='about 2 tiles wide and 2.5 tiles tall', inks='green needles, an orange or grey trunk, grey ropes, the snow on the branches grey with white glints',
                      scene=FUJI_AT),
    'fuji-usagi': dict(world='fuji', kind='prop', what='a yuki usagi, a little snow rabbit children make: a mound of snow with two leaves for ears and two berries for eyes',
                       where='on the top of a ledge by the wall, one or a few in a row', material='snow, two leaves, two berries',
                       size='about 0.8 tiles wide and 0.6 tiles tall', inks='snow in grey with white glints, green leaf ears, orange berry eyes (never red: red is danger)',
                       scene=FUJI_AT),
    'tokyo-bonsai': dict(world='tokyo', kind='prop', what='a bonsai, a small gnarled pine in a shallow pot',
                         where='on the top of a ledge at its wall end, as on a balcony', material='a twisted trunk, clouds of needles, a glazed pot',
                         size='about 1.5 tiles wide and 1.5 tiles tall, pot included',
                         inks='green needles, the trunk grey or orange, the pot blue, grey or orange', scene=LEDGE_AT),
    'tokyo-aircon': dict(world='tokyo', kind='prop', what="an air conditioner's outdoor unit",
                         where='on a steel bracket on the shaft wall, a tile or two above a ledge', material='a sheet-steel box, a round fan behind a grille, pipes',
                         size='about 1.2 tiles wide and 0.8 tiles tall', inks='a grey casing, a black fan grille, details in blue or black', scene=LEDGE_AT + ' below it'),
    'tokyo-vending': dict(world='tokyo', kind='prop', what='a vending machine for soda',
                          where='in a niche in the wall, standing on a ledge at its wall end', material='a steel cabinet, a lit glass front with rows of cans, a slot below',
                          size='1.4 tiles wide and 2.2 tiles tall',
                          inks='a grey or blue cabinet, a lit front in blue, rows of small cans in white, purple, grey and blue', scene=LEDGE_AT),
    'tokyo-crow': dict(world='tokyo', kind='prop', what='a black crow, the big city crow of Tokyo',
                       where='perched on a power line that sags across the shaft', material='glossy black feathers, a heavy beak',
                       size='about 1 tile long', inks='black, with a grey or blue rim of light along its back and head so it reads on the black night, '
                       'a tiny white glint in its eye; never red eyes (red is danger)',
                       scene='a grey power line sagging across the cell from the wall, and ' + LEDGE_AT + ' lower down'),
    'tokyo-neon': dict(world='tokyo', kind='prop', what='a neon sign of a small bar or noodle shop',
                       where='hanging off the shaft wall on two short steel arms', material='glowing glass tubes on a dark box',
                       size='about 1.5 tiles wide and up to 4 tiles tall, a vertical sign',
                       inks='tubes in one or two of purple, blue, green and orange, their glow a dither halo of the same ink; a black or grey box behind',
                       scene=LEDGE_AT + ' below it', text='a short katakana word (ラーメン, スシ or カラオケ) or a simple pictogram'),
}

LEDGE = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round white hero climbs up a narrow shaft at night.
{refnote}One element of the world "{world}" ({mood}): {what}.
In play: {does}. Material: {material}. Size: {size}; {grid}
Draw six different design variants of this same element in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {place} in flat side view at game scale, and the hero standing on it for scale: a soft round white blob 2 tiles across with two small black eyes.
Keep in every variant: the same size, the same job in play, a white top edge to stand on, {main} as its main colour.
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these nine colours: {inks9}. The world's own colour is {ink}. {rule} White only for edges you stand on or cling to and for the hero; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""

PROP = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round white hero climbs up a narrow shaft at night.
{refnote}A prop of the world "{world}" ({mood}): {what}. It is decor behind the play: nothing stands on it and it does nothing in play. It sits {where}.
Material: {material}. Size: {size}; {grid}
Draw six different design variants of this same prop in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {scene}, the prop in its place in flat side view at game scale, and the hero for scale on a ledge near it: a soft round white blob 2 tiles across with two small black eyes.
Keep in every variant: the same size and place, a silhouette that reads at a glance on a phone screen, and nothing on the prop that looks like something to stand on: no white top edges.
Vary between the variants: the silhouette and proportions, the details that make it belong to {world}, how it is fixed to its place, and its colour accents. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes, no fine noise.
{style} Any glow is a dither too. Use only these nine colours: {inks9}. The world's own colour is {ink}. The prop's colours: {inks}. White only for the hero, the ledge's top edge and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters{text}."""
INKS9 = 'black #141414, white #f3f3f3, grey #c8c8c8, blue #5bb8ff, orange #faa23e, purple #c996ff, green #339c39, red #f43e34, yellow #ffed57'
GRID = 4   # image pixels an art pixel: a 512 x 512 cell is 8 x 8 tiles
GRIDNOTE = ('one tile is 16 art pixels, and every art pixel is an exact 4 x 4 square of image pixels on one fixed grid, so a tile is 64 x 64 image pixels '
            'and the hero, 2 tiles across, is 128 image pixels wide.')
STYLE = ('Strict style: pixel art on exactly that grid, each art pixel one flat 4 x 4 square of a single colour, edges only along the grid; no anti-aliasing, '
         'no soft or blurred edges, no gradients, no noise, no glow; shading only with the game\'s dither patterns (a checker, rows of dots, a line every other row).')
REFNOTE = ('The attached image is a real screenshot of this world in the game at this exact scale (one art pixel is 4 x 4 image pixels): copy its pixel size, its '
           'colours, its dither patterns (the wall\'s diagonal stripes, the rows of dots and lines that shade a ledge, the checker), its white top edges, the hero '
           'and its line weights. Do not copy its layout: draw the sheet described here.\n')
PAL9 = [(0xf3, 0xf3, 0xf3), (0xc8, 0xc8, 0xc8), (0x5b, 0xb8, 0xff), (0xfa, 0xa2, 0x3e), (0xc9, 0x96, 0xff), (0x33, 0x9c, 0x39), (0xf4, 0x3e, 0x34),
        (0xff, 0xed, 0x57), (0x14, 0x14, 0x14)]   # the nine inks, black last: a block split evenly goes to the colour


def prompt(el: str, ref: bool = False) -> str:
    e = ELEMENTS[el]
    name, mood, ink, taken, night = WORLDS[e['world']]
    text = f" and, on the sign, {e['text']}" if e.get('text') else ''
    slab = {'place': 'the element sticking out of that wall', 'main': ink.split()[0], 'vary': 'the silhouette and edge profile, how its free end is finished, how it is fixed '
            'to the wall, its surface pattern and joints, and the small details on it', 'rule': f'In this world {taken}, so use those only for small details.'}
    return (LEDGE if e['kind'] == 'ledge' else PROP).format(**{**slab, **e, 'world': name, 'mood': mood, 'ink': ink, 'ink_name': ink.split()[0], 'night': night, 'inks9': INKS9, 'text': text,
                                                                'grid': GRIDNOTE, 'style': STYLE, 'refnote': REFNOTE if ref else ''})


def snap(src: str, dst: str, k: int = GRID) -> None:
    """Puts a sheet onto the game's grid and its nine inks, in the game's own terms, so nothing smears: a grey pixel goes to black,
    grey or white and a coloured one to the ink nearest its hue, a tone well between two of those by the 4 x 4 ordered dither the game
    shades with (laid by art pixel); then each k x k block of image pixels becomes one art pixel, of the ink most of its pixels took."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(src).convert('RGB'), dtype=np.float32)
    h, w = a.shape[0] // k * k, a.shape[1] // k * k
    a, pal = a[:h, :w], np.array(PAL9, dtype=np.float32)
    lum = lambda c: c @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    thr = (B4[(yy // k) % 4, (xx // k) % 4] + 0.5) / 16
    L, sat = lum(a), a.max(-1) - a.min(-1)
    ramp = lambda t: np.clip((t - 0.25) / 0.5, 0, 1)   # a tone within a quarter of an ink is that ink: only the middle is dithered (no dotted flats)
    WH, GR, BL = 0, 1, 8   # PAL9's white, grey, black
    lw, lg, lb = lum(pal[WH]), lum(pal[GR]), lum(pal[BL])
    grey = np.where(L < lg, np.where(ramp((L - lb) / (lg - lb)) > thr, GR, BL), np.where(ramp((L - lg) / (lw - lg)) > thr, WH, GR))
    hues = np.arange(2, 8)   # blue, orange, purple, green, red, yellow
    ca, ch = a - a.min(-1, keepdims=True), pal[hues] - pal[hues].min(-1, keepdims=True)
    cos = (ca @ ch.T) / (np.linalg.norm(ca, axis=-1, keepdims=True) * np.linalg.norm(ch, axis=-1) + 1e-6)
    hue = hues[cos.argmax(-1)]
    colour = np.where(ramp(L / lum(pal[hue])) > thr, hue, BL)
    near = np.where(sat < 48, grey, colour)
    blocks = near.reshape(h // k, k, w // k, k).transpose(0, 2, 1, 3).reshape(h // k, w // k, k * k)
    ink = np.stack([(blocks == i).sum(-1) for i in range(len(pal))], -1).argmax(-1)
    Image.fromarray(pal[ink].astype(np.uint8).repeat(k, 0).repeat(k, 1)).save(dst)


def main() -> None:
    ap = argparse.ArgumentParser(description='Variants of one world element from OpenAI (see the top of this file).')
    ap.add_argument('element', nargs='?', default='list')
    ap.add_argument('--prompt', action='store_true', help='print the prompt and stop')
    ap.add_argument('--ref', help='the style reference (default: research/variants/ref-<world>.png)')
    ap.add_argument('--no-ref', action='store_true', help='send no reference')
    ap.add_argument('--model', default='flare', help='flare (default) or sunburst')
    a = ap.parse_args()
    if a.element == 'list':
        for el, e in ELEMENTS.items():
            print(f"{el}: {WORLDS[e['world']][0]}, {e['kind']}, {e['what']}")
        return
    el = a.element
    if el not in ELEMENTS:
        sys.exit(f'no element {el!r}; see: python3 tools/variants.py list')
    out = os.path.join(ROOT, 'research', 'variants')
    ref = None if a.no_ref else a.ref or os.path.join(out, f"ref-{ELEMENTS[el]['world']}.png")
    if ref and not os.path.exists(ref):
        if a.ref:
            sys.exit(f'no reference at {ref}')
        ref = None
    if a.prompt:
        print(prompt(el, bool(ref)))
        if ref:
            print(f'\n(attach {ref})')
        return
    env = dict(os.environ)
    if not env.get('OPENAI_API_KEY'):
        try:
            with open(os.path.expanduser('~/.claude/settings.json')) as f:
                env['OPENAI_API_KEY'] = json.load(f).get('env', {}).get('OPENAI_API_KEY', '')
        except (OSError, ValueError):
            pass
    if not env.get('OPENAI_API_KEY'):
        sys.exit('No OpenAI key: set OPENAI_API_KEY, or put it under "env" in ~/.claude/settings.json.')
    try:   # python.org's Python has no root certificates of its own (as in audio.py)
        import certifi
        env.setdefault('SSL_CERT_FILE', certifi.where())
    except ImportError:
        pass
    n = 1   # each sheet is kept: they cost money
    while os.path.exists(os.path.join(out, f'{el}-{n}.png')):
        n += 1
    cmd = ['python3', SCRIPT, prompt(el, bool(ref)), '--model', a.model, '--quality', 'medium', '--size', '1536x1024', '--out', out, '--name', f'{el}-{n}']
    rc = subprocess.run(cmd + (['--image', ref] if ref else []), env=env).returncode
    if rc:
        sys.exit(rc)
    src, dst = os.path.join(out, f'{el}-{n}.png'), os.path.join(out, f'{el}-{n}-px.png')
    snap(src, dst)
    print(dst)


if __name__ == '__main__':
    main()
