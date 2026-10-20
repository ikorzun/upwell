// The gallery, batch 3: the Sea's doors (funaya, each variant as the sheet had it: A, C, E a shop, B, D, F a stash) and its far layer (wave A-F, far A-F).
// (The owner picked the Sea's on 2026-10-20 and SEA_V went with the variants, so this no longer runs as it is: it is the template for the next
// world's gallery. Copy it and point it at that world's own variant table and preview world.)
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const wipe = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  const start = (v) => { window.__seaV = Object.assign({}, SEA_V, { slab: -1 }, v); const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none'; game.preview = SEA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv; lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; wipe(lv); return lv; };
  const door = async (k) => {
    const kind = k % 2 ? 'treasure' : 'shop', lv = start(kind === 'shop' ? { shop: k, far: -1 } : { stash: k, far: -1 }), t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, y0 = sn(lv.floor - 30 * t);
    lv.rects.push(lv.box(lv.l, y0, lv.l + 5.6 * t, y0 + t, {}));
    const w = DOOR.w * R, x0 = lv.l - LEVEL.wall, x1 = lv.l + w; lv.bubbles.push({ x0, x1, y0: y0 - DOOR.h * R, y1: y0, x: (x0 + x1) / 2, y: y0 - (DOOR.h * R) / 2, kind, side: 1, cd: 1e9, room: null });
    g.placeHero(lv.l + 4.7 * t, y0 - R);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el: 'house', k, sy: Math.round(y0 - cam), w: 7.4, at: 0.66 };
  };
  const far = async (f) => {
    const lv = start({ far: f }), t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, y0 = sn(lv.floor - 30 * t);
    const r = lv.box(lv.l, y0, lv.l + 3 * t, y0 + t, {}); r.kit = null; lv.rects.push(r); g.placeHero(lv.l + 1.4 * t, y0 - R);   // the hero up top, out of the band
    const cam = y0 - 0.16 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el: f < 6 ? 'wave' : 'far', k: f % 6, band: Math.round(0.8 * view.h), far: true };
  };
  window.__steps = (window.__only === 'far' ? [] : [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return door(k); })).concat(Array.from({ length: 12 }, (_, f) => async () => { input.clear(); return far(f); }));
})();
