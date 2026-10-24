// Fuji's ice blocks and crumbling ledges, six looks each (FUJI_V2, window.__fujiV2), drawn by the game, a step each; compose.py lays them out A-F.
// A free ice block and a crumbling ledge off the wall, a plain stone ledge beside for the kit, the hero by them for size.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['ice', 'crumble'];
  const scene = async (el, k) => {
    window.__fujiV2 = Object.assign({}, FUJI_V2, { [el]: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 6) + 6) % 6 !== 3) y0 -= t; y0 = sn(y0);
    const a = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, el === 'ice' ? {} : { crumble: true }); a.kit = null; lv.rects.push(a);   // off the wall: a plain ledge, or what crumbles
    const b = lv.box(lv.l + 6 * t, y0 - 3 * t, lv.l + 10.5 * t, y0 - 2 * t, el === 'ice' ? { slick: true } : { crumble: true }); b.kit = null; lv.rects.push(b);   // free in the shaft
    g.placeHero(lv.l + 1.8 * t, y0 - R); __up.tick(30);
    const cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1, 0); await wait(250);
    return { el, k, sy: Math.round(y0 - cam), w: 11, at: 0.65, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
