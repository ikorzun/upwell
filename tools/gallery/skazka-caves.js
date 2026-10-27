// The Dark Forest's stash room inside Baba Yaga's hut (Д280 «1», take A: Д284 «A»), as a player enters it, the heap of coins seed 7. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0].map(() => async () => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(222, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor() });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(90); g.invuln = 0;
    __up.tick(1, 0); await wait(200); if (tst) tst.style.display = 'none'; document.getElementById('fade').classList.remove('go');
    return { nf: renderer.nf, stash: g.lv.stash };
  });
})();
