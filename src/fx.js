// Screen filters (owner, 2026-10-25: «Элт строки и и иногда каналы: когда ущерб или взаимодействие. Опцию сделай отключаемой в меню рядом с 2.5d в одну
// строку»): the CRT's scanlines always, and a moment of the CRT going wrong when something happens; both off by the settings' CRT (save.crt; on unless set
// off). The mood grades, grain and vignette tried with ?fx= are gone (owner: «Эти фильтры не нужны»). Since 2026-10-27 (owner: «добавить более заметные crt
// эффекты в игру при победе над врагом и получении урона») a hurt and a kill are a lot louder: a hurt splits red and blue wide (the middle too), tears a few
// bands of rows aside, jolts the picture down and back, flashes it red once and darkens the lines; a kill splits them less and runs a bright band down the
// screen (a boss's hit both, a little torn); the other moments (a friend freed, a task's thing lit, a candy taken, a buy) as before, the split alone. No
// flash closer than 0.34 s to the last (the owner's 3 Hz), a tear's bands the same all through its moment (no flicker); none with reduced motion
(() => {
  if (typeof Renderer === 'undefined') return;
  const retro = () => typeof save !== 'undefined' && save.crt !== false, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KICK = {   // a moment: its split (a game pixel at the screen's sides at 1, a third of it in the middle), its tear (the most a band is pushed aside, game px),
    // its jolt (px down), its flash (ink and strength), its sweep (a bright band down the screen), how much darker the lines; how long it fades over (s)
    hurt: { chroma: 2.6, tear: 6, jolt: 3, flash: [0.96, 0.24, 0.2, 0.36], lines: 0.4, dur: 0.45 },
    kill: { chroma: 2, sweep: 1, flash: [1, 1, 1, 0.18], lines: 0.25, dur: 0.34 },
    hitBoss: { chroma: 2.2, tear: 3, sweep: 1, flash: [1, 1, 1, 0.22], lines: 0.3, dur: 0.42 },
    free: { chroma: 0.5, dur: 0.22 }, task: { chroma: 0.5, dur: 0.22 }, take: { chroma: 0.6, dur: 0.25 }, buy: { chroma: 0.4, dur: 0.18 },
  };
  const FLASH_GAP = 0.34;   // s: a flash at most three times a second (the owner's rule)
  const kick = { p: null, t0: 0, seed: 0, flash: false }, last = { flash: -9 };
  const FS = GLSL + `in vec2 vUv; out vec4 o;
uniform sampler2D uScene; uniform vec2 uLow; uniform float uScale, uChroma, uTear, uSeed, uJolt, uSweep, uSweepK, uLines; uniform vec4 uFlash;
vec3 at(ivec2 p) { return texelFetch(uScene, clamp(p, ivec2(0), ivec2(uLow) - 1), 0).rgb; }
float h1(float x) { return fract(sin(x * 127.1 + uSeed * 311.7) * 43758.5453); }
void main() {
  ivec2 gp = ivec2(floor(gl_FragCoord.xy / uScale));   // the game pixel under this screen pixel
  vec2 uv = (vec2(gp) + 0.5) / uLow;
  gp.y += int(round(uJolt));   // (read from above: the picture down)
  if (uTear > 0.0) { float b = floor(float(gp.y) / 5.0); if (h1(b) > 0.72) gp.x += int(round(uTear * (h1(b + 17.0) * 2.0 - 1.0))); }   // a band of rows pushed aside
  vec3 c = at(gp);
  float base = uChroma * 0.35;   // (a third of it everywhere, more out to the sides)
  int dr = int(round(-base - 4.0 * uChroma * (uv.x - 0.5))), db = int(round(base + 4.0 * uChroma * (uv.x - 0.5)));
  if (dr != 0) c.r = at(gp + ivec2(dr, 0)).r; if (db != 0) c.b = at(gp + ivec2(db, 0)).b;
  if (uSweepK > 0.0) { float y = 1.0 - uv.y, d = abs(y - uSweep) * uLow.y; c += uSweepK * 0.32 * smoothstep(4.0, 0.0, d); }   // the bright band, on its way down
  if (uLines > 0.0 && fract(gl_FragCoord.y / uScale) < 0.3) c *= 1.0 - uLines;   // the lines darker (each game row's bottom)
  c = mix(c, uFlash.rgb, uFlash.a);
  o = vec4(c, 1.0);
}`;
  const pass = (r) => {
    const gl = r.gl, t = r.target; if (!t || !t.scene || CINE) return;
    if (r.pFx === undefined) { try { r.pFx = program(gl, BG_VS, FS); } catch (err) { console.error(err); r.pFx = null; } }   // (built at the first frame, not at the first hit)
    const pf = r.pFx, p = kick.p; if (!pf || !p || !retro()) return;
    const now = performance.now() / 1000, u = (now - kick.t0) / p.dur; if (u >= 1) { kick.p = null; return; }   // (nothing to do: no pass at all)
    const k = (1 - u) * (1 - u), [lw, lh] = r.low, fl = kick.flash && p.flash ? p.flash : null;   // (it fades fast, then slowly)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.sceneFb);
    gl.blitFramebuffer(0, 0, lw, lh, 0, 0, lw, lh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, r.canvas.width, r.canvas.height); gl.disable(gl.BLEND);
    gl.useProgram(pf.p);
    gl.uniform2f(pf.u.uLow, lw, lh); gl.uniform1f(pf.u.uScale, r.canvas.width / lw);
    gl.uniform1f(pf.u.uChroma, (p.chroma || 0) * k); gl.uniform1f(pf.u.uTear, (p.tear || 0) * k); gl.uniform1f(pf.u.uSeed, kick.seed);
    gl.uniform1f(pf.u.uJolt, (p.jolt || 0) * Math.min(1, 4 * (1 - u)) * (1 - u)); gl.uniform1f(pf.u.uLines, (p.lines || 0) * k);   // (the jolt: at once, back over its time)
    gl.uniform1f(pf.u.uSweep, u); gl.uniform1f(pf.u.uSweepK, p.sweep ? 1 - u : 0);
    gl.uniform4f(pf.u.uFlash, fl ? fl[0] : 0, fl ? fl[1] : 0, fl ? fl[2] : 0, fl ? fl[3] * k : 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.scene); gl.uniform1i(pf.u.uScene, 0);
    gl.bindVertexArray(r.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null); gl.bindTexture(gl.TEXTURE_2D, null); gl.enable(gl.BLEND);
  };
  {   // the scanlines: a still overlay over the canvas, one dark line under each row of game pixels, the picture under it a little brighter for them. Drawn on
    // the screen's own pixels: a CSS tile a game pixel tall went wrong where a CSS px is not whole screen pixels (a browser's zoom: Safari at 85 % drew no
    // lines and the column's bottom third half dark, owner: «а затемнение это что внизу экрана?»)
    const ov = document.createElement('canvas'); ov.style.cssText = 'position:fixed;pointer-events:none;mix-blend-mode:multiply;image-rendering:pixelated';   // (after the canvas, before the HUD: under its words)
    let drawn = '';
    const fit = () => { const r = typeof renderer !== 'undefined' ? renderer : null, c = r && r.canvas; if (!c || !r.low) return; const b = c.getBoundingClientRect(), onn = retro();
      Object.assign(ov.style, { display: onn ? '' : 'none', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' }); c.style.filter = onn ? 'brightness(1.12)' : '';
      const rows = r.low[1], h = Math.round(b.height * (window.devicePixelRatio || 1)), key = rows + ' ' + h; if (!onn || key === drawn) return; drawn = key;
      ov.width = 1; ov.height = h; const x = ov.getContext('2d'), g = h / rows, line = Math.max(1, Math.round(0.3 * g));   // a row's screen pixels; its line, the bottom 30 % of them (one at least)
      x.fillStyle = `rgba(0,0,0,${(0.125 * g) / line})`;   // as dark on the whole as a 3x phone's lines were: a pixel of a row's four, half black
      for (let i = 1; i <= rows; i++) x.fillRect(0, Math.round(i * g) - line, 1, line); };
    window.fxRetro = fit;   // (the settings' CRT, at once)
    const start = () => { if (typeof renderer === 'undefined') return setTimeout(start, 200); renderer.canvas.after(ov); fit(); addEventListener('resize', () => setTimeout(fit, 50)); setInterval(fit, 1000); };
    start();
  }
  const go = (name) => {   // a moment begins (the newest over one under way); its flash only if the last was long enough ago
    const p = KICK[name], now = performance.now() / 1000, flash = !!p.flash && now - last.flash >= FLASH_GAP;
    if (flash) last.flash = now;
    Object.assign(kick, { p, t0: now, seed: fxRand(0, 100), flash });   // (fxRand: a look draws none of the game's chances, which the bot seeds)
  };
  window.fxKick = go;   // (for checks)
  if (typeof Game !== 'undefined' && !still) for (const name of Object.keys(KICK)) {   // the moments that set it off
    const f = Game.prototype[name]; if (!f) continue;
    Game.prototype[name] = function (...a) {
      const hp = this.hp, was = name === 'kill' && !!this.lv && this.lv.enemies.includes(a[0]), res = f.apply(this, a);
      if (name === 'hurt' ? this.hp < hp : name === 'kill' ? was && !!a[1] : true) go(name);   // (a hurt that cost a heart; a foe there killed by the hero)
      return res;
    };
  }
  for (const k of ['draw', 'drawMenu']) { const f = Renderer.prototype[k]; Renderer.prototype[k] = function (g, ...a) { const res = f.call(this, g, ...a); pass(this); return res; }; }
})();
