// A strip of a wall's burst through its warning, thrust, hold and retreat (left wall), and a holder swinging and an icicle swaying, every 100 ms
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), W = window.__wsW != null ? window.__wsW : 0;
  let lv, cam, y0;
  const steps = [async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(W * 30 + 3, 0); g.state = 'play'; lv = g.lv; const t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    y0 = sn(lv.floor - 30 * t); const a = lv.box(lv.l + 5 * t, y0, lv.l + 11 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 8 * t, y0 - R);
    const cyc = FIREWALL.on + FIREWALL.off; lv.t = 10; lv.fireWalls.push({ side: 1, y0: y0 - 6 * t, y1: y0, ph: (((FIREWALL.off - FIREWALL.warn - 10) % cyc) + cyc) % cyc });
    const f = lv.box(lv.l + 5 * t, y0 - 2 * t, lv.l + 11 * t, y0 - 1 * t, {}); f.kit = null; lv.rects.push(f);
    lv.arenas.push({ x: lv.l + 8 * t, y: y0 - 2.5 * t, on: true, done: false, wave: 0, foes: [], small: false, floor: f, waves: ARENA.waves, warnAt: 10, dropAt: -1, drops: [], dropT: 1e9 });
    lv.icicles.push({ x: lv.l + 13.5 * t, y: y0 - 9 * t, state: 'shake', t: ICICLE.shake });
    const top2 = lv.box(lv.l + 12 * t, y0 - 10 * t, lv.r, y0 - 9 * t, {}); top2.kit = null; lv.rects.push(top2);
    cam = y0 - 0.6 * view.h; lv.cam = cam; __up.tick(1, 0); await wait(100); return { f: -1, sy: Math.round(y0 - cam) };
  }];
  for (let f = 0; f < 24; f++) steps.push(async () => { lv.t += 0.1; for (const c of lv.icicles) c.t = Math.max(0.02, ICICLE.shake - (f % 6) * 0.1); lv.cam = cam; __up.tick(1, 0); await wait(50); return { f, sy: Math.round(y0 - cam) }; });
  window.__steps = steps;
})();
