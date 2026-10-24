// The TV Tower's doors (TW shop, stash; iyaDoor) and Tower Daijingu (TW shrine), six takes: the souvenir counter off the left wall, the service hatch off the
// right, the shrine on a ledge under them. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    input.clear(); TW_V.shop = TW_V.stash = TW_V.shrine = 'ABCDEF'[k]; TW_V.truss = 'A';
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(183, 0); g.state = 'play'; const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false; lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), y1 = sn(y0 - 8 * t), y2 = sn(y0 + 8 * t), w = DOOR.w * R;
    const a = lv.box(lv.l, y0, lv.l + 6 * t, y0 + t, {}); a.kit = null; lv.rects.push(a);
    const b = lv.box(lv.r - 6 * t, y1, lv.r, y1 + t, {}); b.kit = null; lv.rects.push(b);
    const c = lv.box(lv.l, y2, lv.l + 6 * t, y2 + t, {}); c.kit = { kind: 'shrine' }; lv.rects.push(c);
    lv.bubbles.push({ x0: lv.l - LEVEL.wall, x1: lv.l + w, y0: y0 - DOOR.h * R, y1: y0, x: lv.l + w / 2, y: y0 - (DOOR.h * R) / 2, kind: 'shop', side: 1, cd: 1e9, room: null });
    lv.bubbles.push({ x0: lv.r - w, x1: lv.r + LEVEL.wall, y0: y1 - DOOR.h * R, y1, x: lv.r - w / 2, y: y1 - (DOOR.h * R) / 2, kind: 'treasure', side: -1, cd: 1e9, room: null });
    g.placeHero(lv.l + 9 * t, y0 - 2 * t);
    const cam = y1 - 9 * t; lv.cam = cam; __up.tick(2); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    const at = { shop: [lv.l, y0 - 6.2 * t, lv.l + 6.5 * t, y0 + 1.2 * t], stash: [lv.r - 6.5 * t, y1 - 6.2 * t, lv.r, y1 + 1.2 * t], shrine: [lv.l, y2 - 5.6 * t, lv.l + 6.5 * t, y2 + 1.2 * t] };
    for (const q in at) at[q] = at[q].map((v, i) => Math.round(i % 2 ? v - cam : v));
    return { el: 'tw-doors', k, nf: renderer.nf, at };
  });
})();
