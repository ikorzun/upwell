// The TV Tower from Tokyo Tower, round 2 (TW, TW_V): in each shot one letter of every thing on its ledges, on the left wall the binocular, the painters' cans, the
// antenna panels and a floodlight unlit, on the right the step sign, the electrician's lamp box, the crow and a floodlight lit; the hero for scale. Each step
// returns where each thing is on the screen (CSS px, [x0, y0, x1, y1]) for the page's crops. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    input.clear();
    for (const el in TW_V) TW_V[el] = 'ABCDEF'[k];
    TW_V.truss = 'A';
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(183, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv);
    const y0 = sn(lv.floor - 40 * t), at = {};
    const put = (wl, n, y, kind) => { const r = lv.box(wl ? lv.l : sn(lv.r - n * t), sn(y), wl ? sn(lv.l + n * t) : lv.r, sn(y) + t, {}); const d = wl ? 1 : -1, X = (u) => (wl ? lv.l : lv.r) + d * u * t;
      r.kit = { kind, x: X(0.5), y: sn(y) - 2 * t }; lv.rects.push(r); at[kind + (kind === 'flood' ? (wl ? 'off' : 'on') : '')] = [wl ? lv.l : lv.r - 5.6 * t, sn(y) - 5.2 * t, wl ? lv.l + 5.6 * t : lv.r, sn(y) + t]; return r; };
    put(true, 6, y0, 'bino'); put(false, 6, y0, 'sign');
    put(true, 6, y0 - 5.5 * t, 'paint'); put(false, 6, y0 - 5.5 * t, 'lampbox');
    put(true, 6, y0 - 11 * t, 'antenna'); put(false, 6, y0 - 11 * t, 'crow');
    put(true, 5, y0 - 16.5 * t, 'flood'); const lit = put(false, 5, y0 - 16.5 * t, 'flood'); lv.tended.set(lit, -10);
    g.placeHero((lv.l + lv.r) / 2, y0 - 6.5 * t);
    const cam = sn(y0 - 540); lv.cam = cam; __up.tick(4); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    for (const q in at) at[q] = at[q].map((v, i) => Math.round(i % 2 ? v - cam : v));
    return { el: 'tw-kit', k, nf: renderer.nf, at };
  });
})();
