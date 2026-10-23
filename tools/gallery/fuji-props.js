// Fuji's gallery, round 2 (owner 2026-10-23): each look of its props drawn by the game in one scene, a step each (FUJI_V, window.__fujiV; FUJI_SPR, cut off the
// sheets; compose.py lays them out A-F): the tent with its snow rabbit, a serow and a fox side by side, the pilgrims' stones, the larch, the station post.
// Usage: node tools/gallery/look.mjs tools/gallery/fuji-props.js /tmp/f > /tmp/f.log, then compose.py /tmp/f /tmp/f.log research/variants fuji
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;   // (no story card over the shots)
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['tent', 'beasts', 'stelae', 'larch', 'post'];
  const K = { tent: 0, beasts: 2, stelae: 3, larch: 5, post: 3 }, W = { tent: 6.5, beasts: 5.6, stelae: 4.4, larch: 5.0, post: 3.0 };
  const scene = async (el, k) => {
    window.__fujiV = Object.assign({}, FUJI_V, { [el]: k }); window.__fujiBoth = el === 'beasts';
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== K[el]) y0 -= t; y0 = sn(y0);   // (the height its kind of prop stands at)
    const r = lv.box(lv.l, y0, lv.l + W[el] * t, y0 + t, {}); r.kit = null; lv.rects.push(r);
    window.__fujiPost = el === 'post' ? r : null; lv.fujiPost = null;
    if (el === 'post') r.kit = null;
    const h = lv.box(r.x1 + 0.6 * t, y0, r.x1 + 3.3 * t, y0 + t, {}); h.kit = null; lv.rects.push(h);   // the hero beside it for its size, on a ledge of its own
    g.placeHero(r.x1 + 1.95 * t, y0 - R); __up.tick(30);
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(250);
    return { el, k, sy: Math.round(y0 - cam), w: W[el] + 3.6, at: 0.8, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
