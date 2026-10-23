// Fuji's gallery, round 2 (owner 2026-10-23): its far layer's new looks drawn by the game, a step each (FUJI_V.kasa, the cap of cloud on the summit; FUJI_V.lake,
// the mountain over Lake Kawaguchi on every other level; window.__fujiV, window.__fujiLake). compose.py lays them out as wide cells.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;   // (no story card over the shots)
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const far = async (el, k) => {
    window.__fujiV = Object.assign({}, FUJI_V, { [el]: k }); window.__fujiLake = el === 'lake';
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), r = lv.box(lv.l, y0, lv.l + 3 * t, y0 + t, {}); r.kit = null; lv.rects.push(r); g.placeHero(lv.l + 1.4 * t, y0 - R); __up.tick(30);   // the hero up top, out of the band
    const cam = y0 - 0.16 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(250);
    return el === 'lake' ? { el, k, band: Math.round(0.8 * view.h + 3.5 * t), h: 10.6, far: true, nf: renderer.nf } : { el, k, band: Math.round(0.8 * view.h), far: true, nf: renderer.nf };
  };
  window.__steps = ['kasa', 'lake'].flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return far(el, k); }));
})();
