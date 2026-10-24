// The TV Tower's dark 7-7 (night over the clouds) with its floodlights: unlit, then every one in sight lit (lv.tended), each take of the floodlight (TW_V.flood).
// Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    input.clear(); TW_V.flood = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(198, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.ensure(lv.endY - 10 * t);
    const fl = lv.rects.filter((r) => { const p = kitThing(lv, r); return p && p.kind === 'flood'; }).sort((a, b) => b.y0 - a.y0);
    const r0 = fl[Math.min(1, fl.length - 1)], y = r0 ? r0.y0 - 3 * t : lv.floor - 0.4 * (lv.floor - lv.endY), cam = Math.round((y - 0.45 * view.h) / PIX.size) * PIX.size;
    for (const r of fl) if (r.y0 > cam && r.y0 < cam + view.h) lv.tended.set(r, -10);
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { el: 'tw-dark', k, nf: renderer.nf, dark: lv.dark, floods: fl.length, lit: lv.tended.size };
  });
})();
