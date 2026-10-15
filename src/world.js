"use strict";
/* ─────────────────────────────────────────────────────────────
   Upwell — the world: tuning and content tables, the level (a well
   shaft, a room behind a bubble, the boss arena), how bodies touch it,
   and how it is drawn. Loaded after src/gum.js, before src/game.js.
   ───────────────────────────────────────────────────────────── */

const VERSION = '0.2.0';
const BASE_STICK = Object.assign({}, STICK);   // upgrades scale STICK per run; this is where it starts

// ── Tuning ───────────────────────────────────────────────────
// Lengths in CSS pixels or in hero radii (R) where noted, time in seconds. The well is
// as wide as the view; the hero and everything in the well are sized from it.
const HERO = { sizeFrac: 1 / 16, sizeMin: 16, sizeMax: 40 };   // a tile: the well is 16 tiles wide (COLS)
// Buttons, as in Downwell. Left and right run at `speed` R/s, reached at `accel`/s on a
// floor and `air`/s in the air; `slip` is a floor's friction while running. A wall takes
// the hero when it comes in at `cling` px/s or more, or is pressed toward it. Stuck under a
// ceiling it creeps along it at `ceil` R/s, for as long as it holds on (STICK.hold).
const MOVE = { speed: 8.4, accel: 20, air: 16, slip: 0.06, cling: 40, ceil: 5 };
// A jump rises `height` R (the soft body's bottom, stretching off, about 1 R less); letting
// go on the way up keeps `cut` of the speed. Off a wall it goes `wallX` R/s outwards and
// `wallUp` of a jump up, every time. Off a ceiling it pushes down at `ceil` of a jump and
// toward the pressed side. One more jump in the air comes free (MODS.airJumps). Down lets
// go of anything, for `dropAfter` s and for as long as it is held. `coyote`: a jump still
// counts this long after leaving a surface; `buffer`: a press in the air waits this long for
// one; `stickAfter`: no sticking right after a jump, or a leap along a wall would glue
// straight back on. The mouse is a slingshot (press, pull back, let go): a pull of
// `dragFrac` of the view's width is a full jump, the shortest `minPower` of one, a pull under
// `deadZone` px nothing; off a surface it never goes into it (at least `minUp` away from it);
// while it is held the body is squeezed by `squeeze` and `dots` show `preview` s of the arc.
// `mouse` turns the slingshot on (off for now: keys and the touch pad only).
const JUMP = { height: 7.4, cut: 0.45, wallX: 10, wallUp: 0.95, ceil: 0.6, dropAfter: 0.3, stretch: 2.2,
  coyote: 0.1, buffer: 0.14, stickAfter: 0.16, dragFrac: 0.36, minPower: 0.22, deadZone: 14, minUp: 0.2, squeeze: 0.8, preview: 0.8, dots: 16, mouse: false };
// Thicknesses in R; a shaft is made `ahead` views above the camera and dropped `behind`
// views below it.
const LEVEL = { wall: 12, thick: 0.75, plank: 0.32, spike: 0.42, ahead: 1.5, behind: 1.2, pocketEnd: 24 };
const DOOR = { w: 2.4, h: 2.8 };   // in R: a way into a shop or a stash, and the way back out
// The way out pulls at `pull` R/s into the hole, `spin` R/s round it at first, and shrinks the
// hero away in `shrink` s. It hangs `rise` R over the top of the shaft: a jump across the last
// ledges (at a crawler on them, say) passes under it, a full one up from the top ledge gets in.
const PORTAL = { pull: 9, spin: 4, shrink: 0.7, rise: 7 };
// The hero is kept at `anchor` of the view height; the ceiling over an exit stops the
// camera `top` px under the screen's top; dropping `deathPad` below the bottom costs a
// heart and puts the hero back on the last ledge it stood on.
const CAM = { anchor: 0.62, follow: 7, floorShow: 90, top: 70, deathPad: 40 };
const R_PER_M = 2.2;   // a metre of climb is 2.2 hero radii (64 px when the well was 12 tiles), so a level is as many jumps on any screen
const HEALTH = { start: 4, invuln: 1.0, knock: 640, hitstop: 0.08, blink: 0.09 };
// A run that ends can go on for coins: `price`, half as much again a world (as in the shops)
// and `grow` times more each time in a run; back with `hp` hearts and `invuln` s of safety.
const REVIVE = { price: 50, grow: 2, hp: 2, invuln: 2.5 };
// A stomp bounces the hero at `bounce` of a jump's speed; `blast` (R) is the Blast upgrade's reach.
const STOMP = { bounce: 1.0, keepVx: 0.45, hitstop: 0.045, blast: 3.4 };
// Combo rewards, paid when the hero lands on a floor; the best one reached counts.
const COMBO = [{ at: 3, coins: 10 }, { at: 5, coins: 25 }, { at: 8, coins: 50, hp: 1 }];
// Coins: radius and magnet reach in R; dropped ones fade after `life` s.
const COIN = { r: 0.54, magnet: 2.6, pull: 1400, drag: 2.4, life: 8, blink: 1.6, burst: 260 };
const SPRING = { v: 1.45, anim: 0.18 };   // v: of a jump's speed
const CRUMBLE = { time: 0.55, back: 3 };   // gives way `time` s after a touch, is back `back` s later
const SLICK = { fr: 0.03 };
// Wall coats beside ice: moss takes the hero at a touch and lets it slide at `slide` of the
// usual speed; rubber takes nothing and throws it back off at `x` R/s and `up` of a jump's
// speed, when it comes in faster than `min` R/s.
const MOSS = { slide: 0.15 };
const RUBBER = { x: 9, up: 0.55, min: 2 };
// Fire rises under the shaft and burns marmalade. It climbs at its world's `fire` R/s and never
// stays more than `lag` of the view below the screen; once the hero has gained no height for
// `idle` s it speeds up, `boost` times as fast after `ramp` s more. Touching it costs a heart,
// throws the hero up at `launch` of a jump's speed and sinks it back `back` of the view. While
// its top is on screen it spits a blob (`blob` R) at the hero every `spit` s (from, to), first
// flaring `warn` s where the blob will come out.
const FIRE = { lag: 0.5, idle: 3, boost: 3, ramp: 2, launch: 1.7, back: 0.3, spit: [3, 6], warn: 0.5, blob: 0.34 };
const SHOT_G = 1600;   // px/s², pulling a thrown or dropped blob down
// A stomp on the boss bounces at `bounce` of a jump's speed.
const BOSS = { size: 2.3, hp: 6, angry: 2.0, dropEvery: 3.2, spawnEvery: 4.6, maxMinions: 3, coins: 40, winDelay: 2.2, bounce: 1.9 };

// ── Looks ────────────────────────────────────────────────────
// The canvas is pixel art: one game pixel is `size` CSS px (the canvas is that much smaller
// and scaled up with hard edges), the camera moves in whole game pixels, and everything is
// drawn in the nine inks of the palette sheet (research/refs), flat or as 1-bit patterns
// of one ink over another.
const PIX = { size: matchMedia('(pointer: coarse)').matches ? 1.5 : 2 };   // a phone's screen is small and sharp: finer there (1 was too fine)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PAL = { black: hex('#141414'), red: hex('#e73228'), blue: hex('#48acf8'), yellow: hex('#fbe741'), green: hex('#36803a'),
  purple: hex('#bc83f8'), orange: hex('#ee9530'), gray: hex('#c0c0c0'), white: hex('#ebebeb') };
// 80/20: the world in its one ink, told apart by pattern; the bright inks mean something:
// yellow is what can be taken (coins, items), red is danger (enemies, spikes, fire), white the
// hero and the edges.
const INK = { spike: PAL.red, coin: PAL.yellow, coinD: PAL.orange, spring: PAL.white, fire: PAL.red, flame: PAL.orange, white: PAL.white, dark: PAL.black };
const FOE_COLOR = {
  red: { id: 'red', base: PAL.red, deep: PAL.black },
  boss: { id: 'boss', base: PAL.purple, deep: PAL.black },
};
// A world in one ink over black: walls, ledges, movers, ice, crumbling blocks and far dots all
// in it (patterns tell them apart), with white for the edge you stand on.
const theme = (ink) => ({ top: PAL.black, bot: PAL.black, dots: ink, wall: ink, wallD: PAL.black, lip: PAL.white,
  block: ink, plank: ink, mover: ink, slick: ink, crumble: ink });
const THEMES = {
  cave: theme(PAL.gray), ice: theme(PAL.blue), mine: theme(PAL.orange), void: theme(PAL.purple), summit: theme(PAL.gray), room: theme(PAL.orange),
};
// Gum's looks in the same inks: the hero's colours (the first is the default) and the face.
PALETTE.splice(0, PALETTE.length, ...['white', 'orange', 'blue', 'green', 'purple'].map((id) => ({ id, base: PAL[id], deep: PAL.black })));
Object.assign(THEME, { ink: PAL.black, blush: PAL.red, rim: PAL.white });

// ── Content ──────────────────────────────────────────────────
// Enemies are red squishies that crawl: along a ledge, up and down a wall, round and round
// a block (none of them flies or jumps). `size` is in hero radii, `speed` in px/s on average,
// pushed in pulses every `step` s; `grav` 0 holds on without falling. Any of them may be stomped from above; touching one any other
// way hurts.
const ENEMY = {
  crawler: { design: 'loaf', color: 'red', size: 0.8, grav: 1, stomp: true, coins: 3, speed: 60, step: 0.6 },
  climber: { design: 'mochi', color: 'red', size: 0.74, grav: 0, stomp: true, coins: 4, speed: 46, step: 0.7 },
  circler: { design: 'cat', color: 'red', size: 0.72, grav: 0, stomp: true, coins: 5, speed: 54, step: 0.8 },
};
// Four worlds of three levels, then the boss. `heights` are its levels' lengths in metres (a
// saw: a world starts a little shorter than the last one ended); `chunks` weighs the chunks a shaft is built from (see CHUNKS), `foes` is
// the chance of an enemy in a chunk and `enemies` weighs which, `fire` how fast the fire under it rises, in R/s;
// `dark` lists the levels (0-based) lit only by the hero and what glows (see DARK_FS); `intro`,
// level by level, the chunks it must have (laid first, so the first minutes show the surfaces),
// the enemies allowed (all if not given) and what is new, for the level's banner.
const WORLDS = [
  { id: 'cave', name: { ru: 'Пещера', en: 'Cave' }, theme: THEMES.cave, heights: [30, 38, 46], fire: 0.4,
    chunks: { stairs: 4, planks: 3, pillars: 3, rest: 1, comb: 2, overhang: 1, chimney: 1, spring: 1, crumble: 1, mosswall: 2 },
    foes: 0.55, enemies: { crawler: 3, climber: 1, circler: 1 },
    intro: [{ chunks: ['mosswall', 'spring'], enemies: ['crawler'], news: { ru: 'мох и пружины', en: 'moss and springs' } },
      { chunks: ['crumble', 'rubberwall'], enemies: ['crawler', 'climber'], news: { ru: 'осыпь, резина и лазуны', en: 'crumbling blocks, rubber and climbers' } },
      { chunks: ['icewall', 'lift'], news: { ru: 'лёд, ездящие планки и обходчики', en: 'ice, moving planks and circlers' } }] },
  { id: 'ice', name: { ru: 'Ледник', en: 'Glacier' }, theme: THEMES.ice, heights: [42, 50, 58], fire: 0.55, dark: [1],
    chunks: { icewall: 3, iceblocks: 3, stairs: 2, pillars: 2, comb: 2, chimney: 2, overhang: 1, spring: 1, twinshaft: 1, rest: 1 },
    foes: 0.7, enemies: { crawler: 2, climber: 2, circler: 2 }, intro: [{ news: { ru: 'ледяные блоки', en: 'ice blocks' } }] },
  { id: 'mine', name: { ru: 'Шахта', en: 'Mine' }, theme: THEMES.mine, heights: [54, 62, 70], fire: 0.7, dark: [1],
    chunks: { crumble: 3, bridge: 3, lift: 3, spring: 2, spikes: 1, comb: 2, chimney: 1, movers: 1, rest: 1, stairs: 1, rubberwall: 2, mosswall: 1 },
    foes: 0.8, enemies: { crawler: 2, climber: 2, circler: 3 }, intro: [{ news: { ru: 'мосты и лифты', en: 'bridges and lifts' } }, {}, { news: { ru: 'шипы', en: 'spikes' } }] },
  { id: 'void', name: { ru: 'Пустота', en: 'Void' }, theme: THEMES.void, heights: [66, 74, 82], fire: 0.85, dark: [1],
    chunks: { movers: 3, sparse: 3, spikewalls: 2, twinshaft: 2, planks: 2, spikes: 1, lift: 2, bridge: 1, rest: 1, rubberwall: 2 },
    foes: 0.9, enemies: { crawler: 1, climber: 3, circler: 3 }, intro: [{ news: { ru: 'шипы на стенах и ездящие планки', en: 'spiked walls and moving planks' } }] },
];
// The hardest chunk allowed, by world and level (hard mode allows all).
const MAX_D = [[1, 2, 2], [2, 2, 3], [2, 3, 3], [3, 3, 3]];
const SUMMIT = { id: 'summit', name: { ru: 'Вершина', en: 'Summit' }, theme: THEMES.summit, enemies: {}, chunks: {} };

// One of three is offered after every level. `stack`: can be taken again.
const UPGRADES = [
  { id: 'bouncy', stack: true, name: { ru: ['Пружинка', 'Отскок от врагов выше'], en: ['Springy', 'Bounce higher off enemies'] }, apply: (g) => { g.mods.bounce *= 1.2; } },
  { id: 'sticky', stack: true, name: { ru: ['Липучка', 'Медленнее сползаешь, дольше висишь на потолке'], en: ['Sticky', 'Slide slower, hang longer'] }, apply: (g) => { g.mods.slide *= 0.55; g.mods.hold += 0.6; } },
  { id: 'magnet', stack: true, name: { ru: ['Магнит', 'Монеты притягиваются издалека'], en: ['Magnet', 'Coins come from further away'] }, apply: (g) => { g.mods.magnet *= 2; } },
  { id: 'heart', stack: true, name: { ru: ['Толстая кожа', '+1 сердце к запасу'], en: ['Thick skin', '+1 max heart'] }, apply: (g) => { g.maxHp++; g.hp++; } },
  { id: 'apple', stack: true, name: { ru: ['Яблоко', 'Вылечить 2 сердца'], en: ['Apple', 'Heal 2 hearts'] }, apply: (g) => g.heal(2) },
  { id: 'candle', stack: true, name: { ru: ['Свеча', 'Дольше неуязвим после удара'], en: ['Candle', 'Longer safety after a hit'] }, apply: (g) => { g.mods.invuln += 0.8; } },
  { id: 'air', stack: true, name: { ru: ['Воздушный прыжок', '+1 прыжок в воздухе'], en: ['Air jump', '+1 jump in mid-air'] }, apply: (g) => { g.mods.airJumps++; } },
  { id: 'blast', name: { ru: ['Взрывной прыжок', 'Прыжок на врага сбивает соседей'], en: ['Blast stomp', 'A stomp takes out its neighbours'] }, apply: (g) => { g.mods.blast = true; } },
  { id: 'greed', stack: true, name: { ru: ['Жадность', 'Враги роняют больше монет'], en: ['Greed', 'Enemies drop more coins'] }, apply: (g) => { g.mods.coinMul *= 1.5; } },
  { id: 'combo', stack: true, name: { ru: ['Мастер комбо', 'Награды за комбо раньше'], en: ['Combo master', 'Combo rewards come sooner'] }, apply: (g) => { g.mods.comboShift++; } },
  { id: 'legs', stack: true, name: { ru: ['Сильные ноги', 'Прыжок выше'], en: ['Strong legs', 'Jump higher'] }, apply: (g) => { g.mods.jump *= 1.08; } },
  { id: 'member', name: { ru: ['Клубная карта', 'Скидка 25% в лавках'], en: ['Member card', '25% off in shops'] }, apply: (g) => { g.mods.discount *= 0.75; } },
  { id: 'iron', name: { ru: ['Железные подошвы', 'Шипы снизу не ранят'], en: ['Iron soles', 'Floor spikes do not hurt'] }, apply: (g) => { g.mods.iron = true; } },
  { id: 'cool', name: { ru: ['Огнеупорность', 'Огонь растёт медленнее и реже плюётся'], en: ['Fireproof', 'The fire rises slower and spits less'] }, apply: (g) => { g.mods.fire *= 0.6; } },
];
// A shop shows three of these; prices grow by half a price a world.
const SHOP_ITEMS = [
  { id: 'heal1', price: 25, color: PAL.red, name: { ru: '+1 сердце', en: '+1 heart' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(1) },
  { id: 'heal2', price: 40, color: PAL.red, name: { ru: '+2 сердца', en: '+2 hearts' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(2) },
  { id: 'maxhp', price: 80, color: PAL.red, name: { ru: '+1 к запасу', en: '+1 max heart' }, apply: (g) => { g.maxHp++; g.hp++; } },
  { id: 'upgrade', price: 110, color: PAL.purple, name: { ru: 'Улучшение', en: 'Upgrade' }, apply: (g) => g.randomUpgrade() },
];
const GIFT = { id: 'gift', price: 0, free: true, color: PAL.red, name: { ru: '+1 сердце', en: '+1 heart' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(1) };
// A 12×12 pixel picture for every upgrade and shop item, rows top to bottom in the letters
// of ICON_INK ('.' is nothing); drawn on its card and as the item in a shop.
const ICONS = {
  bouncy: '............/..yyyyyyyy../..oooooooo../...ssssss.../....ssss..../...ssssss.../....ssss..../...ssssss.../....ssss..../...ssssss.../..ssssssss../............',
  sticky: 'ss........../ss..wwww..../ssgwwwwwww../ssgwwwwwwww./ssgwwkwwkww./ssgwwwwwwww./ssgwwwwwwww./ssgwwwwwwww./ssgwwwwwww../ssg.wwww..../ssg........./ss..........',
  magnet: '............/.ww......ww./.ww......ww./.rr......rr./.rr......rr./.rr......rr./.rr......rr./.rrr....rrr./..rrrrrrrr../...rrrrrr.../............/............',
  heart: '............/.rrr...rrr../rrrrr.rrrrr./rrrrrwrrrrr./rrrrrwrrrrr./rrrwwwwwrrr./.rrrrwrrrr../..rrrwrrr.../...rrrrr..../....rrr...../.....r....../............',
  heal1: '............/.rrr...rrr../rrrrr.rrrrr./rwwrrrrrrrr./rwrrrrrrrrr./rrrrrrrrrrr./.rrrrrrrrr../..rrrrrrr.../...rrrrr..../....rrr...../.....r....../............',
  heal2: '............/.rrr...rrr../rrrrr.rrrrr./rrrrwwwrrrr./rrrrrrwrrrr./rrrrwwwrrrr./.rrrwrrrrr../..rrwwwrr.../...rrrrr..../....rrr...../.....r....../............',
  apple: '......o...../......ogg.../.....o.gg.../..rrr.rrr.../.rrrrrrrrr../.rwrrrrrrr../.rwrrrrrrr../.rrrrrrrrr../.rrrrrrrrr../..rrrrrrr.../...rr.rr..../............',
  candle: '.....y....../....yy....../....yoy...../.....oy...../.....k....../....wwww..../....wwws..../....wwws..../....wwws..../....wwws..../..ssssssss../............',
  air: '.....yy...../....yyyy..../...yyyyyy.../.....yy...../.....yy...../.....yy...../............/..w..w..w.../.wwwwwwwww../wwwwwwwwwww./.wwwwwwwww../............',
  blast: '.....r....../.r..rr...r../..rroyorr.../..royyyor.../.royywyyor../rroywwwyorr./.royywyyor../..royyyor.../..rroyorr.../.r..rr...r../.....r....../............',
  greed: '............/....oyyo..../...oyyyyo.../...oywyyo.../...oyyyyo.../....oooo..../.oyyo..oyyo./oyyyyooyyyyo/oywyyooywyyo/oyyyyooyyyyo/.oooo..oooo./............',
  combo: '............/............/yy...yy.www./yy...yy....w/.yy.yy.....w/..yyy....ww./.yy.yy.....w/yy...yy....w/yy...yy.www./............/............/............',
  legs: '..yy......../.yyyy..bbb../yyyyyy.bbb../..yy...bbb../..yy...bbb../..yy...bbbb./..yy...bbbbb/......bbbbbb/......wwwwww/............/............/............',
  member: '............/............/pppppppppppp/pppppppppppp/kkkkkkkkkkkk/pppppppppppp/pyyppppppppp/pyypppwwwwpp/pppppppppppp/............/............/............',
  iron: '............/...sss....../...sss....../...sss....../...ssssss.../..ssssssss../..wwwwwwww../............/.r...r...r../rrr.rrr.rrr./rrrrrrrrrrrr/............',
  cool: '.....b....../.....b....../....bbb...../....bbb...../...bbbbb..../..bwbbbbbb../..bwbbbbbb../..bbbbbbbb../..bbbbbbbb../...bbbbbb.../....bbbb..../............',
  upgrade: '............/.pppppppppp./.ppppwwwppp./.pppwpppwpp./.pppppppwpp./.ppppppwppp./.pppppwpppp./.pppppwpppp./.pppppppppp./.pppppwpppp./.pppppppppp./............',
  gift: '...yy..yy.../....yyyy..../.rrrryyrrrr./.rrrryyrrrr./.yyyyyyyyyy./.rrrryyrrrr./.rrrryyrrrr./.rrrryyrrrr./.rrrryyrrrr./.rrrryyrrrr./............/............',
};
ICONS.maxhp = ICONS.heart;
for (const id in ICONS) ICONS[id] = ICONS[id].split('/');
const ICON_INK = { k: 'black', r: 'red', b: 'blue', y: 'yellow', g: 'green', p: 'purple', o: 'orange', s: 'gray', w: 'white' };
// The hero is a ball (Gum's shapes stay, as looks to unlock); firm enough to stay round
// standing on a floor.
DESIGNS.unshift({ id: 'round', n: 32, size: 1.0, firm: 2.0, kernel: [0, 0], sdf: (x, y) => Math.hypot(x, y) - 1,
  face: { eye: [0.3, 0.02], eyeR: [0.075, 0.095], mouth: [0, 0.2], mouthW: 0.13, blush: [0.52, 0.17] } });
// The hero's looks: one shape (the ball) in five colours, each opening with the coins of all runs
// together (not spent), like Downwell's palettes, and each starting a run with an upgrade (`perk`).
const UNLOCKS = [
  { kind: 'color', id: 'white', at: 0, perk: 'bouncy' }, { kind: 'color', id: 'orange', at: 80, perk: 'legs' },
  { kind: 'color', id: 'blue', at: 200, perk: 'sticky' }, { kind: 'color', id: 'green', at: 400, perk: 'heart' },
  { kind: 'color', id: 'purple', at: 700, perk: 'blast' },
];

// ── Chunks ───────────────────────────────────────────────────
// A shaft is stacked from these, like Downwell's and Spelunky's hand-made rooms: drawn 12
// tiles wide and widened to the well's 16 as they load (see COLS; a tile is the hero's radius,
// the hero is 2 tiles across),
// rows top to bottom, mirrored at random. Each is a little climb of its own, with its
// first foothold at most 3 tiles over its bottom and its last at most 2 under its top, so
// any one can follow any other within a jump (the bottom rises about 6.3 tiles). `d`: difficulty 1–3. Which way
// round a chunk goes is picked from its footholds (see stepCost).
//   #  block        I  ice block (nothing sticks)   C  crumbles (and comes back)
//   =  plank (one-way, at the top of its tile)      M  plank sliding along its row
//   S  spring on the block below    ^  spikes on the block below   v  spikes under the block above
//   >  spikes on the left wall      <  on the right    [  ice on the left wall   ]  on the right
//   {  moss on the left wall (holds)   }  on the right    (  rubber on the left wall (throws back)   )  on the right
//   o  coin   O  big coin   B  bubble in the wall (a shop or a stash)
const CHUNKS = {
  stairs: { d: 1, rows: [
    '............',
    '............',
    '.......#####',
    '......o.....',
    '.....o......',
    '............',
    '#####.......',
    '............',
    '............'] },
  planks: { d: 1, rows: [
    '............',
    '............',
    '......====..',
    '............',
    '....o.......',
    '..====......',
    '............',
    '.........o..',
    '.......====.',
    '............'] },
  pillars: { d: 1, rows: [
    '............',
    '............',
    '.........###',
    '............',
    '......o.....',
    '.....###....',
    '............',
    '...o........',
    '.###........',
    '............'] },
  rest: { d: 1, rows: [
    '............',
    '....o..o....',
    '...######...',
    '............'] },
  pocket: { d: 1, rows: [
    '............',
    '............',
    'B...........',
    '#####.......',
    '............',
    '............',
    '.......####.'] },
  comb: { d: 2, rows: [
    '............',
    '............',
    '####........',
    '............',
    '.....o......',
    '........####',
    '............',
    '......o.....',
    '####........',
    '............',
    '............'] },
  chimney: { d: 2, rows: [
    '............',
    '............',
    '......######',
    '......######',
    '...o..######',
    '......######',
    '...o..######',
    '......######',
    '...o..######',
    '......######',
    '............',
    '............'] },
  overhang: { d: 2, rows: [
    '............',
    '............',
    '####....####',
    '............',
    '.....o......',
    '............',
    '............',
    '....####....',
    '............'] },
  spring: { d: 2, rows: [
    '............',
    '............',
    '.......#####',
    '............',
    '....o.......',
    '............',
    '....o.......',
    '............',
    '....o.......',
    '............',
    '............',
    '....S.......',
    '..#####.....',
    '............'] },
  crumble: { d: 2, rows: [
    '............',
    '............',
    '####........',
    '............',
    '......o.....',
    '.....CCC....',
    '............',
    '............',
    '.........###',
    '............'] },
  bridge: { d: 2, rows: [
    '............',
    '............',
    'CCCCC.......',
    '............',
    '.......o....',
    '......CCCCCC',
    '............',
    '..o.........',
    '####........'] },
  lift: { d: 2, rows: [
    '............',
    '............',
    '###.........',
    '............',
    '............',
    '....MMMM....',
    '............',
    '............',
    '.........###',
    '............'] },
  icewall: { d: 2, rows: [
    '[..........]',
    '[..........]',
    '[.....###..]',
    '[..........]',
    '[..........]',
    '[.###......]',
    '[.....o....]',
    '[..........]',
    '[......###.]',
    '[..........]'] },
  mosswall: { d: 1, rows: [
    '{..........}',
    '{..........}',
    '{......###.}',
    '{..........}',
    '{..........}',
    '{.o........}',
    '{..........}',
    '{..........}',
    '{.###......}',
    '{..........}',
    '{..........}'] },
  rubberwall: { d: 2, rows: [
    '(...........',
    '(...........',
    '(......#####',
    '(...........',
    '(...........',
    '(..o........',
    '(...........',
    '(.......####',
    '(...........',
    '(...........',
    '(...........',
    '####........',
    '............'] },
  iceblocks: { d: 2, rows: [
    '............',
    '............',
    '......IIIII.',
    '............',
    '..o.........',
    '.IIII.......',
    '............',
    '............',
    '.......IIII.',
    '............'] },
  movers: { d: 3, rows: [
    '............',
    '............',
    '....MMM.....',
    '............',
    '............',
    '.MMM........',
    '............',
    '............',
    '......MMM...',
    '............',
    '............'] },
  twinshaft: { d: 3, rows: [
    '............',
    '............',
    '.....##.....',
    '.....##.....',
    '..o..##..o..',
    '.....##.....',
    '.....##.....',
    '..o..##..o..',
    '.....##.....',
    '.....##.....',
    '............',
    '............'] },
  spikes: { d: 3, rows: [
    '............',
    '..........^^',
    '.......#####',
    '............',
    '............',
    '.o..........',
    '..^^........',
    '#######.....',
    '............'] },
  spikewalls: { d: 3, rows: [
    '>..........<',
    '>..........<',
    '>...====...<',
    '>..........<',
    '>....o.....<',
    '>.====.....<',
    '>..........<',
    '>..........<',
    '>.....====.<',
    '>..........<'] },
  sparse: { d: 3, rows: [
    '............',
    '............',
    '........###.',
    '........vvv.',
    '............',
    '...###...o..',
    '...vvv......',
    '............',
    '........###.',
    '............',
    '............'] },
};
const MIRROR = { '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{', '(': ')', ')': '(' };
// The well is COLS tiles wide: each chunk's columns 1, 4, 7 and 10 are doubled (spread out and
// even under mirroring; the walls' columns 0 and 11 stay as they are), and a coin, big coin,
// spring or door in a doubled column is not copied.
const COLS = 16, WIDEN = [1, 4, 7, 10], ONCE = new Set(['o', 'O', 'S', 'B']);
for (const id in CHUNKS) {
  CHUNKS[id].rows = CHUNKS[id].rows.map((row) => [...row].map((ch, k) => {
    if (!WIDEN.includes(k)) return ch;
    const copy = ONCE.has(ch) ? '.' : ch;
    return k < 6 ? ch + copy : copy + ch;   // the copy on the inner side
  }).join(''));
}
// Each chunk's first and last footholds, worked out from its rows once: runs of columns
// [from, to, tile] in the lowest and the highest row anything can be stood on.
const STAND = new Set(['#', 'I', 'C', '=', 'M', 'S']);
for (const id in CHUNKS) {
  const c = CHUNKS[id], H = c.rows.length;
  const runs = (r) => {   // a tile under spikes is no foothold
    const row = c.rows[H - 1 - r], up = c.rows[H - 2 - r] || '', ok = (k) => STAND.has(row[k]) && up[k] !== '^', out = [];
    for (let k = 0; k < COLS; k++) if (ok(k) && !ok(k - 1)) { let k1 = k; while (k1 < COLS - 1 && ok(k1 + 1)) k1++; out.push([k, k1, row[k]]); }
    return out;
  };
  let lo = 0, hi = H - 1;
  while (lo < H && !runs(lo).length) lo++;
  while (hi > 0 && !runs(hi).length) hi--;
  c.first = runs(lo); c.last = runs(hi);
}
const flipRuns = (runs) => runs.map(([a, b, t]) => [COLS - 1 - b, COLS - 1 - a, t]);
// How hard a step it is from a foothold up onto the next: one right overhead has to be
// gone around (unless it is a plank to jump through, or moves), and the gap between them
// should be 1–3 tiles. The easiest pair counts.
function stepCost(lower, upper) {
  let best = Infinity;
  for (const [a0, a1, ta] of lower) for (const [b0, b1, tb] of upper) {
    let c;
    if (tb === '=' || tb === 'M' || ta === 'M') c = 0;
    else if (b0 <= a1 && a0 <= b1) c = 100;
    else { const gap = b0 > a1 ? b0 - a1 - 1 : a0 - b1 - 1; c = gap < 1 ? 30 : gap > 3 ? 10 * (gap - 3) : gap - 1; }
    best = Math.min(best, c);
  }
  return best;
}

// ── Small helpers ────────────────────────────────────────────
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rnd, weights) {
  let sum = 0;
  for (const k in weights) sum += weights[k];
  let u = rnd() * sum;
  for (const k in weights) { u -= weights[k]; if (u <= 0) return k; }
  return Object.keys(weights)[0];
}
function shuffled(rnd, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const x = a[i]; a[i] = a[j]; a[j] = x; }
  return a;
}
const lerp = (a, b, t) => a + (b - a) * t;

// ── Level ────────────────────────────────────────────────────
// One scene: a shaft of the well, a room behind a bubble, or the boss arena. World y
// grows downward, like the screen, so the climb heads for negative y. The inner walls
// are at x = l and x = r, the floor's top at y = 0. A shaft is stacked chunk by chunk as
// the camera climbs, up to an exit portal under a ceiling; rooms and the arena are made
// whole. Everything the hero meets lives here, so a room keeps the shaft frozen just as
// it was (Downwell's timevoid).
//
// A ledge is a box: a solid one stops bodies on every side (its sides and underside are
// walls and a ceiling to stick to), a plank is one-way. Flags: move (a plank sliding
// side to side), crumble (gives way soon after the hero touches it), slick (nothing
// sticks, little friction), spring (throws the hero up), cap (the ceiling over an exit).
class Level {
  constructor() {
    this.kind = 'well'; this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = [];
    this.pickups = []; this.enemies = []; this.shots = []; this.nearBuf = []; this.boss = null;
    this.l = 0; this.r = 1; this.floor = 0; this.top = 0; this.R = 30; this.cam = 0; this.t = 0;
    this.portal = null; this.exit = null; this.capY = -Infinity; this.endY = -Infinity; this.fire = null; this.plan = [];
    this.world = WORLDS[0]; this.theme = THEMES.cave; this.stage = 0; this.hard = false; this.dark = false; this.intro = []; this.foeTypes = null;
  }
  // o: { kind, w, h, R, seed, world, stage, hard, height (px, a shaft only), theme }
  reset(o) {
    this.kind = o.kind; this.l = LEVEL.wall; this.r = o.w - LEVEL.wall; this.floor = 0; this.R = o.R; this.t = 0;
    this.world = o.world; this.stage = o.stage || 0; this.hard = !!o.hard; this.theme = o.theme || o.world.theme;
    this.dark = o.kind === 'well' && !!(o.world.dark && o.world.dark.includes(this.stage));
    this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = [];
    this.pickups = []; this.enemies = []; this.shots = []; this.boss = null;
    this.rng = mulberry32(o.seed >>> 0); this.tile = (this.r - this.l) / COLS; this.last = null; this.pocketKind = 'shop'; this.placed = []; this.lastFeet = null;
    const intro = (o.world.intro && o.world.intro[this.stage]) || {};
    this.intro = o.kind === 'well' ? shuffled(this.rng, intro.chunks || []) : []; this.foeTypes = intro.enemies || null;
    this.top = this.floor; this.endY = o.height ? this.floor - o.height : -Infinity;
    this.portal = null; this.exit = null; this.capY = -Infinity; this.fire = null; this.plan = [];
    this.cam = this.floor + CAM.floorShow - o.h;
    if (o.kind === 'well') {
      const rnd = this.rng, H = o.height;
      if (rnd() < (this.hard ? 0.7 : 0.85)) this.plan.push({ y: this.floor - H * (0.3 + rnd() * 0.4), kind: 'shop', done: false });
      if (rnd() < 0.8) this.plan.push({ y: this.floor - H * (0.15 + rnd() * 0.55), kind: 'treasure', done: false });
      const v = (o.world.fire || 0) * this.R * (this.hard ? 1.4 : 1);
      if (v > 0) this.fire = { y: this.floor + o.h * 0.4, v, spitT: FIRE.spit[0], warn: null };
    } else this.build(o);
  }
  box(x0, y0, x1, y1, f) {
    return Object.assign({ x0, y0, x1, y1, plank: false, move: null, crumble: false, slick: false, spring: false, cap: false,
      gone: false, t: 0, dx: 0, hit: false, crumbling: false }, f);
  }
  coin(x, y, v) { this.coins.push({ x, y, v, vx: 0, vy: 0, drop: false, moving: false, t: 0, ph: this.rng() * TAU }); }
  // The scenes made whole: the boss arena and the two kinds of room.
  build(o) {
    const R = this.R, W = this.r - this.l, cx = (this.l + this.r) / 2, rnd = this.rng;
    this.top = -Infinity;
    this.capY = this.cam + CAM.top;
    this.rects.push(this.box(this.l, this.capY - 4000, this.r, this.capY, { cap: true }));
    const at = (f) => this.floor + (this.capY - this.floor) * f;
    if (o.kind === 'boss') {
      const p = LEVEL.plank * R;
      this.rects.push(this.box(this.l, at(0.4), this.l + W * 0.3, at(0.4) + p, { plank: true }));
      this.rects.push(this.box(this.r - W * 0.3, at(0.4), this.r, at(0.4) + p, { plank: true }));
      this.rects.push(this.box(cx - W * 0.16, at(0.68), cx + W * 0.16, at(0.68) + p, { plank: true }));
      return;
    }
    // a room: the way back out is the bubble in the middle of the floor
    this.exit = { x0: cx - DOOR.w * R / 2, x1: cx + DOOR.w * R / 2, y0: this.floor - DOOR.h * R, y1: this.floor, x: cx, y: this.floor - 1.2 * R, armed: false };
    if (o.kind === 'shop') {   // a plank to jump up through, with room to drop past it at both ends
      const y = at(0.42);
      this.rects.push(this.box(this.l + W * 0.25, y, this.r - W * 0.25, y + LEVEL.plank * R, { plank: true }));
      shuffled(rnd, SHOP_ITEMS).slice(0, 3).forEach((item, k) => {
        this.pickups.push({ x: this.l + W * (0.33 + 0.17 * k), y: y - 1.25 * R, r: 0.5 * R, item, sold: false, near: false });
      });
    } else {
      const y = at(0.42);
      this.rects.push(this.box(cx - W * 0.24, y, cx + W * 0.24, y + LEVEL.thick * R, {}));
      for (let row = 0; row < 4; row++) for (let k = 0, n = 4 - row; k < n; k++) {   // a heap of coins on it
        this.coin(cx + (k - (n - 1) / 2) * 1.1 * R, y - 0.75 * R - row * 1.0 * R, row === 3 || rnd() < 0.15 ? 5 : 1);
      }
      for (let k = 0; k < 4; k++) { this.coin(this.l + 1.3 * R, at(0.3 + 0.12 * k), 1); this.coin(this.r - 1.3 * R, at(0.3 + 0.12 * k), 1); }
      if (rnd() < 0.45) this.pickups.push({ x: cx, y: at(0.8), r: 0.5 * R, item: GIFT, sold: false, near: false });
    }
  }
  ensure(y) { while (this.top > y) this.addChunk(); }
  // Drop what has fallen far below the camera (a crumbled block stays: it comes back).
  prune(y) {
    const keep = (o) => o.y0 === undefined ? o.y <= y : o.y0 <= y;
    this.rects = this.rects.filter((r) => r.cap || r.safe || keep(r));   // a ledge a fall may come back to stays
    this.spikes = this.spikes.filter(keep);
    this.coats = this.coats.filter(keep);
    this.coins = this.coins.filter(keep);
  }
  // The next chunk on top: a pocket with a bubble once the shaft passes a planned height
  // (never two pockets running, and none in the last `pocketEnd` tiles: a bubble right
  // under the way out is reached through it), otherwise one of the world's, as hard as
  // this level allows, not the same twice running.
  addChunk() {
    const wd = this.world, rnd = this.rng, plan = this.last !== 'pocket' && this.plan.find((p) => !p.done && this.top < p.y);
    let id;
    if (plan) { plan.done = true; if (this.top - this.endY > LEVEL.pocketEnd * this.tile) { id = 'pocket'; this.pocketKind = plan.kind; } }
    if (!id && this.intro.length && this.placed.length) id = this.intro.shift();   // after a first easy one, what the level is to show
    if (!id) {
      const maxD = this.hard ? 3 : MAX_D[Math.min(wd === SUMMIT ? 3 : WORLDS.indexOf(wd), 3)][Math.min(this.stage, 2)], w = {};
      for (const k in wd.chunks) if (CHUNKS[k].d <= maxD && k !== this.last) w[k] = wd.chunks[k];
      id = pick(rnd, w);
    }
    const c = CHUNKS[id];
    if (this.top - c.rows.length * this.tile < this.endY) { this.finish(); return; }
    // the way round whose first foothold is the easier step up from the last one below
    const cost = (m) => (this.lastFeet ? stepCost(this.lastFeet, m ? flipRuns(c.first) : c.first) : 0), a = cost(false), b = cost(true);
    const mirror = a === b ? rnd() < 0.5 : b < a;
    this.lastFeet = mirror ? flipRuns(c.last) : c.last;
    this.place(c, this.top, mirror);
    this.placed.push({ id, y1: this.top, y0: this.top - c.rows.length * this.tile });   // which chunk is where (for checks)
    this.last = id;
    this.top -= c.rows.length * this.tile;
  }
  // Lays a chunk with its bottom edge at y = base: runs of a block tile become one box (as
  // tall as the same run repeats above), planks and movers one per run, and so on.
  place(c, base, mirror) {
    const t = this.tile, R = this.R, l = this.l, rows = c.rows, H = rows.length, d = LEVEL.spike * R;
    const at = (r, k) => {   // the tile at row r (from the bottom), column k
      if (r < 0 || r >= H || k < 0 || k >= COLS) return '.';
      const ch = rows[H - 1 - r][mirror ? COLS - 1 - k : k];
      return mirror ? MIRROR[ch] || ch : ch;
    };
    const X = (k) => l + k * t, Y = (r) => base - r * t;   // a column's left edge; a row's bottom edge (its top is Y(r + 1))
    const SOLID = { '#': {}, I: { slick: true }, C: { crumble: true } }, used = new Set(), key = (r, k) => r * 16 + k, from = this.rects.length;
    const runEnd = (r, k, ch) => { let k1 = k; while (at(r, k1 + 1) === ch && !used.has(key(r, k1 + 1))) k1++; return k1; };
    for (let r = 0; r < H; r++) for (let k = 0; k < COLS; k++) {
      const ch = at(r, k), first = at(r, k - 1) !== ch;
      if (SOLID[ch] && !used.has(key(r, k))) {
        const k1 = runEnd(r, k, ch);
        const same = (rr) => { for (let q = k; q <= k1; q++) if (at(rr, q) !== ch || used.has(key(rr, q))) return false; return at(rr, k - 1) !== ch && at(rr, k1 + 1) !== ch; };
        let r1 = r;
        while (r1 + 1 < H && same(r1 + 1)) r1++;
        for (let rr = r; rr <= r1; rr++) for (let q = k; q <= k1; q++) used.add(key(rr, q));
        this.rects.push(this.box(X(k), Y(r1 + 1), X(k1 + 1), Y(r), SOLID[ch]));
      } else if ((ch === '=' || ch === 'M') && first) {
        const k1 = runEnd(r, k, ch), b = this.box(X(k), Y(r + 1), X(k1 + 1), Y(r + 1) + LEVEL.plank * R, { plank: true });
        if (ch === 'M') b.move = { a: l, b: this.r - (b.x1 - b.x0), v: (this.rng() < 0.5 ? -1 : 1) * R * (1.6 + this.rng() * 1.2) };
        this.rects.push(b);
      } else if ((ch === '^' || ch === 'v') && first) {
        const k1 = runEnd(r, k, ch);
        this.spikes.push(ch === '^' ? { x0: X(k), x1: X(k1 + 1), y0: Y(r) - d, y1: Y(r), dir: 0 } : { x0: X(k), x1: X(k1 + 1), y0: Y(r + 1), y1: Y(r + 1) + d, dir: 1 });
      } else if (ch === 'S') { const cx = X(k) + t / 2; this.rects.push(this.box(cx - 0.7 * R, Y(r) - 0.36 * R, cx + 0.7 * R, Y(r), { spring: true })); }
      else if (ch === 'o' || ch === 'O') this.coin(X(k) + t / 2, Y(r) - t / 2, ch === 'O' ? 5 : 1);
      else if (ch === 'B') {   // a door into the wall, standing on the ledge under it: square to the ledge and the wall
        const side = k === 0 ? 1 : 2, w = DOOR.w * R, y1 = Y(r), x0 = side === 1 ? l - LEVEL.wall : this.r - w, x1 = side === 1 ? l + w : this.r + LEVEL.wall;
        this.bubbles.push({ x0, x1, y0: y1 - DOOR.h * R, y1, x: (x0 + x1) / 2, y: y1 - DOOR.h * R / 2, kind: this.pocketKind, side, cd: 0, room: null });
      }
    }
    // the walls: runs down the first or last column of spikes ('>' left, '<' right) or a coat of ice, moss or rubber
    const wall = (ch, k, add) => { for (let r = 0; r < H; r++) if (at(r, k) === ch && at(r - 1, k) !== ch) { let r1 = r; while (at(r1 + 1, k) === ch) r1++; add(Y(r1 + 1), Y(r)); } };
    wall('>', 0, (y0, y1) => this.spikes.push({ x0: l, x1: l + d, y0, y1, dir: 2 }));
    wall('<', COLS - 1, (y0, y1) => this.spikes.push({ x0: this.r - d, x1: this.r, y0, y1, dir: 3 }));
    for (const [ch, k, side, kind] of [['[', 0, 1, 'ice'], [']', COLS - 1, 2, 'ice'], ['{', 0, 1, 'moss'], ['}', COLS - 1, 2, 'moss'], ['(', 0, 1, 'rubber'], [')', COLS - 1, 2, 'rubber']])
      wall(ch, k, (y0, y1) => this.coats.push({ side, y0, y1, kind }));
    if (c !== CHUNKS.pocket) this.populate(this.rects.slice(from), base - H * t, base);   // a bubble's ledge is safe to stop at
  }
  // Enemies for a chunk just laid, on what it is made of: a crawler along a clear ledge, a
  // climber up and down the longest stretch of bare wall, a circler round a free block.
  // None in the first few tiles over the floor; later levels now and then get two.
  populate(rects, top, bottom) {
    const wd = this.world, rnd = this.rng, t = this.tile;
    if (!wd.enemies || bottom > this.floor - 6 * t || !(rnd() < wd.foes * (this.hard ? 1.4 : 1) * (1 + 0.15 * this.stage))) return;
    const n = rnd() < 0.25 * this.stage ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const type = pick(rnd, this.foeTypes ? Object.fromEntries(this.foeTypes.map((k) => [k, wd.enemies[k]])) : wd.enemies), eR = this.R * ENEMY[type].size, any = (list) => list[(rnd() * list.length) | 0];
      const taken = (r) => this.spawns.some((q) => q.ledge === r || q.rect === r);   // one enemy to a ledge or block
      if (type === 'crawler') {
        const ok = rects.filter((r) => !r.crumble && !r.spring && !r.move && r.x1 - r.x0 >= 3 * t && !taken(r) &&
          !this.spikes.some((q) => q.dir === 0 && Math.abs(q.y1 - r.y0) < 1 && q.x1 > r.x0 && q.x0 < r.x1));
        if (ok.length) { const r = any(ok); this.spawns.push({ type, x: (r.x0 + r.x1) / 2, y: r.y0 - 1.2 * eR, ledge: r }); }
      } else if (type === 'circler') {
        const ok = rects.filter((r) => !r.plank && !r.crumble && !r.spring && r.x0 > this.l + t && r.x1 < this.r - t && !taken(r) &&
          !rects.some((s) => s.spring && Math.abs(s.y1 - r.y0) < 1 && s.x1 > r.x0 && s.x0 < r.x1));   // not one with a spring on top, in its way round
        if (ok.length) { const r = any(ok); this.spawns.push({ type, x: (r.x0 + r.x1) / 2, y: r.y0 - 1.1 * eR, rect: r, dir: rnd() < 0.5 ? 1 : -1 }); }
      } else {
        const side = rnd() < 0.5 ? 1 : 2, reach = 2.2 * eR;   // anything nearer the wall than it is wide is in its way, and a mover crosses it
        const cut = rects.filter((r) => r.move || (side === 1 ? r.x0 < this.l + reach : r.x1 > this.r - reach)).map((r) => [r.y0, r.y1])
          .concat(this.spikes.filter((q) => q.dir === side + 1).map((q) => [q.y0, q.y1]), this.coats.filter((q) => q.side === side && q.kind === 'rubber').map((q) => [q.y0, q.y1]))
          .sort((a, b) => a[0] - b[0]);
        let y = top, best = null;   // the longest free stretch between the things on that wall
        for (const [a, b] of cut.concat([[bottom, bottom]])) {
          const y0 = y + eR, y1 = Math.min(a, bottom) - eR;
          if (y1 - y0 > 3 * t && (!best || y1 - y0 > best[1] - best[0])) best = [y0, y1];
          y = Math.max(y, b);
        }
        if (best && !this.spawns.some((q) => q.wall && q.wall.side === side && q.wall.y0 < best[1] && q.wall.y1 > best[0]))   // and one to a stretch of wall
          this.spawns.push({ type, x: side === 1 ? this.l + eR : this.r - eR, y: (best[0] + best[1]) / 2, wall: { side, y0: best[0], y1: best[1] } });
      }
    }
  }
  // The end of a shaft: the portal out, and a ceiling over it the camera stops at.
  finish() {
    const R = this.R;
    this.portal = { x: (this.l + this.r) / 2, y: this.top - PORTAL.rise * R, r: 1.35 * R };
    this.capY = this.portal.y - 3.2 * R;
    this.rects.push(this.box(this.l, this.capY - 4000, this.r, this.capY, { cap: true }));
    this.top = -Infinity;
  }
  near(y0, y1) {
    const out = this.nearBuf;
    out.length = 0;
    for (const r of this.rects) if (!r.gone && r.y1 >= y0 && r.y0 <= y1) out.push(r);
    return out;
  }
  coatAt(side, y) {   // 'ice', 'moss', 'rubber' or null
    for (const s of this.coats) if (s.side === side && y >= s.y0 && y <= s.y1) return s.kind;
    return null;
  }
  // Once per step: movers slide, touched crumbles count down, springs settle, the fire rises (in play only).
  update(dt, g) {
    this.t += dt;
    for (const r of this.rects) {
      if (r.move) {
        const m = r.move, w = r.x1 - r.x0;
        let x0 = r.x0 + m.v * dt;
        if (x0 < m.a) { x0 = m.a; m.v = Math.abs(m.v); } else if (x0 > m.b) { x0 = m.b; m.v = -Math.abs(m.v); }
        r.dx = x0 - r.x0; r.x0 = x0; r.x1 = x0 + w;
      }
      if (r.crumble && !r.gone) {
        if (r.hit && !r.crumbling) { r.crumbling = true; sound.play('crumble', 0.6); }
        r.hit = false;
        if (r.crumbling && (r.t += dt) > CRUMBLE.time) { r.gone = true; r.t = 0; crumbleFx(r, this.theme.crumble); }
      } else if (r.crumble && (r.t += dt) > CRUMBLE.back) {   // back again, once the hero is out of its way
        const h = g.hero;
        if (h.maxX < r.x0 || h.minX > r.x1 || h.maxY < r.y0 || h.minY > r.y1) { r.gone = false; r.crumbling = false; r.t = 0; }
      }
      if (r.spring && r.t > 0) r.t = Math.max(0, r.t - dt);
    }
    const f = this.fire;
    if (f && g.state === 'play') {   // faster while the hero gains no height
      const k = 1 + (FIRE.boost - 1) * clamp((g.idleT - FIRE.idle) / FIRE.ramp, 0, 1);
      f.y = Math.min(f.y - f.v * k * g.mods.fire * dt, this.cam + view.h * (1 + FIRE.lag));
    }
    for (const b of this.bubbles) if (b.cd > 0) b.cd -= dt;
  }
}

// ── Contact with the level ───────────────────────────────────
// Gum's walls(), with the toy's box turned into the well. Surfaces as in Gum: 1 faces +x
// (the left wall, or the right side of a block), 2 faces −x, 4 faces +y (a ceiling: the
// underside of a block), 8 faces −y (a floor: the floor, the top of a block or a plank).
// A stuck vertex remembers its surface: the coordinate across it (glueS), its extent
// along it (glueA..glueB) and its box (glueR), so it lets go when it slides off the end
// of a ledge or the ledge crumbles. A wall only takes a vertex that comes in fast enough
// or a body pressed toward it (pressX), so a jump straight up beside a wall goes on up.
// A vertex inside a block leaves it through the face it came in by; planks only catch a
// body that was wholly above them when the step began. `fric` overrides the friction.
Body.prototype.collideLevel = function (lv, h) {
  const n = this.n, x = this.x, y = this.y, px = this.px, py = this.py, sk = WORLD.skin, fr = this.fric !== undefined ? this.fric : WORLD.wallFriction, glue = this.glue, convex = this.s.convex;
  if (!this.glueS) { this.glueS = new Float64Array(n); this.glueA = new Float64Array(n); this.glueB = new Float64Array(n); this.glueR = new Array(n).fill(null); }
  const gS = this.glueS, gA = this.glueA, gB = this.glueB, gR = this.glueR, hitW = this.hitW, hero = this.isHero === true;
  const L = lv.l + sk, R = lv.r - sk, F = lv.floor - sk;
  const canStick = this.sticky !== false && this.age > 0.5 && !(this.stickCD > 0) && !((this.wallMask | this.prevMask) & 8) && !this.wasTouching;
  const canTop = canStick && this.ceilT < STICK.hold && this.ceilCD <= 0;
  const pull = STICK.tear * this.R, slide = STICK.slide * this.R * h, carry = 1 / PHYS.substeps;
  const near = lv.near(this.minY - 2 * sk, this.maxY + 2 * sk);
  const stick = (i, code, s, a, b, r) => { glue[i] = code; gS[i] = s; gA[i] = a; gB[i] = b; gR[i] = r; };
  let mask = 0, sumL = 0, numL = 0, sumR = 0, numR = 0, sumT = 0, numT = 0, moss = 0;
  for (let i = 0; i < n; i++) {
    let gl = glue[i];
    if (gl) {   // pulled off, slid past the end of its surface, or the surface is gone
      const off = gl === 1 ? x[i] - gS[i] : gl === 2 ? gS[i] - x[i] : y[i] - gS[i], along = gl === 4 ? x[i] : y[i];
      const coat = gl !== 4 && !gR[i] ? lv.coatAt(gl, y[i]) : null;   // ice and rubber hold nothing, not even a patch sliding down onto them
      if (off > pull || along < gA[i] || along > gB[i] || (gR[i] && gR[i].gone) || coat === 'ice' || coat === 'rubber') gl = glue[i] = 0;
    }
    if (gl) {   // bent sharper than 100° (a crumple frozen flat, or the top of the patch drawn
      const p = i === 0 ? n - 1 : i - 1, q = i + 1 === n ? 0 : i + 1;   // into a beak): let go
      const ax = x[i] - x[p], ay = y[i] - y[p], bx = x[q] - x[i], by = y[q] - y[i];
      if (ax * bx + ay * by < -0.174 * Math.sqrt((ax * ax + ay * ay) * (bx * bx + by * by))) gl = glue[i] = 0;
    }
    if (gl === 4) { y[i] = gS[i]; mask |= 4; sumT += x[i] - px[i]; numT++; continue; }   // on a ceiling
    if (gl) {   // on a wall
      x[i] = gS[i]; mask |= gl;
      if (!gR[i] && lv.coatAt(gl, y[i]) === 'moss') moss |= gl;
      if (gl === 1) { sumL += y[i] - py[i]; numL++; } else { sumR += y[i] - py[i]; numR++; }
    } else if (x[i] < L) {   // ice and rubber take nothing, moss takes any touch
      const coat = lv.coatAt(1, y[i]), v = (px[i] - x[i]) / h;
      if (v > hitW[0]) hitW[0] = v;
      x[i] = L; y[i] -= (y[i] - py[i]) * (coat === 'ice' ? SLICK.fr : fr); mask |= 1;
      if (coat === 'rubber') this.rubber = 1;
      else if (canStick && convex[i] && coat !== 'ice' && (coat === 'moss' || v > MOVE.cling || this.pressX < 0)) stick(i, 1, L, -Infinity, Infinity, null);
    } else if (x[i] > R) {
      const coat = lv.coatAt(2, y[i]), v = (x[i] - px[i]) / h;
      if (v > hitW[1]) hitW[1] = v;
      x[i] = R; y[i] -= (y[i] - py[i]) * (coat === 'ice' ? SLICK.fr : fr); mask |= 2;
      if (coat === 'rubber') this.rubber = 2;
      else if (canStick && convex[i] && coat !== 'ice' && (coat === 'moss' || v > MOVE.cling || this.pressX > 0)) stick(i, 2, R, -Infinity, Infinity, null);
    }
    if (y[i] > F) { const v = (y[i] - py[i]) / h; if (v > hitW[3]) hitW[3] = v; y[i] = F; x[i] -= (x[i] - px[i]) * fr; mask |= 8; this.floorX += x[i]; this.floorN++; this.floorY = lv.floor; this.floorRect = null; }
    for (let k = 0; k < near.length; k++) {
      const r = near[k], x0 = r.x0 - sk, x1 = r.x1 + sk, y0 = r.y0 - sk, y1 = r.y1 + sk;
      if (x[i] <= x0 || x[i] >= x1 || y[i] <= y0 || y[i] >= y1) continue;
      let face = 0;
      if (r.plank) { if (this.stepMaxY > y0 + 3 || py[i] > y0 + 1) continue; face = 8; }
      else {
        const dT = y[i] - y0, dB = y1 - y[i], dL = x[i] - x0, dR = x1 - x[i];
        let best = Infinity;
        if (py[i] <= y0 && dT < best) { best = dT; face = 8; }
        if (py[i] >= y1 && dB < best) { best = dB; face = 4; }
        if (px[i] <= x0 && dL < best) { best = dL; face = 2; }
        if (px[i] >= x1 && dR < best) { best = dR; face = 1; }
        if (!face) { best = dT; face = 8; if (dB < best) { best = dB; face = 4; } if (dL < best) { best = dL; face = 2; } if (dR < best) face = 1; }
      }
      const rf = r.slick ? SLICK.fr : fr, st = !r.slick && !glue[i] && convex[i];
      if (hero && r.crumble) r.hit = true;
      if (face === 8) {
        const v = (y[i] - py[i]) / h;
        if (v > hitW[3]) hitW[3] = v;
        y[i] = y0; x[i] -= (x[i] - px[i] - r.dx * carry) * rf; mask |= 8; this.floorX += x[i]; this.floorN++; this.floorY = r.y0; this.floorRect = r;   // friction against the ledge's own motion: a mover carries what rides it
        if (r.spring && hero) this.springHit = r;
      } else if (face === 4) { const v = (py[i] - y[i]) / h; if (v > hitW[2]) hitW[2] = v; y[i] = y1; x[i] -= (x[i] - px[i]) * rf; mask |= 4; if (canTop && st) stick(i, 4, y1, x0, x1, r); }
      else if (face === 2) { const v = (x[i] - px[i]) / h; if (v > hitW[1]) hitW[1] = v; x[i] = x0; y[i] -= (y[i] - py[i]) * rf; mask |= 2; if (canStick && st && (v > MOVE.cling || this.pressX > 0)) stick(i, 2, x0, y0, y1, r); }
      else { const v = (px[i] - x[i]) / h; if (v > hitW[0]) hitW[0] = v; x[i] = x1; y[i] -= (y[i] - py[i]) * rf; mask |= 1; if (canStick && st && (v > MOVE.cling || this.pressX < 0)) stick(i, 1, x1, y0, y1, r); }
    }
  }
  if (numL + numR + numT) {   // each stuck patch slides no faster than `slide` (on moss, a lot slower); one under a ceiling creeps along it while pressed
    const cut = (sum, num, lim) => (num ? clamp(sum / num, -lim, lim) - sum / num : 0);
    const cL = cut(sumL, numL, moss & 1 ? slide * MOSS.slide : slide), cR = cut(sumR, numR, moss & 2 ? slide * MOSS.slide : slide), cT = cut(sumT, numT, this.crawl ? MOVE.ceil * this.R * h : slide);
    for (let i = 0; i < n; i++) { const gl = glue[i]; if (gl === 1) y[i] += cL; else if (gl === 2) y[i] += cR; else if (gl === 4) x[i] += cT; }
  }
  let stuck = 0;
  for (let i = 0; i < n; i++) if (glue[i]) stuck++;
  if ((mask & 8) && stuck) {   // down on a floor: the slide is over. Let the flattened side
    glue.fill(0); stuck = 0;   // spring back softly, or it kicks the body off the wall
    this.calmRelease = Math.max(this.calmRelease, STICK.settle);
  }
  this.stuck = stuck;
  if (mask) {   // approach speed of the rigid part, from the previous substep
    if (mask & 1) this.hitR[0] = Math.max(this.hitR[0], -this.rigVx);
    if (mask & 2) this.hitR[1] = Math.max(this.hitR[1], this.rigVx);
    if (mask & 4) this.hitR[2] = Math.max(this.hitR[2], -this.rigVy);
    if (mask & 8) this.hitR[3] = Math.max(this.hitR[3], this.rigVy);
  }
  this.wallMask |= mask;
};

// Two bodies against each other, as in Gum's World.collide (without its untangling).
const pairHit = { hit: false, speed: 0, nx: 0, ny: -1, depth: 0, cap: Infinity };
function collidePair(A, B) {
  const o = pairHit;
  o.hit = false; o.speed = 0; o.depth = 0;
  vertsAgainst(A, B, o);
  vertsAgainst(B, A, o);
  if (o.hit) A.touching = B.touching = true;
  return o.hit;
}

// ── Effects ──────────────────────────────────────────────────
// The hero's end: it bursts into bits of itself and sparks, ringed by a flash. The bits are
// solid squares of a few game pixels that fly out, fall and shrink away (Gum's puffs are soft
// and see-through, too faint for this).
const bits = [];
function burstFx(x, y, R, c) {
  for (let i = 0; i < 80; i++) {
    const a = rand(0, TAU), sp = rand(250, 1100), ink = i % 7 === 0 ? INK.flame : i % 5 === 0 ? INK.white : c;
    bits.push({ x: x + Math.cos(a) * R * 0.5, y: y + Math.sin(a) * R * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 250, s: rand(1.5, 4.5), c: ink, t: 0, life: rand(0.8, 1.6) });
  }
  fx.add(x, y, 0, 0, R * 1.3, 0.4, INK.white, 0.9, 2); fx.add(x, y, 0, 0, R * 0.8, 0.35, c, 1, 2, 0.08);
}
function updateBits(dt) {
  const d = Math.exp(-2.2 * dt);
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.vx *= d; b.vy = b.vy * d + SHOT_G * 0.9 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if ((b.t += dt) > b.life) bits.splice(i, 1);
  }
}
function splatFx(x, y, R, c, n = 9) {
  const k = lighten(c, 0.1);
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(160, 380); fx.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, rand(0.18, 0.32) * R, rand(0.35, 0.6), k, 0.95, 0); }
  fx.add(x, y, 0, 0, R * 0.9, 0.35, lighten(c, 0.3), 0.7, 2);
}
function crumbleFx(r, c) {
  for (let x = r.x0 + 6; x < r.x1; x += 12) fx.add(x, (r.y0 + r.y1) / 2, rand(-40, 40), rand(30, 120), rand(4, 8), rand(0.4, 0.7), c, 0.9, 0);
}

// ── Drawing ──────────────────────────────────────────────────
// Shared by every shader: the palette, the game-pixel grid and the 1-bit tones. cell() is a
// fragment's game pixel in the world (uGrid carries the camera, which moves in whole game
// pixels, so a pattern stays put on what it is drawn on); tone(k) is ink or paper for tone k
// of the palette sheet's ramps, light to dark: 0 none, 1 sparse dots, 2 dots, 3 lines,
// 4 checker, 5 dense, 6 solid; bayer() is a 4×4 threshold for anything see-through.
const PIX_GLSL = `uniform vec2 uGrid;
const vec3 PAL[9] = vec3[9](${Object.values(PAL).map((c) => `vec3(${c.map((v) => v.toFixed(4)).join(', ')})`).join(', ')});
ivec2 cell() { return ivec2(floor(vec2(gl_FragCoord.x, -gl_FragCoord.y) + uGrid)); }
float tone(int k, ivec2 g) {
  int x = g.x & 3, y = g.y & 3;
  if (k <= 0) return 0.0;
  if (k == 1) return float((y == 0 && x == 0) || (y == 2 && x == 2));
  if (k == 2) return float((x & 1) == 0 && (y & 1) == 0);
  if (k == 3) return float((y & 1) == 0);
  if (k == 4) return float(((x + y) & 1) == 0);
  if (k == 5) return float(!((x & 1) == 1 && (y & 1) == 1));
  return 1.0;
}
const float B4[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer(ivec2 g) { return (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0; }
vec3 snapPal(vec3 c) {   // the nearest of the nine, for anything that came in another colour
  vec3 r = PAL[0]; float best = 1e9;
  for (int i = 0; i < 9; i++) { vec3 d = c - PAL[i]; float e = dot(d, d); if (e < best) { best = e; r = PAL[i]; } }
  return r;
}
`;
// The well: black, a sparse grid of the world's ink drifting at half the climb (so a climb
// reads as motion even past bare wall), and the walls in that ink striped with black,
// fixed to the world, with a lip line along the well.
const BG_FS = GLSL + PIX_GLSL + `in vec2 vUv; out vec4 o;
uniform vec2 uShake; uniform vec2 uWalls; uniform float uPix;
uniform vec3 uTop, uDots, uWall, uWallD, uLip;
void main() {
  ivec2 g = cell();
  float wx = (float(g.x) + 0.5) * uPix;   // CSS px in the world
  vec3 c = uTop;
  int s = uPix < 1.5 ? 2 : 1, py = g.y + int(floor(uShake.y / uPix * 0.5));   // half the climb; the grid is laid in 2-CSS-px cells, a dot one game pixel
  ivec2 q = ivec2(floor(vec2(float(g.x), float(py)) / float(s)));
  if ((q.y & 7) == 3 && ((q.x + ((q.y >> 3) & 1) * 8) & 15) == 3 && (g.x & (s - 1)) == 0 && (py & (s - 1)) == 0) c = uDots;
  float d = min(wx - uWalls.x, uWalls.y - wx);   // > 0 inside the well
  if (d < 0.0) {
    c = ((g.x + g.y) & 3) == 0 ? uWallD : uWall;
    if (d > -uPix) c = uLip;
  }
  o = vec4(c, 1.0);
}`;
// Gum's sprite shapes plus three for the level, sized in px: 5 a rounded box (half size,
// radius) lit from the top, the tone deepening a step every 3 game pixels down; 6 a row of
// spikes (half length, half depth, tooth width; tips toward −B); 7 a box with diagonal white
// stripes (half size, stripe period); 9 an ellipse shaded from the top left in the ink of palette index p1. Edges are hard; a soft blob (1) or anything drawn
// see-through is dithered to all or nothing; every colour lands on the palette.
// A dark level: black over all but what gives light (the hero most, then the fire's top, the
// way out, doors, coins and the fire's blobs), each fading out through the 4×4 dither; far off a
// sparse sieve of the world still shows (tone 1), so the shaft keeps its shape. Lights are
// (x, y, full to, gone by) in world game pixels; uFire is the fire's top and its glow's height.
const DARK_FS = GLSL + PIX_GLSL + `in vec2 vUv; out vec4 o;
uniform vec4 uLights[16]; uniform int uN; uniform vec2 uFire;
void main() {
  ivec2 g = cell();
  vec2 p = vec2(g) + 0.5;
  float lit = clamp((p.y - uFire.x) / uFire.y + 1.0, 0.0, 1.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    vec4 L = uLights[i];
    lit = max(lit, 1.0 - clamp((length(p - L.xy) - L.z) / max(L.w - L.z, 1.0), 0.0, 1.0));
  }
  if (lit > bayer(g) || tone(1, g) > 0.5) discard;
  o = vec4(PAL[0], 1.0);
}`;
const FEAT_FS = GLSL + PIX_GLSL + `in vec2 vL; in vec4 vCol; flat in vec4 vP; out vec4 o;
uniform float uPix;
float aa(float d) { float w = fwidth(d); return clamp(0.5 - d / max(w, 1e-4), 0.0, 1.0); }
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}
float sdRB(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  int t = int(vP.x + 0.5);
  ivec2 g = cell();
  vec3 col = snapPal(vCol.rgb);
  float a, k = vCol.a;
  if (t == 0) a = aa(length(vL) - 1.0);                                       // ellipse
  else if (t == 1) { float s = 1.0 - smoothstep(0.0, 1.0, length(vL)); a = 1.0; k *= s * s; }   // soft blob
  else if (t == 2 || t == 3) {                                                // arc: smile, or ^ when flipped
    vec2 p = vL;
    if (t == 3) p.y = -p.y;
    p.y -= 0.3 - vP.z;
    a = aa(sdArc(p, vec2(sin(vP.y), cos(vP.y)), vP.z, vP.w));
  }
  else if (t == 5) {                                                          // rounded box, lit from the top
    vec2 p = vL * vP.yz;
    a = aa(sdRB(p, vP.yz, vP.w));
    if (tone(min(3, int((p.y + vP.z) / uPix / 3.0)), g) > 0.5) col = PAL[0];
  }
  else if (t == 6) {                                                          // spikes
    vec2 hs = vP.yz, p = vL * hs;
    float fu = abs(fract((p.x + hs.x) / vP.w) - 0.5) * 2.0, yb = hs.y - p.y;
    a = aa(max(max(yb - (1.0 - fu) * 2.0 * hs.y, -yb), abs(p.x) - hs.x));
  }
  else if (t == 7) { vec2 p = vL * vP.yz; a = aa(sdRB(p, vP.yz, 2.0)); if (fract((p.x + p.y) / vP.w) < 0.35) col = PAL[8]; }   // striped box
  else if (t == 8) { vec2 p = vL * vP.yz; a = aa(sdRB(p, vP.yz, 2.0)); if (fract(p.y / vP.w) < 0.5) col = PAL[0]; }   // box ribbed across in black
  else if (t == 10) { vec2 p = vL * vP.yz; a = aa(sdRB(p, vP.yz, 0.0)); if (tone(int(vP.w + 0.5), g) > 0.5) col = PAL[0]; }   // square box in a tone of black (0: flat)
  else if (t == 9) {                                                          // ellipse lit from the top left: ink p1 in tones down to the right
    a = aa(length(vL) - 1.0);
    float v = dot(vL, vec2(0.6, 0.8));
    if (tone(v > 0.6 ? 4 : v > 0.35 ? 2 : v > 0.12 ? 1 : 0, g) > 0.5) col = PAL[int(vP.y + 0.5)];
  }
  else a = aa(abs(length(vL) - 0.82) - 0.1);                                  // ring
  if (a < 0.5 || k <= bayer(g)) discard;
  o = vec4(col, 1.0);
}`;
// The squishies in the same terms (in place of Gum's glossy cushion): the body's colour
// flat, shade as black tones stepping in toward the back and the bottom, a hard white
// highlight where Gum has its soft-box reflection, and the anti-aliasing skirt drawn as a
// black outline. Its patterns ride with the body (uOrigin is its centre in game pixels).
const BODY_FS_PIX = GLSL + PIX_GLSL + `in vec3 vN; in float vAO; in float vA; in vec2 vUV; out vec4 o;
uniform vec3 uBase, uDeep; uniform vec2 uOrigin;
float sdRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  if (vA < 0.04) discard;
  if (vA < 0.98) { o = vec4(PAL[0], 1.0); return; }   // the outline
  ivec2 g = cell() - ivec2(uOrigin);
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.42, -0.62, 0.66));
  float wrap = clamp((dot(n, L) + 0.45) / 1.45, 0.0, 1.0) * mix(1.0, vAO, 0.85);
  int k = wrap > 0.58 ? 0 : wrap > 0.46 ? 2 : wrap > 0.34 ? 3 : 4;
  vec3 col = tone(k, g) > 0.5 ? uDeep : uBase;
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  if (sdRoundBox(R.xy - vec2(-0.36, -0.5), vec2(0.17, 0.1), 0.07) < 0.0) col = PAL[8];
  o = vec4(col, 1.0);
}`;
// Their shadow: black dots, thinning out with Gum's soft falloff.
const SHADOW_FS_PIX = GLSL + PIX_GLSL + `in float vSA; out vec4 o; uniform float uShadowA;
void main() { if (vSA * vSA * uShadowA <= bayer(cell())) discard; o = vec4(PAL[0], 1.0); }`;
// Gum's renderer compiles its own body and shadow shaders; these take their place. The
// scene is drawn into a small target, a game pixel per pixel, then copied up onto the
// full-size canvas with nearest filtering (CSS image-rendering is not honoured for WebGL
// canvases everywhere), so the pixels stay hard in every browser.
const gumInit = Renderer.prototype.init, gumResize = Renderer.prototype.resize;
Renderer.prototype.init = function () {
  if (!gumInit.call(this)) return false;
  try { this.pBody = program(this.gl, BODY_VS, BODY_FS_PIX); this.pShadow = program(this.gl, BODY_VS, SHADOW_FS_PIX); this.pDark = program(this.gl, BG_VS, DARK_FS); } catch (err) { console.error(err); return false; }
  this.darkBuf = new Float32Array(64);
  this.target = null;
  if (this.low) this.makeTarget();
  return true;
};
Renderer.prototype.resize = function (w, h, scale) {
  gumResize.call(this, w, h, scale);
  this.low = [Math.max(1, Math.round(w / PIX.size)), Math.max(1, Math.round(h / PIX.size))];
  this.pr = this.low[0] / w;   // what Gum sizes its anti-aliasing skirt by: a game pixel and a bit
  if (this.gl && !this.lost) this.makeTarget();
};
Renderer.prototype.makeTarget = function () {
  const gl = this.gl, [lw, lh] = this.low, t = this.target || (this.target = { fb: gl.createFramebuffer(), color: gl.createRenderbuffer(), stencil: gl.createRenderbuffer() });
  gl.bindRenderbuffer(gl.RENDERBUFFER, t.color); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, lw, lh);
  gl.bindRenderbuffer(gl.RENDERBUFFER, t.stencil); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, lw, lh);
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, t.color);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, t.stencil);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
};

// One frame of the scene: behind the bodies (wall coats, doors, portal, floor, ledges,
// spikes, coins, items, drops), the bodies (shadow, cushion, face), in front (puffs,
// fire, air-jump orbs). World → screen is a shift by uShake = shake − camera.
Renderer.prototype.draw = function (g, alpha, dots, nDots) {
  const gl = this.gl;
  if (!gl || this.lost || !this.ok) return;
  this.nv = 0; this.ni = 0; this.nf = 0; this.ranges.length = 0;
  const lv = g.lv, th = lv.theme, W = this.w, H = this.h, cam = lv.cam, top = cam - 80, bot = cam + H + 80, R = lv.R, T = lv.t;
  const F = (cx, cy, ax, ay, bx, by, c, a, type, p1, p2, p3) => this.feat(cx, cy, ax, ay, bx, by, c[0], c[1], c[2], a, type, p1 || 0, p2 || 0, p3 || 0);
  const disc = (x, y, r, c, a) => F(x, y, r, 0, 0, r, c, a, 0);
  const box = (x0, y0, x1, y1, c, a, rad, type, p3) => { const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2; F(x0 + hw, y0 + hh, hw, 0, 0, hh, c, a, type || 5, hw, hh, type >= 7 ? p3 : rad); };
  const icon = (id, x, y, a, k) => {   // an ICONS picture centred on (x, y), a dot k game pixels across, a box per run of one ink
    const rows = ICONS[id], s = PIX.size * k, x0 = Math.round(x / PIX.size) * PIX.size - rows[0].length * s / 2, y0 = Math.round(y / PIX.size) * PIX.size - rows.length * s / 2;
    rows.forEach((row, j) => { for (let i = 0; i < row.length;) { const c = row[i]; let e = i + 1; while (row[e] === c) e++; if (c !== '.') box(x0 + i * s, y0 + j * s, x0 + e * s, y0 + (j + 1) * s, PAL[ICON_INK[c]], a, 0, 10, 0); i = e; } });
  };
  const seen = (y0, y1) => y1 > top && y0 < bot;
  // A door: a dark opening square on the ledge (and in the wall), framed but on the wall's side, with what is inside.
  const door = (d, kind) => {
    const c = th.lip, f = 2 * PIX.size, x = (d.x0 + d.x1) / 2, y = (d.y0 + d.y1) / 2, r = (d.x1 - d.x0) / 2;
    box(d.x0, d.y0, d.x1, d.y1, INK.dark, 1, 0);
    box(d.x0, d.y0 - f, d.x1, d.y0, c, 1, 0);   // the lintel
    if (d.side !== 1) box(d.x0 - f, d.y0 - f, d.x0, d.y1, c, 1, 0, 10, 0);   // the posts, where there is no wall
    if (d.side !== 2) box(d.x1, d.y0 - f, d.x1 + f, d.y1, c, 1, 0, 10, 0);
    const bob = Math.round(Math.sin(T * 3 + x) * 1.5) * PIX.size;
    if (kind === 'shop') { disc(x, y + bob, r * 0.4, INK.coinD, 1); disc(x, y + bob, r * 0.3, INK.coin, 1); }
    else if (kind === 'treasure') for (let k = 0; k < 3; k++) disc(x + (k - 1) * r * 0.42, y + r * 0.3 - (k === 1 ? r * 0.35 : 0) + bob, r * 0.22, INK.coin, 1);
    else F(x, y - r * 0.1 + bob, r * 0.45, 0, 0, r * 0.45, c, 1, 3, 1.1, 0.75, 0.2);   // ^: the way out
  };
  for (const s of lv.coats) {   // in the wall's ink: ice striped white, rubber ribbed black, moss solid with a fringe of tufts over its edge
    if (!seen(s.y0, s.y1)) continue;
    const x0 = s.side === 1 ? 0 : lv.r, x1 = s.side === 1 ? lv.l : W;
    if (s.kind === 'ice') box(x0, s.y0, x1, s.y1, th.slick, 0.9, 0, 7, 9);
    else if (s.kind === 'rubber') box(x0, s.y0, x1, s.y1, th.wall, 1, 0, 8, 8);
    else {
      box(x0, s.y0, x1, s.y1, th.wall, 1, 0, 10, 0);
      for (let y = s.y0 + 0.25 * R, k = 0; y < s.y1 - 0.15 * R; y += 0.42 * R, k++) disc(s.side === 1 ? lv.l : lv.r, y, (k & 1 ? 0.17 : 0.27) * R, th.wall, 1);
    }
  }
  for (const b of lv.bubbles) if (seen(b.y0 - 10, b.y1)) door(b, b.kind);
  if (lv.exit) door(lv.exit, 'exit');
  const pt = lv.portal;
  if (pt && seen(pt.y - 3 * pt.r, pt.y + 3 * pt.r)) {
    const p = 1 + 0.08 * Math.sin(T * 4);
    F(pt.x, pt.y, pt.r * 2.2 * p, 0, 0, pt.r * 2.2 * p, [0.85, 0.75, 1.0], 0.3, 1);
    disc(pt.x, pt.y, pt.r, INK.dark, 1);   // a hole: the hero shows going into it
    F(pt.x, pt.y, pt.r * 1.12, 0, 0, pt.r * 1.12, th.lip, 1, 4);
    for (let k = 0; k < 3; k++) { const a = T * 2.2 + (k * TAU) / 3; disc(pt.x + Math.cos(a) * pt.r * 1.5, pt.y + Math.sin(a) * pt.r * 1.5, pt.r * 0.13, th.lip, 0.9); }
  }
  if (lv.floor < bot) { box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 800, th.wall, 1, 0); box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 2.5, th.lip, 1, 0); }
  for (const r of lv.rects) {
    if (r.gone || !seen(r.y0, r.y1)) continue;
    if (r.cap) { box(lv.l - 2, Math.max(r.y0, top), lv.r + 2, r.y1, th.wall, 1, 0); box(lv.l - 2, r.y1 - 2.5, lv.r + 2, r.y1, th.lip, 1, 0); continue; }
    if (r.spring) {
      const k = r.t / SPRING.anim, hh = (r.y1 - r.y0) * (1 - 0.5 * k), w = r.x1 - r.x0;
      box(r.x0 + w * 0.3, r.y1 - hh, r.x1 - w * 0.3, r.y1, th.block, 1, 2);
      box(r.x0, r.y1 - hh - 0.2 * R, r.x1, r.y1 - hh, INK.spring, 1, 0.1 * R);
      continue;
    }
    const c = r.plank ? (r.move ? th.mover : th.plank) : r.slick ? th.slick : r.crumble ? th.crumble : th.block, rad = Math.min((r.y1 - r.y0) / 2, 6);
    let ox = 0, a = 1;
    if (r.crumbling) { const u = r.t / CRUMBLE.time; ox = Math.sin(T * 70) * 1.8 * u; a = 1 - 0.5 * u * u; }
    if (r.slick) box(r.x0, r.y0, r.x1, r.y1, c, a, 0, 7, 9);   // ice striped, a mover dotted, a crumbling block chequered, the rest lit from the top
    else if (r.move) box(r.x0, r.y0, r.x1, r.y1, c, a, 0, 10, 2);
    else if (r.crumble) box(r.x0 + ox, r.y0, r.x1 + ox, r.y1, c, a, 0, 10, 4);
    else box(r.x0 + ox, r.y0, r.x1 + ox, r.y1, c, a, rad);
    box(r.x0 + ox + rad * 0.5, r.y0, r.x1 + ox - rad * 0.5, r.y0 + 2.5, th.lip, a, 1.25);
    if (r.crumble) for (let x = r.x0 + 9; x < r.x1 - 6; x += 16) disc(x + ox, (r.y0 + r.y1) / 2 + 1, 1.6, th.wallD, a);
    if (r.move) { disc(r.x0 + 5, (r.y0 + r.y1) / 2, 2.2, th.lip, 1); disc(r.x1 - 5, (r.y0 + r.y1) / 2, 2.2, th.lip, 1); }
  }
  for (const s of lv.spikes) {
    if (!seen(s.y0, s.y1)) continue;
    const vert = s.dir < 2, len = vert ? s.x1 - s.x0 : s.y1 - s.y0, dep = vert ? s.y1 - s.y0 : s.x1 - s.x0;
    const hl = len / 2, hd = dep / 2, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, tw = len / Math.max(1, Math.round(len / (0.55 * R)));
    if (s.dir === 0) F(cx, cy, hl, 0, 0, hd, INK.spike, 1, 6, hl, hd, tw);
    else if (s.dir === 1) F(cx, cy, hl, 0, 0, -hd, INK.spike, 1, 6, hl, hd, tw);
    else if (s.dir === 2) F(cx, cy, 0, hl, -hd, 0, INK.spike, 1, 6, hl, hd, tw);
    else F(cx, cy, 0, hl, hd, 0, INK.spike, 1, 6, hl, hd, tw);
  }
  const cr = COIN.r * R;
  for (const c of lv.coins) {
    if (c.y < top || c.y > bot) continue;
    if (c.drop && c.t > COIN.life - COIN.blink && Math.floor(c.t * 10) % 2) continue;
    // a thick coin turning: its edge shows beside the face as it turns away, the rim and the face are shaded
    const r = c.v > 1 ? cr * 1.4 : cr, a = T * 4 + c.ph, cs = Math.cos(a), s = 0.2 + 0.8 * Math.abs(cs), edge = 0.22 * r * Math.sin(a) * (cs < 0 ? -1 : 1);
    F(c.x + edge, c.y, r * s + Math.abs(edge) * 0.5, 0, 0, r, INK.coinD, 1, 9, 0);
    F(c.x, c.y, r * s, 0, 0, r, INK.coinD, 1, 9, 0);
    F(c.x - r * s * 0.04, c.y - r * 0.04, r * s * 0.72, 0, 0, r * 0.72, INK.coin, 1, 9, 6);
    F(c.x - r * s * 0.3, c.y - r * 0.34, r * s * 0.18, 0, 0, r * 0.16, INK.white, 1, 0);
  }
  for (const p of lv.pickups) {   // a shop's items: their pictures, bobbing a game pixel at a time, in a glow
    const y = p.y + Math.round(Math.sin(T * 2.4 + p.x) * 1.5) * PIX.size, a = p.sold ? 0.25 : 1;
    F(p.x, y, p.r * 2, 0, 0, p.r * 2, p.item.color, 0.25 * a, 1);
    icon(p.item.id, p.x, y, a, 2);
  }
  for (const s of lv.shots) {   // the boss's drops, red; the fire's blobs, orange round a yellow heart
    F(s.x, s.y, s.r * 1.8, 0, 0, s.r * 1.8, INK.spike, 0.3, 1); disc(s.x, s.y, s.r, INK.spike, 1);
    if (s.fire) disc(s.x - s.r * 0.15, s.y - s.r * 0.15, s.r * 0.55, INK.flame, 1);
  }
  const back = this.nf;
  const list = g.bodyList(), hero = g.hero, heroOff = g.state === 'dead' || (g.invuln > 0 && Math.floor(g.invuln / HEALTH.blink) % 2 === 1);   // blinking, or burst
  let sig = '';
  for (const b of list) if (b !== hero || !heroOff) sig += b.id + ',';
  this.idxDirty = sig !== this.idxSig;
  for (const b of list) if (b !== hero || !heroOff) this.buildBody(b, alpha);
  const front = this.nf;
  fx.write(this);
  for (const b of bits) {   // a burst hero's bits, on the game-pixel grid, shrinking over their last 40%
    const P = PIX.size, s = Math.max(1, Math.round(b.s * Math.min(1, (b.life - b.t) / (0.4 * b.life)))) * P, x0 = Math.round(b.x / P) * P, y0 = Math.round(b.y / P) * P;
    box(x0, y0, x0 + s, y0 + s, b.c, 1, 0, 10, 0);
  }
  if (lv.fire && lv.fire.y - 1.6 * R < bot) {   // the fire: a red body under rows of tongues, red, orange, yellow, each flickering and drifting its own way
    const fy = lv.fire.y, cx = (lv.l + lv.r) / 2, hw = (lv.r - lv.l) / 2 + 2;
    box(lv.l - 2, fy, lv.r + 2, fy + 0.9 * R, INK.fire, 1, 0, 10, 0);   // bright only at the top, then dimmer through the dither
    box(lv.l - 2, fy + 0.9 * R, lv.r + 2, fy + 2.2 * R, INK.fire, 1, 0, 10, 4);
    box(lv.l - 2, fy + 2.2 * R, lv.r + 2, fy + H + 200, INK.fire, 1, 0, 10, 5);
    for (const [c, h, w, v, ph] of [[INK.fire, 1.3, 0.9, 0.7, 0], [INK.flame, 0.95, 0.7, -1.1, 1.7], [INK.flame, 0.55, 0.5, 1.6, 3.1]]) {   // red and orange only: yellow is for what can be taken
      const tw = w * R, hd = (h * R * (1 + 0.18 * Math.sin(T * 9 + ph)) + 0.12 * R * Math.sin(T * 23 + ph * 2)) / 2, sh = (((T * v * R) % tw) + tw) % tw;
      F(cx - sh, fy + R * 0.35 - hd, hw + tw, 0, 0, hd, c, 1, 6, hw + tw, hd, tw);
    }
    const w = lv.fire.warn;
    if (w) { const u = 1 - w.t / FIRE.warn, hd = R * (0.5 + 1.1 * u); F(w.x, fy - hd + 0.3 * R, 0.45 * R, 0, 0, hd, u > 0.5 ? INK.white : INK.flame, 1, 6, 0.45 * R, hd, 0.9 * R); }   // a tongue rising where a blob is coming
  }
  if (g.state === 'play' && g.air > 0 && g.sinceContact > JUMP.coyote) for (let k = 0; k < g.air; k++)   // in the air: the jumps it has left
    disc(hero.cx + (k - (g.air - 1) / 2) * 0.5 * R, hero.maxY + 0.42 * R, 0.15 * R, INK.white, 1);
  for (let k = 0; k < nDots; k++) { const u = k / Math.max(1, JUMP.dots - 1); disc(dots[2 * k], dots[2 * k + 1], (2.4 - 1.2 * u) * PIX.size, INK.white, 1); }   // the slingshot's arc: solid dots that shrink (tiny see-through ones would dither to crumbs)
  const nFront = this.nf - front;
  gl.bindVertexArray(null);
  this.upload(gl.ARRAY_BUFFER, this.vbo, this.vtx, this.nv * 10, 'vboCap');
  if (this.idxDirty) { this.upload(gl.ELEMENT_ARRAY_BUFFER, this.ebo, this.idx, this.ni, 'eboCap'); this.idxSig = sig; }
  this.upload(gl.ARRAY_BUFFER, this.fbo, this.fdata, this.nf * 14, 'fboCap');
  const P = PIX.size, sx = Math.round(shake.x / P) * P, sy = Math.round((shake.y - cam) / P) * P;   // the camera, in whole game pixels
  const [lw, lh] = this.low, grid = (u) => gl.uniform2f(u.uGrid, -sx / P, lh - sy / P);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fb);
  gl.viewport(0, 0, lw, lh);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  gl.disable(gl.BLEND);
  const pg = this.pBg;
  gl.useProgram(pg.p);
  gl.uniform2f(pg.u.uShake, sx, sy); gl.uniform2f(pg.u.uWalls, lv.l, lv.r); gl.uniform1f(pg.u.uPix, P); grid(pg.u);
  gl.uniform3fv(pg.u.uTop, th.top); gl.uniform3fv(pg.u.uDots, th.dots);
  gl.uniform3fv(pg.u.uWall, th.wall); gl.uniform3fv(pg.u.uWallD, th.wallD); gl.uniform3fv(pg.u.uLip, th.lip);
  gl.bindVertexArray(this.emptyVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.BLEND);
  const pf = this.pFeat, ps = this.pShadow, pb = this.pBody;
  gl.useProgram(pf.p);
  gl.uniform2f(pf.u.uView, W, H); gl.uniform2f(pf.u.uShake, sx, sy); gl.uniform1f(pf.u.uPix, P); grid(pf.u);
  this.drawFeat(0, back);
  gl.useProgram(ps.p);
  gl.uniform2f(ps.u.uView, W, H); gl.uniform2f(ps.u.uShake, sx, sy); grid(ps.u);
  gl.uniform2f(ps.u.uOffset, 0, RENDER.shadowOffset); gl.uniform1f(ps.u.uShadowA, RENDER.shadowA);
  gl.bindVertexArray(this.bodyVao);
  for (const r of this.ranges) gl.drawElements(gl.TRIANGLES, r.sCount, gl.UNSIGNED_INT, r.sStart * 4);
  gl.useProgram(pb.p);
  gl.uniform2f(pb.u.uView, W, H); gl.uniform2f(pb.u.uShake, sx, sy); gl.uniform2f(pb.u.uOffset, 0, 0); grid(pb.u);
  for (const r of this.ranges) {
    gl.useProgram(pb.p);
    gl.bindVertexArray(this.bodyVao);
    gl.uniform3fv(pb.u.uBase, r.b.color.base); gl.uniform3fv(pb.u.uDeep, r.b.color.deep); gl.uniform2f(pb.u.uOrigin, Math.round(r.b.cx / P), Math.round(r.b.cy / P));
    {   // the target always has a stencil
      // Fill by winding number (as in Gum), so a crushed outline that turns back on
      // itself neither folds nor loses lobes.
      gl.enable(gl.STENCIL_TEST);
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
      gl.drawElements(gl.TRIANGLES, r.web, gl.UNSIGNED_INT, r.bStart * 4);
      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.EQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.drawElements(gl.TRIANGLES, r.bCount - r.web, gl.UNSIGNED_INT, (r.bStart + r.web) * 4);
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
      gl.drawElements(gl.TRIANGLES, r.web, gl.UNSIGNED_INT, r.bStart * 4);
      gl.disable(gl.STENCIL_TEST);
    }
    if (r.fCount) { gl.useProgram(pf.p); this.drawFeat(r.fStart, r.fCount); }
  }
  gl.useProgram(pf.p);
  this.drawFeat(front, nFront);
  if (lv.dark) {   // the lights, nearest the hero first, at most 16
    const L = this.darkBuf, Rp = R / P;
    let n = 0;
    const light = (x, y, r0, r1) => { if (n < 16 && y > top - r1 * P && y < bot + r1 * P) { L.set([x / P, y / P, r0 * Rp, r1 * Rp], n * 4); n++; } };
    const breath = 1 + 0.03 * Math.sin(T * 2.2);
    light(hero.cx, hero.cy, 4.5 * breath, 7.5 * breath);
    if (lv.portal) light(lv.portal.x, lv.portal.y, 2, 4);
    for (const s of lv.shots) if (s.fire) light(s.x, s.y, 0.5, 1.4);
    for (const b of lv.bubbles) light(b.x, b.y, 1.2, 2.6);
    const near = (o) => (o.x - hero.cx) ** 2 + (o.y - hero.cy) ** 2;
    for (const c of lv.coins.slice().sort((a, b) => near(a) - near(b))) light(c.x, c.y, 0.5, 1.3);
    const pd = this.pDark;
    gl.useProgram(pd.p); grid(pd.u);
    gl.uniform4fv(pd.u['uLights[0]'], L); gl.uniform1i(pd.u.uN, n); gl.uniform2f(pd.u.uFire, lv.fire ? lv.fire.y / P : 1e9, (3 * R) / P);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target.fb);   // up onto the canvas, pixel for pixel
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  gl.blitFramebuffer(0, 0, lw, lh, 0, 0, this.canvas.width, this.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};
