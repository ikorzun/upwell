// The Mine's gallery, batch two (tools/gallery, see compose.py): each variant of its things on a ledge at the wall (cart, tools, winch), its bats under a
// ledge, its far layer, its doors (the shop, the stash), in its dark, a step each. window.__galEls picks the elements.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['cart', 'tools', 'winch', 'bats', 'far', 'shop', 'stash'];
  const scene = async (el, k) => {
    window.__mnV = Object.assign({}, MINE_V, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(0, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; lv.dark = true;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t);
    if (el === 'far') {
      const r = lv.box(lv.l, y0, lv.l + 3 * t, y0 + t, {}); r.kit = null; r.bats = false; lv.rects.push(r); g.placeHero(lv.l + 1.4 * t, y0 - R);
      const cam = g.hero.cy - CAM.anchor * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
      return { el, k, band: Math.round(0.8 * view.h), far: true, nf: renderer.nf };
    }
    const r = lv.box(lv.l, y0, lv.l + 5.2 * t, y0 + t, {}); r.bats = el === 'bats'; lv.rects.push(r);
    if (el === 'shop' || el === 'stash') {
      r.kit = null; const kind = el === 'shop' ? 'shop' : 'treasure', w = DOOR.w * R, x0 = lv.l - LEVEL.wall, x1 = lv.l + w;
      lv.bubbles.push({ x0, x1, y0: y0 - DOOR.h * R, y1: y0, x: (x0 + x1) / 2, y: y0 - (DOOR.h * R) / 2, kind, side: 1, cd: 1e9, room: null });
      g.placeHero(lv.l + 4.4 * t, y0 - R);
    } else if (el === 'bats') { r.kit = null; g.placeHero(lv.l + 3.6 * t, y0 - R); }
    else { r.kit = { kind: el }; g.placeHero(lv.l + 4.2 * t, y0 - R); }
    const cam = y0 - (el === 'bats' ? 0.4 : 0.5) * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: 7.4, at: el === 'bats' ? 0.4 : el === 'winch' ? 0.62 : 0.6, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
