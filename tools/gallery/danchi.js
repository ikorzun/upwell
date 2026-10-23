// The Danchi's gallery (tools/gallery, see compose.py): its architecture's six variants each and its other elements as picked, drawn by the game in one
// scene a step each (?play=blocks's world). window.__galEls picks the elements: slab, balcony, pole, stairs, boxes, spring,
// bikes, plants, mail, cat, wall, far, shop, stash.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['slab', 'balcony', 'pole', 'stairs', 'boxes', 'spring', 'bikes', 'plants', 'mail', 'cat', 'wall', 'far', 'shop', 'stash'];
  const scene = async (el, k) => {
    window.__dcV = Object.assign({}, DANCHI_V, el in DANCHI_V ? { [el]: k } : {});
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = BLOCKS; __up.go(2, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t); window.__dcAll = true;   // (the one-in-three things all shown)
    const pl = LEVEL.plank * R;
    if (el === 'far' || el === 'wall') {   // (the walls on the whole screen)
      const r = lv.box(lv.l, y0, lv.l + 3 * t, y0 + t, {}); r.kit = null; lv.rects.push(r); g.placeHero(lv.l + 1.4 * t, y0 - R);
      const cam = g.hero.cy - CAM.anchor * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
      return { el, k, band: Math.round(0.8 * view.h), far: true, nf: renderer.nf };
    }
    let r, hx;
    if (el === 'balcony') { r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + pl, { plank: true }); hx = lv.l + 5.6 * t; }   // (the hero by its free end: all of it seen)
    else if (el === 'pole') r = lv.box(lv.l + 1.5 * t, y0, lv.l + 5.5 * t, y0 + pl, { plank: true });
    else if (el === 'boxes') { r = lv.box(lv.l, y0, lv.l + 3.4 * t, y0 + t, { crumble: true }); const q = lv.box(lv.l + 3.4 * t, y0, lv.l + 6.2 * t, y0 + t, {}); q.kit = null; lv.rects.push(q); hx = lv.l + 5.0 * t; }
    else if (el === 'stairs') { for (let i = 0; i < 4; i++) lv.rects.push(lv.box(lv.l + (1 + i) * t, y0 - i * t, lv.l + (i === 3 ? 6.6 : 2 + i) * t, y0 - i * t + t, { stair: true })); r = lv.box(lv.l, y0 + t, lv.l + 1 * t, y0 + 2 * t, {}); hx = lv.l + 5.6 * t; }
    else if (el === 'slab') { r = lv.box(lv.l, y0, lv.l + 3.6 * t, y0 + t, {}); const q = lv.box(lv.l + 3.9 * t, y0 - 1.0 * t, lv.l + 6.6 * t, y0 + 2.4 * t, {}); q.kit = null; lv.rects.push(q); hx = lv.l + 1.8 * t; }   // a slab off the wall, an end wall by it
    else if (el === 'plants') { r = lv.box(lv.l, y0, lv.l + 7.6 * t, y0 + t, {}); hx = lv.l + (2.3 * DC_GARDEN + 1.3) * t; }   // (the garden bigger: the hero past it)
    else r = lv.box(lv.l, y0, lv.l + 5.2 * t, y0 + t, {});
    r.kit = null; lv.rects.push(r);
    if (el === 'spring') { const cx = lv.l + 4.0 * t; lv.rects.push(lv.box(cx - 0.7 * R, y0 - 0.36 * R, cx + 0.7 * R, y0, { spring: true })); hx = lv.l + 1.6 * t; }
    if (el === 'shop' || el === 'stash') {
      const kind = el === 'shop' ? 'shop' : 'treasure', w = DOOR.w * R, x0 = lv.l - LEVEL.wall, x1 = lv.l + w;
      lv.bubbles.push({ x0, x1, y0: y0 - DOOR.h * R, y1: y0, x: (x0 + x1) / 2, y: y0 - (DOOR.h * R) / 2, kind, side: 1, cd: 1e9, room: null }); hx = lv.l + 4.4 * t;
    } else if (['bikes', 'plants', 'mail', 'cat'].includes(el)) { r.kit = { kind: el }; hx = hx || lv.l + 4.4 * t; }
    g.placeHero(hx || (r.x0 + r.x1) / 2 - 0.6 * t, (el === 'stairs' ? y0 - 3 * t : y0) - R);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: el === 'plants' ? 8.0 : 7.0, at: el === 'stairs' ? 0.7 : el === 'mail' || el === 'shop' || el === 'stash' ? 0.62 : 0.55, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => (el in DANCHI_V ? [0, 1, 2, 3, 4, 5] : [0]).map((k) => async () => { input.clear(); return scene(el, k); }));
})();
