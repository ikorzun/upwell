// Fuji's gallery, round 2 (owner 2026-10-23): each look of its shop's and its stash's huts drawn by the game, a step each (FUJI_V.shop / .stash, window.__fujiV;
// FUJI_SPR cut off the sheets; compose.py lays them out A-F). Usage: node tools/gallery/look.mjs tools/gallery/fuji-doors.js /tmp/f > /tmp/f.log
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;   // (no story card over the shots)
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['shop', 'stash'];
  const scene = async (el, k) => {
    window.__fujiV = Object.assign({}, FUJI_V, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);   // (no prop of the kit on it)
    const r = lv.box(lv.l, y0, lv.l + 7 * t, y0 + t, {}); r.kit = null; lv.rects.push(r);
    const w = DOOR.w * R, x0 = lv.l - LEVEL.wall, x1 = lv.l + w;
    lv.bubbles.push({ x0, x1, y0: y0 - DOOR.h * R, y1: y0, x: (x0 + x1) / 2, y: y0 - DOOR.h * R / 2, kind: el === 'shop' ? 'shop' : 'treasure', side: 1, cd: 0, room: null });
    const h = lv.box(r.x1 + 0.6 * t, y0, r.x1 + 3.3 * t, y0 + t, {}); h.kit = null; lv.rects.push(h);   // the hero beside it for its size, on a ledge of its own
    g.placeHero(r.x1 + 1.95 * t, y0 - R); __up.tick(30);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(250);
    return { el, k, sy: Math.round(y0 - cam), w: 10.6, at: 0.75, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
