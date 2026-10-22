// Pixel Art + Cinematic 3D, an experiment (owner 2026-10-22: «Pixel Art + Cinematic 3D. Геометрия остаётся практически неизменной, но появляются объёмный
// свет, параллакс, глубина, частицы и 3D-эффекты. Визуально ближе к The Last Night»; his picture research/style/cine-reference-tokyo.png). Off unless the page
// is opened with ?cine (all of it) or ?cine=a,b,... naming the parts: light (the world dark but round its lights), glow (a soft halo round each light), rays
// (light through the gaps between ledges), fog (a haze drifting over what is behind), dof (what is behind out of focus), shadow (the play's soft shadow on the
// wall behind it), extrude (a little of the ledges' thickness), depth (planes of the world's own far shapes sliding at their depth), motes (dust, fireflies,
// petals, rain), grade (a vignette, the shadows toned, grain). ?res=k draws the canvas k times the game's pixels (default 2), the lighting that smooth.
// How: what is drawn behind the shaft (the kits' far layers and wall props, all in a DIM tone: see DEPTH) goes into a target of its own; the play stays in
// sharp game pixels in another (see Renderer.prototype.draw's CINE lines); a pass at the canvas's size puts the two together (cinePost).
const CINE = (() => {
  const m = /[?&]cine(?:=([^&]*))?/.exec(location.search);
  if (!m) return null;
  const set = new Set((!m[1] ? 'vol,light,glow,shadow,motes,grade,depth,rays,fog' : m[1] === 'all' ? 'vol,light,glow,shadow,motes,grade,depth,rays,fog,dof,extrude' : m[1]).split(','));   // (owner 2026-10-22: «Визуальна разница минимальна, просто добавляется размытие… добавить объема платформам и деревьям сделав их в 2.5d»: the blur off, the volume on)
  const r = /[?&]res=(\d)/.exec(location.search);
  return { on: (k) => set.has(k), k: r ? Math.max(1, Math.min(4, +r[1])) : 2, motes: [], lastT: null, light: [], K: 0.06 };
})();
// Each world's air: its haze, the tone its shadows take, how dark it is away from its lights, a moon or none, its motes, its far planes.
const CINE_LOOK = (th) => th.village ? { fog: [0.13, 0.15, 0.27], shade: [0.012, 0.016, 0.045], amb: 0.5, moon: [0.62, 0.72, 1.0], motes: { dust: 14, fly: 7, petal: 10 }, planes: 'bamboo' }
  : th.town ? { fog: [0.2, 0.08, 0.24], shade: [0.03, 0.01, 0.04], amb: 0.48, moon: null, motes: { dust: 12, rain: 34 }, planes: 'city' }
  : { fog: [0.12, 0.12, 0.17], shade: [0.015, 0.015, 0.03], amb: 0.55, moon: null, motes: { dust: 16, ember: 6 }, planes: null };

const CINE_COPY_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uTex; void main() { o = texture(uTex, vUv); }`;
const CINE_ALPHA_FS = GLSL + `in vec2 vUv; out vec4 o; uniform sampler2D uTex; void main() { float a = texture(uTex, vUv).a; o = vec4(a, a, a, 1.0); }`;
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
uniform sampler2D uFar, uFarB, uPlay, uSoft, uRays; uniform vec2 uLow, uWell, uShOff, uExOff; uniform float uAsp, uTime;
uniform vec4 uL[16]; uniform vec3 uLC[16]; uniform int uNL; uniform vec4 uK; uniform vec4 uK2; uniform vec3 uFogC, uShadeC; uniform float uGrade;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec2 uv = vUv; ivec2 tc = clamp(ivec2(floor(uv * uLow)), ivec2(0), ivec2(uLow) - 1);
  vec4 pl = texelFetch(uPlay, tc, 0);
  vec3 col = texelFetch(uFar, tc, 0).rgb;
  bool well = uv.x > uWell.x && uv.x < uWell.y;
  if (well) {
    col = mix(col, texture(uFarB, uv).rgb, uK.x);   // out of focus
    col *= 1.0 - uK.z * texture(uSoft, uv + uShOff).r;   // the play's soft shadow
    vec2 eu = uv + uExOff; vec4 ex = texelFetch(uPlay, clamp(ivec2(floor(eu * uLow)), ivec2(0), ivec2(uLow) - 1), 0);
    if (pl.a < 0.5 && ex.a > 0.5 && texture(uSoft, eu).r > 0.45) col = mix(col, ex.rgb * 0.3, uK.w);   // its thickness (the big shapes only: not the coins')
  }
  vec3 L = vec3(uK2.x), G = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uNL) break;
    vec2 d = (uv - uL[i].xy) * vec2(uAsp, 1.0); float r = length(d) / uL[i].z, f = max(0.0, 1.0 - r);
    L += uLC[i] * f * f * uL[i].w; G += uLC[i] * exp(-r * r * 36.0) * uL[i].w;
  }
  col *= L;
  if (well) {   // the haze: faint and dark, drifting, thicker low down; lit where a light reaches it through the gaps (the rays)
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

if (CINE) {
  const gumMake = Renderer.prototype.makeTarget, gumFeat = Renderer.prototype.feat, gumInitW = Renderer.prototype.init;
  Renderer.prototype.init = function () {
    if (!gumInitW.call(this)) return false;
    try {
      const gl = this.gl;
      this.pCopy = program(gl, BG_VS, CINE_COPY_FS); this.pAlpha = program(gl, BG_VS, CINE_ALPHA_FS); this.pBlur = program(gl, BG_VS, CINE_BLUR_FS);
      this.pRays = program(gl, BG_VS, CINE_RAYS_FS); this.pComp = program(gl, BG_VS, CINE_COMP_FS);
    } catch (err) { console.error(err); return false; }
    this.fFar = new Float32Array(14 * 512); this.nFar = 0; this.toFar = false;
    this.cine = null; if (this.low) this.makeTarget();
    return true;
  };
  // The targets: the play's (a texture now, so it can be read; its stencil as before), what is behind, and the small ones the blurs and the rays use.
  Renderer.prototype.makeTarget = function () {
    const gl = this.gl, [lw, lh] = this.low;
    if (!this.pComp) return gumMake.call(this);
    const tex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    const target = (w, h, rb) => { const t = tex(w, h), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (rb) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb); return { fb, tex: t, w, h }; };
    const old = this.cine; if (old) { for (const k of ['far', 'h1', 'h2', 'q1', 'q2', 'q3']) { gl.deleteFramebuffer(old[k].fb); gl.deleteTexture(old[k].tex); } gl.deleteFramebuffer(old.play.fb); gl.deleteTexture(old.play.tex); gl.deleteRenderbuffer(old.stencil); }
    const st = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, st); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, lw, lh);
    const hw = Math.max(1, lw >> 1), hh = Math.max(1, lh >> 1), qw = Math.max(1, lw >> 2), qh = Math.max(1, lh >> 2);
    const c = this.cine = { stencil: st, play: target(lw, lh, st), far: target(lw, lh), h1: target(hw, hh), h2: target(hw, hh), q1: target(qw, qh), q2: target(qw, qh), q3: target(qw, qh) };
    this.target = { fb: c.play.fb, tex: c.play.tex };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
  };
  // While the kits draw what is behind the shaft (draw sets toFar), what they draw in a DIM tone goes into the far list; the rest stays in the play.
  Renderer.prototype.feat = function (cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3) {
    if (!this.toFar || !(a > 1.001 && a < 1.36)) return gumFeat.call(this, cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3);
    if ((this.nFar + 1) * 14 > this.fFar.length) { const d = new Float32Array(this.fFar.length * 2); d.set(this.fFar); this.fFar = d; }
    const F = this.fFar, o = this.nFar++ * 14;
    F[o] = cx; F[o + 1] = cy; F[o + 2] = ax; F[o + 3] = ay; F[o + 4] = bx; F[o + 5] = by;
    F[o + 6] = r; F[o + 7] = g; F[o + 8] = b; F[o + 9] = a; F[o + 10] = type; F[o + 11] = p1; F[o + 12] = p2; F[o + 13] = p3;
  };
  // The far list after the play's in the one store (drawn first, into the far target): where it starts.
  Renderer.prototype.cineAppend = function () {
    const need = (this.nf + this.nFar) * 14;
    if (need > this.fdata.length) { let n = this.fdata.length; while (n < need) n *= 2; const d = new Float32Array(n); d.set(this.fdata.subarray(0, this.nf * 14)); this.fdata = d; }
    this.fdata.set(this.fFar.subarray(0, this.nFar * 14), this.nf * 14);
    this.farStart = this.nf;
    return this.nf + this.nFar;
  };
}

// The world's own far shapes in planes, each sliding by its depth f of the climb (a shape's world y is its own plus (1 - f) of the camera's), drawn DIM into
// the far target: the Village a grove (cedars far, bamboo nearer), Tokyo a city (towers of flats far, lattice masts and pipes nearer, their small red lights).
function cineBack(rd, lv, cam, H, box, F, T) {
  const look = CINE_LOOK(lv.theme), t = lv.tile, P = PIX.size, snap = (v) => Math.round(v / P) * P, top = cam - 60, bot = cam + H + 60;
  rd.cineL = [];
  if (CINE.on('vol')) {   // 2.5D: the walls' inner faces, from their edge in to the shaft's back (toward the eye in the middle), darker going in
    const ex = (lv.l + lv.r) / 2;
    for (const [wx, s] of [[lv.l, 1], [lv.r, -1]]) { const dw = Math.abs(ex - wx) * CINE.K, n = Math.max(1, Math.round(dw / P)); for (let i = 0; i < n; i++) { const x = wx + s * i * P; box(s > 0 ? x : x - P, top, s > 0 ? x + P : x - 0, bot, lv.theme.wall, i < n / 3 ? 1.55 : i < (2 * n) / 3 ? 1.4 : 1.37, 0, 10, 0); } }
  }
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
  if (!CINE.on('motes')) return;
  const look = CINE_LOOK(lv.theme), t = lv.tile, P = PIX.size, snap = (v) => Math.round(v / P) * P, M = CINE.motes;
  const dt = CINE.lastT == null ? 0 : Math.max(0, Math.min(0.05, T - CINE.lastT)); CINE.lastT = T;
  const want = []; for (const [k, n] of Object.entries(look.motes)) for (let i = 0; i < n; i++) want.push(k);
  if (M.length !== want.length || M.theme !== lv.theme) { M.length = 0; M.theme = lv.theme; for (const k of want) M.push({ k, x: 0, y: 1e9, ph: Math.random() * 6.28 }); }
  const spawn = (m, any) => { m.x = lv.l + Math.random() * (lv.r - lv.l); m.y = any ? cam + Math.random() * H : cam - 10 - Math.random() * 40; m.ph = Math.random() * 6.28;
    m.vx = m.k === 'rain' ? -60 : (Math.random() - 0.5) * 12; m.vy = m.k === 'rain' ? 520 + Math.random() * 120 : m.k === 'petal' ? 22 + Math.random() * 18 : m.k === 'ember' ? -26 - Math.random() * 20 : (Math.random() - 0.5) * 8; };
  for (const m of M) {
    if (m.y > cam + H + 30 || m.y < cam - 60 || m.x < lv.l - 10 || m.x > lv.r + 10) spawn(m, m.y === 1e9 || m.k !== 'rain' && m.k !== 'petal');
    m.ph += dt;
    m.x += (m.vx + (m.k === 'petal' ? Math.sin(m.ph * 2.1) * 18 : m.k === 'fly' ? Math.sin(m.ph * 1.3) * 14 : 0)) * dt; m.y += (m.vy + (m.k === 'fly' ? Math.cos(m.ph * 0.9) * 10 : 0)) * dt;
    const x = snap(m.x), y = snap(m.y);
    if (m.k === 'dust') box(x, y, x + P, y + P, PAL.gray, 1.45, 0, 10, 0);
    else if (m.k === 'petal') box(x, y, x + 2 * P, y + P, PAL.purple, 1.7, 0, 10, 0);
    else if (m.k === 'rain') box(x, y, x + P, y + 3 * P, PAL.gray, 1.4, 0, 10, 0);
    else if (m.k === 'ember') box(x, y, x + P, y + P, PAL.orange, 1, 0, 10, 0);
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
  pass(c.h1, this.pCopy, (u) => tex(0, c.far.tex, u.uTex)); blur(c.h2, c.h1, c.h1);   // what is behind, out of focus: in h1
  pass(c.q1, this.pAlpha, (u) => tex(0, c.play.tex, u.uTex)); blur(c.q2, c.q3, c.q1);   // the play's coverage in q1, softened in q3
  const toUv = (x, y) => [(x + sx) / W, 1 - (y + sy) / H];
  const L = cineLights(this, g, lv, vlamps).filter(([x, y, r]) => y + sy > -r && y + sy < H + r).sort((a, b) => b[3] * b[2] - a[3] * a[2]);
  const rays = on('rays') ? L.filter((l) => l[2] > 1.6 * lv.R).slice(0, 4) : [];
  pass(c.q2, this.pRays, (u) => {
    tex(0, c.q1.tex, u.uOcc); const R4 = new Float32Array(16), C4 = new Float32Array(12);
    rays.forEach(([x, y, r, i, col], j) => { const [ux, uy] = toUv(x, y); R4.set([ux, uy, (r * 1.8) / H, i], j * 4); C4.set(col, j * 3); });
    gl.uniform4fv(u['uR[0]'], R4); gl.uniform3fv(u['uRC[0]'], C4); gl.uniform1i(u.uNR, rays.length); gl.uniform1f(u.uAsp, W / H);
  });
  const lights = on('light') || on('glow') ? L.slice(0, 16) : [];
  pass(null, this.pComp, (u) => {
    tex(0, c.far.tex, u.uFar); tex(1, c.h1.tex, u.uFarB); tex(2, c.play.tex, u.uPlay); tex(3, c.q3.tex, u.uSoft); tex(4, c.q2.tex, u.uRays);
    gl.uniform2f(u.uLow, lw, lh); gl.uniform2f(u.uWell, (lv.l + sx) / W, (lv.r + sx) / W); gl.uniform1f(u.uAsp, W / H); gl.uniform1f(u.uTime, lv.t);
    gl.uniform2f(u.uShOff, -3 / lw, 8 / lh); gl.uniform2f(u.uExOff, -1 / lw, 3 / lh);
    const LU = new Float32Array(64), LC = new Float32Array(48);
    lights.forEach(([x, y, r, i, col], j) => { const [ux, uy] = toUv(x, y); LU.set([ux, uy, r / H, on('light') ? i : 0], j * 4); LC.set(col, j * 3); });
    gl.uniform4fv(u['uL[0]'], LU); gl.uniform3fv(u['uLC[0]'], LC); gl.uniform1i(u.uNL, lights.length);
    gl.uniform4f(u.uK, on('dof') ? 0.5 : 0, on('fog') ? 0.6 : 0, on('shadow') ? 0.85 : 0, on('extrude') ? 1 : 0);
    gl.uniform4f(u.uK2, on('light') ? look.amb : 1, on('rays') ? 0.8 : 0, on('glow') ? 0.7 : 0, on('grade') ? 0.03 : 0);
    gl.uniform3fv(u.uFogC, look.fog); gl.uniform3fv(u.uShadeC, look.shade); gl.uniform1f(u.uGrade, on('grade') ? 1 : 0);
  });
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
  gl.enable(gl.BLEND);
};

// 2.5D (owner: «добавить объема платформам… сделав их в 2.5d»): each ledge a block in depth, its back face toward the eye in the middle of the screen (a
// vanishing point), so the faces between show: its top while it is below the eye, its underside above it, its free end's side on the side the eye is;
// the faces in its own ink, darker going in. Drawn before the ledge, so its front is what it always was; the game's rect does not change.
function cineVol(rd, lv, r, box, F, cam, H) {
  if (!CINE.on('vol') || r.cap || r.cage || r.gone || r.spring) return;
  const th = lv.theme, t = lv.tile, P = PIX.size, snap = (v) => Math.round(v / P) * P, K = CINE.K;
  const ex = (lv.l + lv.r) / 2, ey = cam + 0.5 * H, cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  const ox = snap(Math.max(-0.45 * t, Math.min(0.45 * t, (ex - cx) * K))), oy = snap(Math.max(-0.7 * t, Math.min(0.7 * t, (ey - cy) * K)));
  const c = cineFront(lv, r);   // its depth in its front's colour, in tones of it (owner: «тот же цвет что и на торце, но с разной тональностью»)
  const wl = r.x0 <= lv.l + 1, wr = r.x1 >= lv.r - 1, sh = r.crumbling ? Math.sin(lv.t * 70) * 1.8 * (r.t / CRUMBLE.time) : 0;
  const x0 = r.x0 + sh, x1 = r.x1 + sh, xa = wl ? lv.l : x0, xb = wr ? lv.r : x1, hw = (xb - xa) / 2, mx = (xa + xb) / 2;
  const para = (x, y, ax, ay, bx, by, col, a) => F(x, y, ax, ay, bx, by, col, a, 10, 1, 1, 0);   // a parallelogram: its middle, half its front edge, half its depth
  if (oy < 0) {   // its top, seen from above: the surface's own colour (the Village's grass, an awning's cloth), darker at its back
    para(mx + ox / 4, r.y0 + oy / 4, hw, 0, ox / 4, oy / 4, c, 1); para(mx + (3 * ox) / 4, r.y0 + (3 * oy) / 4, hw, 0, ox / 4, oy / 4, c, 1.75);   // lit at its front, a tone darker going back
    if (!r.bouncy) para(mx + ox / 4, r.y0 + oy / 4, hw, 0, ox / 4, oy / 4, PAL.white, 0.22);   // the light on it: a sheen, dithered
    if (r.bouncy && th.town) { const n = Math.max(4, Math.round((x1 - x0) / (0.4 * t))), cw = (x1 - x0) / n; for (let i = 1; i < n; i += 2) para(x0 + (i + 0.5) * cw + ox / 2, r.y0 + oy / 2, cw / 2, 0, ox / 2, oy / 2, PAL.white, 1); }   // the awning's white stripes running back
  } else if (oy > 0) para(mx + ox / 2, r.y1 + oy / 2, hw, 0, ox / 2, oy / 2, c, 1.35);   // its underside, in shadow, the darkest tone
  const side = ox > 0 && !wr ? x1 : ox < 0 && !wl ? x0 : null;   // its free end's side, the one the eye sees
  if (side != null) para(side + ox / 2, cy + oy / 2, 0, (r.y1 - r.y0) / 2, ox / 2, oy / 2, c, 1.55);   // its end, a tone between
}

// The colour a ledge's front is drawn in, by its world's kit (its depth takes that colour, in tones of it): the Village all its wood and earth orange, its yaen
// blue; Tokyo its slabs and awnings purple, its steel beams grey, its gondolas blue; elsewhere the theme's.
function cineFront(lv, r) {
  const th = lv.theme;
  if (r.cloud) return PAL.white;
  if (th.village) return r.move ? th.mover : PAL.orange;
  if (th.town) return r.move ? th.mover : r.plank && !r.bouncy ? PAL.gray : th.block;
  return r.crumble ? th.crumble : r.slick ? th.slick : r.move ? th.mover : r.plank ? th.plank : th.block;
}
