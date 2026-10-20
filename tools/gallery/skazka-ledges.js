// The Dark Forest's gallery (tools/gallery, see compose.py): each variant of its ledges drawn by the game in one scene, a step each, in its dark (the hero's
// light shows them). window.__galEls picks the elements.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['slab', 'plank', 'mortar', 'log'];
  const scene = async (el, k) => {
    window.__skV = Object.assign({}, SKAZKA_V, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = SKAZKA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), pl = LEVEL.plank * R;
    let r;
    if (el === 'slab') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {});
    else if (el === 'plank') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + pl, { plank: true });
    else if (el === 'mortar') r = lv.box(lv.l + 2.6 * t, y0, lv.l + 5.6 * t, y0 + pl, { plank: true, move: { a: lv.l, b: lv.r - 3 * t, v: 1 } });
    else if (el === 'log') r = lv.box(lv.l, y0, lv.l + 5.2 * t, y0 + t, { crumble: true });
    lv.rects.push(r);
    g.placeHero((r.x0 + r.x1) / 2 - (el === 'mortar' ? 0 : 0.6 * t), y0 - R);
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: 6.5, at: 0.45 };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
