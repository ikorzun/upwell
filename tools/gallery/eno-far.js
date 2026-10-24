// The Sea's far view on each of its nine levels (EFAR), the camera low in the level; then the alternates of 4-7…4-9 (far2 D-F) on their levels. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const shot = async (s, cell) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    window.__far = 0; const was = EFAR.stage[s]; if (cell) EFAR.stage[s] = cell;
    __up.camp(90 + s * 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    const y = lv.floor - 0.25 * (lv.floor - lv.endY), cam = Math.round((y - 0.5 * view.h) / PIX.size) * PIX.size;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); lv.cam = cam; __up.tick(1, 0); await wait(150);
    EFAR.stage[s] = was;
    return { s, cell: cell || was, stage: lv.stage, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => () => shot(s)).concat([[6, 'far2-D'], [7, 'far2-E'], [8, 'far2-F']].map(([s, c]) => () => shot(s, c)));
})();
