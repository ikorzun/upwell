// The Mine from Iwami Ginzan, round 2 (IW, IW_V): in each shot one letter of every thing on its ledges: the ore baskets and the windlass low, the shrine and the
// rakan, the box of silver and a lamp unlit, a lamp lit; the hero for scale. Then the doors: Omori's merchant house off the left wall, a mabu's mouth off the
// right. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const clean = (lv) => { lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0; };
  const kit = async (k) => {
    for (const el in IW_V) IW_V[el] = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(31, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv);
    const y0 = sn(lv.floor - 40 * t);
    const put = (wl, n, y, kind) => { const r = lv.box(wl ? lv.l : sn(lv.r - n * t), sn(y), wl ? sn(lv.l + n * t) : lv.r, sn(y) + t, {}); const d = wl ? 1 : -1, X = (u) => (wl ? lv.l : lv.r) + d * u * t;
      r.kit = { kind, x: X(0.5), y: sn(y) - 2 * t }; lv.rects.push(r); return r; };
    put(true, 5, y0, 'baskets'); put(false, 6, y0, 'windlass');
    put(true, 5, y0 - 6 * t, 'shrine'); put(false, 5, y0 - 6 * t, 'rakan');
    put(true, 5, y0 - 12 * t, 'silver'); put(false, 4, y0 - 12 * t, 'lamp');
    const lit = put(true, 4, y0 - 17 * t, 'lamp'); lv.tended.set(lit, -10);
    g.placeHero(lv.l + 8 * t, y0 - R);
    const cam = y0 + 2 * t - view.h; lv.cam = cam; __up.tick(4); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'iwami-kit', k, nf: renderer.nf };
  };
  const doors = async (k) => {
    IW_V.shop = IW_V.stash = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(31, 0); g.state = 'play'; const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; clean(lv);
    const y0 = sn(lv.floor - 30 * t), y1 = sn(y0 - 7 * t), w = DOOR.w * R;
    const a = lv.box(lv.l, y0, lv.l + 6 * t, y0 + t, {}); a.kit = null; lv.rects.push(a);
    const b = lv.box(lv.r - 6 * t, y1, lv.r, y1 + t, {}); b.kit = null; lv.rects.push(b);
    lv.bubbles.push({ x0: lv.l - LEVEL.wall, x1: lv.l + w, y0: y0 - DOOR.h * R, y1: y0, x: lv.l + w / 2, y: y0 - (DOOR.h * R) / 2, kind: 'shop', side: 1, cd: 1e9, room: null });
    lv.bubbles.push({ x0: lv.r - w, x1: lv.r + LEVEL.wall, y0: y1 - DOOR.h * R, y1, x: lv.r - w / 2, y: y1 - (DOOR.h * R) / 2, kind: 'treasure', side: -1, cd: 1e9, room: null });
    g.placeHero(lv.l + 9 * t, y0 - 2 * t);
    const cam = y0 - 0.62 * view.h; lv.cam = cam; __up.tick(2); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'iwami-doors', k, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return kit(k); }).concat([0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return doors(k); }));
})();
