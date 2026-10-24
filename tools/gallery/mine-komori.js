// The Mine's komori (KOMORI_SPR), drawn by the game: hanging under a ledge (frame 1), flying wings up (2) and down (3), and diving red (3, b.warn); the
// hero on a ledge for scale; lit, then in the Mine's real dark. (The owner picked A at the sheet's size on 2026-10-24 and the other bats went, so this
// shows the pick only: a template for the next enemies.) Q is none: it goes to 2-2 itself.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['komori', 'komoridark'];
  const scene = async (el, k) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(33, 0); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0; lv.dark = el === 'komoridark';
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas', 'critters', 'lamps', 'fireWalls', 'tasks']) if (Array.isArray(lv[a])) lv[a].length = 0;
    let y0 = sn(lv.floor - 30 * t); while (((Math.round(y0 / t) % 5) + 5) % 5 !== 0) y0 -= t; y0 = sn(y0);
    const floor = lv.box(lv.l, y0, lv.l + 4 * t, y0 + t, {}); floor.kit = null; lv.rects.push(floor);   // the hero's ledge
    const roof = lv.box(lv.l, y0 - 7 * t, lv.l + 4.5 * t, y0 - 6.4 * t, {}); roof.kit = null; lv.rects.push(roof);   // the bat's perch
    g.placeHero(lv.l + 1.6 * t, y0 - R);
    const bat = (x, y, frame, warn) => { const e = new Foe({ type: 'komori', x, y }, lv); e.think = () => {}; e.body.gScale = 0; e.body.frame = frame; e.body.warn = !!warn; e.body.lookDir = 1; lv.enemies.push(e); return e; };
    bat(lv.l + 2.6 * t, roof.y1 + (KOMORI_SPR['komori-' + KOMORI_V + '-1'].length * PIX.base) / 2, 1);   // (its feet on the ledge's underside)
    bat(lv.l + 7.2 * t, y0 - 6.2 * t, 2);
    bat(lv.l + 7.2 * t, y0 - 3.4 * t, 3);
    bat(lv.l + 6.2 * t, y0 - 0.9 * t, 3, true);
    const cam = y0 - 0.55 * view.h; lv.cam = cam; __up.tick(20); lv.cam = cam; __up.tick(1, 0); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - 3 * t - cam), w: 11, at: 0.5, nf: renderer.nf };
  };
  window.__steps = els.flatMap((el) => [0].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
