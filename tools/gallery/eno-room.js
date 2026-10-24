// The Sea's stash room, the Iwaya cave (ENO_V.room), its six takes, each as a player enters it (UPwell's four Sea caves in turn); then the caves' clam shells
// and gate (ENO_V.clam, ENO_V.gate) in caveShell: the latch on its high ledge open, a second shell under the hero shut, the gate kept shut. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), caves = CAVES.sea.gift.concat(CAVES.sea.puzzle);
  const enter = (cave) => { __up.camp(93, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor(), cave });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); return room; };
  const rooms = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    for (const el in ENO_V) ENO_V[el] = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    enter(caves[k % caves.length]); __up.tick(60); g.invuln = 0; __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none';
    return { el: 'eno-room', k, cave: caves[k % caves.length], nf: renderer.nf };
  });
  const shells = [0, 1, 2, 3, 4, 5].map((k) => async () => {
    for (const el in ENO_V) ENO_V[el] = 'ABCDEF'[k];
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    const lv = enter('caveShell'), t = lv.tile; __up.tick(40);
    lv.gates = []; const latch = lv.rects.find((r) => r.plate), fl = lv.rects.filter((r) => !r.gate && !r.plate && !r.cap && r.y0 > lv.floor - 3 * t).sort((a, b) => a.y0 - b.y0)[0];   // (the gate kept shut: no gates to open)
    const lx = lv.l + 11.5 * t, ly = lv.floor; const sh = lv.box(lx - CLAM.w * t, ly - CLAM.h * t, lx + CLAM.w * t, ly, { plate: 'hold' }); lv.rects.push(sh); lv.plates = null;
    g.placeHero(lx, ly - CLAM.h * t - g.R); setVel(g.hero, 0, 0); __up.tick(20); g.invuln = 0; __up.tick(1, 0); await wait(250); if (tst) tst.style.display = 'none';
    const gate = lv.rects.find((r) => r.gate), sc = (r) => r && [Math.round(r.x0), Math.round(r.y0 - lv.cam), Math.round(r.x1), Math.round(r.y1 - lv.cam), !!r.pressed];
    return { el: 'eno-shells', k, nf: renderer.nf, latch: sc(latch), shut: sc(sh), gate: sc(gate), fl: !!fl };
  });
  window.__steps = rooms.concat(shells);
})();
