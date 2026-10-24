// The TV Tower's far view by level (TFAR): 7-1 … 7-9 as they are, then the second takes of 7-7, 7-8, 7-9 (far2 D-F) on their levels; lit, low in each level, the
// hero for scale. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const shots = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => [s, null]).concat([[6, 'far2-D'], [7, 'far2-E'], [8, 'far2-F']]);
  window.__steps = shots.map(([s, key]) => async () => {
    input.clear(); window.__twfar = key;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(180 + s * 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    lv.ensure(lv.endY - 10 * t); const y = lv.floor - 0.3 * (lv.floor - lv.endY), cam = Math.round((y - 0.5 * view.h) / PIX.size) * PIX.size;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(120);
    const r = { el: 'tw-far', s, key: key || TFAR.stage[lv.rc ? s : 5], nf: renderer.nf };
    window.__twfar = null; return r;
  });
})();
