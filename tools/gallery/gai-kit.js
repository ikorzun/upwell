// Tokyo from Golden Gai, round 2 (GAI, GAI_V): in each shot one letter of every thing on its ledges: plastic crates and an old bicycle low, the rubbish bags
// and the meters with an extinguisher, a lucky cat in a bar's window; the hero for scale. Then the bars' lightboxes, one unlit and one lit (the task's), on
// their beat (neonSign); then the doors: the izakaya off the left wall, the stair door off the right. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; lv.crossing = null; };
  const start = (k) => { const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none'; __up.camp(129, 0); g.state = 'play'; const lv = g.lv; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv); return lv; };
  const sn = (v) => Math.round(v / PIX.size) * PIX.size;
  const kit = async (k) => {
    for (const el of ['crates', 'bags', 'bicycle', 'meters', 'neko']) GAI_V[el] = 'ABCDEF'[k];
    const lv = start(k), t = lv.tile, R = g.R, y0 = sn(lv.floor - 40 * t);
    const put = (wl, n, y, kind) => { const r = lv.box(wl ? lv.l : sn(lv.r - n * t), sn(y), wl ? sn(lv.l + n * t) : lv.r, sn(y) + t, {}); r.kit = { kind }; lv.rects.push(r); return r; };
    put(true, 6, y0, 'crates'); put(false, 6, y0, 'bicycle'); put(true, 6, y0 - 7 * t, 'bags'); put(false, 6, y0 - 7 * t, 'meters'); put(true, 6, y0 - 14 * t, 'neko');
    g.placeHero(lv.l + 8 * t, y0 - R);
    const cam = y0 + 2 * t - view.h; lv.cam = cam; __up.tick(4); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'gai-kit', k, nf: renderer.nf };
  };
  const signs = async (k) => {
    GAI_V.lightbox = 'ABCDEF'[k];
    const lv = start(k), t = lv.tile, R = g.R;
    let s0 = null; for (let j = Math.floor((lv.floor - 60 * t) / (11 * t)); j < 0 && !s0; j++) { const a = neonSign(lv, j), b = neonSign(lv, j + 1); if (a && b && a.left && !b.left) s0 = [a, b]; }
    const [a, b] = s0; lv.neonLit.clear(); lv.neonLit.set(b.k, -10);
    const y = sn(b.y1 + 2 * t), r = lv.box(lv.l + 5 * t, y, lv.l + 11 * t, y + t, {}); r.kit = null; lv.rects.push(r); g.placeHero(lv.l + 8 * t, y - R);
    const cam = sn((a.y0 + b.y1) / 2 - 0.5 * view.h); lv.cam = cam; __up.tick(2); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'gai-signs', k, off: [a.x0, a.y0, a.y1], on: [b.x0, b.y0, b.y1], cam, ink: b.ink, nf: renderer.nf };
  };
  const doors = async (k) => {
    GAI_V.shop = GAI_V.stash = 'ABCDEF'[k];
    const lv = start(k), t = lv.tile, R = g.R;
    const y0 = sn(lv.floor - 30 * t), y1 = sn(y0 - 7 * t), w = DOOR.w * R;
    const a = lv.box(lv.l, y0, lv.l + 6 * t, y0 + t, {}); a.kit = null; lv.rects.push(a);
    const b = lv.box(lv.r - 6 * t, y1, lv.r, y1 + t, {}); b.kit = null; lv.rects.push(b);
    lv.bubbles.push({ x0: lv.l - LEVEL.wall, x1: lv.l + w, y0: y0 - DOOR.h * R, y1: y0, x: lv.l + w / 2, y: y0 - (DOOR.h * R) / 2, kind: 'shop', side: 1, cd: 1e9, room: null });
    lv.bubbles.push({ x0: lv.r - w, x1: lv.r + LEVEL.wall, y0: y1 - DOOR.h * R, y1, x: lv.r - w / 2, y: y1 - (DOOR.h * R) / 2, kind: 'treasure', side: -1, cd: 1e9, room: null });
    g.placeHero(lv.l + 9 * t, y0 - 2 * t);
    const cam = y0 - 0.62 * view.h; lv.cam = cam; __up.tick(2); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'gai-doors', k, nf: renderer.nf };
  };
  const six = (f) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return f(k); });
  window.__steps = six(kit).concat(six(signs), six(doors));
})();
