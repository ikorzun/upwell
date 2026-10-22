"use strict";
/* ─────────────────────────────────────────────────────────────
   Upwell bot — a test player, not part of the game. Load it into a
   running page (see the end of the file) and call __bot.level(world,
   stage, seed): it plays that level with the game's own physics and
   controls. At each decision it saves the whole state, tries every
   move in PLANS from it, then every move again after the best few
   (two moves deep), puts the state back and plays the first move of
   the best line. Math.random is seeded and saved with the state, so a
   tried move replays exactly. It reports how the climb went: time,
   hearts lost, where it got stuck and in which chunk. A boss level
   (no way out: its boss is the level) it plays to the end, won or
   lost, or to BOSS_T, scored by the hearts its tries cost and deal
   and by where the boss's way of being beaten wants the hero (bossScore).
   ───────────────────────────────────────────────────────────── */
(() => {
const g = __up.game, DT = 1 / 120, MOVE_T = 0.5, BEAM = 5, STUCK_T = 14, LIMIT_T = 300, BOSS_T = 180;

// moves: hold `dir`; maybe press jump at `jumpAt` for `hold` s, then hold nothing for
// `wait` s and `dir2` after that; `down` presses down at the start
const PLANS = [];
for (const dir of [-1, 0, 1]) {
  PLANS.push({ dir, jumpAt: -1 });
  for (const dir2 of [-1, 0, 1]) {
    PLANS.push({ dir, jumpAt: 0, hold: 0.5, wait: 0, dir2 });
    PLANS.push({ dir, jumpAt: 0.15, hold: 0.5, wait: 0, dir2 });
    PLANS.push({ dir, jumpAt: 0, hold: 0.5, wait: 0.22, dir2 });   // straight up first: around an overhang
  }
  PLANS.push({ dir, jumpAt: 0, hold: 0.1, wait: 0, dir2: dir });
  PLANS.push({ dir, down: true, jumpAt: -1 });
}

// ── a seeded Math.random, part of the saved state ──
let seed = 1;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── saving and restoring everything a step can change ──
const GAME_KEYS = ['hp', 'maxHp', 'invuln', 'sinceContact', 'queueT', 'air', 'hitstop', 'touch', 'queued', 'rising', 'combo', 'coins',
  'kills', 'bestCombo', 'levelM', 'idleT', 'gunT', 'gunMax', 'fallV', 'landV', 'landT', 'landUsed', 'missed', 'rebounded', 'flatT', 'dashT', 'dashCD', 'mantleCD', 'airDash', 'pow', 'ram', 'climbed', 'state', 'stateT', 'winT', 'lv', 'well', 'door', 'startY', 'freed', 'crouch', 'noteK', 'noteT', 'bonusT', 'lastBy', 'kept', 'swarm'];   // (a bonus level's clock too: tries ran it out)
const copyItem = (e) => (e && typeof e === 'object' && !('x0' in e) ? Object.assign({}, e) : e);   // boxes stay shared
function snapBody(b) {
  const o = {};
  for (const k in b) {
    const v = b[k];
    if (v && ArrayBuffer.isView(v)) o[k] = v.slice();
    else if (Array.isArray(v)) o[k] = v.map(copyItem);
    else if (v && typeof v === 'object' && (k === 'face' || k === 'up')) o[k] = Object.assign({}, v);
    else o[k] = v;
  }
  return o;
}
function restoreBody(b, o) {
  for (const k in o) {
    const v = o[k];
    if (v && ArrayBuffer.isView(v)) { if (b[k] && b[k].length === v.length) b[k].set(v); else b[k] = v.slice(); }
    else if (Array.isArray(v)) b[k] = v.map(copyItem);
    else if (v && typeof v === 'object' && (k === 'face' || k === 'up')) Object.assign(b[k], v);
    else b[k] = v;
  }
}
function snap() {
  const lv = g.lv;
  return {
    g: GAME_KEYS.map((k) => g[k]), safes: g.safes.map((s) => Object.assign({}, s)), seed,
    input: [input.left, input.right, input.down, input.jump], hero: snapBody(g.hero),
    cam: lv.cam, t: lv.t, rects: lv.rects.slice(), rs: lv.rects.map((r) => [r.x0, r.x1, r.dx, r.gone, r.t, r.hit, r.crumbling, r.safe, r.move ? r.move.v : 0, r.broke, r.paid, r.crack]),
    coins: lv.coins.map((c) => Object.assign({}, c)), spawns: lv.spawns.slice(), shots: lv.shots.map((q) => Object.assign({}, q)),
    counts: [lv.coinsTaken, lv.foeKilled, lv.foeTotal], fizz: lv.fizz.map((p) => p.taken), fire: lv.fire && { y: lv.fire.y, spitT: lv.fire.spitT, warn: lv.fire.warn && Object.assign({}, lv.fire.warn) }, bubbles: lv.bubbles.map((b) => b.cd),
    enemies: lv.enemies.map((e) => ({ e, f: Object.fromEntries(Object.entries(e).filter(([k, v]) => typeof v !== 'object' || k === 'to' || k === 'from')), b: snapBody(e.body) })),   // (a worm's way over too: replaced, never changed)
    folk: lv.folk.map((f) => ({ f, o: Object.assign({}, f), b: f.body && snapBody(f.body) })), pickups: lv.pickups.slice(), sold: lv.pickups.map((p) => p.sold),
    icicles: lv.icicles.map((c) => Object.assign({}, c)), arenas: lv.arenas.map((a) => ({ a, o: Object.assign({}, a, { foes: a.foes.slice() }) })),
    cross: lv.crossing && Object.assign({}, lv.crossing),   // the level crossing's clock and train (the tries ran it on)
    tasks: (lv.tasks || []).map((q) => q.n), neon: new Map(lv.neonLit), tended: new Map(lv.tended), taken: lv.taken && lv.taken.slice(), gone: lv.gone && lv.gone.slice(),   // the level's tasks so far, the neon lit, the kits' things tended (a try did it)
    boss: lv.boss && { f: Object.fromEntries(Object.entries(lv.boss).filter(([, v]) => typeof v !== 'object')), b: snapBody(lv.boss.body) }, crumble: [lv.crumbleTime, lv.crumbleBack],   // its hearts, turn and clocks; the Minecart's quicker bridges
    rocket: g.rocket && Object.assign({}, g.rocket), rings: lv.rings.map((r) => [r, r.used]),   // a flight under way (an astro's, a boost ring's; its band moves up) and the rings flown through
  };
}
function restore(S) {
  GAME_KEYS.forEach((k, i) => { g[k] = S.g[i]; });
  g.safes = S.safes.map((s) => Object.assign({}, s)); seed = S.seed;
  [input.left, input.right, input.down, input.jump] = S.input;
  restoreBody(g.hero, S.hero);
  const lv = g.lv;
  lv.cam = S.cam; lv.t = S.t; lv.rects = S.rects.slice();
  S.rects.forEach((r, i) => { const v = S.rs[i]; r.x0 = v[0]; r.x1 = v[1]; r.dx = v[2]; r.gone = v[3]; r.t = v[4]; r.hit = v[5]; r.crumbling = v[6]; r.safe = v[7]; if (r.move) r.move.v = v[8]; r.broke = v[9]; r.paid = v[10]; r.crack = v[11]; });
  lv.coins = S.coins.map((c) => Object.assign({}, c)); lv.spawns = S.spawns.slice(); lv.shots = S.shots.map((q) => Object.assign({}, q));
  [lv.coinsTaken, lv.foeKilled, lv.foeTotal] = S.counts; lv.fizz.forEach((p, i) => { p.taken = S.fizz[i]; });
  if (lv.fire) { lv.fire.y = S.fire.y; lv.fire.spitT = S.fire.spitT; lv.fire.warn = S.fire.warn && Object.assign({}, S.fire.warn); }
  lv.bubbles.forEach((b, i) => { b.cd = S.bubbles[i]; });
  lv.enemies = S.enemies.map((o) => { Object.assign(o.e, o.f); restoreBody(o.e.body, o.b); return o.e; });
  lv.folk = S.folk.map(({ f, o, b }) => { for (const k of Object.keys(f)) if (!(k in o)) delete f[k]; Object.assign(f, o); if (b) restoreBody(f.body, b); return f; });   // a body made in a look ahead goes again
  lv.pickups = S.pickups.slice(); lv.pickups.forEach((p, i) => { p.sold = S.sold[i]; });
  lv.icicles = S.icicles.map((c) => Object.assign({}, c)); lv.arenas = S.arenas.map(({ a, o }) => Object.assign(a, o, { foes: o.foes.slice() }));
  if (lv.crossing) Object.assign(lv.crossing, S.cross);
  (lv.tasks || []).forEach((q, i) => { q.n = S.tasks[i]; }); lv.neonLit = new Map(S.neon); lv.tended = new Map(S.tended); if (S.taken) lv.taken = S.taken.slice(); if (S.gone) lv.gone = S.gone.slice();
  if (lv.boss) {   // what a try first set goes again (the Minecart's `called`, else the real fight never calls its spitter)
    const bs = lv.boss, o = S.boss.f;
    for (const k of Object.keys(bs)) if (typeof bs[k] !== 'object' && !(k in o)) delete bs[k];
    Object.assign(bs, o); restoreBody(bs.body, S.boss.b);
  }
  [lv.crumbleTime, lv.crumbleBack] = S.crumble;
  g.rocket = S.rocket && Object.assign({}, S.rocket); lv.rings = S.rings.map(([r, used]) => Object.assign(r, { used }));   // a try's flight neither flies the real hero up nor cuts its own short
}

// ── playing ──
function step() {
  g.step(DT);
  const lv = g.lv, b = g.hero;
  if (lv.kind === 'well' && g.state === 'play') {   // the camera, as Game.frame moves it
    const target = b.cy - CAM.anchor * view.h;
    if (target < lv.cam) lv.cam += (target - lv.cam) * (1 - Math.exp(-CAM.follow * DT));
    lv.cam = Math.max(lv.cam, lv.capY - CAM.top);
  }
  if (g.winT > 0 && g.state === 'play' && (g.winT -= DT) <= 0) g.win();   // a beaten boss's win, as Game.frame counts it down (later than a try looks)
}
const tileOf = () => g.lv.tile;
const heightOf = (y) => (g.lv.floor - y) / tileOf();
// Plays a move; `st` keeps the highest floor stood on (in tiles over the level's floor).
function play(p, st) {
  const n = Math.round(MOVE_T / DT);
  for (let i = 0; i < n && g.state === 'play'; i++) {
    const t = i * DT, jumped = p.jumpAt >= 0 && t >= p.jumpAt;
    const d = !jumped ? p.dir : t < p.jumpAt + p.wait ? 0 : p.dir2;
    input.set('left', d < 0); input.set('right', d > 0);
    input.set('down', !!p.down && t < 0.15);
    input.set('jump', jumped && t < p.jumpAt + p.hold);
    step();
    if (g.state === 'play' && g.onFloor()) st.stand = Math.max(st.stand, heightOf(g.hero.floorY));
    if (live && run) { run.frames++; if ((g.hero.wallMask & 3) && !(g.hero.wallMask & 8)) run.wallFrames++; if (g.flatT > 0 && !run.flat) run.flats++; run.flat = g.flatT > 0; }   // the moves really played: how much of it on a wall, off any floor; flattened by a pestle (MOCHI)
  }
}
// The jumps really played, and how many were off a wall (the hero's own surface: a climb that never needs one is a ladder)
const jump0 = Game.prototype.jump;
Game.prototype.jump = function (...a) {
  const counted = live && run && this === g, floor = !a[0] && (this.hero.wallMask & 8);
  if (counted) { run.jumps++; if ((this.hero.wallMask & 3) && !(this.hero.wallMask & 8)) run.wallJumps++; }
  const out = jump0.apply(this, a);
  if (counted && floor) { run.floorJumps++; if (this.rebounded) run.rebounds++; }   // and off a floor, how many in the beat of a landing (REBOUND)
  return out;
};
function score(base, st) {
  if (g.state === 'dead') return -1e9;
  if (g.state === 'clear') return 1e9;
  if (g.lv.boss) return bossScore(base);
  const H = g.hero;
  let s = st.stand * 100 + heightOf(H.cy) * 15 - (base.hp - g.hp) * 5000 + (g.coins - base.coins) * 3 + (g.kills - base.kills) * 40;
  if (!g.contact() && H.rigVy > 500) s -= 40;   // ending the move in a fall
  const key = g.lv.near(H.cy - 8 * tileOf(), H.cy).find((r) => r.key);   // a gate just over it (GATE): the way is under its keystone, as a player sees it glint
  if (key) s -= 6 * Math.abs(H.cx - (key.x0 + key.x1) / 2) / tileOf();
  const helmet = (g.lv.fizz || []).find((p) => p.again && !p.taken && Math.abs(p.y - H.cy) < 8 * tileOf());   // the tutorial's helmet (CHUNKS.tutHelmet): the way on is through its blocks, as a player is told
  if (helmet && !g.power(helmet.kind)) s -= 6 * Math.hypot(H.cx - helmet.x, H.cy - helmet.y) / tileOf();
  return s;
}
// A boss fight: a heart lost costs what it costs on a climb, a heart dealt pays a little less (no trading one for one), the boss
// beaten is the level cleared. Between hits the hero is drawn to where the boss's way of being beaten wants it (BOSSES; Boss):
//   dive (the Cork, the Crane, the Pigeon): up on a plank, never under it as it shakes over the hero and drops (the shaking and
//     the drop outlast a try's second); at it while it lies dazed. Hovering, it can be stomped too: the tries find that.
//   slide (the Puck, the Rat King): a rolling shell is a flip to come (it slides into its own shells: Game.rolling); behind a
//     shell from it, to stomp it its way; at it while it lies belly up.
//   ride (the Tram, the Minecart): up, as high as over it (open from above only), then over it.
function bossScore(base) {
  const lv = g.lv, bs = lv.boss, d = bs.def || {}, H = g.hero, b = bs.body, T = tileOf();
  if (bs.dead) return 1e9;
  let s = -(base.hp - g.hp) * 5000 + (base.bossHp - bs.hp) * 4000 + (g.coins - base.coins) * 3 + (g.kills - base.kills) * 40;
  const dx = Math.abs(H.cx - b.cx) / T, h = heightOf(H.cy);
  if (d.rail) s += h * 80 + (H.maxY < b.minY ? 800 - Math.min(dx, 6) * 120 : 0);
  else if (d.slide) {
    s += lv.enemies.filter((e) => e.state === 'shell').length * 2500;
    if (bs.state === 'dazed') s += 3000 - dx * 400;
    else {   // the nearest shell still walking: from its far side, a stomp rolls it at the boss (shellUp: away from the hero)
      const sh = lv.enemies.filter((e) => e.type === 'shell' && e.state !== 'shell').sort((p, q) => Math.abs(p.body.cx - H.cx) - Math.abs(q.body.cx - H.cx))[0];
      if (sh) s -= (Math.abs(H.cx - (sh.body.cx - Math.sign(b.cx - sh.body.cx) * (sh.body.R + H.R))) / T) * 150;
    }
  } else if (bs.state === 'dazed') s -= dx * 400;
  else {
    s += Math.min(h, 8) * 100;
    if ((bs.state === 'warn' || bs.state === 'dive') && H.cy > b.cy && Math.abs(H.cx - b.cx) < b.R + H.R + 0.5 * T) s -= 4000;
  }
  return s;
}
function decide(best) {
  const S = snap(), base = { hp: g.hp, coins: g.coins, kills: g.kills, bossHp: g.lv.boss ? g.lv.boss.hp : 0 }, first = [];
  for (const p of PLANS) {
    restore(S);
    const st = { stand: best };
    play(p, st);
    first.push({ p, sc: score(base, st), st, S: g.state === 'play' ? snap() : null });
  }
  first.sort((a, b) => b.sc - a.sc);
  let pick = first[0], top = first[0].sc;
  for (const c of first.slice(0, BEAM)) {
    if (!c.S) continue;
    for (const p of PLANS) {
      restore(c.S);
      const st = { stand: c.st.stand };
      play(p, st);
      const sc = score(base, st);
      if (sc > top) { top = sc; pick = c; }
    }
  }
  restore(S);
  return { p: pick.p, safe: first.filter((c) => c.sc > -1e8 && c.sc >= first[0].sc - 300).length / first.length };
}
// What cost a heart and what got stomped, counted on the moves really played (not the tries).
let live = false, cause = '', causeAt = '', killed = {};
for (const [k, what] of [['meet', (e) => (e === g.lv.boss ? 'boss' : e.type)], ['spikes', () => 'spikes'], ['fireTouch', () => 'fire'], ['shots', () => 'shot'], ['fall', () => 'fall'], ['crossStep', () => 'train']]) {
  const f = g[k];
  g[k] = function (...a) { const hp = this.hp, r = f.apply(this, a); if (live && this.hp < hp) { cause = what(...a); causeAt = this.lv.boss ? this.lv.boss.state : ''; } return r; };   // (at a boss: what it was doing)
}
const kill = g.kill, hitBoss = g.hitBoss;
g.kill = function (e, byHero) { if (live && byHero && this.lv.enemies.includes(e)) killed[e.type] = (killed[e.type] || 0) + 1; return kill.call(this, e, byHero); };
g.hitBoss = function () { if (live) run.out.boss.dealt.push([+(run.t + MOVE_T).toFixed(1), this.lv.boss.state]); return hitBoss.call(this); };   // when each of its hearts went, and what it was doing
// The chunk at a height, for the report.
const chunkAt = (y) => { const c = g.lv.placed.find((q) => y <= q.y1 && y > q.y0); return c ? c.id : '?'; };

// A level in play: start() sets it up, advance() plays it on for a while (so a long level
// spans several calls) and returns what happened once it is over. level() does both.
// Bubbles are off (the bot does not shop).
let run = null;
function start(world, stage = 0, s = 1, opts = {}) {
  seed = opts.order != null ? opts.order : s;   // (`order`: a seed of its own for the parts' order and the play's chances, the level still laid on `s`)
  const real = Math.random; Math.random = random;   // built on the bot's seed too: a tier's three parts in an order of their own (campMerge), a boss's arena
  try { if (opts.daily) __up.daily(s, stage); else if (opts.camp) __up.camp(world * 30 + stage * 3 + (opts.col != null ? opts.col : 1), s); else __up.go(world, stage, s); }   // a campaign level (its recipe; the map's column, see campAt) or a random run's
  finally { Math.random = real; }
  g.makeHero();   // a fresh body, so a level plays the same whatever was played before it
  g.mods = MODS(); g.taken = []; g.maxHp = HEALTH.start; g.hp = g.maxHp; g.coins = 0; g.kills = 0; g.bestCombo = 0; g.applyMods();   // a fresh run's state for every level
  if (opts.god) g.invuln = 1e9;
  const lv = g.lv;
  lv.ensure(-1e7);
  for (const b of lv.bubbles) b.cd = Infinity;
  for (const sp of lv.spots) sp.used = true;   // nor the flip side: it plays the climb
  if (opts.noFoes) lv.spawns.length = 0;   // the same level with nobody in it
  const bs = lv.boss;
  if (bs) bs.help = 1;   // met for the first time: no help for losses running (the tries' deaths count as losses, Game.die)
  killed = {};
  const spawned = {};
  for (const e of lv.spawns) spawned[e.type] = (spawned[e.type] || 0) + 1;
  run = { opts, spawned, t: 0, best: 0, bestT: 0, decisions: 0, safeSum: 0, frames: 0, wallFrames: 0, jumps: 0, wallJumps: 0, floorJumps: 0, rebounds: 0, flats: 0, flat: false, hp: g.hp, startHp: g.hp, foes: lv.spawns.length, coins0: lv.coins.length, top: lv.portal ? heightOf(lv.portal.y) : 0,
    out: { world, stage, seed: s, chunks: lv.placed.map((c) => c.id).join(' '), stuck: [], hits: [], boss: bs ? { name: bs.def ? bs.def.name.en : 'Lid', max: bs.max, dealt: [] } : null } };
  return { started: true, foes: run.foes };
}
function advance(ms = 30000) {
  const quiet = mute(), t0 = performance.now(), lv = g.lv, R = run, out = R.out, bs = lv.boss, cap = R.opts.until || (bs ? BOSS_T : LIMIT_T);   // `until`: stop there and leave the state for a look
  if (g.state === 'pause') g.togglePause(false);   // the page paused itself while hidden
  try {
    while (g.state === 'play' && R.t < cap && performance.now() - t0 < ms) {
      const d = decide(R.best);
      const st = { stand: R.best };
      cause = ''; causeAt = ''; live = true;
      play(d.p, st);
      live = false;
      R.t += MOVE_T; R.decisions++; R.safeSum += d.safe;
      if (g.hp < R.hp) out.hits.push({ t: +R.t.toFixed(1), at: +heightOf(g.hero.cy).toFixed(1), chunk: bs ? causeAt : chunkAt(g.hero.cy), by: cause });
      R.hp = g.hp;
      if (R.opts.trace) (out.trace = out.trace || []).push([R.t, +((g.hero.cx - lv.l) / tileOf()).toFixed(1), +heightOf(g.hero.cy).toFixed(1), g.hp, PLANS.indexOf(d.p)].concat(bs ? [bs.state, bs.hp, +((bs.body.cx - lv.l) / tileOf()).toFixed(1), +heightOf(bs.body.cy).toFixed(1)] : []));
      if (st.stand > R.best + 0.5) { R.best = st.stand; R.bestT = R.t; }
      if (!bs && R.t - R.bestT > STUCK_T) {   // no new height for a while: note it, then lift the bot onto the next ledge up (a boss's arena has none to gain)
        const H = g.hero;
        out.stuck.push({ t: +R.t.toFixed(1), at: +R.best.toFixed(1), chunk: chunkAt(lv.floor - R.best * tileOf() - 1), next: chunkAt(lv.floor - (R.best + 4) * tileOf()),
          hero: { col: +((H.cx - lv.l) / tileOf()).toFixed(1), h: +heightOf(H.cy).toFixed(1), stuck: glueSide(H), mask: H.wallMask } });
        const next = lv.rects.filter((r) => !r.cap && !r.gone && heightOf(r.y0) > R.best + 1).sort((a, b) => b.y0 - a.y0)[0];
        if (!next) break;
        g.placeHero((next.x0 + next.x1) / 2, next.y0 - 1.2 * g.R);
        lv.cam = Math.max(g.hero.cy - CAM.anchor * view.h, lv.capY - CAM.top);
        R.best = heightOf(next.y0); R.bestT = R.t;
      }
    }
    if (g.state === 'play' && R.t < cap && performance.now() - t0 >= ms) return { running: true, t: R.t, height: +R.best.toFixed(1), of: +R.top.toFixed(1), bossHp: bs ? bs.hp : null };
    if (!R.opts.until) input.clear();
    Object.assign(out, { result: g.state, time: +R.t.toFixed(1), decisions: R.decisions, heartsLost: R.startHp - g.hp, height: +R.best.toFixed(1), of: +R.top.toFixed(1),
      coins: R.coins0 - lv.coins.filter((c) => !c.drop).length, coinsPlaced: R.coins0, got: g.coins, foes: R.foes, kills: g.kills, spawned: R.spawned, killed, combo: g.bestCombo,
      tightness: +(1 - R.safeSum / Math.max(1, R.decisions)).toFixed(2), wall: +(R.wallFrames / Math.max(1, R.frames)).toFixed(2), wallJumps: `${R.wallJumps}/${R.jumps}`, rebounds: `${R.rebounds}/${R.floorJumps}`, flats: R.flats, tasks: (lv.tasks || []).map((q) => q.id + ' ' + q.n + '/' + q.of).join(', ') });   // (the bot does not go for them: what a climb does by the way)
    if (bs) Object.assign(out.boss, { hp: Math.max(0, bs.hp), beaten: bs.dead });   // result: 'won', 'dead', or 'play' at BOSS_T
    run = null;
    return out;
  } finally { live = false; quiet(); }
}
function level(world, stage, s, opts) { start(world, stage, s, opts); return advance(Infinity); }
// The bot's tries must not toast, buzz, shake, puff or sound.
function mute() {
  const saved = { ui: {}, buzz: haptics.buzz, shake: shake.add, fx: fx.add, random: Math.random, sound: sound.play };
  for (const k of ['toast', 'comboPop', 'comboEnd', 'hurt', 'coinBump', 'flash', 'labels', 'banner']) { saved.ui[k] = ui[k]; ui[k] = () => {}; }
  haptics.buzz = () => {}; shake.add = () => {}; fx.add = () => {}; sound.play = () => {}; Math.random = random;
  return () => { Object.assign(ui, saved.ui); haptics.buzz = saved.buzz; shake.add = saved.shake; fx.add = saved.fx; sound.play = saved.sound; Math.random = saved.random; };
}
window.__bot = { level, start, advance, PLANS };
})();
// Load:  const s = document.createElement('script'); s.src = 'tools/bot.js?' + Date.now(); document.body.append(s);
