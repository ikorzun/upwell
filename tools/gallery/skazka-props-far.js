// The Dark Forest's gallery (tools/gallery, see compose.py): Baba Yaga's fence on its ledge, the hero beside it (its skulls' eyes lit by him), and the forest far
// off, each variant in the forest's dark, a step each. window.__only = 'far' or 'fence' picks one.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const wipe = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  const start = (v) => { window.__skV = Object.assign({}, SKAZKA_V, { slab: -1 }, v); const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none'; game.preview = SKAZKA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv; lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; wipe(lv); return lv; };
  const fence = async (k) => {
    const lv = start({ fence: k, far: -1 }), t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, y0 = sn(lv.floor - 30 * t);
    const r = lv.box(lv.l, y0, lv.l + 3.6 * t, y0 + t, {}); r.kit = { kind: 'fence' }; lv.rects.push(r);
    lv.rects.push(lv.box(r.x1 + 0.5 * t, y0, r.x1 + 3.2 * t, y0 + t, {})); g.placeHero(r.x1 + 1.85 * t, y0 - R);   // the hero beside it, on a ledge of its own
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el: 'fence', k, sy: Math.round(y0 - cam), w: 7.6, at: 0.72 };
  };
  const far = async (f) => {
    const lv = start({ far: f }), t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, y0 = sn(lv.floor - 30 * t);
    const r = lv.box(lv.l, y0, lv.l + 3 * t, y0 + t, {}); r.kit = null; lv.rects.push(r); g.placeHero(lv.l + 1.4 * t, y0 - R);   // the hero where the camera keeps him
    const cam = g.hero.cy - CAM.anchor * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el: 'far', k: f, band: Math.round(0.8 * view.h), far: true };
  };
  const only = window.__only;
  window.__steps = (only === 'far' ? [] : [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return fence(k); })).concat(only === 'fence' ? [] : [0, 1, 2, 3, 4, 5].map((f) => async () => { input.clear(); return far(f); }));
})();
