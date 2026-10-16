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
    hintKeys: '← → to move, space to jump, ↓ to let go.\nLand on enemies from above!', hintMouse: '← → to move, space to jump, ↓ to let go,\nor pull back with the mouse and let go.\nLand on enemies from above!', hintTouch: '◀ ▶ or drag to move, ▲ or a tap to jump,\nflick down to let go. Land on enemies from above!', play: 'Play',
    hard: 'Hard mode', world: 'World {n}', pick: 'Pick an upgrade', dead: 'Run over', won: 'You made it out!',
    tapJump: 'Tap to jump', keyJump: 'Space to jump', bonus: 'Bonus', sec: 's', bonusGot: 'Bonus: +{n} coins', timeUp: 'Time!', caught: 'Caught!', starLine: 'Coins {c} · Enemies {f}', news: 'New: {n}', dark: 'darkness',
    seen_moss: 'Moss holds you: a place to rest', seen_rubber: 'Rubber throws you off', seen_ice: 'Ice is slippery: nothing sticks',
    seen_crumble: 'It crumbles: keep moving', seen_spring: 'Springs throw you high', seen_fire: 'The fire grows while you stand still!',
    seen_hedgehog: "Don't stomp a hedgehog: it pricks!", seen_shell: 'Stomp a shell and it rolls into the others', seen_spitter: 'Spitters lob blobs at you: dodge',
    seen_splitter: 'A splitter breaks in two', seen_chaser: 'A chaser follows you on its wall',
    got_fizz: 'Fizz! You shoot by yourself · {s} s', got_smash: 'Rock candy! Jumps smash blocks · {s} s', got_rainbow: 'Rainbow! Nothing hurts, enemies pop · {s} s',
    reviveQ: 'One more go?', revive: 'Revive', reviveCost: 'Costs {n} · you have {c}', giveUp: 'No, finish',
    height: 'Climbed', coins: 'Coins', kills: 'Enemies', combo: 'Best combo', reached: 'Reached', unlocked: 'Unlocked', hardOpen: 'Hard mode is open!',
    again: 'Again', menu: 'Menu', resume: 'Resume', paused: 'Paused', comboPay: 'Combo ×{n}  +{c}', comboHp: '+1 heart', poor: 'Need {n} more coins',
    noNeed: 'Not needed now', sold: 'sold', free: 'free', shop: 'Shop', treasure: 'Stash', bossLeft: '{n} more!', m: 'm',
    nogl: 'This game needs WebGL 2. Please try another browser.', sound: 'Sound', on: 'on', off: 'off', ctrl: 'Controls', ctrlKeys: 'buttons', ctrlStick: 'stick',
    hintStick: 'Touch anywhere and lean: a stick to run; ▲, up or a tap to jump,\ntwo quick leans to dash. Land on enemies from above!',
  },
  ru: {
    hintKeys: '← → — бег, пробел — прыжок, ↓ — отлипнуть.\nПрыгай на врагов сверху!', hintMouse: '← → — бег, пробел — прыжок, ↓ — отлипнуть,\nили тяни мышью назад и отпускай.\nПрыгай на врагов сверху!', hintTouch: '◀ ▶ или веди пальцем — бег, ▲ или тап — прыжок,\nсвайп вниз — отлипнуть. Прыгай на врагов сверху!', play: 'Играть',
    hard: 'Сложный режим', world: 'Мир {n}', pick: 'Выбери улучшение', dead: 'Забег окончен', won: 'Ты выбрался!',
    tapJump: 'Тап — прыжок', keyJump: 'Пробел — прыжок', bonus: 'Бонус', sec: 'с', bonusGot: 'Бонус: +{n} монет', timeUp: 'Время!', caught: 'Догнал!', starLine: 'Монеты {c} · Враги {f}', news: 'Новое: {n}', dark: 'темнота',
    seen_moss: 'Мох держит: можно передохнуть', seen_rubber: 'Резина отбрасывает', seen_ice: 'Лёд скользкий: не прилипнешь',
    seen_crumble: 'Блок осыпается: не стой', seen_spring: 'Пружина подбрасывает высоко', seen_fire: 'Огонь растёт, если стоишь на месте!',
    seen_hedgehog: 'Ежа не топчи: колется!', seen_shell: 'Растопчи панцирь: он покатится по врагам', seen_spitter: 'Плевака кидается комками: увернись',
    seen_splitter: 'Делилка распадается надвое', seen_chaser: 'Догоняла ползёт за тобой по стене',
    got_fizz: 'Шипучка! Стреляешь сам · {s} с', got_smash: 'Крушилка! Прыжок ломает блоки · {s} с', got_rainbow: 'Радуга! Ничто не ранит, враги лопаются · {s} с',
    reviveQ: 'Ещё попытка?', revive: 'Возродиться', reviveCost: 'Цена {n} · у тебя {c}', giveUp: 'Нет, закончить',
    height: 'Подъём', coins: 'Монеты', kills: 'Врагов', combo: 'Лучшее комбо', reached: 'Дошёл до', unlocked: 'Открыто', hardOpen: 'Открыт сложный режим!',
    again: 'Ещё раз', menu: 'В меню', resume: 'Продолжить', paused: 'Пауза', comboPay: 'Комбо ×{n}  +{c}', comboHp: '+1 сердце', poor: 'Не хватает {n} монет',
    noNeed: 'Сейчас не нужно', sold: 'продано', free: 'даром', shop: 'Лавка', treasure: 'Тайник', bossLeft: 'Ещё {n}!', m: 'м',
    nogl: 'Нужен WebGL 2. Попробуй другой браузер.', sound: 'Звук', on: 'вкл', off: 'выкл', ctrl: 'Управление', ctrlKeys: 'кнопки', ctrlStick: 'стик',
    hintStick: 'Коснись где угодно и веди — бег; ▲, вверх или тап — прыжок,\nдва быстрых наклона — рывок. Прыгай на врагов сверху!',
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
  const d = { best: 0, bank: 0, wins: 0, runs: 0, color: PALETTE[0].id, hard: false, seen: {}, stick: false };   // seen: hints shown once; stick: touch by a stick, not the keys
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
const RAINBOW_BODY = RAINBOW_INK.map((c) => ({ id: 'rainbow', base: c, deep: PAL.black }));   // the hero's colours under a rainbow
const MODS = () => ({ bounce: 1, slide: 1, hold: 0, magnet: 1, invuln: 0, airJumps: 1, blast: false, coinMul: 1, comboShift: 0, jump: 1, discount: 1, iron: false, fire: 1, gun: 0 });
const SPIKE_PUSH = [[0, -1], [0, 1], [1, -0.35], [-1, -0.35]];
let nextSeed = null;
class Game {
  constructor() {
    this.lv = new Level(); this.well = null; this.door = null; this.hero = null; this.state = 'boot'; this.paused = 'play';
    this.R = 30; this.vjump = 1; this.builtW = 0; this.list = []; this.look = { x: 0, y: 0, t: 0 }; this.heroLook = { x: 0, y: 0, t: -1e9 };
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.hitstop = 0; this.invuln = 0; this.touch = 0; this.queued = null; this.rising = false;
    this.stateT = 0; this.pruneT = 0; this.winT = 0; this.startY = 0; this.result = null; this.safes = [];
    this.pow = null; this.ram = false; this.tail = [];   // the candy at work, a ram on its way up, a rainbow's tail
    this.newRun();
  }
  newRun() {
    this.world = 0; this.stage = 0; this.hard = !!save.hard && save.wins > 0; this.mods = MODS(); this.taken = [];
    this.maxHp = HEALTH.start; this.hp = this.maxHp; this.coins = 0; this.kills = 0; this.combo = 0; this.bestCombo = 0;
    this.climbed = 0; this.levelM = 0; this.revives = 0; this.bonus = null; this.bonusT = 0; this.bonusCoins = 0;
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
    this.newRun(); save.runs++; persist(); padUsed = performance.now();   // the keys show in full as a run starts
    this.state = 'play'; this.stateT = 0; this.buildLevel(true);
    ui.hideAll(); ui.banner();
    if (save.runs <= 2) ui.toast(t(coarse ? (save.stick ? 'hintStick' : 'hintTouch') : JUMP.mouse ? 'hintMouse' : 'hintKeys'), 5200);
  }
  buildLevel(newHero) {
    const W = view.w, H = view.h, boss = this.world >= WORLDS.length && !this.bonus, wd = this.bonus || this.wd;
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
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.invuln = 0; this.hitstop = 0; this.levelM = 0; this.idleT = 0; this.gunT = 0; this.gunCD = 0; this.gunMax = 1; this.combo = 0; this.pow = null; this.ram = false;
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
  // Off a floor: up, keeping the run. Off a wall: up and away. Off a ceiling: pushed down,
  // or with a side pressed a dash that way. In the air: up again, with a puff under it. A slingshot
  // launch goes where it was aimed, and letting go of a button cannot cut it.
  jump(inAir, aimed) {
    const H = this.hero, v = this.vjump, ram = this.power('smash') && (inAir || this.touch !== 4 || (!aimed && this.over(SMASH.look * this.R).some((r) => this.smashable(r)))), side = inAir || (ram && this.touch === 4) ? 0 : this.touch;   // any jump rams; off a ceiling only with something to break over it (and then up through it)
    let vx = H.rigVx, vy = -v, rise = !aimed;
    if (aimed) { vx = aimed.vx; vy = aimed.vy; }
    else if (side === 1 || side === 2) { vx = (side === 1 ? 1 : -1) * JUMP.wallX * this.R; vy = -v * JUMP.wallUp; }
    else if (side === 4) {   // off a ceiling: down, or with a side pressed a dash that way, close under it
      if (input.dir) { vx = input.dir * JUMP.dash * this.R; vy = JUMP.dashDown * v; this.dashT = 0.15; fx.dust(H.cx - input.dir * H.R, H.minY, IMPACT.puffSpeed + 600); }   // the ceiling's friction off for a moment, or it drags the dash
      else { vx = 0; vy = JUMP.ceil * v; }
      rise = false;
    }
    const R = this.R, foot = H.maxY, hc = H.color.base;   // the juice: a double jump bursts out under the hero, a wall jump off the wall, a jump off its feet
    if (inAir || ram) {
      fx.dust(H.cx, foot, IMPACT.puffSpeed + 900); fx.ring(H.cx, foot, 0.8 * R, hc); fx.ring(H.cx, foot, 1.3 * R, INK.white);
      sparkFx(H.cx, foot, 16, Math.PI / 2, 1.0, [220, 560], [1.5, 3.2], [0.3, 0.6], [INK.white, hc, INK.white], 0.25);
    } else if (side === 1 || side === 2) sparkFx(side === 1 ? H.minX : H.maxX, H.cy, 9, side === 1 ? Math.PI : 0, 0.8, [120, 340], [1.2, 2.6], [0.25, 0.45], [INK.white, hc], 0.3);
    else if (side !== 4) sparkFx(H.cx, foot, 8, Math.PI / 2, 1.45, [90, 260], [1.2, 2.4], [0.2, 0.4], [INK.white, PAL.gray], 0.15);
    sound.play(inAir || ram ? 'airjump' : side === 1 || side === 2 ? 'walljump' : 'jump', 0.8, ram ? 0.8 : 1);
    setVel(H, vx, vy);
    unstick(H, JUMP.stickAfter);
    const sp = Math.hypot(vx, vy) || 1;
    H.kickSquash(vx / sp, vy / sp, -JUMP.stretch * Math.min(1, sp / v));   // stretch along the leap
    haptics.buzz(8);
    const thru = ram && this.over(JUMP.height * this.R).some((r) => this.smashable(r));   // a block to break within a jump: no tap may cut it short of it
    this.rising = rise && !thru; this.sinceContact = JUMP.coyote + 1; this.queueT = 0; this.queued = null; this.ram = ram;
  }
  // The solid ledges just over the hero (planks are jumped through anyway), and which of them a ram breaks: a shaft ledge one tile
  // thick, not the exit's ceiling or a spring, with nothing on it or under it that would be left hanging in the air.
  over(look) { const H = this.hero, R = this.R; return this.lv.near(H.minY - look, H.cy).filter((r) => !r.plank && r.y1 <= H.cy && r.x1 > H.minX + 0.25 * R && r.x0 < H.maxX - 0.25 * R); }
  smashable(r) {
    const lv = this.lv, on = (q) => q.x1 > r.x0 && q.x0 < r.x1;
    return lv.kind === 'well' && !r.cap && !r.spring && r.y1 - r.y0 <= SMASH.maxH * lv.tile &&
      !lv.spikes.some((s) => s.dir < 2 && on(s) && Math.abs(s.dir ? s.y0 - r.y1 : s.y1 - r.y0) < 1) &&   // red stays danger
      !lv.rects.some((q) => q.spring && on(q) && Math.abs(q.y1 - r.y0) < 1) && !lv.bubbles.some((b) => on(b) && Math.abs(b.y1 - r.y0) < 1);
  }
  ramUp() {   // each step of a ram on its way up: what is just overhead goes before the hero meets it, or the ram stops on what does not break
    const H = this.hero, vy = H.vy.reduce((s, v) => s + v, 0) / H.n;   // the rigid part, as setVel set it (rigVy lags a jump by a step)
    if (vy >= 0) { this.ram = false; return; }
    const rs = this.over(SMASH.reach * this.R - vy * STEP);
    if (!rs.length) return;
    if (!rs.every((r) => this.smashable(r))) { this.bonk(); return; }
    for (const r of rs.slice()) this.smash(r);
    if (vy > -SMASH.kick * this.vjump) addVel(H, 0, -SMASH.kick * this.vjump - vy);   // on up through it and over, whatever was left of the jump
    this.rising = false;   // as after a stomp: letting go of a tapped jump must not cut the kick
  }
  smash(r) {
    const lv = this.lv, R = this.R, cx = (r.x0 + r.x1) / 2;
    r.gone = r.broke = true; r.crumbling = false; r.t = 0;
    const was = new Set(lv.enemies);
    for (const e of lv.enemies.slice()) { const q = e.body; if (e.rect === r || (q.maxX > r.x0 && q.minX < r.x1 && q.maxY > r.y0 - 0.5 * R && q.minY < r.y1 + 0.3 * R)) this.kill(e, true); }   // knocked off from below, a hedgehog too
    for (const e of lv.enemies.slice()) if (!was.has(e)) this.kill(e, true);   // a splitter's minis too: they would land in the hole, in the hero's way
    if (!r.paid) { r.paid = true; this.drop(cx, r.y0, SMASH.coins); }
    crumbleFx(r, r.slick ? lv.theme.slick : r.crumble ? lv.theme.crumble : lv.theme.block, true); fx.ring(cx, (r.y0 + r.y1) / 2, 1.6 * R, INK.white);
    this.hitstop = Math.max(this.hitstop, SMASH.hitstop); shake.add(SMASH.shake); haptics.buzz(25);
    sound.play('crumble', 1, 0.75); sound.play('stomp', 0.6, 0.55);
  }
  bonk() { const H = this.hero; this.ram = false; sound.play('land', 0.8, 0.6); shake.add(2); sparkFx(H.cx, H.minY, 6, -Math.PI / 2, 1, [80, 220], [1.2, 2.4], [0.2, 0.35], [INK.white], 0.5); }
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
  // A dash (a double tap of a side, or a quick swipe): a burst that way, low and fast, with no jump to it —
  // along a floor (just lifted off it, its friction off for a moment), in the air once till a landing.
  dash(dir) {
    const H = this.hero;
    if (this.state !== 'play' || this.dashCD > 0) return;
    const floor = this.onFloor(), held = H.stuck > 0;
    if (!floor && !held && this.airDash) return;
    if (!floor && !held) this.airDash = true;
    if (held) unstick(H, 0.15);
    setVel(H, dir * JUMP.dash * this.R, floor ? -0.1 * this.vjump : Math.min(H.rigVy, 0.05 * this.vjump));
    this.dashT = 0.2; this.dashCD = JUMP.dashCD; this.rising = false;
    H.kickSquash(dir, 0, -1.6); fx.dust(H.cx - dir * H.R, H.maxY, IMPACT.puffSpeed + 600);
    sparkFx(H.cx - dir * H.R, H.cy, 10, dir > 0 ? Math.PI : 0, 0.5, [150, 380], [1.2, 2.6], [0.2, 0.4], [INK.white, H.color.base], 0.1);
    sound.play('airjump', 0.6, 1.25); haptics.buzz(8);
  }
  // Pressed against the side of a ledge whose top is level with its body (bar its very top): a hop just high
  // enough to come up over the edge, and on toward it.
  mantle(d) {
    const H = this.hero, lv = this.lv, R = this.R;
    if (this.mantleCD > 0 || H.rigVy < -0.5 * this.vjump) return;
    for (const r of lv.near(H.minY, H.maxY + R)) {
      if (r.plank || r.spring || r.gone) continue;
      const side = d > 0 ? r.x0 - H.maxX : H.minX - r.x1;   // the gap to its near side
      if (side < -0.55 * R || side > 0.35 * R || r.y0 < H.minY + 0.25 * R || r.y0 > H.maxY - 0.1 * R) continue;   // up to draped over its corner, not stood on it
      const lift = H.maxY - r.y0 + 0.55 * R, vy = -Math.sqrt(2 * WORLD.gravity * Math.max(lift, 0.3 * R));
      if (H.stuck) unstick(H, 0.12);
      setVel(H, d * MOVE.speed * R * 0.75, Math.min(H.rigVy, vy));
      this.mantleCD = JUMP.mantleCD; this.rising = false; H.kickSquash(0, 1, -0.8);
      sparkFx(H.cx, H.maxY, 5, Math.PI / 2, 1.2, [60, 160], [1, 2], [0.2, 0.3], [INK.white], 0.2);
      return;
    }
  }
  // A swipe to a side: up to a run's speed that way at once (the keys ease in; a swipe is too short to).
  nudge(dir) {
    const H = this.hero, want = dir * MOVE.speed * this.R;
    if (this.state === 'play' && !(H.stuck && glueSide(H) !== 4) && dir * H.rigVx < dir * want) addVel(H, want - H.rigVx, 0);
  }
  // Left and right run along a floor and steer in the air; while down is held nothing sticks.
  move(dt) {
    const H = this.hero, d = input.dir, floor = this.onFloor(), top = H.stuck > 0 && glueSide(H) === 4;
    H.pressX = d; H.crawl = top && d !== 0;   // only a body hanging from a ceiling alone creeps along it
    if (input.down) H.stickCD = Math.max(H.stickCD || 0, 0.05);
    if (this.dashT > 0) this.dashT -= dt;
    if (this.dashCD > 0) this.dashCD -= dt;
    if (this.mantleCD > 0) this.mantleCD -= dt;
    if (d && this.state === 'play') this.mantle(d);
    H.fric = this.dashT > 0 ? 0 : floor && d ? (input.swipe ? 0 : MOVE.slip) : undefined;
    if (!d || (H.stuck && !top)) return;   // stuck to a wall it slides; under a ceiling it creeps along
    const dv = (d * (top ? MOVE.ceil : MOVE.speed) * this.R - H.rigVx) * Math.min(1, (floor || top ? MOVE.accel : MOVE.air) * (input.joy ? JOY.accel : 1) * dt);   // the stick eases in faster than the keys
    if (dv * d > 0 || (input.swipe && floor && !(this.dashT > 0))) addVel(H, dv, 0);   // toward the pressed side only, so a faster leap is not braked, bar a swipe's along a floor
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
    const hang = playing && aim.on && aim.hyb && aim.p > 0;   // the hybrid's aim shown: the hero hangs where it is, in the air or on a wall, till let go
    if (hang !== !!this.hang) { this.hang = hang; if (this.state !== 'clear') hero.gScale = hang ? 0 : 1; }   // (a hole's pull keeps its own)
    if (hang) setVel(hero, 0, 0);
    if (playing) { this.move(dt); if (this.ram) this.ramUp(); }
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
      this.sinceContact = 0; this.air = this.mods.airJumps; this.airDash = false;
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
    if (this.bonus && (this.bonusT -= dt) <= 0) { this.endBonus('timeUp'); return; }
    this.spikes(); this.fireStep(dt); this.fireTouch();
    if (this.lv !== lv) return;   // the fire ended a bonus level
    this.shots(dt); this.collect(dt); this.gun(dt);
    if (this.combo > 0 && (H.wallMask & 8) && !H.springHit && !this.power('rainbow')) this.payCombo();   // only a floor ends a combo; a rainbow's runs on till it is over
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
    const above = (dy > STOMP.above * (H.R + b.R) && dy > dx * STOMP.slope && rel > STOMP.rel) || (dy > 0 && rel > 60 && dx < 0.95 * (H.R + b.R));   // from over it, or falling onto it
    const can = e === this.lv.boss ? e.angry <= 0 : e.def.stomp;
    if (above && can) this.stomp(e); else if (this.power('rainbow') && e !== this.lv.boss) this.zap(e);
    else if (this.ram && b.cy < H.cy && e !== this.lv.boss) this.kill(e, true);   // rammed from below: it goes like the block over it
    else this.hurt(H.cx - b.cx, H.cy - b.cy);
  }
  zap(e) {   // a rainbow hero's touch: the enemy pops, in all the inks
    const b = e.body;
    this.kill(e, true);
    sparkFx(b.cx, b.cy, 18, -Math.PI / 2, Math.PI, [200, 600], [1.6, 3.6], [0.35, 0.7], RAINBOW_INK, 0.8); fx.ring(b.cx, b.cy, 1.4 * this.R, INK.white);
    this.hitstop = Math.max(this.hitstop, 0.03); shake.add(3); sound.play('stomp', 0.9, 1.15 + 0.06 * Math.min(this.combo, 10));
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
    this.hitstop = STOMP.hitstop; shake.add(3.5); haptics.buzz(14);
    const bx = e.body.cx, by = e.body.minY;   // squashed flat: a spray of its colour and white, and a ring
    sparkFx(bx, by, 18, -Math.PI / 2, 1.4, [200, 650], [1.6, 3.6], [0.35, 0.75], [e.body.color.base, INK.white, e.body.color.base], 0.85);
    fx.ring(bx, by, 1.4 * this.R, INK.white); fx.ring(bx, by, 0.9 * this.R, e.body.color.base);
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
    sparkFx(b.cx, b.cy, 10 + 2 * Math.min(this.combo, 8), -Math.PI / 2, Math.PI, [150, 480], [1.5, 3.5], [0.3, 0.6], [b.color.base, INK.white], 0.8);   // every kill bursts, the more the longer the combo
    if (byHero) shake.add(1.5 + 0.5 * Math.min(this.combo, 8));
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
  drop(x, y, n, v = 1) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = COIN.burst * rand(0.6, 1.25);
      this.lv.coins.push({ x, y, v, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drop: true, moving: true, t: 0, ph: rand(0, TAU) });
    }
  }
  hurt(dx, dy) {
    if (this.invuln > 0 || this.power('rainbow') || this.state !== 'play') return false;
    const H = this.hero, d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (!this.bonus) this.hp--;   // a bonus level costs no hearts
    this.invuln = HEALTH.invuln + this.mods.invuln;
    setVel(H, dx * HEALTH.knock, Math.min(dy * HEALTH.knock, 0) - HEALTH.knock * 0.45);
    unstick(H, 0.3); H.face.surprise = 1; H.kickSquash(dx, dy, 2); this.rising = false;
    this.hitstop = HEALTH.hitstop; shake.add(7); haptics.buzz(40); ui.hurt();
    if (this.hp > 0) sound.play('hurt');
    if (this.hp <= 0) this.die();
    return true;
  }
  room() { return Math.max(CAM.floorShow, view.keep + CAM.keep * 2 * this.R); }   // what the camera keeps under the hero: the keys and CAM.keep heights more
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
    if (this.bonus) { this.endBonus('caught'); return; }   // the fire race: caught is the end of it
    this.hurt(0, -1);
    sound.play('burn');
    if (this.state !== 'play') return;
    setVel(H, H.rigVx * 0.5, -FIRE.launch * this.vjump); unstick(H, 0.2); this.rising = false;
    splatFx(H.cx, f.y, this.R * 0.7, INK.flame, 6);
    f.y = Math.max(f.y, H.maxY + FIRE.back * view.h); f.warn = null;   // and sinks back: a throw into a ceiling must not land in it again
  }
  // A fizz candy taken, the hero shoots by itself for a while: at the nearest enemy or blob in range.
  power(k) { return this.gunT > 0 && this.pow === k; }   // a candy at work
  take(kind) {   // one candy at a time: a new one takes over, the same one starts again
    if (this.power('rainbow') && kind !== 'rainbow') this.powerEnd();   // a rainbow cut short still ends safely
    this.pow = kind; this.gunMax = this.gunT = CANDY[kind].time + this.mods.gun; this.gunCD = 0; this.ram = false;
    if (kind === 'rainbow') this.invuln = 0;   // a hit's blink would let enemies through untouched
    ui.toast(tf('got_' + kind, { s: Math.round(this.gunT) }), 2200, kind);   // each time: its picture, what it does, for how long
  }
  powerEnd() {   // run out; after the rainbow a moment of the usual safety, so the crowd it was ploughing through does not hit at once
    if (this.pow === 'rainbow') { this.invuln = Math.max(this.invuln, RAINBOW.grace); fx.ring(this.hero.cx, this.hero.cy, 1.6 * this.R, INK.white); sound.play('bubble', 0.6, 0.8); }
    this.pow = null; this.ram = false;
  }
  gun(dt) {
    const lv = this.lv, H = this.hero, R = this.R;
    for (const p of lv.fizz || []) if (!p.taken && Math.hypot(H.cx - p.x, H.cy - p.y) < p.r + 0.8 * H.R) {
      p.taken = true; this.take(p.kind || 'fizz');
      fx.ring(p.x, p.y, 1.4 * R, INK.coin); sound.play('buy'); haptics.buzz(14);
    }
    if (this.gunT > 0 && (this.gunT -= dt) <= 0) this.powerEnd();
    if (this.power('fizz') && (this.gunCD -= dt) <= 0) {
      let best = null, bd = GUN.range * R;
      for (const e of lv.enemies) { const d = Math.hypot(e.body.cx - H.cx, e.body.cy - H.cy); if (d < bd) { bd = d; best = [e.body.cx, e.body.cy]; } }
      for (const s of lv.shots) { const d = Math.hypot(s.x - H.cx, s.y - H.cy); if (d < bd) { bd = d; best = [s.x, s.y]; } }
      if (best) {
        const dx = (best[0] - H.cx) / bd, dy = (best[1] - H.cy) / bd;
        lv.bullets.push({ x: H.cx + dx * H.R, y: H.cy + dy * H.R, vx: dx * GUN.speed * R, vy: dy * GUN.speed * R, t: 0 });
        this.gunCD = GUN.every; sound.play('shot', 0.35, 0.9 + Math.random() * 0.2);
      }
    }
    for (let i = lv.bullets.length - 1; i >= 0; i--) {   // a bullet: through the air until it meets an enemy, a blob or a block
      const b = lv.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
      let gone = b.t > 1 || b.y < lv.cam - R || b.y > lv.cam + view.h + R;
      for (const r of lv.near(b.y, b.y)) if (!r.plank && b.x > r.x0 && b.x < r.x1) { gone = true; if (r.crumble) r.hit = true; }
      if (b.x < lv.l || b.x > lv.r) gone = true;
      for (const e of lv.enemies.slice()) { const q = e.body; if (!gone && b.x > q.minX && b.x < q.maxX && b.y > q.minY && b.y < q.maxY) { this.kill(e, true); gone = true; } }
      for (let k = lv.shots.length - 1; k >= 0 && !gone; k--) { const s = lv.shots[k]; if (Math.hypot(s.x - b.x, s.y - b.y) < s.r + GUN.r * R) { splatFx(s.x, s.y, s.r * 2, INK.spike, 4); lv.shots.splice(k, 1); gone = true; } }
      if (gone) lv.bullets.splice(i, 1);
    }
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
      const dx = H.cx - c.x, dy = H.cy - c.y, d = Math.hypot(dx, dy) || 1, home = c.drop && (c.t += dt) > COIN.home;
      if (home) {   // an enemy's, its burst over: on to the hero wherever it is, ever faster
        const sp = COIN.seek * (1 + 3 * (c.t - COIN.home)) + Math.hypot(H.rigVx, H.rigVy), f = 1 - Math.exp(-COIN.steer * dt);
        c.vx += ((dx / d) * sp - c.vx) * f; c.vy += ((dy / d) * sp - c.vy) * f;
      } else if (d < mR && !c.drop) { c.moving = true; c.vx += (dx / d) * COIN.pull * dt; c.vy += (dy / d) * COIN.pull * dt; }
      if (c.moving) { if (!home) { c.vx *= k; c.vy *= k; } c.x += c.vx * dt; c.y += c.vy * dt; }
      if (d < H.R * 0.85 + (c.v > 1 ? 1.4 : 1) * cr && !(c.drop && c.t < COIN.home)) {   // a dropped one only once its burst is over: a combo's fountain is seen
        cs.splice(i, 1); this.coins += c.v; if (!c.drop) this.lv.coinsTaken++; fx.ring(c.x, c.y, cr * 1.6, INK.coin); sparkFx(c.x, c.y, c.v > 1 ? 14 : 8, -Math.PI / 2, Math.PI, [110, c.v > 1 ? 420 : 300], [1.2, 2.4], [0.25, 0.5], [INK.coin, INK.white, INK.coinD], 0.1); ui.coinBump(); sound.play('coin', 0.6, c.v > 1 ? 0.8 : 1); }
    }
  }
  payCombo() {
    const n = this.combo, s = this.mods.comboShift;
    this.combo = 0; ui.comboEnd();
    let rw = null;
    for (const c of COMBO) if (n >= c.at - s) rw = c;
    if (!rw) return;
    const pay = rw.coins * ((this.bonus && this.bonus.comboMul) || 1), H = this.hero;
    this.drop(H.cx, H.minY, pay / 5, 5);   // out of the hero as big coins that fly back in: the reward seen (every reward is a multiple of 5)
    sparkFx(H.cx, H.minY, Math.min(36, 6 + 3 * n), -Math.PI / 2, 0.9, [250, 650], [1.5, 3.5], [0.4, 0.8], [INK.coin, INK.coinD, INK.white], 1); shake.add(rw.hp ? 6 : 3);
    if (rw.hp) this.heal(rw.hp);
    ui.toast(tf('comboPay', { n, c: pay }) + (rw.hp ? '  ' + t('comboHp') : ''), 1600);
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
    this.bankDrops();   // in the purse at once: they are for the shop in there
    this.well = this.lv; this.door = bub; this.lv = bub.room; this.lv.exit.armed = false;
    this.placeHero(this.lv.exit.x, this.lv.exit.y - 0.2 * this.R);
    aimCancel(); ui.flash(); ui.toast(t(bub.kind), 1400); sound.play('bubble');
  }
  leaveRoom() {
    const bub = this.door, room = this.lv;
    this.lv = this.well; this.well = null; this.door = null;
    this.placeHero(bub.side === 1 ? bub.x1 + 1.2 * this.R : bub.x0 - 1.2 * this.R, bub.y1 - 1.1 * this.R);   // beside the door, on its ledge
    bub.cd = 1.2; aimCancel(); ui.flash(); ui.labels(null); sound.play('bubble', 0.8, 0.85);
    if (bub.kind === 'treasure' && !room.coins.length) {   // a stash with all its coins taken: its way in closes behind the hero
      this.lv.bubbles.splice(this.lv.bubbles.indexOf(bub), 1);
      sparkFx(bub.x, bub.y, 14, -Math.PI / 2, Math.PI, [80, 240], [1.5, 3], [0.3, 0.6], [this.lv.theme.wall, INK.white], 0.6); fx.dust(bub.x, bub.y1, IMPACT.puffSpeed + 500);
    }
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
    joyEnd();   // a stick held into the hole lets go
    this.state = 'clear'; this.stateT = 0;
    const H = this.hero;
    H.gScale = 0; H.sticky = false; unstick(H, 9); H.face.surprise = 1;   // and into the hole (see suck)
    if (this.combo > 0) this.payCombo();
    this.bankDrops();
    const lv = this.lv, allCoins = lv.coinsTaken >= lv.coinTotal, allFoes = lv.foeKilled >= lv.foeTotal;   // the stars, paid at once (not for a bonus level)
    if (!this.bonus) {
      this.stars = { n: 1 + allCoins + allFoes, coins: [lv.coinsTaken, lv.coinTotal], foes: [lv.foeKilled, lv.foeTotal] };
      this.stars.pay = STARS.coins[this.stars.n - 1]; this.coins += this.stars.pay;
    }
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
    this.state = 'play'; this.stateT = 0;
    if (this.stage === 2 && BONUS[this.world]) { this.startBonus(BONUS[this.world]); return; }   // a world done: its bonus level first
    if (++this.stage >= 3) { this.stage = 0; this.world++; }
    this.buildLevel(false);
    ui.hideAll(); ui.banner();
  }
  // A bonus level: against the clock, no hearts lost; then on to the next world.
  startBonus(b) {
    this.bonus = b; this.bonusT = b.time; this.bonusCoins = this.coins;
    this.buildLevel(false);
    ui.hideAll(); ui.toast(L2(b.name) + '\n' + L2(b.goal) + ' · ' + b.time + ' ' + t('sec'), 2600);
  }
  // An enemy's coins still on their way to the hero as a level or the run ends get there all the same.
  bankDrops() {
    for (const c of this.lv.coins) if (c.drop) this.coins += c.v;
    this.lv.coins = this.lv.coins.filter((c) => !c.drop);
  }
  endBonus(why) {
    if (!this.bonus) return;
    if (this.combo > 0) this.payCombo();   // a combo running (a rainbow holds one) is paid
    this.bankDrops();
    this.bonus = null; this.levelM = 0; this.stage = 0; this.world++; this.state = 'play'; this.stateT = 0;
    const got = this.coins - this.bonusCoins;
    this.buildLevel(false);
    ui.hideAll(); ui.banner();
    ui.toast((why ? t(why) + '  ' : '') + tf('bonusGot', { n: got }), 2200);
  }
  die() {   // the run ends here, unless there are coins enough to go on (see revive)
    if (this.state !== 'play') return;
    this.bankDrops();
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
    const rb = this.power('rainbow') && this.state !== 'dead', tl = this.tail, last = tl[tl.length - 1];   // frame runs on under the revive dialog, gun() does not
    b.color = rb ? RAINBOW_BODY[Math.floor(lv.t / (this.gunT < 1 ? RAINBOW.slow : RAINBOW.cycle)) % 6] : colorById(save.color);   // the rainbow cycles the inks, slower in its last second
    if (last && Math.hypot(b.cx - last[0], b.cy - last[1]) > 4 * this.R) tl.length = 0;   // a respawn or a door: no streak across the screen
    else if (rb && (!last || Math.hypot(b.cx - last[0], b.cy - last[1]) > RAINBOW.gap * this.R)) tl.push([b.cx, b.cy]);
    while (tl.length > (rb ? Math.ceil(RAINBOW.n * Math.min(1, this.gunT / RAINBOW.fade)) : 0)) tl.shift();   // shorter at the end, gone after
    this.stateT += dt;
    if (this.state === 'clear' && this.stateT > 0.8 && !ui.open) { if (this.bonus) this.endBonus(); else ui.cards(this.offer()); }
    if (this.state === 'dead' && this.stateT > 1 && !ui.open) { if (this.result) ui.result(this.result); else ui.revive(this.revivePrice(), this.coins); }
    if (this.state === 'won' && this.stateT > 0.4 && !ui.open) ui.result(this.result);
    if (this.winT > 0 && this.state === 'play' && (this.winT -= dt) <= 0) this.win();
    if (lv.kind === 'well' && this.state === 'play') {   // keep the drawn hero at the anchor; only ever climb
      let cy = 0;
      for (let i = 0; i < b.n; i++) cy += b.sy[i] + (b.y[i] - b.sy[i]) * alpha;
      cy /= b.n;
      const target = cy - CAM.anchor * view.h;
      if (target < lv.cam) lv.cam += (target - lv.cam) * (1 - Math.exp(-CAM.follow * dt));
      const down = Math.min(b.maxY + this.room() - view.h, lv.floor + this.room() - view.h);   // and down with a fall, keeping the hero well over the touch keys, as far as the floor:
      if (down > lv.cam) lv.cam += (down - lv.cam) * (1 - Math.exp(-10 * dt));   // smoothly (a hard follow jerked with every bounce),
      lv.cam = Math.max(lv.cam, Math.min(b.maxY + view.keep + this.R - view.h, lv.floor + this.room() - view.h));   // but never letting it near the keys
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
// A disc of radius `r` px in 2-px pixels: a gray rim a pixel wide round an inside of ink (or, for the knob, white) at `fill`.
function pixelDisc(r, fill) {
  const q = r / 2, rows = (k) => { let d = ''; for (let y = 0; y < 2 * k; y++) { const h = Math.round(Math.sqrt(Math.max(0, k * k - (y + 0.5 - k) ** 2))); if (h) d += 'M' + (q - h) + ' ' + (q - k + y) + 'h' + 2 * h + 'v1h-' + 2 * h + 'z'; } return d; };
  const t = document.createElement('template');
  t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + 2 * r + '" height="' + 2 * r + '" viewBox="0 0 ' + r + ' ' + r + '" shape-rendering="crispEdges">'
    + '<path class="rim" fill-rule="evenodd" d="' + rows(q) + rows(q - 1) + '"/><path class="in" fill-opacity="' + fill + '" d="' + rows(q - 1) + '"/></svg>';
  return t.content.firstChild;
}
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
    p.append(button(t('play'), 'big thumb', () => game.startRun()));   // the width of the screen, 12 px in from its edges
    const s = button('', 'iconBtn', () => { sound.toggle(); this.menu(); });   // sound on and off, a speaker in the corner
    s.append(px(save.sound === false ? '\u{E001}' : '\u{E000}')); s.setAttribute('aria-label', t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'));
    p.append(s);
  },
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
    const snd = button(t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'), 'big thumb alt', () => { sound.toggle(); this.pause(); });
    const ctl = button(t('ctrl') + ': ' + t(save.stick ? 'ctrlStick' : 'ctrlKeys'), 'big thumb alt', () => { save.stick = !save.stick; persist(); queueLayout(); this.pause(); });
    p.append(el('div', 'head', t('paused')), ...(coarse ? [ctl] : []), snd, button(t('menu'), 'big thumb alt', () => game.toMenu()), button(t('resume'), 'big thumb', () => game.togglePause(false)));   // Resume at the bottom, under the thumb
  },
  revive(price, coins) {   // before the result: go on for coins, or end the run
    const p = this.panel('result');
    p.append(el('div', 'head', t('reviveQ')), el('div', 'label', tf('reviveCost', { n: price, c: coins })),
      button(t('giveUp'), 'chip wide', () => game.giveUp()), button(t('revive'), 'big thumb', () => game.revive()));   // the main button last, under the thumb
  },
  result(r) {
    const p = this.panel('result'), box = el('div', 'summary');   // the results in the middle of the room over the buttons
    box.append(el('div', 'head', r.won ? t('won') : t('dead')));
    const rows = [[t('height'), r.total + ' ' + t('m')], [t('reached'), r.where], [t('coins'), r.coins], [t('kills'), r.kills], [t('combo'), r.combo]];
    const tb = el('div', 'rows');
    for (const [k, v] of rows) { const row = el('div', 'row'); row.append(el('span', null, k), el('b', null, String(v))); tb.append(row); }
    box.append(tb);
    if (r.fresh.length || r.firstWin) {
      const u = el('div', 'fresh');
      u.append(el('div', 'label', t('unlocked')));
      for (const f of r.fresh) { const c = el('span', 'chip swatch on'); c.style.background = rgb(colorById(f.id).base); u.append(c); }
      if (r.firstWin) u.append(el('div', null, t('hardOpen')));
      box.append(u);
    }
    p.append(box, button(t('menu'), 'big thumb alt', () => game.toMenu()), button(t('again'), 'big thumb', () => game.startRun()));   // Again at the bottom, Menu as big over it
  },
  toastTimer: 0,
  toast(text, ms = 1500, icon) {   // `icon`: an ICONS picture before the words
    const e = $('toast');
    e.replaceChildren(...(icon ? [iconEl(icon)] : []), px(text, Math.floor((view.w - (icon ? 110 : 64)) / 2))); e.classList.add('show');
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
    $('pad').classList.toggle('stick', !!save.stick);   // with the stick, a round jump key alone, in the corner
    $('pad').classList.toggle('idle', performance.now() - padUsed > 2500);   // unused, the keys go faint
    const fh = $('floorHint'), lv = g.lv, fy = lv.floor - lv.cam;   // how to jump, written on the first level's floor, in the band over the keys
    const onFloor = g.state === 'play' && lv.kind === 'well' && g.world === 0 && g.stage === 0 && !g.bonus && fy < view.h - view.keep;
    fh.classList.toggle('on', onFloor);
    if (onFloor) {
      if (!fh.firstChild) fh.append(px(t(coarse ? 'tapJump' : 'keyJump')));
      fh.style.transform = 'translate(' + Math.round(view.w / 2) + 'px,' + Math.round(fy + (view.h - view.keep - fy) / 2) + 'px) translate(-50%, -50%)';
    }
    if (g.hp !== this.hp || g.maxHp !== this.max) {
      this.hp = g.hp; this.max = g.maxHp;
      const h = $('hearts');
      h.replaceChildren();
      for (let i = 0; i < g.maxHp; i++) { const k = i < g.hp ? 'full' : 'empty', s = el('i', k); s.innerHTML = pxSvg(7, 6, `<path fill="currentColor" d="${inkPath(HEART[k], 0, 0)}"/>`); h.append(s); }
    }
    if (g.coins !== this.coins) { this.coins = g.coins; $('coins').replaceChildren(px(g.coins)); }
    const gun = $('gun'), left = g.gunT > 0 && g.state === 'play' ? Math.ceil((g.gunT / g.gunMax) * 10) : 0;   // the fizz left, in tenths, blinking near the end
    gun.classList.toggle('on', left > 0);
    if (left) { gun.dataset.k = g.pow; gun.firstChild.style.width = left * 10 + '%'; gun.classList.toggle('low', g.gunT < 1 && Math.floor(g.gunT * 6) % 2 === 0); }
    const m = Math.floor(g.climbed + g.levelM);
    if (m !== this.m) { this.m = m; $('height').replaceChildren(px(m + ' ' + t('m'))); }
    const st = g.bonus ? t('bonus') + ' ' + Math.max(0, Math.ceil(g.bonusT)) : g.lv.kind === 'shop' || g.lv.kind === 'treasure' ? t(g.lv.kind) : g.world >= WORLDS.length ? L2(SUMMIT.name) : (g.world + 1) + '-' + (g.stage + 1);   // a bonus level counts its seconds down
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
  left: false, right: false, down: false, jump: false, swipe: false, joy: false,   // swipe: the side is a drag over the game, not a key; joy: the stick's
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
    this.swipe = false; joyEnd();
    for (const e of document.querySelectorAll('#pad .on')) e.classList.remove('on');
  },
};
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', Space: 'jump' };
document.addEventListener('keydown', (e) => {
  const k = KEYS[e.code];
  if (!k || game.state !== 'play') return;
  e.preventDefault();
  if (!e.repeat) {
    input.set(k, true);
    if (k === 'left' || k === 'right') { const d = k === 'right' ? 1 : -1; if (lastTap.d === d && e.timeStamp - lastTap.t < 280) game.dash(d); lastTap = { d, t: e.timeStamp }; }   // a double tap: a dash
  }
});
document.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input.set(k, false); });
// A part of the pad follows the finger that pressed it until that finger lets go.
let padUsed = 0;   // when a touch key was last pressed: unused for a while, the keys fade (see ui.frame)
function padPart(part, onTouch) {
  let id = -1;
  part.addEventListener('pointerdown', (e) => {
    padUsed = performance.now();
    if (id !== -1) return;
    id = e.pointerId; e.preventDefault();
    try { part.setPointerCapture(id); } catch (err) { /* fine */ }
    onTouch(e);
  });
  part.addEventListener('pointermove', (e) => { if (e.pointerId === id) { padUsed = performance.now(); onTouch(e); } });
  for (const type of ['touchstart', 'touchmove']) part.addEventListener(type, (e) => e.preventDefault(), { passive: false });   // no selection, loupe or callout in Safari
  part.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) part.addEventListener(type, (e) => { if (e.pointerId === id) { id = -1; onTouch(null); } });
}
const dpad = $('dpad');
dpad.children[0].append(px('◀')); dpad.children[1].append(px('▶')); $('jumpBtn').append(px('▲'));
let lastTap = { d: 0, t: -1e9 }, padDir = 0;   // the last press of a side, for a double tap (keys and pad alike)
padPart(dpad, (e) => {
  if (aim.on && aim.hyb) {   // ▲ aiming: the finger on ◀ ▶ is the aim's stick, from where it is now
    if (e) aimStick('pad', e.clientX, e.clientY); else if (aim.stk && aim.stk.id === 'pad') aim.stk.id = -1;
    padDir = 0; input.set('left', false); input.set('right', false); dpad.children[0].classList.remove('on'); dpad.children[1].classList.remove('on');
    return;
  }
  const r = dpad.getBoundingClientRect(), right = !!e && e.clientX > r.left + r.width / 2, d = e ? (right ? 1 : -1) : 0;
  if (d && !padDir) { if (lastTap.d === d && e.timeStamp - lastTap.t < 280) game.dash(d); lastTap = { d, t: e.timeStamp }; }   // a fresh press: a second one quick is a dash
  padDir = d;
  input.set('left', !!e && !right); input.set('right', right);
  dpad.children[0].classList.toggle('on', input.left); dpad.children[1].classList.toggle('on', input.right);
});
const act = $('act'), jumpBtn = $('jumpBtn');
// ▲ (either scheme) tells a tap from a long press on the first press, as UIKit does (a tap counts as the finger
// lifts, a long press once held `hold` s): let go before that, the plain jump, a quick second tap another; held on
// (or moved past `slop` px: a pull), that very jump is aimed: the hero hangs where it is (or stands) and the dots show
// the arc, the plain jump's to begin with; a second finger anywhere leans it like a stick (see aimStick), or ▲ pulled
// back like a slingshot (the further, the stronger: `min` of a jump to all of it at `full` of the width); let go of ▲
// and it goes. `hold` is half UIKit's 0.5 s: a jump must not wait long to be told apart. `on`: the aim is put away
// for now (user); off, ▲ is the plain key: a jump as it goes down, higher the longer it is held.
const HYB = { on: false, hold: 0.25, slop: 10, full: 0.18, min: 0.6 };
let hyb = null;   // ▲ down, not yet told apart: since when, where
padPart(act, (e) => {
  jumpBtn.classList.toggle('on', !!e);
  if (!HYB.on) { input.set('jump', !!e); return; }
  const g = game, x = e ? e.clientX - view.left : 0;
  if (e && aim.on && aim.hyb) { aim.x = x; aim.y = e.clientY; return; }   // pulling
  if (!e) {   // let go: an aimed jump goes where aimed; a tap is the plain jump
    if (aim.on && aim.hyb) { const p = aim.p, vx = aim.vx, vy = aim.vy; aimCancel(); g.requestJump(p > 0 ? { vx, vy } : null); }
    else if (hyb) { hyb = null; g.requestJump(); }
    return;
  }
  if (!hyb) hyb = { t0: performance.now(), x0: x, y0: e.clientY, x, y: e.clientY };
  hyb.x = x; hyb.y = e.clientY;
  if (Math.hypot(x - hyb.x0, e.clientY - hyb.y0) > HYB.slop) hybAim(performance.now());   // pulled at once: a slingshot
});
function hybCheck(now) { if (HYB.on && hyb && !aim.on && now - hyb.t0 >= HYB.hold * 1000) hybAim(now); }   // held: a long press
function hybAim(now) {   // ▲ held or pulled: aim the jump it is (off what the hero touches, or one left in the air)
  const g = game;
  if (aim.on || g.state !== 'play' || (g.sinceContact > JUMP.coyote && g.air <= 0)) return;
  Object.assign(aim, { on: true, hyb: true, sx: hyb.x0, x: hyb.x, sy: hyb.y0, y: hyb.y, p: 0, t0: now - HYB.hold * 1000 });   // the plain arc shows at once
}
// Gestures over the game (not on the keys), beside them: a finger held off to the left or the right of
// where it came down runs that way (the centre follows a long drag, so turning back is quick), a quick
// swipe to a side dashes (as soon as it is fast enough, or on letting go of a quick one); a quick flick up jumps (held, it goes higher), a quick flick down lets go; a
// tap jumps, a second finger's too. With the stick on (see JOY), a first finger is the stick instead.
const GEST = { dead: 12, flick: 30, quick: 320, tap: 230, still: 12, swipe: 28, fast: 500 };
let gest = null, tap2 = null;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || e.target.closest('#pad, button, .panel')) return;
  if (aim.on && aim.hyb) { aimStick(e.pointerId, e.clientX, e.clientY, true); return; }   // ▲ aiming: a finger anywhere is the aim's stick
  if (gest || joy) { tap2 = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; return; }
  if (save.stick) { joyStart(e); return; }
  gest = { id: e.pointerId, x0: e.clientX, y0: e.clientY, ax: e.clientX, t0: e.timeStamp, dir: 0, flick: '', moved: false, dashed: false };
});
document.addEventListener('pointermove', (e) => {
  if (aim.on && aim.hyb && ((aim.stk && aim.stk.id === e.pointerId) || (gest && gest.id === e.pointerId))) {   // the aim's stick (the running finger turns into it)
    if (gest && gest.id === e.pointerId) { gest = null; input.swipe = false; input.set('left', false); input.set('right', false); }
    aimStick(e.pointerId, e.clientX, e.clientY); return;
  }
  if (joy && e.pointerId === joy.id) { joyMove(e); return; }
  const g = gest;
  if (!g || e.pointerId !== g.id) return;
  const ox = e.clientX - g.x0, dy = e.clientY - g.y0, quick = e.timeStamp - g.t0 < GEST.quick, upright = Math.abs(dy) > 1.5 * Math.abs(ox);
  if (Math.abs(ox) > GEST.still || Math.abs(dy) > GEST.still) g.moved = true;
  if (!g.flick && quick && upright && -dy > GEST.flick) { g.flick = 'up'; input.set('jump', true); }
  else if (!g.flick && quick && upright && dy > GEST.flick) { g.flick = 'down'; game.pressDown(); }
  const dx = e.clientX - g.ax;
  if (Math.abs(dx) > 2 * GEST.dead) g.ax = e.clientX - Math.sign(dx) * 2 * GEST.dead;
  const dir = Math.abs(dx) < GEST.dead ? 0 : Math.sign(dx);
  if (dir !== g.dir) { g.dir = dir; input.swipe = dir !== 0; input.set('left', dir < 0); input.set('right', dir > 0); if (dir) game.nudge(dir); }   // a drag moves at once, on the ground or in the air
  const t = e.timeStamp - g.t0;
  if (!g.dashed && t < GEST.quick && Math.abs(ox) > GEST.swipe && Math.abs(ox) > Math.abs(dy) && Math.abs(ox) > (GEST.fast * t) / 1000) { g.dashed = true; game.dash(Math.sign(ox)); }   // a fast swipe: a dash now, not on letting go
});
const gestEnd = (e) => {
  if (aim.stk && aim.stk.id === e.pointerId) { aim.stk.id = -1; if (joy && joy.id === e.pointerId) joyEnd(); return; }   // the aim's stick let go: it keeps its aim
  if (tap2 && e.pointerId === tap2.id) {   // a second finger's tap
    if (e.type === 'pointerup' && e.timeStamp - tap2.t < GEST.tap && Math.hypot(e.clientX - tap2.x, e.clientY - tap2.y) < GEST.still) game.requestJump();
    tap2 = null; return;
  }
  const j = joy;
  if (j && e.pointerId === j.id) { joyEnd(); if (!j.moved && e.type === 'pointerup' && e.timeStamp - j.t0 < GEST.tap) game.requestJump(); return; }   // a tap: a jump
  const g = gest;
  if (!g || e.pointerId !== g.id) return;
  gest = null;
  if (g.dir) {   // let go: a quick swipe was a dash that way, a held drag just stops
    input.swipe = false; input.set('left', false); input.set('right', false);
    if (!g.dashed && e.timeStamp - g.t0 < GEST.quick + 100 && Math.abs(e.clientX - g.x0) > GEST.swipe) game.dash(g.dir);
  }
  if (g.flick === 'up') input.set('jump', false);
  else if (!g.moved && e.type === 'pointerup' && e.timeStamp - g.t0 < GEST.tap) game.requestJump();   // a tap: a whole jump (no button to let go of)
};
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, gestEnd);
// The stick (no keys with it): it comes up where a finger comes down, anywhere, and runs left or right as
// the finger leans that way: past `on` of its `reach` (px), and on till it is back under `off` (so it
// doesn't flicker at the edge); all or nothing, as on a d-pad, easing in `accel` times as fast as the keys.
// Two quick leans the same way dash. Leaning up past `up` (and not much more to the side) is the jump
// button, held till back under `upOff`; pulled down past `down` (more down than to the side) it lets go of
// a wall. Dragged past its rim it follows the finger, so turning back is never more than a reach away.
// A tap jumps too, as does a second finger's.
const JOY = { reach: 56, on: 0.125, off: 0.06, up: 0.3, upOff: 0.15, down: 0.45, accel: 2 };   // twice as sensitive as at first (user: it felt sticky)
let joy = null;
const joyEl = $('stick'), joyKnob = joyEl.firstElementChild;
joyEl.prepend(pixelDisc(56, 0.6)); joyKnob.append(pixelDisc(26, 0.9));   // the base under the knob
function joyShow() {
  joyEl.style.transform = 'translate(' + joy.bx + 'px,' + joy.by + 'px)';
  joyKnob.style.transform = 'translate(' + (joy.x - joy.bx) + 'px,' + (joy.y - joy.by) + 'px)';
  joyKnob.classList.toggle('on', joy.dir !== 0);
}
function joyStart(e) {
  if (game.state !== 'play') return;
  const x = e.clientX, y = e.clientY;
  padUsed = performance.now();
  joy = { id: e.pointerId, bx: x, by: y, x, y, dir: 0, up: false, low: false, moved: false, t0: e.timeStamp }; input.joy = true;
  joyShow(); joyEl.classList.add('on');
}
function joyMove(e) {
  const j = joy, R = JOY.reach, x = e.clientX, y = e.clientY;
  padUsed = performance.now();   // the ▲ key stays bright while the stick is in use
  if (aim.on && aim.hyb) {   // ▲ aiming: the stick leans the arc, from its base
    if (!aim.stk || aim.stk.id !== j.id) aim.stk = { id: j.id, sx: j.bx, sy: j.by, x, y }; else { aim.stk.x = x; aim.stk.y = y; }
    if (j.dir) { j.dir = 0; input.set('left', false); input.set('right', false); }
    j.x = x; j.y = y; stkShow(); return;
  }
  let dx = x - j.bx, dy = y - j.by;
  const d = Math.hypot(dx, dy);
  if (d > GEST.still) j.moved = true;
  if (d > R) { j.bx = x - (dx * R) / d; j.by = y - (dy * R) / d; dx = x - j.bx; dy = y - j.by; }   // past the rim: the base comes along
  const dir = Math.abs(dx) > (Math.sign(dx) === j.dir ? JOY.off : JOY.on) * R ? Math.sign(dx) : 0;
  if (dir) j.moved = true;   // a lean, however short, is not a tap
  if (dir && dir !== j.dir) { if (lastTap.d === dir && e.timeStamp - lastTap.t < 280) game.dash(dir); lastTap = { d: dir, t: e.timeStamp }; }   // a fresh lean: a second one quick is a dash
  if (dir !== j.dir) { j.dir = dir; input.set('left', dir < 0); input.set('right', dir > 0); }
  const up = j.up ? -dy > JOY.upOff * R : -dy > JOY.up * R && -dy > 0.5 * Math.abs(dx);   // steering on to the side while up does not let go of it
  if (up !== j.up) { j.up = up; if (!hyb) input.set('jump', up); }   // held up, a higher jump (not while ▲ has it)
  const low = dy > JOY.down * R && dy > Math.abs(dx);
  if (low && !j.low) game.pressDown();
  j.low = low; j.x = x; j.y = y; joyShow();
}
function joyEnd() {
  if (!joy) return;
  const j = joy;
  joy = null; input.joy = false; input.set('left', false); input.set('right', false); if (j.up && !hyb) input.set('jump', false); joyEl.classList.remove('on');
}
for (const type of ['touchend', 'touchcancel']) document.addEventListener(type, (e) => {   // iOS can lose a finger's pointerup (off the top of the screen, say): no finger on the glass, nothing held
  if (e.touches.length) return;
  joyEnd();
  if (gest) { if (gest.dir) { input.swipe = false; input.set('left', false); input.set('right', false); } if (gest.flick === 'up') input.set('jump', false); }
  gest = null; tap2 = null;
}, { passive: true });

// ── Sound ────────────────────────────────────────────────────
// Effects and music made with ElevenLabs (tools/audio.py). One Web Audio context, made on the first key press or
// touch (browsers keep sound off until then). Effects play with a little random pitch; music loops and cross-fades:
// calm in the menu and the rooms, climb in the shaft, boss at the summit, quieter while paused or over. It sleeps
// while the page is hidden; "sound" in the menu and the pause turns it off and on (saved).
const SOUNDS = ['jump', 'airjump', 'walljump', 'land', 'stomp', 'coin', 'hurt', 'fall', 'die', 'spring', 'crumble', 'combo',
  'buy', 'deny', 'bubble', 'portal', 'click', 'bosshit', 'burn', 'spit', 'shot'];
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
  const k = aim.stk, byStk = !!k && Math.hypot(k.x - k.sx, k.y - k.sy) >= JUMP.deadZone;   // a stick points where to go; ▲ pulled back points the other way
  const dx = byStk ? k.x - k.sx : aim.sx - aim.x, dy = byStk ? k.y - k.sy : aim.sy - aim.y, len = Math.hypot(dx, dy);
  if (len < JUMP.deadZone) {   // not pulled: no dots, but in the hybrid after a moment the plain jump's
    aim.p = 0;
    if (aim.hyb && performance.now() - aim.t0 > HYB.hold * 1000) {   // off a wall up and away from it, in the air straight up
      const t = game.touch, wall = game.sinceContact <= JUMP.coyote && (t === 1 || t === 2);
      aim.p = 1; aim.ux = 0; aim.uy = -1; aim.vx = wall ? (t === 1 ? 1 : -1) * JUMP.wallX * game.R : game.hero.rigVx; aim.vy = -game.vjump * (wall ? JUMP.wallUp : 1);
    }
    return;
  }
  let ux = dx / len, uy = dy / len;
  const n = game.surfaceNormal();
  if (n) {   // at least `minUp` out of the surface, still to the side it was aimed
    const tx = -n[1], ty = n[0], out = ux * n[0] + uy * n[1], along = ux * tx + uy * ty;
    if (out < JUMP.minUp) { const s = (along < 0 ? -1 : 1) * Math.sqrt(1 - JUMP.minUp * JUMP.minUp); ux = JUMP.minUp * n[0] + s * tx; uy = JUMP.minUp * n[1] + s * ty; }
  }
  aim.ux = ux; aim.uy = uy;
  aim.p = Math.min(1, (len - JUMP.deadZone) / (byStk ? JOY.reach - JUMP.deadZone : (aim.hyb ? HYB.full : JUMP.dragFrac) * view.w));
  const lo = aim.hyb ? HYB.min : JUMP.minPower, v = game.vjump * (lo + (1 - lo) * aim.p);
  aim.vx = ux * v; aim.vy = uy * v;
}
function aimCancel() { aim.on = false; aim.hyb = false; hyb = null; aim.p = 0; nDots = 0; if (game.hero) game.hero.squeezeIn = 0; if (aim.stk) { aim.stk = null; stkShow(); } }
// The hybrid's other finger while ▲ aims: a stick from where it came down (or where it was), drawn as the stick
// is, all of the jump at its reach; let go, it keeps its aim till ▲ is let go.
function aimStick(id, x, y, fresh) {
  if (fresh || !aim.stk || aim.stk.id !== id) aim.stk = { id, sx: x, sy: y, x, y }; else { aim.stk.x = x; aim.stk.y = y; }
  stkShow();
}
function stkShow() {
  const k = aim.stk;
  if (!k) { if (!joy) joyEl.classList.remove('on'); return; }
  const dx = k.x - k.sx, dy = k.y - k.sy, d = Math.hypot(dx, dy), s = d > JOY.reach ? JOY.reach / d : 1;
  joyEl.style.transform = 'translate(' + k.sx + 'px,' + k.sy + 'px)'; joyKnob.style.transform = 'translate(' + dx * s + 'px,' + dy * s + 'px)';
  joyKnob.classList.toggle('on', d >= JUMP.deadZone); joyEl.classList.add('on');
}
function aimFrame(now) {
  hybCheck(now);
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
  view.keep = coarse ? Math.max(...[...pad.querySelectorAll('.key')].map((k) => parseFloat(getComputedStyle(k).height))) + parseFloat(getComputedStyle(pad).paddingBottom) + 8 : 0;   // the tallest key
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
// Safari (user: it got in the way): a finger anywhere over the game, the stick and swipes included, must never start a
// selection, the loupe or a callout. Only buttons keep their default: their click needs it. Pointer events still come.
for (const type of ['touchstart', 'touchmove']) document.addEventListener(type, (e) => { if (!(e.target.closest && e.target.closest('button'))) e.preventDefault(); }, { passive: false });
for (const type of ['selectstart', 'contextmenu']) document.addEventListener(type, (e) => e.preventDefault());
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
  candy(kind) { game.take(kind); return { pow: game.pow, t: game.gunT }; },   // a candy's power at once, for checks
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
  bonus(w, seed) { this.go(w, 2, seed); game.startBonus(BONUS[w]); return this.state; },   // straight into world w's bonus level
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
