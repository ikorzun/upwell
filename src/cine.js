// Pixel Art + Cinematic 3D, an experiment (owner 2026-10-22: «Pixel Art + Cinematic 3D. Геометрия остаётся практически неизменной, но появляются объёмный
// свет, параллакс, глубина, частицы и 3D-эффекты. Визуально ближе к The Last Night»; his picture research/style/cine-reference-tokyo.png). On, its default
// parts, unless the page has ?plain or the settings' switch says 2D (save.flat, cineUse); ?cine=all for all of it, or ?cine=a,b,... naming the parts: light (the world dark but round its lights), glow (a soft halo round each light), rays
// (light through the gaps between ledges), fog (a haze drifting over what is behind), dof (what is behind out of focus), shadow (the play's soft shadow on the
// wall behind it), extrude (a little of the ledges' thickness), depth (planes of the world's own far shapes sliding at their depth), motes (dust, fireflies,
// petals, rain), grade (a vignette, the shadows toned, grain). ?res=k draws the canvas k times the game's pixels (default 2), the lighting that smooth.
// How: what is drawn behind the shaft (the kits' far layers and wall props, all in a DIM tone: see DEPTH) goes into a target of its own; the play stays in
// sharp game pixels in another (see Renderer.prototype.draw's CINE lines); a pass at the canvas's size puts the two together (cinePost).
const CINE_ON = (() => {
  const m = /[?&]cine(?:=([^&]*))?/.exec(location.search) || ['', ''];
  const set = new Set((!m[1] ? 'vol,depth,motes,poke' : m[1] === 'all' ? 'vol,light,glow,shadow,motes,grade,depth,rays,fog,dof,extrude,poke' : m[1]).split(','));   // (owner, after: «освещение оставь пиксельное — свет от неона»: no light of ours by default)   // (owner 2026-10-22: «Визуальна разница минимальна, просто добавляется размытие… добавить объема платформам и деревьям сделав их в 2.5d»: the blur off, the volume on)
  const r = /[?&]res=(\d)/.exec(location.search);
  // bonus (?bonus=A-E), the bonuses' depth to pick from (owner: «У монет и сердец потерялся объем»; no 3D engine: «будем отрисовывать кодом псевдо 3д»): A as at
  // first, flat; B in depth toward the eye (SMALL); C a token's thickness, three copies a tone darker; D as B, deeper; E turning with its thickness (THICK
  // of its pixels) on the side turned to us, in its own inks a tone darker: the owner's pick («Е»), the default
  return { on: (k) => set.has(k), k: r ? Math.max(1, Math.min(4, +r[1])) : set.has('light') || set.has('glow') ? 2 : 1, motes: [], fx: [], lastT: null, light: [], K: 0.06, bonus: (/[?&]bonus=([A-E])/.exec(location.search) || [])[1] || 'E', DEEP: 0.7, SMALL: 0.3, THICK: 2 };
})();
// The 2.5D now: CINE_ON, or null for 2D. On where the player has it on (the settings' switch, cineUse; ?plain or #plain off) and the world's 2.5D is done
// (owner: «Делай миры в 2.5»: world by world, the rest in 2D till theirs is; ?cine shows it in any world): cineSync, at each frame's start
let cinePref = !(/[?&]plain\b/.test(location.search) || /plain/.test(location.hash)), CINE = null;
const CINE_DONE = (th) => !!th && (!!th.village || !!th.mines || !!th.fuji || /[?&]cine\b/.test(location.search));   // the worlds done: the Village, the Mine, Fuji
// Each world's air: its haze, the tone its shadows take, how dark it is away from its lights, a moon or none, its motes, its far planes.
const CINE_LOOK = (th) => th.village ? { fog: [0.13, 0.15, 0.27], shade: [0.012, 0.016, 0.045], amb: 0.5, moon: [0.62, 0.72, 1.0], motes: { dust: 14, fly: 7, petal: 10 }, planes: 'bamboo' }
  : th.town ? { fog: [0.2, 0.08, 0.24], shade: [0.03, 0.01, 0.04], amb: 0.48, moon: null, motes: { dust: 12, rain: 34 }, planes: 'city' }
  : th.mines ? { fog: [0.1, 0.1, 0.12], shade: [0.012, 0.012, 0.02], amb: 0.5, moon: null, motes: { dust: 14 }, planes: null }   // (no embers: orange is a lamp lit)
  : th.fuji ? { fog: [0.1, 0.12, 0.2], shade: [0.01, 0.015, 0.04], amb: 0.55, moon: null, motes: { snow: 18, ember: 4 }, planes: null }   // (snow, a few embers: the mountain's fire)
  : { fog: [0.12, 0.12, 0.17], shade: [0.015, 0.015, 0.03], amb: 0.55, moon: null, motes: { dust: 16, ember: 6 }, planes: null };

const CINE_COPY_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uTex; void main() { o = texture(uTex, vUv); }`;
const CINE_ALPHA_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uTex, uTex2; void main() { float a = max(texture(uTex, vUv).a, texture(uTex2, vUv).a); o = vec4(a, a, a, 1.0); }`;
const CINE_BLUR_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uDir;
void main() {   // nine taps of a gaussian in five linear fetches
  o = texture(uTex, vUv) * 0.227 + (texture(uTex, vUv + uDir * 1.385) + texture(uTex, vUv - uDir * 1.385)) * 0.316
    + (texture(uTex, vUv + uDir * 3.231) + texture(uTex, vUv - uDir * 3.231)) * 0.070;
}`;
// Light through the gaps: from each pixel toward each of a few lights, how much of the way the play leaves open (its coverage uOcc), fading with distance.
const CINE_RAYS_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uOcc; uniform vec4 uR[4]; uniform vec3 uRC[4]; uniform int uNR; uniform float uAsp;
void main() {
  vec3 acc = vec3(0.0);
  for (int j = 0; j < 4; j++) {
    if (j >= uNR) break;
    vec2 d = uR[j].xy - vUv; float fall = max(0.0, 1.0 - length(d * vec2(uAsp, 1.0)) / uR[j].z);
    if (fall <= 0.0) continue;
    float s = 0.0;
    for (int i = 0; i < 24; i++) s += 1.0 - texture(uOcc, vUv + d * ((float(i) + 0.5) / 24.0)).r;
    float v = s / 24.0; acc += uRC[j] * v * v * fall * fall * uR[j].w;
  }
  o = vec4(acc, 1.0);
}`;
// The picture: what is behind (sharp at the walls, out of focus and hazed in the well, the play's soft shadow on it), the play's thickness, the light, the
// halos and the rays, then the grade.
const CINE_COMP_FS = GLSL + `in vec2 vUv; out vec4 o;
uniform sampler2D uFar, uFarB, uPlay, uSoft, uRays, uSt, uSm; uniform vec3 uWhite; uniform vec2 uLow, uWell, uShOff, uExOff, uEye; uniform float uAsp, uTime; uniform vec2 uK3, uK4;
uniform vec4 uL[16]; uniform vec3 uLC[16]; uniform int uNL; uniform vec4 uK; uniform vec4 uK2; uniform vec3 uFogC, uShadeC; uniform float uGrade;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
vec4 at(sampler2D t, vec2 q) { return texelFetch(t, clamp(ivec2(floor(q)), ivec2(0), ivec2(uLow) - 1), 0); }
vec4 matAt(sampler2D t, vec2 q) {   // a thing's own colour at q (its pattern carried back: an awning's stripes), but past a dither's black dot, so it does not streak its depth
  vec4 a = at(t, q); if (a.a > 0.5 && dot(a.rgb, vec3(0.333)) > 0.12) return a;
  vec4 b = at(t, q + vec2(1.0, 0.0)); if (b.a > 0.5 && dot(b.rgb, vec3(0.333)) > 0.12) return b;
  vec4 c = at(t, q + vec2(0.0, 1.0)); if (c.a > 0.5 && dot(c.rgb, vec3(0.333)) > 0.12) return c;
  return a;
}
// Is the game pixel pg in the depth of something in t (its fronts), seen from the eye? From pg back along the way to the eye to the nearest front; its face
// in that front's colour: lit on top (its body past the lit edge and a grass strip), darker on its end, darkest under it, a tone darker going in.
bool depthOf(sampler2D t, vec2 pg, vec2 k, out vec3 col) {
  vec2 o = (uEye - pg) * k.x; float ol = length(o); if (ol > k.y) { o *= k.y / ol; ol = k.y; }
  float n = ceil(ol); vec2 dir = o / max(ol, 1e-3);
  for (int i = 1; i <= 16; i++) {
    if (float(i) > n) break;
    float s = float(i) / n; vec2 q = pg - o * s;
    if (at(t, q).a > 0.5) {
      bool top = dir.y > 0.2 && at(t, q + vec2(0.0, 1.0)).a < 0.5, bot = dir.y < -0.2 && at(t, q - vec2(0.0, 1.0)).a < 0.5;
      float d = 0.0; if (top) for (int j = 1; j <= 7; j++) { if (at(t, q - vec2(0.0, float(j))).a < 0.5) break; d = float(j); }   // (the body under its lit edge, as deep as
      // 7 px while still in this front: a thin plank's own colour, not what hangs under it)
      vec4 m = top ? matAt(t, q - vec2(0.0, d)) : bot ? matAt(t, q + vec2(0.0, 3.0)) : matAt(t, q);
      if (m.a < 0.5) m = matAt(t, q);
      float lum = dot(m.rgb, vec3(0.299, 0.587, 0.114)), light = smoothstep(0.45, 0.8, lum);   // a light front's top no lighter than it: the white lip the lightest
      if (lum > 0.86) { m.rgb = uWhite; lum = dot(m.rgb, vec3(0.299, 0.587, 0.114)); light = smoothstep(0.45, 0.8, lum); }   // a white front's depth in the world's ink, not grey
      col = (m.rgb * (top ? mix(1.12, 0.9, light) : bot ? 0.42 : 0.62) + (top ? 0.03 * (1.0 - light) : 0.0)) * (1.0 - 0.3 * s);
      return true;
    }
  }
  return false;
}
void main() {
  vec2 uv = vUv; ivec2 tc = clamp(ivec2(floor(uv * uLow)), ivec2(0), ivec2(uLow) - 1);
  vec4 pl = texelFetch(uPlay, tc, 0), st = texelFetch(uSt, tc, 0), sm = texelFetch(uSm, tc, 0);
  vec3 col = texelFetch(uFar, tc, 0).rgb;
  bool well = uv.x > uWell.x && uv.x < uWell.y;
  if (well) {
    col = mix(col, texture(uFarB, uv).rgb, uK.x);   // out of focus
    col *= 1.0 - uK.z * texture(uSoft, uv + uShOff).r;   // the play's soft shadow
    vec2 eu = uv + uExOff; vec4 ex = texelFetch(uPlay, clamp(ivec2(floor(eu * uLow)), ivec2(0), ivec2(uLow) - 1), 0);
    if (pl.a < 0.5 && ex.a > 0.5 && texture(uSoft, eu).r > 0.45) col = mix(col, ex.rgb * 0.3, uK.w);   // its thickness (the big shapes only: not the coins')
  }
  bool lit3 = false;   // (a thing's front or depth: lit as the things, a little)
  if (uK3.x > 0.0 && texture(uSoft, uv).r > 0.003) {   // 2.5D (the system above feat): the ledges deep, then the small things over them
    vec2 pg = floor(uv * uLow) + 0.5; vec3 dc;
    if (st.a > 0.5) { col = st.rgb; lit3 = true; } else if (depthOf(uSt, pg, uK3, dc)) { col = dc; lit3 = true; }
    if (sm.a > 0.5) { col = sm.rgb; lit3 = true; } else if (st.a < 0.5 && depthOf(uSm, pg, uK4, dc)) { col = dc; lit3 = true; }   // (a small thing's depth never over a ledge's front: its lip stays)
  } else if (st.a > 0.5 || sm.a > 0.5) { col = sm.a > 0.5 ? sm.rgb : st.rgb; lit3 = true; }
  vec3 L = vec3(uK2.x), G = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uNL) break;
    vec2 d = (uv - uL[i].xy) * vec2(uAsp, 1.0); float r = length(d) / uL[i].z, f = max(0.0, 1.0 - r);
    L += uLC[i] * f * f * uL[i].w; G += uLC[i] * exp(-r * r * 36.0) * uL[i].w;
  }
  col *= lit3 ? mix(vec3(1.0), L, 0.45) : L;
  if (well && !lit3) {   // the haze: faint and dark, drifting, thicker low down; lit where a light reaches it through the gaps (the rays)
    float fg = noise(vec2(uv.x * 2.4 + uTime * 0.025, uv.y * 3.2 / uAsp - uTime * 0.04)) * 0.65 + noise(vec2(uv.x * 7.0 - uTime * 0.05, uv.y * 10.0)) * 0.35;
    float dn = uK.y * smoothstep(0.25, 0.85, fg) * (0.6 + 0.4 * (1.0 - uv.y));
    col += uFogC * dn + texture(uRays, uv).rgb * uK2.y * (0.25 + dn * 2.2);
  }
  col = mix(col, pl.rgb * mix(vec3(1.0), L, 0.35), pl.a);   // the play lit a little: it stays what it is
  col += G * uK2.z;
  if (uGrade > 0.5) {
    float v = length((uv - 0.5) * vec2(uAsp, 1.0));
    col *= 1.0 - 0.36 * smoothstep(0.32, 0.85, v);   // a vignette
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col += uShadeC * (1.0 - smoothstep(0.0, 0.4, lum));   // the shadows toned
    col += (hash(floor(uv * uLow * 2.0) + fract(uTime * 7.0) * 61.0) - 0.5) * uK2.w;   // grain
  }
  o = vec4(col, 1.0);
}`;

if (CINE_ON) {
  const gumMake = Renderer.prototype.makeTarget, gumFeat = Renderer.prototype.feat, gumInitW = Renderer.prototype.init;
  Renderer.prototype.init = function () {
    if (!gumInitW.call(this)) return false;
    try {
      const gl = this.gl;
      this.pCopy = program(gl, BG_VS, CINE_COPY_FS); this.pAlpha = program(gl, BG_VS, CINE_ALPHA_FS); this.pBlur = program(gl, BG_VS, CINE_BLUR_FS);
      this.pRays = program(gl, BG_VS, CINE_RAYS_FS); this.pComp = program(gl, BG_VS, CINE_COMP_FS);
    } catch (err) { console.error(err); return false; }
    this.fFar = new Float32Array(14 * 512); this.nFar = 0; this.fSt = new Float32Array(14 * 1024); this.nSt = 0; this.fSm = new Float32Array(14 * 1024); this.nSm = 0; this.route = 0;
    this.cine = null; if (this.low) this.makeTarget();
    return true;
  };
  // The targets: the play's (a texture now, so it can be read; its stencil as before), what is behind, and the small ones the blurs and the rays use.
  // In 2D the game's own; either way the other kind is let go first (the settings' switch, cineUse).
  Renderer.prototype.makeTarget = function () {
    const gl = this.gl, [lw, lh] = this.low;
    const old = this.cine; if (old) { for (const k of ['far', 'st', 'sm', 'h1', 'h2', 'q1', 'q2', 'q3']) { gl.deleteFramebuffer(old[k].fb); gl.deleteTexture(old[k].tex); } gl.deleteFramebuffer(old.play.fb); gl.deleteTexture(old.play.tex); gl.deleteRenderbuffer(old.stencil); this.cine = null; this.target = null; }
    if (!this.pComp || !CINE) return gumMake.call(this);
    const g0 = this.target; if (g0) { gl.deleteFramebuffer(g0.fb); gl.deleteRenderbuffer(g0.color); gl.deleteRenderbuffer(g0.stencil); this.target = null; }
    const tex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    const target = (w, h, rb) => { const t = tex(w, h), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (rb) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb); return { fb, tex: t, w, h }; };
    const st = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, st); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, lw, lh);
    const hw = Math.max(1, lw >> 1), hh = Math.max(1, lh >> 1), qw = Math.max(1, lw >> 2), qh = Math.max(1, lh >> 2);
    const c = this.cine = { stencil: st, play: target(lw, lh, st), far: target(lw, lh), st: target(lw, lh), sm: target(lw, lh), h1: target(hw, hh), h2: target(hw, hh), q1: target(qw, qh), q2: target(qw, qh), q3: target(qw, qh) };
    this.target = { fb: c.play.fb, tex: c.play.tex };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
  };
  // What has depth, the system (owner 2026-10-22: «оставь только платформы и бонусы в 2.5d, освещение оставь пиксельное — свет от неона. Вход в магазин и
  // пещеры тоже плоские, как и алтари. А вот мелкое типа фонариков и деревьев нужно сделать 2.5d. Нужна система»):
  //   deep  (CINE.DEEP tiles at most): what the hero stands on: ledges, planks, movers, crumbles, an air conditioner;
  //   small (CINE.SMALL): what the hero takes (coins, candies, a shop's items) and the small things set on the ledges: trees, lanterns, a scarecrow, a
  //         koinobori, a vending machine, a bonsai;
  //   flat: the walls and all behind (DIM), the doors (a shop's, a stash's, a cave's), altars and shrines, signs, the characters, the effects; the light
  //         is the game's own, in pixels (a neon's halo, a lantern's glow).
  // Where a feature goes (draw sets route): 0 flat (the play), 1 a kit's layer (DIM behind, the rest small), 2 deep, 3 behind, 4 small, 5 a kit's flat
  // thing (DIM behind, the rest flat). A soft glow is always flat.
  Renderer.prototype.feat = function (cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3) {
    const rt = this.route | 0;
    if (rt === 0 || (type === 1 && rt !== 3)) return gumFeat.call(this, cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3);   // (a soft glow stays in the play: it has no depth)
    const dim = a > 1.001 && a < 1.36, far = rt === 3 || ((rt === 1 || rt === 5) && dim);
    if (!far && rt === 5) return gumFeat.call(this, cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3);
    const key = far ? 'fFar' : rt === 2 ? 'fSt' : 'fSm', nk = far ? 'nFar' : rt === 2 ? 'nSt' : 'nSm';
    if ((this[nk] + 1) * 14 > this[key].length) { const d = new Float32Array(this[key].length * 2); d.set(this[key]); this[key] = d; }
    const F = this[key], o = this[nk]++ * 14;
    F[o] = cx; F[o + 1] = cy; F[o + 2] = ax; F[o + 3] = ay; F[o + 4] = bx; F[o + 5] = by;
    F[o + 6] = r; F[o + 7] = g; F[o + 8] = b; F[o + 9] = a; F[o + 10] = type; F[o + 11] = p1; F[o + 12] = p2; F[o + 13] = p3;
  };
  // The far list after the play's in the one store (drawn first, into the far target): where it starts.
  Renderer.prototype.cineAppend = function () {   // (then the deep ones' and the small ones' after them)
    const need = (this.nf + this.nFar + this.nSt + this.nSm) * 14;
    if (need > this.fdata.length) { let n = this.fdata.length; while (n < need) n *= 2; const d = new Float32Array(n); d.set(this.fdata.subarray(0, this.nf * 14)); this.fdata = d; }
    this.fdata.set(this.fFar.subarray(0, this.nFar * 14), this.nf * 14); this.fdata.set(this.fSt.subarray(0, this.nSt * 14), (this.nf + this.nFar) * 14); this.fdata.set(this.fSm.subarray(0, this.nSm * 14), (this.nf + this.nFar + this.nSt) * 14);
    this.farStart = this.nf; this.stStart = this.nf + this.nFar; this.smStart = this.nf + this.nFar + this.nSt;
    return this.nf + this.nFar + this.nSt + this.nSm;
  };
}
// The 2.5D on or off as the game runs (owner: «сделай в настройках переключатель на 2d, как в примере… с деревней»): the targets and the canvas made
// again on the next frame (layout); 2D is the game as it is without the fork, but for the bonuses' look (CINE_ON.bonus)
function cineUse(on) { cinePref = !!on; }
function cineSync(th) { const want = cinePref && CINE_ON && CINE_DONE(th) ? CINE_ON : null; if (want !== CINE) { CINE = want; queueLayout(); } }   // (the targets and the canvas made again)
// A bonus under the eye rides its ledge's top face (the owner's pick of four ways, «2», for his rule «монеты и другие бонусы не должны соприкасаться с
// платформами… на минимальном расстоянии, не соприкасаясь даже под углом»): drawn as much higher as a ledge's top face would be at its foot, so it hovers the
// same small gap over the face at any angle, and never into what is over it. How many px to lift a thing of radius r at (x, y): 0 over the eye
function cineRide(lv, x, y, r, cam, H) {
  const under = y + r - (cam + H / 2);
  if (!CINE.on('vol') || under <= 0) return 0;
  let lift = Math.min(under * CINE.K, CINE.DEEP * lv.tile);
  for (const q of lv.rects) if (!q.gone && q.y1 <= y - r && q.y1 > y - r - lift - 3 * PIX.size && q.x1 > x - r && q.x0 < x + r) lift = Math.min(lift, Math.max(0, y - r - q.y1 - 2 * PIX.size));
  return Math.round(lift / PIX.size) * PIX.size;
}

// The walls' inner faces in 2.5D, from their edge in to the shaft's back (toward the eye in the middle), darker going in: after every far thing, so a far
// thing (a kit's far layer, a plane) never shows in front of a wall's face (draw calls it before the doors)
function cineFaces(rd, lv, cam, H, box) {
  const P = PIX.size, top = cam - 60, bot = cam + H + 60;
  if (CINE.on('vol')) {
    const ex = (lv.l + lv.r) / 2;
    const th = lv.theme, ink = (c) => (c.kind === 'ice' ? th.slick : c.kind === 'rubber' ? th.rubber : th.moss);   // a coat's own (as the coats are drawn)
    const runs = (side) => {   // a wall's height on the screen in pieces: its coats' inks where they line it (ice, rubber, moss), its own between
      const out = []; let y = top;
      for (const c of lv.coats.filter((c) => c.side === side && c.y1 > top && c.y0 < bot).sort((a, b) => a.y0 - b.y0)) { const a = Math.max(y, c.y0), b = Math.min(bot, c.y1); if (a > y) out.push([y, a, th.wall]); if (b > a) out.push([a, b, ink(c)]); y = Math.max(y, b); }
      if (y < bot) out.push([y, bot, th.wall]); return out;
    };
    const rt = rd.route; rd.route = 3;
    for (const [wx, s, side] of [[lv.l, 1, 1], [lv.r, -1, 2]]) { const dw = Math.abs(ex - wx) * CINE.K, n = Math.max(1, Math.round(dw / P)), rs = runs(side);
      for (let i = 0; i < n; i++) { const x = wx + s * i * P; for (const [y0, y1, c] of rs) box(s > 0 ? x : x - P, y0, s > 0 ? x + P : x - 0, y1, c, i < n / 3 ? 1.55 : i < (2 * n) / 3 ? 1.4 : 1.37, 0, 10, 0); } }
    rd.route = rt;
  }
}
// The world's own far shapes in planes, each sliding by its depth f of the climb (a shape's world y is its own plus (1 - f) of the camera's), drawn DIM into
// the far target: the Village a grove (cedars far, bamboo nearer), Tokyo a city (towers of flats far, lattice masts and pipes nearer, their small red lights).
function cineBack(rd, lv, cam, H, box, F, T) {
  const look = CINE_LOOK(lv.theme), t = lv.tile, P = PIX.size, snap = (v) => Math.round(v / P) * P, top = cam - 60, bot = cam + H + 60;
  rd.cineL = [];
  if (!CINE.on('depth') || !look.planes || lv.kind !== 'well') return;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ln = (x0, y0, x1, y1, c, a) => { const ax = (x1 - x0) / 2, ay = (y1 - y0) / 2, l = Math.hypot(ax, ay) || 1, hw = 0.55 * P; F((x0 + x1) / 2, (y0 + y1) / 2, ax, ay, (-ay / l) * hw, (ax / l) * hw, c, a, 10, l, hw, 0); };   // a thin line (as the renderer's line())
  const wy = (f, ys) => ys + cam * (1 - f);   // a plane's own y to the world's
  if (look.planes === 'bamboo') {
    for (const [f, gap, wd, c, a, s0] of [[0.32, 3.6, 0.9, PAL.purple, 1.1, 1], [0.58, 2.3, 0.36, PAL.green, 1.18, 2]]) {
      for (let i = 0; i < 12; i++) {
        const x = snap(lv.l + (i + 0.3 + 0.4 * hash(s0 * 31 + i)) * gap * t); if (x > lv.r - 0.2 * t) break;
        const hw = snap(wd * t * (0.8 + 0.4 * hash(s0 * 17 + i)) / 2) || P;
        box(x - hw, top, x + hw, bot, c, a, 0, 10, 0); if (CINE.on('vol')) { box(x - hw, top, x - hw + P, bot, c, a + 0.12, 0, 10, 0); box(x + hw - P, top, x + hw, bot, PAL.black, 1.2, 0, 10, 0); }   // a trunk, a stalk (round: lit left, dark right)
        const step = (f > 0.5 ? 1.4 : 2.6) * t, k0 = Math.floor((top - cam * (1 - f)) / step) - 1;
        for (let k = k0; wy(f, k * step) < bot; k++) {
          const y = snap(wy(f, k * step));
          if (f > 0.5) { box(x - hw - P, y, x + hw + P, y + P, c, a + 0.12, 0, 10, 0);   // its node
            if (hash(i * 7 + k) < 0.45) { const e = hash(i + k * 3) < 0.5 ? -1 : 1; F(x + e * 0.45 * t, y + 0.25 * t, e * 0.42 * t, 0.2 * t, -0.05 * t, e * 0.1 * t, c, a + 0.08, 0); } }   // a spray of leaves
          else if (hash(i * 5 + k) < 0.5) box(x - hw + P, y, x - hw + 2 * P, y + 0.9 * t, c, a + 0.1, 0, 10, 0);   // the bark's furrow
        }
      }
    }
  } else if (look.planes === 'city') {
    for (let i = 0; i < 6; i++) {   // flats far off (f 0.28): tall blocks, rows of windows, a few lit
      const f = 0.28, x0 = snap(lv.l + (i * 3.1 + 0.4 * hash(i)) * t), x1 = snap(x0 + (1.8 + 0.8 * hash(i + 9)) * t);
      if (x0 > lv.r) break;
      box(x0, top, Math.min(x1, lv.r), bot, PAL.purple, 1.08, 0, 10, 0);
      const step = 0.9 * t, k0 = Math.floor((top - cam * (1 - f)) / step) - 1;
      for (let k = k0; wy(f, k * step) < bot; k++) { const y = snap(wy(f, k * step)); for (let x = x0 + 0.3 * t; x < Math.min(x1, lv.r) - 0.35 * t; x += 0.55 * t) { const on = hash(i * 131 + k * 17 + Math.round(x)) < 0.12; box(snap(x), y, snap(x + 0.25 * t), y + snap(0.4 * t), on ? PAL.orange : PAL.black, on ? 1.3 : 1.2, 0, 10, 0); } }
    }
    for (let i = 0; i < 3; i++) {   // lattice masts and pipes nearer (f 0.55), their red lights blinking
      const f = 0.55, x = snap(lv.l + (2.2 + i * 5.4 + 0.8 * hash(i + 40)) * t), w = snap(0.9 * t);
      if (x + w > lv.r) break;
      box(x, top, x + P, bot, PAL.purple, 1.2, 0, 10, 0); box(x + w, top, x + w + P, bot, PAL.purple, 1.2, 0, 10, 0);
      const step = 1.2 * t, k0 = Math.floor((top - cam * (1 - f)) / step) - 1;
      for (let k = k0; wy(f, k * step) < bot; k++) {
        const y = snap(wy(f, k * step)), cy = y + step / 2;
        box(x, y, x + w + P, y + P, PAL.purple, 1.2, 0, 10, 0);
        ln(x, y, x + w, y + step, PAL.purple, 1.2); ln(x + w, y, x, y + step, PAL.purple, 1.2);   // its braces
        if (hash(i * 13 + k) < 0.12) { const on = Math.floor(T * 1.4 + i + k * 0.3) % 2 === 0; box(x - P, cy, x + P, cy + 2 * P, PAL.red, on ? 1.35 : 1.15, 0, 10, 0); if (on) rd.cineL.push([x, cy, 1.1 * t, 0.35, [1.0, 0.25, 0.2]]); }   // a red light
      }
      const px = snap(x + w + 0.9 * t); box(px, top, px + 2 * P, bot, PAL.gray, 1.12, 0, 10, 0);   // a pipe beside it
    }
  }
}

// Motes in the air, in front of the play but small and dim: dust everywhere, the Village's fireflies (each a light) and falling petals, Tokyo's rain,
// embers elsewhere. Kept in a band round the view; each one that leaves it starts again at its top or anywhere in it.
function cineMotes(rd, g, lv, cam, H, box, disc, T) {
  { const dt0 = CINE.fxT == null ? 0 : Math.max(0, Math.min(0.05, T - CINE.fxT)); CINE.fxT = T; const h = g.hero; if (CINE.hp && dt0 > 0) CINE.hv = Math.hypot(h.cx - CINE.hp[0], h.cy - CINE.hp[1]) / dt0; CINE.hp = [h.cx, h.cy];
    if (CINE.fx.length && CINE.fx.lv !== lv) CINE.fx.length = 0; CINE.fx.lv = lv; cineFx(g, lv, cam, H, box, dt0); }   // (what the pokes shed: see cinePoke)
  if (!CINE.on('motes')) return;
  const look = CINE_LOOK(lv.theme), t = lv.tile, P = PIX.size, snap = (v) => Math.round(v / P) * P, M = CINE.motes;
  const dt = CINE.lastT == null ? 0 : Math.max(0, Math.min(0.05, T - CINE.lastT)); CINE.lastT = T;
  const want = []; for (const [k, n] of Object.entries(look.motes)) for (let i = 0; i < n; i++) want.push(k);
  if (M.length !== want.length || M.theme !== lv.theme) { M.length = 0; M.theme = lv.theme; for (const k of want) M.push({ k, x: 0, y: 1e9, ph: Math.random() * 6.28 }); }
  const spawn = (m, any) => { m.x = lv.l + Math.random() * (lv.r - lv.l); m.y = any ? cam + Math.random() * H : cam - 10 - Math.random() * 40; m.ph = Math.random() * 6.28;
    m.vx = m.k === 'rain' ? -60 : (Math.random() - 0.5) * 12; m.vy = m.k === 'rain' ? 520 + Math.random() * 120 : m.k === 'petal' ? 22 + Math.random() * 18 : m.k === 'snow' ? 16 + Math.random() * 14 : m.k === 'ember' ? -26 - Math.random() * 20 : (Math.random() - 0.5) * 8; };
  for (const m of M) {
    if (m.y > cam + H + 30 || m.y < cam - 60 || m.x < lv.l - 10 || m.x > lv.r + 10) spawn(m, m.y === 1e9 || m.k !== 'rain' && m.k !== 'petal' && m.k !== 'snow');
    m.ph += dt;
    m.x += (m.vx + (m.k === 'petal' ? Math.sin(m.ph * 2.1) * 18 : m.k === 'snow' ? Math.sin(m.ph * 1.7) * 10 : m.k === 'fly' ? Math.sin(m.ph * 1.3) * 14 : 0)) * dt; m.y += (m.vy + (m.k === 'fly' ? Math.cos(m.ph * 0.9) * 10 : 0)) * dt;
    const x = snap(m.x), y = snap(m.y);
    if (m.k === 'dust') box(x, y, x + P, y + P, PAL.gray, 1.45, 0, 10, 0);
    else if (m.k === 'petal') box(x, y, x + 2 * P, y + P, PAL.purple, 1.7, 0, 10, 0);
    else if (m.k === 'rain') box(x, y, x + P, y + 3 * P, PAL.gray, 1.4, 0, 10, 0);
    else if (m.k === 'ember') box(x, y, x + P, y + P, PAL.orange, 1, 0, 10, 0);
    else if (m.k === 'snow') box(x, y, x + P, y + P, PAL.white, 1.45, 0, 10, 0);
    else if (m.k === 'fly') { const on = 0.5 + 0.5 * Math.sin(m.ph * 2.4); if (on > 0.25) box(x, y, x + P, y + P, PAL.white, 1, 0, 10, 0); rd.cineL.push([m.x, m.y, 1.0 * t, 0.45 * on, [0.62, 1.0, 0.42]]); }
  }
}

// The light on this screen: the kits' lamps (vlamps), the coins nearest the hero, the doors, Tokyo's lit neon, the way out, the fire's top, the hero's own
// faint light, a moon; the planes' and the fireflies' (rd.cineL). Each [x, y, radius, strength, colour], the world's px.
function cineLights(rd, g, lv, vlamps) {
  const R = lv.R, hero = g.hero, look = CINE_LOOK(lv.theme), L = [];
  const add = (x, y, r, i, c) => L.push([x, y, r, i, c]);
  for (const [x, y, r0 = 0.9, r1 = 2.6] of vlamps) add(x, y, Math.max(2.2, r1 * 1.25) * R, 0.85, [1.0, 0.6, 0.26]);
  const near = (o) => (o.x - hero.cx) ** 2 + (o.y - hero.cy) ** 2;
  for (const c of lv.coins.slice().sort((a, b) => near(a) - near(b)).slice(0, 6)) add(c.x, c.y, 1.4 * R, 0.4, [1.0, 0.82, 0.3]);
  for (const b of lv.bubbles) add(b.x, b.y, 2.8 * R, 0.6, b.kind === 'shop' ? [1.0, 0.3, 0.25] : [0.75, 0.45, 1.0]);
  if (lv.neonLit) for (const [k] of lv.neonLit) { const s = neonSign(lv, k); if (s) add((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 3.2 * R, 0.75, s.ink === PAL.blue ? [0.35, 0.65, 1.0] : [1.0, 0.25, 0.22]); }
  if (lv.exit) add((lv.exit.x0 + lv.exit.x1) / 2, (lv.exit.y0 + lv.exit.y1) / 2, 2.6 * R, 0.5, [0.85, 0.92, 1.0]);
  if (lv.fire) add((lv.l + lv.r) / 2, lv.fire.y, 7 * R, 0.9, [1.0, 0.42, 0.15]);
  add(hero.cx, hero.cy, 3.4 * R, 0.22, [0.85, 0.9, 1.0]);
  for (const l of rd.cineL || []) add(...l);
  if (look.moon) add(lv.l + 0.18 * (lv.r - lv.l), lv.cam - 0.3 * rd.h, 1.25 * rd.h, 0.18, look.moon);
  return L;
}

// The passes after the scene: what is behind blurred (half size), the play's coverage softened (a quarter), the rays (a quarter), then the picture on the canvas.
Renderer.prototype.cinePost = function (g, lv, sx, sy, vlamps) {
  const gl = this.gl, c = this.cine, [lw, lh] = this.low, W = this.w, H = this.h, look = CINE_LOOK(lv.theme), on = CINE.on;
  gl.disable(gl.BLEND); gl.bindVertexArray(this.emptyVao);
  const tex = (unit, tx, u) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(u, unit); };
  const pass = (tg, prog, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.fb : null); gl.viewport(0, 0, tg ? tg.w : this.canvas.width, tg ? tg.h : this.canvas.height); gl.useProgram(prog.p); set(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const blur = (a, b, src) => { pass(a, this.pBlur, (u) => { tex(0, src.tex, u.uTex); gl.uniform2f(u.uDir, 1 / a.w, 0); }); pass(b, this.pBlur, (u) => { tex(0, a.tex, u.uTex); gl.uniform2f(u.uDir, 0, 1 / b.h); }); };
  if (on('dof')) { pass(c.h1, this.pCopy, (u) => tex(0, c.far.tex, u.uTex)); blur(c.h2, c.h1, c.h1); }   // what is behind, out of focus: in h1
  pass(c.q1, this.pAlpha, (u) => { tex(0, c.st.tex, u.uTex); tex(1, c.sm.tex, u.uTex2); }); blur(c.q2, c.q3, c.q1);   // the things' coverage in q1, softened in q3 (where to look for depth; the shadow's)
  const toUv = (x, y) => [(x + sx) / W, 1 - (y + sy) / H];
  const L = cineLights(this, g, lv, vlamps).filter(([x, y, r]) => y + sy > -r && y + sy < H + r).sort((a, b) => b[3] * b[2] - a[3] * a[2]);
  const rays = on('rays') ? L.filter((l) => l[2] > 1.6 * lv.R).slice(0, 4) : [];
  if (rays.length) pass(c.q2, this.pRays, (u) => {
    tex(0, c.q1.tex, u.uOcc); const R4 = new Float32Array(16), C4 = new Float32Array(12);
    rays.forEach(([x, y, r, i, col], j) => { const [ux, uy] = toUv(x, y); R4.set([ux, uy, (r * 1.8) / H, i], j * 4); C4.set(col, j * 3); });
    gl.uniform4fv(u['uR[0]'], R4); gl.uniform3fv(u['uRC[0]'], C4); gl.uniform1i(u.uNR, rays.length); gl.uniform1f(u.uAsp, W / H);
  });
  const lights = on('light') || on('glow') ? L.slice(0, 16) : [];
  pass(null, this.pComp, (u) => {
    tex(0, c.far.tex, u.uFar); tex(1, c.h1.tex, u.uFarB); tex(2, c.play.tex, u.uPlay); tex(3, c.q3.tex, u.uSoft); tex(4, c.q2.tex, u.uRays); tex(5, c.st.tex, u.uSt); tex(6, c.sm.tex, u.uSm);
    gl.uniform3fv(u.uWhite, lv.theme.wall);
    gl.uniform2f(u.uEye, (((lv.l + lv.r) / 2 + sx) / W) * lw, 0.5 * lh); gl.uniform2f(u.uK3, on('vol') ? CINE.K : 0, (CINE.DEEP * lv.tile) / PIX.size); gl.uniform2f(u.uK4, on('vol') ? CINE.K : 0, (CINE.SMALL * lv.tile) / PIX.size);   // 2.5D: the eye in the middle, the deepest each kind goes
    gl.uniform2f(u.uLow, lw, lh); gl.uniform2f(u.uWell, (lv.l + sx) / W, (lv.r + sx) / W); gl.uniform1f(u.uAsp, W / H); gl.uniform1f(u.uTime, lv.t);
    gl.uniform2f(u.uShOff, -3 / lw, 8 / lh); gl.uniform2f(u.uExOff, -1 / lw, 3 / lh);
    const LU = new Float32Array(64), LC = new Float32Array(48);
    lights.forEach(([x, y, r, i, col], j) => { const [ux, uy] = toUv(x, y); LU.set([ux, uy, r / H, on('light') ? i : 0], j * 4); LC.set(col, j * 3); });
    gl.uniform4fv(u['uL[0]'], LU); gl.uniform3fv(u['uLC[0]'], LC); gl.uniform1i(u.uNL, lights.length);
    gl.uniform4f(u.uK, on('dof') ? 0.5 : 0, on('fog') ? 0.6 : 0, on('shadow') ? 0.85 : 0, on('extrude') ? 1 : 0);
    gl.uniform4f(u.uK2, on('light') ? look.amb : 1, rays.length ? 0.8 : 0, on('glow') ? 0.7 : 0, on('grade') ? 0.03 : 0);
    gl.uniform3fv(u.uFogC, look.fog); gl.uniform3fv(u.uShadeC, look.shade); gl.uniform1f(u.uGrade, on('grade') ? 1 : 0);
  });
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
  gl.enable(gl.BLEND);
};

// The world answers the hero (owner 2026-10-22: «легкое взаимодействие героя с объектами мира: у дерева опадают листья или колышется крона, пугало чуть
// наклоняется и из него вылетает птица»). A thing the hero comes into (its box, POKE.reach tiles round it) is poked, as hard as the hero moves: it sways,
// leaning away from the hero and back, a decaying swing, its top the most (the shear its drawing takes, see the Village's props and Tokyo's bonsai); it
// sheds what it sheds (a sakura its petals, a bonsai needles), which fall and lie on its ledge a while; a scarecrow's crow flies off and is back only later.
// The digest's §8: the juice medium, a peak only for a hard poke; it starts at once and is over in about a second; the world remembers (petals lying, the
// crow gone); with the system asking for less motion nothing sways and less is shed. A rustle with each (a short soft gust), wings with the crow.
const POKE = { reach: 0.5, cool: 1.0, decay: 3.0, freq: 10, back: 18, still: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
  kinds: { sakura: { sway: 0.06, shed: 'petal', n: 8 }, scarecrow: { sway: 0.09, bird: true }, koinobori: { sway: 0.05 }, bonsai: { sway: 0.08, shed: 'needle', n: 5 },
    bats: { sway: 0, bats: true }, cart: { sway: 0.06, clunk: true },   // (the Mine's: sleeping bats wake and fly off, a cart rocks on its rails)
    bell: { sway: 0.05, ding: true }, pine: { sway: 0.06, shed: 'snow', n: 6 }, snowman: { sway: 0.07 } } };   // (Fuji's: a rung bell nudged dings low, a pine sheds snow, a
    // snowman's bucket wobbles)
function cinePoke(g, lv, r, kind, x0, y0, x1, y1, perch) {
  const k = POKE.kinds[kind];
  if (!CINE || !CINE.on('poke') || !k) return 0;
  const H = g.hero, t = lv.tile, T = lv.t, P = r.poke || (r.poke = { t: -9, s: 0, d: 1, was: false, back: 0 });
  const m = POKE.reach * t, inside = g.state === 'play' && H.maxX > x0 - m && H.minX < x1 + m && H.maxY > y0 - m && H.minY < y1 + m;
  if (inside && !P.was && T - P.t > POKE.cool) {
    P.t = T; P.s = Math.min(1, 0.4 + (CINE.hv || 0) / (10 * lv.R)); P.d = H.cx < (x0 + x1) / 2 ? 1 : -1;
    if (k.shed) for (let i = 0, n = Math.max(1, Math.round(k.n * P.s * (POKE.still ? 0.4 : 1))); i < n; i++)
      CINE.fx.push({ k: k.shed, x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0) * 0.5, vx: P.d * (15 + Math.random() * 35), vy: 5 + Math.random() * 20, ph: Math.random() * 6.28, on: r, life: 0 });
    if (k.bird && perch && P.back <= T) { CINE.fx.push({ k: 'bird', x: perch[0], y: perch[1], vx: P.d * (90 + Math.random() * 50), vy: -(150 + Math.random() * 60), life: 0 }); P.back = T + POKE.back; if (typeof sound !== 'undefined') sound.play('airjump', 0.25, 1.9); }
    if (k.bats && perch && P.back <= T) { perch.forEach(([x, y], i) => CINE.fx.push({ k: 'bat', x, y, vx: P.d * (50 + Math.random() * 70) * (i % 2 ? 1 : -0.6), vy: -(60 + Math.random() * 90), life: -0.12 * i })); P.back = T + POKE.back; if (typeof sound !== 'undefined') sound.play('airjump', 0.2, 2.4); }   // (one after another)
    if (typeof sound !== 'undefined') { if (k.clunk) sound.play('land', 0.25, 0.6); else if (k.ding) sound.note(0, 0.12); else if (!k.bats && sound.gust) sound.gust(P.d, 0.3, 0.1 + 0.12 * P.s); }   // (a ding
    // lower and quieter than the task's ring)
  }
  P.was = inside;
  const e = T - P.t;
  return POKE.still || e > 2.2 ? 0 : k.sway * P.s * P.d * Math.exp(-e * POKE.decay) * Math.sin(e * POKE.freq);
}
const cinePerched = (r, T) => !r.poke || r.poke.back <= T;   // a scarecrow's crow on its hand (back from its flight)
function cineSpr(box, rows, x, y, ink) {   // a CRITTER picture a game pixel a dot, centred on x, its foot at y (as the renderer's spr)
  const s = PIX.size, x0 = Math.round(x / s) * s - (rows[0].length * s) / 2, y0 = Math.round(y / s) * s - rows.length * s;
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') box(x0 + i * s, y0 + j * s, x0 + (i + 1) * s, y0 + (j + 1) * s, row[i] === 'w' ? INK.white : row[i] === 'k' ? PAL.black : ink, 1, 0, 10, 0); });
}
// What the pokes shed and send off, each frame (in front, flat): petals and needles falling, lying on their ledge a while, fading; a crow flying off.
function cineFx(g, lv, cam, H, box, dt) {
  const P = PIX.size, snap = (v) => Math.round(v / P) * P, F = CINE.fx, ink = lv.theme.wall;
  for (let i = F.length - 1; i >= 0; i--) {
    const f = F[i]; f.life += dt;
    if (f.k === 'bird') {
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 40 * dt;
      if (f.y < cam - 60 || f.x < lv.l - 40 || f.x > lv.r + 40) { F.splice(i, 1); continue; }
      cineSpr(box, CRITTER[(Math.floor(f.life * 9) % 2 ? 'crowUp' : 'crowDown') + (f.vx > 0 ? '' : 'L')], f.x, f.y, ink); continue;
    }
    if (f.k === 'bat') {   // a bat woken: it drops, then flaps off up, zigzagging (life < 0: still waiting its turn, hanging)
      if (f.life < 0) continue;
      f.x += (f.vx + Math.sin(f.life * 11) * 30) * dt; f.y += (f.life < 0.15 ? 60 : f.vy) * dt; f.vy -= 25 * dt;
      if (f.y < cam - 60 || f.x < lv.l - 40 || f.x > lv.r + 40) { F.splice(i, 1); continue; }
      cineSpr(box, CRITTER[Math.floor(f.life * 12) % 2 ? 'batUp' : 'batDown'], f.x, f.y, ink); continue;
    }
    const r = f.on, lying = f.rest != null;
    if (!lying) {
      f.ph += dt; f.vy = Math.min(45, f.vy + 30 * dt); f.vx *= 1 - 1.2 * dt; f.x += (f.vx + Math.sin(f.ph * 2.3) * 14) * dt; f.y += f.vy * dt;
      if (r && !r.gone && f.y >= r.y0 - P && f.y < r.y0 + P && f.x > r.x0 && f.x < r.x1) { f.rest = 0; f.y = r.y0 - P; }
      if (f.y > cam + H + 30) { F.splice(i, 1); continue; }
    } else { f.rest += dt; if (f.rest > 7.5 || (r && r.gone)) { F.splice(i, 1); continue; } }
    const a = lying && f.rest > 6 ? 1 - (f.rest - 6) / 1.5 : 1, x = snap(f.x), y = snap(f.y);
    if (f.k === 'petal') box(x, y, x + 2 * P, y + P, PAL.purple, a, 0, 10, 0); else if (f.k === 'snow') box(x, y, x + P, y + P, PAL.white, lying ? 1.6 : 1.5, 0, 10, 0); else box(x, y, x + P, y + 2 * P, PAL.green, a, 0, 10, 0);
  }
}
