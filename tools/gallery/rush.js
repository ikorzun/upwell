// The fire's speed-up as each world shows it (К2 «А»: lv.fire.rush): calm, sped up in sight (its front taller), sped up out of sight (the screen's
// bottom edge red). window.__ruWorlds picks the worlds. compose.py lays each world's three in a row (world 'rush'). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__ruWorlds || [0, 1, 2, 3, 4];
  const scene = async (w, k) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + 3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const a = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {}); a.kit = null; lv.rects.push(a);
    g.placeHero(lv.l + 2 * t, y0 - R);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(20); g.invuln = 0;
    lv.fire.y = k < 2 ? y0 + 3.2 * t : cam + view.h + 6 * t; lv.fire.warn = null; lv.fire.calm = 0; g.idleT = k ? 99 : 0; lv.fire.rush = k ? 1 : 0;   // (a frame of no time runs no update: set as Level.update would)
    lv.t = 3.3; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(200);
    return { el: lv.theme.hazard || 'fire', k, rush: lv.fire.rush, sy: Math.round(k < 2 ? lv.fire.y - cam : view.h - (view.keep || 0)), w: 16, at: 0.6, nf: renderer.nf };
  };
  window.__steps = worlds.flatMap((w) => [0, 1, 2].map((k) => async () => { input.clear(); return scene(w, k); }));
})();
