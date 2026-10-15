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
   hearts lost, where it got stuck and in which chunk.
   ───────────────────────────────────────────────────────────── */
(() => {
const g = __up.game, DT = 1 / 120, MOVE_T = 0.5, BEAM = 5, STUCK_T = 14, LIMIT_T = 300;

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
  'kills', 'bestCombo', 'levelM', 'idleT', 'gunT', 'gunCD', 'gunMax', 'climbed', 'state', 'stateT', 'winT', 'lv', 'well', 'door', 'startY'];
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
    cam: lv.cam, t: lv.t, rects: lv.rects.slice(), rs: lv.rects.map((r) => [r.x0, r.x1, r.dx, r.gone, r.t, r.hit, r.crumbling, r.safe, r.move ? r.move.v : 0]),
    coins: lv.coins.map((c) => Object.assign({}, c)), spawns: lv.spawns.slice(), shots: lv.shots.map((q) => Object.assign({}, q)),
    counts: [lv.coinsTaken, lv.foeKilled, lv.foeTotal], bullets: lv.bullets.map((q) => Object.assign({}, q)), fizz: lv.fizz.map((p) => p.taken), fire: lv.fire && { y: lv.fire.y, spitT: lv.fire.spitT, warn: lv.fire.warn && Object.assign({}, lv.fire.warn) }, bubbles: lv.bubbles.map((b) => b.cd),
    enemies: lv.enemies.map((e) => ({ e, f: Object.fromEntries(Object.entries(e).filter(([, v]) => typeof v !== 'object')), b: snapBody(e.body) })),
  };
}
function restore(S) {
  GAME_KEYS.forEach((k, i) => { g[k] = S.g[i]; });
  g.safes = S.safes.map((s) => Object.assign({}, s)); seed = S.seed;
  [input.left, input.right, input.down, input.jump] = S.input;
  restoreBody(g.hero, S.hero);
  const lv = g.lv;
  lv.cam = S.cam; lv.t = S.t; lv.rects = S.rects.slice();
  S.rects.forEach((r, i) => { const v = S.rs[i]; r.x0 = v[0]; r.x1 = v[1]; r.dx = v[2]; r.gone = v[3]; r.t = v[4]; r.hit = v[5]; r.crumbling = v[6]; r.safe = v[7]; if (r.move) r.move.v = v[8]; });
  lv.coins = S.coins.map((c) => Object.assign({}, c)); lv.spawns = S.spawns.slice(); lv.shots = S.shots.map((q) => Object.assign({}, q));
  [lv.coinsTaken, lv.foeKilled, lv.foeTotal] = S.counts; lv.bullets = S.bullets.map((q) => Object.assign({}, q)); lv.fizz.forEach((p, i) => { p.taken = S.fizz[i]; });
  if (lv.fire) { lv.fire.y = S.fire.y; lv.fire.spitT = S.fire.spitT; lv.fire.warn = S.fire.warn && Object.assign({}, S.fire.warn); }
  lv.bubbles.forEach((b, i) => { b.cd = S.bubbles[i]; });
  lv.enemies = S.enemies.map((o) => { Object.assign(o.e, o.f); restoreBody(o.e.body, o.b); return o.e; });
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
  }
}
function score(base, st) {
  if (g.state === 'dead') return -1e9;
  if (g.state === 'clear') return 1e9;
  const H = g.hero;
  let s = st.stand * 100 + heightOf(H.cy) * 15 - (base.hp - g.hp) * 5000 + (g.coins - base.coins) * 3 + (g.kills - base.kills) * 40;
  if (!g.contact() && H.rigVy > 500) s -= 40;   // ending the move in a fall
  return s;
}
function decide(best) {
  const S = snap(), base = { hp: g.hp, coins: g.coins, kills: g.kills }, first = [];
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
let live = false, cause = '', killed = {};
for (const [k, what] of [['meet', (e) => (e === g.lv.boss ? 'boss' : e.type)], ['spikes', () => 'spikes'], ['fireTouch', () => 'fire'], ['shots', () => 'shot'], ['fall', () => 'fall']]) {
  const f = g[k];
  g[k] = function (...a) { const hp = this.hp, r = f.apply(this, a); if (live && this.hp < hp) cause = what(...a); return r; };
}
const kill = g.kill;
g.kill = function (e, byHero) { if (live && byHero && this.lv.enemies.includes(e)) killed[e.type] = (killed[e.type] || 0) + 1; return kill.call(this, e, byHero); };
// The chunk at a height, for the report.
const chunkAt = (y) => { const c = g.lv.placed.find((q) => y <= q.y1 && y > q.y0); return c ? c.id : '?'; };

// A level in play: start() sets it up, advance() plays it on for a while (so a long level
// spans several calls) and returns what happened once it is over. level() does both.
// Bubbles are off (the bot does not shop).
let run = null;
function start(world, stage = 0, s = 1, opts = {}) {
  seed = s;
  __up.go(world, stage, s);
  g.makeHero();   // a fresh body, so a level plays the same whatever was played before it
  g.mods = MODS(); g.taken = []; g.maxHp = HEALTH.start; g.hp = g.maxHp; g.coins = 0; g.kills = 0; g.bestCombo = 0; g.applyMods();   // a fresh run's state for every level
  if (opts.god) g.invuln = 1e9;
  const lv = g.lv;
  lv.ensure(-1e7);
  for (const b of lv.bubbles) b.cd = Infinity;
  if (opts.noFoes) lv.spawns.length = 0;   // the same level with nobody in it
  killed = {};
  const spawned = {};
  for (const e of lv.spawns) spawned[e.type] = (spawned[e.type] || 0) + 1;
  run = { opts, spawned, t: 0, best: 0, bestT: 0, decisions: 0, safeSum: 0, hp: g.hp, startHp: g.hp, foes: lv.spawns.length, coins0: lv.coins.length, top: heightOf(lv.portal.y),
    out: { world, stage, seed: s, chunks: lv.placed.map((c) => c.id).join(' '), stuck: [], hits: [] } };
  return { started: true, foes: run.foes };
}
function advance(ms = 30000) {
  const quiet = mute(), t0 = performance.now(), lv = g.lv, R = run, out = R.out;
  if (g.state === 'pause') g.togglePause(false);   // the page paused itself while hidden
  try {
    while (g.state === 'play' && R.t < (R.opts.until || LIMIT_T) && performance.now() - t0 < ms) {   // `until`: stop there and leave the state for a look
      const d = decide(R.best);
      const st = { stand: R.best };
      cause = ''; live = true;
      play(d.p, st);
      live = false;
      R.t += MOVE_T; R.decisions++; R.safeSum += d.safe;
      if (g.hp < R.hp) out.hits.push({ t: +R.t.toFixed(1), at: +heightOf(g.hero.cy).toFixed(1), chunk: chunkAt(g.hero.cy), by: cause });
      R.hp = g.hp;
      if (st.stand > R.best + 0.5) { R.best = st.stand; R.bestT = R.t; }
      if (R.t - R.bestT > STUCK_T) {   // no new height for a while: note it, then lift the bot onto the next ledge up
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
    if (g.state === 'play' && R.t < (R.opts.until || LIMIT_T) && performance.now() - t0 >= ms) return { running: true, t: R.t, height: +R.best.toFixed(1), of: +R.top.toFixed(1) };
    if (!R.opts.until) input.clear();
    Object.assign(out, { result: g.state, time: +R.t.toFixed(1), decisions: R.decisions, heartsLost: R.startHp - g.hp, height: +R.best.toFixed(1), of: +R.top.toFixed(1),
      coins: R.coins0 - lv.coins.filter((c) => !c.drop).length, coinsPlaced: R.coins0, got: g.coins, foes: R.foes, kills: g.kills, spawned: R.spawned, killed, combo: g.bestCombo,
      tightness: +(1 - R.safeSum / Math.max(1, R.decisions)).toFixed(2) });
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
