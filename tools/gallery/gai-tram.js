// Tokyo's level crossing with the old tram No. 13 going through (GAI_V.tram; Д158 «А»), its six takes, held mid-crossing; the hero for scale above. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    GAI_V.tram = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(129, 0); g.state = 'play'; const lv = g.lv, t = lv.tile, R = g.R, sn = (v) => Math.round(v / PIX.size) * PIX.size;
    g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y = sn(lv.floor - 30 * t), h = TRAIN.h * view.h; lv.crossing = { y0: y - h, y1: y, state: 'pass', t: 0, x: lv.l + 0.8 * (lv.r - lv.l) };
    const a = lv.box(lv.l + 5 * t, sn(y - h - 5 * t), lv.l + 11 * t, sn(y - h - 4 * t), {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 8 * t, a.y0 - R);
    const cam = sn(y - 0.6 * view.h); lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'gai-tram', k, nf: renderer.nf };
  });
})();
