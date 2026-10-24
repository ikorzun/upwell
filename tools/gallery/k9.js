// К9: the cube three in their worlds (K9_SPR, window.__k9), one letter of all three a shot: Tokyo's tofu and a bit of it and its tumbler sitting and
// tumbling, Fuji's nurikabe hanging over its ledge and landed; the hero for scale. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const base = (w) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + 3, 0); g.state = 'play'; const lv = g.lv; g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'fireWalls', 'tasks', 'shots', 'winds']) if (Array.isArray(lv[a])) lv[a].length = 0;
    return lv;
  };
  const put = (lv, type, x, y, ledge, set) => { const f = new Foe({ type, x, y, ledge }, lv); lv.enemies.push(f); if (set) set(f); return f; };
  const scene = async (k) => {
    window.__k9 = { tofu: k, tumbler: k, nurikabe: k };
    const P = PIX.size, sn = (v) => Math.round(v / P) * P;
    let lv = base(4), t = lv.tile, R = g.R; const y0 = sn(lv.floor - 30 * t), shots = [];
    const a = lv.box(lv.l, y0, lv.r, y0 + t, {}); a.kit = null; lv.rects.push(a);
    const b = lv.box(lv.l, y0 - 6 * t, lv.r, y0 - 5 * t, {}); b.kit = null; lv.rects.push(b);
    put(lv, 'tofu', lv.l + 3 * t, y0 - R, a); put(lv, 'tofuMini', lv.l + 7 * t, y0 - 0.5 * R, a);
    put(lv, 'tumbler', lv.l + 4 * t, y0 - 6 * t - R, b, (f) => { f.rest = 9; }); put(lv, 'tumbler', lv.l + 10 * t, y0 - 6 * t - R, b, (f) => { f.flip = 0.3; f.rest = 9; });
    g.placeHero(lv.l + 12.5 * t, y0 - R);
    let cam = y0 + t - 0.62 * view.h; lv.cam = cam; __up.tick(20); for (const e of lv.enemies) { if (e.type === 'tumbler' && e.body.cx > lv.l + 8 * t) e.flip = 0.3; } lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'k9', k, nf: renderer.nf };
  };
  const fuji = async (k) => {
    window.__k9 = { tofu: k, tumbler: k, nurikabe: k };
    const P = PIX.size, sn = (v) => Math.round(v / P) * P;
    const lv = base(2), t = lv.tile, R = g.R, y0 = sn(lv.floor - 30 * t);
    const a = lv.box(lv.l, y0, lv.r, y0 + t, {}); a.kit = null; lv.rects.push(a);
    const top = lv.box(lv.l + 2 * t, y0 - 8 * t, lv.l + 7 * t, y0 - 7 * t, {}); top.kit = null; lv.rects.push(top);
    put(lv, 'nurikabe', lv.l + 4.5 * t, y0 - R, a); put(lv, 'nurikabe', lv.l + 11 * t, y0 - R, a);
    g.placeHero(lv.l + 14.5 * t, y0 - R);
    const cam = y0 + t - 0.62 * view.h; lv.cam = cam; __up.tick(30); g.hero && null;
    for (const e of lv.enemies) if (e.body.cx > lv.l + 9 * t) { e.cs = 'drop'; e.ct = 0; }   // (let it fall and land: then it lies there)
    for (let i = 0; i < 40; i++) { lv.cam = cam; __up.tick(1); g.placeHero(lv.l + 14.5 * t, y0 - R); }
    lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'k9f', k, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k); }).concat([0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return fuji(k); }));
})();
