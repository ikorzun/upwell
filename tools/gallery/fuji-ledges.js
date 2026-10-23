// Fuji's gallery, round 2 (owner 2026-10-23): each look of its stone slabs and its staff bells drawn by the game in one scene, a step each (FUJI_V,
// window.__fujiV; compose.py lays them out A-F). Usage: node tools/gallery/look.mjs tools/gallery/fuji-ledges.js /tmp/f > /tmp/f.log, then compose.py /tmp/f /tmp/f.log research/variants fuji
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;   // (no story card over the shots)
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['stone', 'stick'];
  const scene = async (el, k) => {
    window.__fujiV = Object.assign({}, FUJI_V, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);   // (k 3: no prop of the kit on it)
    const pl = LEVEL.plank * R;
    let r;
    if (el === 'stone') { r = lv.box(lv.l, y0, lv.l + 5.5 * t, y0 + t, {}); r.kit = null; }
    else { r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + pl, { plank: true }); r.kit = { kind: 'bell', x: r.x1 - 0.3 * t, y: r.y0 - 1.4 * t }; }
    lv.rects.push(r);
    g.placeHero(el === 'stone' ? r.x0 + 2.2 * t : r.x0 + 0.9 * t, y0 - R); __up.tick(30);   // (by the wall, past KIT_REACH: its bell not rung)
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam;
    if (el === 'stick') { lv.tended.delete(r); __up.tick(1, 0); }   // (drawn once more with no step: its bell as it is till the hero comes near)
    await wait(250);
    return { el, k, sy: Math.round(y0 - cam), w: 6.5, at: el === 'stick' ? 0.62 : 0.53, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
