// The Dark Forest's gallery (tools/gallery, see compose.py): the hero as a Kolobok, each variant on a plain ledge in the forest's dark, a step each.
// (The owner picked the Dark Forest's on 2026-10-20 and SKAZKA_V went with the variants, so this no longer runs as it is: it is a template for the next
// world's gallery, as the Sea's are.)
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const scene = async (k) => {
    window.__skV = Object.assign({}, SKAZKA_V, { slab: -1, kolobok: k });
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = SKAZKA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), r = lv.box(lv.l, y0, lv.l + 4 * t, y0 + t, {}); lv.rects.push(r);
    g.placeHero(lv.l + 2 * t, y0 - R);
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(20); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el: 'kolobok', k, sy: Math.round(y0 - cam), w: 4, at: 0.62 };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(k); });
})();
