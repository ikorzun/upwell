// Tokyo's four bonus caves (UPwell's CAVES.tokyo) in their look (Worlds'; TCV_V: the shutter's switch, the pachinko pins, six takes each): the four rooms as a
// player enters them (take A); the shutter rolling up, up, in its last 1.5 s and rolling down; each switch take ready and just pulled; each pins take. Q is none.
(() => {
  if (typeof STORY === 'object') for (const k in STORY) save.seen['card_' + k] = 1;
  const g = __up.game, wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const enter = (id) => {
    const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __up.camp(123, 0); g.state = 'play'; g.invuln = 1e9;
    const room = new Level(); room.reset({ kind: 'treasure', w: view.w, h: view.h, R: g.R, seed: 7, world: g.lv.world, theme: THEMES.stash, hard: false, keep: g.roomFloor(), cave: id });
    g.enterRoom({ kind: 'treasure', x: g.hero.cx, y: g.hero.cy, room }); __up.tick(90); return g.lv;
  };
  const shot = async (o) => { __up.tick(1, 0); await wait(200); const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none'; document.getElementById('fade').classList.remove('go'); return { ...o, nf: renderer.nf }; };   // (the way-in's fade done)
  const steps = [];
  for (const id of ['caveAwnings', 'cavePins', 'caveShutter', 'caveRush']) steps.push(async () => { TCV_V.sw = TCV_V.pin = 'A'; const lv = enter(id); return shot({ id, cave: lv.cave, sw: lv.switches.map((s) => [Math.round(s.x), Math.round(s.y - lv.cam)]) }); });
  for (const dt of [0.17, 1, 4, 5.17]) steps.push(async () => { TCV_V.sw = 'A'; const lv = enter('caveShutter'); g.pullSwitch(lv.switches[0]); __up.tick(Math.round(dt * 60)); return shot({ shutter: dt, on: lv.switches[0].on }); });
  for (const L of 'ABCDEF') for (const pulled of [false, true]) steps.push(async () => { TCV_V.sw = L; const lv = enter('caveShutter'); if (pulled) { g.pullSwitch(lv.switches[0]); __up.tick(6); } return shot({ sw: L, pulled }); });
  for (const L of 'ABCDEF') steps.push(async () => { TCV_V.pin = L; enter('cavePins'); return shot({ pin: L }); });
  window.__steps = steps;
})();
