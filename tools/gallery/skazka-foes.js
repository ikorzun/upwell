// The Dark Forest's enemies' gallery (tools/gallery, see compose.py): a Kikimora on the shaft's wall, a Leshy circling its block, each variant
// (FOREST_V, through window.__fv) with the Kolobok on a ledge for scale. Q='?play=skazka'. (The owner picked on 2026-10-20 and the other
// variants went, so this shows the picks only: a template for the next enemies' gallery.)
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const scene = async (el, k) => {
    window.__fv = { [el]: 'ABCDEF'[k] };
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = SKAZKA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), hl = lv.box(lv.l + 3.4 * t, y0, lv.l + 6 * t, y0 + t, {}); lv.rects.push(hl);
    g.placeHero(lv.l + 4.7 * t, y0 - R);
    if (el === 'kikimora') lv.enemies.push(new Foe({ type: 'kikimora', x: lv.l + 0.74 * R, y: y0 - 1.6 * t, wall: { side: 1, y0: y0 - 2.2 * t, y1: y0 - 1.0 * t } }, lv));
    else { const blk = lv.box(lv.l + 1.0 * t, y0 - 2.6 * t, lv.l + 2.4 * t, y0 - 2.0 * t, {}); lv.rects.push(blk); lv.enemies.push(new Foe({ type: 'leshy', x: lv.l + 1.7 * t, y: y0 - 3.4 * t, rect: blk }, lv)); }
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(30); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: 6.5, at: 0.8 };
  };
  window.__steps = ['kikimora', 'leshy'].flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
