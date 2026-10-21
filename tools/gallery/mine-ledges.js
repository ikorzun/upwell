// The Mine's gallery (tools/gallery, see compose.py): each variant of its ledges, lamps and ore drawn by the game in one scene, a step each, in its dark (the
// hero's light and the lamps show them). window.__galEls picks the elements: slab, plank, mover, crumble, lamp (unlit at the wall, lit on a ledge), ore.
// (The owner picked the Mine's on 2026-10-21 and MINE_V went with the variants, so this no longer runs as it is: it is a template for the next world's
// gallery, as the Dark Forest's and the Sea's are.)
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['slab', 'plank', 'mover', 'crumble', 'lamp', 'ore'];
  const scene = async (el, k) => {
    window.__mnV = Object.assign({}, MINE_V, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(0, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; lv.dark = true;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), pl = LEVEL.plank * R;
    let r, hx;
    if (el === 'slab') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {});
    else if (el === 'plank') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + pl, { plank: true });
    else if (el === 'mover') r = lv.box(lv.l + 2.2 * t, y0, lv.l + 5.2 * t, y0 + pl, { plank: true, move: { a: lv.l, b: lv.r - 3 * t, v: 1 } });
    else if (el === 'crumble') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, { crumble: true });
    else if (el === 'ore') { r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, {}); r.kit = { kind: 'ore' }; hx = lv.l + 3.4 * t; }
    else {   // a lamp unlit on the wall over its ledge, one lit over the next
      r = lv.box(lv.l, y0, lv.l + 2.4 * t, y0 + t, {}); r.kit = { kind: 'lamp', x: lv.l + 0.5 * t, y: y0 - 2.0 * t };
      const q = lv.box(lv.l + 3.4 * t, y0, lv.l + 6 * t, y0 + t, {}); q.kit = { kind: 'lamp', x: lv.l + 3.9 * t, y: y0 - 2.0 * t }; lv.rects.push(q); lv.tended.set(q, -10); hx = lv.l + 5.1 * t;
    }
    lv.rects.push(r);
    g.placeHero(hx || (r.x0 + r.x1) / 2 - (el === 'mover' ? 0 : 0.6 * t), y0 - R);
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: 6.5, at: 0.45, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
