// Each world's hazard on its walls (WALL_SPR, the owner's picks): its stretch asleep on the left wall, the same bursting on the right; and its icicles
// (ICE_SPR) under a ledge, one shaking, one falling; the hero on a ledge for scale. window.__wWorlds picks the worlds. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__wWorlds || [0, 1, 2, 3, 4];
  const base = (w) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + 3, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; return [lv, t, sn(y0)];
  };
  const shoot = async (lv, y0, el, k) => { const cam = y0 - 0.55 * view.h; lv.cam = cam; __up.tick(10); g.invuln = 0; lv.t = 10; lv.cam = cam; __up.tick(1, 0); lv.cam = cam; __up.tick(1, 0); await wait(150); return { el, k, sy: Math.round(y0 - 3 * lv.tile - cam), w: 16, at: 0.5, nf: renderer.nf }; };
  const wall = async (w, k) => {
    const [lv, t, y0] = base(w), R = g.R, cyc = FIREWALL.on + FIREWALL.off;
    const a = lv.box(lv.l + 5 * t, y0, lv.l + 9 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 7 * t, y0 - R);
    lv.fireWalls.push({ side: 1, y0: y0 - 7 * t, y1: y0 - t, ph: (((0.5 - 10) % cyc) + cyc) % cyc }, { side: -1, y0: y0 - 7 * t, y1: y0 - t, ph: (((FIREWALL.off + 0.3 - 10) % cyc) + cyc) % cyc });
    return shoot(lv, y0, 'wall-' + lv.theme.wallHaz, k);
  };
  const ice = async (w, k) => {
    const [lv, t, y0] = base(w), R = g.R;
    const top = lv.box(lv.l + 3 * t, y0 - 8 * t, lv.l + 12 * t, y0 - 7 * t, {}); top.kit = null; lv.rects.push(top);
    const a = lv.box(lv.l, y0, lv.l + 5 * t, y0 + t, {}); a.kit = null; lv.rects.push(a); g.placeHero(lv.l + 2 * t, y0 - R);
    for (const [u, st] of [[4.5, 'hang'], [7.5, 'shake'], [10.5, 'hang']]) lv.icicles.push({ x: lv.l + u * t, y: y0 - 7 * t, state: st });
    lv.shots.push({ icicle: true, x: lv.l + 7.5 * t, y: y0 - 3.5 * t, r: 0.3 * R, vx: 0, vy: 0 });
    return shoot(lv, y0, 'ice-' + lv.theme.ice, k);
  };
  window.__steps = worlds.flatMap((w) => [0].map((k) => async () => { input.clear(); return wall(w, k); }))
    .concat((window.__iWorlds || [2]).flatMap((w) => [0].map((k) => async () => { input.clear(); return ice(w, k); })));
})();
