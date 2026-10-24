// Where an arena's wave waits (HOLD_SPR, К8): each world's thing in its six looks (window.__ho), over three arena floors side by side: full (the arena
// not begun), shaking (its wave shown), emptied (the wave dropped); the hero on the right floor for scale. window.__hWorlds picks the worlds. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__hWorlds || [0, 2, 3, 4];
  const scene = async (w, k) => {
    window.__ho = k;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + 3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const W = (lv.r - lv.l) / 3;
    ['full', 'shake', 'empty'].forEach((st, i) => {
      const f = lv.box(sn(lv.l + i * W + 0.4 * t), y0, sn(lv.l + (i + 1) * W - 0.4 * t), y0 + t, {}); f.kit = null; lv.rects.push(f);
      const a = { x: (f.x0 + f.x1) / 2, y: y0 - t / 2, on: st !== 'full', done: st === 'empty', wave: 0, foes: [], small: false, floor: f, waves: ARENA.waves, warnAt: st === 'full' ? -1 : 5, dropAt: st === 'empty' ? 6 : -1 };
      if (st === 'shake') { a.drops = []; a.dropT = 1e9; }
      lv.arenas.push(a);
    });
    g.placeHero(lv.l + 2.5 * W, y0 - R);   // (on the emptied one's floor: the full one not begun)
    const cam = y0 - 0.8 * view.h; lv.cam = cam; __up.tick(10); g.invuln = 0; lv.t = 10; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'holder', k, world: w, sy: Math.round(y0 - cam), w: (lv.r - lv.l) / t, at: 0.85, nf: renderer.nf };
  };
  window.__steps = worlds.flatMap((w) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(w, k); }));
})();
