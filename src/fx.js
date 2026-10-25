// Screen filters (owner, 2026-10-25: «Элт строки и иногда каналы: когда ущерб или взаимодействие. Опцию сделай отключаемой в меню рядом с 2.5d в одну
// строку»): the CRT's scanlines always, and red and blue apart for a moment when the hero is hurt or does something (frees a friend, lights a task's thing,
// takes a candy, buys), the brief's «RGB split… On for 0.15–0.35 s»; both off by the settings' CRT (save.crt; on unless set off). The try before it (owner: «Давай еще попробуем с визуалом эти фильтры, не меняя движок. В документе есть палитра цветов, используй этот
// подход, но возьми наши цвета и оттенки для них»; his brief, Pixel_Art_PostFX: CRT / scanlines, chromatic aberration, pixel grain, a colour grade by a mood's
// palette). Only with ?fx=…: the engine as it is, this one pass over its finished screen as it goes up onto the canvas, every pattern on the game's own pixel
// grid and fixed to the world (no crawl), the HUD over it untouched. ?fx=night,crt: any of
//   night, sunset, mist  a grade toward that mood's ramp of our inks, five steps by the 4×4 Bayer, a third of the way (mist: a fog low on the screen too)
//   crt                  a dark line under each row of game pixels (an overlay at the screen's own pixels: the canvas is the game's size, the browser scales it up)
//   chroma               red and blue a game pixel apart, toward the screen's sides only
//   grain                a coarse grain, 2×2 game pixels, still
//   vignette             the corners a dithered step darker (with any grade)
(() => {
  if (typeof Renderer === 'undefined') return;
  const m = location.search.match(/[?&]fx=([\w,]+)/), on = new Set(m ? m[1].split(',') : []);
  const retro = () => on.has('crt') || (typeof save !== 'undefined' && save.crt !== false), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kick = { k: 0, t0: 0, dur: 0 }, KICK = { hurt: [1, 0.35], free: [0.5, 0.22], task: [0.5, 0.22], take: [0.6, 0.25], buy: [0.4, 0.18] };   // a moment's split: its
  // strength (a game pixel at the screen's sides at 1) and how long it fades over (s)
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), K = PAL.black;
  const RAMPS = {   // our inks and their shades, dark to light (the brief's NIGHT / SUNSET / MIST swatches in the game's own colours)
    night: [K, mix(K, PAL.purple, 0.4), mix(K, PAL.blue, 0.7), PAL.aqua, PAL.white],
    sunset: [K, mix(K, PAL.purple, 0.45), mix(K, PAL.red, 0.8), PAL.orange, PAL.yellow],
    mist: [K, mix(K, PAL.blue, 0.3), mix(K, PAL.gray, 0.7), PAL.gray, PAL.white],
  };
  const grade = ['night', 'sunset', 'mist'].find((k) => on.has(k));
  const U = { grade: grade ? 0.34 : 0, crt: 0.5, chroma: on.has('chroma') ? 1 : 0, grain: on.has('grain') ? 0.08 : 0,
    vig: grade || on.has('vignette') ? 0.22 : 0, fog: grade === 'mist' ? 0.3 : 0 };
  const FS = GLSL + `in vec2 vUv; out vec4 o;
uniform sampler2D uScene; uniform vec2 uLow, uGrid; uniform float uScale, uGrade, uChroma, uGrain, uVig, uFog; uniform vec3 uRamp[5], uFogC;
const float B4[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer(ivec2 g) { return (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0; }
float hash(ivec2 p) { uint h = uint(p.x) * 374761393u + uint(p.y) * 668265263u; h = (h ^ (h >> 13)) * 1274126177u; return float(h & 0xffffu) / 65535.0; }
vec3 at(ivec2 p) { return texelFetch(uScene, clamp(p, ivec2(0), ivec2(uLow) - 1), 0).rgb; }
void main() {
  ivec2 gp = ivec2(floor(gl_FragCoord.xy / uScale));   // the game pixel under this screen pixel
  ivec2 w = ivec2(floor(vec2(float(gp.x) + 0.5, -(float(gp.y) + 0.5)) + uGrid));   // and where it is in the world (patterns fixed to it, as the engine's own)
  vec2 uv = (vec2(gp) + 0.5) / uLow;
  vec3 c = at(gp);
  if (uChroma > 0.0) { int d = int(round(uChroma * 2.0 * (uv.x - 0.5) * 2.0)); if (d != 0) { c.r = at(gp - ivec2(d, 0)).r; c.b = at(gp + ivec2(d, 0)).b; } }   // (none in the middle)
  if (uGrade > 0.0) {
    float l = dot(c, vec3(0.299, 0.587, 0.114)) * 4.0; int i = int(clamp(floor(l + bayer(w) - 0.5), 0.0, 4.0));   // (five steps, dithered between)
    c = mix(c, uRamp[i], uGrade);
  }
  if (uFog > 0.0) { float f = smoothstep(0.45, 0.0, uv.y) * uFog * 3.0; if (bayer(w) < f) c = mix(c, uFogC, 0.5); }   // a mist low down, by steps
  if (uGrain > 0.0) c *= 1.0 + (hash(w >> 1) - 0.5) * 2.0 * uGrain;
  if (uVig > 0.0) { float v = smoothstep(0.5, 0.95, length((uv - 0.5) * vec2(1.0, 0.8)) * 1.4); if (bayer(w) < v) c *= 1.0 - uVig; }
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
  const pass = (r, g) => {
    const gl = r.gl, t = r.target; if (!t || !t.scene || CINE) return;
    if (r.pFx === undefined) { try { r.pFx = program(gl, BG_VS, FS); } catch (err) { console.error(err); r.pFx = null; } }
    const pf = r.pFx; if (!pf) return;
    const now = performance.now() / 1000, kt = kick.dur ? 1 - (now - kick.t0) / kick.dur : 0, ch = U.chroma || (kt > 0 && retro() ? kick.k * kt : 0);
    if (!grade && !U.grain && !U.vig && !ch) return;   // (nothing to do: no pass at all)
    const [lw, lh] = r.low, P = PIX.size, cam = g.lv ? g.lv.cam : 0, sx = Math.round(shake.x / P) * P, sy = Math.round((shake.y - cam) / P) * P;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.sceneFb);
    gl.blitFramebuffer(0, 0, lw, lh, 0, 0, lw, lh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, r.canvas.width, r.canvas.height); gl.disable(gl.BLEND);
    gl.useProgram(pf.p);
    gl.uniform2f(pf.u.uLow, lw, lh); gl.uniform2f(pf.u.uGrid, -sx / P, lh - sy / P); gl.uniform1f(pf.u.uScale, r.canvas.width / lw);
    gl.uniform1f(pf.u.uGrade, U.grade); gl.uniform1f(pf.u.uChroma, ch); gl.uniform1f(pf.u.uGrain, U.grain); gl.uniform1f(pf.u.uVig, U.vig); gl.uniform1f(pf.u.uFog, U.fog);
    if (grade) gl.uniform3fv(pf.u['uRamp[0]'], RAMPS[grade].flat()); gl.uniform3fv(pf.u.uFogC, mix(PAL.gray, PAL.aqua, 0.3));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.scene); gl.uniform1i(pf.u.uScene, 0);
    gl.bindVertexArray(r.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null); gl.bindTexture(gl.TEXTURE_2D, null); gl.enable(gl.BLEND);
  };
  {   // the scanlines: a still overlay over the canvas, one dark line under each row of game pixels, the picture under it a little brighter for them
    const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;pointer-events:none;mix-blend-mode:multiply';   // (after the canvas, before the HUD: under its words)
    const fit = () => { const r = typeof renderer !== 'undefined' ? renderer : null, c = r && r.canvas; if (!c || !r.low) return; const b = c.getBoundingClientRect(), row = b.height / r.low[1];
      const onn = retro(); Object.assign(ov.style, { display: onn ? '' : 'none', left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px',
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 0 70%, rgba(0,0,0,${U.crt}) 70% 100%)`, backgroundSize: `100% ${row}px` }); c.style.filter = onn ? 'brightness(1.12)' : ''; };
    window.fxRetro = fit;   // (the settings' CRT, at once)
    const start = () => { if (typeof renderer === 'undefined') return setTimeout(start, 200); renderer.canvas.after(ov); fit(); addEventListener('resize', () => setTimeout(fit, 50)); setInterval(fit, 1000); };
    start();
  }
  if (typeof Game !== 'undefined' && !still) for (const [name, [k, dur]] of Object.entries(KICK)) {   // the moments that split it
    const f = Game.prototype[name]; if (!f) continue;
    Game.prototype[name] = function (...a) { const hp = this.hp, res = f.apply(this, a); if (name !== 'hurt' || this.hp < hp) Object.assign(kick, { k, dur, t0: performance.now() / 1000 }); return res; };
  }
  for (const k of ['draw', 'drawMenu']) { const f = Renderer.prototype[k]; Renderer.prototype[k] = function (g, ...a) { const res = f.call(this, g, ...a); pass(this, g); return res; }; }
})();
