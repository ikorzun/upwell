// A frame's time and features (renderer.nf) with each world's own hazard over 40% of the screen and the same with it out of sight and as the old fire; look.mjs logs them. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const run = async (w) => {
    __up.camp(w * 30 + 3, 0); g.state = 'play'; const lv = g.lv, t = lv.tile; g.invuln = 1e9;
    __up.tick(20); const cam = lv.cam, out = { w, hazard: lv.theme.hazard };
    const time = (n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { lv.cam = cam; __up.tick(1, 0); } return (performance.now() - t0) / n; };
    lv.fire.y = cam + 1e5; time(30); out.off = +time(120).toFixed(3); out.nfOff = renderer.nf;
    lv.fire.y = cam + 0.6 * view.h; time(30); out.own = +time(120).toFixed(3); out.nfOwn = renderer.nf; lv.fire.y = cam + 0.25 * view.h; time(30); out.half = +time(120).toFixed(3); out.nfHalf = renderer.nf;
    const h = lv.theme.hazard; lv.theme.hazard = undefined; time(30); out.old = +time(120).toFixed(3); out.nfOld = renderer.nf; lv.theme.hazard = h;
    return out;
  };
  window.__steps = [0, 1, 2, 3, 4].map((w) => async () => run(w));
})();
