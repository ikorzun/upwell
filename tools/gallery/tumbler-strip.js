// a tumbler's somersault, every 60 ms: its key poses
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)); let lv, cam, e;
  const steps = [async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(4 * 30 + 3, 0); g.state = 'play'; lv = g.lv; const t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P; g.invuln = 1e9; lv.dark = false; lv.fire && (lv.fire.y = lv.floor + 1e5);
    lv.rects = lv.rects.filter((r) => r.cap); for (const a of ['coins', 'folk', 'spawns', 'enemies', 'arenas', 'winds', 'bubbles', 'icicles', 'fireWalls', 'shots']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), a = lv.box(lv.l, y0, lv.r, y0 + t, {}); a.kit = null; lv.rects.push(a);
    e = new Foe({ type: 'tumbler', x: lv.l + 4 * t, y: y0 - R, ledge: a, dir: 1 }, lv); e.rest = 0.05; lv.enemies.push(e); g.placeHero(lv.l + 14 * t, y0 - R);
    cam = y0 - 0.5 * view.h; lv.cam = cam; __up.tick(1); return { f: -1, sy: Math.round(y0 - cam) };
  }];
  for (let f = 0; f < 14; f++) steps.push(async () => { for (let k = 0; k < 4; k++) { lv.cam = cam; __up.tick(1); } await wait(40); return { f, flip: +(e.flip || 0).toFixed(2), look: e.body.look, sy: steps.sy }; });
  window.__steps = steps;
})();
