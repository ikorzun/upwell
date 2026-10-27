// The Danchi's stash room inside the estate playground's concrete octopus slide (tako-yama; owner Д279 «6», take A: Д283 «A»):
// first the shared purple room (no backdrop: its world's danchi flag off for this shot, for nf), then the room, as a player enters it. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = ['-', 'A'].map((L) => async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(162, 0); g.state = 'play'; g.invuln = 1e9;
    const wd = L === '-' ? Object.assign({}, g.lv.world, { theme: Object.assign({}, g.lv.world.theme, { danchi: false }) }) : g.lv.world;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: wd, theme: THEMES.stash, hard: false, keep: g.roomFloor() });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(60); g.invuln = 0; __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none'; document.getElementById('fade').classList.remove('go');   // (the way-in's fade done)
    const lv = g.lv;
    return { take: L, nf: renderer.nf, tile: lv.tile, l: lv.l, floor: Math.round(lv.floor - lv.cam), exitT: lv.exit && [(lv.exit.x0 - lv.l) / lv.tile, (lv.floor - lv.exit.y1) / lv.tile, (lv.exit.x1 - lv.l) / lv.tile, (lv.floor - lv.exit.y0) / lv.tile].map((v) => +v.toFixed(2)),
      rects: lv.rects.map((r) => [(r.x0 - lv.l) / lv.tile, (lv.floor - r.y1) / lv.tile, (r.x1 - lv.l) / lv.tile, (lv.floor - r.y0) / lv.tile].map((v) => +v.toFixed(1))) };
  });
})();
