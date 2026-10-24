// The TV Tower's ledges (TW_V truss, landing, stair; twTruss, twLanding, twStep), six takes: a truss off the left wall, a free one and a thick one (a leg of the
// lattice), a landing off the right wall, a flight of five steps up from a ledge; the hero for scale. Each step returns its crops (CSS px). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    input.clear();
    TW_V.truss = TW_V.landing = TW_V.stair = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(183, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv);
    const y0 = sn(lv.floor - 40 * t), at = {};
    const add = (x0, y, x1, y1, o = {}) => { const r = lv.box(sn(x0), sn(y), sn(x1), sn(y1), o); r.kit = null; lv.rects.push(r); return r; };
    add(lv.l, y0, lv.l + 7 * t, y0 + t); add(lv.l + 9 * t, y0 + 2 * t, lv.l + 13 * t, y0 + 3 * t); add(lv.l + 1 * t, y0 + 3.5 * t, lv.l + 4 * t, y0 + 6.5 * t);
    at.truss = [lv.l, y0 - 1.5 * t, lv.l + 13.5 * t, y0 + 7 * t];
    const yl = y0 - 6 * t; add(lv.r - 7 * t, yl, lv.r, yl + 0.32 * t, { plank: true }); at.landing = [lv.r - 7.6 * t, yl - 2.2 * t, lv.r, yl + 1.6 * t];
    const ys = y0 - 10 * t; add(lv.l, ys, lv.l + 3 * t, ys + t);
    for (let i = 0; i < 5; i++) add(lv.l + (3 + i) * t, ys - (i + 1) * t, lv.l + (4 + i) * t, ys - i * t, { stair: true });
    at.stair = [lv.l, ys - 6.2 * t, lv.l + 9 * t, ys + 1.5 * t];
    g.placeHero(lv.l + 4 * t, y0 - R); window.__twAll = true;
    const cam = sn(y0 + 7 * t - view.h); lv.cam = cam; __up.tick(4); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150); window.__twAll = false;
    for (const q in at) at[q] = at[q].map((v, i) => Math.round(i % 2 ? v - cam : v));
    return { el: 'tw-ledges', k, nf: renderer.nf, at };
  });
})();
