"use strict";
/* ─────────────────────────────────────────────────────────────
   Upwell — the world: tuning and content tables, the level (a well
   shaft, a room behind a bubble, the boss arena), how bodies touch it,
   and how it is drawn. Loaded after src/gum.js, before src/game.js.
   ───────────────────────────────────────────────────────────── */

const VERSION = '0.3.0';
const BASE_STICK = Object.assign({}, STICK);   // upgrades scale STICK per run; this is where it starts

// ── Tuning ───────────────────────────────────────────────────
// Lengths in CSS pixels or in hero radii (R) where noted, time in seconds. The well is
// as wide as the view; the hero and everything in the well are sized from it.
const HERO = { sizeFrac: 1 / 16, sizeMin: 16, sizeMax: 40 };   // a tile: the well is 16 tiles wide (COLS)
// Buttons, as in Downwell. Left and right run at `speed` R/s, reached at `accel`/s on a
// floor and `air`/s in the air; `slip` is a floor's friction while running on the keys (it holds
// the run to about 4.7 R/s: smooth, as testers wanted); a swipe runs with none, at the full
// `speed`, and along a floor is braked back to it after a dash. A wall takes
// the hero when it comes in at `cling` px/s or more, or is pressed toward it. Stuck under a
// ceiling it creeps along it at `ceil` R/s, for as long as it holds on (STICK.hold).
const MOVE = { speed: 7.8, accel: 10, air: 8, slip: 0.06, cling: 40, ceil: 5 };   // accel/air halved and speed a little lower: testers found it twitchy
// A jump rises `height` R (the soft body's bottom, stretching off, about 1 R less); letting
// go on the way up keeps `cut` of the speed. Off a wall it goes `wallX` R/s outwards and
// `wallUp` of a jump up, every time. Off a ceiling it pushes down at `ceil` of a jump, or,
// with a side pressed, dashes that way at `dash` R/s, dipping at `dashDown` of a jump. A dash
// is also a double tap of a side or a quick swipe (`dashCD` s apart, once in the air until a
// landing). Pressed against the side of a ledge whose top is level with its body, the hero
// hops up onto it (`mantleCD` s apart). One more jump in the air comes free (MODS.airJumps). Down lets
// go of anything, for `dropAfter` s and for as long as it is held. `coyote`: a jump still
// counts this long after leaving a surface; `buffer`: a press in the air waits this long for
// one; `stickAfter`: no sticking right after a jump, or a leap along a wall would glue
// straight back on. The mouse is a slingshot (press, pull back, let go): a pull of
// `dragFrac` of the view's width is a full jump, the shortest `minPower` of one, a pull under
// `deadZone` px nothing; off a surface it never goes into it (at least `minUp` away from it);
// while it is held the body is squeezed by `squeeze` and `dots` show `preview` s of the arc.
// `mouse` turns the slingshot on (off for now: keys and the touch pad only).
const JUMP = { height: 7.4, cut: 0.45, wallX: 10, wallUp: 0.95, ceil: 0.6, dash: 16, dashDown: 0.12, dashCD: 0.35, mantleCD: 0.35, dropAfter: 0.3, stretch: 2.2,
  coyote: 0.1, buffer: 0.14, stickAfter: 0.16, dragFrac: 0.36, minPower: 0.22, deadZone: 14, minUp: 0.2, squeeze: 0.8, preview: 0.8, dots: 16, mouse: false };
// Down held on a floor (↓, or the stick pulled down): the hero squashes; a jump from there goes `height` times as high, and
// the air jump is still there after it (user).
const CROUCH = { squeeze: 1, height: 2 };
// Thicknesses in R; a shaft is made `ahead` views above the camera and dropped `behind`
// views below it; `room` (R) is the least space under a solid ledge over another one;
// `toPlank` of the plain one-tile ledges are laid as planks, to jump up through.
const LEVEL = { wall: 12, thick: 0.75, plank: 0.32, spike: 0.42, ahead: 1.5, behind: 1.2, pocketEnd: 24, room: 4.5, toPlank: 0.35 };
const DOOR = { w: 2.4, h: 2.8 };   // in R: a way into a shop or a stash, and the way back out
// The way out pulls at `pull` R/s into the hole, `spin` R/s round it at first, and shrinks the
// hero away in `shrink` s. It hangs `rise` R over the top of the shaft: a jump across the last
// ledges (at a crawler on them, say) passes under it, a full one up from the top ledge gets in.
const PORTAL = { pull: 9, spin: 4, shrink: 0.7, rise: 7 };
// The hero is kept at `anchor` of the view height going up, and going down at least `keep`
// hero heights over the touch keys (or the screen's bottom): a fall is followed, down to the
// floor, and caught by a ledge or the fire. The ceiling over an exit stops the camera `top` px
// under the screen's top; were the hero ever to drop `deathPad` below the bottom anyway, that
// costs a heart and puts it back on the last ledge it stood on.
const CAM = { anchor: 0.62, follow: 7, floorShow: 90, top: 70, deathPad: 40, keep: 3, high: 0.3 };   // high: see Game.frame
const R_PER_M = 2.2;   // a metre of climb is 2.2 hero radii (64 px when the well was 12 tiles), so a level is as many jumps on any screen
const HEALTH = { start: 4, invuln: 1.0, knock: 520, hitstop: 0.08, blink: 0.09 };
// A run that ends can go on for coins: `price`, half as much again a world (as in the shops)
// and `grow` times more each time in a run; back with `hp` hearts and `invuln` s of safety.
const REVIVE = { price: 50, grow: 2, invuln: 2.5 };   // a revive gives all the hearts back (user)
// A stomp bounces the hero at `bounce` of a jump's speed; `blast` (R) is the Blast upgrade's reach. It counts
// when the hero meets an enemy from over it: its middle `above` of their radii over the enemy's and at least
// `slope` as far up as across, not rising away faster than `rel` px/s — or coming down on it at all (generous:
// testers found stomps too exact). `bounce` was 1.0, then 0.8: the user found the hop off a kill too high.
const STOMP = { bounce: 0.7, keepVx: 0.45, hitstop: 0.045, blast: 3.4, above: 0.15, slope: 0.3, rel: -350 };
// A fizz candy, found once or twice a level (at `at` of its height, from..to), makes the hero shoot by
// itself for `time` s (+`plus` a Long charge): a bullet every `every` s at the nearest enemy or blob within
// `range` R, flying `speed` R/s; it stops at a block and breaks a crumbling one.
const GUN = { time: 8, plus: 2, every: 0.22, range: 5.5, speed: 32, r: 0.14, at: [[0.22, 0.4], [0.58, 0.78]] };
// The helmet (once rock candy; user): for `time` s any jump (off a floor, a wall, a ledge's underside, or in the air) rams up: a solid ledge no taller than
// `maxH` tiles found `reach` R over the hero (`look` R off a ceiling) breaks before it is met, its enemies with it, `coins` once ever,
// the hero kicked on up at `kick` of a jump; it is back `back` s later, or under a hero coming down onto it once `soon` s are out.
const SMASH = { time: 11, maxH: 1.5, reach: 0.5, look: 1, kick: 0.8, back: 3.5, soon: 1, coins: 2, hitstop: 0.05, shake: 5 };   // back 1 s later than at first (user)
// Rainbow: for `time` s nothing hurts and an enemy touched pops (from above it is still a stomp); the hero cycles the six inks every
// `cycle` s (`slow` in its last second), a tail of up to `n` points `gap` R apart trails it in bands `band` R wide, shorter over the
// last `fade` s; then `grace` s of the usual safety.
const RAINBOW = { time: 9, cycle: 0.1, slow: 0.3, n: 14, gap: 0.4, band: 0.18, fade: 1.5, grace: 0.8 };
// The grow candy: the hero `size` times as big breaks any block it runs or jumps into (reach R ahead, more at speed; not the one
// under it, whose top is within `feet` R of its bottom), spikes and all, at `jolt` of a smash's hitstop and shake; enemies it
// touches go. Spikes, blobs and fire still hurt. After it, `grace` s of a hit's safety (user).
const GROW = { time: 9, size: 2, reach: 0.25, feet: 0.3, jolt: 0.5, grace: 2 };
// The swarm (user): for its time the hero is 5-7 of its kind in the other colours round it, each wrecking what it touches
// (enemies, and blocks over its feet); `size` theirs, R; `orbit` their ring's, R; `spin` its turn, rad/s; `back` the last s, home.
const SWARM = { time: 7, n: [5, 7], size: 0.9, orbit: 2.9, spin: 3.2, back: 0.3, trail: 6 };   // 7 s, clones and their ring a fifth bigger (user), `trail` dots of each clone's colour behind it
const CANDY = { fizz: GUN, smash: SMASH, rainbow: RAINBOW, grow: GROW, swarm: SWARM };
// Folk along the way (user's picks): a blob in a cage on a ledge (`cageP` of levels, at `cage` of the height) that a touch
// sets free — it pays `coins`, or a heart, by turns; a trader on a ledge (`traderP`, at `trader`) with one thing for sale;
// now and then (`critterP` a chunk) a bat under a block or a bug on a ledge that keep `flee` R clear of the hero, harmless.
// Laid by a generator of their own, so the shaft is laid as before; none in a bonus level.
const FOLK = { cage: [0.3, 0.55], cageP: 0.75, trader: [0.6, 0.85], traderP: 0.5, critterP: 0.3, coins: 8, flee: 3 };
// The lore's lines (the plan: under eight words, in turn): what one set free says, balls of your kind the sour ones
// caught on their way up; and Aunt Moti's word at each sale, in her shop or on a ledge.
const SAY = {
  freed: [
    { en: "Thank you! I'm with you!", es: '¡Gracias! ¡Voy contigo!', pt: 'Obrigado! Vou com você!', ja: 'ありがとう！ いっしょに いく！' },
    { en: 'Free! Up to the Light!', es: '¡Libre! ¡Hacia la Luz!', pt: 'Livre! Rumo à Luz!', ja: 'じゆうだ！ ひかりへ！' },
    { en: 'The sour ones got me. Phew!', es: 'Me atraparon los ácidos. ¡Uf!', pt: 'Os azedos me pegaram. Ufa!', ja: 'すっぱい やつに つかまってた！' },
    { en: 'I climbed this far long ago.', es: 'Subí hasta aquí hace mucho.', pt: 'Subi até aqui faz tempo.', ja: 'まえに ここまで きたんだ。' },
    { en: "Lead the way, I'll follow!", es: '¡Tú delante, yo te sigo!', pt: 'Vai na frente, eu te sigo!', ja: 'さきに いって！ ついていく！' },
  ],
  moti: [
    { en: "Take it while it's warm!", es: '¡Llévatelo, que está calentito!', pt: 'Leva, que está quentinho!', ja: 'あったかい うちに どうぞ！' },
    { en: 'No change, dear.', es: 'No hay cambio, cielo.', pt: 'Não tem troco, querido.', ja: 'おつりは ないよ。' },
    { en: 'Good pick. Climb well!', es: 'Buena elección. ¡Sube bien!', pt: 'Boa escolha. Suba bem!', ja: 'いい えらびだね。 がんばって！' },
    { en: 'The runes spoke of you.', es: 'Las runas hablaban de ti.', pt: 'As runas falaram de você.', ja: 'ルーンに きみが いた。' },
    { en: 'Mind the sour ones, sweetie.', es: 'Cuidado con los ácidos, cielo.', pt: 'Cuidado com os azedos, docinho.', ja: 'すっぱい やつに きをつけて。' },
  ],
};
const CRITTER = {   // '#' the world's ink, 'w' white; a bat hangs and flaps, a bug walks
  bat: ['#...#', '.###.', '#w#w#', '.###.', '..#..'], batUp: ['#.....#', '##.#.##', '.#w#w#.', '..###..'], batDown: ['..###..', '.#w#w#.', '##.#.##', '#.....#'],
  bug: ['..##.', '.#w##', '#.#.#'], bug2: ['..##.', '.#w##', '.#.#.'] };   // the kinds of candy; each lasts its `time` (+ GUN.plus a Long charge; all 3 s longer than at first, user)
// Combo rewards, paid when the hero lands on a floor; the best one reached counts.
const COMBO = [{ at: 3, coins: 10 }, { at: 5, coins: 25 }, { at: 8, coins: 50, hp: 1 }];
// A level's stars: one for getting out, the second for `half` its coins, the third for all of them (enemies do not
// count, user); `coins` pays for 1, 2, 3.
const STARS = { coins: [1, 2, 5], half: 0.5 };
// Coins: radius and magnet reach in R. An enemy's burst out at `burst` px/s and after `home` s
// home in on the hero from anywhere, at `seek` px/s more than its own pace (three times that a
// second on), turning at `steer`/s: they always get to it.
const COIN = { r: 0.54, magnet: 2.6, drag: 2.4, burst: 260, home: 0.25, seek: 600, steer: 10 };   // a coin the magnet reaches homes in as an enemy's does (user: faster)
const SPRING = { v: 1.45, anim: 0.18 };   // v: of a jump's speed
// Ledges by world (user: some bounce, some pull; the random run's): a Cave plank in `bouncy` of them throws the hero up at `v`
// of a jump as it lands; a Mine block in `magnet` pulls it in within `range` R at `pull` R/s² (MAGNET), more the nearer.
const BOUNCY = { v: 1.05 }, MAGNET = { range: 3.2, pull: 70 };
// A boost ring (user: a ring that rockets the hero up through a quarter of the level, smashing): in `p` of a run's levels, at `at`
// of its height, `r` R round; through it the hero flies up at `v` of a jump through all (breaking what breaks, popping what it
// meets), `lift` of the level's height, then on from the first clear place.
const RING = { p: 0.6, at: [0.15, 0.4], r: 1.2, v: 2.6, lift: 0.25 };
// A gate (user: a simple puzzle on every other level of a world, something to break to get on): a ledge right across the shaft
// with a cracked keystone (see 'X') a head-butt from below breaks, at `at` of the level's height; on the campaign levels that name
// one (a recipe's `gate`: its chunk), and on each world's second level in a run (`run`: the chunk by world). While a whole one is
// over the hero there is no idling (the fire keeps its pace while it is worked out).
const GATE = { at: [0.55, 0.65], run: ['gate', 'gate2', 'gate3', 'gate3'] };
// A level crossing (user: a crossing's lights, a train flying through the level left to right; under it is not to be): in `p` of
// the run's levels past the Cave, at `at` of the height, a band `h` of the view tall with rails along its foot. On screen it rests
// `rest` s (from, to), rings and flashes `warn` s, then the train, `len` views long, goes through at `v` views a second, and hurts.
const TRAIN = { p: 0.45, at: [0.3, 0.7], h: 0.11, rest: [4, 7], warn: 1.6, len: 2.5, v: 2.2 };
const ROOM_THROW = { vx: 60, up: 0.85, hold: 0.45 };   // into a room the hero is thrown across at `vx` R/s, up at `up` of a jump: onto the far wall high, stuck there `hold` s (user)
const CRUMBLE = { time: 0.55, back: 3 };   // gives way `time` s after a touch, is back `back` s later
const SLICK = { fr: 0.03 };
// Wall coats beside ice: moss takes the hero at a touch and lets it slide at `slide` of the
// usual speed; rubber takes nothing and throws it back off at `x` R/s and `up` of a jump's
// speed, when it comes in faster than `min` R/s.
const MOSS = { slide: 0.15 };
// Ceilings: for now (user) only a block with moss under it ('~' in a chunk) holds the hero hanging; any: true, every ceiling, as before.
const CEIL = { any: false };
const RUBBER = { x: 9, up: 0.55, min: 2 };
// Fire rises under the shaft and burns marmalade. It climbs at its world's `fire` R/s and never
// stays more than `lag` of the view below the screen; once the hero has gained no height for
// `idle` s it speeds up, `boost` times as fast after `ramp` s more. Touching it costs a heart,
// throws the hero up at `launch` of a jump's speed and sinks it back `back` of the view. While
// its top is on screen it spits a blob (`blob` R) at the hero every `spit` s (from, to), first
// flaring `warn` s where the blob will come out.
// `calm`: in 1-1 the fire waits that many s before it rises, and an idle hero does not speed it up (the digest §6: no losing while learning).
const FIRE = { calm: 15, lag: 0.5, idle: 3, boost: 3, ramp: 2, launch: 1.7, back: 0.3, spit: [3, 6], warn: 0.5, blob: 0.34 };
const SHOT_G = 1600;   // px/s², pulling a thrown or dropped blob down
// The boss fight goes round (user: there was no way onto it under the ceiling): it hovers (`hover` s, `fast` of that when
// angry or half beaten) `high` R over the floor (in sight under the HUD; clear of a hero standing on a ledge), swaying
// `sway` of the width, dropping goo and calling crawlers; shakes over the hero `warn` s; dives at `dive` R/s into
// the middle of the arena (no planks there); lies there `dazed` s, flat, a yellow arrow over it — then a stomp hurts it and
// its side does not; then it rises again. A stomp bounces at `bounce` of a jump's speed.
const BOSS = { size: 2.1, hp: 6, angry: 2.0, dropEvery: 3.2, spawnEvery: 4.6, maxMinions: 2, coins: 40, winDelay: 2.2, bounce: 1.9,
  hover: 3.6, fast: 0.65, high: 12, sway: 0.15, warn: 0.8, dive: 40, dazed: 2.8 };
// The Puck (BOSSES.puck, world 2): it slides the ice at `slide` R/s, flicking a shell out every `every` s (as many as
// `shells` by phase); rests `rest` s, winds up `wind` s (backing off, flat, flashing) and dashes wall to wall at `dash`
// R/s, its wall shaking `icicles` down by phase. Its top is hard; a shell rolled into it turns it belly up for `flip` s.
// It keeps still its first `calm` s, while its name is up (the plan: an encounter starts safe).
// The Minecart (BOSSES.cart, world 3): `size` R, rides its rail end to end in `pass` s by phase, lobs blobs (two from its
// second phase) every `spit` s after winding up `wind` s, creaks `creak` s at an end and tips three rocks (`rock` R) down.
// From its second phase the bridges go in `crumble[0]` s and come back in `crumble[1]`; in its third the lifts run `lifts` times as fast.
// In its arena a ceiling holds `hold` s longer: time to hang over a rail's end and wait for it. It keeps still its first `calm` s.
const CART = { size: 2.2, pass: [4, 3.4, 2.6], spit: 2.5, wind: 0.6, creak: 0.8, rock: 0.35, crumble: [0.35, 4.5], lifts: 1.5, hold: 2, calm: 2.5 };
const PUCK = { slide: 3.2, every: 4, shells: [1, 2, 2], rest: [2.6, 2, 0.8], wind: 0.7, dash: [13, 17, 21], icicles: [0, 1, 2], flip: 2.5, calm: 2.5 };

// ── Looks ────────────────────────────────────────────────────
// The canvas is pixel art: one game pixel is `size` CSS px (the canvas is that much smaller
// and scaled up with hard edges), the camera moves in whole game pixels, and everything is
// drawn in the nine inks of the palette sheet (research/refs), flat or as 1-bit patterns
// of one ink over another.
const PIX = { size: matchMedia('(pointer: coarse)').matches ? 1.5 : 2 };   // a phone's screen is small and sharp: finer there (1 was too fine)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PAL = { black: hex('#141414'),   // a tone lighter and brighter than at first (user)
  red: hex('#f43e34'), blue: hex('#5bb8ff'), yellow: hex('#ffed57'), green: hex('#339c39'),
  purple: hex('#c996ff'), orange: hex('#faa23e'), gray: hex('#c8c8c8'), white: hex('#f3f3f3') };
// 80/20: the world in its one ink, and the bright inks mean something: yellow is what can be
// taken (coins, items), red is danger (enemies, spikes, fire), white the hero and the edges; a
// surface that behaves differently (ice, moss, rubber, crumbling, moving, springs) has a colour of its own.
const INK = { spike: PAL.red, coin: PAL.yellow, coinD: PAL.orange, fire: PAL.red, flame: PAL.orange, white: PAL.white, dark: PAL.black };
const RAINBOW_INK = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'].map((id) => PAL[id]);   // the one thing in all the inks at once
const FOE_COLOR = {
  red: { id: 'red', base: PAL.red, deep: PAL.black },
  boss: { id: 'boss', base: PAL.purple, deep: PAL.black },
  goo: { id: 'goo', base: PAL.black, deep: PAL.gray },   // a skull's black goo (the user's picture)
};
// A world in one ink over black for its walls, ledges and far dots, with white for the edge you
// stand on; the surfaces that behave differently in colours of their own (`o` picks others where
// the usual one is the world's ink): ice, moss, rubber, crumbling blocks, movers, springs.
const theme = (ink, o = {}) => ({ top: PAL.black, bot: PAL.black, dots: ink, wall: ink, wallD: PAL.black, lip: PAL.white, block: ink, plank: ink,
  slick: o.ice || PAL.blue, moss: PAL.green, rubber: o.rubber || PAL.purple, crumble: o.crumble || PAL.orange, mover: o.mover || PAL.blue, spring: o.spring || PAL.purple });
const THEMES = {
  cave: theme(PAL.gray), ice: theme(PAL.blue, { ice: PAL.white, crumble: PAL.gray, mover: PAL.purple }), mine: Object.assign(theme(PAL.orange, { crumble: PAL.gray }), { pit: true }),   // pit: the Mine's kit (see mineRect)
 
  void: theme(PAL.purple, { rubber: PAL.blue, spring: PAL.blue, mover: PAL.gray }), summit: theme(PAL.gray), room: theme(PAL.orange, { crumble: PAL.gray }),
  stash: theme(PAL.purple, { rubber: PAL.blue, spring: PAL.blue, crumble: PAL.gray }),   // in the purple of its door (user)
  tokyo: Object.assign(theme(PAL.blue, { ice: PAL.white, crumble: PAL.gray, mover: PAL.purple }), { win: true, town: true }),   // Tokyo's town at night (see TOKYO)
  blocks: Object.assign(theme(PAL.gray, { mover: PAL.blue, spring: PAL.blue }), { win: 'grid', panels: true }),   // the Tower Blocks: raw concrete (see BLOCKS)
  junk: Object.assign(theme(PAL.green, { ice: PAL.gray, mover: PAL.blue, spring: PAL.black, crumble: PAL.orange }), { moss: PAL.gray, plank: PAL.orange, win: 'brick', junk: true }),   // the Junkyard (see JUNK)
  sky: Object.assign(theme(PAL.purple, { mover: PAL.blue, spring: PAL.blue, rubber: PAL.blue, crumble: PAL.white }), { dots: PAL.gray, win: 'clouds', glass: true }),   // the Skyscraper (see SKY)
  crypt: Object.assign(theme(PAL.white, { crumble: PAL.gray, mover: PAL.gray, spring: PAL.gray }), { bot: PAL.gray, grad: true, wall: PAL.gray, drips: true }),   // the Crypt: black above dithering down to grey, white stone, black goo dripping off it (the user's skull picture)
};
// Gum's looks in the same inks: the hero's colours (the first is the default) and the face.
PALETTE.splice(0, PALETTE.length, ...['white', 'orange', 'blue', 'green', 'purple'].map((id) => ({ id, base: PAL[id], deep: PAL.black })));
Object.assign(THEME, { ink: PAL.black, blush: PAL.red, rim: PAL.white });

// ── Content ──────────────────────────────────────────────────
// Enemies are red squishies that crawl (none of them flies or jumps), each by its `move`: along
// a ledge (crawl), up and down a stretch of wall (wall), round and round a block (round).
// `size` is in hero radii, `speed` in px/s on average, pushed in pulses every `step` s; `grav` 0
// holds on without falling. Those with `stomp` may be stomped from above; touching one any other
// way hurts, and a hedgehog hurts from above too. Their own ways: a shell stomped rolls off along
// its ledge into the others (SHELL); a spitter stops to lob a blob at the hero (SPIT); a splitter
// stomped breaks into two minis; a chaser keeps to the hero's height on its wall.
const ENEMY = {
  crawler: { design: 'loaf', color: 'red', size: 0.8, grav: 1, stomp: true, coins: 3, speed: 60, step: 0.6, move: 'crawl' },
  climber: { design: 'mochi', color: 'red', size: 0.74, grav: 0, stomp: true, coins: 4, speed: 46, step: 0.7, move: 'wall' },
  circler: { design: 'cat', color: 'red', size: 0.72, grav: 0, stomp: true, coins: 5, speed: 54, step: 0.8, move: 'round' },
  hedgehog: { design: 'star', color: 'red', size: 0.8, grav: 1, stomp: false, coins: 6, speed: 46, step: 0.7, move: 'crawl' },
  shell: { design: 'dome', color: 'red', size: 0.82, grav: 1, stomp: true, coins: 4, speed: 44, step: 0.8, move: 'crawl' },
  spitter: { design: 'drop', color: 'red', size: 0.8, grav: 1, stomp: true, coins: 5, speed: 38, step: 0.7, move: 'crawl' },
  splitter: { design: 'peanut', color: 'red', size: 1.0, grav: 1, stomp: true, coins: 2, speed: 34, step: 0.9, move: 'crawl' },
  mini: { design: 'mochi', color: 'red', size: 0.5, grav: 1, stomp: true, coins: 2, speed: 80, step: 0.4, move: 'crawl' },
  chaser: { design: 'slug', color: 'red', size: 0.74, grav: 0, stomp: true, coins: 5, speed: 70, step: 0.5, move: 'wall', chase: true },
  worm: { design: 'round', color: 'red', size: 0.85, grav: 1, stomp: true, coins: 6, speed: 0, step: 0.9, move: 'flow' },   // a knot of tubes, flowing ledge to ledge (WORM)
  skull: { design: 'dome', color: 'goo', size: 1.1, grav: 1, stomp: true, coins: 5, speed: 40, step: 0.8, move: 'crawl' },   // a skull in black goo, dripping (SKULL; the Crypt's)
};
// The worm (user's video: dithered tubes flowing over each other, ball tips): its knot is stomped, its tubes hurt. Four tubes,
// two to a side, waving up and out (the knot's top is clear: the way to stomp it); `len` theirs, R, in discs `seg` apart, `w`
// half-wide, `tip` the balls at their ends. On a ledge it `wait`s, then, on screen, reaches a tube out (`reach` s, the warning)
// to a ledge `near` (R across) and pours itself along it in `flow` s, all of it hurting meanwhile.
const WORM = { len: 1.7, seg: 0.24, w: 0.27, tip: 0.24, wait: [2.4, 4], reach: 0.6, flow: 0.7, near: [2.5, 7], angles: [-0.15, -0.5, Math.PI + 0.15, Math.PI + 0.5], wave: 0.3 };
// The flip side (user: liquid pixel spots as in their picture, blue round yellow round white, red and black in it): a spot in the
// shaft leads under the level, down a short light shaft, fallen as in Downwell (stomp on the way, coins as rain); its floor brings
// the hero back up the level `lift` m over where it went in (a shortcut). `len` its depth, m; a random run's level has a spot
// with odds `p`, `at` a share of the way up; `r` a spot's size, R.
const UNDER = { len: 30, lift: 12, at: [0.25, 0.6], p: 0.55, r: 1.25 };
// A world's runes (its tapestry's, CAMPAIGN) hung on the shaft's back wall by a side wall, quiet, in the world's own ink:
// as many as a recipe's `runes` (the plan: 1-9, before the boss), and in a run one in `p` of its levels; the first at
// `at[0]` of the height, the second at `at[1]`. By a generator of their own.
const RUNE = { p: 0.2, at: [[0.3, 0.42], [0.62, 0.75]] };
// The book's enemies: their names, and a line on each (their hints say the rest).
// What each does, for the book (a line, under eight words).
const FOE_DESC = {
  crawler: { en: 'Crawls its ledge. Land on it!', es: 'Repta por su saliente. ¡Cae encima!', pt: 'Rasteja na sua borda. Pule em cima!', ja: 'いたの うえを はう。うえから ふもう！' },
  climber: { en: 'Crawls up and down the walls.', es: 'Sube y baja por las paredes.', pt: 'Sobe e desce pelas paredes.', ja: 'かべを のぼりおりする。' },
  circler: { en: 'Circles round its block.', es: 'Da vueltas a su bloque.', pt: 'Gira em volta do seu bloco.', ja: 'ブロックの まわりを まわる。' },
  hedgehog: { en: 'Red and prickly: never stomp it.', es: 'Rojo y con púas: no lo pises.', pt: 'Vermelho e espinhoso: não pise.', ja: 'トゲトゲ: ふんでは だめ。' },
  shell: { en: 'Stomped, it rolls into the others.', es: 'Pisado, rueda contra los demás.', pt: 'Pisado, rola contra os outros.', ja: 'ふむと ころがって ぶつかる。' },
  spitter: { en: 'Lobs blobs at you. Dodge, then stomp.', es: 'Te lanza bolas. Esquiva y pisa.', pt: 'Atira bolas em você. Desvie e pise.', ja: 'たまを なげる。よけて ふもう。' },
  splitter: { en: 'Stomp it and it splits in two.', es: 'Písalo y se parte en dos.', pt: 'Pise e ele se divide em dois.', ja: 'ふむと ふたつに わかれる。' },
  mini: { en: "A splitter's half: small and quick.", es: 'Medio divisor: pequeño y rápido.', pt: 'Metade de um divisor: pequeno e rápido.', ja: 'ブンレツの かたわれ。はやい。' },
  chaser: { en: 'Crawls the walls up to your height.', es: 'Trepa las paredes hasta tu altura.', pt: 'Sobe as paredes até a sua altura.', ja: 'きみの たかさまで かべを のぼる。' },
  worm: { en: 'Stomp the knot, not the tubes!', es: '¡Pisa el nudo, no los tubos!', pt: 'Pise no nó, não nos tubos!', ja: 'むすびめを ふめ、くだは さけろ！' },
  skull: { en: 'Creeps in its goo, lunges up close.', es: 'Se arrastra en su baba; se lanza de cerca.', pt: 'Rasteja na gosma; ataca de perto.', ja: 'どろどろ はう。ちかいと とびかかる。' },
};
const FOE_NAMES = {
  crawler: { en: 'Crawler', es: 'Reptador', pt: 'Rastejante', ja: 'ハイハイ' }, climber: { en: 'Climber', es: 'Trepador', pt: 'Escalador', ja: 'カベノボリ' },
  circler: { en: 'Circler', es: 'Rondador', pt: 'Rondador', ja: 'グルグル' }, hedgehog: { en: 'Hedgehog', es: 'Erizo', pt: 'Ouriço', ja: 'ハリネズミ' },
  shell: { en: 'Shell', es: 'Caparazón', pt: 'Casco', ja: 'こうら' }, spitter: { en: 'Spitter', es: 'Escupidor', pt: 'Cuspidor', ja: 'ペッペ' },
  splitter: { en: 'Splitter', es: 'Divisor', pt: 'Divisor', ja: 'ブンレツ' }, mini: { en: 'Mini', es: 'Mini', pt: 'Mini', ja: 'チビ' },
  chaser: { en: 'Chaser', es: 'Perseguidor', pt: 'Perseguidor', ja: 'オイカケ' }, worm: { en: 'Worm', es: 'Gusano', pt: 'Minhoca', ja: 'ワーム' },
  skull: { en: 'Skull', es: 'Calavera', pt: 'Caveira', ja: 'ドクロ' },
};
const SHELL = { speed: 11, life: 4 };   // a rolling shell: R/s, and s before it pops
const SPIT = { every: [2.6, 4], wind: 0.6, range: 0.9, r: 0.3 };   // s between lobs (from, to), s winding up, reach in views, blob R
// A mini-boss (the plan: a big one of a known enemy, on a variation level, its scene's last): `size` times as big, `hp`
// stomps to beat; a spitter's lobs two blobs at once. 3-4's arena ends with one (a recipe's `mini`).
const MINI = { size: 1.6, hp: 3 };
// Four worlds of three levels, then the boss. `heights` are its levels' lengths in metres (a
// saw: a world starts a little shorter than the last one ended); `chunks` weighs the chunks a shaft is built from (see CHUNKS), `foes` is
// the chance of an enemy in a chunk and `enemies` weighs which, `fire` how fast the fire under it rises, in R/s;
// `dark` lists the levels (0-based) lit only by the hero and what glows (see DARK_FS); `intro`,
// level by level, the chunks it must have (laid first, so the first minutes show the surfaces),
// the enemies allowed (all if not given) and what is new, for the level's banner.
const WORLDS = [
  { id: 'cave', name: { en: 'Cave', es: 'Cueva', pt: 'Caverna', ja: 'どうくつ' }, theme: THEMES.cave, heights: [30, 38, 46], fire: 0.4, bouncy: 0.2,
    chunks: { stairs: 4, planks: 3, shelves: 2, pillars: 3, rest: 1, comb: 2, overhang: 1, chimney: 1, spring: 1, crumble: 1, mosswall: 2, fork: 1, vault: 2 },
    foes: 0.55, enemies: { crawler: 3, climber: 1, hedgehog: 1 },
    intro: [{ chunks: ['mosswall', 'spring'], enemies: ['crawler'], candy: ['smash', 'rainbow'], news: { en: 'moss and springs', es: 'musgo y resortes', pt: 'musgo e molas', ja: 'コケと バネ' } },
      { chunks: ['crumble', 'rubberwall'], enemies: ['crawler', 'climber'], candy: ['smash', 'fizz'], news: { en: 'crumbling blocks, rubber and climbers', es: 'bloques que se caen, goma y trepadores', pt: 'blocos que desmoronam, borracha e escaladores', ja: 'くずれる ブロック、ゴム、カベノボリ' } },
      { chunks: ['icewall', 'lift'], news: { en: 'ice, moving planks and hedgehogs', es: 'hielo, tablas móviles y erizos', pt: 'gelo, tábuas móveis e ouriços', ja: 'こおり、うごく いた、ハリネズミ' } }] },
  { id: 'ice', name: { en: 'Glacier', es: 'Glaciar', pt: 'Geleira', ja: 'ひょうが' }, theme: THEMES.ice, heights: [42, 50, 58], fire: 0.55, dark: [1],
    chunks: { icewall: 3, iceblocks: 3, stairs: 2, planks: 2, shelves: 1, pillars: 2, comb: 2, chimney: 2, overhang: 1, spring: 1, twinshaft: 1, rest: 1, fork: 1, fork2: 1, vault: 1 },
    foes: 0.7, enemies: { crawler: 2, climber: 2, circler: 2, hedgehog: 1, shell: 2 }, intro: [{ news: { en: 'ice blocks, circlers and shells', es: 'bloques de hielo, rondadores y caparazones', pt: 'blocos de gelo, rondadores e cascos', ja: 'こおり ブロック、グルグル、こうら' } }] },
  { id: 'mine', name: { en: 'Mine', es: 'Mina', pt: 'Mina', ja: 'こうざん' }, theme: THEMES.mine, heights: [54, 62, 70], fire: 0.7, dark: [1], magnet: 0.25,
    chunks: { crumble: 3, bridge: 3, lift: 3, planks: 2, shelves: 2, spring: 2, spikes: 1, comb: 2, chimney: 1, movers: 1, rest: 1, stairs: 1, rubberwall: 2, mosswall: 1, fork2: 2, vault: 1 },
    foes: 0.8, enemies: { crawler: 2, climber: 2, circler: 2, hedgehog: 1, shell: 1, spitter: 2, splitter: 2, worm: 1 },
    intro: [{ news: { en: 'bridges, lifts, spitters and splitters', es: 'puentes, elevadores, escupidores y divisores', pt: 'pontes, elevadores, cuspidores e divisores', ja: 'はし、リフト、ペッペ、ブンレツ' } }, {}, { news: { en: 'spikes', es: 'pinchos', pt: 'espinhos', ja: 'トゲ' } }] },
  { id: 'void', name: { en: 'Void', es: 'Vacío', pt: 'Vazio', ja: 'こくう' }, theme: THEMES.void, heights: [66, 74, 82], fire: 0.85, dark: [1],
    chunks: { movers: 3, sparse: 3, spikewalls: 2, twinshaft: 2, planks: 2, shelves: 1, spikes: 1, lift: 2, bridge: 1, rest: 1, rubberwall: 2, fork: 1, fork2: 1, vault: 1 },
    foes: 0.9, enemies: { crawler: 1, climber: 2, circler: 2, hedgehog: 2, shell: 1, spitter: 2, splitter: 1, chaser: 2, worm: 2 },
    intro: [{ news: { en: 'spiked walls, moving planks and chasers', es: 'paredes con pinchos, tablas móviles y perseguidores', pt: 'paredes com espinhos, tábuas móveis e perseguidores', ja: 'トゲの かべ、うごく いた、オイカケ' } }] },
];
// The hardest chunk allowed, by world and level (hard mode allows all).
const MAX_D = [[1, 2, 2], [2, 2, 3], [2, 3, 3], [3, 3, 3]];
// The Crypt (user: a scary level whose enemies are skulls): the random run's second Mine level (`at`: world, stage) in a look
// of its own, its enemies skulls in their black goo and a spitter now and then, to the Void's drone. It shows by itself at
// ?play=crypt, to look at. A skull rushes at a hero within `reach` R on its level for `rush` s at `k` times its pace, then
// rests `every` s (SKULL).
const SKULL = { reach: 5, rush: 0.7, every: 2.2, k: 2.6 };
const SUMMIT = { id: 'summit', name: { en: 'Summit', es: 'Cumbre', pt: 'Cume', ja: 'ちょうじょう' }, theme: THEMES.summit, enemies: {}, chunks: {} };
const CRYPT = Object.assign({}, WORLDS[2], { id: 'crypt', name: { en: 'Crypt', es: 'Cripta', pt: 'Cripta', ja: 'ちかぼち' }, theme: THEMES.crypt, enemies: { skull: 4, spitter: 1 },
  foes: 0.8, maxD: 2, dark: [], at: [2, 1], intro: [{}, { news: { en: 'skulls: they lunge up close', es: 'calaveras: se lanzan de cerca', pt: 'caveiras: atacam de perto', ja: 'ドクロ: ちかいと とびかかる' } }, {}] });
// Tokyo (user: the new settings' first, a Japanese suburb): its town at night in blue, lit windows far off behind (BG_FS uWin), power
// lines sagging across the shaft, signs up its walls in the game's own kana, vending machines on its ledges (THEMES.tokyo `town`, drawn
// by the renderer), a level crossing in most of its levels (`crossing`: the chance). It shows by itself at ?play=tokyo, to look at,
// before it is a world of the map.
// The Junkyard (user: a New York dump; the campaign's world 7): green brick, lit windows far off, brick walls (BG_FS uWin 4), fire escapes
// zigzagging up the walls, dumpsters at a ledge's wall end; fire-escape landings for planks off a wall, wooden pallets for free ones, trash
// bags for springs, greasy steel for ice, chain-link (grey) for the holding moss, a garbage truck through its crossings (THEMES.junk).
const JUNK = Object.assign({}, WORLDS[2], { id: 'junk', name: { en: 'Junkyard', es: 'Basurero', pt: 'Ferro-velho', ja: 'ゴミすてば' }, theme: THEMES.junk, dark: [], maxD: 2, magnet: 0, crossing: 0.6,
  chunks: { planks: 2, shelves: 3, stairs: 2, pillars: 2, comb: 2, chimney: 1, spring: 3, iceblocks: 1, crumble: 1, rubberwall: 1, rest: 1, vault: 1 },
  enemies: { crawler: 3, climber: 2, shell: 2, spitter: 1 },
  intro: [{ news: { en: 'trash bags bounce', es: 'las bolsas de basura rebotan', pt: 'sacos de lixo quicam', ja: 'ゴミぶくろで はねる' } }, {}, {}] });
// The Skyscraper (user: a skyscraper and clouds; the campaign's world 6): dusk in purple, banks of cloud far off (BG_FS uWin 3), glass
// facades up the walls, steel girders for blocks, clouds for the free planks (they dissolve under the hero and gather again; a catwalk
// off a wall holds), bolts dropped from above for icicles (THEMES.sky `glass`). ?play=sky shows it.
const SKY = Object.assign({}, WORLDS[2], { id: 'sky', name: { en: 'Skyscraper', es: 'Rascacielos', pt: 'Arranha-céu', ja: 'まてんろう' }, theme: THEMES.sky, dark: [], maxD: 2, magnet: 0, clouds: true,
  chunks: { planks: 3, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1, lift: 2, movers: 1, rest: 1, vault: 1 },
  enemies: { crawler: 3, climber: 2, shell: 1, spitter: 2 },
  intro: [{ news: { en: 'clouds dissolve under you', es: 'las nubes se deshacen bajo tus pies', pt: 'as nuvens se desfazem sob você', ja: 'くもは あしもとで きえる' } }, {}, {}] });
// The Tower Blocks (user: Soviet brutalism, stairs and panel blocks; the campaign's world 5): raw concrete, a regular grid of windows
// far off (BG_FS uWin 2), riser pipes, satellite dishes and entrances with a bench on its walls and ledges, balconies, heating pipes,
// stairs you walk up (the 'T' step), old mattresses for springs (THEMES.blocks `panels`, drawn by the renderer). ?play=blocks shows it.
const BLOCKS = Object.assign({}, WORLDS[2], { id: 'blocks', name: { en: 'Tower Blocks', es: 'Bloques', pt: 'Blocos', ja: 'だんち' }, theme: THEMES.blocks, dark: [], maxD: 2, magnet: 0,
  chunks: { flight: 4, stairs: 2, shelves: 3, planks: 2, pillars: 2, comb: 1, chimney: 1, crumble: 2, spring: 2, rest: 1, vault: 1 },
  enemies: { crawler: 3, climber: 2, shell: 1, spitter: 2 },
  intro: [{ news: { en: 'stairs: just walk up', es: 'escaleras: sube andando', pt: 'escadas: é só subir andando', ja: 'かいだん: あるいて のぼれる' } }, {}, {}] });
const TOKYO = Object.assign({}, WORLDS[1], { id: 'tokyo', name: { en: 'Tokyo', es: 'Tokio', pt: 'Tóquio', ja: 'とうきょう' }, theme: THEMES.tokyo, dark: [], crossing: 0.85, maxD: 2, awnings: true,
  chunks: { stairs: 3, planks: 3, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 2, lift: 2, movers: 1, bridge: 1, rubberwall: 1, fork: 1, rest: 1, vault: 1 },
  enemies: { crawler: 3, climber: 2, shell: 2, spitter: 1 },
  intro: [{ news: { en: 'level crossings: mind the train', es: 'pasos a nivel: cuidado con el tren', pt: 'passagens de nível: cuidado com o trem', ja: 'ふみきり: でんしゃに ちゅうい' } }, {}, {}] });
// A bonus level after each world's last: a shaft as long as that world's middle level, against the clock (`time` s, about
// 1.1 s a metre) where no heart is lost; out by the hole on top, out of time or caught by the fire, what it paid is shown
// with an offer to double it for an ad, then on to the next world (user). Made like a world, with
// its own: `rain` sprinkles coins over every chunk, `coat` lines both walls, `pack` sets enemies to a
// chunk, `comboMul` multiplies combo rewards; in the fire race the fire ends it.
const BONUS = [
  { id: 'rain', bonus: true, name: { en: 'Bonus: coin rain', es: 'Bonus: lluvia de monedas', pt: 'Bônus: chuva de moedas', ja: 'ボーナス: コインの あめ' }, goal: { en: 'Grab all you can', es: 'Atrapa todo lo que puedas', pt: 'Pegue tudo o que puder', ja: 'できるだけ あつめよう' },
    theme: THEMES.cave, heights: [38, 38, 38], time: 42, maxD: 1, foes: 0, enemies: {}, rain: true,
    chunks: { mosswall: 3, stairs: 2, planks: 2, pillars: 1 } },
  { id: 'rubber', bonus: true, name: { en: 'Bonus: rubber well', es: 'Bonus: pozo de goma', pt: 'Bônus: poço de borracha', ja: 'ボーナス: ゴムの いど' }, goal: { en: 'Bounce your way up the walls', es: 'Sube rebotando en las paredes', pt: 'Suba quicando nas paredes', ja: 'かべで はねて のぼろう' },
    theme: THEMES.ice, heights: [50, 50, 50], time: 55, maxD: 2, foes: 0, enemies: {}, rain: true, coat: 'rubber',
    chunks: { planks: 3, stairs: 2, pillars: 1, rest: 1 } },
  { id: 'combo', bonus: true, name: { en: 'Bonus: combo ladder', es: 'Bonus: escalera de combos', pt: 'Bônus: escada de combos', ja: 'ボーナス: コンボ はしご' }, goal: { en: 'Stomp in a row: combos pay double', es: 'Pisa seguido: los combos pagan el doble', pt: 'Pise sem parar: combos valem o dobro', ja: 'つづけて ふめ: コンボ 2ばい' },
    theme: THEMES.mine, heights: [62, 62, 62], time: 68, maxD: 2, foes: 1, pack: 3, enemies: { crawler: 1 }, comboMul: 2,
    chunks: { stairs: 3, planks: 3, pillars: 2 } },
  { id: 'race', bonus: true, name: { en: 'Bonus: race the fire', es: 'Bonus: carrera contra el fuego', pt: 'Bônus: corrida contra o fogo', ja: 'ボーナス: ほのおと きょうそう' }, goal: { en: 'The fire is fast: run up', es: 'El fuego es rápido: ¡sube!', pt: 'O fogo é rápido: suba!', ja: 'ほのおが はやい: いそげ' },
    theme: THEMES.void, heights: [74, 74, 74], time: 81, maxD: 2, foes: 0, enemies: {}, rain: true, fire: 2.2,
    chunks: { stairs: 2, planks: 2, pillars: 2, lift: 1 } },
];

// The campaign (user, 2026-10-17: ten worlds of ten fixed levels, the first of them so far; the plan is
// research/upwell-100-levels.md). A world teaches, applies, teaches, varies, peaks, pays (its bonus, the 6th),
// turns (the 7th), peaks again, rests, and ends in its boss; one new thing a level at most, none at a peak. A recipe:
//   role     teach, apply, peak, bonus, twist, rest or boss       len    its length, m (20-34 in the Cave: user)
//   fire     the fire, R/s; calm: the s it waits first            maxD   the hardest chunks it may use
//   chunks   the chunks to build it from, by weight               intro  the ones it must show, laid first
//   enemies  their kinds (none: []); foes: the odds of one a chunk, pair: of two
//   candy    the candies' kinds, one each (none: [])             set    its set piece, if any
//   shop     a shop behind a door, at that share of its length    safe   the last heart is not taken (it is learning)
//   stash    a room of coins, the same (low enough: no door in its last LEVEL.pocketEnd tiles)
//   bonus    the BONUS level it is (time: its seconds)            boss   the boss it is
//   news     what is new, for its banner                          seed   its layout: the bot's pick of 20 (tools/botrun.mjs r c1-1 …)
// The campaign's bosses (the plan: ten, each beaten its own way; the first so far): `hp` its hearts and `phase(hp)` what it
// adds as they go (0: dives only, 1: drops goo as it hovers too, 2: calls crawlers too: one thing more a phase, the digest
// §5); what it says coming in (by turns), when the hero dies (a quip) and when it is beaten. The lines under eight words.
const BOSSES = {
  probka: { name: { en: 'Cork', es: 'Tapón', pt: 'Rolha', ja: 'コルク' }, hp: 5, phase: (hp) => (hp >= 4 ? 0 : hp >= 2 ? 1 : 2),
    intro: [{ en: "It's warm here. Why climb?", es: 'Aquí se está calentito. ¿Para qué subir?', pt: 'Aqui é quentinho. Pra que subir?', ja: 'ここは あったかい。なんで のぼるの？' },
      { en: 'Shoo. This spot is mine.', es: 'Fuera. Este sitio es mío.', pt: 'Xô. Esse lugar é meu.', ja: 'しっしっ。ここは わたしの ばしょ。' },
      { en: 'Nobody gets past the Cork.', es: 'Nadie pasa del Tapón.', pt: 'Ninguém passa da Rolha.', ja: 'コルクの さきへは いかせない。' }],
    quip: [{ en: 'Told you. Stay down here.', es: 'Te lo dije. Quédate abajo.', pt: 'Eu avisei. Fica aqui embaixo.', ja: 'ほらね。ここに いなよ。' },
      { en: 'Too slow, little drop.', es: 'Muy lento, gotita.', pt: 'Muito lento, gotinha.', ja: 'おそいよ、しずくちゃん。' }],
    defeat: { en: 'Fine, fine… go on up.', es: 'Vale, vale… sube ya.', pt: 'Tá bom, tá bom… pode subir.', ja: 'わかったよ… のぼりな。' } },
  // World 2's: the Puck (the plan's §5.4): a dome over the ice, beaten by its own shells (PUCK, Boss.slide).
  puck: { name: { en: 'Puck', es: 'Disco', pt: 'Disco', ja: 'パック' }, design: 'dome', size: 2.4, slide: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Slippery? Your feet are the problem.', es: '¿Resbala? El problema son tus pies.', pt: 'Escorrega? O problema são seus pés.', ja: 'すべる？ きみの あしが わるい。' },
      { en: 'This ice is mine. So is the floor.', es: 'Este hielo es mío. Y el suelo.', pt: 'Este gelo é meu. E o chão.', ja: 'この こおりは わたしの もの。' },
      { en: 'Nobody stops on my ice.', es: 'Nadie se para en mi hielo.', pt: 'Ninguém para no meu gelo.', ja: 'わたしの こおりで とまれない。' }],
    quip: [{ en: 'Slid right off, did you?', es: 'Te resbalaste, ¿eh?', pt: 'Escorregou, né?', ja: 'すべって おちたね。' },
      { en: 'Cold, is it? Stay down.', es: 'Hace frío, ¿no? Quédate abajo.', pt: 'Frio, né? Fica aí embaixo.', ja: 'さむいでしょ？ したに いな。' }],
    defeat: { en: 'Oof. Flipped… fine, roll on.', es: 'Uf. Volteada… vale, sigue rodando.', pt: 'Ufa. Virada… tá, pode rolar.', ja: 'うわ、ひっくりかえった… いきな。' },
    top: { en: 'Hard on top. Roll a shell at it!', es: 'Arriba es dura. ¡Lánzale un caparazón!', pt: 'Em cima é dura. Role um casco nela!', ja: 'うえは かたい。こうらを ぶつけろ！' },   // the first bounce off its dome
    hint: { en: 'Flipped! Land on its belly!', es: '¡Volteada! ¡Salta en su panza!', pt: 'Virada! Pule na barriga!', ja: 'ひっくりかえった！ おなかに のれ！' },   // the first time it is turned
    how: { en: 'Roll a shell into it, then stomp it', es: 'Lánzale un caparazón y luego písala', pt: 'Role um casco nela e depois pise', ja: 'こうらを ぶつけて、ふもう' } },   // after three losses
  // World 3's: the Minecart (the plan's §5.5): open from above only; the way there is up the walls to the moss over its rail's ends.
  cart: { name: { en: 'Minecart', es: 'Vagoneta', pt: 'Vagonete', ja: 'トロッコ' }, design: 'loaf', size: CART.size, rail: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'No outsiders in the pit!', es: '¡Prohibido entrar a la mina!', pt: 'Proibido entrar na mina!', ja: 'ぶがいしゃは たちいり きんし！' },
      { en: "Mind the rocks. Or don't.", es: 'Cuidado con las rocas. O no.', pt: 'Cuidado com as pedras. Ou não.', ja: 'いわに きをつけな。' },
      { en: 'My rail, my rules.', es: 'Mi riel, mis reglas.', pt: 'Meu trilho, minhas regras.', ja: 'わたしの レール、わたしの ルール。' }],
    quip: [{ en: 'The shift is not over yet.', es: 'El turno aún no acaba.', pt: 'O turno ainda não acabou.', ja: 'シフトは まだ おわらない。' },
      { en: 'Out of my pit, small fry.', es: 'Fuera de mi mina, pequeño.', pt: 'Fora da minha mina, pequeno.', ja: 'でていきな、ちびすけ。' }],
    defeat: { en: 'Shift is over… go on, then.', es: 'Se acabó el turno… sigue, pues.', pt: 'O turno acabou… vai, então.', ja: 'シフト おわり… いきな。' },
    hint: { en: 'Right under you: let go!', es: '¡Justo debajo: suéltate!', pt: 'Bem embaixo: solte!', ja: 'まっした！ はなせ！' },   // the first ▼ over it
    how: { en: 'Climb over it, then drop onto it', es: 'Sube por encima y déjate caer', pt: 'Suba acima dela e caia em cima', ja: 'うえへ のぼって、とびおりろ' } },   // after three losses
  // World 7's: the Rat King (the Junkyard's): the Puck's slide over a greasy floor (its arena as the Puck's, rc.ice), round ears, a tail.
  rat: { name: { en: 'Rat King', es: 'Rey Rata', pt: 'Rei Rato', ja: 'ネズミの おう' }, design: 'dome', size: 2.4, slide: true, rat: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Everything here is mine. Even you.', es: 'Todo aquí es mío. Incluso tú.', pt: 'Tudo aqui é meu. Até você.', ja: 'ここの ものは ぜんぶ おれの もの。おまえも。' },
      { en: 'Finders keepers.', es: 'El que lo encuentra se lo queda.', pt: 'Achado não é roubado.', ja: 'ひろった もの がち。' },
      { en: 'Squeak. Bow to the king.', es: 'Iiii. Inclínate ante el rey.', pt: 'Iii. Curve-se ao rei.', ja: 'チュー。おうに ひれふせ。' }],
    quip: [{ en: 'Into the bin with you.', es: 'Al contenedor contigo.', pt: 'Pra caçamba com você.', ja: 'ゴミばこへ どうぞ。' },
      { en: 'Squeak squeak. Again?', es: 'Iiii iiii. ¿Otra vez?', pt: 'Iii iii. De novo?', ja: 'チューチュー。もう いっかい？' }],
    defeat: { en: 'Take it… the trash is yours.', es: 'Tómalo… la basura es tuya.', pt: 'Pode levar… o lixo é seu.', ja: 'もってけ… ゴミは おまえの もの。' },
    top: { en: 'Hard on top. Roll a shell at it!', es: 'Arriba es duro. ¡Lánzale un caparazón!', pt: 'Em cima é duro. Role um casco nele!', ja: 'うえは かたい。こうらを ころがせ！' },
    hint: { en: 'Flipped! Land on its belly!', es: '¡Volteado! ¡Salta en su panza!', pt: 'Virado! Pule na barriga!', ja: 'ひっくりかえった！ おなかに のれ！' },
    how: { en: 'Roll a shell into it, then stomp it', es: 'Lánzale un caparazón y luego písalo', pt: 'Role um casco nele e depois pise', ja: 'こうらを ぶつけて、ふみつけろ' } },
  // World 6's: the Pigeon (the Skyscraper's): the Cork's dive (hover, warn, dive, dazed, rise), flapping its grey wings.
  pigeon: { name: { en: 'Pigeon', es: 'Paloma', pt: 'Pombo', ja: 'ハト' }, design: 'drop', pigeon: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Coo. This ledge is taken.', es: 'Cu-cú. Esta cornisa es mía.', pt: 'Ru-ru. Essa beirada é minha.', ja: 'クルッ。ここは わたしの へり。' },
      { en: 'Crumbs first. Then the sky.', es: 'Primero las migas. Luego el cielo.', pt: 'Primeiro as migalhas. Depois o céu.', ja: 'まず パンくず。そらは そのあと。' },
      { en: 'Nobody flies higher than me.', es: 'Nadie vuela más alto que yo.', pt: 'Ninguém voa mais alto que eu.', ja: 'わたしより たかく とぶ ものは いない。' }],
    quip: [{ en: 'Coo-coo. Too slow.', es: 'Cu-cú. Muy lento.', pt: 'Ru-ru. Muito lento.', ja: 'クルックー。おそい。' },
      { en: 'Back to the pavement.', es: 'De vuelta a la acera.', pt: 'De volta para a calçada.', ja: 'ほどうに もどって。' }],
    defeat: { en: 'Fine… the sky is big enough.', es: 'Vale… el cielo es grande.', pt: 'Tá bom… o céu é grande.', ja: 'わかった… そらは ひろいから。' } },
  // World 5's: the Crane (the Tower Blocks'): the Cork's dive (hover, warn, dive, dazed, rise) as a load swinging on a crane's cable.
  crane: { name: { en: 'Crane', es: 'Grúa', pt: 'Guindaste', ja: 'クレーン' }, design: 'loaf', crane: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Hard hats only.', es: 'Solo con casco.', pt: 'Só de capacete.', ja: 'ヘルメット ちゃくよう！' },
      { en: 'One more floor. Then another.', es: 'Un piso más. Y otro.', pt: 'Mais um andar. E outro.', ja: 'あと いっかい。それから もう いっかい。' },
      { en: 'Stand clear of the load!', es: '¡Apártate de la carga!', pt: 'Afaste-se da carga!', ja: 'にもつの したに たつな！' }],
    quip: [{ en: 'Flattened. Like a panel.', es: 'Aplastado. Como un panel.', pt: 'Achatado. Como um painel.', ja: 'ぺしゃんこ。パネルみたい。' },
      { en: 'Back to the ground floor.', es: 'De vuelta a la planta baja.', pt: 'De volta ao térreo.', ja: 'いっかいに もどって。' }],
    defeat: { en: 'Shift over… the roof is yours.', es: 'Fin del turno… el tejado es tuyo.', pt: 'Fim do turno… o telhado é seu.', ja: 'しごと おわり… やねは きみの もの。' } },
  // World 4's: the Tram (Tokyo's streetcar): the Minecart's ride on a rail (CART, Boss.ride), a tram car in the town's blue round it,
  // its pantograph up to an overhead wire.
  tram: { name: { en: 'Tram', es: 'Tranvía', pt: 'Bonde', ja: 'とでん' }, design: 'loaf', size: CART.size, rail: true, tram: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Next stop: nowhere.', es: 'Próxima parada: ninguna.', pt: 'Próxima parada: nenhuma.', ja: 'つぎは どこにも とまりません。' },
      { en: 'Mind the gap. And me.', es: 'Cuidado con el hueco. Y conmigo.', pt: 'Cuidado com o vão. E comigo.', ja: 'すきまに ごちゅうい。わたしにも。' },
      { en: 'No riding on the roof!', es: '¡Nada de subirse al techo!', pt: 'Nada de andar no teto!', ja: 'やねに のらないで ください！' }],
    quip: [{ en: 'Ding ding. You missed it.', es: 'Tilín tilín. Lo perdiste.', pt: 'Blim blim. Perdeu.', ja: 'チンチン。のりおくれ。' },
      { en: 'Please wait for the next one.', es: 'Espera al siguiente, por favor.', pt: 'Espere o próximo, por favor.', ja: 'つぎの でんしゃを おまちください。' }],
    defeat: { en: 'End of the line… go on up.', es: 'Final de trayecto… sube ya.', pt: 'Fim da linha… pode subir.', ja: 'しゅうてんです… のぼって どうぞ。' },
    hint: { en: 'Right under you: let go!', es: '¡Justo debajo: suéltate!', pt: 'Bem embaixo: solte!', ja: 'まっした！ はなせ！' },
    how: { en: 'Climb over it, then drop onto it', es: 'Sube por encima y déjate caer', pt: 'Suba acima dele e caia em cima', ja: 'うえへ のぼって、とびおりろ' } },
  // The random run's summit: the Lid (the plan's last boss, its first look): goo from the start, then helpers, then twice the goo.
  lid: { name: { en: 'The Lid', es: 'La Tapa', pt: 'A Tampa', ja: 'フタ' }, hp: 6, phase: (hp) => (hp >= 5 ? 1 : hp >= 3 ? 2 : 3),
    intro: [{ en: 'Nothing up there. I checked.', es: 'Arriba no hay nada. Lo comprobé.', pt: 'Lá em cima não tem nada. Eu vi.', ja: 'うえには なにも ないよ。' },
      { en: 'The sky? Just a story.', es: '¿El cielo? Solo un cuento.', pt: 'O céu? Só uma história.', ja: 'そら？ ただの おはなし。' },
      { en: 'Climb all you like. I stay shut.', es: 'Trepa cuanto quieras. Sigo cerrada.', pt: 'Suba o quanto quiser. Fico fechada.', ja: 'いくら のぼっても あかないよ。' }],
    quip: [{ en: 'Shut. Like I said.', es: 'Cerrada. Como dije.', pt: 'Fechada. Como eu disse.', ja: 'ほらね、しまってる。' },
      { en: 'Back down you go.', es: 'Abajo otra vez.', pt: 'Pra baixo de novo.', ja: 'また したへ どうぞ。' }],
    defeat: { en: '…Light. I had forgotten it.', es: '…Luz. La había olvidado.', pt: '…Luz. Eu tinha esquecido.', ja: '…ひかり。わすれてた。' } },
};
const CAVE = { stairs: 4, planks: 3, shelves: 2, pillars: 3, comb: 2, overhang: 1, chimney: 1, spring: 1 };   // the Cave's own chunks, before moss and rubber
const MINE = { crumble: 3, bridge: 3, lift: 2, planks: 2, shelves: 2, spring: 1, comb: 2, chimney: 1, stairs: 1, rubberwall: 1, mosswall: 1 };   // the Mine's, without its spikes and movers
const GLACIER = { icewall: 3, iceblocks: 3, stairs: 2, planks: 2, shelves: 1, pillars: 2, comb: 2, chimney: 2, overhang: 1, spring: 1 };   // the Glacier's, with its ice
const TOWN = { stairs: 3, planks: 2, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1, lift: 2, rubberwall: 1 };   // Tokyo's (shelves off the walls: awnings)
const JUNKP = { planks: 2, shelves: 3, stairs: 2, pillars: 2, comb: 2, chimney: 1, spring: 2, crumble: 1, rubberwall: 1 };   // the Junkyard's (planks off walls: fire escapes)
const SKYP = { planks: 3, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1, lift: 2, movers: 1, twinshaft: 1 };   // the Skyscraper's (free planks: clouds)
const PANEL = { flight: 4, stairs: 2, shelves: 3, planks: 2, pillars: 2, comb: 1, chimney: 1, crumble: 2, spring: 1 };   // the Tower Blocks' (flights of stairs; shelves: balconies)
// A world's tapestry, shown once its boss is beaten (the plan: the story as a reward, after): three runes in Yarndings 12
// (its knitted pictures: the Heat, a drop like the hero, the Light) and what Aunt Moti reads in them.
const CAMPAIGN = [{ world: WORLDS[0], runes: 'VhS', lore: { en: 'We all came from the Heat.\nWe all climb to the Light.', es: 'Todos venimos del Calor.\nTodos subimos hacia la Luz.', pt: 'Todos viemos do Calor.\nTodos subimos para a Luz.', ja: 'みんな ねつから うまれた。\nみんな ひかりへ のぼる。' }, levels: [
  { role: 'teach', len: 25, fire: 0.3, calm: 15, maxD: 1, chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2 }, intro: ['spring'], enemies: [], foes: 0, candy: [], safe: true, seed: 3111,
    news: { en: 'jumps and springs', es: 'saltos y resortes', pt: 'pulos e molas', ja: 'ジャンプと バネ' } },
  { role: 'teach', len: 31, gate: 'gate', fire: 0.35, maxD: 2, chunks: CAVE, intro: [], enemies: ['crawler'], foes: 0.5, candy: [], safe: true, seed: 2101,
    news: { en: 'crawlers: land on them', es: 'reptadores: cae sobre ellos', pt: 'rastejantes: pule neles', ja: 'ハイハイ: うえから ふもう' } },
  { role: 'teach', len: 28, fire: 0.35, maxD: 2, chunks: { ...CAVE, mosswall: 2 }, intro: ['mosswall'], set: 'garden', enemies: ['crawler'], foes: 0.45, candy: [], safe: true, seed: 2909,
    news: { en: 'moss holds you', es: 'el musgo te sujeta', pt: 'o musgo segura você', ja: 'コケに くっつける' } },
  { role: 'apply', len: 34, gate: 'gate2', fire: 0.38, maxD: 2, chunks: { ...CAVE, mosswall: 2 }, intro: [], enemies: ['crawler'], foes: 0.55, pair: 0.1, candy: ['smash', 'smash'], stash: 0.35, seed: 2303,
    news: { en: 'the helmet', es: 'el casco', pt: 'o capacete', ja: 'ヘルメット' } },
  { role: 'peak', len: 25, fire: 0.42, maxD: 2, chunks: { ...CAVE, comb: 3, chimney: 2, overhang: 2, mosswall: 2 }, intro: [], enemies: ['crawler'], foes: 0.75, pair: 0.3, candy: ['smash'], seed: 2202 },
  { role: 'bonus', len: 31, bonus: 0, time: 34, seed: 2606 },
  { role: 'twist', len: 28, sides: [0, 109693], fire: 0.38, maxD: 2, chunks: { ...CAVE, mosswall: 1, rubberwall: 2 }, intro: ['rubberwall'], enemies: ['crawler'], foes: 0.55, pair: 0.1, candy: ['smash'], stash: 0.3, seed: 3010,
    news: { en: 'rubber walls', es: 'paredes de goma', pt: 'paredes de borracha', ja: 'ゴムの かべ' } },
  { role: 'peak', len: 28, gate: 'gate3', fire: 0.42, maxD: 2, chunks: { ...CAVE, comb: 3, mosswall: 2, rubberwall: 2 }, intro: ['rubberwall'], set: 'garden', enemies: ['crawler'], foes: 0.75, pair: 0.3, candy: ['smash'], seed: 2303 },
  { role: 'rest', len: 20, fire: 0.3, maxD: 1, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, mosswall: 1 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, runes: 2, seed: 3616,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'probka', moss: true },   // moss on its arena's walls: a place to sit its dive out
] },
// World 2, the Glacier (the plan's levels 11-20): ice, then the Rainbow, shells, climbers, icicles, a cage; the Puck. Its
// runes: one who climbs, a heart, a lattice (the first climbed without fear; many got stuck).
{ world: WORLDS[1], runes: 'gyI', lore: { en: 'The first climbed without fear.\nMany got stuck.', es: 'Los primeros subieron sin miedo.\nMuchos se quedaron atrapados.', pt: 'Os primeiros subiram sem medo.\nMuitos ficaram presos.', ja: 'さいしょは みんな こわがらず のぼった。\nたくさんが つかまった。' }, levels: [
  { role: 'teach', len: 29, fire: 0.33, calm: 8, maxD: 2, chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2, icewall: 3, iceblocks: 2, mosswall: 1 }, intro: ['icewall', 'iceblocks'], enemies: ['crawler'], foes: 0.35, candy: [], shop: 0.5, safe: true, seed: 4101,
    news: { en: "ice: walls don't hold", es: 'hielo: las paredes no sujetan', pt: 'gelo: as paredes não seguram', ja: 'こおり: かべに くっつけない' } },
  { role: 'apply', len: 36, sides: [13004, 0], gate: 'gate', fire: 0.41, maxD: 2, chunks: { ...GLACIER, rubberwall: 1 }, intro: [], enemies: ['crawler'], foes: 0.5, pair: 0.1, candy: ['rainbow', 'rainbow'], seed: 4108,
    news: { en: 'rainbow candy', es: 'caramelo arcoíris', pt: 'bala arco-íris', ja: 'にじの キャンディ' } },
  { role: 'teach', len: 32, fire: 0.4, maxD: 2, chunks: GLACIER, intro: [], enemies: ['shell', 'crawler'], foes: 0.55, candy: ['rainbow'], seed: 4105,
    news: { en: 'shells: stomp, and they roll', es: 'caparazones: písalos y ruedan', pt: 'cascos: pise e eles rolam', ja: 'こうら: ふむと ころがる' } },
  { role: 'apply', len: 40, gate: 'gate2', fire: 0.41, maxD: 2, chunks: GLACIER, intro: [], enemies: ['climber', 'shell', 'crawler'], foes: 0.6, pair: 0.15, candy: ['smash', 'rainbow'], shop: 0.45, seed: 4103,
    news: { en: 'climbers on the walls', es: 'trepadores en las paredes', pt: 'escaladores nas paredes', ja: 'かべの カベノボリ' } },
  { role: 'peak', len: 29, fire: 0.45, maxD: 3, chunks: { ...GLACIER, comb: 3, chimney: 2, rubberwall: 2, twinshaft: 1 }, intro: [], enemies: ['shell', 'climber', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 4102 },
  { role: 'bonus', len: 36, bonus: 1, time: 40, seed: 4104 },
  { role: 'twist', len: 32, sides: [13975, 0], fire: 0.4, maxD: 2, chunks: { ...GLACIER, mosswall: 2 }, intro: [], set: 'icicles', enemies: ['climber', 'crawler'], foes: 0.55, candy: ['smash'], stash: 0.3, seed: 4102,
    news: { en: 'icicles fall', es: 'los carámbanos caen', pt: 'os pingentes caem', ja: 'つららが おちる' } },
  { role: 'peak', len: 32, sides: [0, 110785], gate: 'gate3', fire: 0.45, maxD: 3, chunks: { ...GLACIER, comb: 3, rubberwall: 1, twinshaft: 1 }, intro: [], set: 'icicles', enemies: ['shell', 'climber', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 4102 },
  { role: 'rest', len: 22, fire: 0.33, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, icewall: 1 }, intro: [], enemies: ['shell'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 4104,
    news: { en: 'someone is stuck in a cage', es: 'alguien está atrapado', pt: 'alguém está preso', ja: 'だれかが つかまってる' } },
  { role: 'boss', boss: 'puck', ice: true },   // an ice floor, icicles over it
] },
// World 3, the Mine (the plan's levels 21-30): crumbling blocks and bridges, the Fizz, spitters, the pit's waves and a fat
// spitter, a peak, the combo ladder, moving planks, a peak, Moti's shop; the Minecart. Its runes: crossed picks, a block of
// ore, a turn (those tired of climbing began to dig sideways). The worm stays in the random run (user).
{ world: WORLDS[2], runes: 'LnY', lore: { en: 'Those tired of climbing\nbegan to dig sideways.', es: 'Los cansados de subir\nempezaron a cavar de lado.', pt: 'Os cansados de subir\ncomeçaram a cavar de lado.', ja: 'のぼるのに つかれた ものは\nよこへ ほりはじめた。' }, levels: [
  { role: 'teach', len: 33, fire: 0.37, calm: 8, maxD: 2, chunks: { stairs: 2, planks: 2, shelves: 2, pillars: 2, crumble: 3, bridge: 3, icewall: 1 }, intro: ['crumble', 'bridge'], enemies: ['climber'], foes: 0.35, candy: [], cage: true, safe: true, seed: 4102,
    news: { en: "crumbling blocks: don't stand still", es: 'bloques que se caen: no te quedes quieto', pt: 'blocos que desmoronam: não fique parado', ja: 'くずれる ブロック: とまるな' } },
  { role: 'apply', len: 42, gate: 'gate', fire: 0.46, maxD: 2, chunks: MINE, intro: [], enemies: ['crawler', 'shell'], foes: 0.5, pair: 0.1, candy: ['fizz', 'fizz'], cage: true, seed: 4105,
    news: { en: 'fizz candy', es: 'caramelo efervescente', pt: 'bala efervescente', ja: 'シュワシュワ キャンディ' } },
  { role: 'teach', len: 37, fire: 0.46, maxD: 2, chunks: MINE, intro: [], enemies: ['spitter', 'crawler'], foes: 0.55, candy: ['fizz'], seed: 4106,
    news: { en: 'spitters lob blobs', es: 'los escupidores lanzan bolas', pt: 'cuspidores atiram bolas', ja: 'ペッペが たまを なげる' } },
  { role: 'apply', len: 46, gate: 'gate2', fire: 0.46, maxD: 2, chunks: MINE, intro: [], set: 'arena', mini: true, enemies: ['spitter', 'crawler', 'shell'], foes: 0.55, pair: 0.15, candy: ['fizz', 'smash'], shop: 0.4, seed: 4101,
    news: { en: 'the pit: waves, then a fat spitter', es: 'la mina: oleadas y un escupidor gordo', pt: 'a mina: ondas e um cuspidor gordo', ja: 'こうどう: ウェーブと でっかい ペッペ' } },
  { role: 'peak', len: 33, sides: [0, 109814], fire: 0.5, maxD: 3, chunks: { ...MINE, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'icicles', enemies: ['spitter', 'climber', 'crawler'], foes: 0.75, pair: 0.3, candy: ['fizz'], seed: 4108 },
  { role: 'bonus', len: 42, bonus: 2, time: 46, seed: 4101 },
  { role: 'twist', len: 37, fire: 0.46, maxD: 2, chunks: { ...MINE, lift: 3, rubberwall: 2 }, intro: ['lift'], enemies: ['spitter', 'crawler'], foes: 0.55, candy: ['fizz'], stash: 0.3, seed: 4101,
    news: { en: 'moving planks', es: 'tablas móviles', pt: 'tábuas móveis', ja: 'うごく いた' } },
  { role: 'peak', len: 37, gate: 'gate3', fire: 0.5, maxD: 3, chunks: { ...MINE, movers: 2, lift: 2, icewall: 1 }, intro: [], set: 'arena', enemies: ['spitter', 'shell', 'crawler'], foes: 0.75, pair: 0.3, candy: ['fizz'], seed: 4102 },
  { role: 'rest', len: 25, fire: 0.37, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, lift: 1, bridge: 1 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, runes: 2, seed: 4108,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'cart', rail: true },   // its rail under the ceiling, moss over its ends
] },
// World 4, Tokyo (the user's first new setting; its kit in the renderer, see THEMES.tokyo): awnings that bounce, level crossings, gondolas,
// then a power cut over the crossings (the twist: the train comes in the dark); the Tram. Its runes: a lattice, a lantern, a lit window
// (some stopped climbing and built a town; its lights hid the Light).
{ world: TOKYO, runes: 'HWu', lore: { en: 'Some stopped climbing and built a town.\nIts lights hid the Light.', es: 'Algunos dejaron de subir y construyeron una ciudad.\nSus luces taparon la Luz.', pt: 'Alguns pararam de subir e ergueram uma cidade.\nSuas luzes esconderam a Luz.', ja: 'のぼるのを やめて まちを つくった ものも いた。\nまちの あかりが ひかりを かくした。' }, levels: [
  { role: 'teach', len: 30, fire: 0.42, calm: 8, maxD: 2, chunks: TOWN, intro: ['shelves'], enemies: ['crawler'], foes: 0.4, candy: [], safe: true, seed: 5101,
    news: { en: 'shop awnings: they bounce', es: 'toldos: rebotan', pt: 'toldos: eles quicam', ja: 'みせの ひさし: はねる' } },
  { role: 'teach', len: 36, fire: 0.46, maxD: 2, chunks: TOWN, intro: [], enemies: ['crawler', 'climber'], foes: 0.5, candy: ['fizz'], crossing: true, gate: 'gate', sides: [0, 110808], seed: 5102,
    news: { en: 'level crossings: mind the train', es: 'pasos a nivel: cuidado con el tren', pt: 'passagens de nível: cuidado com o trem', ja: 'ふみきり: でんしゃに ちゅうい' } },
  { role: 'teach', len: 38, fire: 0.46, maxD: 2, chunks: { ...TOWN, lift: 3, movers: 1 }, intro: ['lift'], enemies: ['crawler', 'shell'], foes: 0.5, candy: ['smash'], seed: 5103,
    news: { en: 'gondolas move', es: 'las góndolas se mueven', pt: 'as gôndolas se movem', ja: 'ゴンドラが うごく' } },
  { role: 'apply', len: 44, fire: 0.48, maxD: 2, chunks: { ...TOWN, movers: 1, bridge: 1 }, intro: [], enemies: ['crawler', 'climber', 'shell'], foes: 0.55, pair: 0.15, candy: ['smash', 'fizz'], crossing: true, shop: 0.4, stash: 0.3, gate: 'gate2', seed: 5104 },
  { role: 'peak', len: 36, fire: 0.52, maxD: 3, chunks: { ...TOWN, comb: 3, chimney: 2, movers: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], crossing: true, seed: 5105 },
  { role: 'bonus', len: 44, bonus: 3, time: 48, seed: 5106 },
  { role: 'twist', len: 38, fire: 0.48, maxD: 2, chunks: { ...TOWN, lift: 3 }, intro: [], dark: true, enemies: ['crawler', 'climber', 'shell'], foes: 0.55, candy: ['fizz'], stash: 0.3, crossing: true, seed: 5107,
    news: { en: 'a power cut: watch the crossing lights', es: 'un apagón: mira las luces del paso', pt: 'um apagão: olhe as luzes da passagem', ja: 'ていでん: ふみきりの あかりを みて' } },
  { role: 'peak', len: 40, fire: 0.52, maxD: 3, chunks: { ...TOWN, comb: 3, movers: 2, spikes: 1, rubberwall: 2 }, intro: [], enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], crossing: true, gate: 'gate3', sides: [14004, 0], seed: 5108 },
  { role: 'rest', len: 28, fire: 0.4, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 3, pillars: 2 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 5109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'tram', rail: true },   // its street rail, moss (ivy) over its ends, as the Minecart's
] },
// World 5, the Tower Blocks (the user's Soviet brutalism; its kit in the renderer, see THEMES.blocks): stairs you walk up, old balconies
// that give way, old mattresses that bounce, then winter (icicles off the roofs, the twist); the Crane. Its runes: a frame, a tower, two
// rings (they stacked floor on floor to reach the sky; the top was only a roof).
{ world: BLOCKS, runes: 'BMQ', lore: { en: 'They stacked floor on floor to reach the sky.\nThe top was only a roof.', es: 'Apilaron piso sobre piso para llegar al cielo.\nArriba solo había un tejado.', pt: 'Empilharam andar sobre andar para chegar ao céu.\nNo alto só havia um telhado.', ja: 'そらに とどこうと かいを かさねた。\nてっぺんは ただの やねだった。' }, levels: [
  { role: 'teach', len: 34, fire: 0.46, calm: 8, maxD: 2, chunks: PANEL, intro: ['flight'], enemies: ['crawler'], foes: 0.45, candy: [], safe: true, seed: 6101,
    news: { en: 'stairs: just walk up', es: 'escaleras: sube andando', pt: 'escadas: é só subir andando', ja: 'かいだん: あるいて のぼれる' } },
  { role: 'teach', len: 38, fire: 0.48, maxD: 2, chunks: { ...PANEL, crumble: 3 }, intro: ['crumble'], enemies: ['crawler', 'climber'], foes: 0.5, candy: ['fizz'], gate: 'gate', seed: 6102,
    news: { en: 'old balconies give way', es: 'los balcones viejos ceden', pt: 'as sacadas velhas cedem', ja: 'ふるい ベランダは くずれる' } },
  { role: 'teach', len: 40, fire: 0.48, maxD: 2, chunks: { ...PANEL, spring: 3 }, intro: ['spring'], enemies: ['crawler', 'shell'], foes: 0.5, candy: ['smash'], sides: [15976, 0], seed: 6103,
    news: { en: 'old mattresses bounce', es: 'los colchones viejos rebotan', pt: 'colchões velhos quicam', ja: 'ふるい マットレスで はねる' } },
  { role: 'apply', len: 46, fire: 0.5, maxD: 2, chunks: PANEL, intro: [], enemies: ['crawler', 'climber', 'shell'], foes: 0.6, pair: 0.15, candy: ['smash', 'fizz'], shop: 0.4, stash: 0.3, gate: 'gate2', seed: 6104 },
  { role: 'peak', len: 38, fire: 0.55, maxD: 3, chunks: { ...PANEL, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 6105 },
  { role: 'bonus', len: 46, bonus: 2, time: 50, seed: 6106 },
  { role: 'twist', len: 40, fire: 0.5, maxD: 2, chunks: PANEL, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.55, candy: ['fizz'], stash: 0.3, sides: [0, 116698], seed: 6107,
    news: { en: 'winter: icicles fall off the roofs', es: 'invierno: caen carámbanos de los tejados', pt: 'inverno: pingentes caem dos telhados', ja: 'ふゆ: やねから つららが おちる' } },
  { role: 'peak', len: 42, fire: 0.55, maxD: 3, chunks: { ...PANEL, comb: 3, spikes: 1, rubberwall: 2 }, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], gate: 'gate3', sides: [17935, 0], seed: 9039 },
  { role: 'rest', len: 30, fire: 0.42, maxD: 2, chunks: { flight: 3, stairs: 2, planks: 3, shelves: 3 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, sides: [0, 113769], seed: 6109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'crane' },
] },
// World 6, the Skyscraper (the user's skyscraper and clouds; its kit in the renderer, see THEMES.sky): clouds that dissolve under you,
// window-cleaning gondolas, bolts dropped from above, then night over the clouds (the twist: dark); the Pigeon. Its runes: a cross of
// diamonds, a sun, a cloud (at the top of the tallest tower were only clouds).
{ world: SKY, runes: 'OUd', lore: { en: 'At the top of the tallest tower\nwere only clouds.', es: 'En lo alto de la torre más alta\nsolo había nubes.', pt: 'No alto da torre mais alta\nsó havia nuvens.', ja: 'いちばん たかい とうの うえには\nくもしか なかった。' }, levels: [
  { role: 'teach', len: 36, fire: 0.5, calm: 8, maxD: 2, chunks: SKYP, intro: ['planks'], enemies: ['crawler', 'climber'], foes: 0.45, candy: [], safe: true, seed: 7101,
    news: { en: 'clouds dissolve under you', es: 'las nubes se deshacen bajo tus pies', pt: 'as nuvens se desfazem sob você', ja: 'くもは あしもとで きえる' } },
  { role: 'teach', len: 40, fire: 0.52, maxD: 2, chunks: { ...SKYP, lift: 3 }, intro: ['lift'], enemies: ['crawler', 'climber', 'shell'], foes: 0.5, candy: ['fizz'], gate: 'gate', sides: [0, 112808], seed: 7102,
    news: { en: 'window-cleaning gondolas', es: 'góndolas de limpiacristales', pt: 'gôndolas de limpar janelas', ja: 'まどふきの ゴンドラ' } },
  { role: 'teach', len: 42, fire: 0.52, maxD: 2, chunks: SKYP, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.5, candy: ['smash'], sides: [0, 113786], seed: 7103,
    news: { en: 'dropped bolts fall from above', es: 'caen tornillos desde arriba', pt: 'parafusos caem lá de cima', ja: 'うえから ボルトが おちる' } },
  { role: 'apply', len: 48, fire: 0.54, maxD: 2, chunks: SKYP, intro: [], enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.6, pair: 0.15, candy: ['smash', 'fizz'], shop: 0.4, stash: 0.3, gate: 'gate2', seed: 7104 },
  { role: 'peak', len: 40, fire: 0.58, maxD: 3, chunks: { ...SKYP, comb: 3, movers: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], sides: [0, 112811], seed: 7105 },
  { role: 'bonus', len: 48, bonus: 0, time: 52, seed: 7106 },
  { role: 'twist', len: 42, fire: 0.54, maxD: 2, chunks: SKYP, intro: [], dark: true, enemies: ['crawler', 'climber', 'shell'], foes: 0.55, candy: ['fizz'], stash: 0.3, seed: 7107,
    news: { en: 'night over the clouds', es: 'noche sobre las nubes', pt: 'noite sobre as nuvens', ja: 'くもの うえの よる' } },
  { role: 'peak', len: 44, fire: 0.58, maxD: 3, chunks: { ...SKYP, comb: 3, movers: 2, rubberwall: 2 }, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], gate: 'gate3', sides: [0, 113791], seed: 7108 },
  { role: 'rest', len: 32, fire: 0.44, maxD: 2, chunks: { planks: 3, shelves: 3, stairs: 2, pillars: 2 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 7109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'pigeon' },
] },
// World 7, the Junkyard (the user's New York dump; its kit in the renderer, see THEMES.junk): trash bags that bounce, garbage trucks through
// the crossings, greasy steel that slides, then junk raining off the fire escapes (the twist: icicles); the Rat King on a greasy floor.
// Its runes: a cross of beads, a diamond, a heap (the ones below kept what the climbers threw away).
{ world: JUNK, runes: 'krw', lore: { en: 'What the climbers threw away\nthe ones below kept.', es: 'Lo que tiraban los que subían\nlo guardaban los de abajo.', pt: 'O que os que subiam jogavam fora\nos de baixo guardavam.', ja: 'のぼる ものが すてた ものを\nしたの ものが ひろった。' }, levels: [
  { role: 'teach', len: 38, fire: 0.52, calm: 8, maxD: 2, chunks: { ...JUNKP, spring: 4 }, intro: ['spring'], enemies: ['crawler', 'climber'], foes: 0.45, candy: [], safe: true, seed: 8101,
    news: { en: 'trash bags bounce', es: 'las bolsas de basura rebotan', pt: 'sacos de lixo quicam', ja: 'ゴミぶくろで はねる' } },
  { role: 'teach', len: 42, fire: 0.54, maxD: 2, chunks: JUNKP, intro: [], enemies: ['crawler', 'climber', 'shell'], foes: 0.5, candy: ['fizz'], crossing: true, gate: 'gate', seed: 8102,
    news: { en: 'garbage trucks: mind the street', es: 'camiones de basura: cuidado con la calle', pt: 'caminhões de lixo: cuidado com a rua', ja: 'ゴミしゅうしゅうしゃ: どうろに ちゅうい' } },
  { role: 'teach', len: 44, fire: 0.54, maxD: 2, chunks: { ...JUNKP, iceblocks: 3 }, intro: ['iceblocks'], enemies: ['crawler', 'shell', 'spitter'], foes: 0.5, candy: ['smash'], sides: [0, 113809], seed: 8103,
    news: { en: 'greasy steel: you slide', es: 'acero grasiento: resbalas', pt: 'aço engordurado: você escorrega', ja: 'あぶらの はがね: すべる' } },
  { role: 'apply', len: 50, fire: 0.56, maxD: 2, chunks: { ...JUNKP, iceblocks: 1 }, intro: [], enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.6, pair: 0.15, candy: ['smash', 'fizz'], crossing: true, shop: 0.4, stash: 0.3, gate: 'gate2', seed: 8104 },
  { role: 'peak', len: 42, fire: 0.6, maxD: 3, chunks: { ...JUNKP, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], sides: [0, 113811], seed: 8105 },
  { role: 'bonus', len: 50, bonus: 1, time: 55, seed: 8106 },
  { role: 'twist', len: 44, fire: 0.56, maxD: 2, chunks: JUNKP, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.55, candy: ['fizz'], stash: 0.3, crossing: true, sides: [18957, 114790], seed: 9084,
    news: { en: 'junk falls off the fire escapes', es: 'cae chatarra de las escaleras de incendios', pt: 'cai sucata das escadas de incêndio', ja: 'ひじょうかいだんから ガラクタが おちる' } },
  { role: 'peak', len: 46, fire: 0.6, maxD: 3, chunks: { ...JUNKP, comb: 3, spikes: 1, rubberwall: 2, iceblocks: 1 }, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], gate: 'gate3', seed: 9085 },
  { role: 'rest', len: 34, fire: 0.46, maxD: 2, chunks: { planks: 3, shelves: 3, stairs: 2, pillars: 2 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 8109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'rat', ice: true },   // the Puck's arena: its floor all grease, junk hanging under the ceiling
] }];

// Pairs of upgrades that together are something new (the plan after the sandbox: synergies): both taken, it comes by itself,
// once, with a toast (Game.takeUpgrade); `apply` what it adds.
const SYNERGIES = [
  { id: 'moon', of: ['bouncy', 'legs'], name: { en: ['Moon boots', 'Stomps throw you far higher'], es: ['Botas lunares', 'Los pisotones te lanzan mucho más alto'], pt: ['Botas lunares', 'Pisões jogam você bem mais alto'], ja: ['ムーンブーツ', 'ふむと もっと たかく とぶ'] }, apply: (g) => { g.mods.bounce *= 1.25; } },
  { id: 'rush', of: ['magnet', 'greed'], name: { en: ['Gold rush', 'Coins fly to you from anywhere'], es: ['Fiebre del oro', 'Las monedas vuelan hacia ti'], pt: ['Corrida do ouro', 'As moedas voam até você'], ja: ['ゴールドラッシュ', 'コインが どこからでも とんでくる'] }, apply: (g) => { g.mods.magnet *= 4; } },
  { id: 'meteor', of: ['dive', 'blast'], name: { en: ['Meteor', 'A dive stomp blasts a wide ring'], es: ['Meteorito', 'Un pisotón en picado barre un gran anillo'], pt: ['Meteoro', 'Um pisão em mergulho varre um grande anel'], ja: ['メテオ', 'ダイブで ふむと ひろく ふきとばす'] }, apply: (g) => { g.mods.meteor = true; } },
  { id: 'ember', of: ['cool', 'candle'], name: { en: ['Fire walker', "The fire's first touch a level is free"], es: ['Caminafuegos', 'El primer toque del fuego en cada nivel no cuenta'], pt: ['Anda-fogo', 'O primeiro toque do fogo na fase não conta'], ja: ['ひわたり', 'ほのおの さいしょの 1かいは ノーダメージ'] }, apply: (g) => { g.mods.fireFree++; } },
];
// In the campaign a card is offered only once what it is for has been met: after the level (its index) where that
// came in: the shop at 1-9, the candies at 1-4, the spikes at 4-3 (the plan).
const CARD_FROM = { member: 8, long: 3, iron: 32 };
// One of three is offered after every level. `stack`: can be taken again. `run`: the random run's only (its hearts carry
// over); `camp`: the campaign's only (it starts each level with all of them).
const UPGRADES = [
  { id: 'bouncy', stack: true, name: { en: ['Springy', 'Bounce higher off enemies'], es: ['Saltarín', 'Rebotas más alto en los enemigos'], pt: ['Saltitante', 'Quica mais alto nos inimigos'], ja: ['ピョンピョン', 'てきを ふむと たかく はねる'] }, apply: (g) => { g.mods.bounce *= 1.2; } },
  { id: 'sticky', stack: true, name: { en: ['Sticky', 'Slide slower, hang longer'], es: ['Pegajoso', 'Resbalas más lento y aguantas más'], pt: ['Grudento', 'Escorrega devagar, segura mais'], ja: ['ネバネバ', 'ゆっくり すべり、ながく つかまる'] }, apply: (g) => { g.mods.slide *= 0.55; g.mods.hold += 0.6; } },
  { id: 'magnet', stack: true, name: { en: ['Magnet', 'Coins come from further away'], es: ['Imán', 'Las monedas llegan desde más lejos'], pt: ['Ímã', 'As moedas vêm de mais longe'], ja: ['マグネット', 'コインが とおくから あつまる'] }, apply: (g) => { g.mods.magnet *= 2; } },
  { id: 'heart', stack: true, name: { en: ['Thick skin', '+1 max heart'], es: ['Piel dura', '+1 corazón máximo'], pt: ['Pele grossa', '+1 coração máximo'], ja: ['かたい かわ', 'さいだい ハート +1'] }, apply: (g) => { g.maxHp++; g.hp++; } },
  { id: 'apple', stack: true, run: true, name: { en: ['Apple', 'Heal 2 hearts'], es: ['Manzana', 'Cura 2 corazones'], pt: ['Maçã', 'Cura 2 corações'], ja: ['リンゴ', 'ハートを 2 かいふく'] }, apply: (g) => g.heal(2) },
  { id: 'plaster', stack: true, camp: true, name: { en: ['Plaster', 'The first hit in a level is free'], es: ['Tirita', 'El primer golpe de cada nivel no cuenta'], pt: ['Curativo', 'O primeiro golpe da fase não conta'], ja: ['ばんそうこう', 'さいしょの 1かいは ノーダメージ'] },
    apply: (g) => { g.mods.plaster++; } },
  { id: 'candle', stack: true, name: { en: ['Candle', 'Longer safety after a hit'], es: ['Vela', 'Más tiempo a salvo tras un golpe'], pt: ['Vela', 'Mais tempo protegido após um golpe'], ja: ['ろうそく', 'やられた あとの むてきが ながい'] }, apply: (g) => { g.mods.invuln += 0.8; } },
  { id: 'air', stack: true, name: { en: ['Air jump', '+1 jump in mid-air'], es: ['Salto aéreo', '+1 salto en el aire'], pt: ['Pulo aéreo', '+1 pulo no ar'], ja: ['くうちゅう ジャンプ', 'くうちゅうで ジャンプ +1'] }, apply: (g) => { g.mods.airJumps++; } },
  { id: 'blast', name: { en: ['Blast stomp', 'A stomp takes out its neighbours'], es: ['Pisotón explosivo', 'Un pisotón tumba a los vecinos'], pt: ['Pisão explosivo', 'Um pisão derruba os vizinhos'], ja: ['ばくはつ ふみつけ', 'ふむと まわりの てきも たおす'] }, apply: (g) => { g.mods.blast = true; } },
  { id: 'greed', stack: true, name: { en: ['Greed', 'Enemies drop more coins'], es: ['Codicia', 'Los enemigos sueltan más monedas'], pt: ['Ganância', 'Inimigos soltam mais moedas'], ja: ['よくばり', 'てきが コインを おおく おとす'] }, apply: (g) => { g.mods.coinMul *= 1.5; } },
  { id: 'combo', stack: true, name: { en: ['Combo master', 'Combo rewards come sooner'], es: ['Maestro del combo', 'Los premios de combo llegan antes'], pt: ['Mestre do combo', 'Prêmios de combo chegam mais cedo'], ja: ['コンボ マスター', 'コンボの ごほうびが はやい'] }, apply: (g) => { g.mods.comboShift++; } },
  { id: 'legs', stack: true, name: { en: ['Strong legs', 'Jump higher'], es: ['Piernas fuertes', 'Saltas más alto'], pt: ['Pernas fortes', 'Pula mais alto'], ja: ['つよい あし', 'もっと たかく とべる'] }, apply: (g) => { g.mods.jump *= 1.08; } },
  { id: 'member', name: { en: ['Member card', '25% off in shops'], es: ['Tarjeta de socio', '25% menos en las tiendas'], pt: ['Cartão de sócio', '25% de desconto nas lojas'], ja: ['かいいんしょう', 'ショップで 25% びき'] }, apply: (g) => { g.mods.discount *= 0.75; } },
  { id: 'iron', name: { en: ['Iron soles', 'Floor spikes do not hurt'], es: ['Suelas de hierro', 'Los pinchos del suelo no dañan'], pt: ['Solas de ferro', 'Espinhos no chão não machucam'], ja: ['てつの くつぞこ', 'ゆかの トゲが いたくない'] }, apply: (g) => { g.mods.iron = true; } },
  { id: 'long', stack: true, name: { en: ['Long charge', 'Candies last 2 s longer'], es: ['Carga larga', 'Los caramelos duran 2 s más'], pt: ['Carga longa', 'Doces duram 2 s a mais'], ja: ['ロング チャージ', 'キャンディが 2 びょう ながもち'] }, apply: (g) => { g.mods.gun += GUN.plus; } },
  { id: 'cool', name: { en: ['Fireproof', 'The fire rises slower and spits less'], es: ['Ignífugo', 'El fuego sube más lento y escupe menos'], pt: ['À prova de fogo', 'O fogo sobe devagar e cospe menos'], ja: ['たいか', 'ほのおが ゆっくり、あまり とばさない'] }, apply: (g) => { g.mods.fire *= 0.6; } },
  // Upgrades that change what the hero does, not a number (the plan after the sandbox: "+5%" is dull)
  { id: 'ceiling', name: { en: ['Sticky top', 'Any ceiling holds you'], es: ['Techo pegajoso', 'Cualquier techo te sujeta'], pt: ['Teto grudento', 'Qualquer teto segura você'], ja: ['ネバネバ てんじょう', 'どの てんじょうにも くっつく'] }, apply: (g) => { g.mods.ceil = true; } },
  { id: 'dive', name: { en: ['Dive', '↓ in the air: down fast, bounce high'], es: ['Picado', '↓ en el aire: cae rápido, rebota alto'], pt: ['Mergulho', '↓ no ar: desce rápido, quica alto'], ja: ['ダイブ', 'くうちゅうで ↓: はやく おちて たかく はねる'] }, apply: (g) => { g.mods.dive = true; } },
  { id: 'dash2', name: { en: ['Double dash', 'Two dashes in the air'], es: ['Doble impulso', 'Dos impulsos en el aire'], pt: ['Impulso duplo', 'Dois impulsos no ar'], ja: ['ダブル ダッシュ', 'くうちゅうで 2かい ダッシュ'] }, apply: (g) => { g.mods.dashes = 2; } },
];
// A shop shows three of these; prices grow by half a price a world.
const SHOP_ITEMS = [
  { id: 'heal1', price: 25, color: PAL.red, name: { en: '+1 heart', es: '+1 corazón', pt: '+1 coração', ja: 'ハート +1' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(1) },
  { id: 'heal2', price: 40, color: PAL.red, name: { en: '+2 hearts', es: '+2 corazones', pt: '+2 corações', ja: 'ハート +2' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(2) },
  { id: 'maxhp', price: 80, color: PAL.red, name: { en: '+1 max heart', es: '+1 corazón máx.', pt: '+1 coração máx.', ja: 'さいだい ハート +1' }, apply: (g) => { g.maxHp++; g.hp++; } },
  { id: 'upgrade', price: 110, color: PAL.purple, name: { en: 'Upgrade', es: 'Mejora', pt: 'Melhoria', ja: 'パワーアップ' }, apply: (g) => g.randomUpgrade() },
];
const GIFT = { id: 'gift', price: 0, free: true, color: PAL.red, name: { en: '+1 heart', es: '+1 corazón', pt: '+1 coração', ja: 'ハート +1' }, can: (g) => g.hp < g.maxHp, apply: (g) => g.heal(1) };
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
ICONS.star = '.....yy...../.....yy...../....yyyy..../yyyyyyyyyyoo/.yyyyyyyyoo./..yyyyyyoo../...yyyyoo.../..yyyyyyoo../..yyy..yoo../.yyy....ooo./.yy......oo./............';
ICONS.starOff = ICONS.star.replace(/[yo]/g, 's');
ICONS.fizz = '............/............/..........w./.yyyyyyyyy../.ywwyyyyyyw./.yyyyyyyyy../.yyyoo....../.yyyo.o...../.yyyooo...../.yyy......../.ooo......../............';   // what it does: a gun, shots flying
ICONS.long = '.wwwwwwwwww./..w......w../..wyyyyyyw../...wyyyyw.../....wyyw..../.....ww...../....w..w..../...w.yy.w.../..w.yyyy.w../..wyyyyyyw../.wwwwwwwwww./............';
ICONS.maxhp = ICONS.heart;
ICONS.gift = ICONS.heal1;   // the stash's gift is a heart, and looks it
// The smash's picture: its helmet (user: the rock candy's place), a moto one, red with a white stripe and blue-lensed goggles,
// or (?helmet=astro, the user's other choice) an astronaut's, white with a blue visor in a black rim and a blue and orange neck ring.
const HELMET = /[?&]helmet=astro\b/.test(location.search) ? 'astro' : 'moto';
ICONS.smash = HELMET === 'astro' ? '...wwwwww.../..wwwwwwwss./.wwkkkkkkws./wwkbbbbbbkws/wwkbwbbbbkws/wwkbbbbbbkws/wwkbbbbbbkws/.wwkkkkkkws./.wwwwwwwwws./..bbbbbbbb../..oooooooo../............'
  : '....rwsr..../..rrrwsrrr../.rwrrwsrrrr./.rrrrwsrrrr./rrrrrwsrrrrr/rrrrrwsrrrrr/rkkkkkkkkkkr/rkbbbkkbbbkr/rkkkkkkkkkkr/rr........rr/.rr......rr./..r......r..';
ICONS.grow = 'ggg......ggg/gg........gg/g...wwww...g/...wwwwww.../..wwwwwwww../..wwkwwkww../..wwkwwkww../..wwwwwwww../...wwwwww.../g...wwww...g/gg........gg/ggg......ggg';   // the hero with arrows out of its corners: it grows
ICONS.mark = '....yyyy..../....yyyy..../....yyyy..../....yyyy..../....yyyy..../yyyyyyyyyyyy/.yyyyyyyyyy./..yyyyyyyy../...yyyyyy.../....yyyy..../.....yy...../............';   // over a dazed boss: land here
ICONS.ceiling = 'wwwwwwwwwwww/gggggggggggg/..g..g..g.../....wwww..../...wwwwww.../...wkwwkw.../...wwwwww.../....wwww..../............/............/............/............';
ICONS.dive = '....wwww..../...wwwwww.../...wkwwkw.../...wwwwww.../....wwww..../.....yy...../.....yy...../.....yy...../...yyyyyy.../....yyyy..../.....yy...../............';
ICONS.dash2 = '............/.......wwww./......wwwwww/oooo..wkwwkw/......wwwwww/.oooo..wwww./............/.......wwww./......wwwwww/oooo..wkwwkw/......wwwwww/.oooo..wwww.';
ICONS.foe = '............/....rrrr..../..rrrrrrrr../.rrkkrrkkrr./.rrrkrrkrrr./.rrwkrrwkrr./rrrrrrrrrrrr/rrrrkkkkrrrr/rrrrrrrrrrrr/.rrrrrrrrrr./..rrrrrrrr../............';   // the book's enemies
ICONS.medalG = '..rr....rr../...rr..rr.../....rrrr..../...yyyyyy.../..yyyyyyyy../.yyywyyyyyy./.yywyyyyyyy./.yyyyyyyyyy./.yyyyyyyyyy./..yyyyyyyy../...yyyyyy.../............';   // the daily well's medals: gold, silver, bronze, one not won
ICONS.medalS = ICONS.medalG.replace(/y/g, 'w'); ICONS.medalB = ICONS.medalG.replace(/y/g, 'o'); ICONS.medalOff = ICONS.medalG.replace(/[yr]/g, 's');
ICONS.swarm = '.ooo....bbb./ooooo..bbbbb/ooooo..bbbbb/ooooo..bbbbb/.ooo....bbb./....www...../....www...../.ggg....ppp./ggggg..ppppp/ggggg..ppppp/ggggg..ppppp/.ggg....ppp.';   // five of a kind, in their colours
ICONS.plaster = '............/............/............/.wwwwwwwwww./wwswwoowwsww/wwwwwoowwwww/wwswwoowwsww/.wwwwwwwwww./............/............/............/............';   // the first hit a level is free
ICONS.coin = '............/....oooo..../..ooyyyyoo../..oyywyyyo../.oyywyyyyyo./.oyyyyyyyyo./.oyyyyyyyyo./.oyyyyyyyyo./..oyyyyyyo../..ooyyyyoo../....oooo..../............';   // the campaign's map: a bonus level
ICONS.boss = '............/...pppppp.../..pppppppp../.pkkppppkkp./.pppkppkppp./.ppwkppwkpp./.ppwkppwkpp./.pppppppppp./.pppkkkkppp./..pppppppp../...pppppp.../............';   // and a boss's, its face
ICONS.warn = '.....ww...../....wrrw..../....wrrw..../...wrrrrw.../...wrwwrw.../..wrrwwrrw../..wrrwwrrw../.wrrrrrrrrw./.wrrrwwrrrw./wrrrrrrrrrrw/wwwwwwwwwwww/............';   // a warning sign, at the top edge: something coming down into view here
ICONS.rainbow = '.....rr...../.....rr...../....oooo..../yyyyyyyyyyyy/.gggggggggg./..gggggggg../...bbbbbb.../..bbbbbbbb../..ppp..ppp../.ppp....ppp./.pp......pp./............';   // a star in all the inks: nothing hurts
// The runes, as Yarndings 12 knits them (SIL OFL 1.1; printed by tools/fonts.py from its 12-stitch grid)
ICONS.runeS = '.....ww...../..w.wwww.w../.www.ww.www./..wwwwwwww../.w.ww..ww.w./wwww.ww.wwww/wwww.ww.wwww/.w.ww..ww.w./..wwwwwwww../.www.ww.www./..w.wwww.w../.....ww.....';
ICONS.runeV = '.....ww...../..w..ww..w../.www.ww.www./..wwwwwwww../...wwwwww.../wwwwwwwwwwww/wwwwwwwwwwww/...wwwwww.../..wwwwwwww../.www.ww.www./..w..ww..w../.....ww.....';
ICONS.runeh = '.....w....../....www...../...wwwww..../..wwwwwww.../.wwww.wwww../www.w.w.www./wwww.w.wwww./ww.ww.ww.ww./www.w.w.www./.www.w.www../..www.www.../...ww.ww....';
ICONS.runeI = '.ww..ww..ww./www.wwww.www/www.wwww.www/.....ww...../.ww..ww..ww./wwwwwwwwwwww/wwwwwwwwwwww/.ww..ww..ww./.....ww...../www.wwww.www/www.wwww.www/.ww..ww..ww.';
ICONS.runeg = '...w.w.w..../....www...../...ww.ww..../....www...../.ww..w..ww../.www.w.www../..ww.w.ww.../....www...../....www...../.....w....../...wwwww..../...wwwww....';
ICONS.runey = '............/..www...www./.wwwww.wwwww/wwwwwwwwwwww/wwwwwwwwwwww/wwwwwwwwwwww/.wwwwwwwwwww/..wwwwwwwww./...wwwwwww../....wwwww.../.....www..../......w.....';
ICONS.runeL = '............/.w.......w../www.....www./.www...www../..www.www.../...wwwww..../....www...../...wwwww..../..www.www.../.www...www../www.....www./.w.......w..';
ICONS.runen = '............/.w.w.w.w.w../www.www.www./.www.w.www../w.wwwwwww.w./.w.wwwww.w../wwwwwwwwwww./.w.wwwww.w../w.wwwwwww.w./.www.w.www../www.www.www./.w.w.w.w.w..';
ICONS.runeY = '............/...ww......./...www....../...www....../....ww.www../.www..wwww../wwww..www.../www.ww....../....www...../....www...../.....ww...../............';
ICONS.runeH = '.....ww...../.ww.wwww.ww./.ww.wwww.ww./...w.ww.w.../.ww.wwww.ww./wwwwwwwwwwww/wwwwwwwwwwww/.ww.wwww.ww./...w.ww.w.../.ww.wwww.ww./.ww.wwww.ww./.....ww.....';
ICONS.runeW = '.....ww...../....wwww..../....wwww..../...wwwwww.../.wwwwwwwwww./wwwwwwwwwwww/wwwwwwwwwwww/.wwwwwwwwww./...wwwwww.../....wwww..../....wwww..../.....ww.....';
ICONS.runeu = '....wwww..../..wwwwwwww../.wwwwwwwwww./.ww..ww..ww./www..ww..www/wwwwwwwwwwww/wwwwwwwwwwww/www.wwww.www/.www....www./.wwwwwwwwww./..wwwwwwww../....wwww....';
ICONS.runeB = '....wwww..../....wwww..../....wwww..../....wwww..../wwww....wwww/wwww....wwww/wwww....wwww/wwww....wwww/....wwww..../....wwww..../....wwww..../....wwww....';
ICONS.runeM = '............/.w.......w../www.....www./.ww.....ww../...w...w..../....www...../....www...../....www...../...w...w..../.ww.....ww../www.....www./.w.......w..';
ICONS.runeQ = '.....ww...../..w..ww..w../.www.ww.www./..ww.ww.ww../............/wwww.ww.wwww/wwww.ww.wwww/............/..ww.ww.ww../.www.ww.www./..w..ww..w../.....ww.....';
ICONS.runeO = '..ww...ww.../..www.www.../ww.wwwww.ww./www.www.www./.www.w.www../..www.www.../..www.www.../.www.w.www../www.www.www./ww.wwwww.ww./..www.www.../..ww...ww...';
ICONS.runeU = '.....ww...../.ww.wwww.ww./.ww.wwww.ww./...w.ww.w.../.ww.w..w.ww./wwww.ww.wwww/wwww.ww.wwww/.ww.w..w.ww./...w.ww.w.../.ww.wwww.ww./.ww.wwww.ww./.....ww.....';
ICONS.runed = '............/...ww.ww..../...wwwww..../...wwwww..../www.www.www./wwww.w.wwww./.wwww.wwww../wwww.w.wwww./www.www.www./...wwwww..../...wwwww..../...ww.ww....';
ICONS.runek = '............/............/....w......./...www....../....w......./.w.www.w..../wwwwwwwww.../.w.www.w..../....w......./...www....../....w......./............';
ICONS.runer = '............/.....w....../....www...../...ww.ww..../..ww.w.ww.../.ww.www.ww../ww.ww.ww.ww./.ww.www.ww../..ww.w.ww.../...ww.ww..../....www...../.....w......';
ICONS.runew = '....wwww..../..wwwwwwww../.wwwwwwwwww./.wwwwwwwwww./ww..wwww..ww/ww...ww...ww/www..ww..www/wwwwwwwwwwww/.wwwwwwwwww./..www..www../...wwwwww.../....wwww....';
// Kana for Tokyo's signs: DotGothic16's own glyphs (the game's Japanese font, SIL OFL) on its 16-dot grid.
ICONS['kana_ラ'] = '................/...wwwwwwwwww.../................/................/................/..wwwwwwwwwwww../.............w../.............w../.............w../............w.../............w.../...........w..../..........w...../........ww....../...wwwww......../................';
ICONS['kana_ー'] = '................/................/................/................/................/................/................/..wwwwwwwwwwww../................/................/................/................/................/................/................/................';
ICONS['kana_メ'] = '................/............w.../............w.../...........w..../....w......w..../.....ww...w...../.......www....../.........ww...../........w..w..../.......w....w.../......w......w../.....w........../...ww.........../..w............./................/................';
ICONS['kana_ン'] = '................/................/..w............./...ww........w../.....ww......w../.......w.....w../............w.../............w.../...........w..../..........w...../.........w....../.......ww......./.....ww........./..www.........../................/................';
ICONS['kana_ス'] = '................/................/..wwwwwwwwww..../...........w..../...........w..../..........w...../..........w...../.........w....../.........w....../........w.w...../.......w...w..../.....ww.....w.../...ww........w../.ww...........w./................/................';
ICONS['kana_シ'] = '................/...www........../.....www......../.......ww......./.www.........w../...www.......w../.....ww......w../............ww../............ww../...........ww.../..........ww..../........www...../.....wwww......./..wwww........../................/................';
ICONS['kana_カ'] = '.......w......../.......w......../.......w......../..wwwwwwwwwwww../.......w.....w../.......w.....w../......w......w../......w......w../......w......w../.....w.......w../.....w.......w../....w........w../...w........w.../..w.....wwww..../................/................';
ICONS['kana_オ'] = '...........w..../...........w..../...........w..../...........w..../.wwwwwwwwwwwwww./..........ww..../.........w.w..../........w..w..../.......w...w..../......w....w..../.....w.....w..../....w......w..../..ww.......w..../.w.........w..../.......wwww...../................';
ICONS['kana_ケ'] = '................/.....w........../.....w........../....w.........../....wwwwwwwwwww./...w......w...../...w......w...../..w.......w...../.w.......w....../.........w....../........w......./........w......./.......w......../.....ww........./...ww.........../................';
// Under a Tokyo neon sign's word, a picture of what is sold there (drawn in the tube's ink): a bowl of noodles steaming, a fish, a microphone
ICONS.neonBowl = '...o..o..o.../...o..o..o.../............./ooooooooooooo/.ooooooooooo./..ooooooooo../...ooooooo.../....ooooo....';
ICONS.neonFish = '...ooooo...../.ooooooooo..o/oo.oooooooooo/ooooooooooooo/.ooooooooo..o/...ooooo.....';
ICONS.neonMic = '...ooo.../..ooooo../..ooooo../..ooooo../...ooo.../....o..../....o..../....o..../..ooooo..';
for (const id in ICONS) ICONS[id] = ICONS[id].split('/');
const ICON_INK ={ k: 'black', r: 'red', b: 'blue', y: 'yellow', g: 'green', p: 'purple', o: 'orange', s: 'gray', w: 'white' };
// The hero is a ball (Gum's shapes stay, as looks to unlock); firm enough to stay round
// standing on a floor, and runnier than at first (firm 2.0, then 1.4; user: it rattled about at speed, then: softer still).
DESIGNS.unshift({ id: 'round', n: 32, size: 1.0, firm: 1.2, kernel: [0, 0], sdf: (x, y) => Math.hypot(x, y) - 1,
  face: { eye: [0.3, 0.02], eyeR: [0.075, 0.095], mouth: [0, 0.2], mouthW: 0.13, blush: [0.52, 0.17] } });
// The new enemies' shapes (y down): a shell's dome, a spitter's drop narrowing to its spout, a
// splitter's bean of two lobes, a chaser's tall slug.
DESIGNS.push(
  { id: 'dome', n: 34, size: 1.0, firm: 1.6, kernel: [0, 0.12], sdf: (x, y) => Math.max(sdEll(x, y - 0.18, 1.1, 0.95), y - 0.5),
    face: { eye: [0.3, 0.12], eyeR: [0.072, 0.09], mouth: [0, 0.3], mouthW: 0.11, blush: [0.5, 0.28] } },
  { id: 'drop', n: 34, size: 1.0, firm: 1.3, kernel: [0, 0.15], sdf: (x, y) => Math.pow(x / (0.95 * (0.45 + 0.55 * Math.min(1, (y + 1) / 1.4))), 2) + y * y - 1,
    face: { eye: [0.26, 0.18], eyeR: [0.07, 0.09], mouth: [0, 0.4], mouthW: 0.1, blush: [0.46, 0.34] } },
  { id: 'peanut', n: 40, size: 1.0, firm: 1.1, kernel: [0, 0], sdf: (x, y) => smin(sdEll(x - 0.32, y, 0.7, 0.68), sdEll(x + 0.32, y, 0.7, 0.68), 0.4),   // a shallow waist: a deep one lets a body sink in before it touches
    face: { eye: [0.22, 0.0], eyeR: [0.07, 0.09], mouth: [0, 0.22], mouthW: 0.12, blush: [0.5, 0.15] } },
  { id: 'slug', n: 34, size: 1.0, firm: 1.2, kernel: [0, 0], sdf: (x, y) => sdRoundBox(x, y, 0.62, 1.0, 0.55),
    face: { eye: [0.22, -0.3], eyeR: [0.07, 0.09], mouth: [0, -0.08], mouthW: 0.1, blush: [0.4, -0.15] } },
);
// The book's pictures of each enemy and boss (the user: each its own, in detail): its own shape as Gum's design gives its
// body, 16 pixels square in its ink, shaded as the bodies are (a white gloss up left, a dither of black low down), its
// eyes black with a white glint (ICONS foe_<kind>, boss_<id>).
function portrait(design, ink, n = 16) {
  const d = designById(design), f = d.face, rows = [], at = (i) => (((i + 0.5) / n) * 2 - 1) * 1.2;
  let top = n, bot = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (d.sdf(at(i), at(j)) < 0) { top = Math.min(top, j); bot = Math.max(bot, j); }
  for (let j = 0; j < n; j++) {
    let row = '';
    for (let i = 0; i < n; i++) {
      const x = at(i), y = at(j), ex = [-1, 1].map((sx) => [(x - sx * f.eye[0]) / (2.2 * f.eyeR[0]), (y - f.eye[1]) / (2.2 * f.eyeR[1])]);
      const eye = ex.some(([u, v]) => u * u + v * v < 1), glint = ex.some(([u, v]) => (u + 0.35) ** 2 + (v + 0.35) ** 2 < 0.12);
      const inside = d.sdf(x, y) < 0, rim = inside && d.sdf(x - 0.15, y - 0.15) > -0.08, low = j > top + (bot - top) * 0.72;
      row += !inside ? '.' : eye ? (glint ? 'w' : 'k') : rim && x < 0 && y < 0 ? 'w' : low && (i + j) % 2 ? 'k' : ink;
    }
    rows.push(row);
  }
  return rows;
}
for (const k in ENEMY) ICONS['foe_' + k] = portrait(ENEMY[k].design, 'r');
for (const k in BOSSES) ICONS['boss_' + k] = portrait(BOSSES[k].design || 'cat', 'p');
ICONS.foe_skull = ['................', '.....wwwwww.....', '...wwwwwwwwww...', '..wwwwwwwswwww..', '..wwswwwwwwwww..', '.wwkkkkwwkkkkww.', '.wkkkkkwwkkkkkw.', '.wkkrkkwwkkrkkw.',
  '.wwkkkwwwwkkkww.', '..wwwwwkkwwwww..', '...wwwwwwwwww...', '...wkwkwkwkwk...', '..ssssssssssss..', '.ssssssssssssss.', '.ss.sss..sss.ss.', '..s..s....s..s..'];   // a skull over its goo (the user's picture)
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
//   ~  moss under the block above (the only ceiling the hero hangs from, see CEIL)
//   o  coin   O  big coin   B  bubble in the wall (a shop or a stash)
//   X  cracked block: a head-butt from below (or a smash) breaks it for good — the way into a stash in the wall
//   Y  a stalactite under the block above: it falls on a hero passing under it   A  an arena's middle (waves of enemies)
const CHUNKS = {
  stairs: { d: 1, rows: [
    '............',
    '............',
    '.......#####',
    '......o~~~~~',
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
  shelves: { d: 1, rows: [
    '............',
    '............',
    '.....=======',
    '............',
    '..o.........',
    '..======....',
    '............',
    '.........o..',
    '====....====',
    '............'] },
  pillars: { d: 1, rows: [
    '............',
    '............',
    '.........###',
    '............',
    '......o.....',
    '.....###....',
    '.....~~~....',
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
    '~~~~........',
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
    '......~~~~~~',
    '............'] },
  overhang: { d: 2, rows: [
    '............',
    '............',
    '####....####',
    '~~~~....~~~~',
    '.....o......',
    '............',
    '............',
    '....####....',
    '............'] },
  spring: { d: 2, rows: [
    '............',
    '............',
    '.......#####',
    '.......~~~~~',
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
    '~~~~........',
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
    '~~~.........',
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
    '[.....~~~..]',
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
    '{......~~~.}',
    '{..........}',
    '{.o........}',
    '{..........}',
    '{..........}',
    '{.###......}',
    '{.~~~......}',
    '{..........}'] },
  rubberwall: { d: 2, rows: [
    '(...........',
    '(...........',
    '(......#####',
    '(......~~~~~',
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
  fork: { d: 2, rows: [   // two ways up (user): moss to hang on and a coin, or spiked wall and two big ones
    '............',
    '............',
    '###..##..###',
    '{....##....<',
    '{....##..O.<',
    '{.o..##....<',
    '{....##.##.<',
    '{##..##....<',
    '{....##..O.<',
    '{....##....<',
    '{....##.##.<',
    '{##..##....<',
    '{....##....<',
    '............'] },
  fork2: { d: 2, rows: [   // planks all the way, or crumbling blocks under big coins
    '............',
    '............',
    '###..##..###',
    '.....##.....',
    '.....##..O..',
    '.==..##.....',
    '.....##.CC..',
    '..==.##.....',
    '.....##..O..',
    '.==..##.....',
    '.....##.CC..',
    '.....##.....',
    '..==.##.....',
    '............'] },
  vault: { d: 1, rows: [   // a stash in the wall (user): coins boxed in over a cracked floor; the way up passes by it, a jump up
    '............',        // from under it breaks in, and a gap in its roof lets the hero on up through it (no dead end)
    '............',
    '##.....##..#',
    '.......#oOo#',
    '.......#ooo#',
    '.......#XXX#',
    '............',
    '...o........',
    '..###.......',
    '............',
    '............',
    '.....######.',
    '............'] },
  // Set pieces, one a level about halfway up (see SETS; user's picks): a moss garden, a treasury over spikes, an arena of
  // enemy waves, a hall of stalactites.
  garden: { d: 1, rows: [
    '{..........}',
    '{..........}',
    '{.####.....}',
    '{.~~~~...o.}',
    '{......###.}',
    '{.o....~~~.}',
    '{..........}',
    '{...o......}',
    '{.###....o.}',
    '{.~~~......}',
    '{......###.}',
    '{..o...~~~.}',
    '{..........}',
    '{.###......}',
    '{..........}'] },
  treasury: { d: 2, rows: [
    '............',
    '............',
    '###......###',
    '............',
    '...oOOOOo...',
    '...oooooo...',
    '..########..',
    '..vvvvvvvv..',
    '............',
    '............',
    '............',
    '####....####',
    '............'] },
  arena: { d: 2, rows: [
    '............',
    '............',
    '###......###',
    '............',
    '............',
    '............',
    '.....A......',
    '............',
    '..========..',
    '............',
    '............'] },
  icicles: { d: 2, rows: [
    '............',
    '............',
    '####...#####',
    '.Y.Y....Y.Y.',
    '............',
    '...o..o..o..',
    '............',
    '########....',
    '.Y..Y..Y....',
    '............',
    '............',
    '............',
    '......######',
    '............'] },
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
    '........~~~.',
    '............'] },
  // Gates (GATE), one a level: a ledge right across with a keystone (XXX, four tiles once widened) to break from under it, coins up
  // to it. The plain one over a wide ledge; one by a wall, jumped across to (or up the wall); one with spikes under all but its keystone.
  gate: { d: 1, rows: [
    '............',
    '............',
    '####XXX#####',
    '.....o......',
    '............',
    '.....o......',
    '............',
    '..########..',
    '............',
    '............'] },
  gate2: { d: 2, rows: [
    '............',
    '............',
    'XXX#########',
    '............',
    '.o..........',
    '...o........',
    '............',
    '.....#######',
    '............',
    '............'] },
  // Stairs (the Panel Blocks' signature; T a step, a block a tile square): a landing, a flight of steps a tile up and a tile on each,
  // walked up by pressing on (a step lifts what walks into its riser onto it), a landing; every step with two tiles clear over it
  // (the last one wide, so the landing's lip is never a tile over a step to wedge the hero under), the landing short of the wall
  // (a slot past it: under the flight is never a dead end); mirrored they zigzag.
  flight: { d: 1, rows: [
    '............',
    '............',
    '........TTT.',
    '......TT....',
    '.....T......',
    '....T.......',
    '...T........',
    '###.........',
    '............',
    '............'] },
  gate3: { d: 3, rows: [
    '............',
    '............',
    '#####XXX####',
    'vvvvv...vvvv',
    '............',
    '......o.....',
    '............',
    '...######...',
    '............',
    '............'] },
};
// What each chunk is mostly made of: two of a kind never run (the level's rhythm, see addChunk).
for (const [kind, ids] of Object.entries({ blocks: ['stairs', 'pillars', 'comb', 'overhang', 'iceblocks', 'vault'], planks: ['planks', 'shelves'],
  walls: ['icewall', 'mosswall', 'rubberwall', 'spikewalls', 'chimney'], moving: ['movers', 'lift'], crumbling: ['crumble', 'bridge'],
  danger: ['spikes', 'sparse'], fork: ['twinshaft', 'fork', 'fork2'], spring: ['spring'], rest: ['rest', 'pocket'], set: ['garden', 'treasury', 'arena', 'icicles'], gate: ['gate', 'gate2', 'gate3'], flight: ['flight'] })) for (const id of ids) CHUNKS[id].kind = kind;
// Which set pieces each world has (one of them a level, as hard as the level allows), and an arena's waves: so many enemies each.
const SETS = [['garden', 'treasury', 'arena'], ['icicles', 'garden', 'treasury', 'arena'], ['arena', 'treasury', 'icicles'], ['arena', 'icicles', 'treasury']];
const ARENA = { waves: [2, 3], coins: 6, reach: 6, drop: 5 };   // coins: big ones for winning; reach: R round its middle that starts it; drop: R over it they fall from
const ICICLE = { reach: 1.1, below: 9, shake: 0.55, r: 0.28 };   // R either side and under it that set it off; s it shakes first; R round as it falls
const MIRROR = { '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{', '(': ')', ')': '(' };
// The well is COLS tiles wide: each chunk's columns 1, 4, 7 and 10 are doubled (spread out and
// even under mirroring; the walls' columns 0 and 11 stay as they are), and a coin, big coin,
// spring or door in a doubled column is not copied.
const COLS = 16, WIDEN = [1, 4, 7, 10], ONCE = new Set(['o', 'O', 'S', 'B', 'A', 'Y']);
for (const id in CHUNKS) {
  CHUNKS[id].rows = CHUNKS[id].rows.map((row) => [...row].map((ch, k) => {
    if (!WIDEN.includes(k)) return ch;
    const copy = ONCE.has(ch) ? '.' : ch;
    return k < 6 ? ch + copy : copy + ch;   // the copy on the inner side
  }).join(''));
}
// Each chunk's first and last footholds, worked out from its rows once: runs of columns
// [from, to, tile] in the lowest and the highest row anything can be stood on.
const STAND = new Set(['#', 'I', 'C', '=', 'M', 'S', 'X', 'T']);
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
    this.kind = 'well'; this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = []; this.arenas = []; this.icicles = [];
    this.pickups = []; this.enemies = []; this.shots = []; this.nearBuf = []; this.boss = null; this.spots = []; this.runes = []; this.under = false;
    this.l = 0; this.r = 1; this.floor = 0; this.top = 0; this.R = 30; this.cam = 0; this.t = 0;
    this.portal = null; this.exit = null; this.capY = -Infinity; this.endY = -Infinity; this.fire = null; this.plan = [];
    this.world = WORLDS[0]; this.theme = THEMES.cave; this.stage = 0; this.hard = false; this.dark = false; this.intro = []; this.foeTypes = null; this.rc = null;
  }
  // o: { kind, w, h, R, seed, world, stage, hard, height (px, a shaft only), theme, recipe (a campaign level's: CAMPAIGN) }
  reset(o) {
    this.kind = o.kind; this.l = LEVEL.wall; this.r = o.w - LEVEL.wall; this.floor = 0; this.R = o.R; this.t = 0;
    this.world = o.world; this.stage = o.stage || 0; this.hard = !!o.hard; this.theme = o.theme || o.world.theme;
    this.k = this.hard ? 1.4 * (1 + 0.15 * Math.max(0, (o.tier || 1) - 1)) : 1;   // hard: the fire and the enemies 1.4×, and 15% more each tier past the first
    const rc = this.rc = o.recipe || null;   // a campaign level is made by its recipe; a run's, by its world and stage
    this.dark = o.kind === 'well' && (rc ? !!rc.dark : !!(o.world.dark && o.world.dark.includes(this.stage)));
    this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = []; this.arenas = []; this.icicles = [];
    this.pickups = []; this.enemies = []; this.shots = []; this.boss = null; this.spots = []; this.rings = []; this.crossing = null; this.under = false; this.rail = null; this.crumbleTime = 0; this.crumbleBack = 0;
    const sr = mulberry32((o.seed ^ 0x51ed270b) >>> 0);   // the flip side's spot, by its own generator: the shaft is laid as before
    this.spotAt = o.kind === 'well' && o.height && !rc && !o.world.bonus && sr() < UNDER.p ? this.floor - o.height * (UNDER.at[0] + sr() * (UNDER.at[1] - UNDER.at[0])) : null; this.spotRng = sr;
    const ru = this.runeRng = mulberry32((o.seed ^ 0x6d2b79f5) >>> 0), cw = CAMPAIGN.find((c) => c.world === o.world), n = !cw || o.kind !== 'well' || !o.height ? 0 : rc ? rc.runes || 0 : ru() < RUNE.p ? 1 : 0;   // its runes (RUNE), by their own generator too
    this.runes = []; this.runeAt = shuffled(ru, [...(cw ? cw.runes : '')]).slice(0, n).map((ch, k) => ({ ch, y: this.floor - o.height * (RUNE.at[k][0] + ru() * (RUNE.at[k][1] - RUNE.at[k][0])) }));
    const rr = this.ringRng = mulberry32((o.seed ^ 0x7f4a7c15) >>> 0);   // the boost ring's place, by its own generator
    this.ringAt = o.kind === 'well' && o.height && !rc && !o.world.bonus && rr() < RING.p ? this.floor - o.height * (RING.at[0] + rr() * (RING.at[1] - RING.at[0])) : null;
    const tr = mulberry32((o.seed ^ 0x1b873593) >>> 0), wi = WORLDS.indexOf(o.world);   // the crossing, by its own generator
    if (o.kind === 'well' && o.height && !o.world.bonus && (rc ? rc.crossing : (wi > 0 || o.world.crossing) && tr() < (o.world.crossing || TRAIN.p))) { const y = this.floor - o.height * (TRAIN.at[0] + tr() * (TRAIN.at[1] - TRAIN.at[0])), h = TRAIN.h * o.h; this.crossing = { y0: y - h, y1: y, state: 'rest', t: TRAIN.rest[0] + tr() * (TRAIN.rest[1] - TRAIN.rest[0]), x: 0 }; }
    const gr = mulberry32((o.seed ^ 0x5bd1e995) >>> 0), gw = o.world === CRYPT ? CRYPT.at[0] : Math.max(0, WORLDS.indexOf(o.world));   // the gate, by its own generator
    this.gateId = o.kind !== 'well' || !o.height || o.world.bonus ? null : rc ? rc.gate || null : this.stage === 1 ? GATE.run[Math.min(gw, 3)] : null;
    this.gateAt = this.gateId ? this.floor - o.height * (GATE.at[0] + gr() * (GATE.at[1] - GATE.at[0])) : null;
    this.flavRng = mulberry32((o.seed ^ 0x2c1b3c6d) >>> 0);   // which ledges bounce or pull (flavour), by their own generator
    this.rng = mulberry32(o.seed >>> 0); this.tile = (this.r - this.l) / COLS; this.last = null; this.rested = false; this.setAt = null; this.pocketKind = 'shop'; this.placed = []; this.lastFeet = null;
    const intro = rc ? { chunks: rc.intro, enemies: rc.enemies, candy: rc.candy } : (o.world.intro && o.world.intro[this.stage]) || {};
    this.intro = o.kind === 'well' ? shuffled(this.rng, intro.chunks || []) : []; this.foeTypes = intro.enemies || null;
    this.fizz = []; this.bullets = [];
    if (o.kind === 'well' && o.height && !o.world.bonus) {   // the level's set piece: where, and which (as hard as the level allows; a recipe's own)
      const w = WORLDS.indexOf(o.world), maxD = this.hard ? 3 : MAX_D[Math.max(0, Math.min(w, 3))][Math.min(this.stage, 2)], ok = rc ? (rc.set ? [rc.set] : []) : (SETS[Math.max(0, w)] || SETS[0]).filter((id) => CHUNKS[id].d <= maxD);
      if (ok.length) { this.setAt = this.floor - o.height * (0.4 + 0.2 * this.rng()); this.setId = ok[(this.rng() * ok.length) | 0]; }
    }
    this.folk = []; this.folkAt = []; this.folkRng = mulberry32((o.seed ^ 0x2545f491) >>> 0);   // folk (see FOLK), by their own generator
    if (o.kind === 'well' && o.height && !o.world.bonus) {
      const fr = this.folkRng, at = ([a, b]) => this.floor - o.height * (a + fr() * (b - a));
      if (rc ? rc.cage : fr() < FOLK.cageP) this.folkAt.push({ kind: 'cage', y: at(FOLK.cage) });
      if (rc ? rc.trader : fr() < FOLK.traderP) this.folkAt.push({ kind: 'trader', y: at(FOLK.trader) });
      this.folkAt.sort((p, q) => q.y - p.y);   // the lower first
    }
    this.fizzAt = o.kind === 'well' && o.height ? GUN.at.slice(0, rc ? rc.candy.length : GUN.at.length).map(([a, b]) => this.floor - o.height * (a + this.rng() * (b - a))) : [];   // heights for the candies (a recipe's, as many)
    this.fizzKind = intro.candy || shuffled(mulberry32((o.seed ^ 0x9e3779b9) >>> 0), Object.keys(CANDY));   // and which kinds, by a generator of their own: the shaft is laid as before
    this.top = this.floor - (o.kind === 'well' ? this.tile : 0); this.endY = o.height ? this.floor - o.height : -Infinity;   // a tile of room over the floor, where the hero starts
    this.portal = null; this.exit = null; this.capY = -Infinity; this.fire = null; this.plan = [];
    this.coinTotal = 0; this.coinsTaken = 0; this.foeTotal = 0; this.foeKilled = 0;   // for the level's stars
    this.cam = this.floor + CAM.floorShow - o.h;
    if (o.kind === 'well') {
      const rnd = this.rng, H = o.height;
      if (rc ? rc.shop : !o.world.bonus && rnd() < (this.hard ? 0.7 : 0.85)) this.plan.push({ y: this.floor - H * (rc ? rc.shop : 0.3 + rnd() * 0.4), kind: 'shop', done: false });
      if (rc ? rc.stash : !o.world.bonus && rnd() < 0.8) this.plan.push({ y: this.floor - H * (rc ? rc.stash : 0.15 + rnd() * 0.55), kind: 'treasure', done: false });
      const v = (rc ? rc.fire : o.world.fire || 0) * this.R * this.k;
      if (v > 0) this.fire = { y: this.floor + o.h * 0.4, v, spitT: FIRE.spit[0], warn: null, calm: rc ? rc.calm || 0 : WORLDS.indexOf(o.world) === 0 && !this.stage ? FIRE.calm : 0 };
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
      const p = LEVEL.plank * R;   // two ledges a jump up, to drop onto it from; the middle clear, where it dives
      if (this.rc && this.rc.moss) for (const side of [1, 2]) this.coats.push({ side, y0: this.capY - 4000, y1: this.floor, kind: 'moss' });   // a campaign arena's walls hold
      if (this.rc && this.rc.rail) {   // the Minecart's: moss under the ceiling at both ends, its rail under them, two crumbling bridges midway, two lifts lower
        const top = this.floor + Math.max(CAM.floorShow, o.keep || 0) - o.h + CAM.top, cr = CART.size * R, end = 1.1 * cr + 0.6 * R, mx = 2 * end;   // (top: the arena's top in sight, under the HUD; end: its stop, clear of the wall)
        for (const [x0, x1] of [[this.l, this.l + mx], [this.r - mx, this.r]]) this.rects.push(this.box(x0, top, x1, top + 0.45 * R, { moss: true }));
        this.rail = { x0: this.l + end, x1: this.r - end, y: top + 3.05 * R + 1.6 * cr };   // a hero hanging under the moss clears it
        const A = this.floor - this.rail.y;
        for (const [f0, f1] of [[0.06, 0.36], [0.64, 0.94]]) this.rects.push(this.box(this.l + W * f0, this.floor - 0.5 * A, this.l + W * f1, this.floor - 0.5 * A + p, { plank: true, crumble: true }));
        this.rects.push(this.box(this.l, this.floor - 0.2 * A, this.l + 0.26 * W, this.floor - 0.2 * A + p, { plank: true, move: { a: this.l, b: this.r - 0.26 * W, v: 1.8 * R } }));
        this.rects.push(this.box(this.r - 0.26 * W, this.floor - 0.34 * A, this.r, this.floor - 0.34 * A + p, { plank: true, move: { a: this.l, b: this.r - 0.26 * W, v: -2.2 * R } }));
        return;
      }
      if (this.rc && this.rc.ice) {   // the Puck's: the floor all ice, four icicles under the ceiling (it shakes them down)
        this.rects.push(this.box(this.l, this.floor - 0.3 * R, this.r, this.floor, { slick: true }));
        for (const f of [0.2, 0.4, 0.6, 0.8]) this.icicles.push({ x: this.l + W * f, y: this.capY, state: 'hang', t: 0 });
      }
      this.rects.push(this.box(this.l, at(0.32), this.l + W * 0.3, at(0.32) + p, { plank: true }));
      this.rects.push(this.box(this.r - W * 0.3, at(0.32), this.r, at(0.32) + p, { plank: true }));
      return;
    }
    // a room: the way back out is a hole in the left wall, on the floor, as the doors in the shaft are
    const dw = DOOR.w * R;
    this.exit = { x0: this.l - LEVEL.wall, x1: this.l + dw, y0: this.floor - DOOR.h * R, y1: this.floor, x: this.l + dw / 2, y: this.floor - 1.2 * R, side: 1, armed: false };
    if (o.kind === 'shop') {   // its things in a row halfway up the room (a double jump; walking under them buys nothing), well apart, clear of the way out
      shuffled(rnd, SHOP_ITEMS).slice(0, 3).forEach((item, k) => {
        this.pickups.push({ x: cx + (k - 1) * 0.3 * W, y: at(0.38), r: 0.6 * R, item, sold: false, near: false });   // centred, a third of the width apart, as the user's sketch has them; a full jump reaches (was 0.45, user: hard to reach)
      });
    } else {   // a stash: one of five, each with its own lot of coins (user: one was dull)
      const ledge = (x0, x1, y, f = {}) => this.rects.push(this.box(x0, y, x1, y + (f.plank ? LEVEL.plank : LEVEL.thick) * R, f));
      const row = (y, n, gap, v = 1) => { for (let k = 0; k < n; k++) this.coin(cx + (k - (n - 1) / 2) * gap * R, y, v); };
      const side = (f0, n) => { for (let k = 0; k < n; k++) { this.coin(this.l + 1.3 * R, at(f0 + 0.12 * k), 1); this.coin(this.r - 1.3 * R, at(f0 + 0.12 * k), 1); } };
      this.stash = (rnd() * 5) | 0;
      if (this.stash === 0) {   // the heap: a pyramid on a ledge, the top a big one, and two columns up the walls (~27)
        const y = at(0.42);
        ledge(cx - W * 0.24, cx + W * 0.24, y);
        for (let r = 0; r < 4; r++) for (let k = 0, n = 4 - r; k < n; k++) this.coin(cx + (k - (n - 1) / 2) * 1.1 * R, y - 0.75 * R - r * 1.0 * R, r === 3 || rnd() < 0.15 ? 5 : 1);
        side(0.3, 4);
      } else if (this.stash === 1) {   // the stairs: three ledges up from side to side, a row on each, a big one at the top (~17)
        [[0.22, -1], [0.44, 1], [0.66, -1]].forEach(([f, d], i) => {
          const x = cx + d * W * 0.2, y = at(f); ledge(x - W * 0.2, x + W * 0.2, y);
          for (let k = 0; k < 4; k++) this.coin(x + (k - 1.5) * 1.1 * R, y - 0.75 * R, i === 2 && k === (d < 0 ? 0 : 3) ? 5 : 1);
        });
      } else if (this.stash === 2) {   // the ring: a circle of coins round a big one, in the air over a plank to jump from (~17)
        const y = at(0.5);
        ledge(cx - W * 0.16, cx + W * 0.16, at(0.22), { plank: true });
        for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; this.coin(cx + Math.cos(a) * 2.6 * R, y + Math.sin(a) * 2.6 * R, 1); }
        this.coin(cx, y, 5);
      } else if (this.stash === 3) {   // the hoard: few, all big: three on the floor, three on a ledge high in the middle (30)
        row(this.floor - 0.75 * R, 3, 2.2, 5);
        ledge(cx - W * 0.18, cx + W * 0.18, at(0.5)); row(at(0.5) - 0.75 * R, 3, 1.6, 5);
      } else {   // the rain: many small ones hanging in rows, two planks to climb them by (~24)
        ledge(this.l, this.l + W * 0.28, at(0.3), { plank: true }); ledge(this.r - W * 0.28, this.r, at(0.52), { plank: true });   // clear of the rows
        for (let r = 0; r < 4; r++) row(at(0.38 + 0.11 * r), r & 1 ? 5 : 6, 1.2);
        side(0.22, 1);
      }
      if (rnd() < 0.45) this.pickups.push({ x: cx, y: at(0.8), r: 0.6 * R, item: GIFT, sold: false, near: false });
    }
  }
  ensure(y) { while (this.top > y) this.addChunk(); }
  // Drop what has fallen far below the camera (a crumbled block stays: it comes back).
  prune(y) {
    const keep = (o) => o.y0 === undefined ? o.y <= y : o.y0 <= y;
    this.rects = this.rects.filter((r) => r.cap || r.safe || keep(r));   // a ledge a fall may come back to stays
    this.spikes = this.spikes.filter(keep);
    this.coats = this.coats.filter(keep);
    this.coins = this.coins.filter((c) => c.drop || keep(c));   // an enemy's, on its way to the hero, stays
    this.folk = this.folk.filter(keep); this.icicles = this.icicles.filter(keep); this.arenas = this.arenas.filter(keep); this.spots = this.spots.filter(keep); this.runes = this.runes.filter(keep); this.rings = this.rings.filter(keep);
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
    if (!id && this.gateAt != null && this.top < this.gateAt) { id = this.gateId; this.gateAt = null; }   // its gate (GATE), before a set piece due too: it must fit
    if (!id && this.setAt != null && this.top < this.setAt) { id = this.setId; this.setAt = null; }   // its set piece
    // The level's rhythm (user): an easy fifth at the start, harder ones likelier in the middle, a rest just under the way out,
    // and never two of a kind running.
    const left = this.top - this.endY, p = Number.isFinite(this.endY) ? 1 - left / Math.max(1, this.floor - this.endY) : 0.5;
    if (!id && !this.rested && left > 4 * this.tile && left < 14 * this.tile && !wd.bonus) { id = 'rest'; this.rested = true; }
    if (!id) {
      let maxD = this.hard ? 3 : this.rc ? this.rc.maxD : wd.maxD || MAX_D[Math.min(wd === SUMMIT ? 3 : WORLDS.indexOf(wd), 3)][Math.min(this.stage, 2)], w = {};
      if (p < 0.2) maxD = Math.min(maxD, 1);
      const lastKind = this.last && CHUNKS[this.last].kind, mid = p > 0.35 && p < 0.75;
      const once = (k) => k === 'rest' || (k === 'vault' && this.placed.some((q) => q.id === k));   // the rest only under the way out; one stash in the wall a level
      const pool = this.rc ? this.rc.chunks : wd.chunks;
      for (const k in pool) if (CHUNKS[k].d <= maxD && k !== this.last && CHUNKS[k].kind !== lastKind && !once(k)) w[k] = pool[k] * (mid ? 1 + 0.6 * (CHUNKS[k].d - 1) : 1);
      if (!Object.keys(w).length) for (const k in pool) if (CHUNKS[k].d <= maxD && k !== this.last && !once(k)) w[k] = pool[k];   // a small pool: kinds may run
      id = pick(rnd, w);
    }
    const c = CHUNKS[id];
    if (this.top - c.rows.length * this.tile < this.endY) { this.finish(); return; }
    // the way round whose first foothold is the easier step up from the last one below
    const cost = (m) => (this.lastFeet ? stepCost(this.lastFeet, m ? flipRuns(c.first) : c.first) : 0), a = cost(false), b = cost(true);
    const mirror = a === b ? rnd() < 0.5 : b < a;
    this.lastFeet = mirror ? flipRuns(c.last) : c.last;
    // Laid right on the last one, a chunk may hang a solid ledge just over a ledge under it, with
    // no room to stand there and jump: then it goes a tile higher, up to three.
    const keep = [this.rects, this.spikes, this.coats, this.coins, this.spawns, this.bubbles, this.arenas, this.icicles], lens = keep.map((a) => a.length);
    let lift = 0;
    for (;;) {
      this.place(c, this.top - lift * this.tile, mirror);
      if (lift >= 3 || !this.cramped(lens[0])) break;
      keep.forEach((a, i) => { a.length = lens[i]; }); lift++;
    }
    this.coinTotal += this.coins.length - lens[3]; this.foeTotal += this.spawns.length - lens[4];   // as laid at last
    if (c.kind === 'gate') for (const r of this.rects.slice(lens[0])) if (r.crack) r.key = true;   // a gate's keystone
    if (this.fizzAt.length && this.top - (lift + c.rows.length) * this.tile < this.fizzAt[0] && c !== CHUNKS.pocket) {   // a candy due: over a steady ledge of this chunk
      const ok = this.rects.slice(lens[0]).filter((r) => !r.crumble && !r.move && !r.spring && r.x1 - r.x0 >= 2 * this.tile);
      if (ok.length) { const r = ok[(this.rng() * ok.length) | 0]; this.fizz.push({ x: (r.x0 + r.x1) / 2, y: r.y0 - 1.3 * this.R, r: 0.5 * this.R, taken: false, kind: this.fizzKind[this.fizz.length] }); this.fizzAt.shift(); }
    }
    const h = (lift + c.rows.length) * this.tile;
    if (c !== CHUNKS.pocket) this.addFolk(lens[0], this.top - h);
    this.flavour(lens[0]);
    if (this.ringAt != null && this.top - h < this.ringAt && c !== CHUNKS.pocket && c.kind !== 'set' && c.kind !== 'gate') this.addRing(this.top - h, this.top);
    if (this.spotAt != null && this.top - h < this.spotAt && c !== CHUNKS.pocket && c.kind !== 'set' && c.kind !== 'gate') this.addSpot(this.top - h, this.top);
    if (this.runeAt.length && this.top - h < this.runeAt[0].y && c !== CHUNKS.pocket) this.addRune(this.top - h, this.top);
    this.placed.push({ id, y1: this.top, y0: this.top - h });   // which chunk is where (for checks)
    this.last = id;
    this.top -= h;
  }
  // The flip side's spot in the chunk just laid (from y0 up to y1): a free place in the open, clear of ledges, spikes and enemies.
  addSpot(y0, y1) {
    const R = this.R, rr = UNDER.r * R + 0.6 * R, ok = [];
    for (let y = y0 + 2 * R; y < y1 - 2 * R; y += 0.8 * R) for (let x = this.l + rr; x < this.r - rr; x += 0.8 * R) {
      if (this.rects.some((q) => q.x1 > x - rr && q.x0 < x + rr && q.y1 > y - rr && q.y0 < y + rr)) continue;
      if (this.spikes.some((q) => q.x1 > x - 2 * R && q.x0 < x + 2 * R && q.y1 > y - 2 * R && q.y0 < y + 2 * R) || this.spawns.some((q) => Math.hypot(q.x - x, q.y - y) < 2.5 * R)) continue;
      ok.push([x, y]);
    }
    if (!ok.length) return;
    const [x, y] = ok[(this.spotRng() * ok.length) | 0];
    this.spots.push({ x, y, y1: y, r: UNDER.r, kind: 'in', used: false }); this.spotAt = null;
  }
  // The boost ring in the chunk just laid (from y0 up to y1): in the open, clear of ledges and spikes (as the flip side's spot).
  addRing(y0, y1) {
    const R = this.R, rr = (RING.r + 0.5) * R, ok = [];
    for (let y = y0 + 2 * R; y < y1 - 2 * R; y += 0.8 * R) for (let x = this.l + rr; x < this.r - rr; x += 0.8 * R) {
      if (!this.rects.some((q) => q.x1 > x - rr && q.x0 < x + rr && q.y1 > y - rr && q.y0 < y + rr) && !this.spikes.some((q) => q.x1 > x - rr && q.x0 < x + rr && q.y1 > y - rr && q.y0 < y + rr)) ok.push([x, y]);
    }
    if (!ok.length) return;
    const [x, y] = ok[(this.ringRng() * ok.length) | 0];
    this.rings.push({ x, y, used: false }); this.ringAt = null;
  }
  // Some of a run's ledges as their world has them (user): the Cave's planks bounce, the Mine's blocks pull (BOUNCY, MAGNET).
  flavour(from) {
    const w = this.world;
    if (w.clouds) { for (const r of this.rects.slice(from)) if (r.plank && !r.move && !(r.x0 <= this.l + 1 || r.x1 >= this.r - 1)) { r.crumble = true; r.cloud = true; } return; }   // the Skyscraper: a free plank is a cloud and gives way (its kit: a cloud always dissolves, a catwalk off a wall holds)
    if (w.awnings) { for (const r of this.rects.slice(from)) if (r.plank && !r.move && (r.x0 <= this.l + 1 || r.x1 >= this.r - 1)) r.bouncy = true; return; }   // Tokyo: a plank off a wall is a shop's awning, and an awning always bounces (its kit)
    if (this.rc || !(w.bouncy || w.magnet)) return;
    for (const r of this.rects.slice(from)) {
      if (r.move || r.crumble || r.spring || r.slick || r.cap) continue;
      if (w.bouncy && r.plank && this.flavRng() < w.bouncy) r.bouncy = true;
      else if (w.magnet && !r.plank && r.y1 - r.y0 <= this.tile + 1 && this.flavRng() < w.magnet) r.magnet = true;
    }
  }
  // A rune due (RUNE) in the chunk just laid (from y0 up to y1): by a side wall, where no ledge, spike or door stands in front of it.
  addRune(y0, y1) {
    const R = this.R, ok = [];
    for (let y = y0 + 1.5 * R; y < y1 - 1.5 * R; y += 0.5 * R) for (const x of [this.l + 1.2 * R, this.r - 1.2 * R]) {
      const near = (q, d) => q.x1 > x - d && q.x0 < x + d && q.y1 > y - d && q.y0 < y + d;
      if (!this.rects.some((q) => near(q, 1.1 * R)) && !this.spikes.some((q) => near(q, 1.5 * R)) && !this.bubbles.some((q) => near(q, 1.5 * R))) ok.push([x, y]);
    }
    if (!ok.length) return;   // the next chunk, then
    const [x, y] = ok[(this.runeRng() * ok.length) | 0];
    this.runes.push({ x, y, ch: this.runeAt.shift().ch });
  }
  // Folk for the chunk just laid (its rects from `from` on, its top at `top`): a cage or a trader when its height has come,
  // on a steady bare ledge with room over it and no enemy on it; maybe a critter. All by folkRng.
  addFolk(from, top) {
    if (this.world.bonus) return;
    const fr = this.folkRng, R = this.R, t = this.tile, rs = this.rects.slice(from);
    const steady = (r) => !r.plank && !r.crumble && !r.move && !r.spring && !r.cap && !r.slick;
    const over = (r, h) => !this.rects.some((q) => q !== r && q.x1 > r.x0 && q.x0 < r.x1 && q.y1 <= r.y0 + 1 && q.y1 > r.y0 - h);   // nothing within h over it
    const bare = (r) => !this.spikes.some((s) => s.x1 > r.x0 && s.x0 < r.x1 && Math.abs(s.y1 - r.y0) < 1) && !this.spawns.some((s) => s.ledge === r || Math.abs(s.y - r.y0) < 2 * R && s.x > r.x0 && s.x < r.x1)
      && !this.fizz.some((p) => p.x > r.x0 - R && p.x < r.x1 + R && Math.abs(p.y - r.y0) < 2 * R) && !this.folk.some((f) => f.rect === r);
    const due = this.folkAt[0];
    if (due && top < due.y) {
      const ok = rs.filter((r) => steady(r) && r.x1 - r.x0 >= 3 * t && bare(r) && over(r, (due.kind === 'trader' ? 4.6 : 3) * R));
      if (ok.length) { const r = ok[(fr() * ok.length) | 0]; this.folk.push({ kind: due.kind, x: r.x0 + (r.x1 - r.x0) * (0.3 + 0.4 * fr()), y: r.y0, rect: r }); this.folkAt.shift(); }
    }
    if (fr() < FOLK.critterP) {
      const bat = fr() < 0.5, under = (r) => !this.rects.some((q) => q !== r && q.x1 > r.x0 && q.x0 < r.x1 && q.y0 >= r.y1 - 1 && q.y0 < r.y1 + 2.5 * R);
      const ok = rs.filter((r) => steady(r) && r.x1 - r.x0 >= 2 * t && (bat ? under(r) : bare(r) && over(r, 1.5 * R)));
      if (ok.length) {
        const r = ok[(fr() * ok.length) | 0], x = r.x0 + (r.x1 - r.x0) * (0.2 + 0.6 * fr());
        this.folk.push(bat ? { kind: 'bat', x, y: r.y1, fly: false, t: 0 } : { kind: 'bug', x, y: r.y0, rect: r, dir: fr() < 0.5 ? -1 : 1, run: false, t: 0 });
      }
    }
  }
  // Whether a solid ledge just laid (from index `from` on) hangs over an older one, or over the
  // floor (where the hero starts), with less than LEVEL.room under it.
  cramped(from) {
    const rs = this.rects, t = this.tile, min = LEVEL.room * this.R;
    for (let i = from; i < rs.length; i++) {
      const b = rs[i];
      if (b.plank || b.spring) continue;   // a plank is jumped through from below
      if (this.floor - b.y1 < min) return true;
      for (let j = 0; j < from; j++) {
        const a = rs[j];
        if (a.cap || a.y0 < b.y1 || a.y0 - b.y1 >= min) continue;
        if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) >= t) return true;
      }
    }
    return false;
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
    const SOLID = { '#': {}, I: { slick: true }, C: { crumble: true }, X: { crack: true }, T: { stair: true } }, used = new Set(), key = (r, k) => r * 16 + k, from = this.rects.length, spikesFrom = this.spikes.length;
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
      else if (ch === 'Y') this.icicles.push({ x: X(k) + t / 2, y: Y(r + 1), state: 'hang', t: 0 });
      else if (ch === 'A') this.arenas.push({ x: X(k) + t / 2, y: Y(r) - t / 2, on: false, done: false, wave: 0, foes: [] });
      else if (ch === 'B') {   // a door into the wall, standing on the ledge under it: square to the ledge and the wall
        const side = k === 0 ? 1 : 2, w = DOOR.w * R, y1 = Y(r), x0 = side === 1 ? l - LEVEL.wall : this.r - w, x1 = side === 1 ? l + w : this.r + LEVEL.wall;
        this.bubbles.push({ x0, x1, y0: y1 - DOOR.h * R, y1, x: (x0 + x1) / 2, y: y1 - DOOR.h * R / 2, kind: this.pocketKind, side, cd: 0, room: null });
      }
    }
    for (let r = 0; r < H; r++) for (let k = 0; k < COLS; k++) if (at(r, k) === '~') {   // moss under a block: that block's underside holds
      const x = X(k) + t / 2, y = Y(r + 1);
      for (let i = from; i < this.rects.length; i++) { const q = this.rects[i]; if (!q.plank && Math.abs(q.y1 - y) < 1 && x > q.x0 && x < q.x1) q.moss = true; }
    }
    // Some plain one-tile ledges are laid as planks to jump up through (not one with spikes on or
    // under it, or a spring on it; none in a pocket, by its door; none in a stash in the wall, a set piece, a gate or the last rest).
    for (let i = from; i < this.rects.length && c !== CHUNKS.pocket && c !== CHUNKS.vault && c !== CHUNKS.rest && c.kind !== 'set' && c.kind !== 'gate'; i++) {
      const r = this.rects[i], over = (a) => a.x1 > r.x0 && a.x0 < r.x1;
      if (r.plank || r.spring || r.slick || r.crumble || r.crack || r.moss || r.stair || r.y1 - r.y0 > t + 1 || r.x1 - r.x0 < 2 * t - 1) continue;
      if (this.spikes.slice(spikesFrom).some((q) => over(q) && (Math.abs(q.y1 - r.y0) < 1 || Math.abs(q.y0 - r.y1) < 1))) continue;
      if (this.rects.slice(from).some((q) => q.spring && over(q) && Math.abs(q.y1 - r.y0) < 1) || !(this.rng() < LEVEL.toPlank)) continue;
      r.plank = true; r.y1 = r.y0 + LEVEL.plank * R;
    }
    // A ledge that stops short of a wall by less than the hero is wide leaves a slot nothing fits
    // through: widen it to `pass` by cutting the ledge back, or close it if the ledge is short; spikes
    // on the ledge go with it.
    const pass = 2.3 * R;
    for (let i = from; i < this.rects.length; i++) {
      const r = this.rects[i];
      if (r.plank || r.spring) continue;
      const x0 = r.x0, x1 = r.x1;
      for (const side of [1, 2]) {
        const gap = side === 1 ? r.x0 - l : this.r - r.x1;
        if (gap <= 1 || gap >= pass) continue;
        const cut = pass - gap, keep = r.x1 - r.x0 - cut >= 1.5 * R;
        if (side === 1) r.x0 = keep ? r.x0 + cut : l; else r.x1 = keep ? r.x1 - cut : this.r;
      }
      if (r.x0 === x0 && r.x1 === x1) continue;
      for (let j = this.spikes.length - 1; j >= spikesFrom; j--) {
        const q = this.spikes[j];
        if (q.dir > 1 || q.x1 <= x0 || q.x0 >= x1 || (q.dir === 0 ? Math.abs(q.y1 - r.y0) : Math.abs(q.y0 - r.y1)) > 1) continue;
        q.x0 = Math.max(q.x0, r.x0); q.x1 = Math.min(q.x1, r.x1);
        if (q.x1 - q.x0 < 0.5 * R) this.spikes.splice(j, 1);
      }
    }
    // the walls: runs down the first or last column of spikes ('>' left, '<' right) or a coat of ice, moss or rubber
    const wall = (ch, k, add) => { for (let r = 0; r < H; r++) if (at(r, k) === ch && at(r - 1, k) !== ch) { let r1 = r; while (at(r1 + 1, k) === ch) r1++; add(Y(r1 + 1), Y(r)); } };
    wall('>', 0, (y0, y1) => this.spikes.push({ x0: l, x1: l + d, y0, y1, dir: 2 }));
    wall('<', COLS - 1, (y0, y1) => this.spikes.push({ x0: this.r - d, x1: this.r, y0, y1, dir: 3 }));
    for (const [ch, k, side, kind] of [['[', 0, 1, 'ice'], [']', COLS - 1, 2, 'ice'], ['{', 0, 1, 'moss'], ['}', COLS - 1, 2, 'moss'], ['(', 0, 1, 'rubber'], [')', COLS - 1, 2, 'rubber']])
      wall(ch, k, (y0, y1) => this.coats.push({ side, y0, y1, kind }));
    const wd = this.world;
    if (wd.coat) for (const side of [1, 2]) this.coats.push({ side, y0: base - H * t, y1: base, kind: wd.coat });   // a bonus well's walls, lined
    if (wd.rain) for (let r = 1; r < H; r += 2) {   // and a rain of coins in the open
      const k = 1 + ((this.rng() * (COLS - 2)) | 0);
      if (at(r, k) === '.' && at(r - 1, k) === '.') this.coin(X(k) + t / 2, Y(r) - t / 2, this.rng() < 0.12 ? 5 : 1);
    }
    if (c !== CHUNKS.pocket) this.populate(this.rects.slice(from), base - H * t, base);   // a bubble's ledge is safe to stop at
  }
  // Enemies for a chunk just laid, on what it is made of: a crawler along a clear ledge, a
  // climber up and down the longest stretch of bare wall, a circler round a free block.
  // None in the first few tiles over the floor; later levels now and then get two.
  populate(rects, top, bottom) {
    const wd = this.world, rnd = this.rng, t = this.tile;
    const rc = this.rc, odds = rc ? rc.foes : wd.foes * (1 + 0.15 * this.stage);   // a recipe's own odds of one, and of two
    if (!wd.enemies || (this.foeTypes && !this.foeTypes.length) || bottom > this.floor - 6 * t || !(rnd() < odds * this.k)) return;
    const n = wd.pack || (rnd() < (rc ? rc.pair || 0 : 0.25 * this.stage) ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const type = pick(rnd, this.foeTypes ? Object.fromEntries(this.foeTypes.filter((k) => wd.enemies[k]).map((k) => [k, wd.enemies[k]])) : wd.enemies), eR = this.R * ENEMY[type].size, any = (list) => list[(rnd() * list.length) | 0];
      const taken = (r) => this.spawns.some((q) => q.ledge === r || q.rect === r);   // one enemy to a ledge or block
      if (ENEMY[type].move === 'crawl' || ENEMY[type].move === 'flow') {   // (a worm sits on a ledge too)
        const ok = rects.filter((r) => !r.crumble && !r.spring && !r.move && r.x1 - r.x0 >= 3 * t && !taken(r) &&
          !this.spikes.some((q) => q.dir === 0 && Math.abs(q.y1 - r.y0) < 1 && q.x1 > r.x0 && q.x0 < r.x1));
        if (ok.length) { const r = any(ok); this.spawns.push({ type, x: (r.x0 + r.x1) / 2, y: r.y0 - 1.2 * eR, ledge: r }); }
      } else if (ENEMY[type].move === 'round') {
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
        if (r.crumbling && (r.t += dt) > (this.crumbleTime || CRUMBLE.time)) { r.gone = true; r.t = 0; crumbleFx(r, this.theme.crumble); }
      } else if (r.crumble || r.broke) {   // back again once the hero is out of its way: a crumbled block in a while, a smashed one sooner, or at once under a hero coming down onto it
        const h = g.hero, over = r.broke && !r.spikes && r.t > SMASH.soon && h.maxY < r.y0 && h.rigVy > 0;
        const free = (q) => q.maxX < r.x0 || q.minX > r.x1 || q.maxY < r.y0 || q.minY > r.y1;   // a smashed one round an enemy neither
        const bare = !r.spikes || r.spikes.every((s) => h.maxX < s.x0 || h.minX > s.x1 || h.maxY < s.y0 - this.R || h.minY > s.y1 + this.R);   // nor its spikes into the hero
        if (((r.t += dt) > (r.broke ? SMASH.back : this.crumbleBack || CRUMBLE.back) || over) && free(h) && bare && (!r.broke || this.enemies.every((e) => free(e.body)))) {
          r.gone = r.crumbling = r.broke = false; r.t = 0; r.flash = 0.12;
          if (r.spikes) { this.spikes.push(...r.spikes); r.spikes = null; }
        }
      }
      if (r.flash > 0) r.flash -= dt;
      if (r.spring && r.t > 0) r.t = Math.max(0, r.t - dt);
    }
    const f = this.fire;
    if (f && g.state === 'play' && !(f.calm > 0 && (f.calm -= dt) > 0)) {   // faster while the hero gains no height (not in a calm start)
      const k = f.calm === 0 ? 1 + (FIRE.boost - 1) * clamp((g.idleT - FIRE.idle) / FIRE.ramp, 0, 1) : 1;
      f.y = Math.min(f.y - f.v * k * g.mods.fire * dt, this.cam + view.h * (1 + FIRE.lag));
    }
    for (const b of this.bubbles) if (b.cd > 0) b.cd -= dt;
  }
}

// The hero is gooier than Gum's other bodies: after each substep its wobble (all but the rigid move and spin) dies
// away a further `wobble`/s, so a landing, a wall or a knock squashes it without springing it back off (a 10 R drop
// came back up at 258 px/s and hopped four times; now about 125 and once). The rigid move is untouched: jumps and runs
// are as they were.
const GOO = { wobble: 40 };
const gumFinish = Body.prototype.finishSubstep;
Body.prototype.finishSubstep = function (h) {
  gumFinish.call(this, h);
  if (!this.isHero) return;
  const n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy, k = Math.exp(-GOO.wobble * h), mx = this.rigVx, my = this.rigVy, w = this.omega;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; }
  cx /= n; cy /= n;
  for (let i = 0; i < n; i++) { const ux = mx - w * (y[i] - cy), uy = my + w * (x[i] - cx); vx[i] = ux + (vx[i] - ux) * k; vy[i] = uy + (vy[i] - uy) * k; }
};

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
      else if (r.stair && this.stepMaxY > r.y0 + 1 && this.stepMaxY < r.y1 + 0.5 * this.R && py[i] < y1 - 2) face = 8;   // a stair step lifts what walks into its riser onto its tread (a step-up), but only a body whose feet are at the riser: one under it is stopped
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
        if ((r.spring || r.bouncy) && hero) this.springHit = r;
      } else if (face === 4) { const v = (py[i] - y[i]) / h; if (v > hitW[2]) hitW[2] = v; y[i] = y1; x[i] -= (x[i] - px[i]) * rf; mask |= 4; if (canTop && st && (CEIL.any || r.moss)) stick(i, 4, y1, x0, x1, r); }
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
    bits.push({ x: x + Math.cos(a) * R * 0.5, y: y + Math.sin(a) * R * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 250, s: rand(1.5, 4.5), c: ink, t: 0, life: rand(0.8, 1.6), g: 0.9, drag: 2.2 });
  }
  fx.add(x, y, 0, 0, R * 1.3, 0.4, INK.white, 0.9, 2); fx.add(x, y, 0, 0, R * 0.8, 0.35, c, 1, 2, 0.08);
}
// A spray of the same solid bits: `n` of them from (x, y) at angles `a`±`spread` (rad, 0 to the right,
// y down), `sp` px/s (from, to), `size` game px (from, to), `life` s (from, to), in `inks`, pulled down at
// `g` of a blob's fall. The juice of a jump, a coin, a stomp.
function sparkFx(x, y, n, a, spread, sp, size, life, inks, g) {
  if (bits.length > 400) return;   // a phone's budget
  for (let i = 0; i < n; i++) {
    const t = a + rand(-spread, spread), v = rand(sp[0], sp[1]);
    bits.push({ x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v, s: rand(size[0], size[1]), c: inks[i % inks.length], t: 0, life: rand(life[0], life[1]), g, drag: 4 });
  }
}
function updateBits(dt) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i], d = Math.exp(-b.drag * dt);
    b.vx *= d; b.vy = b.vy * d + SHOT_G * b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if ((b.t += dt) > b.life) bits.splice(i, 1);
  }
}
// An enemy bursting like a ripe fruit (user: juicier, flying apart under the pressure): pieces of its skin and paler flesh
// thrown in arcs, a few seeds, and a spray of juice drops falling after, over a white pop; `c` its ink.
function juiceFx(x, y, R, c) {
  if (bits.length > 380) return;   // a phone's budget
  const flesh = c === PAL.red ? INK.flame : PAL.white;
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + rand(-1.4, 1.4), v = rand(260, 620); bits.push({ x: x + Math.cos(a) * 0.4 * R, y: y + Math.sin(a) * 0.3 * R, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, s: rand(3.5, 6), c: i % 3 ? c : flesh, t: 0, life: rand(0.7, 1.1), g: 1, drag: 1.2 }); }
  for (let i = 0; i < 5; i++) { const a = rand(0, TAU), v = rand(150, 380); bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, s: 1.5, c: PAL.black, t: 0, life: rand(0.5, 0.9), g: 1, drag: 1.5 }); }
  for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + rand(-1.7, 1.7), v = rand(200, 700); bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150, s: rand(1.5, 2.8), c: i % 4 ? c : PAL.white, t: 0, life: rand(0.45, 0.9), g: 1.2, drag: 2.2 }); }
  fx.add(x, y, 0, 0, R * 1.5, 0.22, PAL.white, 0.9, 2); fx.ring(x, y, 1.8 * R, c);
}
function splatFx(x, y, R, c, n = 9) {
  const k = lighten(c, 0.1);
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(160, 380); fx.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, rand(0.18, 0.32) * R, rand(0.35, 0.6), k, 0.95, 0); }
  fx.add(x, y, 0, 0, R * 0.9, 0.35, lighten(c, 0.3), 0.7, 2);
}
function crumbleFx(r, c, up) {   // a block breaking up: puffs and solid chunks of it in its ink and white, dropping away (flung up when smashed from below)
  const y = (r.y0 + r.y1) / 2;
  for (let x = r.x0 + 6; x < r.x1; x += 12) {
    fx.add(x, y, rand(-40, 40), rand(30, 120), rand(4, 8), rand(0.4, 0.7), c, 0.9, 0);
    sparkFx(x, y, up ? 3 : 2, up ? -Math.PI / 2 : Math.PI / 2, up ? 1.3 : 0.8, up ? [150, 560] : [20, 140], [1.5, 4], [0.5, 1], [c, c, INK.white], 1);
  }
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
uniform vec3 uTop, uBot, uDots, uWall, uWallD, uLip; uniform float uGrad, uH, uWin;
void main() {
  ivec2 g = cell();
  float wx = (float(g.x) + 0.5) * uPix;   // CSS px in the world
  vec3 c = uTop;
  float t = (uH - gl_FragCoord.y) / uH;   // 0 at the top of the screen, 1 at its foot
  if (uGrad > 0.5 && t * t > bayer(g)) c = uBot;   // a theme's fall from its top ink to its bottom one, through the 4x4 dither (the Crypt's)
  int s = uPix < 1.5 ? 2 : 1, py = g.y + int(floor(uShake.y / uPix * 0.5));   // half the climb; the grid is laid in 2-CSS-px cells, a dot one game pixel
  ivec2 q = ivec2(floor(vec2(float(g.x), float(py)) / float(s)));
  if (uWin > 2.5 && uWin < 3.5) {   // banks of cloud far off (the Skyscraper's): a smooth field, its edges dithered
    vec2 wp = vec2(float(g.x), float(py)) * vec2(0.008, 0.03);
    float n = sin(wp.x * 3.1 + sin(wp.y * 1.7) * 2.0) * 0.5 + sin(wp.y * 2.3 + wp.x * 0.7) * 0.5;
    if (n > 0.62 + 0.3 * bayer(g)) c = uDots;   // sparse, so the climb reads over them
  } else if (uWin > 1.5 && uWin < 2.5) {   // panel blocks far off (the Tower Blocks'): a regular grid of windows, a few lit, the floors' seams dotted between
    vec2 wp = vec2(float(g.x), float(py)), cw = floor(wp / vec2(8.0, 10.0)), iw = wp - cw * vec2(8.0, 10.0);
    float h = fract(sin(dot(cw, vec2(12.9898, 78.233))) * 43758.5453);
    if (iw.x >= 2.0 && iw.x < 6.0 && iw.y >= 3.0 && iw.y < 7.0 && h < 0.16) c = uDots;
    else if (iw.y < 1.0 && mod(cw.y, 2.0) < 1.0 && mod(wp.x, 3.0) < 1.0) c = uDots;
  } else if (uWin > 0.5) {   // a town far off (Tokyo's, the Junkyard's; uWin 1 or 4): windows lit here and there in rows, its buildings in columns with dark gaps between
    vec2 wp = vec2(float(g.x), float(py)), cw = floor(wp / vec2(6.0, 8.0)), iw = wp - cw * vec2(6.0, 8.0);
    float bx = wp.x - 36.0 * floor(wp.x / 36.0), h = fract(sin(dot(cw, vec2(12.9898, 78.233))) * 43758.5453);
    if (bx < 30.0 && iw.x >= 2.0 && iw.x < 4.0 && iw.y >= 3.0 && iw.y < 6.0 && h < 0.2) c = uDots;
  } else if ((q.y & 7) == 3 && ((q.x + ((q.y >> 3) & 1) * 8) & 15) == 3 && (g.x & (s - 1)) == 0 && (py & (s - 1)) == 0) c = uDots;
  float d = min(wx - uWalls.x, uWalls.y - wx);   // > 0 inside the well
  if (d < 0.0) {
    c = ((g.x + g.y) & 3) == 0 ? uWallD : uWall;
    if (uWin > 3.5) { float by = mod(float(py), 6.0), bx = mod(float(g.x) + (mod(floor(float(py) / 6.0), 2.0) < 1.0 ? 0.0 : 5.0), 10.0); if (by < 1.0 || bx < 1.0) c = uWallD; }   // brick: mortar courses, joints in bond
    else if (uWin > 1.5 && mod(float(py), uWin > 2.5 ? 16.0 : 24.0) < 1.0) c = uWallD;   // a panel wall's seams, a glass wall's transoms
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
// Faces in a little more detail than Gum's: eyes and mouths bigger (room for it in pixels), enemies with brows drawn in
// over their eyes (sloping down to the middle) and two fangs under their frown, the hero with a second,
// small glint low in each eye and a tongue in its smile.
for (const d of DESIGNS) { d.face.eyeR = d.face.eyeR.map((v) => v * 1.45); d.face.mouthW *= 1.3; }
const gumWriteFace = Renderer.prototype.writeFace;
Renderer.prototype.writeFace = function (b, X, Y, cx, cy) {
  const s = b.s, f = s.face, fc = b.face, ink = THEME.ink, P0 = this.p0, P1 = this.p1, P2 = this.p2;
  const frame = (ux, uy, ax, ay, bx, by) => { mapPoint(s, X, Y, cx, cy, ux, uy, P0); mapPoint(s, X, Y, cx, cy, ux + ax, uy + ay, P1); mapPoint(s, X, Y, cx, cy, ux + bx, uy + by, P2); };
  const put = (r, g, bl, type, p1, p2, p3) => this.feat(P0.x, P0.y, P1.x - P0.x, P1.y - P0.y, P2.x - P0.x, P2.y - P0.y, r, g, bl, 1, type, p1 || 0, p2 || 0, p3 || 0);
  const dot = (ux, uy, ax, ay, c) => { frame(ux, uy, ax, 0, 0, ay); put(c[0], c[1], c[2], 0); };   // an upright oval in one ink
  // The hero's helmet while the smash is on (b.helmet, see HELMET; user: in place of its pips). An astro one goes under the face, which
  // shows in its window: a white dome, grey on its right, the window's black rim, and in it the hero's own colour.
  if (b.helmet === 'astro') { dot(0.1, 0.05, 1.03, 1.02, PAL.gray); dot(-0.05, -0.04, 0.96, 0.97, PAL.white); dot(0.93, 0.1, 0.12, 0.22, PAL.gray); dot(0, 0.13, 0.68, 0.49, ink); dot(0, 0.13, 0.56, 0.38, b.color.base); }
  gumWriteFace.call(this, b, X, Y, cx, cy);
  const closed = fc.squint > 0.45, lx = fc.lx * 0.05, ly = fc.ly * 0.035, [ex, ey] = f.eye, [rx, ry] = f.eyeR, m = f.mouthW;
  if (fc.frown) {
    for (let side = -1; side <= 1; side += 2) {
      const k = -0.5 * side, w = rx * 1.45, h = ry * 0.5;
      frame(ex * side + lx - rx * 0.15 * side, ey + ly - ry * 1.9, w, w * k, -h * k, h);
      put(ink[0], ink[1], ink[2], 0);
    }
    if (!closed && fc.surprise <= 0.35) {   // tips down (the spikes' tips point to −B)
      frame(f.mouth[0], f.mouth[1] + m * 0.3, m * 0.8, 0, 0, -m * 0.6);
      const la = Math.hypot(P1.x - P0.x, P1.y - P0.y), lb = Math.hypot(P2.x - P0.x, P2.y - P0.y);
      put(1, 1, 1, 6, la, lb, la);
    }
  } else if (!closed) {
    if (fc.open > 0.6) for (let side = -1; side <= 1; side += 2) { frame(ex * side + lx + rx * 0.4, ey + ly + ry * 0.45, rx * 0.28, 0, 0, ry * 0.26); put(1, 1, 1, 0); }
    if (fc.surprise <= 0.35) { frame(f.mouth[0], f.mouth[1] + m * 0.42, m * 0.5, 0, 0, m * 0.36); put(THEME.blush[0], THEME.blush[1], THEME.blush[2], 0); }
  }
  if (b.helmet === 'moto') {   // a moto one over the face: a shell over the brow, red (white on a red hero), a stripe down its crown of
    // the other with a grey side, goggles across the eyes with blue lenses that look where the eyes look, a glint; the mouth shows under it
    const shell = b.color.base === PAL.red ? PAL.white : PAL.red, stripe = shell === PAL.red ? PAL.white : PAL.red;
    for (let side = -1; side <= 1; side += 2) dot(0.8 * side, 0.2, 0.22, 0.34, shell);   // its sides down by the cheeks
    dot(0, -0.42, 1.06, 0.57, shell); dot(0.05, -0.56, 0.14, 0.42, PAL.gray); dot(-0.03, -0.57, 0.09, 0.41, stripe);
    dot(lx * 1.6, ey + ly, 0.8, 0.14, ink);
    for (let side = -1; side <= 1; side += 2) dot(ex * side + lx, ey + ly, rx * 0.95, ry * 0.5, PAL.blue);
    dot(-0.52, -0.6, 0.13, 0.07, PAL.white);
  } else if (b.helmet === 'astro') { dot(-0.42, 0.02, 0.05, 0.13, PAL.blue); dot(0, 0.8, 0.56, 0.07, PAL.blue); dot(0, 0.9, 0.44, 0.06, PAL.orange); }   // a glint in its window, its neck ring
};
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
  const icon = (id, x, y, a, k, ink) => {   // an ICONS picture centred on (x, y), a dot k game pixels across, a box per run of one ink (all in `ink`, if given)
    const rows = ICONS[id], s = PIX.size * k, x0 = Math.round(x / PIX.size) * PIX.size - rows[0].length * s / 2, y0 = Math.round(y / PIX.size) * PIX.size - rows.length * s / 2;
    rows.forEach((row, j) => { for (let i = 0; i < row.length;) { const c = row[i]; let e = i + 1; while (row[e] === c) e++; if (c !== '.') box(x0 + i * s, y0 + j * s, x0 + e * s, y0 + (j + 1) * s, ink || PAL[ICON_INK[c]], a, 0, 10, 0); i = e; } });
  };
  const iconSpin = (id, x, y, a, k, th) => {   // an ICONS picture turning about its upright axis (user: bonuses in pixel 3D): its columns drawn in by the
    // cosine (past a quarter turn its back, mirrored), and the thickness of its edge in grey beside it as it turns
    const rows = ICONS[id], P = PIX.size, s = P * k, w = rows[0].length, c = Math.cos(th), sn = Math.sin(th), x0 = Math.round(x / P) * P, y0 = Math.round(y / P) * P - (rows.length * s) / 2;
    const col = (i) => Math.round(((i - w / 2) * s * c) / P) * P;
    rows.forEach((row, j) => { for (let i = 0; i < w;) { const q = row[i]; let e = i + 1; while (row[e] === q) e++; if (q !== '.') { const u = x0 + col(i), v = x0 + col(e); if (u !== v) box(Math.min(u, v), y0 + j * s, Math.max(u, v), y0 + (j + 1) * s, PAL[ICON_INK[q]], a, 0, 10, 0); } i = e; } });
    const rim = Math.round((Math.abs(sn) * 2 * k)) * P, ex = x0 + Math.sign(sn) * Math.round(((w / 2) * s * Math.abs(c)) / P) * P;
    if (rim > 0) box(Math.min(ex, ex + Math.sign(sn) * rim), y0 + 0.2 * rows.length * s, Math.max(ex, ex + Math.sign(sn) * rim), y0 + 0.8 * rows.length * s, PAL.gray, a, 0, 10, 0);
  };
  const seen = (y0, y1) => y1 > top && y0 < bot;
  // A door: a dark opening square on the ledge (and in the wall), framed but on the wall's side, with what is
  // inside. A shop's (gold) and a stash's (violet) are magic: a breathing glow round them, white studs and a gem
  // on the frame, lights turning in the dark of the opening, sparks rising up past it.
  const door = (d, kind) => {
    const magic = kind !== 'exit', c = !magic ? th.lip : kind === 'shop' ? INK.coin : PAL.purple, P = PIX.size, f = (magic ? 3 : 2) * P, glow = magic ? c : th.wall;
    const x = (d.x0 + d.x1) / 2, y = (d.y0 + d.y1) / 2, r = (d.x1 - d.x0) / 2, hh = (d.y1 - d.y0) / 2;
    F(x, y, r * 2.1, 0, 0, hh * 1.8, glow, 0.5 + 0.14 * Math.sin(T * 2.6 + x), 1); F(x, d.y0 + r, r * 1.6, 0, 0, r * 1.6, glow, 0.45 + 0.2 * Math.sin(T * 3.1 + x), 1);   // a glow breathing round it, brightest round the arch
    if (magic) F(x, y, r * 1.4, 0, 0, hh * 1.25, INK.white, 0.22, 1);
    const ay = d.y0 + r;   // every door is an arch (user; a room's way out too): a half disc over a box, its rim in its colour
    F(x, ay, r + f, 0, 0, r + f, c, 1, 0); box(d.x0 - f, ay, d.x1 + f, d.y1, c, 1, 0, 10, 0); F(x, ay, r, 0, 0, r, INK.dark, 1, 0); box(d.x0, ay, d.x1, d.y1, INK.dark, 1, 0, 10, 0);
    if (magic) for (let k = 0; k < 8; k++) {   // a ring of lights turning inside, breathing in and out
      const a = T * 1.5 + (k * TAU) / 8, q = 0.62 + 0.14 * Math.sin(T * 2.2 + k * 1.3);
      box(x + Math.cos(a) * r * q - P, y + Math.sin(a) * hh * q * 0.85 - P, x + Math.cos(a) * r * q + P, y + Math.sin(a) * hh * q * 0.85 + P, k & 1 ? INK.white : c, 0.9, 0, 10, 0);
    }
    if (magic) {
      const ga = Math.PI * (1 + ((T * 0.7 + x * 0.01) % 1)), gr = r + f / 2;   // a white glint running round the arch's rim (the glow round it is drawn first, behind)
      for (let k = -1; k <= 1; k++) { const a = ga + k * 0.09; box(x + Math.cos(a) * gr - P, ay + Math.sin(a) * gr - P, x + Math.cos(a) * gr + P, ay + Math.sin(a) * gr + P, INK.white, 1, 0, 10, 0); }
      for (let k = 0; k < 6; k++) {   // sparks rising past it, twinkling as small crosses
        const u = (T * 0.45 + k / 6) % 1, q = ((Math.sin(k * 12.9898 + d.x0) * 43758.5453) % 1 + 1) % 1, sx = d.x0 - r * 0.2 + q * r * 2.4, sy = d.y1 - u * (d.y1 - d.y0 + 2.5 * R);
        const k2 = Math.sin(u * Math.PI), a2 = k2 > 0.25 ? 1 : 0, l = (k2 > 0.7 ? 2 : 1) * P, ink = k & 1 ? INK.white : c;
        if (a2) { box(sx - l, sy - P * 0.5, sx + l, sy + P * 0.5, ink, 1, 0, 10, 0); box(sx - P * 0.5, sy - l, sx + P * 0.5, sy + l, ink, 1, 0, 10, 0); }
      }
    }
    const bob = Math.round(Math.sin(T * 3 + x) * 1.5) * P;
    if (kind === 'shop') { disc(x, y + bob, r * 0.4, INK.coinD, 1); disc(x, y + bob, r * 0.3, INK.coin, 1); disc(x - r * 0.1, y + bob - r * 0.1, r * 0.08, INK.white, 1); }
    else if (kind === 'treasure') for (let k = 0; k < 3; k++) disc(x + (k - 1) * r * 0.42, y + r * 0.3 - (k === 1 ? r * 0.35 : 0) + bob, r * 0.22, INK.coin, 1);
    else F(x, y - r * 0.1 + bob, r * 0.45, 0, 0, r * 0.45, c, 1, 3, 1.1, 0.75, 0.2);   // ^: the way out
  };
  for (const s of lv.coats) {   // in their own colours: ice striped white, rubber ribbed black, moss solid with a fringe of tufts over its edge
    if (!seen(s.y0, s.y1)) continue;
    const x0 = s.side === 1 ? 0 : lv.r, x1 = s.side === 1 ? lv.l : W;
    if (s.kind === 'ice') box(x0, s.y0, x1, s.y1, th.slick, 0.9, 0, 7, 9);
    else if (s.kind === 'rubber') box(x0, s.y0, x1, s.y1, th.rubber, 1, 0, 8, 8);
    else {
      box(x0, s.y0, x1, s.y1, th.moss, 1, 0, 10, 0);
      for (let y = s.y0 + 0.25 * R, k = 0; y < s.y1 - 0.15 * R; y += 0.42 * R, k++) disc(s.side === 1 ? lv.l : lv.r, y, (k & 1 ? 0.17 : 0.27) * R, th.moss, 1);
    }
  }
  if (lv.rail && seen(lv.rail.y - R, lv.rail.y + R)) {   // the Minecart's rail: a white line from wall to wall, ties under it
    box(lv.l, lv.rail.y, lv.r, lv.rail.y + 2.5, th.lip, 1, 0);
    for (let x = lv.l + 0.6 * R; x < lv.r; x += 1.3 * R) box(x - 1.5, lv.rail.y + 2.5, x + 1.5, lv.rail.y + 0.35 * R, th.wall, 1, 0);
  }
  for (const u of lv.runes) if (seen(u.y - R, u.y + R)) {   // a world's runes on the back wall (RUNE): a faint cloth, the rune knitted on it in the world's ink
    const h = 8 * PIX.size; box(u.x - h, u.y - h, u.x + h, u.y + h, th.wall, 0.16, 0, 10, 0); icon('rune' + u.ch, u.x, u.y, 1, 1, th.wall);
  }
  for (const b of lv.bubbles) if (seen(b.y0 - 10, b.y1)) door(b, b.kind);
  if (lv.exit) door(lv.exit, 'exit');
  const pt = lv.portal;
  if (pt && seen(pt.y - 3 * pt.r, pt.y + 3 * pt.r)) {
    const p = 1 + 0.08 * Math.sin(T * 4);
    F(pt.x, pt.y, pt.r * 2.2 * p, 0, 0, pt.r * 2.2 * p, INK.white, 0.3, 1);
    disc(pt.x, pt.y, pt.r, INK.dark, 1);   // a hole: the hero shows going into it
    F(pt.x, pt.y, pt.r * 1.12, 0, 0, pt.r * 1.12, th.lip, 1, 4);
    for (let k = 0; k < 3; k++) { const a = T * 2.2 + (k * TAU) / 3; disc(pt.x + Math.cos(a) * pt.r * 1.5, pt.y + Math.sin(a) * pt.r * 1.5, pt.r * 0.13, th.lip, 0.9); }
  }
  const kitT = lv.tile, kitP = PIX.size, snap = (v) => Math.round(v / kitP) * kitP;
  if (th.town && lv.kind === 'well') {   // Tokyo's kit (THEMES.tokyo; see the parts catalog): whatever hangs, hangs on something. A utility pole up
    // each wall carries the wires on a crossarm every `arm`; air conditioners sit on brackets on the walls; signs hang on two arms off
    // a wall; vending machines stand in a niche at a ledge's wall end. All on a fixed beat by height, not at random, so nothing is kept.
    const t = kitT, P = kitP, arm = 9 * t, mod = (k, n) => ((k % n) + n) % n;
    for (let k = Math.floor(top / arm) - 1; k * arm < bot + arm; k++) for (let w = 0; w < 2; w++) {   // the wires, from crossarm to crossarm, sagging
      const y0 = k * arm + 0.08 * t, x0 = lv.l + (0.5 + 0.4 * w) * t, x1 = lv.r - (0.5 + 0.4 * w) * t, sag = (0.8 + 0.35 * w) * t, st = 3 * P;
      if (y0 + sag < top || y0 > bot) continue;
      for (let x = x0; x < x1; x += st) { const u = (x + st / 2 - x0) / (x1 - x0), y = snap(y0 + sag * 4 * u * (1 - u)); box(x, y, Math.min(x + st, x1), y + P, PAL.gray, 1, 0, 10, 0); }
    }
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), span = (d0, d1) => [Math.min(at(d0), at(d1)), Math.max(at(d0), at(d1))];
      const [p0, p1] = span(0.28 * t, 0.46 * t);
      box(p0, top, p1, bot, PAL.gray, 0.6, 0, 10, 0);   // the pole, a step back (see-through: it is no wall)
      for (let k = Math.floor(top / arm) - 1; k * arm < bot; k++) {
        const y = k * arm, [a0, a1] = span(0.1 * t, 1.05 * t);
        box(a0, y, a1, y + 0.16 * t, PAL.gray, 1, 0, 10, 0);   // its crossarm, white insulators on it
        for (const d of [0.5, 0.9]) { const x = at(d * t); box(x - P, y - 2 * P, x + P, y, PAL.white, 1, 0, 10, 0); }
        if (mod(k, 3) === (side < 0 ? 0 : 1)) { const [c0, c1] = span(0.05 * t, 0.7 * t); box(c0, y + 0.5 * t, c1, y + 1.5 * t, PAL.gray, 1, 0, 10, 0); box(c0, y + 0.9 * t, c1, y + 0.9 * t + P, PAL.black, 1, 0, 10, 0); }   // a transformer can
      }
      for (let k = Math.floor(top / (12 * t)) - 1; k * 12 * t < bot; k++) {   // an air conditioner on its bracket every 12 tiles, the two walls out of step
        const y = k * 12 * t + (side < 0 ? 2.5 : 8.5) * t, w = 1.15 * t, h = 0.8 * t, x0 = side < 0 ? lv.l : lv.r - w, fx = x0 + w * (side < 0 ? 0.6 : 0.4);
        if (y + h + 0.4 * t < top || y > bot) continue;
        box(x0, y, x0 + w, y + h, PAL.gray, 0.85, 0, 10, 0); disc(fx, y + h / 2, 0.28 * t, PAL.black, 1); disc(fx, y + h / 2, 0.07 * t, PAL.gray, 1);
        const bx = x0 + (side < 0 ? 0.18 : 0.82) * w; box(bx - P, y + h, bx + P, y + h + 0.35 * t, PAL.gray, 1, 0, 10, 0);
      }
    }
    const SIGNS = [[['ラ', 'ー', 'メ', 'ン'], 'neonBowl'], [['ス', 'シ'], 'neonFish'], [['カ', 'ラ', 'オ', 'ケ'], 'neonMic']], kk = Math.max(1, Math.round((0.9 * R) / (16 * P))), gw = 16 * kk * P;
    for (let k = Math.floor(top / (11 * t)) - 1; k * 11 * t < bot; k++) if (mod(k, 3) !== 2) {   // a neon sign on two arms off a wall, two in every three beats, the walls and the words in turn
      // (the owner's pick, research/variants/tokyo-neon-1.png B): orange tubes, its word and a picture of what is sold, framed on a dark box
      // with grey caps over and under it, in a glow (and dark in the power cut: the dark's lights leave it out)
      const [word, pic] = SIGNS[mod(k - Math.floor(k / 3), 3)], left = mod(k, 2) === 0, sw = gw + 6 * P, x0 = left ? lv.l + 0.7 * t : lv.r - 0.7 * t - sw, cx = x0 + sw / 2;
      const y0 = k * 11 * t + 3.5 * t, y1 = y0 + (word.length + 0.9) * gw + 6 * P;
      if (y1 + 0.3 * t < top || y0 - 0.4 * t > bot) continue;
      F(cx, (y0 + y1) / 2, 1.15 * sw, 0, 0, 0.7 * (y1 - y0), PAL.orange, 1, 1);
      for (const y of [y0 + 0.3 * t, y1 - 0.5 * t]) { box(left ? lv.l : x0 + sw, y, left ? x0 : lv.r, y + 0.12 * t, PAL.gray, 1, 0, 10, 0); box(left ? lv.l : lv.r - 0.2 * t, y - 0.06 * t, left ? lv.l + 0.2 * t : lv.r, y + 0.18 * t, PAL.gray, 1, 0, 10, 0); }   // the arms, bolted on
      box(x0 - P, y0 - 0.14 * t, x0 + sw + P, y0, PAL.gray, 1, 0, 10, 0); box(x0 + 2 * P, y0 - 0.28 * t, x0 + sw - 2 * P, y0 - 0.14 * t, PAL.gray, 1, 0, 10, 0); box(x0 + 2 * P, y1, x0 + sw - 2 * P, y1 + 0.12 * t, PAL.gray, 1, 0, 10, 0);
      box(x0, y0, x0 + sw, y1, PAL.black, 1, 0, 10, 0);
      for (const [a0, b0, a1, b1] of [[x0 + P, y0 + P, x0 + sw - P, y0 + 2 * P], [x0 + P, y1 - 2 * P, x0 + sw - P, y1 - P], [x0 + P, y0 + P, x0 + 2 * P, y1 - P], [x0 + sw - 2 * P, y0 + P, x0 + sw - P, y1 - P]]) box(a0, b0, a1, b1, PAL.orange, 1, 0, 10, 0);   // the frame's tube
      word.forEach((ch, j) => icon('kana_' + ch, cx, y0 + 3 * P + (j + 0.5) * gw, 1, kk, PAL.orange));
      icon(pic, cx, y1 - 3 * P - 0.45 * gw, 1, kk, PAL.orange);
    }
    for (const r of lv.rects) {   // a vending machine in a niche at the wall end of some wide steady ledges: grey, its lit front blue with rows of cans
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || !(wl || wr) || r.x1 - r.x0 < 3 * t || !seen(r.y0 - 3 * t, r.y0) || mod(Math.round(r.y0 / t), 3)) continue;
      const w = 1.4 * t, h = 2.2 * t, x0 = wl ? lv.l + 0.2 * t : lv.r - 0.2 * t - w, y0 = r.y0 - h;
      box(x0 - 0.15 * t, y0 - 0.2 * t, x0 + w + 0.15 * t, r.y0, PAL.black, 1, 0, 10, 0);   // the niche
      box(x0, y0, x0 + w, r.y0, PAL.gray, 1, 0, 10, 0); box(x0 + 2 * P, y0 + 2 * P, x0 + w - 2 * P, y0 + 0.6 * h, PAL.blue, 1, 0, 10, 0);
      const cans = [PAL.white, PAL.purple, PAL.white, PAL.gray], cw = (w - 6 * P) / 4;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) box(x0 + 3 * P + i * cw + P, y0 + 4 * P + j * 0.17 * h, x0 + 3 * P + (i + 1) * cw - P, y0 + 4 * P + j * 0.17 * h + 0.09 * h, cans[(i + j) % 4], 1, 0, 10, 0);
      box(x0 + 0.25 * w, r.y0 - 0.2 * h, x0 + 0.75 * w, r.y0 - 0.12 * h, PAL.black, 1, 0, 10, 0);
    }
  }
  const MINE_CAP = 8 * kitT;   // the Mine's timber caps, a beat up its walls (and its lamps, every other cap; see the dark's lights)
  const mineLamp = (side, k) => ((k % 2) + 2) % 2 === (side < 0 ? 0 : 1);
  if (th.pit && lv.kind === 'well') {   // the Mine's kit (THEMES.mine; see the parts catalog): a timber prop up each wall, a cap beam off it every MINE_CAP on
    // a knee brace, a mine lamp hanging off every other cap, sugar crystals in the rock between; ore carts parked at a ledge's wall end.
    const t = kitT, P = kitP, mod = (k, n) => ((k % n) + n) % n;
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), span = (d0, d1) => [Math.min(at(d0), at(d1)), Math.max(at(d0), at(d1))];
      const [p0, p1] = span(0.12 * t, 0.5 * t), mid = snap((p0 + p1) / 2);
      box(p0, top, p1, bot, th.block, 0.75, 0, 10, 0); box(mid, top, mid + P, bot, PAL.black, 0.75, 0, 10, 0);   // the prop, a step back, its grain
      for (let k = Math.floor(top / MINE_CAP) - 1; k * MINE_CAP < bot; k++) {
        const y = k * MINE_CAP, [c0, c1] = span(0, 1.35 * t);
        box(c0, y, c1, y + 0.3 * t, th.block, 1, 0, 10, 0); box(c0, y + 0.3 * t - P, c1, y + 0.3 * t, PAL.black, 1, 0, 10, 0);   // its cap, a dark underside
        for (let i = 0; i <= 6; i++) { const u = i / 6, x = snap(at((0.5 + 0.7 * u) * t)), yy = snap(y + 0.3 * t + 0.8 * t * (1 - u)); box(x - P, yy - P, x + P, yy + P, th.block, 1, 0, 10, 0); }   // the knee brace
        if (mineLamp(side, k)) {   // a lamp off the cap: a hook, a grey cage, white glass, a flame in it
          const lx = snap(at(1.05 * t)), ly = y + 0.3 * t;
          box(lx - P / 2, ly, lx + P / 2, ly + 0.3 * t, PAL.gray, 1, 0, 10, 0);
          box(lx - 0.2 * t, ly + 0.3 * t, lx + 0.2 * t, ly + 0.85 * t, PAL.gray, 1, 0, 10, 0); box(lx - 0.12 * t, ly + 0.38 * t, lx + 0.12 * t, ly + 0.77 * t, PAL.white, 1, 0, 10, 0);
          disc(lx, ly + 0.6 * t, 0.07 * t, INK.flame, 1);
        }
      }
      for (let k = Math.floor(top / (10 * t)) - 1; k * 10 * t < bot; k++) {   // sugar crystals in the wall's rock, three to a cluster
        const y = k * 10 * t + (side < 0 ? 4 : 9) * t;
        if (y < top - t || y > bot + t) continue;
        for (const [dx, dy, sz] of [[0.15, 0, 0.22], [0.4, -0.25, 0.16], [0.35, 0.22, 0.12]]) F(at(dx * t), y + dy * t, sz * t, sz * t, sz * t, -sz * t, mod(k, 2) ? PAL.white : PAL.gray, 1, 0);
      }
    }
    for (const r of lv.rects) {   // an ore cart parked at the wall end of some wide steady ledges: grey, ore heaped in it, two wheels
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || !(wl || wr) || r.x1 - r.x0 < 3 * t || !seen(r.y0 - 2 * t, r.y0) || mod(Math.round(r.y0 / t), 3) !== 1) continue;
      const w = 1.6 * t, x0 = wl ? lv.l + 0.25 * t : lv.r - 0.25 * t - w, y1 = r.y0 - 0.3 * t, y0 = y1 - 0.75 * t;
      for (const [dx, rr, c] of [[0.3, 0.3, th.block], [0.55, 0.36, PAL.white], [0.75, 0.28, th.block]]) disc(x0 + dx * w, y0, rr * t, c, 1);   // the ore
      box(x0, y0, x0 + w, y1, PAL.gray, 1, 0, 10, 0); box(x0, y0, x0 + w, y0 + P, PAL.black, 1, 0, 10, 0);
      for (const dx of [0.25, 0.75]) { disc(x0 + dx * w, r.y0 - 0.2 * t, 0.2 * t, PAL.black, 1); disc(x0 + dx * w, r.y0 - 0.2 * t, 0.07 * t, PAL.gray, 1); }
    }
  }
  if (th.panels && lv.kind === 'well') {   // the Tower Blocks' kit (THEMES.blocks; see the parts catalog): a riser pipe up each wall on a bracket every
    // 4 tiles, satellite dishes on the walls, an entrance (a blue door, its canopy and lamp, a bench) at the wall end of some wide ledges.
    const t = kitT, P = kitP, mod = (k, n) => ((k % n) + n) % n;
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), span = (d0, d1) => [Math.min(at(d0), at(d1)), Math.max(at(d0), at(d1))];
      const [p0, p1] = span(0.2 * t, 0.42 * t);
      box(p0, top, p1, bot, PAL.gray, 0.7, 0, 10, 0);
      for (let k = Math.floor(top / (4 * t)) - 1; k * 4 * t < bot; k++) { const [b0, b1] = span(0, 0.5 * t); box(b0, k * 4 * t, b1, k * 4 * t + 0.12 * t, PAL.gray, 1, 0, 10, 0); }
      for (let k = Math.floor(top / (14 * t)) - 1; k * 14 * t < bot; k++) {   // a satellite dish on its arm
        const y = k * 14 * t + (side < 0 ? 5 : 11) * t, cx = at(0.95 * t);
        if (y < top - t || y > bot + t) continue;
        box(Math.min(cx, at(0.3 * t)), y + 0.28 * t, Math.max(cx, at(0.3 * t)), y + 0.28 * t + P, PAL.gray, 1, 0, 10, 0);
        F(cx, y, 0.42 * t, 0, 0, 0.32 * t, PAL.white, 1, 0); F(cx - side * 0.06 * t, y, 0.3 * t, 0, 0, 0.22 * t, PAL.gray, 1, 0);
      }
    }
    for (const r of lv.rects) {
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || r.stair || !(wl || wr) || r.x1 - r.x0 < 4 * t || !seen(r.y0 - 3 * t, r.y0) || mod(Math.round(r.y0 / t), 3) !== 2) continue;
      const dw = 1.2 * t, dh = 1.9 * t, x0 = wl ? lv.l + 0.6 * t : lv.r - 0.6 * t - dw, bw = 1.3 * t, bx = wl ? x0 + dw + 0.5 * t : x0 - 0.5 * t - bw;
      box(x0, r.y0 - dh, x0 + dw, r.y0, PAL.black, 1, 0, 10, 0); box(x0 + P, r.y0 - dh + P, x0 + dw - P, r.y0, PAL.blue, 1, 0, 10, 0); box(x0 + dw * 0.7, r.y0 - dh * 0.5, x0 + dw * 0.7 + 2 * P, r.y0 - dh * 0.5 + P, PAL.black, 1, 0, 10, 0);   // the door, its handle
      box(x0 - 0.3 * t, r.y0 - dh - 0.25 * t, x0 + dw + 0.3 * t, r.y0 - dh, PAL.gray, 1, 0, 10, 0); disc(x0 + dw / 2, r.y0 - dh - 0.45 * t, 0.12 * t, PAL.white, 1);   // its canopy, its lamp
      box(bx, r.y0 - 0.55 * t, bx + bw, r.y0 - 0.42 * t, PAL.gray, 1, 0, 10, 0); for (const lx of [bx + 0.1 * t, bx + bw - 0.2 * t]) box(lx, r.y0 - 0.42 * t, lx + 0.1 * t, r.y0, PAL.gray, 1, 0, 10, 0);   // the bench
    }
  }
  if (th.junk && lv.kind === 'well') {   // the Junkyard's kit: a fire escape up each wall (a landing every 6 tiles, a ladder slanting up to the next), and
    // a dumpster at the wall end of some wide steady ledges
    const t = kitT, P = kitP, mod = (k, n) => ((k % n) + n) % n;
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), off = side < 0 ? 0 : 3 * t;
      for (let k = Math.floor((top - off) / (6 * t)) - 1; k * 6 * t + off < bot + 6 * t; k++) {
        const y = k * 6 * t + off, [x0, x1] = [Math.min(at(0), at(1.6 * t)), Math.max(at(0), at(1.6 * t))];
        box(x0, y, x1, y + 0.15 * t, PAL.black, 1, 0, 10, 0); box(x0, y - 0.6 * t, x1, y - 0.6 * t + P, PAL.gray, 0.8, 0, 10, 0);   // the landing, its rail
        box(side < 0 ? x1 - P : x0, y - 0.6 * t, side < 0 ? x1 : x0 + P, y, PAL.gray, 0.8, 0, 10, 0);
        for (let i = 0; i <= 10; i++) { const u = i / 10, x = snap(at((0.2 + 1.2 * u) * t)), yy = snap(y - 6 * t * u); box(x - P / 2, yy - P / 2, x + P / 2, yy + P / 2, PAL.gray, 0.8, 0, 10, 0); }   // the ladder to the next
      }
    }
    for (const r of lv.rects) {
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || r.slick || !(wl || wr) || r.x1 - r.x0 < 3 * t || !seen(r.y0 - 2 * t, r.y0) || mod(Math.round(r.y0 / t), 3) !== 0) continue;
      const w = 1.8 * t, h = 1.1 * t, x0 = wl ? lv.l + 0.2 * t : lv.r - 0.2 * t - w;
      box(x0, r.y0 - h, x0 + w, r.y0 - 0.15 * t, th.block, 1, 0, 10, 0); box(x0 - 0.05 * t, r.y0 - h - 0.15 * t, x0 + w + 0.05 * t, r.y0 - h, PAL.black, 1, 0, 10, 0);   // a dumpster, its lid
      for (const dx of [0.2, 0.8]) disc(x0 + dx * w, r.y0 - 0.12 * t, 0.12 * t, PAL.black, 1);
    }
  }
  // The Junkyard's ledges: a block is green brick (mortar courses, joints in bond), a plank off a wall a fire escape's black grating behind
  // its rail, a free plank a wooden pallet (orange, its slats).
  const junkRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hgt = r.y1 - r.y0;
    if (r.plank && r.move) return false;
    if (r.plank && (wl || wr)) {
      box(r.x0, r.y0, r.x1, r.y1, PAL.black, 1, 0, 10, 0); for (let x = r.x0 + 0.2 * t; x < r.x1; x += 0.4 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y1 - P, PAL.gray, 1, 0, 10, 0);
      for (let x = r.x0 + 0.1 * t; x < r.x1; x += 0.9 * t) box(snap(x), r.y0 - 0.55 * t, snap(x) + P, r.y0, PAL.gray, 0.8, 0, 10, 0);
      box(r.x0, r.y0 - 0.55 * t, r.x1, r.y0 - 0.55 * t + P, PAL.gray, 0.8, 0, 10, 0);
    } else if (r.plank) {
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); for (let x = r.x0 + 0.5 * t; x < r.x1 - 0.2 * t; x += 0.5 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y1, PAL.black, 1, 0, 10, 0);
    } else if (r.move || r.spring || r.magnet || r.bouncy || r.crumble) return false;
    else {
      box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0);
      for (let y = r.y0 + 0.5 * t, k = 0; y < r.y1 - 2; y += 0.5 * t, k++) { box(r.x0, snap(y), r.x1, snap(y) + P, PAL.black, 1, 0, 10, 0); for (let x = r.x0 + (k % 2 ? 0.5 : 1) * t; x < r.x1 - 0.2 * t; x += t) box(snap(x), snap(y), snap(x) + P, snap(Math.min(y + 0.5 * t, r.y1)), PAL.black, 1, 0, 10, 0); }
      for (let x = r.x0 + 0.5 * t; x < r.x1 - 0.2 * t; x += t) box(snap(x), r.y0 + 3 * P, snap(x) + P, snap(Math.min(r.y0 + 0.5 * t, r.y1)), PAL.black, 1, 0, 10, 0);
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  if (th.glass && lv.kind === 'well') {   // the Skyscraper's kit: glass facades up both walls (mullions, transoms), a white aviation lamp blinking every 20 tiles
    const t = kitT, P = kitP;
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d);
      for (const d of [0.55, 1.7]) { const x = snap(at(d * t)); box(x, top, x + P, bot, PAL.gray, 0.6, 0, 10, 0); }
      for (let k = Math.floor(top / (3 * t)) - 1; k * 3 * t < bot; k++) box(Math.min(at(0), at(1.7 * t)), k * 3 * t, Math.max(at(0), at(1.7 * t)), k * 3 * t + P, PAL.gray, 0.6, 0, 10, 0);
      for (let k = Math.floor(top / (20 * t)) - 1; k * 20 * t < bot; k++) if (Math.floor(T * 1.5 + (side < 0 ? 0 : 0.5)) % 2) disc(at(0.3 * t), k * 20 * t + (side < 0 ? 6 : 16) * t, 0.12 * t, PAL.white, 1);
    }
  }
  // The Skyscraper's ledges: a block is a steel girder (a dark web, rivets, a brace under it at a wall), a free plank a cloud (white puffs,
  // thinning as it gives way), a plank off a wall a steel catwalk (a grating, its rail's posts).
  const skyRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hgt = r.y1 - r.y0;
    if (r.cloud) {
      const a = r.crumbling ? 1 - 0.7 * (r.t / CRUMBLE.time) : 1, n = Math.max(2, Math.round((r.x1 - r.x0) / (0.7 * t)));
      for (let i = 0; i < n; i++) { const x = r.x0 + (i + 0.5) * (r.x1 - r.x0) / n; disc(x, r.y0 + 0.1 * t, (i % 2 ? 0.42 : 0.5) * t, PAL.white, a); }
      box(r.x0 + 0.2 * t, r.y0 + 0.1 * t, r.x1 - 0.2 * t, r.y1 + 0.15 * t, PAL.gray, a, 0, 10, 0);
      return true;
    }
    if (r.plank && r.move) return false;
    if (r.plank) {
      box(r.x0, r.y0, r.x1, r.y1, PAL.gray, 1, 0, 10, 0); for (let x = r.x0 + 0.2 * t; x < r.x1 - 0.1 * t; x += 0.35 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y1 - P, PAL.black, 1, 0, 10, 0);
      for (let x = r.x0 + 0.1 * t; x < r.x1; x += 1.2 * t) box(snap(x), r.y0 - 0.5 * t, snap(x) + P, r.y0, PAL.gray, 0.7, 0, 10, 0);
    } else if (r.move || r.spring || r.magnet || r.bouncy || r.crumble) return false;
    else {
      box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0); const my = snap(r.y0 + Math.min(hgt, t) * 0.55); box(r.x0 + P, my, r.x1 - P, my + P, PAL.black, 1, 0, 10, 0);
      for (let x = r.x0 + 0.3 * t; x < r.x1 - 0.2 * t; x += 0.6 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y0 + 3 * P, PAL.gray, 1, 0, 10, 0);
      if (hgt <= t + 1) for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) for (let i = 0; i <= 6; i++) { const u = i / 6, x = snap(wx + d * 1.1 * t * u), y = snap(r.y1 + 1.1 * t * (1 - u)); box(x - P / 2, y - P / 2, x + P / 2, y + P / 2, PAL.gray, 1, 0, 10, 0); }
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  // The Tower Blocks' ledges: a step is a concrete step with a handrail post, a plank off a wall a balcony behind its bars, a free plank a
  // heating pipe in white lagging bands, a block a concrete panel cut square with seams every 2 tiles and window slits in a thick one.
  const panelsRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hgt = r.y1 - r.y0;
    if (r.stair) { box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0); const px = snap((r.x0 + r.x1) / 2); box(px - P / 2, r.y0 - 0.9 * t, px + P / 2, r.y0, PAL.gray, 1, 0, 10, 0); box(px - 0.25 * t, r.y0 - 0.9 * t, px + 0.25 * t, r.y0 - 0.9 * t + P, PAL.gray, 1, 0, 10, 0); }
    else if (r.plank && r.move) return false;
    else if (r.plank && (wl || wr)) {
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0);
      for (let x = r.x0 + 0.15 * t; x < r.x1; x += 0.3 * t) box(snap(x), r.y0 - 0.5 * t, snap(x) + P, r.y0, PAL.gray, 0.7, 0, 10, 0);
      box(r.x0, r.y0 - 0.5 * t, r.x1, r.y0 - 0.5 * t + P, PAL.gray, 0.7, 0, 10, 0);
    } else if (r.plank) {
      box(r.x0, r.y0, r.x1, r.y1, PAL.gray, 1, 0, 10, 0);
      for (let x = r.x0 + 0.6 * t; x < r.x1 - 0.3 * t; x += 1.5 * t) box(snap(x), r.y0, snap(x) + 2 * P, r.y1, PAL.white, 1, 0, 10, 0);
    } else if (r.move || r.spring || r.magnet || r.bouncy) return false;
    else {
      box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0);
      for (let x = r.x0 + 2 * t; x < r.x1 - 0.5 * t; x += 2 * t) box(snap(x), r.y0 + 3 * P, snap(x) + P, r.y1, th.wallD, 1, 0, 10, 0);
      if (hgt >= 2 * t) for (let y = r.y0 + 0.35 * t; y < r.y1 - 0.6 * t; y += t) for (let x = r.x0 + 0.5 * t; x < r.x1 - 0.9 * t; x += 2 * t) box(snap(x), snap(y), snap(x + t), snap(y + 0.3 * t), PAL.black, 1, 0, 10, 0);
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  // The Mine's ledges (see the parts catalog): rock is caramel ore cut by dark strata with sugar crystals in them and a timber brace
  // under it at a wall; a plank is a nailed board; a moving plank is a cage lift on its cable. False for what keeps the common look.
  const mineRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hgt = r.y1 - r.y0;
    if (r.plank && r.move) {   // a cage lift: its floor, a grey frame round it, a cable up from its top
      box(r.x0, r.y0, r.x1, r.y1, th.mover, 1, 0, 10, 2);
      for (const x of [r.x0, r.x1 - 2 * P]) box(x, r.y0 - 1.1 * t, x + 2 * P, r.y0, PAL.gray, 1, 0, 10, 0);
      box(r.x0, r.y0 - 1.1 * t, r.x1, r.y0 - 1.1 * t + 2 * P, PAL.gray, 1, 0, 10, 0);
      const cx = snap((r.x0 + r.x1) / 2); box(cx - P / 2, top, cx + P / 2, r.y0 - 1.1 * t, PAL.gray, 1, 0, 10, 0);
    } else if (r.plank) {   // a board: its grain, nails at its joints
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); const gy = snap(r.y0 + 0.55 * hgt); box(r.x0 + P, gy, r.x1 - P, gy + P, PAL.black, 1, 0, 10, 0);
      for (let x = r.x0; x < r.x1 + 1; x += 1.3 * t) { const nx = snap(Math.min(x, r.x1 - 2 * P)); box(nx, r.y0 + 2 * P, nx + P, r.y0 + 3 * P, PAL.gray, 1, 0, 10, 0); }
    } else if (r.move || r.spring || r.magnet || r.bouncy) return false;
    else {   // ore rock
      box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 2);
      const lines = hgt > 1.5 * t ? [0.38, 0.72] : [0.58];
      for (const f of lines) { const y = snap(r.y0 + f * hgt); for (let x = r.x0 + ((Math.round(r.y0 / t + f * 3) % 2) ? 0.2 : 0.9) * t; x < r.x1 - 0.3 * t; x += 2 * t) {
        box(snap(x), y, snap(Math.min(x + 1.5 * t, r.x1 - 0.2 * t)), y + P, PAL.black, 1, 0, 10, 0); F(snap(x + 0.75 * t), y - P, 1.5 * P, 1.5 * P, 1.5 * P, -1.5 * P, PAL.white, 1, 0);   // a stratum, a sugar crystal on it
      } }
      if (hgt <= t + 1) for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) for (let i = 0; i <= 5; i++) { const u = i / 5, x = snap(wx + d * 0.9 * t * u), y = snap(r.y1 + 0.9 * t * (1 - u)); box(x - P, y - P, x + P, y + P, th.block, 1, 0, 10, 0); }   // a timber brace up to its foot
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  // Tokyo's ledges (see the parts catalog), by what they do: a gondola moves, an awning off a wall bounces, a free plank is a steel
  // beam, a block is a concrete slab cut square with its panels' seams, a striped cap on a free end, a knee brace under it at a wall
  // and windows in a thick one.
  // Returns false for what keeps the common look (ice, crumble, cracks, springs, magnets).
  const townRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
    if (r.plank && r.move) {   // a window-cleaner's gondola: its floor, a rail round it, two cables up out of sight
      box(r.x0, r.y0, r.x1, r.y1, th.mover, 1, 0, 10, 2);
      box(r.x0, r.y0 - 0.55 * t, r.x1, r.y0 - 0.55 * t + P, PAL.gray, 1, 0, 10, 0);
      for (const x of [r.x0, r.x1 - P]) box(x, r.y0 - 0.55 * t, x + P, r.y0, PAL.gray, 1, 0, 10, 0);
      for (const x of [r.x0 + 0.25 * t, r.x1 - 0.25 * t - P]) box(x, top, x + P, r.y0 - 0.55 * t, PAL.gray, 1, 0, 10, 0);
    } else if (r.plank && r.bouncy) {   // a shop's awning off a wall (an awning always bounces): stripes, a scalloped hem, a rod to the wall, a paper lantern
      const sag = r.t > 0 ? 0.25 * t * (r.t / SPRING.anim) : 0, n = Math.max(2, Math.round((r.x1 - r.x0) / (0.5 * t))), sw = (r.x1 - r.x0) / n;
      for (let i = 0; i < n; i++) { const c = i % 2 ? PAL.white : th.block; box(r.x0 + i * sw, r.y0 + sag, r.x0 + (i + 1) * sw, r.y1 + sag, c, 1, 0, 10, 0); disc(r.x0 + (i + 0.5) * sw, r.y1 + sag, sw / 2, c, 1); }
      const ox = wl ? r.x1 - 0.1 * t : r.x0 + 0.1 * t, wx = wl ? lv.l : lv.r;
      for (let k = 0; k <= 10; k++) { const u = k / 10, x = snap(ox + (wx - ox) * u), y = snap(r.y0 + sag - 1.1 * t * u); box(x - P, y - P, x, y, PAL.gray, 1, 0, 10, 0); }
      if (r.x1 - r.x0 >= 3 * t) {
        const lx = snap(wl ? r.x1 - 0.45 * t : r.x0 + 0.45 * t), ly = r.y1 + sag + 0.75 * t;
        box(lx - P / 2, r.y1 + sag, lx + P / 2, ly - 0.3 * t, PAL.gray, 1, 0, 10, 0);
        F(lx, ly, 0.24 * t, 0, 0, 0.32 * t, PAL.white, 1, 0); for (const d of [-1, 1]) box(lx - 0.16 * t, ly + d * 0.3 * t - 0.05 * t, lx + 0.16 * t, ly + d * 0.3 * t + 0.05 * t, PAL.black, 1, 0, 10, 0);
      }
      box(r.x0, r.y0 + sag, r.x1, r.y0 + sag + 2.5, th.lip, 1, 1.25); return true;
    } else if (r.plank) {   // a steel beam: grey, a dark web, rivets
      box(r.x0, r.y0, r.x1, r.y1, PAL.gray, 1, 0, 10, 0); const my = snap((r.y0 + r.y1) / 2); box(r.x0, my, r.x1, my + P, th.wallD, 1, 0, 10, 0);
      for (let x = r.x0 + 0.3 * t; x < r.x1 - 0.2 * t; x += 0.6 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y0 + 3 * P, th.wallD, 1, 0, 10, 0);
    } else if (r.move || r.spring || r.magnet || r.bouncy) return false;
    else {   // a concrete slab (the owner's pick, research/variants/tokyo-slab-1.png: B with F's end): its panels' seams, a free end capped
      // in a road barrier's stripes, white for F's yellow (yellow is for what you take), and a knee brace under it at a wall
      const thin = r.y1 - r.y0 < 2.5 * t, cap = thin && r.x1 - r.x0 >= 2 * t ? 0.6 * t : 0, c0 = wl ? r.x0 : r.x0 + cap, c1 = wr ? r.x1 : r.x1 - cap;
      box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0);
      for (let x = r.x0 + 3 * t; x < c1 - 0.5 * t; x += 3 * t) box(snap(x), r.y0 + 3 * P, snap(x) + P, r.y1, th.wallD, 1, 0, 10, 0);
      for (const [free, x0, x1, ex] of [[!wl, r.x0, c0, r.x0], [!wr, c1, r.x1, r.x1 - P]]) if (free) {
        if (cap) box(snap(x0), r.y0, snap(x1), r.y1, PAL.black, 1, 0, 7, 0.5 * t);
        box(ex, r.y0, ex + P, r.y1, cap ? PAL.white : th.wallD, 1, 0, 10, 0);
      }
      if (!thin) for (let y = r.y0 + 0.6 * t; y < r.y1 - 0.8 * t; y += 1.2 * t) for (let x = r.x0 + 0.4 * t; x < r.x1 - 0.7 * t; x += 1.1 * t) {
        const lit = ((Math.round(x / t) * 7 + Math.round(y / t) * 3) % 5) === 0; box(snap(x), snap(y), snap(x + 0.45 * t), snap(y + 0.55 * t), lit ? PAL.gray : th.wallD, 1, 0, 10, 0);
      } else for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) {   // the brace, a pixel clear of the wall and the slab: a triangle of a leg down
        // the wall, a bar under the slab and a strut between their ends (nothing in Tokyo's campaign levels, its boss's arena aside, stands within 1.5 tiles under a wall's slab)
        const h = snap(1.3 * t), s = 3 * P, y0 = snap(r.y1) + P, xs = (a, b) => [snap(Math.min(wx + d * a, wx + d * b)), snap(Math.max(wx + d * a, wx + d * b))];
        const [l0, l1] = xs(P, P + s), [b0, b1] = xs(P, P + h);
        box(l0, y0, l1, y0 + h, th.block, 1, 0, 10, 0); box(b0, y0, b1, y0 + 2 * P, th.block, 1, 0, 10, 0);
        for (let y = y0; y < y0 + h; y += P) { const u = y0 + h - y, [a0, a1] = xs(Math.max(P, u - s / 2), Math.min(P + h, u + s / 2)); box(a0, y, a1, y + P, th.block, 1, 0, 10, 0); }
      }
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  if (lv.floor < bot) { box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 800, th.wall, 1, 0); box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 2.5, th.lip, 1, 0); }
  for (const r of lv.rects) {
    if (r.gone || !seen(r.y0, r.y1)) continue;
    if (r.cap) { box(lv.l - 2, Math.max(r.y0, top), lv.r + 2, r.y1, th.wall, 1, 0); box(lv.l - 2, r.y1 - 2.5, lv.r + 2, r.y1, th.lip, 1, 0); continue; }
    if (r.spring) {
      const k = r.t / SPRING.anim, hh = (r.y1 - r.y0) * (1 - 0.5 * k), w = r.x1 - r.x0;
      if (th.junk) {   // the Junkyard's: a black trash bag, its grey tie, a glint, flattening as it throws
        const y0 = r.y1 - hh - 0.25 * R, cx = (r.x0 + r.x1) / 2; F(cx, (y0 + r.y1) / 2, (r.x1 - r.x0) / 2, 0, 0, (r.y1 - y0) / 2 + 0.05 * R, PAL.black, 1, 0);
        box(cx - 0.08 * R, y0 - 0.15 * R, cx + 0.08 * R, y0, PAL.gray, 1, 0, 10, 0); disc(cx - 0.3 * R, y0 + 0.12 * R, 0.07 * R, PAL.white, 1);
        continue;
      }
      if (th.panels) {   // the Tower Blocks': an old mattress thrown out, blue and white stripes, flattening as it throws
        const y0 = r.y1 - hh - 0.2 * R; box(r.x0, y0, r.x1, r.y1, PAL.white, 1, 0, 10, 0);
        for (let x = r.x0 + 2 * kitP; x < r.x1 - kitP; x += 4 * kitP) box(x, y0, x + 2 * kitP, r.y1, th.spring, 1, 0, 10, 0);
        continue;
      }
      box(r.x0 + w * 0.3, r.y1 - hh, r.x1 - w * 0.3, r.y1, th.block, 1, 2);
      box(r.x0, r.y1 - hh - 0.2 * R, r.x1, r.y1 - hh, th.spring, 1, 0.1 * R);
      continue;
    }
    const c = r.flash > 0 ? INK.white : r.bouncy ? th.spring : r.magnet ? PAL.blue : r.plank ? (r.move ? th.mover : th.plank) : r.slick ? th.slick : r.crumble ? th.crumble : th.block, rad = Math.min((r.y1 - r.y0) / 2, 6);   // (a bouncy plank the spring's ink, a magnet blue)
    let ox = 0, a = 1;
    if (r.crumbling) { const u = r.t / CRUMBLE.time; ox = Math.sin(T * 70) * 1.8 * u; a = 1 - 0.5 * u * u; }
    const own = !r.slick && (!r.crumble || r.cloud) && !r.crack && !(r.flash > 0), kit = own && ((th.town && townRect(r)) || (th.pit && mineRect(r)) || (th.panels && panelsRect(r)) || (th.glass && skyRect(r)) || (th.junk && junkRect(r)));   // a world's own look (townRect, mineRect); the overlays below stay
    if (!kit) {
      if (r.slick) box(r.x0, r.y0, r.x1, r.y1, c, a, 0, 7, 9);   // ice striped, a mover dotted, a crumbling block chequered, the rest lit from the top
      else if (r.move) box(r.x0, r.y0, r.x1, r.y1, c, a, 0, 10, 2);
      else if (r.crumble) box(r.x0 + ox, r.y0, r.x1 + ox, r.y1, c, a, 0, 10, 4);
      else box(r.x0 + ox, r.y0, r.x1 + ox, r.y1, c, a, rad);
      box(r.x0 + ox + rad * 0.5, r.y0, r.x1 + ox - rad * 0.5, r.y0 + 2.5, th.lip, a, 1.25);
    }
    if (r.crumble && !kit) for (let x = r.x0 + 9; x < r.x1 - 6; x += 16) disc(x + ox, (r.y0 + r.y1) / 2 + 1, 1.6, th.wallD, a);
    if (r.crack) {   // cracked: a dark zigzag across it, and now and then a glint of gold through it (what is behind)
      const P = PIX.size, w = r.x1 - r.x0, hgt = r.y1 - r.y0;
      for (let k = 0; k < 6; k++) { const x = r.x0 + w * (0.15 + 0.14 * k), y = r.y0 + hgt * (k & 1 ? 0.35 : 0.65); box(x - P, y - P, x + P, y + P, th.wallD, 1, 0, 10, 0); }
      if ((T * 1.3 + r.x0 * 0.01) % 2 < 0.25) box(r.x0 + w * 0.5 - P, r.y0 + hgt * 0.5 - P, r.x0 + w * 0.5 + P, r.y0 + hgt * 0.5 + P, INK.coin, 1, 0, 10, 0);
      if (r.key && (T * 1.6) % 1 < 0.5) for (const [x0, y0, x1, y1] of [[r.x0, r.y0, r.x1, r.y0 + P], [r.x0, r.y1 - P, r.x1, r.y1], [r.x0, r.y0, r.x0 + P, r.y1], [r.x1 - P, r.y0, r.x1, r.y1]]) box(x0, y0, x1, y1, INK.coin, 1, 0, 10, 0);   // a gate's keystone: its rim blinks gold (hit here)
    }
    if (r.move && !kit) { disc(r.x0 + 5, (r.y0 + r.y1) / 2, 2.2, th.lip, 1); disc(r.x1 - 5, (r.y0 + r.y1) / 2, 2.2, th.lip, 1); }
    if (r.moss) {   // moss under it, as on the walls: a strip and a fringe of tufts hanging off it
      box(r.x0 + ox, r.y1 - 0.12 * R, r.x1 + ox, r.y1 + 0.1 * R, th.moss, a, 0, 10, 0);
      for (let x = r.x0 + 0.25 * R, k = 0; x < r.x1 - 0.15 * R; x += 0.42 * R, k++) disc(x + ox, r.y1 + 0.1 * R, (k & 1 ? 0.17 : 0.27) * R, th.moss, a);
    }
    if (r.bouncy && r.t > 0 && !kit) box(r.x0, r.y0, r.x1, r.y1 + 0.25 * R * (r.t / SPRING.anim), th.spring, 1, 0, 10, 0);   // a bouncy plank sags as it throws
    if (r.magnet) for (let k = 0; k < 4; k++) { const u = (T * 1.1 + k / 4) % 1, x = r.x0 + ((k + 0.5) / 4) * (r.x1 - r.x0), d = (1 - u) * 1.8 * R; box(x - 1, r.y0 - d - 2, x + 1, r.y0 - d, PAL.white, 0.9, 0, 10, 0); }   // a magnet: dots drawn in onto it
    if (th.drips && !r.plank && !r.spring && !r.moss) for (let n = Math.max(1, Math.round((r.x1 - r.x0) / (2.2 * R))), k = 0; k < n; k++) {   // the Crypt's black goo, hanging off the stone and stretching slowly
      const x = r.x0 + ((k + 0.5) * (r.x1 - r.x0)) / n + ox, len = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(T * 0.9 + x * 0.07 + r.y0 * 0.013))) * R;
      box(x - 0.09 * R, r.y1, x + 0.09 * R, r.y1 + len, INK.dark, a, 0, 10, 0); disc(x, r.y1 + len, 0.14 * R, INK.dark, a);
    }
  }
  {   // the platforms' shadows (user: depth, not overdone): cast by a sun that goes from the right to the left through a world's levels,
    // a dithered black band under each and down its far side, over the walls and whatever ledge lies there (the black back wall barely shows them)
    const sun = (g.mode === 'camp' ? g.stage / 9 : g.stage / 2) * 2 - 1, dx = Math.round((-sun * 0.45 * R) / PIX.size) * PIX.size, dy = Math.round((0.32 * R) / PIX.size) * PIX.size;
    if (lv.kind === 'well') for (const r of lv.rects) if (!r.gone && !r.cap && seen(r.y0, r.y1 + dy)) {
      box(r.x0 + dx, r.y1, r.x1 + dx, r.y1 + dy, INK.dark, 0.55, 0, 10, 0);
      if (dx) box(dx > 0 ? r.x1 : r.x0 + dx, r.y0 + dy, dx > 0 ? r.x1 + dx : r.x0, r.y1, INK.dark, 0.55, 0, 10, 0);
    }
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
    // a thick coin turning: its edge shows beside the face as it turns away, the rim and the face are shaded
    const r = c.v > 1 ? cr * 1.4 : cr, a = T * 4 + c.ph, cs = Math.cos(a), s = 0.2 + 0.8 * Math.abs(cs), edge = 0.22 * r * Math.sin(a) * (cs < 0 ? -1 : 1);
    F(c.x + edge, c.y, r * s + Math.abs(edge) * 0.5, 0, 0, r, INK.coinD, 1, 9, 0);
    F(c.x, c.y, r * s, 0, 0, r, INK.coinD, 1, 9, 0);
    F(c.x - r * s * 0.04, c.y - r * 0.04, r * s * 0.72, 0, 0, r * 0.72, INK.coin, 1, 9, 6);
    F(c.x - r * s * 0.3, c.y - r * 0.34, r * s * 0.18, 0, 0, r * 0.16, INK.white, 1, 0);
  }
  const spr = (rows, x, y, ink, k, top) => {   // a CRITTER picture, k game pixels a dot, centred on x, its top (or bottom) at y
    const s = PIX.size * k, x0 = Math.round(x / PIX.size) * PIX.size - (rows[0].length * s) / 2, y0 = Math.round(y / PIX.size) * PIX.size - (top ? 0 : rows.length * s);
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') box(x0 + i * s, y0 + j * s, x0 + (i + 1) * s, y0 + (j + 1) * s, row[i] === 'w' ? INK.white : ink, 1, 0, 10, 0); });
  };
  const ck = Math.max(1, Math.round((0.11 * R) / PIX.size));
  for (const f of lv.folk) if (seen(f.y - R, f.y + R)) {
    if (f.kind === 'bat') spr(f.fly ? (Math.floor(f.t * 10) % 2 ? CRITTER.batUp : CRITTER.batDown) : CRITTER.bat, f.x, f.y, th.wall, ck, !f.fly);
    else if (f.kind === 'bug') spr(Math.floor(f.t * (f.run ? 14 : 4)) % 2 ? CRITTER.bug : CRITTER.bug2, f.x, f.y, th.wall, ck, false);
  }
  for (const p of lv.pickups) {   // a shop's items: their pictures, bobbing a game pixel at a time, in a glow
    const y = p.y + Math.round(Math.sin(T * 2.4 + p.x) * 1.5) * PIX.size, a = p.sold ? 0.25 : 1;
    F(p.x, y, p.r * 2, 0, 0, p.r * 2, p.item.color, 0.25 * a, 1);
    iconSpin(p.item.id, p.x, y, a, 2.4, T * 1.8 + p.x * 0.05);   // a fifth bigger than at first (user), turning
  }
  for (const p of lv.fizz) if (!p.taken && seen(p.y - p.r, p.y + p.r)) {   // candies, bobbing in a glow
    const y = p.y + Math.round(Math.sin(T * 3 + p.x) * 1.5) * PIX.size;
    const k = Math.max(1, Math.round((1.5 * R) / (12 * PIX.size))), gr = 0.65 * 12 * k * PIX.size;   // about 1.5 R across, as on a phone: a fixed size was half that on a desktop (user)
    F(p.x, y, gr, 0, 0, gr, INK.coin, 0.3, 1); iconSpin(p.kind || 'fizz', p.x, y, 1, k, T * 2.2 + p.x * 0.05);
  }
  for (const b of lv.bullets) { const s = Math.max(2, Math.round((GUN.r * R) / PIX.size) * PIX.size); box(b.x - s, b.y - s, b.x + s, b.y + s, INK.white, 1, 0, 10, 0); }   // the hero's shots, white
  const icicle = th.glass ? (x, y) => { box(x - 0.06 * R, y, x + 0.06 * R, y + 0.35 * R, PAL.gray, 1, 0, 10, 0); disc(x, y + 0.45 * R, 0.2 * R, INK.spike, 1); }   // the Skyscraper's: a bolt hanging off a girder, its red head down
    : (x, y) => { const hl = 0.3 * R, hd = 0.3 * R; F(x, y + hd, hl, 0, 0, -hd, INK.spike, 1, 6, hl, hd, 2 * hl); };   // a red spike pointing down, its root at y
  for (const c of lv.icicles) if (seen(c.y - R, c.y + R)) icicle(c.x + (c.state === 'shake' ? Math.round(Math.sin(T * 60) * 1.5) * PIX.size : 0), c.y);
  const xg = lv.crossing;
  if (xg && seen(xg.y0 - R, xg.y1 + R)) {   // a level crossing: rails along the band's foot, the lights by the walls, and the train
    box(lv.l, xg.y1 - 0.12 * R, lv.r, xg.y1, th.lip, 1, 0, 10, 0); box(lv.l, xg.y1 - 0.42 * R, lv.r, xg.y1 - 0.3 * R, th.lip, 0.6, 0, 10, 0);
    const on = xg.state !== 'rest', blink = Math.floor(T * 4) % 2;   // two a second each, in turn: under WCAG's 3
    for (const [x, d] of [[lv.l + 0.35 * R, 1], [lv.r - 0.35 * R, -1]]) {
      box(x - 0.06 * R, xg.y0 - 0.2 * R, x + 0.06 * R, xg.y1, PAL.gray, 1, 0, 10, 0);   // the post
      for (const k of [0, 1]) disc(x + d * (k ? 0.32 : 0) * R, xg.y0 - 0.2 * R, 0.17 * R, on && blink === k ? INK.spike : INK.dark, 1);   // its two lamps
    }
    if (xg.state === 'pass' && th.junk) {   // the Junkyard's: a garbage truck, green, its cab white-windowed at the front, wheels
      const L = 0.9 * W, x1 = xg.x, x0 = x1 - L, y0 = xg.y0 + 0.08 * R, y1 = xg.y1 - 0.45 * R, c0 = x1 - 0.3 * L;
      box(Math.max(lv.l, x0), y0, Math.min(lv.r, c0), y1, th.block, 1, 0, 10, 0); box(Math.max(lv.l, c0), y0 + 0.3 * (y1 - y0), Math.min(lv.r, x1), y1, th.block, 1, 0, 10, 0);
      if (x1 - 0.25 * L > lv.l && x1 - 0.1 * L < lv.r) box(Math.max(lv.l, x1 - 0.25 * L), y0 + 0.4 * (y1 - y0), Math.min(lv.r, x1 - 0.08 * L), y0 + 0.65 * (y1 - y0), PAL.white, 1, 0, 10, 0);
      for (const f of [0.15, 0.45, 0.85]) { const wx = x0 + f * L; if (wx > lv.l && wx < lv.r) disc(wx, y1, 0.35 * R, PAL.black, 1); }
    } else if (xg.state === 'pass') {   // the train: dark cars with a white roof line and lit windows, a headlight at its front
      const L = TRAIN.len * W, x1 = xg.x, x0 = x1 - L, y0 = xg.y0 + 0.08 * R, y1 = xg.y1 - 0.45 * R;
      box(Math.max(lv.l, x0), y0, Math.min(lv.r, x1), y1, INK.dark, 1, 0, 10, 0); box(Math.max(lv.l, x0), y0, Math.min(lv.r, x1), y0 + 0.12 * R, PAL.white, 1, 0, 10, 0);
      for (let x = x1 - 0.9 * R; x > x0 + 0.5 * R; x -= 1.3 * R) if (x > lv.l && x < lv.r) box(x - 0.4 * R, y0 + 0.35 * R, x + 0.4 * R, y0 + 0.35 * R + 0.5 * (y1 - y0), INK.coin, 1, 0, 10, 0);
      if (x1 > lv.l && x1 < lv.r + R) { F(x1, (y0 + y1) / 2, 1.4 * R, 0, 0, 0.7 * R, PAL.white, 0.35, 1); disc(Math.min(x1, lv.r) - 0.2 * R, y1 - 0.35 * R, 0.18 * R, PAL.white, 1); }
    }
  }
  for (const rg of lv.rings) if (!rg.used && seen(rg.y - 2 * R, rg.y + 2 * R)) {   // a boost ring: gold, two rims, lights going round it, a glow
    const r = RING.r * R * (1 + 0.04 * Math.sin(T * 5));
    F(rg.x, rg.y, r * 1.5, 0, 0, r * 1.5, INK.coin, 0.25, 1); F(rg.x, rg.y, r, 0, 0, r, INK.coin, 1, 4); F(rg.x, rg.y, r * 0.78, 0, 0, r * 0.78, PAL.white, 1, 4);
    for (let k = 0; k < 6; k++) { const a = T * 3 + (k * TAU) / 6; disc(rg.x + Math.cos(a) * r * 0.9, rg.y + Math.sin(a) * r * 0.9, 0.09 * R, k & 1 ? INK.white : INK.coinD, 1); }
  }
  for (const sp of lv.spots) if (!sp.used && seen(sp.y - 2.5 * R, sp.y + 2.5 * R)) {   // the flip side's spots (a pool, at its floor)
    const r = sp.r * R, flat = sp.kind === 'out' ? 0.45 : 1, w = (k, a) => Math.sin(T * 2.1 + k * 1.9 + a) * 0.12 * r;
    for (const [c, f] of [[PAL.blue, 1], [PAL.yellow, 0.8], [PAL.white, 0.62]]) for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + T * 0.6;
      F(sp.x + Math.cos(a) * 0.28 * r * f + w(k, 0), sp.y + (Math.sin(a) * 0.28 * r * f + w(k, 1)) * flat, 0.78 * r * f, 0, 0, 0.78 * r * f * flat, c, 1, 0);
    }
    for (let k = 0; k < 4; k++) { const a = T * 1.3 + k * 1.57, x = sp.x + Math.cos(a) * 0.3 * r, y = sp.y + Math.sin(a) * 0.3 * r * flat; disc(x, y, 0.16 * r, k % 2 ? PAL.red : PAL.black, 1); disc(x, y, 0.07 * r, PAL.white, 1); }
    for (let k = 0; k < 2; k++) { const a = T * 0.8 + k * Math.PI, x = sp.x + Math.cos(a) * 1.4 * r, y = sp.y + Math.sin(a) * 0.9 * r * flat; disc(x, y, 0.17 * r, PAL.blue, 1); disc(x, y, 0.09 * r, PAL.yellow, 1); }
  }
  for (const e of lv.enemies) if (e.type === 'worm' && seen(e.body.minY - 3 * R, e.body.maxY + 3 * R)) {   // a worm's tubes, behind its knot
    e.tubes(R, T).forEach((tube, k) => {
      const n = tube.length;
      tube.forEach(([x, y, w], i) => disc(x, y, w, i < 0.4 * n ? INK.flame : i < 0.75 * n ? INK.spike : PAL.purple, 1));
      if (n) disc(tube[n - 1][0], tube[n - 1][1], WORM.tip * R, [PAL.blue, PAL.yellow, INK.spike, PAL.blue][k], 1);
    });
  }
  for (const s of lv.shots) {   // the boss's drops, red; the fire's blobs, orange round a yellow heart; a falling stalactite
    if (s.rock) { F(s.x, lv.floor + 1, s.r * 1.3, 0, 0, s.r * 0.35, INK.dark, 1, 0); disc(s.x, s.y, s.r, PAL.gray, 1); disc(s.x - 0.3 * s.r, s.y - 0.3 * s.r, 0.3 * s.r, PAL.white, 1); continue; }   // the Minecart's rocks, a shadow under each on the floor
    if (s.icicle) { icicle(s.x, s.y - 0.3 * R); continue; }
    F(s.x, s.y, s.r * 1.8, 0, 0, s.r * 1.8, INK.spike, 0.3, 1); disc(s.x, s.y, s.r, INK.spike, 1);
    if (s.fire) disc(s.x - s.r * 0.15, s.y - s.r * 0.15, s.r * 0.55, INK.flame, 1);
  }
  if (g.swarm && g.power('swarm')) for (const b of g.swarm) (b.trail || []).forEach(([x, y], i, tr) => { const f = (i + 1) / tr.length; disc(x, y, b.R * (0.3 + 0.55 * f), b.color.base, 0.3 + 0.55 * f); });   // each clone's trail, in its colour (user)
  const tl = g.tail, hb = g.hero, bw = RAINBOW.band * R;   // a rainbow's tail: six bands along the hero's way, fading to its end
  for (let i = 0; i < tl.length; i++) {
    const [x0, y0] = tl[i], [x1, y1] = i + 1 < tl.length ? tl[i + 1] : [hb.cx, hb.cy], l = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / l, uy = (y1 - y0) / l, hl = l / 2 + PIX.size;
    for (let k = 0; k < 6; k++) { const o = (k - 2.5) * bw; F((x0 + x1) / 2 - uy * o, (y0 + y1) / 2 + ux * o, ux * hl, uy * hl, -uy * bw / 2, ux * bw / 2, RAINBOW_INK[k], (i + 1) / tl.length, 10, hl, bw / 2, 0); }
  }
  const back = this.nf;
  const list = g.bodyList(), hero = g.hero, heroOff = g.state === 'dead' ? !(g.dieT > 0) : g.invuln > 0 && Math.floor(g.invuln / HEALTH.blink) % 2 === 1;   // blinking, or burst (after its death's beat)
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
  if (lv.fire && lv.fire.y - 2.4 * R < bot) {   // the fire, between the walls: a red body under two layers of tongues, red behind and orange in front
    const fy = lv.fire.y, W = lv.r - lv.l;
    box(lv.l, fy, lv.r, fy + 0.9 * R, INK.fire, 1, 0, 10, 0);   // bright only at the top, then dimmer through the dither
    box(lv.l, fy + 0.9 * R, lv.r, fy + 2.2 * R, INK.fire, 1, 0, 10, 4);
    box(lv.l, fy + 2.2 * R, lv.r, fy + H + 200, INK.fire, 1, 0, 10, 5);
    const steady = (i, k) => { const q = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return q - Math.floor(q); };   // a tongue's own numbers, the same every frame
    for (const [c, gap, h0, h1, w0, w1, drift, k, off] of [[INK.fire, 0.7, 1.3, 1.45, 0.5, 0.5, 0.3, 1, 0], [INK.flame, 0.7, 0.8, 0.9, 0.36, 0.36, 0.3, 2, 0.5]]) {   // evener than at first (user)
      const n = Math.ceil(W / (gap * R));
      for (let i = 0; i < n; i++) {   // alike and evenly set, the front row between the back one's, a gentle flicker, drifting along and wrapping round,
        const a = steady(i, k), f = 5 + 2 * steady(i, k + 3), x = lv.l + ((((i + 0.5 + off) / n) * W + T * drift * R) % W + W) % W;
        const hw = Math.min((w0 + (w1 - w0) * a) * R, x - lv.l, lv.r - x);   // and narrower by a wall
        if (hw < 0.5) continue;
        const hd = ((h0 + (h1 - h0) * a) * R * (0.92 + 0.08 * Math.sin(T * f + a * 6.3))) / 2;
        F(x, fy + 0.35 * R - hd, hw, 0, 0, hd, c, 1, 6, hw, hd, 2 * hw);
      }
    }
    // its mouth (user: a big open mouth wall to wall, fire bursting out of it): a black gum line on its rim, white fangs along it and
    // big ones at the walls, and now and then a tall jet of flame out between them (to look at: the fire's blobs are what hurt)
    box(lv.l, fy + 0.3 * R, lv.r, fy + 0.55 * R, INK.dark, 1, 0, 10, 0);
    for (let n = Math.max(4, Math.round(W / (1.1 * R))), i = 0; i <= n; i++) {
      const x = lv.l + (i / n) * W, big = i === 0 || i === n, hw = (big ? 0.45 : 0.28) * R, hd = (big ? 0.75 : 0.42) * R * (0.96 + 0.04 * Math.sin(T * 4 + i));
      F(clamp(x, lv.l + hw, lv.r - hw), fy + 0.32 * R - hd, hw, 0, 0, hd, INK.white, 1, 6, hw, hd, 2 * hw);
    }
    for (let k = 0; k < 3; k++) {   // three jets in turn, each a moment every two seconds or so
      const u = (T * 0.45 + k / 3) % 1;
      if (u > 0.16) continue;
      const x = lv.l + (0.2 + 0.6 * steady(Math.floor(T * 0.45 + k / 3), k + 7)) * W, h = Math.sin((u / 0.16) * Math.PI) * 2.2 * R;
      F(x, fy - h / 2, 0.42 * R, 0, 0, h / 2 + 0.3 * R, INK.fire, 1, 6, 0.42 * R, h / 2 + 0.3 * R, 0.84 * R); F(x, fy - h * 0.35, 0.24 * R, 0, 0, h * 0.35 + 0.2 * R, INK.flame, 1, 6, 0.24 * R, h * 0.35 + 0.2 * R, 0.48 * R);
    }
    const w = lv.fire.warn;
    if (w) { const u = 1 - w.t / FIRE.warn, hd = R * (0.5 + 1.1 * u); F(w.x, fy - hd + 0.3 * R, 0.45 * R, 0, 0, hd, u > 0.5 ? INK.white : INK.flame, 1, 6, 0.45 * R, hd, 0.9 * R); }   // a tongue rising where a blob is coming
  }
  for (const f of lv.folk) if (f.kind === 'cage' && !f.open && f.body && seen(f.body.minY - R, f.body.maxY)) {   // a cage: white bars, a yellow lock (yellow: touch it)
    const b = f.body, P = PIX.size, x0 = b.cx - 0.95 * R, x1 = b.cx + 0.95 * R, y1 = b.maxY + 1, y0 = y1 - 1.9 * R;
    box(x0, y0 - P, x1, y0 + P, INK.white, 1, 0, 10, 0); box(x0, y1 - P, x1, y1 + P, INK.white, 1, 0, 10, 0);
    for (let k = 0; k <= 4; k++) { const x = x0 + ((x1 - x0) * k) / 4; box(x - P, y0, x + P, y1, INK.white, 1, 0, 10, 0); }
    box(b.cx - 0.2 * R, y0 + 0.75 * R, b.cx + 0.2 * R, y0 + 1.15 * R, INK.coin, 1, 0, 10, 0); box(b.cx - 0.1 * R, y0 + 0.55 * R, b.cx + 0.1 * R, y0 + 0.75 * R, INK.coinD, 1, 0, 10, 0);
  }
  const bs = lv.boss;
  for (const e of lv.enemies) if (e.type === 'skull' && seen(e.body.minY, e.body.maxY)) {   // a skull over its black goo (the user's picture): its eye glints on the hero
    const b = e.body, r = 0.72 * b.R, x = b.cx, y = b.cy - 0.3 * b.R, lx = clamp((g.hero.cx - x) / (6 * R), -1, 1) * 0.1 * r, ly = clamp((g.hero.cy - y) / (6 * R), -1, 1) * 0.08 * r;
    disc(x, y, r, PAL.white, 1); box(x - 0.55 * r, y + 0.45 * r, x + 0.55 * r, y + 0.95 * r, PAL.white, 1, 0, 10, 0);   // its crown and its jaw
    for (const d of [-1, 1]) { disc(x + d * 0.42 * r, y + 0.08 * r, 0.3 * r, INK.dark, 1); disc(x + d * 0.42 * r + lx, y + 0.04 * r + ly, 0.09 * r, INK.spike, 1); }   // black sockets, a red glint in each
    box(x - 0.07 * r, y + 0.42 * r, x + 0.07 * r, y + 0.58 * r, INK.dark, 1, 0, 10, 0);   // its nose
    for (let k = -2; k <= 2; k++) box(x + k * 0.22 * r - 0.04 * r, y + 0.7 * r, x + k * 0.22 * r + 0.04 * r, y + 0.95 * r, INK.dark, 1, 0, 10, 0);   // teeth
    box(x + 0.12 * r, y - 0.95 * r, x + 0.2 * r, y - 0.45 * r, INK.dark, 1, 0, 10, 0); box(x + 0.2 * r, y - 0.5 * r, x + 0.42 * r, y - 0.42 * r, INK.dark, 1, 0, 10, 0);   // a crack
  }
  if (bs && !bs.dead && bs.def && bs.def.rat) {   // the Rat King's round ears, its tail
    const b = bs.body, w = 0.45 * (b.maxX - b.minX), up = b.up && b.up.fails ? 1 : -1;
    for (const d of [-1, 1]) { disc(b.cx + d * w, b.minY + 0.15 * R, 0.4 * R, PAL.gray, 1); disc(b.cx + d * w, b.minY + 0.15 * R, 0.2 * R, PAL.purple, 1); }
    for (let k = 0; k < 8; k++) disc(b.maxX + k * 0.18 * R, b.maxY - 0.3 * R - Math.sin(T * 6 + k * 0.7) * 0.15 * R * k * 0.3, 0.07 * R, PAL.gray, 1);
  } else if (bs && !bs.dead && bs.def && bs.def.pigeon) {   // the Pigeon's wings, flapping, and its beak
    const b = bs.body, w = 0.6 * (b.maxX - b.minX), f = Math.sin(T * (bs.state === 'dive' ? 22 : 9));
    for (const d of [-1, 1]) F(b.cx + d * w, b.cy - 0.1 * R + f * 0.25 * R, 0.55 * R, d * 0.2 * R, 0, (0.3 + 0.12 * f) * R, PAL.gray, 1, 0);
    disc(b.cx, b.cy + 0.15 * (b.maxY - b.minY), 0.16 * R, INK.flame, 1);
  } else if (bs && !bs.dead && bs.def && bs.def.crane) {   // the Crane's load: a cable up out of sight, its hook block, two slings to the load's shoulders
    const b = bs.body, P = PIX.size, cx = Math.round(b.cx / P) * P, hy = b.minY - 0.7 * R;
    box(cx - P, top, cx + P, hy, PAL.gray, 1, 0, 10, 0); box(cx - 0.3 * R, hy, cx + 0.3 * R, hy + 0.25 * R, PAL.gray, 1, 0, 10, 0);
    for (const d of [-1, 1]) for (let k = 0; k <= 6; k++) { const u = k / 6, x = Math.round((cx + d * 0.55 * (b.maxX - b.cx) * u) / P) * P, y = Math.round((hy + 0.25 * R + (b.minY + 0.15 * (b.maxY - b.minY) - hy - 0.25 * R) * u) / P) * P; box(x - P / 2, y - P / 2, x + P / 2, y + P / 2, PAL.gray, 1, 0, 10, 0); }
  } else if (bs && !bs.dead && bs.def && bs.def.tram) {   // the Tram's car round it, in the town's blue: dark windows, a white band, its pantograph up to the wire
    const b = bs.body, hw = 0.62 * (b.maxX - b.minX), y1 = lv.rail.y, y0 = b.cy - 0.05 * (b.maxY - b.minY), hgt = y1 - y0, wy = b.minY - 1.2 * R, P = PIX.size;
    box(lv.l, wy, lv.r, wy + P, PAL.gray, 1, 0, 10, 0);   // the overhead wire
    for (let k = 0; k <= 8; k++) { const u = k / 8, x = Math.round((b.cx - 0.5 * R + R * Math.abs(u - 0.5)) / P) * P, y = Math.round((b.minY - (b.minY - wy) * u) / P) * P; box(x - P, y - P, x + P, y, PAL.gray, 1, 0, 10, 0); }
    box(b.cx - hw - 2.5, y0 - 2.5, b.cx + hw + 2.5, y1 + 2.5, th.lip, 1, 0); box(b.cx - hw, y0, b.cx + hw, y1, th.block, 1, 0);
    for (let k = -1; k <= 1; k++) box(b.cx + k * 0.62 * hw - 0.22 * hw, y0 + 0.18 * hgt, b.cx + k * 0.62 * hw + 0.22 * hw, y0 + 0.55 * hgt, INK.dark, 1, 0, 10, 0);
    box(b.cx - hw, y0 + 0.68 * hgt, b.cx + hw, y0 + 0.78 * hgt, PAL.white, 1, 0, 10, 0);
    for (const d of [-0.6, 0.6]) disc(b.cx + d * hw, y1, 0.24 * R, th.lip, 1);
  } else if (bs && !bs.dead && bs.def && bs.def.rail) {   // the Minecart's cart, in front of it: dark, a white rim, two wheels on the rail
    const b = bs.body, hw = 0.55 * (b.maxX - b.minX), y0 = b.cy, y1 = lv.rail.y;
    box(b.cx - hw - 2.5, y0, b.cx + hw + 2.5, y1 + 2.5, th.lip, 1, 0); box(b.cx - hw, y0 + 2.5, b.cx + hw, y1, INK.dark, 1, 0);   // white round the dark, on the dark
    for (const d of [-0.6, 0.6]) disc(b.cx + d * hw, y1, 0.24 * R, th.lip, 1);
  }
  if (bs && !bs.dead && (bs.state === 'dazed' || bs.mark) && Math.floor(bs.st * 5) % 3 !== 2) icon('mark', bs.body.cx, bs.body.minY - 1.3 * R + Math.round(Math.sin(T * 8) * 2) * PIX.size, 1, Math.max(1, Math.round((1.4 * R) / (12 * PIX.size))));   // a dazed boss: an arrow down at its top
  if (g.warns.length) {   // threats coming down into view (see Game.threats): a red sign under the HUD over where each comes in
    const wk = Math.max(1, Math.round((1.1 * R) / (12 * PIX.size))), hw = 6 * wk * PIX.size, wy = cam + (view.hudB || 0) + hw + 2 * PIX.size + Math.round(Math.sin(T * 8) * 2) * PIX.size;
    for (const x of g.warns) icon('warn', clamp(x, lv.l + hw, lv.r - hw), wy, 1, wk);
  }
  if (g.state === 'play' && g.air > 0 && g.sinceContact > JUMP.coyote) for (let k = 0; k < g.air; k++)   // in the air: the jumps it has left
    disc(hero.cx + (k - (g.air - 1) / 2) * 0.5 * R, hero.maxY + 0.42 * R, (g.power('smash') ? 0.22 : 0.15) * R, g.power('smash') ? INK.flame : INK.white, 1);   // orange: the next one rams
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
  gl.uniform3fv(pg.u.uTop, th.top); gl.uniform3fv(pg.u.uDots, th.dots); gl.uniform3fv(pg.u.uBot, th.bot); gl.uniform1f(pg.u.uGrad, th.grad ? 1 : 0); gl.uniform1f(pg.u.uH, lh); gl.uniform1f(pg.u.uWin, th.win === 'brick' ? 4 : th.win === 'clouds' ? 3 : th.win === 'grid' ? 2 : th.win ? 1 : 0);
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
    if (lv.crossing) { const xg = lv.crossing, on = xg.state !== 'rest'; for (const x of [lv.l + 0.5 * R, lv.r - 0.5 * R]) light(x, xg.y0 - 0.2 * R, on ? 1.6 : 0.7, on ? 4 : 1.8); if (xg.state === 'pass') light(Math.min(xg.x, lv.r), (xg.y0 + xg.y1) / 2, 2.2, 5); }   // a crossing's lamps (bright while they flash), the train's headlight
    if (lv.portal) light(lv.portal.x, lv.portal.y, 2, 4);
    for (const s of lv.shots) light(s.x, s.y, 0.5, 1.4);   // blobs, the fire's and the spitters'
    for (const b of lv.bubbles) light(b.x, b.y, 1.2, 2.6);
    for (const p of lv.fizz) if (!p.taken) light(p.x, p.y, 0.8, 2);
    for (const sp of lv.spots) if (!sp.used) light(sp.x, sp.y, 1.4, 3.2);   // the flip side's pools glow (its way back out)
    if (th.pit && lv.kind === 'well') for (let k = Math.floor(top / MINE_CAP) - 1; k * MINE_CAP < bot; k++) for (const side of [-1, 1]) if (mineLamp(side, k)) light(side < 0 ? lv.l + 1.05 * kitT : lv.r - 1.05 * kitT, k * MINE_CAP + 0.85 * kitT, 0.9, 2.8);   // the Mine's lamps
    for (const r of lv.near(top, bot)) if (r.key) light((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 1, 2.6);   // a gate's keystone glows
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
