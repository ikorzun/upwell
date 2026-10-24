// The Village's four bonus caves (UPwell's CAVES.mine) over the cellar backdrop, each as a player enters it
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = ['caveMill', 'caveBridges', 'cavePestle', 'caveIn'].map((id) => async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(9, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor(), cave: id });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(60); g.invuln = 0; __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none';
    return { id, cave: room.cave || room.caveId || null, nf: renderer.nf };
  });
})();
