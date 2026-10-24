// The guide pass: three screens of every world (low, middle, high of its levels 2, 5, 8), lit, nothing moving stripped, to count its dirt; returns the
// game-pixel grid's origin so the shot can be sampled at game-pixel centres. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), worlds = window.__gw || [0, 1, 2, 3, 4, 5, 6, 7];
  const steps = [];
  for (const w of worlds) for (const [s, at] of [[1, 0.3], [4, 0.55], [7, 0.8]]) steps.push(async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(w * 30 + s * 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5); lv.dark = false;
    lv.ensure(lv.endY - 10 * t); const y = lv.floor - at * (lv.floor - lv.endY), cam = Math.round((y - 0.5 * view.h) / PIX.size) * PIX.size;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); for (const e of lv.enemies) e.body && (e.body.gScale = 0); lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { w, s, world: lv.world.name.en, theme: lv.theme === THEMES.mine ? 'village' : Object.keys(THEMES).find((k) => THEMES[k] === lv.theme), P: PIX.size, nf: renderer.nf, cam, l: lv.l, r: lv.r, keep: view.keep || 0, h: view.h };
  });
  window.__steps = steps;
})();
