// The Sea's ledges from Enoshima (ENO slab, plank, boat; ENO_V), one letter a shot: the terrace's rock off each wall and a pillar of it, the walkway off the
// left wall and a free one, the Benten-maru on its stream across the shaft; the hero for scale. Each step returns where each ledge is (CSS px). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    input.clear(); ENO_V.slab = ENO_V.plank = ENO_V.boat = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(91, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P, pl = sn(LEVEL.plank * R);
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv); window.__far = 98;
    const y0 = sn(lv.floor - 40 * t), out = [], add = (name, x0, y, x1, h, f) => { const r = lv.box(sn(x0), sn(y), sn(x1), sn(y) + h, f); r.kit = null; lv.rects.push(r); out.push([name, Math.round(r.x0), Math.round(r.y0), Math.round(r.x1), Math.round(r.y1)]); return r; };
    add('slab', lv.l, y0, lv.l + 5 * t, t, {}); add('slab', lv.r - 4 * t, y0 - 2 * t, lv.r, t, {}); add('pillar', lv.l + 7 * t, y0 - 3 * t, lv.l + 9 * t, 4 * t, {});
    add('plank', lv.l, y0 - 7 * t, lv.l + 6 * t, pl, { plank: true }); add('plank', lv.r - 6.5 * t, y0 - 9 * t, lv.r - 1.5 * t, pl, { plank: true });
    add('boat', lv.l + 4 * t, y0 - 15 * t, lv.l + 10 * t, pl, { plank: true, move: { a: lv.l, b: lv.r - 6 * t, v: 0 } });
    g.placeHero(lv.l + 2.5 * t, y0 - R);
    const cam = y0 + 3 * t - view.h; lv.cam = cam; __up.tick(3); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'eno-ledges', k, nf: renderer.nf, at: out.map(([n, a, b, c, d]) => [n, a, Math.round(b - lv.cam), c, Math.round(d - lv.cam)]) };
  });
})();
