// Tokyo from Golden Gai, round 2: its ledges in wood and tin (GAI_V slab, board, pulley), six takes: an eave or an awning off each wall, a bar's sign-board on
// its wires across the alley, a crate on its rope pulley (its mover held still); the hero for scale. Then each letter on a level as it is (5-4). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), sn = (v) => Math.round(v / PIX.size) * PIX.size;
  const built = async (k) => {
    GAI_V.slab = GAI_V.board = GAI_V.pulley = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(129, 0); g.state = 'play'; const lv = g.lv, t = lv.tile, R = g.R; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; lv.crossing = null;
    const y0 = sn(lv.floor - 40 * t), p = LEVEL.plank * R;
    const add = (x0, y, x1, h, o) => { const r = lv.box(sn(x0), sn(y), sn(x1), sn(y + h), o); r.kit = null; lv.rects.push(r); return r; };
    add(lv.l, y0, lv.l + 6 * t, t, {}); add(lv.r - 5 * t, y0 - 5 * t, lv.r, t, {});
    add(lv.l + 5 * t, y0 - 10 * t, lv.l + 10 * t, p, { plank: true });
    const m = add(lv.l + 9 * t, y0 - 16 * t, lv.l + 12 * t, p, { plank: true }); m.move = { a: lv.l, b: lv.r - 3 * t, v: 0 };
    g.placeHero(lv.l + 3 * t, y0 - R);
    const cam = y0 + 3 * t - view.h; lv.cam = cam; __up.tick(3); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'gai-ledges', k, nf: renderer.nf };
  };
  const level = async (k) => {
    GAI_V.slab = GAI_V.board = GAI_V.pulley = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(129, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    const y = lv.floor - 0.3 * (lv.floor - lv.endY), cam = sn(y - 0.5 * view.h);
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); lv.cam = cam; __up.tick(1, 0); await wait(120);
    return { el: 'gai-level', k, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return built(k); }).concat([0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return level(k); }));
})();
