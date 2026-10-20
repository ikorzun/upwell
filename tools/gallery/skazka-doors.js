// The Dark Forest's gallery (tools/gallery, see compose.py): its doors, each variant of the hut on chicken legs (the shop) and of the stove (the stash) on a
// ledge at the wall, the hero beside it, in the forest's dark, a step each.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const wipe = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  const door = async (el, k) => {
    window.__skV = Object.assign({}, SKAZKA_V, { slab: -1, far: -1, [el]: k }); const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = SKAZKA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, y0 = sn(lv.floor - 30 * t); lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; wipe(lv);
    lv.rects.push(lv.box(lv.l, y0, lv.l + 5.6 * t, y0 + t, {}));
    const kind = el === 'izba' ? 'shop' : 'treasure', w = DOOR.w * R, x0 = lv.l - LEVEL.wall, x1 = lv.l + w; lv.bubbles.push({ x0, x1, y0: y0 - DOOR.h * R, y1: y0, x: (x0 + x1) / 2, y: y0 - (DOOR.h * R) / 2, kind, side: 1, cd: 1e9, room: null });
    g.placeHero(lv.l + 4.7 * t, y0 - R);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: 7.4, at: 0.62 };
  };
  window.__steps = ['izba', 'stove'].flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return door(el, k); }));
})();
