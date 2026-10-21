// Koschei's oak (tools/gallery): his arena (c8-10) in its dark, each variant of the oak under the moon behind it (SKAZKA_V.oak, window.__skV), the bot
// playing up to a moment, then a look. The shots are whole screens (compose them as a grid).
// (The owner picked Koschei's oak on 2026-10-21 and SKAZKA_V went with the variants, so this no longer runs as it is: it is a template for the next world's
// gallery, as the Dark Forest's and the Sea's are.)
(() => {
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const load = () => new Promise((ok) => { if (window.__bot) return ok(); const s = document.createElement('script'); s.src = 'tools/bot.js?' + Date.now(); s.onload = ok; document.body.append(s); });
  const shot = async (k) => {
    window.__skV = { oak: k }; await load(); const tst = document.getElementById('toast'); if (tst) tst.style.display = 'none';
    __bot.start(7, 9, null, { camp: true, col: 1, until: 1.2 }); __bot.advance(); if (window.__oakLit) __up.game.lv.dark = false; __up.tick(1); await wait(250);
    return { el: 'oak', k, nf: renderer.nf, dark: __up.game.lv.dark };
  };
  window.__steps = [0, 1, 2, 3, 4, 5].map((k) => () => shot(k));
})();
