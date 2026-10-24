// The Village without cold (owner, Д77): its falling things (VDROP_SPR, window.__vd) under a ledge, one shaking, one falling; its slick wall (VSLICK_SPR,
// window.__vs) as a column up the shaft; six looks A-F, the same letter of each in a shot; the hero on a ledge for scale. compose.py: world 'village'.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const scene = async (k) => {
    window.__vd = k; window.__vs = k;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const top = lv.box(lv.l + 3 * t, y0 - 8 * t, lv.l + 10 * t, y0 - 7 * t, {}); top.kit = null; lv.rects.push(top);
    const a = lv.box(lv.l, y0, lv.l + 5 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 2 * t, y0 - R);
    const col = lv.box(lv.r - 4 * t, y0 - 6 * t, lv.r - 3 * t, y0 + t, { slick: true }); col.kit = null; lv.rects.push(col);   // a slick wall up the shaft
    for (const [u, st] of [[4, 'hang'], [6.5, 'shake'], [9, 'hang']]) lv.icicles.push({ x: lv.l + u * t, y: y0 - 7 * t, state: st });
    lv.shots.push({ icicle: true, x: lv.l + 6.5 * t, y: y0 - 3.5 * t, r: 0.3 * R, vx: 0, vy: 0 });
    const cam = y0 - 0.55 * view.h; lv.cam = cam; __up.tick(10); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'nocold', k, sy: Math.round(y0 - 3 * t - cam), w: 16, at: 0.5, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k); });
})();
