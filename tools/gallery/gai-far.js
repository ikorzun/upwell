// Tokyo's far view on each of its nine levels (TFAR, Golden Gai tier by tier), then the three alternates (far2-D, E, F on 5-6, 5-8, 5-9), the camera low in
// the level; window.__clean: the level's ledges and things taken out, to see the far view alone. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const shot = async (s, pick) => {
    TFAR.pick = pick;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(120 + s * 3, 0); g.state = 'play'; const lv = g.lv; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    if (window.__clean) { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; lv.crossing = null; }
    const y = lv.floor - 0.25 * (lv.floor - lv.endY), cam = Math.round((y - 0.5 * view.h) / PIX.size) * PIX.size;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { s, stage: lv.stage, pick: pick || TFAR.stage[lv.stage], nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => () => shot(s, undefined)).concat([[5, 'far2-D'], [7, 'far2-E'], [8, 'far2-F']].map(([s, p]) => () => shot(s, p)));
})();
