// Fuji's bonus caves after the Narusawa Ice Cave (FC_V: the room behind, the bells, the ice gate), six takes: each take in the bells' room as a player enters
// it, then the bells rung (the gate gone) in the same room. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    FC_V.room = FC_V.bell = FC_V.gate = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(69, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor(), cave: 'caveBells' });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(60); g.invuln = 0;
    const lv = g.lv; if (lv.bells && lv.bells[1]) { lv.bells[1].rung = true; lv.bells[1].t = lv.t - 0.4; }   // (one rung: its orange, its swing, its rings)
    __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none';
    return { k, nf: renderer.nf, bells: (lv.bells || []).map((b) => [Math.round(b.x), Math.round(b.y - lv.cam), b.n]) };
  });
})();
