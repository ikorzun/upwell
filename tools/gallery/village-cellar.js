// The Village's stash room as the cellar under a farmhouse (VROOM, window.__vrm): each of the six looks behind the same room (its heap of coins). Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    window.__vrm = k;
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(9, 0); g.state = 'play'; g.invuln = 1e9;
    let seed = 1, room; for (; seed < 400; seed++) { room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed, world: g.lv.world, theme: THEMES.stash, hard: false, keep: view.keep }); if (room.stash === 0) break; }
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(40); g.invuln = 0; __up.tick(1, 0); await wait(200);
    if (tst) tst.style.display = 'none';
    return { el: 'cellar', k, nf: renderer.nf };
  });
})();
