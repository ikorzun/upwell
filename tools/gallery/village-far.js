// The Village's far view by level (VFAR, Д86 «А»): a screen of each of 1-1…1-9 halfway up, then 1-5 with the three spare views (the mist, the moon, the dawn)
// and with the old far view (window.__far: 9-11 the spares, 99 the old one) to count its features. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const shot = async (s, far) => {
    window.__far = far;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(s * 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.ensure(lv.endY - 10 * t); const y = lv.floor - 0.5 * (lv.floor - lv.endY), cam = y - 0.5 * view.h;
    g.placeHero((lv.l + lv.r) / 2, y); lv.cam = cam; __up.tick(3); g.invuln = 0; lv.cam = cam; __up.tick(1, 0); await wait(150);
    return { level: `1-${s + 1}`, far, nf: renderer.nf };
  };
  window.__steps = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => () => shot(s, null)).concat([9, 10, 11, 99].map((f) => () => shot(4, f)));
})();
