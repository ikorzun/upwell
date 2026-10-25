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
    # The Mine's real place, Iwami Ginzan (owner 2026-10-24, Д114–Д120 all «А»; research/mine/mine-attributes.md): round 2, six takes on each pick
    'iwami-far1': dict(world='mine', kind='prop', what="the far view behind the shaft as the climb goes up out of the Iwami Ginzan silver mine, a different scene in each cell, "
                       "left to right, top to bottom: A the flooded lowest drift, black water standing in a low tunnel cut by hand, B the drainage shaft going up, a wooden ladder "
                       "and a hand windlass with a rope and a bucket, C the great cavern of Okubo mabu, a huge hollow in the mountain with log scaffolds up its walls, "
                       "D narrow side drifts chasing a vein of silver, a man's width each, chisel marks on their walls, E the bats' hall, bats hanging in rows from its ceiling, "
                       "F a later drift shored up with log frames and laid with rails",
                       plane='back', where='far behind everything, low and faint, so the play reads over it; in the dark levels seen only near the lamps',
                       material='hand-cut rock, black water, logs, ladders, rails', size='about 14 tiles wide and 6 tiles tall',
                       inks='a faint grey dither on the black in big flat shapes (no fine speckle), the water a faint blue, a lamp a small orange glow',
                       scene=MINE_AT + ' in front of it'),
    'iwami-far2': dict(world='mine', kind='prop', what="the far view behind the shaft near the top of the Iwami Ginzan silver mine, a different scene in each cell, left to right, top "
                       "to bottom: A a niche with a little shrine of the mountain god, an oil dish burning in front of it, B the arched stone mouth of a mabu opening onto the forest, "
                       "C the forested mountain Sennoyama under the night sky with the tiled roofs of Omori town at its foot, D the shrine niche again, seen another way, "
                       "E the mabu mouth again, seen from inside looking out, F the mountain and the town again, from higher up",
                       plane='back', where='far behind everything, low and faint, so the play reads over it', material='hand-cut rock, a shrine, a stone arch, forest, roofs',
                       size='about 14 tiles wide and 6 tiles tall',
                       inks='a faint grey dither on the black in big flat shapes (no fine speckle), the forest a faint green, the roofs a faint orange-brown (never red), the oil flame a small orange glow',
                       scene=MINE_AT + ' in front of it'),
    'iwami-slab': dict(world='mine', kind='ledge', what='the basic ledge, a shelf of hard rock cut by hand with chisel and hammer, as in the Ryugenji mabu of Iwami Ginzan',
                       does='solid on every side: you stand on it, cling to its sides and jump off it',
                       material='hard grey rock, its faces covered in small chisel marks in rows, here and there an old log prop under it',
                       size='4 tiles long and 1 tile thick', main='grey (the rock)', rule=MINE_INKS,
                       vary='its rock silhouette and underside, the pattern of chisel marks (rows of short strokes, cross strokes, little scalloped hollows, a few cracks '
                       'between big flat planes), whether a log props it (none, a short wedge, a post going down), and one small detail (a miner\'s mark, a tiny niche, a trickle of water)'),
    'iwami-lamp': dict(world='mine', kind='prop', what='the oil lamp of the Edo-period miners of Iwami Ginzan, drawn twice in each cell: unlit (cold and grey) on the left and '
                       'lit on the right, as the hero lights it by coming near; one kind in each cell: A a little unglazed clay dish of oil with a wick in a niche cut in the rock, '
                       'B the same dish on a short iron spike driven into the rock, C a turban shell (sazae) filled with oil, D a clay dish on a small wooden shelf with a soot mark '
                       'above it, E a dish on a forked iron holder, F a dish in a deep arched niche',
                       where='set in the shaft wall over a ledge', material='unglazed clay, oil, a wick, rock, iron', size='about 0.7 tiles wide and 0.8 tiles tall',
                       inks='grey clay and rock; lit, its flame orange with a yellow core and a dither halo of orange round it: a light of the dark; unlit, all grey and black',
                       scene=MINE_AT + ' below it'),
    'iwami-water': dict(world='mine', kind='wallhaz', what='groundwater breaking out of a crack in the rock wall of the old silver mine',
                        why='as the drifts went deeper, water under pressure burst from the rock; it flooded the mine, and drainage tunnels were dug against it',
                        asleep='a dark crack in the rock wall, wet, a few drops seeping out of it', bursting='a thin jet of water under pressure blasting straight out of the crack, '
                        'spraying (not a wide spout like a blowhole)',
                        vary='the crack (a jagged split, a row of holes, a seam along the rock layers), its seeping, the jet\'s shape (a straight needle, a fan of spray, a rope '
                        'of water that bends down)', inks='the water blue, its spray grey (never white), red along the jet\'s edge where it hurts, the crack black, the rock grey'),
    'iwami-baskets': dict(world='mine', kind='prop', what='the ore carriers\' baskets of Iwami Ginzan: woven straw or bamboo baskets heaped with broken ore, the kind carried on the back',
                          where='on the top of a ledge at its wall end', material='woven bamboo and straw, rope straps, broken grey ore',
                          size='about 1.5 tiles wide and 1 tile tall', inks='grey and dark grey weave, the ore grey with a few white glints (never yellow)', scene=MINE_AT),
    'iwami-windlass': dict(world='mine', kind='prop', what='a hand windlass over a drainage shaft of Iwami Ginzan: a timber frame, a drum with a crank, a rope down to a wooden bucket',
                           where='on the top of a ledge at its wall end', material='old timber, rope, a wooden bucket', size='about 2 tiles wide and 2.5 tiles tall',
                           inks='grey timber and rope, black shadows, a drop of blue water at the bucket', scene=MINE_AT),
    'iwami-shrine': dict(world='mine', kind='prop', what='a little shrine of the mountain god in the mine: a small wooden hokora with a tiny roof, a shimenawa rope with paper '
                         'streamers (shide) over it, an oil dish burning in front of it',
                         where='on the top of a ledge at its wall end', material='old wood, a straw rope, white paper, a clay dish',
                         size='about 1.5 tiles wide and 1.5 tiles tall', inks='grey and dark grey wood, white paper streamers, a small orange flame with a dither halo (never red)',
                         scene=MINE_AT),
    'iwami-rakan': dict(world='mine', kind='prop', what='one of the five hundred stone rakan (arhats) of Rakan-ji at Iwami Ginzan, carved in memory of the miners: a small seated '
                        'stone figure with a calm face, in a niche cut in the rock',
                        where='in the shaft wall beside a ledge, or on the top of a ledge at its wall end', material='worn grey stone, a rock niche, a little moss',
                        size='about 1 tile wide and 1.2 tiles tall', inks='grey stone, a dark niche, a touch of green moss (tiny)', scene=MINE_AT),
    'iwami-silver': dict(world='mine', kind='prop', what='a wooden box of silver ingots from Iwami Ginzan, bound with rope, its lid ajar, the ingots inside stamped and gleaming',
                         where='on the top of a ledge at its wall end', material='old wood, rope, silver ingots', size='about 1.5 tiles wide and 1 tile tall',
                         inks='grey wood and rope, the silver white and pale grey with small glints (never yellow, the coins\' colour)', scene=MINE_AT),
    'iwami-shop': dict(world='mine', kind='prop', what="a merchant's house of Omori town at the foot of Iwami Ginzan, a way into the game's shop: a two-storey wooden front with "
                       "lattice windows, roofed with the glazed sekishu roof tiles of the region, a red noren curtain in its open doorway, a white plaster storehouse wall beside it",
                       where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play',
                       material='dark old timber, wooden lattice, glazed roof tiles, white plaster, a noren', size='about 3.5 tiles wide and 3 tiles tall',
                       inks="the roof tiles orange-brown (never red: red is danger), dark grey timber with grey lattice, a red noren with a simple white coin on it "
                       "(the shop's mark), white plaster, a warm orange window with a dither halo", scene=MINE_AT),
    'iwami-stash': dict(world='mine', kind='prop', what="the way into the game's secret stash: the arched stone mouth of an old mabu (mine tunnel) of Iwami Ginzan cut in the rock, "
                        "a soft purple light glowing deep inside from the rich silver ore (fukuishi)", where='cut into the shaft wall at the wall end of a ledge, standing on the ledge',
                        material='hand-cut rock, a stone or timber arch, a straw rope across it', size='about 3 tiles wide and 3 tiles tall',
                        inks='grey rock and timber, a purple glow with a dither halo from inside (purple is the stash\'s mark)', scene=MINE_AT),
    'iwami-stashroom': dict(world='mine', kind='prop', what="the inside of the secret stash under Iwami Ginzan, seen as one whole game screen: the fukuishi chamber, a hollow cut "
                            "by hand where the rich silver ore was mined, its walls of chisel-marked rock with veins of ore glowing a soft purple, old log props, a ladder, "
                            "baskets of ore, coins to collect hanging in the room", plane='back',
                            where='the whole room behind the play: its back wall and its props; the ledges in it are rock shelves and log beams',
                            material='hand-cut rock, ore veins, logs, a ladder, baskets', size='the whole room, about 16 tiles wide and 26 tiles tall',
                            inks='a dark rock back wall in big flat faint grey shapes (no fine speckle), the veins a faint purple glow (the stash), dark grey logs, gold coins',
                            scene=MINE_AT + ' as a shelf in the room'),
    # Fuji's bonus caves from the real Narusawa Ice Cave (owner Д97 «А»: the lava tube with its ice pillars at the foot of the mountain; UPwell's rooms main 4cd9efa)
    'fuji-caveroom': dict(world='fuji', kind='prop', what="the inside of a secret bonus cave at the foot of Mount Fuji, the real Narusawa Ice Cave, seen as one whole game screen: "
                          "a lava tube with ropy black lava walls and ceiling, pillars of ice rising from the floor and icicles hanging from the ceiling, old wooden walkways and "
                          "steps, wooden shelves stacked with blocks of ice stored there since the Edo era, a faint blue cold light, coins to collect hanging in the room",
                          plane='back', where='the whole room behind the play: its back wall and its props; the ledges in it are lava rock shelves and ice',
                          material='black lava rock, ice, old wood', size='the whole room, about 16 tiles wide and 26 tiles tall',
                          inks='a dark lava back wall in big flat faint grey and blue shapes (no fine speckle), the ice white and faint blue, the wood faint orange, gold coins',
                          scene=FUJI_AT + ' as a shelf in the room'),
    'fuji-cavebells': dict(world='fuji', kind='prop', what='three temple bells of bronze hung in a row in an ice cave, big, middle and small, each on a short rope from a ledge above, '
                           'drawn twice in each cell: quiet (grey, still) on the left and just rung (glowing warm orange, swinging, rings of sound round it) on the right; a '
                           'bell is rung by the hero bumping it in the right order',
                           where='hanging under ledges in the cave', material='bronze, a straw rope', size='the big one about 1.6 tiles wide and 1.4 tall, the middle 1.3 by 1.1, '
                           'the small 1 by 0.85', inks='grey bronze, darker grey bands; rung, orange with a dither glow (never yellow, the coins\' colour); the rope grey',
                           scene=FUJI_AT + ' above them'),
    'fuji-caveledge': dict(world='fuji', kind='ledge', what='a ledge in the ice cave: a shelf of black ropy lava rock with a crust of ice and frost on it, small icicles under it',
                           does='solid on every side: you stand on it, cling to its sides and jump off it', material='black lava rock (pahoehoe ropes), ice',
                           size='4 tiles long and 1 tile thick', main='blue (the rock)', rule=FUJI_RULE,
                           vary='the lava\'s ropy texture and silhouette, the ice crust, the icicles under it (none, a few, a fringe), a wooden plank laid on it, frost'),
    'fuji-cavegate': dict(world='fuji', kind='prop', what='a wall of ice blocking a niche in the cave, stacked ice blocks like the ice the cave stored, cracked, with coins seen through it; '
                          'it melts away when the puzzle is solved', where='standing on a ledge against the cave wall, from the ledge up to the ledge over it',
                          material='clear blue ice blocks, frost, cracks', size='about 2 tiles wide and 3 tiles tall', inks='white and blue ice in big flat shapes, faint blue dither, '
                          'gold coins faint behind it', scene=FUJI_AT),
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
    # Ume, Mochi's friend of story card VI (the rainy Tokyo street by a vending machine): an umeboshi, a red pickled plum, round and soft like Mochi; he waits on
    # 5-3 by the vending machine, and comes along after the can (UPwell's bf03669); his look path A (UPwell's leaf a placeholder)
    'tokyo-ume': dict(world='tokyo', kind='hero', what="Ume, Mochi's friend: an umeboshi, a little red pickled plum come alive, round and soft like Mochi, a stalk with one "
                      "small green ume leaf on his crown, a kind gentle face; in story card VI he sits in the rain by a vending machine in a Tokyo backstreet",
                      size='1.8 tiles across, a little smaller than the hero', main='red #f43e34 (his own colour; in this game he is the one friendly red thing)',
                      scene='a Tokyo backstreet ledge in the rain at night, a glowing vending machine at the wall, Mochi (a white round blob) beside him for scale',
                      vary='his wrinkles (an umeboshi is wrinkled: soft dents in his skin), his leaf and stalk, his face (the eyes, a little smile, rosy cheeks), '
                      'a shine on him; nothing on him but himself: no hat, no arms, no legs'),
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

# The Sea from Enoshima, round 2 (owner 2026-10-24: Д140 «А» the place, Д141–Д148 what to take; research/sea/sea-attributes.md): six takes of each picked
# thing, for the game's code to cut or draw (Worlds, branch sea-real). Run with --ref research/variants/ref-sea.png: its world is the Sea's
WORLDS['enoshima'] = ('the Sea', 'the island of Enoshima in Sagami Bay, Japan, on a summer night, cosy and cute, kawaii, true to the real island as it is today '
                      'but without concrete: its sea-worn rock terrace of Chigogafuchi with tide pools, the Iwaya sea caves with candles and stone statues, '
                      'wooden walkways along the cliff, shrines among pines (their vermilion drawn orange), black kites in the sky, stray cats, the lighthouse on '
                      'its summit; no cars, no escalators, the harbour only far off', 'aqua #6fe0ee',
                      'white is wet rock you slip on (a whole block of it), green is seaweed you can hold on to, purple marks springs, rubber walls and the '
                      'stash, orange marks boats and planks that move, grey blocks crumble', 'the black summer night by the sea, nothing far off')
ENO_AT = 'an aqua rock ledge with a white top edge sticking out of the wall'
ENO_RULE = ('In this world white is wet rock you slip on, green is seaweed you can hold on to, purple marks springs and rubber walls, orange marks boats and planks '
            'that move and grey blocks crumble, so use those only for tiny details; never yellow (the coins\' colour) and never red (danger).')
ENO_FAR = ('each thing in one or two faint dim tones on the black in big flat shapes (no dither noise, no fine speckle): the sea a dim blue, rock a dim grey, '
           'pines and seaweed a dim green, foam a dim grey (never white), shrines and torii a dim orange (never red), the dragon a dim purple, candles, '
           'lamps and lit windows small orange glows; no white anywhere but the hero')
ELEMENTS.update({
    'eno-far1': dict(world='enoshima', kind='prop', plane='back', what="the far view behind the shaft as the climb goes up the island of Enoshima from the bottom of "
                     "Sagami Bay, a different scene in each cell, left to right, top to bottom: A the bottom of the bay under water: rocks, swaying kelp, spiky turban "
                     "shells (sazae), a moray eel looking out of a crack, a shoal of tiny whitebait; B the surf at the foot of the island's cliff, waves breaking on "
                     "black rocks, the little sightseeing boat Benten-maru going by with its lights; C the Chigogafuchi rock terrace, flat layered rock with tide "
                     "pools, two fishermen with long rods at its edge; D the mouth of the Iwaya sea cave in the cliff, deep inside it a dragon statue lit purple, "
                     "candles by it; E the passage of the first Iwaya cave, stone statues in niches along its wall, small candles at their feet; F wooden walkways "
                     "and stairs going up the cliff face, stone lanterns along them, black kites wheeling over the pines",
                     where='far behind everything, low and faint, so the play reads over it', material='rock, sea water, kelp, a boat, a cave, statues, candles, pines',
                     size='about 14 tiles wide and 6 tiles tall', inks=ENO_FAR, scene=ENO_AT + ' in front of it'),
    'eno-far2': dict(world='enoshima', kind='prop', plane='back', what="the far view behind the shaft near the top of the island of Enoshima, a different scene in each "
                     "cell, left to right, top to bottom: A over the cliff, the Ryuren bell (a bronze bell hung under a little roof) on a rock above the sea and the "
                     "Okutsumiya shrine among pines; B the summit: the brick ruins of the old Cocking greenhouse, arches and walls, palms and flowers round them, the "
                     "roofs of the shrines; C the summit at night: the Sea Candle lighthouse, a slim tower widening up to its lit lamp, over the pines, Mount Fuji "
                     "across the bay, the lights of the far shore; D the bell and the shrine again, seen from below the cliff; E the greenhouse ruins and palms "
                     "again, from closer, an arch in front; F the lighthouse and Fuji again, from further off: the island's dark green hump in the sea with the "
                     "lighthouse on it, Fuji behind",
                     where='far behind everything, low and faint, so the play reads over it', material='rock, pines, a bell, shrines, brick ruins, palms, a lighthouse, a mountain',
                     size='about 14 tiles wide and 6 tiles tall', inks=ENO_FAR + '; Fuji a dim blue, the bricks a dim orange, the lighthouse a dim aqua and grey with its lamp an orange glow',
                     scene=ENO_AT + ' in front of it'),
    'eno-slab': dict(world='enoshima', kind='ledge', what='the basic ledge, a shelf of the Chigogafuchi rock terrace at the foot of the Enoshima cliff: flat rock worn '
                     'by the sea and lifted out of it, in thin layers (strata), small tide pools of sea water in it',
                     does='solid on every side: you stand on it, cling to its sides and jump off it',
                     material='flat layered sandstone and tuff worn smooth by the sea, tide pools, barnacles, a limpet or a tiny turban shell',
                     size='4 tiles long and 1 tile thick', main='aqua (the rock)',
                     rule=ENO_RULE + ' The tide pools are a deep blue; the white top edge runs flat along its whole length (it is where you stand), so a pool sits in its face or just under that edge, never breaking it.',
                     vary='its layers (thin even strata, thick and thin bands, tilted strata, layers stepped back at its free end), how its tide pools sit (one long pool '
                     'just under the top edge, small round pools cut away in its face, water dripping off its end), its underside (flat, worn into scallops, notched, '
                     'eaten into holes by the waves) and one small detail (barnacles, a limpet, a turban shell, a tiny crab)'),
    'eno-plank': dict(world='enoshima', kind='ledge', what='a walkway to the Iwaya caves of Enoshima: a narrow deck of planks on brackets along the foot of the cliff, '
                      'a low railing of posts and rope beside it', does='a thin platform: you jump up through it from below and stand on it',
                      material='weathered wooden planks, timber posts, iron brackets, a rope railing', size='4 tiles long and a third of a tile thick, its railing at most half a tile high',
                      place='the walkway sticking out of that wall', main='aqua (painted wood)', rule=ENO_RULE,
                      vary='the planks and the gaps between them, the brackets or posts under it, how it is fixed to the wall, its railing (rope between short posts, a '
                      'single low rail, only a post at its free end, none) and the small details on it (a coil of rope, a small lantern hung under it, a float)'),
    'eno-boat': dict(world='enoshima', kind='ledge', what='the Benten-maru, the little sightseeing boat of Enoshima that carries people from the Benten bridge to the '
                     'Chigogafuchi rock terrace, as a moving platform', does='a thin platform that rides sideways along its row, from wall to wall and back, carrying '
                     'you; you jump up through it from below and stand on its top', material='a small boat: a flat canopy roof on posts over its open deck, benches, a '
                     'low hull with a rail, a life ring', size='6 tiles long; its flat roof is the top you stand on (a third of a tile thick, a white top edge), the deck '
                     'and the hull hang about 1.2 tiles under it', place='the boat in the middle of the shaft riding on a thin band of sea water that runs across the shaft',
                     main='orange (what moves is orange in this world)', rule="Orange is this world's mark for what moves, so it is its main colour; the hull and roof "
                     "orange with grey and black details, the windows or the open deck black, never red, no white but the roof's top edge.",
                     vary='the hull (a round bow, a sharp raised bow, a flat barge), the roof (a flat canopy on posts, a rounded canopy, a cabin with windows), the rail, '
                     'and the small details (a life ring, a small flag, a lantern, a name board, a wake at its stern)'),
    'eno-lighthouse': dict(world='enoshima', kind='prop', what="a small harbour lighthouse of the kind on the breakwaters round Enoshima, drawn twice in each cell: "
                           "unlit (dark) on the left and lit on the right, as the hero lights it by coming near; one kind in each cell: A a round tower narrowing up, "
                           "a gallery and a lamp room with a domed roof; B a square tower with a door and a small window; C a slender column on a round stone base; "
                           "D a tower shaped like a sail, as the light of Shonan harbour; E a short squat tower on a heap of breakwater blocks; F an open steel "
                           "lattice tower with the lamp on top", where='on the top of a ledge at its wall end', material='a painted tower, a glass lamp room, a small iron gallery',
                           size='about 1.2 tiles wide and 3.5 tiles tall', inks='the tower aqua with grey bands or grey parts (never red, never white for its body), its '
                           'door black; lit, its lamp orange with a yellow core and a dither halo of orange round it: a light of the dark; unlit, its lamp grey and black',
                           scene=ENO_AT + ' below them'),
    'eno-candle': dict(world='enoshima', kind='prop', what="the Enoshima Sea Candle, the lighthouse and lookout tower on the summit of Enoshima, lit: a slim tower that "
                       "widens upward like a candle's flame or a basket of ribs, a round lookout deck near its top, the lamp on its top", where='on the top of a ledge at its '
                       'wall end, at the top of the level', material='a steel and glass tower, a lookout deck, a lamp', size='about 3 tiles wide and 7 tiles tall',
                       inks='aqua and grey (never white, never red), the lamp and the deck\'s windows orange with a yellow core and a dither halo (a light)', scene=ENO_AT),
    'eno-kite': dict(world='enoshima', kind='prop', what='a black kite (tobi), the big bird of prey of Enoshima that snatches food out of people\'s hands, perched on a '
                     'wooden post, cute, looking out to sea', where="on a short post standing at a ledge's free end", material='feathers, a wooden mooring post',
                     size='the kite about 1.2 tiles tall, the post 1 tile tall', inks='a grey and black kite (its brown drawn grey, never red), its hooked beak and its '
                     'feet orange, a black eye; an orange post (no white)', scene=ENO_AT),
    'eno-sazae': dict(world='enoshima', kind='prop', what="a grill of sazae, spiky turban shells roasting in their own shells on glowing charcoal, as at the stalls at "
                      "the entrance to Enoshima (tsuboyaki): a small charcoal brazier or a low grill, three or four shells on its grate, steam rising from them",
                      where='on the top of a ledge at its wall end', material='an iron grate, a clay or iron brazier, charcoal, spiky shells',
                      size='about 1.8 tiles wide and 1.3 tiles tall with its steam', inks='grey shells with black spikes, the coals orange with a yellow core and a dither '
                      'halo (a light; never red), a grey or orange brazier, grey steam (no white)', scene=ENO_AT),
    'eno-cats': dict(world='enoshima', kind='prop', what="the stray cats of Enoshima asleep: two or three cats curled up together on an old stone step, a folded "
                     "cushion or a little wooden bench, cute", where='on the top of a ledge at its wall end', material='fur, an old stone step or a bench',
                     size='about 2.2 tiles wide and 1 tile tall', inks='cats in grey, orange and black (calico and tabby without white: white is the hero\'s), their '
                     'eyes shut; a grey step or an orange bench', scene=ENO_AT),
    'eno-rods': dict(world='enoshima', kind='prop', what="the fishermen's gear left on the Chigogafuchi rock terrace: two or three long fishing rods leaning on the wall "
                     "or standing in a holder, a bucket for the catch, a cooler box or a folding stool", where='on the top of a ledge at its wall end',
                     material='long thin rods and their lines, a bucket, a cooler box', size='about 2 tiles wide and 3 tiles tall with the rods',
                     inks='grey and black rods with orange tips, an aqua or blue bucket, a grey cooler with an orange lid (no white, no red)', scene=ENO_AT),
    'eno-shop': dict(world='enoshima', kind='prop', what="a shop on Nakamise street of Enoshima, the steep lane of old wooden shops up from the bronze torii, a way into "
                     "the game's shop: a two-storey wooden front, a deep tiled eave, a red noren curtain in its open doorway, a paper lantern hung by it, a lattice "
                     "window upstairs", where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play',
                     material='dark old timber, wooden lattice, roof tiles, a noren, a paper lantern', size='about 3.5 tiles wide and 3.5 tiles tall',
                     inks="dark grey timber, grey lattice and roof tiles, a red noren with a simple white coin on it (the shop's mark), the lantern lit orange with a "
                     "yellow core and a dither halo, a warm orange window", scene=ENO_AT),
    'eno-stash': dict(world='enoshima', kind='prop', what="the way into the game's secret stash: the dark arched mouth of the Iwaya sea cave in the Enoshima cliff, a "
                      "short wooden walkway leading into it, a soft purple light glowing deep inside from the dragon", where='cut into the shaft wall at the wall end of a '
                      'ledge, standing on the ledge', material='sea-worn rock, a wooden walkway, a rope railing', size='about 3 tiles wide and 3 tiles tall',
                      inks='grey rock with aqua details, the walkway grey and orange, a purple glow with a dither halo from inside (purple is the stash\'s mark)',
                      scene=ENO_AT),
    'eno-stashroom': dict(world='enoshima', kind='prop', plane='back', what="the inside of the secret stash under Enoshima, seen as one whole game screen: the Iwaya "
                          "sea cave, a low passage washed out by the waves, stone statues (seated Buddhas, small jizo) in niches along its walls, small candles burning "
                          "at their feet, and at the passage's far end the statue of the dragon lit purple; coins to collect hanging in the room",
                          where='the whole room behind the play: its back wall and its props; the ledges in it are rock shelves',
                          material='sea-worn rock, stone statues, candles, a dragon statue', size='the whole room, about 16 tiles wide and 26 tiles tall',
                          inks='a dark rock back wall in big flat faint grey shapes (no fine speckle), faint grey statues, the candles small orange glows, the dragon a '
                          'faint purple glow (the stash), gold coins', scene=ENO_AT + ' as a shelf in the room'),

    # The Sea's bonus caves' own things (UPwell's CAVES.sea, main a7055ea; their look is Worlds'): the clam shells that open a vault's gate, and the gate
    'eno-clam': dict(world='enoshima', kind='prop', what="a clam shell lying on a rock ledge in a sea cave, a switch: drawn twice in each cell, open on the left (its "
                     "upper valve lifted, the dark inside showing) and shut flat on the right (pressed down by the hero standing on it); one kind in each cell: A a "
                     "scallop (hotate) with fan ribs, B a hard clam (hamaguri), smooth with bands, C a giant clam with a wavy lip, D a rough oyster, E a long dark "
                     "mussel, F an ark shell with ribs", where='lying on the top of a ledge', material='shell', size='about 1 tile wide; open, about 0.8 tiles tall; '
                     'shut, a third of a tile tall', inks='a real shell\'s colours in our inks: orange, grey, blue or aqua with black ribs and lines; never red, never '
                     'yellow; white only along its top edge when it is shut (that is where you stand)', scene=ENO_AT + ' under them'),
    'eno-gate': dict(world='enoshima', kind='ledge', what="a gate shutting the way into a little vault of coins in the Iwaya sea cave of Enoshima; when a clam shell "
                     "somewhere in the cave is pressed it opens and is gone", does='a solid block standing in the vault\'s doorway: you can stand on its top, it blocks '
                     'the way in till it opens', material='sea rock, wood, rope, glass floats, coral', size='2 tiles wide and 4 tiles tall',
                     place='the gate standing on the rock floor in the doorway of a little vault in the cave wall, a few gold coins faint behind it',
                     main='aqua or grey', rule=ENO_RULE + ' Its top edge white (you stand on it), no other white.',
                     vary='what it is: A a wall of stacked sea-worn rock blocks, B the wooden door of a sunken shrine with a shimenawa rope across it, C a fishing '
                     'net of rope stretched over the doorway, glass floats caught in it, D a wall of barnacled stones and coral, E a gate of driftwood logs lashed '
                     'with rope, F a big stone slab carved with waves; and how it shows it will open (a crack, a knot, a seam of light)'),
})

# Tokyo from Shinjuku Golden Gai, round 2 (owner 2026-10-24: Д150 «А» the place, Д151–Д158 what to take; research/tokyo/tokyo-attributes.md): six takes of
# each picked thing, for the game's code to cut or draw (Worlds, branch gai-real)
GAI_PLACE = ('in Shinjuku Golden Gai, the tiny Tokyo quarter of some two hundred little bars in two-storey wooden houses along six narrow alleys, '
             'steep stairs up to the second floors, lightboxes on iron arms, paper lanterns, noren curtains, tin awnings, meters and pipes on the walls')
GAI_AT = 'a purple wooden ledge with a white top edge sticking out of the wall'
GAI_RULE = ('In this world blue marks moving platforms and grey chequered blocks crumble, so use those only for small details; never yellow (the coins\' colour) '
            'and never red (danger).')
GAI_FAR = ('a faint dim tone of each ink on the black in big flat shapes (no dither, no fine speckle), the houses and roofs a dim purple and grey, lanterns and lit '
           'windows a small orange glow (never red, never yellow), trees a dim green, nets a dim blue')
ELEMENTS.update({
    'gai-far1': dict(world='tokyo', kind='prop', plane='back', what="the far view behind the shaft as the climb goes up through Shinjuku Golden Gai, a tiny quarter of "
                     "two-storey wooden bars along narrow alleys, seen flat like a doll's house cut open, a different scene in each cell, left to right, top to bottom: "
                     "A the Shiki-no-michi promenade at the quarter's edge, a winding paved path under trees, the old rails of the No. 13 tram showing under its paving; "
                     "B the ground of an alley: stacked plastic crates, bins, rubbish bags under a blue crow net, a manhole cover, a crow; "
                     "C the ground floors of the bars: short noren curtains, round paper lanterns, narrow doors covered in stickers, small signs; "
                     "D a tiny bar cut open: one counter, five round stools, plain jars on a shelf, a steep stair going up beside it; "
                     "E the second floors: warm lit windows, small lightboxes on iron arms over the alley; "
                     "F the roofs: corrugated tin roofs, water tanks on legs, a TV antenna, a utility pole with sagging wires and two crows on them",
                     where='far behind everything, low and faint, so the play reads over it', material='old wood, tin, paper, plastic, wires',
                     size='about 14 tiles wide and 6 tiles tall', inks=GAI_FAR, scene=GAI_AT + ' in front of it'),
    'gai-far2': dict(world='tokyo', kind='prop', plane='back', what="the far view behind the shaft near the top of Shinjuku Golden Gai, a different scene in each cell, "
                     "left to right, top to bottom: A the Tori-no-ichi fair at Hanazono shrine on a November night: a tall wall of glowing paper lanterns in rows, "
                     "stalls under awnings hung with big kumade rakes of good luck; B over the low roofs of the quarter: the dark trees of Hanazono shrine and the top "
                     "of its torii among them, the glow of the city far off on the clouds; C the open night sky over the quarter: a big moon, a few long clouds, stars, "
                     "only the last roof edges and wires along the very bottom; D the fair again, seen another way: the shrine's steps between two walls of lanterns, "
                     "a stall of rakes; E the shrine's trees and the torii again, nearer, a stone lantern; F the night sky again, the moon half behind a long cloud, "
                     "a crow flying", where='far behind everything, low and faint, so the play reads over it',
                     material='paper lanterns, stalls, kumade rakes, trees, a torii, the moon, clouds', size='about 14 tiles wide and 6 tiles tall',
                     inks=GAI_FAR + '; the torii orange (never red); the kumade rakes orange and purple (never yellow: gold is what you take)',
                     scene=GAI_AT + ' in front of it'),
    'gai-eave': dict(world='tokyo', kind='ledge', what='the basic ledge ' + GAI_PLACE + ': a wooden eave of a bar\'s second floor, or a tin awning over a bar\'s door, '
                     'sticking out of the shaft wall', does='solid on every side: you stand on it, cling to its sides and jump off it',
                     material='old timber boards and rafters, or corrugated tin sheet on iron brackets', size='4 tiles long and 1 tile thick',
                     main="purple (the world's own colour: the wood and the tin)", rule=GAI_RULE,
                     vary='three wooden eaves (A rafter ends in a row under its board edge, B a deep eave with a gutter along its front, C an eave on two wooden '
                     'brackets with a hook under its free end) and three tin awnings (D corrugated tin on two iron brackets, E a tin hood bent down at its free end, '
                     'F patched tin sheets over an old wooden frame): their silhouettes, undersides and how they are fixed to the wall'),
    'gai-signboard': dict(world='tokyo', kind='ledge', what="a thin platform hanging free across the alley " + GAI_PLACE + ": a long wooden sign-board of a bar, "
                          'hung on two wires from somewhere above', does='a thin platform: you jump up through it from below and stand on it',
                          material='painted wood or tin in a thin frame, two wires', size='4 tiles long and a third of a tile thick',
                          place='the board in the middle of the shaft, clear of the wall, its two wires going up out of the cell', main='purple or grey (old painted wood)',
                          rule=GAI_RULE + ' Its face carries no letters: only a few plain glyph blocks (squares, circles, bars) in another ink.',
                          vary='the board\'s shape and edges, its frame, the plain glyph blocks on its face, how the wires hold it (rings, hooks, a short chain, a crossbar)'),
    'gai-pulley': dict(world='tokyo', kind='ledge', what="a moving platform " + GAI_PLACE + ": a blue plastic crate hung on ropes from a little pulley that runs along "
                       'a rope stretched across the alley, the way crates of drinks are hauled up to a bar\'s second floor',
                       does='a thin platform that rides sideways along its row, from wall to wall and back, carrying you; you jump up through it from below and stand on it',
                       material='a plastic crate, rope, an iron pulley wheel', size='3 tiles long and half a tile thick, its ropes going up to the pulley about 2 tiles over it',
                       place='the crate hanging in the middle of the shaft on its ropes, the pulley on a rope across the shaft above it', main='blue (blue marks platforms that move)',
                       rule="Blue is this world's mark for what moves, so it is its main colour; grey only for the ropes and the pulley; never yellow and never red.",
                       vary='the crate (a beer crate with handholds, a slatted crate, a crate with plain round jars in it, two crates side by side, a crate on a board), '
                       'the pulley (one wheel, a block of two wheels, a hook on a trolley) and how the ropes hold the crate'),
    'gai-lightbox': dict(world='tokyo', kind='prop', what='the lightbox of a little bar of Golden Gai, a small box sign on an iron arm sticking out of the wall over the alley, '
                         'drawn twice in each cell: unlit (dim grey) on the left and lit on the right, as the hero lights it by coming near; its face shows the bar\'s name '
                         'as a few plain glyph blocks (squares, circles, triangles, bars), never letters',
                         where='hanging off the shaft wall on its iron arm, a tile or two over a ledge', material='a sheet-metal box with a frosted face lit from inside, an iron arm and brackets',
                         size='about 1.2 tiles wide and 1.8 tiles tall, its arm about 1 tile long',
                         inks='unlit: the box grey and black, its glyph blocks dark; lit: its face white, purple, aqua or blue with the glyph blocks in another of those, a dither '
                         'halo of the face\'s ink round it (never red, never yellow, never orange); the arm grey',
                         scene=GAI_AT + ' below it'),
    'gai-panel': dict(world='tokyo', kind='wallhaz', what='an old electrical panel on the wooden wall of a bar in Golden Gai, its meter and its fuses, shorting out and spraying sparks',
                      why='the old wooden quarter is wired with tangled cables and worn-out fuse boxes; as the fire climbs the shaft, the panels short out and spit sparks',
                      asleep='a narrow upright grey metal panel flush on the wall, only 10 art pixels wide and about 28 tall, a meter dial on it, cables up and down, quiet, a few dark scorch marks',
                      bursting='a short dense spray of sparks and arcs bursting out of the front of the panel, only 12 art pixels long (here it reaches 0.7 tiles, not one and a half), '
                      'its outer tips and edges red',
                      vary='the panel (a fuse box with a lid, a meter on a board, a row of old porcelain fuses, a junction box with cables), the spray\'s shape (a fan of sparks, '
                      'a zigzag arc, a shower of spark crosses)', inks='the panel grey and black, the sparks orange and grey with white only on their hottest cores, red along the spray\'s '
                      'edge where it hurts (the danger edge), the wall\'s wood purple'),
    'gai-crates': dict(world='tokyo', kind='prop', what='plastic beer crates stacked by a bar\'s back door in Golden Gai, some empty bottles in them shown as plain round jars',
                       where='on the top of a ledge at its wall end', material='moulded plastic crates with handholds', size='about 1.5 tiles wide and 1.8 tiles tall',
                       inks='the crates blue, grey and purple (never red, never yellow), the jars grey', scene=GAI_AT),
    'gai-bags': dict(world='tokyo', kind='prop', what='rubbish bags heaped by a bar\'s door in Golden Gai, under a blue net against the crows',
                     where='on the top of a ledge at its wall end', material='plastic rubbish bags, a blue mesh net, a weight on its edge', size='about 2 tiles wide and 1.2 tiles tall',
                     inks='the bags grey (never white), the net blue, a knot or two black', scene=GAI_AT),
    'gai-bicycle': dict(world='tokyo', kind='prop', what='an old bicycle (a mamachari with a front basket) parked by the wall in a Golden Gai alley',
                        where='on the top of a ledge at its wall end', material='a steel frame, two wheels, a wire basket, a bell', size='about 2.5 tiles wide and 1.5 tiles tall',
                        inks='the frame grey or purple, the wheels black with grey spokes, the basket grey', scene=GAI_AT),
    'gai-meters': dict(world='tokyo', kind='prop', what='a pair on the wooden wall of a bar in Golden Gai: a gas meter and an electric meter with their pipes and cables, '
                       'and under them a fire extinguisher standing on the ledge by the wall', where='on the shaft wall over a ledge, the extinguisher at the ledge\'s wall end',
                       material='metal meters with dials, pipes, cables; a fire extinguisher', size='the meters about 1.2 tiles wide and 1 tile tall, the extinguisher about half a tile wide and 1 tile tall',
                       inks='the meters and pipes grey and black; the extinguisher grey with only a small red mark on it (never all red: red is danger); a dial\'s glint grey',
                       scene=GAI_AT + ' below them'),
    'gai-neko': dict(world='tokyo', kind='prop', what='a small window of a bar in the wall of a Golden Gai house, lit warm from inside, a maneki-neko (a lucky beckoning cat '
                     'with one paw raised) sitting in it', where='set in the shaft wall over a ledge', material='a wooden window frame, glass, a ceramic cat',
                     size='about 1.5 tiles wide and 1.5 tiles tall', inks='the frame purple and grey, the window\'s light orange (a light), the cat light grey (never white) '
                     'with an orange bib and a small orange coin (never yellow, never red), black eyes', scene=GAI_AT + ' below it'),
    'gai-shop': dict(world='tokyo', kind='prop', what="the front of a tiny izakaya in a Golden Gai alley, a way into the game's shop: a narrow two-storey wooden front, "
                     "a short noren curtain in its doorway, a round paper lantern or a lightbox by the door, a door covered in stickers, a tin awning over it",
                     where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play',
                     material='old dark timber, a tin awning, a noren, a paper lantern, stickers', size='about 3.5 tiles wide and 3.5 tiles tall',
                     inks="the wood purple and dark grey, the noren red with a simple white coin on it (the shop's mark), the lantern orange with a dither halo (never red), "
                     "the stickers small blocks of blue, purple and grey", scene=GAI_AT),
    'gai-stash': dict(world='tokyo', kind='prop', what="the way into the game's secret stash in Golden Gai: a narrow door open on a steep stair going straight up to a bar's "
                      "second floor, a soft purple light glowing down the stair from above", where='built against the shaft wall at the wall end of a ledge, standing on the ledge',
                      material='old timber, a narrow door, steep wooden steps, a bare bulb', size='about 2.5 tiles wide and 3.5 tiles tall',
                      inks="the wood purple and dark grey, the stair's light purple with a dither halo (purple is the stash's mark), no red", scene=GAI_AT),
    'gai-stashroom': dict(world='tokyo', kind='prop', plane='back', what="the inside of the secret stash in Golden Gai, seen as one whole game screen: a tiny bar on a second "
                          "floor, barely wider than its counter: one counter, five round stools, shelves of plain round jars on the back wall, a lamp hanging over the "
                          "counter, the top of the steep stair in the floor, coins to collect hanging in the room; nobody drinking",
                          where='the whole room behind the play: its back wall, the counter and the shelves; the ledges in it are the counter and shelves',
                          material='old wood, a counter, stools, jars, a lamp', size='the whole room, about 16 tiles wide and 26 tiles tall',
                          inks='big flat shapes of one dim tone each on the black (no dither, no fine speckle): dim purple wood, dim grey jars, the lamp a small orange glow, '
                          'a purple glow up the stair (the stash), gold coins', scene=GAI_AT + ' as a shelf in the room'),
    'gai-tram': dict(world='tokyo', kind='prop', what='the old Tokyo streetcar of the No. 13 line, which ran along Golden Gai till 1970: one tram car of the 1960s in flat side '
                     'view, its trolley pole up, its round headlight, a row of windows lit warm inside, its route number plate', where='running along rails across the shaft at a level crossing',
                     material='a steel car body, windows, a trolley pole, wheels on bogies', size='about 7 tiles long and 2.5 tiles tall, its trolley pole above',
                     inks='the body green or orange with a grey stripe along it (never yellow, never red), its roof grey, the windows lit orange, the wheels black and grey, '
                     'the headlight grey with a small white core', scene='grey rails along the bottom of the cell, ' + GAI_AT + ' over the tram'),
})

# The TV Tower from Tokyo Tower, round 2 (owner 2026-10-24: Д160 «А» the place, Д161–Д168 what to take, Д168 «Б»: the world stays purple, only the far tower and
# the floodlights orange; research/tower/tower-attributes.md): six takes of each picked thing, for the game's code to cut or draw (Worlds, branch tower-real).
# Run with --ref research/variants/ref-tokyotower.png (the Skyscraper's purple in the game)
WORLDS['tokyotower'] = ('the TV Tower', 'Tokyo Tower in Shiba, Tokyo, at night, cosy and cute, kawaii, true to the real tower of 1958: a steel lattice on four arched legs, '
                        'angles and X bracing, gusset plates with rivets, its outside stair of some 600 steps in flights with landings, the Main Deck at 150 m, the Top '
                        'Deck at 250 m, the antenna on top; the night painters with their brushes, the floodlights of its Landmark Light, Zojo-ji temple at its foot. In '
                        'this game its steel is the world\'s purple, never orange', 'purple #c996ff',
                        'blue marks moving platforms, springs and rubber walls, white clouds dissolve under you, green is moss you can hold on to, orange is only the '
                        'warm light of the floodlights', 'the black night high over Tokyo, nothing far off')
TT_AT = 'a purple steel truss ledge with a white top edge sticking out of the wall'
TT_RULE = ('In this world blue marks moving platforms, springs and rubber walls, white clouds dissolve under you and green is moss you can hold on to, so use those only '
           'for tiny details; the tower\'s steel is the world\'s purple, never orange (orange is only the floodlights\' light) and never red (danger); never yellow (the coins\' colour).')
TT_FAR = ('each thing in one or two faint dim tones on the black in big flat shapes (no dither noise, no fine speckle): the tower itself a dim orange (the only orange), '
          'other steel and buildings a dim purple and grey, trees a dim green, the city\'s lit windows small dim blue and purple dots, white lights a dim grey (never white), '
          'no red, no yellow')
TT_PROPS = ('two things side by side on the same ledge, a tile of air between them: {a} on the left, at the ledge\'s wall end, and {b} on the right, with the hero '
            'for scale standing at the ledge\'s free end to the right of both (each cell a different take on both things)')
ELEMENTS.update({
    'tt-far1': dict(world='tokyotower', kind='prop', plane='back', what="the far view behind the shaft as the climb goes up Tokyo Tower from its foot, a different scene "
                    "in each cell, left to right, top to bottom: A the great wooden main gate of Zojo-ji temple (Sangedatsumon, two storeys under big tiled roofs), rows "
                    "of small stone jizo statues in knitted caps with pinwheels in front of them, the tower rising far behind the gate; B Shiba Park: round trees and "
                    "lawns, carp streamers (koinobori) on ropes, the low box of the Foot Town building between the tower's legs behind the trees; C the tower's four "
                    "arched legs spreading from the ground, the outside stair starting on Foot Town's roof and going up into the lattice; D flights of the outside stair "
                    "zigzagging up inside the lattice, landings with rails, small lamps; E the Main Deck, a wide two-storey box with bands of windows round the tower, the "
                    "city's lights far below it; F the lattice narrowing over the Main Deck, two night painters on safety ropes painting the steel with brushes, their "
                    "buckets hanging", where='far behind everything, low and faint, so the play reads over it',
                    material='a temple gate, stone statues, trees, steel lattice, stairs, a deck, the city', size='about 14 tiles wide and 7 tiles tall', inks=TT_FAR,
                    scene=TT_AT + ' in front of it'),
    'tt-far2': dict(world='tokyotower', kind='prop', plane='back', what="the far view behind the shaft near the top of Tokyo Tower, a different scene in each cell, left "
                    "to right, top to bottom: A the night: low clouds drifting through the narrowing tower, its steel half hidden in them, a few floodlights glowing "
                    "through; B the Top Deck, a small box with a ring of windows high on the tower, its crown of small lights on its roof (the Diamond Tiara); C the "
                    "antenna mast on the very top, its broadcast panels, the lightning rod at its tip, stars and a big round moon; D the clouds again, seen from further "
                    "off: the upper tower standing out of a sea of clouds, the Main Deck's ring of windows glowing under them; E the Top Deck again, closer, its crown "
                    "of lights and its windows; F the antenna again, looking up its mast from below at the stars, the moon beside it",
                    where='far behind everything, low and faint, so the play reads over it', material='steel lattice, clouds, a deck, an antenna, the night sky',
                    size='about 14 tiles wide and 7 tiles tall', inks=TT_FAR + '; clouds a dim grey, stars small dim grey dots, the moon a dim grey disc', scene=TT_AT + ' in front of it'),
    'tt-truss': dict(world='tokyotower', kind='ledge', what='the basic ledge, a truss of the steel lattice of Tokyo Tower sticking out of the shaft wall: two chords of '
                     'steel angle, bracing between them, gusset plates with rivets at the joints, a big gusset plate where it meets the wall',
                     does='solid on every side: you stand on it, cling to its sides and jump off it', material='steel angles and plates, rivets, painted purple',
                     size='4 tiles long and 1 tile thick', main='purple (the steel)', rule=TT_RULE,
                     vary='the bracing between the chords (X crosses, a zigzag Warren truss, K bracing, a double lattice of small diamonds, verticals and diagonals, a plate '
                     'girder with round lightening holes), the gusset plates and their rivets, how it meets the wall (a big gusset, a knee brace under it, a bolted '
                     'flange) and how its free end is finished'),
    'tt-landing': dict(world='tokyotower', kind='ledge', what='a landing of the outside stair of Tokyo Tower sticking out of the wall: a steel grating floor on brackets, '
                       'a handrail on posts along its free side, a toe board', does='a thin platform: you jump up through it from below and stand on it',
                       material='a steel grating, a handrail, posts, brackets', size='4 tiles long and a third of a tile thick, its rail about 0.8 tiles over it',
                       place='the landing sticking out of that wall', main='purple (the steel)',
                       rule=TT_RULE + ' Its rail is thin and grey or purple, never white: only the floor\'s top edge is white.',
                       vary='its floor (bars, a mesh, checker plate), its rail and posts (one rail, two rails, a mesh panel, a rail with a small sign plate), its brackets '
                       'under it (a knee brace, a hanger rod up the wall, a deep cantilever) and one small detail (a lamp, a fire bucket, a coiled hose)'),
    'tt-stair': dict(world='tokyotower', kind='ledge', what='a flight of the outside stair of Tokyo Tower, its square steel steps rising one tile at a time from the left '
                     'to the right, each step one tile wide and one tile tall, five of them, the first at the wall, a handrail along them',
                     does='solid steps: you walk up them; the top of each step is where you stand', material='steel treads (grating or checker plate), stringers, a handrail on posts',
                     size='each step 1 tile wide and 1 tile tall, five steps, so the flight is 5 tiles wide and 5 tiles tall', place='the flight rising to the right from the wall',
                     main='purple (the steel)', rule=TT_RULE + ' The top edge of every step is white (you stand on it); the handrail is thin and grey, never white.',
                     vary='each step\'s face (an open grating box, a checker plate tread over a dark riser, a frame with a cross, a solid plate with rivets), the stringer '
                     '(a solid zigzag, a diagonal beam under the steps, none), the handrail and its posts, and one small detail (a step number plate with plain glyph '
                     'blocks, a small lamp, a chain)'),
    'tt-flood': dict(world='tokyotower', kind='prop', what='a floodlight of Tokyo Tower\'s Landmark Light, fixed to the steel lattice, drawn twice in each cell: unlit (cold, '
                     'dark) on the left and lit on the right, as the hero lights it by coming near; one kind in each cell: A a round sodium floodlight on a U bracket, '
                     'B a square box floodlight with a visor over it, C two small round lamps on a short bar, D a floodlight on a short arm with its cable looping down, '
                     'E a lamp inside a wire cage guard, F a long narrow floodlight bar',
                     where='fixed to the shaft wall (the steel lattice) over a ledge', material='a steel housing, a glass front, a bracket, a cable',
                     size='about 1 tile wide and 1 tile tall', inks='unlit: grey and black, its glass dark grey; lit: its glass orange with a yellow core and a dither halo of '
                     'orange round it, a warm sodium light: a light of the dark; its bracket grey or purple', scene=TT_AT + ' below it'),
    'tt-lightning': dict(world='tokyotower', kind='wallhaz', what='lightning running down the lightning rod\'s cable on the steel of the tower',
                         why='summer storms over Tokyo are fierce; the tower carries a lightning rod on its tip, and its cable runs down the steel to the earth',
                         asleep='a dim grey cable clamped along the wall, a few clamps on it, quiet', bursting='a white jagged zigzag of lightning leaping out of the cable '
                         'into the shaft, red along its edges where it hurts, a few sparks',
                         vary='the cable and its clamps (one cable, a cable in a conduit, a flat strap on insulators), the bolt\'s shape (one zigzag, a forked bolt, a '
                         'crackling arc, a cluster of short jags)', inks='the cable grey, the bolt white with red along its edges (the danger edge), sparks grey, the wall\'s steel purple'),
    'tt-storm': dict(world='tokyotower', kind='hazard', what='a storm cloud rising up the shaft from below: a dark grey churning mass of cloud from wall to wall, red '
                     'lightning crackling along its top', why='a summer thunderstorm climbs the tower after you (in August 2018 there were 1246 lightning strikes in ten '
                     'minutes round Tokyo)', vary='its billows (round heaps, flat layers, curls), how the red lightning runs along its top (a zigzag line, forks, '
                     'sparks), what it throws up (a forked bolt, a small dark cloud with a spark in it, a ball of lightning)',
                     inks='the cloud dark grey and grey dithered with black (never white: white clouds are what you stand on here), the lightning along its top red '
                     '(danger), a few grey sparks'),
    'tt-binosign': dict(world='tokyotower', kind='prop', what=TT_PROPS.format(a='a coin-operated binocular of the Main Deck on its post (a viewer with two eyepieces, '
                        'a coin slot, a step to stand on)', b='a small step-number sign of the outside stair on a short post, its number shown only as two or three plain '
                        'glyph blocks (squares, bars), no digits, no letters'),
                        where='on the top of a ledge', material='painted steel, glass, a coin box; a small sign plate on a post',
                        size='the binocular about 1 tile wide and 1.6 tiles tall, the sign about 1 tile wide and 1 tile tall',
                        inks='the binocular grey and purple (never blue: blue moves here), its lenses black with a grey glint; the sign grey with purple glyph blocks; no orange', scene=TT_AT),
    'tt-paintbox': dict(world='tokyotower', kind='prop', what=TT_PROPS.format(a='the night painters\' things: two or three paint cans with the tower\'s paint dripping '
                        'down their sides, a wide brush laid across one, a rag', b='the electrician\'s carry box of spare floodlight lamps, its lid open, round glass lamps '
                        'in it, a coil of cable on it'),
                        where='on the top of a ledge', material='tin cans, paint, a brush; a steel box, glass lamps, a cable',
                        size='the cans about 1.2 tiles wide and 0.8 tiles tall, the box about 1.2 tiles wide and 0.9 tiles tall',
                        inks='the cans grey with purple paint (the tower\'s), the brush grey and black; the box grey and purple, its lamps unlit pale grey glass with black (never '
                        'orange: they are unlit), the cable black', scene=TT_AT),
    'tt-antcrow': dict(world='tokyotower', kind='prop', what=TT_PROPS.format(a='digital broadcast antenna panels on a short mast (tall flat panels in a row, cables '
                       'down from them, a small dish)', b='a crow perched on the ledge, cute, its feathers ruffled by the wind'),
                       where='on the top of a ledge', material='steel panels, a mast, cables; black feathers',
                       size='the antenna about 1.5 tiles wide and 2 tiles tall, the crow about 0.8 tiles wide and 0.8 tiles tall',
                       inks='the panels grey with black seams, the mast purple, the cables black; the crow black with a grey edge and a grey beak, its eye a grey dot', scene=TT_AT),
    'tt-shrine': dict(world='tokyotower', kind='prop', what="Tower Daijingu, the tower's own little Shinto shrine on its Main Deck: a small wooden hokora with a tiny "
                      "roof, a small torii in front of it, a rack of ema votive plaques, a shimenawa rope with paper streamers",
                      where='on the top of a ledge at its wall end', material='wood, a little roof, a torii, ema plaques, a straw rope, paper',
                      size='about 2 tiles wide and 2 tiles tall',
                      inks='the hokora grey and purple, the torii purple or grey stone (never orange: in this world orange is only the floodlights\' light; never red), '
                      'the ema plaques grey with purple marks, the paper streamers grey', scene=TT_AT),
    'tt-shop': dict(world='tokyotower', kind='prop', what="the Main Deck's souvenir counter of Tokyo Tower, a way into the game's shop: a counter with shelves behind it "
                    "of little tower models and keychains on hooks, a red noren curtain hung over its open doorway, a sign board over it with plain glyph blocks",
                    where='built against the shaft wall at the wall end of a ledge, standing on the ledge, its doorway facing the play',
                    material='a counter, shelves, little tower models, keychains, a noren, a sign board', size='about 3.5 tiles wide and 3 tiles tall',
                    inks="the counter and shelves grey and purple, the little tower models grey and purple (never orange: only the far tower is), a red noren with a "
                    "simple white coin on it (the shop's mark), the sign's glyph blocks purple", scene=TT_AT),
    'tt-stash': dict(world='tokyotower', kind='prop', what="a steel service hatch in the shaft of Tokyo Tower, the way into the game's secret stash: a riveted square or "
                     "round hatch with a hand wheel or a lever, bolted to the steel, its slits and gaps glowing a soft purple from inside",
                     where='set in the shaft wall at the wall end of a ledge, standing on the ledge', material='riveted steel plate, a hand wheel, hinges, bolts',
                     size='about 2.5 tiles wide and 3 tiles tall', inks='grey steel, black rivets and slits, a purple glow with a dither halo from its gaps (purple is the '
                     'stash\'s mark)', scene=TT_AT),
    'tt-topdeck': dict(world='tokyotower', kind='prop', plane='back', what="the inside of the secret stash at the top of Tokyo Tower, seen as one whole game screen: the "
                       "Top Deck's room of 2018, its walls and ceiling covered in faceted mirrors (triangles and diamonds), lines of LED lights running across them, the "
                       "city's lights through its windows, coins to collect hanging in the room",
                       where='the whole room behind the play: its walls and ceiling; the ledges in it are steel shelves',
                       material='faceted mirror panels, LED strips, window frames', size='the whole room, about 16 tiles wide and 26 tiles tall',
                       inks='big flat shapes of one dim tone each on the black (no dither, no fine speckle): dim purple and dim grey mirror facets, the LED lines a dim purple, '
                       'the windows small dim blue dots, gold coins', scene=TT_AT + ' as a shelf in the room'),
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

# An animal's frames of motion (owner 2026-10-25: «Такого размера птица должна улетать, а мелкая живность убегать»): six frames of the one already
# drawn in the game (its picture the attached reference, scratchpad flee/ref-<el>.png, at 4 x 4 image pixels a game pixel), its design kept, only its pose
# changing; UPwell moves it, the frames are cut path A (Worlds). Run with --ref <its reference>
ANIM = """Pixel-art animation sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
The attached image shows {who} exactly as it is drawn in the game, at the game's scale (one art pixel is 4 x 4 image pixels). Keep its design exactly: the same creature, the same size in art pixels, the same colours, the same shapes, markings and dither, the same pixel grid; only its pose changes.
Draw six frames of it {motion}, in a 3 x 2 grid of equal cells read left to right, top to bottom, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner: {frames}.
Each cell: a plain black background (#141414), the creature in flat side view facing right, at exactly the scale of the attached image, {ground}.
Build it from the same flat shapes as the attached image: big simple shapes, no fine noise, no motion blur, no speed lines, no shadow, no glow.
{style} Use only these colours: {inks9}. Its colours: {inks}. White only for tiny glints; no red; no yellow. No perspective, no 3D, no text other than the six letters."""
ELEMENTS.update({
    'eno-kitefly': dict(world='enoshima', kind='frames', who='a black kite, a bird of prey, perched on a short orange post',
                        motion='taking off from its post and flying away up and to the right',
                        frames='A crouching on the post ready to spring, wings closed; B springing off the post, wings half open, its legs still hanging; C flying, '
                        'its wings fully up; D flying, its wings spread level; E flying, its wings fully down; F flying, its wings spread level again (C, D, E, F '
                        'loop as its flap, its body the same in all four, its legs tucked)',
                        ground='the orange post only in A and B', inks='grey and dark grey feathers, a black eye, its hooked beak and feet orange'),
    'eno-catsrun': dict(world='enoshima', kind='frames', who='two stray cats, a dark grey one and an orange one, asleep together on an orange bench',
                        motion='waking and running away to the right, together',
                        frames='A both awake and startled, ears up, backs arched, still on the bench; B both leaping off the bench; C both running, their legs '
                        'stretched out; D both running, their legs gathered under them; E running, legs stretched; F running, legs gathered (C, D, E, F loop as '
                        'their run, each cat the same in all four)',
                        ground='the orange bench only in A and B, the cats on a plain thin grey ground line in C to F, the dark grey cat half a body behind the '
                        'orange one', inks='a dark grey cat and an orange cat, black eyes and stripes, no white'),
    'tt-crowfly': dict(world='tokyotower', kind='frames', who='a crow, a small black bird with a grey outline, perched on a purple steel beam',
                       motion='taking off from its beam and flying away up and to the right',
                       frames='A crouching on the beam ready to spring, wings closed; B springing off, wings half open, its legs still hanging; C flying, its wings '
                       'fully up; D flying, its wings spread level; E flying, its wings fully down; F flying, its wings spread level again (C, D, E, F loop as its '
                       'flap, its body the same in all four, its legs tucked)',
                       ground='nothing under it (no beam drawn)', inks='a black crow with a grey outline and grey highlights, a dark grey beak'),
    'dc-catrun': dict(world='danchi', kind='frames', who='a small grey stray cat sitting on a concrete ledge next to its blue food bowl',
                      motion='startled and running away to the right',
                      frames='A startled, ears up, back arched, still sitting where it was; B leaping away; C running, its legs stretched out; D running, its legs '
                      'gathered under it; E running, legs stretched; F running, legs gathered (C, D, E, F loop as its run, the cat the same in all four)',
                      ground='no bowl and no ledge drawn, the cat on a plain thin grey ground line', inks='a grey cat, black eyes, no white'),
    'fj-foxrun': dict(world='fuji', kind='frames', who='a red fox in the snow, orange with a grey tail tip and a little snow on its back, standing',
                      motion='startled and running away to the right',
                      frames='A startled, head up, ears up, still standing where it was; B leaping away; C running, its legs stretched out, its tail streaming; '
                      'D running, its legs gathered under it; E running, legs stretched; F running, legs gathered (C, D, E, F loop as its run, the fox the same '
                      'in all four)', ground='the fox on a plain thin grey ground line', inks='an orange fox, its tail tip and the snow on its back grey, black '
                      'eye and nose'),
    'vil-macaquerun': dict(world='village', kind='frames', who='a Japanese macaque, a grey monkey with an orange face, sitting hunched',
                           motion='startled and running away on all fours to the right',
                           frames='A startled, sitting up straight, its face turned to look; B springing away on all fours; C running on all fours, its legs '
                           'stretched; D running, its legs gathered under it; E running, legs stretched; F running, legs gathered (C, D, E, F loop as its run, the '
                           'monkey the same in all four)', ground='the monkey on a plain thin grey ground line', inks='grey fur, an orange face, black eyes'),
    'dc-catsit': dict(world='danchi', kind='frames', who='a small grey stray cat, startled and running', motion='sitting still, calm, as it waits by its bowl before '
                      'anything startles it', frames='A sitting upright facing right, its tail curled round its front paws; B the same pose, its tail tip lifted; C the '
                      'same, its head turned a little toward us; D the same, its eyes shut; E the same, its ears turned back; F the same, its tail curled the other '
                      'way (A to F an idle loop: the body the same in all six, the same cat and size as in the attached image)',
                      ground='the cat on a plain thin grey ground line', inks='a grey cat, black eyes, no white'),
    # The Sea's wall hazard as sharp corals (owner, 2026-10-25, of the blowhole on the site: «Справа над героем опасность плохо выглядит, давай менять на острые
    # кораллы»; UPwell's brief: asleep low clumps, the tips red as it warns, bursting sharp branches out to the reach; its mechanics the blowhole's)
    'eno-coralwall': dict(world='enoshima', kind='wallhaz', what='sharp corals growing on the rock wall of a sea cave, as on the reefs of Sagami Bay',
                          why='the warm Kuroshio current brings corals to the rocks round Enoshima; when the surge comes, their sharp branches stab out of the wall',
                          asleep='low rounded clumps of coral lying flat on the wall, calm, a few small polyps on them', bursting='sharp pointed coral branches thrust '
                          'straight out of the wall into the shaft, their points red where they hurt, unmistakably not to be touched',
                          vary='the clumps asleep (round brain-coral domes, low fans, short fingers, knobbly crusts), the branches bursting (antler branches, a row of '
                          'spikes, sea-fan blades, a spray of needle points)',
                          inks='the corals grey and orange, a few aqua polyps (never green: green is moss you can hold; never purple: purple is a stash), the burst\'s '
                          'points red (the danger edge), the rock wall aqua'),
    'eno-coralwall2': dict(world='enoshima', kind='wallhaz', what='sharp corals growing on the rock wall of a sea cave, as on the reefs of Sagami Bay',
                           reach='only three quarters of a tile (12 art pixels)',
                           why='the warm Kuroshio current brings corals to the rocks round Enoshima; when the surge comes, their sharp points stab out of the wall',
                           asleep='low flat clumps of coral pressed to the wall, no more than 10 art pixels out from it, each clump one flat colour with a darker '
                           'outline, a few small round polyps on them, no dither inside a clump', bursting='three to five sharp cone-shaped coral spikes thrust '
                           'straight out of the wall, each exactly 12 art pixels long from the wall to its point and 4 to 6 art pixels thick at its base, flat '
                           'colours, its last 3 pixels red (where it hurts), unmistakably not to be touched',
                           vary='the clumps asleep (domes, low fans, knobbly crusts, finger stubs), the spikes bursting (straight cones, curved horns, cones in pairs, '
                           'cones with a side branch)',
                           inks='the corals grey and orange in flat areas, a few aqua polyps (never green: green is moss you can hold; never purple: purple is a stash), '
                           'the spikes\' points red (the danger edge), the rock wall aqua'),
})
# The Danchi's own hazards (the owner's pick, 2026-10-25, Д276 «Б»): a burst boiler pipe blasting scalding steam on its walls, a burst water main flooding
# its stairwell from below; its reference a fresh shot of 6-5 (research/variants/ref-danchi.png, 4 x 4 image px a game px)
ELEMENTS.update({
    'danchi-steampipe': dict(world='danchi', kind='wallhaz', what='an old hot-water pipe from the block\'s boiler room, clamped to the raw concrete wall of a 1960s '
                             'danchi block, burst at a joint and blasting out scalding steam', reach='only three quarters of a tile (12 art pixels)',
                             why='the estate\'s boilers and their pipes are as old as the blocks; one pipe has cracked at a joint, and now and then the pressure '
                             'blasts scalding steam out of it',
                             asleep='a grey pipe running down the wall close to its white inner edge, held by clamps, a cracked joint (a bolted flange) in its '
                             'middle with a drip and a thin grey wisp of steam leaking out, no more than 8 art pixels out from the wall',
                             bursting='a jet of scalding steam blasting straight out of the cracked joint into the shaft and billowing into round puffs, grey '
                             'dither, a red edge along its outline where it hurts, exactly 12 art pixels (48 image pixels) long from the wall\'s white inner edge '
                             'and no further',
                             vary='the pipe (wrapped in lagging and tape, bare with rust patches, two pipes side by side, a pipe with a valve wheel, a pipe with a '
                             'small pressure gauge), the joint (a bolted flange, a cracked elbow, a split seam), the steam\'s shape (a straight jet, a fan of '
                             'puffs, rolling round billows, a curling plume)',
                             inks='the pipe and its clamps grey with black, its lagging grey, rust only a few orange dots (orange marks blocks that crumble here), '
                             'the steam grey dither (never white: white is an edge to stand on), its danger edge red, the wall grey'),
    'danchi-watermain': dict(world='danchi', kind='hazard', what='a burst water main flooding the estate\'s stairwell: murky water rising up the shaft, grey soap '
                             'suds floating on it, the estate\'s own junk bobbing on and in it: a child\'s rubber ball, a plastic bucket, a slipper, a sodai-gomi '
                             'chair (big rubbish put out for collection), a rolled-up futon',
                             why='the old water main under the 1960s blocks has burst, and the water floods up the stairwell faster than you can climb',
                             vary='its surface (choppy little waves, a slow heavy swell, a churning boil with suds), its suds (a line of grey foam, clumps, bubbles), '
                             'what floats on and in it (a ball, a bucket, slippers, a chair, a futon, a bicycle wheel, a cardboard box), the murky water under it, '
                             'and what it throws up the shaft (a gush of water with a ball in it, a slipper flung up, a spray of suds)',
                             inks='the water murky and in big flat masses, no random noise and no single loose pixels: under the suds a regular checker of blue and '
                             'black (every other pixel, as the game shades), darker downwards as the checker thins to rows of blue dots and then to black (never a '
                             'solid bright blue: blue marks springs and moving platforms here); its suds and foam grey in flat clumps (never white: white is an '
                             'edge to stand on), the junk grey with small pieces of orange and blue, a red line along its top edge (danger)'),
})
ELEMENTS.update({   # the Danchi's hazards in frames, as the Village's; their references found by default, research/variants/ref-dc-steam-frames.png (its wall
    # in its three states as drawn, 4 x 4 image px a game px) and ref-dc-watermain-frames.png (its front, halved: 4 x 4 a band px)
    'dc-steam-frames': dict(world='danchi', kind='hazframes', what='an old hot-water pipe from the block\'s boiler room on the raw concrete wall of a danchi '
                            'stairwell, cracked at a bolted joint: asleep it only leaks a thin wisp of steam; for half a second it hisses as a warning; then '
                            'scalding steam blasts out of the crack into the shaft for about one second, hurting whoever is in it, and it only leaks again',
                            refdesc='the shaft\'s left wall in the Danchi (grey diagonal stripes on black, a white inner edge) with the same stretch of wall shown '
                            'three times as it is drawn now: asleep (a grey pipe with clamps down the wall\'s inner edge), warning (its outer edge red) and '
                            'bursting (a column of grey steam puffs with red edges)',
                            frames='A asleep: a grey pipe 4 art pixels wide running straight down the wall\'s inner edge, one bolted flange joint across it in '
                            'the middle of the stretch (6 art pixels wide, a black crack in it), a thin wisp of grey steam (2 art pixels wide) curling up from '
                            'the crack; B asleep: the same, only the wisp drifted further up and leaning the other way (A and B loop slowly as it leaks); C about '
                            'to burst: the same pipe and flange, the crack\'s edge red, two short grey puffs spitting out of it, a drop of water falling under '
                            'it (held still for half a second as the warning); D bursting: a jet of scalding steam blasts straight out of the crack and billows '
                            'into round puffs that fill the whole stretch above and below the flange, reaching exactly 12 art pixels out from the wall, its '
                            'outer outline red where it hurts; E: the same billowing jet, its puffs rolled on upward and swollen another way, the same reach; '
                            'F: a third shape of the same billowing puffs, the same reach (D, E and F loop as it blasts)',
                            scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (grey diagonal '
                            'stripes on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the pipe on the wall\'s '
                            'inner edge, its flange centred in the cell\'s height',
                            size='the stretch of wall is exactly 32 art pixels tall (two tiles: 128 image pixels) with the flange in its middle, and nothing of '
                            'it reaches further out from the wall\'s white inner edge than 12 art pixels (48 image pixels): the pipe, the flange, the wisp and '
                            'the warning at most 8 art pixels out, the steam exactly 12 and no further: a narrow column of puffs as tall as the stretch, most '
                            'of the cell plain black air. The game stacks the stretch down the wall, so its top and bottom rows must join seamlessly (the '
                            'pipe runs on through both)',
                            motion='Steam is a hot gas under pressure: it blasts out level from the crack and at once billows up and out into round soft puffs '
                            'that swell and roll upward as they leave it, never a solid block and never a flame; the pipe and its flange never move.',
                            inks='the pipe and the flange grey with black bolt holes and a black crack, the wisp grey dither, the warning edge red, the steam '
                            'grey dithered with black (never white: white is an edge to stand on) with red along its outer outline (the danger edge), the drop '
                            'grey'),
    'dc-watermain-frames': dict(world='danchi', kind='hazframes', what='one surge on the front of the flood from a burst water main that rises up the estate\'s '
                                'stairwell from below: the flood\'s front is a ragged band of grey suds edged red over murky blue water, and along it the '
                                'water wells up in surges, each one carrying a child\'s small rubber ball up out of the water, tossing it and letting it fall '
                                'back in, each at its own beat',
                                refdesc='the front of the rising flood as it is drawn now in the game: a ragged red edge over a band of grey suds, murky blue '
                                'water under it, black depths below with a sunk chair',
                                frames='A a low swell of murky water just welling up out of the front, the ball floating on it, half sunk; B the swell higher and '
                                'rounder, a dome of water lifting the ball; C at its highest (it slows at the top), its crown breaking into grey suds, the ball '
                                'tossed up off it into the air; D the crown burst into two or three clumps of grey suds, the dome starting to sink, the ball at '
                                'its highest over it; E falling back: the dome low and wide, the suds falling back onto it, the ball dropping back towards the '
                                'water; F the front almost level again, the ball landed and floating half sunk, a little grey suds round it (A to F loop as the '
                                'surge\'s life)',
                                scene='a straight stretch of the flood\'s front 28 art pixels wide across the lower third of the cell, its ragged red top edge '
                                'over grey suds and murky blue water, flat and level at the same height in every cell, the surge welling up out of its middle; '
                                'plain black air above',
                                size='the surge at most 14 art pixels wide at its base and at most 16 art pixels tall over the front\'s top edge (64 image '
                                'pixels), the ball round and exactly 6 art pixels across; at the stretch\'s left and right ends the front stays flat in every '
                                'frame',
                                motion='Water is heavy: the swell rises slowly, slows at its top and falls back under gravity; the ball is one rigid object, the '
                                'same pixels in every frame, carried up by the water, tossed and falling back down in an arc, never floating up on its own; the '
                                'suds arc down; nothing below the front\'s top edge changes.',
                                inks='the water murky blue in big flat clumps with grey suds (no white), its top edge red as the front\'s (danger), the suds '
                                'grey in two or three big clumps, the ball orange with one grey stripe round it (no red, no white, no yellow: it is junk, not a '
                                'coin), the band grey suds over blue'),
})
# A hazard's frames (owner 2026-10-25: «Проработай еще лучше опасности, раздели их красиво кадрам ассетов и анимируй»): six frames of one hazard, every
# cell the same place at the game's own size (drawn bigger and shrunk, they turned to mush), its reference the game's own picture at 4 x 4 image pixels an
# art pixel; cut path A (Worlds), played by the hazard's own clock (its mechanics unchanged). Run with --ref <its reference>
HAZFRAMES = """Pixel-art animation sheet for "Upwell", a mobile vertical platformer: {hero_short} climbs up a narrow shaft at night.
The attached image is a real screenshot of the game at its own scale (one art pixel is 4 x 4 image pixels): {refdesc}. Copy its pixel size, its colours and its line weights exactly, and keep the hazard's idea, but draw it better: clearer shapes, livelier.
The hazard: {what}.
Draw six animation frames of it in a 3 x 2 grid of equal cells read left to right, top to bottom, each cell labelled A, B, C, D, E or F in small white pixel letters in its top-left corner: {frames}.
Every cell shows exactly the same place at the same spot in the cell, so the six frames lie exactly on top of each other: {scene}. Its size, exactly as in the game: {size}.
From frame to frame only what moves changes; everything else stays pixel for pixel the same. {motion}
Build it from flat shapes in clusters of at least 2 x 2 art pixels: simple shapes that read at a glance on a phone screen, no single loose pixels, no fine noise, no motion blur, no speed lines, no glow.
{style} Use only these colours: {inks9}. Its colours: {inks}. Red only for danger; yellow only for things you can take; no white except where said. No perspective, no 3D, no text other than the six letters."""
ELEMENTS.update({
    'vil-wallfire-frames': dict(world='village', kind='hazframes', what='dry grass tufts on the shaft\'s earthen wall that catch fire from the sparks of the field '
                                'burning below: asleep it is a plain seam of dry grass pressed to the wall; it smoulders for half a second as a warning; then flames '
                                'roar out of it into the shaft for about one second, hurting whoever is in them, and it sleeps again',
                                refdesc='the shaft\'s left wall in the Village (orange diagonal stripes on black, a white inner edge) with the same stretch of wall shown '
                                'three times as it is drawn now: asleep (a seam of grey dry grass stalks), warning (their tips red) and bursting (red and orange flames)',
                                frames='A asleep: the dry grass tufts pressed to the wall, grey and orange stalks with black scorch marks, two or three dim orange embers; '
                                'B asleep: the same tufts swayed by a draft, only their tips one art pixel further up the shaft (A and B loop slowly as it sleeps); '
                                'C about to burst: the same tufts as A, their tips glowing red, the embers bright orange, a short grey wisp of smoke rising (held still '
                                'for half a second as the warning); D bursting: tongues of flame thrust out of the tufts along the whole stretch, licking up as fire '
                                'does, reaching exactly 11 art pixels out from the wall; E the flames flickering: the same tongues, each a different height and its tip '
                                'curled another way, the same reach; F flickering again: a third shape of the same tongues (D, E and F loop fast as it burns)',
                                scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (orange diagonal stripes '
                                'on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the hazard on the wall\'s inner edge, '
                                'centred in the cell\'s height',
                                size='the stretch of wall is exactly 32 art pixels tall (two tiles: 128 image pixels) and nothing of it reaches further out from the '
                                'wall\'s white inner edge than 11 art pixels (44 image pixels): asleep and warning at most 8 art pixels out, the flames exactly 11. The '
                                'game stacks the stretch down the wall, so its top and bottom rows must join seamlessly',
                                motion='Fire rises: the flames lick upward as they reach out of the wall, each tongue a red outline round an orange core, its tip curling '
                                'up; the grass sways from its roots, and the roots stay put.',
                                inks='the dry grass grey and orange with black scorch marks, embers orange, the warning tips red, the flames red outside and orange '
                                'inside, smoke grey dither (never white)'),
    'vil-noyaki-frames': dict(world='village', kind='hazframes', what='one tongue of flame on the front of the spring field fire (noyaki) that rises up the shaft '
                              'from below: the fire\'s front is a ragged band of red over orange, and along it tongues of flame are born, rise, tear off at the top '
                              'and sink, each at its own beat',
                              refdesc='the front of the rising fire as it is drawn now in the game: a ragged band, red on top and orange below, the black burnt ground '
                              'with red embers under it',
                              frames='A a small low lick just rising out of the front; B growing taller, leaning a little; C tall, its tip flickering; D at its tallest, '
                              'its tip tearing off as a separate small flame just above it; E sinking back, the torn-off flame higher up and smaller, turning into a '
                              'puff of grey smoke; F low again, the smoke gone (A to F loop as the tongue\'s life)',
                              scene='a straight stretch of the fire\'s front 24 art pixels wide across the lower third of the cell, its top edge red and orange under '
                              'it, flat and level at the same height in every cell, the tongue rising out of its middle; plain black air above',
                              size='the tongue at most 10 art pixels wide at its base and at most 20 art pixels tall over the front\'s top edge (80 image pixels); at '
                              'the stretch\'s left and right ends the front stays flat in every frame',
                              motion='Fire rises: the tongue licks upward and narrows to its tip, a red outline round an orange core, never a solid block; nothing below '
                              'the front\'s top edge changes.',
                              inks='the flames red outside and orange inside, the smoke grey dither (never white), the band red and orange'),
    'vil-cone-frames': dict(world='village', kind='hazframes', what='a heavy pine cone hanging on a short stalk under an earthen terrace ledge: when the hero passes '
                            'under it, it shakes, its stalk snaps, it falls straight down (its red point at the bottom hurts) and it breaks apart where it lands',
                            refdesc='three pine cones hanging under an orange earthen ledge as they are drawn now in the game: orange scales with black gaps, a red '
                            'point at the bottom',
                            frames='A hanging still; B its stalk cracking, a red crack in the stalk, the cone tilted so its bottom is 2 art pixels to the left; C the '
                            'same, its bottom 2 art pixels to the right (B and C alternate as it shakes); D falling: the cone without its stalk, upright, its red '
                            'point down, the broken stalk stub left under the ledge; E landed: the cone bursting apart into 5 or 6 loose scales flying out sideways '
                            'and up, a little red at the impact; F the scales lower and spread wider, about to vanish (E and F as it breaks)',
                            scene='the underside of an orange earthen ledge across the top of the cell (orange dither on black, as in the attached image); in A to D '
                            'the cone hangs from it in the middle of the cell; in E and F it breaks on a plain flat grey ground line near the bottom of the cell',
                            size='the cone exactly 15 art pixels wide and 25 art pixels long with its stalk, as in the attached image (60 by 100 image pixels); the '
                            'scales in E and F each 2 to 4 art pixels',
                            motion='A cone is rigid: it swings about its stalk and never squashes or stretches; it falls straight; its scales fly in arcs.',
                            inks='the cone orange with black gaps between its scales, its point red (danger), the crack red, the stalk orange'),
})
# The Sea's hazards in frames (owner, 2026-10-25: «…раздели их красиво кадрам ассетов и анимируй»): its sharp corals on the wall (eno-coralwall2's design,
# owner: «давай менять на острые кораллы») and a breaking crest on its spring tide's front
ELEMENTS.update({
    'eno-coral-frames': dict(world='enoshima', kind='hazframes', what='sharp corals on the rock wall of a sea cave, as on the reefs of Sagami Bay: asleep they are '
                             'low clumps of coral pressed to the wall, their small polyps swaying in the water; for half a second their tips turn red as a warning; '
                             'then sharp coral spikes thrust straight out of the wall into the shaft and stay out for about one second, hurting whoever is in '
                             'them, then draw back in, and it sleeps again',
                             refdesc='the shaft\'s left wall in the Sea (aqua diagonal stripes on black, a white inner edge) with the same stretch of wall shown three '
                             'times as it is drawn now: asleep (low orange coral clumps), warning (their tips red) and bursting (a row of spikes, their points red)',
                             frames='A asleep: three low coral clumps pressed to the wall, grey and orange in flat areas, small aqua polyps on them like tiny tufts; '
                             'B asleep: the same clumps, only their polyps swayed by the water, each polyp leaning one art pixel the other way (A and B loop slowly as '
                             'it sleeps); C about to burst: the same clumps as A, the outer tip of each clump gone red (held still for half a second as the warning); '
                             'D bursting: a sharp cone-shaped coral spike thrusting straight out of the middle of each clump, only its red point out past the clump, '
                             '4 art pixels from the wall; E the same spikes further out, 8 art pixels from the wall; F the same spikes all the way out, exactly 12 art '
                             'pixels from the wall to their points (D, E and F play once as they thrust out; F is held while it hurts)',
                             scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (aqua diagonal stripes on '
                             'black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the hazard on the wall\'s inner edge, '
                             'centred in the cell\'s height',
                             size='the stretch of wall is exactly 36 art pixels tall (144 image pixels) with three clumps on it, each about 11 art pixels tall; the '
                             'clumps at most 5 art pixels out from the wall\'s white inner edge (20 image pixels), so the spikes\' red points show past them in D; '
                             'each spike 5 art pixels thick at its base, narrowing to a one-pixel point, its last 3 art pixels red; nothing reaches further out than '
                             '12 art pixels (48 image pixels). The game stacks the stretch down the wall, so its top and bottom rows must join seamlessly',
                             motion='Coral is rigid: the spikes slide straight out of the clumps, never bending, squashing or wobbling; the clumps stay put in every '
                             'frame; only the polyps sway, from their roots.',
                             inks='the clumps grey and orange in flat areas with a few small aqua polyps on them (never green: green is moss you can hold; never '
                             'purple: purple is a stash; no white: white is an edge you stand on), the spikes orange with grey bands, their points red (the danger '
                             'edge), the warning tips red, the rock wall aqua'),
    'eno-tide-frames': dict(world='enoshima', kind='hazframes', what='one breaking crest on the front of the spring tide that rises up the shaft from below: the '
                            'tide\'s front is a band of aqua water with white and grey foam on its crests and a red line along its top (the danger edge), and along '
                            'it crests rise, curl over to the right, break into spray and fall back, each at its own beat',
                            refdesc='the front of the rising tide as it is drawn now in the game: aqua water with white and grey foam crests edged in red on top, '
                            'curls in the water under them, the dark sea with blue dither below',
                            frames='A a low swell just rising out of the front; B the swell taller, its top leaning to the right; C the crest curling over to the '
                            'right, a lip of white foam over a hollow, like a small curl of the band; D the lip breaking: it plunges down onto the front, spray '
                            'thrown up and to the right as a few white and aqua drops; E the spray falling back down under gravity, the drops lower and further '
                            'right, the crest sunk back into the front; F the last drops landing on the front, a little white foam on it, the front flat again '
                            '(A to F loop as the crest\'s life)',
                            scene='a straight stretch of the tide\'s front 32 art pixels wide across the lower third of the cell, its top edge a red line over white '
                            'and grey foam over aqua water, flat and level at the same height in every cell, the crest rising out of its middle; plain black air '
                            'above',
                            size='the crest at most 14 art pixels wide at its base and at most 14 art pixels tall over the front\'s top edge (56 image pixels); its '
                            'spray within 10 art pixels right of the crest and at most 16 art pixels over the front; each drop 2 x 2 art pixels; at the stretch\'s '
                            'left and right ends the front stays flat in every frame',
                            motion='Water is heavy: the crest rises slowly, curls over and breaks to the right; its spray flies in arcs and falls back under gravity, '
                            'slowing at the top of its arc; nothing below the front\'s top edge changes.',
                            inks='the crest aqua water with white foam on its lip and grey foam shading, a red line along its top edge while it stands (the danger '
                            'edge, as on the band); the spray white and aqua drops, no red (it no longer hurts once broken); the band red, white, grey and aqua'),
})
ELEMENTS.update({   # Tokyo's (Golden Gai's) hazards in frames, as the Village's
    'gai-panel-frames': dict(world='tokyo', kind='hazframes', what='an old electrical panel (a grey metal fuse box) on the wall of a bar in Golden Gai, its cables '
                             'running up and down the wall: asleep it is shut and quiet; for half a second as a warning its door springs ajar and a spark sits in the '
                             'gap; then it shorts out and an electric arc of sparks crackles out of it into the shaft for about one second, hurting whoever is in it, '
                             'and it is quiet again',
                             refdesc='the shaft\'s wall in Tokyo (purple diagonal stripes on black, a thin white inner edge) with the same stretch of wall shown '
                             'three times as it is drawn now: asleep (two grey panels with purple cables), warning (their outer edge red) and bursting (orange, '
                             'white and red sparks over them)',
                             frames='A asleep: the panel shut, a small orange pilot lamp on its front lit, a loose cable end hanging under it; B asleep: the same, the '
                             'pilot lamp dark grey and the loose cable end swung one art pixel (A and B alternate slowly as it sleeps); C about to burst: the same '
                             'panel, its door sprung ajar by 2 art pixels at its outer edge (so 8 art pixels out in all), a small red and orange spark in the gap '
                             '(held still for half a second as the warning); D bursting: the door open, an electric arc leaping out of the gap at the panel\'s top '
                             'and back in at its bottom, a jagged zigzag of orange edged with red bowing out in front of the panel, taller than it is long: its '
                             'farthest point exactly 12 art pixels from the wall, only 4 art pixels beyond the open door, a few small grey and orange sparks round '
                             'it; E the arc crackling: the same arc, its zigzag path different, the same reach, the sparks in other places; F crackling again: a '
                             'third zigzag path (D, E and F loop fast as it sparks: the arc stays lit, only its path changes)',
                             scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (purple diagonal stripes '
                             'on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the panel on the wall\'s inner edge, '
                             'centred in the cell\'s height',
                             size='the stretch of wall is exactly 36 art pixels tall (144 image pixels): the panel 6 art pixels wide and 20 tall in its middle, its '
                             'cables running from it up and down to the stretch\'s top and bottom, so the stretch stacks down the wall with its top and bottom rows '
                             'joining seamlessly; nothing reaches further out from the wall\'s white inner edge than 12 art pixels (48 image pixels): asleep and '
                             'warning at most 8 art pixels out, the arc exactly 12 (it stays close to the panel, up and down its open door, never far out into '
                             'the shaft)',
                             motion='Electricity jumps: the arc is a jagged zigzag that leaps out of the panel\'s gap and back into it, never a smooth curve and never '
                             'a cloud; from frame to frame its path jumps to a new zigzag but it never goes dark; the sparks fly out in short straight dashes; the '
                             'panel never moves, only its door.',
                             inks='the panel grey with black seams and a few dark scorch marks, its cables purple and black, the pilot lamp orange, the arc orange '
                             'edged with red (the danger edge), the sparks orange and grey (no white, no yellow), the wall purple'),
    'gai-fire-frames': dict(world='tokyo', kind='hazframes', what='one tongue of flame on the front of the fire in the back alleys of Golden Gai that rises up the '
                            'shaft from below: the fire\'s front is a ragged band of red over orange under a haze of grey smoke, and along it tongues of flame are '
                            'born, rise, tear off at the top and sink, each at its own beat',
                            refdesc='the front of the rising fire as it is drawn now in the game: a ragged band, red on top and orange below, grey smoke in a dotted '
                            'dither over it, the black burnt ground with red embers and a fallen blue sign under it',
                            frames='A a small low lick just rising out of the front; B growing taller, leaning a little; C tall, its tip flickering; D at its tallest, '
                            'its tip tearing off as a separate small flame just above it; E sinking back, the torn-off flame higher up and smaller, turning into a '
                            'puff of grey smoke; F low again, the smoke gone (A to F loop as the tongue\'s life)',
                            scene='a straight stretch of the fire\'s front 24 art pixels wide across the lower third of the cell, its top edge red and orange under '
                            'it, flat and level at the same height in every cell, the tongue rising out of its middle; plain black air above',
                            size='the tongue at most 10 art pixels wide at its base and at most 20 art pixels tall over the front\'s top edge (80 image pixels); at '
                            'the stretch\'s left and right ends the front stays flat in every frame',
                            motion='Fire rises: the tongue licks upward and narrows to its tip, a red outline round an orange core, never a solid block; nothing below '
                            'the front\'s top edge changes.',
                            inks='the flames red outside and orange inside, the smoke grey dither (never white), the band red and orange'),
})
ELEMENTS.update({   # the Mine's (Iwami Ginzan) hazards in frames, as the Village's
    'mine-water-frames': dict(world='mine', kind='hazframes', what='groundwater breaking out of a crack in the rock wall of the old silver mine: asleep the crack '
                              'only drips; for half a second it beads and trickles as a warning; then a jet of water spurts out of it into the shaft for about one '
                              'second, hurting whoever is in it, and it drips again',
                              refdesc='the shaft\'s left wall in the Mine (grey diagonal stripes on black, a white inner edge) with the same stretch of wall shown '
                              'three times as it is drawn now: asleep (blue drips down the wall), warning (their outer edges red) and bursting (short flat blue jets '
                              'with red rims)',
                              frames='A asleep: a jagged lip of grey rock jutting out of the wall\'s white inner edge with a black crack across it, a wet streak (a '
                              'thin solid run of blue 2 art pixels wide) running down from the crack just right of the wall\'s white edge, a drop of water swelling '
                              'at the crack\'s lip; B asleep: the same, the drop let go and fallen 4 art pixels lower down the streak, a new small drop just starting '
                              'at the lip (A and B loop slowly as it sleeps); C about to burst: the same rock, water beading out of the whole crack and trickling '
                              'down in two or three thin runs, the beads\' outer edges red (held still for half a second as the warning); D bursting: a short stubby '
                              'jet of water spurting straight out of the crack into the shaft (as short as the jets in the attached image), a little thicker at the '
                              'crack, its top and bottom edges red, reaching exactly 12 art pixels out from the wall, its end breaking into a few drops; E gushing: '
                              'the same jet, its end broken into drops another way, a drop falling off its underside, the same reach; F gushing again: a third shape '
                              'of the same jet\'s end and drops (D, E and F loop as it gushes)',
                              scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (grey diagonal stripes '
                              'on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the crack and its rock on the wall\'s '
                              'inner edge, centred in the cell\'s height',
                              size='the stretch of wall is exactly 28 art pixels tall (112 image pixels) with one crack in its middle, and nothing of it reaches '
                              'further out from the wall\'s white inner edge than 12 art pixels (48 image pixels): the rock, the drips and the warning at most 6 art '
                              'pixels out, the jet exactly 12, about 6 art pixels thick at the crack. The jet is short and stubby: it ends 12 art pixels (48 image '
                              'pixels) from the white edge, only as far as the wall strip is wide, a tenth of the cell\'s width; even its drops stay inside those 12 '
                              'art pixels, and everything further right is plain black air in every frame. The game stacks the stretch down the wall, so its top and '
                              'bottom rows must join seamlessly',
                              motion='Water is heavy: the jet spurts out straight and level and its end breaks into drops that fall in short arcs; drops only ever '
                              'fall, never float up; a drop swells before it lets go; the rock and the crack never move.',
                              inks='the rock grey with the black crack, the water blue with aqua glints, the drips and the trickle blue, the warning\'s bead edges '
                              'red, the jet blue with an aqua core and red top and bottom edges (danger), its drops blue and aqua (never white)'),
    'mine-flood-frames': dict(world='mine', kind='hazframes', what='one surge on the front of the old mine\'s flood of dark groundwater that rises up the shaft from '
                              'below: the flood\'s front is a choppy band of blue water with a red top edge, and along it the water wells up in surges, each '
                              'swelling, bursting into foam at its top and falling back, each at its own beat',
                              refdesc='the front of the rising flood as it is drawn now in the game: a choppy band of blue water with a red top edge, grey stones '
                              'tumbling in it, a few bubbles and a spout of water thrown up over it',
                              frames='A a low smooth swell just welling up out of the front, its top edge red as the front\'s; B the swell higher and rounder, a dome '
                              'of water; C at its highest (it slows at the top), its crown breaking into a cap of foam, a bubble rising off it; D the crown bursting: '
                              'the foam flung up and out in two or three clumps, the dome starting to sink, the bubble higher; E falling back: the dome low and wide, '
                              'the foam clumps falling back onto it, the bubble popping into a small ring; F the front almost level again, a little foam on it (A to '
                              'F loop as the surge\'s life)',
                              scene='a straight stretch of the flood\'s front 28 art pixels wide across the lower third of the cell, its top edge red over blue water '
                              'with grey stones in it, flat and level at the same height in every cell, the surge welling up out of its middle; plain black air above',
                              size='the surge at most 12 art pixels wide at its base and at most 14 art pixels tall over the front\'s top edge (56 image pixels); at '
                              'the stretch\'s left and right ends the front stays flat in every frame',
                              motion='Water is heavy: the swell rises slowly, slows at its top and falls back under gravity; its foam and drops arc down, never '
                              'float; only the bubble rises; nothing below the front\'s top edge changes.',
                              inks='the water one flat solid blue with a single aqua glint along its top (no dither and no black inside it: a big clean shape), its '
                              'top edge red as the front\'s (danger), the foam aqua and grey in two or three big clumps (never white), the bubble an aqua ring, the '
                              'band blue with grey stones'),
})
ELEMENTS.update({
    'fuji-wallice-frames': dict(world='fuji', kind='hazframes', what='a frost crust of rime and ice on the shaft\'s wall that thrusts out a fan of sharp ice '
                                'shards: asleep it is a quiet crust of rime pressed to the wall, a glint wandering slowly over it; it cracks for half a second as a '
                                'warning; then the shards thrust out of it into the shaft and stay out for about one second, hurting whoever is in them, and draw '
                                'back into it',
                                refdesc='the shaft\'s left wall on Mount Fuji (blue diagonal stripes on black, a white inner edge) with the same stretch of wall shown '
                                'three times as it is drawn now: bursting (blue ice shards with red points), warning (red marks) and asleep (a few white specks '
                                'and glints)',
                                frames='A asleep: the frost crust pressed to the wall, lumpy white rime over blue ice with black gaps, in three or four clusters along '
                                'the stretch, and one small white glint (a plus of 3 by 3 art pixels) on it in its upper third; B asleep: exactly the same crust, '
                                'only the glint moved 6 art pixels further down along it (A and B loop slowly as it sleeps); C about to burst: the same crust as A '
                                'without the glint, cracked: short red cracks across each cluster and its outermost points red (held still for half a second as '
                                'the warning); D bursting: from each cluster a fan of three or four sharp ice shards radiating out, half out: each shard reaches '
                                'only 6 art pixels out from the wall, its point red; E the same fans fully out, the longest shard of each reaching exactly 12 art '
                                'pixels out from the wall; F exactly E, plus one small white glint on one shard (D, E and F play once as it thrusts out, F held)',
                                scene='the shaft\'s left wall as a strip 12 art pixels wide down the left edge of the cell, as tall as the cell (blue diagonal '
                                'stripes on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the hazard on the '
                                'wall\'s inner edge, centred in the cell\'s height',
                                size='the stretch of wall is exactly 32 art pixels tall (two tiles: 128 image pixels) and nothing of it reaches further out from the '
                                'wall\'s white inner edge than 12 art pixels (48 image pixels): asleep and warning at most 8 art pixels out, the half-out shards in '
                                'D 6, the shards in E and F exactly 12. The game stacks the stretch down the wall, so its top and bottom rows must join seamlessly',
                                motion='Ice is rigid: the shards slide straight out of the crust along their own axis, each a long thin wedge, and never bend, '
                                'wobble or flicker; the crust never moves, only the glint travels over it.',
                                inks='the crust white rime over blue ice with black gaps, the shards blue with a white upper edge and a red point (danger), the '
                                'cracks red, the glint white; white is allowed here: it is ice and rime'),
    'fuji-avalanche-frames': dict(world='fuji', kind='hazframes', what='one puff of powder snow on the front of the avalanche that rises up the shaft from below: '
                                  'the front is a ragged crest of broken snow with a red rim (its danger edge), and along it puffs of powder snow are thrown up off '
                                  'the rolling front, billow and settle back, each at its own beat',
                                  refdesc='the front of the rising avalanche as it is drawn now in the game: a ragged red rim over white and grey broken snow slabs, '
                                  'black night above',
                                  frames='A a small low puff just lifting off the front; B growing, rolling forward and up as one round billow; C at its tallest, '
                                  'two or three round billows like a cauliflower; D the billows loosening, their tops breaking into clumps drifting forward; E '
                                  'settling back down, a few thin grey clumps sinking towards the front; F almost gone, low clumps merging into the front (A to F '
                                  'loop as the puff\'s life)',
                                  scene='a straight stretch of the avalanche\'s front 28 art pixels wide across the lower third of the cell: its top edge a red '
                                  'rim over white and grey snow, flat and level at the same height in every cell, the puff rising out of its middle; plain black '
                                  'air above',
                                  size='the puff at most 14 art pixels wide and at most 14 art pixels tall over the front\'s top edge (56 image pixels); at the '
                                  'stretch\'s left and right ends the front stays flat in every frame',
                                  motion='Powder snow billows: round clumps that swell and roll forward as they rise, slow at the top, then thin out and sink back '
                                  'as falling snow does; never a solid block, never sharp spikes; nothing below the front\'s top edge changes.',
                                  inks='the puff white on its upper billows and grey dither below and where it thins, a little blue shadow, no red on the puff '
                                  '(only the front\'s rim is red); the front white, grey and its red rim; white is allowed here: it is snow'),
    'fuji-icicle-frames': dict(world='fuji', kind='hazframes', what='an icicle hanging under an icy ledge: when the hero passes under it, it shakes, it snaps off '
                               'at its root, it falls straight down (its red tip at the bottom hurts) and it shatters where it lands',
                               refdesc='one icicle hanging under the icy ledge as it is drawn now in the game: a white snow cap at its root, blue ice with a '
                               'white streak, a red tip',
                               frames='A hanging still; B a short black crack across its root, the icicle tilted so its tip is 1 art pixel to the left; C the '
                               'same, its tip 1 art pixel to the right (B and C alternate as it shakes); D falling: the icicle without its root, upright, its red '
                               'tip down, the broken-off root left under the ledge as a short white and blue stump; E landed: the icicle shattered into 6 or 7 '
                               'sharp ice shards flying out sideways and up and a white burst of ice dust at the impact, no red; F the shards lower and spread '
                               'wider, about to vanish, no red (E and F as it breaks: landed, it no longer hurts)',
                               scene='the underside of a blue icy ledge with a white top edge across the top of the cell (as in the attached image); in A to D '
                               'the icicle hangs from it in the middle of the cell; in E and F it shatters on a plain flat grey ground line near the bottom of '
                               'the cell',
                               size='the icicle exactly 12 art pixels wide and 21 art pixels long, as in the attached image (48 by 84 image pixels); the shards '
                               'in E and F each 2 to 4 art pixels',
                               motion='Ice is rigid: it swings about its root and never squashes or stretches; it falls straight; its shards fly out in arcs '
                               'and fall back down.',
                               inks='the icicle blue with a white snow cap and a white streak, its tip red (danger) only while it hangs and falls, the shards '
                               'blue and white only (no grey, no red), the ice dust white; white is allowed here: it is ice'),
})
ELEMENTS.update({   # the TV Tower's hazards in frames; their references found by default, research/variants/ref-tt-lightning-frames.png (its wall in its
    # three states as drawn, 4 x 4 image px a game px) and ref-tt-storm-frames.png (its front, halved: 4 x 4 a band px)
    'tt-lightning-frames': dict(world='tokyotower', kind='hazframes', what='lightning running down the lightning rod\'s cable on the steel of Tokyo Tower in a summer '
                                'storm: asleep it is a plain grey cable clamped down the shaft\'s wall; it glows for half a second as a warning; then the bolt leaps '
                                'out of the cable into the shaft for about one second, hurting whoever is in it, and it sleeps again',
                                refdesc='the shaft\'s left wall on the TV Tower (purple diagonal stripes on black, a white inner edge) with the same stretch of wall '
                                'shown three times as it is drawn now: asleep (a grey cable with grey clamps down the wall\'s inner edge), warning (the cable\'s '
                                'outer edge red) and bursting (a short bolt, light inside with a red edge, and small grey sparks)',
                                frames='A asleep: the grey cable running straight down the wall\'s inner edge, two grey clamps bolting it to the wall, and a faint '
                                'charge on it: one small grey spark (2 by 4 art pixels) beside the cable just under the upper clamp; B asleep: the same, the spark '
                                'just under the lower clamp (A and B alternate slowly as it sleeps: the charge creeping down the cable); C about to strike: the same '
                                'cable and clamps, the cable\'s outer edge glowing red along its whole length, a few small grey and red sparks at each clamp (held '
                                'still for half a second as the warning); D striking: a bolt of lightning leaps out of the cable at the upper clamp and runs down '
                                'beside the cable to the lower clamp as a tall, narrow jagged zigzag, jutting out at its corners but never further than 12 art '
                                'pixels (48 image pixels) from the wall\'s white inner edge, one short fork off it; E: the same bolt still lit between the same two '
                                'clamps, its corners in other places and its fork elsewhere, the same reach; F: a third path of the same bolt, still lit, the same '
                                'reach (D, E and F loop fast as it strikes: the bolt never goes dark between them)',
                                scene='the shaft\'s left wall as a strip 10 art pixels wide down the left edge of the cell, as tall as the cell (purple diagonal '
                                'stripes on black, a one-pixel white inner edge, as in the attached image), plain black air to its right; the cable on the wall\'s '
                                'inner edge, centred in the cell\'s height',
                                size='the stretch of cable is exactly 48 art pixels tall (192 image pixels) with its two clamps 24 art pixels apart, and nothing of it '
                                'reaches further out from the wall\'s white inner edge than 12 art pixels (48 image pixels): asleep and warning at most 6 art pixels '
                                'out, the bolt a narrow zigzag between the clamps at most 12 (most of the cell stays empty black air). The game stacks the stretch '
                                'down the wall, so its top and bottom rows must join seamlessly',
                                motion='Lightning is instant and jagged: the bolt is one connected zigzag of straight segments with sharp corners and one or two '
                                'short forks, the same thickness all along, its root always at a clamp on the cable; the cable and its clamps never move.',
                                inks='the cable and clamps grey with black bolt holes, the spark grey, the warning edge red, the bolt light grey inside with red '
                                'along its edges (the danger edge; never white: white is what you stand on), the sparks grey and red'),
    'tt-storm-frames': dict(world='tokyotower', kind='hazframes', what='one billow on the front of the storm cloud that rises up the shaft from below: the storm\'s '
                            'front is a ragged band of grey cloud dithered with black with a red crackle of lightning along its top edge, and along it billows of '
                            'cloud swell up, curl over and roll back in, each at its own beat',
                            refdesc='the front of the rising storm cloud as it is drawn now in the game: a ragged red crackle along the top of a band of grey '
                            'cloud dithered with black, black air above with faint grey dots',
                            frames='A a small low swell of cloud just rising out of the front; B swelling up into a rounded heap, leaning a little forward; C a '
                            'tall round billow, its top starting to curl over; D at its tallest, curled over like a breaking wave of cloud, a short red fork of '
                            'lightning inside it (the only frame with lightning inside); E rolling back in, sinking and flattening, a small torn-off wisp of '
                            'grey cloud just above it; F low again, the wisp gone (A to F loop as the billow\'s life)',
                            scene='a straight stretch of the storm\'s front 32 art pixels wide across the lower third of the cell, its top edge a red crackle '
                            'with grey cloud dithered with black under it, flat and level at the same height in every cell, the billow rising out of its '
                            'middle; plain black air above',
                            size='the billow at most 14 art pixels wide at its base and at most 12 art pixels tall over the front\'s top edge (48 image '
                            'pixels); at the stretch\'s left and right ends the front stays flat in every frame',
                            motion='A storm cloud billows: it swells up in soft round heaps that curl forward and roll back in, heavy and slow, never a solid '
                            'block and never a flame; its top edge a ragged red crackle as the front\'s; nothing below the front\'s top edge changes.',
                            inks='the cloud grey dithered with black (never white: white clouds are what you stand on here), its top edge a red crackle (the '
                            'danger edge), the lightning fork red, the wisp grey dither'),
})
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
{refnote}A hazard on the shaft's walls in the world "{world}" ({mood}): {what}. Why it is there: {why}. A stretch of the wall about 3 tiles tall sleeps, then bursts out {reach} into the shaft for a moment and hurts whoever is in it, then sleeps again.
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
    out = {'ledge': LEDGE, 'prop': PROP, 'boss': BOSS, 'hero': HERO, 'foe': FOE, 'hazard': HAZARD, 'wallhaz': WALLHAZ, 'drop': DROP, 'holder': HOLDER, 'frames': ANIM, 'hazframes': HAZFRAMES}[e['kind']].format(**{'reach': 'about one and a half tiles', 'foe_tone': 'Creepy and crooked, never gory: the game is for everyone.', **slab, **boss, **e, 'hero_short': hero_short, 'hero_scale': hero_scale, 'world': name, 'mood': mood, 'ink': ink, 'ink_name': ink.split()[0], 'night': night, 'inks9': WORLD_INKS.get(e['world'], INKS9), 'text': text, 'plane': plane,
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
