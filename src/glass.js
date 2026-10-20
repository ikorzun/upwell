// Every menu and every screen between levels on liquid glass (owner): the level frozen and blurred behind, one sheet of
// tinted glass over the whole column bending it at the edges, the screen's buttons and words lying on it (index.html
// styles them: body.glassy). The glass is liquidGL (src/vendor, MIT): it bends a picture of the page that it paints
// itself, and the game's WebGL canvas comes out black in that picture (it draws without a kept buffer), so the frame is
// copied into a 2D canvas (#freeze) in the task that drew it. The glass is there only while a screen is open: liquidGL's
// canvas, context and loop go when it closes. Without liquidGL (the script missing) the screens keep their 7/8 ink.
(() => {
  if (typeof liquidGL !== 'function') return;
  const SCREENS = ['menu', 'pause', 'result', 'cards', 'map'];
  const BLUR = 5;   // CSS px of blur on the level behind (the owner: blurred, not darkened: the glass is what is tinted)
  // Bent at its wide edges, the colours split a little there, ink dye 65% (the words' contrast ≥ 5.9:1 on every screen);
  // the moving highlights only without reduced motion.
  const LOOK = { engine: 'webgl2', refraction: 0.025, bevelDepth: 0.12, bevelWidth: 0.32, aberration: 0.5, frost: 0,
    tint: 'rgba(20, 20, 20, 0.65)', shadow: false, specular: !matchMedia('(prefers-reduced-motion: reduce)').matches, reveal: 'none', resolution: 2 };

  uiEl.setAttribute('data-liquid-ignore', '');   // liquidGL's picture: the level only, never the UI over it
  const freeze = document.createElement('canvas'), layer = document.createElement('div');
  freeze.id = 'freeze'; freeze.hidden = true; layer.id = 'glass';
  canvas.after(freeze, layer);
  let lenses = [];
  const clear = () => {
    for (const l of lenses) l.destroy();   // the last one takes liquidGL's canvas, context and loop with it
    lenses = [];
    layer.replaceChildren();
    freeze.hidden = true;
    document.body.classList.remove('glassy');
  };
  // Blur by halving the picture with smoothing step by step (each half averages 2×2 pixels) and doubling it back:
  // about r device px, in any browser (a canvas's `filter` is not in every Safari).
  const halves = [];
  const blur = (c, r) => {
    const n = Math.max(0, Math.min(6, Math.round(Math.log2(Math.max(1, r)))));
    let src = c;
    for (let i = 0; i < n; i++) {
      const h = halves[i] || (halves[i] = document.createElement('canvas')), x = h.getContext('2d');
      h.width = Math.ceil(src.width / 2); h.height = Math.ceil(src.height / 2);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, h.width, h.height);
      src = h;
    }
    for (let i = n - 2; i >= -1; i--) {   // back up through the same sizes, then onto the frame itself
      const dst = i >= 0 ? halves[i] : c, x = dst.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.clearRect(0, 0, dst.width, dst.height);
      x.drawImage(src, 0, 0, dst.width, dst.height);
      src = dst;
    }
  };
  const grab = () => {
    runFrame(performance.now(), 0);   // drawn now and copied in the same task
    freeze.width = canvas.width; freeze.height = canvas.height;
    freeze.getContext('2d').drawImage(canvas, 0, 0);
    blur(freeze, BLUR * (window.devicePixelRatio || 1));
    Object.assign(freeze.style, { left: canvas.style.left, width: canvas.style.width, height: canvas.style.height });
    freeze.hidden = false;
  };
  // The sheet: a stand-in the column's size (liquidGL makes its target see-through and deaf to taps, so the buttons
  // stay where they are, over it), glassed once laid out.
  const sheet = () => {
    const r = uiEl.getBoundingClientRect(), pane = document.createElement('i');
    Object.assign(pane.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    layer.append(pane);
    lenses = [].concat(liquidGL({ ...LOOK, target: '#glass i' }) || []);
  };
  const panel = ui.panel, hideAll = ui.hideAll;
  ui.hideAll = function () { clear(); return hideAll.apply(this, arguments); };
  ui.panel = function (id) {
    const p = panel.apply(this, arguments);
    if (!SCREENS.includes(id)) return p;
    // once the screen has its buttons (added right after this) and before it is drawn: the frame frozen and blurred
    // (again whenever the screen is drawn again: a new colour on the menu's hero shows); the glass a frame later
    queueMicrotask(() => { if (this.open !== id) return; clear(); grab(); document.body.classList.add('glassy'); });
    requestAnimationFrame(() => { if (this.open === id && !lenses.length) sheet(); });
    return p;
  };
})();
