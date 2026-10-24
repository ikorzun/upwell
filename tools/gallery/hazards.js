// Each world's rising hazard (К13 «А»; HAZ_SPR, HAZ_V, window.__hz): six looks A-F a world, each caught as it throws a burst up, the hero on a ledge over it for
// scale. window.__hzWorlds picks the worlds (0 the Village, 1 the Mine, 2 Fuji, 3 the Sea, 4 Tokyo). compose.py lays each out A-F (world 'haz'). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__hzWorlds || [0, 1, 2, 3, 4];
  const scene = async (w, k) => {
    window.__hz = k;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + 3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const a = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {}); a.kit = null; lv.rects.push(a);
    g.placeHero(lv.l + 2 * t, y0 - R);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(20); g.invuln = 0;
    lv.fire.y = y0 + 3.2 * t; lv.fire.warn = null; lv.t = (40 + 0.08) / 0.45; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(200);
    return { el: lv.theme.hazard || 'fire', k, sy: Math.round(y0 + 1.5 * t - cam), w: 16, at: 0.5, nf: renderer.nf };
  };
  window.__steps = worlds.flatMap((w) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(w, k); }));
})();
