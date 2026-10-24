// The Mine's rock cut by hand (slabRows, IW_V.slab), its six takes on a level as it is (2-2), lit; the hero for scale. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    IW_V.slab = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(31, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    const y = lv.floor - 0.3 * (lv.floor - lv.endY), cam = Math.round((y - 0.5 * view.h) / PIX.size) * PIX.size;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); lv.cam = cam; __up.tick(1, 0); await wait(120);
    return { el: 'iwami-slab', k, nf: renderer.nf };
  });
})();
