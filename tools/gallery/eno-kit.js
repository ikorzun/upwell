// The Sea from Enoshima, round 2 (ENO, ENO_V): in each shot one letter of every thing on its ledges: the cats and the rods low, the kite (at a free end) and
// the sazae grill, the harbour light unlit and lit; then the Sea Candle unlit and lit (4-9's, up top); the hero for scale. Each step returns where each thing's
// ledge is on the screen (CSS px), for the page's crops. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  const scene = async (k, big) => {
    for (const el in ENO_V) ENO_V[el] = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(91, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv); window.__far = 98;
    const y0 = sn(lv.floor - 40 * t), out = [];
    const put = (wl, n, y, kind, extra = {}) => { const r = lv.box(wl ? lv.l : sn(lv.r - n * t), sn(y), wl ? sn(lv.l + n * t) : lv.r, sn(y) + t, {}); const d = wl ? 1 : -1, X = (u) => (wl ? lv.l : lv.r) + d * u * t;
      r.kit = Object.assign({ kind, x: X(2), y: sn(y) - 2 * t }, extra); lv.rects.push(r); out.push([kind + (extra.lit ? '+' : ''), Math.round(r.x0), Math.round(r.y0), Math.round(r.x1), Math.round(r.y1)]); return r; };
    if (!big) {
      put(true, 5, y0, 'cats'); put(false, 5, y0, 'rods');
      put(true, 5, y0 - 6.5 * t, 'kite'); put(false, 5, y0 - 6.5 * t, 'sazae');
      put(true, 5, y0 - 13 * t, 'lighthouse'); const lit = put(false, 5, y0 - 13 * t, 'lighthouse', { lit: true }); lv.tended.set(lit, -10);
      g.placeHero(lv.l + 8 * t, y0 - R);
    } else {
      put(true, 7, y0 - 6 * t, "lighthouse", { big: true }); const lit = put(false, 7, y0 - 6 * t, "lighthouse", { big: true, lit: true }); lv.tended.set(lit, -10);
      g.placeHero(lv.l + 7.6 * t, y0 - 6 * t - R);
    }
    const cam = y0 + 2 * t - view.h; lv.cam = cam; __up.tick(4); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: big ? 'eno-candle' : 'eno-kit', k, nf: renderer.nf, cam: Math.round(lv.cam), at: out.map(([n, a, b, c, d]) => [n, a, Math.round(b - lv.cam), c, Math.round(d - lv.cam)]) };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k, false); }).concat([0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k, true); }));
})();
