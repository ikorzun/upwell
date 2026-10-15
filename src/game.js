"use strict";
/* ─────────────────────────────────────────────────────────────
   Upwell — the game: a run (four worlds of three levels, then the
   boss), the hero and its buttons, enemies, stomps and combos, coins,
   hearts, rooms behind bubbles, upgrades and unlocks; the UI, input,
   layout and the loop. Loaded last, after src/gum.js and src/world.js.
   ───────────────────────────────────────────────────────────── */

// ── Words ────────────────────────────────────────────────────
const STR = {
  en: {
    hintKeys: '← → to move, space to jump, ↓ to let go.\nLand on enemies from above!', hintMouse: '← → to move, space to jump, ↓ to let go,\nor pull back with the mouse and let go.\nLand on enemies from above!', hintTouch: '◀ ▶ to move, ▲ to jump, ▼ to let go.\nLand on enemies from above!', play: 'Play',
    hard: 'Hard mode', world: 'World {n}', pick: 'Pick an upgrade', dead: 'Run over', won: 'You made it out!',
    starLine: 'Coins {c} · Enemies {f}', news: 'New: {n}', dark: 'darkness',
    seen_moss: 'Moss holds you: a place to rest', seen_rubber: 'Rubber throws you off', seen_ice: 'Ice is slippery: nothing sticks',
    seen_crumble: 'It crumbles: keep moving', seen_spring: 'Springs throw you high', seen_fire: 'The fire grows while you stand still!',
    seen_hedgehog: "Don't stomp a hedgehog: it pricks!", seen_shell: 'Stomp a shell and it rolls into the others', seen_spitter: 'Spitters lob blobs at you: dodge',
    seen_splitter: 'A splitter breaks in two', seen_chaser: 'A chaser follows you on its wall',
    reviveQ: 'One more go?', revive: 'Revive', reviveCost: 'Costs {n} · you have {c}', giveUp: 'No, finish',
    height: 'Climbed', coins: 'Coins', kills: 'Enemies', combo: 'Best combo', reached: 'Reached', unlocked: 'Unlocked', hardOpen: 'Hard mode is open!',
    again: 'Again', menu: 'Menu', resume: 'Resume', paused: 'Paused', comboPay: 'Combo ×{n}  +{c}', comboHp: '+1 heart', poor: 'Need {n} more coins',
    noNeed: 'Not needed now', sold: 'sold', free: 'free', shop: 'Shop', treasure: 'Stash', bossLeft: '{n} more!', m: 'm',
    nogl: 'This game needs WebGL 2. Please try another browser.', sound: 'Sound', on: 'on', off: 'off',
  },
  ru: {
    hintKeys: '← → — бег, пробел — прыжок, ↓ — отлипнуть.\nПрыгай на врагов сверху!', hintMouse: '← → — бег, пробел — прыжок, ↓ — отлипнуть,\nили тяни мышью назад и отпускай.\nПрыгай на врагов сверху!', hintTouch: '◀ ▶ — бег, ▲ — прыжок, ▼ — отлипнуть.\nПрыгай на врагов сверху!', play: 'Играть',
    hard: 'Сложный режим', world: 'Мир {n}', pick: 'Выбери улучшение', dead: 'Забег окончен', won: 'Ты выбрался!',
    starLine: 'Монеты {c} · Враги {f}', news: 'Новое: {n}', dark: 'темнота',
    seen_moss: 'Мох держит: можно передохнуть', seen_rubber: 'Резина отбрасывает', seen_ice: 'Лёд скользкий: не прилипнешь',
    seen_crumble: 'Блок осыпается: не стой', seen_spring: 'Пружина подбрасывает высоко', seen_fire: 'Огонь растёт, если стоишь на месте!',
    seen_hedgehog: 'Ежа не топчи: колется!', seen_shell: 'Растопчи панцирь: он покатится по врагам', seen_spitter: 'Плевака кидается комками: увернись',
    seen_splitter: 'Делилка распадается надвое', seen_chaser: 'Догоняла ползёт за тобой по стене',
    reviveQ: 'Ещё попытка?', revive: 'Возродиться', reviveCost: 'Цена {n} · у тебя {c}', giveUp: 'Нет, закончить',
    height: 'Подъём', coins: 'Монеты', kills: 'Врагов', combo: 'Лучшее комбо', reached: 'Дошёл до', unlocked: 'Открыто', hardOpen: 'Открыт сложный режим!',
    again: 'Ещё раз', menu: 'В меню', resume: 'Продолжить', paused: 'Пауза', comboPay: 'Комбо ×{n}  +{c}', comboHp: '+1 сердце', poor: 'Не хватает {n} монет',
    noNeed: 'Сейчас не нужно', sold: 'продано', free: 'даром', shop: 'Лавка', treasure: 'Тайник', bossLeft: 'Ещё {n}!', m: 'м',
    nogl: 'Нужен WebGL 2. Попробуй другой браузер.', sound: 'Звук', on: 'вкл', off: 'выкл',
  },
};
let lang = 'en';
const t = (k) => (STR[lang] && STR[lang][k]) || STR.en[k];
const tf = (k, o) => t(k).replace(/\{(\w+)\}/g, (_, n) => o[n]);
const L2 = (o) => o[lang] || o.en;
const detectLang = () => { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };

// ── Save ─────────────────────────────────────────────────────
// What outlives a run: best climb, coins of all runs (they unlock colours),
// wins (the first one opens hard mode) and the chosen look.
const SAVE_KEY = 'upwell.save';
const save = (() => {
  const d = { best: 0, bank: 0, wins: 0, runs: 0, color: PALETTE[0].id, hard: false, seen: {} };   // seen: hints shown once
  try {
    const s = Object.assign(d, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
    if (!PALETTE.some((c) => c.id === s.color)) s.color = PALETTE[0].id;   // a colour from before the palette inks
    return s;
  } catch (e) { return d; }
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: this visit only */ } }
const opened = (u) => save.bank >= u.at;
if (!UNLOCKS.some((u) => u.id === save.color && opened(u))) save.color = PALETTE[0].id;   // a colour that is gone or not open yet

// ── Bodies ───────────────────────────────────────────────────
// The rigid part of a body's motion becomes (vx, vy); the wobble on top of it stays.
function setVel(b, vx, vy) {
  const n = b.n;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += b.vx[i]; my += b.vy[i]; }
  mx /= n; my /= n;
  for (let i = 0; i < n; i++) { b.vx[i] += vx - mx; b.vy[i] += vy - my; }
}
function addVel(b, dvx, dvy) { for (let i = 0; i < b.n; i++) { b.vx[i] += dvx; b.vy[i] += dvy; } }
// Turn a body toward upright by spin (as Gum rights a body on a floor; a foe on a wall needs it too).
function turnUp(b, k, dt) {
  const dw = (-Math.atan2(Math.sin(b.theta), Math.cos(b.theta)) * k - b.omega) * Math.min(1, 8 * dt);
  for (let i = 0; i < b.n; i++) { b.vx[i] -= dw * (b.y[i] - b.cy); b.vy[i] += dw * (b.x[i] - b.cx); }
}
function unstick(b, cd) { b.glue.fill(0); b.stuck = 0; b.stickCD = Math.max(b.stickCD || 0, cd); }
// What a body hangs on: 1 a surface facing +x (a wall on its left), 2 facing −x, 4 a ceiling, 0 nothing.
function glueSide(b) {
  let top = false;
  for (let i = 0; i < b.n; i++) { const g = b.glue[i]; if (g === 1 || g === 2) return g; if (g === 4) top = true; }
  return top ? 4 : 0;
}
const foeColor = (id) => FOE_COLOR[id] || colorById(id);

// An enemy: a red squishy crawling its round (see ENEMY).
class Foe {
  constructor(s, lv) {
    const def = ENEMY[s.type];
    this.type = s.type; this.def = def; this.ledge = s.ledge || null; this.rect = s.rect || null; this.wall = s.wall || null;
    this.body = new Body(designById(def.design), foeColor(def.color), s.x, s.y, lv.R * def.size, 0.5);
    this.body.gScale = def.grav; this.body.sticky = false; this.body.face.frown = true;
    this.body.fric = 0;   // no drag from what it crawls on (a wall's friction all but holds it still): its steering sets the pace
    this.dir = s.dir || (Math.random() < 0.5 ? -1 : 1); this.t = 0; this.stall = 0; this.ph = Math.random(); this.lastPh = this.ph;
    this.state = 'walk'; this.shellT = 0; this.wind = 0; this.spitT = rand(SPIT.every[0], SPIT.every[1]);
    this.s = this.rect ? (this.rect.x1 - this.rect.x0) / 2 + 1.05 * this.body.R : 0;   // a circler starts on top, in the middle
  }
  // Soft bodies moving as the hero does, by pushes and their own give rather than gliding on rails: each one inches
  // along in pulses (every `step` s), stretching along its way at each push and settling in between, and keeps upright.
  // None of them leaves its surface.
  think(dt, g) {
    const b = this.body, def = this.def, lv = g.lv;
    const steer = (tvx, tvy, k, xOnly) => { const q = Math.min(1, k * dt); addVel(b, (tvx - b.rigVx) * q, xOnly ? 0 : (tvy - b.rigVy) * q); };
    this.t += dt; b.ghost = this.state === 'shell';   // kept in step with the state (a bot's restored branch included)
    turnUp(b, 6, dt);
    this.ph = (this.ph + dt / def.step) % 1;
    const pulse = 0.25 + 1.5 * Math.pow(Math.max(0, Math.sin(this.ph * TAU)), 2);   // averages about one
    const push = this.ph < this.lastPh;   // a new pulse begins
    this.lastPh = this.ph;
    if (def.move === 'crawl') {   // back and forth along its ledge (or the floor, between the walls)
      if (this.state === 'shell') { this.roll(dt, g); return; }
      if (!(b.wallMask & 8)) return;
      const l = this.ledge;
      if (l && !l.gone) {   // turn before its edge passes the ledge's: a part hanging over sags and catches on the corner
        if (b.maxX > l.x1 - 0.3 * b.R) this.dir = -1; else if (b.minX < l.x0 + 0.3 * b.R) this.dir = 1;
      }
      if (b.wallMask & 1) this.dir = 1; else if (b.wallMask & 2) this.dir = -1;
      if (push) {   // a whole pulse that got nowhere (another crawler in the way): back off
        this.stall = Math.abs(b.cx - (this.lastX ?? b.cx)) < 0.15 * b.R ? this.stall + 1 : 0;
        if (this.stall > 1) { this.dir = -this.dir; this.stall = 0; }
        this.lastX = b.cx;
        b.kickSquash(1, 0, -0.9);
      }
      const hold = this.type === 'spitter' && this.spit(dt, g);   // stands still to lob
      steer(hold ? 0 : this.dir * def.speed * pulse, 0, 6, true);
    } else if (def.move === 'wall') {   // up and down its stretch of wall, pressed to it (a chaser toward the hero's height)
      const w = this.wall, tx = w.side === 1 ? lv.l + b.R : lv.r - b.R;
      if (def.chase) { const ty = clamp(g.hero.cy, w.y0, w.y1); this.dir = Math.abs(ty - b.cy) < 0.3 * b.R ? 0 : Math.sign(ty - b.cy); }
      else if (b.cy < w.y0) this.dir = 1; else if (b.cy > w.y1) this.dir = -1;
      if (push) b.kickSquash(0, 1, -0.9);
      steer((tx - b.cx) * 6, this.dir * def.speed * pulse, 6);
    } else {   // round its block: along the top, down a side, along the bottom, up the other side
      const r = this.rect, e = 1.05 * b.R, w = r.x1 - r.x0 + 2 * e, h = r.y1 - r.y0 + 2 * e, P = 2 * (w + h);
      this.s = (((this.s + this.dir * def.speed * pulse * dt) % P) + P) % P;
      const s = this.s, x0 = r.x0 - e, y0 = r.y0 - e, side = s < w || (s >= w + h && s < 2 * w + h);
      if (push) b.kickSquash(side ? 1 : 0, side ? 0 : 1, -0.9);
      const p = s < w ? [x0 + s, y0] : s < w + h ? [x0 + w, y0 + s - w] : s < 2 * w + h ? [x0 + w - (s - w - h), y0 + h] : [x0, y0 + h - (s - 2 * w - h)];
      steer((p[0] - b.cx) * 8, (p[1] - b.cy) * 8, 10);
    }
  }
  // A spitter, now and then while the hero is near and on screen, swells up for SPIT.wind s and
  // lobs a blob that comes down where the hero was. True while it stands to do it.
  spit(dt, g) {
    const b = this.body, H = g.hero, lv = g.lv;
    if (this.wind > 0) {
      if ((this.wind -= dt) > 0) { b.kickSquash(0, 1, 0.04); return true; }
      const x = b.cx, y = b.minY - SPIT.r * lv.R, dx = H.cx - x, dy = H.cy - y, T = clamp(Math.hypot(dx, dy) / 420, 0.55, 1.1);
      lv.shots.push({ x, y, vx: dx / T, vy: (dy - 0.5 * SHOT_G * T * T) / T, r: SPIT.r * lv.R });
      b.kickSquash(0, 1, -1.6); sound.play('spit', 0.5, 1.3);
      this.spitT = rand(SPIT.every[0], SPIT.every[1]);
      return true;
    }
    if ((this.spitT -= dt) <= 0 && Math.abs(H.cy - b.cy) < SPIT.range * view.h && b.cy > lv.cam && b.cy < lv.cam + view.h) { this.wind = SPIT.wind; return true; }
    return false;
  }
  // A stomped shell rolls along at SHELL.speed, back off walls and over edges (Game.rolling has it hit the others).
  roll(dt, g) {
    const b = this.body;
    if (b.wallMask & 1) this.dir = 1; else if (b.wallMask & 2) this.dir = -1;
    addVel(b, (this.dir * SHELL.speed * g.R - b.rigVx) * Math.min(1, 10 * dt), 0);
  }
}

// The boss at the summit: a big squishy that hovers under the ceiling, drops goo and calls
// helpers. A stomp hurts it and makes it red for a moment: then it hurts to touch.
class Boss {
  constructor(lv) {
    const R = lv.R * BOSS.size;
    this.body = new Body(designById('cat'), FOE_COLOR.boss, (lv.l + lv.r) / 2, lv.capY + R * 1.7, R, 0.4);
    this.body.gScale = 0; this.body.sticky = false; this.body.face.frown = true;
    this.hp = BOSS.hp + (lv.hard ? 2 : 0); this.max = this.hp; this.t = 0; this.drop = 1.8; this.call = 3; this.angry = 0; this.dead = false;
  }
  think(dt, g) {
    const b = this.body, lv = g.lv, W = lv.r - lv.l, k = this.angry > 0 ? 1.8 : 1;
    this.t += dt * k;
    if (this.angry > 0 && (this.angry -= dt) <= 0) b.color = FOE_COLOR.boss;
    const tx = (lv.l + lv.r) / 2 + Math.sin(this.t * 0.55) * W * 0.27, ty = lv.capY + b.R * 1.65 + Math.sin(this.t * 1.2) * b.R * 0.35, q = Math.min(1, 2.4 * dt);
    addVel(b, ((tx - b.cx) * 2 - b.rigVx) * q, ((ty - b.cy) * 2 - b.rigVy) * q);
    if ((this.drop -= dt * k) <= 0) {
      this.drop = BOSS.dropEvery;
      for (let i = -1; i <= 1; i++) lv.shots.push({ x: b.cx + i * b.R * 0.5, y: b.maxY, vx: i * 120, vy: 60, r: 0.32 * lv.R });
    }
    if ((this.call -= dt) <= 0) {
      this.call = BOSS.spawnEvery;
      if (lv.enemies.length < BOSS.maxMinions) lv.enemies.push(new Foe({ type: 'crawler', x: b.cx, y: b.cy + b.R * 0.6 }, lv));   // it drops onto a plank or the floor
    }
  }
}

// ── Game ─────────────────────────────────────────────────────
const MODS = () => ({ bounce: 1, slide: 1, hold: 0, magnet: 1, invuln: 0, airJumps: 1, blast: false, coinMul: 1, comboShift: 0, jump: 1, discount: 1, iron: false, fire: 1 });
const SPIKE_PUSH = [[0, -1], [0, 1], [1, -0.35], [-1, -0.35]];
let nextSeed = null;
class Game {
  constructor() {
    this.lv = new Level(); this.well = null; this.door = null; this.hero = null; this.state = 'boot'; this.paused = 'play';
    this.R = 30; this.vjump = 1; this.builtW = 0; this.list = []; this.look = { x: 0, y: 0, t: 0 }; this.heroLook = { x: 0, y: 0, t: -1e9 };
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.hitstop = 0; this.invuln = 0; this.touch = 0; this.queued = null; this.rising = false;
    this.stateT = 0; this.pruneT = 0; this.winT = 0; this.startY = 0; this.result = null; this.safes = [];
    this.newRun();
  }
  newRun() {
    this.world = 0; this.stage = 0; this.hard = !!save.hard && save.wins > 0; this.mods = MODS(); this.taken = [];
    this.maxHp = HEALTH.start; this.hp = this.maxHp; this.coins = 0; this.kills = 0; this.combo = 0; this.bestCombo = 0;
    this.climbed = 0; this.levelM = 0; this.revives = 0;
    const perk = UPGRADES.find((u) => u.id === (UNLOCKS.find((u) => u.id === save.color) || {}).perk);
    if (perk) this.takeUpgrade(perk);   // each colour starts with its own upgrade
  }
  applyMods() {
    STICK.slide = BASE_STICK.slide * this.mods.slide; STICK.hold = BASE_STICK.hold + this.mods.hold;
    this.vjump = Math.sqrt(2 * WORLD.gravity * JUMP.height * this.R) * this.mods.jump;
  }
  get b() { return this.hero && Number.isFinite(this.hero.floorY) ? this.hero.floorY : this.lv.floor; }   // where Body.endStep puts landing dust
  get wd() { return this.world < WORLDS.length ? WORLDS[this.world] : SUMMIT; }
  bodyList() {
    const a = this.list, lv = this.lv;
    a.length = 0;
    for (const e of lv.enemies) a.push(e.body);
    if (lv.boss && !lv.boss.dead) a.push(lv.boss.body);
    if (this.hero) a.push(this.hero);
    return a;
  }
  makeHero() {
    const x = view.w / 2, y = this.lv.floor - 1.1 * this.R;
    this.hero = new Body(designById('round'), colorById(save.color), x, y, this.R, 0.6);
    this.hero.isHero = true;
    this.startY = this.hero.cy;
  }
  placeHero(x, y) {
    const b = this.hero;
    b.translate(x - b.cx, y - b.cy);
    b.vx.fill(0); b.vy.fill(0); unstick(b, 0.2); b.ceilT = 0; b.peelT = 0;
  }
  // The menu's backdrop is the first level of a fresh run with the hero standing in it.
  toMenu() {
    this.newRun(); this.state = 'menu'; this.buildLevel(true);
    this.lv.cam = this.hero.cy - 0.46 * view.h;   // the hero in the gap between the title and the colours, so a new look shows
    ui.hideAll(); ui.menu();
  }
  startRun() {
    this.newRun(); save.runs++; persist();
    this.state = 'play'; this.stateT = 0; this.buildLevel(true);
    ui.hideAll(); ui.banner();
    if (save.runs <= 2) ui.toast(t(coarse ? 'hintTouch' : JUMP.mouse ? 'hintMouse' : 'hintKeys'), 5200);
  }
  buildLevel(newHero) {
    const W = view.w, H = view.h, boss = this.world >= WORLDS.length, wd = this.wd;
    this.builtW = W;
    this.R = clamp((W - 2 * LEVEL.wall) * HERO.sizeFrac, HERO.sizeMin, HERO.sizeMax);
    const seed = nextSeed != null ? nextSeed : (Math.random() * 4294967296) >>> 0;
    nextSeed = null;
    this.seed = seed; this.lv = new Level(); this.well = null; this.door = null;
    this.lv.reset({ kind: boss ? 'boss' : 'well', w: W, h: H, R: this.R, seed, world: wd, stage: this.stage, hard: this.hard,
      height: boss ? 0 : wd.heights[this.stage] * R_PER_M * this.R, theme: wd.theme });
    this.lv.cam = Math.max(this.lv.cam, this.lv.floor + this.room() - H);   // the floor shows over the touch keys
    if (boss) this.lv.boss = new Boss(this.lv);
    if (newHero || !this.hero || this.hero.R !== this.R) this.makeHero();
    else {   // back to size and weight after the hole
      const h = this.hero;
      h.gScale = 1; h.sticky = true; h.growth = h.growthTarget = 1; h.growthV = 0;
      this.placeHero(W / 2, this.lv.floor - 1.1 * this.R); this.startY = this.hero.cy;
    }
    this.applyMods();
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.invuln = 0; this.hitstop = 0; this.levelM = 0; this.idleT = 0; this.combo = 0;
    this.touch = 0; this.queued = null; this.rising = false;
    this.safes = [{ r: null, dx: W / 2 }];   // a fall before any ledge comes back to the floor
    fx.n = 0; aimCancel(); ui.comboEnd();
    this.lv.ensure(this.lv.cam - H * LEVEL.ahead);
  }
  // A new width remakes the level under way (the well is the view's width); the run goes on.
  resized() { if (this.state === 'menu' || this.state === 'boot') this.toMenu(); else this.buildLevel(true); }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  offer(n = 3) {
    const pool = UPGRADES.filter((u) => u.stack || !this.taken.includes(u.id));
    return shuffled(Math.random, pool).slice(0, n);
  }
  takeUpgrade(u) { u.apply(this); this.taken.push(u.id); this.applyMods(); }
  randomUpgrade() { const u = this.offer(1)[0]; if (u) { this.takeUpgrade(u); ui.toast(L2(u.name)[0]); } }
  priceOf(p) { return p.item.free ? 0 : Math.round(p.item.price * (1 + 0.5 * Math.min(this.world, 4)) * this.mods.discount * (this.hard ? 1.5 : 1)); }

  // ── Jumping ──
  contact() { const b = this.hero; return (b.wallMask & 15) !== 0 || b.stuck > 0; }
  onFloor() { const b = this.hero; return (b.wallMask & 8) !== 0 && b.stuck === 0; }
  // The way out of what the hero is on, for a slingshot aimed off it; null in the air.
  surfaceNormal() {
    if (this.sinceContact > JUMP.coyote) return null;
    const t = this.touch;
    return t === 1 ? [1, 0] : t === 2 ? [-1, 0] : t === 4 ? [0, 1] : [0, -1];
  }
  // From a surface (or just off one) a jump goes at once; in the air it spends an air jump
  // if there is one (every landing gives one back, so does a stomp), or waits a moment for
  // a surface. `aimed` is a slingshot launch { vx, vy } from the mouse, null for the button.
  requestJump(aimed = null) {
    if (this.state !== 'play') return;
    if (this.sinceContact <= JUMP.coyote) this.jump(false, aimed);
    else if (this.air > 0) { this.air--; this.jump(true, aimed); }
    else { this.queueT = JUMP.buffer; this.queued = aimed; }
  }
  // Off a floor: up, keeping the run. Off a wall: up and away. Off a ceiling: pushed down
  // and toward the pressed side. In the air: up again, with a puff under it. A slingshot
  // launch goes where it was aimed, and letting go of a button cannot cut it.
  jump(inAir, aimed) {
    const H = this.hero, v = this.vjump, side = inAir ? 0 : this.touch;
    let vx = H.rigVx, vy = -v, rise = !aimed;
    if (aimed) { vx = aimed.vx; vy = aimed.vy; }
    else if (side === 1 || side === 2) { vx = (side === 1 ? 1 : -1) * JUMP.wallX * this.R; vy = -v * JUMP.wallUp; }
    else if (side === 4) { vx = input.dir * MOVE.speed * this.R; vy = JUMP.ceil * v; rise = false; }
    if (inAir) { fx.dust(H.cx, H.maxY, IMPACT.puffSpeed + 900); fx.ring(H.cx, H.maxY, 0.8 * this.R, H.color.base); }
    sound.play(inAir ? 'airjump' : side === 1 || side === 2 ? 'walljump' : 'jump', 0.8);
    setVel(H, vx, vy);
    unstick(H, JUMP.stickAfter);
    const sp = Math.hypot(vx, vy) || 1;
    H.kickSquash(vx / sp, vy / sp, -JUMP.stretch * Math.min(1, sp / v));   // stretch along the leap
    haptics.buzz(8);
    this.rising = rise; this.sinceContact = JUMP.coyote + 1; this.queueT = 0; this.queued = null;
  }
  // Letting go of the button on the way up makes a lower jump.
  releaseJump() {
    const H = this.hero;
    if (this.rising && this.state === 'play' && H.rigVy < 0) setVel(H, H.rigVx, H.rigVy * JUMP.cut);
    this.rising = false;
  }
  // Down: let go of a wall or a ceiling, with a nudge off it.
  pressDown() {
    if (this.state !== 'play') return;
    const H = this.hero, side = glueSide(H);
    if (!side) return;
    unstick(H, JUMP.dropAfter);
    addVel(H, side === 1 ? 2 * this.R : side === 2 ? -2 * this.R : 0, side === 4 ? 3 * this.R : 0);
  }
  // Left and right run along a floor and steer in the air; while down is held nothing sticks.
  move(dt) {
    const H = this.hero, d = input.dir, floor = this.onFloor(), top = H.stuck > 0 && glueSide(H) === 4;
    H.pressX = d; H.crawl = top && d !== 0;   // only a body hanging from a ceiling alone creeps along it
    if (input.down) H.stickCD = Math.max(H.stickCD || 0, 0.05);
    H.fric = floor && d ? MOVE.slip : undefined;
    if (!d || (H.stuck && !top)) return;   // stuck to a wall it slides; under a ceiling it creeps along
    const dv = (d * (top ? MOVE.ceil : MOVE.speed) * this.R - H.rigVx) * Math.min(1, (floor || top ? MOVE.accel : MOVE.air) * dt);
    if (dv * d > 0) addVel(H, dv, 0);   // toward the pressed side only: a faster leap is not braked
  }

  // ── The fixed step ──
  step(dt) {
    const st = this.state;
    if (st !== 'play' && st !== 'menu' && st !== 'clear' && st !== 'won') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    const lv = this.lv, hero = this.hero, playing = st === 'play', h = dt / PHYS.substeps, sk2 = 2 * WORLD.skin;
    lv.update(dt, this);
    if (st === 'clear' && lv.portal) this.suck(dt);
    if (playing) {
      this.activate();
      for (const e of lv.enemies) e.think(dt, this);
      if (lv.boss && !lv.boss.dead) lv.boss.think(dt, this);
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (playing) this.move(dt);
    const bs = this.bodyList();
    for (const b of bs) { if (b.stickCD > 0) b.stickCD -= dt; b.stepMaxY = b.maxY; b.touchHero = false; b.beginStep(dt); }
    hero.springHit = null; hero.rubber = 0;
    for (let s = 0; s < PHYS.substeps; s++) {
      for (const b of bs) { b.integrate(h, WORLD.maxSpeed); b.solve(h); b.updateBounds(); }
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const A = bs[i], B = bs[j];
        if (A.maxX + sk2 < B.minX || B.maxX + sk2 < A.minX || A.maxY + sk2 < B.minY || B.maxY + sk2 < A.minY) continue;
        const withHero = A === hero || B === hero;
        if (withHero && (this.invuln > 0 || !playing || A.ghost || B.ghost)) continue;   // a hit hero passes through for a moment, and a rolling shell through the hero
        if (collidePair(A, B) && withHero) (A === hero ? B : A).touchHero = true;
      }
      for (const b of bs) { b.collideLevel(lv, h); b.finishSubstep(h); b.updateBounds(); }
    }
    for (const b of bs) b.endStep(dt, this);
    if (this.contact()) {   // what a jump would push off
      const m = hero.wallMask;
      this.touch = m & 8 ? 0 : glueSide(hero) || (m & 1 ? 1 : m & 2 ? 2 : m & 4 ? 4 : 0);
      this.sinceContact = 0; this.air = this.mods.airJumps;
    } else this.sinceContact += dt;
    if (this.queueT > 0) { this.queueT -= dt; if (this.sinceContact === 0) this.jump(false, this.queued); }
    if (hero.springHit && hero.rigVy > -0.5 * SPRING.v * this.vjump) this.spring(hero.springHit);
    if (playing && hero.rubber && !(hero.wallMask & 8)) this.rubberHit(hero.rubber);   // standing, rubber is just a wall
    if (playing && lv.kind === 'well' && this.onFloor() && !hero.springHit) this.markSafe(hero.floorRect);
    if (playing && lv.kind === 'well') this.notice();
    if (playing) this.interact(dt);
  }
  // Enemies come alive a little above the screen and are forgotten far below it.
  activate() {
    const lv = this.lv, lim = lv.cam - 0.7 * view.h, far = lv.cam + 2 * view.h;
    for (let i = lv.spawns.length - 1; i >= 0; i--) {
      const s = lv.spawns[i];
      if (s.y < lim) continue;
      lv.spawns.splice(i, 1);
      if (s.y < lv.cam + view.h) lv.enemies.push(new Foe(s, lv));
    }
    for (let i = lv.enemies.length - 1; i >= 0; i--) if (lv.enemies[i].body.cy > far) lv.enemies.splice(i, 1);
  }
  interact(dt) {
    const lv = this.lv, H = this.hero;
    for (const e of lv.enemies.slice()) if (e.body.touchHero) this.meet(e);
    this.rolling(dt);
    for (const e of lv.enemies) if (STR.en['seen_' + e.type] && e.body.cy > lv.cam && e.body.cy < lv.cam + view.h) this.hint(e.type);   // a new kind of enemy, told once
    if (lv.boss && !lv.boss.dead && lv.boss.body.touchHero) this.meet(lv.boss);
    if (this.state !== 'play') return;
    this.spikes(); this.fireStep(dt); this.fireTouch(); this.shots(dt); this.collect(dt);
    if (this.combo > 0 && (H.wallMask & 8) && !H.springHit) this.payCombo();   // only a floor ends a combo
    const near = (o, r) => Math.hypot(H.cx - o.x, H.cy - o.y) < r;
    if (lv.portal && near(lv.portal, lv.portal.r + 0.5 * H.R)) { this.levelClear(); return; }
    const inDoor = (d, m) => H.cx > d.x0 - m && H.cx < d.x1 + m && H.cy > d.y0 - m && H.cy < d.y1 + m;
    for (const b of lv.bubbles) if (b.cd <= 0 && inDoor(b, 0)) { this.enterRoom(b); return; }
    if (lv.exit) {
      if (!lv.exit.armed && !inDoor(lv.exit, H.R)) lv.exit.armed = true;
      if (lv.exit.armed && inDoor(lv.exit, -0.3 * H.R)) { this.leaveRoom(); return; }
    }
    for (const p of lv.pickups) { const at = !p.sold && near(p, p.r + 0.8 * H.R); if (at && !p.near) this.buy(p); p.near = at; }   // once per approach
    if (lv.kind === 'well') { const m = (this.startY - H.cy) / (R_PER_M * this.R); if (m > this.levelM) { this.levelM = m; this.idleT = 0; } else this.idleT += dt; }   // no new height: the fire speeds up
    if (H.minY > lv.cam + view.h - view.keep + (view.keep ? 0 : CAM.deathPad)) this.fall();   // off the bottom, or behind the touch keys
  }
  // From above it is a stomp; anything else is a hit.
  meet(e) {
    if (e.state === 'shell' || (e.type === 'mini' && e.t < 0.35)) return;   // a rolling shell, a mini just out of a splitter: harmless
    const H = this.hero, b = e.body, dy = b.cy - H.cy, dx = Math.abs(b.cx - H.cx), rel = H.rigVy - b.rigVy;
    const above = dy > 0.42 * (H.R + b.R) && dy > dx * 0.5 && rel > -280;
    const can = e === this.lv.boss ? e.angry <= 0 : e.def.stomp;
    if (above && can) this.stomp(e); else this.hurt(H.cx - b.cx, H.cy - b.cy);
  }
  stomp(e) {
    const H = this.hero, lv = this.lv, boss = e === lv.boss;
    if (boss) this.hitBoss();
    else if (e.type === 'shell') this.shellUp(e);
    else {
      this.kill(e, true);
      if (this.mods.blast) {
        fx.ring(e.body.cx, e.body.cy, STOMP.blast * this.R, [1, 0.9, 0.6]);
        for (const o of lv.enemies.slice()) if (o.def.stomp && Math.hypot(o.body.cx - e.body.cx, o.body.cy - e.body.cy) < STOMP.blast * this.R) this.kill(o, true);
      }
    }
    setVel(H, H.rigVx * STOMP.keepVx, -(boss ? BOSS.bounce : STOMP.bounce * this.mods.bounce) * this.vjump);
    unstick(H, 0.08); H.kickSquash(0, 1, 1.4);
    this.air = Math.max(this.air, 1); this.sinceContact = JUMP.coyote + 1; this.rising = false;
    if (this.queueT > 0) { this.queueT = 0; this.air--; this.jump(true, this.queued); }   // pressed just before landing on it
    this.hitstop = STOMP.hitstop; shake.add(2.5); haptics.buzz(14);
    if (!boss) sound.play('stomp', 1, 1 + 0.06 * Math.min(this.combo, 10));   // higher with each stomp of a combo, as in Downwell
  }
  // A shell stomped: it rolls off away from the hero, into the others, and pops in a while.
  shellUp(e) {
    const b = e.body;
    e.state = 'shell'; e.shellT = SHELL.life; e.dir = b.cx >= this.hero.cx ? 1 : -1; b.kickSquash(0, 1, 2);
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo);
  }
  rolling(dt) {   // rolling shells knock out whatever they meet, and pop when their time is up
    const lv = this.lv;
    for (const e of lv.enemies.slice()) {
      if (e.state !== 'shell' || !lv.enemies.includes(e)) continue;
      const b = e.body;
      for (const o of lv.enemies.slice()) {   // bodies touching: their boxes meet (they push apart, so a pixel or two of slack)
        const q = o.body;
        if (o !== e && q.maxX > b.minX - 3 && q.minX < b.maxX + 3 && q.maxY > b.minY - 3 && q.minY < b.maxY + 3) { this.kill(o, true); shake.add(2); }
      }
      if ((e.shellT -= dt) <= 0) this.kill(e, true);
    }
  }
  kill(e, byHero) {
    const lv = this.lv, i = lv.enemies.indexOf(e);
    if (i < 0) return;
    lv.enemies.splice(i, 1);
    const b = e.body;
    splatFx(b.cx, b.cy, b.R, b.color.base);
    this.drop(b.cx, b.cy, Math.round(e.def.coins * this.mods.coinMul));
    if (e.type === 'splitter' && byHero) for (const d of [-1, 1]) {   // in two, thrown apart
      const m = new Foe({ type: 'mini', x: b.cx + d * 0.5 * b.R, y: b.cy, ledge: e.ledge, dir: d }, lv);
      setVel(m.body, d * 3 * this.R, -4 * this.R); lv.enemies.push(m); lv.foeTotal++;
    }
    if (byHero) { lv.foeKilled++; this.kills++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo); }
  }
  hitBoss() {
    const bs = this.lv.boss, b = bs.body;
    bs.hp--; this.drop(b.cx, b.cy, 5); shake.add(5); sound.play('bosshit', 1, bs.hp > 0 ? 1 : 0.7); splatFx(b.cx, b.maxY - b.R * 0.3, b.R * 0.5, b.color.base, 6);
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo);
    if (bs.hp > 0) { bs.angry = BOSS.angry; b.color = FOE_COLOR.red; b.growthTarget = 1 - 0.06 * (bs.max - bs.hp); ui.toast(tf('bossLeft', { n: bs.hp })); return; }
    bs.dead = true; this.kills++;
    splatFx(b.cx, b.cy, b.R * 1.4, FOE_COLOR.boss.base, 24); shake.add(9); haptics.buzz(60);
    this.drop(b.cx, b.cy, BOSS.coins);
    for (const o of this.lv.enemies.slice()) this.kill(o, false);
    this.lv.shots.length = 0;
    this.invuln = BOSS.winDelay + 1; this.winT = BOSS.winDelay;
  }
  drop(x, y, n) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = COIN.burst * rand(0.6, 1.25);
      this.lv.coins.push({ x, y, v: 1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drop: true, moving: true, t: 0, ph: rand(0, TAU) });
    }
  }
  hurt(dx, dy) {
    if (this.invuln > 0 || this.state !== 'play') return false;
    const H = this.hero, d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    this.hp--; this.invuln = HEALTH.invuln + this.mods.invuln;
    setVel(H, dx * HEALTH.knock, Math.min(dy * HEALTH.knock, 0) - HEALTH.knock * 0.45);
    unstick(H, 0.3); H.face.surprise = 1; H.kickSquash(dx, dy, 2); this.rising = false;
    this.hitstop = HEALTH.hitstop; shake.add(7); haptics.buzz(40); ui.hurt();
    if (this.hp > 0) sound.play('hurt');
    if (this.hp <= 0) this.die();
    return true;
  }
  room() { return Math.max(CAM.floorShow, view.keep + 0.6 * this.R); }   // what the camera shows under a ledge the hero stands on
  // The last few ledges the hero stood on (null: the floor), with where on them. Crumbling
  // ones and springs do not count, nor a spot beside spikes; a ledge kept here is never
  // pruned, so a fall after a long wall climb still finds it.
  markSafe(r) {
    const H = this.hero, x = H.cx;
    if (r && (r.crumble || r.spring || r.cap || r.gone)) return;
    if (r) for (const s of this.lv.spikes) if (s.dir === 0 && Math.abs(s.y1 - r.y0) < 1 && s.x1 > x - H.R && s.x0 < x + H.R) return;
    const last = this.safes[this.safes.length - 1], dx = r ? x - r.x0 : x;
    if (last && last.r === r) { last.dx = dx; return; }
    if (r) r.safe = true;
    this.safes.push({ r, dx });
    if (this.safes.length > 4) this.safes.shift();
  }
  // Where a fall comes back to: the newest of those ledges still there, a little above it.
  safeSpot() {
    const lv = this.lv, R = this.R;
    for (let i = this.safes.length - 1; i >= 0; i--) {
      const s = this.safes[i], r = s.r;
      if (r && r.gone) continue;
      if (!r) return { x: clamp(s.dx, lv.l + R, lv.r - R), y: lv.floor - 1.1 * R };
      const lo = r.x0 + 0.9 * R, hi = r.x1 - 0.9 * R;
      return { x: lo > hi ? (r.x0 + r.x1) / 2 : clamp(r.x0 + s.dx, lo, hi), y: r.y0 - 1.1 * R };
    }
    return { x: (lv.l + lv.r) / 2, y: lv.floor - 1.1 * R };
  }
  // Off the bottom of the screen: a heart, and back onto that ledge with the camera and a
  // moment of safety; the combo under way is lost, and fire over the ledge sinks below it.
  fall() {
    this.hp--; ui.hurt(); haptics.buzz(40); shake.add(5);
    if (this.hp <= 0) { this.die(); return; }
    sound.play('fall', 0.8);
    this.respawn();
  }
  respawn() {   // onto the last safe ledge, the camera with it
    const lv = this.lv, sp = this.safeSpot();
    this.combo = 0; ui.comboEnd(); this.rising = false;
    this.placeHero(sp.x, sp.y);
    this.invuln = HEALTH.invuln + this.mods.invuln; this.air = 0; this.queueT = 0; this.sinceContact = JUMP.coyote + 1;
    lv.cam = Math.max(Math.min(this.hero.cy - CAM.anchor * view.h, lv.floor + this.room() - view.h), lv.capY - CAM.top);
    if (lv.fire) { lv.fire.y = Math.max(lv.fire.y, sp.y + 0.45 * view.h); lv.fire.warn = null; }
    this.idleT = 0;
    ui.flash();
  }
  spikes() {
    const H = this.hero;
    for (const s of this.lv.spikes) {
      if (s.x1 < H.minX || s.x0 > H.maxX || s.y1 < H.minY - 1 || s.y0 > H.maxY + 1) continue;
      let hit = false;
      for (let i = 0; i < H.n && !hit; i++) hit = H.x[i] > s.x0 && H.x[i] < s.x1 && H.y[i] > s.y0 - 1 && H.y[i] < s.y1 + 1;
      if (!hit || (s.dir === 0 && this.mods.iron)) continue;
      const p = SPIKE_PUSH[s.dir];
      this.hurt(p[0], p[1]);
      return;
    }
  }
  // The fire spits at the hero while its top is on screen (a tongue flares where the blob will come
  // out first), throws up embers, and burns the enemies it rises over.
  fireStep(dt) {
    const lv = this.lv, f = lv.fire, H = this.hero, R = this.R;
    if (!f) return;
    if (f.warn) {
      if ((f.warn.t -= dt) <= 0) {   // up to about the hero's height, across to where it is
        const x = f.warn.x, vy = -Math.sqrt(2 * SHOT_G * Math.max(2 * R, f.y - H.cy + rand(-0.5, 1) * R)), t = -vy / SHOT_G;
        lv.shots.push({ x, y: f.y, vx: (H.cx + rand(-0.8, 0.8) * R - x) / t, vy, r: FIRE.blob * R, fire: true });
        f.warn = null; sound.play('spit', 0.7);
      }
    } else if (f.y < lv.cam + view.h && (f.spitT -= dt * this.mods.fire) <= 0) {
      f.warn = { x: clamp(H.cx + rand(-2.5, 2.5) * R, lv.l + R, lv.r - R), t: FIRE.warn };
      f.spitT = rand(FIRE.spit[0], FIRE.spit[1]);
    }
    if (f.y < lv.cam + view.h + R && Math.random() < dt * 14) fx.add(rand(lv.l, lv.r), f.y + rand(0, 6), rand(-25, 25), rand(-150, -50), rand(2, 3.5), rand(0.5, 0.9), Math.random() < 0.5 ? INK.fire : INK.flame, 1, 0);
    for (let i = lv.enemies.length - 1; i >= 0; i--) {
      const b = lv.enemies[i].body;
      if (b.cy > f.y) { splatFx(b.cx, f.y, b.R, INK.flame, 8); lv.enemies.splice(i, 1); }   // marmalade burns: no coins for it
    }
  }
  // Fire burns: a heart, and a throw back up even through a hit's safe moment; then it sinks a little.
  fireTouch() {
    const f = this.lv.fire, H = this.hero;
    if (!f || H.maxY < f.y) return;
    this.hurt(0, -1);
    sound.play('burn');
    if (this.state !== 'play') return;
    setVel(H, H.rigVx * 0.5, -FIRE.launch * this.vjump); unstick(H, 0.2); this.rising = false;
    splatFx(H.cx, f.y, this.R * 0.7, INK.flame, 6);
    f.y = Math.max(f.y, H.maxY + FIRE.back * view.h); f.warn = null;   // and sinks back: a throw into a ceiling must not land in it again
  }
  shots(dt) {
    const lv = this.lv, H = this.hero, sh = lv.shots;
    for (let i = sh.length - 1; i >= 0; i--) {
      const s = sh[i];
      s.vy += SHOT_G * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      let gone = s.y > lv.floor || s.y > lv.cam + view.h + 100 || (s.vy > 0 && lv.fire && s.y > lv.fire.y);   // a blob falls into the fire
      for (const r of lv.near(s.y, s.y)) if (!r.plank && s.x > r.x0 && s.x < r.x1) gone = true;
      if (Math.hypot(H.cx - s.x, H.cy - s.y) < H.R * 0.8 + s.r) { this.hurt(H.cx - s.x, H.cy - s.y); gone = true; }
      if (gone) { splatFx(s.x, s.y, s.r * 2, s.fire ? INK.flame : INK.spike, 4); sh.splice(i, 1); }
    }
  }
  collect(dt) {
    const H = this.hero, cs = this.lv.coins, mR = COIN.magnet * this.R * this.mods.magnet, cr = COIN.r * this.R, k = Math.exp(-COIN.drag * dt);
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      if (c.drop && (c.t += dt) > COIN.life) { cs.splice(i, 1); continue; }
      const dx = H.cx - c.x, dy = H.cy - c.y, d = Math.hypot(dx, dy) || 1;
      if (d < mR && (!c.drop || c.t > 0.25)) { c.moving = true; c.vx += (dx / d) * COIN.pull * dt; c.vy += (dy / d) * COIN.pull * dt; }
      if (c.moving) { c.vx *= k; c.vy *= k; c.x += c.vx * dt; c.y += c.vy * dt; }
      if (d < H.R * 0.85 + (c.v > 1 ? 1.4 : 1) * cr) { cs.splice(i, 1); this.coins += c.v; if (!c.drop) this.lv.coinsTaken++; fx.ring(c.x, c.y, cr * 1.6, INK.coin); ui.coinBump(); sound.play('coin', 0.6, c.v > 1 ? 0.8 : 1); }
    }
  }
  payCombo() {
    const n = this.combo, s = this.mods.comboShift;
    this.combo = 0; ui.comboEnd();
    let rw = null;
    for (const c of COMBO) if (n >= c.at - s) rw = c;
    if (!rw) return;
    this.coins += rw.coins;
    if (rw.hp) this.heal(rw.hp);
    ui.toast(tf('comboPay', { n, c: rw.coins }) + (rw.hp ? '  ' + t('comboHp') : ''), 1600);
    haptics.buzz(18); sound.play('combo');
  }
  // The first touch of each kind of surface, and the first sight of the fire, told once ever.
  notice() {
    const H = this.hero, lv = this.lv, m = H.wallMask, fr = H.floorRect;
    const coat = m & 1 ? lv.coatAt(1, H.cy) : m & 2 ? lv.coatAt(2, H.cy) : null;
    if (coat) this.hint(coat);
    if (fr && (m & 8)) { if (fr.crumble) this.hint('crumble'); else if (fr.slick) this.hint('ice'); }
    if (lv.fire && lv.fire.y < lv.cam + view.h) this.hint('fire');
  }
  hint(kind) { if (save.seen[kind] || this.stateT < 3) return; save.seen[kind] = 1; persist(); ui.toast(t('seen_' + kind), 2400); }   // not over the level's banner
  spring(r) {
    const H = this.hero; this.hint('spring');
    setVel(H, H.rigVx, -SPRING.v * this.vjump); unstick(H, 0.15); H.kickSquash(0, 1, -2.4); this.rising = false;
    r.t = SPRING.anim; this.sinceContact = JUMP.coyote + 1; sound.play('spring', 0.8);
    fx.ring((r.x0 + r.x1) / 2, r.y0, this.R, this.lv.theme.spring); haptics.buzz(12);
  }
  // Off a rubber wall: thrown back the way it came and a little up, a wall jump nobody pressed.
  rubberHit(side) {
    const H = this.hero, away = side === 1 ? 1 : -1, v = H.hitR[side - 1];
    if (v < RUBBER.min * this.R) return;
    setVel(H, away * Math.max(RUBBER.x * this.R, 0.8 * v), Math.min(H.rigVy, -RUBBER.up * this.vjump));
    unstick(H, 0.15); H.kickSquash(away, 0, 0.8); this.rising = false;
    sound.play('spring', 0.6, 1.3); fx.ring(side === 1 ? this.lv.l : this.lv.r, H.cy, 0.8 * this.R, this.lv.theme.rubber); haptics.buzz(10);
  }

  // ── Rooms behind bubbles (time stands still in the shaft meanwhile) ──
  enterRoom(bub) {
    if (!bub.room) {
      const room = new Level();
      room.reset({ kind: bub.kind, w: view.w, h: view.h, R: this.R, seed: (this.lv.rng() * 4294967296) >>> 0, world: this.lv.world, theme: THEMES.room, hard: this.hard });
      bub.room = room;
    }
    if (this.combo > 0) this.payCombo();
    this.well = this.lv; this.door = bub; this.lv = bub.room; this.lv.exit.armed = false;
    this.placeHero(this.lv.exit.x, this.lv.exit.y - 0.2 * this.R);
    aimCancel(); ui.flash(); ui.toast(t(bub.kind), 1400); sound.play('bubble');
  }
  leaveRoom() {
    const bub = this.door;
    this.lv = this.well; this.well = null; this.door = null;
    this.placeHero(bub.side === 1 ? bub.x1 + 1.2 * this.R : bub.x0 - 1.2 * this.R, bub.y1 - 1.1 * this.R);   // beside the door, on its ledge
    bub.cd = 1.2; aimCancel(); ui.flash(); ui.labels(null); sound.play('bubble', 0.8, 0.85);
  }
  buy(p) {
    const price = this.priceOf(p);
    if (p.item.can && !p.item.can(this)) { ui.toast(t('noNeed'), 1200); sound.play('deny', 0.7); return; }
    if (this.coins < price) { ui.toast(tf('poor', { n: price - this.coins }), 1200); haptics.buzz(8); sound.play('deny', 0.7); return; }
    this.coins -= price; p.sold = true; p.item.apply(this); sound.play('buy');
    splatFx(p.x, p.y, p.r * 2, p.item.color, 8); haptics.buzz(16);
    if (p.item.id !== 'upgrade') ui.toast(L2(p.item.name), 1200);
  }

  // ── The run's turns ──
  levelClear() {
    this.state = 'clear'; this.stateT = 0;
    const H = this.hero;
    H.gScale = 0; H.sticky = false; unstick(H, 9); H.face.surprise = 1;   // and into the hole (see suck)
    if (this.combo > 0) this.payCombo();
    const lv = this.lv, allCoins = lv.coinsTaken >= lv.coinTotal, allFoes = lv.foeKilled >= lv.foeTotal;   // the stars, paid at once
    this.stars = { n: 1 + allCoins + allFoes, coins: [lv.coinsTaken, lv.coinTotal], foes: [lv.foeKilled, lv.foeTotal] };
    this.stars.pay = STARS.coins[this.stars.n - 1]; this.coins += this.stars.pay;
    this.climbed += this.levelM; this.levelM = 0;
    haptics.buzz(20); sound.play('portal');   // no toast: it would hide the hole
  }
  // The way out swallows the hero: pulled to the hole's middle on a tightening spiral, shrinking away.
  suck(dt) {
    const H = this.hero, p = this.lv.portal, dx = p.x - H.cx, dy = p.y - H.cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, this.stateT * 2);
    const sp = Math.min(PORTAL.pull * this.R * k, d * 10), turn = PORTAL.spin * this.R * (1 - k * 0.6);
    setVel(H, (dx / d) * sp - (dy / d) * turn, (dy / d) * sp + (dx / d) * turn);
    H.growthTarget = Math.max(0.04, 1 - this.stateT / PORTAL.shrink);
  }
  pick(u) {
    this.takeUpgrade(u);
    if (++this.stage >= 3) { this.stage = 0; this.world++; }
    this.state = 'play'; this.stateT = 0;
    this.buildLevel(false);
    ui.hideAll(); ui.banner();
  }
  die() {   // the run ends here, unless there are coins enough to go on (see revive)
    if (this.state !== 'play') return;
    this.hp = Math.max(0, this.hp); this.state = 'dead'; this.stateT = 0; this.result = null;
    const H = this.hero, lv = this.lv;   // it bursts where it can be seen (a fall ends below the screen)
    burstFx(H.cx, clamp(H.cy, lv.cam + this.R, lv.cam + view.h - this.R), this.R, H.color.base); shake.add(12);
    input.clear(); haptics.buzz(30); sound.play('die');
    if (this.coins < this.revivePrice()) this.finish(false);
  }
  revivePrice() { return Math.round(REVIVE.price * (1 + 0.5 * Math.min(this.world, 4)) * Math.pow(REVIVE.grow, this.revives) * (this.hard ? 1.5 : 1)); }
  // Back from the end for coins: on the last safe ledge, with a couple of hearts and a long moment of safety.
  revive() {
    const price = this.revivePrice();
    if (this.state !== 'dead' || this.result || this.coins < price) return;
    this.coins -= price; this.revives++; this.hp = Math.min(this.maxHp, REVIVE.hp);
    this.state = 'play'; this.stateT = 0; ui.hideAll();
    this.respawn(); this.invuln = REVIVE.invuln;
    sound.play('buy'); haptics.buzz(16);
  }
  giveUp() { this.finish(false); ui.result(this.result); }
  win() { this.state = 'won'; this.stateT = 0; input.clear(); sound.play('combo', 1, 0.8); this.finish(true); }
  finish(won) {
    const bank0 = save.bank, total = Math.floor(this.climbed + this.levelM), firstWin = won && save.wins === 0;
    save.bank += this.coins; save.best = Math.max(save.best, total);
    if (won) save.wins++;
    persist();
    const fresh = UNLOCKS.filter((u) => u.at > bank0 && u.at <= save.bank);
    this.result = { won, total, coins: this.coins, kills: this.kills, combo: this.bestCombo, where: this.where(), fresh, firstWin };
  }
  where() { return this.world >= WORLDS.length ? L2(SUMMIT.name) : L2(this.wd.name) + ' ' + (this.world + 1) + '-' + (this.stage + 1); }
  togglePause(on) {
    if (on && this.state === 'play') { this.paused = this.state; this.state = 'pause'; input.clear(); ui.pause(); }
    else if (!on && this.state === 'pause') { this.state = this.paused; loop.last = performance.now(); ui.hideAll(); }
  }

  // ── Once per drawn frame ──
  impact(b, nx, ny, speed, x, y, floor) {   // as in Gum's World: an impact squashes, a hard one puffs and shakes
    if (b.impactCD > 0) return;
    b.impactCD = IMPACT.cooldown;
    b.kickSquash(nx, ny, Math.min(SQUASH.impactMax, speed * SQUASH.impactGain));
    if (!b.isHero) return;
    sound.play('land', clamp((speed - IMPACT.minSpeed) / 1400, 0.15, 0.8));
    if (speed > IMPACT.buzzSpeed) haptics.buzz(Math.min(28, speed / 90));
    if (floor && speed > IMPACT.puffSpeed) fx.dust(x, y, speed);
    if (speed > IMPACT.shakeSpeed) shake.add(Math.min(IMPACT.shakeMax, (speed - IMPACT.shakeSpeed) * IMPACT.shakePer + 1.5));
    if (speed > 900) b.face.surprise = Math.max(b.face.surprise, 0.55);
  }
  frame(dt, alpha, now) {
    const lv = this.lv, b = this.hero;
    this.stateT += dt;
    if (this.state === 'clear' && this.stateT > 0.8 && !ui.open) ui.cards(this.offer());
    if (this.state === 'dead' && this.stateT > 1 && !ui.open) { if (this.result) ui.result(this.result); else ui.revive(this.revivePrice(), this.coins); }
    if (this.state === 'won' && this.stateT > 0.4 && !ui.open) ui.result(this.result);
    if (this.winT > 0 && this.state === 'play' && (this.winT -= dt) <= 0) this.win();
    if (lv.kind === 'well' && this.state === 'play') {   // keep the drawn hero at the anchor; only ever climb
      let cy = 0;
      for (let i = 0; i < b.n; i++) cy += b.sy[i] + (b.y[i] - b.sy[i]) * alpha;
      cy /= b.n;
      const target = cy - CAM.anchor * view.h;
      if (target < lv.cam) lv.cam += (target - lv.cam) * (1 - Math.exp(-CAM.follow * dt));
      const down = b.maxY + this.room() - view.h;   // and down, so the hero never sinks under the touch keys: as far as the newest safe ledge
      if (down > lv.cam) lv.cam = Math.min(down, this.safeSpot().y + 1.1 * this.R + this.room() - view.h, lv.floor + this.room() - view.h);
      lv.cam = Math.max(lv.cam, lv.capY - CAM.top);
    }
    lv.ensure(lv.cam - view.h * LEVEL.ahead);
    if ((this.pruneT += dt) > 0.5) { this.pruneT = 0; if (lv.kind === 'well') lv.prune(lv.cam + view.h * (1 + LEVEL.behind)); }
    const d = input.dir;   // the hero looks where it runs
    if (d && this.state === 'play') { this.heroLook.x = b.cx + d * 240; this.heroLook.y = b.cy - 40; this.heroLook.t = now; }
    b.face.update(dt, b, this.heroLook, now);
    this.look.x = b.cx; this.look.y = b.cy; this.look.t = now;
    for (const e of lv.enemies) e.body.face.update(dt, e.body, this.look, now);
    if (lv.boss && !lv.boss.dead) lv.boss.body.face.update(dt, lv.boss.body, this.look, now);
    ui.frame(this);
  }
}

// ── UI ───────────────────────────────────────────────────────
// The HUD, toasts and the four panels (menu, upgrade cards, pause, result) are DOM over
// the canvas column, and so is the touch pad.
const $ = (id) => document.getElementById(id);
const rgb = (c) => 'rgb(' + c.map((v) => Math.round(v * 255)).join(',') + ')';
// ── Pixel type ──
// A 7-pixel-tall capitals font, Latin and Cyrillic (the letters drawn alike share a glyph),
// drawn by hand: rows top to bottom, '#' ink. Text is set as one crisp SVG path; CSS sizes
// it (--p: CSS px per font pixel, 2 = a game pixel) and colours it (currentColor), and a
// visually hidden copy keeps it readable for screen readers.
const FONT = {
  A: '.##./#..#/#..#/####/#..#/#..#/#..#', B: '###./#..#/#..#/###./#..#/#..#/###.', C: '.##./#..#/#.../#.../#.../#..#/.##.',
  D: '###./#..#/#..#/#..#/#..#/#..#/###.', E: '####/#.../#.../###./#.../#.../####', F: '####/#.../#.../###./#.../#.../#...',
  G: '.##./#..#/#.../#.##/#..#/#..#/.###', H: '#..#/#..#/#..#/####/#..#/#..#/#..#', I: '###/.#./.#./.#./.#./.#./###',
  J: '...#/...#/...#/...#/#..#/#..#/.##.', K: '#..#/#..#/#.#./##../#.#./#..#/#..#', L: '#.../#.../#.../#.../#.../#.../####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#..#/##.#/##.#/#.##/#.##/#..#/#..#', O: '.##./#..#/#..#/#..#/#..#/#..#/.##.',
  P: '###./#..#/#..#/###./#.../#.../#...', Q: '.##./#..#/#..#/#..#/#..#/#.#./.#.#', R: '###./#..#/#..#/###./#.#./#..#/#..#',
  S: '.###/#.../#.../.##./...#/...#/###.', T: '#####/..#../..#../..#../..#../..#../..#..', U: '#..#/#..#/#..#/#..#/#..#/#..#/.##.',
  V: '#...#/#...#/#...#/#...#/.#.#./.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '####/...#/..#./.#../#.../#.../####',
  0: '.##./#..#/#..#/#..#/#..#/#..#/.##.', 1: '.#./##./.#./.#./.#./.#./###', 2: '.##./#..#/...#/..#./.#../#.../####',
  3: '###./...#/...#/.##./...#/...#/###.', 4: '..#./.##./#.#./#.#./####/..#./..#.', 5: '####/#.../###./...#/...#/#..#/.##.',
  6: '.##./#.../#.../###./#..#/#..#/.##.', 7: '####/...#/..#./..#./.#../.#../.#..', 8: '.##./#..#/#..#/.##./#..#/#..#/.##.',
  9: '.##./#..#/#..#/.###/...#/...#/.##.',
  Б: '####/#.../#.../###./#..#/#..#/###.', Г: '####/#.../#.../#.../#.../#.../#...', Д: '.###./.#.#./.#.#./.#.#./.#.#./#####/#...#',
  Ж: '#.#.#/#.#.#/.###./..#../.###./#.#.#/#.#.#', З: '.##./#..#/...#/.##./...#/#..#/.##.', И: '#..#/#.##/#.##/##.#/##.#/#..#/#..#',
  Й: '.##./..../#..#/#.##/##.#/#..#/#..#', Л: '.###/.#.#/.#.#/.#.#/.#.#/.#.#/##.#', П: '####/#..#/#..#/#..#/#..#/#..#/#..#',
  У: '#..#/#..#/#..#/.###/...#/...#/###.', Ф: '..#../.###./#.#.#/#.#.#/#.#.#/.###./..#..', Ц: '#..#./#..#./#..#./#..#./#..#./#####/....#',
  Ч: '#..#/#..#/#..#/.###/...#/...#/...#', Ш: '#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####', Щ: '#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####/....#',
  Ъ: '##.../.#.../.#.../.###./.#..#/.#..#/.###.', Ы: '#...#/#...#/#...#/###.#/#.#.#/#.#.#/###.#', Ь: '#.../#.../#.../###./#..#/#..#/###.',
  Э: '###./...#/...#/.###/...#/...#/###.', Ю: '#..#./#.#.#/#.#.#/###.#/#.#.#/#.#.#/#..#.', Я: '.###/#..#/#..#/.###/.#.#/#..#/#..#',
  Ё: '#.#./..../####/#.../###./#.../####',
  ' ': '../../../../../../..', '.': '././././././#', ',': '../../../../../.#/#.', ':': '././#/././#/.', ';': '../../.#/../../.#/#.',
  '!': '#/#/#/#/#/./#', '?': '.##./#..#/...#/..#./.#../..../.#..', "'": '#/#/././././.', '"': '#.#/#.#/.../.../.../.../...',
  '-': '.../.../.../###/.../.../...', '—': '...../...../...../#####/...../...../.....', '+': '.../.../.#./###/.#./.../...',
  '×': '.../.../#.#/.#./#.#/.../...', '/': '..#/..#/.#./.#./.#./#../#..', '(': '.#/#./#./#./#./#./.#', ')': '#./.#/.#/.#/.#/.#/#.',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##', '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '·': './././#/././.',
  '●': '...../.###./#####/#####/#####/.###./.....', '✓': '...../....#/...##/#.##./###../.#.../.....',
  '←': '...../..#../.#.../#####/.#.../..#../.....', '→': '...../..#../...#./#####/...#./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../..#..', '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
  '▲': '...../..#../..#../.###./.###./#####/.....', '▼': '...../#####/.###./.###./..#../..#../.....',
  '◀': '...#/..##/.###/####/.###/..##/...#', '▶': '#.../##../###./####/###./##../#...',
  '\u{E000}': '...#.../..##.#./####..#/####..#/####..#/..##.#./...#...', '\u{E001}': '...#.../..##.../####.#./#####.#/####.#./..##.../...#...',   // sound on / off
};
for (const [c, l] of Object.entries({ А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X' })) FONT[c] = FONT[l];
for (const c in FONT) FONT[c] = FONT[c].split('/');
// Rows of '#' as an SVG path, at (x, y) in font pixels.
function inkPath(rows, x, y) {
  let d = '';
  rows.forEach((row, ry) => { for (let k = 0; k < row.length;) { if (row[k] !== '#') { k++; continue; } let e = k; while (e < row.length && row[e] === '#') e++; d += `M${x + k} ${y + ry}h${e - k}v1h${k - e}z`; k = e; } });
  return d;
}
const pxSvg = (W, H, paths) => `<svg aria-hidden="true" viewBox="0 0 ${W} ${H}" style="--w:${W};--h:${H}" shape-rendering="crispEdges">${paths}</svg>`;
// Text in the pixel font, centred line under line (or `left`); `max` (font pixels) wraps at spaces.
function px(text, max = Infinity, left = false) {
  const glyph = (c) => FONT[c] || FONT['?'], width = (s) => [...s].reduce((w, c, i) => w + glyph(c)[0].length + (i ? 1 : 0), 0), lines = [];
  for (const raw of String(text).toUpperCase().split('\n')) {
    let cur = '';
    for (const word of raw.split(' ')) { const next = cur ? cur + ' ' + word : word; if (cur && width(next) > max) { lines.push(cur); cur = word; } else cur = next; }
    lines.push(cur);
  }
  const W = Math.max(1, ...lines.map(width)), H = lines.length * 10 - 3;
  let d = '';
  lines.forEach((ln, i) => { let x = left ? 0 : Math.floor((W - width(ln)) / 2); for (const c of ln) { d += inkPath(glyph(c), x, i * 10); x += glyph(c)[0].length + 1; } });
  const e = document.createElement('span');
  e.className = 'px';
  e.innerHTML = pxSvg(W, H, `<path fill="currentColor" d="${d}"/>`) + '<span class="sr"></span>';
  e.lastChild.textContent = text;
  return e;
}
// An ICONS picture as pixel SVG, a path per ink in the page's palette colours.
function iconEl(id) {
  const rows = ICONS[id], e = document.createElement('i');
  let paths = '';
  for (const c in ICON_INK) {
    const d = inkPath(rows.map((r) => r.replace(/./g, (q) => (q === c ? '#' : '.'))), 0, 0);
    if (d) paths += `<path fill="var(--${ICON_INK[c] === 'black' ? 'ink' : ICON_INK[c]})" d="${d}"/>`;
  }
  e.className = 'px ico'; e.innerHTML = pxSvg(rows[0].length, rows.length, paths);
  return e;
}
const HEART = { full: '.##.##./#######/#######/.#####./..###../...#...'.split('/'), empty: '.##.##./#..#..#/#.....#/.#...#./..#.#../...#...'.split('/') };
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null && text !== '') e.append(px(text)); return e; }
function button(text, cls, fn) { const b = el('button', cls, text); b.addEventListener('click', (e) => { e.stopPropagation(); sound.unlock(); sound.play('click', 0.6); fn(); }); return b; }
const ui = {
  open: null, hp: -1, max: -1, coins: -1, m: -1, stage: '', labelEls: [],
  panel(id) { this.hideAll(); const p = $(id); p.replaceChildren(); p.classList.add('on'); this.open = id; return p; },
  hideAll() { for (const id of ['menu', 'cards', 'pause', 'result']) $(id).classList.remove('on'); this.open = null; },
  menu() {
    const p = this.panel('menu');
    p.append(el('h1', 'title', 'UPWELL'));
    const colors = el('div', 'pickers');   // the hero shows through above; under it its five colours, what the chosen one starts with, and Play
    for (const u of UNLOCKS) {
      const open = opened(u), b = button('', 'chip swatch' + (save.color === u.id ? ' on' : '') + (open ? '' : ' locked'), () => {
        if (!open) return;
        save.color = u.id; persist(); game.makeHero(); this.menu();
      });
      b.style.background = rgb(colorById(u.id).base);
      if (!open) b.append(el('small', null, u.at));   // what it costs, in coins of all runs
      colors.append(b);
    }
    p.append(colors);
    const perk = UPGRADES.find((x) => x.id === (UNLOCKS.find((u) => u.id === save.color) || {}).perk);
    if (perk) { const line = el('div', 'perk'); line.append(iconEl(perk.id), px(L2(perk.name)[1], 130, true)); p.append(line); }
    if (save.wins > 0) {
      const h = button(t('hard') + (save.hard ? ' ✓' : ''), 'chip wide' + (save.hard ? ' on' : ''), () => { save.hard = !save.hard; persist(); this.menu(); });
      p.append(h);
    }
    p.append(button(t('play'), 'big', () => game.startRun()));
    const s = button('', 'iconBtn', () => { sound.toggle(); this.menu(); });   // sound on and off, a speaker in the corner
    s.append(px(save.sound === false ? '\u{E001}' : '\u{E000}')); s.setAttribute('aria-label', t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'));
    p.append(s);
  },
  soundChip(again) { return button(t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'), 'chip wide', () => { sound.toggle(); again(); }); },
  cards(list) {
    const p = this.panel('cards'), st = game.stars;
    if (st) {   // the level's stars, what they paid and what they were for
      const row = el('div', 'stars');
      for (let k = 0; k < 3; k++) row.append(iconEl(k < st.n ? 'star' : 'starOff'));
      row.append(px('+' + st.pay));
      p.append(row, el('div', 'label', tf('starLine', { c: st.coins.join('/'), f: st.foes.join('/') })));
    }
    p.append(el('div', 'head', t('pick')));
    for (const u of list) {
      const [name, desc] = L2(u.name), c = button('', 'card', () => game.pick(u)), d = el('span');
      d.append(px(desc, 118, true));
      c.append(iconEl(u.id), el('b', null, name), d);
      p.append(c);
    }
  },
  pause() {
    const p = this.panel('pause');
    p.append(el('div', 'head', t('paused')), button(t('resume'), 'big', () => game.togglePause(false)), button(t('menu'), 'chip wide', () => game.toMenu()),
      this.soundChip(() => this.pause()));
  },
  revive(price, coins) {   // before the result: go on for coins, or end the run
    const p = this.panel('result');
    p.append(el('div', 'head', t('reviveQ')), button(t('revive'), 'big', () => game.revive()), el('div', 'label', tf('reviveCost', { n: price, c: coins })),
      button(t('giveUp'), 'chip wide', () => game.giveUp()));
  },
  result(r) {
    const p = this.panel('result');
    p.append(el('div', 'head', r.won ? t('won') : t('dead')));
    const rows = [[t('height'), r.total + ' ' + t('m')], [t('reached'), r.where], [t('coins'), r.coins], [t('kills'), r.kills], [t('combo'), r.combo]];
    const tb = el('div', 'rows');
    for (const [k, v] of rows) { const row = el('div', 'row'); row.append(el('span', null, k), el('b', null, String(v))); tb.append(row); }
    p.append(tb);
    if (r.fresh.length || r.firstWin) {
      const u = el('div', 'fresh');
      u.append(el('div', 'label', t('unlocked')));
      for (const f of r.fresh) { const c = el('span', 'chip swatch on'); c.style.background = rgb(colorById(f.id).base); u.append(c); }
      if (r.firstWin) u.append(el('div', null, t('hardOpen')));
      p.append(u);
    }
    p.append(button(t('again'), 'big', () => game.startRun()), button(t('menu'), 'chip wide', () => game.toMenu()));
  },
  toastTimer: 0,
  toast(text, ms = 1500) {
    const e = $('toast');
    e.replaceChildren(px(text, Math.floor((view.w - 64) / 2))); e.classList.add('show');
    clearTimeout(this.toastTimer);
    if (ms) this.toastTimer = setTimeout(() => e.classList.remove('show'), ms);   // 0 keeps it up
  },
  banner() {
    if (game.world >= WORLDS.length) { this.toast(L2(SUMMIT.name), 1800); return; }
    const intro = (game.wd.intro && game.wd.intro[game.stage]) || {}, news = [intro.news && L2(intro.news), game.lv.dark && t('dark')].filter(Boolean).join(', ');
    this.toast(tf('world', { n: game.world + 1 }) + ' · ' + L2(game.wd.name) + '  ' + (game.world + 1) + '-' + (game.stage + 1) + (news ? '\n' + tf('news', { n: news }) : ''), news ? 2800 : 1800);   // and what this level brings
  },
  comboPop(n) { const e = $('combo'); e.replaceChildren(px('×' + n)); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop', 'show'); },
  comboEnd() { $('combo').classList.remove('show'); },
  hurt() { const e = $('hearts'); e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); },
  coinBump() { const e = $('purse'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); },
  flash() { const e = $('fade'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); },
  // Price tags over the items of a shop (they stay put: a room's camera does not move); the
  // middle one stands a tag higher, so long names next to each other do not overlap.
  labels(lv) {
    const box = $('labels');
    if (!lv || !lv.pickups.length) { if (this.labelEls.length) { box.replaceChildren(); this.labelEls = []; } return; }
    if (this.labelEls.length !== lv.pickups.length) { box.replaceChildren(); this.labelEls = lv.pickups.map(() => box.appendChild(el('div', 'tag'))); }
    lv.pickups.forEach((p, i) => {
      const e = this.labelEls[i], price = game.priceOf(p), text = L2(p.item.name) + '\n' + (p.sold ? t('sold') : price ? price : t('free'));
      if (e.dataset.text !== text) { e.dataset.text = text; e.replaceChildren(px(text, 34)); e.h = 0; }
      if (!e.h) e.h = e.offsetHeight;
      e.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y - p.r - 8 - e.h * (i === 1 ? 2.1 : 1) - lv.cam) + 'px) translateX(-50%)';
      e.classList.toggle('dim', p.sold || price > game.coins);
    });
  },
  frame(g) {
    const playing = g.state !== 'menu' && g.state !== 'boot';
    $('hud').classList.toggle('on', playing);
    $('pad').classList.toggle('on', coarse && g.state === 'play');
    if (g.hp !== this.hp || g.maxHp !== this.max) {
      this.hp = g.hp; this.max = g.maxHp;
      const h = $('hearts');
      h.replaceChildren();
      for (let i = 0; i < g.maxHp; i++) { const k = i < g.hp ? 'full' : 'empty', s = el('i', k); s.innerHTML = pxSvg(7, 6, `<path fill="currentColor" d="${inkPath(HEART[k], 0, 0)}"/>`); h.append(s); }
    }
    if (g.coins !== this.coins) { this.coins = g.coins; $('coins').replaceChildren(px(g.coins)); }
    const m = Math.floor(g.climbed + g.levelM);
    if (m !== this.m) { this.m = m; $('height').replaceChildren(px(m + ' ' + t('m'))); }
    const st = g.lv.kind === 'shop' || g.lv.kind === 'treasure' ? t(g.lv.kind) : g.world >= WORLDS.length ? L2(SUMMIT.name) : (g.world + 1) + '-' + (g.stage + 1);
    if (st !== this.stage) { this.stage = st; $('stage').replaceChildren(px(st)); }
    const c = $('combo');
    if (g.combo > 0 && g.hero) c.style.transform = 'translate(' + Math.round(g.hero.cx) + 'px,' + Math.round(g.hero.minY - g.lv.cam - 30) + 'px) translateX(-50%)';
    this.labels(g.lv.kind === 'shop' || g.lv.kind === 'treasure' ? g.lv : null);
  },
};

// ── Controls ─────────────────────────────────────────────────
// As in Downwell: left, right and jump, plus down to let go of a wall or a ceiling.
// Keyboard: the arrows and space. Touch: a pad along the bottom, left and right under the
// left thumb (it can slide from one to the other), down and jump under the right one.
const input = {
  left: false, right: false, down: false, jump: false,
  get dir() { return (this.right ? 1 : 0) - (this.left ? 1 : 0); },
  set(what, on) {
    if (this[what] === on) return;
    this[what] = on;
    if (what === 'jump') { if (on) game.requestJump(); else game.releaseJump(); }
    else if (what === 'down' && on) game.pressDown();
  },
  clear() {
    aimCancel();
    for (const k of ['left', 'right', 'down', 'jump']) this.set(k, false);
    for (const e of document.querySelectorAll('#pad .on')) e.classList.remove('on');
  },
};
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', Space: 'jump' };
document.addEventListener('keydown', (e) => {
  const k = KEYS[e.code];
  if (!k || game.state !== 'play') return;
  e.preventDefault();
  if (!e.repeat) input.set(k, true);
});
document.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input.set(k, false); });
// A part of the pad follows the finger that pressed it until that finger lets go.
function padPart(part, onTouch) {
  let id = -1;
  part.addEventListener('pointerdown', (e) => {
    if (id !== -1) return;
    id = e.pointerId; e.preventDefault();
    try { part.setPointerCapture(id); } catch (err) { /* fine */ }
    onTouch(e);
  });
  part.addEventListener('pointermove', (e) => { if (e.pointerId === id) onTouch(e); });
  for (const type of ['touchstart', 'touchmove']) part.addEventListener(type, (e) => e.preventDefault(), { passive: false });   // no selection, loupe or callout in Safari
  part.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) part.addEventListener(type, (e) => { if (e.pointerId === id) { id = -1; onTouch(null); } });
}
const dpad = $('dpad');
dpad.children[0].append(px('◀')); dpad.children[1].append(px('▶')); $('downBtn').append(px('▼')); $('jumpBtn').append(px('▲'));
padPart(dpad, (e) => {
  const r = dpad.getBoundingClientRect(), right = !!e && e.clientX > r.left + r.width / 2;
  input.set('left', !!e && !right); input.set('right', right);
  dpad.children[0].classList.toggle('on', input.left); dpad.children[1].classList.toggle('on', input.right);
});
for (const [id, what] of [['jumpBtn', 'jump'], ['downBtn', 'down']]) {
  const btn = $(id);
  padPart(btn, (e) => { input.set(what, !!e); btn.classList.toggle('on', !!e); });
}

// ── Sound ────────────────────────────────────────────────────
// Effects and music made with ElevenLabs (tools/audio.py). One Web Audio context, made on the first key press or
// touch (browsers keep sound off until then). Effects play with a little random pitch; music loops and cross-fades:
// calm in the menu and the rooms, climb in the shaft, boss at the summit, quieter while paused or over. It sleeps
// while the page is hidden; "sound" in the menu and the pause turns it off and on (saved).
const SOUNDS = ['jump', 'airjump', 'walljump', 'land', 'stomp', 'coin', 'hurt', 'fall', 'die', 'spring', 'crumble', 'combo',
  'buy', 'deny', 'bubble', 'portal', 'click', 'bosshit', 'burn', 'spit'];
const MUSIC_VOL = 0.4, FX_VOL = 0.7;
const sound = {
  ctx: null, out: null, fx: null, mus: null, bufs: {}, track: null, src: null, gain: null, duck: 1,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.out = c.createGain(); this.out.gain.value = save.sound === false ? 0 : 1; this.out.connect(c.destination);
    this.fx = c.createGain(); this.fx.gain.value = FX_VOL; this.fx.connect(this.out);
    this.mus = c.createGain(); this.mus.gain.value = MUSIC_VOL; this.mus.connect(this.out);
    const load = (name, path) => fetch(path).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a)).then((b) => { this.bufs[name] = b; }).catch(() => {});
    for (const n of SOUNDS) load(n, 'assets/sfx/' + n + '.mp3');
    for (const n of ['climb', 'calm', 'boss']) load('m:' + n, 'assets/music/' + n + '.mp3');
  },
  play(name, vol = 1, rate = 1) {
    const b = this.bufs[name];
    if (!b || save.sound === false || this.ctx.state !== 'running') return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; s.playbackRate.value = rate * (0.96 + 0.08 * Math.random()); g.gain.value = vol;
    s.connect(g); g.connect(this.fx); s.start();
  },
  // A loop starts and ends where its sound does (an MP3 has a little silence padded at both ends).
  music(name) {
    const b = this.bufs['m:' + name];
    if (this.track === name || !b) return;
    const c = this.ctx, t = c.currentTime, d = b.getChannelData(0);
    if (this.src) { this.gain.gain.setTargetAtTime(0, t, 0.25); this.src.stop(t + 1.5); }
    let a = 0, z = d.length - 1;
    while (a < z && Math.abs(d[a]) < 1e-4) a++;
    while (z > a && Math.abs(d[z]) < 1e-4) z--;
    const src = c.createBufferSource(), gain = c.createGain();
    src.buffer = b; src.loop = true; src.loopStart = a / b.sampleRate; src.loopEnd = z / b.sampleRate;
    gain.gain.value = 0; gain.gain.setTargetAtTime(1, t, 0.4);
    src.connect(gain); gain.connect(this.mus); src.start(t, src.loopStart);
    this.track = name; this.src = src; this.gain = gain;
  },
  frame(g) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const kind = g.lv.kind;
    this.music(g.state === 'menu' || g.state === 'boot' || kind === 'shop' || kind === 'treasure' ? 'calm' : kind === 'boss' ? 'boss' : 'climb');
    const duck = g.state === 'play' || g.state === 'menu' ? 1 : 0.35;
    if (duck !== this.duck) { this.duck = duck; this.mus.gain.setTargetAtTime(MUSIC_VOL * duck, this.ctx.currentTime, 0.2); }
  },
  toggle() {
    save.sound = save.sound === false; persist();
    if (this.out) this.out.gain.setTargetAtTime(save.sound ? 1 : 0, this.ctx.currentTime, 0.05);
  },
  sleep(hidden) { if (this.ctx) { if (hidden) this.ctx.suspend(); else this.ctx.resume(); } },
};
for (const type of ['keydown', 'pointerdown', 'touchend', 'click']) document.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });

// ── Slingshot ────────────────────────────────────────────────
// With a mouse, as well as the keys: press anywhere, pull back, let go, and the squishy
// leaps the other way, off whatever it is on (a floor, a wall, a ceiling — never into it)
// or with its jump in the air. The pull sets the power, up to a full jump; one inside the
// dead zone is a cancel. While aiming, the body is squeezed along the launch line, it
// looks where it is going and dots show the arc. Touch keeps the pad.
const aim = { on: false, id: -1, sx: 0, sy: 0, x: 0, y: 0, p: 0, ux: 0, uy: -1, vx: 0, vy: 0 };
const dots = new Float32Array(JUMP.dots * 2);
let nDots = 0;
function aimUpdate() {
  const dx = aim.sx - aim.x, dy = aim.sy - aim.y, len = Math.hypot(dx, dy);
  if (len < JUMP.deadZone) { aim.p = 0; return; }
  let ux = dx / len, uy = dy / len;
  const n = game.surfaceNormal();
  if (n) {   // at least `minUp` out of the surface, still to the side it was aimed
    const tx = -n[1], ty = n[0], out = ux * n[0] + uy * n[1], along = ux * tx + uy * ty;
    if (out < JUMP.minUp) { const s = (along < 0 ? -1 : 1) * Math.sqrt(1 - JUMP.minUp * JUMP.minUp); ux = JUMP.minUp * n[0] + s * tx; uy = JUMP.minUp * n[1] + s * ty; }
  }
  aim.ux = ux; aim.uy = uy;
  aim.p = Math.min(1, (len - JUMP.deadZone) / (JUMP.dragFrac * view.w));
  const v = game.vjump * (JUMP.minPower + (1 - JUMP.minPower) * aim.p);
  aim.vx = ux * v; aim.vy = uy * v;
}
function aimCancel() { aim.on = false; aim.p = 0; nDots = 0; if (game.hero) game.hero.squeezeIn = 0; }
function aimFrame(now) {
  if (!aim.on) return;
  if (game.state !== 'play') { aimCancel(); return; }
  aimUpdate();
  const b = game.hero, look = game.heroLook;
  b.squeezeIn = JUMP.squeeze * aim.p;
  if (aim.p > 0) { b.sqAx = aim.ux; b.sqAy = aim.uy; look.x = b.cx + aim.ux * 240; look.y = b.cy + aim.uy * 240; look.t = now; }
}
// The arc as dots, from just outside the body until it meets a wall, a block or the floor.
function aimPreview() {
  nDots = 0;
  if (!aim.on || aim.p <= 0 || game.state !== 'play') return;
  const b = game.hero, lv = game.lv, g = WORLD.gravity, T = JUMP.preview / JUMP.dots, r2 = (1.2 * b.R) ** 2;
  for (let k = 1; k <= JUMP.dots; k++) {
    const s = k * T, x = b.cx + aim.vx * s, y = b.cy + aim.vy * s + 0.5 * g * s * s;
    if (x < lv.l || x > lv.r || y > lv.floor) break;
    let hit = false;
    for (const r of lv.near(y, y)) if (!r.plank && x > r.x0 && x < r.x1) { hit = true; break; }
    if (hit) break;
    if ((x - b.cx) ** 2 + (y - b.cy) ** 2 < r2) continue;
    dots[2 * nDots] = x; dots[2 * nDots + 1] = y; nDots++;
  }
}

// ── Setup ────────────────────────────────────────────────────
const canvas = $('gl');
const uiEl = $('ui');
const view = { w: 1, h: 1, left: 0, keep: 0 };   // keep: px at the bottom under the touch keys
const perf = { ctxLoss: 0 };   // the renderer counts lost contexts here (Gum sends them as telemetry)
const fx = new FX();
const game = new Game();
const renderer = new Renderer(canvas);
let paused = document.hidden, started = false, firstFrame = false, layoutQueued = false;
{ const s = new URLSearchParams(location.search).get('seed'); if (s != null && s !== '' && Number.isFinite(+s)) nextSeed = +s; }

// The view is a portrait column: the whole screen on a phone held upright, a 9:16
// column in the middle of a wider window.
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw < 120 || vh < 120) return;   // a collapsed frame or hidden host: keep the last layout
  const W = vw < vh ? vw : Math.min(vw, Math.round(vh * 0.5625)), H = vh, left = Math.round((vw - W) / 2);   // a phone held upright: all of its width
  view.w = W; view.h = H; view.left = left;
  const pad = $('pad');   // what the touch keys cover at the bottom (their height and the pad's padding, safe area and all)
  view.keep = coarse ? parseFloat(getComputedStyle(pad.querySelector('.key')).height) + parseFloat(getComputedStyle(pad).paddingBottom) + 8 : 0;
  for (const e of [canvas, uiEl]) { e.style.width = W + 'px'; e.style.height = H + 'px'; e.style.left = left + 'px'; }
  renderer.resize(W, H, window.devicePixelRatio || 1);   // the canvas a device pixel per pixel: the game pixels are copied up onto it
  game.applyMods();
  if (started && Math.abs(W - game.builtW) > 2) game.resized();
}
// Resizing the canvas clears it, so a resize is only flagged here and applied at the
// start of the next frame, right before drawing.
function queueLayout() { layoutQueued = true; }

canvas.addEventListener('pointerdown', (e) => {
  if (!JUMP.mouse || e.pointerType === 'touch' || !started || paused || e.button > 0 || game.state !== 'play' || aim.on) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  aim.on = true; aim.id = e.pointerId; aim.sx = aim.x = e.clientX - view.left; aim.sy = aim.y = e.clientY; aim.p = 0;
});
canvas.addEventListener('pointermove', (e) => { if (aim.on && e.pointerId === aim.id) { aim.x = e.clientX - view.left; aim.y = e.clientY; } });
function aimRelease(e, cancel) {
  if (!aim.on || e.pointerId !== aim.id) return;
  aim.x = e.clientX - view.left; aim.y = e.clientY;
  aimUpdate();
  const p = aim.p, vx = aim.vx, vy = aim.vy;
  aimCancel();
  if (!cancel && p > 0) game.requestJump({ vx, vy });
}
canvas.addEventListener('pointerup', (e) => aimRelease(e, false));
canvas.addEventListener('pointercancel', (e) => aimRelease(e, true));
canvas.addEventListener('lostpointercapture', (e) => aimRelease(e, false));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('pauseBtn').addEventListener('click', (e) => { e.stopPropagation(); game.togglePause(true); });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  paused = document.hidden; loop.last = performance.now(); sound.sleep(document.hidden);
  if (paused) { input.clear(); game.togglePause(true); }
});
window.addEventListener('blur', () => input.clear());
window.addEventListener('resize', queueLayout);
window.addEventListener('orientationchange', queueLayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', queueLayout);

// ── Loop ─────────────────────────────────────────────────────
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const loop = { last: 0, acc: 0, n: 0, ema: 16.7, prevRaw: 0, frozen: false, dpr: window.devicePixelRatio };
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - (loop.prevRaw || now);
  loop.prevRaw = now;
  if (raw > 0 && raw < 100) loop.ema += (raw - loop.ema) * 0.1;
  if (!started || paused || loop.frozen || renderer.lost || !renderer.ok) { loop.last = now; return; }
  if (coarse && loop.ema < 10 && (++loop.n & 1)) return;   // 120 Hz touch screens: draw at ~60
  runFrame(now);
}
// One frame: input → fixed-step physics → camera → draw. `fixedDt` is for the debug tick.
function runFrame(now, fixedDt) {
  if (window.devicePixelRatio !== loop.dpr) { loop.dpr = window.devicePixelRatio; layoutQueued = true; }   // moved to another screen
  if (layoutQueued) { layoutQueued = false; layout(); }
  let dt = fixedDt != null ? fixedDt : (now - loop.last) / 1000;
  loop.last = now;
  if (!(dt > 0)) dt = 0;
  if (dt > 0.25) dt = 0.25;
  if (game.state === 'pause') dt = 0;
  loop.acc += dt;
  let steps = 0;
  while (loop.acc >= STEP && steps < PHYS.maxSteps) { game.step(STEP); loop.acc -= STEP; steps++; }
  if (steps === PHYS.maxSteps) loop.acc = Math.min(loop.acc, STEP);   // slow down rather than spiral
  const alpha = loop.acc / STEP;
  game.frame(dt, alpha, now);
  sound.frame(game);
  aimFrame(now);
  aimPreview();
  fx.update(dt); updateBits(dt);
  shake.update(dt);
  renderer.draw(game, alpha, dots, nDots);
  if (!firstFrame) { firstFrame = true; canvas.classList.remove('wait'); }
}

function start() {
  if (started) return;
  lang = detectLang();
  document.documentElement.lang = lang;
  if (!renderer.ok) { ui.toast(t('nogl'), 0); return; }
  layout();
  started = true;
  game.toMenu();
  loop.last = performance.now();
}

// Debug handle for automated checks (read-only state and a few helpers).
window.__up = {
  version: VERSION,
  tuning: { HERO, MOVE, JUMP, LEVEL, CAM, HEALTH, STOMP, COMBO, COIN, STICK, WORLD, ENEMY, WORLDS, BOSS },
  get game() { return game; },
  get state() {
    const g = game, lv = g.lv;
    return { state: g.state, kind: lv.kind, world: g.world, stage: g.stage, seed: g.seed, cam: Math.round(lv.cam), hp: g.hp, maxHp: g.maxHp, coins: g.coins,
      combo: g.combo, kills: g.kills, air: g.air, climbed: +(g.climbed + g.levelM).toFixed(1), rects: lv.rects.length, enemies: lv.enemies.length,
      spawns: lv.spawns.length, coinsLeft: lv.coins.length, bubbles: lv.bubbles.length, portal: lv.portal && Math.round(lv.portal.y), ui: ui.open };
  },
  get hero() {
    const b = game.hero;
    return b && { x: Math.round(b.cx), y: Math.round(b.cy), R: +b.R.toFixed(1), minY: Math.round(b.minY), maxY: Math.round(b.maxY), mask: b.wallMask, stuck: b.stuck, vx: Math.round(b.rigVx), vy: Math.round(b.rigVy), contact: game.sinceContact === 0, invuln: +game.invuln.toFixed(2) };
  },
  get view() { return { w: view.w, h: view.h, left: view.left, canvasW: canvas.width, canvasH: canvas.height }; },
  play(seed) { nextSeed = seed == null ? null : seed; game.startRun(); return game.seed; },
  // jump straight to world w (0-based; 4 is the boss), level s
  go(w, s = 0, seed) { if (game.state === 'menu') game.startRun(); game.world = w; game.stage = s; nextSeed = seed == null ? null : seed; game.state = 'play'; game.buildLevel(false); ui.hideAll(); return this.state; },
  god(on = true) { game.invuln = on ? 1e9 : 0; return game.invuln; },
  give(n) { game.coins += n; return game.coins; },
  // Press or let go of a control as a player would: 'left', 'right', 'down' or 'jump'.
  key(what, on = true) { input.set(what, !!on); return { dir: input.dir, down: input.down, jump: input.jump }; },
  // A slingshot pull (dx, dy) in CSS px from where the mouse went down, let go at once.
  pull(dx, dy) {
    aim.on = true; aim.sx = 0; aim.sy = 0; aim.x = dx; aim.y = dy;
    aimUpdate();
    const p = aim.p, vx = aim.vx, vy = aim.vy;
    aimCancel();
    if (p > 0) game.requestJump({ vx, vy });
    return { p: +p.toFixed(2), vx: Math.round(vx), vy: Math.round(vy) };
  },
  // Headless checks: freeze the real-time loop, advance by fixed frames even when the
  // page is hidden or paused, and grab the canvas as a JPEG.
  freeze(on = true) { loop.frozen = !!on; return loop.frozen; },
  tick(frames = 1, ms = 1000 / 60) {
    if (!started || !renderer.ok) return false;
    for (let i = 0; i < frames; i++) runFrame(performance.now(), ms / 1000);
    return true;
  },
  snapshot(width = 640, quality = 0.8) {
    if (!started || !renderer.ok) return null;
    runFrame(performance.now(), 0);
    const c = document.createElement('canvas'), k = width / canvas.width;
    c.width = width; c.height = Math.round(canvas.height * k);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  },
};

requestAnimationFrame(frame);
start();
