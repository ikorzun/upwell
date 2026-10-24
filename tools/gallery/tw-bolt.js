// The TV Tower's lightning down the rod (TW.bolt, TW_V.bolt), its six takes: the left wall's stretch asleep, the right wall's bursting; the hero between. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    TW_V.bolt = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(183, 0); g.state = 'play'; const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), a = lv.box(lv.l + 5 * t, y0, lv.l + 11 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 8 * t, y0 - R);
    const cyc = FIREWALL.on + FIREWALL.off; lv.t = 10;
    lv.fireWalls.push({ side: 1, y0: y0 - 7 * t, y1: y0 - 1 * t, ph: ((0.5 - 10) % cyc + cyc) % cyc });   // asleep
    lv.fireWalls.push({ side: 2, y0: y0 - 7 * t, y1: y0 - 1 * t, ph: ((FIREWALL.off + 0.45 - 10) % cyc + cyc) % cyc });   // bursting
    const cam = y0 - 0.6 * view.h; lv.cam = cam; g.invuln = 0; __up.tick(1, 0); await wait(120);
    return { el: 'tw-bolt', k, nf: renderer.nf, at: { asleep: [0, Math.round(y0 - 7.5 * t - cam), 80, Math.round(y0 - 0.5 * t - cam)], burst: [Math.round(lv.r - 80), Math.round(y0 - 7.5 * t - cam), Math.round(lv.r + 12), Math.round(y0 - 0.5 * t - cam)] } };
  });
})();
