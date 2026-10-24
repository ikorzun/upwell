// Tokyo's stash room, a tiny bar on a Golden Gai second floor (GAI_V.room; Д157 «А»), its six takes, each as a player enters it. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    GAI_V.room = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(129, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor() });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(60); g.invuln = 0; __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none';
    return { k, nf: renderer.nf };
  });
})();
