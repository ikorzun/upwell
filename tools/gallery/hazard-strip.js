// A strip of frames of each world's rising hazard over half the screen (its front moving, a burst thrown), every 80 ms, to judge its motion
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__stW || [0, 1, 2, 3, 4], F = window.__stN || 12;
  let lv, cam, y0;
  const steps = [];
  for (const w of worlds) {
    steps.push(async () => {
      const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
      __up.camp(w * 30 + 3, 0); g.state = 'play'; lv = g.lv; const t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
      g.invuln = 1e9; lv.dark = false; lv.rects = lv.rects.filter((r) => r.cap);
      for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
      y0 = sn(lv.floor - 30 * t); const a = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 2 * t, y0 - R);
      cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(10); lv.fire.y = y0 + 3.2 * t; lv.fire.warn = null; lv.fire.calm = 0;
      lv.t = 40 / 0.45 - 0.3; lv.cam = cam; __up.tick(1, 0); await wait(100);
      return { w, f: -1, sy: Math.round(lv.fire.y - cam) };
    });
    for (let f = 0; f < F; f++) steps.push(async () => { lv.t += 0.08; lv.fire.y = y0 + 3.2 * lv.tile; lv.cam = cam; __up.tick(1, 0); await wait(60); return { w, f, sy: Math.round(lv.fire.y - cam) }; });
  }
  window.__steps = steps;
})();
