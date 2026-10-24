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
    # (owner 2026-10-21: the Cave becomes the dark Mine, «мир темной пещеры, рудников японии», really dark; the shrine's things all replaced)
    'mine': ('the Mine', 'an old Japanese mine deep inside a mountain, in the dark of its tunnels, cosy and a little eerie, kawaii: tunnels shored up with '
             'timber frames, rails for little mine carts, the miners\' oil lamps (kantera) hung on hooks, veins of silver ore glinting in the rock, wooden ladders '
             'and hand winches, straw baskets and pickaxes, bats asleep; as the old silver mine of Iwami Ginzan', 'grey #c8c8c8',
             'green is moss you can hold on to, purple marks springs and rubber walls, blue is ice and moving planks, orange blocks crumble',
             'the black dark of the mine, nothing far off'),
    # (owner 2026-10-21: worlds 6 and 7 Japanese: «Данчи», «Телебашня»)
    'danchi': ('the Danchi', 'a Japanese danchi at night, a big public housing estate of 1960s concrete blocks, cosy and a little lonely, kawaii: rows of '
               'identical balconies with futons and laundry hung over their rails, air conditioner units, outdoor stairwells, mamachari bicycles, potted plants '
               'and styrofoam-box vegetable gardens, banks of mailboxes, the building numbers painted big on the end walls, a playground with a panda spring rider, '
               'stray cats', 'grey #c8c8c8', 'blue marks springs and moving platforms, orange blocks crumble, green is moss you can hold on to',
               'the black night, rows of lit windows far off'),
    'maekawa': ('the Danchi in Maekawa\'s concrete', 'a Japanese housing estate at night built the way the architect Kunio Maekawa built (Tokyo Bunka Kaikan, 1961; '
                'Fukuoka Art Museum, 1979): massive concrete roofs with deep overhangs, heavy sculptural eaves, walls faced with ceramic tiles cast into the concrete; '
                'cosy and a little lonely, kawaii life on it: laundry and futons over balconies, mamachari bicycles, potted plants, mailboxes, stray cats',
                'grey #c8c8c8', 'blue marks springs and moving platforms, orange blocks crumble, green is moss you can hold on to', 'the black night, a few lit windows far off'),
    'isozaki': ('the Danchi in Isozaki\'s concrete', 'a Japanese housing estate at night built the way the architect Arata Isozaki built (Oita Prefectural '
                'Library, 1966: a frame of huge hollow concrete beams whose cut square ends stick out open; Gunma Museum of Modern Art, 1974: open cubic frames; '
                'Kitakyushu Central Library, 1974: long barrel vaults): raw board-formed concrete, box beams cut off square and left open, ducts and pipes; cosy '
                'and a little lonely, kawaii life on it: laundry and futons over balconies, mamachari bicycles, potted plants, mailboxes, stray cats',
                'grey #c8c8c8', 'blue marks springs and moving platforms, orange blocks crumble, green is moss you can hold on to', 'the black night, a few lit windows far off'),
    'tower': ('the Tower', 'a Japanese TV tower at dusk like Tokyo Tower: a steel lattice of trusses and girders painted international orange and grey, maintenance '
              'catwalks, antennas and broadcast dishes, an observation deck with coin binoculars and a souvenir shop, the tower\'s own little shrine, crows '
              'resting on the girders, Japanese clouds in the style of old prints drifting through it', 'purple #c996ff',
              'blue marks moving platforms, springs and rubber walls, white clouds dissolve under you, green is moss you can hold on to',
              'the purple dusk, the city far below'),
    'fuji': ('Mount Fuji', 'the slopes of Mount Fuji in winter, cosy and cute, kawaii, and true to the real mountain: dark volcanic rock and '
             'scoria under snow, dry-stone walls along the trail, mountain huts with stones on their roofs and corrugated iron walls, shut for the winter, wooden '
             'station posts, the stone monuments of the Fuji-ko pilgrims, bare larches bent by the wind at the tree line; no green leaves and no fire anywhere', 'blue #5bb8ff',
             'white is ice you slip on (a whole block or wall of it), grey blocks crumble, a grey fringe of rime under a ledge is what you hold on to, purple marks '
             'moving planks and springs', 'the black winter night, nothing far off'),
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
MINE_AT = 'a grey rock ledge shored up with old timber, with a white top edge, sticking out of the wall'
DANCHI_AT = 'a grey concrete ledge with a white top edge sticking out of the wall'
MK_AT = 'a grey concrete ledge with a white top edge under a deep concrete eave, sticking out of a tile-faced wall'
ISO_AT = 'a grey concrete ledge with a white top edge, a hollow concrete box beam whose square cut end is open, sticking out of a board-formed concrete wall'
TOWER_AT = 'a steel girder ledge, orange and grey, with a white top edge, sticking out of the wall'
DANCHI_INKS = 'In this world blue marks springs and moving platforms, orange blocks crumble and green is moss you can hold on to, so those only for tiny details; never yellow (the coins\' colour) and never red (danger).'
TOWER_INKS = 'In this world blue marks moving platforms, springs and rubber walls, white clouds dissolve under you and green is moss you can hold on to, so those only for tiny details; the tower\'s steel is international orange and grey (never red: red is danger), and never yellow (the coins\' colour).'
MINE_INKS = 'In this world green is moss you can hold on to, purple marks springs and rubber walls, blue is ice and moving planks and orange blocks crumble, so those only for tiny details; never yellow (the coins\' colour) and never red (danger).'
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
    # The Mine (owner 2026-10-21: «Заменить всё»; ledges, lights, things, the far layer and doors), six takes on each
    'mine-slab': dict(world='mine', kind='ledge', what='the basic ledge, a ledge of rough rock shored up with old timber, sticking out of the shaft wall',
                      does='solid on every side: you stand on it, cling to its sides and jump off it', material='rough rock, an old timber beam or brace holding it, '
                      'iron cramps and nails', size='4 tiles long and 1 tile thick', main='grey (the rock)', rule=MINE_INKS,
                      vary='its rock silhouette and underside, how the timber holds it (a beam under it, a knee brace to the wall, a post going down), and the small '
                      'details on it (a rope, an empty lamp hook, a chalk mark, a pickaxe stuck in it, a trickle of dust)'),
    'mine-plank': dict(world='mine', kind='ledge', what="a scaffold board of the mine: a few weathered planks on two short beams, a walkway sticking out of the wall",
                       does='a thin platform: you jump up through it from below and stand on it', material='old wooden boards, nails, rope or chain',
                       size='4 tiles long and a third of a tile thick', place='the board sticking out of that wall', main='grey (weathered wood)', rule=MINE_INKS,
                       vary='the boards (two or three, gaps between them), the beams under them, how it is fixed to the wall (brackets, ropes or chains up to the wall) '
                       'and the small details on it (a hanging bucket, an empty lamp hook, a coil of rope)'),
    'mine-mover': dict(world='mine', kind='ledge', what='a moving platform of the mine', does='a thin platform that rides sideways along its row, from wall to wall '
                       'and back, carrying you; you jump up through it from below and stand on its top', material='wood and iron, a cable with a pulley or a rail',
                       size='3 tiles long, its top a third of a tile thick', place='the moving platform in the middle of the shaft', main='blue (moving planks are blue '
                       'in this world)', rule=MINE_INKS.replace('blue is ice and moving planks and ', ''),
                       vary='how it moves: A and B an ore bucket hanging from a cable on a pulley, its rim the top, C and D a little mine cart riding a thin rail across '
                       'the shaft, E and F a wooden cage lift hanging from a rope; its frame, wheels or pulley, and small details (a lump of ore, a lamp, a rope)'),
    'mine-crumble': dict(world='mine', kind='ledge', what='a ledge of loose rubble and broken ore held up by rotten boards, whose stones give way under you',
                         does='a row you stand on that falls apart a moment after you touch it and comes back a while later', material='loose rocks, cracked rotten boards, dust',
                         size='4 tiles long and 1 tile thick', place='the rubble sticking out of that wall', main='orange (crumbling blocks are orange in this world)',
                         rule=MINE_INKS.replace(' and orange blocks crumble', ''),
                         vary='the cracks and gaps that show where it will break, the rubble\'s shapes, the rotten boards, dust trickling from it, how it hangs off the wall'),
    'mine-lamp': dict(world='mine', kind='prop', what='a kantera, a miner\'s oil lamp of old Japan, drawn twice in each cell: unlit (cold and grey) on the left and lit on the '
                      'right, as the hero lights it by coming near', where='hung on a hook or a peg in the shaft wall over a ledge', material='an iron or tin lamp, a wick',
                      size='about 0.6 tiles wide and 1 tile tall', inks='grey metal; lit, its flame orange with a yellow core and a dither halo of orange round it: a light of '
                      'the dark; unlit, all grey and black', scene=MINE_AT + ' below it'),
    'mine-ore': dict(world='mine', kind='prop', what='a vein of silver ore in the rock, glinting', where='in the shaft wall beside a ledge, behind the play (dithered with black, '
                     'so it reads as behind)', material='dark rock, crystals and nuggets of ore', size='about 2 tiles wide and 1.5 tiles tall',
                     inks='grey rock, the ore glinting in small white or pale grey sparkles with a faint dither glow (a small light in the dark); never yellow, the coins\' colour',
                     scene=MINE_AT + ' beside it'),
    'mine-cart': dict(world='mine', kind='prop', what='a little mine cart (torokko) parked on a short stretch of rail, heaped with ore', where='on the top of a ledge at its wall end',
                      material='wood and iron, iron wheels, two rails on sleepers, a stop block', size='about 2 tiles wide and 1.5 tiles tall',
                      inks='grey wood and iron, black wheels, the ore grey with a few white glints (never yellow)', scene=MINE_AT),
    'mine-tools': dict(world='mine', kind='prop', what="the miners' tools leaning by the wall: pickaxes, a sledgehammer, straw baskets (zaru), a straw raincoat on a peg",
                       where='on the top of a ledge at its wall end', material='wooden handles, iron heads, woven straw', size='about 2 tiles wide and 1.5 tiles tall',
                       inks='grey wood, straw and iron, black shadows', scene=MINE_AT),
    'mine-winch': dict(world='mine', kind='prop', what='a hand winch over a pit with a rope and a bucket, a wooden ladder leaning beside it', where='on the top of a ledge at its wall end',
                       material='a timber frame, a drum with a crank, a rope, a bucket, a ladder', size='about 2.5 tiles wide and 3 tiles tall',
                       inks='grey timber and rope, black shadows', scene=MINE_AT),
    'mine-bats': dict(world='mine', kind='prop', what='bats hanging asleep upside down, cute, one of them opening an eye', where='hanging under a ledge',
                      material='furry bodies, folded wings', size='each about 0.5 tiles wide and 0.7 tiles tall, two to four of them',
                      inks='black bats with a grey outline, the open eye glowing a small orange (a tiny light)', scene=MINE_AT + ' above them'),
    # The Mine's own enemy (owner 2026-10-24, У3 «Б»: its own diving bats, variants first; Вр3 «А»: from yokai and the place's real animals): a komori,
    # the three frames UPwell's behaviour asks for in every cell (hanging, wings up, wings down); the eyes orange, never yellow (yellow is a coin)
    'mine-komori': dict(world='mine', kind='foe', what='a komori, a bat of the old Japanese mine that hangs asleep under a ledge, wakes when the hero comes level with it, '
                        'and swoops at him. Draw it as one of six bats: A an eastern bent-winged bat (yubinaga-komori, which really lives in the old tunnels of the Iwami '
                        'Ginzan silver mine): a domed round head, a short muzzle, very long wings folded back at the wrist; B a greater horseshoe bat (kikugashira-komori): '
                        'a horseshoe-shaped nose leaf, broad round wings it wraps itself in when it hangs; C a Japanese long-eared bat (usagi-komori): ears almost as long as '
                        'its body; D a tube-nosed bat (tengu-komori): two little tube nostrils sticking out like a tengu\'s nose, a spotted coat; E a nobusuma, the yokai an '
                        'old bat becomes: shaggy fur, a cape of skin from its arms to its legs like a flying squirrel\'s, big round staring eyes; F a mochi bat: a fat, '
                        'round, soft little body like a rice cake with small wings, the kawaii one',
                        does='a diver: it hangs asleep upside down under a ledge; when the hero is level with it, it opens its wings and swoops down at him in a U and back '
                        'up to its perch; the hero stomps it from above while it hangs or flies back, never while it dives.',
                        size='flying, about 1.4 tiles across with its wings open (about 22 art pixels) and 0.8 tiles tall (about 12 art pixels); hanging folded, about 0.75 '
                        'tiles wide (12 art pixels) and 1 tile tall (15 art pixels): much bigger than a coin, half the hero',
                        place='the same bat three times in the cell, one above the other: at the top hanging asleep upside down from the underside of a thin ledge of rock '
                        '(a white top edge), wings folded, facing you, its two eyes lit; in the middle flying with its wings raised high, in side view facing right; at the '
                        'bottom flying with its wings swept down, in side view facing right',
                        main='grey #c8c8c8', parts='its two wings (grey skin between black finger bones), its ears, its nose, two eyes that glow orange #faa23e (never yellow: '
                        'yellow is a coin), and its little feet',
                        vary='the kind of bat, as the six letters above say: its ears, its nose, its wings and how it folds them, its fur',
                        foe_tone='Cute and a little eerie, as the Mine is, never gory: the game is for everyone, and the Mine is a gentle early world.'),
    # К9 «А» (the Level Design Book: a distinct silhouette per behaviour, and when it can be stomped shown on it; Вр4: no-stomp by spikes or red on top), the
    # cube three where the К3 roster put them: the tofu and the tumbler in Tokyo, the nurikabe on Fuji
    'tokyo-tofu': dict(world='tokyo', kind='foe', what='a tofu yokai of the Tokyo backstreets: a soft wobbly block of silken tofu come alive, with a little face, that crawls '
                       'along its ledge and, stomped, falls apart into four small cubes that scurry off',
                       does='a crawler: it creeps to and fro along its ledge; the hero stomps it from above any time, and it splits into four small tofu bits that run away '
                       'fast (they can be stomped too).',
                       size='about 1.9 tiles wide and 1.6 tiles tall (about 30 by 25 art pixels), nearly the hero\'s size; each bit about 0.9 tiles across',
                       place='the tofu twice in the cell: on the left whole, crawling along a thin ledge in side view facing right; on the right the same tofu just stomped, '
                       'split into its four small cubes jumping apart',
                       main='white-grey #c8c8c8 with grey shading (soft, a little wobbly, cut lines showing where it will split into four)', parts='its face (two eyes that '
                       'glow orange #faa23e, never yellow: yellow is a coin), the four cut lines across it, a few drops of soy sauce or a leaf of green onion on top',
                       vary='its shape (a tall block, a flat slab, a wobbly pudding), its face, how its four parts show, what is on top of it',
                       foe_tone='Cute, a little silly, never gory: the game is for everyone.'),
    'tokyo-tumbler': dict(world='tokyo', kind='foe', what='a yokan, a block of red bean jelly come alive, that somersaults along its ledge, rolling over and over, then sits still '
                          'for a moment between tumbles',
                          does='a tumbler: it somersaults along its ledge, then sits; while it tumbles it hurts the hero (its edges are sharp: show spikes or red edges on '
                          'the tumbling pose), while it sits it can be stomped from above (its top flat and calm).',
                          size='about 1.6 tiles across (about 26 art pixels), a cube',
                          place='the yokan three times in the cell along a thin ledge: on the left sitting still (flat top, calm face, safe to stomp), in the middle mid-'
                          'somersault tilted 45 degrees with its sharp edges showing, on the right upside down mid-roll',
                          main='dark purple-black #201010 with a purple sheen (yokan is dark bean jelly), its edges lighter', parts='its face (two eyes that glow orange '
                          '#faa23e), spikes or red edges only on its tumbling poses, a paper wrapper or a chestnut inside as a detail',
                          vary='its sheen and inside (plain, with chestnuts, layered, wrapped in paper), its face, how its sharp tumbling edges show',
                          foe_tone='Cute, a little silly, never gory: the game is for everyone.'),
    'fuji-nurikabe': dict(world='fuji', kind='foe', what='a nurikabe, the wall yokai, as a slab of snowy volcanic rock with a face, hanging over its ledge that drops on whoever passes '
                          'under it, then sits flat where it landed',
                          does='a crusher: it hangs over its ledge, shakes for a moment, drops straight down onto the hero below; while it hangs and falls it hurts (show '
                          'spikes or red on its underside and top), once it has landed it can be stomped from above (its top flat and calm).',
                          size='about 2.2 tiles wide and 2 tiles tall (about 35 by 32 art pixels), bigger than the hero',
                          place='the nurikabe three times in the cell: at the top hanging from the underside of a thin rock ledge, eyes open, spikes or red on its underside; '
                          'in the middle falling straight down with motion lines; at the bottom landed flat on a thin ledge, calm, its top flat, safe to stomp',
                          main='dark grey rock with a cap of snow #f3f3f3 on top (white means a top you can stand on, which is right once it has landed)',
                          parts='its face (two eyes that glow orange #faa23e), cracks, icicles on its underside while it hangs',
                          vary='its rock and snow, its face, how its dangerous underside shows (icicles, spikes, red), its shape (a slab, a block, a round wall)',
                          foe_tone='A little eerie, never gory: the game is for everyone, and Fuji is a gentle early world.'),
    # The Village's rising hazard (К13 «А»): a spring field burning got away up the shaft
    'village-noyaki': dict(world='village', kind='hazard', what='a spring field burning (noyaki, the old Japanese custom of burning the dry grass of the fields and '
                           'highlands each early spring): a front of flames running through dry pampas grass (susuki), the grass black and smouldering behind it, '
                           'smoke rising off it', why='the villagers burn last year\'s grass every spring, and this fire got away from them and climbs the shaft',
                           vary='how the flames sit on the grass (a ragged front, tall tongues, a low creeping line), the grass (tall plumed susuki, short tussocks, '
                           'rice straw), the burnt ground under the front (black with glowing embers, grey ash), the smoke (puffs, a curtain, wisps), and what it '
                           'throws up the shaft (burning tufts of grass, a shower of sparks, smoking stalks)',
                           inks='the flames red and orange, the grass orange and grey, the burnt ground black with orange and red embers, the smoke grey dither (never '
                           'white: white is an edge to stand on)'),
    # The other worlds' rising hazards (К13 «А»; owner 2026-10-24: «Обнови все природные опасности исходя из нового принципа построения»: drawn from these sheets'
    # own pixels, path A)
    'mine-flood': dict(world='mine', kind='hazard', what='the old mine flooding: dark groundwater welling up the shaft, churning and foaming at its top, broken '
                       'timber, a bucket and a straw basket swept along in it, bubbles rising through it', why='the mine\'s old pumps have stopped and the '
                       'groundwater floods up through the tunnels, as it did in the old silver mines',
                       vary='its surface (a choppy line, rolling waves, a churning boil), its foam and spray, what floats in it (timber, a bucket, baskets, '
                       'a lamp still lit), the dark water under it (bands of blue, dithered deeper down), and what it throws up the shaft (a spout of water, '
                       'a burst of spray and pebbles, a rising bubble)',
                       inks='the water blue darker downwards through dither, its foam and spray grey (never white: white is an edge to stand on), the '
                       'floating timber orange and grey, a lamp\'s glow orange'),
    'fuji-avalanche': dict(world='fuji', kind='hazard', what='an avalanche of snow churning up the shaft from below: a tumbling front of snow clods and '
                           'powder, rocks and lumps of ice caught in it, a cloud of fine snow blowing off its top', why='a slab of snow broke loose high '
                           'on the mountain, and the slide pours up the shaft after the climber',
                           vary='its front (big round clods, a smooth curling wave, a jagged slab breaking up), its powder cloud (puffs, a long plume, '
                           'streaks), the rocks and ice in it, its body (grey snow banded and dithered darker downwards), and what it throws up the shaft '
                           '(a snowball, a chunk of ice, a spray of powder)',
                           inks='the snow grey with white only on the clods\' tops and glints, the rocks black and grey, the ice blue, a red rim along '
                           'its top (red: the danger edge)'),
    'sea-tide': dict(world='sea', kind='hazard', what='the sea coming in with a spring tide up the sea cave\'s shaft: waves with curling crests, foam and '
                     'spray, seaweed and a broken net and driftwood tossing in it', why='at the great spring tide (oshio) the sea pours into the cave '
                     'under the islands and rises up the shaft',
                     vary='its crests (curling breakers, choppy wavelets, a rolling swell), its foam (lace, clumps, a long line), what tosses in it '
                     '(seaweed, a float of glass, driftwood, a broken net), its water (aqua darker downwards through dither), and what it throws up '
                     'the shaft (a column of spray, a leaping wave, a fish)',
                     inks='the water aqua and blue darker downwards through dither, its foam grey (never white: white is an edge to stand on), seaweed '
                     'green, driftwood orange'),
    'tokyo-fire': dict(world='tokyo', kind='hazard', what='a fire in the back alleys of the town climbing the shaft: flames on burning wooden shop '
                       'fronts and fallen signs, sparks and cinders whirling, thick smoke lit from below', why='a fire broke out in the old wooden houses '
                       'of the alleys, as fires did so often in old Tokyo, and it climbs the shaft',
                       vary='its flames (a wall of tall tongues, curling licks, a low hungry line), what burns in it (wooden beams, a shop\'s fallen '
                       'sign, paper lanterns, a bicycle), its smoke (a dark curtain, billows, wisps), the glowing debris under it, and what it '
                       'throws up the shaft (a flaming beam, a whirl of cinders, a burning lantern)',
                       inks='the flames red and orange, the smoke grey dither (never white), the burnt debris black with red and orange embers, a '
                       'sign\'s neon purple or blue'),
    # Each world's hazard on its walls (FIREWALL) and its icicles, drawn from these sheets' pixels (owner 2026-10-24: «Обнови все природные опасности…»)
    'village-wallfire': dict(world='village', kind='wallhaz', what='the dry grass and bamboo on the shaft\'s earthen wall catching fire',
                             why='sparks from the spring field burning below blow up the shaft and catch the dry tufts on its walls',
                             asleep='a seam of scorched grass on the wall, black with a few glowing embers', bursting='a sheet of flame roaring out of the burning tufts',
                             vary='the scorched seam (tufts, stalks, a charred bamboo), its embers, the shape of the flames bursting out (a flat sheet, licking tongues, a curl)',
                             inks='the flames red and orange, the scorched seam black and grey, the embers red and orange, smoke grey dither (never white)'),
    'mine-firedamp': dict(world='mine', kind='wallhaz', what='firedamp, the mine gas, seeping from a crack in the rock wall and flaring',
                          why='old coal and ore seams give off firedamp, and the miners\' lamps set it alight: the dread of every old mine',
                          asleep='a crack in the rock wall with a faint shimmer of gas over it and a few sparks', bursting='a jet of blue and red gas flame blasting out of the crack',
                          vary='the crack (a jagged split, a row of holes, a seam of ore), the gas over it (a shimmer, small sparks), the jet\'s shape (a straight blast, a fan, rolling balls of flame)',
                          inks='the jet red and orange with a blue heart, the crack black, the rock grey, the shimmer blue dither'),
    'fuji-wallice': dict(world='fuji', kind='wallhaz', what='frost on the rock wall bursting into spikes of ice',
                         why='meltwater seeping from the rock freezes in an instant in the summit\'s wind and shoots out of the wall as ice',
                         asleep='a seam of rime and frost crystals on the wall, glinting', bursting='a burst of sharp ice spikes jutting out from the wall',
                         vary='the frost seam (rime, a vein of blue ice, a crack frosted over), the spikes\' shapes (long needles, a fan of shards, a cluster of crystals)',
                         inks='the ice blue and grey with white only on tips and glints, the rock blue, red along the spikes\' tips (the danger edge)'),
    'sea-blowhole': dict(world='sea', kind='wallhaz', what='a blowhole: sea water forced up through a crack in the cave wall and blasting out in a jet of spray',
                         why='each wave below drives the sea up through the rock, and it bursts out of the wall',
                         asleep='a wet crack in the rock with barnacles and a little foam dripping from it', bursting='a jet of sea water and spray blasting out of the crack',
                         vary='the crack (barnacled, a round hole, a split with seaweed), the jet\'s shape (a straight blast, a fan of spray, a curling burst), its foam',
                         inks='the water aqua and blue, its foam grey (never white), red along the jet\'s edge (the danger edge), barnacles grey, seaweed green'),
    'tokyo-wallfire': dict(world='tokyo', kind='wallhaz', what='the wooden boards of the alley wall catching fire from the fire below',
                           why='the fire in the back alleys climbs the shaft, and its heat sets the old boards alight',
                           asleep='a strip of charred boards with glowing cracks between them', bursting='flames roaring out between the boards',
                           vary='the charred boards (planks, a shutter, a sign\'s frame), the glow in their cracks, the flames\' shape (a sheet, tongues, a curl)',
                           inks='the flames red and orange, the boards black and grey, the glow red and orange, smoke grey dither (never white)'),
    'village-icicles': dict(world='village', kind='drop', what='icicles left from a cold spring night, hanging under the eaves of a terrace ledge',
                            size='each about a third of a tile wide and one tile long', scene='an orange earthen terrace ledge',
                            vary='their shape (one long spike, a cluster, a drop of ice with a point), the meltwater on them, a bit of straw or a leaf frozen in',
                            inks='the ice grey and blue with white only on glints, red at its point (the danger edge)'),
    'fuji-icicles': dict(world='fuji', kind='drop', what='icicles hanging under a snowy rock ledge on Mount Fuji',
                         size='each about a third of a tile wide and one tile long', scene='a blue rock ledge with a cap of snow',
                         vary='their shape (one long spike, a cluster, a ridged spike), their tips, snow on their roots',
                         inks='the ice blue and grey with white only on glints, red at its point (the danger edge)'),
    # The Village's falling hazard and its slick walls without cold (owner, Д77: «В деревне не должно быть элементов холода»): six different things each
    'village-drop': dict(world='village', kind='drop', what='something of a spring village that hangs under a terrace ledge and drops, one kind in each cell: '
                         'A a loose stone from the dry-stone terrace wall, B a clay roof tile (kawara) slipping off, C a sharpened bamboo stake, D a hornets\' nest '
                         '(suzumebachi) with a few hornets round it, E a heavy pine cone, F a clay pot hanging on a straw rope',
                         size='each about half a tile wide and up to one tile long', scene='an orange earthen terrace ledge',
                         vary='the thing itself, as the six letters say; how it hangs (on a root, a rope, a crack) and how it shows it is about to fall',
                         inks='stone grey, tile blue and grey, bamboo orange, the nest grey and orange with black hornets, the pot orange, the rope orange; red where it '
                         'hurts (its point or its edge); never white or blue ice'),
    'village-slick': dict(world='village', kind='ledge', what='a slippery wall standing up the shaft, too smooth or wet to cling to, one kind in each cell: '
                          'A a pillar of polished bamboo trunks lashed together, B wet clay daubed over a terrace wall, glistening, C a stone wall with water '
                          'running down it, D a lacquered wooden post like a shrine\'s, E oiled paper stretched over a wooden frame, F river stones worn smooth '
                          'and stacked', does='it stands up the shaft like a wall; you slide down it and cannot cling to it or jump off it as you can off other walls',
                          material='as the six letters say, each with a sheen, drips or glints that say it is slippery', size='1 tile wide and 4 tiles tall',
                          place='the wall standing up the middle of the cell from a short ledge', main='orange or grey',
                          vary='the six kinds above: its surface and how it shows it is slippery (a sheen, drips, glints), never ice, frost or snow'),
    # Where an arena's wave waits (К8 «А»), the worlds with arenas (the Village; Fuji, the Sea and Tokyo by К4)
    'village-holder': dict(world='village', kind='holder', what='big woven bamboo baskets hanging on straw ropes from somewhere above, the kind farmers haul rice and greens in',
                           size='about 2 tiles wide and 2 tiles tall, its rope running up out of the cell', scene='an orange earthen terrace ledge',
                           vary='the basket (a round one, a tall carrying basket, a flat winnowing tray tied as a sling, a straw sack), how it hangs (one rope, two, a pole) and how it lets the wave go (tips, its bottom drops, it tears)',
                           inks='the basket orange with black weave, the rope orange, red eyes or a red glow in its gaps'),
    'fuji-holder': dict(world='fuji', kind='holder', what='a heavy snow cornice overhanging from a rock outcrop above, snow heaped over the waiting wave',
                        size='about 2.5 tiles wide and 1.5 tiles tall, its rock running up out of the cell', scene='a blue rock ledge with a cap of snow',
                        vary='the cornice (a curling lip, a slab, a mound with icicles), its rock, how it lets the wave go (it cracks off, it slumps, it bursts)',
                        inks='the snow grey with white glints only, the rock blue and black, red eyes or a red glow in its cracks'),
    'sea-holder': dict(world='sea', kind='holder', what='a fishing net full of something, hung from a pole or a rope above, bulging, weighted with floats',
                       size='about 2 tiles wide and 2 tiles tall, its rope running up out of the cell', scene='an aqua rock ledge',
                       vary='the net (a round bag net, a long drift net, a lobster pot, a basket trap), its floats and weights, how it lets the wave go (it opens, it tears, it tips)',
                       inks='the net grey, its floats orange, its rope orange, seaweed green, red eyes in its mesh'),
    'tokyo-holder': dict(world='tokyo', kind='holder', what='old wooden storm shutters (amado) on a frame hung across the shaft, shut over a dark space',
                         size='about 2.5 tiles wide and 1.5 tiles tall, its frame running to the walls or up out of the cell', scene='a purple concrete ledge',
                         vary='the shutters (two swinging leaves, a sliding panel, a roll-up metal shutter, a hanging crate), their frame, how they let the wave go (swing open, slide, roll up, the crate tips)',
                         inks='the wood grey and black, the metal grey, red eyes or a red glow through the slats'),
    'mine-far': dict(world='mine', kind='prop', what='the mine far away: tunnels going off into the dark, their timber frames smaller and smaller, rails running in, a few lamps '
                     'glowing deep inside', plane='back', where='far behind everything, low and faint, so the play reads over it', material='timber frames, rails, rock, lamps',
                     size='about 14 tiles wide and 6 tiles tall', inks='a faint grey dither on the black, the far lamps small orange glows', scene=MINE_AT + ' in front of it'),
    'mine-shop': dict(world='mine', kind='prop', what="a miners' tool shed built into the tunnel wall, whose door is a way into a shop", where='standing on a ledge against the '
                      'shaft wall, its door open', material='a wooden front with a little roof, a noren curtain over the door, a sign, a lamp',
                      size='about 3.5 tiles wide and 3.5 tiles tall', inks='grey wood, the noren red (red is the shop\'s mark), a lit window orange (a light)', scene=MINE_AT),
    'mine-stash': dict(world='mine', kind='prop', what='the sealed door of a silver vault cut into the rock: the way into a stash', where='standing on a ledge against the shaft wall',
                       material='a heavy timber door with iron bands and studs, a big lock, a frame of stone', size='about 3 tiles wide and 3 tiles tall',
                       inks='grey and black timber and iron, its cracks glowing purple inside (purple is the stash\'s mark)', scene=MINE_AT),
    # The Danchi (owner 2026-10-21: world 6 Japanese, «Данчи»), six takes on each
    'danchi-slab': dict(world='danchi', kind='ledge', what='the basic ledge, a slab of raw danchi concrete sticking out of the shaft wall', does='solid on every side: you '
                        'stand on it, cling to its sides and jump off it', material='poured concrete, the seams of its panels, rust and rain stains running down it, '
                        'tie holes', size='4 tiles long and 1 tile thick', main='grey (concrete)', rule=DANCHI_INKS,
                        vary='six different kinds of danchi concrete, one in each cell: A exposed concrete, smooth, its formwork joints as thin dark lines '
                        'and rows of small round tie holes, a crisp square free end, a thin recessed seam where it meets the wall; B the front of an old balcony, '
                        'a cap band under its white edge, dark rain streaks running down from the cap, uneven, a drip groove along its underside, a short drain spout '
                        'under its free end with a grey drop falling; C painted in two tones, pale grey above and a darker grey band below with a thin black line '
                        'between, paint flaking off in small patches at its ends, a short rust streak under an anchor bolt; D precast panels, their joints sealed '
                        '(a dark line with a lighter one beside it), one panel with a big black painted block number of two digits, a small grey meter box with a '
                        'dark window at its wall end; E old and repaired, a black crack zigzagging across, an older crack filled with grey sealant, a patch of '
                        'newer concrete in a slightly different tone, a spalled corner showing a little rusty rebar, a tiny weed at its free end; F service concrete, '
                        'a grey pipe along its face on brackets, a small vent grille of black slats, black and grey hazard stripes on its free end, a little bulkhead '
                        'lamp under its free end glowing orange'),
    # The Danchi's concrete after Japanese modernism (owner 2026-10-22: «К бетону нужен подход через модернизм и знаковые бетонные здания и музеи Японии»)
    'danchi-slab-modern': dict(world='danchi', kind='ledge', what='the basic ledge, a slab of concrete sticking out of the shaft wall, built the way a famous Japanese '
                        'modernist building is', does='solid on every side: you stand on it, cling to its sides and jump off it', material='concrete, as Japan\'s '
                        'modernist architects built it', size='4 tiles long and 1 tile thick', main='grey (concrete)', rule=DANCHI_INKS + ' Keep the band just under '
                        'the white top edge plain grey on every variant: patterns, holes and joints only on the lower half of the slab.',
                        vary='six kinds of Japanese modernist concrete, one in each cell, each after one famous building: A after Tadao Ando\'s Church of the Light, '
                        'smooth fair-faced concrete in panels of tatami proportion (1 by 2) with thin joints, each panel with six small round tie holes in two rows of '
                        'three, crisp square ends; B after Kenzo Tange\'s Kagawa Prefectural Office, concrete built like a wooden temple, a row of square beam ends '
                        'sticking out under the slab like the brackets of temple eaves, its face marked by the boards of its formwork (thin horizontal lines); C after '
                        'Le Corbusier\'s National Museum of Western Art in Tokyo, precast panels of exposed-aggregate concrete speckled with small pebbles, a round '
                        'column (a piloti) under the slab near the wall; D after Kisho Kurokawa\'s Nakagin Capsule Tower, the slab\'s free end a pale grey capsule '
                        'with rounded corners and one round porthole window (dark glass in a grey ring), held to the concrete by four bolts; E after Arata Isozaki\'s '
                        'Oita Prefectural Library, the slab a hollow box beam whose cut free end shows a square dark hollow inside a thick grey frame; F after Kunio '
                        'Maekawa\'s Fukuoka Art Museum, ceramic tiles cast into the concrete, a grid of small grey tiles with dark joints on its lower face, a plain '
                        'deep band like an eave above them'),
    'danchi-balcony': dict(world='danchi', kind='ledge', what='a danchi balcony sticking out of the wall: its thin slab and its railing, a futon or laundry hung over the rail',
                           does='a thin platform: you jump up through it from below and stand on it', material='a concrete balcony slab, a steel railing, a futon, towels, '
                           'clothes pegs', size='4 tiles long, its slab a third of a tile thick, its rail half a tile over it', place='the balcony sticking out of that wall',
                           main='grey (concrete and steel)', rule=DANCHI_INKS, vary='its railing (bars, a solid parapet, a mesh), what hangs over it (a futon beaten flat, a row '
                           'of shirts, socks on a hanger, a towel), and the small details (a potted plant, a sandal, an air conditioner pipe)'),
    'danchi-pole': dict(world='danchi', kind='ledge', what='a long laundry pole (monohoshi-zao) hung across the shaft on two hooks, clothes pegs and hangers on it',
                        does='a thin platform: you jump up through it from below and stand on it', material='an aluminium pole, hanger hooks, wire, clothes',
                        size='4 tiles long and a third of a tile thick', place='the pole in the middle of the shaft, hung from above', main='grey (aluminium)',
                        rule=DANCHI_INKS, vary='how it hangs (two hooks, a wire to each end, a bracket), what is on it (a peg hanger with socks, a shirt on a hanger, a '
                        'towel, nothing but pegs) and its ends (caps, a bend)'),
    'danchi-stairs': dict(world='danchi', kind='ledge', what="a flight of the danchi's outdoor stairwell: concrete steps, a handrail on its posts",
                          does='steps you walk up: each step a little higher than the last', material='concrete steps, a steel handrail, its posts', size='each step '
                          'half a tile high and a tile deep, four steps', place='the steps going up from that wall', main='grey (concrete)', rule=DANCHI_INKS,
                          vary='the steps (their nosing, a non-slip strip, worn edges), the handrail (round, square, painted), its posts and the small details '
                          '(a floor number painted on the wall, a light, a bicycle ramp)'),
    'danchi-boxes': dict(world='danchi', kind='ledge', what="a stack of cardboard moving boxes (danboru) left out on the ledge, which gives way under you",
                         does='a row you stand on that falls apart a moment after you touch it and comes back a while later', material='cardboard boxes, packing tape, '
                         'string', size='4 tiles long and 1 tile thick', place='the boxes stacked out from that wall', main='orange (crumbling blocks are orange here)',
                         rule=DANCHI_INKS.replace(', orange blocks crumble', ''), vary='how the boxes are stacked, their tape and flaps, the marks on them (an arrow, '
                         'a fragile cup, a cat face), dents and tears that show where it will give'),
    'danchi-spring': dict(world='danchi', kind='ledge', what="a playground spring rider: a cute animal on a big coil spring", does='a spring: you land on it and it throws you high',
                          material='a moulded plastic animal, a steel coil spring, a base', size='about 1.5 tiles wide and 1.5 tiles tall', place='on a ledge',
                          main='blue (springs are blue in this world)', rule=DANCHI_INKS.replace('blue marks springs and moving platforms, ', ''),
                          vary='the animal (a panda, a rabbit, a frog, an elephant, a horse, a dog), its handles and its spring'),
    'danchi-bikes': dict(world='danchi', kind='prop', what='mamachari bicycles parked by the wall, a child seat on one, a basket on the front', where='on the top of a ledge at its wall end',
                         material='steel frames, wheels, baskets, a child seat', size='about 2.5 tiles wide and 1.2 tiles tall', inks='grey frames, black wheels, small accents', scene=DANCHI_AT),
    'danchi-plants': dict(world='danchi', kind='prop', what='a little balcony garden: potted plants, a styrofoam box of vegetables, a watering can, a morning glory up a string',
                          where='on the top of a ledge at its wall end', material='clay and plastic pots, styrofoam boxes, leaves', size='about 2 tiles wide and 1.5 tiles tall',
                          inks='grey pots and boxes, the leaves green only a little (green is moss you can hold here: so mostly grey leaves with a few green ones)', scene=DANCHI_AT),
    'danchi-mail': dict(world='danchi', kind='prop', what="a bank of the block's mailboxes with name slots, its number painted big on the wall over them, a notice board",
                        where='against the wall over a ledge', material='steel mailboxes, paint, paper notices', size='about 2 tiles wide and 2 tiles tall',
                        inks='grey mailboxes, black slots, the painted number grey, the notices grey', scene=DANCHI_AT + ' below it'),
    'danchi-cat': dict(world='danchi', kind='prop', what='a stray cat asleep curled on an old cushion, or sitting by a food bowl, cute', where='on the top of a ledge at its wall end',
                       material='fur, a cushion, a bowl', size='about 1 tile wide and 0.8 tiles tall', inks='a grey or black cat, a grey cushion and bowl', scene=DANCHI_AT),
    'danchi-wall': dict(world='danchi', kind='prop', what="what runs up the shaft's walls behind the play: drainpipes on their brackets, air conditioner units on stands, a gas meter",
                        plane='back', where='up the shaft walls, behind everything (dithered with black)', material='pipes, brackets, AC units', size='about 1.5 tiles wide and 6 tiles tall',
                        inks='a faint grey dither on the black', scene=DANCHI_AT + ' in front of it'),
    'danchi-far': dict(world='danchi', kind='prop', what='the danchi far away: rows of identical concrete blocks, their windows lit here and there, big numbers on their end walls, '
                       'water tanks on their roofs, a power pylon, the moon', plane='back', where='far behind everything, low and faint, so the play reads over it',
                       material='blocks, windows, tanks, a pylon', size='about 14 tiles wide and 6 tiles tall', inks='a faint grey dither on the black, the lit windows orange (lights)',
                       scene=DANCHI_AT + ' in front of it'),
    'danchi-shop': dict(world='danchi', kind='prop', what="a tiny dagashiya, a sweet shop on the block's ground floor, its shutter half up, whose door is a way into a shop",
                        where='standing on a ledge against the shaft wall, its door open', material='a shutter, a glass sliding door, a noren, a sign, a gacha machine',
                        size='about 3.5 tiles wide and 3 tiles tall', inks='grey shop front, a red noren (red is the shop\'s mark), a lit window orange (a light)', scene=DANCHI_AT),
    'danchi-stash': dict(world='danchi', kind='prop', what="an apartment's steel front door, a nameplate, a peephole, a milk box, its gap glowing: the way into a stash",
                         where='standing on a ledge against the shaft wall', material='a painted steel door, a frame, a nameplate, a milk box', size='about 2.5 tiles wide and 3 tiles tall',
                         inks='a grey door, black details, its gaps glowing purple inside (purple is the stash\'s mark)', scene=DANCHI_AT),
    # The Danchi in Kunio Maekawa's concrete (owner 2026-10-22, on the questions page: d2 «F»; then «Детали тоже прогони через чат»), six takes on each
    'mk-slab': dict(world='maekawa', kind='ledge', what="the basic ledge, a slab of Kunio Maekawa's concrete sticking out of the shaft wall", does='solid on every side: you '
                    'stand on it, cling to its sides and jump off it', material='poured concrete, ceramic tiles cast into it, deep eaves', size='4 tiles long and 1 tile thick',
                    main='grey (concrete)', rule=DANCHI_INKS, vary='six ways to build this ledge, each a clearly different shape, one in each cell: A a thick slab whose '
                    'front is a deep eave, its free end turned up in a heavy lip; B a slab faced on its front with small tiles cast into the concrete under a plain concrete '
                    'band; C a slab with a row of square beam ends sticking out under it like the rafters under a deep roof; D a heavy coping on top of a narrower slab, '
                    'a deep shadow line between them; E a slab whose underside steps back in two tiers like the soffit of a big roof; F a slab carried on a short thick '
                    'square column under its middle, the column faced in tiles'),
    'mk-balcony': dict(world='maekawa', kind='ledge', what="a balcony of Maekawa's concrete sticking out of the wall, laundry or a futon over its parapet",
                       does='a thin platform: you jump up through it from below and stand on it', material='a concrete balcony slab, its parapet, a futon, towels, clothes pegs',
                       size='4 tiles long, its slab a third of a tile thick, its parapet half a tile over it', place='the balcony sticking out of that wall',
                       main='grey (concrete)', rule=DANCHI_INKS, vary='its parapet and what is on it, very different in each: A a solid tiled parapet under a deep concrete '
                       'eave, a futon beaten flat over it; B a thin slab with a round pipe railing, shirts on hangers; C a parapet pierced by a row of square holes, a towel; '
                       'D a parapet of thick vertical concrete fins, socks on a peg hanger; E a deep slab with an upturned edge, potted plants on it; F a planter box '
                       'along its front, its leaves mostly grey with a few green ones, an air conditioner beside it'),
    'mk-pole': dict(world='maekawa', kind='ledge', what='something long and thin hung across the middle of the shaft', does='a thin platform: you jump up through it from '
                    'below and stand on it', material='aluminium, concrete, steel, timber', size='4 tiles long and a third of a tile thick', place='it in the middle of '
                    'the shaft, hung from above at its ends', main='grey', rule=DANCHI_INKS, vary='six different things, each hung from above at its two ends: A a '
                    'laundry pole on two hooks with socks and a shirt on it; B a slim concrete beam with tiles on its side, on two rods; C a steel pipe handrail on '
                    'two brackets; D a timber plank from the formwork on two ropes; E a broken-off piece of a thin concrete eave on two cables; F a cable tray with '
                    'cables in it on two hangers'),
    'mk-stairs': dict(world='maekawa', kind='ledge', what="a flight of stairs in Maekawa's concrete", does='steps you walk up: each step a little higher than the last',
                      material='concrete steps, tiles, a balustrade or a handrail', size='each step half a tile high and a tile deep, four steps',
                      place='the steps going up from that wall', main='grey (concrete)', rule=DANCHI_INKS, vary='six flights, each clearly different: A grand steps with '
                      'a solid tiled balustrade; B open concrete steps on one beam with a pipe handrail; C steps under a deep concrete eave, a lamp under it glowing '
                      'orange; D steps with a curved concrete balustrade; E steps beside a side wall pierced by square holes; F steps with tiles on their risers and a '
                      'square grey handrail'),
    'mk-boxes': dict(world='maekawa', kind='ledge', what='a row on the ledge that gives way under you', does='a row you stand on that falls apart a moment after you touch it '
                     'and comes back a while later', material='loose tiles, broken concrete, cardboard, planks, bricks', size='4 tiles long and 1 tile thick',
                     place='it stacked out from that wall', main='orange (crumbling blocks are orange here)', rule=DANCHI_INKS.replace(', orange blocks crumble', ''),
                     vary='six different things that give way, all orange, each showing where it will break: A a stack of loose tiles fallen off the wall; B a broken '
                     'concrete block with rebar at the break; C cardboard moving boxes with tape across; D a scaffold of planks lashed together; E a heap of bricks '
                     'and broken tiles; F a cracked tiled bench'),
    'mk-spring': dict(world='maekawa', kind='ledge', what='a spring', does='a spring: you land on it and it throws you high', material='steel coil springs, moulded plastic, '
                      'concrete', size='about 1.5 tiles wide and 1.5 tiles tall', place='on a ledge', main='blue (springs are blue in this world)',
                      rule=DANCHI_INKS.replace('blue marks springs and moving platforms, ', ''), vary='six different springs, all blue: A a playground spring rider, '
                      'a panda; B a coil spring under a concrete bench seat; C a small round trampoline; D a springboard on a coil; E a spring rider, a rabbit; F a coil '
                      'under a round lid'),
    'mk-bikes': dict(world='maekawa', kind='prop', what="mamachari bicycles parked under a deep concrete eave, a child seat on one, a basket on the front", where='on the top of a ledge at its wall end',
                     material='steel frames, wheels, baskets, a child seat, a tiled shelter', size='about 2.5 tiles wide and 1.2 tiles tall', inks='grey frames, black wheels, small accents', scene=MK_AT),
    'mk-plants': dict(world='maekawa', kind='prop', what='a little garden: potted plants in tiled planters, a styrofoam box of vegetables, a watering can',
                      where='on the top of a ledge at its wall end', material='tiled planters, pots, styrofoam boxes, leaves', size='about 2 tiles wide and 1.5 tiles tall',
                      inks='grey pots and planters, the leaves green only a little (green is moss you can hold here: so mostly grey leaves with a few green ones)', scene=MK_AT),
    'mk-mail': dict(world='maekawa', kind='prop', what="a bank of mailboxes set in a tiled wall under a deep eave, the block's number over them, a notice board",
                    where='against the wall over a ledge', material='steel mailboxes, tiles, paint, paper notices', size='about 2 tiles wide and 2 tiles tall',
                    inks='grey mailboxes, black slots, the number grey, the notices grey', scene=MK_AT + ' below it'),
    'mk-cat': dict(world='maekawa', kind='prop', what='a stray cat asleep on a concrete bench or a tiled step, or sitting by a food bowl, cute', where='on the top of a ledge at its wall end',
                   material='fur, a bench, a bowl', size='about 1 tile wide and 0.8 tiles tall', inks='a grey or black cat, a grey bench and bowl', scene=MK_AT),
    'mk-wall': dict(world='maekawa', kind='prop', what="the shaft's walls behind the play in Maekawa's concrete: tile-faced concrete, deep horizontal shadow lines of eaves, "
                    "drainpipes, a few small windows", plane='back', where='up the shaft walls, behind everything (dithered with black)',
                    material='tiles cast into concrete, eaves, pipes', size='about 1.5 tiles wide and 6 tiles tall', inks='a faint grey dither on the black', scene=MK_AT + ' in front of it'),
    'mk-far': dict(world='maekawa', kind='prop', what="Maekawa's buildings far away: a concert hall with a massive sculptural roof and deep eaves, a museum with tiled walls, "
                   "housing blocks, a few windows lit, the moon", plane='back', where='far behind everything, low and faint, so the play reads over it',
                   material='concrete roofs, tiled walls, windows', size='about 14 tiles wide and 6 tiles tall', inks='a faint grey dither on the black, a few lit windows orange (lights)',
                   scene=MK_AT + ' in front of it'),
    'mk-shop': dict(world='maekawa', kind='prop', what="a tiny shop under a deep concrete eave in a tiled wall, its door open: the way into a shop",
                    where='standing on a ledge against the shaft wall, its door open', material='a tiled front, a glass door, a noren, a sign, a deep eave',
                    size='about 3.5 tiles wide and 3 tiles tall', inks='a grey front, a red noren (red is the shop\'s mark), a lit window orange (a light)', scene=MK_AT),
    'mk-stash': dict(world='maekawa', kind='prop', what="a heavy concrete door in a tile-faced wall under a deep eave, its gaps glowing: the way into a stash",
                     where='standing on a ledge against the shaft wall', material='a concrete or steel door, a tiled frame, a deep eave', size='about 2.5 tiles wide and 3 tiles tall',
                     inks='a grey door, black details, its gaps glowing purple inside (purple is the stash\'s mark)', scene=MK_AT),
    # The Danchi in Arata Isozaki's concrete (owner 2026-10-23, on the questions page: d19 «Переходим на Исодзаки», d2 E), six takes on each of its architecture
    'iso-slab': dict(world='isozaki', kind='ledge', what="the basic ledge, a slab of Arata Isozaki's concrete sticking out of the shaft wall", does='solid on every side: '
                     'you stand on it, cling to its sides and jump off it', material='raw board-formed concrete, hollow box beams cut off square', size='4 tiles long and 1 tile '
                     'thick', main='grey (concrete)', rule=DANCHI_INKS, vary='six ways to build this ledge, each a clearly different shape, one in each cell: A a hollow '
                     'box beam, its free end cut off square and open, a dark square hole in its end; B two slim beams side by side with a dark gap between them, their ends '
                     'open; C a slab with a box beam under it whose open end sticks out past the slab; D the bottom bar of an open cubic frame, its corner posts going up '
                     'a little; E a slab whose underside is a shallow barrel vault, curved; F a slab of board-formed concrete, the timber board marks showing, a round pipe '
                     'running along its front'),
    'iso-balcony': dict(world='isozaki', kind='ledge', what="a balcony of Isozaki's concrete sticking out of the wall, laundry or a futon over its parapet",
                        does='a thin platform: you jump up through it from below and stand on it', material='a concrete slab, hollow beam ends, pipe rails, a futon, towels',
                        size='4 tiles long, its slab a third of a tile thick, its parapet half a tile over it', place='the balcony sticking out of that wall',
                        main='grey (concrete)', rule=DANCHI_INKS, vary='its parapet and what is on it, very different in each: A a parapet that is a hollow box beam, its '
                        'open end at the corner, a futon over it; B a thin slab with a pipe railing, shirts on hangers; C a parapet of short square tubes stacked side by side, '
                        'their open ends facing out, a towel; D a balcony inside an open cubic frame, a towel on the frame; E a parapet curved like a half barrel vault; '
                        'F a slab with ducts and pipes running under it, an air conditioner'),
    'iso-pole': dict(world='isozaki', kind='ledge', what='something long and thin hung across the middle of the shaft', does='a thin platform: you jump up through it '
                     'from below and stand on it', material='steel tubes, ducts, concrete', size='4 tiles long and a third of a tile thick', place='it in the middle of the '
                     'shaft, hung from above at its ends', main='grey', rule=DANCHI_INKS, vary='six different things, each hung from above at its two ends: A a square steel '
                     'tube, its ends open, on two rods; B two parallel pipes on brackets; C a slim concrete box beam, its cut ends open, on two cables; D a light lattice truss '
                     'on two hangers; E a short piece of a hollow concrete beam on chains; F a big round duct on two straps'),
    'iso-stairs': dict(world='isozaki', kind='ledge', what="a flight of stairs in Isozaki's concrete", does='steps you walk up: each step a little higher than the last',
                       material='concrete steps, box beams, pipe rails', size='each step half a tile high and a tile deep, four steps', place='the steps going up from that '
                       'wall', main='grey (concrete)', rule=DANCHI_INKS, vary='six flights, each clearly different: A steps inside an open grid of cubic frames; B open steps '
                       'hung on steel rods from a hollow beam over them; C steps with a balustrade of round pipes; D steps under a barrel vault; E steps each made of a '
                       'short hollow box beam, their open square ends seen from the side; F board-formed steps with a square handrail'),
    'iso-wall': dict(world='isozaki', kind='prop', what="the shaft's walls behind the play in Isozaki's concrete: board-formed concrete, the open square ends of hollow "
                     "beams in a grid, ducts and pipes, a few small square windows", plane='back', where='up the shaft walls, behind everything (dithered with black)',
                     material='board-formed concrete, beam ends, ducts', size='about 1.5 tiles wide and 6 tiles tall', inks='a faint grey dither on the black', scene=ISO_AT + ' in front of it'),
    'iso-far': dict(world='isozaki', kind='prop', what="Isozaki's buildings far away: the Oita library with its huge hollow beams sticking out, the Gunma museum's cubic "
                    "frames, the Kitakyushu library's long barrel vaults, housing blocks, a few windows lit, the moon", plane='back', where='far behind everything, low and '
                    'faint, so the play reads over it', material='concrete beams, cubes, vaults, windows', size='about 14 tiles wide and 6 tiles tall',
                    inks='a faint grey dither on the black, a few lit windows orange (lights)', scene=ISO_AT + ' in front of it'),
    'iso-shop': dict(world='isozaki', kind='prop', what="a tiny shop set under a huge hollow concrete beam whose open end hangs over its door, its door open: the way into a shop",
                     where='standing on a ledge against the shaft wall, its door open', material='board-formed concrete, a glass door, a noren, a lit window',
                     size='about 3.5 tiles wide and 3 tiles tall', inks='a grey front, a red noren (red is the shop\'s mark), a lit window orange (a light)', scene=ISO_AT),
    'iso-stash': dict(world='isozaki', kind='prop', what="a heavy door set deep in the open square end of a giant hollow concrete beam, its gaps glowing: the way into a stash",
                      where='standing on a ledge against the shaft wall', material='a concrete or steel door, the beam\'s thick walls round it', size='about 2.5 tiles wide and 3 tiles tall',
                      inks='a grey door, black details, its gaps glowing purple inside (purple is the stash\'s mark)', scene=ISO_AT),
    # The Tower (owner 2026-10-21: world 7 Japanese, «Телебашня»), six takes on each
    'tower-truss': dict(world='tower', kind='ledge', what="the basic ledge, a steel truss of the tower's lattice sticking out of the shaft wall", does='solid on every side: you '
                        'stand on it, cling to its sides and jump off it', material='steel angles in a lattice, rivets, gusset plates', size='4 tiles long and 1 tile thick',
                        main='orange and grey (painted steel)', rule=TOWER_INKS, vary='its lattice (X bracing, K bracing, a Warren truss), its rivets and plates, how it meets the wall'),
    'tower-catwalk': dict(world='tower', kind='ledge', what='a maintenance catwalk of the tower sticking out of the wall: a steel grating, its handrail',
                          does='a thin platform: you jump up through it from below and stand on it', material='a steel grating, a handrail, its posts, a toe board',
                          size='4 tiles long and a third of a tile thick, its rail half a tile over it', place='the catwalk sticking out of that wall', main='grey and orange (steel)',
                          rule=TOWER_INKS, vary='its grating, its rail and posts, its brackets under it, and the small details (a cable tray, a sign, a safety chain)'),
    'tower-cloud': dict(world='tower', kind='ledge', what='a Japanese cloud in the style of old prints, a band of cloud with curls at its ends, drifting free in the shaft',
                        does='a thin platform you stand on that dissolves a moment after you touch it and gathers again a while later', material='cloud', size='4 tiles long and '
                        'half a tile thick', place='the cloud in the middle of the shaft', main='white (clouds that dissolve are white in this world)',
                        rule=TOWER_INKS.replace(', white clouds dissolve under you', ''), vary='its curls (spirals, scrolls, waves), its bands and its edge, as on old prints and screens'),
    'tower-lift': dict(world='tower', kind='ledge', what="a maintenance gondola of the tower hanging from a trolley that runs on a rail across the shaft",
                       does='a thin platform that rides sideways along its row, from wall to wall and back, carrying you; you jump up through it from below and stand on its top',
                       material='a steel cage or basket, a trolley, a rail', size='3 tiles long, its top a third of a tile thick', place='the moving platform in the middle of the shaft',
                       main='blue (moving platforms are blue in this world)', rule=TOWER_INKS.replace('blue marks moving platforms, springs and rubber walls, ', ''),
                       vary='its basket or cage, its trolley and rail, and small details (a toolbox, a lamp, a coil of cable)'),
    'tower-spring': dict(world='tower', kind='ledge', what="a big buffer spring like those at the foot of a lift shaft, on a steel base", does='a spring: you land on it and it throws you high',
                         material='a steel coil, a base plate, a cap', size='about 1.5 tiles wide and 1 tile tall', place='on a ledge', main='blue (springs are blue in this world)',
                         rule=TOWER_INKS.replace('blue marks moving platforms, springs and rubber walls, ', ''), vary='its coil (one, two side by side, a cone), its cap and base, a warning stripe'),
    'tower-antenna': dict(world='tower', kind='prop', what='antennas and broadcast dishes on the tower, a panel array, a small warning light', where='on the top of a ledge at its wall end',
                          material='steel masts, dishes, panels, cables', size='about 2 tiles wide and 2.5 tiles tall', inks='grey and orange steel, black cables, a small orange light', scene=TOWER_AT),
    'tower-shrine': dict(world='tower', kind='prop', what="the tower's own little shrine on its deck (as Tokyo Tower has): a small hokora, an orange torii, paper lanterns, a rope",
                         where='on the top of a ledge at its wall end', material='wood, a little roof, a torii, lanterns', size='about 2.5 tiles wide and 2.5 tiles tall',
                         inks='a grey hokora, an orange torii (never red), the lanterns orange glowing a little', scene=TOWER_AT),
    'tower-binoculars': dict(world='tower', kind='prop', what='coin-operated binoculars on a post on the observation deck, a bench by them', where='on the top of a ledge at its wall end',
                             material='steel binoculars on a post, a bench', size='about 2 tiles wide and 1.5 tiles tall', inks='grey and orange steel, a black coin slot', scene=TOWER_AT),
    'tower-crows': dict(world='tower', kind='prop', what='crows resting on a girder of the tower, cute, one cawing', where='on the top of a ledge at its wall end',
                        material='black feathers', size='each about 0.6 tiles, two or three of them', inks='black crows with a grey edge and a grey beak', scene=TOWER_AT),
    'tower-wall': dict(world='tower', kind='prop', what="the tower's steel lattice up the shaft's walls behind the play: diagonal braces, verticals, gusset plates, a cable run",
                       plane='back', where='up the shaft walls, behind everything (dithered with black)', material='steel angles, plates, cables', size='about 1.5 tiles wide and 6 tiles tall',
                       inks='a faint orange and grey dither on the black', scene=TOWER_AT + ' in front of it'),
    'tower-far': dict(world='tower', kind='prop', what='the city far below at dusk seen from the tower: the skyline with its lights, a river, Mount Fuji far off, Japanese clouds drifting',
                      plane='back', where='far behind everything, low and faint, so the play reads over it', material='buildings, lights, a mountain, clouds',
                      size='about 14 tiles wide and 6 tiles tall', inks='a faint purple and grey dither on the black, the city lights orange (lights)', scene=TOWER_AT + ' in front of it'),
    'tower-shop': dict(world='tower', kind='prop', what="the observation deck's little souvenir shop, whose door is a way into a shop", where='standing on a ledge against the shaft wall, its door open',
                       material='a counter, a sign, shelves of souvenirs, a lantern', size='about 3.5 tiles wide and 3 tiles tall', inks='grey and orange front, a red curtain or awning '
                       '(red is the shop\'s mark), a lit window orange (a light)', scene=TOWER_AT),
    'tower-stash': dict(world='tower', kind='prop', what="a riveted steel maintenance hatch in the tower's core, a wheel to open it, its gaps glowing: the way into a stash",
                        where='standing on a ledge against the shaft wall', material='riveted steel, a hand wheel, a warning sign', size='about 2.5 tiles wide and 3 tiles tall',
                        inks='grey and orange steel, black rivets, its gaps glowing purple inside (purple is the stash\'s mark)', scene=TOWER_AT),
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
    # Fuji from the real mountain, round 2 (owner 2026-10-23, his round-1 letters d44-d50, d40-d41; research/fuji/fuji-attributes.md): each pick as six looks
    'fuji-stone': dict(world='fuji', kind='ledge', what='the basic ledge, a dry-stone wall of fitted volcanic boulders like the retaining walls along the Mount Fuji trail, with a cap of snow, sticking out of the shaft wall',
                       does='solid on every side: you stand on it, cling to its sides and jump off it', material='rounded and angular boulders of dark volcanic rock fitted without mortar, small chinking stones in the gaps, snow on top',
                       size='4 tiles long and 1 tile thick', main='blue (the rock)',
                       vary='how the boulders are fitted (big round ones, flat courses, a mix with small chinking stones), the black gaps between them, the snow cap (thick, thin, lumps), '
                       'its free end (a big corner stone, a stepped end, a rounded end), how it meets the wall',
                       rule=FUJI_RULE + ' The first few art pixels under the white top edge stay one plain colour: the joints begin below them.'),
    'fuji-stick': dict(world='fuji', kind='prop', what="a pilgrim's kongo-zue, the tall wooden walking staff of Mount Fuji climbers, planted upright at the free end of a wooden boardwalk, "
                       "a little bell hanging from it on a cord, the brands of the trail's stations burned down its length",
                       where='planted upright at the free end of a thin wooden boardwalk sticking out of the wall, the bell hanging off it', material='a squared wooden staff, burned brand marks, a small bronze bell, a cord, maybe a strip of cloth',
                       size='the staff about 1.6 tiles tall and a tenth of a tile thick, the bell about a third of a tile', inks='the staff orange or grey wood with black brand marks, the bell grey '
                       '(it turns orange when it rings: the level\'s task), a grey cloth (never white: white is an edge to stand on), no yellow, no red',
                       scene='a thin blue wooden boardwalk with a white top edge sticking out of the wall'),
    'fuji-beasts': dict(world='fuji', kind='prop', what='a Japanese serow (kamoshika, a stocky goat-antelope with short black horns and a shaggy coat) and a red fox, the wild animals of Mount Fuji, '
                        'cute, standing on snowy rocks: in every cell the serow on the left and the fox on the right, the same style for both',
                        where='standing on the top of a ledge at its wall end', material='shaggy fur, short horns, a bushy tail, a little snow on their backs',
                        size='the serow about 1.6 tiles long and 1.3 tiles tall, the fox about 1.2 tiles long and 0.8 tiles tall',
                        inks='the serow grey with black horns and dark face marks, the fox orange with a grey tip to its tail (never white: white is an edge to stand on; never red: red is danger), black eyes',
                        scene=FUJI_AT),
    'fuji-post': dict(world='fuji', kind='prop', what='a wooden station post of the Mount Fuji trail (a gome post): a tall square timber post with a pointed or capped top marking the station',
                      where='standing on the top of a ledge, by the way out of a level', material='a square timber post, painted kanji down its face, a little roof cap or a pointed top, snow on top',
                      size='about 0.45 tiles wide and 2.2 tiles tall', inks='the post orange or grey wood, the kanji black, the snow on its top grey with white glints',
                      text='the kanji 八合目 (the eighth station), written top to bottom', scene=FUJI_AT),
    'fuji-stelae': dict(world='fuji', kind='prop', what="the stone monuments of the Fuji-ko pilgrims' confraternities: a cluster of upright carved stelae of different heights with a thick "
                        'shimenawa rope and zigzag paper streamers (shide) tied across them', where='standing on the top of a ledge at its wall end',
                        material='carved stone, a twisted rope, zigzag paper strips, snow on their tops', size='about 2 tiles wide and 1.8 tiles tall',
                        inks='grey stone with black carved lines, the rope grey (never yellow: yellow is what you take), the paper strips grey (never white: white is an edge to stand on), snow grey with white glints',
                        scene=FUJI_AT),
    'fuji-larch': dict(world='fuji', kind='prop', what='a bare Japanese larch (karamatsu) at the tree line of Mount Fuji in winter: no needles at all, its crooked trunk and branches bent by the wind '
                       'all to one side, snow and rime on its branches', where='growing out of the top of a ledge at its wall end', material='bare twisted wood, snow, rime',
                       size='about 2.5 tiles wide and 3 tiles tall', inks='the trunk and branches orange or grey wood, the snow and rime on them grey with white glints, no green at all', scene=FUJI_AT),
    'fuji-tent': dict(world='fuji', kind='prop', what="a small mountaineer's tent pitched in the snow, cosy and cute: a dome or a ridge tent with guy lines to stakes, lit warm from inside "
                      'by a lantern (no flame showing), boots or an ice axe by its door', where='pitched on the top of a ledge at its wall end',
                      material='tent fabric, poles, guy lines, snow banked round its foot', size='about 2.5 tiles wide and 1.5 tiles tall',
                      inks='the tent orange or purple (never red: red is danger; never yellow: yellow is what you take), its doorway glowing warm orange, the guy lines grey, snow grey with white glints',
                      scene=FUJI_AT + ' and a little snow rabbit (a mound of snow with ears of snow, orange berry eyes) beside the tent'),
    'fuji-shop2': dict(world='fuji', kind='prop', what="a Mount Fuji mountain hut (yama-goya) open as a shop: low and sturdy, its walls of corrugated iron and old timber, big stones weighing "
                       "down its roof against the wind, a dry-stone wall round its foot, a red noren curtain in its doorway (red is the shop's mark), a warm lit window",
                       where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play', material='corrugated iron, timber, stones on the roof, a dry-stone foot, snow on the roof',
                       size='about 3.4 tiles wide and 2.5 tiles tall', inks="blue or grey corrugated walls, grey stones, a red noren with a simple face on it (the shop's mark), a warm orange window with a dither halo, snow grey with white glints",
                       scene=FUJI_AT),
    'fuji-stash2': dict(world='fuji', kind='prop', what="a Mount Fuji mountain hut shut for the winter: its windows boarded up with wooden shutters, stones on its roof, snow drifted against "
                        "it, its door ajar a crack in the middle, a purple glow leaking through the gaps of the boards and the crack (purple is the stash's mark)",
                        where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its door facing the play', material='corrugated iron, boards nailed across, stones on the roof, snow drifts',
                        size='about 3.4 tiles wide and 2.5 tiles tall', inks='blue or grey corrugated walls, grey boards, grey stones, purple light through the gaps and the crack of the door, snow grey with white glints',
                        scene=FUJI_AT),
    'fuji-kasa': dict(world='fuji', kind='prop', what='Mount Fuji far away wearing a kasagumo, a lens-shaped cap cloud sitting on its summit like a hat, the long bank of cloud across its waist below; '
                      'the clouds in living shapes: uneven round bumps, holes of the dark in them, ragged strands trailing off, never neat ellipses',
                      where='far behind everything, filling the width of the shaft, low and faint, so the play reads over it', material='the mountain, snow, clouds', plane='back',
                      size='about 14 tiles wide and 7 tiles tall', inks='the mountain in a faint blue dither on the black, its snowy top grey, the clouds a faint grey dither', scene=FUJI_AT + ' in front of it'),
    'fuji-lake': dict(world='fuji', kind='prop', what="Mount Fuji far away seen across Lake Kawaguchi at night: the mountain's cone, its upside-down reflection in the still lake below it, "
                      "the far shore with a small town's lit windows and their reflections in the water, a few bare trees on the shore",
                      where='far behind everything, filling the width of the shaft, low and faint, so the play reads over it', material='the mountain, snow, the lake, the shore, little lit windows', plane='back',
                      size='about 14 tiles wide and 8 tiles tall', inks="everything a faint dim tone: the mountain a blue dither, its snow grey, the lake black with the reflection a fainter blue dither "
                      "broken by ripples, the town's windows small orange lights (a light may be lit), the shore grey", scene=FUJI_AT + ' in front of it'),
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
    # The Village from the Iya Valley (Tokushima, Shikoku) in spring, round 2 (owner 2026-10-24: Д87 «В», Д89 «А», Д90 «В», Д93 «А», Д94 «А», Д95 «А»)
    'village-kaya': dict(world='village', kind='prop', what='kaya stacks of the Iya valley: silver grass (susuki) cut and stood in small cone-shaped stacks on a sloping field, '
                         'tied near the top, the way Nishi-Awa farmers keep it to lay on their fields', where='two or three stacks standing on the top of a ledge',
                         material='dry grass stems, a straw tie, a few loose stems', size='each stack about 0.8 tiles wide and 1.3 tiles tall',
                         inks='pale straw in grey and orange dither with darker stems, a black tie (never yellow: yellow is a coin; never white: white is an edge to stand on)',
                         scene=VILLAGE_AT),
    'village-koirope': dict(world='village', kind='prop', what="koinobori strung on a rope across a gorge, as over the river at Oboke in spring: a row of carp streamers "
                            "hanging from one rope from wall to wall, flying in the wind", where='a thin rope from one wall of the shaft to the other, high over a ledge',
                            material='cloth carps with big round eyes, a thin rope', size='the rope across the whole 14-tile shaft, each carp about 1.5 tiles long',
                            inks='carps in black, orange and blue with scale patterns in grey or black, black eyes in grey rings (no white, never red), a thin grey rope',
                            scene=VILLAGE_AT),
    'village-beasts': dict(world='village', kind='prop', what='the wild animals of the Iya valley, cute: a Japanese macaque sitting, a sika deer standing and a wild boar '
                           'snuffling, in every cell the three side by side, the macaque left, the deer in the middle, the boar right, the same style for all three',
                           where='standing on the top of a ledge', material='fur, little hooves, a stubby tail, the deer\'s small antlers',
                           size='the macaque about 0.9 tiles tall, the deer about 1.4 tiles long and 1.4 tiles tall, the boar about 1.3 tiles long and 0.8 tiles tall',
                           inks='the macaque grey with an orange face (never red: red is danger), the deer orange with grey spots (never white: white is an edge to stand on), '
                           'the boar dark grey and black, black eyes', scene=VILLAGE_AT),
    'village-statue': dict(world='village', kind='prop', what="the Peeing Boy statue of the Iya gorge: a small bronze statue of a little boy standing on the very edge of a "
                           "rock high over the gorge, peeing in a thin arc into the drop, cheeky and cute", where="on the top of a ledge at its free end, the arc falling past its edge",
                           material='weathered bronze, a little rock under his feet', size='the boy about 0.8 tiles tall, his rock about 1 tile wide',
                           inks='the bronze in grey with a blue-green patina dither (no white, never red), the arc single blue pixels', scene=VILLAGE_AT),
    'village-yamazakura': dict(world='village', kind='prop', what='a wild mountain cherry (yamazakura) of the Iya slopes in bloom: pale blossoms mixed with reddish-brown new '
                               'leaves, a tall uneven trunk, a few petals drifting', where='on the top of a ledge at its wall end',
                               material='a dark trunk with horizontal bark bands, clouds of blossom with new leaves among them', size='about 4 tiles wide and 5 tiles tall',
                               inks=SAKURA + ', the new leaves orange (never red), a grey or black trunk, falling petals single purple pixels', scene=VILLAGE_AT),
    'village-vinebridge': dict(world='village', kind='ledge', what='a kazurabashi, the vine bridge of the Iya valley woven from thick hardy-kiwi vines, its wooden slats '
                               'laid with wide gaps between them, its handrails and side nets of vines', does='a row of slats you stand on, that crumble a moment after you '
                               'touch them and come back a while later', material='thick twisted vines, rough wooden slats', size='5 tiles long, a third of a tile thick',
                               place='the bridge strung between the two walls of the shaft', main='grey',
                               vary='the vine ropes and how they twist, the slats and gaps, the side nets, its sag, how it is tied to the walls',
                               rule="Grey is this world's mark for what crumbles, so it is its main colour."),
    # round 2, batch 2 (owner 2026-10-24: Д91 «А», Д86 «А», Д94 «А»; the bonus caves Д97 «А», Д101 «А»)
    'village-soba': dict(world='village', kind='prop', what="an Iya soba shop, a way into the game's shop: a small old farmhouse of the Iya valley with a very thick, steep thatched "
                         "roof of silver grass on a stone base, a red noren curtain in its open doorway (red is the shop's mark), a round stone hand mill for buckwheat by the door, "
                         "a warm lit paper window", where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play',
                         material='thick thatch, dark old timber, a stone base, a stone mill, a noren', size='about 3.5 tiles wide and 3 tiles tall',
                         inks="an orange and grey thatch, dark grey or black timber with grey lines, a red noren with a simple white soba bowl on it (the shop's mark), a grey stone mill, "
                         "a warm orange window with a dither halo", scene=VILLAGE_AT),
    'village-cellar': dict(world='village', kind='prop', what="the way into the game's secret stash: the open floor of an old Iya farmhouse, its floorboards lifted to show a hatch down "
                           "into the cellar under the house, a ladder going down, a soft purple light glowing up out of it (purple is the stash's mark), sacks and jars at its rim",
                           where='built against the shaft wall at the wall end of a ledge: a low cut-away corner of a thatched house standing on the ledge, the hatch in its floor facing the play',
                           material='thick thatch, dark timber, lifted boards, a wooden ladder, sacks, a pickling jar', size='about 3.5 tiles wide and 2.5 tiles tall',
                           inks='an orange and grey thatch, dark grey timber, a purple glow with a dither halo coming up from the hatch, grey sacks, an orange jar', scene=VILLAGE_AT),
    'village-cellarroom': dict(world='village', kind='prop', what="the inside of the secret cellar under an Iya farmhouse, seen as one whole game screen: a room of packed earth, its back "
                               "wall lined with wooden shelves of pickling jars, sacks of buckwheat and potatoes, a ladder going up to the open hatch in the ceiling with a little light "
                               "falling through, thick timber posts and beams, roots in the earth walls, coins to collect hanging in the room",
                               plane='back', where='the whole room behind the play: its back wall and its posts; the ledges in it are wooden shelves and beams',
                               material='packed earth, timber, shelves, jars, sacks, roots, a ladder', size='the whole room, about 16 tiles wide and 26 tiles tall',
                               inks='a dark earth back wall in a faint orange and grey dither, dark grey timber, orange jars, grey sacks, a faint purple glow (the stash), gold coins',
                               scene=VILLAGE_AT + ' as a shelf in the room'),
    'village-far2': dict(world='village', kind='prop', what="the far view behind the shaft as the climb goes up the Iya valley, a different scene in each cell, left to right, top to bottom: "
                         "A the emerald river at the bottom of the gorge with a vine bridge across it, B the one-lane cliff road with a white guardrail along the gorge wall, "
                         "C old thatched farmhouses on stone bases clinging to the slope across the valley, D dry-stone terraces and steep little fields with cone stacks of cut grass, "
                         "E more farmhouses with a little shrine and wild cherry in bloom, wild wisteria hanging from the trees, F a dark forest of cedars in straight rows",
                         plane='back', where='far behind everything, low and faint, so the play reads over it', material='slopes, houses, terraces, trees, water',
                         size='about 14 tiles wide and 6 tiles tall', inks='a faint orange, a faint purple and a faint grey dither on the black, the river a faint aqua',
                         scene=VILLAGE_AT + ' in front of it'),
    'village-far3': dict(world='village', kind='prop', what="the far view behind the shaft high up the Iya valley, a different scene in each cell, left to right, top to bottom: "
                         "A a steep slope of tall silver grass in the wind, B a high ridge of low bamboo grass with a few wind-bent trees, C the rounded summit of Mount Tsurugi "
                         "with a tiny shrine and a stone marker, a sea of clouds below, D the gorge in morning mist, only ridges showing above it, E the far ridges of Shikoku "
                         "under the moon, F the valley seen from the summit at dawn",
                         plane='back', where='far behind everything, low and faint, so the play reads over it', material='slopes, grass, ridges, clouds, mist',
                         size='about 14 tiles wide and 6 tiles tall', inks='a faint orange, a faint purple and a faint grey dither on the black, mist in a faint grey dither',
                         scene=VILLAGE_AT + ' in front of it'),
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
    # Koschei's arena (owner 2026-10-21: his arena dark, «Сделать тёмной»; its dressing Worlds'): the oak of the tale with his death in it
    'skazka-oak': dict(world='skazka', kind='prop', what="the old oak of the tale on which Koschei's death is kept: a huge gnarled dead oak, an iron-bound chest hanging on "
                       'chains from its big branch (in the chest a hare, in the hare a duck, in the duck an egg, in the egg the needle)', plane='back',
                       where="far behind Koschei's arena, standing on its floor at one side, as part of the back, so the play reads over it",
                       material='an old oak with clawing branches and roots, an iron-bound wooden chest, chains', size='about 6 tiles wide and 8 tiles tall',
                       inks='a faint grey dither on the black for the oak, the chest grey with black iron bands, grey chains; at most a pair of eyes glowing orange in a hollow',
                       scene=SKAZKA_AT + ' in front of it'),
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
    # (owner 2026-10-21: Koschei's fight «b»: he dives, falls apart into a heap of bones, rebuilds; the last heart the broken needle)
    'boss-koschei': dict(world='skazka', kind='boss', what='Koschei the Deathless, the boss of the Dark Forest (c8-10)',
                         as_what='Koschei the Deathless, the bony sorcerer-king of the Russian tales, whose death is hidden far away in a needle',
                         does='he hovers high in the middle of the shaft, swaying in his tattered cloak, dropping bones and calling small skulls; then he shakes over the hero, '
                         'dives straight down into the middle of the floor and falls apart into a heap of bones a moment: a stomp from above hurts him then; then his bones '
                         'fly together again with a warning and he rises; his last heart is the needle his death is hidden in, and it breaks.',
                         size='about 5 tiles across and 5 tiles tall: at least twice the hero both ways, his cloak spread and his arms out',
                         place='hovering in the middle of the shaft, a bare crooked ledge below it at each side (none in the middle, where he dives), the hero on the floor below, '
                         'and behind him only the plain black night: no trees, no branches, nothing in the background',
                         main='grey', parts='a spiked iron crown, a long tattered cloak spread like wings, a sword, a staff or a spear, a long beard, bony hands with long fingers, as each take has them',
                         takes='three different takes on him, two cells each',
                         yokai='A and B: the bony king, a tall skeleton in a spiked iron crown and a long tattered black cloak spread wide like wings, a curved sword held out; '
                         'C and D: the gaunt sorcerer, a withered old king with a long grey beard and sunken glowing eyes under a tall crown, his robe billowing, long clawed '
                         'fingers spread; E and F: the deathless warrior, a skeleton in old chain armour and a spiked helmet-crown, a torn cape behind him, a long spear held out.',
                         pairs='Each pair is a different take on him, and none is a plain round blob: each reads at a glance as Koschei, a deathless skeletal king.',
                         face='a skull or a gaunt face whose eyes glow as two small orange lights (in this dark world they are what the eye finds first) under an angry brow',
                         body='a body that can fall apart into a heap of bones and fly together again, drawn bold: thick bones, his cloak, robe and armour in flat grey #c8c8c8 '
                         'shaded only with black in the game\'s dither patterns, never in dark greys, with a few rigid parts round it: a spiked iron crown, a long tattered '
                         'cloak spread like wings, a sword, a staff or a spear, a long beard, bony hands with long fingers, as each take has them',
                         tone='Creepy and crooked, never gory: the game is for everyone.',
                         rule='In this world everything is black, white and grey but the hero, the lights, the coins and danger: his bones and clothes grey and black, white only '
                         'for tiny glints; his eyes orange, as small lights; red only on what hurts, his blade and the spikes of his crown.'),
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
# A world's own hazard from below (owner 2026-10-24, К13 «А»: each world's own reason why the floor rises; the look is Worlds', the fire's mechanics stay)
HAZARD = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night, and from below the shaft fills with what chases it.
{refnote}The rising hazard of the world "{world}" ({mood}): {what}. Why it rises here: {why}. It fills the shaft from wall to wall and rises from below; touching it hurts; now and then it throws a burst of itself up the shaft.
Its size: wall to wall across the shaft; its top edge is what the hero must keep above, and below that edge it fills down past the bottom of the cell; {grid}
Draw six different design variants of this same hazard in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft's two walls as thin vertical strips at the left and right edges of the cell ({ink_name} dithered with black, a white inner edge), the hazard filling the lower third of the cell from wall to wall, a ledge with a white top edge above it with the hero standing on it for scale ({hero_scale}), and one burst of the hazard thrown up the shaft beside the ledge.
Keep in every variant: a top edge that reads at a glance as danger, a line of red along it (red means danger); the hazard brightest at its top and darker downwards through dither; alive, drawn as one frame of its movement.
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Any glow is a dither too. Use only these colours: {inks9}. The world's own colour is {ink}. The hazard's colours: {inks}. White only for the hero, the ledge's top edge and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
# A world's hazard on its walls (FIREWALL in the game: a stretch of wall that sleeps, glows, then bursts out a tile into the shaft and hurts) and what falls
# from under its ledges (icicles); both drawn from these sheets' own pixels (owner 2026-10-24: «Обнови все природные опасности…»)
WALLHAZ = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}A hazard on the shaft's walls in the world "{world}" ({mood}): {what}. Why it is there: {why}. A stretch of the wall about 3 tiles tall sleeps, then bursts out about one and a half tiles into the shaft for a moment and hurts whoever is in it, then sleeps again.
{grid}
Draw six different design variants of this same hazard in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft's left wall as a strip about 1 tile wide down the left edge of the cell ({ink_name} dithered with black, a white inner edge), and on that wall the same hazard twice, one above the other: in the upper half of the cell the stretch asleep ({asleep}), in the lower half the same stretch bursting ({bursting}), reaching about one and a half tiles out into the shaft. At the right of the cell the hero for scale on a small ledge with a white top edge: {hero_scale}. Nothing else in the cell.
Keep in every variant: the sleeping stretch quiet but plainly marked, so a player sees which part of the wall it is; the bursting stretch reading at a glance as danger, with red in it (red means danger).
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Any glow is a dither too. Use only these colours: {inks9}. The world's own colour is {ink}. The hazard's colours: {inks}. White only for the hero, the ledge's top edge and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
DROP = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}A falling hazard of the world "{world}" ({mood}): {what}. It hangs under a ledge; when the hero passes under it, it shakes for a moment, then falls straight down and hurts whoever it hits, and breaks on what it lands on.
Its size: {size}; {grid}
Draw six different design variants of this same hazard in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, a ledge with a white top edge across the upper part of the cell ({scene}), three of them hanging under it side by side, a fourth one falling in the middle of the cell, and the hero for scale standing on a ledge at the bottom: {hero_scale}.
Keep in every variant: the same size, a point or a weight at its bottom that reads as "this falls and hurts", red in it (red means danger).
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. Its colours: {inks}. White only for the hero, the ledges' top edges and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
# The thing an arena's waiting wave hides in (К8 «А», the Level Design Book: an ambush is fair when it can be seen first): over the arena's floor from the
# start, it shakes as the wave is shown and empties as it drops (lv.arenas floor, warnAt, dropAt)
HOLDER = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}A thing of the world "{world}" ({mood}) in which a wave of enemies waits over an arena: {what}. It hangs over the middle of a wide floating ledge from the start of the level, so a player sees there is something in it; when the hero lands on the ledge it shakes, then it opens or tips and the enemies drop out onto the ledge. The enemies are small round red blobs.
Its size: {size}; {grid}
Draw six different design variants of this same thing in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner.
Each cell is a scene from the game: {night}, the shaft's walls as thin strips at the cell's left and right edges ({ink_name} dithered with black, a white inner edge), a wide floating ledge with a white top edge across the lower third of the cell ({scene}), the hero standing on it for scale ({hero_scale}), and above the ledge the same thing three times side by side: on the left full and still, in the middle shaking with a red blob peeking out, on the right opened or tipped and empty with two red blobs falling from it.
Keep in every variant: the same size, a plain sign that something waits in it (eyes or a red glow in a gap), and nothing on it to stand on (no white top edge).
Vary between the variants: {vary}. Make the six clearly different from each other.
Build every variant from flat rectangles and a few circles: big simple shapes that read at a glance on a phone screen, no fine noise.
{style} Use only these colours: {inks9}. The world's own colour is {ink}. Its colours: {inks}. White only for the hero, the ledge's top edge and tiny glints; red only for danger; yellow only for things you can take. No perspective, no 3D, no text other than the six letters."""
BOSS = """Pixel-art design sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
{refnote}The boss of the world "{world}" ({mood}), drawn as {as_what}. It is in the foreground, the play itself: full colour.
Its fight: {does} Its size: {size}; {grid}
Draw six variants in a 3 x 2 grid of equal cells, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner: {takes}. {yokai} {pairs}
Each cell is a scene from the fight: {night}, the shaft wall as a thin vertical strip on the left ({ink_name} dithered with black, a white inner edge), {place}, the boss in flat side view at game scale, and the hero for scale: {hero_scale}.
Keep in every variant: the same size and the same fight, {main} as its main colour, {face}, and {body}. {tone}
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
Keep in every variant: the same size and the same way of moving, {main} as its main colour, eyes that glow as two small lights in the dark (in this dark world they are what the eye finds first), and a body that is one soft shape (in the game it squashes and wobbles) with a few rigid parts round it: {parts}. {foe_tone}
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
    boss = {'as_what': 'a Japanese yokai that belongs in this place', 'takes': 'three different yokai, two takes on each',
            'pairs': 'Each pair is a different creature, and none is a plain round blob: each reads at a glance as its yokai.',
            'face': 'a face that reads at a glance on a phone (big eyes, an angry brow, a mouth)',
            'body': f"a body that is one soft rounded shape (in the game it squashes and wobbles) with a few rigid parts round it: {e.get('parts', '')}",
            'tone': 'Cute and a little spooky, never gory: the game is for everyone.'}   # a boss's defaults (Koschei has his own: not a yokai, the Kolobok)
    out = {'ledge': LEDGE, 'prop': PROP, 'boss': BOSS, 'hero': HERO, 'foe': FOE, 'hazard': HAZARD, 'wallhaz': WALLHAZ, 'drop': DROP, 'holder': HOLDER}[e['kind']].format(**{'foe_tone': 'Creepy and crooked, never gory: the game is for everyone.', **slab, **boss, **e, 'hero_short': hero_short, 'hero_scale': hero_scale, 'world': name, 'mood': mood, 'ink': ink, 'ink_name': ink.split()[0], 'night': night, 'inks9': WORLD_INKS.get(e['world'], INKS9), 'text': text, 'plane': plane,
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
