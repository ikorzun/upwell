// The Village from the Iya valley, round 2 (VIL2, window.__v2): in each shot one letter of every element: a mountain cherry, the three beasts, kaya stacks, the
// Peeing Boy on a ledge's end, koinobori on a rope across the shaft, the vine bridge; the hero for scale. compose.py: world 'village', el 'iya'. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const scene = async (k) => {
    window.__v2 = { cherry: k, beast: k, kaya: k, rope: k, statue: k, bridge: k };
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 40 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const put = (x0, x1, y, kit, f = {}) => { const r = lv.box(sn(x0), sn(y), sn(x1), sn(y) + t, f); r.kit = kit; lv.rects.push(r); return r; };
    put(lv.l, lv.l + 5 * t, y0, { kind: 'sakura' });                                   // the cherry, low left
    put(lv.r - 6 * t, lv.r, y0, { kind: 'kaya' });                                     // kaya, low right
    put(lv.l, lv.l + 4 * t, y0 - 6 * t, { kind: 'beast', a: 'macaque' });
    put(lv.r - 4 * t, lv.r, y0 - 6 * t, { kind: 'beast', a: 'deer' });
    put(lv.l, lv.l + 4 * t, y0 - 10.5 * t, { kind: 'beast', a: 'boar' });
    put(lv.r - 5 * t, lv.r, y0 - 10.5 * t, { kind: 'statue' });                          // the boy on its free end
    const br = lv.box(sn(lv.l + 5 * t), sn(y0 - 14.5 * t), sn(lv.l + 11 * t), sn(y0 - 14.5 * t) + LEVEL.plank * R, { crumble: true }); br.kit = null; lv.rects.push(br);   // the bridge
    put(lv.l, lv.l + 3 * t, y0 - 16 * t, { kind: 'koinobori' });                       // the rope over it
    g.placeHero(lv.l + 3.5 * t, y0 - R);
    const cam = y0 + 2 * t - view.h; lv.cam = cam; __up.tick(10); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'iya', k, sy: Math.round(y0 - 13 * t - lv.cam), w: 16, at: 0.62, nf: renderer.nf, y0: Math.round(y0 - lv.cam), t, l: lv.l, r: lv.r };   // (y0: the low ledges' top on the screen)
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k); });
})();
