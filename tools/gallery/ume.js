// Ume's look (UME_SPR, window.__ume): on 5-3 by his vending machine, Mochi beside him; six letters. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0].map((k) => async () => {

    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(4 * 30 + 2 * 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.ensure(lv.endY - 10 * t);
    const f = lv.folk.find((q) => q.kind === 'ume'); if (!f) return { k, ume: false };
    const cam = f.y - 0.6 * view.h; lv.cam = cam; g.placeHero(f.x + f.dir * 2.6 * t, f.y - 2 * t); __up.tick(40); lv.cam = cam; g.placeHero(f.x + f.dir * 2.6 * t, f.y - g.R); __up.tick(20); lv.cam = cam; __up.tick(1, 0); await wait(200);
    return { k, ume: !!f.body, look: f.body && f.body.look, sy: Math.round(f.y - cam), nf: renderer.nf };
  });
})();
