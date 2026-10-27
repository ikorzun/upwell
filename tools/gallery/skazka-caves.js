// The Dark Forest's stash room inside Baba Yaga's hut (Д280 «1»; SKR_V, six takes): each take in the stash room as a player enters it, the heap of
// coins (seed 7) the same in all six. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    SKR_V.room = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(222, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor() });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(90); g.invuln = 0;
    __up.tick(1, 0); await wait(200); if (tst) tst.style.display = 'none'; document.getElementById('fade').classList.remove('go');
    return { take: SKR_V.room, nf: renderer.nf, stash: g.lv.stash };
  });
})();
