// Tokyo from Shinjuku Golden Gai as picked (GAI, TFAR; owner via the coordinator, Д200–Д217): the things on its ledges (purple crates, the bicycle, the bags
// under a crow net, the meters and the extinguisher, the lucky cat in a bar's window); a bar's lightbox unlit and one lit; the izakaya and the stair door; its
// eaves, a sign-board and a crate on its pulley; the old electrical panel asleep and sparking; the old tram at the crossing; the stash room, the bar upstairs
// (its way out clear); the far view on each of the nine levels with the level's ledges taken out. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), sn = (v) => Math.round(v / PIX.size) * PIX.size;
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; lv.crossing = null; };
  const start = (i = 129) => { const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none'; input.clear(); __up.camp(i, 0); g.state = 'play'; const lv = g.lv; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; return lv; };
  const show = async (lv, cam, el, extra = {}) => { lv.cam = cam; __up.tick(3); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150); return Object.assign({ el, nf: renderer.nf }, extra); };
  const add = (lv, x0, y, x1, h, o = {}) => { const r = lv.box(sn(x0), sn(y), sn(x1), sn(y + h), o); r.kit = null; lv.rects.push(r); return r; };
  const steps = [];
  steps.push(async () => {   // the things on its ledges
    const lv = start(), t = lv.tile, R = g.R; clean(lv); const y0 = sn(lv.floor - 40 * t);
    for (const [wl, y, kind] of [[true, y0, 'crates'], [false, y0, 'bicycle'], [true, y0 - 7 * t, 'bags'], [false, y0 - 7 * t, 'meters'], [true, y0 - 14 * t, 'neko']]) add(lv, wl ? lv.l : lv.r - 6 * t, y, wl ? lv.l + 6 * t : lv.r, t).kit = { kind };
    g.placeHero(lv.l + 8 * t, y0 - R); return show(lv, y0 + 2 * t - view.h, 'things');
  });
  steps.push(async () => {   // a bar's lightbox unlit (left) and one lit (right), on their beat
    const lv = start(), t = lv.tile, R = g.R; clean(lv);
    let s0 = null; for (let j = Math.floor((lv.floor - 60 * t) / (11 * t)); j < 0 && !s0; j++) { const a = neonSign(lv, j), b = neonSign(lv, j + 1); if (a && b && a.left && !b.left) s0 = [a, b]; }
    const [a, b] = s0; lv.neonLit.clear(); lv.neonLit.set(b.k, -10); g.placeHero(lv.l + 8 * t, add(lv, lv.l + 5 * t, b.y1 + 2 * t, lv.l + 11 * t, t).y0 - R);
    return show(lv, sn((a.y0 + b.y1) / 2 - 0.5 * view.h), 'lightboxes');
  });
  steps.push(async () => {   // the doors
    const lv = start(), t = lv.tile, R = g.R; clean(lv); const y0 = sn(lv.floor - 30 * t), y1 = sn(y0 - 7 * t), w = DOOR.w * R;
    add(lv, lv.l, y0, lv.l + 6 * t, t); add(lv, lv.r - 6 * t, y1, lv.r, t);
    lv.bubbles.push({ x0: lv.l - LEVEL.wall, x1: lv.l + w, y0: y0 - DOOR.h * R, y1: y0, x: lv.l + w / 2, y: y0 - (DOOR.h * R) / 2, kind: 'shop', side: 1, cd: 1e9, room: null });
    lv.bubbles.push({ x0: lv.r - w, x1: lv.r + LEVEL.wall, y0: y1 - DOOR.h * R, y1, x: lv.r - w / 2, y: y1 - (DOOR.h * R) / 2, kind: 'treasure', side: -1, cd: 1e9, room: null });
    g.placeHero(lv.l + 9 * t, y0 - 2 * t); return show(lv, y0 - 0.62 * view.h, 'doors');
  });
  steps.push(async () => {   // its ledges: an eave off each wall, a sign-board, a crate on its pulley (held still)
    const lv = start(), t = lv.tile, R = g.R; clean(lv); const y0 = sn(lv.floor - 40 * t), p = LEVEL.plank * R;
    add(lv, lv.l, y0, lv.l + 6 * t, t); add(lv, lv.r - 5 * t, y0 - 5 * t, lv.r, t); add(lv, lv.l + 5 * t, y0 - 10 * t, lv.l + 10 * t, p, { plank: true });
    add(lv, lv.l + 9 * t, y0 - 16 * t, lv.l + 12 * t, p, { plank: true }).move = { a: lv.l, b: lv.r - 3 * t, v: 0 };
    g.placeHero(lv.l + 3 * t, y0 - R); return show(lv, y0 + 3 * t - view.h, 'ledges');
  });
  steps.push(async () => {   // the panel asleep (left wall) and sparking (right)
    const lv = start(), t = lv.tile, R = g.R; clean(lv); const y0 = sn(lv.floor - 30 * t); g.placeHero(lv.l + 8 * t, add(lv, lv.l + 5 * t, y0, lv.l + 11 * t, t).y0 - R);
    const cyc = FIREWALL.on + FIREWALL.off; lv.t = 10;
    lv.fireWalls.push({ side: 1, y0: y0 - 7 * t, y1: y0 - 1 * t, ph: ((0.5 - 10) % cyc + cyc) % cyc }, { side: 2, y0: y0 - 7 * t, y1: y0 - 1 * t, ph: ((FIREWALL.off + 0.45 - 10) % cyc + cyc) % cyc });
    lv.cam = y0 - 0.6 * view.h; __up.tick(1, 0); await wait(120); return { el: 'panel', nf: renderer.nf };
  });
  steps.push(async () => {   // the old tram mid-crossing
    const lv = start(), t = lv.tile, R = g.R; clean(lv); const y = sn(lv.floor - 30 * t), h = TRAIN.h * view.h;
    lv.crossing = { y0: y - h, y1: y, state: 'pass', t: 0, x: lv.l + 0.8 * (lv.r - lv.l) }; g.placeHero(lv.l + 8 * t, add(lv, lv.l + 5 * t, y - h - 5 * t, lv.l + 11 * t, t).y0 - R);
    lv.cam = sn(y - 0.6 * view.h); __up.tick(1, 0); await wait(150); return { el: 'tram', nf: renderer.nf };
  });
  steps.push(async () => {   // the stash room (several frames in: the room drawn and settled)
    const tst = document.getElementById('toast'); start();
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor() });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); for (let i = 0; i < 4; i++) { __up.tick(30); await wait(100); } g.invuln = 0; __up.tick(1, 0); await wait(300); if (tst) tst.style.display = 'none';
    const lv = g.lv, t = lv.tile; return { el: 'room', exit: lv.exit && [(lv.exit.x0 - lv.l) / t, (lv.floor - lv.exit.y1) / t, (lv.exit.x1 - lv.l) / t, (lv.floor - lv.exit.y0) / t], nf: renderer.nf };
  });
  for (let s = 0; s < 9; s++) steps.push(async () => {   // the far view by level, the level's ledges out
    const lv = start(120 + s * 3); clean(lv); const y = lv.floor - 0.25 * (lv.floor - lv.endY), cam = sn(y - 0.5 * view.h);
    g.placeHero((lv.l + lv.r) / 2, y); return show(lv, cam, 'far', { s, stage: lv.stage });
  });
  window.__steps = steps;
})();
