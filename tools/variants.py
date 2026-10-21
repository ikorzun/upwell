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

A boss (owner 2026-10-20: each a Japanese yokai fitting its world; three of them a sheet, two cells each: A-B, C-D, E-F) keeps its
fight, its size and its colour (BOSSES: ink), and is one soft body with a face and a few rigid parts round it, as the game draws a
boss. Its reference is its own arena without it and the hero in it, research/variants/ref-<id>.png: an element's own goes before its
world's.

    python3 tools/variants.py list              # the elements described so far
    python3 tools/variants.py <id> --prompt     # print the prompt, to paste into ChatGPT by hand (with the reference attached)
    python3 tools/variants.py <id>              # one 3 x 2 sheet of six variants, A to F: research/variants/<id>-<n>.png and -px.png
    python3 tools/variants.py <id> --model sunburst --no-ref   # the finer model; no reference

Needs OPENAI_API_KEY: from the shell, or else from "env" in ~/.claude/settings.json, where Claude Code keeps it for its own tools
only. The gpt-image skill's script makes the call.
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.expanduser('~/.claude/skills/gpt-image/scripts/gpt_image.py')

# world: (name, what it is like, its own ink, what the other inks already mean there, what is behind it all)
WORLDS = {
    'tokyo': ('Tokyo', 'a Japanese suburb at night: narrow alleys between small houses and apartment blocks, power lines, vending '
              'machines, shop signs', 'purple #c996ff', 'blue marks moving platforms and grey blocks crumble', 'the plain black night, nothing far off'),
    # (owner 2026-10-19: the Cave and the Glacier Japanese too, cute and cosy; the Glacier as on Mount Fuji)
    'cave': ('the Cave', 'a cosy Japanese cave under a little mountain shrine: soft moss, stone lanterns, small stone jizo statues, paper lanterns, bamboo, '
             'the steam of a hot spring; cute and warm, kawaii', 'grey #c8c8c8',
             'green is moss you can hold on to, purple marks springs and rubber walls, blue is ice and moving planks, orange blocks crumble',
             'the black dark of the cave, nothing far off'),
    'fuji': ('Mount Fuji', 'the slopes of Mount Fuji in winter, cosy and cute, kawaii: snow on pine trees tied up with yukitsuri ropes, stone lanterns capped '
             'with snow, kamakura snow huts lit from inside, snow monkeys in a hot spring', 'blue #5bb8ff',
             'white is ice you slip on (a whole block or wall of it), grey blocks crumble, purple marks moving planks and springs, green is moss you can hold on to',
             'the black winter night, nothing far off'),
    # (owner 2026-10-20: the Mine becomes the Japanese countryside in spring: forest, gardens, village, sakura)
    'village': ('the Village', 'the Japanese countryside in spring, cosy and cute, kawaii: a village of thatched farmhouses among rice terraces, a forest of '
                'bamboo and cedar, gardens with koi ponds and stone lanterns, sakura in full bloom', 'orange #faa23e',
                'green is moss you can hold on to, purple marks springs and rubber walls, blue is ice and moving planks, grey blocks crumble',
                'the black spring night, nothing far off'),
    # (owner 2026-10-20: the whole game in Japan; a world of rivers, the sea and an island between Fuji and Tokyo, its colour a turquoise sky blue)
    'sea': ('the Sea', 'the Japanese seaside in summer, cosy and cute, kawaii: a fishing village on an island, wooden jetties and boathouses over the water, '
            'a torii standing in the sea, rocky shores with pine trees, a river running down to the sea under an arched bridge, the lanterns of night fishing boats',
            'aqua #6fe0ee', 'white is wet rock you slip on (a whole block of it), green is seaweed you can hold on to, purple marks springs and rubber walls, '
            'orange marks boats and planks that move, grey blocks crumble', 'the black summer night by the sea, nothing far off'),
    # (owner 2026-10-20: a bonus world of scary Russian fairy tales in a dark forest, very gloomy, very dark; the hero a Kolobok there)
    'skazka': ('the Dark Forest', 'a dark forest out of scary Russian fairy tales at night, in black and white like a creepy woodcut or an ink drawing: very gloomy, very '
               'frightening, very dark; everything crooked, gnarled, twisted, leaning and uneven, as if alive: dead trees with clawing branches, roots like fingers, knots like '
               'faces, hollows with eyes glowing in them, cobwebs, a swamp, old bones and skulls, Baba Yaga\'s hut on chicken legs behind a fence of skulls whose eye sockets '
               'glow, a Russian stove; frightening, but never gory: the game is for everyone', 'grey #c8c8c8',
               'white is cobweb you can hold on to (and, as everywhere, the edges you stand on); the world is black, white and grey, and the only colours in it are the hero '
               '(an orange bun), lights (glowing eyes, candles, lit windows: orange with a yellow core), coins (yellow), danger (red) and the doors\' marks (the shop red, the '
               'stash purple)', 'the black night in a dark forest, nothing far off'),
    'blocks': ('the Tower Blocks', 'a housing estate of concrete tower blocks, a danchi, at night: raw concrete panels, balconies with bars, riser pipes, '
               'satellite dishes, stairwells', 'grey #c8c8c8', 'blue marks moving platforms and springs, orange blocks crumble, green is moss you can hold on to',
               'the black night, a regular grid of windows far off'),
    'sky': ('the Skyscraper', 'the top of a glass skyscraper among the clouds at dusk: glass facades with steel mullions, steel girders, catwalks, clouds you '
            'stand on that dissolve under you', 'purple #c996ff', 'blue marks moving platforms, springs and rubber walls, white clouds dissolve under you, '
            'green is moss you can hold on to', 'the black dusk, banks of grey cloud far off'),
    'junk': ('the Junkyard', 'a junkyard behind old brick buildings at night: heaps of scrap, wooden pallets, fire escapes zigzagging up the walls, dumpsters, '
             'bags of rubbish', 'green #339c39', 'grey is greasy steel you slip on and chain-link you hold on to, blue marks moving platforms, black rubbish '
             'bags are springs, orange blocks crumble', 'the black night, lit windows far off'),
}
LEDGE_AT = 'a purple concrete ledge with a white top edge sticking out of the wall'
CAVE_AT = 'a grey stone ledge with a white top edge sticking out of the wall'
FUJI_AT = 'a blue rock ledge with a soft cap of snow and a white top edge sticking out of the wall'
VILLAGE_AT = 'an orange earthen terrace ledge with a white top edge sticking out of the wall'
SEA_AT = 'an aqua rock ledge with a white top edge sticking out of the wall'
SKAZKA_AT = 'a grey crooked earthen ledge with a white top edge sticking out of the wall'
SAKURA = 'sakura blossom in purple, the nearest the palette has to pink (never red, never white)'
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
                       rule='In this world blue marks moving platforms and grey chequered blocks crumble, so keep the beam clearly a steel beam, and blue only for small details.'),
    'tokyo-gondola': dict(world='tokyo', kind='ledge', what="a window cleaner's gondola, a small platform hanging on two cables",
                          does='a thin platform that rides sideways along its row, from wall to wall and back, carrying you; you jump up through its floor from below and stand on it',
                          material='a steel floor with a railing round it, two cables going up out of sight', size='3 tiles long, its floor a third of a tile thick, its railing about half a tile high',
                          place='the gondola hanging on two cables in the middle of the shaft (the cables go up out of the cell)', main='blue',
                          vary='the floor and its railing (bars, mesh or panels), the cables and how they join it (a frame, pulleys, a winch), its ends and the small details on it (a bucket, a squeegee, a little motor)',
                          rule="Blue is this world's mark for what moves, so it is its main colour; grey only for the cables and small details."),
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
    'fuji-hut': dict(world='fuji', kind='prop', what='a little mountain hut (yama-goya) with a warm lit window, snow on its roof, a lantern by its door',
                     where='built against the shaft wall at the wall end of a ledge, standing on the ledge, as part of the back', material='old wooden boards, a small '
                     'paper window, a snowy roof', size='about 3 tiles wide and 2.5 tiles tall', inks='blue or grey wooden walls, a warm orange window glowing with a dither '
                     'halo, the snow on the roof grey with white glints', scene=FUJI_AT),
    'fuji-yukidaruma': dict(world='fuji', kind='prop', what='a yukidaruma, a Japanese snowman: two snowballs, a little bucket on its head, charcoal eyes, a cosy scarf',
                            where='on the top of a ledge by the wall', material='snow, a bucket, charcoal, a knitted scarf', size='about 1 tile wide and 1.5 tiles tall',
                            inks='snow in grey with white glints, an orange or blue bucket, black eyes, a green or blue scarf (never red: red is danger)', scene=FUJI_AT),
    'fuji-hoshigaki': dict(world='fuji', kind='prop', what='strings of dried persimmons (hoshigaki) hanging in rows to dry, as under the eaves of a farmhouse',
                           where='hanging from a short beam off the shaft wall', material='persimmons on strings, a wooden beam', size='three to five strings, each about '
                           '2 tiles long with six fruit', inks='orange fruit with small green or grey stalks, grey strings, a grey beam', scene=FUJI_AT + ' below them'),
    'fuji-cranes': dict(world='fuji', kind='prop', what='a pair of red-crowned cranes (tancho), elegant and cute, dancing or flying',
                        where='flying across the back of the shaft, far behind the play', material='feathers', size='each about 2 tiles wide', plane='back',
                        inks='grey bodies (white would read as the hero or an edge to stand on), black neck and wing tips, a small orange crown (never red)',
                        scene=FUJI_AT + ' lower down'),
    'fuji-far': dict(world='fuji', kind='prop', what="Mount Fuji far away: its snowy cone and a few soft clouds, seen in the far background between the shaft's walls",
                     where='far behind everything, filling the width of the shaft, low and faint, so the play reads over it', material='the mountain, snow, clouds', plane='back',
                     size='about 14 tiles wide and 6 tiles tall', inks='the mountain in a faint blue dither on the black, its snowy top grey with a few white glints, '
                     'the clouds a faint grey dither', scene=FUJI_AT + ' in front of it'),
    'village-slab': dict(world='village', kind='ledge', what='the basic ledge, a terrace of earth held up by a dry-stone wall, like a rice terrace, sticking out of the shaft wall',
                         does='solid on every side: you stand on it, cling to its sides and jump off it', material='earth with a thin fringe of grass and little flowers on top, '
                         'its face of fitted stones', size='4 tiles long and 1 tile thick', main='orange (the earth)',
                         rule='In this world green is moss you can hold on to (under a ledge or on a wall), so the grass on top is only a thin fringe; purple marks springs '
                         'and rubber walls, blue is ice and moving planks, grey blocks crumble: those only for tiny details.'),
    'village-plank': dict(world='village', kind='ledge', what='a little wooden footbridge plank: boards on two beams, perhaps a low rope rail',
                          does='a thin platform: you jump up through it from below and stand on it', material='weathered wood, rope',
                          size='4 tiles long and a third of a tile thick', place='the plank sticking out of that wall', main='orange (wood)',
                          vary='the boards and the gaps between them, the beams under it, its rail (rope, bamboo or none), how it is fixed to the wall, and the small '
                          'details on it (a hanging charm, a paper lantern)'),
    'village-yaen': dict(world='village', kind='ledge', what='a yaen, a little hand-pulled wooden box riding a cable across a river, here a moving platform',
                         does='a thin platform that rides sideways along its row, from wall to wall and back, carrying you; you jump up through its floor from below and stand on it',
                         material='a wooden box or basket with a floor, hung from pulleys on a cable that runs off to both walls', size='3 tiles long, its floor a third of a tile thick',
                         place='the yaen hanging from its cable in the middle of the shaft', main='blue', vary='the box (open, a basket, railed), how it hangs from the cable '
                         '(pulleys, a frame, ropes), its ends, and the small details on it (a rope to pull, a bell, a little flag)',
                         rule="Blue is this world's mark for what moves, so it is its main colour; the cable grey."),
    'village-bridge': dict(world='village', kind='ledge', what='an old rickety wooden bridge whose planks give way under you', does='a row of planks you stand on, '
                           'that crumble a moment after you touch them and come back a while later', material='old weathered planks, frayed ropes',
                           size='5 tiles long, a third of a tile thick', place='the bridge strung between the two walls of the shaft', main='grey',
                           vary='the planks and gaps, the ropes it hangs from, its sag, how it is tied to the walls, and the small details on it',
                           rule="Grey is this world's mark for what crumbles, so it is its main colour."),
    'village-sakura': dict(world='village', kind='prop', what='a sakura tree in full bloom, a few petals drifting down', where='on the top of a ledge at its wall end',
                           material='a dark twisted trunk, clouds of blossom', size='about 4 tiles wide and 5 tiles tall',
                           inks=SAKURA + ', a few grey petals among it, a black or orange trunk, falling petals single purple pixels', scene=VILLAGE_AT),
    'village-koinobori': dict(world='village', kind='prop', what="koinobori, carp streamers flying on a pole for Children's Day: a black, an orange and a blue carp in the wind",
                              where='on a tall pole standing on a ledge at its wall end', material='cloth carps with big round eyes, a pole with a little wheel on top',
                              size='the pole about 5 tiles tall, each carp about 2 tiles long', inks='carps in black, orange and blue with scale patterns in grey or black, '
                              'black eyes in grey rings (no white), a grey pole', scene=VILLAGE_AT),
    'village-scarecrow': dict(world='village', kind='prop', what='a kakashi, a scarecrow in a straw hat standing in a little rice paddy', where='on the top of a ledge',
                              material='straw, a cloth face, a hat, a pole, young rice', size='about 1.5 tiles wide and 2.5 tiles tall',
                              inks='orange straw, a grey cloth face drawn simply in black, a blue or purple coat, green rice shoots', scene=VILLAGE_AT),
    'village-kitsune': dict(world='village', kind='prop', what='a little Inari shrine: a small torii and two stone fox statues guarding a tiny shrine',
                            where='on the top of a ledge at its wall end', material='stone foxes, a wooden torii, a tiny wooden shrine', size='about 3 tiles wide and 2.5 tiles tall',
                            inks='grey stone foxes with orange bibs (no white), an orange torii (never red), a tiny grey shrine', scene=VILLAGE_AT),
    'village-garden': dict(world='village', kind='prop', what='a little Japanese garden: a koi pond with two koi, stepping stones and a small stone lantern',
                           where='on the top of a ledge, the pond set into it', material='water, stones, fish, a little moss', size='about 3 tiles wide and 1.5 tiles tall',
                           inks='blue water, an orange koi and a grey koi (no white), grey stones, a green tuft or two', scene=VILLAGE_AT),
    'village-house': dict(world='village', kind='prop', what='a little thatched farmhouse (gassho-zukuri) whose door is a way into a shop or a stash',
                          where='built against the shaft wall at a ledge, its door open, a noren hanging in it', material='a steep thatched roof, wooden walls, a paper window, a noren',
                          size='about 3.5 tiles wide and 3.5 tiles tall', inks='an orange thatch, grey or blue walls, a warm orange window glowing, the noren red or purple',
                          scene=VILLAGE_AT),
    'village-bamboo': dict(world='village', kind='prop', what='a bamboo forest: tall stalks in rows with their leaves, seen behind the shaft', plane='back',
                           where='far behind the play, the stalks rising up the whole height of the shaft', material='bamboo stalks with their nodes, leaves at the top',
                           size='stalks a third of a tile thick, many tiles tall', inks='green stalks and leaves, faint', scene=VILLAGE_AT + ' in front of it'),
    'village-far': dict(world='village', kind='prop', what='the countryside far away: terraced hills, a village of thatched roofs and sakura, seen far behind the shaft',
                        plane='back', where='far behind everything, low and faint, so the play reads over it', material='hills, terraces, roofs, trees',
                        size='about 14 tiles wide and 6 tiles tall', inks='a faint orange and a faint purple dither on the black', scene=VILLAGE_AT + ' in front of it'),
    'sea-slab': dict(world='sea', kind='ledge', what='the basic ledge, a ledge of sea-worn rock sticking out of the shaft wall, as on a rocky shore',
                     does='solid on every side: you stand on it, cling to its sides and jump off it', material='smooth rock worn by the sea, a little tide pool, barnacles '
                     'and limpets, a tiny crab', size='4 tiles long and 1 tile thick', main='aqua (the rock)'),
    'sea-plank': dict(world='sea', kind='ledge', what='a little wooden jetty: boards on two beams, a mooring rope tied to it', does='a thin platform: you jump up '
                      'through it from below and stand on it', material='weathered wood, rope', size='4 tiles long and a third of a tile thick',
                      place='the jetty sticking out of that wall', main='aqua (painted wood)', vary='the boards and the gaps between them, the beams and posts under '
                      'it, how it is fixed to the wall, and the small details on it (a mooring post, a coil of rope, a paper lantern, a bucket)'),
    'sea-boat': dict(world='sea', kind='ledge', what='a moving platform of the seaside', does='a thin platform that rides sideways along its row, from wall to wall '
                     'and back, carrying you; you jump up through it from below and stand on it', material='wood, rope, a shell', size='3 tiles long, its top a third '
                     'of a tile thick', place='the moving platform in the middle of the shaft', main='orange',
                     vary='what it is: A and B a little wooden boat hung from a rope across the shaft (a rope ferry), C and D a big sea turtle swimming through the '
                     'air with you on its shell (as in the tale of Urashima Taro), E and F a raft riding a thin stream of water that runs across the shaft; and the '
                     'small details on it (a lantern on a pole, an oar, a basket of fish)', rule="Orange is this world's mark for what moves, so it is its main colour."),
    'sea-raft': dict(world='sea', kind='ledge', what='a raft of old driftwood logs lashed with rope, whose logs give way under you', does='a row of logs you stand '
                     'on, that come apart a moment after you touch them and come back a while later', material='driftwood logs, frayed rope, a little seaweed',
                     size='4 tiles long and 1 tile thick', place='the raft sticking out of that wall', main='grey', vary='the logs and the gaps between them, the '
                     'rope lashings, how it is tied to the wall, and the small details on it (a float, a shell, a starfish)',
                     rule="Grey is this world's mark for what crumbles, so it is its main colour."),
    'sea-lighthouse': dict(world='sea', kind='prop', what='a little lighthouse (todai) on a rock, its lamp lit', where='on the top of a ledge at its wall end',
                           material='a round tower of painted stone, a lamp room of glass, a little gallery round it', size='about 1.5 tiles wide and 4 tiles tall',
                           inks='a tower in bands of aqua and grey (no white), the lamp lit orange with a yellow core (a light), a black door', scene=SEA_AT),
    'sea-net': dict(world='sea', kind='prop', what='fishing nets hung to dry on bamboo poles, round glass floats (ukidama) caught in them', where='on the top of a '
                    'ledge, along it', material='a net of knotted rope, bamboo poles, glass floats', size='about 4 tiles wide and 2.5 tiles tall',
                    inks='a grey net, orange poles, floats in blue, green and purple with a glint (no white)', scene=SEA_AT),
    'sea-gull': dict(world='sea', kind='prop', what='a seagull (kamome) standing on a mooring post, cute', where="on a short mooring post at a ledge's free end",
                     material='feathers, a wooden post', size='the gull about 1 tile tall, the post 1 tile tall', inks='a grey gull with black wing tips and an orange '
                     'beak and feet (no white), an orange post', scene=SEA_AT),
    'sea-octopus': dict(world='sea', kind='prop', what='octopus pots (takotsubo) stacked by the water, a little octopus peeking out of one', where='on the top of a '
                        'ledge at its wall end', material='clay pots, ropes, a soft octopus', size='about 2 tiles wide and 1.5 tiles tall',
                        inks='orange clay pots, a purple octopus with big black eyes (never red), grey ropes', scene=SEA_AT),
    'sea-flags': dict(world='sea', kind='prop', what='tairyo-bata, the bright big-catch flags of a fishing boat, flying on a pole: a fish, waves and a rising sun on '
                      'them', where="on a pole standing at a ledge's wall end", material='cloth flags, a bamboo pole', size='the pole about 4.5 tiles tall, each flag '
                      'about 2 tiles wide', inks='flags in blue, purple, orange and green with black and grey patterns, the rising sun orange (never red), a grey pole',
                      scene=SEA_AT),
    'sea-house': dict(world='sea', kind='prop', what='a funaya, a little boathouse built over the water as in Ine, whose door is a way into a shop or a stash',
                      where='built against the shaft wall at a ledge, its door open, a noren hanging in it', material='wooden walls, a tiled roof, its boat bay below at '
                      'the water, a noren', size='about 3.5 tiles wide and 3.5 tiles tall', inks='aqua and grey wooden walls, a dark grey tiled roof, a warm orange '
                      'window glowing, the noren red or purple', scene=SEA_AT),
    'sea-wave': dict(world='sea', kind='prop', what="the Great Wave far away, as in Hokusai's print: a big curling wave with claws of foam, a tiny Fuji under it",
                     plane='back', where='far behind everything, low and faint, so the play reads over it', material='water, foam', size='about 10 tiles wide and '
                     '6 tiles tall', inks='the wave a faint aqua dither on the black, its foam a faint grey (no white)', scene=SEA_AT + ' in front of it'),
    'sea-far': dict(world='sea', kind='prop', what='the sea far away: islands with pines on them, a torii standing in the water, a river running into the sea '
                    'under an arched bridge, the lights of night fishing boats', plane='back', where='far behind everything, low and faint, so the play reads over it',
                    material='water, islands, pines, a torii, a bridge, boats', size='about 14 tiles wide and 6 tiles tall', inks='a faint aqua and a faint orange '
                    'dither on the black (no white)', scene=SEA_AT + ' in front of it'),
    # The Dark Forest (owner 2026-10-20): a whole bonus world in black and white, crooked and creepy (the first sheets, in colour and too tidy, were not picked)
    'skazka-slab': dict(world='skazka', kind='ledge', what='the basic ledge, a crooked ledge of black forest earth clawed together by roots, sticking out of the shaft wall',
                        does='solid on every side: you stand on it, cling to its sides and jump off it', material='earth, roots twisted like fingers clawing under it, an old bone '
                        'or a skull half buried in it, a hollow with a pair of eyes glowing in it', size='4 tiles long and 1 tile thick', main='grey (the earth, in black dither)',
                        rule='It is black, white and grey; the only colour on it may be a pair of eyes glowing in a hollow (orange with a yellow core).',
                        vary='its crooked silhouette and jagged underside, how the roots claw and twist under it, how it is fixed to the wall, and the creepy details on it (a '
                        'skull, bones, a knot like a face, eyes glowing in a hollow, a grey toadstool)'),
    'skazka-plank': dict(world='skazka', kind='ledge', what='a gnarled dead branch growing out of the shaft wall, twisted, its twigs like clawing fingers',
                         does='a thin platform: you jump up through it from below and stand on it', material='dead wood, bark, thorns, a cobweb', size='4 tiles long and a '
                         'third of a tile thick', place='the branch growing out of that wall', main='grey (dead wood)', rule='It is black, white and grey.',
                         vary='how crooked and knotted it is, its twigs like claws, its thorns, how it grows out of the wall, and the creepy details on it (a cobweb, a bast '
                         'shoe hanging off it, a bundle of dried herbs, a bone charm on a string, a knot like an eye)'),
    'skazka-mortar': dict(world='skazka', kind='ledge', what="Baba Yaga's mortar (stupa), crooked and cracked, flying through the air", does='a thin platform that rides '
                          'sideways along its row, from wall to wall and back, carrying you; you jump up through it from below and stand on its rim',
                          material='an old wooden mortar bound with rusty iron hoops, a pestle, a broom of twigs', size='3 tiles long, its rim a third of a tile thick, the '
                          'mortar hanging under the rim', place='the moving platform in the middle of the shaft', main='black with a grey rim (a dark silhouette)',
                          rule='It is black, white and grey; colour only for a light (a candle) or eyes (a black cat\'s, glowing).',
                          vary='how it flies: A and B a wide crooked mortar with the pestle stuck in it, C and D a tall cracked one sweeping a broom of twigs behind it with '
                          'a trail of grey sparks, E and F one riding a cloud of grey smoke; its hoops and cracks, and the small details on it (a lit candle, a bundle of '
                          'herbs, a black cat peeking over the rim with glowing eyes)'),
    'skazka-log': dict(world='skazka', kind='ledge', what='a rotten log, crooked and hollow, a face in its knots, whose wood gives way under you', does='a row of rotten '
                       'wood you stand on, that falls apart a moment after you touch it and comes back a while later', material='rotten bark, woodworm holes, grey toadstools, '
                       'a hollow', size='4 tiles long and 1 tile thick', place='the log sticking out of that wall', main='grey (rotten wood, in heavy black dither)',
                       rule='It is black, white and grey; colour only for eyes glowing in its hollow.',
                       vary='the cracks and gaps that show where it will break, its rot, the face its knots and holes make, how it is fixed to the wall, and the small '
                       'creepy details on it (toadstools, a beetle, a snail, a cobweb, eyes in the hollow)'),
    'skazka-fence': dict(world='skazka', kind='prop', what="a stretch of Baba Yaga's fence: crooked sharpened stakes leaning every way, a skull on each, their eye sockets "
                         'glowing', where='on the top of a ledge at its wall end', material='old crooked stakes bound with rope, bone skulls', size='about 3 tiles wide and '
                         '2.5 tiles tall', inks='grey stakes and grey bone skulls (no white), their eye sockets glowing orange with a yellow core: they are the lights of the '
                         'dark', scene=SKAZKA_AT),
    'skazka-izba': dict(world='skazka', kind='prop', what="Baba Yaga's hut on chicken legs (izbushka), crooked, sagging and leaning, whose door is a way into a shop",
                        where='standing on a ledge against the shaft wall, its door open', material='a log cabin with a sagging mossy roof, crooked carved window frames, '
                        'two big scaly chicken legs under it', size='about 3.5 tiles wide and 4 tiles tall, legs included', inks='grey and black logs, a black sagging roof, '
                        'a dim orange window (a light), the open door dark with a red cloth hung in it (red is the shop\'s mark), grey chicken legs with black claws',
                        scene=SKAZKA_AT),
    'skazka-stove': dict(world='skazka', kind='prop', what='a big old Russian stove (pech), crooked, cracked and sooty, its mouth open like a maw: the way into a stash',
                         where='standing on a ledge against the shaft wall', material='cracked whitewashed brick, a crooked chimney, the round-topped mouth, clay pots and a '
                         'poker beside it', size='about 3 tiles wide and 3.5 tiles tall', inks='a grey stove (no white), black soot and cracks, its mouth glowing purple '
                         'inside (purple is the stash\'s mark) with a few orange embers', scene=SKAZKA_AT),
    'skazka-far': dict(world='skazka', kind='prop', what='the dark forest far away: the jagged crooked tops of black spruces and dead trees with clawing branches against a '
                       'huge moon, an owl, Baba Yaga flying across the moon in her mortar, mist over a swamp', plane='back', where='far behind everything, low and faint, so '
                       'the play reads over it', material='spruces, dead trees, the moon, mist', size='about 14 tiles wide and 6 tiles tall', inks='a faint grey dither on '
                       'the black, the moon a soft grey (no white)', scene=SKAZKA_AT + ' in front of it'),
    # The Dark Forest's enemies (owner, 2026-10-20, through Worlds: «делай врагов кикимору и лешего в чате боссов»), six takes on each
    'skazka-kikimora': dict(world='skazka', kind='foe', what='Kikimora, the swamp and house spirit of Russian tales: a small crooked hunched creature, '
                            'a hag of the marsh with wild tangled hair like swamp weed, a long beak of a nose, long thin arms with long bony fingers',
                            does='a climber: it clings to the shaft wall and creeps up and down it after the hero, and the hero stomps it from above.',
                            size='about 2 tiles across', place='the creature clinging to that wall on all fours', main='grey #c8c8c8',
                            parts='its tangled hair, its long arms and fingers, and maybe a spindle, a distaff or a cooking pot',
                            vary='its hair and how it hangs, its face and nose, its rags or clothes, what it holds, how it clings to the wall'),
    'skazka-leshy': dict(world='skazka', kind='foe', what='Leshy, the master of the forest in Russian tales who leads travellers astray: a shaggy figure '
                         'of bark and moss, a long beard of grass and twigs, a head like an old stump with branches for horns',
                         does='a circler: it floats round and round a ring in the air between the ledges, and the hero stomps it from above.',
                         size='about 2 tiles across', place='the creature floating in the air between two ledges, a faint ring of its path behind it',
                         main='grey #c8c8c8', parts='its branching horns, its beard of grass and twigs, its long arms like boughs',
                         vary='its horns or antlers, its beard, its bark and moss, its face, its arms, what grows on it (mushrooms, leaves, a bird\'s nest)'),
    'skazka-kolobok': dict(world='skazka', kind='hero', what='Kolobok, the round bun of the Russian tale who ran away from the old man and the old woman',
                           size='2 tiles across', main='orange (a baked crust)', scene=SKAZKA_AT,
                           vary='the crust (its shading, a shine of glaze, cracks, a dusting of flour, a darker baked bottom) and the face (the eyes, the brows, a '
                           'cheeky grin, a sly smile, a scared look, rosy cheeks in orange); nothing on it but the bun itself: no hat, no arms, no legs'),
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

# A boss: its fight (does), its size, where the cell shows it (place), its colour (main: BOSSES' ink), the rigid parts it may have,
# the three yokai of its world it may be (two cells each) and the inks' rule there.
RIDE = ('it rides a rail under the ceiling from wall to wall, stops at each end with a creak and tips rocks down, and lobs blobs at the hero below; '
        "it can be hurt only from above, by dropping onto its top from the moss under the ceiling over the rail's ends.")
DIVE = ('it hovers high in the middle of the shaft{how}, swaying, dropping goo and calling small crawlers; then it shakes over the hero, {drops} straight '
        'down into the middle of the floor and lies there dazed a moment: a stomp from above hurts it then; then it {up}.')
SLIDE = ('it slides to and fro over the floor flicking out little shells, backs off flashing and dashes from wall to wall, and its crash shakes {down} '
         'down from the ceiling; its top is hard, a stomp only bounces off it. A shell kicked into it turns it onto its back: then a stomp on its belly hurts it.')
ELEMENTS.update({
    'boss-tram': dict(world='tokyo', kind='boss', what='the Tram, the boss of Tokyo (c1-10)', does=RIDE, size='about 4.4 tiles across, the car round it about 5.5 tiles long',
                      place='under the ceiling: a rail across the shaft with small ties, a green moss ledge under the ceiling over each end of the rail, an overhead wire, '
                      'the hero far below on the floor', main='green', parts='its wheels on the rail, the car or cart round it, a pantograph, horns or flames, as its yokai has them',
                      yokai='A and B: Oboroguruma, a haunted ox-cart of misty nights with a huge grumpy face filling its front; C and D: Kasha, a fire-cat demon riding a '
                      'burning cart; E and F: a tsukumogami tram, an old streetcar that came alive after a hundred years, its headlights its eyes.',
                      rule='In this world purple is the town, blue marks moving platforms and grey blocks crumble: those only for small details; the boss is green all '
                      'over, its flames orange, never red.'),
    'boss-cork': dict(world='cave', kind='boss', what='the Cork, the boss of the Cave (c2-10)', does=DIVE.format(how='', drops='dives', up='rises again'), size='about 4.2 tiles across',
                      place='hovering in the middle of the shaft, a thin plank below it at each side (none in the middle, where it dives), moss on the walls, the hero on '
                      'the floor below', main='orange', parts='a thread it hangs from, a lantern frame, a few short legs, a tail or ears, as its yokai has them',
                      yokai='A and B: Chochin-obake, a paper lantern ghost with one big eye and a long tongue; C and D: Tsuchigumo, the earth spider of caves, a round body '
                      'on its thread with a few short legs; E and F: Nurikabe, a floating wall spirit that blocks the way, a soft slab with stubby arms.',
                      rule='In this world green is moss you can hold on to and purple marks springs: those only for small details; the boss is orange all over.'),
    'boss-puck': dict(world='fuji', kind='boss', what='the Puck, the boss of Mount Fuji (c3-10)', does=SLIDE.format(down='icicles'), size='about 4.8 tiles across and 3 tiles tall, low and wide',
                      place='on a floor of ice along the bottom of the cell (white, a blue dither under it), icicles hanging from the ceiling, a little shell on the ice beside '
                      'it, the hero on the ice near the other wall', main='grey', parts='a shell on its back, a dish on its head, short legs or flippers, a hood of ice, as its yokai has them',
                      yokai='A and B: a Kappa on the frozen lake, a turtle shell on its back and the dish of water on its head; C and D: Umibozu, a huge round sea-monk head '
                      'risen from the lake, sliding on the ice; E and F: Tsurara-onna, an icicle spirit in a round frozen hood, icicles hanging off its rim.',
                      rule='In this world white is the ice you slip on and purple marks moving planks and springs: no white on the boss but tiny glints, purple only for small '
                      'details; the boss is grey all over.'),
    'boss-cart': dict(world='village', kind='boss', what='the Minecart, the boss of the Village (c4-10)', does=RIDE, size='about 4.4 tiles across, its cart in front of it',
                      place='under the ceiling: a rail across the shaft with small ties, a green moss ledge under the ceiling over each end of the rail, the hero far below on the floor',
                      main='blue', parts='its wheels on the rail, the cart or wheel it rides, flames or tails, as its yokai has them',
                      yokai='A and B: Wanyudo, a burning ox-cart wheel with a big angry face in its hub; C and D: a Nogitsune, a wild fox spirit that tricks travellers (the bad '
                      'cousin of the Inari shrine foxes), riding a little wooden cart, its tails swishing; E and F: a Bake-danuki, a shape-shifting raccoon-dog trickster in a '
                      'rice cart, its round belly its body.',
                      rule='In this world green is moss you can hold on to, purple marks springs and grey blocks crumble: those only for small details; blue marks moving '
                      'planks, but the boss is blue all over and rides the rail; its flames orange, never red.'),
    'boss-crane': dict(world='blocks', kind='boss', what='the Crane, the boss of the Tower Blocks (c5-10)', size='about 4.2 tiles across',
                       does=DIVE.format(how=" on a crane's cable that goes up out of sight", drops='drops on its cable', up='is hauled back up'),
                       place="hanging on its cable in the middle of the shaft, a thin balcony ledge below it at each side (none in the middle), the hero on the floor below",
                       main='orange', parts='the cable and the hook it hangs from, a rope sling or a chain, arms or a bucket, as its yokai has them',
                       yokai="A and B: Tsurube-otoshi, a giant grinning head that drops from above on passers-by, here off the crane's hook; C and D: Okubi, a huge floating "
                       'head over the rooftops at night; E and F: Nuppeppo, a wobbly lump of a yokai with folds for a face, slung under the hook.',
                       rule='In this world blue marks moving platforms and springs and green is moss you can hold on to: those only for small details; the boss is orange all over.'),
    'boss-pigeon': dict(world='sky', kind='boss', what='the Pigeon, the boss of the Skyscraper (c6-10)', size='about 4.2 tiles across, its wings about as wide again',
                        does=DIVE.format(how=', flapping', drops='dives', up='flies up again'),
                        place='hovering in the middle of the shaft, a thin steel girder below it at each side (none in the middle), banks of cloud far off, the hero on the floor below',
                        main='grey', parts='wings, a beak, a little hat or a fan, tail feathers, a few blue sparks, as its yokai has them',
                        yokai='A and B: a Karasu-tengu, the crow goblin of high places, a beak and black-tipped wings; C and D: Ittan-momen, a long strip of flying cloth that '
                        'wraps round its prey, its loose ends flapping like wings; E and F: Raiju, the thunder beast that falls from storm clouds, a round furry body crackling with blue sparks.',
                        rule='In this world blue marks moving platforms and springs and white is the clouds that dissolve under you: blue only for small details (the sparks), '
                        'white only for tiny glints; the boss is grey all over.'),
    'boss-rat': dict(world='junk', kind='boss', what='the Rat King, the boss of the Junkyard (c7-10)', does=SLIDE.format(down='junk'), size='about 4.8 tiles across and 3 tiles tall, low and wide',
                     place='on a floor of greasy steel along the bottom of the cell, junk hanging from the ceiling, a little shell beside it, the hero near the other wall',
                     main='purple', parts='round ears, a long tail, a crown or a lid on its back, little feet, a handle, as its yokai has them',
                     yokai='A and B: Tesso, the iron rat, a giant rat with an iron hide and a crown of scrap; C and D: Kasa-obake, an old paper umbrella come alive, one big '
                     'eye and a long tongue, its canopy a hard dome; E and F: a tsukumogami heap, things thrown away (a kettle, a sandal, a lantern) come alive as one creature under a lid.',
                     rule='In this world grey is greasy steel you slip on and chain-link you hold on to, blue marks moving platforms, black bags are springs and orange '
                     'blocks crumble: those only for small details; the boss is purple all over.'),
    # (owner 2026-10-21: «начинай босса Моря»; the Rat King's slide holds its tier for now, and every boss is at least twice the hero: «минимум 2 к 1»)
    'boss-sea': dict(world='sea', kind='boss', what='the boss of the Sea (c4-10), a yokai of the sea or the river', does=SLIDE.format(down='loose stones'),
                     size='about 6 tiles across and 4 tiles tall, low and wide: three times the hero across and twice his height',
                     place='on a floor of white wet rock along the bottom of the cell (an aqua dither under it), a few loose stones hanging from the ceiling, '
                     'a little shell on the rock beside it, the hero near the other wall', main='orange',
                     parts='claws and legs, whiskers and fins, the stone or the shell on its back, the dish of water on its head, as its yokai has them',
                     yokai='A and B: a Heikegani, the Heike crab, a big crab whose shell bears the angry face of a samurai, scuttling sideways on its legs, its two big '
                     'claws up; C and D: Onamazu, the giant catfish whose thrashing shakes the earth, long and low, long whiskers, the gods\' great stone (kaname-ishi) '
                     'pressed on its back; E and F: a Kappa of the river mouth, a river imp with a turtle shell on its back, the dish of water on its head, a beak and webbed hands.',
                     rule='In this world white is wet rock you slip on, green is seaweed you hold on to, purple marks springs and grey blocks crumble: those only for small '
                     'details; orange marks boats and moving planks, but the boss is orange all over; aqua is the world\'s own, the sea and its rocks, never the boss.'),
})

LEDGE = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}One element of the world "{world}" ({mood}): {what}. It is in the foreground, the play itself: full colour.
In play: {does}. Material: {material}. Size: {size}; {grid}
Draw six different design variants of this same element in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {place} in flat side view at game scale, and the hero standing on it for scale: {hero_scale}.
Keep in every variant: the same size, the same job in play, a white top edge to stand on, {main} as its main colour.
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. {rule} White only for edges you stand on or cling to and for the hero; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""

PROP = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}A prop of the world "{world}" ({mood}): {what}. It is decor behind the play: nothing stands on it and it does nothing in play. It sits {where}. {plane}
Material: {material}. Size: {size}; {grid}
Draw six different design variants of this same prop in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {scene}, the prop in its place in flat side view at game scale, and the hero for scale on a ledge near it: {hero_scale}.
Keep in every variant: the same size and place, a silhouette that reads at a glance on a phone screen, and nothing on the prop that looks like something to stand on: no white top edges.
Vary between the variants: the silhouette and proportions, the details that make it belong to {world}, how it is fixed to its place, and its colour accents. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes, no fine noise.
{style} Any glow is a dither too. Use only these colours: {inks9}. The world's own colour is {ink}. The prop's colours: {inks}. White only for the hero, the ledge's top edge and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters{text}."""
BOSS = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round white hero climbs up a narrow shaft at night.
{refnote}The boss of the world "{world}" ({mood}), drawn as a Japanese yokai that belongs in this place. It is in the foreground, the play itself: full colour.
Its fight: {does} Its size: {size}; {grid}
Draw six variants in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner: three different yokai, two takes on each. {yokai} Each pair is a different creature, and none is a plain round blob: each reads at a glance as its yokai.
Each cell is a scene from the fight: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {place}, the boss in flat side view at game scale, and the hero for scale: a soft round white blob 2 tiles across with two small black eyes.
Keep in every variant: the same size and the same fight, {main} as its main colour, a face that reads at a glance on a phone (big eyes, an angry brow, a mouth), and a body that is one soft rounded shape (in the game it squashes and wobbles) with a few rigid parts round it: {parts}. Cute and a little spooky, never gory: the game is for everyone.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. {rule} White only for the hero, the edges you stand on and tiny glints; red only for danger: the boss flashes red when it is hit, so it is never red itself; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
HERO = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round hero climbs up a narrow shaft at night.
{refnote}In the world "{world}" ({mood}) the hero turns into {what}. It is the hero, the play itself: full colour, the clearest thing on the screen.
In play: a soft round body that squashes when it lands, stretches when it jumps and wobbles; it always faces the player. Size: {size}; {grid}
Draw six different design variants of this same hero in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {scene}, the hero standing on it in flat front view at game scale, and beside it a second copy of the same hero squashed wide as it lands.
Keep in every variant: the round soft silhouette 2 tiles across, {main} as its main colour, a white rim round it so it reads on the dark (white is the hero's mark), a face that reads at a glance on a phone.
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. Red only for danger, so on the hero at most a tiny tongue; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
FOE = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: a small round hero climbs up a narrow shaft at night.
{refnote}An enemy of the world "{world}" ({mood}): {what}. It is in the foreground, the play itself.
What it does in play: {does} Its size: {size}; {grid}
Draw six different design variants of this same creature in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner. Vary between the variants: {vary}. Make the six clearly different from each other.
Each cell is a scene from the game: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {place}, the enemy in flat side view at game scale, and the hero for scale: {hero_scale}.
Keep in every variant: the same size and the same way of moving, {main} as its main colour, eyes that glow as two small lights in the dark (in this dark world they are what the eye finds first), and a body that is one soft shape (in the game it squashes and wobbles) with a few rigid parts round it: {parts}. Creepy and crooked, never gory: the game is for everyone.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. {rule} White only for the hero, the edges you stand on and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
# The hero as the sheets draw it, by world (the Dark Forest's a Kolobok, owner 2026-10-20): the opening line's, the scale figure's.
HEROES = {'skazka': ('a small round hero (here Kolobok, the runaway bun of the Russian tale)', 'Kolobok, a soft round orange bun 2 tiles across with a white rim, '
                     'two small black eyes and a smile')}
HERO_PLAIN = ('a small round white hero', 'a soft round white blob 2 tiles across with two small black eyes')
# The camera's depth (owner 2026-10-19; the game's DEPTH): the play in full colour; the midground (props on or off the play) solid but with no white and no
# yellow except a light's own core; the background (behind the shaft) at a quarter of one ink over the black, no white, the least detail.
PLANES = {'mid': 'It is in the midground, standing on or hanging off the play: solid colours, but no white and no yellow except the core of a light (a lamp\'s glass, '
                 'a candle\'s flame).',
          'back': 'It is in the background, behind the shaft: draw it in one colour at about a quarter of its strength over the black (a dark, dim tone of it), '
                  'no white, the least detail, so the play reads over it.'}
INKS9 = 'black #141414, white #f3f3f3, grey #c8c8c8, blue #5bb8ff, orange #faa23e, purple #c996ff, green #339c39, red #f43e34, yellow #ffed57, aqua #6fe0ee'   # (aqua: the sea's, owner 2026-10-20)
WORLD_INKS = {'skazka': 'black #141414, white #f3f3f3, grey #c8c8c8; and only where this world allows colour (the hero, lights, coins, danger, the doors\' marks): '
                         'orange #faa23e, yellow #ffed57, red #f43e34, purple #c996ff'}   # (owner 2026-10-20: the Dark Forest in black and white)
GRID = 4   # image pixels an art pixel: a 512 x 512 cell is 8 x 8 tiles
GRIDNOTE = ('one tile is 16 art pixels, and every art pixel is an exact 4 x 4 square of image pixels on one fixed grid, so a tile is 64 x 64 image pixels '
            'and the hero, 2 tiles across, is 128 image pixels wide.')
STYLE = ('Strict style: pixel art on exactly that grid, each art pixel one flat 4 x 4 square of a single colour, edges only along the grid; no anti-aliasing, '
         'no soft or blurred edges, no gradients, no noise, no glow; shading only with the game\'s dither patterns (a checker, rows of dots, a line every other row).')
REFNOTE = ('The attached image is a real screenshot of this world in the game at this exact scale (one art pixel is 4 x 4 image pixels): copy its pixel size, its '
           'colours, its dither patterns (the wall\'s diagonal stripes, the rows of dots and lines that shade a ledge, the checker), its white top edges, the hero '
           'and its line weights. Do not copy its layout: draw the sheet described here.\n')
PAL9 = [(0xf3, 0xf3, 0xf3), (0xc8, 0xc8, 0xc8), (0x5b, 0xb8, 0xff), (0xfa, 0xa2, 0x3e), (0xc9, 0x96, 0xff), (0x33, 0x9c, 0x39), (0xf4, 0x3e, 0x34),
        (0xff, 0xed, 0x57), (0x6f, 0xe0, 0xee), (0x14, 0x14, 0x14)]   # the ten inks (aqua the sea's), black last: a block split evenly goes to the colour


def prompt(el: str, ref: bool = False) -> str:
    e = ELEMENTS[el]
    name, mood, ink, taken, night = WORLDS[e['world']]
    text = f" and, on the sign, {e['text']}" if e.get('text') else ''
    slab = {'place': 'the element sticking out of that wall', 'main': ink.split()[0], 'vary': 'the silhouette and edge profile, how its free end is finished, how it is fixed '
            'to the wall, its surface pattern and joints, and the small details on it', 'rule': f'In this world {taken}, so use those only for small details.'}
    plane = PLANES[e.get('plane', 'mid')]
    hero_short, hero_scale = HEROES.get(e['world'], HERO_PLAIN)
    out = {'ledge': LEDGE, 'prop': PROP, 'boss': BOSS, 'hero': HERO, 'foe': FOE}[e['kind']].format(**{**slab, **e, 'hero_short': hero_short, 'hero_scale': hero_scale, 'world': name, 'mood': mood, 'ink': ink, 'ink_name': ink.split()[0], 'night': night, 'inks9': WORLD_INKS.get(e['world'], INKS9), 'text': text, 'plane': plane,
                                                                'grid': GRIDNOTE, 'style': STYLE, 'refnote': REFNOTE if ref else ''})
    if e['world'] in SHAPES:   # a world drawn crooked (the Dark Forest): its shapes slanted and jagged, not built of tidy rectangles
        out = re.sub(r'Build every variant from flat rectangles and a few circles: big simple shapes[^.]*\.', SHAPES[e['world']], out)
    return out


SHAPES = {'skazka': 'Build every variant from big simple shapes that read at a glance on a phone screen, but crooked: slanted, jagged, bent and leaning, never straight '
                    'and tidy, as if the forest were alive; no fine noise.'}


def snap_back(src: str, dst: str, k: int = GRID) -> None:
    """A background sheet onto the grid and the game's tones: each pixel to the nearest of the black, the eight inks and their dim tones (DEPTH.back: a
    quarter of the way from the black), each k x k block to the tone most of its pixels took. The plain snap would put the dim plane all to the black;
    the hero and the ledge keep their full inks."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(src).convert('RGB'), dtype=np.float32)
    h, w = a.shape[0] // k * k, a.shape[1] // k * k
    a, black = a[:h, :w], np.array(PAL9[-1], dtype=np.float32)
    pal = np.array(PAL9 + [black + 0.25 * (np.array(c, dtype=np.float32) - black) for c in PAL9[:-1]], dtype=np.float32)
    near = sum((a[..., c, None] - pal[:, c]) ** 2 for c in range(3)).argmin(-1)
    blocks = near.reshape(h // k, k, w // k, k).transpose(0, 2, 1, 3).reshape(h // k, w // k, k * k)
    ink = np.stack([(blocks == i).sum(-1) for i in range(len(pal))], -1).argmax(-1)
    Image.fromarray(pal[ink].astype(np.uint8).repeat(k, 0).repeat(k, 1)).save(dst)


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
    WH, GR, BL = 0, 1, 9   # PAL9's white, grey, black
    lw, lg, lb = lum(pal[WH]), lum(pal[GR]), lum(pal[BL])
    grey = np.where(L < lg, np.where(ramp((L - lb) / (lg - lb)) > thr, GR, BL), np.where(ramp((L - lg) / (lw - lg)) > thr, WH, GR))
    hues = np.arange(2, 9)   # blue, orange, purple, green, red, yellow, aqua
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
    ref = None if a.no_ref else a.ref or next((r for r in (os.path.join(out, f'ref-{el}.png'), os.path.join(out, f"ref-{ELEMENTS[el]['world']}.png")) if os.path.exists(r)), None)   # its own, else its world's
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
    (snap_back if ELEMENTS[el].get('plane') == 'back' else snap)(src, dst)
    print(dst)


if __name__ == '__main__':
    main()
