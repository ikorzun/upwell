// Screen filters (owner, 2026-10-25: «Элт строки и и иногда каналы: когда ущерб или взаимодействие. Опцию сделай отключаемой в меню рядом с 2.5d в одну
// строку»): the CRT's scanlines always, and red and blue apart for a moment when the hero is hurt or does something (frees a friend, lights a task's thing,
// takes a candy, buys), the brief's «RGB split… On for 0.15–0.35 s»; both off by the settings' CRT (save.crt; on unless set off). The mood grades, grain and
// vignette tried with ?fx= are gone (owner: «Эти фильтры не нужны»).
(() => {
  if (typeof Renderer === 'undefined') return;
  const retro = () => typeof save !== 'undefined' && save.crt !== false, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kick = { k: 0, t0: 0, dur: 0 }, KICK = { hurt: [1, 0.35], free: [0.5, 0.22], task: [0.5, 0.22], take: [0.6, 0.25], buy: [0.4, 0.18] };   // a moment's split: its
  // strength (a game pixel at the screen's sides at 1) and how long it fades over (s)
  const FS = GLSL + `in vec2 vUv; out vec4 o;
uniform sampler2D uScene; uniform vec2 uLow; uniform float uScale, uChroma;
vec3 at(ivec2 p) { return texelFetch(uScene, clamp(p, ivec2(0), ivec2(uLow) - 1), 0).rgb; }
void main() {
  ivec2 gp = ivec2(floor(gl_FragCoord.xy / uScale));   // the game pixel under this screen pixel
  vec2 uv = (vec2(gp) + 0.5) / uLow;
  vec3 c = at(gp);
  int d = int(round(uChroma * 2.0 * (uv.x - 0.5) * 2.0)); if (d != 0) { c.r = at(gp - ivec2(d, 0)).r; c.b = at(gp + ivec2(d, 0)).b; }   // (none in the middle)
  o = vec4(c, 1.0);
}`;
  const pass = (r) => {
    const gl = r.gl, t = r.target; if (!t || !t.scene || CINE) return;
    if (r.pFx === undefined) { try { r.pFx = program(gl, BG_VS, FS); } catch (err) { console.error(err); r.pFx = null; } }   // (built at the first frame, not at the first hit)
    const pf = r.pFx; if (!pf) return;
    const now = performance.now() / 1000, kt = kick.dur ? 1 - (now - kick.t0) / kick.dur : 0, ch = kt > 0 && retro() ? kick.k * kt : 0;
    if (!ch) return;   // (nothing to do: no pass at all)
    const [lw, lh] = r.low;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.sceneFb);
    gl.blitFramebuffer(0, 0, lw, lh, 0, 0, lw, lh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, r.canvas.width, r.canvas.height); gl.disable(gl.BLEND);
    gl.useProgram(pf.p);
    gl.uniform2f(pf.u.uLow, lw, lh); gl.uniform1f(pf.u.uScale, r.canvas.width / lw); gl.uniform1f(pf.u.uChroma, ch);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.scene); gl.uniform1i(pf.u.uScene, 0);
    gl.bindVertexArray(r.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null); gl.bindTexture(gl.TEXTURE_2D, null); gl.enable(gl.BLEND);
  };
  {   // the scanlines: a still overlay over the canvas, one dark line under each row of game pixels, the picture under it a little brighter for them
    const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;pointer-events:none;mix-blend-mode:multiply';   // (after the canvas, before the HUD: under its words)
    const fit = () => { const r = typeof renderer !== 'undefined' ? renderer : null, c = r && r.canvas; if (!c || !r.low) return; const b = c.getBoundingClientRect(), row = b.height / r.low[1];
      const onn = retro(); Object.assign(ov.style, { display: onn ? '' : 'none', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px',
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0 70%, rgba(0,0,0,0.5) 70% 100%)', backgroundSize: `100% ${row}px` }); c.style.filter = onn ? 'brightness(1.12)' : ''; };
    window.fxRetro = fit;   // (the settings' CRT, at once)
    const start = () => { if (typeof renderer === 'undefined') return setTimeout(start, 200); renderer.canvas.after(ov); fit(); addEventListener('resize', () => setTimeout(fit, 50)); setInterval(fit, 1000); };
    start();
  }
  if (typeof Game !== 'undefined' && !still) for (const [name, [k, dur]] of Object.entries(KICK)) {   // the moments that split it
    const f = Game.prototype[name]; if (!f) continue;
    Game.prototype[name] = function (...a) { const hp = this.hp, res = f.apply(this, a); if (name !== 'hurt' || this.hp < hp) Object.assign(kick, { k, dur, t0: performance.now() / 1000 }); return res; };
  }
  for (const k of ['draw', 'drawMenu']) { const f = Renderer.prototype[k]; Renderer.prototype[k] = function (g, ...a) { const res = f.call(this, g, ...a); pass(this); return res; }; }
})();
