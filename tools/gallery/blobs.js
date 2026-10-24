// What each world's hazard throws (HAZ_SPR blob, К13) and where one is coming (its warning: the piece peeking out of the front): three in the air
// over the front, one peeking; the hero on a ledge for scale. window.__blWorlds picks the worlds. compose.py lays them out (world 'blob'). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__blWorlds || [0, 1, 2, 3, 4];
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
    lv.fire.y = y0 + 4.5 * t; lv.fire.calm = 0; lv.fire.rush = 0; lv.shots.length = 0;
    for (const [u, v] of [[6, 1.5], [9.5, 3], [12.5, 2]]) lv.shots.push({ x: lv.l + u * t, y: lv.fire.y - v * t, vx: 0, vy: 0, r: FIRE.blob * R, fire: true });
    lv.fire.warn = { x: lv.l + 3 * t, t: 0.3 * FIRE.warn };
    lv.t = 3.0; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(200);
    return { el: lv.theme.hazard || 'fire', k, sy: Math.round(lv.fire.y - 1.5 * t - cam), w: 16, at: 0.5, nf: renderer.nf };
  };
  window.__steps = worlds.flatMap((w) => [0].map((k) => async () => { input.clear(); return scene(w, k); }));
})();
