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
// The rebound (owner, 2026-10-22: «отскок в такт»): a jump off a floor pressed as the hero lands (the jump buffer before it, `after` s after it) off a fall
// as fast as `min` of a jump or more goes up to `1 + k` times as high (a fall from a jump's top: 1.5), the faster the fall the higher; `hint`: hard
// landings without one before the hint says how
const REBOUND = { min: 0.6, after: 0.08, k: 0.5, hint: 3 };
// The hero's face as a cue (owner, 2026-10-22: «лицо героя как подсказка»), out of what Gum's face has (its look, frown, wide eyes, surprise): it looks at
// the nearest danger within `near` R (spikes, an enemy, a blob, the fire's top) and frowns, eyes wide inside `scare` R; a chain paid, `joy` s of
// wide eyes looking up; after a fall, `dizzy` s of its eyes going round, frowning
const FACE = { near: 4, scare: 2, joy: 1.2, dizzy: 1.2 };
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
const CAM = { anchor: 0.62, follow: 7, floorShow: 90, top: 70, deathPad: 40, keep: 3 };
const R_PER_M = 2.2;   // a metre of climb is 2.2 hero radii (64 px when the well was 12 tiles), so a level is as many jumps on any screen
const HEALTH = { start: 4, invuln: 1.0, knock: 520, hitstop: 0.08, blink: 0.09 };
// A run that ends can go on for coins: `price`, half as much again a world (as in the shops)
// and `grow` times more each time in a run; back with `hp` hearts and `invuln` s of safety.
const REVIVE = { price: 50, grow: 2, invuln: 2.5 };   // a revive gives all the hearts back (user)
// A stomp bounces the hero at `bounce` of a jump's speed; `blast` (R) is the Blast upgrade's reach. `bounce` was 1.0, then 0.8: the user found the hop off
// a kill too high.
// A stomp: the hero's feet over the enemy's middle (overFoe: all its top half, the tester could not tell the old cone's edge), not going up into it faster
// than `rel` px/s, or falling onto it while over its middle at all; else a touch hurts. On level ground the feet are at the floor, under any enemy's middle,
// so a touch from the side always hurts (742dd52 weighed the two middles: a squat one's side, a crawler's as it pulsed, came and went as a stomp). An enemy
// that can be stomped looks scared with the hero over it within `look` R (Game.frame), and cross otherwise.
const STOMP = { bounce: 0.7, keepVx: 0.45, hitstop: 0.045, blast: 3.4, rel: -350, look: 3 };
const overFoe = (H, b) => H.maxY < b.cy;
const stompable = (H, b, rel) => { const dx = Math.abs(b.cx - H.cx), S = H.R + b.R; return (overFoe(H, b) && rel > STOMP.rel) || (b.cy > H.cy && rel > 60 && dx < 0.95 * S); };
// Candies, found once or twice a level (at `at` of its height, from..to), each kind for its own `time` s (+`plus` a Long charge).
const CANDIES = { plus: 2, at: [[0.22, 0.4], [0.58, 0.78]] };   // plus: s a candy lasts longer with 'long'; at: the parts of a level's height its candies are laid in (the fizz gun gone, owner 2026-10-22: «удалим пистолет, он лишний как смысл»)
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
// The astro (owner, 2026-10-20: «астро это другой бонус – игрок пролетает 20% уровня, по пути автоматом собирая все монеты и задания»): in `p` of
// the campaign's levels from the third (one at most, a level's own), at `at` of its height; taken, the hero flies up `lift` of the level at `v` of a
// jump through all, as through a boost ring (RING), in the astronaut's helmet, every coin and task on its way its own (Game.ringStep)
const ASTRO = { p: 0.35, at: [0.25, 0.6], lift: 0.2, v: 2.6, time: 30 };   // time: a bound only (the flight ends it)
// The bubble gum (owner, 2026-10-22: «жвачка-пузырь, конфета вместо пистолета»): for `time` s the hero is in a bubble floating up at `rise` R/s (its
// pace eased to it at `ease`/s), steered by the sides, stuck to nothing; a hit (spikes, an enemy, a blob, the fire) or a jump pops it with no heart lost,
// then `grace` s of a hit's safety; `size`: the bubble's R, the hero's
const BUBBLE = { time: 6, rise: 2.4, ease: 6, size: 1.7, grace: 0.8 };
// Wind (owner, 2026-10-22: «ветер: порывы сносят вбок, а заранее их показывают… летящие листья»): over a chunk a recipe's `wind` of them get, gusts across
// it `push` R/s² (half on a floor), `on` s of each blowing after `off` s of calm; `warn` s before a gust sakura petals start drifting its way, and through
// it they fly, with white streaks; a koinobori off the wall it blows from hangs limp in the calm, fills with the petals and flies with the gust (see the
// renderer); the hero's bubble goes with it too, a wall or a floor holds the hero
// Fire on the walls (owner, 2026-10-22: «где-то можно сделать огненные стены, а не пол. чтобы не давать по стенке подниматься спокойно… сейчас больше половины
// можно пропрыгать просто по стене»): a stretch of the shaft's wall (`len` tiles) in a share of a level's chunks (`share`, by the campaign's world, more
// further on; a recipe's `fireWalls` over it; none in a world's first level, a boss's or a bonus one) bursts into flame for `on` s after `off` s (under a hit's safety: one heart a burst at most), its embers
// glowing brighter `warn` s before. Touched then, or within its flames' `reach` tiles of it, it burns: a heart, thrown off. The wall is still climbed, in its beats
const FIREWALL = { share: [0.2, 0.2, 0.25, 0.3, 0.3, 0.35, 0.35, 0.4], on: 0.9, off: 2.0, warn: 0.6, reach: 0.7, len: [5, 8] };
const WIND = { push: 10, on: 2.2, off: 2.6, warn: 0.9, pole: 3.2 };   // pole: its koinobori's lowest height over the chunk's foot, in tiles
// The pestle for mochi (owner, 2026-10-22: «Пест для моти. В Деревне огромный пест бьёт по ступе. Попал под него — стал блином на пару секунд, медленный,
// зато пролезаешь под низкими балками; иногда это нужно нарочно»): a trip hammer, its lever on a post ('K' its head, raised; 'P' its post's foot; 'U' the
// mortar it pounds) lifts in `up` s, waits `hold` (its head shaking the last `shake`), comes down in `slam`, lies `rest`. Whoever is under it then is flat
// for `flat` s, no heart lost: at `slow` the pace, `jump` the height, no crouch jump, as flat as the body goes (`squeeze`), and still flat while a beam is close
// over it. 'L', a low beam: a block `beam` tiles shy of its tile's foot, so the way under it over a floor two rows down is 1.2 tiles, and only a flat hero fits
// (measured: flat 0.9 tiles tall, it goes under 1.1; crouched, 1.26, it needs 1.3; the body as it is, 1.6). `head`: the head's width, in tiles
// A trial room (owner, 2026-10-22: «Комнаты-испытания. Как тайник, но с целью на 15–20 секунд: «собери 10 монет», «не касайся пола», «растопчи пятерых»; за успех
// подарок»): a room behind a door (a recipe's `trial`: { at, goal }, its place up the level and its goal) where a clock starts `start` s after the hero comes in.
// Done in time, it pays `pay` coins, dropped in; not, the coins left there go. Either way its door closes behind the hero (one try). Goals: `coins`, `n` of the
// room's coins in `time` s (the other two, the floor and the stomps, to come)
const TRIAL = { coins: { n: 10, time: 15 }, pay: 20, start: 0.8 };
const MOCHI = { up: 1.4, hold: 0.5, shake: 0.35, slam: 0.08, rest: 0.6, flat: 2.2, slow: 0.5, jump: 0.6, squeeze: 1.4, beam: 0.2, head: 1.8 };
const MOCHI_P = MOCHI.up + MOCHI.hold + MOCHI.slam + MOCHI.rest;
// The mill (owner, 2026-10-22: «Мельница и качели. Водяное колесо с лопастями-платформами…»): a water wheel on its hub ('Q') with `n` boards round it, level as
// it turns (they hang off its rim, as a big wheel's cars do), `rad` tiles out, once round in `turn` s (2.2 tiles/s at the rim: under the 1 px a step a plank
// takes from below, see collideLevel), its rising side the way in's (a mirrored one turns the other way); its boards planks `w` tiles wide, `hang` under the rim
const MILL = { n: 4, rad: 3.5, turn: 10, w: 2.2, hang: 0.5 };
// The seesaw (owner, 2026-10-22: «…и доска-качели, которую наклоняет вес героя»): a beam on a post ('V' its pivot) with a seat at each end, `L` tiles out (a jump
// from one seat, with no run, reaches the other: at 4 tiles it fell short), planks `w` tiles wide, level. The hero's weight on a seat tips it down (`push` rad/s²,
// `damp` 1/s: 0.8 rad/s at most, 2.2 tiles/s at a seat) as far as `max` rad (1.2 tiles), the other seat up; left alone it comes back level, slowly (`spring`: a seat left up is still most of the way up when a jump off the other gets there)
const SEESAW = { L: 2.75, w: 3, max: 0.45, push: 2.4, damp: 3, spring: 2 };
function seatAt(sw, side) { return { x: sw.px + side * sw.L * Math.cos(sw.th), y: sw.py + side * sw.L * Math.sin(sw.th) }; }   // a seat's middle, its top (side -1 the left one; th > 0 tips the right one down)
function millAt(wh, i, t) { const a = wh.ph + (i / MILL.n) * TAU + wh.w * t; return { x: wh.cx + Math.cos(a) * wh.rad, y: wh.cy + Math.sin(a) * wh.rad + wh.hang, a }; }   // board i: its middle, its top
function forkSign(lv, p) {   // a campaign fork's sign (see the renderer): under the foot of its middle wall, pointing to the way with the big coins; none without them
  const t = lv.tile, mid = (lv.l + lv.r) / 2, big = lv.coins.filter((c) => c.v >= 5 && c.y > p.y0 && c.y < p.y1);
  const wall = lv.rects.find((r) => r.y0 >= p.y0 - 1 && r.y1 <= p.y1 + 1 && r.y1 - r.y0 >= 6 * t && r.x1 - r.x0 <= 3 * t && Math.abs((r.x0 + r.x1) / 2 - mid) < 2 * t);
  if (!wall || !big.length) return null;
  const x = (wall.x0 + wall.x1) / 2;
  return { x, y: wall.y1, d: big.reduce((a, c) => a + c.x, 0) / big.length > x ? 1 : -1 };
}
function mochiAt(kn, t) {   // a pestle's head at the level's time t (MOCHI): the height of its foot, whether it is on its way down or down, its shake
  const u = (t + (kn.ph || 0)) % MOCHI_P, a = MOCHI.up, b = a + MOCHI.hold, c = b + MOCHI.slam;
  if (u < a) { const e = u / a; return { y: kn.yHit + (kn.yUp - kn.yHit) * e * e * (3 - 2 * e), down: false, shake: 0 }; }
  if (u < b) return { y: kn.yUp, down: false, shake: u > b - MOCHI.shake ? Math.round(Math.sin(u * 90)) * PIX.size : 0 };
  if (u < c) { const e = (u - b) / MOCHI.slam; return { y: kn.yUp + (kn.yHit - kn.yUp) * e * e, down: true, shake: 0 }; }
  return { y: kn.yHit, down: true, shake: 0 };
}
const CANDY = { smash: SMASH, rainbow: RAINBOW, grow: GROW, swarm: SWARM, astro: ASTRO, bubble: BUBBLE };
// Folk along the way (user's picks): a blob in a cage on a ledge (`cageP` of levels, at `cage` of the height) that a touch
// sets free — it pays `coins`, or a heart, by turns; a trader on a ledge (`traderP`, at `trader`) with one thing for sale;
// now and then (`critterP` a chunk) a bat under a block or a bug on a ledge that keep `flee` R clear of the hero, harmless; in Tokyo a crow
// on a wire of `crowP` of its beats (WIRE), flying off as the hero comes near (owner).
// Laid by a generator of their own, so the shaft is laid as before; none in a bonus level.
const FOLK = { cage: [0.3, 0.55], cageP: 0.75, trader: [0.6, 0.85], traderP: 0.5, critterP: 0.3, crowP: 0.5, coins: 8, flee: 3 };
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
const CRITTER = {   // '#' the world's ink, 'w' white, 'k' black; a bat hangs and flaps, a bug walks, a crow sits on a wire and flies off (facing right; ...L mirrored)
  bat: ['#...#', '.###.', '#w#w#', '.###.', '..#..'], batUp: ['#.....#', '##.#.##', '.#w#w#.', '..###..'], batDown: ['..###..', '.#w#w#.', '##.#.##', '#.....#'],
  bug: ['..##.', '.#w##', '#.#.#'], bug2: ['..##.', '.#w##', '.#.#.'],
  // Tokyo's crow (the owner's pick, research/variants/tokyo-crow-1.png E, then smaller and finer, owner): black on the black night, read by a rim of
  // the world's ink all round it, a white glint of an eye, a heavy beak, a wing, legs to its wire; then two strokes of its wings
  crow: ['........................', '................###.....', '...............#kkk#....', '..............#kkwkk##..', '...........###kkkkkkk##.', '........###kkkkkkkkk#...', '.......#kkkkkkkkkkk#....', '......#kkkkkkkkkkk#.....', '.....#kkkkkkkk#kkk#.....', '.....#kkkkkk##kkk#......', '.....#kkkk##kkkkk#......', '.....#kkk#kkkkk##.......', '...##kkkkkkkkk#.........', '..#k#######k##..........', '.###.......#.#..........', '...........#.#..........'],
  crowUp: ['...####.................', '....#kk###..............', '.....#kkkk##............', '......##kkkk##...####...', '........#kkkkk###kkkk##.', '.#######kkkkkkkkkkkwkkk#', '#kkkkkkkkkkkkkkkkkkkkk#.', '#kkkk#kkkkkkkkkkk#kkk#..', '.####.###kkkkk###.###...', '.........#####..........', '........................', '........................', '........................'],
  crowDown: ['........................', '........................', '........................', '.................####...', '........#########kkkk##.', '.#######kkkkkkkkkkkwkkk#', '#kkkkkkkkkkkkkkkkkkkkk#.', '#kkkk#kkkkkkkkkkk#kkk#..', '.####.#kkkkkkkkk#.###...', '.......#kkkkkk##........', '......#kkkkk##..........', '.....#kkk###............', '...######...............'] };
// Fuji's cranes (the owner's pick, research/variants/fuji-cranes-1-px.png A): a crane flying, its neck out, its legs trailing, wings up and down
CRITTER.craneUp = ['........#####...................', '.........######.................', '.....###########................', '.......#########................', '........#########...............', '......###########...............', '........#########........#####..', '.........#########.##########.##', '.........##############.........', '......#############.............', '.######...#######...............', '................................', '................................', '................................', '................................', '................................', '................................', '................................'];
CRITTER.craneDown = ['................................', '................................', '................................', '................................', '................................', '................................', '.........................#####..', '...........#######.##########.##', '.........##############.........', '......#############.............', '.######..#########..............', '........#########...............', '......###########...............', '........#########...............', '.......#########................', '.....###########................', '.........######.................', '........#####...................'];
for (const id of ['crow', 'crowUp', 'crowDown', 'craneUp', 'craneDown']) CRITTER[id + 'L'] = CRITTER[id].map((row) => [...row].reverse().join(''));
// Tokyo's power lines (THEMES.tokyo), in tiles: from crossarm to crossarm every `arm`, `drop` under it, one `inset` from the walls (owner: half as many
// as the two there were), sagging `sag`; wireY is its height at x, where a crow perches (FOLK.crowP of the beats).
const WIRE = { arm: 9, drop: 0.08, inset: 0.5, sag: 0.8 };   // drawn behind the shaft (DEPTH), the beams' and gondolas' cables too
// Tokyo's air conditioners (owner: not so often, and a ledge to stand on that gives way): one a wall every `beat` tiles, the walls `at` out of step,
// `w` x `h` tiles on a brace `brace` tall; a plank on its top which, stood on, rattles and falls `time` s later, for good (Level.addAircons, Level.update)
const AC = { beat: 24, at: [5, 17], w: 2.2, h: 1.4, brace: 0.9, time: 3, off: 0.25 };   // off: its gap from the wall, its pipes in it
// Tokyo's neon signs (THEMES.tokyo), one on a beat of 11 tiles, two in every three, the walls and the words in turn: neonSign is where sign k
// hangs (null: none, or a door in its way); the hero lights it by jumping close past it, and lit it stays, red or blue (owner: bright, glowing).
const NEON_SIGNS = [[['ラ', 'ー', 'メ', 'ン'], 'neonBowl'], [['ス', 'シ'], 'neonFish'], [['カ', 'ラ', 'オ', 'ケ'], 'neonMic']];
const neonSign = (lv, k) => {
  const mod = (a, n) => ((a % n) + n) % n;
  if (mod(k, 3) === 2) return null;
  const t = lv.tile, P = PIX.size, kk = Math.max(1, Math.round((0.9 * lv.R) / (16 * P))), gw = 16 * kk * P, sw = gw + 6 * P, [word, pic] = NEON_SIGNS[mod(k - Math.floor(k / 3), 3)];
  const left = mod(k, 2) === 0, x0 = left ? lv.l + 0.7 * t : lv.r - 0.7 * t - sw, y0 = k * 11 * t + 3.5 * t, y1 = y0 + (word.length + 0.9) * gw + 6 * P;
  const ax0 = left ? lv.l : x0, ax1 = left ? x0 + sw : lv.r;
  if (lv.bubbles.some((b) => b.x1 + t > ax0 && b.x0 - t < ax1 && b.y1 > y0 - 0.3 * t && b.y0 - t < y1 + 0.2 * t)) return null;   // nothing covers a door (owner)
  return { k, word, pic, kk, gw, sw, left, x0, x1: x0 + sw, y0, y1, ink: Math.imul(k, 2654435761) >>> 31 ? PAL.red : PAL.blue };
};
const NEON_REACH = 3;   // in R: a sign lights with the hero this near it (as near as a crow lets it come, FOLK.flee)
const neonIn = (lv, s) => s.y1 > lv.capY + 0.5 * lv.tile && s.y0 < lv.floor - 0.5 * lv.tile;   // a sign the hero can get to: some of it between the level's floor and its cap
const neonSigns = (lv) => { const b = 11 * lv.tile, out = []; if (!Number.isFinite(lv.capY)) return out; for (let k = Math.floor(lv.capY / b) - 1; k * b < lv.floor; k++) { const s = neonSign(lv, k); if (s && neonIn(lv, s)) out.push(s); } return out; };   // (a level all laid: Game.buildLevel)
const YAEN = { frame: 2.3, wheel: 0.62 };   // the Village's yaen (a moving plank): its frame's height over its floor and its pulley's over that, in tiles (its cable runs there)
// The kits' things on the ledges, one a ledge at most, the same for the game and the renderer (as neonSign is): the Village's (a sakura, a scarecrow, a
// little shrine whose stone lantern the hero lights, koinobori), the Mine's (a lamp on the wall the hero lights, a vein of ore, a cart, tools, a winch), Mount Fuji's bell
// off a boardwalk's free end (the hero rings it). kitThing(lv, r) is { kind, x, y } (x, y: where the hero tends it) or null, worked out once from the level
// as laid, on steady ledges' wall ends where nothing laid stands in front (what crumbles away for a while does not count: nothing comes and goes).
const KIT_TEND = { lantern: 'lantern', bell: 'bell', lamp: 'lamp', lighthouse: 'lighthouse' };   // the task a thing is (Game.setTasks, Game.task), owner: lanterns, bells, the Mine's lamps, the Sea's lighthouses
const KIT_REACH = NEON_REACH;   // in R: the hero this near a thing tends it, as the neon
const kitThing = (lv, r) => {
  if (r.kit !== undefined) return r.kit;
  if (lv.kind !== 'well') return (r.kit = null);   // (a shaft's: none in a boss's arena or a room)
  const th = lv.theme, t = lv.tile, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, d = wl ? 1 : -1, wx = wl ? lv.l : lv.r, b = r.y0, w = r.x1 - r.x0, X = (u) => wx + d * u * t;
  const clear = (x0, y0, x1, y1) => !lv.bubbles.some((q) => q.x1 + t > x0 && q.x0 - t < x1 && q.y1 > y0 && q.y0 - t < y1) && !lv.rects.some((q) => !q.cap && q.x1 > x0 && q.x0 < x1 && q.y1 > y0 && q.y0 < y1);
  const room = (u0, u1, h) => clear(Math.min(X(u0), X(u1)), b - h * t, Math.max(X(u0), X(u1)), b - 1);   // clear over the ledge from u0 to u1 tiles out, h up
  const steady = (min) => !(r.cap || r.plank || r.move || r.crumble || r.spring || r.key || r.crack || r.cage || r.slick || r.magnet) && (wl || wr) && !(wl && wr) && w >= min * t   // (a row across the shaft is a way through: the tutorial's helmet breaks one)
    && !lv.folk.some((f) => f.rect === r && (f.kind === 'cage' || f.kind === 'trader'));
  let out = null;
  if (th.village) {   // by a hash of its height, so that two ledges a beat apart are not alike
    const k = Math.floor(((Math.imul(Math.round(b / t), 0x9e3779b1) >>> 0) / 4294967296) * 6);
    if (r.kitWant === 'lantern' && steady(4) && room(0, 4, 4.4)) out = { kind: 'lantern', x: X(0.63), y: b - 1.3 * t };   // asked for by its chunk (CHUNKS kit)
    else if (k === 0 && steady(2.6) && room(0, 4.6, 4.9)) out = { kind: 'sakura' };
    else if (k === 1 && steady(3) && room(0, 3.5, 3.8)) out = { kind: 'scarecrow' };
    else if (k === 2 && steady(4) && room(0, 4, 4.4)) out = { kind: 'lantern', x: X(0.63), y: b - 1.3 * t };
    else if (k === 4 && steady(2.2) && room(0, 4.4, 5.3)) out = { kind: 'koinobori' };
    if (out && out.kind !== 'lantern' && lv.rc && lv.rc.sparse) {   // a `sparse` level's: one a band of about two screens (the shrines, the task, aside)
      const band = Math.floor((lv.floor - b) / (50 * t)), used = (lv.propBands = lv.propBands || new Set());
      if (used.has(band)) out = null; else used.add(band);
    }
  } else if (th.mines) {   // the Mine's by a hash of its height: a lamp on the wall over the ledge (the hero lights it: a task, and then a light), a vein of ore
    // in the wall behind it, a cart on its rails, the miners' tools, a winch
    const k = Math.floor(((Math.imul(Math.round(b / t) + 3, 0x9e3779b1) >>> 0) / 4294967296) * 6);
    const half = ((Math.imul(Math.round(b / t) + 7, 0x85ebca6b) >>> 0) / 4294967296) < 0.5;   // the props but the lamps (a task) on half their ledges: about four in six with
    // a thing on them, as the Village (the rule book's detail: «Сократить до 4 из 6»)
    if ((k === 0 || k === 3) && steady(1.8) && room(0, 1.6, 2.6)) out = { kind: 'lamp', x: X(0.5), y: b - 2.0 * t };
    else if (half && k === 1 && steady(2.6) && room(0, 2.6, 2.0)) out = { kind: 'cart' };
    else if (half && k === 2 && steady(2.4) && room(0, 2.2, 2.0)) out = { kind: 'ore' };
    else if (half && k === 4 && steady(2.4) && room(0, 2.4, 2.0)) out = { kind: 'tools' };
    else if (half && k === 5 && steady(3.0) && room(0, 2.8, 3.4)) out = { kind: 'winch' };
  } else if (th.sea) {   // the Sea's props by a hash of its height (see its back layer)
    const k = Math.floor(((Math.imul(Math.round(b / t) + 7, 0x9e3779b1) >>> 0) / 4294967296) * 6), fx = wl ? r.x1 : r.x0;
    if (k === 0 && steady(3.3) && room(0, 3.4, 5.4)) out = { kind: 'lighthouse', x: X(2.3), y: b - 3.5 * t };   // (its lamp's place: the task's, see its drawing)
    else if (k === 1 && steady(4.2) && room(0, 4.3, 2.9)) out = { kind: 'net' };
    else if (k === 2 && steady(2.2) && clear(Math.min(fx, fx - d * 1.0 * t), b - 2.2 * t, Math.max(fx, fx - d * 1.0 * t), b - 1)) out = { kind: 'gull' };
    else if (k === 3 && steady(2.8) && room(0, 2.7, 2.6)) out = { kind: 'octopus' };
    else if (k === 4 && steady(3) && room(0, 3, 4.9)) out = { kind: 'flags' };
  } else if (th.skazka) {   // the Dark Forest's: Baba Yaga's fence (its skulls' eyes the dark's lights) by a hash of its height, on two ledges in six with room
    const k = Math.floor(((Math.imul(Math.round(b / t) + 13, 0x9e3779b1) >>> 0) / 4294967296) * 6);
    if ((k === 0 || k === 3) && steady(3.2) && room(0, 3.2, 3.5)) out = { kind: 'fence' };
  } else if (th.fuji && r.plank && !r.move && !r.bouncy && !r.slick && !r.crumble && !r.crack && wl !== wr && w >= 3 * t
    && ((Math.imul(Math.round(b / t) + 5, 0x9e3779b1) >>> 0) / 4294967296) < 1 / 3) out = { kind: 'bell', x: wl ? r.x1 - 0.2 * t : r.x0 + 0.2 * t, y: r.y1 + 0.4 * t };   // (on one
    // boardwalk in three: what hangs off a ledge, the rule book's)
  return (r.kit = out);
};
const wireY = (lv, k, x) => { const t = lv.tile, x0 = lv.l + WIRE.inset * t, u = (x - x0) / (lv.r - lv.l - 2 * WIRE.inset * t); return (k * WIRE.arm + WIRE.drop) * t + WIRE.sag * t * 4 * u * (1 - u); };   // the kinds of candy; each lasts its `time` (+ CANDIES.plus a Long charge; all 3 s longer than at first, user)
// Combo rewards, paid when the hero lands on a floor; the best one reached counts.
const COMBO = [{ at: 3, coins: 10 }, { at: 5, coins: 25 }, { at: 8, coins: 50, hp: 1 }];
// A level's stars: one for getting out, the second for `half` its coins, the third for all of them (enemies do not
// count, user); `coins` pays for 1, 2, 3.
const STARS = { coins: [1, 2, 5], half: 0.5 };
// The mastery medals (owner, 2026-10-22: «Медаль мастерства. По желанию: пройти уровень на время или без урона»): two a campaign level, apart from its stars,
// kept once won: `time`, out by its hole within its par, and `clean`, with no heart lost. The par is its height at `perM` s a metre, up to a `step`, `min` at the
// least (a recipe's `par` over it): a first guess, to tune by playing. By the bot's sweep it is never under 1.4 times the bot's time, about twice it as a rule
const MEDAL = { perM: 0.5, step: 5, min: 20 };
// Coins: radius and magnet reach in R. An enemy's burst out at `burst` px/s and after `home` s
// home in on the hero from anywhere, at `seek` px/s more than its own pace (three times that a
// second on), turning at `steer`/s: they always get to it.
const COIN = { r: 0.54, magnet: 2.6, drag: 2.4, burst: 260, home: 0.25, seek: 600, steer: 10, twinkle: [0.3, 1.3] };   // a coin the magnet reaches homes in as an enemy's does (user: faster); twinkle: a five's, s on of each s (the renderer)
// Coins hover clear of what they are laid by (owner, 2026-10-22: «монеты и другие бонусы не должны соприкасаться с платформами, они как бы парят над ними на
// минимальном расстоянии, не соприкасаясь даже под углом»). A coin's radius is over half a cell, so one in a cell's middle touched the ledge under it (half of
// all coins did). Level.clearBonuses moves each `gap` game pixels clear of ledges, blocks, a mover's whole way and the walls, corners too: up first, else
// down, aside or up aside, a game pixel at a time, `reach` tiles at most; with no room there it is not laid. A seesaw's and a mill's seats come and go:
// not counted. Candies already hover.
const BONUS_GAP = { gap: 2, reach: 0.6 };
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
// The Puck (BOSSES.puck, Fuji's): it slides the ice at `slide` R/s, flicking a shell out every `every` s (as many as
// `shells` by phase); rests `rest` s, winds up `wind` s (backing off, flat, flashing) and dashes wall to wall at `dash`
// R/s, its wall shaking `icicles` down by phase: one, and only in its last (owner, 2026-10-20: worlds 1-3 not hard; the
// icicles were most of the hearts it took). Its top is hard; a shell rolled into it turns it belly up for `flip` s.
// It keeps still its first `calm` s, while its name is up (the plan: an encounter starts safe).
// The Minecart (BOSSES.cart, the Cave's): `size` R, rides its rail end to end in `pass` s by phase, lobs blobs (two from its
// second phase) every `spit` s after winding up `wind` s, creaks `creak` s at an end and tips three rocks (`rock` R) down.
// From its second phase the bridges go in `crumble[0]` s and come back in `crumble[1]`; in its third the lifts run `lifts` times as fast.
// In its arena a ceiling holds `hold` s longer: time to hang over a rail's end and wait for it. It keeps still its first `calm` s.
const CART = { size: 2.2, pass: [4, 3.4, 2.6], spit: 2.5, wind: 0.6, creak: 0.8, rock: 0.35, crumble: [0.35, 4.5], lifts: 1.5, hold: 2, calm: 2.5 };
const PUCK = { slide: 3.2, every: 4, shells: [1, 2, 2], rest: [2.6, 2, 0.8], wind: 0.7, dash: [13, 17, 21], icicles: [0, 0, 1], flip: 2.5, calm: 2.5 };

// ── Looks ────────────────────────────────────────────────────
// The canvas is pixel art: one game pixel is `size` CSS px (the canvas is that much smaller
// and scaled up with hard edges), the camera moves in whole game pixels, and everything is
// drawn in the nine inks of the palette sheet (research/refs), flat or as 1-bit patterns
// of one ink over another.
const PIX = { size: matchMedia('(pointer: coarse)').matches ? 1.5 : 2 };   // a phone's screen is small and sharp: finer there (1 was too fine)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PAL = { black: hex('#141414'),   // a tone lighter and brighter than at first (user)
  red: hex('#f43e34'), blue: hex('#5bb8ff'), yellow: hex('#ffed57'), green: hex('#339c39'),
  purple: hex('#c996ff'), orange: hex('#faa23e'), gray: hex('#c8c8c8'), white: hex('#f3f3f3'),
  aqua: hex('#6fe0ee') };   // the tenth ink, last (white stays PAL[8]): the Sea's turquoise sky blue (owner, 2026-10-20: research/variants/sea-ink-swatches.png D)
// 80/20: the world in its one ink, and the bright inks mean something: yellow is what can be
// taken (coins, items), red is danger (enemies, spikes, fire), white the hero and the edges; a
// surface that behaves differently (ice, moss, rubber, crumbling, moving, springs) has a colour of its own.
const INK = { spike: PAL.red, coin: PAL.yellow, coinD: PAL.orange, fire: PAL.red, flame: PAL.orange, white: PAL.white, dark: PAL.black };
// The camera's depth: three planes, by how bright each may be over the black of the well (owner, 2026-10-19: the wires and what is behind
// no more than a quarter over it). The play, in front, in full ink: all the hero touches or must read (ledges and what is one, an air
// conditioner, an awning, a gondola; the walls, hazards, coins, doors, the bodies). Props, in the middle: what stands on or hangs off the
// play and plays no part, solid, no white or yellow but a light's own core; a light lit (a lamp, a neon once passed) `lit` of the way from
// the black to its ink. Behind the shaft: poles, wires and cables, crossarms, props, posts and pipes up the walls, fire escapes, mullions,
// the far layer's windows, clouds and dots: `back` of the way at most, one ink, no white, the least detail. A feature drawn at alpha 1 + x
// is such a tone, solid (FEAT_FS): DIM for what is behind, LIT for a light.
const DEPTH = { lit: 0.6, back: 0.25 }, DIM = 1 + DEPTH.back, LIT = 1 + DEPTH.lit;
const RAINBOW_INK = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'].map((id) => PAL[id]);   // the one thing in all the inks at once
const FOE_COLOR = {
  red: { id: 'red', base: PAL.red, deep: PAL.black },
  boss: { id: 'boss', base: PAL.purple, deep: PAL.black },
  goo: { id: 'goo', base: PAL.black, deep: PAL.gray },   // a skull's black goo (the user's picture)
  gray: { id: 'gray', base: PAL.gray, deep: PAL.black },   // the Dark Forest's enemies (black and white, their eyes lit)
};
// The red enemies' paint, five ways till the owner picks one (owner, 2026-10-22: «Не обязательно всех врагов красить в красный полностью. Они могут быть
// частично окрашены случайно или быть белыми и иметь красную текстуру тени (сейчас черная) поверх… враги могут краснеть при приближении героя»), `?paint=`:
// A red, shaded black (as they were); B white, shaded red; C B with red patches of its own, as a kohaku carp's (its face left white the longest); D B
// going red as the hero comes from `far` to `near` R of it, patches growing over it till it is all A's; E C going red so. A patch is where its field
// (paintField, the body shader's: three waves of its own phases over the body, riding with it) is over a level: `spots` for C's, `none` none, `all` all.
// The owner's pick (2026-10-22: «60% красные, остальные 20 и 20 красные пятна и краснеют рядом»): each enemy draws its paint once, by `mix`; ?paint= sets one for all.
const FOE_PAINT = { v: ((/[?&]paint=([a-e])\b/i.exec(location.search) || [])[1] || '').toUpperCase() || null, mix: [['A', 0.6], ['C', 0.2], ['D', 0.2]], far: 7, near: 2, spots: 0.6, none: 3.5, all: -5.5 };
const PAINT_ALL = new Float32Array([-99, 0, 0]);   // (any other body: its colour all over, as before)
const paintField = (x, y, p) => { const v = y - 0.05; return Math.sin(x * 3.3 + p[1]) + Math.sin(y * 2.9 + p[2]) + Math.sin((x - y) * 2.1 + 1.7 * p[1]) - 2.4 * Math.exp(-5 * (x * x + v * v)); };
const paintPick = () => { let u = Math.random(); for (const [v, w] of FOE_PAINT.mix) if ((u -= w) < 0) return v; return 'A'; };
const foePaint = (e, H) => {   // uPaint: the level, the field's two phases
  const P = FOE_PAINT, v = e.paintV || (e.paintV = P.v || paintPick()), p = e.paint || (e.paint = new Float32Array([0, Math.random() * TAU, Math.random() * TAU])), b = e.body;
  const near = v === 'D' || v === 'E' ? clamp((P.far - (Math.hypot(b.cx - H.cx, b.cy - H.cy) - H.R - b.R) / H.R) / (P.far - P.near), 0, 1) : 0, from = v === 'C' || v === 'E' ? P.spots : P.none;
  p[0] = v === 'A' ? -99 : from + (P.all - from) * near;
  return p;
};
// A world in one ink over black for its walls, ledges and far dots, with white for the edge you
// stand on; the surfaces that behave differently in colours of their own (`o` picks others where
// the usual one is the world's ink): ice, moss, rubber, crumbling blocks, movers, springs.
const theme = (ink, o = {}) => ({ top: PAL.black, bot: PAL.black, dots: ink, wall: ink, wallD: PAL.black, lip: PAL.white, block: ink, plank: ink,
  slick: o.ice || PAL.blue, moss: PAL.green, rubber: o.rubber || PAL.purple, crumble: o.crumble || PAL.orange, mover: o.mover || PAL.blue, spring: o.spring || PAL.purple });
const THEMES = {
  cave: Object.assign(theme(PAL.gray), { mines: true }), ice: Object.assign(theme(PAL.blue, { ice: PAL.white, crumble: PAL.gray, mover: PAL.purple }), { fuji: true }), mine: Object.assign(theme(PAL.orange, { crumble: PAL.gray }), { village: true }),   // the Village's kit (see villageRect; the Mine's world, its id kept)
 
  void: theme(PAL.purple, { rubber: PAL.blue, spring: PAL.blue, mover: PAL.gray }), summit: theme(PAL.gray), room: theme(PAL.orange, { crumble: PAL.gray }),
  stash: theme(PAL.purple, { rubber: PAL.blue, spring: PAL.blue, crumble: PAL.gray }),   // in the purple of its door (user)
  tokyo: Object.assign(theme(PAL.purple, { ice: PAL.white, crumble: PAL.gray, mover: PAL.blue }), { dots: PAL.black, town: true }),   // Tokyo's town at night (see TOKYO), purple (owner: blue went with Fuji's;
  // the Tokyo flag's, a dusk over the city), its gondolas blue; a plain black night, no dots (owner: they were noise)
  blocks: Object.assign(theme(PAL.gray, { mover: PAL.blue, spring: PAL.blue }), { win: 'grid', panels: true }),   // the Tower Blocks: raw concrete (see BLOCKS)
  sea: Object.assign(theme(PAL.aqua, { ice: PAL.white, crumble: PAL.gray, mover: PAL.orange }), { sea: true }),   // the Sea (see SEA): white wet rock you slip on, green seaweed you hold, orange boats, grey rafts
  skazka: Object.assign(theme(PAL.gray, { crumble: PAL.gray, mover: PAL.gray, spring: PAL.white, rubber: PAL.white }), { moss: PAL.white, skazka: true }),   // the Dark Forest (see SKAZKA): black and white (owner), white cobwebs you hold; what
  // crumbles or flies tells itself by its shape (a rotten log, Baba Yaga's mortar); colour only for the hero, lights, coins, danger and the doors' marks
  junk: Object.assign(theme(PAL.green, { ice: PAL.gray, mover: PAL.blue, spring: PAL.black, crumble: PAL.orange }), { moss: PAL.gray, plank: PAL.orange, win: 'brick', junk: true }),   // the Junkyard (see JUNK)
  sky: Object.assign(theme(PAL.purple, { mover: PAL.blue, spring: PAL.blue, rubber: PAL.blue, crumble: PAL.white }), { dots: PAL.gray, win: 'clouds', glass: true }),   // the Skyscraper (see SKY)
  crypt: Object.assign(theme(PAL.white, { crumble: PAL.gray, mover: PAL.gray, spring: PAL.gray }), { bot: PAL.gray, grad: true, wall: PAL.gray, drips: true }),   // the Crypt: black above dithering down to grey, white stone, black goo dripping off it (the user's skull picture)
};
// Gum's looks in the same inks: the hero's colours (the first is the default) and the face.
PALETTE.splice(0, PALETTE.length, ...['white', 'orange', 'blue', 'green', 'purple'].map((id) => ({ id, base: PAL[id], deep: PAL.black })));
Object.assign(THEME, { ink: PAL.black, blush: PAL.red, rim: PAL.white });
const KOLOBOK = { id: 'kolobok', base: PAL.orange, deep: PAL.black };   // the hero in the Dark Forest (owner): an orange bun, a white rim, his face by the variant

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
  kikimora: { design: 'tengu', color: 'goo', size: 0.95, grav: 0, stomp: true, coins: 4, speed: 46, step: 0.7, move: 'wall', chase: true, leap: true },   // the Dark Forest's climber, a Kikimora (FOREST_V)
  leshy: { design: 'slug', color: 'goo', size: 0.95, grav: 0, stomp: true, coins: 5, speed: 54, step: 0.8, move: 'round', lap: true },   // the Dark Forest's circler, a Leshy (FOREST_V)
  hedgehog: { design: 'star', color: 'red', size: 0.8, grav: 1, stomp: false, coins: 6, speed: 46, step: 0.7, move: 'crawl' },
  shell: { design: 'dome', color: 'red', size: 0.82, grav: 1, stomp: true, coins: 4, speed: 44, step: 0.8, move: 'crawl' },
  spitter: { design: 'drop', color: 'red', size: 0.8, grav: 1, stomp: true, coins: 5, speed: 38, step: 0.7, move: 'crawl' },
  splitter: { design: 'peanut', color: 'red', size: 1.0, grav: 1, stomp: true, coins: 2, speed: 34, step: 0.9, move: 'crawl' },
  mini: { design: 'mochi', color: 'red', size: 0.5, grav: 1, stomp: true, coins: 2, speed: 80, step: 0.4, move: 'crawl' },
  chaser: { design: 'slug', color: 'red', size: 0.74, grav: 0, stomp: true, coins: 5, speed: 70, step: 0.5, move: 'wall', chase: true },
  worm: { design: 'round', color: 'red', size: 0.85, grav: 1, stomp: true, coins: 6, speed: 0, step: 0.9, move: 'flow' },   // a knot of tubes, flowing ledge to ledge (WORM)
  skull: { design: 'dome', color: 'goo', size: 1.1, grav: 1, stomp: true, coins: 5, speed: 40, step: 0.8, move: 'crawl' },   // a skull in black goo, dripping (SKULL; the Crypt's)
  // the square ones (owner, 2026-10-22: «еще нужны квадратные враги», all three he picked): jelly cubes ('cube')
  tumbler: { design: 'cube', color: 'red', size: 0.8, grav: 1, stomp: true, coins: 4, speed: 0, step: 1, move: 'tumble' },   // a yokan somersaulting along its ledge (TUMBLE)
  tofu: { design: 'cube', color: 'red', size: 0.95, grav: 1, stomp: true, coins: 2, speed: 32, step: 0.9, move: 'crawl' },   // a soft cube: stomped, it falls into four (TOFU)
  tofuMini: { design: 'cube', color: 'red', size: 0.45, grav: 1, stomp: true, coins: 1, speed: 70, step: 0.45, move: 'crawl' },
  nurikabe: { design: 'cube', color: 'red', size: 1.1, grav: 0, stomp: true, coins: 6, speed: 0, step: 1, move: 'crush' },   // a wall yokai hanging over its ledge, it drops on the hero under it (CRUSH)
};
// A tumbler: sits `rest` s on its ledge (crouching its last `crouch`), then somersaults `hop` R ahead, up and over in `air` s, turning at the ledge's end. Sitting it
// is stomped; in the air its corners hurt. A nurikabe: hangs `up` tiles over its ledge (less if a ceiling is nearer); the hero under it (within `reach` R of its
// sides), it shakes `warn` s, falls at `fall` times gravity, lies `down` s (stomped only then; from over it before, the hero bounces off its top), rises at
// `rise` R/s. A tofu stomped: `n` small ones, thrown apart
const TUMBLE = { rest: 1.1, crouch: 0.3, air: 0.45, hop: 2.4 };
const CRUSH = { up: 3.6, reach: 1.2, warn: 0.55, fall: 3, down: 1.4, rise: 2.2 };
const TOFU = { n: 4 };
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
  kikimora: { en: 'Creeps the walls and leaps at you.', es: 'Trepa las paredes y salta hacia ti.', pt: 'Sobe as paredes e salta em você.', ja: 'かべを はい、とびかかって くる。' },
  leshy: { en: 'Leads you round in circles.', es: 'Te hace dar vueltas.', pt: 'Faz você andar em círculos.', ja: 'ぐるぐる まわって まよわせる。' },
  hedgehog: { en: 'Red and prickly: never stomp it.', es: 'Rojo y con púas: no lo pises.', pt: 'Vermelho e espinhoso: não pise.', ja: 'トゲトゲ: ふんでは だめ。' },
  shell: { en: 'Stomped, it rolls into the others.', es: 'Pisado, rueda contra los demás.', pt: 'Pisado, rola contra os outros.', ja: 'ふむと ころがって ぶつかる。' },
  spitter: { en: 'Lobs blobs at you. Dodge, then stomp.', es: 'Te lanza bolas. Esquiva y pisa.', pt: 'Atira bolas em você. Desvie e pise.', ja: 'たまを なげる。よけて ふもう。' },
  splitter: { en: 'Stomp it and it splits in two.', es: 'Písalo y se parte en dos.', pt: 'Pise e ele se divide em dois.', ja: 'ふむと ふたつに わかれる。' },
  mini: { en: "A splitter's half: small and quick.", es: 'Medio divisor: pequeño y rápido.', pt: 'Metade de um divisor: pequeno e rápido.', ja: 'ブンレツの かたわれ。はやい。' },
  chaser: { en: 'Crawls the walls up to your height.', es: 'Trepa las paredes hasta tu altura.', pt: 'Sobe as paredes até a sua altura.', ja: 'きみの たかさまで かべを のぼる。' },
  worm: { en: 'Stomp the knot, not the tubes!', es: '¡Pisa el nudo, no los tubos!', pt: 'Pise no nó, não nos tubos!', ja: 'むすびめを ふめ、くだは さけろ！' },
  tumbler: { en: 'Somersaults along its ledge. Stomp it as it sits.', es: 'Da volteretas por su saliente. Písalo cuando para.', pt: 'Dá cambalhotas na borda. Pise quando para.', ja: 'でんぐりがえしで すすむ。とまったら ふもう。' },
  tofu: { en: 'Stomp it and it falls into four.', es: 'Písalo y se parte en cuatro.', pt: 'Pise e ele vira quatro.', ja: 'ふむと よっつに わかれる。' },
  tofuMini: { en: "A quarter of a tofu: small and quick.", es: 'Un cuarto de tofu: pequeño y rápido.', pt: 'Um quarto de tofu: pequeno e rápido.', ja: 'とうふの かけら。はやい。' },
  nurikabe: { en: 'Drops on you from above. Stomp it once it lands.', es: 'Cae sobre ti. Písalo cuando aterriza.', pt: 'Cai em você. Pise quando ele pousa.', ja: 'うえから おちてくる。おちたら ふもう。' },
  skull: { en: 'Creeps in its goo, lunges up close.', es: 'Se arrastra en su baba; se lanza de cerca.', pt: 'Rasteja na gosma; ataca de perto.', ja: 'どろどろ はう。ちかいと とびかかる。' },
};
const FOE_NAMES = {
  crawler: { en: 'Crawler', es: 'Reptador', pt: 'Rastejante', ja: 'ハイハイ' }, climber: { en: 'Climber', es: 'Trepador', pt: 'Escalador', ja: 'カベノボリ' },
  circler: { en: 'Circler', es: 'Rondador', pt: 'Rondador', ja: 'グルグル' }, hedgehog: { en: 'Hedgehog', es: 'Erizo', pt: 'Ouriço', ja: 'ハリネズミ' },
  kikimora: { en: 'Kikimora', es: 'Kikimora', pt: 'Kikimora', ja: 'キキモラ' }, leshy: { en: 'Leshy', es: 'Leshy', pt: 'Leshy', ja: 'レーシー' },
  shell: { en: 'Shell', es: 'Caparazón', pt: 'Casco', ja: 'こうら' }, spitter: { en: 'Spitter', es: 'Escupidor', pt: 'Cuspidor', ja: 'ペッペ' },
  splitter: { en: 'Splitter', es: 'Divisor', pt: 'Divisor', ja: 'ブンレツ' }, mini: { en: 'Mini', es: 'Mini', pt: 'Mini', ja: 'チビ' },
  chaser: { en: 'Chaser', es: 'Perseguidor', pt: 'Perseguidor', ja: 'オイカケ' }, worm: { en: 'Worm', es: 'Gusano', pt: 'Minhoca', ja: 'ワーム' },
  skull: { en: 'Skull', es: 'Calavera', pt: 'Caveira', ja: 'ドクロ' },
  tumbler: { en: 'Tumbler', es: 'Volteretas', pt: 'Cambalhota', ja: 'ゴロゴロようかん' }, tofu: { en: 'Tofu', es: 'Tofu', pt: 'Tofu', ja: 'とうふ' },
  tofuMini: { en: 'Tofu bit', es: 'Trocito', pt: 'Pedacinho', ja: 'とうふの かけら' }, nurikabe: { en: 'Nurikabe', es: 'Nurikabe', pt: 'Nurikabe', ja: 'ぬりかべ' },
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
  { id: 'cave', name: { en: 'Mine', es: 'Mina', pt: 'Mina', ja: 'こうざん' }, theme: THEMES.cave, heights: [30, 38, 46], fire: 0.4, bouncy: 0.2,   // the Mine since 2026-10-21 (owner: «мир темной пещеры, рудников японии»; the Cave before)
    chunks: { stairs: 4, planks: 3, shelves: 2, pillars: 3, rest: 1, comb: 2, overhang: 1, chimney: 1, spring: 1, crumble: 1, mosswall: 2, fork: 1, vault: 2 },
    foes: 0.55, enemies: { crawler: 3, climber: 1, hedgehog: 1 },
    intro: [{ chunks: ['mosswall', 'spring'], enemies: ['crawler'], candy: ['smash', 'rainbow'], news: { en: 'moss and springs', es: 'musgo y resortes', pt: 'musgo e molas', ja: 'コケと バネ' } },
      { chunks: ['crumble', 'rubberwall'], enemies: ['crawler', 'climber'], candy: ['smash', 'bubble'], news: { en: 'crumbling blocks, rubber and climbers', es: 'bloques que se caen, goma y trepadores', pt: 'blocos que desmoronam, borracha e escaladores', ja: 'くずれる ブロック、ゴム、カベノボリ' } },
      { chunks: ['icewall', 'lift'], news: { en: 'ice, moving planks and hedgehogs', es: 'hielo, tablas móviles y erizos', pt: 'gelo, tábuas móveis e ouriços', ja: 'こおり、うごく いた、ハリネズミ' } }] },
  { id: 'ice', name: { en: 'Fuji', es: 'Fuji', pt: 'Fuji', ja: 'ふじ' }, theme: THEMES.ice, heights: [42, 50, 58], fire: 0.55, dark: [1],
    chunks: { icewall: 3, iceblocks: 3, stairs: 2, planks: 2, shelves: 1, pillars: 2, comb: 2, chimney: 2, overhang: 1, spring: 1, twinshaft: 1, rest: 1, fork: 1, fork2: 1, vault: 1 },
    foes: 0.7, enemies: { crawler: 2, climber: 2, circler: 2, hedgehog: 1, shell: 2 }, intro: [{ news: { en: 'ice blocks, circlers and shells', es: 'bloques de hielo, rondadores y caparazones', pt: 'blocos de gelo, rondadores e cascos', ja: 'こおり ブロック、グルグル、こうら' } }] },
  // The Mine became the Village (owner, 2026-10-20: the Japanese countryside in spring); its id stays 'mine' (the saves, its music).
  { id: 'mine', name: { en: 'Village', es: 'Aldea', pt: 'Aldeia', ja: 'むら' }, theme: THEMES.mine, heights: [54, 62, 70], fire: 0.7, dark: [1], magnet: 0.25,
    chunks: { crumble: 3, bridge: 3, lift: 3, planks: 2, shelves: 2, spring: 2, spikes: 1, comb: 2, chimney: 1, movers: 1, rest: 1, stairs: 1, rubberwall: 2, mosswall: 1, fork2: 2, vault: 1 },
    foes: 0.8, enemies: { crawler: 2, climber: 2, circler: 2, hedgehog: 1, shell: 1, spitter: 2, splitter: 2, worm: 1, tumbler: 2, tofu: 1, nurikabe: 2 },   // (the square three: the campaign's 1-3, 1-4, 1-5)
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
// The Dark Forest's two attack with a warning (owner, 2026-10-21: «Кикимора прыгает со стены с метлой, Леший проносится вокруг блока, оба с
// предупреждением»): each stops `ready` s, shivering and flashing red (2.5 times a second: under WCAG's 3), attacks, then rests `every` s.
const KIKI = { reach: 4, level: 1.2, ready: 0.5, out: 2, leap: 0.45, every: 2.2 };   // a Kikimora: the hero this near (R) and level with her (R), she leaps `out` tiles off her wall at him in `leap` s
const LESHY = { near: 1.5, ready: 0.5, k: 4, every: 2.5 };   // a Leshy: the hero this near his block (R), he whirls once round it at k times his pace
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
// The Sea (owner, 2026-10-20: rivers, the sea and an island, between Fuji and Tokyo; its kit to the owner's picks, research/variants/sea-*): not in the
// campaign yet (UPwell's CAMP_ORDER), ?play=sea to look at it.
const SEA = Object.assign({}, WORLDS[1], { id: 'sea', name: { en: 'Sea', es: 'Mar', pt: 'Mar', ja: 'うみ' }, theme: THEMES.sea, dark: [], maxD: 2,
  chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2, comb: 2, chimney: 1, spring: 1, lift: 2, movers: 1, crumble: 2, bridge: 2, mosswall: 1, iceblocks: 1, rest: 1, vault: 1 },
  enemies: { crawler: 3, climber: 2, circler: 2, shell: 2 }, intro: [{}, {}, {}] });
// The Dark Forest (owner, 2026-10-20: a bonus world of scary Russian fairy tales, a dark forest with skulls, Baba Yaga, Kikimora, Koschei, Leshy, the stove;
// very gloomy, very scary, very dark; on its levels the hero is a Kolobok): dark on every level, its kit to the owner's picks (research/variants/skazka-*).
// It opens at 180 stars (CAMP_STARS), off the line; ?play=skazka to look at it.
const SKAZKA = Object.assign({}, WORLDS[1], { id: 'skazka', name: { en: 'Dark Forest', es: 'Bosque oscuro', pt: 'Floresta sombria', ja: 'くらい もり' }, theme: THEMES.skazka, dark: [0, 1, 2], maxD: 2,
  chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2, comb: 2, chimney: 1, spring: 1, lift: 1, movers: 2, crumble: 2, mosswall: 2, rest: 1, vault: 1 },
  enemies: { skull: 3, crawler: 2, kikimora: 1, spitter: 1, leshy: 1 }, intro: [{}, {}, {}] });   // its climber a Kikimora, its circler a Leshy (owner, 2026-10-20)
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
// `ink` its colour (owner, 2026-10-20: each its own; never red, it flashes red when hit, nor yellow or white: what can be taken, the hero).
// The Cork's dive went to the Village and the Minecart to the Cave (owner, 2026-10-20): the colours stayed with the worlds, the Village's boss blue, the Cave's orange.
const BOSSES = {
  // The Village's: a Bake-danuki on the Cork's dive, its name and lines its own (owner, 2026-10-20: the yokai of its look).
  probka: { name: { en: 'Bake-danuki', es: 'Bake-danuki', pt: 'Bake-danuki', ja: 'ばけだぬき' }, ink: 'blue', hp: 5, phase: (hp) => (hp >= 4 ? 0 : hp >= 2 ? 1 : 2),
    intro: [{ en: "One leaf, and I'm anyone.", es: 'Una hoja, y soy cualquiera.', pt: 'Uma folha, e sou qualquer um.', ja: 'はっぱ いちまいで なんにでも なれる。' },
      { en: 'Pon-poko! Hear my belly drum?', es: '¡Pon-poko! ¿Oyes el tambor de mi panza?', pt: 'Pon-poko! Ouve o tambor da minha barriga?', ja: 'ポンポコ！ おなかの たいこ きこえる？' },
      { en: 'This whole village is my trick.', es: 'Todo este pueblo es mi truco.', pt: 'Esta vila toda é um truque meu.', ja: 'この むら ぜんぶが わたしの いたずら。' }],
    quip: [{ en: 'Fooled you! Pon-poko!', es: '¡Te engañé! ¡Pon-poko!', pt: 'Te enganei! Pon-poko!', ja: 'だまされた！ ポンポコ！' },
      { en: 'A leaf beats a drop.', es: 'Una hoja gana a una gota.', pt: 'Folha vence gota.', ja: 'はっぱは しずくより つよい。' }],
    defeat: { en: 'Fine… my leaf has wilted.', es: 'Vale… mi hoja se marchitó.', pt: 'Tá bom… minha folha murchou.', ja: 'まいった… はっぱが しおれた。' } },
  // Fuji's: a Tsurara-onna on the Puck's slide (the plan's §5.4): over the ice, beaten by her own shells (PUCK, Boss.slide). The first three bosses'
  // five hearts and the Cork's phases (owner, 2026-10-20: her round body kept, the fight softened, worlds 1-3 not hard).
  puck: { name: { en: 'Tsurara-onna', es: 'Tsurara-onna', pt: 'Tsurara-onna', ja: 'つららおんな' }, ink: 'gray', design: 'dome', size: 2.4, slide: true, hp: 5, phase: (hp) => (hp >= 4 ? 0 : hp >= 2 ? 1 : 2),
    intro: [{ en: 'Cold hands. Colder heart.', es: 'Manos frías. Corazón más frío.', pt: 'Mãos frias. Coração mais frio.', ja: 'つめたい て。もっと つめたい こころ。' },
      { en: 'Stay a while. Freeze with me.', es: 'Quédate un rato. Congélate conmigo.', pt: 'Fique um pouco. Congele comigo.', ja: 'ゆっくり していって。いっしょに こおろう。' },
      { en: 'My icicles never melt.', es: 'Mis carámbanos nunca se derriten.', pt: 'Meus pingentes de gelo nunca derretem.', ja: 'わたしの つららは とけない。' }],
    quip: [{ en: 'Frozen solid. How pretty.', es: 'Congelado del todo. Qué bonito.', pt: 'Congelado inteiro. Que lindo.', ja: 'カチコチ。きれいね。' },
      { en: 'Shh. Winter is long here.', es: 'Shh. Aquí el invierno es largo.', pt: 'Psiu. Aqui o inverno é longo.', ja: 'しーっ。ここの ふゆは ながいの。' }],
    defeat: { en: 'Melting… so spring has come.', es: 'Me derrito… llegó la primavera.', pt: 'Derretendo… a primavera chegou.', ja: 'とけていく… はるが きたのね。' },
    top: { en: 'Hard on top. Roll a shell at her!', es: 'Arriba es dura. ¡Lánzale un caparazón!', pt: 'Em cima é dura. Role um casco nela!', ja: 'うえは かたい。こうらを ぶつけろ！' },   // the first bounce off its dome
    hint: { en: 'Flipped! Land on her belly!', es: '¡Volteada! ¡Salta en su panza!', pt: 'Virada! Pule na barriga!', ja: 'ひっくりかえった！ おなかに のれ！' },   // the first time it is turned
    how: { en: 'Roll a shell into her, then stomp her', es: 'Lánzale un caparazón y luego písala', pt: 'Role um casco nela e depois pise', ja: 'こうらを ぶつけて、ふもう' } },   // after three losses
  // The Cave's: a Tsuchigumo on the Minecart's rail (the plan's §5.5): open from above only; the way there is up the walls to the moss over its rail's ends.
  // The gentler of the two on a rail, as the earlier (owner, 2026-10-20: it and the Tram traded): the Cork's hits and phases, its passes and spits a quarter slower (slow).
  cart: { name: { en: 'Tsuchigumo', es: 'Tsuchigumo', pt: 'Tsuchigumo', ja: 'つちぐも' }, ink: 'orange', design: 'loaf', size: CART.size, rail: true, slow: 1.25, hp: 5, phase: (hp) => (hp >= 4 ? 0 : hp >= 2 ? 1 : 2),
    intro: [{ en: 'The dark down here is my web.', es: 'La oscuridad aquí es mi telaraña.', pt: 'O escuro aqui é minha teia.', ja: 'この くらやみは わたしの くものす。' },
      { en: 'Eight legs, one rail, no way out.', es: 'Ocho patas, un riel, sin salida.', pt: 'Oito patas, um trilho, sem saída.', ja: 'あし はっぽん、レール いっぽん、にげみち なし。' },
      { en: 'Nobody leaves my burrow.', es: 'Nadie sale de mi madriguera.', pt: 'Ninguém sai da minha toca.', ja: 'わたしの あなから だれも でられない。' }],
    quip: [{ en: 'Stuck in my web!', es: '¡Atrapado en mi telaraña!', pt: 'Preso na minha teia!', ja: 'くものすに ひっかかった！' },
      { en: 'Too slow for eight legs.', es: 'Muy lento para ocho patas.', pt: 'Lento demais para oito patas.', ja: 'はっぽんあしには おそすぎ。' }],
    defeat: { en: 'Ugh… back into my hole.', es: 'Uf… de vuelta a mi agujero.', pt: 'Ai… de volta pro meu buraco.', ja: 'うう… あなに もどる。' },
    hint: { en: 'Right under you: let go!', es: '¡Justo debajo: suéltate!', pt: 'Bem embaixo: solte!', ja: 'まっした！ はなせ！' },   // the first ▼ over it
    how: { en: 'Climb over it, then drop onto it', es: 'Sube por encima y déjate caer', pt: 'Suba acima dela e caia em cima', ja: 'うえへ のぼって、とびおりろ' } },   // after three losses
  // The Sea's (world 4): Onamazu, the earthquake catfish under the islands, the gods' stone (kaname-ishi) on its back (owner, 2026-10-21:
  // «сом изогнутый», boss-sea D): the Rat King's slide over wet rock (rc.ice), its stone the hard top.
  namazu: { name: { en: 'Onamazu', es: 'Onamazu', pt: 'Onamazu', ja: 'おおなまず' }, ink: 'orange', design: 'dome', size: 2.4, slide: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Who wakes me under the islands?', es: '¿Quién me despierta bajo las islas?', pt: 'Quem me acorda sob as ilhas?', ja: 'しまの したで ねてたのに。だれだ？' },
      { en: "The gods' stone holds me. Barely.", es: 'La piedra de los dioses me sujeta. Apenas.', pt: 'A pedra dos deuses me prende. Mal.', ja: 'かみの いしが おさえてる。ぎりぎりね。' },
      { en: 'Feel the ground shake!', es: '¡Siente temblar la tierra!', pt: 'Sinta o chão tremer!', ja: 'じめんが ゆれるぞ！' }],
    quip: [{ en: 'Shaken? That was a small one.', es: '¿Temblando? Ese fue pequeño.', pt: 'Tremendo? Esse foi pequeno.', ja: 'ゆれた？ いまのは ちいさいほう。' },
      { en: 'Splash. Back to the shallows.', es: 'Chof. De vuelta a la orilla.', pt: 'Tchibum. De volta pro raso.', ja: 'ザブン。あさせへ おかえり。' }],
    defeat: { en: '…The stone holds. I sleep again.', es: '…La piedra aguanta. Vuelvo a dormir.', pt: '…A pedra aguenta. Volto a dormir.', ja: '…いしが おもい。また ねむろう。' },
    top: { en: 'Hard stone. Roll a shell at it!', es: 'Piedra dura. ¡Lánzale un caparazón!', pt: 'Pedra dura. Role um casco nele!', ja: 'いしは かたい。こうらを ころがせ！' },
    hint: { en: 'Flipped! Land on its belly!', es: '¡Volteado! ¡Salta en su panza!', pt: 'Virado! Pule na barriga!', ja: 'ひっくりかえった！ おなかに のれ！' },
    how: { en: 'Roll a shell into it, then stomp it', es: 'Lánzale un caparazón y luego písalo', pt: 'Role um casco nele e depois pise', ja: 'こうらを ぶつけて、ふみつけろ' } },
  // World 7's: the Rat King (the Junkyard's): the Puck's slide over a greasy floor (its arena as the Puck's, rc.ice), round ears, a tail.
  rat: { name: { en: 'Rat King', es: 'Rey Rata', pt: 'Rei Rato', ja: 'ネズミの おう' }, ink: 'purple', design: 'dome', size: 2.4, slide: true, rat: true, hp: 6, phase: (hp) => (hp >= 5 ? 0 : hp >= 3 ? 1 : 2),
    intro: [{ en: 'Everything here is mine. Even you.', es: 'Todo aquí es mío. Incluso tú.', pt: 'Tudo aqui é meu. Até você.', ja: 'ここの ものは ぜんぶ おれの もの。おまえも。' },
      { en: 'Finders keepers.', es: 'El que lo encuentra se lo queda.', pt: 'Achado não é roubado.', ja: 'ひろった もの がち。' },
      { en: 'Squeak. Bow to the king.', es: 'Iiii. Inclínate ante el rey.', pt: 'Iii. Curve-se ao rei.', ja: 'チュー。おうに ひれふせ。' }],
    quip: [{ en: 'Into the bin with you.', es: 'Al contenedor contigo.', pt: 'Pra caçamba com você.', ja: 'ゴミばこへ どうぞ。' },
      { en: 'Squeak squeak. Again?', es: 'Iiii iiii. ¿Otra vez?', pt: 'Iii iii. De novo?', ja: 'チューチュー。もう いっかい？' }],
    defeat: { en: 'Take it… the trash is yours.', es: 'Tómalo… la basura es tuya.', pt: 'Pode levar… o lixo é seu.', ja: 'もってけ… ゴミは おまえの もの。' },
    top: { en: 'Hard on top. Roll a shell at it!', es: 'Arriba es duro. ¡Lánzale un caparazón!', pt: 'Em cima é duro. Role um casco nele!', ja: 'うえは かたい。こうらを ころがせ！' },
    hint: { en: 'Flipped! Land on its belly!', es: '¡Volteado! ¡Salta en su panza!', pt: 'Virado! Pule na barriga!', ja: 'ひっくりかえった！ おなかに のれ！' },
    how: { en: 'Roll a shell into it, then stomp it', es: 'Lánzale un caparazón y luego písalo', pt: 'Role um casco nele e depois pise', ja: 'こうらを ぶつけて、ふみつけろ' } },
  // The Sky's: a Karasu-tengu on the Cork's dive (hover, warn, dive, dazed, rise), flapping its wings.
  pigeon: { name: { en: 'Karasu-tengu', es: 'Karasu-tengu', pt: 'Karasu-tengu', ja: 'からすてんぐ' }, ink: 'gray', design: 'drop', pigeon: true, hp: 8, phase: (hp) => (hp >= 7 ? 2 : 3),
    intro: [{ en: 'The sky has a guard. Me.', es: 'El cielo tiene un guardián. Yo.', pt: 'O céu tem um guardião. Eu.', ja: 'そらには ばんにんが いる。わたしだ。' },
      { en: 'Caw! Climbers fall. Crows fly.', es: '¡Cra! Tú caes. Los cuervos vuelan.', pt: 'Cró! Você cai. Corvos voam.', ja: 'カァ！ のぼる ものは おちる。カラスは とぶ。' },
      { en: 'Show me your wings, climber.', es: 'Enséñame tus alas, escalador.', pt: 'Mostre suas asas, escalador.', ja: 'つばさを みせてみな。' }],
    quip: [{ en: 'Caw-caw! Back to earth.', es: '¡Cra-cra! De vuelta a tierra.', pt: 'Cró-cró! De volta ao chão.', ja: 'カァカァ！ じめんに おかえり。' },
      { en: 'No wings, no sky.', es: 'Sin alas, no hay cielo.', pt: 'Sem asas, sem céu.', ja: 'つばさ なしに そら なし。' }],
    defeat: { en: 'Well climbed… the sky is yours.', es: 'Bien trepado… el cielo es tuyo.', pt: 'Bela escalada… o céu é seu.', ja: 'みごとだ… そらは きみの もの。' } },
  // The Tower Blocks': a Nuppeppo on the Cork's dive (hover, warn, dive, dazed, rise), a load swinging on a crane's ropes.
  crane: { name: { en: 'Nuppeppo', es: 'Nuppeppo', pt: 'Nuppeppo', ja: 'ぬっぺっぽう' }, ink: 'orange', design: 'loaf', crane: true, hp: 8, phase: (hp) => (hp >= 7 ? 2 : 3),
    intro: [{ en: 'No bones. All wobble.', es: 'Sin huesos. Pura gelatina.', pt: 'Sem ossos. Pura gelatina.', ja: 'ほね なし。ぜんぶ ぷるぷる。' },
      { en: 'Who needs a face anyway?', es: '¿Quién necesita una cara?', pt: 'Quem precisa de rosto?', ja: 'かおなんて いる？' },
      { en: 'Wobble, wobble… splat!', es: 'Tiembla, tiembla… ¡plaf!', pt: 'Treme, treme… plaft!', ja: 'ぷるぷる… べちゃっ！' }],
    quip: [{ en: 'Splat. Flat as a panel.', es: 'Plaf. Plano como un panel.', pt: 'Plaft. Plano como um painel.', ja: 'べちゃっ。パネルみたいに ぺしゃんこ。' },
      { en: "Sticky down there, isn't it?", es: 'Pegajoso ahí abajo, ¿eh?', pt: 'Grudento aí embaixo, né?', ja: 'したは ベタベタでしょ？' }],
    defeat: { en: "Ugh… I'll just ooze away.", es: 'Uf… me escurro y me voy.', pt: 'Ai… vou escorrer embora.', ja: 'うう… とろとろ にげよう。' } },
  // Tokyo's: the Tram, a tsukumogami now (a streetcar come alive after a hundred years: the owner's look and name, 2026-10-20): the Minecart's ride
  // on a rail (CART, Boss.ride), its pantograph up to an overhead wire; the rail at full strength, as the later of the two (the Minecart has its gentleness).
  tram: { name: { en: 'Tsukumo Tram', es: 'Tranvía Tsukumo', pt: 'Bonde Tsukumo', ja: 'つくもでんしゃ' }, ink: 'green', design: 'loaf', size: CART.size, rail: true, tram: true, slow: 0.8, hp: 8, phase: (hp) => (hp >= 7 ? 0 : hp >= 4 ? 1 : 2),
    intro: [{ en: 'Next stop: nowhere.', es: 'Próxima parada: ninguna.', pt: 'Próxima parada: nenhuma.', ja: 'つぎは どこにも とまりません。' },
      { en: 'A hundred years on this route.', es: 'Cien años en esta ruta.', pt: 'Cem anos nesta linha.', ja: 'この せんろで ひゃくねん。' },
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
  // The Dark Forest's (owner, 2026-10-21: boss-koschei A, the bony king with his sword; «Бой b»): Koschei the Deathless on the Lid's dive. Lying
  // dazed he is a heap of bones, and rising his bones fly together again, with a rattle first (bones); he drops bones and calls the forest's
  // skulls (minion); on his last heart the needle his death is in shows over his crown, and the last blow snaps it (needle).
  koschei: { name: { en: 'Koschei', es: 'Koschéi', pt: 'Koschei', ja: 'コシチェイ' }, ink: 'gray', hp: 6, phase: (hp) => (hp >= 5 ? 1 : hp >= 3 ? 2 : 3), bones: true, needle: true, minion: 'skull',
    intro: [{ en: 'My death is far from here.', es: 'Mi muerte está lejos de aquí.', pt: 'Minha morte está longe daqui.', ja: 'わしの しは とおくに ある。' },
      { en: 'Kill me? Find my needle first.', es: '¿Matarme? Primero busca mi aguja.', pt: 'Me matar? Ache minha agulha primeiro.', ja: 'わしを たおす？ まず はりを さがせ。' },
      { en: 'Roll away, little bun.', es: 'Rueda lejos, panecillo.', pt: 'Role pra longe, pãozinho.', ja: 'ころがって にげな、パンぼうや。' }],
    quip: [{ en: 'Deathless. And you?', es: 'Inmortal. ¿Y tú?', pt: 'Imortal. E você?', ja: 'わしは しなぬ。おまえは？' },
      { en: 'Bones remember. Bones return.', es: 'Los huesos recuerdan. Y vuelven.', pt: 'Os ossos lembram. E voltam.', ja: 'ほねは おぼえてる。ほねは もどる。' }],
    defeat: { en: '…The needle… broke.', es: '…La aguja… se rompió.', pt: '…A agulha… quebrou.', ja: '…はりが… おれた。' } },
};
// The bosses' looks (owner, 2026-10-20: each boss a yokai of its world, picked from tools/variants.py's sheets boss-<id>, A to F, as the
// game's code draws them): its body's design (and size, where its drawing is in whole game pixels on it: BOSS_FIT); the renderer draws the rest round it (look) and on
// it (LOOK_FACE). Its fight and colour stay its own.
const LOOKS = {
  probka: ['F', 'tanuki'],   // the Village's: a Bake-danuki with its leaf, on the Cork's dive
  cart: ['C', 'round', 2.2],   // the Cave's: Tsuchigumo, walking the Minecart's rail (its body its drawing's at 2x: the round of it, its legs out)
  puck: ['F', 'round'],   // Fuji's: Tsurara-onna, her spikes swept back
  namazu: ['D', 'round', 2.5],   // the Sea's: Onamazu, arched, the stone on its back (its body the round of its drawing at 1:1, its middle, so it flips in place)
  koschei: ['A', 'round', 2.38],   // the Dark Forest's: Koschei the bony king, his sword out (its body the round of its drawing at 1:1, its middle)
  tram: ['E', 'tram'],   // Tokyo's: a tsukumogami tram
  crane: ['F', 'round', 2.74],   // the Tower Blocks': Nuppeppo in its ropes (its body the round of its drawing at 2x)
  pigeon: ['A', 'tengu'],   // the Sky's: a Karasu-tengu
};
for (const k in LOOKS) BOSSES[k].look = { id: k + '-' + LOOKS[k][0], design: LOOKS[k][1], size: LOOKS[k][2] };
const FOREST_V = { kikimora: 'C', leshy: 'B' };   // the Dark Forest's enemies (owner, 2026-10-20: «1c 2b»): a Kikimora with her broom, a Leshy with fly agarics
const CAVE = { stairs: 4, planks: 3, shelves: 2, pillars: 3, comb: 2, overhang: 1, chimney: 1, spring: 1 };   // the Cave's own chunks, before moss and rubber
const MINE = { crumble: 3, bridge: 3, lift: 2, planks: 2, shelves: 2, spring: 1, comb: 2, chimney: 1, stairs: 1, rubberwall: 1, mosswall: 1 };   // the Mine's, without its spikes and movers
const GLACIER = { icewall: 3, iceblocks: 3, stairs: 2, planks: 2, shelves: 1, pillars: 2, comb: 2, chimney: 2, overhang: 1, spring: 1 };   // the Glacier's, with its ice
const TOWN = { stairs: 3, planks: 2, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1, lift: 2, rubberwall: 1 };   // Tokyo's (shelves off the walls: awnings)
const STREET = { stairs: 3, planks: 2, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1 };   // Tokyo's first levels': TOWN before its awnings, gondolas and rubber
const JUNKP = { planks: 2, shelves: 3, stairs: 2, pillars: 2, comb: 2, chimney: 1, spring: 2, crumble: 1, rubberwall: 1 };   // the Junkyard's (planks off walls: fire escapes)
const SKYP = { planks: 3, shelves: 3, pillars: 2, comb: 2, chimney: 1, overhang: 1, spring: 1, lift: 2, movers: 1, twinshaft: 1 };   // the Skyscraper's (free planks: clouds)
const PANEL = { flight: 4, stairs: 2, shelves: 3, planks: 2, pillars: 2, comb: 1, chimney: 1, crumble: 2, spring: 1 };   // the Tower Blocks' (flights of stairs; shelves: balconies)
const SEAP = { stairs: 2, planks: 3, shelves: 2, pillars: 2, comb: 2, chimney: 1, spring: 1, lift: 2, crumble: 2, bridge: 2, mosswall: 1, iceblocks: 1 };   // the Sea's (rafts on streams: lifts; driftwood: crumble; wet rock: ice)
const FOREST = { stairs: 2, planks: 3, shelves: 2, pillars: 2, comb: 2, chimney: 1, spring: 1, lift: 2, crumble: 2, mosswall: 2 };   // the Dark Forest's (mortars: lifts; rotten logs: crumble; cobwebs: moss)
// A world's tapestry, shown once its boss is beaten (the plan: the story as a reward, after): three runes in Yarndings 12
// (its knitted pictures: the Heat, a drop like the hero, the Light) and what Aunt Moti reads in them.
const CAMPAIGN = [
// World 1, Tokyo (the owner's first world now, at first a world 4; its kit in the renderer, see THEMES.tokyo): the first steps, in the town at night,
// one new thing a level (the digest §3): jumps and springs, crawlers and the first gate, shop awnings that bounce, the helmet, a peak, the bonus,
// gondolas, the level crossing, Aunt Moti's shop; the Tram (BOSSES.tram). STREET is its pool before the awnings, and
// the air conditioners come in from the fourth level (aircons: false before). Its runes: a lattice, a lantern, a lit window (some stopped climbing
// and built a town; its lights hid the Light: the tapestries go with their worlds, owner).
{ world: TOKYO, runes: 'HWu', lore: { en: 'The city\'s lights hid the Moon.\nA friend helped find it again.', es: 'Las luces de la ciudad ocultaron la Luna.\nUn amigo ayudó a encontrarla.', pt: 'As luzes da cidade esconderam a Lua.\nUm amigo ajudou a encontrá-la.', ja: 'まちの あかりが つきを かくした。\nともだちが また みつけて くれた。' }, levels: [
  { role: 'teach', len: 33, fire: 0.37, calm: 8, maxD: 2, chunks: { stairs: 2, planks: 3, pillars: 2 }, intro: ['spring'], enemies: [], foes: 0.35, candy: [], safe: true, aircons: false, seed: 3111,
    news: { en: 'jumps and springs', es: 'saltos y resortes', pt: 'pulos e molas', ja: 'ジャンプと バネ' } },
  { role: 'teach', len: 42, pair: 0.1, gate: 'gate', fire: 0.46, maxD: 2, chunks: STREET, intro: [], enemies: ['crawler'], foes: 0.5, candy: [], aircons: false, seed: 2101,
    news: { en: 'crawlers: land on them', es: 'reptadores: cae sobre ellos', pt: 'rastejantes: pule neles', ja: 'ハイハイ: うえから ふもう' } },
  { role: 'teach', len: 37, fire: 0.46, maxD: 2, chunks: { ...STREET, shelves: 3 }, intro: ['shelves'], enemies: ['crawler'], foes: 0.55, candy: [], aircons: false, seed: 5101,
    news: { en: 'shop awnings: they bounce', es: 'toldos: rebotan', pt: 'toldos: eles quicam', ja: 'みせの ひさし: はねる' } },
  { role: 'apply', len: 46, gate: 'gate2', fire: 0.46, maxD: 2, chunks: { ...STREET, shelves: 3 }, intro: [], enemies: ['crawler'], foes: 0.55, pair: 0.15, candy: ['smash', 'smash'], stash: 0.35, seed: 2303,
    news: { en: 'the helmet', es: 'el casco', pt: 'o capacete', ja: 'ヘルメット' } },
  { role: 'peak', len: 33, fire: 0.5, maxD: 3, chunks: { ...STREET, shelves: 3, comb: 3, chimney: 2, overhang: 2 }, intro: [], enemies: ['crawler'], foes: 0.75, pair: 0.3, candy: ['smash'], seed: 2202 },
  { role: 'bonus', len: 31, bonus: 0, time: 34, seed: 5106 },
  { role: 'twist', len: 37, fire: 0.46, maxD: 2, chunks: { ...STREET, shelves: 3, lift: 3, movers: 1 }, intro: ['lift'], enemies: ['crawler'], foes: 0.55, candy: ['smash'], stash: 0.3, seed: 5103,
    news: { en: 'gondolas move', es: 'las góndolas se mueven', pt: 'as gôndolas se movem', ja: 'ゴンドラが うごく' } },
  { role: 'peak', len: 37, gate: 'gate3', fire: 0.5, maxD: 3, chunks: { ...STREET, shelves: 3, comb: 3, lift: 2 }, intro: [], enemies: ['crawler', 'climber'], foes: 0.75, pair: 0.3, candy: ['smash'], crossing: true, seed: 5102,
    news: { en: 'level crossings: mind the train', es: 'pasos a nivel: cuidado con el tren', pt: 'passagens de nível: cuidado com o trem', ja: 'ふみきり: でんしゃに ちゅうい' } },
  { role: 'rest', len: 25, fire: 0.37, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 5109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'tram', rail: true },   // its street rail, moss (ivy) over its ends, as the Minecart's
] },
// World 2, the Mine (the Cave until 2026-10-21; at first world 1; owner: «мир темной пещеры, рудников японии», and its dark the real one, «Настоящая тьма»):
// every level but its bonus and its boss dark, lit by the hero, its lanterns and what glows; its moss, rubber walls; the Minecart. The basics are the
// Village's to teach: its levels do not teach them again. Its runes the old Mine's: crossed picks, a block of ore, a turn (those tired of climbing
// began to dig sideways). Its kit the owner's picks (see mineRect, mnLamp): timber, lamps the hero lights (a task), ore, carts, bats.
{ world: WORLDS[0], runes: 'LnY', lore: { en: 'In the dark, Mochi lit the lamps.\nEvery one of them looked up.', es: 'En la oscuridad, Mochi encendió las lámparas.\nTodas miraban hacia arriba.', pt: 'No escuro, Mochi acendeu as lâmpadas.\nTodas olhavam para cima.', ja: 'くらやみで モチは あかりを ともした。\nどれも うえを むいていた。' }, levels: [
  { role: 'teach', len: 25, fire: 0.3, calm: 15, maxD: 1, chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2 }, intro: [], dark: true, enemies: [], foes: 0, candy: [], safe: true, seed: 3111 },
  { role: 'teach', len: 31, gate: 'gate', fire: 0.35, maxD: 2, chunks: CAVE, intro: [], dark: true, enemies: ['crawler'], foes: 0.5, candy: [], safe: true, seed: 2101 },
  { role: 'teach', len: 28, fire: 0.35, maxD: 2, chunks: { ...CAVE, mosswall: 2 }, intro: ['mosswall'], dark: true, set: 'garden', enemies: ['crawler'], foes: 0.45, candy: [], safe: true, seed: 2909,
    news: { en: 'moss holds you', es: 'el musgo te sujeta', pt: 'o musgo segura você', ja: 'コケに くっつける' } },
  { role: 'apply', len: 34, gate: 'gate2', fire: 0.38, maxD: 2, chunks: { ...CAVE, mosswall: 2 }, intro: [], dark: true, enemies: ['crawler'], foes: 0.55, pair: 0.1, candy: ['smash', 'smash'], stash: 0.35, seed: 2303 },
  { role: 'peak', len: 25, fire: 0.42, maxD: 2, chunks: { ...CAVE, comb: 3, chimney: 2, overhang: 2, mosswall: 2 }, intro: [], dark: true, enemies: ['crawler'], foes: 0.75, pair: 0.3, candy: ['smash'], seed: 2202 },
  { role: 'bonus', len: 31, bonus: 0, time: 34, seed: 2606 },
  { role: 'twist', len: 28, sides: [0, 109693], fire: 0.38, maxD: 2, chunks: { ...CAVE, mosswall: 1, rubberwall: 2 }, intro: ['rubberwall'], dark: true, enemies: ['crawler'], foes: 0.55, pair: 0.1, candy: ['smash'], stash: 0.3, seed: 3010,
    news: { en: 'rubber walls', es: 'paredes de goma', pt: 'paredes de borracha', ja: 'ゴムの かべ' } },
  { role: 'peak', len: 28, gate: 'gate3', fire: 0.42, maxD: 2, chunks: { ...CAVE, comb: 3, mosswall: 2, rubberwall: 2 }, intro: ['rubberwall'], dark: true, set: 'garden', enemies: ['crawler'], foes: 0.75, pair: 0.3, candy: ['smash'], seed: 2303 },
  { role: 'rest', len: 20, fire: 0.3, maxD: 1, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, mosswall: 1 }, intro: [], dark: true, enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, runes: 2, seed: 3616 },
  { role: 'boss', boss: 'cart', rail: true },   // the Minecart's (owner, 2026-10-20: the Cave becomes the mines): its rail under the ceiling, moss over its ends
] },
// World 3, the Glacier (at first world 2): ice, then the Rainbow, shells, climbers, icicles, a cage; the Puck. Its
// runes: one who climbs, a heart, a lattice (the first climbed without fear; many got stuck).
{ world: WORLDS[1], runes: 'gyI', lore: { en: 'From the summit the Moon looked near.\nA bell opened the first step.', es: 'Desde la cima la Luna parecía cerca.\nUna campana abrió el primer escalón.', pt: 'Do cume a Lua parecia perto.\nUm sino abriu o primeiro degrau.', ja: 'ちょうじょうから つきは ちかく みえた。\nかねが さいしょの だんを ひらいた。' }, levels: [
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
// World 4, the Sea (owner, 2026-10-20: rivers, the sea and an island between Fuji and Tokyo; its kit in the renderer, see THEMES.sea): where the
// climb begins to get harder (the owner's 10-15 minute rule keeps worlds 1-3 gentle). One new thing a level: wet rock, rafts riding the streams,
// circlers (new to the campaign), driftwood that gives way, a peak, the coin rain, a river of rafts, a peak, a cage. First numbers, for the sweep
// to tune. Its boss Onamazu, the earthquake catfish (the boss chat's, 2026-10-21), on the Junkyard's Rat slide (the Junkyard is dropped), its floor
// wet rock. Its runes: a whirl, a ship's wheel, a star (some put to sea to sail round the climb; the sea only goes round).
{ world: SEA, runes: 'Z8k', lore: { en: 'Lighthouses shine for the ships.\nOne shone for the sky.', es: 'Los faros alumbran a los barcos.\nUno alumbró al cielo.', pt: 'Os faróis iluminam os navios.\nUm iluminou o céu.', ja: 'とうだいは ふねを てらす。\nひとつは そらを てらした。' }, levels: [
  { role: 'teach', len: 30, fire: 0.38, calm: 8, maxD: 2, chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2, iceblocks: 3, mosswall: 1 }, intro: ['iceblocks'], enemies: ['crawler'], foes: 0.4, candy: [], shop: 0.5, safe: true, seed: 6101,
    news: { en: 'wet rock: you slip', es: 'roca mojada: resbalas', pt: 'pedra molhada: você escorrega', ja: 'ぬれた いわ: すべる' } },
  { role: 'apply', len: 36, gate: 'gate', fire: 0.42, maxD: 2, chunks: { ...SEAP, lift: 3 }, intro: ['lift'], enemies: ['crawler', 'shell'], foes: 0.5, pair: 0.1, candy: ['rainbow', 'rainbow'], seed: 6108,
    news: { en: 'rafts ride the streams', es: 'las balsas van con la corriente', pt: 'as jangadas seguem a correnteza', ja: 'いかだが ながれに のる' } },
  { role: 'teach', len: 33, fire: 0.42, maxD: 2, chunks: SEAP, intro: [], enemies: ['circler', 'crawler'], foes: 0.55, candy: ['smash'], seed: 6105,
    news: { en: 'circlers go round the rocks', es: 'los rondadores rodean las rocas', pt: 'os rondadores rodeiam as pedras', ja: 'グルグルが いわを まわる' } },
  { role: 'apply', len: 40, gate: 'gate2', fire: 0.44, maxD: 2, chunks: { ...SEAP, crumble: 3 }, intro: ['crumble'], enemies: ['circler', 'shell', 'crawler'], foes: 0.6, pair: 0.15, candy: ['smash', 'rainbow'], shop: 0.45, seed: 6103,
    news: { en: 'driftwood gives way', es: 'la madera a la deriva cede', pt: 'a madeira à deriva cede', ja: 'ながれぎは くずれる' } },
  { role: 'peak', len: 32, fire: 0.48, maxD: 3, chunks: { ...SEAP, comb: 3, chimney: 2, movers: 1, twinshaft: 1 }, intro: [], enemies: ['circler', 'climber', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 6102 },
  { role: 'bonus', len: 36, bonus: 0, time: 40, seed: 6104 },
  { role: 'twist', len: 34, fire: 0.44, maxD: 2, chunks: { ...SEAP, lift: 4, crumble: 3, bridge: 1 }, intro: ['lift'], enemies: ['climber', 'crawler'], foes: 0.5, candy: ['smash'], stash: 0.3, seed: 6106,
    news: { en: 'a river of rafts', es: 'un río de balsas', pt: 'um rio de jangadas', ja: 'いかだの かわ' } },
  { role: 'peak', len: 36, gate: 'gate3', fire: 0.48, maxD: 3, chunks: { ...SEAP, comb: 3, movers: 1, crumble: 2, twinshaft: 1 }, intro: [], enemies: ['circler', 'shell', 'climber', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 6107 },
  { role: 'rest', len: 22, fire: 0.35, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, iceblocks: 1 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 6109,
    news: { en: 'someone is stuck in a cage', es: 'alguien está atrapado', pt: 'alguém está preso', ja: 'だれかが つかまってる' } },
  { role: 'boss', boss: 'namazu', ice: true },   // Onamazu (the boss chat, 2026-10-21): the Rat's slide (the Junkyard's, which is dropped), its floor wet rock
] },
// The Dark Forest (the owner's bonus world, 2026-10-20: scary Russian fairy tales; its kit in the renderer, see THEMES.skazka; last in CAMP_ORDER, it
// opens at 180 stars, off the line): every level dark, the hero a Kolobok. One new thing a level: the dark itself, skulls that lunge, the Kikimora on the walls, Baba Yaga's mortars, a
// peak, a bonus, the Leshy who leads you round, a peak, a cage. First numbers, for the sweep to tune, about Tokyo's with the dark on top. Its boss Koschei
// the Deathless (the boss chat's, 2026-10-21). Its runes: a skull, a tree, crossed bones (some took the forest path round the climb; the forest
// never let them go).
{ world: SKAZKA, runes: 'wgL', lore: { en: 'Some took the forest path round the climb.\nThe forest never let them go.', es: 'Algunos tomaron el camino del bosque para rodear la subida.\nEl bosque nunca los dejó ir.', pt: 'Alguns pegaram a trilha da floresta para contornar a subida.\nA floresta nunca os deixou sair.', ja: 'のぼらずに もりの みちを えらんだ ものも いた。\nもりは かれらを はなさなかった。' }, levels: [
  { role: 'teach', len: 30, fire: 0.38, calm: 8, maxD: 2, chunks: { stairs: 2, planks: 3, shelves: 2, pillars: 2, mosswall: 2 }, intro: [], dark: true, enemies: ['crawler'], foes: 0.35, candy: [], shop: 0.5, safe: true, seed: 7101,
    news: { en: 'the dark: your light shows the way', es: 'la oscuridad: tu luz muestra el camino', pt: 'o escuro: sua luz mostra o caminho', ja: 'くらやみ: きみの ひかりが みちを てらす' } },
  { role: 'apply', len: 36, gate: 'gate', fire: 0.42, maxD: 2, chunks: FOREST, intro: [], dark: true, enemies: ['skull', 'crawler'], foes: 0.5, pair: 0.1, candy: ['smash', 'smash'], seed: 7108,
    news: { en: 'skulls: they lunge up close', es: 'calaveras: se lanzan de cerca', pt: 'caveiras: atacam de perto', ja: 'ドクロ: ちかいと とびかかる' } },
  { role: 'teach', len: 33, fire: 0.42, maxD: 2, chunks: FOREST, intro: [], dark: true, enemies: ['kikimora', 'crawler'], foes: 0.55, candy: ['smash'], seed: 7105,
    news: { en: 'the kikimora leaps off the walls', es: 'la kikimora salta desde las paredes', pt: 'a kikimora salta das paredes', ja: 'キキモラが かべから とびかかる' } },
  { role: 'apply', len: 40, gate: 'gate2', fire: 0.44, maxD: 2, chunks: { ...FOREST, lift: 3 }, intro: ['lift'], dark: true, enemies: ['kikimora', 'skull', 'crawler'], foes: 0.6, pair: 0.15, candy: ['smash', 'rainbow'], shop: 0.45, seed: 7103,
    news: { en: "Baba Yaga's mortars fly", es: 'los morteros de Baba Yaga vuelan', pt: 'os pilões da Baba Yaga voam', ja: 'ババヤガの うすが とぶ' } },
  { role: 'peak', len: 32, fire: 0.48, maxD: 3, chunks: { ...FOREST, comb: 3, chimney: 2, movers: 1, twinshaft: 1 }, intro: [], dark: true, enemies: ['kikimora', 'skull', 'spitter', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 7102 },
  { role: 'bonus', len: 36, bonus: 3, time: 42, seed: 7104 },
  { role: 'twist', len: 34, fire: 0.44, maxD: 2, chunks: { ...FOREST, pillars: 4, crumble: 1 }, intro: [], dark: true, enemies: ['leshy', 'skull'], foes: 0.65, candy: ['smash'], stash: 0.3, seed: 7106,
    news: { en: 'the leshy leads you round', es: 'el leshi te hace dar vueltas', pt: 'o leshy te faz andar em círculos', ja: 'レーシーが ぐるぐる まわらせる' } },
  { role: 'peak', len: 36, gate: 'gate3', fire: 0.48, maxD: 3, chunks: { ...FOREST, comb: 3, movers: 1, crumble: 2, twinshaft: 1 }, intro: [], dark: true, enemies: ['leshy', 'kikimora', 'skull', 'crawler'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 7107 },
  { role: 'rest', len: 22, fire: 0.3, maxD: 2, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, mosswall: 1 }, intro: [], dark: true, enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, seed: 7109,
    news: { en: 'someone is stuck in a cage', es: 'alguien está atrapado', pt: 'alguém está preso', ja: 'だれかが つかまってる' } },
  { role: 'boss', boss: 'koschei', dark: true },   // Koschei (the boss chat, 2026-10-21): the Lid's dive, a heap of bones when dazed, the needle his last heart; his arena dark (owner: «Сделать тёмной»)
] },
// World 1, the Village (the Mine's world until 4084599; at first world 3): how to climb, crumbling blocks, spitters, the pit's waves and a fat
// spitter, a peak, the bonus, moving planks, a peak, Moti's shop; the Cork's dive. Its runes the story's first (since 2026-10-21, when the old
// Mine's went to the Mine): the Heat, a drop like the hero, the Light (we all came from the Heat; we all climb to the Light). The worm stays in
// the random run (user).
{ world: WORLDS[2], runes: 'VhS', lore: { en: 'Mochi fell from the Moon\'s light.\nKindness was the first step back.', es: 'Mochi cayó de la luz de la Luna.\nLa bondad fue el primer paso de vuelta.', pt: 'Mochi caiu da luz da Lua.\nA bondade foi o primeiro passo de volta.', ja: 'モチは つきの ひかりから おちた。\nやさしさが かえりみちの いっぽめ。' }, levels: [
  { role: 'teach', len: 30, fire: 0.25, calm: 40, maxD: 1, script: ['tutJump', 'tutDouble', 'tutShop', 'tutEnemy', 'tutHelmet', 'tutMix', 'rest'], chunks: { stairs: 2, planks: 2, shelves: 2, pillars: 2 },
    intro: [], enemies: ['crawler'], foes: 0, candy: [], cage: true, safe: true, seed: 4102,   // the tutorial (owner): CHUNKS.tut*, in their order
    news: { en: 'how to climb', es: 'cómo trepar', pt: 'como escalar', ja: 'のぼりかた' } },
  { role: 'apply', len: 31, safe: true, gate: 'gate', fire: 0.35, maxD: 2, chunks: MINE, intro: ['crumble', 'bridge'], enemies: ['crawler', 'shell'], foes: 0.5, candy: ['bubble', 'bubble'], cage: true, seed: 4105,   // (1-1's surfaces first, it being the tutorial now)
    news: { en: "crumbling blocks: don't stand still", es: 'bloques que se caen: no te quedes quieto', pt: 'blocos que desmoronam: não fique parado', ja: 'くずれる ブロック: とまるな' } },
  { role: 'teach', len: 28, safe: true, fire: 0.35, maxD: 2, chunks: MINE, intro: [], enemies: ['spitter', 'crawler', 'tumbler'], foes: 0.45, candy: ['bubble'], seed: 4106,
    news: { en: 'spitters lob blobs', es: 'los escupidores lanzan bolas', pt: 'cuspidores atiram bolas', ja: 'ペッペが たまを なげる' } },
  { role: 'apply', len: 34, gate: 'gate2', fire: 0.38, maxD: 2, chunks: MINE, intro: [], set: 'arena', mini: true, enemies: ['spitter', 'crawler', 'shell', 'tofu'], foes: 0.55, pair: 0.1, candy: ['bubble', 'smash'], shop: 0.4, seed: 4101,
    news: { en: 'the pit: waves, then a fat spitter', es: 'la mina: oleadas y un escupidor gordo', pt: 'a mina: ondas e um cuspidor gordo', ja: 'こうどう: ウェーブと でっかい ペッペ' } },
  { role: 'peak', len: 25, sides: [0, 109814], fire: 0.42, maxD: 2, chunks: { ...MINE, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'icicles', enemies: ['spitter', 'climber', 'crawler', 'nurikabe'], foes: 0.75, pair: 0.3, candy: ['bubble'], seed: 4108 },
  { role: 'bonus', len: 42, bonus: 2, time: 46, seed: 4101 },
  { role: 'twist', len: 30, pair: 0.4, fire: 0.38, maxD: 2, chunks: { chimney2: 4, towers: 4, mosswall: 3, crumble: 1, bridge: 1 },   // walls the way between the planks, ones that hold (owner: too many ledges, the walls lost): no planks, shelves, stairs, comb, nor rubber (it throws off)
    motif: ['ride', 'ride2', 'mill', 'seesaw'], sparse: true, wind: 0.5, set: 'mochi', intro: ['fork'], trial: { at: 0.7, goal: 'coins' }, enemies: ['spitter', 'crawler'], foes: 0.9, candy: ['bubble'], stash: 0.3, seed: 4101, par: 75,   // the pilot, its par the owner's 75 s (owner, 2026-10-22: «A, D, E на 1-7»):
    // a yaen every other chunk (A), more enemies and in pairs, on the ledges the planks carry to (D), less decor (E: Level `sparse`, see villageRect, kitThing)
    news: { en: 'the mill, the seesaw and the pestle', es: 'el molino, el balancín y el mazo', pt: 'o moinho, a gangorra e o pilão', ja: 'すいしゃ、シーソー、きね' } },
  { role: 'peak', len: 30, gate: 'gate3', fire: 0.42, maxD: 2, chunks: { ...MINE, movers: 2, lift: 2, icewall: 1 }, intro: [], set: 'arena', enemies: ['spitter', 'shell', 'crawler'], foes: 0.7, pair: 0.25, candy: ['bubble'], seed: 4102 },
  { role: 'rest', len: 20, fire: 0.3, maxD: 1, chunks: { stairs: 3, planks: 3, shelves: 2, pillars: 2, lift: 1, bridge: 1 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, runes: 2, seed: 4108,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'probka', moss: true },   // the Cork's dive (owner, 2026-10-20: the first boss's fight); moss on its arena's walls: a place to sit its dive out
] },
// World 5, the Tower Blocks (the user's Soviet brutalism; its kit in the renderer, see THEMES.blocks): stairs you walk up, old balconies
// that give way, old mattresses that bounce, then winter (icicles off the roofs, the twist); the Crane. Its runes: a frame, a tower, two
// rings (they stacked floor on floor to reach the sky; the top was only a roof).
{ world: BLOCKS, runes: 'BMQ', lore: { en: 'Floor after floor, window after window.\nA friend gave Mochi its lantern.', es: 'Piso tras piso, ventana tras ventana.\nUn amigo le dio su farolillo.', pt: 'Andar após andar, janela após janela.\nUm amigo lhe deu sua lanterna.', ja: 'かいを のぼり まどを すぎた。\nともだちが ちょうちんを くれた。' }, levels: [
  { role: 'teach', len: 34, fire: 0.46, calm: 8, maxD: 2, chunks: PANEL, intro: ['flight'], enemies: ['crawler'], foes: 0.45, candy: [], safe: true, seed: 6101,
    news: { en: 'stairs: just walk up', es: 'escaleras: sube andando', pt: 'escadas: é só subir andando', ja: 'かいだん: あるいて のぼれる' } },
  { role: 'teach', len: 38, fire: 0.48, maxD: 2, chunks: { ...PANEL, crumble: 3 }, intro: ['crumble'], enemies: ['crawler', 'climber'], foes: 0.5, candy: ['bubble'], gate: 'gate', seed: 6102,
    news: { en: 'old balconies give way', es: 'los balcones viejos ceden', pt: 'as sacadas velhas cedem', ja: 'ふるい ベランダは くずれる' } },
  { role: 'teach', len: 40, fire: 0.48, maxD: 2, chunks: { ...PANEL, spring: 3 }, intro: ['spring'], enemies: ['crawler', 'shell'], foes: 0.5, candy: ['smash'], sides: [15976, 0], seed: 6103,
    news: { en: 'old mattresses bounce', es: 'los colchones viejos rebotan', pt: 'colchões velhos quicam', ja: 'ふるい マットレスで はねる' } },
  { role: 'apply', len: 46, fire: 0.5, maxD: 2, chunks: PANEL, intro: [], enemies: ['crawler', 'climber', 'shell'], foes: 0.6, pair: 0.15, candy: ['smash', 'bubble'], shop: 0.4, stash: 0.3, gate: 'gate2', seed: 6104 },
  { role: 'peak', len: 38, fire: 0.55, maxD: 3, chunks: { ...PANEL, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], seed: 6105 },
  { role: 'bonus', len: 46, bonus: 2, time: 50, seed: 6106 },
  { role: 'twist', len: 40, fire: 0.5, maxD: 2, chunks: PANEL, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.55, candy: ['bubble'], stash: 0.3, sides: [0, 116698], seed: 6107,
    news: { en: 'winter: icicles fall off the roofs', es: 'invierno: caen carámbanos de los tejados', pt: 'inverno: pingentes caem dos telhados', ja: 'ふゆ: やねから つららが おちる' } },
  { role: 'peak', len: 42, fire: 0.55, maxD: 3, chunks: { ...PANEL, comb: 3, spikes: 1, rubberwall: 2 }, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], gate: 'gate3', sides: [17935, 0], seed: 9039 },
  { role: 'rest', len: 30, fire: 0.42, maxD: 2, chunks: { flight: 3, stairs: 2, planks: 3, shelves: 3 }, intro: [], enemies: ['crawler'], foes: 0.3, candy: ['smash'], shop: 0.15, cage: true, runes: 2, sides: [0, 113769], seed: 6109,
    news: { en: "Aunt Moti's shop", es: 'la tienda de la tía Moti', pt: 'a loja da tia Moti', ja: 'モチおばさんの ショップ' } },
  { role: 'boss', boss: 'crane' },
] },
// World 6, the Skyscraper (the user's skyscraper and clouds; its kit in the renderer, see THEMES.sky): clouds that dissolve under you,
// window-cleaning gondolas, bolts dropped from above, then night over the clouds (the twist: dark); the Pigeon. Its runes: a cross of
// diamonds, a sun, a cloud (at the top of the tallest tower were only clouds).
{ world: SKY, runes: 'OUd', lore: { en: 'Over the tallest tower\nthe clouds parted.', es: 'Sobre la torre más alta\nlas nubes se abrieron.', pt: 'Sobre a torre mais alta\nas nuvens se abriram.', ja: 'いちばん たかい とうの うえで\nくもが わかれた。' }, levels: [
  { role: 'teach', len: 36, fire: 0.5, calm: 8, maxD: 2, chunks: SKYP, intro: ['planks'], enemies: ['crawler', 'climber'], foes: 0.45, candy: [], safe: true, seed: 7101,
    news: { en: 'clouds dissolve under you', es: 'las nubes se deshacen bajo tus pies', pt: 'as nuvens se desfazem sob você', ja: 'くもは あしもとで きえる' } },
  { role: 'teach', len: 40, fire: 0.52, maxD: 2, chunks: { ...SKYP, lift: 3 }, intro: ['lift'], enemies: ['crawler', 'climber', 'shell'], foes: 0.5, candy: ['bubble'], gate: 'gate', sides: [0, 112808], seed: 7102,
    news: { en: 'window-cleaning gondolas', es: 'góndolas de limpiacristales', pt: 'gôndolas de limpar janelas', ja: 'まどふきの ゴンドラ' } },
  { role: 'teach', len: 42, fire: 0.52, maxD: 2, chunks: SKYP, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.5, candy: ['smash'], sides: [0, 113786], seed: 7103,
    news: { en: 'dropped bolts fall from above', es: 'caen tornillos desde arriba', pt: 'parafusos caem lá de cima', ja: 'うえから ボルトが おちる' } },
  { role: 'apply', len: 48, fire: 0.54, maxD: 2, chunks: SKYP, intro: [], enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.6, pair: 0.15, candy: ['smash', 'bubble'], shop: 0.4, stash: 0.3, gate: 'gate2', seed: 7104 },
  { role: 'peak', len: 40, fire: 0.58, maxD: 3, chunks: { ...SKYP, comb: 3, movers: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], sides: [0, 112811], seed: 7105 },
  { role: 'bonus', len: 48, bonus: 0, time: 52, seed: 7106 },
  { role: 'twist', len: 42, fire: 0.54, maxD: 2, chunks: SKYP, intro: [], dark: true, enemies: ['crawler', 'climber', 'shell'], foes: 0.55, candy: ['bubble'], stash: 0.3, seed: 7107,
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
  { role: 'teach', len: 42, fire: 0.54, maxD: 2, chunks: JUNKP, intro: [], enemies: ['crawler', 'climber', 'shell'], foes: 0.5, candy: ['bubble'], crossing: true, gate: 'gate', seed: 8102,
    news: { en: 'garbage trucks: mind the street', es: 'camiones de basura: cuidado con la calle', pt: 'caminhões de lixo: cuidado com a rua', ja: 'ゴミしゅうしゅうしゃ: どうろに ちゅうい' } },
  { role: 'teach', len: 44, fire: 0.54, maxD: 2, chunks: { ...JUNKP, iceblocks: 3 }, intro: ['iceblocks'], enemies: ['crawler', 'shell', 'spitter'], foes: 0.5, candy: ['smash'], sides: [0, 113809], seed: 8103,
    news: { en: 'greasy steel: you slide', es: 'acero grasiento: resbalas', pt: 'aço engordurado: você escorrega', ja: 'あぶらの はがね: すべる' } },
  { role: 'apply', len: 50, fire: 0.56, maxD: 2, chunks: { ...JUNKP, iceblocks: 1 }, intro: [], enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.6, pair: 0.15, candy: ['smash', 'bubble'], crossing: true, shop: 0.4, stash: 0.3, gate: 'gate2', seed: 8104 },
  { role: 'peak', len: 42, fire: 0.6, maxD: 3, chunks: { ...JUNKP, comb: 3, chimney: 2, spikes: 1 }, intro: [], set: 'arena', enemies: ['crawler', 'climber', 'shell', 'spitter'], foes: 0.75, pair: 0.3, candy: ['rainbow'], sides: [0, 113811], seed: 8105 },
  { role: 'bonus', len: 50, bonus: 1, time: 55, seed: 8106 },
  { role: 'twist', len: 44, fire: 0.56, maxD: 2, chunks: JUNKP, intro: [], set: 'icicles', enemies: ['crawler', 'climber', 'spitter'], foes: 0.55, candy: ['bubble'], stash: 0.3, crossing: true, sides: [18957, 114790], seed: 9084,
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
// The worlds in the order they are played (owner, 2026-10-20: the Village, the Cave, the mountain, the rivers and the sea, Tokyo, the
// modern concrete, the sky, space, another planet, open space last and endless; no junkyard: it has no place in Japan), by world id.
// A world goes into CAMPAIGN anywhere and its id here in its place (one not built yet waits here: only those in CAMPAIGN are played); a save
// follows the worlds by id (loadSave), so this may change.
const CAMP_ORDER = ['mine', 'cave', 'ice', 'sea', 'tokyo', 'blocks', 'sky', 'skazka'];   // (mine: the Village's id; blocks: the concrete's place for now; skazka:
// the Dark Forest, a bonus world opened by stars, off the line: Game's CAMP_STARS; kept last, so the line's worlds keep their numbers)
CAMPAIGN.splice(0, CAMPAIGN.length, ...CAMP_ORDER.map((id) => CAMPAIGN.find((c) => c.world.id === id)).filter(Boolean));
// In the campaign a card is offered only once what it is for has been met: after the level (its index) where that
// came in: the shop and the candies at 1-1 (the tutorial), the spikes at 1-5 (the Village's peak).
const CARD_FROM = { member: 1, long: 1, iron: 4 };
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
  { id: 'long', stack: true, name: { en: ['Long charge', 'Candies last 2 s longer'], es: ['Carga larga', 'Los caramelos duran 2 s más'], pt: ['Carga longa', 'Doces duram 2 s a mais'], ja: ['ロング チャージ', 'キャンディが 2 びょう ながもち'] }, apply: (g) => { g.mods.gun += CANDIES.plus; } },
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
ICONS.clock = '....yyyy..../..yywwwwyy../.ywwwwkwwwy./.ywwwwkwwwy./ywwwwwkwwwwy/ywwwwwkwwwwy/ywwwwwkkkkwy/ywwwwwwwwwwy/.ywwwwwwwwy./.ywwwwwwwwy./..yywwwwyy../....yyyy....';   // a medal's (MEDAL)
ICONS.clockOff = ICONS.clock.replace(/[yw]/g, 's'); ICONS.heartOff = ICONS.heart.replace(/[rw]/g, 's');
ICONS.long = '.wwwwwwwwww./..w......w../..wyyyyyyw../...wyyyyw.../....wyyw..../.....ww...../....w..w..../...w.yy.w.../..w.yyyy.w../..wyyyyyyw../.wwwwwwwwww./............';
ICONS.bubble = '............/....pppp..../..pppppppp../.ppwwpppppp./.pwwppppppp./pppppppppppp/pppppppppppp/.ppppppppppp/.pppppppppp./..pppppppp../....pppp..../............';   // a bubble of gum, its shine
ICONS.maxhp = ICONS.heart;
ICONS.taskCrow = '............/............/.......sss../......sswsss/.....ssssss./..ssssssss../.ssssssssss./sssssssss.../..ssssss..../....s.s...../....s.s...../...ss.ss....';   // a level's tasks (Game.task): the crows,
ICONS.taskNeon = '............/...rrrrrrrr./sssr......r./...r.rrrr.r./...r......r./...r.rrrr.r./...r....r.r./...r...r..r./sssr..r...r./...rrrrrrrr./............/............';   // the neon (ラ),
ICONS.taskCage = '............/.....ss...../.ssssssssss./.s..s..s..s./.s..s..s..s./.s.gsggsg.s./.sgksggskgs./.sggsggsggs./.sggsggsggs./.ssssssssss./............/............';   // a friend in a cage,
ICONS.taskLantern = '............/.....ss...../...ssssss.../..ssssssss../....soos..../....soos..../....ssss..../.....ss...../.....ss...../....ssss..../...ssssss.../............';   // a Village shrine's lantern lit,
ICONS.taskLamp = '............/.....ss...../....s..s..../...ssssss.../...soooos.../...soyyos.../...soyyos.../...soooos.../...ssssss.../....ssss..../............/............';   // the Mine's lamps (its task)
ICONS.taskLighthouse = '............/.....ss...../....ssss..../....oyyo..../...ssssss.../.....ss...../.....ss...../....ssss..../....ssss..../...ssssss.../..ssssssss../............';   // the Sea's task: a lighthouse, its lamp lit
ICONS.taskBell = '............/.....ss...../.....ss...../....oooo..../...oooooo.../...oooooo.../...oooooo.../..oooooooo../.oooooooooo./.....kk...../............/............';   // a bell rung on Mount Fuji
ICONS.gift = ICONS.heal1;   // the stash's gift is a heart, and looks it
// The smash's picture: its helmet (user: the rock candy's place), a moto one, red with a white stripe and blue-lensed goggles (owner,
// 2026-10-20: the red one); the astro candy's an astronaut's, white with a blue visor in a black rim and a blue and orange neck ring.
ICONS.smash = '....rwsr..../..rrrwsrrr../.rwrrwsrrrr./.rrrrwsrrrr./rrrrrwsrrrrr/rrrrrwsrrrrr/rkkkkkkkkkkr/rkbbbkkbbbkr/rkkkkkkkkkkr/rr........rr/.rr......rr./..r......r..';
ICONS.astro = '...wwwwww.../..wwwwwwwss./.wwkkkkkkws./wwkbbbbbbkws/wwkbwbbbbkws/wwkbbbbbbkws/wwkbbbbbbkws/.wwkkkkkkws./.wwwwwwwwws./..bbbbbbbb../..oooooooo../............';
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
ICONS.rune8 = '............/...ww.ww..../.wwww.wwww../.wwww.wwww../www.....www./www.www.www./....www...../www.www.www./www.....www./.wwww.wwww../.wwww.wwww../...ww.ww....';   // the Sea's runes: this a ship's wheel, the next a whirl
ICONS.runeZ = '............/............/...ww......./...www....../....ww.ww.../..ww..www.../.www..ww..../.ww.ww....../....www...../.....ww...../............/............';
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
const ICON_SPIN = 0.3;   // a turning icon's least width, of its own (see iconSpin)
const ICON_INK ={ k: 'black', r: 'red', b: 'blue', y: 'yellow', g: 'green', p: 'purple', o: 'orange', s: 'gray', w: 'white', c: 'aqua' };
// The hero is a ball (Gum's shapes stay, as looks to unlock); firm enough to stay round
// standing on a floor, and runnier than at first (firm 2.0, then 1.4; user: it rattled about at speed, then: softer still).
DESIGNS.unshift({ id: 'round', n: 32, size: 1.0, firm: 1.2, kernel: [0, 0], sdf: (x, y) => Math.hypot(x, y) - 1,
  face: { eye: [0.3, 0.02], eyeR: [0.075, 0.095], mouth: [0, 0.2], mouthW: 0.13, blush: [0.52, 0.17] } });
// The new enemies' shapes (y down): a shell's dome, a spitter's drop narrowing to its spout, a
// splitter's bean of two lobes, a chaser's tall slug.
DESIGNS.push({ id: 'cube', n: 36, size: 1.0, firm: 2.2, kernel: [0, 0], sdf: (x, y) => sdRoundBox(x, y, 0.86, 0.86, 0.16),   // a jelly cube (the square enemies)
  face: { eye: [0.3, -0.05], eyeR: [0.075, 0.095], mouth: [0, 0.22], mouthW: 0.13, blush: [0.5, 0.15] } });
DESIGNS.push(
  { id: 'dome', n: 34, size: 1.0, firm: 1.6, kernel: [0, 0.12], sdf: (x, y) => Math.max(sdEll(x, y - 0.18, 1.1, 0.95), y - 0.5),
    face: { eye: [0.3, 0.12], eyeR: [0.072, 0.09], mouth: [0, 0.3], mouthW: 0.11, blush: [0.5, 0.28] } },
  { id: 'drop', n: 34, size: 1.0, firm: 1.3, kernel: [0, 0.15], sdf: (x, y) => Math.pow(x / (0.95 * (0.45 + 0.55 * Math.min(1, (y + 1) / 1.4))), 2) + y * y - 1,
    face: { eye: [0.26, 0.18], eyeR: [0.07, 0.09], mouth: [0, 0.4], mouthW: 0.1, blush: [0.46, 0.34] } },
  { id: 'peanut', n: 40, size: 1.0, firm: 1.1, kernel: [0, 0], sdf: (x, y) => smin(sdEll(x - 0.32, y, 0.7, 0.68), sdEll(x + 0.32, y, 0.7, 0.68), 0.4),   // a shallow waist: a deep one lets a body sink in before it touches
    face: { eye: [0.22, 0.0], eyeR: [0.07, 0.09], mouth: [0, 0.22], mouthW: 0.12, blush: [0.5, 0.15] } },
  { id: 'slug', n: 34, size: 1.0, firm: 1.2, kernel: [0, 0], sdf: (x, y) => sdRoundBox(x, y, 0.62, 1.0, 0.55),
    face: { eye: [0.22, -0.3], eyeR: [0.07, 0.09], mouth: [0, -0.08], mouthW: 0.1, blush: [0.4, -0.15] } },
  // The bosses' looks (LOOKS), the owner's picks: a streetcar, a tanuki sitting up, a tengu (a face of their own
  // each, LOOK_FACE; these are for Gum's)
  { id: 'tram', n: 40, size: 1.0, firm: 1.6, kernel: [0, 0.05], sdf: (x, y) => sdRoundBox(x, y, 1.33, 0.74, 0.42), face: { eye: [0.3, -0.05], eyeR: [0.07, 0.09], mouth: [0, 0.25], mouthW: 0.12, blush: [0.5, 0.15] } },
  { id: 'tanuki', n: 36, size: 1.0, firm: 1.3, kernel: [0, 0.08], sdf: (x, y) => Math.max(sdEll(x, y, 0.92, 1.02), y - 0.9), face: { eye: [0.3, -0.3], eyeR: [0.07, 0.09], mouth: [0, 0.0], mouthW: 0.12, blush: [0.5, -0.1] } },
  { id: 'tengu', n: 34, size: 1.0, firm: 1.3, kernel: [0, 0.05], sdf: (x, y) => sdEll(x, y, 0.78, 1.02), face: { eye: [0.26, -0.25], eyeR: [0.07, 0.09], mouth: [0, 0.05], mouthW: 0.1, blush: [0.42, -0.1] } },
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
for (const k in BOSSES) ICONS['boss_' + k] = portrait(BOSSES[k].design || 'cat', Object.keys(ICON_INK).find((c) => ICON_INK[c] === (BOSSES[k].ink || 'purple')));   // in its own ink
// The bosses with a look (LOOKS) drawn by hand as their looks are, 16 pixels square (owner, 2026-10-20): its body, its parts, its face.
ICONS.boss_probka = ['......gg........', '.....ggg........', '.bb...g.....bb..', '.bkb.bbbbb.bkb..', '..bbbbbbbbbbb...', '.bbbbbbbbbbbbb..', '.kkkkkbbbkkkkk..', '.kwwkkkkkkkwwk..', '.kwkkkkkkkkkwk..', '.bkkkbbkbbkkkb.b', '.bbbbbbbbbbbbbkb', '.bbbwwwwwwwbbbbk', '.bbwwwwwwwwwbbb.', '..bwwwwwwwwwb...', '...bbwwwwwbb....', '....bb...bb.....'];   // a Bake-danuki, its mask and leaf
ICONS.boss_cart = ['................', '.....oooooo.....', '...oooooooooo...', 'o.oooooooooooo.o', '.ookoooooooooko.', '.oookkoooookkoo.', 'ooowwkoooookwwoo', 'o.wkkoooookkwo.o', '.o.oooooooooooo.', 'o..oooookoooo..o', '.o..ooowkwooo.o.', '.o..oooooooo..o.', 'o.o..oooooo..o.o', 'o..o........o..o', '.o..o......o..o.', '.o..........o...'];   // Tsuchigumo, eight legs
ICONS.boss_puck = ['...w..b..w..b...', '.b..bbbbbbbbb.w.', '..bbwwwwwwwwbb..', 'w.bwwssssssswb.b', '.bbwsssssssswbb.', '..bwskksskkswb..', 'b.bwswksswkswb.w', '.bbwsssssssswbb.', '..bwssskkssswb..', 'w.bwwssssssswb.b', '..bbwwwwwwwwbb..', '...bbbbbbbbbb...', '...w.b.w.b.w....', '...w.b.w.b.w....', '.....b...b......', '.....b..........'];   // Tsurara-onna in her hood of ice
ICONS.boss_tram = ['......s.s.......', '.....s...s......', '......s.s.......', '.......s........', '..ssssssssssss..', '.gggggggggggggg.', '.gkkgkkgkkgggggg', '.gkwgkwgkwgyygyy', '.gkkgkkgkkgykgky', '.gggggggggggggg.', '.wwwwwwwwwwwwww.', '.gggggggggkkkkg.', '.gggggggggggggg.', '..kk......kk....', '.kssk....kssk...', '..kk......kk....'];   // the Tsukumo Tram, its headlights and pantograph
ICONS.boss_crane = ['.......s........', '.......s........', '......sss.......', '......bsb.......', '.....b...b......', '....b.ooo.b.....', '...boooooooob...', '..booooooooooob.', '..oookkoookkooo.', '.ooowkooowkoooo.', '.bbbbbbbbbbbbbbb', 'oooookooookooooo', 'oooooooooooooooo', '.oookooookoooko.', '..oooooooooooo..', '....oooooooo....'];   // Nuppeppo in its ropes
ICONS.boss_pigeon = ['.......rr.......', '......rrrr......', 's....ssssss....s', 'ss..ssssssss..ss', 'sss.swwsswwss.ss', 'ssssswksswksssss', 'ssssssssssssssss', 'kssssswwssssssk.', '.kssssswwwss.sk.', '..kssssswwws.k..', '...ssssssss.....', '....ssssss......', '....ssssss......', '.....s..s.......', '.....s..s.......', '....kk..kk......'];   // a Karasu-tengu, its red cap and wings
ICONS.boss_namazu = ['................', '.oo.............', '.ooo............', '..ooo...cccc....', '..ooo..ccwccc...', '...oo..ccwccc...', '...ooooccwcccc..', '....oooooooooo..', '....ooooooooooo.', '.....oooooowkoo.', '.....oooooooooo.', '......oooooooooo', '......ooookkoook', '.......oo.....k.', '................', '................'];   // Onamazu: arched, its tail up, the stone tied on its back, its whiskers
ICONS.boss_koschei = ['.....r.r.r......', '.....sssss......', '....swwwwws.....', '....wowwwow.....', '....wwwkwww.....', '.....wkwkw......', '..ssssssssss....', '.rsswssswssss...', 'r.sssswwwsssss..', 'r.ssswssswsssss.', 'r..sssssssssss..', 'r..ss.sss.sss...', '...s..s.s..s....', '................', '................', '................'];   // Koschei: his crowned skull, eyes lit, his ribs under the cloak, his red sword
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
//   =  plank (one-way, at the top of its tile)      M  plank sliding along its row   W  one sliding 3 tiles past its ends and back
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
  chimney2: { d: 2, tall: true, rows: [   // a chimney 15 tiles tall (owner: «стены высокие как башни»): a channel 7 tiles wide between the shaft's wall and a block, up by jumps
    '............',   // off its sides, moss under the block to hang from at its foot
    '............',
    '.....#######',
    '.....#######',
    '..o..#######',
    '.....#######',
    '.....#######',
    '...o.#######',
    '.....#######',
    '.....#######',
    '..o..#######',
    '.....#######',
    '.....#######',
    '...o.#######',
    '.....#######',
    '.....#######',
    '.....#######',
    '.....~~~~~~~',
    '............'] },
  towers: { d: 2, tall: true, rows: [   // two towers at the walls, 15 tiles tall, a channel 6 tiles wide between them (widened) climbed by jumps off its sides, coins up it:
    '............',   // the hero's walls the way up (owner, 2026-10-22: «платформ слишком много… герой может липнуть к стенам и использовать их как платформы»).
    '............',   // A jump and the air jump reach about 14 tiles, so the towers are taller; a wall jump off one side meets the other some 6.6 tiles up
    '####....####',   // (at 8 tiles wide, only about 4), the air jump back with each touch
    '####....####',
    '####.o..####',
    '####....####',
    '####....####',
    '####..o.####',
    '####....####',
    '####....####',
    '####.o..####',
    '####....####',
    '####....####',
    '####..o.####',
    '####....####',
    '####....####',
    '####....####',
    '............',
    '............'] },
  ride: { d: 1, tall: true, rows: [   // a plank to ride to a wall (owner, 2026-10-22: «кабинка до стены»): from a ledge onto it, under a cliff 14 tiles tall, to the mouth
    '............',   // of a channel 5 tiles wide between the cliff and the shaft's wall, coins at its mouth; up the channel by jumps off its sides (a jump
    '............',   // and the air jump fall short of its top). A long jump under the cliff can skip the plank: the risky way
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '....########',
    '............',
    '.o..o.......',
    '............',
    '..WWWW......',   // (its way: its left end from the shaft's wall to 1 tile short of the ledge: at that end the plank is right under the channel)
    '............',
    '............',
    '........####',
    '............'] },
  ride2: { d: 2, tall: true, rows: [   // two planks to ride, one over the other, each its own way and pace (each way over a ledge's end or the other's: planks are boarded from
    '............',   // under them), the upper one to the mouth of a channel 5 tiles wide by a cliff 14 tiles tall, up it by jumps off its sides
    '............',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '########....',
    '............',
    '........o.o.',
    '............',
    '......WWW...',
    '............',
    '............',
    '..WWW.......',
    '............',
    '............',
    '####........',
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
    '##.....HH..H',        // H: its cage (owner: a cage, not a heap of blocks), made thin by Level.place: posts and a roof bar
    '.......HoOoH',
    '.......HoooH',
    '.......HZZZH',        // Z: its floor, the cage's too but cracked: a head-butt from below breaks in
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
  seesaw: { d: 2, rows: [   // a seesaw (SEESAW) on a post: onto the near seat from the ledge, over to the far one while it is up (a coin over it), and off it up to the
    '............',   // ledge over the post before it goes down: from the far seat up, a jump; from the near one down, the air jump too. The ledge over the post
    '............',   // is clear of both seats' ways up
    '.....##.....',
    '............',
    '............',
    '........o...',
    '............',
    '............',
    '......V.....',
    '............',
    '............',
    '............',
    '####..##....',
    '............'] },
  mill: { d: 2, rows: [   // a water wheel (MILL): from a ledge onto its boards as they come up its side, round over its top, off onto a ledge on the other side;
    '............',   // a ledge over its rising side too, for one who goes up the wall there off a board (the bot did, under the next chunk's block, and was stuck)
    '............',
    '###......###',
    '......o.....',
    '............',
    '............',
    '............',
    '......Q.....',
    '............',
    '............',
    '............',
    '............',
    '............',
    '####........',
    '............'] },
  mochi: { d: 2, rows: [   // the pestle for mochi (MOCHI): a trip hammer pounds a mortar sunk in the ledge, right at the mouth of a way under a low beam that
    '............',   // only a flat hero fits, into a closed room at its end with a big coin (a coin hovers clear, and the way's 1.2 tiles have no room for
    '..###.......',   // one: BONUS_GAP), a block closing it (a mortar standing on the ledge was a step: the hero came off it bouncing, too tall for the way in).
    '............',   // The ledges stop short of the walls, so the ledge is come to from under either side and the walls climbed past the ledges over it (off
    '............',   // walls, the bot, out of a ride2's channel, found no way round). The way up is by the post, clear of the hammer
    '.......###..',
    '............',
    '............',
    '..###.KKK...',
    '..#..L......',
    '..#.O....P..',
    '..####UUU#..',
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
  // The first level's lessons (owner, 2026-10-20: a jump, a double jump, the shop, the first enemy to jump on, the helmet that breaks blocks,
  // one after another, simple to hard), laid in that order (a recipe's `script`); each asks for what it shows where it can (the digest §3:
  // the board teaches, a word only at the moment of need): '1'-'3' its words (Game: the tutorial's hints), 'e' an enemy on the ledge under
  // it, 'h' the helmet over the ledge under it (back while the hero is still under the blocks without it: no getting stuck)
  tutJump: { d: 1, kind: 'tut', rows: [   // up by single jumps, coins to follow
    '............',
    '............',
    '......====..',
    '.......O....',
    '............',
    '..====......',
    '...o........',
    '............',
    '............'] },
  tutDouble: { d: 1, kind: 'tut', rows: [   // a plank too high for one jump straight over another, a line of coins up to it: a second jump in the air
    '............',
    '............',
    '....====....',
    '.....oo.....',
    '............',
    '.....OO.....',
    '............',
    '.....oo.....',
    '............',
    '.....1......',
    '............',
    '....====....',
    '............',
    '............'] },
  tutShop: { d: 1, kind: 'tut', rows: [   // the shop's door on the way up, coins enough for its cheapest thing
    '............',
    '............',
    'B..O........',
    '#####.......',
    '...2..o.....',
    '............',
    '.......####.'] },
  tutEnemy: { d: 1, kind: 'tut', kit: 'lantern', rows: [   // one crawler on the one wide ledge on the way; the shrine on its wall's ledge, under the helmet's
    // (owner: «перенеси святилище до бонуса с каской или после: сейчас платформа ломается и его нельзя зажечь»; it stood on the row the helmet breaks)
    '............',
    '............',
    '.........###',
    '............',
    '............',
    '.....e......',
    '..########..',
    '............',
    '............'] },
  tutHelmet: { d: 1, kind: 'tut', rows: [   // blocks wall to wall over a ledge with the helmet: no way on but through them
    '............',
    '############',
    '............',
    '............',
    '............',
    '.....h......',
    '..3.####....',
    '............',
    '............'] },
  tutMix: { d: 1, kind: 'tut', rows: [   // all of it at once: a double jump up onto a ledge with a crawler on it
    '............',
    '..o......o..',
    '......e.....',
    '...######...',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '============',
    '............',
    '............',
    '............'] },
};
// What each chunk is mostly made of: two of a kind never run (the level's rhythm, see addChunk).
for (const [kind, ids] of Object.entries({ blocks: ['stairs', 'pillars', 'comb', 'overhang', 'iceblocks', 'vault'], planks: ['planks', 'shelves'],
  walls: ['icewall', 'mosswall', 'rubberwall', 'spikewalls', 'chimney', 'chimney2', 'towers'], moving: ['movers', 'lift', 'ride', 'ride2', 'mill', 'seesaw'], crumbling: ['crumble', 'bridge'],
  danger: ['spikes', 'sparse'], fork: ['twinshaft', 'fork', 'fork2'], spring: ['spring'], rest: ['rest', 'pocket'], set: ['garden', 'treasury', 'arena', 'icicles', 'mochi'], gate: ['gate', 'gate2', 'gate3'], flight: ['flight'] })) for (const id of ids) CHUNKS[id].kind = kind;
// Which set pieces each world has (one of them a level, as hard as the level allows), and an arena's waves: so many enemies each.
const SETS = [['garden', 'treasury', 'arena'], ['icicles', 'garden', 'treasury', 'arena'], ['arena', 'treasury', 'icicles'], ['arena', 'icicles', 'treasury']];
const ARENA = { waves: [2, 3], coins: 6, reach: 6, drop: 5, warn: 2 };   // coins: big ones for winning; reach: R round its middle that starts it; drop: R over it they fall from; warn: s a wave's places are shown before it comes
const ICICLE = { reach: 1.1, below: 9, shake: 0.55, r: 0.28 };   // R either side and under it that set it off; s it shakes first; R round as it falls
const MIRROR = { '<': '>', '>': '<', '[': ']', ']': '[', '{': '}', '}': '{', '(': ')', ')': '(' };
// The well is COLS tiles wide: each chunk's columns 1, 4, 7 and 10 are doubled (spread out and
// even under mirroring; the walls' columns 0 and 11 stay as they are), and a coin, big coin,
// spring or door in a doubled column is not copied.
const COLS = 16, WIDEN = [1, 4, 7, 10], ONCE = new Set(['o', 'O', 'S', 'B', 'A', 'Y', 'e', 'h', '1', '2', '3', 'P', 'Q', 'V']);
for (const id in CHUNKS) {
  CHUNKS[id].rows = CHUNKS[id].rows.map((row) => [...row].map((ch, k) => {
    if (!WIDEN.includes(k)) return ch;
    const copy = ONCE.has(ch) ? '.' : ch;
    return k < 6 ? ch + copy : copy + ch;   // the copy on the inner side
  }).join(''));
}
const CHUNK_TALL = Math.max(...Object.keys(CHUNKS).filter((id) => !CHUNKS[id].tall).map((id) => CHUNKS[id].rows.length));   // the tallest chunk, in tiles: how far one carries the shaft past a planned room (addChunk);
// (`tall` ones left out: they are a motif level's, which fills its height by `fits`, and the other levels' rooms stay planned as they were)
// Each chunk's first and last footholds, worked out from its rows once: runs of columns
// [from, to, tile] in the lowest and the highest row anything can be stood on.
const STAND = new Set(['#', 'I', 'C', '=', 'M', 'W', 'S', 'X', 'T', 'H', 'Z', 'U', 'L']);
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
    if (tb === '=' || tb === 'M' || ta === 'M' || tb === 'W' || ta === 'W') c = 0;
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
    this.kind = 'well'; this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = []; this.arenas = []; this.icicles = []; this.winds = []; this.kines = []; this.wheels = []; this.seesaws = []; this.fireWalls = [];
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
    this.dark = o.kind === 'well' ? (rc ? !!rc.dark : !!(o.world.dark && o.world.dark.includes(this.stage))) : o.kind === 'boss' && !!(rc && rc.dark);   // a boss's arena only by its recipe (Koschei's)
    this.rects = []; this.spikes = []; this.coats = []; this.coins = []; this.spawns = []; this.bubbles = []; this.arenas = []; this.icicles = []; this.winds = []; this.kines = []; this.wheels = []; this.seesaws = []; this.fireWalls = [];
    this.pickups = []; this.enemies = []; this.shots = []; this.boss = null; this.spots = []; this.rings = []; this.neonLit = new Map(); this.tended = new Map(); this.crossing = null; this.under = false; this.rail = null; this.crumbleTime = 0; this.crumbleBack = 0;
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
    this.rng = mulberry32(o.seed >>> 0); this.foeRng = mulberry32((o.seed ^ 0x85ebca6b) >>> 0); this.tile = (this.r - this.l) / COLS; this.last = null; this.rested = false; this.setAt = null; this.pocketKind = 'shop'; this.placed = []; this.lastFeet = null;
    const intro = rc ? { chunks: rc.intro, enemies: rc.enemies, candy: rc.candy } : (o.world.intro && o.world.intro[this.stage]) || {};
    this.intro = o.kind === 'well' ? shuffled(this.rng, intro.chunks || []) : []; this.foeTypes = intro.enemies || null;
    this.fizz = []; this.signs = []; this.script = rc && rc.script ? rc.script.slice() : null;   // script: a level laid as written (the tutorial)
    if (o.kind === 'well' && o.height && !o.world.bonus) {   // the level's set piece: where, and which (as hard as the level allows; a recipe's own)
      const w = WORLDS.indexOf(o.world), maxD = this.hard ? 3 : MAX_D[Math.max(0, Math.min(w, 3))][Math.min(this.stage, 2)], ok = rc ? (rc.set ? [rc.set] : []) : (SETS[Math.max(0, w)] || SETS[0]).filter((id) => CHUNKS[id].d <= maxD);
      if (ok.length) { this.setAt = this.floor - o.height * (0.4 + 0.2 * this.rng()); this.setId = ok[(this.rng() * ok.length) | 0]; }
    }
    this.folk = []; this.folkAt = []; this.folkRng = mulberry32((o.seed ^ 0x2545f491) >>> 0); this.crowRng = mulberry32((o.seed ^ 0x68e31da4) >>> 0);   // folk (see FOLK), by their own generators
    if (o.kind === 'well' && o.height && !o.world.bonus) {
      const fr = this.folkRng, at = ([a, b]) => this.floor - o.height * (a + fr() * (b - a));
      if (rc ? rc.cage : fr() < FOLK.cageP) this.folkAt.push({ kind: 'cage', y: at(FOLK.cage) });
      if (rc ? rc.trader : fr() < FOLK.traderP) this.folkAt.push({ kind: 'trader', y: at(FOLK.trader) });
      this.folkAt.sort((p, q) => q.y - p.y);   // the lower first
    }
    this.fizzAt = o.kind === 'well' && o.height ? CANDIES.at.slice(0, rc ? rc.candy.length : CANDIES.at.length).map(([a, b]) => this.floor - o.height * (a + this.rng() * (b - a))) : [];   // heights for the candies (a recipe's, as many)
    this.fizzKind = intro.candy || shuffled(mulberry32((o.seed ^ 0x9e3779b9) >>> 0), Object.keys(CANDY).filter((k) => k !== 'astro'));   // and which kinds, by a generator of their own: the shaft is laid as before
    this.windRng = mulberry32((o.seed ^ 0x51ed2700) >>> 0);   // a level's wind, by a generator of its own (the shaft laid as without it)
    this.fireRng = mulberry32((o.seed ^ 0x0f1e3a11) >>> 0);   // and its fire on the walls (FIREWALL), the same
    this.fireShare = !rc || rc.boss || rc.bonus != null || rc.script || !(this.stage > 0) ? 0 : rc.fireWalls != null ? rc.fireWalls : FIREWALL.share[CAMPAIGN.findIndex((x) => x.world === o.world)] || 0;
    const ar = this.astroRng = mulberry32((o.seed ^ 0x3c6ef372) >>> 0);   // a level's astro (ASTRO), by a generator of its own (its ledge too: the level is laid as without it)
    if (rc && rc.astro && o.height && ar() < ASTRO.p) {   // in its place among the level's candies, low to high
      const y = this.floor - o.height * (ASTRO.at[0] + ar() * (ASTRO.at[1] - ASTRO.at[0])), k = this.fizzAt.filter((v) => v > y).length;
      this.fizzAt.splice(k, 0, y); this.fizzKind = this.fizzKind.slice(); this.fizzKind.splice(k, 0, 'astro');
    }
    this.top = this.floor - (o.kind === 'well' ? this.tile : 0); this.endY = o.height ? this.floor - o.height : -Infinity;   // a tile of room over the floor, where the hero starts
    this.portal = null; this.exit = null; this.capY = -Infinity; this.fire = null; this.plan = [];
    this.coinTotal = 0; this.coinsTaken = 0; this.foeTotal = 0; this.foeKilled = 0;   // for the level's stars
    this.cam = this.floor + CAM.floorShow - o.h;
    if (o.kind === 'well') {
      const rnd = this.rng, H = o.height;
      if (rc ? rc.shop : !o.world.bonus && rnd() < (this.hard ? 0.7 : 0.85)) this.plan.push({ y: this.floor - H * (rc ? rc.shop : 0.3 + rnd() * 0.4), kind: 'shop', done: false });
      if (rc ? rc.stash : !o.world.bonus && rnd() < 0.8) this.plan.push({ y: this.floor - H * (rc ? rc.stash : 0.15 + rnd() * 0.55), kind: 'treasure', done: false });
      if (rc && rc.trial) this.plan.push({ y: this.floor - H * rc.trial.at, kind: 'trial', goal: rc.trial.goal, done: false });   // a trial room (TRIAL)
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
    if (o.kind !== 'boss') this.cam = this.floor + Math.max(CAM.floorShow, o.keep || 0) - o.h;   // a room: its floor over the touch keys (Game.roomFloor), all of it in sight under the HUD
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
    } else if (o.kind === 'trial') {   // a trial (TRIAL), the coins goal's: three planks up from side to side, three coins over each, two up the far wall, two in
      // the air in the middle (13, for 10 of them in time)
      const g = TRIAL[o.goal] || TRIAL.coins;
      this.trial = { goal: TRIAL[o.goal] ? o.goal : 'coins', n: g.n, time: g.time, t: 0, got: 0, c0: 0, state: 'ready' };
      [[0.24, -1], [0.44, 1], [0.64, -1]].forEach(([f, d]) => {
        const x = cx + d * W * 0.22, y = at(f);
        this.rects.push(this.box(x - W * 0.18, y, x + W * 0.18, y + LEVEL.plank * R, { plank: true }));
        for (let k = 0; k < 3; k++) this.coin(x + (k - 1) * 1.2 * R, y - 0.75 * R, 1);
      });
      for (const f of [0.34, 0.54]) this.coin(this.r - 1.3 * R, at(f), 1);
      for (const f of [0.34, 0.76]) this.coin(cx, at(f), 1);
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
    this.clearBonuses(-Infinity, Infinity);   // (BONUS_GAP)
  }
  // Coins laid from y0 down to y1 moved off what they touch (BONUS_GAP): a ledge, a block, a mover's whole way, a wall. One with no room within reach is
  // not laid (all coins one size: owner, 2026-10-22, «Монеты всегда одинакового размера, как сейчас мелкие»).
  clearBonuses(y0, y1) {
    const R = this.R, P = PIX.size, need = COIN.r * R + BONUS_GAP.gap * P, l = this.l, r = this.r;
    const solid = this.rects.filter((q) => !q.gone && !(q.move && (q.move.wheel || q.move.seesaw)) && q.y1 > y0 - 3 * R && q.y0 < y1 + 3 * R)
      .map((q) => q.move ? { x0: Math.min(q.move.a, q.move.b), x1: Math.max(q.move.a, q.move.b) + q.x1 - q.x0, y0: q.y0, y1: q.y1 } : q);
    const clear = (x, y) => x - l >= need && r - x >= need && solid.every((q) => Math.hypot(Math.max(q.x0 - x, 0, x - q.x1), Math.max(q.y0 - y, 0, y - q.y1)) >= need);
    const n = this.coins.length;
    this.coins = this.coins.filter((c) => {
      if (c.drop || c.y < y0 || c.y > y1 || clear(c.x, c.y)) return true;
      for (let d = P; d <= BONUS_GAP.reach * this.tile; d += P) for (const [dx, dy] of [[0, -d], [0, d], [-d, 0], [d, 0], [-d, -d], [d, -d]]) if (clear(c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; return true; }
      return false;
    });
    this.coinTotal = Math.max(0, this.coinTotal - (n - this.coins.length));   // (counted as laid: the stars' "all coins" are those there are)
  }
  ensure(y) { while (this.top > y) this.addChunk(); }
  // Drop what has fallen far below the camera (a crumbled block stays: it comes back).
  prune(y) {
    const keep = (o) => o.y0 === undefined ? o.y <= y : o.y0 <= y;
    this.rects = this.rects.filter((r) => r.cap || r.safe || keep(r));   // a ledge a fall may come back to stays
    this.spikes = this.spikes.filter(keep);
    this.coats = this.coats.filter(keep); this.winds = this.winds.filter(keep); this.kines = this.kines.filter(keep); this.wheels = this.wheels.filter(keep); this.seesaws = this.seesaws.filter(keep); this.fireWalls = this.fireWalls.filter(keep);
    this.coins = this.coins.filter((c) => c.drop || keep(c));   // an enemy's, on its way to the hero, stays
    this.folk = this.folk.filter(keep); this.icicles = this.icicles.filter(keep); this.arenas = this.arenas.filter(keep); this.spots = this.spots.filter(keep); this.runes = this.runes.filter(keep); this.rings = this.rings.filter(keep);
  }
  // The next chunk on top: a pocket with a bubble once the shaft passes a planned height
  // (never two pockets running, and none in the last `pocketEnd` tiles: a bubble right
  // under the way out is reached through it), otherwise one of the world's, as hard as
  // this level allows, not the same twice running.
  addChunk() {
    const wd = this.world, rnd = this.rng, G = LEVEL.pocketEnd * this.tile;
    const plan = this.last !== 'pocket' && this.plan.find((p) => !p.done && (this.top < p.y || (p.y - this.endY > G && this.top - this.endY - CHUNK_TALL * this.tile <= G)));   // (one the next chunk
    // could carry into the end's margin goes in now, a little under its height: else a short level's lost it, as Fuji's and the Sea's first did their shops)
    let id;
    if (this.script) { if (!this.script.length) { this.finish(); return; } id = this.script.shift(); }   // a level as written: its chunks in turn, then its end
    if (!id && plan) { plan.done = true; if (this.top - this.endY > G) { id = 'pocket'; this.pocketKind = plan.kind; this.pocketGoal = plan.goal; } }
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
      const mo = this.rc && this.rc.motif, pool = mo && !mo.includes(this.last) && mo.some((k) => CHUNKS[k].d <= maxD) ? Object.fromEntries(mo.map((k) => [k, 1])) : this.rc ? this.rc.chunks : wd.chunks;   // a recipe's
      // `motif`: one of its chunks every other chunk, from the first (owner, 2026-10-22: «A», one idea a level, its own thing on every screen)
      const fits = (k) => !mo || this.top - CHUNKS[k].rows.length * this.tile >= this.endY;   // a motif's level fills its height: none too tall for what is left (its chunks are)
      for (const k in pool) if (CHUNKS[k].d <= maxD && k !== this.last && CHUNKS[k].kind !== lastKind && !once(k) && fits(k)) w[k] = pool[k] * (mid ? 1 + 0.6 * (CHUNKS[k].d - 1) : 1);
      if (!Object.keys(w).length) for (const k in pool) if (CHUNKS[k].d <= maxD && k !== this.last && !once(k) && fits(k)) w[k] = pool[k];   // a small pool: kinds may run
      if (!Object.keys(w).length && mo && mo.includes(Object.keys(pool)[0])) for (const k in this.rc.chunks) if (CHUNKS[k].d <= maxD && k !== this.last && fits(k)) w[k] = this.rc.chunks[k];   // no motif chunk fits: the rest of its pool
      if (mo && mo.includes(Object.keys(pool)[0])) {   // a motif's chunks by turns: one not laid yet in this level first, while there is one (the pilot shows each)
        const fresh = Object.keys(w).filter((k) => !this.placed.some((q) => q.id === k));
        if (fresh.length) for (const k of Object.keys(w)) if (!fresh.includes(k)) delete w[k];
      }
      if (Object.keys(w).length || !mo) id = pick(rnd, w);
      else if (!this.rested && left >= CHUNKS.rest.rows.length * this.tile) { id = 'rest'; this.rested = true; }   // nothing fits: the rest, under the way out
      else { this.finish(); return; }
    }
    let c = CHUNKS[id];
    if (!this.script && this.top - c.rows.length * this.tile < this.endY) { this.finish(); return; }
    // the way round whose first foothold is the easier step up from the last one below
    const feet0 = this.lastFeet, way = (ch) => { const cost = (m) => (feet0 ? stepCost(feet0, m ? flipRuns(ch.first) : ch.first) : 0), a = cost(false), b = cost(true); return a === b ? rnd() < 0.5 : b < a; };
    let mirror = way(c);
    this.lastFeet = mirror ? flipRuns(c.last) : c.last;
    // Laid right on the last one, a chunk may hang a solid ledge just over a ledge under it, with
    // no room to stand there and jump: then it goes a tile higher, up to three.
    const keep = [this.rects, this.spikes, this.coats, this.coins, this.spawns, this.bubbles, this.arenas, this.icicles, this.fizz, this.signs, this.kines, this.wheels, this.seesaws], lens = keep.map((a) => a.length);   // (a chunk laid again higher takes back all it laid)
    let lift = 0;
    for (;;) {
      this.place(c, this.top - lift * this.tile, mirror);
      if (lift >= 3 || !this.cramped(lens[0])) break;
      keep.forEach((a, i) => { a.length = lens[i]; }); lift++;
    }
    const restEnd = id !== 'rest' && !this.rested && !wd.bonus && !this.script && Number.isFinite(this.endY) && left >= 14 * this.tile && left - (lift + c.rows.length) * this.tile <= 4 * this.tile;
    if (restEnd) {   // laid (a tile or three higher, too) it carried the shaft past the rest's window, as 2-3, 5-4, 7-4, 8-5 and 1-7's walls lost the rest under the way out:
      // taken back, the rest in its place, and the way out right over it (Level.finish below; the level a few tiles shorter)
      keep.forEach((q, i) => { q.length = lens[i]; }); id = 'rest'; c = CHUNKS.rest; lift = 0; this.rested = true;
      mirror = way(c); this.lastFeet = mirror ? flipRuns(c.last) : c.last; this.place(c, this.top, mirror);
    }
    this.coinTotal += this.coins.length - lens[3]; this.foeTotal += this.spawns.length - lens[4];   // as laid at last
    if (c.kind === 'gate') for (const r of this.rects.slice(lens[0])) if (r.crack) r.key = true;   // a gate's keystone
    if (c.kit) for (const r of this.rects.slice(lens[0])) r.kitWant = c.kit;   // the thing it asks for on its wall's ledge (kitThing)
    if (this.fizzAt.length && this.top - (lift + c.rows.length) * this.tile < this.fizzAt[0] && c !== CHUNKS.pocket) {   // a candy due: over a steady ledge of this chunk
      const ok = this.rects.slice(lens[0]).filter((r) => !r.crumble && !r.move && !r.spring && r.x1 - r.x0 >= 2 * this.tile);
      if (ok.length) { const r = ok[((this.fizzKind[this.fizz.length] === 'astro' ? this.astroRng : this.rng)() * ok.length) | 0]; this.fizz.push({ x: (r.x0 + r.x1) / 2, y: r.y0 - 1.3 * this.R, r: 0.5 * this.R, taken: false, kind: this.fizzKind[this.fizz.length] }); this.fizzAt.shift(); }
    }
    const h = (lift + c.rows.length) * this.tile;
    if (c !== CHUNKS.pocket) this.addFolk(lens[0], this.top - h);
    this.flavour(lens[0]);
    if (this.theme.town && this.kind === 'well') this.addAircons(this.top - h, this.top);
    if (this.ringAt != null && this.top - h < this.ringAt && c !== CHUNKS.pocket && c.kind !== 'set' && c.kind !== 'gate') this.addRing(this.top - h, this.top);
    if (this.spotAt != null && this.top - h < this.spotAt && c !== CHUNKS.pocket && c.kind !== 'set' && c.kind !== 'gate') this.addSpot(this.top - h, this.top);
    if (this.runeAt.length && this.top - h < this.runeAt[0].y && c !== CHUNKS.pocket) this.addRune(this.top - h, this.top);
    if (this.rc && this.rc.wind && c.kind !== 'moving' && c.kind !== 'set' && c.kind !== 'fork' && id !== 'rest' && c !== CHUNKS.pocket && this.windRng() < this.rc.wind) {   // a gusty one (WIND; not a fork: its risky way is risk enough)
      // its koinobori's pole: off the wall it blows from, on the widest way across, as low as its carp, hanging or flying, is clear of the chunk's ledges
      const dir = this.windRng() < 0.5 ? -1 : 1, t = this.tile, rs = this.rects.slice(lens[0]).filter((q) => !q.move);
      const clear = (x0, x1, y0, y1) => !rs.some((q) => q.x1 > Math.min(x0, x1) && q.x0 < Math.max(x0, x1) && q.y1 > y0 && q.y0 < y1);
      const wall = (py) => {   // the wall it blows from, on the widest way across at py
        const x = [this.l]; for (const r of rs.filter((q) => !q.crumble && q.y0 < py + 0.6 * t && q.y1 > py - 0.6 * t).sort((a, b) => a.x0 - b.x0)) x.push(r.x0, r.x1);
        x.push(this.r); let span = [this.l, this.r], wide = -1;
        for (let i = 0, e = this.l; i < x.length; i += 2) { e = Math.max(e, x[i]); if (x[i + 1] - e > wide) { wide = x[i + 1] - e; span = [e, x[i + 1]]; } }   // (e: the furthest right end so far)
        return dir > 0 ? span[0] : span[1];
      };
      let pole = null;
      for (let up = WIND.pole; up <= h / t - 1 && !pole; up++) {
        const py = this.top - up * t, px = wall(py), tip = px + dir * 0.55 * t;
        if (clear(px, tip + dir * 0.6 * t, py - 0.5 * t, py + 2.6 * t) && clear(px, tip + dir * 3.2 * t, py - 0.6 * t, py + 0.6 * t)) pole = { px, py };
      }
      if (!pole) { const py = this.top - WIND.pole * t; pole = { px: wall(py), py }; }
      this.winds.push({ y0: this.top - h, y1: this.top, dir, ph: this.windRng() * (WIND.on + WIND.off), ...pole });
    }
    if (this.fireShare && c !== CHUNKS.pocket && id !== 'rest' && c.kind !== 'set' && c.kind !== 'gate' && this.fireRng() < this.fireShare) {   // a stretch of a wall on fire (FIREWALL),
      // on a side with no coat, no spikes and no door of its own
      // of the wall's longest stretch left bare by the chunk's blocks (a block against the wall hides it: no fire there)
      const t = this.tile, side = this.fireRng() < 0.5 ? 1 : 2, want = (FIREWALL.len[0] + Math.floor(this.fireRng() * (FIREWALL.len[1] - FIREWALL.len[0] + 1))) * t, at = this.fireRng(), ph = this.fireRng() * (FIREWALL.on + FIREWALL.off);
      const bare = !this.coats.slice(lens[2]).some((q) => q.side === side) && !this.spikes.slice(lens[1]).some((q) => q.dir === (side === 1 ? 2 : 3)) && !this.bubbles.slice(lens[5]).length;
      const on = this.rects.slice(lens[0]).filter((q) => (side === 1 ? q.x0 <= this.l + 1 : q.x1 >= this.r - 1) && !q.move).sort((a, b) => b.y1 - a.y1);
      let free = null, y = this.top - t;   // from the chunk's foot up, between the blocks on that wall
      for (const q of [...on, { y0: -Infinity, y1: this.top - h + t }]) { const top = Math.max(q.y1, this.top - h + t); if (y - top > (free ? free[0] - free[1] : 0)) free = [y, top]; y = Math.min(y, q.y0); }
      if (bare && free && free[0] - free[1] >= 3 * t) { const span = Math.min(want, free[0] - free[1]), y1 = free[0] - at * (free[0] - free[1] - span); this.fireWalls.push({ side, y0: y1 - span, y1, ph }); }
    }
    this.clearBonuses(this.top - h - this.tile, this.top + 2 * this.tile);   // its coins, and the last chunk's under its foot (BONUS_GAP)
    this.placed.push({ id, y1: this.top, y0: this.top - h });   // which chunk is where (for checks)
    this.last = id;
    this.top -= h;
    if (restEnd) this.finish();
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
    if (this.theme.town && this.kind === 'well') for (let k = Math.ceil(top / (WIRE.arm * t)); k * WIRE.arm * t < this.top; k++) if (this.crowRng() < FOLK.crowP) {   // Tokyo: a crow on a wire of this chunk's beats,
      // where nothing laid nor a door stands in front of it (CRITTER.crow's 24 x 16 game pixels are at most 1.9 x 1.25 tiles; in tiles, so alike on every screen)
      const cr = this.crowRng, dir = cr() < 0.5 ? -1 : 1, hw = 1.1 * t, hh = 1.3 * t;
      for (let n = 0; n < 4; n++) {
        const x = this.l + (this.r - this.l) * (0.2 + 0.6 * cr()), y = wireY(this, k, x);
        if ([...this.rects, ...this.bubbles].some((q) => q.x1 > x - hw && q.x0 < x + hw && q.y1 > y - hh && q.y0 < y + 0.3 * t)) continue;
        this.folk.push({ kind: 'crow', x, y, dir, fly: false, t: 0 }); break;
      }
    }
  }
  // Tokyo's air conditioners (AC) on the walls in the chunk just laid (from y0 down to y1), on their beat: each a plank to stand on that gives way; none
  // where a ledge, a spike, a door, a coat of its wall (moss, ice, rubber) or the crossing is in its way or over it, nor by the floor
  addAircons(y0, y1) {
    if (this.rc && this.rc.aircons === false) return;   // (Tokyo's first levels: one new thing at a time)
    const t = this.tile, w = AC.w * t, xg = this.crossing;
    for (const side of [-1, 1]) {
      const at = AC.at[side < 0 ? 0 : 1];
      for (let k = Math.ceil((y0 / t - at) / AC.beat); (k * AC.beat + at) * t < y1; k++) {
        const y = (k * AC.beat + at) * t, x0 = side < 0 ? this.l + AC.off * t : this.r - AC.off * t - w, x1 = x0 + w, ya = y - 2.4 * t, yb = y + (AC.h + AC.brace + 0.4) * t;
        if (y > this.floor - 4 * t || (xg && yb > xg.y0 - 2 * t && ya < xg.y1 + t)) continue;
        const clear = (q) => q.x1 <= x0 - 0.5 * t || q.x0 >= x1 + 0.5 * t || q.y1 <= ya || q.y0 >= yb;
        if (this.rects.every(clear) && this.spikes.every(clear) && this.bubbles.every(clear) && !this.coats.some((c) => c.side === (side < 0 ? 1 : 2) && c.y1 > ya && c.y0 < yb)) this.rects.push(this.box(x0, y, x1, y + LEVEL.plank * this.R, { plank: true, ac: true }));
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
        if (a.cap || a.ac || a.y0 < b.y1 || a.y0 - b.y1 >= min) continue;   // (an air conditioner is no part of the shaft's lay)
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
    const SOLID = { '#': {}, I: { slick: true }, C: { crumble: true }, X: { crack: true }, T: { stair: true }, H: { cage: true }, Z: { cage: true, crack: true }, U: { mortar: true }, L: { beam: true } }, used = new Set(), key = (r, k) => r * 16 + k, from = this.rects.length, spikesFrom = this.spikes.length;
    const runEnd = (r, k, ch) => { let k1 = k; while (at(r, k1 + 1) === ch && !used.has(key(r, k1 + 1))) k1++; return k1; };
    for (let r = 0; r < H; r++) for (let k = 0; k < COLS; k++) {
      const ch = at(r, k), first = at(r, k - 1) !== ch;
      if (SOLID[ch] && !used.has(key(r, k))) {
        const k1 = runEnd(r, k, ch);
        const same = (rr) => { for (let q = k; q <= k1; q++) if (at(rr, q) !== ch || used.has(key(rr, q))) return false; return at(rr, k - 1) !== ch && at(rr, k1 + 1) !== ch; };
        let r1 = r;
        while (r1 + 1 < H && same(r1 + 1)) r1++;
        for (let rr = r; rr <= r1; rr++) for (let q = k; q <= k1; q++) used.add(key(rr, q));
        this.rects.push(this.box(X(k), Y(r1 + 1), X(k1 + 1), Y(r) - (ch === 'L' ? MOCHI.beam * t : 0), SOLID[ch]));   // (a low beam: shy of its tile's foot, MOCHI)
      } else if ((ch === '=' || ch === 'M' || ch === 'W') && first) {
        const k1 = runEnd(r, k, ch), b = this.box(X(k), Y(r + 1), X(k1 + 1), Y(r + 1) + LEVEL.plank * R, { plank: true });
        if (ch === 'M') b.move = { a: l, b: this.r - (b.x1 - b.x0), v: (this.rng() < 0.5 ? -1 : 1) * R * (1.6 + this.rng() * 1.2) };
        else if (ch === 'W') b.move = { a: X(Math.max(0, k - 3)), b: X(Math.min(COLS, k1 + 4)) - (b.x1 - b.x0), v: (this.rng() < 0.5 ? -1 : 1) * R * (1.6 + this.rng() * 1.2) };   // a short way to and fro,
        // 3 tiles past each end of its run: a motif's ride comes back within seconds (the bot waited on wall-to-wall ones at 1-7, the fire caught it)
        this.rects.push(b);
      } else if ((ch === '^' || ch === 'v') && first) {
        const k1 = runEnd(r, k, ch);
        this.spikes.push(ch === '^' ? { x0: X(k), x1: X(k1 + 1), y0: Y(r) - d, y1: Y(r), dir: 0 } : { x0: X(k), x1: X(k1 + 1), y0: Y(r + 1), y1: Y(r + 1) + d, dir: 1 });
      } else if (ch === 'S') { const cx = X(k) + t / 2; this.rects.push(this.box(cx - 0.7 * R, Y(r) - 0.36 * R, cx + 0.7 * R, Y(r), { spring: true })); }
      else if (ch === 'o' || ch === 'O') this.coin(X(k) + t / 2, Y(r) - t / 2, ch === 'O' ? 5 : 1);
      else if (ch === 'Y') this.icicles.push({ x: X(k) + t / 2, y: Y(r + 1), state: 'hang', t: 0 });
      else if (ch === 'V') {   // a seesaw's pivot (SEESAW): its post down to the block under it, a seat at each end of its beam
        let rr = r - 1; while (rr >= 0 && !SOLID[at(rr, k)]) rr--;
        const py = Y(r) - t / 2, sw = { px: X(k) + t / 2, py, L: SEESAW.L * t, th: 0, om: 0, foot: rr >= 0 ? Y(rr + 1) : py + 2 * t, y0: py - (SEESAW.L + 2) * t, y1: py + (SEESAW.L + 2) * t };
        this.seesaws.push(sw);
        for (const side of [-1, 1]) { const p = seatAt(sw, side), hw = (SEESAW.w * t) / 2; this.rects.push(this.box(p.x - hw, p.y, p.x + hw, p.y + LEVEL.plank * R, { plank: true, move: { seesaw: sw, side } })); }
      }
      else if (ch === 'Q') {   // a mill's hub (MILL): its wheel and its boards, at the level's time
        const cy = Y(r) - t / 2, wh = { cx: X(k) + t / 2, cy, rad: MILL.rad * t, hang: MILL.hang * t, w: ((mirror ? -1 : 1) * TAU) / MILL.turn, ph: 0, y0: cy - (MILL.rad + 2) * t, y1: cy + (MILL.rad + 2) * t };
        this.wheels.push(wh);
        for (let i = 0; i < MILL.n; i++) { const p = millAt(wh, i, this.t), hw = (MILL.w * t) / 2; this.rects.push(this.box(p.x - hw, p.y, p.x + hw, p.y + LEVEL.plank * R, { plank: true, move: { wheel: wh, i } })); }
      }
      else if (ch === 'K' && first) {   // a pestle's head, raised (MOCHI), over its run: it comes down on the block under it; its lever's post stands where the chunk's 'P' is
        let rr = r - 1; while (rr >= 0 && !SOLID[at(rr, k)]) rr--;
        let post = null; for (let q = 0; q < H && !post; q++) for (let kk = 0; kk < COLS; kk++) if (at(q, kk) === 'P') { post = { x: X(kk) + t / 2, foot: Y(q) }; break; }
        if (rr >= 0 && post) this.kines.push({ x: (X(k) + X(runEnd(r, k, ch) + 1)) / 2, yUp: Y(r), yHit: Y(rr + 1), px: post.x, foot: post.foot, y0: Y(r + 1) - 2 * t, y1: Y(rr + 1) });
      }
      else if (ch === 'e') {   // a crawler on the ledge under it (the tutorial's)
        const x = X(k) + t / 2, q = this.rects.slice(from).find((b) => Math.abs(b.y0 - Y(r)) < 1 && x > b.x0 && x < b.x1);
        if (q) this.spawns.push({ type: 'crawler', x, y: q.y0 - 1.2 * R * ENEMY.crawler.size, ledge: q });
      } else if (ch === 'h') this.fizz.push({ x: X(k) + t / 2, y: Y(r) - 1.3 * R, r: 0.5 * R, taken: false, kind: 'smash', again: true });   // the helmet, to come back (Game.gun)
      else if (ch >= '1' && ch <= '9') this.signs.push({ id: +ch, x: X(k) + t / 2, y: Y(r) - t / 2 });   // a word of the tutorial's, said there
      else if (ch === 'A') this.arenas.push({ x: X(k) + t / 2, y: Y(r) - t / 2, on: false, done: false, wave: 0, foes: [] });
      else if (ch === 'B') {   // a door into the wall, standing on the ledge under it: square to the ledge and the wall
        const side = k === 0 ? 1 : 2, w = DOOR.w * R, y1 = Y(r), x0 = side === 1 ? l - LEVEL.wall : this.r - w, x1 = side === 1 ? l + w : this.r + LEVEL.wall;
        this.bubbles.push({ x0, x1, y0: y1 - DOOR.h * R, y1, x: (x0 + x1) / 2, y: y1 - DOOR.h * R / 2, kind: this.pocketKind, goal: this.pocketKind === 'trial' ? this.pocketGoal : undefined, side, cd: 0, room: null });
      }
    }
    for (let r = 0; r < H; r++) for (let k = 0; k < COLS; k++) if (at(r, k) === '~') {   // moss under a block: that block's underside holds
      const x = X(k) + t / 2, y = Y(r + 1);
      for (let i = from; i < this.rects.length; i++) { const q = this.rects[i]; if (!q.plank && Math.abs(q.y1 - y) < 1 && x > q.x0 && x < q.x1) q.moss = true; }
    }
    // Some plain one-tile ledges are laid as planks to jump up through (not one with spikes on or
    // under it, or a spring on it; none in a pocket, by its door; none in a stash in the wall, a set piece, a gate or the last rest).
    for (let i = from; i < this.rects.length && c !== CHUNKS.pocket && c !== CHUNKS.vault && c !== CHUNKS.rest && c.kind !== 'set' && c.kind !== 'gate' && c.kind !== 'tut'; i++) {
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
    // A vault's cage (H, Z) as thin as it is drawn (the owner's pick, research/variants/tokyo-vault-1-px.png F), so nothing solid is out of sight: its walls a post
    // 0.4 tiles thick on its floor's side, reaching up to its roof, a bar 0.3 thick at the roof's top (where it is stood on), and its cracked floor a plate 0.35
    // thick at its foot (where a head-butt from below breaks it); the vault only opens up inside
    const cage = this.rects.slice(from).filter((r) => r.cage), floor = cage.find((r) => r.crack);
    if (floor) {
      const fx = (floor.x0 + floor.x1) / 2, roofs = cage.filter((r) => !r.crack && r.x1 - r.x0 >= r.y1 - r.y0), was = new Map(roofs.map((q) => [q, q.y1]));
      for (const q of roofs) q.y1 = q.y0 + 0.3 * t;
      for (const r of cage) if (!r.crack && !roofs.includes(r)) {
        if (r.x0 + r.x1 < 2 * fx) r.x0 = r.x1 - 0.4 * t; else r.x1 = r.x0 + 0.4 * t;
        const roof = roofs.find((q) => Math.abs(was.get(q) - r.y0) < 1 && q.x0 < r.x1 && q.x1 > r.x0);
        if (roof) r.y0 = roof.y1;
      }
      floor.y0 = floor.y1 - 0.35 * t;
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
  populate(rects, top, bottom) {   // (a tier's merged level, its parts in a new order each play: its enemies by a generator of their own, so the order
    // changes them, not its lay; the others as before)
    const wd = this.world, rnd = this.rc && this.rc.zones ? this.foeRng : this.rng, t = this.tile;
    const rc = this.rc, z = rc && rc.zones ? rc.zones[Math.min(2, Math.floor((3 * (this.floor - bottom)) / Math.max(1, this.floor - this.endY)))] : null;   // a tier's level: the part this chunk is in (Game: campMerge)
    const odds = z ? z.foes : rc ? rc.foes : wd.foes * (1 + 0.15 * this.stage);   // a recipe's own odds of one, and of two
    if (!wd.enemies || (this.foeTypes && !this.foeTypes.length) || bottom > this.floor - 6 * t || !(rnd() < odds * this.k)) return;
    const n = wd.pack || (rnd() < (z ? z.pair : rc ? rc.pair || 0 : 0.25 * this.stage) ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const type = pick(rnd, this.foeTypes ? Object.fromEntries(this.foeTypes.filter((k) => wd.enemies[k]).map((k) => [k, wd.enemies[k]])) : wd.enemies), eR = this.R * ENEMY[type].size, any = (list) => list[(rnd() * list.length) | 0];
      const taken = (r) => this.spawns.some((q) => q.ledge === r || q.rect === r);   // one enemy to a ledge or block
      if (ENEMY[type].move === 'crawl' || ENEMY[type].move === 'flow' || ENEMY[type].move === 'tumble' || ENEMY[type].move === 'crush') {   // (a worm sits on a ledge too; a tumbler, and a nurikabe over one)
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
    for (const sw of this.seesaws) {   // the hero's weight on a seat tips it down; left alone it comes back level (SEESAW)
      const fr = g.hero && g.hero.floorRect, on = fr && fr.move && fr.move.seesaw === sw && (g.hero.wallMask & 8) ? fr.move.side : 0;
      sw.om += ((on ? on * SEESAW.push : -SEESAW.spring * sw.th) - SEESAW.damp * sw.om) * dt; sw.th += sw.om * dt;
      if (Math.abs(sw.th) > SEESAW.max) { sw.th = Math.sign(sw.th) * SEESAW.max; sw.om = 0; }
    }
    for (const r of this.rects) {
      if (r.move && r.move.seesaw) {   // a seesaw's seat, at its beam's end, level
        const p = seatAt(r.move.seesaw, r.move.side), w = r.x1 - r.x0, h = r.y1 - r.y0, x0 = p.x - w / 2;
        r.dx = x0 - r.x0; r.dy = p.y - r.y0; r.x0 = x0; r.x1 = x0 + w; r.y0 = p.y; r.y1 = p.y + h;
      } else if (r.move && r.move.wheel) {   // a mill's board, round its hub, level (MILL)
        const p = millAt(r.move.wheel, r.move.i, this.t), w = r.x1 - r.x0, h = r.y1 - r.y0, x0 = p.x - w / 2;
        r.dx = x0 - r.x0; r.dy = p.y - r.y0; r.x0 = x0; r.x1 = x0 + w; r.y0 = p.y; r.y1 = p.y + h;
      } else if (r.move) {
        const m = r.move, w = r.x1 - r.x0;
        let x0 = r.x0 + m.v * dt;
        if (x0 < m.a) { x0 = m.a; m.v = Math.abs(m.v); } else if (x0 > m.b) { x0 = m.b; m.v = -Math.abs(m.v); }
        r.dx = x0 - r.x0; r.x0 = x0; r.x1 = x0 + w;
      }
      if (r.ac) {   // a Tokyo air conditioner (AC): stood on, it rattles, gives way AC.time s later and falls for good (r.t then times its fall, drawn)
        if (r.gone) r.t += dt;
        else {
          if (r.hit && !r.crumbling) { r.crumbling = true; sound.play('crumble', 0.4, 1.6); }
          r.hit = false;
          if (r.crumbling && (r.t += dt) > AC.time) { r.gone = true; r.t = 0; sound.play('crumble', 1, 0.55); crumbleFx(r, PAL.gray); }
        }
      } else if (r.crumble && !r.gone) {
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
      if (r.plank) {   // from above only: a point that was under its top passes; a body whose bottom was under its top passes whole, but not off the plank it stands
        // on (tester: «падаю вниз сквозь края тонких платформ»: landed near an end, the body sagged past it, its bottom went under the top and the plank let it all through)
        const up = Math.min(0, r.dy || 0);   // (one that rose this step, as a seesaw's seat or a mill's board: met at its top as it was)
        if ((this.stepMaxY > y0 - up + 3 && this.stepFloor !== r) || py[i] > y0 - up + 1) continue;
        face = 8;
      }
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
      if (hero && (r.crumble || r.ac)) r.hit = true;
      if (face === 8) {
        const v = (y[i] - py[i]) / h;
        if (v > hitW[3]) hitW[3] = v;
        y[i] = y0; x[i] -= (x[i] - px[i] - (hero && r.move && (r.move.wheel || r.move.seesaw) ? 0 : r.dx) * carry) * rf; mask |= 8; this.floorX += x[i]; this.floorN++; this.floorY = r.y0; this.floorRect = r;   // friction against the ledge's own motion: a mover carries what rides it (the hero on a mill's board is moved with it, Game.step)
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
const vec3 PAL[${Object.keys(PAL).length}] = vec3[${Object.keys(PAL).length}](${Object.values(PAL).map((c) => `vec3(${c.map((v) => v.toFixed(4)).join(', ')})`).join(', ')});
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
  for (int i = 0; i < ${Object.keys(PAL).length}; i++) { vec3 d = c - PAL[i]; float e = dot(d, d); if (e < best) { best = e; r = PAL[i]; } }
  return r;
}
`;
// The well: black, a sparse grid of the world's ink drifting at half the climb (so a climb
// reads as motion even past bare wall), and the walls in that ink striped with black,
// fixed to the world, with a lip line along the well.
const BG_DOTS = DEPTH.back;   // the dot grid's strength over the black (owner: the dots at the least brightness), and the far layer's (DEPTH)
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
    if (n > 0.62 + 0.3 * bayer(g)) c = mix(c, uDots, ${BG_DOTS.toFixed(2)});   // sparse, so the climb reads over them; faint (DEPTH)
  } else if (uWin > 1.5 && uWin < 2.5) {   // panel blocks far off (the Tower Blocks'): a regular grid of windows, a few lit, the floors' seams dotted between
    vec2 wp = vec2(float(g.x), float(py)), cw = floor(wp / vec2(8.0, 10.0)), iw = wp - cw * vec2(8.0, 10.0);
    float h = fract(sin(dot(cw, vec2(12.9898, 78.233))) * 43758.5453);
    if (iw.x >= 2.0 && iw.x < 6.0 && iw.y >= 3.0 && iw.y < 7.0 && h < 0.16) c = mix(c, uDots, ${BG_DOTS.toFixed(2)});
    else if (iw.y < 1.0 && mod(cw.y, 2.0) < 1.0 && mod(wp.x, 3.0) < 1.0) c = mix(c, uDots, ${BG_DOTS.toFixed(2)});
  } else if (uWin > 0.5) {   // a town far off (the Junkyard's, uWin 4; Tokyo's was uWin 1): windows lit here and there in rows, its buildings in columns with dark gaps between
    vec2 wp = vec2(float(g.x), float(py)), cw = floor(wp / vec2(6.0, 8.0)), iw = wp - cw * vec2(6.0, 8.0);
    float bx = wp.x - 36.0 * floor(wp.x / 36.0), h = fract(sin(dot(cw, vec2(12.9898, 78.233))) * 43758.5453);
    if (bx < 30.0 && iw.x >= 2.0 && iw.x < 4.0 && iw.y >= 3.0 && iw.y < 6.0 && h < 0.2) c = mix(c, uDots, ${BG_DOTS.toFixed(2)});
  } else if ((q.y & 7) == 3 && ((q.x + ((q.y >> 3) & 1) * 8) & 15) == 3 && (g.x & (s - 1)) == 0 && (py & (s - 1)) == 0) c = mix(c, uDots, ${BG_DOTS.toFixed(2)});   // a dot, faint (BG_DOTS)
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
uniform vec4 uLights[32]; uniform int uN; uniform vec2 uFire;
void main() {
  ivec2 g = cell();
  vec2 p = vec2(g) + 0.5;
  float lit = clamp((p.y - uFire.x) / uFire.y + 1.0, 0.0, 1.0);
  for (int i = 0; i < 32; i++) {
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
  o = vec4(k > 1.0 ? mix(PAL[0], col, k - 1.0) : col, 1.0);   // over 1: a tone k - 1 of the way from the black (DEPTH)
}`;
// The squishies in the same terms (in place of Gum's glossy cushion): the body's colour
// flat, shade as black tones stepping in toward the back and the bottom, a hard white
// highlight where Gum has its soft-box reflection, and the anti-aliasing skirt drawn as a
// black outline. Its patterns ride with the body (uOrigin is its centre in game pixels).
const BODY_FS_PIX = GLSL + PIX_GLSL + `in vec3 vN; in float vAO; in float vA; in vec2 vUV; out vec4 o;
uniform vec3 uBase, uDeep, uLine; uniform vec2 uOrigin; uniform vec3 uPaint;
float sdRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  if (vA < 0.04) discard;
  if (vA < 0.98) { o = vec4(uLine, 1.0); return; }   // the outline (black; the Kolobok's white)
  ivec2 g = cell() - ivec2(uOrigin);
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.42, -0.62, 0.66));
  float wrap = clamp((dot(n, L) + 0.45) / 1.45, 0.0, 1.0) * mix(1.0, vAO, 0.85);
  int k = wrap > 0.58 ? 0 : wrap > 0.46 ? 2 : wrap > 0.34 ? 3 : 4;
  // its colour shaded deep on its patches, white shaded in its colour elsewhere (FOE_PAINT: paintField over uPaint.x; -99 all of it, as any body but an enemy)
  vec2 u = vUV - vec2(0.0, 0.05);
  bool hot = sin(vUV.x * 3.3 + uPaint.y) + sin(vUV.y * 2.9 + uPaint.z) + sin((vUV.x - vUV.y) * 2.1 + 1.7 * uPaint.y) - 2.4 * exp(-5.0 * dot(u, u)) > uPaint.x;
  vec3 col = tone(k, g) > 0.5 ? (hot ? uDeep : uBase) : (hot ? uBase : PAL[8]);
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
// A boss's look and a forest enemy's, drawn on its body (LOOKS, FOREST_V) in the body's own frame: its sheet's drawing (FOE_SPRITES, below).
const LOOK_FACE = {};
// The Dark Forest's enemies as their sheets draw them (owner, 2026-10-20: «максимальное сходство с gpt»): each variant cut from
// research/variants/skazka-<id>-1-px.png on the game's grid as rows of ICON_INK letters ('.' clear), drawn on its body in the body's own
// frame (it squashes and wobbles with it), turned the way it faces; the body itself black under it (FOE_COLOR.goo); its grey red while it warns (b.warn: KIKI, LESHY).
const FOE_SPRITES = {
  'kikimora-C': ['..........................................s........', '..........................................s........', '....................................skkskkskkkkss..', '....................................skkskkskkkss...', '....................................skkskkskkks....', '....................................ssksksskks.....', '.....................................skksksksskss..', '.................................sskkskkksskskss...', '..................................skksskssskskskkks', '...................................sksskssksskskks.', '..................................sskssksskskskks..', '...................................skssksskskskks..', '.....................................ssksskssskss..', '...................................sssskssksskss...', '...................sssssskkkkkkkkkkksksssksskks....', '...................ssssssskkkkkkkkkksskskssskss....', '.................sssssssssssskkkkkkkskkskkskss.....', '..............sssssssssssssssskkkkkksskskssss......', '..........skkksssssssssssssssskkkkkkkskskskss......', '..sskkkkskkssssssssssssssssssssskkkkksssssks.......', '....skkkkkskssksssssssssssskkkkkskkkkssssks........', '.skkskkkkkkkkssssssssssssssksskkskkkkkkssss........', 'skskkskkkkkkkksksssssskssskssskkskkkkkkkss.........', '...ssskkkkkksskssssksssskkokksookskkkss............', '....skkkkkssssskssskssskkkokksookkkkkksss..........', '...sskkkksssssskksskssskkkokkskkkkkkkskss..........', '.skssssskssskkskkskksssksskksssskkkkkks............', '..sskksksssssssskskkssskkkksssksskkkkkks...........', '..skkkkksssssssskskkssskkkksssksskkkkkks...........', '.......ssskssskssksssskssskkkssssskkkss............', '......ssssssssssssksskksssskkksssskkkss............', '......ssssssssskkskssskkssskkkksssskkss............', '......ssssssssssskksskkkkkkkkkkksssskss............', '.....ssssskskssssskksskkkskkkkkkksssks.............', '.....ssksssskksssskkskkksskkkkkkksskks.............', '.....sskssssksssssskkssksskkkkkkkkksks.............', '.....ssssssksskssssskkss...........................', '....ssssssskssksssssssss...........................', '....ssssksskssksssssskkkkkkkkkkkkss................', '...ssssksssskkkssssssssskkkkkkkkkssssss............', '....sssksssssskksssssssskkkkkkkkssssss.............', '...ssssssssssskkkssskssskkkkkkkkssss...............', '....ssssskksssskkssssssksssssskssssssss............', '.....sssssskssskkksssssksssssskkkksss..............', '.....sssssskssskkksssssksssssskkkkkks..............', '.....ssksssskkssskkkssskssskks.....................', '..skkssksssksskksskkkssksskkkskkkks................', '.skskskkssssssskkskkkkkkkskkkskkkks................', '..skskkksssssssssksskkkkkkkkkkkkkks................', 'sskkkkkkkssssssssskkssskkkkkkkkkkss................', '..........sssssssssksssskkkkkkkkks.................', '...........ssskssssskssskkkkkkkkks.................', '............sssssssskkksskkkkkkkss.................', '...........sksssssssskksskkkkkkkss.................', '...........skkssssssskksskkkkkkks..................', '.....sskkssksssssksssssksskkkkkks..................', '....sssssssksssssksssssksskkkkkks..................', '....sssssssksssssksssssksskkkkkss..................', '..ssksskksskssskkksssssksskkkkkss..................', '.....skkkkkksssskssssskssskkkkkss..................', '.....skkkkkkssskssssskkksskkkkks...................', '.....sskkkkkssksssssskkssskkkkss...................', '....ssskskkkkkkkksssskksskkkkks....................', '....ssskskkkkkkkksssssssskkkkks....................', '....ssskskkkkkkkksskssssskkkkks....................', '.ssskskskkkkkkkskskskssss..........................', '....skkskkkkkkkkkskskssss..........................', '...sskkskkkkkkkkksksksss...........................', '..ssksskkkkkkkkkkkkkkss............................', '...skkkkkkkkkkkkkkkkkss............................', '......................s............................', '......................s............................', '......................s............................'],
  'leshy-B': ['.........................s.....................', '......................skskkkkkkkkkkkkkkkkkkw...', '......................sswkkkkkwkkkkkkkkkkkks...', '.................skkkkswkkkkksskkkkkkkkkkkkss..', '.................skkkksskkkksskkkkkkkkkkkkkks..', '.................skkkksskkksskkkkkkkkkkkkkkks..', '..................sskksskkssskkkkkkkkkkskkkkw..', '...................sskssksskkkkkkwkkkkkkskkks..', '....................sssssskkkkkkwwwkkkkkkssks..', '......................sssskkkkkkswkkkkkkkksss..', '......................sssskkkkskswskkkkkkksss..', '......................sssskkkkkkskkkkkkkkksss..', '......................sssskkkkkkskkkkkkkkksss..', '.......................sssskkkkkskkkkkkkksss...', '........................sssskksksskkskkkkss....', '.........................ssswksskskssskksss....', '.................rrkkkkkksssssksssskssskks.....', '................rrwrkkkkkksssskkssskksks.......', '...............rrrrrrkkkkskssskskssskssss......', '...........................ssskskskssskss......', '..........rrrkkkkkwkkkkkkkksksskssssssssskkkr..', '..........wrrrkkkkskksskkskssskkksssksskkkkrrr.', '.........rrrrrrkkksskkssksssskkokksssskkkkkrrrr', '.........rrkkkkkkskkkssskkssskkyykkssskykkkkrrr', '............skkksksssssskkssskkoykksssyykkks...', '............sskssssksskkkssssskkkksssskkkkks...', '.............skkkkksskssksssssskkssssskkkks....', '.............sksksksssskksksssssssssssss.......', '.......wwwkkssssskksssskskkskskssskssssks......', '.......wwwkssskkksskssksskssksksssskkssks......', '..........ssskssssskssssskwskssskkkkkkskss.....', '..........sssksssksssskssksssssksskkkkskss.....', '..........skkkssskssssssskwkskskssssskskss.....', '...........sksssskskssssskkkssskssssssskss.....', '.........ssskssssskssksssskksskssssssssksss....', '........ssssksssskkssssssskksskskskssskskss....', '.......sskssssskskksksssskskssksssksssks.......', '.......skkssskskkkkkkssssskkssksksksksks.......', '......sksssskkkkkkksksssskskkksksssssskkss.....', 'skkkksssskskkkkkkkkkksksskskkkskksksskksss.....', '.sssssksskkkkkkkkkskssksskskkkskksksskksks.....', '...sskssskkkkkkkkkkkskkssskkkkkksskskkkskss....', '..ssskssskkkkkkkkkskkkskssskkkkkkskkkkkssss....', '.sksssskkkkkkkkkksskkkkkskkkkkkkkskkkkkskss....', '...sssskkkkkkkkkksskskkkskskkkskkskkkkksksss...', '...sssskkkkkkkkkksskkskssssskkkskkkkkkskksss...', '..wkssskkkkkkkkkksksssksssssssskkkkkkkkkkssss..', '..sksssskkkkkkkkksksksksksssssskkkkkkkskkssks..', '.skksssskkkkkkkkksksssssksskskskkkkkkkwkkssks..', '....sksskkkkkkkkkkksskssksskskskkkkkkkkkkkssss.', '....skssskkkkkkkkkkssksskkskskskkkkkkkkkkkssss.', '....sksssskkkkkkkkkkskssksskkskkkkkkkkkkkkssks.', '......sskkskkkkkkkkksksskssksskkkkkkkkkkkkssss.', '......sskkskkkkkkkkssksskskkkskkkkkkkkkkkkssss.', '.....ssskkkskkskkkkskksssskkkskkkkkkskkkssssks.', '....sksskkkskkkkkksskksssskskskkkkkkkkksskksks.', '....sksskkkkkkkkkkskkksksssskkkkkkkkkkkskkssks.', '....skkskkkkkkkkkkskkkkssssskkkkkkkkkksskkss...', '....skkskkkkkkkkkskskkksskskkkkkkkkkkkskkksks..', '.....sksskkkkkkkkskskksskkskkkkkkkkkkkskkksks..', '.......................sskskkkkkkkkkkkkkkksks..', '.......................sskskkkkkkkkkkkkkkss....', '.....................wssskkkkkkkkkkkkkksks.....', '.....................skkskkkkkkkkkkkkkkks......', '....................sksks......................'],
  'probka-F': ['...........kkkkkkkkkkk.........................', '.........kkkbbbbbbbbbkkkk......................', '.......kkkbbbbbbbbbbbbbbkkkk...................', '.....kkkbbbbbbbbbkbbbbbbbbbkk..................', '....kkbbbbkbkbbbbkbbbkbbkbbbkk.................', '...kkbbbbbbbbkbbkkkkbkbbbbbbbkk................', '...kbbkkkbbkkkkkkkkkkkkbkkkbbbkk...............', '..kkbkkbbkkkbbbbbbbbbkkkkkbkbbbkk..............', '.kkbkkbkkbkbbbbbbbbbbbbbbkkbkbbbk..............', '.kbbkbkkkbbbbbbbbbbbbbbbbkkbkbbbkk.............', '.kbbkbkkbbbbbbbbbbbbbbbbbbkbkbbbbk.............', 'kkbbbkkbbbkkbbbbbbbbbkkkbbbkkbkbbk.............', 'kbbkbkbbbkkkkkkkbkbkkkkkkbbkkkbbbk..kkkk.......', 'kbbbkkbbkkkwkkkkkkkkkwkkkkbbkkkkbkkkkbbkkkk....', 'kbbbkbbbkkkwkwkkkkkkkwkkkkbbkkkbbbkbbwbkkbkk...', 'kkbbkbbkkkkwkkkkbkkkkwkkkkbbbkbbbkkbbsbkbbbk...', '.kbbkbbbkkkkkkbkkkbkkkkkkkbbbkkbbkkkkwbbbwbkkk.', '.kkkkbbbbkkkkbbwkwwbkkkkkbbbbkkbbk..kkkbwwbbbk.', '..kbkbbbbbbbkwwwkwwbkbkbbbbbkkbbkk....kkkbbbbkk', '..kkbbbbbbbbbkkkbkkkbbbbbbbbbbkkkkkkkkk.kkbbkbk', '..kbbbkbbbbbbbbbbbbbbbbbbkkbbbbk.kbbbskk.kkbbbk', '.kkbkkbkbbbbbbbbbbbbbbbbkkbkbbbkkkwbbbbkk.kkbbk', '.kbbbbbbkbbbwwwwwwwwwwbbkbbbbbbbkkbbbwbwkk.kbbk', '.kbbbbbbbbwwwwwwkwwwwwwkbbbbbbbbkkkkbbwbbkkkkkk', '.kbbbbbbkbwwwwwwwwwwwwwwkbbbbbbbk..kksbbbsk....', 'kkkbbbbkbwwwwwwwwwwwwwwwkkbbbbbkk...kkbbbwk....', 'kbbkkkkkwwwwwwwwwwwwwwwwwkkbbkkbk....kbbbwk....', 'kbbbkkbbwwwwwwwwwwwwwwwwwbbkkkbkkk...kbbbbk....', 'kbbbbbbbwwwwwwwwwwwwwwwwwbbbbbbbbk...kkbbkk....', 'kkbbbbbbwwwwwwwwwwwwwwwwwbbbbbbbkk....kkkk.....', 'kbkbbbbbwwwwwwwwwwwwwwwwbbbbbkbkkkkkkkkkkk.....', 'kkbbkbbbbwwwwwbwwwwwwwwbbbkbkbkk.kbbbbbbbk.....', '.kbbbkbbbbwwwwwwwwwwwwbbkbbkbkbk.kkbbbbbkk.....', '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..kkkkkkk......'],
  'cart-C': ['......................kkkkkkkkkkkk.....................', '...................kkkkooooooooookkkk..................', '..................kkooooooooooooooookkk................', '................kkkokokoookoooookoooookk...............', '...............kkooookoooooooooookoooookk..............', '..............kkooookoooooooooooookoooookk.............', '..............kooooooooooooooooooooooooookk............', '.............kkokoooooookoooooooooooookoook............', '............kkokokoooooooooooooooooookooookk...........', '...........kkoookooooooooooooooooooooooooook...........', '...........koooooooooooooooooooooooooooooook...........', '....kkkk..kkkokooooooooooooooooooooooooooookk..........', '...kkookkkkooooooooooooooooooooooooooooookook.kkkkk....', '...koooookkoooooooooooooooooooooooooooookoookkkoookk...', '..kkookoookoooooooooooooooooooooooooooooooookkoookokk..', '..kookkkookoooooooooooooooooooooooooooooooookoookkookk.', '..kook.kkkkoooooooooooooooooooooooooooooooookokkkkoookk', '.kkokk....koooookkkoooooooooooooookkooooooookkk..kkoook', '.kookkkkk.kooooookkkooooooooooookkkoooooooookkkkk.koook', '.kokkoookkkoooooookkkkooooooookkkkoooooooookkkookkkkook', '.kkkoooookkkoooookwwwkkooooookkwwwkooooooookkooookkkokk', '.kkookkkookkkoookwwwkwkkkoookkwkwwwkoooooookookkookkkk.', '.koook.kkkk.koookwwkkkwkooookwkkkwwkooooookkkkkkookk...', 'kkookk.kkkk.kkookwwkkkwwkoookwkkkwwkooooook....kkook...', 'koook.kkookkkkookwwwkkwwooookwwkwwwkoooookkkk...kookk..', 'kookk.koooookkkookwwwwwkooookkwwwwkkooookoookk..kkook..', 'kook..kooooookkkoookokoookkooookokoooookoooookk..kook..', 'kokk.kkookkkkk.kkoooooookkkoooooooooookkkkkkook..kokk..', 'kkk..koook......kkoooookoookooooooookkk....kookk.kok...', '.....kookk.......kkkkkkkoookkooookkkk......kkook.kkk...', '.....kook..............kkkkkkkkkkk.........kkook.......', '.....kookk.................................kookk.......', '.....kkook.................................kook........', '......kkkk.................................kkkk........'],
  'puck-F': ['...................................kkkkkkkkkkk............', '.............kkkkkkkkk.........kkkkkwwwwwwwwwkkkk.........', '.............kbbwkbbwkk.....kkkkwwwwwbbwwwwbbwwwkkk.......', '.............kkkkbbwbwk....kkwwwbwwwwwkkwwwwwwkwwwkk......', '................kkkkbkk...kkwwwbbbwwwwwwbwwwwbwwbbwkk.....', '...................kkk...kkwwwwwkbwwwwwwwwwwwwwwwbwwkk....', '........................kkwwwwwwwwwwwwwwwwwwwwwwwbwwwkk...', '.......................kkwbkwwwwwwwwwwwwbwwwbwwwwwwbwwk...', '..............kkkkkkkkkkwwwbbwwwwwwwbbkkkkkkkkkbwwwwwwkk..', '........kkkkkkkbbbbkkwwbwwwwwbwwwwkkkkssssssssskkbwwwbwk..', '...kkkkkkbwwwbbbbbbwwkwwwwwwwwwwbkssssssssssssssskbwwwwk..', '...kwwbwwbbbbbwbwbwwwkwwwwwwwwwbkssssssssssssssssskbwwbkk.', '...kkkbbwwbbbbbwbwwwwkwwbbwwwwwkssssssssssssssssssskkwwwk.', '.....kkbkkkbbbbwbwwwkwwwwwbwwwkksssssssssssssssssssskwwbk.', '......kkk.kkbbbbbbwkswwwwwwwwwksssssssssssssssssssssskwbk.', '...........kkkkbbbkkwwbkwwwwwbssssssssssssssssssssssskwwkk', '..............kkkkwwwwwkwwwwwkssssskssssssssssssssksskbwwk', '.............kkwwwwwwwkwwwwwbksssssskksssssssssskksssskwkk', '.........kkkkkwwbwwbwwwwwbwwksssssssskkksssssskkkssssskwk.', '......kkkkbbkwbbwwwwwwbbbwwwksssssskkwksssssssskkkssssbwk.', '..kkkkkwbbbbkwwbwwwbbwwbwwwwksssssskkwksssssssskwkkssskwk.', '.kkwwwwbbbbbkwwwwwsbwwwwwwwwkssssskkkkksssssssskkkkssskwk.', 'kkwbbwbbbbbbkwwwwbbwbswwwwwwksssssskkkksssssssskkkksskwwk.', 'kbwwbbbbbbbbkwwwkbbwwwwwwwkwwksssssskksssssssssskkssskwbk.', 'kkkkkkkkbkbbbkwkwwwwwwbwwkwwwksssssssssssskkkkssssssskwkk.', '.......kkkkkkkkwwwwwbswbkwwwwwkssssssssssksssssssssskwwk..', '.............kbkwbbbwwskwwbbwwwkssssssssssssssssssskwwbk..', '.............kwwkbbwwbkwwbbbbwwwksssssssssssssssskkwwwkk..', '............kkbwwkkbbbwwwsbkbwwwbkksssssssssssskbwwwwkk...', '...........kkbbwwwbbbwwwswbbwwbwwwkbsssssssssskwwwwwkk....', '..........kkbbbbwbbkwkwwwwbwwkbwwwwbbkkbkkkkkkbwwwbbk.....', '..........kbbwkbbbkkkbkkkkwwbkbbwwwwwwwbwwwwwwwwbwkkk.....', '..........kkbbwkbkk.kbwwbbksbwkbbwbbwbwwwwwwbbwbbkwkk.....', '.........kkkwkwbkk..kbbwwbbkbkbbkkkwkbwbkwskkwbkkbbbk.....', '.........kwwbbbkk...kbbbbbbkkkbbwwbbkbkkkkkbkkkbbwbkk.....', '.........kwwbkkk....kkbbbbkk.kbbwbbbkbbbwwbbk.kbbwkk......', '........kkbbbk......kbbbwbk..kbbbbbkkkbbwbbbk.kbbbk.......', '........kwbkkk......kbbbwkk..kkbbbkk.kkbwbbbk.kbbbk.......', '........kkkk........kbbwbk...kbbbbk...kbbbbkk.kkbbk.......', '....................kbbbkk...kbbbkk...kbbbwk...kbkk.......', '....................kbwbk....kbbwk....kbbbbk...kwk........', '....................kbbkk....kkbkk....kbbbkk...kbk........', '....................kwbk.....kbwbk....kbbwk....kbk........', '....................kbkk.....kkwkk....kbbwk....kkk........', '....................kkk......kbbk.....kkwbk...............', '.............................kkkk......kwkk...............', '.......................................kwk................', '.......................................kkk................'],
  'tram-E': ['.........................kkkkkkkkkk....................', '........................kkggggggggkk...................', '.......................kkggggkkggkgkk..................', '......................kkggkkggggkkggkk.................', '.....................kkggkkkkggkkkkkgkk................', '....................kkggkkkkggggkkkkggkk...............', '....................kggkkkkggkkkgkkkkkgk...............', '....................kgkkkkkggkkkggkkkkgk...............', '....................kkgkkkkkggkgkkkkkgkk...............', '.....................kkggkkkkgggkkkggkk................', '......................kkggkkkgggkkggkk.................', '........kkkkkkkkkkkkkkkkkggggkkggggkk..................', '........kssssssssksswswswkgggggggggk..kkkkkkkkkkk......', '.......kkkkkskkksskwswwwswkkkkkkkkkkkkksswwwswwwkk.....', '.......ksssssssssskswssssskswwwswswwwsksssskwswswk.....', '....kkkkkkkkkkkkkkkkssssswkwswwwwwwwwwwkswswssswsk.....', '..kkkggggggggggggggggkkggggkgkkkkkkkkkkkkkkkkkkkkkkkk..', '.kkgggggkwwwwwggggggggkgggggggggggggggggggggggggggggkk.', '.kggggggkwwwwwgggggggggkgggggggggggggggggggkgkgkkkkkgkk', 'kkkgggggkkkgkkkkggggkggkkkkkkkkgggggggggggggggggggggggk', 'kggkgggggggggggggggkkggggggggkggggggggggggggggggkgggggk', 'kkkkkkggggggggggggkkkkggkkkggggkkkkggkkkkgggggggkgggggk', '.kgkkkkkggggggggkkkkggggkkskgggkkkkggkskkggkkkkgkkkkkgk', '.kgyykkkkggggggkkkyykgggkskkgggkkkkggskskggskkkgk...kgk', '.kkyyyykkkkggkkkkyyyykggkkkkgggkkkkggkkkkggkkkkgk...kgk', '.kyyykkykkgggkkykkyyykggkskkgggkkskggskskggskskgk...kgk', '.kyykkkyykgggkyykkkyykggkkskgggkkkkggkkkkggkkkkgk...kgk', '.kyyykkyykgggkyykkyyykggkskkgggkkkkggkkskggskkkgk...kgk', '.kyyyyyyykgggkyyyyyyykggkkkkgggkkkkggkkkkggkkkkgkkkkkgk', '.kgyyyyykgggggkyyyyykgggggggggggggggggggggggggggkgggggk', '.kgkkkkkggkkkggkkkkkggggwwwwwkwwwwwswwwwwwwswswskwwwwwk', '.kggggggkkkkkgkgggggggggggggggggggggggggggggggggkgggggk', '.kgkkgggkggkggkgggkkggggggggggggggggggggggggggggkgggggk', '.kkwwkggkggkggkgggwwkgggggggggggggggggggggggggggkgggggk', '.kgkkgggkggkggkgggkkggggggggggggggggggggggggggggkgggggk', '.kggggggkgggggkggggggggkgggggkggggggggggggggggggkgggggk', '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk'],
  'crane-F': ['..............kkkkk.kkkk.................', '..............kssskkkssk.................', '..............kksssksskk.................', '...............kksssskk..................', '...............kkkkkkk...................', '...............kbbbbbk...................', '...............kkkbkbkk..................', '...............kbbkkkbkk.................', '..............kkbkkbkkbk.................', '..............kbbkbbkkbkk................', '.............kkkkkbbkkkbkk...............', '.............kbbkkbbk.kkbk...............', '............kkbkkkbbk..kkk...............', '............kbbk.kbbk....................', '...........kkbkk.kbbk....................', '...........kbbk..kkbk....................', '..........kkbkk...kkkkkkkkkkkk...........', '..........kbbkkkkkkkoooooooookkk.........', '..........kkkkoookkooooooooooookkkk......', '.........kkbkoooooooooooooooooooook......', '.........kbbooooooooooooooooooooookkk....', '.......kkkbbooooooooooooooooookkkoookk...', '......kkokbkooooooooooooooookooooooook...', '.....kkoobkooooooooooooooooooooooooook...', '....kkooobkooooooooooooooooooooooooookk..', '....koookbkoooookoooooooooookkwkkkwwkok..', '....koookbkooooooooooookkoookkwkkkwwkok..', '...kkooobbkooooooooookkkkoookkwkkkwwkokk.', '..kkoooobkoooooookkkkkwwkooookkwwwwkoook.', '..kooookbkooooooowwwkkwwkoooookkkkkooook.', '..kooookbkooooookwwwkwwkkooooookkkoooookk', '..kooookbkooooookwwwwwwkooooooookoooookok', '..kooookbkoooooookkkskkooooookkooookkkook', '.kkooookbkooooooookkkoooookkkbkkkbooooook', 'kkoooookbkoooooooookooookkbkkkkkkbkkooook', 'kooooookbkoooooooooooookbbkkkkkkkkokksook', 'kooooookbkoooooooooookkbkkkooooookkookbok', 'kooooookbboooooooookbbokkkooooooooooookbk', 'kooooookbbkooooooobkkookooooooooooooookkk', 'kooooooobbkoookbkbkoookooooookkoooooooook', 'kkkooookbbkkkkbkkooooooooookooooooooooook', '..kbkbokkbkbbbkoooooooooooooooookoooooook', '.kkkkkkkkbkkkkooooooooooookooooooooookook', '.kooooookbkooooooooooooookooooooooookoook', 'kkoooookkbbooooooooooookooooookooookkoook', 'koooooookbbkoooooooooooooooooooooookooook', 'koooookookbkoooooooookkooooookoooookoookk', 'kooookoookbkoooooooooookoookkoooookoooook', 'kkoookoookbkkoooooooooookkooooooookoookkk', '.kkoooooookbkooooooooooookkoooooooooook..', '..kooookookbkooooooooooookkooooookoookk..', '..kkooookoobbkookoookoooookoooookoookk...', '...kkkkkkkokbkoookoookoooookoookookkk....', '.........kkkbbooookoookooookookkook......', '...........kkkkooookookooookookkkkk......', '..............kkkkkkoookoookkkk..........', '...................koookoook.............', '...................koooooook.............', '...................koooooook.............', '...................kkoooookk.............', '....................kkoookk..............', '.....................kkokk...............', '......................kkk................'],
  'pigeon-A': ['.........................................................kkkk', '........................................................kkssk', '.......................................................kksssk', '......................................................kkssssk', '.....................................................kksssskk', '....................................................kksssssk.', '...................................................kkssssskk.', '..................................................kksssssskk.', '..........................kkkk..................kkkssssssksk.', 'kkkkk....................kkrrkk................kkssssssssskk.', 'kssskk..................kkrrrrkk..............kksssssssskkk..', 'ksssskk................kkrrrrrrkk............kkssssssskkk....', 'kksssskkk..............krrrrrrrrk..........kkkssssssskk......', 'kkkssssskk............kkrrrrrrrrk.........kksssssssssk.......', 'ksssssssskk.........kkksskkkkkkkkkk......kkssssssssskk.......', 'kssskssssskk........kssssssssssssskk.....ksssssssssssk.......', 'kkssssssssskk......kkssssssssssssssk....kksssssssssssk.......', '.kssssssssssk......kssssssssssssssskk..kkssssssssssskk.......', '.ksssssssssskk....kkssssssssssssssssk.kkssssssssssskk........', '.kksssssssssskk...ksssssskssssssssskkkkssssssssssssk.........', '..kksssssssssskk..kssssswwwsssskskwskksssssssssssskk.........', '..ksskssssssssskkkkssssswwkkkssskkkwksssssssssssssk..........', '..ksssssssssssssskkssssswwkksssskkkwwsssssssssssskk..........', '..kkksksssssssssssksssssswkkskkkkkwsksssssssssskkk...........', '....kssssssssssssssssssssswwkssskwsskssssssssssk.............', '....ksssssssssssssssssssssskssssssskkssssssssssk.............', '....kkssssssssssssskssssssssssssssskssssssssskkk.............', '.....kkssssssssssssskssssskssssssssksssssssskkk..............', '......kkssskssssssssskssssssksssssskskssssssssk..............', '.......kkssssksskssssskssssksksssssskkssskkkkkk..............', '........kkksksskkssssssskkkkkkkssssskkkkkk...................', '..........kkkkksssssssssskssssskssssskk......................', '.............kksssssssssskssssskksssssk......................', '.............ksssssssssskssssskkkksssskk.....................', '.............kssssssssssksssssk..kksssskk....................', '.............kkssssssssskskskkk...kkssssk....................', '..............ksssssssssssskk......kkksskk...................', '..............kkkssssssssskk.........kkssk...................', '............kkkkssskskkkskk...........kksk...................', '...........kkskssskkkksssk.............kkk...................', '...........kskssssk..kssskk..................................', '...........kksssssk.kksssskk.................................', '............ksskssk.kssssssk.................................', '............kskskkk.kksksskk.................................', '............kkkkk....kkkkkk..................................'],
  'namazu-D': ['..........kkk..........................................................................', '........kkkokkkkk.kkkkkkk..............................................................', '.......kkoookoookkkokokokk.............................................................', '.......koookkooookoooooook.............................................................', '......kkoookooookooookoook.............................................................', '......koookooookooookkoook.............................................................', '......kookookookkoookoookk.............................................................', '......kookokookkoookoookk..............................................................', '......kokkooookooooooook...............................................................', '......kkkkoookooookoookk...............................................................', '.....kkoooooooookoooook................................................................', '....kkoooooookkkooookkk................................................................', '...kkoooooookooooookk..................................................................', '..kkoooooookoooookkk...................................................................', '..koooooookkkoookk.....................................................................', '.kkoooooook.kkkkk......................................................................', '.kooooooook............................................................................', 'kkooooooook......................kkkkkkkkkkkkkkkkk.....................................', 'koooooooookk...................kkkcccscckccckkwwwk.kkk.................................', 'kooooooooook...................kckccccscckckwwwkkkkkckkkk..............................', 'koooooooookk..................kkcccccckcccckkwwkkccccscckkkk...........................', 'kooooookookk..................kcccccccscckkwkwwkccccsccbscckk..........................', 'kooooooooookk................kkcscsccsccckwwwkkccccscccscccck..........................', 'kooooooookkokk..............kkckckccccsbkkssskckccscccsccksckk.........................', 'kooooooooooookkk...........kkcccscccccckkwkskcccccccscccssccbk.........................', 'kooooooooooookokk.........kkccccckccscckswwkkcccccccscccscckskkk.......................', 'koooooooookokoookk........kccccscscscccksskkcccscccccccscckckcck.......................', 'kooooooooookoooookkkk.....kcccskcksccckwwwkkccscccckccscckccckckk......................', 'koooooooookoookkooookkkkk.kcsccckckccckwkkkccsccccccscccsckcsccsk......................', 'kooooooooooookooooooooookkkcckckbkccckkkwwkcscccscckscckckckckckk......................', 'kooooooooooooooooookooooooksccccscccckwwwkcccsccccccccccccccccck.......................', 'kkoooooookoooooookkooookookkckckcccckkwwkkccccccccccccccccscscck.......................', '.kooooooooooooooookoookoookkcscccckckkwkkkkkcccccckcccccccccccck.......................', '.kooooooooooooooooookkooookkkckckkkkckwkwkccckccccckcckckkckckkk.......................', '.koooooooookooooooookoookoookkckcscckkwwkkkcksckkscckkckcckckbk........................', '.kkooooooookookoooooooookooookkkkkkcckwkkkbkckkcckckcckkkkckckk........................', '..koooooooooooooookoooooooooookkkkkkkkkwkkkckkckcckckkckcckckk.........................', '..kkooooooooooookkoookoooookookkoook..kkk.kkkkkkkkkkkkkkkkkkk..........................', '...kooooooooooookoooookoookoookkoook.....kkk...........................................', '...kkooooooookoooooookkkokoookkoookk...kkkokkkkkkkkkkkkkkkkkkkkkk......................', '....koooooooooooookooooooooookoookkk.kkkooooooooooooooooooooooookkkk...................', '....kkooooooooooooooooooookkooookkokkkooookoookooooooooooooooooooookkkk................', '.....kkoooooooooookooooooooooookooookoooooookoooooooooooooooooooooooookkk..............', '......kooooooooooooookooooooooooooooooooooooooooooooooooooooooooooooooook..............', '......kkoooooooooooooooookkoookoookoooookoooooooooooooooooooooooooooooookk.............', '.......koooooooooooooooookooookokokookoooooooooooooooooooooooooooooooooookkk...........', '.......kkooooooooooooooooooookoookoooooooooooooooooooooooooooooooooooooooook...........', '........kkkooooooooooooooooookoookoooooooooooooooooooooooooooooooooooooooookk.....kkkk.', '..........koooooooooooooooooooookkooooooooooooooooooooooooooooooooooooooooook..kkkkookk', '..........kkooooooooooooooooooookoooooooooooooooooooooookkkoooooooooooooooook.kkooooook', '...........kkoooooooooooooooooooooooooooooooooooooooooooookkkoooooooooooooookkkoookkook', '............kkkooooooooooooooooooooooooooooooooooooooooookkwwkkooooooooooookkkookkkkkok', '..............kkkkoooooooooooooooooooooooooooooooooooooookkwwkkkkooooooooookokkkk...kkk', '.................kokooooooooooooooooooooookooooooooooooookkkskkkkoooooooooooook........', '.................kkkooooooooooooookooooooooooooooooooooooookkkkkooooooooooooook.....kkk', '...................kkkkooooooookkkkkkkkkkkoooooooooooooooookkkkooooookooooooook.....kok', '......................kkkkooookkooooooooooooooooooooooooooooooooooooooooooooook....kkok', '.........................kkkkkkkkkkkkkokkoooooooooookkkkooooooooooooooooooooook...kkokk', '.............................kooooooookooooooooooookooooookooooooooookkkkkkkokk..kkokk.', '.............................kkkokkkkkooooooookoookooookkooooooookkkkkoooookkk...kook..', '............................kkooooooooooooooookoookookkkkkooooookkooooooooook....kook..', '...........................kkoooooooookooooookkkokookkkkkkooookkkooooooooookkkkkkkokk..', '..........................kkoooookkkooooooookk.kkkookkooooooookoooooooookkkkkoookkokk..', '..........................kooookkkooooooookkk...kkokkkkkoooooooooooookkkk..kooookkookk.', '..........................kkooooooooooookkk.....kook...kkkkkkkkkkkkkkk.....kooookkkook.', '...........................kkkkkooookkkkk......kkokk...kkooook.............kokokk.kkkk.', '...............................kkkkkk.........kkokk....koooook.............kkoook......', '.............................................kkook....kkoooook..............kkkkk......', '.............................................kookk...kkoooookk.........................', '.............................................kokk.kkkkokoookk..........................', '.............................................kokkkkooooookkk...........................', '.............................................kkoooookkokkk.............................', '..............................................kkkkkkkkkk...............................'],
  'koschei-A': ['.....kkkk........................................................................', '.....krrk........................................................................', '....kkrwk...........................kkk.kkk......................................', '...kkrskk...........................krkkksk......................................', '..kkrksk..........................kkkrkksskkk....................................', '..krrssk..........................kskskksskrk....................................', '..krkskk..........................ksksskrskskk...................................', '..krksk...........................kskssskssssk...................................', '.kkrssk...........................kssssssssssk...................................', '.krrskk...........................kskkkkkkkssk...................................', '.krrsk...........................kksskksssskkk...................................', '.krksk...........................kwswkowsskk.....................................', '.krksk...........................kwkwkokwkok.....................................', '.krssk...........................kksskkswkkkk....................................', '.krssk....................kkkkkkk.kkkssskwssk....................................', '.krksk...................kkssksskkk.kkssswkkk....................................', '.krrsk...................ksksskskskkkskkskk..kkkkkk..............................', '.krrskk..................kkkkwskskskkwkkkk.kkksssskk......................kkkk...', '.krrssk...............kkkkskkkkkskkkkkwswk.ksssksssk..................kkkkkwwk...', '.krrksk..............kkssskskkwssk...kkkkk.kkskssskkk................kkwkkwkkkkkk', '.kkrksk.............kkssskskskwskk......kkkkskkkkksskkk..............kwkkwwkwwwwk', '..krksk............kkssssksssskkk....kkkkwwwkwwwkwsssskkkk...........kwkwsssskkkk', '..krrkkkkk....kkkkkksssskssskkk......kwwswkkkkwkwssksssswkkkkkkk..kkkkskksssswwkk', 'kkkkkkkssk....ksssssksskwwskksk......ksskkkkkkkkkwsksssskkwkksskkkkwwwksssksskkwk', 'kwksssskkk...kkksssskssskskkksk......kskswwwkkskkksskkskwwksssskwswsskkkkkkkkwkkk', 'kkskkkkkk..kkkwkssssssskssskssk....kkkskkkskkkskkskkkwsswwkssskwwwwkkk......kkk..', '.kkkskwwkkkkwwwwkssskkkkssskskk..kkkwssswwkk.kksksskkkskwkssskwwwkkk.............', '..kwwkwkwkwwwwswkwwkkkkssskssk..kkwwkkskkwwk..kskssskwkkkwksskkkksk..............', '..kskskkwkwkkkkkkkksskssskkskk..kskkkssskkkk.kkksksskksskskskk.kksk..............', '..kssskkskkksk..kksssskssskssk..kkkwwkskwwk..kssskssssksskssk..kskk..............', '..kkskskkk.ksk..kskssksssksssk..kwwwkkskkwkk.ksskksssskksksskk.ksk...............', '...kwwkk...ksk..kskssksskksssk..kkwkkkskkkwk.kssssksskssksssskkkwk...............', '...kkkskk..ksk.kkskskssksksksk...kkkkssk.kkk.kksssksksksskskskkssk...............', '.....kssk..ksk.ksksskskssskssk......kksk......ksksssskssskssskkskk...............', '.....kssk..kskkksssssksssksssk......kssk......kssssssssssskskkssk................', '.....kkkk..ksskskskssksssksskk.kkkk.kkwk..kkk.kssksssksssksskkksk................', '...........kskkksskssksksssssk.kwskkkswkkkksk.kssskssskssksskkkkk................', '...........kskkssksskskssskssk.kksskkkkkksssk.ksssssssssssssskk..................', '...........ksksssssksssssksssk.kwkksssssssksk.ksssksssssssksssk..................', '...........ksssssksssksskssskk.kkwksksskkkskk.kksskssksssksskskk.................', '..........kksskkkskkssssksskk...kkkkkksk.ksk...ksssssskssssksksk.................', '..........ksssskksssksskssksk...kkwksssk.kkkk..ksskssssksssssssk.................', '..........kssskkksskskssssssk..kkskkwkkkkkssk..ksksssksksssssssk.................', '..........ksskkkssksksssskssk..ksskkkwkwksssk..ksssssksssksssksk.................', '..........kssk.kssssssskksskk..kssk.kwkwkkssk..kkssssssskssskssk.................', '..........kskk.kskssskskssksk..kksk.kwswkkssk...ksssssksskksskskk................', '..........ksk..kssksssskskskk...ksk.kwkwkkksk...kskkssksskssksssk................', '..........kkk..ksssssskksssk....kskkkwkwk.kskk..kssksssskskssssskk...............', '...............kksssksskkssk....ksskkwskk.kssk..kssskssksskksksssk...............', '..............kkssssssskkskk....ksskkwsk..kksk..kssksskskskkskkssk...............', '..............ksskssssskssk.....kkskkksk...kskk.ksskkskssskkssksskk..............', '..............ksksksssskksk......ksk.ksk...kksk.kkskkssssskkkskkssk..............', '.............kkssskskskkksk......kskkkwkkk..ksk..kskksssksk.kkkkksk..............', '.............kssskssssk.kkk......ksskkskwkk.kskk.kskkssssskk....kkk..............', '............kkssksssssk..........kskkkwkwwkkksskkkskkssssksk.....................', '............kssskkskssk..........ksskkkwwwsksssskkkkksksksskk....................', '............ksksksssksk.........kkssskkkkskkskssk...ksskssssk....................', '............ksskksksskk.........kskksk.kskskksksk...ksksssksk....................', '............ksskkssssk..........kksskk.kskssksssk...kskkskssk....................', '...........kkskkkssksk..........kkkskkkkssksksssk...kskkksssk....................', '...........kskkksskssk..........kskkkskkssksssssk...kkkkssksk....................', '...........kkk.ksksskk..........kssksskkssskssskk......kskkkk....................', '...............kskksk...........kkssskkkskskkssk.......ksssk.....................', '...............kssskk............ksssskksskkkkkk.......ksksk.....................', '...............kkssk.............kkskskkksk............kkskk.....................', '................kssk..............ksssk.kkk.............kskk.....................', '................kskk..............kkssk.................kksk.....................', '................ksk................kssk..................ksk.....................', '................kkk................kssk..................kkk.....................', '...................................ksskk.........................................', '..................................kkssskk........................................', '..................................ksskssk........................................', '..................................kkksksk........................................', '...................................kssskk........................................', '...................................ksssk.........................................', '...................................ksssk.........................................', '...................................kssskk........................................', '...................................kssssk........................................', '...................................kssksk........................................', '...................................kksssk........................................', '....................................ksskk........................................', '....................................kksk.........................................', '.....................................kkk.........................................']
};
// The bosses' too (owner, 2026-10-20: «Переделай всех шестерых боссов по рисунку листа»): each pick cut from its cell (clear what lies round it,
// its holes kept black, a black rim on it), fitted over its body (BOSS_FIT: the ink of it that flashes with the body, and how far down the body
// sits under it), so the fight stays; the body itself unseen (the renderer draws neither it nor its shadow).
const BOSS_FIT = { 'probka-F': ['b', 0.5, 0], 'cart-C': ['o', 0.44, 0, 2], 'puck-F': ['s', 0.5, 1], 'tram-E': ['g', 0.55, -1], 'crane-F': ['o', 0.57, 0, 2], 'pigeon-A': ['s', 0.55, -1], 'namazu-D': ['o', 0.5, 1, 1], 'koschei-A': ['s', 0.5, 0, 1] };   // [its ink, its body's place down it, the way its cell has it face (0: at you), its pixel in game pixels (none: fitted over its body)]
const drawSprite = (d, rows, flip, fit) => {   // a box for each run of one ink
  const H = rows.length, W = rows[0].length, m = flip ? -1 : 1, sh = d.b.s;
  if (fit && !sh.ext) sh.ext = [Math.max(...Array.from(sh.rx, Math.abs)), Math.max(...Array.from(sh.ry, Math.abs))];
  const k = fit && !fit[3] ? 1.08 * Math.max((2 * sh.ext[0]) / W, (2 * sh.ext[1]) / H) : ((fit ? fit[3] : 1) * PIX.size) / d.b.R, cy = (fit ? fit[1] : 0.62) * H;   // a boss's over its body; else a sheet's pixel a game pixel (1:1), its body under its lower part
  const o = fit ? (0.5 * PIX.size) / d.b.R : 0.004;   // its boxes' overlap: half a pixel on a boss, whose body is not under it to fill the seams when it squashes
  const hp = d.b.heap || 0, rt = d.b.rattle ? d.b.heapT || 0 : 0, yb = (H - cy) * k, sq = 1 - 0.4 * hp, wx = 1 + 0.3 * hp;   // a heap of bones (Koschei dazed): his rows sunk (his body squashes too) and strewn sideways, rattling before he rises
  rows.forEach((row, j) => {
    const dy = hp ? yb - (yb - (j + 0.5 - cy) * k) * sq : (j + 0.5 - cy) * k, jx = hp ? (((Math.imul(j + 7, 2654435761) >>> 0) / 4294967296 - 0.5) * 18 * hp + (rt ? Math.sin(rt * 45 + j * 1.7) * 1.2 : 0)) * k : 0;
    for (let i = 0; i < W;) { const ch = row[i]; let e = i + 1; while (row[e] === ch) e++; if (ch !== '.') d.shape(10, m * ((i + e) / 2 - W / 2) * k * wx + jx, dy, ((e - i) / 2) * k * wx + o, 0, 0, 0.5 * k * sq + o, fit && ch === fit[0] ? d.c : d.b.warn && ch === 's' ? PAL.red : PAL[ICON_INK[ch]]); i = e; }
  });
  return true;
};
for (const id in FOE_SPRITES) { const fit = BOSS_FIT[id]; LOOK_FACE[id] = (d) => drawSprite(d, FOE_SPRITES[id], fit ? fit[2] !== 0 && d.fd !== fit[2] : d.fd < 0, fit); }   // the forest's face right; a boss as its cell has it
const gumWriteFace = Renderer.prototype.writeFace;
// The Kolobok's face (the owner's pick, research/variants/skazka-kolobok-game.png E, 2026-10-20): rosy cheeks over Gum's face, in the hero's units
// (its radius 1, y down).
const kolobokFace = (dot, f) => {
  const [ex, ey] = f.eye, [rx, ry] = f.eyeR;
  for (let side = -1; side <= 1; side += 2) dot(side * (Math.abs(ex) + rx * 1.3), ey + ry * 1.9, 0.16, 0.11, PAL.red);   // rosy cheeks
};
Renderer.prototype.writeFace = function (b, X, Y, cx, cy) {
  const s = b.s, f = s.face, fc = b.face, ink = THEME.ink, P0 = this.p0, P1 = this.p1, P2 = this.p2;
  const frame = (ux, uy, ax, ay, bx, by) => { mapPoint(s, X, Y, cx, cy, ux, uy, P0); mapPoint(s, X, Y, cx, cy, ux + ax, uy + ay, P1); mapPoint(s, X, Y, cx, cy, ux + bx, uy + by, P2); };
  const put = (r, g, bl, type, p1, p2, p3) => this.feat(P0.x, P0.y, P1.x - P0.x, P1.y - P0.y, P2.x - P0.x, P2.y - P0.y, r, g, bl, 1, type, p1 || 0, p2 || 0, p3 || 0);
  const dot = (ux, uy, ax, ay, c) => { frame(ux, uy, ax, 0, 0, ay); put(c[0], c[1], c[2], 0); };   // an upright oval in one ink
  const lf = b.look && LOOK_FACE[b.look];   // a boss's look, on it (LOOK_FACE); a face of its own instead of Gum's
  if (lf && lf({ b, fc, f, ink, dot, c: b.color.base, fd: b.lookDir || 1, shape: (type, ux, uy, ax, ay, bx, by, c, p3 = 0) => { frame(ux, uy, ax, ay, bx, by); const la = Math.hypot(P1.x - P0.x, P1.y - P0.y); put(c[0], c[1], c[2], type, la, Math.hypot(P2.x - P0.x, P2.y - P0.y), p3 || (type === 6 ? 2 * la : 0)); } })) return;
  // The hero's helmet (b.helmet): the moto one while the smash is on (user: in place of its pips), the astro one in an astro's flight. An astro one goes under the face, which
  // shows in its window: a white dome, grey on its right, the window's black rim, and in it the hero's own colour.
  const kolo = this.kolobok && b === game.hero && b.color.id === save.color;   // the Dark Forest's hero, a Kolobok (see kolobokFace)
  if (b.helmet === 'astro') { dot(0.1, 0.05, 1.03, 1.02, PAL.gray); dot(-0.05, -0.04, 0.96, 0.97, PAL.white); dot(0.93, 0.1, 0.12, 0.22, PAL.gray); dot(0, 0.13, 0.68, 0.49, ink); dot(0, 0.13, 0.56, 0.38, kolo ? KOLOBOK.base : b.color.base); }
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
      const c = b.paint && paintField(f.mouth[0], f.mouth[1], b.paint) <= b.paint[0] ? PAL.red : [1, 1, 1];   // (red where its mouth is white: FOE_PAINT)
      put(c[0], c[1], c[2], 6, la, lb, la);
    }
  } else if (!closed) {
    if (fc.open > 0.6) for (let side = -1; side <= 1; side += 2) { frame(ex * side + lx + rx * 0.4, ey + ly + ry * 0.45, rx * 0.28, 0, 0, ry * 0.26); put(1, 1, 1, 0); }
    if (fc.surprise <= 0.35) { frame(f.mouth[0], f.mouth[1] + m * 0.42, m * 0.5, 0, 0, m * 0.36); put(THEME.blush[0], THEME.blush[1], THEME.blush[2], 0); }
  }
  if (kolo && b.helmet !== 'astro') kolobokFace(dot, f);   // (over Gum's face, under the moto helmet; none in the astro one's window)
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
  this.darkBuf = new Float32Array(128);   // 32 lights (the Dark Forest's eyes and fences as well as the coins)
  this.target = null;
  if (this.low) this.makeTarget();
  return true;
};
// Each frame's vertices into a fresh store (orphaning), not over the old one: Gum's bufferSubData wrote into the buffer the last
// frame's draws might still be reading, and the CPU waited on the GPU for it (most of a frame's time; a phone saving its battery stuttered).
Renderer.prototype.upload = function (target, buf, data, len) {
  const gl = this.gl;
  gl.bindBuffer(target, buf);
  gl.bufferData(target, data, gl.DYNAMIC_DRAW, 0, Math.max(len, 1));
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
  this.nv = 0; this.ni = 0; this.nf = 0; this.ranges.length = 0; this.nFar = 0; this.nSt = 0; this.nSm = 0; this.route = 0;   // (nFar, nSt, nSm, route: the cinematic fork's 2.5D, see cine.js)
  const lv = g.lv, th = lv.theme, W = this.w, H = this.h, cam = lv.cam, top = cam - 80, bot = cam + H + 80, R = lv.R, T = lv.t;
  const F = (cx, cy, ax, ay, bx, by, c, a, type, p1, p2, p3) => this.feat(cx, cy, ax, ay, bx, by, c[0], c[1], c[2], a, type, p1 || 0, p2 || 0, p3 || 0);
  const disc = (x, y, r, c, a) => F(x, y, r, 0, 0, r, c, a, 0);
  const box = (x0, y0, x1, y1, c, a, rad, type, p3) => { const hw = (x1 - x0) / 2, hh = (y1 - y0) / 2; F(x0 + hw, y0 + hh, hw, 0, 0, hh, c, a, type || 5, hw, hh, type >= 7 ? p3 : rad); };
  const icon = (id, x, y, a, k, ink) => {   // an ICONS picture centred on (x, y), a dot k game pixels across, a box per run of one ink (all in `ink`, if given)
    const rows = ICONS[id], s = PIX.size * k, x0 = Math.round(x / PIX.size) * PIX.size - rows[0].length * s / 2, y0 = Math.round(y / PIX.size) * PIX.size - rows.length * s / 2;
    rows.forEach((row, j) => { for (let i = 0; i < row.length;) { const c = row[i]; let e = i + 1; while (row[e] === c) e++; if (c !== '.') box(x0 + i * s, y0 + j * s, x0 + e * s, y0 + (j + 1) * s, ink || PAL[ICON_INK[c]], a, 0, 10, 0); i = e; } });
  };
  const iconSpin = (id, x, y, a, k, th) => {   // an ICONS picture turning about its upright axis (user: bonuses in pixel 3D): its columns drawn in by the
    // cosine (past a quarter turn its back, mirrored); no grey edge beside it (owner: «убери серый псевдообъем у бонусов»), and never thinner than `ICON_SPIN`
    // of its width (with its edge gone it shrank to a sliver of a pixel edge on, and blinked out: the tester's «анимация вращения … поломалась»)
    const rows = ICONS[id], P = PIX.size, s = P * k, w = rows[0].length, c0 = Math.cos(th), c = (c0 < 0 ? -1 : 1) * Math.max(ICON_SPIN, Math.abs(c0)), x0 = Math.round(x / P) * P, y0 = Math.round(y / P) * P - (rows.length * s) / 2;
    const col = (i) => Math.round(((i - w / 2) * s * c) / P) * P;
    rows.forEach((row, j) => { for (let i = 0; i < w;) { const q = row[i]; let e = i + 1; while (row[e] === q) e++; if (q !== '.') { const u = x0 + col(i), v = x0 + col(e); if (u !== v) box(Math.min(u, v), y0 + j * s, Math.max(u, v), y0 + (j + 1) * s, PAL[ICON_INK[q]], a, 0, 10, 0); } i = e; } });
    if (CINE_ON && CINE_ON.bonus === 'E' && a === 1) {   // (the fork's E, in 2D too: its thickness, THICK of its pixels, on the side turned to us: each row's end in that pixel's own ink a tone darker)
      const sn = Math.sin(th), d = Math.round((Math.abs(sn) * CINE_ON.THICK * s) / P) * P;
      if (d > 0) rows.forEach((row, j) => { let iL = 0, iR = w - 1; while (iL < w && row[iL] === '.') iL++; while (iR > iL && row[iR] === '.') iR--; if (iL >= w) return;
        const bx = x0 + col(sn > 0 ? iL : iR + 1), dx = (sn > 0 ? -d : d) * (c < 0 ? -1 : 1);
        box(Math.min(bx, bx + dx), y0 + j * s, Math.max(bx, bx + dx), y0 + (j + 1) * s, PAL[ICON_INK[row[sn > 0 ? iL : iR]]], 1.62, 0, 10, 0); });
    }
  };
  const seen = (y0, y1) => y1 > top && y0 < bot;
  // A door: a dark opening square on the ledge (and in the wall), framed but on the wall's side, with what is
  // inside. A shop's (gold) and a stash's (violet) are magic: a breathing glow round them, white studs and a gem
  // on the frame, lights turning in the dark of the opening, sparks rising up past it.
  const door = (d, kind) => {
    if (th.fuji && kind !== 'exit') { hut(d, kind); return; }   // Mount Fuji's (see hut)
    if (th.village && kind !== 'exit') { farmhouse(d, kind); return; }   // the Village's (see farmhouse)
    if (th.sea && kind !== 'exit') { const rt = this.route; if (CINE) this.route = 5; funaya(d, kind); this.route = rt; return; }   // the Sea's (see funaya; 2.5D: its boat bay
    // behind, the rest flat)
    if (th.skazka && kind !== 'exit') { const rt = this.route; if (CINE) this.route = 5; (kind === 'shop' ? izba : pech)(d); this.route = rt; return; }   // the Dark Forest's (see izba,
    // pech; 2.5D: the hut's legs and its smoke behind, the rest flat)
    if (th.mines && kind !== 'exit') { (kind === 'shop' ? mnShop : mnStash)(d); return; }   // the Mine's (see mnShop, mnStash)
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
  if (lv.exit) door(lv.exit, 'exit');
  // Mount Fuji's door into a shop or a stash (the owner's picks, research/variants/fuji-hut-1-px.png: "E and F, the shop"): a mountain hut built round the
  // doorway, 3.4 tiles out from the wall, its roof deep in snow. The stash's (E): its door framed purple and lit warm inside, a little stone lantern by it; the
  // shop's (F): a red noren hanging in its doorway, a face on it, and a lit window beside it. What is inside bobs in the doorway; sparks rise past it.
  const hut = (d, kind) => {
    const P = PIX.size, t = lv.tile, sn = (v) => Math.round(v / P) * P, shop = kind === 'shop', wl = d.x0 < (lv.l + lv.r) / 2, dir = wl ? 1 : -1, c = shop ? PAL.red : PAL.purple;
    const X = (u) => sn((wl ? lv.l : lv.r) + dir * u * t), xa = Math.min(X(0), X(3.4)), xb = Math.max(X(0), X(3.4)), wy = sn(d.y0 + 0.3 * t), y1 = d.y1;
    const dx = X(1.25), dw = 0.7 * t, top = sn(wy + 0.55 * t), x = dx, y = (top + y1) / 2;
    F(dx, y, 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its door
    box(xa, wy, xb, y1, th.block, 1, 0, 10, 2);   // its wooden front
    for (let v = 0.45; v < (y1 - wy) / t; v += 0.45) box(xa, sn(wy + v * t), xb, sn(wy + v * t) + P, PAL.black, 1, 0, 10, 0);   // its boards
    if (shop) {   // F: a roof sloping down away from the wall, snow along it
      for (let i = 0; i <= 20; i++) { const u = i / 20, rx = X(-0.1 + u * 3.9), ry = sn(wy - 1.0 * t + u * 0.75 * t); box(rx - P, ry, rx + 2 * P, wy, th.block, 1, 0, 10, 0); box(rx - P, ry - sn(0.2 * t), rx + 2 * P, ry, PAL.gray, 1, 0, 10, 0); }
    } else {   // E: a roof curving down both ways from a ridge, a finial, snow heaped on it
      for (let i = 0; i <= 20; i++) { const u = i / 20, rx = X(-0.3 + u * 4.0), lift = 1 - Math.abs(2 * u - 1) ** 1.6, ry = sn(wy - (0.25 + 0.75 * lift) * t); box(rx - P, ry, rx + 2 * P, wy, th.block, 1, 0, 10, 0); box(rx - P, ry - sn(0.22 * t), rx + 2 * P, ry, PAL.gray, 1, 0, 10, 0); }
      disc(X(1.7), sn(wy - 1.25 * t), 0.12 * t, PAL.gray, 1);
    }
    box(sn(dx - dw), top, sn(dx + dw), y1, INK.dark, 1, 0, 10, 0);   // the doorway
    if (shop) {   // the noren: red, in three panels, a face on the middle one
      box(sn(dx - dw), top, sn(dx + dw), sn(top + 0.75 * t), PAL.red, 1, 0, 10, 0);
      for (const f of [-0.33, 0.33]) box(sn(dx + f * dw), sn(top + 0.2 * t), sn(dx + f * dw) + P, sn(top + 0.75 * t), PAL.black, 1, 0, 10, 0);
      for (const e of [-1, 1]) box(sn(dx + e * 0.12 * t), sn(top + 0.25 * t), sn(dx + e * 0.12 * t) + P, sn(top + 0.25 * t) + 2 * P, PAL.black, 1, 0, 10, 0);
      box(sn(dx - 0.12 * t), sn(top + 0.5 * t), sn(dx + 0.12 * t) + P, sn(top + 0.5 * t) + P, PAL.black, 1, 0, 10, 0);
      const wx0 = Math.min(X(2.2), X(3.1)), wx1 = Math.max(X(2.2), X(3.1)), wy0 = sn(top + 0.2 * t), wy1 = sn(top + 1.1 * t);   // the lit window, its shoji's grid
      F((wx0 + wx1) / 2, (wy0 + wy1) / 2, 0.7 * t, 0, 0, 0.6 * t, PAL.orange, 0.45, 1); box(wx0, wy0, wx1, wy1, PAL.orange, 1, 0, 10, 0);
      for (let gx = wx0 + 0.3 * t; gx < wx1 - P; gx += 0.3 * t) box(sn(gx), wy0, sn(gx) + P, wy1, PAL.black, 1, 0, 10, 0); box(wx0, sn((wy0 + wy1) / 2), wx1, sn((wy0 + wy1) / 2) + P, PAL.black, 1, 0, 10, 0);
    } else {   // its purple frame, the warm light inside, the little lantern by it
      for (const [a0, b0, a1, b1] of [[dx - dw - 2 * P, top - 2 * P, dx + dw + 2 * P, top], [dx - dw - 2 * P, top, dx - dw, y1], [dx + dw, top, dx + dw + 2 * P, y1]]) box(sn(a0), sn(b0), sn(a1), sn(b1), PAL.purple, 1, 0, 10, 0);
      F(dx, sn(y1 - 0.6 * t), 0.6 * t, 0, 0, 0.7 * t, PAL.orange, 0.5, 1);
      const lx = X(2.85), lb = y1;
      box(sn(lx - 0.18 * t), sn(lb - 0.12 * t), sn(lx + 0.18 * t), lb, PAL.gray, 1, 0, 10, 0); box(sn(lx - 0.06 * t), sn(lb - 0.55 * t), sn(lx + 0.06 * t), sn(lb - 0.12 * t), PAL.gray, 1, 0, 10, 0);
      box(sn(lx - 0.16 * t), sn(lb - 0.85 * t), sn(lx + 0.16 * t), sn(lb - 0.55 * t), PAL.gray, 1, 0, 10, 0); box(sn(lx - 0.08 * t), sn(lb - 0.78 * t), sn(lx + 0.08 * t), sn(lb - 0.62 * t), PAL.orange, 1, 0, 10, 0);
      box(sn(lx - 0.28 * t), sn(lb - 0.97 * t), sn(lx + 0.28 * t), sn(lb - 0.85 * t), PAL.gray, 1, 0, 10, 0);
    }
    const bob = Math.round(Math.sin(T * 3 + dx) * 1.5) * P, ry = shop ? sn(top + 1.25 * t) : y, rr = dw;
    if (shop) { disc(x, ry + bob, rr * 0.42, INK.coinD, 1); disc(x, ry + bob, rr * 0.32, INK.coin, 1); disc(x - rr * 0.1, ry + bob - rr * 0.1, rr * 0.08, INK.white, 1); }
    else for (let k = 0; k < 3; k++) disc(x + (k - 1) * rr * 0.5, y + rr * 0.3 - (k === 1 ? rr * 0.4 : 0) + bob, rr * 0.26, INK.coin, 1);
    for (let k = 0; k < 6; k++) {
      const u = (T * 0.45 + k / 6) % 1, q = ((Math.sin(k * 12.9898 + d.x0) * 43758.5453) % 1 + 1) % 1, spx = sn(dx - dw + q * 2 * dw), spy = y1 - u * (y1 - wy + 2.5 * R);
      const k2 = Math.sin(u * Math.PI), l = (k2 > 0.7 ? 2 : 1) * P, ink = k & 1 ? INK.white : c;
      if (k2 > 0.25) { box(spx - l, spy - P * 0.5, spx + l, spy + P * 0.5, ink, 1, 0, 10, 0); box(spx - P * 0.5, spy - l, spx + P * 0.5, spy + l, ink, 1, 0, 10, 0); }
    }
  };
  // The Village's door into a shop or a stash (the owner's picks, research/variants/village-house-1-px.png: "E, D"): a thatched farmhouse built round the
  // doorway on the ledge (E's stilts and stair left out: the way in is at the ledge), 64 of the sheet's pixels a tile. The shop's (E): a steep thatch under a
  // ridge beam, wooden posts, a lit lattice window, a red noren in the doorway (the owner's shop red) with a white crest, a potted bush by it. The stash's (D):
  // a thatch in two tiers under a dark ridge, grey posts on a stone footing, a lit window, a purple noren, a lantern off a bracket. What is inside bobs in the
  // doorway; sparks rise past it.
  const farmhouse = (d, kind) => {
    const P = PIX.size, t = lv.tile, sn = (v) => Math.round(v / P) * P, shop = kind === 'shop', wl = d.x0 < (lv.l + lv.r) / 2, dir = wl ? 1 : -1, c = shop ? PAL.red : kind === 'trial' ? INK.coin : PAL.purple, y1 = d.y1, px = P / t;   // (a trial's yellow: coins to win)
    const X = (u) => sn((wl ? lv.l : lv.r) + dir * u * t), Y = (v) => sn(y1 - v * t);
    const bx = (u0, v0, u1, v1, ink, tn = 0, a = 1) => box(Math.min(X(u0), X(u1)), Y(Math.max(v0, v1)), Math.max(X(u0), X(u1)), Y(Math.min(v0, v1)), ink, a, 0, 10, tn);   // by tiles out from the wall and up from the ledge
    const on = (u) => lv.rects.some((q) => !q.gone && Math.abs(q.y0 - y1) < 2 && Math.min(X(u - 0.3), X(u + 0.3)) >= q.x0 && Math.max(X(u - 0.3), X(u + 0.3)) <= q.x1);   // its ledge goes on out under u
    const roof = (u0, u1, w0, w1, v0, v1) => {   // a thatch: rows from (u0, u1) at its eave v0 in to (w0, w1) at v1, sparse dots in the straw, its eave ragged
      const n = Math.max(1, Math.round(((v1 - v0) * t) / (2 * P)));
      for (let i = 0; i < n; i++) { const q = (i + 0.5) / n; bx(u0 + (w0 - u0) * q, v0 + ((v1 - v0) * i) / n, u1 + (w1 - u1) * q, v0 + ((v1 - v0) * (i + 1)) / n, th.block, 1); }
      bx(u0, v0 - px, u1, v0, th.block, 4);
    };
    const dx = X(1.25), dw = sn(0.7 * t), eave = shop ? 2.6 : 2.2, dh = shop ? 2.1 : 2.0, noren = shop ? 0.75 : 0.85;
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its door
    if (shop) {
      bx(0, 0, 3.9, eave, PAL.black);   // its front, dark between its posts
      for (const u of [0.3, 2.15, 3.72]) bx(u, 0, u + 0.18, eave, th.block, 4);   // wooden posts (E's, chequered), the beam over them
      bx(0, eave - 0.18, 3.9, eave, th.block, 4);
      F(X(2.97), Y(1.7), 0.75 * t, 0, 0, 0.65 * t, PAL.orange, 0.45, 1); bx(2.4, 1.15, 3.55, 2.25, PAL.orange);   // the lit window, its lattice
      for (const u of [2.78, 3.17]) bx(u, 1.15, u + px, 2.25, PAL.black);
      bx(2.4, 1.7, 3.55, 1.7 + px, PAL.black);
      roof(-0.25, 4.15, 0.75, 3.15, eave, 4.35);   // E's steep thatch, its ridge beam, a flick up at its end
      bx(0.85, 4.35, 3.05, 4.6, th.block, 4); bx(3.05, 4.5, 3.15, 4.72, th.block);
      if (on(4.5)) {   // a potted bush by the house (E's): its pot, the bush lumpy
        bx(4.32, 0, 4.68, 0.32, th.block); bx(4.28, 0.32, 4.72, 0.4, th.block, 4);
        for (const [u, v, rr] of [[4.5, 0.68, 0.32], [4.3, 0.6, 0.18], [4.7, 0.62, 0.18]]) F(X(u), Y(v), rr * t, 0, 0, 0.85 * rr * t, PAL.green, 1, 0);
      }
    } else {
      bx(0, 0, 3.35, eave, PAL.black);
      bx(0, 0, 3.35, 0.3, PAL.gray, 2);   // a stone footing (D's dotted grey), grey posts on it, the beam over them
      for (const u of [0.3, 2.12, 3.18]) bx(u, 0.3, u + 0.13, eave, PAL.gray, 2);
      bx(0, eave - 0.13, 3.35, eave, PAL.gray, 2);
      F(X(2.7), Y(1.4), 0.6 * t, 0, 0, 0.6 * t, PAL.orange, 0.45, 1); bx(2.36, 0.9, 3.04, 1.9, PAL.orange);   // the lit window, its lattice
      for (const u of [2.58, 2.81]) bx(u, 0.9, u + px, 1.9, PAL.black);
      for (const v of [1.23, 1.57]) bx(2.36, v, 3.04, v + px, PAL.black);
      roof(-0.35, 3.7, -0.1, 3.45, eave, 2.85); roof(0.35, 3.05, 0.6, 2.8, 2.85, 3.5);   // D's thatch in two tiers, its ridge dark
      bx(0.85, 3.5, 2.55, 3.72, PAL.gray, 0, DIM);
      if (on(4.1)) {   // a lantern off a bracket (D's): its post and arm, the cord, the lantern lit
        bx(3.5, 0, 3.62, 2.05, th.block, 4); bx(3.5, 1.95, 4.25, 2.05, th.block, 4); bx(4.11, 1.8, 4.11 + px, 1.95, PAL.gray);
        F(X(4.12), Y(1.52), 0.5 * t, 0, 0, 0.5 * t, PAL.orange, 0.4, 1); bx(3.97, 1.25, 4.27, 1.8, PAL.orange); bx(3.97, 1.51, 4.27, 1.51 + px, PAL.black);
      }
    }
    bx(0.55, 0, 1.95, dh, INK.dark);   // the doorway, warm inside
    F(dx, Y(0.6), 0.6 * t, 0, 0, 0.7 * t, PAL.orange, 0.5, 1);
    bx(0.55, dh - noren, 1.95, dh, c);   // the noren in three panels, a white crest on its middle one
    for (const u of [1.02, 1.48]) bx(u, dh - noren, u + px, dh - 0.2, PAL.black);
    for (const [u, v] of [[1.25, dh - 0.22], [1.15, dh - 0.38], [1.35, dh - 0.38]]) bx(u - px, v - px, u + px, v + px, INK.white);
    const bob = Math.round(Math.sin(T * 3 + dx) * 1.5) * P, rr = dw;
    if (shop) { const ry = Y(0.8); disc(dx, ry + bob, rr * 0.42, INK.coinD, 1); disc(dx, ry + bob, rr * 0.32, INK.coin, 1); disc(dx - rr * 0.1, ry + bob - rr * 0.1, rr * 0.08, INK.white, 1); }
    else { const ry = Y(0.55); for (let k = 0; k < 3; k++) disc(dx + (k - 1) * rr * 0.5, ry - (k === 1 ? rr * 0.4 : 0) + bob, rr * 0.26, INK.coin, 1); }
    for (let k = 0; k < 6; k++) {
      const u = (T * 0.45 + k / 6) % 1, q = ((Math.sin(k * 12.9898 + d.x0) * 43758.5453) % 1 + 1) % 1, spx = sn(dx - dw + q * 2 * dw), spy = y1 - u * (eave * t + 2.5 * R);
      const k2 = Math.sin(u * Math.PI), l = (k2 > 0.7 ? 2 : 1) * P, ink = k & 1 ? INK.white : c;
      if (k2 > 0.25) { box(spx - l, spy - P * 0.5, spx + l, spy + P * 0.5, ink, 1, 0, 10, 0); box(spx - P * 0.5, spy - l, spx + P * 0.5, spy + l, ink, 1, 0, 10, 0); }
    }
  };
  // The Sea's door into a shop or a stash (the owner's pick, research/variants/sea-house-game.png D, for both, 2026-10-20): a funaya, a boathouse over the
  // water as in Ine, built round the doorway on the ledge, its boat bay under the ledge behind (DIM); the noren red for the shop, purple for the stash (the
  // owner's), a lit window, a lattice panel by the door, a lantern off its eave. What is inside bobs in the doorway; sparks rise past it.
  const funaya = (d, kind) => {
    const P = PIX.size, t = lv.tile, sn = (v) => Math.round(v / P) * P, shop = kind === 'shop', wl = d.x0 < (lv.l + lv.r) / 2, dir = wl ? 1 : -1, c = shop ? PAL.red : kind === 'trial' ? INK.coin : PAL.purple, y1 = d.y1, px = P / t;   // (a trial's yellow: coins to win)
    const X = (u) => sn((wl ? lv.l : lv.r) + dir * u * t), Y = (v) => sn(y1 - v * t);
    const bx = (u0, v0, u1, v1, ink, tn = 0, a = 1) => box(Math.min(X(u0), X(u1)), Y(Math.max(v0, v1)), Math.max(X(u0), X(u1)), Y(Math.min(v0, v1)), ink, a, 0, 10, tn);
    const W = 3.2, eave = 2.4, dh = 2.0, noren = 0.8, dx = X(1.25), dw = sn(0.7 * t);
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its door
    for (const u of [0.3, 1.4, 2.5, W - 0.2]) bx(u, -1.7, u + 0.12, 0, th.block, 0, DIM);   // its boat bay under the ledge, behind: piles, the boat, the water
    bx(0.6, -1.25, 2.6, -0.95, PAL.gray, 0, DIM); bx(0.9, -1.45, 2.3, -1.25, PAL.gray, 0, DIM); for (const u of [0.2, 1.3, 2.4]) bx(u, -1.75, u + 0.8, -1.7, th.block, 0, DIM);
    bx(0, 0, W, eave, PAL.black); bx(0, 0, W, eave, th.block, 2); for (const u of [0.45, 2.05, W - 0.15]) bx(u, 0, u + 0.13, eave, th.block);   // its wooden front, dotted, its posts
    bx(0, eave - 0.15, W, eave, th.block);
    const win = (u0, u1, v0, v1) => { F(X((u0 + u1) / 2), Y((v0 + v1) / 2), 0.7 * t, 0, 0, 0.6 * t, PAL.orange, 0.45, 1); bx(u0, v0, u1, v1, PAL.orange); bx((u0 + u1) / 2, v0, (u0 + u1) / 2 + px, v1, PAL.black); bx(u0, (v0 + v1) / 2, u1, (v0 + v1) / 2 + px, PAL.black); };
    win(2.3, 3.15, 1.0, 1.85);
    const gable = (u0, u1, v0, h, rw) => { for (let i = 0, n = Math.max(3, Math.round((h * t) / (2 * P))); i < n; i++) { const q = i / n; bx(u0 + (u1 - u0) * 0.5 * q * rw, v0 + h * q, u1 - (u1 - u0) * 0.5 * q * rw, v0 + h * (q + 1 / n), PAL.gray, 4); } bx(u0, v0, u1, v0 + 0.08, PAL.gray); };
    gable(-0.2, W + 0.25, eave, 1.15, 0.95);   // the roof, its tiles grey
    bx((W - 0.3) / 2, eave + 1.15, (W - 0.3) / 2 + 2 * px, eave + 1.45, PAL.gray);   // its ridge's end
    bx(0.55, 0, 1.95, dh, INK.dark);   // the doorway, warm inside
    F(dx, Y(0.6), 0.6 * t, 0, 0, 0.7 * t, PAL.orange, 0.5, 1);
    bx(0.55, dh - noren, 1.95, dh, c);   // the noren, its slits, its crest
    for (const u of [1.02, 1.48]) bx(u, dh - noren, u + px, dh - 0.22, PAL.black);
    for (const [u, v] of [[1.25, dh - 0.24], [1.15, dh - 0.4], [1.35, dh - 0.4]]) bx(u - px, v - px, u + px, v + px, INK.white);
    const lan = (u, v) => { bx(u, v + 0.3, u + px, eave - 0.15, PAL.gray); bx(u - 0.15, v - 0.2, u + 0.17, v + 0.3, PAL.orange); bx(u - 0.15, v + 0.04, u + 0.17, v + 0.04 + px, PAL.black); F(X(u), Y(v + 0.05), 0.45 * t, 0, 0, 0.45 * t, PAL.orange, 0.4, 1); };   // a lantern off the eave, lit
    lan(W + 0.25, 1.3);
    bx(2.2, 0, 2.95, 0.85, PAL.gray, 4);   // a lattice panel by the door
    const bob = Math.round(Math.sin(T * 3 + dx) * 1.5) * P, rr = dw;
    if (shop) { const ry = Y(0.8); disc(dx, ry + bob, rr * 0.42, INK.coinD, 1); disc(dx, ry + bob, rr * 0.32, INK.coin, 1); disc(dx - rr * 0.1, ry + bob - rr * 0.1, rr * 0.08, INK.white, 1); }
    else { const ry = Y(0.55); for (let i = 0; i < 3; i++) disc(dx + (i - 1) * rr * 0.5, ry - (i === 1 ? rr * 0.4 : 0) + bob, rr * 0.26, INK.coin, 1); }
    for (let i = 0; i < 6; i++) {
      const u = (T * 0.45 + i / 6) % 1, q = ((Math.sin(i * 12.9898 + d.x0) * 43758.5453) % 1 + 1) % 1, spx = sn(dx - dw + q * 2 * dw), spy = y1 - u * (eave * t + 2.5 * R);
      const k2 = Math.sin(u * Math.PI), l = (k2 > 0.7 ? 2 : 1) * P, ink = i & 1 ? INK.white : c;
      if (k2 > 0.25) { box(spx - l, spy - P * 0.5, spx + l, spy + P * 0.5, ink, 1, 0, 10, 0); box(spx - P * 0.5, spy - l, spx + P * 0.5, spy + l, ink, 1, 0, 10, 0); }
    }
  };
  // The Dark Forest's glowing eyes (its hollows, a black cat): orange round a yellow core, shut a moment every few seconds; each pair a small light, so it shows
  // out of the dark (the forest's only colours are its lights, the hero, coins, danger and the doors' marks: owner)
  const skEyes = (x, y, s = 1, n = 0) => {
    const blink = (T + (n % 97) * 0.37) % (4 + (n % 5)) < 0.14, dx = 0.13 * kitT * s;
    for (const e of [-1, 1]) { const ex = snap(x + e * dx);
      if (blink) box(ex - snap(0.07 * kitT * s), y - kitP / 2, ex + snap(0.07 * kitT * s), y + kitP / 2, PAL.orange, 1, 0, 10, 0);
      else { disc(ex, y, 0.075 * kitT * s + kitP / 2, PAL.orange, 1); box(ex - kitP / 2, y - kitP / 2, ex + kitP / 2, y + kitP / 2, PAL.yellow, 1, 0, 10, 0); } }
    vlamps.push([x, y, 0.2 * s, 0.6 * s]);
  };
  // The Dark Forest's doors (the owner's picks, 2026-10-20, from research/variants/skazka-izba-game.png and skazka-stove-game.png, E for both, black and white
  // and crooked): the shop is Baba Yaga's hut on chicken legs, leaning, its floor at the ledge, its legs down behind the ledge (half dark), a tattered red cloth
  // in its door; the stash a crooked Russian stove, its mouth the door, glowing purple inside, embers. What is inside bobs in the doorway; sparks rise past
  // it; a glow breathes round it. Grey and black but the doors' marks and lights.
  const skDoorAt = (d) => {   // the frame both draw in: tiles out from the wall, up from the ledge
    const P = PIX.size, t = lv.tile, sn = (v) => Math.round(v / P) * P, wl = d.x0 < (lv.l + lv.r) / 2, dir = wl ? 1 : -1, y1 = d.y1;
    const X = (u) => sn((wl ? lv.l : lv.r) + dir * u * t), Y = (v) => sn(y1 - v * t);
    const bx = (u0, v0, u1, v1, ink, tn = 0, a = 1) => box(Math.min(X(u0), X(u1)), Y(Math.max(v0, v1)), Math.max(X(u0), X(u1)), Y(Math.min(v0, v1)), ink, a, 0, 10, tn);
    const ln = (u0, v0, u1, v1, ink, wp = 1, a = 1) => line(X(u0), Y(v0), X(u1), Y(v1), ink, a, wp);
    return { P, t, sn, X, Y, bx, ln, px: P / t, dir, y1 };
  };
  const skInside = (d, kind, c, dx, dw, top) => {   // what is inside, bobbing in the doorway; sparks rising past it
    const { P, sn, Y, y1 } = skDoorAt(d), bob = Math.round(Math.sin(T * 3 + dx) * 1.5) * P, rr = dw;
    if (kind === 'shop') { const ry = Y(0.8); disc(dx, ry + bob, rr * 0.42, INK.coinD, 1); disc(dx, ry + bob, rr * 0.32, INK.coin, 1); disc(dx - rr * 0.1, ry + bob - rr * 0.1, rr * 0.08, INK.white, 1); }
    else { const ry = Y(0.55); for (let i = 0; i < 3; i++) disc(dx + (i - 1) * rr * 0.5, ry - (i === 1 ? rr * 0.4 : 0) + bob, rr * 0.26, INK.coin, 1); }
    for (let i = 0; i < 6; i++) {
      const u = (T * 0.45 + i / 6) % 1, q = ((Math.sin(i * 12.9898 + d.x0) * 43758.5453) % 1 + 1) % 1, spx = sn(dx - dw + q * 2 * dw), spy = y1 - u * (top * lv.tile + 2.5 * R);
      const k2 = Math.sin(u * Math.PI), l = (k2 > 0.7 ? 2 : 1) * P, ink = i & 1 ? INK.white : c;
      if (k2 > 0.25) { box(spx - l, spy - P * 0.5, spx + l, spy + P * 0.5, ink, 1, 0, 10, 0); box(spx - P * 0.5, spy - l, spx + P * 0.5, spy + l, ink, 1, 0, 10, 0); }
    }
  };
  const izba = (d) => {   // Baba Yaga's hut on chicken legs (the shop, E), leaning out, its roof sagging, a smoking chimney, a skull over its door
    const { t, sn, X, Y, bx, ln, px } = skDoorAt(d), c = PAL.red, G = PAL.gray, K = PAL.black, HALF = 1.5;
    const Wd = 3.3, eave = 2.5, dh = 2.0, dx = X(1.25), dw = sn(0.7 * t), lean = 0.5;   // tiles its top leans out
    const sk = (v) => (lean * v) / eave;   // how far a height leans
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its door
    const rt = this.route; if (CINE) this.route = 3;   // (the cinematic fork: its legs behind the ledge)
    for (const [u, s] of [[0.9, 1], [2.5, -1]]) {   // its gnarled chicken legs, down behind the ledge: a scaly thigh, a shin bent back, three long claws and a spur
      ln(u, 0, u + 0.4 * s, -0.75, G, 5, HALF); for (let i = 0; i < 3; i++) ln(u + 0.4 * s * (0.2 + 0.3 * i), -0.15 - 0.22 * i, u + 0.4 * s * (0.2 + 0.3 * i) + 0.12, -0.2 - 0.22 * i, K, 1);
      ln(u + 0.4 * s, -0.75, u + 0.1 * s, -1.6, G, 3, HALF); for (const e of [-0.5, 0, 0.45]) { ln(u + 0.1 * s, -1.6, u + 0.1 * s + e, -1.85, G, 2, HALF); ln(u + 0.1 * s + e, -1.85, u + 0.1 * s + e * 1.25, -1.8, G, 1, HALF); } ln(u + 0.1 * s, -1.55, u + 0.1 * s - 0.3 * s, -1.42, G, 1, HALF);
    }
    this.route = rt;
    for (let v = 0, i = 0; v < eave - 0.01; v += 0.31, i++) { const v1 = Math.min(eave, v + 0.31); bx(sk(v), v, Wd + sk(v), v1, G, i % 2 ? 1 : 4); bx(sk(v), v, Wd + sk(v), v + px, K); F(X(Wd + sk(v) + 0.05), Y(v + 0.15), 0.16 * t, 0, 0, 0.14 * t, G, 1, 0); }   // its crooked log courses, their ends out at its corner
    const top = eave + 1.5, ru = Wd / 2 + lean * 1.4;   // its roof: a sagging thatch of sticks and moss, hanging off its eaves
    for (let i = 0, n = 10; i < n; i++) { const q = i / n, sg = 0.3 * Math.sin(q * Math.PI); bx(-0.35 + lean + (Wd + 0.7) * 0.5 * q + lean * 0.4 * q, eave + 1.5 * q - sg, Wd + 0.35 + lean - (Wd + 0.7) * 0.5 * q + lean * 0.4 * q, eave + 1.5 * (q + 1 / n) - sg, G, i % 3 ? 5 : 4); }
    for (let u = -0.3, i = 0; u < Wd + 0.3; u += 0.27, i++) ln(u + lean, eave, u + lean + 0.05 * Math.sin(i), eave - 0.18 - 0.3 * ((i * 7) % 3) / 2, G, 1);
    ln(-0.4 + lean, eave + 0.05, ru, top + 0.1, G, 2); ln(ru, top + 0.1, Wd + 0.4 + lean, eave + 0.05, G, 2);   // its eaves' edges, sticks
    bx(0.5, 0, 2.0, dh, INK.dark); F(dx, Y(0.6), 0.6 * t, 0, 0, 0.7 * t, PAL.orange, 0.35, 1);   // the doorway, dim inside
    bx(0.5, dh - 0.8, 2.0, dh, c); for (let u = 0.5, i = 0; u < 2.0; u += 0.15, i++) bx(u, dh - 0.8 - 0.12 * (i % 3 === 1 ? 2 : i % 2), u + 0.08, dh - 0.8, c);   // its red cloth, tattered
    for (const u of [0.95, 1.5]) bx(u, dh - 0.75, u + px, dh - 0.2, K); bx(0.42 + sk(dh), dh, 2.08 + sk(dh), dh + 0.12, G);   // its slits, the lintel
    { const u0 = 2.35 + sk(1.4), u1 = 3.0 + sk(1.4), v0 = 1.05, v1 = 1.75; F(X((u0 + u1) / 2), Y((v0 + v1) / 2), 0.6 * t, 0, 0, 0.55 * t, PAL.orange, 0.35, 1); bx(u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1, G); bx(u0, v0, u1, v1, PAL.orange);   // a window lit (a light), its crooked frame
      bx((u0 + u1) / 2 - px / 2, v0, (u0 + u1) / 2 + px / 2, v1, K); bx(u0, (v0 + v1) / 2, u1, (v0 + v1) / 2 + px, K); ln(u0 - 0.15, v1 + 0.12, u1 + 0.2, v1 + 0.22, G, 2); vlamps.push([X((u0 + u1) / 2), Y((v0 + v1) / 2), 0.4, 1.2]); }
    ln(Wd - 0.6 + lean, eave + 0.5, Wd - 0.5 + lean, top + 0.5, G, 5); for (let i = 0; i < 3; i++) F(X(Wd - 0.5 + lean + 0.15 * Math.sin(T + i)), Y(top + 0.85 + 0.4 * i), (0.18 + 0.05 * i) * t, 0, 0, 0.12 * t, G, DIM, 4);   // a smoking chimney
    { const u = 1.25 + sk(dh), v = dh + 0.42, s = 0.8; F(X(u), Y(v), 0.3 * t * s, 0, 0, 0.28 * t * s, K, 1, 0); F(X(u), Y(v), 0.26 * t * s, 0, 0, 0.24 * t * s, G, 1, 0); bx(u - 0.14 * s, v - 0.3 * s, u + 0.14 * s, v - 0.14 * s, G);   // a skull over its door, dark round it so it reads on the logs
      for (const e of [-0.1, 0.1]) disc(X(u + e * s), Y(v), 0.07 * t * s, K, 1); for (const e of [-0.08, 0, 0.08]) bx(u + e * s, v - 0.3 * s, u + e * s + px, v - 0.2 * s, K); }
    skInside(d, 'shop', c, dx, dw, top);
  };
  // The Mine's doors (the owner's picks, 2026-10-21, research/variants/mine-shop-game.png B, mine-stash-game.png E): the shop a miners' tool shed built into the
  // tunnel wall, a flat roof, a red noren in its door (red the shop's mark), a lit window, a lamp; the stash the sealed door of a silver vault in a frame of
  // stone, a keystone with its mark over it, a lock, its cracks glowing purple (the stash's mark), a lamp. What is inside bobs in the doorway (skInside), a glow
  // breathes round it.
  const mnShop = (d) => {
    const { t, sn, X, Y, bx, ln, px } = skDoorAt(d), c = PAL.red, G = PAL.gray, K = PAL.black, dh = 2.0, dx = X(1.25), dw = sn(0.7 * t);
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its door
    bx(0.25, 0, 2.25, dh + 0.45, G, 1); bx(0.5, 0, 2.0, dh, INK.dark);   // its wooden front, the doorway dim inside
    for (const u of [0.3, 2.0]) bx(u, 0, u + 0.2, dh + 0.4, G, 3); bx(0.25, dh + 0.3, 2.25, dh + 0.45, G); bx(0.25, dh + 0.3, 2.25, dh + 0.3 + px, K);   // its posts, its lintel
    bx(0.15, dh + 0.45, 2.45, dh + 0.65, G, 3, 1);   // its flat roof (grey, its grain dotted: it was white, an alpha of 3, and read as a ledge's edge)
    bx(0.5, dh - 0.6, 2.0, dh, c); for (let u = 0.5; u < 2.0; u += 0.375) bx(u, dh - 0.6, u + px, dh, K);   // its noren, in strips,
    F(dx, Y(dh - 0.3), 0.17 * t, 0, 0, 0.17 * t, PAL.white, 1, 4); bx(1.25 - px, dh - 0.45, 1.25 + px, dh - 0.15, PAL.white); bx(1.1, dh - 0.31, 1.4, dh - 0.29, PAL.white);   // a mark on it
    bx(2.3, 0.9, 2.75, 1.4, PAL.orange); bx(2.3, 1.15, 2.75, 1.15 + px, K); bx(2.52 - px / 2, 0.9, 2.52 + px / 2, 1.4, K); vlamps.push([X(2.52), Y(1.15), 0.4, 1.2]);   // a window lit (a light)
    mnLamp(X(3.0), Y(2.4), true, 0.85);   // a lamp
    skInside(d, 'shop', c, dx, dw, dh + 1.2);
  };
  const mnStash = (d) => {
    const { t, sn, X, Y, bx, ln, px } = skDoorAt(d), c = PAL.purple, G = PAL.gray, K = PAL.black, dh = 2.0, dx = X(1.25), dw = sn(0.7 * t);
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round it
    for (let i = 0; i < 9; i++) { const q = i / 8, u = q < 0.3 ? 0.32 : q > 0.7 ? 2.18 : 0.32 + ((q - 0.3) / 0.4) * 1.86, v = q < 0.3 ? (q / 0.3) * dh : q > 0.7 ? ((1 - q) / 0.3) * dh : dh; bx(u - 0.22, v - 0.15, u + 0.22, v + 0.27, G, 1, 1.5); }   // its frame of stones (half dark)
    bx(0.5, 0, 2.0, dh, G, 3, 1.5); for (const v of [0.45, 1.2, 1.75]) bx(0.5, v, 2.0, v + 0.08, K);   // its door, timber (half dark: it was pure white), iron bands
    for (const [u, v] of [[0.62, 0.3], [1.88, 0.3], [0.62, 1.6], [1.88, 1.6]]) bx(u, v, u + px, v + px, PAL.white);   // its studs
    for (const [u0, v0, u1, v1] of [[0.8, 1.6, 0.95, 1.1], [0.95, 1.1, 0.85, 0.7], [1.6, 1.9, 1.5, 1.35], [1.5, 1.35, 1.65, 0.9], [1.2, 0.5, 1.3, 0.1]]) ln(u0, v0, u1, v1, c, 1);   // its cracks, glowing purple
    bx(1.1, 0.8, 1.4, 1.15, G); bx(1.22, 0.86, 1.28, 1.05, K);   // its lock, its keyhole
    F(X(1.25), Y(dh + 0.42), 0.26 * t, 0, 0, 0.24 * t, G, 1, 0); F(X(1.25), Y(dh + 0.42), 0.15 * t, 0, 0, 0.13 * t, K, 1, 4);   // a keystone with its mark
    mnLamp(X(2.7), Y(2.2), true, 0.85);   // a lamp
    skInside(d, 'stash', c, dx, dw, dh);
  };
  const pech = (d) => {   // a crooked Russian stove (the stash, E), tall and lumpy and cracked, its mouth the door, its chimney bent, a bench step off it with a shelf over it
    const { t, sn, X, Y, bx, ln, px } = skDoorAt(d), c = PAL.purple, G = PAL.gray, K = PAL.black, dh = 2.0, dx = X(1.25), dw = sn(0.7 * t);
    const Wd = 2.6, ht = 3.0, bend = 0.5;   // its width, its height, its chimney's crook
    F(dx, Y(dh / 2), 1.6 * t, 0, 0, 1.5 * t, c, 0.4 + 0.12 * Math.sin(T * 2.6 + dx), 1);   // a glow breathing round its mouth
    for (const [u, v, ru, rv] of [[0.4, ht - 0.35, 0.55, 0.45], [Wd - 0.4, ht - 0.4, 0.55, 0.5], [Wd / 2, ht - 0.25, Wd * 0.4, 0.4], [-0.02, 0.6, 0.18, 0.6], [Wd + 0.02, 0.7, 0.16, 0.55]]) F(X(u), Y(v), ru * t, 0, 0, rv * t, G, 1, 0);   // its lumpy shoulders, its sides bulging
    bx(0, 0, Wd, ht - 0.3, G, 1); bx(0, 0, Wd, 0.25, G, 2);   // its whitewash (grey), dotted, a plinth
    for (const [u, v, n] of [[0.25, ht - 0.6, 4], [Wd - 0.45, 1.6, 5], [Wd - 0.3, 0.6, 3]]) for (let i = 0; i < n; i++) bx(u + (i % 2) * 0.06, v - i * 0.13, u + (i % 2) * 0.06 + px, v - i * 0.13 - 0.13, K);   // its cracks
    bx(Wd, 0, Wd + 0.9, 1.1, G, 1); bx(Wd - 0.05, 1.1, Wd + 1.0, 1.2, G);   // the bench step off it
    const cu = 1.1; ln(cu, ht - 0.2, cu + bend, ht + 0.6, G, 7); ln(cu + bend, ht + 0.6, cu + bend * 0.5, ht + 1.1, G, 6); bx(cu + bend * 0.5 - 0.35, ht + 1.1, cu + bend * 0.5 + 0.35, ht + 1.22, G, 4);   // its crooked chimney, a cap
    F(dx, Y(1.55), 0.86 * t, 0, 0, 0.62 * t, K, 1, 0); bx(0.38, 0, 2.12, 1.55, K);   // soot round its mouth
    F(dx, Y(1.5), 0.7 * t, 0, 0, 0.5 * t, INK.dark, 1, 0); bx(0.55, 0, 1.95, 1.5, INK.dark);   // its mouth, dark
    F(dx, Y(0.7), 0.65 * t, 0, 0, 0.75 * t, c, 0.55, 1);   // the purple glow in it (the stash's mark)
    for (let i = 0; i < 5; i++) { const fl = Math.sin(T * 9 + i * 1.7) > 0 ? 1 : 0; bx(0.7 + 0.24 * i, 0.12, 0.7 + 0.24 * i + 2 * px, 0.2 + 0.08 * fl, PAL.orange); }   // embers flickering
    bx(Wd + 0.1, 1.6, Wd + 0.9, 1.66, G); { const u = Wd + 0.5, s = 0.55; F(X(u), Y(1.66 + 0.3 * s), 0.3 * t * s, 0, 0, 0.3 * t * s, G, 1, 0); bx(u - 0.18 * s, 1.66 + 0.5 * s, u + 0.18 * s, 1.66 + 0.62 * s, G); F(X(u), Y(1.66 + 0.3 * s), 0.3 * t * s, 0, 0, 0.3 * t * s, K, 1, 4); }   // a shelf, a clay pot on it
    skInside(d, 'stash', c, dx, dw, ht);
  };
  const pt = lv.portal;
  if (pt && seen(pt.y - 3 * pt.r, pt.y + 3 * pt.r)) {
    const p = 1 + 0.08 * Math.sin(T * 4);
    F(pt.x, pt.y, pt.r * 2.2 * p, 0, 0, pt.r * 2.2 * p, INK.white, 0.3, 1);
    disc(pt.x, pt.y, pt.r, INK.dark, 1);   // a hole: the hero shows going into it
    F(pt.x, pt.y, pt.r * 1.12, 0, 0, pt.r * 1.12, th.lip, 1, 4);
    for (let k = 0; k < 3; k++) { const a = T * 2.2 + (k * TAU) / 3; disc(pt.x + Math.cos(a) * pt.r * 1.5, pt.y + Math.sin(a) * pt.r * 1.5, pt.r * 0.13, th.lip, 0.9); }
  }
  if (CINE) { this.route = 1; cineBack(this, lv, cam, H, box, F, T); }   // (the cinematic fork: from here what the kits draw DIM goes behind, the rest is a small thing in depth; see cine.js)
  const kitT = lv.tile, kitP = PIX.size, snap = (v) => Math.round(v / kitP) * kitP;
  const brace = (wx, d, y0, h, s, c) => {   // a knee brace off the wall at wx out toward d, from y0 down h, a pixel clear of the wall: a leg down
    // the wall, a bar along its top and a strut s wide between their ends (Tokyo's slabs, its air conditioners)
    const P = kitP, xs = (a, b) => [snap(Math.min(wx + d * a, wx + d * b)), snap(Math.max(wx + d * a, wx + d * b))], [l0, l1] = xs(P, P + s), [b0, b1] = xs(P, P + h);
    box(l0, y0, l1, y0 + h, c, 1, 0, 10, 0); box(b0, y0, b1, y0 + 2 * P, c, 1, 0, 10, 0);
    for (let y = y0; y < y0 + h; y += P) { const u = y0 + h - y, [a0, a1] = xs(Math.max(P, u - s / 2), Math.min(P + h, u + s / 2)); box(a0, y, a1, y + P, c, 1, 0, 10, 0); }
  };
  const aircon = (r, ox, oy) => {   // a Tokyo air conditioner (AC; the owner's pick, research/variants/tokyo-aircon2-2-px.png E) on its rect, moved by (ox, oy): a grey
    // box off the wall on two pipes clamped grey (E's were purple), a black fan behind eight grey spokes, a black seam, the side panel's green light and black louvers,
    // on a grey knee brace bolted white
    const t = kitT, P = kitP, wl = r.x0 + r.x1 < lv.l + lv.r, w = r.x1 - r.x0, h = AC.h * t, x0 = r.x0 + ox, y = r.y0 + oy, f = (u) => (wl ? x0 + u * w : x0 + w - u * w), wx = (wl ? lv.l : lv.r) + ox, d = wl ? 1 : -1;
    const rt = this.route, L = (n) => { if (CINE) this.route = n; };   // (the cinematic fork: its grey box in depth, clean, so its top face reads as the top it is; all
    // on it flat; its pipes and its brace, thin, flat)
    L(0); for (const v of [0.42, 0.62]) { const py = snap(y + v * h), cx = snap((wx + f(0)) / 2); box(Math.min(wx, f(0)), py, Math.max(wx, f(0)), py + 2 * P, PAL.gray, 1, 0, 10, 0); box(cx - P, py - P, cx + 2 * P, py + 3 * P, PAL.gray, 1, 0, 10, 0); }
    L(rt); box(x0, y, x0 + w, y + h, PAL.gray, 1, 0, 10, 0); L(0);
    const fx = f(0.37), fy = y + 0.53 * h, fr = 0.36 * h, spin = CINE && !POKE.still ? T * (r.crumbling ? 2 + 14 * Math.min(1, r.t / AC.time) : 0.6) : 0;   // (2.5D: its fan
    // turning slowly, faster and faster as it gives way: a warning too)
    disc(fx, fy, fr, PAL.black, 1);
    for (let k = 0; k < 8; k++) { const a = ((k + 0.5) * Math.PI) / 4 + spin; rod(fx + Math.cos(a) * 0.25 * fr, fy + Math.sin(a) * 0.25 * fr, fx + Math.cos(a) * 0.88 * fr, fy + Math.sin(a) * 0.88 * fr, PAL.gray); }
    disc(fx, fy, 0.24 * fr, PAL.gray, 1);
    const sx = snap(f(0.74)), p0 = snap(Math.min(f(0.79), f(0.95))), p1 = snap(Math.max(f(0.79), f(0.95)));
    box(sx, y + 2 * P, sx + P, y + h - 2 * P, PAL.black, 1, 0, 10, 0);
    box(p0, snap(y + 0.1 * h), p1, snap(y + 0.22 * h), PAL.green, 1, 0, 10, 0);
    for (let i = 0; i < 5; i++) { const ly = snap(y + (0.34 + 0.11 * i) * h); box(p0, ly, p1, ly + P, PAL.black, 1, 0, 10, 0); }
    const by = snap(y + h) + P, bh = snap(AC.brace * t);
    brace(wx, d, by, bh, 2 * P, PAL.gray);
    for (const [u, v] of [[2 * P, 0], [bh - P, 0], [2 * P, bh - 2 * P]]) { const bx = snap(wx + d * u); box(Math.min(bx, bx + d * P), by + v, Math.max(bx, bx + d * P), by + v + P, PAL.white, 1, 0, 10, 0); }
    this.route = rt;
  };
  const rod = (x0, y0, x1, y1, c) => {   // a line a game pixel thick (an awning's rods, a bucket's handle)
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / kitP));
    for (let k = 0; k <= n; k++) { const x = snap(x0 + ((x1 - x0) * k) / n), y = snap(y0 + ((y1 - y0) * k) / n); box(x, y, x + kitP, y + kitP, c, 1, 0, 10, 0); }
  };
  const line = (x0, y0, x1, y1, c, a = 1, w = 1, tn = 0) => {   // a line w game pixels thick at any slope in one feature, a box turned along it (the Village's ropes, branches, blades)
    const ax = (x1 - x0) / 2, ay = (y1 - y0) / 2, l = Math.hypot(ax, ay) || 1, hw = ((w + 0.1) * kitP) / 2;
    F((x0 + x1) / 2, (y0 + y1) / 2, ax, ay, (-ay / l) * hw, (ax / l) * hw, c, a, 10, l, hw, tn);
  };
  if (th.town && lv.kind === 'well') {   // Tokyo's kit (THEMES.tokyo; see the parts catalog): whatever hangs, hangs on something. A utility pole up
    // each wall carries the wires on a crossarm every `arm`; air conditioners sit on brackets on the walls; signs hang on two arms off
    // a wall; vending machines stand in a niche at a ledge's wall end. All on a fixed beat by height, not at random, so nothing is kept.
    const t = kitT, P = kitP, arm = WIRE.arm * t, mod = (k, n) => ((k % n) + n) % n;
    for (let k = Math.floor(top / arm) - 1; k * arm < bot + arm; k++) {   // the wire, from crossarm to crossarm, sagging (WIRE)
      const y0 = (k * WIRE.arm + WIRE.drop) * t, x0 = lv.l + WIRE.inset * t, x1 = lv.r - WIRE.inset * t, sag = WIRE.sag * t, st = 3 * P;
      if (y0 + sag < top || y0 > bot) continue;
      for (let x = x0; x < x1; x += st) { const u = (x + st / 2 - x0) / (x1 - x0), y = snap(y0 + sag * 4 * u * (1 - u)); box(x, y, Math.min(x + st, x1), y + P, PAL.gray, DIM, 0, 10, 0); }
    }
    const atDoor = (x0, y0, x1, y1) => lv.bubbles.some((b) => b.x1 + t > x0 && b.x0 - t < x1 && b.y1 > y0 && b.y0 - t < y1);   // in the way of a door, or its glow (owner: nothing covers one)
    const acNear = (wl, ya, yb) => lv.rects.some((q) => q.ac && !q.gone && (q.x0 + q.x1 < lv.l + lv.r) === wl && q.y0 < yb && q.y0 + (AC.h + AC.brace) * t > ya);   // an air conditioner hangs over [ya, yb] on that wall
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), span = (d0, d1) => [Math.min(at(d0), at(d1)), Math.max(at(d0), at(d1))];
      const [p0, p1] = span(0.28 * t, 0.46 * t);
      box(p0, top, p1, bot, PAL.gray, DIM, 0, 10, 0);   // the pole, behind (DEPTH)
      for (let k = Math.floor(top / arm) - 1; k * arm < bot; k++) {
        const y = k * arm, [a0, a1] = span(0.1 * t, 1.05 * t);
        box(a0, y, a1, y + 0.16 * t, PAL.gray, DIM, 0, 10, 0);   // its crossarm
        { const x = at(WIRE.inset * t); box(x - P, y - 2 * P, x + P, y, PAL.gray, DIM, 0, 10, 0); }   // the wire's insulator
        if (mod(k, 3) === (side < 0 ? 0 : 1)) { const [c0, c1] = span(0.05 * t, 0.7 * t); box(c0, y + 0.5 * t, c1, y + 1.5 * t, PAL.gray, DIM, 0, 10, 0); box(c0, y + 0.9 * t, c1, y + 0.9 * t + P, PAL.black, DIM, 0, 10, 0); }   // a transformer can
      }
    }
    const tfN = this.route; if (CINE) this.route = 3;   // (the cinematic fork: a sign is flat, whole, its tubes off or lit, and behind the ledges as in 2D, its halo too)
    for (let k = Math.floor(top / (11 * t)) - 1; k * 11 * t < bot; k++) if (mod(k, 3) !== 2) {   // a neon sign on two arms off a wall, two in every three beats, the walls and the words in turn
      // (the owner's pick, research/variants/tokyo-neon-1.png B): tubes, its word and a picture of what is sold, framed on a dark box with grey caps
      // over and under it; its tubes off and faint (behind, DEPTH) till the hero jumps close past it, then lit red or blue in full, glowing, and so
      // for good (owner): lv.neonLit, the time each was lit (it flickers on); in the power cut too, a light of its own
      const s = neonSign(lv, k);
      if (!s || s.y1 + 0.3 * t < top || s.y0 - 0.4 * t > bot) continue;
      const { word, pic, kk, gw, sw, left, x0, y0, y1 } = s, cx = x0 + sw / 2, on = lv.neonLit && lv.neonLit.get(k), lit = on != null && !((T - on) < 0.4 && Math.floor((T - on) * 20) % 3 === 1);
      const ink = lit ? s.ink : PAL.gray, ia = lit ? 1 : DIM;
      if (lit) { F(cx, (y0 + y1) / 2, 2.2 * sw, 0, 0, 0.62 * (y1 - y0) + 1.4 * sw, ink, 1.3, 1); F(cx, (y0 + y1) / 2, sw, 0, 0, 0.55 * (y1 - y0) + 0.5 * sw, ink, 2.4, 1); }   // its glow: a wide halo, and round the box a solid tone fading
      for (const y of [y0 + 0.3 * t, y1 - 0.5 * t]) { box(left ? lv.l : x0 + sw, y, left ? x0 : lv.r, y + 0.12 * t, PAL.gray, DIM, 0, 10, 0); box(left ? lv.l : lv.r - 0.2 * t, y - 0.06 * t, left ? lv.l + 0.2 * t : lv.r, y + 0.18 * t, PAL.gray, DIM, 0, 10, 0); }   // the arms, bolted on
      box(x0 - P, y0 - 0.14 * t, x0 + sw + P, y0, PAL.gray, DIM, 0, 10, 0); box(x0 + 2 * P, y0 - 0.28 * t, x0 + sw - 2 * P, y0 - 0.14 * t, PAL.gray, DIM, 0, 10, 0); box(x0 + 2 * P, y1, x0 + sw - 2 * P, y1 + 0.12 * t, PAL.gray, DIM, 0, 10, 0);
      box(x0, y0, x0 + sw, y1, PAL.black, 1, 0, 10, 0);
      for (const [a0, b0, a1, b1] of [[x0 + P, y0 + P, x0 + sw - P, y0 + 2 * P], [x0 + P, y1 - 2 * P, x0 + sw - P, y1 - P], [x0 + P, y0 + P, x0 + 2 * P, y1 - P], [x0 + sw - 2 * P, y0 + P, x0 + sw - P, y1 - P]]) box(a0, b0, a1, b1, ink, ia, 0, 10, 0);   // the frame's tube
      word.forEach((ch, j) => icon('kana_' + ch, cx, y0 + 3 * P + (j + 0.5) * gw, ia, kk, ink));
      icon(pic, cx, y1 - 3 * P - 0.45 * gw, ia, kk, ink);
    }
    this.route = tfN;
    if (CINE) this.route = 4;   // (the cinematic fork: a vending machine, a bonsai: small things in depth, whole)
    for (const r of lv.rects) {   // a vending machine in a niche at the wall end of some wide steady ledges (the owner's pick, research/variants/tokyo-vending-1.png
      // D): a navy cabinet, its lit front by the wall with rows of cans and a glint, a grey coin panel and buttons at its free side (D's was yellow: yellow is
      // for what you take), the slot under the front
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || !(wl || wr) || r.x1 - r.x0 < 3 * t || !seen(r.y0 - 3 * t, r.y0) || mod(Math.round(r.y0 / t), 3)) continue;
      const w = 1.4 * t, h = 2.2 * t, x0 = wl ? lv.l + 0.2 * t : lv.r - 0.2 * t - w, y0 = r.y0 - h;
      if (atDoor(x0 - 0.15 * t, y0 - 0.2 * t, x0 + w + 0.15 * t, r.y0)) continue;
      const g0 = snap(wl ? x0 + 0.1 * w : x0 + 0.36 * w), g1 = snap(g0 + 0.54 * w), c0 = snap(wl ? x0 + 0.72 * w : x0 + 0.12 * w);
      box(x0 - 0.15 * t, y0 - 0.2 * t, x0 + w + 0.15 * t, r.y0, PAL.black, 1, 0, 10, 0);   // the niche
      box(x0, y0, x0 + w, r.y0, PAL.blue, 1, 0, 10, 4);   // the cabinet: blue checkered with black, navy
      box(g0, snap(y0 + 0.08 * h), g1, snap(y0 + 0.68 * h), PAL.blue, 1, 0, 10, 0);
      const cans = [PAL.purple, PAL.purple, PAL.gray], cw = (g1 - g0) / 3;   // a prop: no white (DEPTH; owner)
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const cx = g0 + (i + 0.5) * cw, cy = snap(y0 + (0.15 + 0.18 * j) * h); box(snap(cx - 0.28 * cw), cy, snap(cx + 0.28 * cw), cy + snap(0.12 * h), cans[(i + 2 * j) % 3], 1, 0, 10, 0); }
      for (let i = 0; i < 3; i++) box(g0 + (i + 1) * P, snap(y0 + 0.08 * h) + (3 - i) * P, g0 + (i + 2) * P, snap(y0 + 0.08 * h) + (4 - i) * P, PAL.gray, 1, 0, 10, 0);   // the glint
      box(c0, snap(y0 + 0.3 * h), c0 + snap(0.16 * w), snap(y0 + 0.38 * h), PAL.gray, 1, 0, 10, 0);
      for (let i = 0; i < 3; i++) { const by = snap(y0 + (0.44 + 0.06 * i) * h), bx = c0 + snap(0.05 * w); box(bx, by, bx + P, by + P, PAL.gray, 1, 0, 10, 0); }
      box(g0 + snap(0.05 * w), snap(r.y0 - 0.2 * h), g1 - snap(0.05 * w), snap(r.y0 - 0.11 * h), PAL.black, 1, 0, 10, 0);   // the slot
    }
    for (const r of lv.rects) {   // a bonsai at the wall end of some other steady ledges, as on a balcony (the owner's pick, research/variants/tokyo-bonsai-1.png F):
      // a shallow grey pot, an orange trunk in an S and its branches, pads of green needles shaded down to the right; not under an air conditioner, nor by a cage or Moti
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
      if (r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || !(wl || wr) || r.x1 - r.x0 < 2 * t || !seen(r.y0 - 2 * t, r.y0) || mod(Math.round(r.y0 / t), 3) !== 1
        || acNear(wl, r.y0 - 1.7 * t, r.y0) || lv.folk.some((f) => f.rect === r && (f.kind === 'cage' || f.kind === 'trader'))) continue;
      const d = wl ? 1 : -1, cx = snap((wl ? lv.l : lv.r) + d * 0.85 * t), by = r.y0 - 0.3 * t, X = (u) => cx + d * u * t, Y = (v) => by - v * t;
      if (atDoor(cx - 0.9 * t, r.y0 - 1.7 * t, cx + 0.9 * t, r.y0)) continue;
      const sw = CINE ? cinePoke(g, lv, r, 'bonsai', cx - 0.9 * t, r.y0 - 1.6 * t, cx + 0.9 * t, r.y0) : 0, SB = (v) => (sw ? snap(sw * v * t) : 0);   // (the cinematic fork: poked, it sways)
      for (const [hw, a0, a1] of [[0.5, 0, 0.07], [0.45, 0.07, 0.17], [0.38, 0.17, 0.25]]) box(snap(cx - hw * t), snap(by + a0 * t), snap(cx + hw * t), snap(by + a1 * t), PAL.gray, 1, 0, 10, 0);
      for (const f of [-0.27, 0.27]) box(snap(cx + f * t) - P, snap(by + 0.25 * t), snap(cx + f * t) + P, r.y0, PAL.gray, 1, 0, 10, 0);
      const trunk = (q) => [X(0.16 * Math.sin(q * Math.PI * 1.8) - 0.03) + SB(0.95 * q), Y(0.95 * q)];
      for (let q = 0; q <= 1; q += P / (0.95 * t)) { const [x, y] = trunk(q); disc(x, y, (0.1 - 0.055 * q) * t, PAL.orange, 1); }
      for (const [q, u, v] of [[0.32, 0.55, 0.52], [0.55, -0.55, 0.5], [0.8, 0.5, 0.92], [0.7, -0.5, 0.86]]) { const [x0, y0] = trunk(q); for (let e = 0; e <= 1; e += 0.12) disc(x0 + (X(u) + SB(v) - x0) * e, y0 + (Y(v) - y0) * e, 0.035 * t, PAL.orange, 1); }
      for (const [u, v, rx, ry] of [[-0.05, 1.12, 0.32, 0.14], [-0.5, 0.86, 0.28, 0.12], [0.5, 0.92, 0.3, 0.12], [0.55, 0.52, 0.28, 0.11], [-0.55, 0.5, 0.24, 0.1]]) {
        F(X(u) + SB(v), Y(v), rx * t, 0, 0, ry * t, PAL.green, 1, 9, 0); F(X(u) + SB(v) - d * 0.08 * t, Y(v) - 0.08 * t, 0.6 * rx * t, 0, 0, 0.6 * ry * t, PAL.green, 1, 9, 0);   // a pad, a tuft on it
      }
    }
    if (CINE) this.route = 1;
  }
  const vlamps = [];   // the lights the kits put on this screen, for the dark: the Mine's lanterns, the Village's stone lanterns, the forest's eyes, candles and moon
  // The Mine's shared pieces (the owner's picks, 2026-10-21, research/variants/mine-*-game.png): its lamp, a kantera hung at (x, y), a dome on a caged body (A; lit:
  // a glow round it, a light of the dark; the wall ones the hero lights, a task), its ore glinting in the wall over a ledge (C), its things on ledges, its bats, the
  // mine far off
  const mnLamp = (x, y, lit, s = 1, arm = 0, t0 = null) => {   // arm: the side its wall is on (its bracket from there), 0 off a hook; t0: when the hero lit it
    const t = kitT, G = PAL.gray, K = PAL.black, O = PAL.orange, V = (v) => snap(y + v * s * t), e = CINE && !POKE.still && t0 != null ? T - t0 : 9;
    const sw = e < 1.6 ? snap(Math.sin(e * 13) * 0.12 * t * (1 - e / 1.6)) : 0, U = (u) => snap(x + u * s * t) + (u === 0 || Math.abs(u) > 0.25 ? 0 : sw);   // (the cinematic fork:
    // lit, it swings on its hook a moment, its body the most; the rule book's «лампа качается, когда её зажигают»)
    const bx = (u0, v0, u1, v1, c, a = 1, tn = 0) => box(Math.min(U(u0), U(u1)), Math.min(V(v0), V(v1)), Math.max(U(u0), U(u1)), Math.max(V(v0), V(v1)), c, a, 0, 10, tn);
    const gl = lit ? O : K, cy = V(0.6);
    if (arm) { bx(-arm * 0.55, -0.16, -arm * 0.47, 0.16, G); bx(-arm * 0.55, -0.05, 0.02 * arm, 0.03, G); }   // its bracket off the wall
    box(snap(x - 0.03 * s * t), V(0.03), snap(x + 0.03 * s * t), V(0.22), G, 1, 0, 10, 0);   // its hook and link (what it swings from)
    if (lit) { F(U(0) + sw, cy, 0.8 * s * t, 0, 0, 0.8 * s * t, O, 0.3 + 0.06 * Math.sin(T * 5 + x * 0.1), 1); vlamps.push([U(0) + sw, cy, 0.6 * s, 1.8 * s]); }   // its glow, breathing (a light)
    F(U(0) + sw, V(0.3), 0.17 * s * t, 0, 0, 0.1 * s * t, G, 1, 0); bx(-0.2, 0.28, 0.2, 0.36, G); bx(-0.22, 0.36, 0.22, 0.88, G, 1, 4); bx(-0.14, 0.42, 0.14, 0.82, gl); bx(-0.2, 0.88, 0.2, 0.96, G);   // its dome, its caged body, its glass
    for (const v of [0.55, 0.69]) bx(-0.14, v, 0.14, v + 0.03, G);   // the bars across it
    if (lit) bx(-0.04, 0.54, 0.04, 0.68, PAL.yellow);   // its flame
  };
  const mnOre = (wx, b, d, n) => {   // a vein of silver ore in the wall over a ledge, behind (DIM): a timber frame's corner, a lamp hung off it, a little ore glinting
    const t = kitT, P = kitP, G = PAL.gray, X = (u) => snap(wx + d * u * t), Y = (v) => snap(b - v * t);
    const bx = (u0, v0, u1, v1, c, a = DIM, tn = 0) => box(Math.min(X(u0), X(u1)), Math.min(Y(v0), Y(v1)), Math.max(X(u0), X(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
    const glint = (u, v, i) => { const on = Math.sin(T * 2.2 + i * 2.1 + n) > 0.45, x = X(u), y = Y(v); box(x - P, y, x + 2 * P, y + P, PAL.white, on ? 1 : DIM, 0, 10, 0); if (on) box(x, y - P, x + P, y + 2 * P, PAL.white, 1, 0, 10, 0); };   // a glint: a cross when it catches the light
    const gem = (u, v, w, h) => { F(X(u), Y(v + h * 0.5), w * 0.5 * t, 0, 0, h * 0.5 * t, G, 1.5, 0); bx(u - w * 0.08, v + h * 0.1, u + w * 0.12, v + h * 0.85, PAL.white, 1.5); };   // a crystal, a facet lit on it
    bx(0.05, 1.95, 1.9, 2.12, G, 1.5, 3); line(X(0.1), Y(1.25), X(0.75), Y(1.95), G, 1.5, 3); bx(0.05, 0, 0.2, 2.1, G, 1.5, 3);   // the frame's cap, its brace, its post
    mnLamp(X(1.45), Y(1.95), true, 0.8); gem(0.5, 0.35, 0.22, 0.45); [[0.45, 1.0], [0.9, 0.55], [0.3, 0.75]].forEach(([u, v], i) => glint(u, v, i));
    vlamps.push([X(0.9), Y(0.9), 0.2, 0.8]);   // its faint glow
  };
  const mnBatsAt = (r) => {   // under one ledge in five that has room under it: not a moving or crumbling one, nothing a tile and a half under it
    if (r.cap || r.move || r.crumble || r.spring || r.x1 - r.x0 < 2.4 * kitT) return false;
    const h = (((Math.imul(Math.round(r.y0 / kitT) + 11, 0x9e3779b1) >>> 0) / 4294967296) * 5) | 0;
    return h === 2 && !lv.rects.some((q) => q !== r && !q.cap && q.x1 > r.x0 && q.x0 < r.x1 && q.y0 < r.y1 + 1.5 * kitT && q.y1 > r.y1);
  };
  const mnBats = (r) => {   // four bats hanging asleep under a ledge, folded in their wings, one with an eye open (a tiny light), clear of a brace under it
    const t = kitT, P = kitP, G = PAL.gray, K = PAL.black, n = 4, wl = r.x0 <= lv.l + 1, x0 = wl ? r.x0 + 1.95 * t : r.x1 - 1.95 * t - (n - 1) * 0.55 * t;
    if (CINE) {   // (the cinematic fork: come near, they wake and fly off one after another; back later; the rule book's «летучие мыши просыпаются и разлетаются»)
      const B = r.batsP || (r.batsP = {}), at = [];
      for (let i = 0; i < n; i++) at.push([snap(x0 + i * 0.55 * t), snap(r.y1 + 0.75 * t)]);
      cinePoke(g, lv, B, 'bats', x0 - 0.3 * t, r.y1, x0 + (n - 1) * 0.55 * t + 0.3 * t, r.y1 + 0.8 * t, at);
      if (!cinePerched(B, lv.t)) return;
    }
    for (let i = 0; i < n; i++) {
      const x = snap(x0 + i * 0.55 * t), y = snap(r.y1 + (0.12 + 0.03 * Math.sin(T * 1.6 + i)) * t), hw = 0.17 * t, hh = 0.3 * t, ey = snap(y + hh * 1.25);
      box(x - P, r.y1, x + P, y, G, 1, 0, 10, 0);   // its feet hooked on
      F(x, snap(y + hh), hw + P, 0, 0, hh + P, G, 1, 0); F(x, snap(y + hh), hw, 0, 0, hh, K, 1, 0); F(x, snap(y + 2 * hh), 0.05 * t, 0, 0, 0.06 * t, G, 1, 0);   // folded in its wings, a grey edge, their tip
      if (i === 1) { box(x - snap(0.08 * t), ey, x - snap(0.08 * t) + P, ey + P, PAL.orange, 1, 0, 10, 0); vlamps.push([x - snap(0.08 * t), ey, 0.12, 0.4]); }   // an eye open
      else box(x - snap(0.1 * t), ey, x - snap(0.04 * t), ey + P, G, 1, 0, 10, 0);
      box(x + snap(0.04 * t), ey, x + snap(0.1 * t), ey + P, G, 1, 0, 10, 0);   // eyes shut
    }
  };
  const mnThing = (kind, wx, b, d, r) => {   // a cart, the miners' tools or a winch on a ledge at its wall end (X tiles out, Y up from its top)
    const rt = this.route, L = (n) => { if (CINE) this.route = n; };   // (the cinematic fork: thin parts flat, the bodies small, what is under the ledge behind)
    const roll = kind === 'cart' && CINE && r ? cinePoke(g, lv, r, 'cart', Math.min(wx + d * 0.3 * kitT, wx + d * 2.7 * kitT), b - 1.1 * kitT, Math.max(wx + d * 0.3 * kitT, wx + d * 2.7 * kitT), b) : 0;
    const t = kitT, P = kitP, px = P / t, G = PAL.gray, K = PAL.black, X = (u) => snap(wx + d * u * t), Y = (v) => snap(b - v * t), R = (u) => X(u) + snap(roll * 3 * t);   // (a cart rocked: its body)
    const bx = (u0, v0, u1, v1, c, a = 1, tn = 0) => box(Math.min(X(u0), X(u1)), Math.min(Y(v0), Y(v1)), Math.max(X(u0), X(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
    const ln = (u0, v0, u1, v1, c = G, wd = 1, a = 1) => line(X(u0), Y(v0), X(u1), Y(v1), c, a, wd);
    if (kind === 'cart') {   // a little mine cart (torokko) parked on its rails, slatted, heaped with ore glinting; a stop block
      L(0); bx(0.3, 0, 2.7, 0.06, G); for (let u = 0.35; u < 2.65; u += 0.4) bx(u, 0, u + 0.18, 0.1, G, 1.5); bx(2.55, 0, 2.7, 0.5, G);   // its rails, sleepers, a stop block
      const rb = (u0, v0, u1, v1, c, a = 1, tn = 0) => box(Math.min(R(u0), R(u1)), Math.min(Y(v0), Y(v1)), Math.max(R(u0), R(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
      L(rt); rb(0.5, 0.35, 2.3, 1.05, G, 1, 3); rb(0.45, 1.0, 2.35, 1.08, G); for (let u = 0.75; u < 2.2; u += 0.3) rb(u, 0.4, u + px, 1.0, K);   // its body, its rim, its slats
      for (const u of [0.85, 1.95]) { F(R(u), Y(0.22), 0.2 * t, 0, 0, 0.2 * t, K, 1, 0); F(R(u), Y(0.22), 0.2 * t, 0, 0, 0.2 * t, G, 1, 4); disc(R(u), Y(0.22), 0.05 * t, G, 1); }   // its wheels
      F(R(1.4), Y(1.08), 0.85 * t, 0, 0, 0.3 * t, G, 1.6, 0); L(0); for (const [u, v] of [[0.9, 1.2], [1.3, 1.3], [1.75, 1.22]]) rb(u, v, u + 2 * px, v + px, G, Math.sin(T * 2 + u * 3) > 0.2 ? 1 : DIM);   // its ore, glinting
      // (grey: no white on a prop, the rule book; flat in 2.5D, too small for depth, and one layer whether it glints or not)
    } else if (kind === 'tools') {   // the miners' tools by the wall: two pickaxes and a shovel leaning, a straw basket (zaru), a straw raincoat (mino) on a peg
      const pick = (u, lean) => { ln(u, 0, u + lean, 1.2, G, 2); ln(u + lean - 0.32, 1.08, u + lean - 0.08, 1.26, G, 2); ln(u + lean - 0.08, 1.26, u + lean + 0.12, 1.26, G, 3); ln(u + lean + 0.12, 1.26, u + lean + 0.36, 1.06, G, 2); };
      L(0); pick(0.15, 0.3); pick(0.45, 0.22); ln(0.8, 0.35, 1.1, 1.35, G, 2); bx(0.68, 0, 0.9, 0.38, G);   // its pickaxes, its shovel
      L(rt); bx(1.05, 0, 1.65, 0.42, G, 1, 4); bx(1.01, 0.42, 1.69, 0.48, G); L(0);   // its basket
      bx(1.92, 1.9, 1.98, 2.02, G); for (let i = 0; i < 7; i++) ln(1.95, 1.9, 1.6 + i * 0.12, 0.9 - (i % 2) * 0.08, G, 1); bx(1.55, 0.82, 2.37, 0.9, G, DIM);   // its raincoat on its peg
    } else if (kind === 'winch') {   // a headframe over a pit: its posts and cap, its wheel, its rope down past the ledge to a bucket; a ladder, a small cart
      L(0); bx(0.9, 0, 1.05, 3.2, G, 1, 3); bx(2.1, 0, 2.25, 3.2, G, 1, 3); bx(0.9, 3.1, 2.25, 3.25, G, 1, 3); F(X(1.6), Y(2.85), 0.24 * t, 0, 0, 0.24 * t, G, 1, 4);
      L(3); ln(1.6, 2.6, 1.6, -1.7); bx(1.38, -2.12, 1.82, -1.7, G, 1, 4); bx(1.35, -1.78, 1.85, -1.7, G); ln(1.4, -1.7, 1.6, -1.52); ln(1.6, -1.52, 1.8, -1.7);   // its rope, its bucket (behind
      // its ledge in 2.5D, as in 2D)
      L(0); ln(2.35, 0, 2.6, 2.6, G, 2); ln(2.75, 0, 3.0, 2.6, G, 2); for (let q = 0.12; q < 1; q += 0.16) ln(2.35 + 0.25 * q, 2.6 * q, 2.75 + 0.25 * q, 2.6 * q, G, 1);   // a ladder
      L(rt); bx(0.1, 0.25, 0.75, 0.6, G, 1, 3); disc(X(0.25), Y(0.15), 0.1 * t, K, 1); disc(X(0.6), Y(0.15), 0.1 * t, K, 1);   // a small cart
    }
    this.route = rt;
  };
  const mnFar = () => {   // the mine far off: a tunnel going off into the dark, its frames smaller and smaller, rails running in, lamps glowing deep in it, a lamp on a post;
    // screen-fixed, low, at a quarter (DIM), the lamps lights (they show the frames round them)
    const t = kitT, G = PAL.gray, cx = (lv.l + lv.r) / 2, foot = snap(cam + 0.8 * H + Math.max(0, lv.floor - cam - H) * 0.03), U = (u) => snap(cx + u * t), Vv = (v) => snap(foot - v * t);
    const fb = (u0, v0, u1, v1, c = G, a = DIM) => box(Math.min(U(u0), U(u1)), Math.min(Vv(v0), Vv(v1)), Math.max(U(u0), U(u1)), Math.max(Vv(v0), Vv(v1)), c, a, 0, 10, 0);
    const fl = (u0, v0, u1, v1, a = DIM, wd = 1) => line(U(u0), Vv(v0), U(u1), Vv(v1), G, a, wd);
    const glow = (u, v) => { fb(u - 0.08, v - 0.1, u + 0.08, v + 0.1, PAL.orange, LIT); vlamps.push([U(u), Vv(v), 0.4, 1.4]); };
    { const u = 2.6, w = 5, h = 4.6; for (let i = 0; i < 4; i++) { const f = 1 - i * 0.2, hw = (w / 2) * f, hh = h * f, b = i * 0.15; fb(u - hw, b, u - hw + 0.22 * f, b + hh); fb(u + hw - 0.22 * f, b, u + hw, b + hh); fb(u - hw - 0.1 * f, b + hh, u + hw + 0.1 * f, b + hh + 0.2 * f); }   // the tunnel's frames
      fl(u - w * 0.3, 0, u - w * 0.08, 0.5); fl(u + w * 0.3, 0, u + w * 0.08, 0.5); for (let q = 0.1; q < 0.5; q += 0.14) fl(u - w * (0.3 - q * 0.45), q, u + w * (0.3 - q * 0.45), q);   // rails running in, their sleepers
      glow(u - w * 0.1, h * 0.35); glow(u + w * 0.06, h * 0.25); }
    fb(-4.7, 0, -4.5, 3.6); fb(-4.7, 3.5, -3.8, 3.65); fl(-3.9, 3.6, -3.9, 3.2); fb(-4.02, 2.8, -3.78, 3.2); glow(-3.9, 3.0);   // a lamp on a post
  };
  if (th.mines && lv.kind === 'well') {   // the Mine's things on its ledges (kitThing): the lamps on the wall (lit for good once the hero comes: lv.tended), the ore,
    // a cart, the tools, a winch; bats under some ledges; the mine far off
    const rt0 = this.route;   // (the cinematic fork, the rule book: a lamp small, the ore behind, the props small with their thin parts flat, the bats flat, the mine far
    // off behind, whatever its tones)
    for (const r of lv.rects) {
      const p = !r.gone && seen(r.y0 - 3.6 * kitT, r.y0 + kitT) && kitThing(lv, r);
      if (!p) continue;
      const wl = r.x0 <= lv.l + 1, d = wl ? 1 : -1;
      if (p.kind === 'lamp') { if (CINE) this.route = 4; mnLamp(snap(p.x), snap(p.y), lv.tended.has(r), 1, d, lv.tended.has(r) ? lv.tended.get(r) : null); }
      else if (p.kind === 'ore') { if (CINE) this.route = 3; mnOre(wl ? lv.l : lv.r, r.y0, d, Math.round(r.y0 / kitT)); }
      else { if (CINE) this.route = 4; mnThing(p.kind, wl ? lv.l : lv.r, r.y0, d, r); }
    }
    if (CINE) this.route = 0;
    for (const r of lv.rects) if (!r.gone && seen(r.y1 - kitT, r.y1 + 2 * kitT) && mnBatsAt(r)) mnBats(r);   // bats asleep under some ledges
    if (CINE) this.route = 3;
    mnFar();
    this.route = rt0;
  }
  if (th.fuji && lv.kind === 'well') {   // Mount Fuji's kit (THEMES.ice; the owner's picks, research/variants/fuji-*-1-px.png): each its size on the sheets (owner:
    // "twice as big: their size from the mockup"), and only where nothing laid stands in front of it. Far off, behind the shaft at a quarter (DIM, the owner's depth
    // rule): Fuji itself (A), keeping its place on the screen as the climb goes on, and cranes flying across (A). In the midground (solid, no white, no yellow but a
    // flame's core), on ledges' wall ends by turns of height: a kamakura with a snow rabbit by it (E, B), a snowman (D), a snow monkey in a hot tub (E by a stone
    // lantern, or D under a little roof), persimmons drying on strings off a beam (E), a pine (C, its ropes off, or D in yukitsuri).
    const t = kitT, P = kitP, mod = (k, n) => ((k % n) + n) % n;
    const atDoor = (x0, y0, x1, y1) => lv.bubbles.some((b) => b.x1 + t > x0 && b.x0 - t < x1 && b.y1 > y0 && b.y0 - t < y1);
    const clear = (x0, y0, x1, y1) => !atDoor(x0, y0, x1, y1) && !lv.rects.some((q) => !q.gone && !q.cap && q.x1 > x0 && q.x0 < x1 && q.y1 > y0 && q.y0 < y1);
    const rt0 = this.route, L = (n) => { if (CINE) this.route = n; };   // (the cinematic fork, the rule book: far off behind, the kamakura flat, the props small with
    // their thin parts and steam flat)
    const steady = (r, w) => !(r.gone || r.cap || r.plank || r.move || r.crumble || r.spring || r.key || r.cage || r.slick) && (r.x0 <= lv.l + 1 || r.x1 >= lv.r - 1)
      && r.x1 - r.x0 >= w * t && !lv.folk.some((f) => f.rect === r && (f.kind === 'cage' || f.kind === 'trader'));
    L(3);
    {   // Fuji far off (A): a cone of blue, its flat top and its snow grey down its ridges, two clouds; low on the screen, sinking a little as the climb goes on
      const cx = (lv.l + lv.r) / 2, ht = 5.5 * t, hw = 6.6 * t, foot = snap(cam + 0.8 * H + Math.max(0, lv.floor - cam - H) * 0.03);
      for (let y = 0; y < ht; y += 2 * P) {
        const u = y / ht, w = 0.5 * t + (hw - 0.5 * t) * Math.pow(u, 1.25), yy = foot - ht + y, sn = 0.3 + 0.07 * Math.sin(y / P * 0.9);
        box(snap(cx - w), yy, snap(cx + w), yy + 2 * P, PAL.blue, DIM, 0, 10, 0);
        if (u < sn) box(snap(cx - w * Math.min(1, (sn - u) * 9)), yy, snap(cx + w * Math.min(1, (sn - u) * 9)), yy + 2 * P, PAL.gray, DIM, 0, 10, 0);
      }
      for (const [dx, dy, w] of [[-4.6, -4.4, 2.8], [4.4, -5.0, 2.3]]) box(snap(cx + (dx - w / 2) * t), snap(foot + dy * t), snap(cx + (dx + w / 2) * t), snap(foot + dy * t) + 3 * P, PAL.gray, DIM, 0, 10, 0);
    }
    const csh = CINE ? 0.55 * cam : 0;   // (2.5D: the cranes on a plane of their own, far: 0.45 of the climb)
    for (let k = Math.floor((top - csh) / (18 * t)) - 1; k * 18 * t + csh < bot; k++) {   // a pair of cranes (A) crossing the shaft, slowly, by turns of height either way
      const dir = mod(k, 2) ? 1 : -1, span = lv.r - lv.l + 8 * t, x = lv.l - 4 * t + mod(T * 0.9 * t + k * 7.3 * t, span), y = (k * 18 + 9) * t + csh;
      if (y < top - 2 * t || y > bot) continue;
      for (const [ox, oy] of [[0, 0], [-2.6, 1.3]]) { const fx = dir > 0 ? x + ox * t : lv.r + lv.l - x - ox * t, fr = Math.floor(T * 2.4 + ox) % 2 ? 'craneUp' : 'craneDown';
        const rows = CRITTER[fr + (dir > 0 ? '' : 'L')], x0 = snap(fx - rows[0].length * P / 2), y0 = snap(y + oy * t);
        rows.forEach((row, j) => { for (let i = 0; i < row.length;) { if (row[i] === '.') { i++; continue; } let e = i + 1; while (row[e] === '#') e++; box(x0 + i * P, y0 + j * P, x0 + e * P, y0 + (j + 1) * P, PAL.gray, DIM, 0, 10, 0); i = e; } }); }
    }
    const steam = (x, y, k, s) => { for (let i = 0; i < 3; i++) { const u = (T * 0.25 + i / 3 + k * 0.37) % 1; F(snap(x + Math.sin(T * 1.3 + i * 2 + k) * 0.2 * s * t), snap(y - u * 1.5 * s * t), (0.2 + 0.16 * u) * s * t, 0, 0, (0.2 + 0.16 * u) * s * t, PAL.gray, 0.35 * (1 - u), 1); } };
    const lantern = (x, b, s) => {   // a little stone lantern, its window lit (the Cave's toro, smaller)
      const X = (u) => snap(x + u * s * t), Y = (v) => snap(b - v * s * t);
      box(X(-0.16), Y(0.1), X(0.16), b, PAL.gray, 1, 0, 10, 0); box(X(-0.05), Y(0.45), X(0.05), Y(0.1), PAL.gray, 1, 0, 10, 0);
      box(X(-0.14), Y(0.72), X(0.14), Y(0.45), PAL.gray, 1, 0, 10, 0); box(X(-0.07), Y(0.66), X(0.07), Y(0.52), PAL.orange, 1, 0, 10, 0);
      box(X(-0.24), Y(0.82), X(0.24), Y(0.72), PAL.gray, 1, 0, 10, 0); disc(x, Y(0.86), 0.05 * s * t, PAL.gray, 1);
    };
    for (const r of lv.rects) {
      if (!seen(r.y0 - 6 * t, r.y0) || !steady(r, 2.4)) continue;
      const k = mod(Math.round(r.y0 / t), 6), wl = r.x0 <= lv.l + 1, d = wl ? 1 : -1, wx = wl ? lv.l : lv.r, b = r.y0, X = (u) => snap(wx + d * u * t), w = r.x1 - r.x0;
      const room = (u0, u1, h) => clear(Math.min(X(u0), X(u1)), b - h * t, Math.max(X(u0), X(u1)), b - 1);
      if (k === 0 && w >= 4 * t && room(0, 3.8, 3.4)) {   // a kamakura (E): a dome of snow bricks 3.5 tiles across, its doorway lit by a candle, holly on top
        L(0); const kx = X(1.9), rx = 1.75 * t, ry = 1.6 * t;   // (flat: a way in, and its glow stays behind its candle)
        F(kx, b, rx, 0, 0, ry, PAL.gray, 1, 0);
        for (const v of [0.4, 0.8, 1.2]) { const hw = rx * Math.sqrt(Math.max(0, 1 - (v * t / ry) ** 2)); box(snap(kx - hw), snap(b - v * t), snap(kx + hw), snap(b - v * t) + P, PAL.black, 1, 0, 10, 0);
          for (let j = -4; j <= 4; j++) { const jx = snap(kx + (j + (Math.round(v / 0.4) % 2 ? 0.5 : 0)) * 0.5 * t); if (Math.abs(jx - kx) < hw - 2 * P) box(jx, snap(b - v * t), jx + P, snap(b - (v - 0.4) * t), PAL.black, 1, 0, 10, 0); } }
        F(kx, snap(b - 0.5 * t), 0.9 * t, 0, 0, 0.75 * t, PAL.orange, 0.5, 1);
        box(snap(kx - 0.45 * t), snap(b - 0.85 * t), snap(kx + 0.45 * t), b, PAL.black, 1, 0, 10, 0); disc(kx, snap(b - 0.85 * t), 0.45 * t, PAL.black, 1);
        F(kx, snap(b - 0.5 * t), 0.5 * t, 0, 0, 0.7 * t, PAL.orange, 0.85, 1);
        box(snap(kx) - P, snap(b - 0.3 * t), snap(kx) + 2 * P, b, PAL.gray, 1, 0, 10, 0); disc(snap(kx) + P / 2, snap(b - 0.4 * t), 0.09 * t, PAL.orange, 1); box(snap(kx), snap(b - 0.44 * t), snap(kx) + P, snap(b - 0.38 * t), PAL.yellow, 1, 0, 10, 0);
        for (const e of [-1, 1]) box(Math.min(snap(kx + e * 0.08 * t), snap(kx + e * 0.34 * t)), snap(b - ry - 0.14 * t), Math.max(snap(kx + e * 0.08 * t), snap(kx + e * 0.34 * t)), snap(b - ry + 0.02 * t), PAL.green, 1, 0, 10, 0);
        for (const e of [-1, 1]) box(snap(kx + e * 0.06 * t) - P, snap(b - ry - 0.1 * t) - P, snap(kx + e * 0.06 * t) + 2 * P, snap(b - ry - 0.1 * t) + 2 * P, PAL.orange, 1, 0, 10, 0);
        if (w >= 5.6 * t && room(3.8, 5.3, 2.2)) {   // the snow rabbit (B): an egg of snow, leaf ears, berry eyes
          L(4);
          const ux = X(4.55), uh = 1.4 * t;
          F(ux, snap(b - 0.45 * uh), 0.62 * t, 0, 0, 0.55 * uh, PAL.gray, 1, 0);
          for (const e of [-1, 1]) for (let j = 0; j < 5; j++) box(snap(ux + e * (0.12 + 0.05 * j) * t), snap(b - uh - (0.1 + 0.1 * j) * t), snap(ux + e * (0.12 + 0.05 * j) * t) + 3 * P, snap(b - uh - (0.1 + 0.1 * j) * t) + 3 * P, PAL.green, 1, 0, 10, 0);
          for (const e of [-1, 1]) box(snap(ux + e * 0.22 * t) - P, snap(b - 0.62 * uh), snap(ux + e * 0.22 * t) + 2 * P, snap(b - 0.62 * uh) + 3 * P, PAL.orange, 1, 0, 10, 0);
        }
      } else if (k === 1 && room(0, 2.2, 2.9)) {   // a snowman (D): two snowballs, a purple bucket on his head, a purple scarf, coal eyes
        L(4); const sw = CINE ? cinePoke(g, lv, r, 'snowman', Math.min(X(0.3), X(1.9)), b - 2.8 * t, Math.max(X(0.3), X(1.9)), b) : 0, SH = (v) => (sw ? snap(sw * v * t) : 0);   // (poked: he
        // sways, his bucket the most)
        const sx = X(1.1);
        disc(sx + SH(0.68), snap(b - 0.68 * t), 0.75 * t, PAL.gray, 1); disc(sx + SH(1.72), snap(b - 1.72 * t), 0.5 * t, PAL.gray, 1);
        box(snap(sx - 0.42 * t) + SH(2.6), snap(b - 2.2 * t), snap(sx + 0.42 * t) + SH(2.6), snap(b - 2.06 * t), PAL.purple, 1, 0, 10, 0); box(snap(sx - 0.32 * t) + SH(2.9), snap(b - 2.72 * t), snap(sx + 0.32 * t) + SH(2.9), snap(b - 2.2 * t), PAL.purple, 1, 0, 10, 0);
        for (const e of [-1, 1]) box(snap(sx + e * 0.2 * t) - P + SH(1.8), snap(b - 1.86 * t), snap(sx + e * 0.2 * t) + 2 * P + SH(1.8), snap(b - 1.72 * t), PAL.black, 1, 0, 10, 0);
        box(snap(sx - 0.48 * t) + SH(1.24), snap(b - 1.32 * t), snap(sx + 0.48 * t) + SH(1.24), snap(b - 1.16 * t), PAL.purple, 1, 0, 10, 0); box(snap(sx + 0.08 * t) + SH(1.0), snap(b - 1.16 * t), snap(sx + 0.26 * t) + SH(1.0), snap(b - 0.72 * t), PAL.purple, 1, 0, 10, 0);
      } else if (k === 2 && w >= 3.4 * t && room(0, 3.2, 3.2)) {   // a snow monkey in a hot tub, steam rising
        const roof = ((Math.round(r.y0 / t) * 7) & 1) === 1, tx = X(roof ? 1.5 : 2.1), hy = snap(b - 1.3 * t);
        L(4); if (!roof) lantern(X(0.5), b, 2);
        L(0); steam(tx - 0.6 * t, hy - 0.6 * t, 1, 2); steam(tx + 0.7 * t, hy - 0.4 * t, 2, 2); L(4);
        disc(tx, hy, 0.62 * t, PAL.gray, 1);
        for (const [dx, dy] of [[-0.62, -0.2], [0.62, -0.2], [-0.42, -0.5], [0.42, -0.5], [0, -0.62], [-0.2, -0.6], [0.2, -0.6]]) box(snap(tx + dx * t) - P, snap(hy + dy * t) - P, snap(tx + dx * t) + P, snap(hy + dy * t) + P, PAL.gray, 1, 0, 10, 0);   // its fluffy head
        disc(tx, snap(hy + 0.08 * t), 0.4 * t, PAL.orange, 1);
        for (const e of [-1, 1]) box(snap(tx + e * 0.18 * t) - P, snap(hy), snap(tx + e * 0.18 * t) + 2 * P, snap(hy) + P, PAL.black, 1, 0, 10, 0);   // eyes closed
        box(snap(tx) - P, snap(hy + 0.24 * t), snap(tx) + P, snap(hy + 0.24 * t) + P, PAL.black, 1, 0, 10, 0);
        box(snap(tx - 0.95 * t), snap(b - 0.72 * t), snap(tx + 0.95 * t), snap(b - 0.62 * t), PAL.blue, 1, 0, 10, 0);   // the water
        if (!roof) box(snap(tx - 0.62 * t), snap(b - 0.86 * t), snap(tx + 0.62 * t), snap(b - 0.68 * t), PAL.purple, 1, 0, 10, 0);   // E's towel round its shoulders
        box(snap(tx - 0.95 * t), snap(b - 0.62 * t), snap(tx + 0.95 * t), b, PAL.orange, 1, 0, 10, 0); box(snap(tx - 0.95 * t), snap(b - 0.62 * t), snap(tx + 0.95 * t), snap(b - 0.62 * t) + P, PAL.black, 1, 0, 10, 0);
        for (let x = tx - 0.7 * t; x < tx + 0.8 * t; x += 0.3 * t) box(snap(x), snap(b - 0.55 * t), snap(x) + P, b, PAL.black, 1, 0, 10, 0);   // the tub's staves
        if (roof) {   // D: a little roof over it, snow on it
          for (let i = 0; i <= 14; i++) { const u = i / 14; for (const e of [-1, 1]) { const rx = snap(tx + e * u * 1.2 * t), ry = snap(hy - 1.0 * t + u * 0.7 * t); box(rx, ry, rx + 2 * P, ry + 2 * P, PAL.blue, 1, 0, 10, 0); } }
          box(snap(tx - 0.7 * t), snap(hy - 1.25 * t), snap(tx + 0.7 * t), snap(hy - 0.92 * t), PAL.gray, 1, 0, 10, 0);
        }
      } else if (k === 4 && w >= 3.4 * t && room(0.3, 3.5, 4.3)) {   // persimmons drying (E): strings off a beam on a knee brace, purple ties and tassels
        const by = snap(b - 4.1 * t);
        L(4); box(Math.min(X(0), X(3.3)), by, Math.max(X(0), X(3.3)), by + snap(0.2 * t), PAL.gray, 1, 0, 10, 0); L(0); brace(wx, d, by + snap(0.2 * t), snap(0.8 * t), 2 * P, PAL.gray);   // (the beam
        // and the fruit small; the brace, the strings, the ties and the tassels flat)
        for (const u of [1.0, 1.6, 2.2, 2.8]) {
          const sx = X(u); L(0); box(sx, by + snap(0.2 * t), sx + P, snap(b - 1.4 * t), PAL.gray, 1, 0, 10, 0); box(sx - P, by + snap(0.2 * t), sx + 2 * P, by + snap(0.45 * t), PAL.purple, 1, 0, 10, 0);
          for (let j = 0; j < 4; j++) { const fy = snap(by + (0.7 + 0.5 * j) * t); L(4); disc(sx + P / 2, fy, 0.2 * t, PAL.orange, 1); L(0); box(sx - P, fy - snap(0.24 * t), sx + 2 * P, fy - snap(0.16 * t), PAL.green, 1, 0, 10, 0); }
          for (const e of [-1, 0, 1]) rod(sx, snap(b - 1.4 * t), sx + e * 0.14 * t, snap(b - 1.12 * t), PAL.purple);   // its tassel
        }
      } else if (k === 5 && w >= 3.6 * t && room(0, 4.0, 5.2)) {   // a pine: C (a grey trunk, its ropes off) or D (an orange one in yukitsuri)
        const ropes = ((Math.round(r.y0 / t) * 7) & 1) === 1, cx = X(1.9), Y = (v) => b - v * t, SW = CINE ? cinePoke(g, lv, r, 'pine', Math.min(X(0.6), X(3.2)), b - 4.4 * t, Math.max(X(0.6), X(3.2)), b) : 0;
        const PX = (u, v = 0) => cx + d * u * t + (SW ? snap(SW * v * t) : 0);   // (poked, it sways, its top the most, and sheds snow)
        const trunk = (q) => [PX(0.36 * Math.sin(q * Math.PI * 1.6) - 0.1, 3.8 * q), Y(3.8 * q)];
        L(4); for (let q = 0; q <= 1; q += P / (3.8 * t)) { const [x, y] = trunk(q); disc(x, y, (0.26 - 0.14 * q) * t, ropes ? PAL.orange : PAL.gray, 1); }
        const pads = [[0, 4.0, 0.84], [-1.0, 3.1, 0.72], [1.0, 3.2, 0.76], [0.9, 2.0, 0.72], [-0.84, 2.1, 0.6]];
        for (const [u, v, rx] of pads) { F(PX(u, v), Y(v) - 0.1 * t, rx * t, 0, 0, 0.32 * t, PAL.gray, 1, 0); F(PX(u, v), Y(v) + 0.06 * t, rx * t, 0, 0, 0.26 * t, PAL.green, 1, 9, 0); }
        if (ropes) { const tx = PX(0, 5.1), ty = Y(5.1); box(snap(tx) - P, snap(ty), snap(tx) + 2 * P, snap(Y(4.0)), PAL.orange, 1, 0, 10, 0);
          L(0); for (const [u, v, rx] of pads) line(tx, ty, PX(u + Math.sign(u || 1) * rx * 0.9, v), Y(v), PAL.gray, 1, 1); }   // (its ropes flat, a feature each)
      }
    }
    this.route = rt0;
  }
  if (th.village) for (const r of lv.rects) if (r.plank && r.move && !r.move.wheel && seen(r.y0 - 4 * kitT, r.y0)) {   // a yaen's cable across the shaft at its pulley, behind (DEPTH)
    const cy = snap(r.y0 - snap(YAEN.frame * kitT) - YAEN.wheel * kitT); box(lv.l, cy, lv.r, cy + kitP, PAL.gray, DIM, 0, 10, 0);
  }
  for (const wh of lv.wheels) if (seen(wh.y0, wh.y1)) {   // a mill's wheel, behind (DEPTH): its rim, a paddle between each two boards, its spokes, its hub; water off a flume
    // from the wall onto its going-down side (it turns the wheel), falling in dashes
    const t = kitT, a0 = wh.ph + wh.w * T, dir = wh.w > 0 ? 1 : -1;
    F(wh.cx, wh.cy, wh.rad, 0, 0, wh.rad, th.plank, DIM, 4); F(wh.cx, wh.cy, wh.rad - 0.3 * t, 0, 0, wh.rad - 0.3 * t, th.plank, DIM, 4);
    for (let i = 0; i < 2 * MILL.n; i++) { const a = a0 + (i / (2 * MILL.n)) * TAU, c = Math.cos(a), s2 = Math.sin(a);
      line(wh.cx + c * 0.3 * t, wh.cy + s2 * 0.3 * t, wh.cx + c * wh.rad, wh.cy + s2 * wh.rad, th.plank, DIM, 2);
      if (i % 2) line(wh.cx + c * wh.rad, wh.cy + s2 * wh.rad, wh.cx + c * (wh.rad + 0.55 * t), wh.cy + s2 * (wh.rad + 0.55 * t), th.plank, DIM, 4); }
    disc(wh.cx, wh.cy, 0.45 * t, th.plank, DIM); disc(wh.cx, wh.cy, 0.2 * t, PAL.gray, DIM);
    const fx = wh.cx + dir * 0.6 * wh.rad, wx = dir > 0 ? lv.r : lv.l, fy = wh.cy - wh.rad - 1.3 * t, fall = wh.cy - 0.6 * wh.rad;
    box(snap(Math.min(wx, fx)), snap(fy), snap(Math.max(wx, fx)), snap(fy) + 3 * kitP, th.plank, DIM, 0, 10, 0);   // the flume
    for (let y = fy + 3 * kitP + ((T * 90) % (0.6 * t)); y < fall; y += 0.6 * t) box(snap(fx - kitP), snap(y), snap(fx + kitP), snap(Math.min(fall, y + 0.35 * t)), PAL.blue, DIM, 0, 10, 0);
  }
  if (th.sea) for (const r of lv.rects) if (r.plank && r.move && !r.move.wheel && seen(r.y1, r.y1 + kitT)) {   // a Sea raft's stream across the shaft under it, its ripples going by, behind (DEPTH)
    const sy = snap(r.y1); box(lv.l, sy, lv.r, sy + 6 * kitP, PAL.blue, DIM, 0, 10, 0); for (let x = lv.l + ((T * 30) % (12 * kitP)); x < lv.r; x += 12 * kitP) box(snap(x), sy + kitP, snap(x) + 4 * kitP, sy + 2 * kitP, PAL.gray, DIM, 0, 10, 0);
  }
  if (th.sea && lv.kind === 'well') {   // the Sea's props (the owner's picks, research/variants/sea-*-game.png, 2026-10-20): on ledges, by kitThing, a lighthouse
    // (E), nets drying with glass floats (A), a gull crying out on a mooring post (D), octopus pots wrapped in a net (C), the big-catch flags (E). In the
    // midground: solid, no white (the sheets' white is grey here), no yellow but a lamp's core, no red (orange).
    const t = kitT, P = kitP, px = P / t, PROPS = ['lighthouse', 'net', 'gull', 'octopus', 'flags'], rt0 = this.route, L = (n) => { if (CINE) this.route = n; };   // (the cinematic
    // fork, the rule book: the sea far off behind; the props small, their thin parts flat)
    L(3);
    {   // the sea far off (the owner's picks, the wave sheet's B and the far sheet's F, a level each in turn): screen-fixed, low on the screen and sinking a
      // little as the climb goes on, as Fuji's; at a quarter (DIM), its lanterns lit (LIT)
      const cx = (lv.l + lv.r) / 2, foot = snap(cam + 0.8 * H + Math.max(0, lv.floor - cam - H) * 0.03), U = (u) => snap(cx + u * t), Vv = (v) => snap(foot - v * t);
      const fb = (u0, v0, u1, v1, c, a = DIM, tn = 0) => box(Math.min(U(u0), U(u1)), Math.min(Vv(v0), Vv(v1)), Math.max(U(u0), U(u1)), Math.max(Vv(v0), Vv(v1)), c, a, 0, 10, tn);
      const fe = (u, v, ru, rv, c, a = DIM) => F(U(u), Vv(v), ru * t, 0, 0, rv * t, c, a, 0);
      const tri = (u, v0, hw, h, c) => { const hd = (h * t) / 2; F(U(u), Vv(v0) - hd, hw * t, 0, 0, hd, c, DIM, 6, hw * t, hd, 2 * hw * t); };   // a triangle: a pine's tier, a roof
      const water = () => { for (let i = 0; i < 10; i++) { const v = 0.1 + 0.28 * i, u0 = -7.6 + ((i * 37) % 7) * 0.4, u1 = u0 + 2.2 + ((i * 13) % 5) * 0.6; fb(u0, v, u1, v + px, PAL.aqua); fb(u1 + 0.8, v, u1 + 2.4, v + px, PAL.aqua); } };
      const pine = (u, v, s) => { fb(u - px / 2, v, u + px / 2, v + 0.8 * s, PAL.gray); for (const [dv, rw] of [[0.55, 0.42], [0.8, 0.32], [1.0, 0.2]]) fe(u, v + dv * s, rw * s, 0.1 * s, PAL.green); };
      const isle = (u0, u1, v, h, pines) => { fe((u0 + u1) / 2, v, (u1 - u0) / 2, h, PAL.green); for (const [pu, ps] of pines) pine(pu, v + h * 0.7, ps); };
      const torii = (u, v, s) => { for (const e of [-1, 1]) fb(u + e * 0.55 * s, v, u + e * 0.55 * s + 2 * px, v + 1.4 * s, PAL.blue); fb(u - 0.85 * s, v + 1.4 * s, u + 0.85 * s, v + 1.55 * s, PAL.blue); for (const e of [-1, 1]) fb(u + e * 0.85 * s, v + 1.5 * s, u + e * 0.95 * s, v + 1.62 * s, PAL.blue);
        fb(u - 0.65 * s, v + 1.15 * s, u + 0.65 * s, v + 1.22 * s, PAL.blue); for (let i = 1; i < 5; i++) for (const e of [-1, 1]) fb(u + e * 0.55 * s, v - 0.18 * i, u + e * 0.55 * s + 2 * px, v - 0.18 * i + px, PAL.blue); };   // its reflection
      const boat = (u, v, s, lit) => { fb(u - 0.7 * s, v, u + 0.7 * s, v + 0.18 * s, PAL.blue); fb(u - 0.5 * s, v - 0.08 * s, u + 0.5 * s, v, PAL.blue); fb(u - px, v + 0.18 * s, u, v + 1.0 * s, PAL.blue); fb(u - 0.25 * s, v + 0.18 * s, u + 0.2 * s, v + 0.42 * s, PAL.blue);
        for (const [lu, lv0] of lit) { fb(u + lu * s, v + lv0 * s, u + lu * s + 2 * px, v + lv0 * s + 2 * px, PAL.orange, LIT); for (let i = 1; i < 4; i++) fb(u + lu * s, v - 0.15 * i, u + lu * s + 2 * px, v - 0.15 * i + px, PAL.orange, DIM); } };   // its lanterns and their light on the water
      const stilts = (u0, n, v, lit) => { for (let i = 0; i < n; i++) { const u = u0 + i * 1.5; for (const e of [0.1, 0.6, 1.1]) fb(u + e, v, u + e + px, v + 0.5, PAL.blue); fb(u, v + 0.5, u + 1.2, v + 1.1, PAL.blue); tri(u + 0.6, v + 1.1, 0.75, 0.5, PAL.gray);
        if (lit) for (const e of [0.3, 0.75]) fb(u + e, v + 0.7, u + e + 2 * px, v + 0.7 + 2 * px, PAL.orange, LIT); } };
      water();   // (the water first: the islands, the boats and the rest stand in it)
      if (lv.stage % 2 === 0) { stilts(-7.2, 3, 0.6, true); for (const [u, s] of [[-6.3, 1.1], [-3.4, 1.0]]) pine(u, 2.1, s); boat(3.6, 0.7, 1.4, [[0.6, 0.9]]); }   // stilt houses lit, pines behind them, a boat (B)
      else { isle(-7.8, -3.4, 0.7, 0.6, [[-6.8, 1.0], [-5.0, 0.9]]); isle(3.8, 7.8, 0.7, 0.6, [[5.2, 0.9], [6.8, 1.0]]); torii(0.4, 0.7, 1.4); boat(-2.4, 0.4, 0.6, [[0.3, 0.5]]); boat(3.0, 0.35, 0.8, [[0.4, 0.7]]); }   // a torii in the water between two islands, boats (F)
    }
    for (const r of lv.rects) {
      const p = !r.gone && seen(r.y0 - 5.5 * t, r.y0) && kitThing(lv, r);
      if (!p || !PROPS.includes(p.kind)) continue;
      L(4); let sx = 0;   // (sx: a flag shifted, fluttering)
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, d = wr && !wl ? -1 : 1, wx = d > 0 ? r.x0 : r.x1, fx = d > 0 ? r.x1 : r.x0, b = r.y0;
      const X = (u) => snap(wx + d * u * t) + sx, Q = (u) => snap(fx - d * u * t), Y = (v) => snap(b - v * t);   // tiles out from its wall end, in from its free end, up from its top
      const bx = (u0, v0, u1, v1, c, tn = 0, a = 1) => box(Math.min(X(u0), X(u1)), Y(Math.max(v0, v1)), Math.max(X(u0), X(u1)), Y(Math.min(v0, v1)), c, a, 0, 10, tn);
      const bq = (u0, v0, u1, v1, c, tn = 0, a = 1) => box(Math.min(Q(u0), Q(u1)), Y(Math.max(v0, v1)), Math.max(Q(u0), Q(u1)), Y(Math.min(v0, v1)), c, a, 0, 10, tn);
      const el = (u, v, ru, rv, c, a = 1) => F(X(u), Y(v), ru * t, 0, 0, rv * t, c, a, 0), ln = (u0, v0, u1, v1, c, wp = 1, tn = 0) => line(X(u0), Y(v0), X(u1), Y(v1), c, 1, wp, tn);
      const float = (u, v, c) => { el(u, v, 0.2, 0.2, c); bx(u - 0.08, v + 0.05, u - 0.08 + 2 * px, v + 0.05 + 2 * px, PAL.gray); };   // a glass float, a grey glint (the sheets' white)
      if (p.kind === 'lighthouse') {   // a little lighthouse on its ledge: a grey tower narrowing up, its door, its gallery, its lamp (a light's core yellow, its glow)
        // (the Sea's task: its lamp dark till the hero comes near, then lit for good, flickering on, as the Village's lanterns)
        const on = lv.tended.get(r), lit = on != null && !((T - on) < 0.4 && Math.floor((T - on) * 20) % 3 === 1);
        const cx = 2.3, lamp = () => {   // the gallery, the lamp room
          bx(cx - 0.8, 2.9, cx + 0.8, 3.18, th.block); for (let u = cx - 0.65; u < cx + 0.7; u += 0.26) bx(u, 2.97, u + 2 * px, 3.1, PAL.black);
          if (lit) F(X(cx), Y(3.5), 0.9 * t, 0, 0, 0.8 * t, PAL.orange, 0.45, 1);
          bx(cx - 0.42, 3.18, cx + 0.42, 3.82, th.block); bx(cx - 0.32, 3.24, cx + 0.32, 3.76, PAL.orange, 0, lit ? 1 : DIM); bx(cx - 0.12, 3.34, cx + 0.12, 3.62, PAL.yellow, 0, lit ? 1 : DIM);
          for (const u of [cx - 0.34, cx + 0.32]) bx(u, 3.18, u + 2 * px, 3.82, th.block);
          if (lit) vlamps.push([X(cx), Y(3.5)]);
        }, cone = (w0, h0) => { for (let i = 0, n = 6; i < n; i++) { const q = i / n; bx(cx - w0 * (1 - q), 3.82 + h0 * q, cx + w0 * (1 - q), 3.82 + h0 * (q + 1 / n), th.block); } };
        for (let i = 0, n = 10; i < n; i++) { const v0 = (2.9 * i) / n, ww = 0.9 - 0.28 * (i / n); bx(cx - ww, v0, cx + ww, v0 + 2.9 / n, PAL.gray, 1); } bx(cx - 0.2, 0, cx + 0.2, 0.62, PAL.black); lamp();
        bx(cx - 0.85, 3.82, cx + 0.85, 3.95, th.block); for (const e of [-1, 1]) bx(cx + e * 0.85, 3.9, cx + e * 0.98, 4.02, th.block); cone(0.55, 0.42); el(cx, 4.32, 0.09, 0.09, th.block);   // its roof, a ball on it
      } else if (p.kind === 'net') {   // fishing nets drying, sagging between two poles, round glass floats in them
        const pole = (u, h) => bx(u, 0, u + 0.14, h, PAL.orange, 2), sag = (u0, u1, v, s) => { for (let i = 0; i < 12; i++) { const q0 = i / 12, q1 = (i + 1) / 12; ln(u0 + (u1 - u0) * q0, v - s * 4 * q0 * (1 - q0), u0 + (u1 - u0) * q1, v - s * 4 * q1 * (1 - q1), PAL.orange); } };
        pole(1.3, 2.2); pole(3.6, 2.2); L(0); sag(1.4, 3.65, 2.15, 0.3); for (let i = 0; i < 8; i++) { const q = (i + 0.5) / 8, u = 1.45 + 2.15 * q, top = 2.1 - 0.3 * 4 * q * (1 - q); bx(u - 0.14, top - 0.9 - 0.25 * Math.sin(q * Math.PI), u + 0.14, top, PAL.gray, 4); }   // the net, its mesh
        L(4); float(1.9, 1.6, PAL.blue); float(2.5, 1.15, PAL.green); float(3.15, 1.6, PAL.purple);
      } else if (p.kind === 'gull') {   // a seagull crying out on a mooring post at the ledge's free end, its beak and feet orange, its wing tips black (the sheets' white is grey)
        const ph = 1.3, gu = 0.3, gv = ph + 0.32;   // the post's height; the gull's middle, in from the free end
        bq(0.1, 0, 0.5, ph, PAL.orange, 2);
        if (CINE) { cinePoke(g, lv, r, 'gull', Math.min(Q(0.9), Q(0)), Y(ph + 0.8), Math.max(Q(0.9), Q(0)), b, [Q(gu), Y(gv)]); if (!cinePerched(r, lv.t)) continue; }   // (the cinematic
        // fork: come near, it flies off; back later)
        for (const e of [-0.07, 0.07]) bq(gu + e, ph, gu + e + px, ph + 0.14, PAL.orange);   // its legs
        F(Q(gu), Y(gv), 0.36 * t, 0, 0, 0.2 * t, PAL.gray, 1, 0); F(Q(gu + 0.28), Y(gv - 0.04), 0.14 * t, 0, 0, 0.08 * t, PAL.gray, 1, 0);   // its body, its tail
        F(Q(gu - 0.2), Y(gv + 0.24), 0.15 * t, 0, 0, 0.15 * t, PAL.gray, 1, 0); bq(gu - 0.24, gv + 0.26, gu - 0.24 + px, gv + 0.26 + px, PAL.black);   // its head, an eye
        bq(gu + 0.05, gv - 0.02, gu + 0.4, gv + 0.06, PAL.black);   // its wing's black tip
        bq(gu - 0.34, gv + 0.24, gu - 0.52, gv + 0.24 + px, PAL.orange); bq(gu - 0.34, gv + 0.2, gu - 0.5, gv + 0.2 + px, PAL.orange); L(0); for (const [u0, v0] of [[-0.62, 0.36], [-0.68, 0.24], [-0.62, 0.12]]) bq(gu + u0, gv + v0, gu + u0 - 0.1, gv + v0 + px, PAL.gray);   // its beak open, crying out
      } else if (p.kind === 'octopus') {   // a clay octopus pot (takotsubo) at the wall end wrapped in a net, a little purple octopus peeking out of it
        const pot = (u0, u1, v0, v1) => { bx(u0 + 2 * px, v0, u1 - 2 * px, v1, PAL.orange); bx(u0, v0 + 2 * px, u1, v1 - 2 * px, PAL.orange); for (const f of [0.35, 0.7]) bx(u0, v0 + (v1 - v0) * f, u1, v0 + (v1 - v0) * f + px, PAL.black); };
        const neck = (u0, u1, v0) => { bx(u0, v0, u1, v0 + 0.18, PAL.orange); bx(u0 - 0.06, v0 + 0.18, u1 + 0.06, v0 + 0.26, PAL.orange); };
        const tako = (u, v, s = 1) => { el(u, v, 0.28 * s, 0.24 * s, PAL.purple); for (const e of [-0.1, 0.1]) bx(u + e * s - px, v + 0.02, u + e * s + px, v + 0.02 + 2 * px, PAL.black); for (const e of [-0.2, -0.07, 0.07, 0.2]) bx(u + e * s - px, v - 0.3 * s, u + e * s + px, v - 0.15 * s, PAL.purple); };
        const mouth = (u, v, rr) => { el(u, v, rr + 0.06, rr + 0.06, PAL.orange); el(u, v, rr, rr, PAL.black); };
        pot(0.3, 2.3, 0, 1.4); neck(0.95, 1.65, 1.4); for (let u = 0.45; u < 2.3; u += 0.3) bx(u, 0.05, u + px, 1.35, PAL.gray); for (let v = 0.25; v < 1.4; v += 0.3) bx(0.32, v, 2.28, v + px, PAL.gray); mouth(1.75, 0.55, 0.36); tako(1.75, 0.55, 0.9);   // the net round it
      } else {   // the big-catch flags (tairyo-bata) on a pole, a ball on its top: a fish, dots, a check (the sheets' white grey, their red orange)
        const flag = (v, c, pat) => { const u0 = 0.85, u1 = 2.75, v0 = v, v1 = v + 0.72; bx(u0, v0, u1, v1, c); bx(u1 - 0.12, v0 + 0.3, u1, v0 + 0.42, PAL.black); bx(0.72, v1 - 0.1, u0, v1 - 0.04, PAL.gray); bx(0.72, v0 + 0.04, u0, v0 + 0.1, PAL.gray);   // a flag, a swallowtail, its ties
          if (pat === 'fish') { el(1.8, (v0 + v1) / 2, 0.45, 0.2, PAL.black); bx(2.2, v0 + 0.2, 2.4, v1 - 0.2, PAL.black); bx(1.55, (v0 + v1) / 2 + 0.05, 1.55 + px, (v0 + v1) / 2 + 0.05 + px, c); }
          else if (pat === 'check') bx(u0 + 0.05, v0 + 0.08, u1 - 0.15, v1 - 0.08, PAL.blue, 4);
          else bx(u0 + 0.1, v0 + 0.12, u1 - 0.2, v1 - 0.12, PAL.gray, 1);   // dots
        };
        L(0); bx(0.6, 0, 0.6 + 2 * px, 4.4, PAL.gray); L(4);   // the pole
        const fl = CINE ? cinePoke(g, lv, r, 'flags', Math.min(X(0.6), X(2.8)), Y(4.4), Math.max(X(0.6), X(2.8)), b) : 0;   // (poked, they flutter, the top one the most)
        [[PAL.green, 'fish'], [th.mover, 'dots'], [PAL.blue, 'check']].forEach(([c, pat], i) => { sx = fl ? snap(fl * (3.9 - 0.85 * i) * t) : 0; flag(3.55 - 0.85 * i, c, pat); sx = 0; });
        el(0.62, 4.5, 0.12, 0.12, PAL.gray);   // its top, a ball
      }
    }
    this.route = rt0;
  }
  const skOak = (U, Vv) => {   // the old oak of the tale with Koschei's death in it (the owner's pick, 2026-10-21, research/variants/skazka-oak-lit-game.png C): a huge
    // gnarled dead oak in a swamp on the left of his arena under its moon, reeds and water round its roots, a chest hanging on chains off its long branch (a hare in
    // it), at a quarter (DIM); a hollow with eyes glowing in it, the chest in the moonlight (lights: they show it in the dark). Drawn as for the right, mirrored
    const t = kitT, P = kitP, G = PAL.gray, K = PAL.black, u0 = 5.0;
    const limb = (x0, y0, x1, y1, wd) => line(U(-x0), Vv(y0), U(-x1), Vv(y1), G, DIM, wd);
    const fe = (u, v, ru, rv, c, a = DIM) => F(U(-u), Vv(v), ru * t, 0, 0, rv * t, c, a, 0);
    const bm = (u0_, v0, u1, v1, c, a = DIM) => box(Math.min(U(-u0_), U(-u1)), Math.min(Vv(v0), Vv(v1)), Math.max(U(-u0_), U(-u1)), Math.max(Vv(v0), Vv(v1)), c, a, 0, 10, 0);
    for (const [du, w] of [[-1.6, 3], [-0.9, 4], [0.9, 4], [1.7, 3], [0.2, 3]]) { limb(u0 + du * 0.25, 0.4, u0 + du, 0, w); limb(u0 + du, 0, u0 + du * 1.3, -0.1, 2); }   // its roots clawing out
    for (let i = 0; i < 6; i++) limb(u0 + 0.12 * Math.sin(i * 1.7), i * 0.8, u0 + 0.12 * Math.sin((i + 1) * 1.7), (i + 1) * 0.8, Math.max(5, 11 - i));   // its trunk, crooked, thinning
    for (const [du, dv, l] of [[-0.2, 4.2, -2.6], [0.1, 4.6, 1.6], [-0.1, 4.8, -1.2], [0.15, 4.0, 2.0], [0, 5.2, 0.8]]) {   // its branches clawing out and up, their twigs
      const bu = u0 + du, eu = bu + l, ev = dv + Math.abs(l) * 0.45; limb(bu, dv, eu, ev, 4);
      limb(eu, ev, eu + Math.sign(l) * 0.5, ev + 0.5, 2); limb(eu, ev, eu + Math.sign(l) * 0.2, ev + 0.7, 1); limb(eu, ev, eu + Math.sign(l) * 0.6, ev - 0.1, 1);
    }
    fe(u0, 2.4, 0.32, 0.5, K, 1); for (const e of [-0.1, 0.1]) bm(u0 + e, 2.45, u0 + e + 0.09, 2.42, PAL.orange, LIT); vlamps.push([U(-u0), Vv(2.4), 0.5, 1.6]);   // a hollow, eyes glowing in it (they light the trunk round them)
    for (let i = 0; i < 8; i++) limb(u0 - 3 + i * 0.75, 0.05, u0 - 2.6 + i * 0.75, 0.05, 1); for (const u of [u0 - 2.4, u0 + 2.2]) for (let i = 0; i < 4; i++) limb(u + i * 0.12, 0, u + i * 0.12 + 0.1 * (i - 1.5), 0.9 + 0.2 * (i % 2), 1);   // the swamp's water, reeds
    { const cu = u0 - 2.1, cv = 3.4, bv = 4.2 + (2.0 / 2.6) * 1.17;   // the chest hung on two chains off the long branch: iron-bound, its bars like a cage, a hare in it; the moonlight on it
      vlamps.push([U(-cu), Vv(cv + 0.6), 1.0, 2.6]);
      for (const e of [-0.45, 0.45]) for (let i = 0; i < 6; i++) { const q = i / 6; fe(cu + e * (0.4 + 0.6 * q), bv - q * (bv - cv - 0.7), 0.06, 0.09, G); }
      bm(cu - 0.65, cv + 0.7, cu + 0.65, cv - 0.25, G); bm(cu - 0.55, cv + 0.6, cu + 0.55, cv - 0.15, K, 1);   // its frame, dark inside
      for (const e of [-0.3, 0, 0.3]) bm(cu + e, cv + 0.6, cu + e + P / t, cv - 0.15, G); bm(cu - 0.65, cv + 0.25, cu + 0.65, cv + 0.2, G);   // its bars, its iron band
      fe(cu - 0.05, cv + 0.1, 0.18, 0.13, G); fe(cu + 0.12, cv + 0.25, 0.08, 0.08, G); for (const e of [0.08, 0.16]) bm(cu + e, cv + 0.5, cu + e + P / t, cv + 0.3, G); }   // the hare, its ears
  };
  if (th.skazka && (lv.kind === 'well' || lv.kind === 'boss')) {   // the Dark Forest's props and its far layer (the owner's picks, 2026-10-20, from research/variants/skazka-*-game.png,
    // black and white and crooked; Koschei's arena its far layer only). Props in the midground: grey, no white; colour only for lights (eyes), as the dark's.
    const t = kitT, P = kitP, px = P / t, hero = g.hero, G = PAL.gray, K = PAL.black;
    const rt0 = this.route;   // (the cinematic fork, the rule book: the forest far off behind, all of it, the moon, its eyes, Koschei's oak and chest; the fence small, its
    // skulls' eyes flat)
    if (CINE) this.route = 3;
    {   // the forest far off (F): spruces, a dead tree with eyes in it, the moon, mist; screen-fixed, low on the screen and sinking a little as the climb goes on;
      // at a quarter (DIM), the moon brighter (a light: it shows through the dark, the crooked treetops black against it), the eyes LIT
      const ar = lv.kind === 'boss', cx = (lv.l + lv.r) / 2, foot = snap(ar ? lv.floor : cam + 0.8 * H + Math.max(0, lv.floor - cam - H) * 0.03), U = (u) => snap(cx + u * t), Vv = (v) => snap(foot - v * t);   // (Koschei's arena: on its floor)
      const fb = (u0, v0, u1, v1, c, a = DIM, tn = 0) => box(Math.min(U(u0), U(u1)), Math.min(Vv(v0), Vv(v1)), Math.max(U(u0), U(u1)), Math.max(Vv(v0), Vv(v1)), c, a, 0, 10, tn);
      const fe = (u, v, ru, rv, c, a = DIM) => F(U(u), Vv(v), ru * t, 0, 0, rv * t, c, a, 0);
      const fl = (u0, v0, u1, v1, c, a = DIM, wd = 1) => line(U(u0), Vv(v0), U(u1), Vv(v1), c, a, wd);
      const tri = (u, v0, hw, h, c, a = DIM, sk = 0) => { const hd = (h * t) / 2; F(U(u + sk), Vv(v0) - hd, hw * t, 0, 0, hd, c, a, 6, hw * t, hd, 2 * hw * t); };
      const spruce = (u, v, h, a = DIM) => { fb(u - 0.06, v, u + 0.06, v + 0.5, G, a); for (let i = 0; i < 3; i++) tri(u, v + 0.35 + i * h * 0.27, (0.62 - 0.15 * i) * h * 0.45, h * 0.38, G, a, (i % 2 ? 0.08 : -0.06) * h * 0.2); };   // a spruce, its tiers crooked
      const row = (u0, u1, step, v, hs) => { for (let u = u0, i = 0; u < u1; u += step, i++) spruce(u, v, hs[i % hs.length]); };
      const dead = (u, v, h, s, n = 0) => {   // a dead tree: a crooked trunk, branches clawing out and up, their twigs bent
        let x0 = u, y0 = v; for (let i = 1; i <= 4; i++) { const x1 = u + 0.15 * s * Math.sin(i * 1.7 + n), y1 = v + (h * i) / 4; fl(x0, y0, x1, y1, G, DIM, Math.max(1, 4 - i)); x0 = x1; y0 = y1; }
        for (const [q, du, dv] of [[0.4, -1.1, 0.6], [0.55, 1.0, 0.75], [0.75, -0.7, 0.55], [0.9, 0.6, 0.6]]) { const bu = u + 0.15 * s * Math.sin(q * 4 * 1.7 + n), bv = v + h * q;
          fl(bu, bv, bu + du * s, bv + dv * s, G, DIM, 2); fl(bu + du * s, bv + dv * s, bu + du * s * 1.35, bv + dv * s * 1.1, G, DIM, 1); fl(bu + du * s, bv + dv * s, bu + du * s * 1.1, bv + dv * s * 1.6, G, DIM, 1); } };
      const mu = ar ? -3.8 : 3.8, mv = ar ? (lv.floor - cam - 0.24 * H) / t : 5.0;   // (in the arena high on the left, over the planks)
      if (ar) skOak(U, Vv);   // Koschei's oak, under the moon on the left of his arena
      fe(mu, mv, 1.5, 1.5, G, LIT); vlamps.push([U(mu), Vv(mv), 1.5 * 1.05, 1.5 * 1.6]);   // the moon, a light in the dark
      row(-7.4, -3.0, 1.2, 0.3, [3.0, 3.8, 3.2]); dead(5.8, 0.3, 4.8, 1.0, 6); fe(5.9, 2.8, 0.32, 0.42, K, 1);   // a dead tree, a hollow in it,
      for (const e of [-0.12, 0.12]) fb(5.9 + e, 2.85, 5.9 + e + 2 * px, 2.85 + 2 * px, PAL.orange, LIT); vlamps.push([U(5.9), Vv(2.85), 0.15, 0.45]);   // eyes glowing in it
      row(-1.6, 4.2, 1.15, 0.3, [2.8, 3.6, 3.0, 3.8]);
      for (let i = 0; i < 6; i++) { const v = 0.1 + 0.22 * i, u0 = -7.5 + ((i * 29) % 7) * 0.6; fb(u0, v, u0 + 2.4 + (i % 3) * 0.8, v + px, G); fb(u0 + 4.2, v, u0 + 6.0, v + px, G); }   // mist over the swamp
    }
    for (const r of lv.kind === 'well' ? lv.rects : []) {   // Baba Yaga's fence on a ledge (E): broken stakes, a fallen one across them, a long pole leaning out over the shaft with a skull on its end whose
      // sockets glow the nearer the hero comes, their cores looking at him
      const p = !r.gone && seen(r.y0 - 4 * t, r.y0) && kitThing(lv, r);
      if (!p || p.kind !== 'fence') continue;
      const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, d = wr && !wl ? -1 : 1, wx = d > 0 ? r.x0 : r.x1, b = r.y0;
      if (CINE) this.route = 4;
      const sw = CINE ? cinePoke(g, lv, r, 'fence', Math.min(wx + d * 0.2 * t, wx + d * 3.2 * t), b - 3 * t, Math.max(wx + d * 0.2 * t, wx + d * 3.2 * t), b, [snap(wx + d * 2.8 * t), snap(b - 2.63 * t)]) : 0;
      const SW = (v) => (sw ? snap(sw * v * t) : 0);   // (the cinematic fork: poked, it sways, its pole the most; a raven off its skull, back later)
      const X = (u, v = 0) => snap(wx + d * u * t) + SW(v), Y = (v) => snap(b - v * t);   // tiles out from its wall end, up from its top
      const ln = (u0, v0, u1, v1, c, wp = 1, a = 1) => line(X(u0, v0), Y(v0), X(u1, v1), Y(v1), c, a, wp);
      const near = Math.max(0, Math.min(1, 1 - (Math.hypot(hero.cx - X(2.8), hero.cy - Y(2.35)) - 2.5 * R) / (5 * R)));   // 1 with the hero close to its skull, 0 from 7.5 R off
      const stake = (u, h, lean, wd = 5, broken = false) => {   // a stake from the ledge at u, h tall, leaning (tiles over at its top), sharpened or broken off; returns its top
        const tu = u + lean; ln(u, 0, tu, h, G, wd); ln(u + 0.05, 0.1, tu + 0.05, h - 0.1, K, 1);   // its grain
        if (broken) for (let i = 0; i < 3; i++) ln(tu + (i - 1) * 0.06, h, tu + (i - 1) * 0.09, h + 0.15 + 0.1 * (i % 2), G, 2);   // splinters
        else { ln(tu, h, tu + lean * 0.12, h + 0.35, G, 3); ln(tu + lean * 0.12, h + 0.35, tu + lean * 0.15, h + 0.45, G, 1); }   // its point
        return tu;
      };
      const skull = (u, v) => {   // impaled: its stake's point pokes out of its crown; its sockets glow
        F(X(u, v), Y(v), 0.3 * t, 0, 0, 0.28 * t, G, 1, 0); box(Math.min(X(u - 0.17, v), X(u + 0.17, v)), Y(v - 0.16), Math.max(X(u - 0.17, v), X(u + 0.17, v)), Y(v - 0.34), G, 1, 0, 10, 0);
        for (const e of [-0.12, 0, 0.12]) box(X(u + e, v), Y(v - 0.22), X(u + e, v) + P, Y(v - 0.34), K, 1, 0, 10, 0);
        box(X(u, v) - P, Y(v - 0.08), X(u, v) + P, Y(v - 0.14), K, 1, 0, 10, 0);
        if (CINE) this.route = 0;   // (its eyes flat: the world's one colour)
        for (const e of [-0.12, 0.12]) { const ex = X(u + e, v), ey = Y(v + 0.02); disc(ex, ey, 0.09 * t, near > 0.15 ? PAL.orange : K, 1);
          if (near > 0.15) { const lx = Math.sign(hero.cx - ex) * P, ly = Math.sign(hero.cy - ey) * P; box(snap(ex + lx) - P / 2, snap(ey + ly) - P / 2, snap(ex + lx) + P / 2, snap(ey + ly) + P / 2, PAL.yellow, 1, 0, 10, 0); }
          else box(snap(ex) - P / 2, snap(ey) - P / 2, snap(ex) + P / 2, snap(ey) + P / 2, PAL.orange, DIM, 0, 10, 0); }
        if (CINE) this.route = 4;
      };
      stake(0.4, 1.4, 0.05, 5, true); stake(1.0, 1.8, -0.1); ln(0.2, 0.3, 2.6, 0.9, G, 4); const tu = stake(1.6, 2.6, 1.1, 4); skull(tu + 0.1, 2.35); stake(2.5, 1.3, 0.1, 5, true);
      if (CINE && CINE.on('poke') && cinePerched(r, lv.t)) { this.route = 0; cineSpr(box, CRITTER[d > 0 ? 'crow' : 'crowL'], X(2.8, 2.63), Y(2.63), G); }   // (the cinematic
      // fork: a raven on the skull, seen in its light; off when the hero comes, back later)
      vlamps.push([X(2.6), Y(2.2), 0.6 + 0.8 * near, 2.2 + 1.2 * near]);   // the skull's glow: it lights the dark round it, more as the hero comes
    }
    this.route = rt0;
  }
  if (th.village && lv.kind === 'well') {   // the Village's kit (THEMES.mine; the owner's picks, research/variants/village-*-1-px.png, 2026-10-20: the Japanese
    // countryside in spring): each its size on the sheets (64 of their pixels a tile), only where nothing laid stands in front of it. Behind the shaft at a quarter
    // (DIM): the countryside far off (F), its forest of cedars and bamboo purple, a farmhouse, a torii and terraces orange, keeping its place low on the screen; a
    // bamboo grove up each wall (E, its red berries left out: one ink behind). In the midground (solid, no white, no yellow but a light's core), on ledges' wall
    // ends by turns of height: a sakura in bloom (C), a scarecrow in young rice (F, its coat indigo for F's red: red is danger), a little Inari shrine, its foxes,
    // a stone lantern and a branch of sakura out of the wall (D), koinobori flying off a pole (D). Nothing covers a door.
    const t = kitT, P = kitP, px = P / t, mod = (k, n) => ((k % n) + n) % n;
    const sp = lv.rc && lv.rc.sparse, few = (list, keep) => (sp ? list.filter((q, i) => keep.includes(i)) : list);   // a `sparse` level's: less of it (owner: «E»)
    {   // the countryside far off (F), low on the screen and sinking a little as the climb goes on
      const cx = (lv.l + lv.r) / 2, foot = snap(cam + 0.8 * H + Math.max(0, lv.floor - cam - H) * 0.03), U = (u) => snap(cx + u * t), V = (v) => snap(foot - v * t);
      const fb = (u0, v0, u1, v1, c, tn = 0) => box(U(u0), V(v1), U(u1), V(v0), c, DIM, 0, 10, tn);
      for (const [u0, u1, v] of few([[-2.6, 7.9, 0.3], [-1.8, 7.2, 0.85], [-1.0, 6.4, 1.4], [-0.2, 5.4, 1.95]], [0, 1])) fb(u0, v, u1, v + px, PAL.orange);   // terraces
      for (const [u, h] of few([[-7.55, 6.2], [-7.15, 5.4], [-6.6, 6.6], [-6.2, 4.9]], [])) fb(u, 0, u + px, h, PAL.purple);   // bamboo
      for (const [u, h] of few([[-5.3, 4.6], [-4.3, 3.6], [-3.2, 4.2], [1.4, 3.9], [2.6, 4.8], [5.9, 4.4], [7.0, 3.5]], [1, 4, 6])) {   // cedars: a trunk, three tiers
        fb(u - px / 2, 0, u + px / 2, 0.4 * h, PAL.purple);
        for (const [b0, h0, hw] of [[0.25, 0.4, 0.6], [0.45, 0.35, 0.47], [0.65, 0.35, 0.33]]) { const hd = (h0 * h * t) / 2; F(U(u), V(b0 * h) - hd, hw * t, 0, 0, hd, PAL.purple, DIM, 6, hw * t, hd, 2 * hw * t); }
      }
      fb(-1.6, 2.2, 0.4, 2.8, PAL.orange, 4); for (const u of [-1.25, -0.25]) fb(u, 2.35, u + 0.3, 2.6, PAL.black);   // a farmhouse, its windows dark
      for (const [u0, u1, v0, v1] of [[-2.0, 0.8, 2.8, 3.1], [-1.75, 0.55, 3.1, 3.4], [-1.45, 0.25, 3.4, 3.7]]) fb(u0, v0, u1, v1, PAL.orange);   // its thatch
      for (const u of [3.7, 4.55]) fb(u, 0.9, u + 2 * px, 2.7, PAL.orange);   // a torii: its posts, its beams, their ends turned up
      fb(3.35, 2.7, 4.95, 2.9, PAL.orange); fb(3.55, 2.35, 4.75, 2.45, PAL.orange); fb(3.25, 2.85, 3.4, 3.0, PAL.orange); fb(4.9, 2.85, 5.05, 3.0, PAL.orange);
    }
    for (const side of [-1, 1]) {   // a bamboo grove up each wall (E): two stalks in segments, a node between, sprays of three leaves off the inner one
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), seg = 2.2 * t;
      for (const [d, w, ph] of few([[0.3, 3, 0], [1.15, 2, 0.8]], [0])) {
        const x0 = snap(Math.min(at(d * t), at(d * t + w * P)));
        for (let k = Math.floor((top - ph * t) / seg) - 1; k * seg + ph * t < bot; k++) { const y0 = snap(k * seg + ph * t); box(x0, y0, x0 + w * P, snap(y0 + seg) - P, PAL.green, DIM, 0, 10, 0); }
      }
      for (let k = Math.floor(top / (5 * t)) - 1; k * 5 * t < bot + t; k++) {   // now off toward the shaft, now toward the wall (a sparse level's: half as many, off its one stalk)
        if (sp && mod(k, 2)) continue;
        const y = (k * 5 + (side < 0 ? 1.1 : 3.6)) * t, x = at(sp ? 0.3 * t + 3 * P : 1.15 * t + P), e = mod(sp ? k >> 1 : k, 2) ? -side : side;
        for (const [ang, len] of [[0.45, 0.6], [0.85, 0.65], [1.25, 0.5]]) { const h = 0.5 * len * t, ax = Math.cos(ang) * h * e, ay = Math.sin(ang) * h; F(x + ax, y + ay, ax, ay, (-ay / h) * 0.08 * t, (ax / h) * 0.08 * t, PAL.green, DIM, 0); }
      }
    }
    for (const r of lv.rects) {
      const p = !r.gone && seen(r.y0 - 5.5 * t, r.y0) && kitThing(lv, r);   // which, and where (kitThing)
      if (!p) continue;
      if (CINE) this.route = 4;   // (the cinematic fork: a sakura, a scarecrow, a lantern, a koinobori: small things in depth, whole)
      const wl = r.x0 <= lv.l + 1, d = wl ? 1 : -1, wx = wl ? lv.l : lv.r, b = r.y0, X = (u) => snap(wx + d * u * t), Y = (v) => snap(b - v * t);
      const pk = CINE && { sakura: [0.4, 4.2, 4.6], scarecrow: [0.2, 2.9, 3.8], koinobori: [0.7, 4.4, 5.3] }[p.kind], sw = pk ? cinePoke(g, lv, r, p.kind, Math.min(X(pk[0]), X(pk[1])), Y(pk[2]), Math.max(X(pk[0]), X(pk[1])), b, p.kind === 'scarecrow' ? [X(2.75), Y(2.55)] : null) : 0;
      const SW = (v) => (sw ? snap(sw * v * t) : 0);   // (the cinematic fork: poked, it sways, its top the most; see cinePoke)
      const bx = (u0, v0, u1, v1, c, tn = 0, a = 1) => { const q = SW((v0 + v1) / 2); box(Math.min(X(u0), X(u1)) + q, Y(Math.max(v0, v1)), Math.max(X(u0), X(u1)) + q, Y(Math.min(v0, v1)), c, a, 0, 10, tn); };   // by tiles out from the wall and up from the ledge
      const el = (u, v, ru, rv, c) => { const xu = X(u) + SW(v); if (CINE && CINE.on('vol')) { F(xu + snap(0.14 * ru * t), Y(v) + snap(0.18 * rv * t), ru * t, 0, 0, rv * t, c, 1.45, 0); F(xu - snap(0.05 * ru * t), Y(v) - snap(0.06 * rv * t), 0.93 * ru * t, 0, 0, 0.93 * rv * t, c, 1, 0); F(xu - snap(0.32 * ru * t), Y(v) - snap(0.36 * rv * t), 0.42 * ru * t, 0, 0, 0.36 * rv * t, PAL.white, 0.42, 0); return; } F(xu, Y(v), ru * t, 0, 0, rv * t, c, 1, 0); }, ln = (u0, v0, u1, v1, c, wp = 1, tn = 0) => line(X(u0) + SW(v0), Y(v0), X(u1) + SW(v1), Y(v1), c, 1, wp, tn);   // (the cinematic fork: in volume, swaying)
      if (p.kind === 'sakura') {   // a sakura in full bloom (C): its gnarled trunk grey (C's dark grey), its branches, clouds of blossom, petals falling
        const bark = 1.5;   // a grey half the way from the black: C's trunk was dark
        bx(0.95, 0, 1.55, 0.22, PAL.gray, 0, bark); bx(1.05, 0.22, 1.45, 1.1, PAL.gray, 0, bark); bx(1.12, 1.1, 1.5, 1.75, PAL.gray, 0, bark); bx(1.22, 1.75, 1.55, 2.25, PAL.gray, 0, bark); bx(1.2, 0.35, 1.2 + px, 1.5, PAL.black);
        if (CINE && CINE.on('vol')) for (const [u0, v0, u1, v1] of [[1.05, 0.22, 1.45, 1.1], [1.12, 1.1, 1.5, 1.75], [1.22, 1.75, 1.55, 2.25]]) { bx(u0, v0, u0 + 2 * px, v1, PAL.gray, 0, 1); bx(u1 - 2 * px, v0, u1, v1, PAL.black, 0, 1.15); }   // (the cinematic fork: round, lit and dark)
        for (const [u0, v0, u1, v1] of [[1.35, 2.15, 0.75, 2.7], [1.45, 2.05, 2.55, 2.4], [1.4, 2.2, 1.65, 3.6], [1.5, 2.2, 3.1, 3.05]]) line(X(u0) + SW(v0), Y(v0), X(u1) + SW(v1), Y(v1), PAL.gray, bark, 2);
        for (const [u, v, ru, rv] of [[1.0, 4.05, 0.62, 0.42], [1.75, 4.3, 0.7, 0.45], [2.4, 4.05, 0.55, 0.38], [1.6, 3.82, 0.55, 0.32], [3.0, 3.3, 0.5, 0.38], [3.65, 3.38, 0.5, 0.36],
          [3.95, 3.18, 0.35, 0.25], [0.72, 2.62, 0.45, 0.33], [1.25, 2.72, 0.45, 0.32], [2.75, 2.02, 0.4, 0.3], [3.25, 2.07, 0.4, 0.3]]) el(u, v, ru, rv, PAL.purple);   // purple: the nearest the inks have to pink
        for (const [u, v] of [[1.3, 4.2], [2.1, 4.05], [3.35, 3.35], [0.85, 2.65], [3.0, 2.05], [1.7, 3.9]]) bx(u, v, u + 2 * px, v + px, PAL.gray);   // light specks in it
        for (let i = 0; i < 4; i++) { const q = (T * 0.22 + i / 4) % 1, u = [2.2, 3.5, 0.9, 2.9][i] + 0.25 * Math.sin(T * 1.1 + i * 2), v = 1.9 * (1 - q); bx(u, v, u + px, v + px, PAL.purple); }   // a petal drifting down
      } else if (p.kind === 'scarecrow') {   // a scarecrow (kakashi, F) in young rice: its pole straw-wrapped, trousers and coat indigo, straw hands, a cloth face, a straw hat
        bx(1.44, 0, 1.67, 1.15, th.block, 2);
        bx(1.12, 1.1, 1.98, 1.62, PAL.blue); bx(1.54, 1.1, 1.54 + px, 1.45, PAL.black);
        bx(0.7, 1.62, 2.34, 2.73, PAL.blue); bx(1.54, 1.65, 1.54 + px, 2.6, PAL.black); for (const v of [2.0, 2.3]) bx(1.72, v, 1.72 + px, v + px, PAL.black);
        for (const [u0, u1] of [[0.42, 0.7], [2.34, 2.62]]) bx(u0, 2.12, u1, 2.5, PAL.blue);
        for (const [u0, u1] of [[0.16, 0.42], [2.62, 2.88]]) bx(u0, 2.08, u1, 2.54, th.block, 3);
        bx(1.07, 2.73, 2.03, 3.02, PAL.gray); for (const u of [1.32, 1.74]) bx(u, 2.86, u + px, 2.86 + 2 * px, PAL.black); bx(1.42, 2.8, 1.66, 2.8 + px, PAL.black);   // (F's face half red)
        bx(0.47, 3.0, 2.66, 3.2, th.block); bx(1.0, 3.2, 2.1, 3.62, th.block, 1); bx(1.2, 3.62, 1.9, 3.72, th.block);
        for (const [u, h, l] of [[0.45, 0.7, -0.08], [0.62, 0.95, 0.05], [0.88, 0.6, 0.1], [1.12, 0.8, -0.05], [2.05, 0.75, 0.06], [2.75, 0.9, -0.06], [2.98, 0.65, 0.08], [3.25, 0.8, 0.03]]) ln(u, 0, u + l, h, PAL.green);
        if (CINE && CINE.on('poke') && cinePerched(r, lv.t)) cineSpr(box, CRITTER[d > 0 ? 'crow' : 'crowL'], X(2.75) + SW(2.55), Y(2.55), th.wall);   // (the cinematic fork: a crow on its hand, off when the hero comes)
        ln(2.3, 0, 2.3, 0.85, PAL.green); bx(2.18, 0.85, 2.42, 1.09, PAL.purple); bx(2.29, 0.95, 2.29 + px, 0.95 + px, PAL.black);   // a flower (F's yellow: yellow is for what you take)
      } else if (p.kind === 'lantern') {   // a little Inari shrine (D): a stone lantern, a fox either side on its plinth, the shrine, a branch of sakura out of the wall
        // (the task: its lantern dark till the hero comes near, then lit for good, flickering on, a ring of light going out from it, its glow as the neon's;
        // its light red, Inari's vermilion: orange was lost on the Village's orange earth, owner: «зажигай святилище красным светом, иначе плохой контраст»)
        const on = lv.tended.get(r), lit = on != null && !((T - on) < 0.4 && Math.floor((T - on) * 20) % 3 === 1), lx = X(0.63), ly = Y(1.3);
        if (lit) { F(lx, ly, 1.6 * t, 0, 0, 1.3 * t, PAL.red, 1.3, 1); F(lx, ly, 0.55 * t, 0, 0, 0.5 * t, PAL.red, 2.4, 1); vlamps.push([lx, ly]); }   // its glow under it: a wide halo, a solid tone round it
        bx(0.3, 0, 0.96, 0.12, PAL.gray); bx(0.55, 0.12, 0.72, 1.05, PAL.gray); bx(0.38, 1.05, 0.88, 1.6, PAL.gray);
        bx(0.5, 1.15, 0.76, 1.45, PAL.red, 0, lit ? 1 : DIM);   // its window
        if (on != null && T - on < 0.7) { const q = (T - on) / 0.7; F(lx, ly, (0.3 + 1.7 * q) * t, 0, 0, (0.3 + 1.7 * q) * t, PAL.red, 1 - q, 4); }
        bx(0.25, 1.6, 1.01, 1.74, PAL.gray); bx(0.56, 1.74, 0.71, 1.94, PAL.gray);
        if (CINE) this.route = 0;   // (the cinematic fork: the altar flat, its foxes too)
        for (const [c, f] of [[1.4, 1], [3.45, -1]]) {   // a fox, facing the shrine: grey stone, its tail up behind it, an orange bib (D's collar red)
          bx(c - 0.4, 0, c + 0.4, 0.26, PAL.gray); bx(c - 0.4, 0.26, c + 0.4, 0.26 + px, PAL.black);
          bx(c - 0.24, 0.3, c + 0.24, 0.86, PAL.gray); bx(c - f * 0.24, 0.3, c - f * 0.38, 0.78, PAL.gray); bx(c - 0.17, 0.6, c + 0.17, 0.76, PAL.orange);
          bx(c - 0.19, 0.86, c + 0.19, 1.18, PAL.gray); bx(c + f * 0.19, 0.9, c + f * 0.31, 1.04, PAL.gray); bx(c + f * 0.09, 1.04, c + f * 0.09 + px, 1.04 + px, PAL.black);
          for (const e of [-1, 1]) bx(c + e * 0.13 - 0.06, 1.18, c + e * 0.13 + 0.06, 1.36, PAL.gray);
        }
        bx(1.75, 0, 3.1, 0.16, PAL.gray, 2); bx(1.85, 0.16, 3.0, 0.32, PAL.gray, 2);   // the shrine (hokora): stone steps, its doors with orange slats, its frame, its roof, the eaves turned up
        bx(1.98, 0.42, 2.86, 1.76, PAL.gray); for (const u of [2.2, 2.55]) bx(u, 0.5, u + 0.1, 1.66, th.block); bx(2.42, 0.45, 2.42 + px, 1.7, PAL.black);
        for (const u of [1.85, 2.86]) bx(u, 0.32, u + 0.13, 1.95, th.block, 4); bx(1.85, 1.76, 2.99, 1.95, th.block, 4);
        bx(1.3, 1.95, 3.55, 2.2, PAL.gray, 2); bx(1.12, 2.08, 1.35, 2.34, PAL.gray); bx(3.5, 2.08, 3.73, 2.34, PAL.gray); bx(1.55, 2.2, 3.3, 2.5, PAL.gray);
        bx(2.05, 2.5, 2.8, 2.78, PAL.gray, 2); bx(2.35, 2.26, 2.5, 2.42, th.block); bx(2.37, 2.78, 2.48, 3.0, PAL.gray); el(2.42, 3.08, 0.09, 0.09, PAL.gray); bx(2.4, 3.15, 2.45, 3.4, PAL.gray);
        if (CINE) this.route = 4;
        ln(0, 2.3, 1.2, 2.95, th.block, 3, 4); ln(1.2, 2.95, 2.05, 3.42, th.block, 2, 4); ln(0.65, 2.62, 0.55, 3.3, th.block, 2, 4);   // the branch, its blossoms
        for (const [u, v] of [[0.3, 3.9], [1.0, 4.0], [1.75, 3.88], [0.48, 3.35], [1.3, 3.32], [2.05, 3.45]]) { bx(u - 0.13, v - 0.04, u + 0.13, v + 0.04, PAL.purple); bx(u - 0.04, v - 0.13, u + 0.04, v + 0.13, PAL.purple); }
      } else if (p.kind === 'koinobori') {   // koinobori (D): a stone foot, the pole, a wheel on its top (D's gold: orange), three carps on arms off it waving in the wind
        bx(0.74, 0, 1.74, 0.55, PAL.gray); for (const v of [0.16, 0.3]) bx(0.92, v, 1.56, v + px, PAL.black);
        bx(1.15, 0.55, 1.34, 4.48, PAL.gray);
        el(1.25, 4.85, 0.34, 0.34, th.block); for (const [u0, v0, u1, v1] of [[1.25, 4.55, 1.25, 5.15], [1.03, 4.66, 1.47, 5.04], [1.03, 5.04, 1.47, 4.66]]) ln(u0, v0, u1, v1, PAL.black); el(1.25, 4.85, 0.08, 0.08, PAL.gray);
        for (const [i, v, c, tn] of [[0, 3.95, PAL.gray, 5], [1, 2.95, th.block, 1], [2, 2.0, PAL.blue, 1]]) {   // black (its grey through the black), orange, blue; scales dotted
          const wv = (s) => Math.round(Math.sin(T * 3.2 - s * 1.1 + i * 1.7) * 0.8 * s) * px;   // the wind down its body, more toward the tail
          bx(1.34, v - 0.04, 1.62, v + 0.04, PAL.gray);
          for (const [s, u0, u1, hh] of [[0, 1.62, 2.22, 0.45], [1, 2.22, 3.1, 0.38], [2, 3.1, 3.8, 0.28]]) bx(u0, v - hh + wv(s), u1, v + hh + wv(s), c, tn);
          for (const e of [-1, 1]) bx(3.8, v + e * 0.08 + wv(3), 4.3, v + e * 0.32 + wv(3), c, tn);   // its tail, forked
          bx(1.62, v - 0.45, 1.7, v + 0.45, PAL.gray); el(1.95, v + 0.08, 0.2, 0.2, PAL.gray); el(1.97, v + 0.08, 0.09, 0.09, PAL.black);   // its mouth's hoop, its eye
        }
      }
    }
    if (CINE) this.route = 1;
  }
  if (th.panels && lv.kind === 'well') {   // the Tower Blocks' kit (THEMES.blocks; see the parts catalog): a riser pipe up each wall on a bracket every
    // 4 tiles, satellite dishes on the walls, an entrance (a blue door, its canopy and lamp, a bench) at the wall end of some wide ledges.
    const t = kitT, P = kitP, mod = (k, n) => ((k % n) + n) % n;
    for (const side of [-1, 1]) {
      const at = (d) => (side < 0 ? lv.l + d : lv.r - d), span = (d0, d1) => [Math.min(at(d0), at(d1)), Math.max(at(d0), at(d1))];
      const [p0, p1] = span(0.2 * t, 0.42 * t);
      box(p0, top, p1, bot, PAL.gray, DIM, 0, 10, 0);   // the riser, behind (DEPTH), its brackets
      for (let k = Math.floor(top / (4 * t)) - 1; k * 4 * t < bot; k++) { const [b0, b1] = span(0, 0.5 * t); box(b0, k * 4 * t, b1, k * 4 * t + 0.12 * t, PAL.gray, DIM, 0, 10, 0); }
      for (let k = Math.floor(top / (14 * t)) - 1; k * 14 * t < bot; k++) {   // a satellite dish on its arm
        const y = k * 14 * t + (side < 0 ? 5 : 11) * t, cx = at(0.95 * t);
        if (y < top - t || y > bot + t) continue;
        box(Math.min(cx, at(0.3 * t)), y + 0.28 * t, Math.max(cx, at(0.3 * t)), y + 0.28 * t + P, PAL.gray, DIM, 0, 10, 0);
        F(cx, y, 0.42 * t, 0, 0, 0.32 * t, PAL.gray, DIM, 0); F(cx - side * 0.06 * t, y, 0.3 * t, 0, 0, 0.22 * t, PAL.black, 1, 0);   // behind (DEPTH): its face, its hollow
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
        box(x0, y, x1, y + 0.15 * t, PAL.black, 1, 0, 10, 0); box(x0, y - 0.6 * t, x1, y - 0.6 * t + P, PAL.gray, DIM, 0, 10, 0);   // the landing, its rail, behind (DEPTH)
        box(side < 0 ? x1 - P : x0, y - 0.6 * t, side < 0 ? x1 : x0 + P, y, PAL.gray, DIM, 0, 10, 0);
        for (let i = 0; i <= 10; i++) { const u = i / 10, x = snap(at((0.2 + 1.2 * u) * t)), yy = snap(y - 6 * t * u); box(x - P / 2, yy - P / 2, x + P / 2, yy + P / 2, PAL.gray, DIM, 0, 10, 0); }   // the ladder to the next
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
      for (const d of [0.55, 1.7]) { const x = snap(at(d * t)); box(x, top, x + P, bot, PAL.gray, DIM, 0, 10, 0); }   // the mullions and transoms, behind (DEPTH)
      for (let k = Math.floor(top / (3 * t)) - 1; k * 3 * t < bot; k++) box(Math.min(at(0), at(1.7 * t)), k * 3 * t, Math.max(at(0), at(1.7 * t)), k * 3 * t + P, PAL.gray, DIM, 0, 10, 0);
      for (let k = Math.floor(top / (20 * t)) - 1; k * 20 * t < bot; k++) if (Math.floor(T * 1.5 + (side < 0 ? 0 : 0.5)) % 2) disc(at(0.3 * t), k * 20 * t + (side < 0 ? 6 : 16) * t, 0.12 * t, PAL.white, LIT);   // the lamp, a light
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
  // The Village's ledges (the Mine's world; the owner's picks, research/variants/village-*-1-px.png, 2026-10-20: the Japanese countryside in spring). A block
  // is a terrace's earth (F): its white edge over a fringe of grass, sparse dots in it, a ragged underside, on a free end its edge curled over, blades of grass
  // and a flower (F's white and yellow: purple); F's long green strands hang only off moss (see the moss below: green is the moss you hold). A plank is a
  // footbridge (C): boards on a bracket at the wall, a rail of dried bamboo on two posts lashed at their tops (C's was green, the moss's colour), a charm on a
  // string off its free end (C's white and yellow: grey and orange). A moving plank is a yaen (C): a blue cable box, a railed basket under its floor, its frame
  // up to a pulley on the cable across the shaft (the cable behind, see YAEN). A crumbling block is a rope bridge (the owner's C): slats the block's own height (so
  // nothing solid is out of sight) wide apart on two ropes, each shaking its own way as it gives, at a wall a peg and the rope down off it, at a free end
  // (one in three) a rope hanging with a weight on it. False for what keeps the common look (ice, springs, magnets, bouncy planks, stairs).
  const villageRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hgt = r.y1 - r.y0;
    const hang = (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663)) >>> 0) % 3 === 0;   // a charm or a weight off its free end on one ledge in three (owner: «очень много мелких висячих деталей. Они могут быть, но не на каждой платформе»)
    if (r.crumble) {   // a rope bridge (the owner's pick C, 2026-10-21, of six in wood: grey looked strange in a village): narrow slats wide apart, each shaking
      // its own way as it gives, two grey ropes through them
      const u = r.crumbling ? r.t / CRUMBLE.time : 0, a = 1 - 0.5 * u * u, n = Math.max(1, Math.round((r.x1 - r.x0) / (0.55 * t))), pw = (r.x1 - r.x0) / n;
      for (let i = 0; i < n; i++) {
        const ox = u ? snap(Math.sin(T * 70 + i * 2.3) * 1.8 * u) : 0, x0 = snap(r.x0 + i * pw) + ox, x1 = snap(r.x0 + (i + 1) * pw) - (i < n - 1 ? 2 * P : 0) + ox;
        box(x0, r.y0, x1, r.y1, PAL.orange, a, 0, 10, 0); box(x0, r.y1 - P, x1, r.y1, PAL.orange, a, 0, 10, 4);   // a slat, its underside in shade
        box(x0, r.y0, x1, r.y0 + 2.5, th.lip, a, 1.25);
      }
      for (const v of [0.3, 0.75]) { const y = snap(r.y0 + v * hgt); box(r.x0, y, r.x1, y + P, PAL.gray, a, 0, 10, 0); }
      for (const [on, wx, d, ex] of [[wl, lv.l, 1, r.x0], [wr, lv.r, -1, r.x1]]) {
        if (on) {   // a peg in the wall over it, the rope down off it to its first plank
          const ky = snap(r.y0 - 1.0 * t), kx = snap(wx + d * 0.17 * t);
          box(snap(Math.min(wx, wx + d * 0.32 * t)), ky, snap(Math.max(wx, wx + d * 0.32 * t)), ky + snap(0.28 * t), PAL.gray, a, 0, 10, 0); box(kx, ky + P, kx + P, ky + 2 * P, PAL.black, a, 0, 10, 0);
          line(wx + d * 0.3 * t, ky + 0.22 * t, wx + d * 0.85 * t, r.y0 + 2 * P, PAL.gray, a);
        } else if (hang) {
          const hx = snap(ex + d * 0.22 * t), wy = snap(r.y1 + 0.75 * t);
          if (wl || wr) { box(hx, r.y1, hx + P, wy, PAL.gray, a, 0, 10, 0); box(hx - 2 * P, wy, hx + 3 * P, wy + 4 * P, PAL.gray, a, 0, 10, 0); box(hx, wy + P, hx + P, wy + 2 * P, PAL.black, a, 0, 10, 0); }   // its rope, a weight on it
          else box(hx, r.y1, hx + P, snap(r.y1 + 0.3 * t), PAL.gray, a, 0, 10, 0);   // a frayed end of rope
        }
      }
      return true;
    }
    if (r.move && r.move.seesaw) {   // a seesaw's seat (SEESAW): a board, its dark underside, on its beam's end
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); box(r.x0, r.y1 - P, r.x1, r.y1, th.plank, 1, 0, 10, 4);
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.move && r.move.wheel) {   // a mill's board (MILL): planks, their dark underside, its hanger up to the rim
      const cx = snap((r.x0 + r.x1) / 2);
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); box(r.x0, r.y1 - P, r.x1, r.y1, th.plank, 1, 0, 10, 4);
      box(cx - P, snap(r.y0 - r.move.wheel.hang), cx + P, r.y0, PAL.gray, 1, 0, 10, 0); disc(cx, r.y0 - r.move.wheel.hang, 0.12 * t, PAL.gray, 1);
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.mortar) {   // a mortar for mochi (MOCHI): a wooden tub, two black hoops round it, the dark of its bowl at its mouth, its rim an edge to stand on
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 1); box(r.x0, r.y1 - P, r.x1, r.y1, th.plank, 1, 0, 10, 4);
      for (const v of [0.38, 0.78]) box(r.x0, snap(r.y0 + v * hgt), r.x1, snap(r.y0 + v * hgt) + P, PAL.black, 1, 0, 10, 0);
      box(snap(r.x0 + 0.3 * t), r.y0 + 2 * P, snap(r.x1 - 0.3 * t), r.y0 + 4 * P, PAL.black, 1, 0, 10, 0);
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.beam) {   // a low beam (MOCHI): a squared timber, its grain, a black peg near each end, its underside dark: only a flat hero goes under it
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); box(r.x0, snap(r.y0 + 0.5 * hgt), r.x1, snap(r.y0 + 0.5 * hgt) + P, th.plank, 1, 0, 10, 4); box(r.x0, r.y1 - P, r.x1, r.y1, PAL.black, 1, 0, 10, 0);
      for (const x of [r.x0 + 0.35 * t, r.x1 - 0.35 * t]) box(snap(x), snap(r.y0 + 0.25 * hgt), snap(x) + P, snap(r.y0 + 0.25 * hgt) + P, PAL.black, 1, 0, 10, 0);
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.plank && r.move) {
      const yb = snap(r.y0 + 0.85 * t), pt = r.y0 - snap(YAEN.frame * t), cx = snap((r.x0 + r.x1) / 2), py = snap(pt - YAEN.wheel * t);
      box(r.x0, r.y0, r.x1, yb, th.mover, 1, 0, 10, 0);   // the basket under its floor, black between its rails, a post in its middle, its bottom's edge
      for (const [v0, v1] of [[0.22, 0.38], [0.5, 0.66]]) box(r.x0 + 2 * P, snap(r.y0 + v0 * t), r.x1 - 2 * P, snap(r.y0 + v1 * t), PAL.black, 1, 0, 10, 0);
      box(cx - P, r.y0, cx + P, yb, th.mover, 1, 0, 10, 0); box(r.x0, yb - P, r.x1, yb, th.mover, 1, 0, 10, 4);
      for (const x of [r.x0, r.x1 - 2 * P]) box(x, pt, x + 2 * P, r.y0, th.mover, 1, 0, 10, 0);   // the frame's posts, its top bar, the hanger up to the pulley on the cable
      box(r.x0, pt, r.x1, pt + 2 * P, th.mover, 1, 0, 10, 0); box(cx - snap(0.14 * t), py, cx + snap(0.14 * t), pt, th.mover, 1, 0, 10, 0);
      disc(cx, py, 0.26 * t, th.mover, 1); disc(cx, py, 0.1 * t, PAL.black, 1);
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.plank) {
      if (r.bouncy) return false;
      for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) {   // a bracket under it at the wall, chequered (C's), its nail
        box(snap(Math.min(wx, wx + d * 0.45 * t)), r.y0, snap(Math.max(wx, wx + d * 0.45 * t)), snap(r.y1 + 0.7 * t), th.plank, 1, 0, 10, 4);
        box(snap(wx + d * 0.22 * t), snap(r.y1 + 0.25 * t), snap(wx + d * 0.22 * t) + P, snap(r.y1 + 0.25 * t) + P, PAL.gray, 1, 0, 10, 0);
      }
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); box(r.x0, snap(r.y0 + 0.17 * t), r.x1, snap(r.y0 + 0.17 * t) + P, th.plank, 1, 0, 10, 4); box(r.x0, r.y1 - P, r.x1, r.y1, th.plank, 1, 0, 10, 4);   // its boards, a row of nails, a rough underside
      const pw = snap(0.2 * t), ph = snap(1.15 * t), ry = snap(r.y0 - 0.7 * t), ps = [snap(wl ? r.x0 + 0.5 * t : r.x0 + 0.05 * t), snap(wr ? r.x1 - 0.5 * t : r.x1 - 0.05 * t) - pw];
      if (ps[1] - ps[0] > 1.2 * t) {   // its rail of dried bamboo on two posts lashed at their tops, their nodes black
        for (const x of ps) {
          box(x, r.y0 - ph, x + pw, r.y0, th.plank, 1, 0, 10, 0); box(x - P, r.y0 - ph, x + pw + P, r.y0 - ph + snap(0.24 * t), th.plank, 1, 0, 10, 4);
          for (const v of [0.38, 0.76]) box(x, snap(r.y0 - v * t), x + pw, snap(r.y0 - v * t) + P, PAL.black, 1, 0, 10, 0);
        }
        box(ps[0] + pw, ry - P, ps[1], ry + P, th.plank, 1, 0, 10, 0);
        for (let x = ps[0] + 0.9 * t; x < ps[1] - 0.3 * t; x += 0.9 * t) box(snap(x), ry - P, snap(x) + P, ry + P, PAL.black, 1, 0, 10, 0);
      }
      if (hang && wl !== wr && r.x1 - r.x0 >= 3 * t) {   // a charm on a string off its free end: an orange bead, a grey paper omamori written on in purple
        const cx = snap(wl ? r.x1 - 0.18 * t : r.x0 + 0.18 * t), by = snap(r.y1 + 0.55 * t), c0 = snap(cx - 0.13 * t), c1 = snap(cx + 0.13 * t) + P, cy0 = by + 3 * P, cy1 = snap(by + 0.62 * t);
        box(cx, r.y1, cx + P, by, PAL.gray, 1, 0, 10, 0); box(cx - P, by, cx + 2 * P, by + 2 * P, PAL.orange, 1, 0, 10, 0);
        box(c0, cy0, c1, cy1, PAL.gray, 1, 0, 10, 0); for (const k of [2, 5]) box(c0 + P, cy0 + k * P, c1 - P, cy0 + (k + 1) * P, PAL.purple, 1, 0, 10, 0);
      }
      box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.move || r.spring || r.magnet || r.bouncy || r.stair) return false;
    const g0 = snap(r.y0 + 2.5), g1 = g0 + 2 * P;
    box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0, 10, 1);   // the earth, sparse dots in it, a fringe of grass under its edge (ragged), its underside ragged
    const fringe = !(lv.rc && lv.rc.sparse) ? [[r.x0, r.x1]] : [...(wl ? [] : [[r.x0, Math.min(r.x1, r.x0 + 1.5 * t)]]), ...(wr ? [] : [[Math.max(r.x0, r.x1 - 1.5 * t), r.x1]])];   // (a `sparse` level's: by a free end only)
    for (const [x0, x1] of fringe) { box(x0, g0, x1, g1, PAL.green, 1, 0, 10, 0); box(x0, g1, x1, g1 + P, PAL.green, 1, 0, 10, 4); }
    box(r.x0, r.y1 - P, r.x1, r.y1, th.block, 1, 0, 10, 4);
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25);
    if (r.x1 - r.x0 >= 2 * t) for (const [on, ex, d] of [[wl, r.x0, 1], [wr, r.x1, -1]]) if (!on) {   // a free end: its edge curled over it, blades of grass, a flower
      box(snap(Math.min(ex, ex + d * P)), r.y0, snap(Math.max(ex, ex + d * P)), r.y0 + 3 * P, th.lip, 1, 0, 10, 0);
      for (const [u, h] of [[0.18, 2], [0.42, 3]]) { const x = snap(ex + d * u * t); box(x, r.y0 - h * P, x + P, r.y0, PAL.green, 1, 0, 10, 0); }
      const fx = snap(ex + d * 0.62 * t); box(fx, r.y0 - 3 * P, fx + P, r.y0, PAL.green, 1, 0, 10, 0); box(fx - P, r.y0 - 5 * P, fx + 2 * P, r.y0 - 3 * P, PAL.purple, 1, 0, 10, 0);
    }
    return true;
  };
  // The Sea's ledges (the owner's picks, research/variants/sea-*-game.png, 2026-10-20): a block is sea-worn rock in layers, barnacles on it (slab C); a plank
  // a jetty on a brace, an unlit lantern hung under its free end (plank B); a moving plank a raft of three logs riding a stream, a lantern on a pole and a basket
  // of fish on it (boat F; the stream behind, see the back layer); a crumbling block a raft of driftwood, rope between its logs, lashed to the wall, a starfish
  // under it (raft C). The sheets' red and yellow are orange here (red is danger, yellow what you take), their white grey but for the edges you stand on.
  // False for what keeps the common look.
  const seaRect = (r) => {
    const t = kitT, P = kitP, px = P / t, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, on = wl || wr, d = wr && !wl ? -1 : 1, w = r.x1 - r.x0, hgt = r.y1 - r.y0, ht = hgt / t;
    const w0 = d > 0 ? r.x0 : r.x1, w1 = d > 0 ? r.x1 : r.x0, W = (u) => snap(w0 + d * u * t), E = (u) => snap(w1 - d * u * t), Y = (v) => snap(r.y0 + v * t);   // tiles from its wall end, from its free end, down from its top
    const bw = (u0, v0, u1, v1, c, tn = 0, a = 1) => box(Math.min(W(u0), W(u1)), Math.min(Y(v0), Y(v1)), Math.max(W(u0), W(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
    const hsh = (n) => (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663) ^ (n * 83492791)) >>> 0) / 4294967296;
    const lip = (a = 1) => box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, a, 1.25);
    const barn = (x, y) => { box(x - P, y - P, x + 3 * P, y + 3 * P, PAL.gray, 1, 0, 10, 0); box(x, y, x + 2 * P, y + 2 * P, PAL.black, 1, 0, 10, 0); };   // a barnacle, a grey ring (the sheets' white)
    const lantern = (x, y, lit) => {   // a paper lantern on a hook, ribbed, its caps orange (the sheets' yellow); lit, orange in a glow
      if (lit) F(x, y, 0.6 * t, 0, 0, 0.6 * t, PAL.orange, 0.45, 1);
      const c = lit ? PAL.orange : th.block, x0 = snap(x - 0.18 * t), x1 = snap(x + 0.18 * t) + P, y0 = snap(y - 0.26 * t), y1 = snap(y + 0.26 * t);
      box(x0 + P, y0, x1 - P, y1, c, 1, 0, 10, 0); box(x0, y0 + 2 * P, x1, y1 - 2 * P, c, 1, 0, 10, 0);
      for (const f of [0.33, 0.66]) box(x0, snap(y0 + f * (y1 - y0)), x1, snap(y0 + f * (y1 - y0)) + P, lit ? PAL.black : PAL.gray, 1, 0, 10, 0);
      box(snap(x - 0.1 * t), y0 - 2 * P, snap(x + 0.1 * t) + P, y0, PAL.orange, 1, 0, 10, 0); box(snap(x - 0.1 * t), y1, snap(x + 0.1 * t) + P, y1 + 2 * P, PAL.orange, 1, 0, 10, 0);
    };
    if (r.crumble) {   // a raft of driftwood: logs with rounded ends, each shaking its own way as it gives, bands of orange rope between them, lashed to the wall with it
      const u = r.crumbling ? r.t / CRUMBLE.time : 0, a = CINE ? 1 : 1 - 0.5 * u * u, n = Math.max(1, Math.round(w / (1.3 * t))), pw = w / n;   // (2.5D: it shakes, no fading)
      for (let i = 0; i < n; i++) {
        const ox = u ? snap(Math.sin(T * 70 + i * 2.3) * 1.8 * u) : 0, x0 = snap(r.x0 + i * pw) + ox + (i ? P : 0), x1 = snap(r.x0 + (i + 1) * pw) + ox;
        box(x0, r.y0 + 3 * P, x1, r.y1 - 3 * P, th.crumble, a, 0, 10, 2); box(x0 + P, r.y0 + P, x1 - P, r.y1 - P, th.crumble, a, 0, 10, 2); box(x0 + 3 * P, r.y0, x1 - 3 * P, r.y1, th.crumble, a, 0, 10, 2);   // a log, its ends round
        box(x0 + 2 * P, r.y0, x1 - 2 * P, r.y0 + 2.5, th.lip, a, 1.25);
        if (i) box(x0 - P, r.y0 - P, x0 + P, r.y1 + P, PAL.orange, a, 0, 10, 0);   // a band of rope between two logs
      }
      if (CINE) this.route = 0;   // (the cinematic fork: its lashing, its starfish and its hook flat, thin things; the starfish and the hook on one in three)
      if (on) { line(W(0.02), Y(0.1), W(0.32), Y(ht - 0.1), PAL.orange, a); line(W(0.02), Y(ht - 0.1), W(0.32), Y(0.1), PAL.orange, a); bw(0.06, 0, 0.06 + px, ht, PAL.orange, 0, a); }   // its lashing at the wall
      if (hsh(41) < 1 / 3) {
      const sx = E(0.3), sy = Y(ht + 0.1); for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]]) box(sx + dx * P, sy + dy * P, sx + (dx + 1) * P, sy + (dy + 1) * P, PAL.orange, a, 0, 10, 0);   // a starfish
      if (on) { bw(0.18, ht, 0.18 + px, ht + 0.35, PAL.orange, 0, a); bw(0.18, ht + 0.35, 0.32, ht + 0.35 + px, PAL.orange, 0, a); bw(0.32 - px, ht + 0.25, 0.32, ht + 0.35, PAL.orange, 0, a); }   // a hook off the lashing
      }
      if (CINE) this.route = 2; return true;
    }
    if (r.plank && r.move) {   // a raft riding a stream: three logs, a lantern on a pole at its back, a basket of fish at its front
      const ahead = r.move.v < 0 ? -1 : 1, fr = ahead > 0 ? r.x1 : r.x0, bk = ahead > 0 ? r.x0 : r.x1, A = (u) => snap(fr - ahead * u * t), B = (u) => snap(bk + ahead * u * t);
      const n = 3, lw = w / n;
      for (let i = 0; i < n; i++) { const x0 = snap(r.x0 + i * lw) + (i ? P : 0), x1 = snap(r.x0 + (i + 1) * lw); box(x0, r.y0 + P, x1, Y(0.4), th.mover, 1, 0, 10, 2); box(x0 + P, r.y0, x1 - P, r.y0 + P, th.mover, 1, 0, 10, 0); }   // its logs
      if (CINE) { cinePoke(g, lv, r, 'raft', r.x0, r.y0 - 0.6 * t, r.x1, r.y0); this.route = 4; }   // (2.5D: landed on, it splashes; its pole, lantern and basket small)
      const lx = B(0.3); box(lx, Y(-1.0), lx + P, r.y0, th.mover, 1, 0, 10, 0); box(lx, Y(-1.0), lx + snap(0.25 * t), Y(-0.95), th.mover, 1, 0, 10, 0); lantern(lx + snap(0.25 * t), Y(-0.72), true);   // a lantern on a pole
      const bx0 = A(0.6), bw0 = 0.24 * t;   // a basket of fish
      box(snap(bx0 - bw0), Y(-0.34), snap(bx0 + bw0), r.y0, th.mover, 1, 0, 10, 4); for (const dx of [-0.1, 0.1]) disc(bx0 + dx * t, Y(-0.38), 0.09 * t, PAL.blue, 1);
      if (CINE) this.route = 2; lip(); return true;
    }
    if (r.plank) {   // a jetty: boards on a brace at the wall, an unlit lantern hung under its free end
      if (r.bouncy) return false;
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 0); box(r.x0, r.y1 - P, r.x1, r.y1, th.plank, 1, 0, 10, 4);   // its boards, a rough underside
      if (CINE) this.route = 0; if (on) line(W(0.08), Y(ht + 0.9), W(0.95), Y(ht), th.plank, 1, 3, 2);   // its brace (flat, a thin thing)
      if (hsh(42) < 1 / 3) { const lx = E(0.18); box(lx, r.y1, lx + P, Y(ht + 0.35), PAL.gray, 1, 0, 10, 0); if (CINE) this.route = 4; lantern(lx, Y(ht + 0.62), false); }   // its lantern
      // (under one jetty in three, the rule book's; small, its string flat)
      if (CINE) this.route = 2; lip(); return true;
    }
    if (r.move || r.spring || r.magnet || r.bouncy || r.stair || r.slick) return false;
    box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0, 10, 0);   // sea-worn rock: in layers, barnacles on it
    for (const [v, n0] of [[0.38, 3], [0.6, 5], [0.8, 7]]) for (let x = r.x0, i = 0; x < r.x1; i++) { const sw = snap((0.6 + 0.9 * hsh(n0 + i)) * t); box(x, Y(v * ht), Math.min(r.x1, x + sw), Y(v * ht) + P, PAL.black, 1, 0, 10, 0); x += sw + 2 * P; }
    for (const [u, v] of [[0.6, 0.62], [0.35, 0.78], [0.8, 0.85]]) barn(E(u), Y(v));
    lip(); return true;
  };
  // The Dark Forest's ledges (the owner's picks, 2026-10-20, from research/variants/skazka-*-game.png, black and white and crooked): a block is earth clawed
  // together by roots, hollows in them, a skull in one, eyes glowing in the other (slab A); a plank a gnarled dead branch off a trunk that climbs the wall, its
  // free end clawing, a cobweb under it (plank F); a moving plank Baba Yaga's mortar riding curls of smoke, its pestle, a candle and a black cat's eyes over its
  // rim (mortar F); a crumbling block a rotten log broken in two, a spiral knot, toadstools, a snail (log B). Grey and black only, the edges you stand on white;
  // colour only for lights (eyes, see skEyes; a candle). Roots half dark (behind the ledge's face), a cobweb that is only decor dim (the white one you hold is
  // this world's moss). False for what keeps the common look.
  const skazkaRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, on = wl || wr, d = wr && !wl ? -1 : 1, w = r.x1 - r.x0, ht = (r.y1 - r.y0) / t, wt = w / t;
    const w0 = d > 0 ? r.x0 : r.x1, w1 = d > 0 ? r.x1 : r.x0, W = (u) => snap(w0 + d * u * t), E = (u) => snap(w1 - d * u * t), Y = (v) => snap(r.y0 + v * t);   // tiles from its wall end, from its free end, down from its top
    const be = (u0, v0, u1, v1, c, tn = 0, a = 1) => box(Math.min(E(u0), E(u1)), Math.min(Y(v0), Y(v1)), Math.max(E(u0), E(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
    const hsh = (n) => (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663) ^ (n * 83492791)) >>> 0) / 4294967296;
    const lip = (a = 1) => box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, a, 1.25);
    const G = PAL.gray, K = PAL.black, HALF = 1.5;   // grey, black; roots half of the way from the black (DEPTH)
    const root = (x, len, n, wd = 3, a = HALF, y = r.y1 - P) => {   // a root clawing down from (x, y), len tiles, winding, thinning, a crooked side root off it
      const k = Math.max(3, Math.round(len * 3)), ph = hsh(n) * 6.28, sw = (0.14 + 0.12 * hsh(n + 1)) * t;
      let x0 = x, y0 = y;
      for (let i = 1; i <= k; i++) { const q = i / k, x1 = snap(x + Math.sin(ph + q * 6) * sw * (0.4 + q)), y1 = snap(y + q * len * t); line(x0, y0, x1, y1, G, a, Math.max(1, Math.round(wd * (1 - 0.7 * q))));
        if (i === Math.round(k * 0.5)) { const s = (i % 2 ? -1 : 1) * (hsh(n + i) < 0.5 ? -1 : 1), bx1 = snap(x1 + s * 0.4 * t), by1 = snap(y1 + 0.25 * t); line(x1, y1, bx1, by1, G, a, 1); line(bx1, by1, snap(bx1 + s * 0.12 * t), snap(by1 + 0.3 * t), G, a, 1); }
        x0 = x1; y0 = y1; }
    };
    const toad = (x, s = 1, a = 1, y = r.y0) => {   // a grey toadstool, black spots: 0.6 tiles across
      box(snap(x - 0.07 * t * s), snap(y - 0.36 * t * s), snap(x + 0.07 * t * s) + P, y, G, a, 0, 10, 0);
      box(snap(x - 0.3 * t * s), snap(y - 0.5 * t * s), snap(x + 0.3 * t * s), snap(y - 0.34 * t * s), G, a, 0, 10, 0); box(snap(x - 0.2 * t * s), snap(y - 0.6 * t * s), snap(x + 0.2 * t * s), snap(y - 0.5 * t * s), G, a, 0, 10, 0);
      for (const [e, f] of [[-0.17, 0.45], [0.04, 0.54], [0.17, 0.42]]) box(snap(x + e * t * s), snap(y - f * t * s), snap(x + e * t * s) + P, snap(y - f * t * s) + P, K, a, 0, 10, 0);
      box(snap(x - 0.3 * t * s), snap(y - 0.36 * t * s), snap(x + 0.3 * t * s), snap(y - 0.34 * t * s), K, a, 0, 10, 0);   // the shade under its cap
    };
    const skull = (x, y, s = 1, a = 1) => {   // a grey skull 0.95 tiles across, black sockets, a nose, teeth
      disc(x, y, 0.42 * t * s, G, a); box(snap(x - 0.25 * t * s), snap(y + 0.18 * t * s), snap(x + 0.25 * t * s), snap(y + 0.46 * t * s), G, a, 0, 10, 0);
      for (const e of [-1, 1]) disc(snap(x + e * 0.17 * t * s), snap(y + 0.04 * t * s), 0.12 * t * s, K, a);
      box(snap(x) - P, snap(y + 0.18 * t * s), snap(x) + P, snap(y + 0.26 * t * s), K, a, 0, 10, 0); for (const e of [-0.13, 0, 0.13]) box(snap(x + e * t * s), snap(y + 0.34 * t * s), snap(x + e * t * s) + P, snap(y + 0.46 * t * s), K, a, 0, 10, 0);
    };
    const web = (x, y, dx, s = 1) => {   // a cobweb under it, dim: three threads out of a corner, two sagging rings across them, a strand hanging
      const L = 1.4 * t * s, at = (a, f) => [snap(x + dx * Math.cos(a) * L * f), snap(y + Math.sin(a) * L * f)];
      for (const a of [0.12, 0.75, 1.4]) { const [ex, ey] = at(a, 1); line(x, y, ex, ey, G, DIM); }
      for (const f of [0.45, 0.85]) { const p0 = at(0.12, f), p1 = at(0.75, f * 0.86), p2 = at(1.4, f); line(p0[0], p0[1], p1[0], p1[1], G, DIM); line(p1[0], p1[1], p2[0], p2[1], G, DIM); }
      const [hx, hy] = at(0.75, 0.86); line(hx, hy, hx, snap(hy + 0.5 * L), G, DIM);
    };
    const hollow = (x, y, rw, rh, n, eyes = false, a = 1) => {   // a hollow: black, a rim of roots round it; eyes glowing in it, or not
      F(x, y, rw * t + 2 * P, 0, 0, rh * t + 2 * P, G, a * HALF, 0); F(x, y, rw * t, 0, 0, rh * t, K, a, 0);
      for (let i = 0; i < 3; i++) { const q = (i / 3) * 6.28 + 0.5 + hsh(n + i); line(snap(x + Math.cos(q) * rw * t), snap(y + Math.sin(q) * rh * t), snap(x + Math.cos(q) * (rw + 0.25) * t), snap(y + Math.sin(q) * (rh + 0.25) * t), G, HALF, 2); }
      if (eyes) skEyes(x, y, Math.min(1, rw / 0.4), n);
    };
    const claws = (x, y, s, n, up = -1) => {   // twigs like a clawing hand: three curling fingers
      for (let i = 0; i < 3; i++) { let x0 = x, y0 = y, ang = -Math.PI / 2 + (i - 1) * 0.55 + (up > 0 ? Math.PI : 0); const len = (0.55 + 0.25 * hsh(n + i)) * s * t;
        for (let j = 0; j < 3; j++) { const x1 = snap(x0 + Math.cos(ang) * len / 3 * (d > 0 ? 1 : -1) * (i === 1 ? 0.6 : 1) + d * (i - 1) * 0.04 * t), y1 = snap(y0 + Math.sin(ang) * len / 3); line(x0, y0, x1, y1, G, 1, j < 1 ? 2 : 1); x0 = x1; y0 = y1; ang += 0.42 * (i === 0 ? -1 : 1); } }
    };
    if (r.crumble) {   // a rotten log broken in two: grey in black rot, its grain split, holes, a spiral knot, grey toadstools, a snail; its pieces shake as it gives
      const u = r.crumbling ? r.t / CRUMBLE.time : 0, a = CINE ? 1 : 1 - 0.5 * u * u, cut = 0.58;   // (2.5D: no fading, a dither in depth reads as a sieve: it shakes)
      [[0, cut - 0.03], [cut + 0.03, 1]].forEach(([q0, q1], i) => {
        const ox = u ? snap(Math.sin(T * 70 + i * 2.3) * 1.8 * u) : 0, x0 = snap(Math.min(W(q0 * wt), W(q1 * wt))) + ox, x1 = snap(Math.max(W(q0 * wt), W(q1 * wt))) + ox;
        box(x0, r.y0 + 2 * P, x1, r.y1 - 2 * P, th.crumble, a, 0, 10, 1); box(x0 + 2 * P, r.y0, x1 - 2 * P, r.y1, th.crumble, a, 0, 10, 1);   // a piece, its ends round, its rot speckled
        box(x0 + 2 * P, Y(ht * 0.6), x1 - 2 * P, r.y1 - P, th.crumble, a, 0, 10, 4);   // its underside darker
        for (let x = x0 + snap(0.2 * t), j = 0; x < x1 - snap(0.3 * t); j++) { const ww = snap((0.3 + 0.5 * hsh(j + i * 50)) * t), yy = Y(ht * (0.25 + 0.4 * hsh(j + 9 + i * 50))); box(x, yy, Math.min(x1 - 2 * P, x + ww), yy + P, K, a, 0, 10, 0); x += ww + snap((0.25 + 0.35 * hsh(j + 21)) * t); }   // its grain split
        box(x0 + 2 * P, r.y0, x1 - 2 * P, r.y0 + 2.5, th.lip, a, 1.25);
      });
      for (let i = 0; i < 2; i++) { const hx = snap(r.x0 + (0.2 + 0.55 * hsh(i + 3)) * w), hy = snap(r.y0 + (0.45 + 0.2 * hsh(i + 13)) * (r.y1 - r.y0)); F(hx, hy, 0.13 * t, 0, 0, 0.1 * t, K, a, 0); }   // woodworm holes
      { const kx = W(cut * wt * 0.5), ky = Y(ht * 0.55); for (const rr of [0.32, 0.22, 0.12]) F(kx, ky, rr * t, 0, 0, rr * 0.8 * t, K, a, 4); }   // a spiral knot
      if (CINE) this.route = 4;   // (the cinematic fork: its toadstools and its snail small)
      toad(W(0.35), 1, a); toad(W(0.75), 0.7, a);
      { const sx = E(0.8), sy = r.y0; box(sx - snap(0.32 * t), sy - snap(0.12 * t), sx + snap(0.22 * t), sy, G, a, 0, 10, 0); for (const e of [0.1, 0.2]) box(sx + snap(e * t), sy - snap(0.32 * t), sx + snap(e * t) + P, sy - snap(0.12 * t), G, a, 0, 10, 0);   // a snail: its body, its horns,
        disc(sx - snap(0.12 * t), sy - snap(0.3 * t), 0.24 * t, G, a); for (const rr of [0.16, 0.08]) F(sx - snap(0.12 * t), sy - snap(0.3 * t), rr * t, 0, 0, rr * t, K, a, 4); }   // its shell in rings
      if (CINE) this.route = 2; return true;
    }
    if (r.plank && r.move) {   // Baba Yaga's mortar, crooked and cracked, riding curls of smoke, the rim you stand on: its pestle, a candle lit on its rim, a black cat's eyes over it
      const ahead = r.move.v < 0 ? -1 : 1, bk = ahead > 0 ? r.x0 : r.x1, B = (u) => snap(bk + ahead * u * t);
      const cx = snap((r.x0 + r.x1) / 2), hw = w / 2 / t, c = th.mover, lean = ahead * 0.12;   // how much it leans, a row at a time
      const row = (v0, v1, i0, j, tn = 0) => box(snap(cx - (hw - i0 - lean * j) * t), Y(v0), snap(cx + (hw - i0 + lean * j) * t), Y(v1), c, 1, 0, 10, tn);   // a band of it, i0 in from each end, leaning
      if (CINE) this.route = 3;   // (the cinematic fork: its smoke behind, its pestle and candle small, the flame and the cat's eyes flat)
      F(cx, Y(2.05), (hw + 0.6) * t, 0, 0, 0.6 * t, G, 0.6, 1); for (const [dx, dv, rr] of [[-hw - 0.5, 1.8, 0.32], [hw + 0.55, 1.9, 0.28], [-0.4, 2.5, 0.36], [0.6, 2.45, 0.3]]) { F(snap(cx + dx * t), Y(dv), rr * t, 0, 0, rr * t, G, 0.5, 1); F(snap(cx + dx * t), Y(dv), rr * 0.6 * t, 0, 0, rr * 0.6 * t, G, DIM, 4); }   // the smoke it rides, curling
      if (CINE) this.route = 2;
      const bands = [[0, 0.3, 0], [0.3, 1.0, 0.12], [1.0, 1.5, 0.45], [1.5, 1.8, 0.8]];   // a wide bowl
      bands.forEach(([v0, v1, i0], j) => { row(v0, v1, i0, j, j ? 1 : 0); if (j) box(snap(cx + (hw - i0 + lean * j) * t * 0.35), Y(v0), snap(cx + (hw - i0 + lean * j) * t), Y(v1), c, 1, 0, 10, 4); });   // its staves, its far side in shade
      bands.slice(1).forEach(([v0, , i0], j) => box(snap(cx - (hw - i0 - lean * (j + 1)) * t), Y(v0), snap(cx + (hw - i0 + lean * (j + 1)) * t), Y(v0) + P, K, 1, 0, 10, 0));   // its iron hoops
      for (const [u, v0, n] of [[0.25, 0.35, 4], [0.65, 0.5, 5], [0.45, 1.05, 3]]) for (let i = 0; i < n; i++) box(snap(cx + (u - 0.5) * 2 * hw * t * 0.8 + (i % 2) * P * 2), Y(v0 + i * 0.12), snap(cx + (u - 0.5) * 2 * hw * t * 0.8 + (i % 2) * P * 2) + P, Y(v0 + i * 0.12 + 0.12), K, 1, 0, 10, 0);   // its cracks
      if (CINE) this.route = 4;
      { const tip = -1.45; line(B(0.75), Y(0.2), B(0.3), Y(tip), c, 1, 5); disc(B(0.3), Y(tip), 0.18 * t, c, 1); box(B(0.3) - P, Y(tip) - P, B(0.3) + P, Y(tip) + P, K, 1, 0, 10, 0); }   // the pestle stuck in it
      { const lx = B(1.1); box(lx - snap(0.08 * t), Y(-0.5), lx + snap(0.08 * t), r.y0, G, 1, 0, 10, 0); if (CINE) this.route = 0; box(lx - P, Y(-0.75), lx + P, Y(-0.5), PAL.orange, 1, 0, 10, 0); box(lx - P / 2, Y(-0.7), lx + P / 2, Y(-0.56), PAL.yellow, 1, 0, 10, 0); vlamps.push([lx, Y(-0.62), 0.5, 1.6]); }   // a candle lit on its rim (a light)
      skEyes(B(0.3), Y(-0.15), 0.7, 1300);   // a black cat's eyes over its rim, glowing
      if (CINE) this.route = 2; lip(); return true;
    }
    if (r.plank) {   // a gnarled dead branch off a trunk that climbs the wall: thick at the wall, bark split, its free end in twigs like a clawing hand, thorns and a dim cobweb under it
      if (r.bouncy) return false;
      const c = th.plank, sw = CINE ? cinePoke(g, lv, r, 'branch', r.x0, r.y0, r.x1, r.y1) : 0, dip = sw ? snap(sw * r.poke.d * t) : 0, xe = E(0.7);   // (the cinematic
      // fork: under the hero its free end gives a little and springs back, bark falling, its cobweb swaying)
      const spans = dip ? (d > 0 ? [[r.x0, xe, 0], [xe, r.x1, dip]] : [[xe, r.x1, 0], [r.x0, xe, dip]]) : [[r.x0, r.x1, 0]];
      for (const [x0, x1, o] of spans) { box(x0, r.y0 + o, x1, r.y1 + o, c, 1, 0, 10, 0); box(x0, r.y1 - 2 * P + o, x1, r.y1 + o, c, 1, 0, 10, 4); }   // its wood, its underside in shade
      for (let x = r.x0 + snap(0.3 * t), j = 0; x < r.x1 - snap(0.4 * t); j++) { const ww = snap((0.2 + 0.3 * hsh(j)) * t); box(x, Y(ht * 0.45), x + ww, Y(ht * 0.45) + P, K, 1, 0, 10, 0); x += ww + snap((0.35 + 0.5 * hsh(j + 7)) * t); }   // its bark split
      if (on) line(W(0), Y(ht + 0.45), W(1.3), Y(ht * 0.6), c, 1, 4, 2);   // thick where it grows out of the wall
      be(0, ht * 0.55 + dip / t, 0.3, ht + dip / t, K);   // its free end thinning
      if (CINE) this.route = 0;   // (its twigs, thorns and trunk flat, its cobweb behind)
      claws(E(0.15), r.y0 + dip, 1.9, 1405);   // twigs like a clawing hand
      for (const [u, ln0] of [[0.9, 0.35], [1.7, 0.25]].filter(([q]) => q < wt - 0.5)) line(W(u), r.y1, snap(W(u) + d * 0.1 * t), Y(ht + ln0), c, 1, 1);   // thorns under it
      if (CINE) this.route = 3; if (hsh(1500) < 1 / 3) web(snap((r.x0 + r.x1) / 2) + snap(sw * 2 * t), r.y1, d, 0.7); if (CINE) this.route = 0;   // a dim cobweb (under one
      // branch in three: under each, too many, the rule book)
      if (on) { line(W(0.15), Y(ht + 1.6), W(0.25), Y(-2.0), c, 1, 6, 2); for (const [v, s] of [[-1.2, 1], [-1.7, -1]]) claws(W(0.25), Y(v), 0.9, 1700 + Math.round(v * 10), s > 0 ? -1 : 1); }   // the trunk it grows off, up the wall, its own twigs
      if (CINE) this.route = 2; for (const [x0, x1, o] of spans) box(x0, r.y0 + o, x1, r.y0 + o + 2.5, th.lip, 1, 1.25); return true;   // its edge (lip)
    }
    if (r.move || r.spring || r.magnet || r.bouncy || r.stair || r.slick) return false;
    {   // earth clawed together by roots: dotted grey, its underside jagged and dark, roots like fingers, hollows in them, a skull in one, eyes glowing in the other
      const c = th.block;
      box(r.x0, r.y0, r.x1, r.y1, c, 1, 0, 10, 1); box(r.x0, Y(Math.max(0.35, ht - 0.3)), r.x1, r.y1, c, 1, 0, 10, 4);
      for (let x = r.x0 + snap(0.15 * t), i = 0; x < r.x1 - snap(0.2 * t); i++) { const ww = snap((0.2 + 0.25 * hsh(i + 300)) * t), dd = snap((0.15 + 0.3 * hsh(i + 330)) * t); F(snap(x + ww / 2), r.y1 + dd / 2, ww / 2, 0, 0, -dd / 2, c, 1, 6, ww / 2, dd / 2, ww); x += ww + snap((0.45 + 0.5 * hsh(i + 360)) * t); }   // earth hanging off its underside in teeth
      if (CINE) this.route = 0;   // (the cinematic fork: its roots, its hollows and what is in them flat)
      [0.4, 1.9, 3.4].filter((u) => u < wt - 0.25).forEach((u, i) => root(W(u), 1.7 * (0.65 + 0.5 * hsh(i + 70)), 100 + i * 17, 3));
      if (hsh(2030) < 1 / 3) { hollow(W(1.1), Y(ht + 0.45), 0.42, 0.34, 2000); skull(W(1.1), Y(ht + 0.42), 0.62); }   // a skull in a hollow under one ledge in three (the rule book: under each, too many)
      if (wt > 3) { let eyes = hsh(2020) < 0.34; if (eyes && CINE) { const hx = W(2.5), hy = Y(ht + 0.45), E2 = r.eyesP || (r.eyesP = {}); cinePoke(g, lv, E2, 'hollow', hx - 1.2 * t, hy - 1.2 * t, hx + 1.2 * t, hy + 1.2 * t); eyes = cinePerched(E2, lv.t); }   // (2.5D:
        hollow(W(2.5), Y(ht + 0.45), 0.42, 0.34, 2010, eyes); }   // eyes in one in three (the owner's rule on detail: a screen of eyes is noise); shut, their light out, while the hero is by
      if (CINE) this.route = 2; lip(); return true;
    }
  };
  // The Mine's ledges (the owner's picks, 2026-10-21, research/variants/mine-*-game.png): a block is rough rock on a timber beam, a post under it down to its
  // footing, a coil of rope off its end (D); a plank a scaffold board on a post up the wall, a chain to it, a pickaxe hung off its end (F); a moving plank a big cage
  // braced across, a lamp and a basket in it, its two pulleys and their ropes up (F, blue); a crumbling block rubble in two rows of stones, a post at the wall and a
  // short one at its end, grit trickling (A, orange). Timber under a ledge half dark (behind its face, DEPTH). False for what keeps the common look.
  const mineRect = (r) => {
    const t = kitT, P = kitP, px = P / t, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, on = wl || wr, d = wr && !wl ? -1 : 1, w = r.x1 - r.x0, ht = (r.y1 - r.y0) / t, wt = w / t;
    const w0 = d > 0 ? r.x0 : r.x1, w1 = d > 0 ? r.x1 : r.x0, W = (u) => snap(w0 + d * u * t), E = (u) => snap(w1 - d * u * t), Y = (v) => snap(r.y0 + v * t);   // tiles from its wall end, from its free end, down from its top
    const bw = (u0, v0, u1, v1, c, tn = 0, a = 1) => box(Math.min(W(u0), W(u1)), Math.min(Y(v0), Y(v1)), Math.max(W(u0), W(u1)), Math.max(Y(v0), Y(v1)), c, a, 0, 10, tn);
    const hsh = (n) => (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663) ^ (n * 83492791)) >>> 0) / 4294967296;
    const lip = (a = 1) => box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, a, 1.25);
    const G = PAL.gray, K = PAL.black, HALF = 1.5;   // grey, black; timber under a ledge half of the way from the black (DEPTH)
    const post = (u, v0, v1, c = G, a = HALF) => bw(u, v0, u + 0.2, v1, c, 3, a);   // a timber post, its grain in lines
    const room = (u0, u1, v0, v1) => { const x0 = Math.min(W(u0), W(u1)), x1 = Math.max(W(u0), W(u1)), y0 = Y(v0), y1 = Y(v1); return !lv.rects.some((q) => q !== r && !q.cap && q.x1 > x0 && q.x0 < x1 && q.y1 > y0 && q.y0 < y1); };   // nothing laid there
    const R0 = r.mnRoom || (r.mnRoom = { under: room(0, Math.min(wt - 0.2, 3.3), ht, ht + 2.2), end: room(wt - 0.7, wt, ht, ht + 1.1), wall: room(0, 0.4, -1.4, ht + 1.1) });   // (once a ledge: where its timber has room)
    if (r.crumble) {   // loose rubble and broken ore held up by rotten boards: rounded stones with black gaps in two rows, shaking as it gives, grit falling
      const u = r.crumbling ? r.t / CRUMBLE.time : 0, a = CINE ? 1 : 1 - 0.5 * u * u, c = th.crumble, shake = (i) => (u ? snap(Math.sin(T * 70 + i * 2.3) * 1.8 * u) : 0);   // (2.5D: no
      // fading, a dither in depth reads as a sieve: it shakes)
      box(r.x0, r.y0 + 2 * P, r.x1, r.y1, K, a, 0, 10, 0);   // the dark between its stones
      const n = Math.max(1, Math.round(wt / 0.55));
      for (let j = 0; j < 2; j++) for (let i = 0; i < n; i++) { const q = (i + 0.5 + (j % 2) * 0.35) / n; if (q > 1) continue; const rr = (0.24 + 0.08 * hsh(i * 7 + j)) * t, x = W(q * wt) + shake(i + j * 9), y = snap(r.y0 + ((j + 0.5) / 2) * (r.y1 - r.y0) + 0.04 * t);
        F(x, y, rr, 0, 0, rr * 0.85, c, a, 0); F(x - snap(0.06 * t), y - snap(0.06 * t), rr * 0.45, 0, 0, rr * 0.35, c, a * 1.6, 0); }   // a stone, its lit side
      if (R0.under) { post(0.02, ht, ht + 1.2, c); bw(wt - 0.6, ht, wt - 0.4, ht + 0.5, c, 3, HALF); }   // a post at the wall, a short one at its end
      if (CINE) this.route = 0; for (let i = 0; i < 3; i++) { const q = (T * 0.55 + i / 3 + hsh(i + 40)) % 1, dx = snap(Math.sin(i * 2.1) * 0.12 * t), x = E(0.4); box(x + dx, snap(r.y1 + q * 1.7 * t), x + dx + P + (i % 2) * P, snap(r.y1 + q * 1.7 * t) + P + (i % 2) * P, c, 1 - q, 0, 10, 0); } if (CINE) this.route = 2;   // grit trickling off it (flat)
      for (let i = 0, m = Math.max(1, Math.round(wt)); i < m; i++) { const x0 = snap(r.x0 + (i * w) / m) + shake(i), x1 = snap(r.x0 + ((i + 1) * w) / m) + shake(i); box(x0, r.y0, x1, r.y0 + 2.5, th.lip, a, 1.25); }   // its edge, in pieces
      return true;
    }
    if (r.plank && r.move) {   // a big cage braced across, blue, its roof the top you stand on: a lamp and a basket in it, two pulleys on it and their ropes up
      const c = th.mover, cx = snap((r.x0 + r.x1) / 2), hw = w / 2 / t, X = (u) => snap(cx + u * t);
      const bx = (u0, v0, u1, v1, cc, tn = 0) => box(Math.min(X(u0), X(u1)), Math.min(Y(v0), Y(v1)), Math.max(X(u0), X(u1)), Math.max(Y(v0), Y(v1)), cc, 1, 0, 10, tn);
      bx(-hw, 0, hw, ht, c);   // its roof
      for (const u of [-hw, -0.07, hw - 0.15]) bx(u, ht, u + 0.15, ht + 1.85, c); bx(-hw, ht + 1.7, hw, ht + 1.85, c);   // its posts, its floor
      line(X(-hw + 0.15), Y(ht), X(-0.07), Y(ht + 1.7), c, 1, 2); line(X(-0.07), Y(ht), X(-hw + 0.15), Y(ht + 1.7), c, 1, 2);   // braced across
      if (CINE) this.route = 4; mnLamp(X(hw * 0.55), r.y1, true, 0.75); if (CINE) this.route = 2;   // a lamp in it (small, as on the walls)
      { const bx0 = X(hw * 0.55), by = Y(ht + 1.38); box(snap(bx0 - 0.18 * t), by, snap(bx0 + 0.18 * t), snap(by + 0.29 * t), G, 1, 0, 10, 4); box(snap(bx0 - 0.21 * t), by, snap(bx0 + 0.21 * t), by + P, G, 1, 0, 10, 0); }   // a basket on its floor
      if (CINE) this.route = 0; for (const u of [-0.4, 0.4]) { F(X(u), Y(-0.3), 0.17 * t, 0, 0, 0.17 * t, c, 1, 4); line(X(u), Y(-0.45), X(u), Y(-3), G, 1, 1); } if (CINE) this.route = 2;   // its pulleys, their ropes up (flat)
      lip(); return true;
    }
    if (r.plank) {   // a scaffold board: weathered grey planks, their grain in lines, on a post up the wall, a chain from it to its middle, a pickaxe hung off its end
      if (r.bouncy) return false;
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 3); box(r.x0, r.y1 - P, r.x1, r.y1, K, 1, 0, 10, 0);   // its boards, their lower edge
      if (on && R0.wall) { bw(0, -1.3, 0.22, ht + 1.0, G, 3, HALF); if (CINE) this.route = 0; if (hsh(31) < 1 / 3) for (let i = 0; i < 6; i++) { const q = (i + 0.5) / 6; box(snap(W(0.22) + q * (E(wt * 0.4) - W(0.22))), snap(Y(-1.2) + q * (r.y0 - Y(-1.2))), snap(W(0.22) + q * (E(wt * 0.4) - W(0.22))) + 2 * P, snap(Y(-1.2) + q * (r.y0 - Y(-1.2))) + P, G, 1, 0, 10, 0); } }   // its post, the chain's links
      if (CINE) this.route = 0;   // (what hangs off it flat, and on one board in three: the rule book)
      if (R0.end && hsh(32) < 1 / 3) { const x = E(0.2), y = Y(ht + 0.3), dir = -d, hx = snap(x + dir * 0.27 * t), hy = snap(y + 0.68 * t), Q = (u, v) => [snap(hx + dir * u * 0.9 * t), snap(hy - v * 0.9 * t)];   // a pickaxe hung off its end by its head
        line(x, r.y1, x, y, G, 1, 1); line(x, y, hx, hy, G, 1, 2);
        const [ax, ay] = Q(-0.4, 0.2), [bx0, by0] = Q(-0.15, -0.04), [cx0, cy0] = Q(0.15, -0.04), [ex, ey] = Q(0.42, 0.22);
        line(ax, ay, bx0, by0, G, 1, 2); line(bx0, by0, cx0, cy0, G, 1, 3); line(cx0, cy0, ex, ey, G, 1, 2); }
      if (CINE) this.route = 2; lip(); return true;
    }
    if (r.move || r.spring || r.magnet || r.bouncy || r.stair || r.slick) return false;
    {   // rough rock, dotted grey, its underside shaded: a timber beam under it, a post down to its footing, a coil of rope off its end (half dark)
      const c = th.block;
      box(r.x0, r.y0, r.x1, r.y1, c, 1, 0, 10, 1); box(r.x0, Y(Math.max(0.3, ht - 0.28)), r.x1, r.y1, c, 1, 0, 10, 4);   // its rock, its underside darker
      if (ht > 1.4) {   // a thick one, a pillar of rock: darker under its top, in strata, cracks down its face, the timber shoring its sides and a cap under its edge
        box(r.x0, Y(0.3), r.x1, r.y1, c, 1, 0, 10, 4);
        for (let v = 0.75, i = 0; v < ht - 0.25; v += 0.6, i++) { const y = Y(v); line(r.x0, y, r.x1, snap(y + (hsh(i + 50) - 0.5) * 0.2 * t), K, 1, 1); }   // its strata
        for (let i = 0, n = Math.max(1, Math.round(wt / 1.8)); i < n; i++) { const x = snap(r.x0 + ((i + 0.5) / n) * w), y0 = Y(0.5 + (ht - 1.5) * hsh(i + 60)); line(x, y0, snap(x + (hsh(i + 70) - 0.5) * 0.5 * t), snap(y0 + (0.6 + 0.5 * hsh(i + 80)) * t), K, 1, 1); }   // cracks
        for (const [x0, x1] of [[r.x0, r.x0 + 0.24 * t], [r.x1 - 0.24 * t, r.x1]]) box(snap(x0), Y(0.3), snap(x1), r.y1, G, 1, 0, 10, 3);   // its posts
        box(r.x0, Y(0.3), r.x1, Y(0.48), G, 1, 0, 10, 3);   // its cap
      }
      if (R0.under) { bw(0, ht, Math.min(wt - 0.4, 3.2), ht + 0.3, G, 3, HALF); post(0.55, ht + 0.3, ht + 1.9); bw(0.45, ht + 1.9, 0.85, ht + 2.08, G, 4, HALF); }   // its beam, its post, its footing
      if (R0.end && hsh(33) < 1 / 3) { if (CINE) this.route = 0; const x = E(0.2), y = r.y1; for (const rr of [0.27, 0.19, 0.11]) F(x, snap(y + 0.3 * t), rr * t, 0, 0, rr * 1.2 * t, G, 1, 4); line(x, snap(y + 0.6 * t), snap(x + 0.06 * t), snap(y + 0.95 * t), G, 1, 1); box(x, y, x + P, snap(y + 0.05 * t), G, 1, 0, 10, 0); if (CINE) this.route = 2; }   // a coil of rope
      // hung, its end (on one ledge in three; flat)
      lip(); return true;
    }
  };
  // Tokyo's ledges (see the parts catalog), by what they do: a gondola moves, an awning off a wall bounces, a free plank is a steel
  // beam, a block is a concrete slab cut square with its panels' seams, a striped cap on a free end, a knee brace under it at a wall
  // and windows in a thick one.
  // Returns false for what keeps the common look (ice, crumble, cracks, springs, magnets).
  // Mount Fuji's ledges (the Glacier's; the owner's picks, research/variants/fuji-*-1-px.png): a block is dark volcanic rock (F), blue, cracks zigzagging down it
  // and notches in its underside, a cap of snow on top (its white is the edge stood on); a plank is a trail's boardwalk (C), on a knee brace at the wall, a
  // garland of rope under it and a bell off its free end (C's was yellow: the midground has none). False for what keeps the common look.
  const fujiRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, hsh = (n) => (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663) ^ (n * 83492791)) >>> 0) / 4294967296;
    if (r.plank) {
      if (r.move || r.bouncy) return false;
      box(r.x0, r.y0, r.x1, r.y1, th.plank, 1, 0, 10, 2);
      for (let x = r.x0 + 0.7 * t; x < r.x1 - 0.3 * t; x += 0.7 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, r.y1, PAL.black, 1, 0, 10, 0);
      if (CINE) this.route = 0;   // (the cinematic fork: its brace and its garland flat, thin things)
      for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) {
        brace(wx, d, snap(r.y1) + P, snap(0.9 * t), 2 * P, th.plank);
        if (r.x1 - r.x0 >= 3 * t && hsh(5) < 1 / 3) {   // (a garland on one in three)
          const g0 = wx + d * 1.0 * t, g1 = wl ? r.x1 - 0.35 * t : r.x0 + 0.35 * t, gy = snap(r.y1) + P;
          for (let i = 0; i <= 16; i++) { const u = i / 16, gx = snap(g0 + (g1 - g0) * u), yy = snap(gy + 0.35 * t * 4 * u * (1 - u)); box(gx, yy, gx + P, yy + P, PAL.orange, 1, 0, 10, 0); }
        }
      }
      const bell = kitThing(lv, r);
      if (bell) {   // its bell off its free end (C's; the task): grey till the hero comes near, then rung for good, orange, swinging, rings of its sound going out from it
        const bx = snap(bell.x), by = snap(r.y1 + 0.2 * t), on = lv.tended.get(r), u = on != null ? T - on : 1e9, c = on != null ? PAL.orange : PAL.gray;
        const nud = CINE && on != null && u > 1.6 ? cinePoke(g, lv, r, 'bell', bx - 0.4 * t, r.y1, bx + 0.4 * t, by + 0.5 * t) : 0;   // (2.5D: rung, a nudge swings it again, less)
        const sw = u < 1.6 ? snap(Math.sin(u * 13) * 0.12 * t * (1 - u / 1.6)) : nud ? snap(nud * 1.2 * t) : 0;
        box(bx, r.y1, bx + P, by, PAL.gray, 1, 0, 10, 0);   // its cord, the bell (twice C's size: a task's), its lip, its clapper
        if (CINE) this.route = 4;   // (the bell small, its cord and its rings flat)
        box(bx + sw - snap(0.13 * t), by, bx + sw + snap(0.13 * t) + P, snap(by + 0.24 * t), c, 1, 0, 10, 0); box(bx + sw - snap(0.22 * t), snap(by + 0.24 * t), bx + sw + snap(0.22 * t) + P, snap(by + 0.36 * t), c, 1, 0, 10, 0);
        box(bx + 2 * sw, snap(by + 0.36 * t), bx + 2 * sw + P, snap(by + 0.36 * t) + 2 * P, PAL.black, 1, 0, 10, 0);
        if (CINE) this.route = 0; for (let i = 0; i < 3; i++) { const q = (u - i * 0.22) / 1.1; if (q > 0 && q < 1) F(bx, by + 0.2 * t, (0.35 + 1.9 * q) * t, 0, 0, (0.35 + 1.9 * q) * t, PAL.orange, 1 - q, 4); }
      }
      if (CINE) this.route = 2; box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.move || r.spring || r.magnet || r.bouncy || r.stair) return false;
    box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0, 10, 0);
    for (let y0 = r.y0 + 0.25 * t, row = 0; y0 < r.y1 - 0.5 * t; y0 += 1.8 * t, row++) for (let x = r.x0 + (0.8 + 0.6 * hsh(1 + row)) * t, i = 0; x < r.x1 - 0.5 * t; x += (1.6 + 0.8 * hsh(2 + i + 9 * row)) * t, i++) {   // cracks a tile long
      let cx = x, j = 0; for (let y = y0; y < Math.min(r.y1 - P, y0 + 1.1 * t); y += 2 * P) { box(snap(cx), snap(y), snap(cx) + P, snap(y) + 2 * P, PAL.black, 1, 0, 10, 0); cx += hsh(i * 13 + j++ + 31 * row) < 0.5 ? -P : P; }
    }
    for (let x = r.x0 + 0.4 * t, i = 0; x < r.x1 - 0.3 * t; x += (0.5 + 0.5 * hsh(30 + i)) * t, i++) box(snap(x), snap(r.y1 - (1 + Math.round(2 * hsh(50 + i))) * P), snap(x + (0.15 + 0.2 * hsh(70 + i)) * t), r.y1, PAL.black, 1, 0, 10, 0);   // notches in its underside
    const sy = snap(r.y0 + 0.16 * t);
    box(r.x0, r.y0, r.x1, sy, PAL.white, 1, 0, 10, 0);   // the snow
    for (let x = r.x0, i = 0; x < r.x1; x += 0.35 * t, i++) box(snap(x), sy, snap(Math.min(r.x1, x + 0.35 * t)), sy + (1 + Math.round(2 * hsh(90 + i))) * P, PAL.white, 1, 0, 10, 0);   // its lumpy edge
    if (!wl) box(r.x0, sy, r.x0 + 2 * P, snap(r.y0 + 0.4 * t), PAL.white, 1, 0, 10, 0);   // a drip over a free end
    if (!wr) box(r.x1 - 2 * P, sy, r.x1, snap(r.y0 + 0.35 * t), PAL.white, 1, 0, 10, 0);
    return true;
  };
  const townRect = (r) => {
    const t = kitT, P = kitP, wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1;
    if (r.ac) {   // an air conditioner (aircon; owner: you may stand on it, for 3 s): its top edge white, and once stood on it rattles, harder as it gives way
      const u = r.crumbling ? r.t / AC.time : 0, ox = u ? snap(Math.sin(T * 55) * (1 + 2 * u) * P) : 0;
      aircon(r, ox, 0); box(r.x0 + ox, r.y0, r.x1 + ox, r.y0 + 2.5, th.lip, 1, 1.25); return true;
    }
    if (r.plank && r.move) {   // a window cleaner's gondola (the owner's pick, research/variants/tokyo-gondola-1.png C): a purple box of panels hung under its
      // floor, its corner posts clamped to two cables up out of sight, a grey bucket at one end and a squeegee at the other (C's were yellow: yellow is for what you take)
      const yb = snap(r.y0 + 0.62 * t), pt = r.y0 - 0.12 * t;
      box(r.x0, r.y0, r.x1, yb, th.mover, 1, 0, 10, 0); box(r.x0, yb - P, r.x1, yb, PAL.black, 1, 0, 10, 0);
      for (let x = r.x0 + 0.75 * t; x < r.x1 - 0.4 * t; x += 0.75 * t) box(snap(x), r.y0 + 2 * P, snap(x) + P, yb - P, PAL.black, 1, 0, 10, 0);   // its panels' seams
      for (const x of [r.x0, r.x1 - 2 * P]) { if (CINE) this.route = 0; box(x, pt, x + 2 * P, yb, th.mover, 1, 0, 10, 0); if (CINE) this.route = 3; box(x + P / 2, top, x + 1.5 * P, pt - 0.16 * t, PAL.gray, DIM, 0, 10, 0); if (CINE) this.route = 0; box(x - P, pt - 0.16 * t, x + 3 * P, pt, PAL.gray, 1, 0, 10, 0); }   // (2.5D: its posts and clamps flat, thin; its cables behind)
      if (CINE) this.route = 4;   // (its bucket and squeegee small)   // posts, cables, clamps
      const bx = r.x0 - 0.25 * t, hy = r.y0 + 0.24 * t;   // the bucket, on its handle off the post
      rod(r.x0 - P, r.y0 + 0.04 * t, bx - 0.13 * t, hy, PAL.gray); rod(r.x0 - P, r.y0 + 0.04 * t, bx + 0.13 * t, hy, PAL.gray);
      box(snap(bx - 0.16 * t), snap(hy), snap(bx + 0.16 * t), snap(hy) + 2 * P, PAL.gray, 1, 0, 10, 0); box(snap(bx - 0.13 * t), snap(hy) + 2 * P, snap(bx + 0.13 * t), snap(hy + 0.26 * t), PAL.gray, 1, 0, 10, 2);
      const sx = r.x1 + 0.32 * t, sy = snap(r.y0 + 0.06 * t);   // the squeegee, its blade over its handle
      box(snap(sx - 0.22 * t), sy, snap(sx + 0.22 * t), sy + 2 * P, PAL.gray, 1, 0, 10, 0); box(snap(sx) - P / 2, sy + 2 * P, snap(sx) + P / 2, snap(r.y0 + 0.6 * t), PAL.gray, 1, 0, 10, 0);
      box(r.x1, sy + P, snap(sx - 0.22 * t), sy + 2 * P, PAL.gray, 1, 0, 10, 0);
      if (CINE) this.route = 2;
    } else if (r.plank && r.bouncy) {   // a shop's awning off a wall, which always bounces (the owner's pick, research/variants/tokyo-awning-1.png D): blue and white
      // checks in two rows, its belly and scalloped hem hanging lower in the middle, two rods to bolts in the wall, a paper lantern off its free end, orange (D's was red:
      // red is danger); landed on, it sags in a curve, its top edge with it (at rest straight, where it is stood on)
      const wx = wl ? lv.l : lv.r, d = wl ? 1 : -1, w = r.x1 - r.x0, n = Math.max(4, Math.round(w / (0.4 * t))), cw = w / n, amp = r.t > 0 ? 0.3 * t * (r.t / SPRING.anim) : 0, rh = snap(0.17 * t);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, k = 4 * u * (1 - u), y = r.y0 + snap(amp * k), x0 = snap(r.x0 + i * cw), x1 = snap(r.x0 + (i + 1) * cw), yh = y + 2 * rh + snap(0.12 * t * k), lo = i % 2 ? th.block : PAL.white;
        box(x0, y, x1, y + rh, i % 2 ? PAL.white : th.block, 1, 0, 10, 0); box(x0, y + rh, x1, yh, lo, 1, 0, 10, 0); disc((x0 + x1) / 2, yh, (x1 - x0) / 2, lo, 1);
        box(x0, y, x1, y + 2.5, th.lip, 1, 0, 10, 0);
      }
      if (CINE) this.route = 0; for (const [by, cy] of [[r.y0 - 0.45 * t, r.y0 + 0.08 * t], [r.y0 + 0.75 * t, r.y0 + 0.3 * t]]) { rod(wx + d * 0.12 * t, by, wx + d * 0.32 * t, cy, PAL.gray); disc(wx + d * 0.1 * t, by, 0.09 * t, PAL.gray, 1); }   // (2.5D:
      // its rods flat, thin)
      const hl = (((Math.round(r.x0 / t) * 73856093) ^ (Math.round(r.y0 / t) * 19349663)) >>> 0) / 4294967296 < 1 / 3;   // (its lantern under one awning in three: the rule book's)
      if (w >= 3 * t && hl) {   // the lantern: grey caps, an orange body ribbed in black, on a hook
        const ly = r.y0 + 2 * rh + 0.2 * t, e = SPRING.anim - r.t, lsw = CINE && !POKE.still && r.t > 0 ? snap(Math.sin(e * 14) * 0.1 * t * (r.t / SPRING.anim)) : 0;   // (2.5D: it swings
        // as the awning bounces; its hook still)
        const lh = snap(wl ? r.x1 - 0.25 * t : r.x0 + 0.25 * t), lx = lh + lsw;
        box(lh - P / 2, r.y0 + 2 * rh, lh + P / 2, ly, PAL.gray, 1, 0, 10, 0); if (CINE) this.route = 4; box(snap(lx - 0.12 * t), ly, snap(lx + 0.12 * t), ly + 2 * P, PAL.gray, 1, 0, 10, 0);
        const l0 = ly + 2 * P, l1 = snap(ly + 0.66 * t);
        box(snap(lx - 0.22 * t), l0, snap(lx + 0.22 * t), l1, PAL.orange, 1, 0, 10, 0); if (CINE && this.cineL) this.cineL.push([lx, (l0 + l1) / 2, 1.7 * lv.R, 0.6, [1.0, 0.6, 0.25]]);   // (the cinematic fork: it glows)
        for (const f of [0.36, 0.68]) { const ry = snap(l0 + f * (l1 - l0)); box(snap(lx - 0.22 * t), ry, snap(lx + 0.22 * t), ry + P, PAL.black, 1, 0, 10, 0); }
        box(snap(lx - 0.12 * t), l1, snap(lx + 0.12 * t), l1 + 2 * P, PAL.gray, 1, 0, 10, 0);
      }
      if (CINE) this.route = 2;
      return true;
    } else if (r.plank) {   // a steel beam (the owner's pick, research/variants/tokyo-beam-1.png F): a flat grey bar, a bolt at each end, hung on two cables up to
      // the underside of what is over it (or out of sight), shackled grey (F's shackles were yellow: yellow is for what you take)
      box(r.x0, r.y0, r.x1, r.y1, PAL.gray, 1, 0, 10, 0); box(r.x0, r.y1 - P, r.x1, r.y1, PAL.black, 1, 0, 10, 2);
      for (const x of [r.x0 + 0.16 * t, r.x1 - 0.16 * t]) { const bx = snap(x), by = snap((r.y0 + r.y1) / 2); box(bx - P, by - P, bx + 2 * P, by + 2 * P, PAL.black, 1, 0, 10, 0); box(bx, by, bx + P, by + P, PAL.white, 1, 0, 10, 0); }
      for (const x of [r.x0 + 0.34 * t, r.x1 - 0.34 * t]) {
        let up = top; for (const q of lv.rects) if (q !== r && !q.gone && !q.move && q.x0 <= x && q.x1 >= x && q.y1 <= r.y0 && q.y1 > up) up = q.y1;
        const cx = snap(x), sy = r.y0 - 0.2 * t;
        if (CINE) this.route = 3; box(cx, up, cx + P, sy, PAL.gray, DIM, 0, 10, 0); if (CINE) this.route = 0; box(cx - P, sy, cx + 2 * P, sy + 0.1 * t, PAL.gray, 1, 0, 10, 0);   // the cable
        // (behind in 2.5D), its shackle (flat)
        for (const ax of [cx - P, cx + P]) box(ax, sy + 0.1 * t, ax + P, r.y0, PAL.gray, 1, 0, 10, 0);   // the clamp's arms
        if (CINE) this.route = 2;
      }
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
      } else for (const [on, wx, d] of [[wl, lv.l, 1], [wr, lv.r, -1]]) if (on) { if (CINE) this.route = 0; brace(wx, d, snap(r.y1) + P, snap(1.3 * t), 3 * P, th.block); if (CINE) this.route = 2; }   // a pixel
      // clear of the slab (flat in 2.5D: thin)
      // (nothing in Tokyo's campaign levels, its boss's arena aside, stands within 1.5 tiles under a wall's slab)
    }
    box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); return true;
  };
  if (CINE) { cineFaces(this, lv, cam, H, box); this.route = 0; }   // (the cinematic fork: the walls' faces over every far thing; the doors flat, the ledges deep)
  for (const b of lv.bubbles) if (seen(b.y0 - 10, b.y1)) door(b, b.kind);   // the ways into a shop or a stash, over the worlds' back layers: nothing covers them (owner)
  if (CINE) this.route = th.skazka ? 0 : 2;   // (the Dark Forest's floor flat: its top face a wide light strip in the dark, the rule book)
  if (lv.floor < bot) { box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 800, th.wall, 1, 0); box(lv.l - 2, lv.floor, lv.r + 2, lv.floor + 2.5, th.lip, 1, 0); }
  if (CINE) this.route = 2;
  const vaultSpan = (r) => {   // a vault's cracked floor from cage wall to cage wall: the slot rule (Level.place) cut it back from a wall its cage stands
    // at, so it is drawn across the gap it left (too narrow for the hero to pass)
    let a = -Infinity, b = Infinity;
    for (const q of lv.rects) if (q.cage && q !== r && q.y0 < r.y1 && q.y1 > r.y0) { if (q.x1 <= r.x0 + 1) a = Math.max(a, q.x1); else if (q.x0 >= r.x1 - 1) b = Math.min(b, q.x0); }
    return [a > -Infinity ? a : r.x0, b < Infinity ? b : r.x1];
  };
  for (const r of lv.rects) {
    if (r.gone || !seen(r.y0, r.y1)) continue;
    if (r.cage) {   // a vault's cage (the owner's pick, research/variants/tokyo-vault-1-px.png F; Level.place makes it this thin): blue posts, a white roof bar dotted
      // grey under it, and its floor: a plate dotted black, its top edge white, a notch in it where it is cracked (a glint of gold there now and then), rubble in
      // its corners, and three thin bars from it up to the roof, behind the coins
      const P = PIX.size, tl = lv.tile;
      if (r.crack) {
        const [x0, x1] = vaultSpan(r), cx = Math.round((x0 + x1) / 2 / P) * P, top = r.y1 - 2.7 * tl;
        for (const f of [0.25, 0.5, 0.75]) { const x = Math.round((x0 + (x1 - x0) * f) / P) * P - P; box(x, top, x + 2 * P, r.y0, th.block, 1, 0, 10, 0); }
        box(x0, r.y0, x1, r.y1, th.block, 1, 0, 10, 2); box(x0, r.y0, x1, r.y0 + 2.5, th.lip, 1, 1.25);
        box(cx - 2 * P, r.y0, cx + 2 * P, r.y1, PAL.black, 1, 0, 10, 0); box(cx - 3 * P, r.y0, cx - 2 * P, r.y1, PAL.white, 1, 0, 10, 0); box(cx + 2 * P, r.y0, cx + 3 * P, r.y1, PAL.white, 1, 0, 10, 0);
        if ((T * 1.3 + r.x0 * 0.01) % 2 < 0.25) box(cx - P, (r.y0 + r.y1) / 2 - P, cx + P, (r.y0 + r.y1) / 2 + P, INK.coin, 1, 0, 10, 0);
        for (const [a, d] of [[x0 + 0.12 * tl, 1], [x1 - 0.12 * tl, -1]]) for (const [u, v, w, h] of [[0, 0, 0.42, 0.14], [0.06, 0.14, 0.26, 0.12], [0.3, 0, 0.14, 0.08]]) {   // rubble
          const p0 = a + d * u * tl, p1 = a + d * (u + w) * tl; box(Math.round(Math.min(p0, p1) / P) * P, Math.round((r.y0 - (v + h) * tl) / P) * P, Math.round(Math.max(p0, p1) / P) * P, Math.round((r.y0 - v * tl) / P) * P, PAL.gray, 1, 0, 10, 0);
        }
      } else if (r.x1 - r.x0 < r.y1 - r.y0) { box(r.x0, r.y0, r.x1, r.y1, th.block, 1, 0, 10, 0); box(r.x0, r.y0, r.x1, r.y0 + 2.5, th.lip, 1, 1.25); }
      else { box(r.x0, r.y0, r.x1, r.y1 - P, PAL.white, 1, 0, 10, 0); box(r.x0, r.y1 - P, r.x1, r.y1, PAL.gray, 1, 0, 10, 4); }
      continue;
    }
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
    const own = !r.slick && (!r.crumble || r.cloud || th.village || th.sea || th.skazka || th.mines) && !r.crack && !(r.flash > 0), kit = own && ((th.town && townRect(r)) || (th.mines && mineRect(r)) || (th.fuji && fujiRect(r)) || (th.village && villageRect(r)) || (th.sea && seaRect(r)) || (th.skazka && skazkaRect(r)) || (th.panels && panelsRect(r)) || (th.glass && skyRect(r)) || (th.junk && junkRect(r)));   // a world's own look (townRect, villageRect); the overlays below stay
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
    if (r.moss && (th.village || th.sea || th.mines || th.fuji || th.skazka)) {   // the Village's moss under it (F's): a strip, no strands off it (owner: «убери эти зеленые висюльки»; the green you hold; see villageRect)
      box(r.x0 + ox, r.y1 - 0.12 * R, r.x1 + ox, r.y1 + 2 * kitP, th.moss, a, 0, 10, 0);
    } else if (r.moss) {   // moss under it, as on the walls: a strip and a fringe of tufts hanging off it
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
  if (th.town) for (const r of lv.rects) if (r.ac && r.gone && r.t < 1.5) { const oy = 20 * kitT * r.t * r.t; if (seen(r.y0 + oy, r.y0 + oy + 3 * kitT)) aircon(r, 0, oy); }   // an air conditioner falling off its wall
  this.route = 0;   // (the cinematic fork: the play again)
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
  const bonusEye = CINE && (CINE.bonus === 'B' || CINE.bonus === 'D'), bonusStack = CINE && CINE.bonus === 'C';   // (the cinematic fork: the bonuses' depth, see CINE.bonus)
  if (CINE) this.route = bonusEye ? 4 : 0;
  for (const c of lv.coins) {
    if (c.y < top || c.y > bot) continue;
    // a thick coin turning: its edge shows beside the face as it turns away, the rim and the face are shaded; all one size, a big one's worth too (owner)
    const r = cr, a = T * 4 + c.ph, cs = Math.cos(a), s = 0.2 + 0.8 * Math.abs(cs), edge = 0.22 * r * Math.sin(a) * (cs < 0 ? -1 : 1);
    const cy = c.y - (CINE ? cineRide(lv, c.x, c.y, r, cam, H) : 0);   // (the cinematic fork: riding its ledge's top face, see cineRide)
    const coin = (ox, oy, k) => { F(c.x + edge + ox, cy + oy, r * s + Math.abs(edge) * 0.5, 0, 0, r, INK.coinD, k, 9, 0); F(c.x + ox, cy + oy, r * s, 0, 0, r, INK.coinD, k, 9, 0);
      if (k === 1) { F(c.x - r * s * 0.04, cy - r * 0.04, r * s * 0.72, 0, 0, r * 0.72, INK.coin, 1, 9, 6); F(c.x - r * s * 0.3, cy - r * 0.34, r * s * 0.18, 0, 0, r * 0.16, INK.white, 1, 0); } };
    if (bonusStack) for (let q = 3; q >= 1; q--) coin(q * 0.7 * PIX.size, q * PIX.size, 1.62 - 0.07 * q);   // (C: a token's thickness, down and to the right)
    coin(0, 0, 1);
    const tw = (T + c.ph) % COIN.twinkle[1];
    if (c.v > 1 && tw < COIN.twinkle[0]) {   // a five a white twinkle off its top right, a cross growing and going (owner: «у пятёрки мигает белая искорка»; the coins all one size)
      const P = PIX.size, q = (v) => Math.round(v / P) * P, L = Math.max(1, Math.round(Math.sin((tw / COIN.twinkle[0]) * Math.PI) * 2.5)) * P, sx = q(c.x + 0.62 * r) + P / 2, sy = q(cy - 0.62 * r) + P / 2;
      F(sx, sy, L + P / 2, 0, 0, P / 2, INK.white, 1, 5, L + P / 2, P / 2, 0); F(sx, sy, P / 2, 0, 0, L + P / 2, INK.white, 1, 5, P / 2, L + P / 2, 0);
    }
  }
  if (CINE) this.route = 0;
  const spr = (rows, x, y, ink, k, top) => {   // a CRITTER picture, k game pixels a dot, centred on x, its top (or bottom) at y
    const s = PIX.size * k, x0 = Math.round(x / PIX.size) * PIX.size - (rows[0].length * s) / 2, y0 = Math.round(y / PIX.size) * PIX.size - (top ? 0 : rows.length * s);
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') box(x0 + i * s, y0 + j * s, x0 + (i + 1) * s, y0 + (j + 1) * s, row[i] === 'w' ? INK.white : row[i] === 'k' ? PAL.black : ink, 1, 0, 10, 0); });
  };
  const ck = Math.max(1, Math.round((0.11 * R) / PIX.size));
  for (const f of lv.folk) if (seen(f.y - R, f.y + R)) {
    if (f.kind === 'bat') spr(f.fly ? (Math.floor(f.t * 10) % 2 ? CRITTER.batUp : CRITTER.batDown) : CRITTER.bat, f.x, f.y, th.wall, ck, !f.fly);
    else if (f.kind === 'bug') spr(Math.floor(f.t * (f.run ? 14 : 4)) % 2 ? CRITTER.bug : CRITTER.bug2, f.x, f.y, th.wall, ck, false);
    else if (f.kind === 'crow') spr(CRITTER[(f.fly ? (Math.floor(f.t * 9) % 2 ? 'crowUp' : 'crowDown') : 'crow') + ((f.fly ? f.vx : f.dir) > 0 ? '' : 'L')], f.x, f.y, th.wall, 1, false);   // a game pixel a dot: about a tile and a half long
  }
  if (CINE) this.route = bonusEye ? 4 : 0;
  for (const p of lv.pickups) {   // a shop's items: their pictures, bobbing a game pixel at a time, in a glow
    const y = p.y - (CINE ? cineRide(lv, p.x, p.y, p.r, cam, H) : 0) + Math.round(Math.sin(T * 2.4 + p.x) * 1.5) * PIX.size, a = p.sold ? 0.25 : 1;   // (the fork: riding its ledge's face)
    if (bonusEye) this.route = 3; F(p.x, y, p.r * 2, 0, 0, p.r * 2, p.item.color, 0.25 * a, 1); if (bonusEye) this.route = 4;   // (B, D: its glow behind it, not dotted over it)
    if (bonusStack && a === 1) for (let q = 3; q >= 1; q--) iconSpin(p.item.id, p.x + q * 0.7 * PIX.size, y + q * PIX.size, 1.62 - 0.07 * q, 2.4, T * 1.8 + p.x * 0.05);   // (C: its thickness)
    iconSpin(p.item.id, p.x, y, a, 2.4, T * 1.8 + p.x * 0.05);   // a fifth bigger than at first (user), turning
  }
  for (const p of lv.fizz) if (!p.taken && seen(p.y - p.r, p.y + p.r)) {   // candies, bobbing in a glow
    const y = p.y - (CINE ? cineRide(lv, p.x, p.y, p.r, cam, H) : 0) + Math.round(Math.sin(T * 3 + p.x) * 1.5) * PIX.size;   // (the fork: riding its ledge's face)
    const k = Math.max(1, Math.round((1.5 * R) / (12 * PIX.size))), gr = 0.65 * 12 * k * PIX.size;   // about 1.5 R across, as on a phone: a fixed size was half that on a desktop (user)
    if (bonusEye) this.route = 3; F(p.x, y, gr, 0, 0, gr, INK.coin, 0.3, 1); if (bonusEye) this.route = 4; if (bonusStack) for (let q = 3; q >= 1; q--) iconSpin(p.kind, p.x + q * 0.7 * PIX.size, y + q * PIX.size, 1.62 - 0.07 * q, k, T * 2.2 + p.x * 0.05); iconSpin(p.kind, p.x, y, 1, k, T * 2.2 + p.x * 0.05);
  }
  if (CINE) this.route = 0;
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
  for (const sw of lv.seesaws) if (seen(sw.y0, sw.y1)) {   // a seesaw (SEESAW): its post from the block under it, a stone at its foot, its beam under the seats, the pin
    const t = lv.tile, a = seatAt(sw, -1), b = seatAt(sw, 1), dy = 0.45 * t;
    box(snap(sw.px - 0.2 * t), snap(sw.py), snap(sw.px + 0.2 * t), snap(sw.foot), th.plank, 1, 0, 10, 0); box(snap(sw.px - 0.55 * t), snap(sw.foot - 0.3 * t), snap(sw.px + 0.55 * t), snap(sw.foot), PAL.gray, 1, 0, 10, 0);
    line(a.x, a.y + dy, b.x, b.y + dy, th.plank, 1, (0.3 * t) / kitP); disc(sw.px, sw.py + 0.15 * t, 0.16 * t, PAL.gray, 1);
  }
  for (const kn of lv.kines) if (seen(kn.y0, kn.y1)) {   // a pestle for mochi (MOCHI): its post, its lever with a stone on its short end, its head with an iron band
    const t = lv.tile, hw = 0.5 * MOCHI.head * t, hh = 0.5 * MOCHI.head * t, st = mochiAt(kn, T), Hb = g.hero;
    let yb = st.y;   // the head's foot, on a flat hero under it (as on the mochi)
    if (g.flatT > 0 && Hb.maxX > kn.x - hw && Hb.minX < kn.x + hw && Hb.minY < yb && Hb.maxY > kn.yUp) yb = Math.min(yb, Hb.minY);
    const ex = kn.x + st.shake, ey = yb - hh, py = (kn.yHit + kn.yUp) / 2 - hh, ax = ex - kn.px, ay = ey - py, al = Math.hypot(ax, ay) || 1, sx = kn.px - (ax / al) * 1.1 * t, sy = py - (ay / al) * 1.1 * t;
    box(snap(kn.px - 0.16 * t), snap(py), snap(kn.px + 0.16 * t), kn.foot, th.plank, 1, 0, 10, 0);
    line(sx, sy, ex, ey, th.plank, 1, (0.34 * t) / kitP);
    box(snap(sx - 0.32 * t), snap(sy - 0.3 * t), snap(sx + 0.32 * t), snap(sy + 0.3 * t), PAL.gray, 1, 0, 10, 0); disc(kn.px, py, 0.14 * t, PAL.gray, 1);
    box(snap(ex - hw), snap(ey), snap(ex + hw), snap(yb), th.plank, 1, 0, 10, 1); box(snap(ex - hw), snap(ey + 0.35 * hh), snap(ex + hw), snap(ey + 0.35 * hh) + 2 * kitP, PAL.gray, 1, 0, 10, 0);
    box(snap(ex - hw), snap(yb) - kitP, snap(ex + hw), snap(yb), th.plank, 1, 0, 10, 4);
  }
  if (lv.rc) for (const p of lv.placed) if (CHUNKS[p.id].kind === 'fork' && seen(p.y0, p.y1)) {   // a fork's sign (owner: «Вторая дорога… развилки уже есть, их надо сделать
    // заметнее»): a board on two cords under its middle wall, an arrow to the risky way, on it a big coin and a spike (yellow: to take; red: danger)
    if (p.sign === undefined) p.sign = forkSign(lv, p);
    const sg = p.sign; if (!sg) continue;
    const t = lv.tile, d = sg.d, bw = 0.85 * t, bh = 0.36 * t, cx = sg.x, cy = sg.y + 0.8 * t;
    for (const e of [-1, 1]) box(snap(cx + e * 0.55 * t), snap(sg.y), snap(cx + e * 0.55 * t) + kitP, snap(cy - bh), PAL.gray, 1, 0, 10, 0);
    box(snap(cx - bw), snap(cy - bh), snap(cx + bw), snap(cy + bh), th.plank, 1, 0, 10, 0);
    F(cx + d * (bw + 0.24 * t), cy, 0, 1.4 * bh, -d * 0.24 * t, 0, th.plank, 1, 6, 1.4 * bh, 0.24 * t, 2.8 * bh);
    disc(cx - d * 0.32 * t, cy, 0.24 * t, INK.coin, 1); disc(cx - d * 0.32 * t - 0.07 * t, cy - 0.08 * t, 0.07 * t, PAL.white, 1);
    F(cx + d * 0.34 * t, cy + 0.02 * t, 0.2 * t, 0, 0, 0.2 * t, INK.spike, 1, 6, 0.2 * t, 0.2 * t, 0.4 * t);
  }
  for (const fw of lv.fireWalls) if (seen(fw.y0, fw.y1)) {   // fire on a wall (FIREWALL): a scorched strip on it with embers; they glow brighter before it bursts out in
    // tongues of flame along it, flickering
    const u = (T + fw.ph) % (FIREWALL.on + FIREWALL.off), on = u >= FIREWALL.off, warn = !on && u >= FIREWALL.off - FIREWALL.warn, d = fw.side === 1 ? 1 : -1, wx = fw.side === 1 ? lv.l : lv.r, t = lv.tile, P = PIX.size;
    box(snap(Math.min(wx, wx + d * 0.18 * t)), snap(fw.y0), snap(Math.max(wx, wx + d * 0.18 * t)), snap(fw.y1), INK.fire, warn || on ? 1 : 0.5, 0, 10, 0);   // its seam, smouldering red (seen
    // before it burns: which stretch of the wall is the fire's), lit up when it is about to
    for (let y = fw.y0 + 0.5 * t, k = 0; y < fw.y1 - 0.2 * t; y += 1.1 * t, k++) { const ex = snap(wx + d * 0.28 * t) - (d < 0 ? 2 * P : 0); box(ex, snap(y), ex + 2 * P, snap(y) + 2 * P, INK.flame, warn ? (Math.floor(T * 5 + k) % 2 ? 1 : 0.5) : on ? 1 : 0.45, 0, 10, 0); }   // its embers
    if (on) {
      const n = Math.max(1, Math.round((fw.y1 - fw.y0) / (0.9 * t))), hw = (fw.y1 - fw.y0) / n / 2;
      for (let i = 0; i < n; i++) {
        const y = fw.y0 + (i + 0.5) * 2 * hw, len = (0.55 + 0.45 * Math.abs(Math.sin(T * 13 + i * 1.7))) * FIREWALL.reach * t;
        F(wx + (d * len) / 2, y, 0, hw, (-d * len) / 2, 0, INK.fire, 1, 6, hw, len / 2, 2 * hw);
        F(wx + d * len * 0.3, y, 0, 0.6 * hw, -d * len * 0.3, 0, INK.flame, 1, 6, 0.6 * hw, len * 0.3, 1.2 * hw);
      }
    }
  }
  for (const w of lv.winds) if (seen(w.y0, w.y1)) {   // a gust's way (WIND): its koinobori; sakura petals drifting its way before it, flying through it, tumbling, white streaks with them
    const u = (T + w.ph) % (WIND.on + WIND.off), s = u - (WIND.off - WIND.warn), d0 = w.dir, sc = lv.tile;   // (the kit's carp's size)
    const k = u < 0.6 ? 1 - u / 0.6 : s < 0 ? 0 : s < WIND.warn ? (0.6 * s) / WIND.warn : 0.6 + 0.4 * Math.min(1, (s - WIND.warn) / 0.25);   // how full: limp, filling, flying, then falling back
    let cx = w.px + d0 * 0.55 * lv.tile, cy = w.py;
    const tilt = (i) => (1 - k) * (Math.PI / 2) * (0.9 + 0.05 * i) + k * (0.08 + Math.sin(T * 9 - i * 1.3) * (0.06 + 0.07 * i));   // a part's slope: down, or along the wind, waving
    line(w.px, cy, cx, cy, PAL.gray, 1, 2);   // the pole, the mouth's hoop; then the kit's blue carp (scales dotted) down its length: hanging, or along the wind
    { const a = tilt(0), hw = 0.45 * sc * (0.45 + 0.55 * k); line(cx - d0 * Math.sin(a) * hw, cy + Math.cos(a) * hw, cx + d0 * Math.sin(a) * hw, cy - Math.cos(a) * hw, PAL.gray, 1, 1.5); }
    for (const [i, L, hh] of [[0, 0.6, 0.45], [1, 0.88, 0.38], [2, 0.7, 0.28]]) {
      const a = tilt(i), hw = hh * sc * (0.45 + 0.55 * k), nx = cx + d0 * Math.cos(a) * L * sc, ny = cy + Math.sin(a) * L * sc;
      line(cx, cy, nx, ny, PAL.blue, 1, (2 * hw) / kitP, 1);
      if (i === 0) { const ex = cx + d0 * Math.cos(a) * 0.55 * L * sc + d0 * Math.sin(a) * 0.08 * sc, ey = cy + Math.sin(a) * 0.55 * L * sc - Math.cos(a) * 0.08 * sc; disc(ex, ey, 0.2 * sc, PAL.gray, 1); disc(ex, ey, 0.09 * sc, PAL.black, 1); }   // its eye
      if (i === 2) for (const e of [-0.45, 0.45]) line(nx, ny, nx + d0 * Math.cos(a + e) * 0.5 * sc, ny + Math.sin(a + e) * 0.5 * sc, PAL.blue, 1, (0.2 * sc) / kitP, 1);   // its tail, forked
      cx = nx; cy = ny;
    }
    if (s < 0) continue;   // the petals, since they set off
    const Wd = lv.r - lv.l, P = PIX.size, sn = (v) => Math.round(v / P) * P, gust = s >= WIND.warn;
    const d = 3 * R * Math.min(s, WIND.warn) + 9 * R * Math.max(0, s - WIND.warn);   // how far they have come: slowly, then at the gust's pace
    for (let i = 0; i < 8; i++) {
      const f = (i * 0.618034) % 1, x = sn(lv.l + ((((d * w.dir + i * 0.37 * Wd) % Wd) + Wd) % Wd)), y = sn(w.y0 + (0.1 + 0.8 * f) * (w.y1 - w.y0) + Math.sin(T * 3 + i) * 0.3 * R);
      const flat = Math.sin(T * 7 + i * 2) > 0;   // on its side, then on its edge
      box(x, y, x + (flat ? 3 : 2) * P, y + (flat ? 2 : 3) * P, PAL.purple, 1, 0, 10, 0);
      if (gust && i % 2 === 0) box(sn(x - w.dir * 1.6 * R), y + 4 * P, sn(x - w.dir * 0.4 * R), y + 5 * P, INK.white, 0.6, 0, 10, 0);
    }
  }
  for (const rg of lv.rings) if (!rg.used && seen(rg.y - 2 * R, rg.y + 2 * R)) {   // a boost ring: gold, two rims, lights going round it, a glow
    const r = RING.r * R * (1 + 0.04 * Math.sin(T * 5));
    F(rg.x, rg.y, r * 1.5, 0, 0, r * 1.5, INK.coin, 0.25, 1); F(rg.x, rg.y, r, 0, 0, r, INK.coin, 1, 4); F(rg.x, rg.y, r * 0.78, 0, 0, r * 0.78, PAL.white, 1, 4);
    for (let k = 0; k < 6; k++) { const a = T * 3 + (k * TAU) / 6; disc(rg.x + Math.cos(a) * r * 0.9, rg.y + Math.sin(a) * r * 0.9, 0.09 * R, k & 1 ? INK.white : INK.coinD, 1); }
  }
  for (const a of lv.arenas) if (a.drops) for (const s of a.drops) if (seen(s.y - 2 * R, s.y + 2 * R) && Math.floor(T * 5) % 2 === 0) {   // an arena's next enemy: where it will come (Game.arenaDrop), a red ring
    const rr = ENEMY[s.type].size * R * (s.big ? MINI.size : 1), P = PIX.size, x = Math.round(s.x / P) * P;   // with a mark in it, blinking 2.5 times a second as a forest enemy warns (digest: 3 at most)
    F(s.x, s.y, rr, 0, 0, rr, INK.spike, 1, 4);
    box(x - P, s.y - 0.55 * rr, x + P, s.y + 0.1 * rr, INK.spike, 1, 0, 10, 0); box(x - P, s.y + 0.3 * rr, x + P, s.y + 0.3 * rr + 2 * P, INK.spike, 1, 0, 10, 0);
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
  // A boss's look (LOOKS; owner 2026-10-20: its yokai, as its sheet draws it): its drawing on its body (LOOK_FACE), turned the way it goes;
  // round it, behind it, only what its setting hangs it on: the tram's wire, the spider's thread, the crane's cable and hook.
  const look = (bs, front) => {   // a boss's look round it: the way it faces, and what its setting hangs it on
    const b = bs.body, k = bs.look.slice(0, -2), df = bs.def || {}, x = b.cx, P = PIX.size, gr = PAL.gray;
    const d = df.rail || df.slide ? bs.dir || 1 : Math.sign(g.hero.cx - x) || 1;   // the way it faces: the way it rides or slides, else at the hero
    if (front) return;
    b.lookDir = d;   // (its drawing on it turns too: LOOK_FACE)
    if (k === 'tram') { const wy = b.minY - 1.15 * R; box(lv.l, wy, lv.r, wy + P, gr, 1, 0, 10, 0); }   // the overhead wire its pantograph (in its drawing) runs on
    else if (k === 'koschei' && bs.hp === 1) { const ny = b.minY - 1.0 * R + Math.sin(T * 3) * 0.08 * R, nx = Math.round(x / P) * P; F(nx + P / 2, ny, 0.55 * R, 0, 0, 0.8 * R, gr, 0.18, 1); box(nx, ny - 0.6 * R, nx + P, ny + 0.45 * R, gr, 1, 0, 10, 0); box(nx - P, ny - 0.76 * R, nx + 2 * P, ny - 0.5 * R, gr, 1, 0, 10, 0); box(nx, ny - 0.7 * R, nx + P, ny - 0.56 * R, INK.dark, 1, 0, 10, 0); if (Math.floor(T * 2) % 2) box(nx, ny + 0.3 * R, nx + P, ny + 0.38 * R, PAL.white, 1, 0, 10, 0); }   // his last heart: the needle his death is in, over his crown
    else if (k === 'cart') box(Math.round(x / P) * P, top, Math.round(x / P) * P + P, b.minY + 0.3 * R, PAL.white, 1, 0, 10, 0);   // the spider's thread, from up out of sight into its head
    else if (k === 'crane') { const hy = b.minY - 0.75 * R, hx = Math.round(x / P) * P; box(hx - P, top, hx + P, hy - 0.3 * R, gr, 1, 0, 10, 0); box(x - 0.22 * R, hy - 0.3 * R, x + 0.22 * R, hy - 0.05 * R, gr, 1, 0, 10, 0); F(x, hy + 0.12 * R, 0.17 * R, 0, 0, 0.17 * R, gr, 1, 4); }   // the crane's cable out of the sky, its block and hook
  };
  // The Dark Forest's enemies (FOREST_V): a Kikimora on the wall, a Leshy circling, each as its sheet draws it on its soft body (FOE_SPRITES).
  const forestFoe = (e) => {   // a forest enemy: its look (FOE_SPRITES, on it) and the way it faces: off its wall (a Kikimora), at the hero (a Leshy)
    const b = e.body, t = e.type, V = FOREST_V[t];
    b.look = t + '-' + V; b.lookDir = t === 'kikimora' ? (b.cx < (lv.l + lv.r) / 2 ? 1 : -1) : Math.sign(g.hero.cx - b.cx) || 1;
  };
  if (lv.boss && !lv.boss.dead && lv.boss.look) look(lv.boss, false);   // its look's parts behind it
  for (const e of lv.enemies) if (FOREST_V[e.type]) forestFoe(e);   // a forest enemy's look, before the bodies are drawn
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
    if (s.bone) { const an = T * 7 + s.x * 0.05, ca = Math.cos(an) * s.r, sa = Math.sin(an) * s.r; F(s.x, s.y, s.r * 1.8, 0, 0, s.r * 1.8, INK.spike, 0.3, 1); line(s.x - ca, s.y - sa, s.x + ca, s.y + sa, INK.spike, 1, 2); for (const q of [-1, 1]) for (const p of [-1, 1]) disc(s.x + q * ca + p * 0.35 * sa, s.y + q * sa - p * 0.35 * ca, 0.32 * s.r, INK.spike, 1); continue; }   // Koschei's: a bone, spinning, red
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
  this.kolobok = !!th.skazka;   // the Dark Forest's hero a Kolobok (see writeFace)
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
  for (const e of lv.enemies) if (e.over && seen(e.body.minY - 2 * R, e.body.maxY)) {   // one that can be stomped, the hero over it (STOMP, Game.frame): a white chevron
    // over it, bobbing, «land here» (tester: «вот этой границы хитбокса врагов я до конца понять не смог»)
    const b = e.body, y = b.minY - 0.6 * R + Math.round(Math.sin(T * 6) * 1.5) * PIX.size, hw = 0.3 * R, hd = 0.2 * R;
    F(b.cx, y, hw, 0, 0, -hd, PAL.white, 1, 6, hw, hd, 2 * hw);
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
  if (bs && !bs.dead && bs.look) look(bs, true);   // its look's parts before it (LOOKS), instead of what is below
  else if (bs && !bs.dead && bs.def && bs.def.rat) {   // the Rat King's round ears, its tail
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
  if (g.power('bubble') && (g.gunT > 1 || Math.floor(T * 5) % 2 === 0)) {   // a bubble round the hero (BUBBLE): thin purple, wobbling, a white shine; blinking its last second
    const rr = BUBBLE.size * R * (1 + 0.04 * Math.sin(T * 6));
    F(hero.cx, hero.cy, rr, 0, 0, rr, PAL.purple, 1, 4); disc(hero.cx - 0.6 * rr, hero.cy - 0.6 * rr, 0.1 * rr, INK.white, 1);   // (no glow over it: it dotted the hero)
  }
  if (g.state === 'play' && g.air > 0 && g.sinceContact > JUMP.coyote) for (let k = 0; k < g.air; k++)   // in the air: the jumps it has left
    disc(hero.cx + (k - (g.air - 1) / 2) * 0.5 * R, hero.maxY + 0.42 * R, (g.power('smash') ? 0.22 : 0.15) * R, g.power('smash') ? INK.flame : INK.white, 1);   // orange: the next one rams
  for (let k = 0; k < nDots; k++) { const u = k / Math.max(1, JUMP.dots - 1); disc(dots[2 * k], dots[2 * k + 1], (2.4 - 1.2 * u) * PIX.size, INK.white, 1); }   // the slingshot's arc: solid dots that shrink (tiny see-through ones would dither to crumbs)
  if (CINE) cineMotes(this, g, lv, cam, H, box, disc, T);
  const nFront = this.nf - front;
  gl.bindVertexArray(null);
  this.upload(gl.ARRAY_BUFFER, this.vbo, this.vtx, this.nv * 10, 'vboCap');
  if (this.idxDirty) { this.upload(gl.ELEMENT_ARRAY_BUFFER, this.ebo, this.idx, this.ni, 'eboCap'); this.idxSig = sig; }
  const nAll = CINE ? this.cineAppend() : this.nf;   // (first: the fork's append may move fdata to a bigger store)
  this.upload(gl.ARRAY_BUFFER, this.fbo, this.fdata, nAll * 14, 'fboCap');
  const P = PIX.size, sx = Math.round(shake.x / P) * P, sy = Math.round((shake.y - cam) / P) * P;   // the camera, in whole game pixels
  const [lw, lh] = this.low, grid = (u) => gl.uniform2f(u.uGrid, -sx / P, lh - sy / P);
  gl.bindFramebuffer(gl.FRAMEBUFFER, CINE ? this.cine.far.fb : this.target.fb);   // (the cinematic fork: the backdrop into what is behind)
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
  if (CINE) { this.drawFeat(this.farStart, this.nFar); gl.bindFramebuffer(gl.FRAMEBUFFER, this.cine.st.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.drawFeat(this.stStart, this.nSt); gl.bindFramebuffer(gl.FRAMEBUFFER, this.cine.sm.fb); gl.clear(gl.COLOR_BUFFER_BIT); this.drawFeat(this.smStart, this.nSm); gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fb); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT); }   // (what is behind, the structures on nothing, then the play on nothing)
  this.drawFeat(0, back);
  gl.useProgram(ps.p);
  gl.uniform2f(ps.u.uView, W, H); gl.uniform2f(ps.u.uShake, sx, sy); grid(ps.u);
  gl.uniform2f(ps.u.uOffset, 0, RENDER.shadowOffset); gl.uniform1f(ps.u.uShadowA, RENDER.shadowA);
  gl.bindVertexArray(this.bodyVao);
  for (const r of this.ranges) if (!BOSS_FIT[r.b.look]) gl.drawElements(gl.TRIANGLES, r.sCount, gl.UNSIGNED_INT, r.sStart * 4);   // (a boss its sheet's drawing: no body, no shadow; see below)
  gl.useProgram(pb.p);
  gl.uniform2f(pb.u.uView, W, H); gl.uniform2f(pb.u.uShake, sx, sy); gl.uniform2f(pb.u.uOffset, 0, 0); grid(pb.u);
  for (const r of this.ranges) {
    gl.useProgram(pb.p);
    gl.bindVertexArray(this.bodyVao);
    const kb = this.kolobok && r.b === g.hero && r.b.color.id === save.color, col = kb ? KOLOBOK : r.b.color;   // (not while it dies or under a rainbow)
    gl.uniform3fv(pb.u.uBase, col.base); gl.uniform3fv(pb.u.uDeep, col.deep); gl.uniform3fv(pb.u.uLine, kb ? PAL.white : PAL.black); gl.uniform2f(pb.u.uOrigin, Math.round(r.b.cx / P), Math.round(r.b.cy / P)); gl.uniform3fv(pb.u.uPaint, r.b.paint || PAINT_ALL);
    if (!BOSS_FIT[r.b.look]) {   // the target always has a stencil (a boss its sheet's drawing: only that on its body, the body unseen)
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
  if (lv.dark) {   // the lights, nearest the hero first, at most 32
    const L = this.darkBuf, Rp = R / P;
    let n = 0;
    const light = (x, y, r0, r1) => { if (n < 32 && y > top - r1 * R && y < bot + r1 * R) { L.set([x / P, y / P, r0 * Rp, r1 * Rp], n * 4); n++; } };   // (r0, r1 in R: one off the screen whose glow reaches in counts)
    const breath = 1 + 0.03 * Math.sin(T * 2.2);
    light(hero.cx, hero.cy, 4.5 * breath, 7.5 * breath);
    if (lv.boss && !lv.boss.dead) { const b = lv.boss.body, s = ((lv.boss.state === 'warn' ? 1.3 : 1) * b.R) / R; light(b.cx, b.cy, 0.85 * s, 1.7 * s); }   // a boss in the dark (Koschei's arena) by its own glow, his whole drawing; more as it warns
    if (lv.crossing) { const xg = lv.crossing, on = xg.state !== 'rest'; for (const x of [lv.l + 0.5 * R, lv.r - 0.5 * R]) light(x, xg.y0 - 0.2 * R, on ? 1.6 : 0.7, on ? 4 : 1.8); if (xg.state === 'pass') light(Math.min(xg.x, lv.r), (xg.y0 + xg.y1) / 2, 2.2, 5); }   // a crossing's lamps (bright while they flash), the train's headlight
    if (lv.portal) light(lv.portal.x, lv.portal.y, 2, 4);
    for (const s of lv.shots) light(s.x, s.y, 0.5, 1.4);   // blobs, the fire's and the spitters'
    for (const b of lv.bubbles) light(b.x, b.y, 1.2, 2.6);
    for (const p of lv.fizz) if (!p.taken) light(p.x, p.y, 0.8, 2);
    if (lv.neonLit) for (const [k] of lv.neonLit) { const s = neonSign(lv, k); if (s) light((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 1.2, 3.4); }   // Tokyo's lit neon
    for (const sp of lv.spots) if (!sp.used) light(sp.x, sp.y, 1.4, 3.2);   // the flip side's pools glow (its way back out)
    for (const [x, y, r0 = 0.9, r1 = 2.6] of vlamps) light(x, y, r0, r1);   // the Village's stone lanterns, the Dark Forest's fences, candles and moon (see their kits)
    for (const r of lv.near(top, bot)) if (r.key) light((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 1, 2.6);   // a gate's keystone glows
    const near = (o) => (o.x - hero.cx) ** 2 + (o.y - hero.cy) ** 2;
    for (const c of lv.coins.slice().sort((a, b) => near(a) - near(b))) light(c.x, c.y - (CINE ? cineRide(lv, c.x, c.y, COIN.r * R, cam, H) : 0), 0.5, 1.3);   // (the fork: where it is drawn)
    const pd = this.pDark;
    gl.useProgram(pd.p); grid(pd.u);
    gl.uniform4fv(pd.u['uLights[0]'], L); gl.uniform1i(pd.u.uN, n); gl.uniform2f(pd.u.uFire, lv.fire ? lv.fire.y / P : 1e9, (3 * R) / P);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindVertexArray(null);
  if (CINE) { this.cinePost(g, lv, sx, sy, vlamps); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }   // (the cinematic fork: see cine.js)
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target.fb);   // up onto the canvas, pixel for pixel
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  gl.blitFramebuffer(0, 0, lw, lh, 0, 0, this.canvas.width, this.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};
