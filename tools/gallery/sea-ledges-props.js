// The Sea's gallery (tools/gallery, see compose.py): each variant of its ledges and props drawn by the game in one scene, a step each.
(() => {
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), els = window.__galEls || ['slab', 'plank', 'boat', 'raft'];
  const scene = async (el, k) => {
    const prop = !['slab', 'plank', 'boat', 'raft'].includes(el);
    window.__seaV = Object.assign({}, SEA_V, prop ? { slab: -1 } : {}, { [el]: k });   // (a prop on plain rock)
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    game.preview = SEA; __up.go(1, 0, 3); g.state = 'play';
    const lv = g.lv, t = lv.tile, R = g.R, P = PIX.size, sn = (v) => Math.round(v / P) * P;
    lv.fire && (lv.fire.y = lv.floor + 1e5); g.invuln = 0;
    lv.rects = lv.rects.filter((r) => r.cap);
    for (const a of ['coins', 'folk', 'spawns', 'spikes', 'icicles', 'bubbles', 'enemies', 'pickups', 'coats', 'runes', 'fizz', 'rings', 'spots', 'arenas']) if (Array.isArray(lv[a])) lv[a].length = 0;
    const y0 = sn(lv.floor - 30 * t), pl = LEVEL.plank * R;
    let r;
    if (el === 'slab') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + t, k === 2 || k === 4 ? { moss: true } : {});
    else if (el === 'plank') r = lv.box(lv.l, y0, lv.l + 4.5 * t, y0 + pl, { plank: true });
    else if (el === 'boat') r = lv.box(lv.l + 3 * t, y0, lv.l + 7 * t, y0 + pl, { plank: true, move: { a: lv.l, b: lv.r - 4 * t, v: 0 } });
    else if (el === 'raft') r = lv.box(lv.l, y0, lv.l + 5.2 * t, y0 + t, { crumble: true });
    else { r = lv.box(lv.l, y0, lv.l + (el === 'net' ? 4.6 : el === 'gull' ? 3.2 : 4.2) * t, y0 + t, {}); r.kit = { kind: el }; }   // a prop on its ledge
    lv.rects.push(r);
    if (prop && el !== 'gull') lv.rects.push(lv.box(r.x1 + 0.5 * t, y0, r.x1 + 3.2 * t, y0 + t, {}));   // the hero beside it for its size, on a ledge of its own
    g.placeHero(prop ? (el === 'gull' ? r.x0 + 1.2 * t : r.x1 + 1.85 * t) : (r.x0 + r.x1) / 2 - (el === 'boat' ? 0 : 0.6 * t), y0 - R);
    const cam = y0 - 0.45 * view.h; lv.cam = cam; __up.tick(2); lv.cam = cam; __up.tick(1); lv.cam = cam; await wait(200);
    return { el, k, sy: Math.round(y0 - cam), w: el === 'boat' ? 8 : prop && el !== 'gull' ? 7.8 : 6.5, at: el === 'gull' ? 0.62 : prop ? 0.82 : 0.53 };
  };
  window.__steps = els.flatMap((el) => [0, 1, 2, 3, 4, 5].map((k) => async () => { input.clear(); return scene(el, k); }));
})();
