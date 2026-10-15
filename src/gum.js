"use strict";
/* ─────────────────────────────────────────────────────────────
   Gum engine parts, copied from Gum (../Gum/index.html, the "Squishy
   Studio" session), snapshot of 2026-10-14 22:31 kept in
   research/refs/gum-snapshot-2026-10-14-2231.html. Verbatim, so later
   Gum changes can be carried over by diffing against that snapshot,
   except for three lines marked "Upwell:":
   - Body.integrate: gravity × gScale (flying enemies have 0);
   - Renderer.buildBody: the draw-time clamp holds x inside the well only;
   - Renderer.writeFace: a frowning mouth when face.frown is set.
   Left out: Gum's World, Input, words, telemetry, setup and loop, its
   BG_FS and FEAT_FS, Renderer.draw and Body.walls — the game has its
   own in src/world.js (Body.collideLevel, Renderer.prototype.draw).
   src/world.js also wraps Renderer.init and .resize: it swaps in its own
   pixel-art body and shadow shaders and draws into a small target.
   ───────────────────────────────────────────────────────────── */
const TAU = Math.PI * 2;

// ── Tuning ───────────────────────────────────────────────────
// Lengths in CSS pixels, time in seconds. Stiffnesses are XPBD stiffnesses,
// so they do not depend on the substep count.
const PHYS = { hz: 120, substeps: 4, maxSteps: 6 };
const STEP = 1 / PHYS.hz;
const WORLD = { gravity: 2300, maxSpeed: 4200, skin: 2.2, wallFriction: 0.42, bodyFriction: 0.22, maxBodies: 12, floorPad: 26 };
const BODY = {
  sizeFrac: 0.122, sizeMin: 40, sizeMax: 96,
  edgeK: 26000, areaK: 5200, crushStart: 0.12, crushStiffen: 16,
  shapeK: 950, shapeKRescue: 9000, rescueDamping: 14, bendK: 0.08, foldHold: 0.3, foldTries: 2, foldClean: 1.5,
  wobbleDamping: 2.6, airDrag: 0.12, angularDamping: 0.35, settle: 4,
  upGain: 0.65, upDamp: 0.16, upMax: 0.4, upStart: 0.3, upDone: 0.05, upTimeout: 2.2, upRest: 3.5, upCalm: 260,
  upAbort: 650, upFails: 2, upCrowd: 1, upFlight: 0.12, upSelfHops: 3,
};
// A calm group of touching bodies falls asleep (no integration, no pair tests)
// and wakes on touch or when an awake body bumps into it.
const SLEEP = { speed: 22, spin: 0.3, soloSpeed: 8, soloSpin: 0.02, time: 0.5, wakeSpeed: 60, wakeDepth: 3 };
const UNTANGLE = { every: 4, hold: 0.2, maxT: 3, clearT: 0.15, speed: 2.4, tries: 3, forget: 2 };
// After the field changes size, overlaps are resolved gently for a moment
// (capped pushes and speeds, slow pop-in) so nothing crumples or flies.
const SOFT = { time: 0.8, push: 0.6, speed: 350, growK: 40, growC: 12, debounce: 0.2 };
// Squishies stick where they touch a side wall or the ceiling (not while standing on the
// floor or resting against other bodies, unless a finger presses them on). A stuck rim
// creeps along its surface no faster than `slide` radii per second (down a wall, by its
// weight); on the ceiling it holds for `hold` s, then peels two points off the edges of
// the stuck patch every `peel` s and drops (and does not stick back for `cooldown` s). A
// finger pulls the rim off (`pull`, px per substep); anything else only by tearing it far
// off (`tear`, radii). Reaching the floor ends a slide, springing back softly for `settle` s.
const STICK = { slide: 0.6, pull: 1.2, tear: 0.2, hold: 0.6, peel: 0.2, cooldown: 0.6, settle: 0.4 };
const SQUASH = { k: 330, damping: 7.5, impactGain: 0.0034, impactMax: 3.78, maxCompress: 0.42, maxStretch: 0.5, bulge: 0.8, flightFrom: 300, flightPer: 4e-5, flightMax: 0.14 };
const GRAB = { dragMouse: 6, dragTouch: 10, pickMouse: 3, pickTouch: 12, nearK: 52000, farK: 520, falloff: 0.75, velPull: 26, assist: 0.35, flingSpeed: 900, flingMax: 3200, windowMs: 70, aimMs: 40, stillMs: 60 };
const SQUEEZE = { pokeMaxMs: 190, holdDelayMs: 150, rampS: 0.75, compress: 0.3, bulge: 0.22, areaLoss: 0.1, hop: 560, rebound: 2.5, rise: 14 };
const DENT = { max: 8, pokeR: 0.34, pokeDepth: 0.85, pokeHold: 0.35, pokeRecover: 2.6, pressR: 0.4, pressDepth: 0.95, pressGrow: 0.28, pressRecover: 0.9, grabR: 0.3, grabDepth: 0.45, grabRecover: 0.45, ring: 0.2, pokeImpulse: 260, pokePuff: 1.1 };
const IMPACT = { minSpeed: 230, puffSpeed: 820, buzzSpeed: 400, shakeSpeed: 1500, shakePer: 0.0045, shakeMax: 9, cooldown: 0.09 };
const RENDER = { maxDpr: 2, puffH: 0.62, plateau: 0.72, shadowOffset: 7, shadowBlur: 13, shadowA: 0.46, contactFade: 110, targetMs: 17.5 };
const THEME = {
  top: [0.149, 0.141, 0.204], bot: [0.098, 0.094, 0.133], glow: [0.07, 0.055, 0.1],
  shelf: [0.075, 0.071, 0.102], edge: [0.42, 0.39, 0.55],
  rim: [1.0, 0.94, 1.0], rimK: 0.5, ink: [0.21, 0.15, 0.25], blush: [1.0, 0.42, 0.56],
};

// ── Small math ───────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lighten = (c, k) => [c[0] + (1 - c[0]) * k, c[1] + (1 - c[1]) * k, c[2] + (1 - c[2]) * k];
function wrapA(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
function smin(a, b, k) { const h = sat(0.5 + 0.5 * (b - a) / k); return b + (a - b) * h - k * h * (1 - h); }
function sdEll(x, y, rx, ry) { return (Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry); }
function sdRoundBox(x, y, bx, by, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function pointInPoly(X, Y, n, px, py) {
  let c = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if ((Y[i] > py) !== (Y[j] > py) && px < (X[j] - X[i]) * (py - Y[i]) / (Y[j] - Y[i]) + X[i]) c = !c;
  }
  return c;
}
// Does a closed polygon cross itself? (non-adjacent edge pairs, strict test)
function selfCrossing(X, Y, n) {
  for (let i = 0; i < n; i++) {
    const i2 = i + 1 === n ? 0 : i + 1, ax = X[i], ay = Y[i], bx = X[i2], by = Y[i2];
    for (let j = i + 2; j < n; j++) {
      const j2 = j + 1 === n ? 0 : j + 1;
      if (j2 === i) continue;
      const cx = X[j], cy = Y[j], dx = X[j2], dy = Y[j2];
      const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
      if ((d1 > 0) === (d2 > 0)) continue;
      const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
      if ((d3 > 0) !== (d4 > 0)) return true;
    }
  }
  return false;
}
function distToPoly(X, Y, n, px, py) {
  let best = Infinity;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ex = X[i] - X[j], ey = Y[i] - Y[j], l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((px - X[j]) * ex + (py - Y[j]) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = X[j] + ex * t - px, dy = Y[j] + ey * t - py, d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
function nearestOnPoly(X, Y, n, px, py) {
  let best = Infinity, bx = X[0], by = Y[0];
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ex = X[i] - X[j], ey = Y[i] - Y[j], l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((px - X[j]) * ex + (py - Y[j]) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = X[j] + ex * t, qy = Y[j] + ey * t, d = (qx - px) * (qx - px) + (qy - py) * (qy - py);
    if (d < best) { best = d; bx = qx; by = qy; }
  }
  return [bx, by];
}

// ── Looks ────────────────────────────────────────────────────
const PALETTE = [
  { id: 'peach', base: [1.0, 0.79, 0.69], deep: [0.94, 0.5, 0.4] },
  { id: 'butter', base: [1.0, 0.89, 0.55], deep: [0.95, 0.66, 0.26] },
  { id: 'lavender', base: [0.8, 0.72, 1.0], deep: [0.54, 0.41, 0.93] },
  { id: 'pink', base: [1.0, 0.72, 0.82], deep: [0.95, 0.4, 0.6] },
  { id: 'mint', base: [0.7, 0.94, 0.83], deep: [0.3, 0.74, 0.58] },
  { id: 'sky', base: [0.68, 0.85, 1.0], deep: [0.31, 0.58, 0.93] },
  { id: 'coral', base: [1.0, 0.66, 0.6], deep: [0.91, 0.36, 0.36] },
  { id: 'lilac', base: [0.93, 0.76, 0.98], deep: [0.72, 0.44, 0.86] },
];

// Outlines are implicit functions (negative inside) in design space, y down.
// Only their zero set matters: it is traced by rays from `kernel`, so every
// shape must be star-shaped around that point. Faces are in rest-unit space
// (outline centred on its vertex mean, area π).
const DESIGNS = [
  { id: 'mochi', n: 32, size: 1.0, firm: 1.0, kernel: [0, 0],
    sdf: (x, y) => { const top = y < 0, p = top ? 2.3 : 3.6; return Math.pow(Math.abs(x) / 1.12, p) + Math.pow(Math.abs(y) / (top ? 0.9 : 0.62), p) - 1; },
    face: { eye: [0.3, 0.04], eyeR: [0.075, 0.095], mouth: [0, 0.2], mouthW: 0.13, blush: [0.52, 0.17] } },
  { id: 'loaf', n: 36, size: 1.0, firm: 1.05, kernel: [0, 0.05],
    sdf: (x, y) => Math.min(sdRoundBox(x, y - 0.22, 1.0, 0.42, 0.26), sdEll(x, y + 0.05, 0.98, 0.72)),
    face: { eye: [0.28, 0.06], eyeR: [0.072, 0.092], mouth: [0, 0.22], mouthW: 0.12, blush: [0.5, 0.2] } },
  { id: 'star', n: 40, size: 0.98, firm: 1.9, kernel: [0, 0],
    sdf: (x, y) => { const a = Math.atan2(x, -y); return Math.hypot(x, y) - (0.6 + 0.44 * Math.pow(0.5 + 0.5 * Math.cos(5 * a), 1.8)); },
    face: { eye: [0.19, 0.02], eyeR: [0.062, 0.08], mouth: [0, 0.16], mouthW: 0.1, blush: [0.34, 0.15] } },
  { id: 'heart', n: 36, size: 0.98, firm: 1.25, kernel: [0, -0.09],
    sdf: (x, y) => { const X = x / 1.1, Y = -y / 1.1 + 0.12, q = X * X + Y * Y - 1; return q * q * q - X * X * Y * Y * Y; },
    face: { eye: [0.27, -0.02], eyeR: [0.07, 0.09], mouth: [0, 0.15], mouthW: 0.11, blush: [0.47, 0.12] } },
  { id: 'cat', n: 40, size: 1.0, firm: 1.3, kernel: [0, 0.1],
    sdf: (x, y) => {
      const body = sdEll(x, y - 0.12, 1.08, 0.82);
      const ax = Math.abs(x) - 0.56, ay = y + 0.58, c = Math.cos(0.42), s = Math.sin(0.42);
      return smin(body, sdEll(c * ax - s * ay, s * ax + c * ay, 0.25, 0.4), 0.14);
    },
    face: { eye: [0.3, 0.08], eyeR: [0.072, 0.092], mouth: [0, 0.25], mouthW: 0.11, blush: [0.5, 0.22] } },
];
const designById = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];
const colorById = (id) => PALETTE.find((c) => c.id === id) || PALETTE[0];

// ── Shapes: outline extraction and the rest mesh ─────────────
// The mesh is a polar web: centre, NR rings (denser towards the edge, where
// the silhouette and the rim light live), plus an anti-aliasing skirt ring
// and a soft shadow ring outside the outline.
const LO = [0.16, 0.32, 0.47, 0.6, 0.71, 0.8, 0.875, 0.935, 0.975, 1];
const NR = LO.length;
// How much the rim's deformation is smoothed on its way in, per ring (passes of a
// neighbour average): none near the rim, more toward the centre.
const RING_SMOOTH = LO.map((r) => (r < 1 ? Math.max(1, Math.round(30 * (1 - r) * (1 - r))) : 0));
const SA = LO.map((r) => 1 - smooth(0.62, 1, r) * 0.55);   // shadow alpha per ring

// One step of cubic B-spline subdivision, n points → 2n: corners are rounded off
// instead of passed through, so a kink in the physics outline never shows sharp.
function subdivide(X, Y, n, OX, OY) {
  for (let i = 0; i < n; i++) {
    const a = i === 0 ? n - 1 : i - 1, c = i + 1 === n ? 0 : i + 1;
    OX[2 * i] = (X[a] + 6 * X[i] + X[c]) / 8; OY[2 * i] = (Y[a] + 6 * Y[i] + Y[c]) / 8;
    OX[2 * i + 1] = (X[i] + X[c]) / 2; OY[2 * i + 1] = (Y[i] + Y[c]) / 2;
  }
}

const PATTERNS = new Map();
function patternsFor(M) {
  let p = PATTERNS.get(M);
  if (p) return p;
  const body = new Uint32Array(63 * M), shadow = new Uint32Array(63 * M);
  const ring = (k, j) => 1 + k * M + (j % M), skirt = (j) => 1 + NR * M + (j % M), halo = (j) => 1 + (NR + 1) * M + (j % M);
  let a = 0, b = 0;
  for (let j = 0; j < M; j++) {
    body[a++] = 0; body[a++] = ring(0, j); body[a++] = ring(0, j + 1);
    shadow[b++] = 0; shadow[b++] = ring(0, j); shadow[b++] = ring(0, j + 1);
  }
  for (let k = 0; k < NR - 1; k++) for (let j = 0; j < M; j++) {
    const p0 = ring(k, j), p1 = ring(k + 1, j), p2 = ring(k + 1, j + 1), p3 = ring(k, j + 1);
    body[a++] = p0; body[a++] = p1; body[a++] = p2; body[a++] = p0; body[a++] = p2; body[a++] = p3;
    shadow[b++] = p0; shadow[b++] = p1; shadow[b++] = p2; shadow[b++] = p0; shadow[b++] = p2; shadow[b++] = p3;
  }
  for (let j = 0; j < M; j++) {
    const e0 = ring(NR - 1, j), e1 = ring(NR - 1, j + 1);
    body[a++] = e0; body[a++] = skirt(j); body[a++] = skirt(j + 1); body[a++] = e0; body[a++] = skirt(j + 1); body[a++] = e1;
    shadow[b++] = e0; shadow[b++] = halo(j); shadow[b++] = halo(j + 1); shadow[b++] = e0; shadow[b++] = halo(j + 1); shadow[b++] = e1;
  }
  p = { body, shadow };
  PATTERNS.set(M, p);
  return p;
}

const SHAPES = new Map();
function shapeOf(d) {
  let s = SHAPES.get(d.id);
  if (s) return s;
  // 1. trace the outline with rays from the kernel (march, then bisect)
  const RAYS = 720, kx = d.kernel[0], ky = d.kernel[1];
  const ox = new Float64Array(RAYS), oy = new Float64Array(RAYS);
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let t = 0.01;
    while (t < 3 && d.sdf(kx + dx * t, ky + dy * t) <= 0) t += 0.01;
    let lo = t - 0.01, hi = t;
    for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (d.sdf(kx + dx * m, ky + dy * m) > 0) hi = m; else lo = m; }
    const r = (lo + hi) / 2;
    ox[i] = kx + dx * r; oy[i] = ky + dy * r;
  }
  // 2. resample to n points evenly spaced along the outline
  const cum = new Float64Array(RAYS + 1);
  for (let i = 0; i < RAYS; i++) { const j = (i + 1) % RAYS; cum[i + 1] = cum[i] + Math.hypot(ox[j] - ox[i], oy[j] - oy[i]); }
  const n = d.n, rx = new Float64Array(n), ry = new Float64Array(n);
  for (let k = 0, seg = 0; k < n; k++) {
    const target = (k / n) * cum[RAYS];
    while (seg < RAYS - 1 && cum[seg + 1] < target) seg++;
    const j = (seg + 1) % RAYS, f = (target - cum[seg]) / Math.max(1e-12, cum[seg + 1] - cum[seg]);
    rx[k] = ox[seg] + (ox[j] - ox[seg]) * f; ry[k] = oy[seg] + (oy[j] - oy[seg]) * f;
  }
  // 3. centre on the vertex mean (the centre shape matching works around), area π
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += rx[i]; my += ry[i]; }
  mx /= n; my /= n;
  let A = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; A += (rx[i] - mx) * (ry[j] - my) - (rx[j] - mx) * (ry[i] - my); }
  A *= 0.5;
  const sc = Math.sqrt(Math.PI / Math.abs(A)), sgn = A >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) { rx[i] = (rx[i] - mx) * sc; ry[i] = (ry[i] - my) * sc; }
  // 4. outward normals; sum of |∇area|² at rest normalises the area constraint; which
  //    points bulge outward at rest (only those may stick to a wall: a notch pressed flat
  //    and held there would be pulled into a spike)
  const nx = new Float64Array(n), ny = new Float64Array(n), convex = new Uint8Array(n);
  let gradSum = 0;
  for (let i = 0; i < n; i++) {
    const p = (i + n - 1) % n, q = (i + 1) % n, tx = rx[q] - rx[p], ty = ry[q] - ry[p], l = Math.hypot(tx, ty) || 1;
    nx[i] = (sgn * ty) / l; ny[i] = (-sgn * tx) / l;
    gradSum += 0.25 * (tx * tx + ty * ty);
    const ax = rx[i] - rx[p], ay = ry[i] - ry[p], bx = rx[q] - rx[i], by = ry[q] - ry[i];
    convex[i] = sgn * Math.atan2(ax * by - ay * bx, ax * bx + ay * by) > -0.1 ? 1 : 0;
  }
  // 5. unwrapped polar angles of the rest outline, for mapping face features
  const phiU = new Float64Array(n + 1), phi0 = Math.atan2(ry[0], rx[0]);
  let acc = 0, prev = phi0;
  for (let i = 1; i <= n; i++) { const a = Math.atan2(ry[i % n], rx[i % n]); acc += wrapA(a - prev); prev = a; phiU[i] = acc; }
  const dir = acc >= 0 ? 1 : -1;
  for (let i = 0; i <= n; i++) phiU[i] *= dir;
  // 6. rest mesh and cushion heights: a circular profile of the distance to the
  //    outline with a flat top, smoothed a little
  const M = 2 * n, nm = 1 + NR * M;
  const bx = new Float64Array(M), by = new Float64Array(M);
  subdivide(rx, ry, n, bx, by);
  const mu = new Float64Array(nm * 2);
  for (let k = 0; k < NR; k++) for (let j = 0; j < M; j++) { const vi = 1 + k * M + j; mu[2 * vi] = bx[j] * LO[k]; mu[2 * vi + 1] = by[j] * LO[k]; }
  const dist = new Float64Array(nm);
  let dmax = 0;
  for (let vi = 0; vi < nm; vi++) { dist[vi] = distToPoly(bx, by, M, mu[2 * vi], mu[2 * vi + 1]); if (dist[vi] > dmax) dmax = dist[vi]; }
  let hU = new Float64Array(nm);
  for (let vi = 0; vi < nm; vi++) { const u = Math.min(1, dist[vi] / (RENDER.plateau * dmax)); hU[vi] = RENDER.puffH * Math.sqrt(1 - (1 - u) * (1 - u)); }
  for (let j = 0; j < M; j++) hU[1 + (NR - 1) * M + j] = 0;
  for (let it = 0; it < 4; it++) {
    const h2 = new Float64Array(hU);
    let s0 = 0;
    for (let j = 0; j < M; j++) s0 += hU[1 + j];
    h2[0] = 0.4 * hU[0] + (0.6 * s0) / M;
    for (let k = 0; k < NR - 1; k++) for (let j = 0; j < M; j++) {
      const vi = 1 + k * M + j, inner = k === 0 ? 0 : vi - M;
      const l = 1 + k * M + ((j + M - 1) % M), r = 1 + k * M + ((j + 1) % M);
      h2[vi] = 0.4 * hU[vi] + 0.15 * (hU[inner] + hU[vi + M] + hU[l] + hU[r]);
    }
    hU = h2;
  }
  let maxY = 0;
  for (let i = 0; i < n; i++) if (ry[i] > maxY) maxY = ry[i];
  s = { id: d.id, n, rx, ry, nx, ny, convex, sgn, gradSum, phiU, phi0, dir, M, nm, mu, hU, maxY, face: d.face, pat: patternsFor(M) };
  SHAPES.set(d.id, s);
  return s;
}

// Carries a rest-space point onto the deformed body: find the outline segment
// its polar angle hits at rest, and scale the matching deformed segment point
// from the deformed centre by the same radial ratio.
function mapPoint(s, X, Y, cx, cy, ux, uy, out) {
  const r = Math.sqrt(ux * ux + uy * uy);
  if (r < 1e-6) { out.x = cx; out.y = cy; return out; }
  let t = s.dir * wrapA(Math.atan2(uy, ux) - s.phi0);
  if (t < 0) t += TAU;
  const P = s.phiU, n = s.n;
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m] <= t) lo = m; else hi = m; }
  const i = lo, j = (lo + 1) % n;
  const ex = s.rx[j] - s.rx[i], ey = s.ry[j] - s.ry[i], dx = ux / r, dy = uy / r, den = ex * dy - ey * dx;
  let f = Math.abs(den) > 1e-12 ? -(s.rx[i] * dy - s.ry[i] * dx) / den : 0.5;
  f = f < 0 ? 0 : f > 1 ? 1 : f;
  const qx = s.rx[i] + ex * f, qy = s.ry[i] + ey * f, k = r / (Math.sqrt(qx * qx + qy * qy) || 1);
  const bx = X[i] + (X[j] - X[i]) * f, by = Y[i] + (Y[j] - Y[i]) * f;
  out.x = cx + (bx - cx) * k; out.y = cy + (by - cy) * k;
  return out;
}

// ── Face ─────────────────────────────────────────────────────
class Face {
  constructor() {
    this.next = rand(1.8, 5.5); this.bt = -1; this.twice = false; this.open = 1;
    this.squint = 0; this.surprise = 0; this.wide = 0;
    this.lx = 0; this.ly = 0; this.tlx = 0; this.tly = 0; this.wander = rand(1.4, 4);
  }
  update(dt, b, ptr, now) {
    if (this.bt < 0) {
      this.next -= dt;
      if (this.next <= 0 && b.squeeze < 0.05) { this.bt = 0; }
    }
    if (this.bt >= 0) {
      this.bt += dt;
      const t = this.bt;
      this.open = t < 0.06 ? 1 - t / 0.06 : t < 0.16 ? (t - 0.06) / 0.1 : 1;
      if (t >= 0.16) {
        this.bt = -1;
        if (!this.twice && Math.random() < 0.18) { this.twice = true; this.next = 0.09; }
        else { this.twice = false; this.next = rand(1.8, 5.5); }
      }
    }
    this.squint += (b.squeeze - this.squint) * Math.min(1, 16 * dt);
    this.surprise = Math.max(0, this.surprise - 2.6 * dt);
    this.wide = Math.max(0, this.wide - dt);
    if (ptr && now - ptr.t < 2200) {
      let dx = ptr.x - b.cx, dy = ptr.y - b.cy;
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260) / d;
      dx *= k; dy *= k;
      const c = Math.cos(-b.theta), s = Math.sin(-b.theta);
      this.tlx = c * dx - s * dy; this.tly = s * dx + c * dy;
    } else {
      this.wander -= dt;
      if (this.wander <= 0) {
        this.wander = rand(1.4, 4);
        const a = Math.random() * TAU, r = Math.random() * 0.7;
        this.tlx = Math.cos(a) * r; this.tly = Math.sin(a) * r * 0.6;
      }
    }
    const k = Math.min(1, 11 * dt);
    this.lx += (this.tlx - this.lx) * k; this.ly += (this.tly - this.ly) * k;
  }
}

// ── Body ─────────────────────────────────────────────────────
let nextId = 1;
class Body {
  constructor(design, color, cx, cy, R, growth = 0.3) {
    this.id = nextId++; this.d = design; this.color = color; this.s = shapeOf(design); this.R = R;
    const n = (this.n = this.s.n), F = () => new Float64Array(n);
    this.x = F(); this.y = F(); this.px = F(); this.py = F(); this.vx = F(); this.vy = F(); this.sx = F(); this.sy = F();
    this.gx = F(); this.gy = F(); this.tx = F(); this.ty = F(); this.ax = F(); this.ay = F(); this.inward = F();
    this.growth = growth; this.growthV = 0; this.growthTarget = 1;
    this.exx = 0; this.eyy = 0; this.exy = 0; this.evxx = 0; this.evyy = 0; this.evxy = 0;
    this.theta = 0; this.omega = 0; this.rigVx = 0; this.rigVy = 0;
    this.squeeze = 0; this.squeezeIn = 0; this.sqAx = 0; this.sqAy = 1; this.sqTheta = 0;
    this.dents = []; this.grabs = [];
    this.glue = new Uint8Array(n); this.stuck = 0; this.ceilT = 0; this.peelT = 0; this.ceilCD = 0; this.wasTouching = false;
    this.wallMask = 0; this.prevMask = 0; this.hitW = [0, 0, 0, 0]; this.hitR = [0, 0, 0, 0]; this.floorX = 0; this.floorN = 0;
    this.touching = false; this.settle = false; this.offFloorT = 1; this.age = 0; this.impactCD = 0.3;
    this.up = { on: false, hold: false, t: 0, rest: 0, fails: 0, selfHops: 0, crowdT: 0, flew: false };
    this.badT = 0; this.stepN = 0; this.foldT = 0; this.foldRescue = 0; this.foldTries = 0; this.foldCleanT = 0;
    this.asleep = false; this.calmT = 0; this.calmV = 0; this.calmW = 0; this.calmRelease = 0; this.slowGrow = false;
    this.area = this.restArea * growth * growth; this.targetArea = this.area;
    this.face = new Face();
    this.place(cx, cy);
  }
  get restArea() { return Math.PI * this.R * this.R; }
  place(cx, cy) {
    const k = this.R * this.growth, s = this.s;
    for (let i = 0; i < this.n; i++) {
      const x = cx + s.rx[i] * k, y = cy + s.ry[i] * k;
      this.x[i] = this.px[i] = this.sx[i] = x; this.y[i] = this.py[i] = this.sy[i] = y;
      this.vx[i] = this.vy[i] = 0;
    }
    this.glue.fill(0); this.stuck = 0;
    this.lastGoodX = cx; this.lastGoodY = cy;
    this.updateBounds();
  }
  reset() {
    const cx = Number.isFinite(this.lastGoodX) ? this.lastGoodX : 200, cy = Number.isFinite(this.lastGoodY) ? this.lastGoodY : 200;
    this.exx = this.eyy = this.exy = this.evxx = this.evyy = this.evxy = 0;
    this.grabs.length = 0; this.badT = 0; this.rigVx = this.rigVy = this.omega = 0;
    this.wake();
    this.place(cx, cy);
  }
  // Move the whole body without giving it any velocity.
  translate(dx, dy) {
    for (let i = 0; i < this.n; i++) {
      this.x[i] += dx; this.px[i] += dx; this.sx[i] += dx;
      this.y[i] += dy; this.py[i] += dy; this.sy[i] += dy;
    }
    this.lastGoodX += dx; this.lastGoodY += dy;
    this.updateBounds();
  }
  wake() { if (this.asleep) { this.asleep = false; this.calmT = 0; } this.calmT = Math.min(this.calmT, 0); }
  sleep() {
    this.asleep = true;
    this.vx.fill(0); this.vy.fill(0);
    this.evxx = this.evyy = this.evxy = 0; this.growthV = 0;
    this.rigVx = this.rigVy = this.omega = 0;
    this.sx.set(this.x); this.sy.set(this.y); this.px.set(this.x); this.py.set(this.y);
  }
  updateBounds() {
    const n = this.n, x = this.x, y = this.y;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i], b = y[i];
      if (a < minX) minX = a; if (a > maxX) maxX = a; if (b < minY) minY = b; if (b > maxY) maxY = b;
      cx += a; cy += b;
    }
    this.minX = minX; this.maxX = maxX; this.minY = minY; this.maxY = maxY; this.cx = cx / n; this.cy = cy / n;
  }
  // Pointer position → rest-unit coordinates (undo squash, rotation, size).
  toRest(px, py) {
    const a = 1 + this.exx, b = this.exy, d = 1 + this.eyy, det = a * d - b * b;
    let rx = px - this.cx, ry = py - this.cy;
    if (det > 0.05) { const ux = (d * rx - b * ry) / det, uy = (-b * rx + a * ry) / det; rx = ux; ry = uy; }
    const c = Math.cos(-this.theta), s = Math.sin(-this.theta), k = 1 / (this.R * Math.max(0.1, this.growth));
    return [(c * rx - s * ry) * k, (s * rx + c * ry) * k];
  }
  kickSquash(nx, ny, m) {   // squash along n (m > 0), bulge across; m < 0 stretches
    const px = -ny, py = nx, b = SQUASH.bulge * m;
    this.evxx += -m * nx * nx + b * px * px; this.evyy += -m * ny * ny + b * py * py; this.evxy += -m * nx * ny + b * px * py;
  }
  kickPuff(m) { this.evxx += m; this.evyy += m; }
  clampE() {
    const m = (this.exx + this.eyy) / 2, h = (this.exx - this.eyy) / 2, r = Math.hypot(h, this.exy);
    const l1 = m + r, l2 = m - r, lo = -SQUASH.maxCompress, hi = SQUASH.maxStretch;
    if (l1 <= hi && l2 >= lo) return;
    const c1 = clamp(l1, lo, hi), c2 = clamp(l2, lo, hi), a = Math.atan2(this.exy, h), nm = (c1 + c2) / 2, nr = (c1 - c2) / 2;
    this.exx = nm + nr * Math.cos(a); this.eyy = nm - nr * Math.cos(a); this.exy = nr * Math.sin(a);
    this.evxx *= 0.5; this.evyy *= 0.5; this.evxy *= 0.5;
  }
  addDent(px, py, kind) {
    const [ux, uy] = this.toRest(px, py), s = this.s;
    const d = { x: ux, y: uy, r: 0, rT: 0, depth: 0, depthT: 0, peak: 0, released: false, t: 0, hold: 0, recover: 1, ring: 0 };
    if (kind === 'poke') {
      d.r = d.rT = DENT.pokeR; d.depth = d.peak = DENT.pokeDepth;
      d.released = true; d.hold = DENT.pokeHold; d.recover = DENT.pokeRecover;
    } else {
      d.r = DENT.pressR * 0.6; d.rT = DENT.pressR; d.depthT = DENT.pressDepth * 0.4;
    }
    // only dents near the outline push the outline in; inner ones are visual
    if (pointInPoly(s.rx, s.ry, this.n, ux, uy)) d.ring = sat(1 - distToPoly(s.rx, s.ry, this.n, ux, uy) / (1.1 * d.rT));
    this.dents.push(d);
    if (this.dents.length > DENT.max) {   // drop the oldest let-go dent, never one under a finger
      const i = this.dents.findIndex((q) => q.released);
      this.dents.splice(i >= 0 ? i : 0, 1);
    }
    return d;
  }
  releaseDent(d, recover) {
    if (!d || d.released) return;
    d.released = true; d.t = 0; d.hold = 0; d.recover = recover; d.peak = d.depth;
  }
  updateDents(dt) {
    const ds = this.dents;
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i];
      if (!d.released) {
        const k = Math.min(1, (dt / DENT.pressGrow) * 2.2);
        d.r += (d.rT - d.r) * k; d.depth += (d.depthT - d.depth) * k; d.peak = d.depth;
      } else {
        d.t += dt;
        if (d.t > d.hold) {
          const u = (d.t - d.hold) / d.recover;
          if (u >= 1) { ds.splice(i, 1); continue; }
          d.depth = d.peak * (1 - u * u * (3 - 2 * u));
        }
      }
    }
    const inw = this.inward, s = this.s;
    inw.fill(0);
    for (const d of ds) {
      if (d.ring <= 0 || d.depth < 1e-3) continue;
      const rr = (1.35 * d.r) ** 2, amp = DENT.ring * d.depth * d.ring;
      for (let i = 0; i < this.n; i++) {
        const dx = s.rx[i] - d.x, dy = s.ry[i] - d.y, d2 = dx * dx + dy * dy;
        if (d2 < rr) { const w = 1 - d2 / rr; inw[i] += amp * w * w; }
      }
    }
  }
  startGrab(ptr, ax, ay) {
    const n = this.n, k = new Float64Array(n), ox = new Float64Array(n), oy = new Float64Array(n);
    const scale = this.R * Math.max(0.3, this.growth);
    // grabbed deep inside → the body moves as a whole; grabbed at the rim → it stretches
    const e = pointInPoly(this.x, this.y, n, ax, ay) ? Math.min(1, distToPoly(this.x, this.y, n, ax, ay) / (0.55 * scale)) : 0;
    const fall = GRAB.falloff * scale;
    for (let i = 0; i < n; i++) {
      const dx = this.x[i] - ax, dy = this.y[i] - ay;
      ox[i] = dx; oy[i] = dy;
      const w = Math.exp(-(dx * dx + dy * dy) / (fall * fall)) * (1 - 0.55 * e) + 0.3 * e;
      k[i] = GRAB.farK + (GRAB.nearK - GRAB.farK) * w * w;
    }
    const g = { ptr, k, ox, oy, th0: this.theta, tx: ax, ty: ay, vx: 0, vy: 0 };
    this.grabs.push(g);
    return g;
  }
  endGrab(g) { const i = this.grabs.indexOf(g); if (i >= 0) this.grabs.splice(i, 1); }
  fling(vx, vy) {
    const n = this.n, sp = Math.hypot(vx, vy);
    if (sp > GRAB.flingMax) { vx *= GRAB.flingMax / sp; vy *= GRAB.flingMax / sp; }
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += this.vx[i]; my += this.vy[i]; }
    mx /= n; my /= n;
    const ax = (vx - mx) * GRAB.assist, ay = (vy - my) * GRAB.assist;
    for (let i = 0; i < n; i++) { this.vx[i] += ax; this.vy[i] += ay; }
  }
  pokeImpulse(px, py) {   // a local push towards the centre around the finger
    const k = this.R * this.growth, r2 = 0.5 * k * k;
    for (let i = 0; i < this.n; i++) {
      const dx = this.x[i] - px, dy = this.y[i] - py, d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const cx = this.cx - this.x[i], cy = this.cy - this.y[i], l = Math.hypot(cx, cy) || 1, v = DENT.pokeImpulse * (1 - d2 / r2);
      this.vx[i] += (cx / l) * v; this.vy[i] += (cy / l) * v;
    }
  }
  hop(v) { for (let i = 0; i < this.n; i++) this.vy[i] -= v; }

  // Once per 120 Hz step: snapshot for interpolation, springs that run at the
  // step rate (growth, squash tensor, dents) and the goal outline.
  beginStep(dt) {
    const n = this.n;
    this.age += dt;
    if (this.impactCD > 0) this.impactCD -= dt;
    this.sx.set(this.x); this.sy.set(this.y);
    const grounded = (this.wallMask & 8) !== 0, speed = Math.hypot(this.rigVx, this.rigVy), held = this.grabs.length > 0;
    const touched = this.touching;
    this.wasTouching = touched;
    this.offFloorT = grounded ? 0 : this.offFloorT + dt;
    this.settle = (grounded || touched) && speed < 80 && !held && this.squeeze < 0.05;
    this.prevMask = this.wallMask; this.wallMask = 0; this.touching = false;
    this.hitW.fill(0); this.hitR.fill(0); this.floorX = 0; this.floorN = 0;
    // stuck to the ceiling: hang for a moment, then peel two vertices at a time off the
    // ends of the stuck patch (the smallest piece first, e.g. one ear, then the other) and drop
    const glue = this.glue;
    let top = 0;
    for (let i = 0; i < n; i++) if (glue[i] === 4) top++;
    if (this.ceilCD > 0) this.ceilCD -= dt;
    if (top) {
      this.ceilT += dt;
      if (this.ceilT > STICK.hold && (this.peelT += dt) > STICK.peel) {
        this.peelT = 0;
        const runs = [];   // [length, first, last] of each stuck piece of the outline
        for (let i = 0; i < n; i++) {
          if (glue[i] !== 4 || glue[i === 0 ? n - 1 : i - 1] === 4) continue;
          let len = 0, j = i;
          while (glue[j] === 4 && len < n) { len++; j = j + 1 === n ? 0 : j + 1; }
          runs.push([len, i, (i + len - 1) % n]);
        }
        runs.sort((a, b) => a[0] - b[0]);
        let left = 2;
        for (const [, a, z] of runs) {
          if (left <= 0) break;
          glue[a] = 0; left--;
          if (z !== a && left > 0) { glue[z] = 0; left--; }
        }
      }
    } else if (this.ceilT > 0) { this.ceilT = 0; this.peelT = 0; this.ceilCD = STICK.cooldown; }   // fell off: not straight back on
    // pop-in growth
    const gk = this.slowGrow ? SOFT.growK : 180, gc = this.slowGrow ? SOFT.growC : 15;
    this.growthV += (gk * (this.growthTarget - this.growth) - gc * this.growthV) * dt;
    if (this.slowGrow && this.growth > 0.98) this.slowGrow = false;
    this.growth += this.growthV * dt;
    // squeeze rises at a fixed rate and lets go at once (the release kick does the rebound)
    const before = this.squeeze;
    this.squeeze = this.squeezeIn < this.squeeze ? this.squeezeIn : Math.min(this.squeezeIn, this.squeeze + SQUEEZE.rise * dt);
    if (before === 0 && this.squeeze > 0) this.sqTheta = this.theta;
    // squash tensor: a damped spring chasing a target set by squeezing and by flight
    let txx = 0, tyy = 0, txy = 0;
    if (this.squeeze > 0) {
      const s = this.squeeze, ax = this.sqAx, ay = this.sqAy, bx = -ay, by = ax, c = -SQUEEZE.compress * s, u = SQUEEZE.bulge * s;
      txx += c * ax * ax + u * bx * bx; tyy += c * ay * ay + u * by * by; txy += c * ax * ay + u * bx * by;
    }
    if (!grounded && !held && speed > SQUASH.flightFrom) {
      const st = Math.min(SQUASH.flightMax, (speed - SQUASH.flightFrom) * SQUASH.flightPer);
      const ux = this.rigVx / speed, uy = this.rigVy / speed, wx = -uy, wy = ux, sc = -0.6 * st;
      txx += st * ux * ux + sc * wx * wx; tyy += st * uy * uy + sc * wy * wy; txy += st * ux * uy + sc * wx * wy;
    }
    const K = SQUASH.k, C = SQUASH.damping;
    this.evxx += (K * (txx - this.exx) - C * this.evxx) * dt;
    this.evyy += (K * (tyy - this.eyy) - C * this.evyy) * dt;
    this.evxy += (K * (txy - this.exy) - C * this.evxy) * dt;
    this.exx += this.evxx * dt; this.eyy += this.evyy * dt; this.exy += this.evxy * dt;
    this.clampE();
    this.updateDents(dt);
    // the outline this body wants right now (rest shape, size, edge dents)
    const s = this.s, k = this.R * this.growth;
    for (let i = 0; i < n; i++) {
      const w = this.inward[i];
      this.tx[i] = (s.rx[i] - s.nx[i] * w) * k; this.ty[i] = (s.ry[i] - s.ny[i] * w) * k;
    }
    const det = (1 + this.exx) * (1 + this.eyy) - this.exy * this.exy;
    this.targetArea = this.restArea * this.growth * this.growth * Math.max(0.3, det) * (1 - SQUEEZE.areaLoss * this.squeeze);
    // Getting back on its feet: done by turning the goal shape, not with torque.
    // A few tries at most; a hand on the body or a real flight earns new ones,
    // and a crowd makes it give up, so nothing keeps cartwheeling on its own.
    const up = this.up, free = !held && this.age > 0.4 && this.squeeze < 0.05, th = Math.abs(this.theta);
    if (up.rest > 0) up.rest -= dt;
    if (held || this.squeeze > 0.05) { up.on = false; up.fails = 0; up.selfHops = 0; up.crowdT = 0; }
    if (this.offFloorT > BODY.upFlight && !touched) {
      if (!up.flew) { up.flew = true; up.flewByRight = up.on; }
    } else if (grounded && up.flew) {
      up.flew = false;
      // only a flight it did not cause itself earns righting new tries
      if (!up.flewByRight) { up.crowdT = 0; if (up.fails > 0 && up.selfHops < BODY.upSelfHops) { up.fails = 0; up.selfHops++; } }
    }
    if (!up.on) {
      if (free && this.offFloorT < 0.25 && speed < BODY.upCalm && th > BODY.upStart && up.rest <= 0 && up.fails < BODY.upFails) {
        up.on = true; up.hold = false; up.t = 0;
      }
    } else {
      up.t += dt;
      if (touched) up.crowdT += dt;   // adds up over tries: a wedged body gives up for good
      if (!free) up.on = false;
      else if (this.offFloorT > 0.25 || speed > BODY.upAbort) { up.on = false; up.fails++; }
      else if (up.crowdT > BODY.upCrowd) { up.on = false; up.fails = BODY.upFails; }
      else if (th < BODY.upDone) up.hold = true;   // stand there: keep the gentle turn, drop the spin term
      else if (!up.hold && up.t > BODY.upTimeout) { up.on = false; up.rest = BODY.upRest; }
    }
  }
  integrate(h, vmax) {
    const n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    const g = WORLD.gravity * (this.gScale === undefined ? 1 : this.gScale) * (this.untangling ? 0 : this.grabs.length ? 0.85 : 1) * h, v2 = vmax * vmax;   // Upwell: × gScale
    for (let i = 0; i < n; i++) {
      this.px[i] = x[i]; this.py[i] = y[i];
      vy[i] += g;
      const s2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (s2 > v2) { const k = vmax / Math.sqrt(s2); vx[i] *= k; vy[i] *= k; }
      x[i] += vx[i] * h; y[i] += vy[i] * h;
    }
  }
  // One XPBD pass (no λ accumulation: one iteration per substep).
  solve(h) {
    const n = this.n, x = this.x, y = this.y, gx = this.gx, gy = this.gy, tx = this.tx, ty = this.ty;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += x[i]; cy += y[i]; }
    cx /= n; cy /= n;
    // goal = centre + (I+E)·R(θ)·target, θ the best-fit rotation once E is undone
    const a = 1 + this.exx, b = this.exy, d = 1 + this.eyy, det = a * d - b * b;
    let ia = 1, ib = 0, id = 1;
    if (det > 0.05) { ia = d / det; ib = -b / det; id = a / det; }
    let sc = 0, ss = 0;
    for (let i = 0; i < n; i++) {
      const rx = x[i] - cx, ry = y[i] - cy, ux = ia * rx + ib * ry, uy = ib * rx + id * ry;
      sc += tx[i] * ux + ty[i] * uy; ss += tx[i] * uy - ty[i] * ux;
    }
    const th = Math.atan2(ss, sc);
    this.theta = th;
    let u = th;
    if (this.squeeze > 0) u = th + Math.min(1, 2 * this.squeeze) * wrapA(this.sqTheta - th);   // pressed bodies don't spin
    else if (this.up.on) {   // upside down: roll over more gently, so the roll itself does not launch it
      const lim = Math.abs(th) > Math.PI / 2 ? BODY.upMax * 0.5 : BODY.upMax;
      u = th - clamp(th * BODY.upGain + (this.up.hold ? 0 : this.omega * BODY.upDamp), -lim, lim);
    }
    const co = Math.cos(u), si = Math.sin(u);
    for (let i = 0; i < n; i++) {
      const rx = co * tx[i] - si * ty[i], ry = si * tx[i] + co * ty[i];
      gx[i] = cx + a * rx + b * ry; gy[i] = cy + b * rx + d * ry;
    }
    // edges: rest length taken from the goal outline, so squash does not fight them
    const aE = 1 / (BODY.edgeK * h * h);
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1;
      const ex = gx[j] - gx[i], ey = gy[j] - gy[i], L = Math.sqrt(ex * ex + ey * ey);
      let dx = x[j] - x[i], dy = y[j] - y[i];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-9) continue;
      const c = (len - L) / (2 + aE);
      dx /= len; dy /= len;
      x[i] += dx * c; y[i] += dy * c; x[j] -= dx * c; y[j] -= dy * c;
    }
    // area (pressure); stiffens when squashed past crushStart
    const sg = this.s.sgn, AX = this.ax, AY = this.ay;
    let A = 0, g2 = 0;
    for (let i = 0; i < n; i++) { const j = i + 1 === n ? 0 : i + 1; A += x[i] * y[j] - x[j] * y[i]; }
    A *= 0.5 * sg;
    for (let i = 0; i < n; i++) {
      const p = i === 0 ? n - 1 : i - 1, q = i + 1 === n ? 0 : i + 1;
      AX[i] = 0.5 * sg * (y[q] - y[p]); AY[i] = 0.5 * sg * (x[p] - x[q]);
      g2 += AX[i] * AX[i] + AY[i] * AY[i];
    }
    const target = this.targetArea;
    const crush = Math.max(0, 1 - A / target - BODY.crushStart);
    const aA = (this.gradSumRest()) / (BODY.areaK * (1 + crush * BODY.crushStiffen) * h * h);
    const lam = -(A - target) / (g2 + aA);
    for (let i = 0; i < n; i++) { x[i] += lam * AX[i]; y[i] += lam * AY[i]; }
    this.area = A;
    // shape matching towards the goal (much stiffer while rescuing a crushed or folded body)
    const k = A < 0.35 * target || this.foldRescue > 0 ? BODY.shapeKRescue : BODY.shapeK * this.d.firm, f = (k * h * h) / (1 + k * h * h);
    for (let i = 0; i < n; i++) { x[i] += (gx[i] - x[i]) * f; y[i] += (gy[i] - y[i]) * f; }
    // bending: nudge each vertex's offset from its neighbours' midpoint toward the
    // goal's, so a single pinched vertex cannot stay as a spike (smooth squash is untouched)
    const kb = BODY.bendK, k1 = kb * (2 / 3), k2 = kb / 3;
    for (let i = 0; i < n; i++) {
      const p = i === 0 ? n - 1 : i - 1, q = i + 1 === n ? 0 : i + 1;
      const dx = gx[i] - 0.5 * (gx[p] + gx[q]) - (x[i] - 0.5 * (x[p] + x[q]));
      const dy = gy[i] - 0.5 * (gy[p] + gy[q]) - (y[i] - 0.5 * (y[p] + y[q]));
      x[i] += dx * k1; y[i] += dy * k1; x[p] -= dx * k2; y[p] -= dy * k2; x[q] -= dx * k2; y[q] -= dy * k2;
    }
    // grabs: per-vertex springs to the pointer, offsets turning with the body
    for (const gr of this.grabs) {
      const rot = th - gr.th0, c = Math.cos(rot), s = Math.sin(rot), h2 = h * h;
      for (let i = 0; i < n; i++) {
        const kk = gr.k[i] * h2, w = kk / (1 + kk), ox = gr.ox[i], oy = gr.oy[i];
        x[i] += (gr.tx + c * ox - s * oy - x[i]) * w; y[i] += (gr.ty + s * ox + c * oy - y[i]) * w;
      }
    }
  }
  gradSumRest() { return this.s.gradSum * this.R * this.R; }
  // Velocities from positions, then damping: the rigid part (translation +
  // spin) and the wobble left over are damped separately.
  finishSubstep(h) {
    const n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    let cx = 0, cy = 0, mx = 0, my = 0;
    for (let i = 0; i < n; i++) {
      vx[i] = (x[i] - this.px[i]) / h; vy[i] = (y[i] - this.py[i]) / h;
      cx += x[i]; cy += y[i]; mx += vx[i]; my += vy[i];
    }
    cx /= n; cy /= n; mx /= n; my /= n;
    let L = 0, I = 0;
    for (let i = 0; i < n; i++) { const rx = x[i] - cx, ry = y[i] - cy; L += rx * (vy[i] - my) - ry * (vx[i] - mx); I += rx * rx + ry * ry; }
    const w = I > 1e-9 ? L / I : 0;
    // while a stiff rescue (or a just-released crush) springs the shape back,
    // soak up the stored energy so the body is not launched by it
    const soak = this.foldRescue > 0 || this.calmRelease > 0;
    const kd = Math.exp(-(soak ? BODY.rescueDamping : BODY.wobbleDamping) * h);
    let kl = Math.exp(-BODY.airDrag * h), kw = Math.exp(-BODY.angularDamping * h);
    if (this.settle) { const s = Math.exp(-BODY.settle * h); kl *= s; kw *= s; }
    if (soak) { const s = Math.exp(-6 * h); kl *= s; kw *= s; }
    const nmx = mx * kl, nmy = my * kl, nw = w * kw;
    for (let i = 0; i < n; i++) {
      const rx = x[i] - cx, ry = y[i] - cy;
      const dvx = (vx[i] - (mx - w * ry)) * kd, dvy = (vy[i] - (my + w * rx)) * kd;
      vx[i] = nmx - nw * ry + dvx; vy[i] = nmy + nw * rx + dvy;
    }
    this.rigVx = nmx; this.rigVy = nmy; this.omega = nw;
    for (const g of this.grabs) {   // grabbed vertices follow the finger's velocity too
      for (let i = 0; i < n; i++) {
        const t = 1 - Math.exp(-GRAB.velPull * (g.k[i] / GRAB.nearK) * h);
        vx[i] += (g.vx - vx[i]) * t; vy[i] += (g.vy - vy[i]) * t;
      }
    }
  }
  endStep(dt, world) {
    if (!Number.isFinite(this.cx) || !Number.isFinite(this.cy) || !Number.isFinite(this.x[0] + this.vx[0])) { this.reset(); return; }
    const ratio = this.area / Math.max(1e-6, this.targetArea);
    if (ratio < 0.3 || ratio > 2.6) { this.badT += dt; if (this.badT > 0.6) { this.reset(); return; } }
    else this.badT = 0;
    this.lastGoodX = this.cx; this.lastGoodY = this.cy;
    // A slam can fold the outline over itself. Brief folds undo themselves;
    // one that lasts gets a short, damped, stiff shape rescue — twice at most
    // until the body has been clean for a while.
    if (this.foldRescue > 0) this.foldRescue -= dt;
    if (this.calmRelease > 0) this.calmRelease -= dt;
    if (++this.stepN % 4 === 0) {
      const crossed = !this.grabs.length && this.squeeze === 0 && selfCrossing(this.x, this.y, this.n);
      if (crossed) {
        this.foldT += 4 * dt; this.foldCleanT = 0;
        if (this.foldT > BODY.foldHold && this.foldTries < BODY.foldTries) { this.foldRescue = 0.25; this.foldTries++; this.foldT = 0; }
      } else {
        this.foldT = 0; this.foldCleanT += 4 * dt;
        if (this.foldCleanT > BODY.foldClean || this.grabs.length) this.foldTries = 0;
      }
    }
    // calm tracking for sleep: smoothed centre speed and spin
    const k = Math.min(1, dt / 0.1);
    this.calmV += (Math.hypot(this.rigVx, this.rigVy) - this.calmV) * k;
    this.calmW += (Math.abs(this.omega) - this.calmW) * k;
    const ev = Math.abs(this.evxx) + Math.abs(this.evyy) + Math.abs(this.evxy);
    const lim = (this.touching || (this.wallMask & 8)) && !this.stuck ? 1 : 0;   // a stuck body must really stop
    const quiet = !this.grabs.length && this.squeeze === 0 && this.squeezeIn === 0 && ev < 0.25 && this.age > 1 &&
      Math.abs(this.growth - this.growthTarget) < 0.01 && this.foldRescue <= 0 && this.calmRelease <= 0 &&
      this.calmV < (lim ? SLEEP.speed : SLEEP.soloSpeed) && this.calmW < (lim ? SLEEP.spin : SLEEP.soloSpin) &&
      (!this.up.on || this.up.hold) && this.dents.length === 0;   // a healing dent keeps it awake
    this.calmT = quiet ? this.calmT + dt : 0;
    // about to rest with an outline still folded (both rescues used up): settle it into
    // its goal shape in place, without any speed, rather than sleep folded
    if (this.calmT > SLEEP.time * 0.5 && this.foldTries >= BODY.foldTries && selfCrossing(this.x, this.y, this.n)) {
      for (let i = 0; i < this.n; i++) { this.x[i] = this.px[i] = this.sx[i] = this.gx[i]; this.y[i] = this.py[i] = this.sy[i] = this.gy[i]; }
      this.foldTries = 0; this.updateBounds();
    }
    const fresh = this.wallMask & ~this.prevMask;
    if (fresh && this.impactCD <= 0) {
      let best = -1, sp = 0;
      for (let k = 0; k < 4; k++) if (fresh & (1 << k)) { const v = Math.min(this.hitW[k], this.hitR[k]); if (v > sp) { sp = v; best = k; } }
      if (best >= 0 && sp > IMPACT.minSpeed) {
        const floor = best === 3;
        world.impact(this, best < 2 ? 1 : 0, best < 2 ? 0 : 1, sp, floor ? this.floorX / Math.max(1, this.floorN) : this.cx, floor ? world.b : this.cy, floor);
      }
    }
  }
}

// Vertices of A against the outline of B. A vertex inside B, or closer than
// `skin` to it, is pushed out along the separating direction; the push is
// shared with the two ends of B's nearest edge by (1−t)², t². Friction trims
// the relative tangential slide of this substep.
function vertsAgainst(A, B, o) {
  const aw = A.asleep ? 0 : 1, bw = B.asleep ? 0 : 1;   // a sleeping body does not give way
  if (!aw && !bw) return;
  const sk = WORLD.skin, n = A.n, m = B.n, X = A.x, Y = A.y, BX = B.x, BY = B.y;
  const minX = B.minX - sk, maxX = B.maxX + sk, minY = B.minY - sk, maxY = B.maxY + sk, mu = WORLD.bodyFriction * 0.5;
  for (let v = 0; v < n; v++) {
    const vx = X[v], vy = Y[v];
    if (vx < minX || vx > maxX || vy < minY || vy > maxY) continue;
    let inside = false, best = Infinity, bi = 0, bt = 0;
    for (let i = 0, j = m - 1; i < m; j = i++) {
      const xi = BX[i], yi = BY[i], xj = BX[j], yj = BY[j];
      if ((yi > vy) !== (yj > vy) && vx < ((xj - xi) * (vy - yi)) / (yj - yi) + xi) inside = !inside;
      const ex = xi - xj, ey = yi - yj, l2 = ex * ex + ey * ey;
      let t = l2 > 0 ? ((vx - xj) * ex + (vy - yj) * ey) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = xj + ex * t - vx, qy = yj + ey * t - vy, d2 = qx * qx + qy * qy;
      if (d2 < best) { best = d2; bi = j; bt = t; }
    }
    const dist = Math.sqrt(best);
    if (!inside && dist >= sk) continue;
    const a = bi, b = bi + 1 === m ? 0 : bi + 1;
    const qx = BX[a] + (BX[b] - BX[a]) * bt, qy = BY[a] + (BY[b] - BY[a]) * bt;
    let nx, ny;
    if (dist > 1e-6) { nx = (vx - qx) / dist; ny = (vy - qy) / dist; if (inside) { nx = -nx; ny = -ny; } }
    else { const ex = BX[b] - BX[a], ey = BY[b] - BY[a], el = Math.sqrt(ex * ex + ey * ey) || 1; nx = (B.s.sgn * ey) / el; ny = (-B.s.sgn * ex) / el; }
    const pen = inside ? dist + sk : sk - dist, wa = 1 - bt, wb = bt, den = aw + bw * (wa * wa + wb * wb);
    if (den < 1e-9) continue;
    const lam = Math.min(pen / den, o.cap), la = lam * aw, lb = lam * bw;
    X[v] += nx * la; Y[v] += ny * la;
    BX[a] -= nx * lb * wa; BY[a] -= ny * lb * wa; BX[b] -= nx * lb * wb; BY[b] -= ny * lb * wb;
    const dvx = X[v] - A.px[v] - (wa * (BX[a] - B.px[a]) + wb * (BX[b] - B.px[b]));
    const dvy = Y[v] - A.py[v] - (wa * (BY[a] - B.py[a]) + wb * (BY[b] - B.py[b]));
    const tx = -ny, ty = nx, tn = (dvx * tx + dvy * ty) * mu;
    X[v] -= tx * tn * aw; Y[v] -= ty * tn * aw;
    BX[a] += tx * tn * wa * bw; BY[a] += ty * tn * wa * bw; BX[b] += tx * tn * wb * bw; BY[b] += ty * tn * wb * bw;
    const appr = -((A.rigVx - B.rigVx) * nx + (A.rigVy - B.rigVy) * ny);
    if (appr > o.speed) { o.speed = appr; o.nx = nx; o.ny = ny; }
    if (pen > o.depth) o.depth = pen;
    o.hit = true;
  }
}

// ── Effects: puffs, screen shake, vibration ──────────────────
class FX {
  constructor(cap = 240) {
    this.cap = cap; this.n = 0;
    const F = () => new Float32Array(cap);
    this.x = F(); this.y = F(); this.vx = F(); this.vy = F(); this.age = F(); this.life = F(); this.size = F();
    this.cr = F(); this.cg = F(); this.cb = F(); this.ca = F(); this.kind = new Uint8Array(cap);
  }
  add(x, y, vx, vy, size, life, c, a, kind, delay = 0) {
    const i = this.n < this.cap ? this.n++ : (Math.random() * this.cap) | 0;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.size[i] = size; this.life[i] = life; this.age[i] = -delay;
    this.cr[i] = c[0]; this.cg[i] = c[1]; this.cb[i] = c[2]; this.ca[i] = a; this.kind[i] = kind;
  }
  copy(i, j) {
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j]; this.size[i] = this.size[j];
    this.life[i] = this.life[j]; this.age[i] = this.age[j]; this.cr[i] = this.cr[j]; this.cg[i] = this.cg[j]; this.cb[i] = this.cb[j];
    this.ca[i] = this.ca[j]; this.kind[i] = this.kind[j];
  }
  update(dt) {
    const d = Math.exp(-5 * dt);
    for (let i = this.n - 1; i >= 0; i--) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.copy(i, --this.n); continue; }
      if (this.age[i] < 0) continue;
      this.vx[i] *= d; this.vy[i] = this.vy[i] * d - 30 * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
    }
  }
  write(r) {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] < 0) continue;
      const u = this.age[i] / this.life[i], s = this.size[i];
      if (this.kind[i] === 2) { const rad = s * (0.4 + 1.6 * u); r.feat(this.x[i], this.y[i], rad, 0, 0, rad, this.cr[i], this.cg[i], this.cb[i], this.ca[i] * (1 - u) * 0.9, 4, 0, 0, 0); }
      else { const rad = s * (1 + 0.6 * u); r.feat(this.x[i], this.y[i], rad, 0, 0, rad, this.cr[i], this.cg[i], this.cb[i], this.ca[i] * (1 - u) * (1 - u), 1, 0, 0, 0); }
    }
  }
  poke(b, x, y) {
    const c = lighten(b.color.base, 0.35);
    for (let k = 0; k < 5; k++) { const a = rand(0, TAU), sp = rand(110, 220); this.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, rand(3.5, 6.5), rand(0.35, 0.55), c, 0.9, 0); }
    this.add(x, y, 0, 0, b.R * 0.32, 0.36, c, 0.75, 2);
  }
  dust(x, y, speed) {
    const k = Math.min(1, (speed - IMPACT.puffSpeed) / 1400), c = [0.78, 0.76, 0.88];
    for (let m = 0, cnt = 4 + Math.round(k * 4); m < cnt; m++) {
      const dir = m % 2 ? 1 : -1;
      this.add(x + rand(-14, 14), y - 3, dir * rand(60, 170), rand(-70, -20), rand(5, 9), rand(0.4, 0.6), c, 0.3 + 0.25 * k, 0);
    }
  }
  ring(x, y, size, c) { this.add(x, y, 0, 0, size, 0.4, lighten(c, 0.3), 0.6, 2); }
}

const shake = {
  amp: 0, t: 0, x: 0, y: 0,
  add(a) { this.amp = Math.min(IMPACT.shakeMax, Math.max(this.amp, a)); },
  update(dt) {
    this.t += dt; this.amp *= Math.exp(-11 * dt);
    if (this.amp < 0.05) { this.amp = 0; this.x = this.y = 0; return; }
    const w = 38 * this.t;
    this.x = (Math.sin(w * 1.13) + 0.5 * Math.sin(w * 2.37 + 1.7)) * this.amp * 0.67;
    this.y = (Math.sin(w * 1.31 + 0.4) + 0.5 * Math.sin(w * 2.71 + 2.3)) * this.amp * 0.67;
  },
};

const haptics = {
  last: 0, ok: typeof navigator !== 'undefined' && 'vibrate' in navigator,
  buzz(ms, gap = 45) {
    if (!this.ok || paused) return;
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    const now = performance.now();
    if (now - this.last < gap) return;
    this.last = now;
    try { navigator.vibrate(Math.max(1, Math.round(ms))); } catch (e) { /* not allowed here */ }
  },
};

// ── WebGL2 ───────────────────────────────────────────────────
const GLSL = '#version 300 es\nprecision highp float;\n';
const CLIP = `uniform vec2 uView; uniform vec2 uShake;
vec4 toClip(vec2 p) { p += uShake; return vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0); }
`;
const BG_VS = GLSL + `out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const BODY_VS = GLSL + CLIP + `layout(location = 0) in vec2 aPos;
layout(location = 1) in vec3 aN;
layout(location = 2) in float aAO;
layout(location = 3) in float aA;
layout(location = 4) in float aSA;
layout(location = 5) in vec2 aUV;
uniform vec2 uOffset;
out vec3 vN; out float vAO; out float vA; out float vSA; out vec2 vUV;
void main() {
  vN = aN; vAO = aAO; vA = aA; vSA = aSA; vUV = aUV;
  gl_Position = toClip(aPos + uOffset);
}`;
// Screen-space lighting: light from the top left, viewer straight on. The
// "soft box" is a rounded rectangle looked up in the reflected direction —
// that is what reads as a glossy, inflated surface.
const BODY_FS = GLSL + `in vec3 vN; in float vAO; in float vA; in vec2 vUV; out vec4 o;
uniform vec3 uBase, uDeep, uRim; uniform float uRimK;
float sdRoundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.42, -0.62, 0.66));
  float edge = 1.0 - n.z;
  float wrap = clamp((dot(n, L) + 0.45) / 1.45, 0.0, 1.0);
  vec3 col = mix(uBase, uDeep, smoothstep(0.04, 0.8, edge) * 0.6);
  col = mix(col, uDeep * 0.8, (1.0 - vAO) * 0.85);
  col *= 0.66 + 0.34 * wrap;
  col *= 1.0 - 0.1 * clamp(n.y, 0.0, 1.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  float spec = pow(nh, 140.0) * 0.8 + pow(nh, 16.0) * 0.1;
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float box = sdRoundBox(R.xy - vec2(-0.36, -0.5), vec2(0.17, 0.1), 0.07);
  float soft = (1.0 - smoothstep(-0.03, 0.05, box)) * 0.72;
  col += vec3(spec + soft);
  col += uRim * pow(max(edge, 0.0), 3.2) * uRimK;
  o = vec4(col * vA, vA);
}`;
const SHADOW_FS = GLSL + `in float vSA; out vec4 o; uniform float uShadowA;
void main() { o = vec4(0.0, 0.0, 0.0, vSA * vSA * uShadowA); }`;
// Instanced sprites with an affine frame: eyes, mouths, blush, puffs, rings.
const FEAT_VS = GLSL + CLIP + `layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 iA;   // centre.xy, axis A
layout(location = 2) in vec4 iB;   // axis B, r, g
layout(location = 3) in vec4 iC;   // b, a, type, p1
layout(location = 4) in vec2 iD;   // p2, p3
out vec2 vL; out vec4 vCol; flat out vec4 vP;
void main() {
  vec2 A = iA.zw, B = iB.xy;
  vec2 pad = vec2(1.0 + 1.5 / max(length(A), 0.5), 1.0 + 1.5 / max(length(B), 0.5));
  vec2 l = aCorner * pad;
  vL = l; vCol = vec4(iB.zw, iC.xy); vP = vec4(iC.zw, iD);
  gl_Position = toClip(iA.xy + A * l.x + B * l.y);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const u = {}, count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0;
  for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.lost = false; this.w = 1; this.h = 1; this.pr = 1;
    this.vtx = new Float32Array(1 << 16); this.idx = new Uint32Array(1 << 17); this.fdata = new Float32Array(14 * 256);
    this.nv = 0; this.ni = 0; this.nf = 0; this.ranges = []; this.pool = [];
    this.p0 = { x: 0, y: 0 }; this.p1 = { x: 0, y: 0 }; this.p2 = { x: 0, y: 0 };
    this.sc = null;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; perf.ctxLoss++; }, false);
    canvas.addEventListener('webglcontextrestored', () => { this.ok = this.init(); this.lost = !this.ok; }, false);
    this.ok = this.init();
  }
  init() {
    const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;
    this.gl = gl;
    this.stencil = gl.getParameter(gl.STENCIL_BITS) > 0;
    try {
      this.pBg = program(gl, BG_VS, BG_FS);
      this.pBody = program(gl, BODY_VS, BODY_FS);
      this.pShadow = program(gl, BODY_VS, SHADOW_FS);
      this.pFeat = program(gl, FEAT_VS, FEAT_FS);
    } catch (err) { console.error(err); return false; }
    this.emptyVao = gl.createVertexArray();
    this.bodyVao = gl.createVertexArray();
    gl.bindVertexArray(this.bodyVao);
    this.vbo = gl.createBuffer(); this.vboCap = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    for (const [loc, size, off] of [[0, 2, 0], [1, 3, 8], [2, 1, 20], [3, 1, 24], [4, 1, 28], [5, 2, 32]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 40, off);
    }
    this.ebo = gl.createBuffer(); this.eboCap = 0;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
    this.featVao = gl.createVertexArray();
    gl.bindVertexArray(this.featVao);
    const corner = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corner);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.fbo = gl.createBuffer(); this.fboCap = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fbo);
    for (let l = 1; l <= 4; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribDivisor(l, 1); }
    this.bindFeat(0);
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.fences = []; this.idxSig = null;
    return true;
  }
  resize(w, h, scale) {
    this.w = w; this.h = h;
    const W = Math.max(1, Math.round(w * scale)), H = Math.max(1, Math.round(h * scale));
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    this.pr = W / w;
  }
  // WebGL2 has no baseInstance: point the instanced attributes at the range.
  bindFeat(start) {
    const gl = this.gl, S = 56, o = start * S;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fbo);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, S, o);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, o + 16);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, o + 32);
    gl.vertexAttribPointer(4, 2, gl.FLOAT, false, S, o + 48);
  }
  drawFeat(start, count) {
    if (count <= 0) return;
    const gl = this.gl;
    gl.bindVertexArray(this.featVao);
    this.bindFeat(start);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  }
  upload(target, buf, data, len, cap) {
    const gl = this.gl, bytes = len * data.BYTES_PER_ELEMENT;
    gl.bindBuffer(target, buf);
    if (bytes > this[cap]) { this[cap] = Math.max(bytes, this[cap] * 2, 4096); gl.bufferData(target, this[cap], gl.DYNAMIC_DRAW); }
    if (len) gl.bufferSubData(target, 0, data, 0, len);
  }
  feat(cx, cy, ax, ay, bx, by, r, g, b, a, type, p1, p2, p3) {
    if ((this.nf + 1) * 14 > this.fdata.length) { const d = new Float32Array(this.fdata.length * 2); d.set(this.fdata); this.fdata = d; }
    const F = this.fdata, o = this.nf++ * 14;
    F[o] = cx; F[o + 1] = cy; F[o + 2] = ax; F[o + 3] = ay; F[o + 4] = bx; F[o + 5] = by;
    F[o + 6] = r; F[o + 7] = g; F[o + 8] = b; F[o + 9] = a; F[o + 10] = type; F[o + 11] = p1; F[o + 12] = p2; F[o + 13] = p3;
  }
  scratch(n, M, nm) {
    const s = this.sc;
    if (s && s.n >= n && s.M >= M && s.nm >= nm) return s;
    const F = (k) => new Float64Array(k);
    return (this.sc = { n, M, nm, X: F(n), Y: F(n), BX: F(M), BY: F(M), NX: F(M), NY: F(M), GX: F(M), GY: F(M), DX: F(M), DY: F(M), TX: F(M), TY: F(M), PX: F(nm), PY: F(nm), PH: F(nm), DF: F(nm), NN: F(nm * 3) });
  }
  // The cushion: outline → subdivided ring → polar web with heights and normals.
  buildBody(b, alpha) {
    const s = b.s, n = b.n, M = s.M, nm = s.nm, total = nm + 2 * M;
    if ((this.nv + total) * 10 > this.vtx.length) { const v = new Float32Array(Math.max(this.vtx.length * 2, (this.nv + total) * 10)); v.set(this.vtx); this.vtx = v; }
    if (this.ni + 126 * M > this.idx.length) { const v = new Uint32Array(Math.max(this.idx.length * 2, this.ni + 126 * M)); v.set(this.idx); this.idx = v; }
    const S = this.scratch(n, M, nm), X = S.X, Y = S.Y;
    let cx = 0, cy = 0, A = 0;
    for (let i = 0; i < n; i++) {
      X[i] = b.sx[i] + (b.x[i] - b.sx[i]) * alpha; Y[i] = b.sy[i] + (b.y[i] - b.sy[i]) * alpha;
      cx += X[i]; cy += Y[i];
    }
    cx /= n; cy /= n;
    for (let i = 0; i < n; i++) { const j = i + 1 === n ? 0 : i + 1; A += X[i] * Y[j] - X[j] * Y[i]; }
    A *= 0.5;
    const sgn = A >= 0 ? 1 : -1, BX = S.BX, BY = S.BY, NX = S.NX, NY = S.NY;
    subdivide(X, Y, n, BX, BY);
    // (a crushed outline can turn back on itself around the centre, folding the polar
    // web; draw() fills by winding number, so the outline is drawn as it is)
    for (let j = 0; j < M; j++) BX[j] = clamp(BX[j], game.lv.l, game.lv.r);   // Upwell: the smooth curve may overshoot a wall it is pressed against
    for (let j = 0; j < M; j++) {
      const p = j === 0 ? M - 1 : j - 1, q = j + 1 === M ? 0 : j + 1, tx = BX[q] - BX[p], ty = BY[q] - BY[p], l = Math.sqrt(tx * tx + ty * ty) || 1;
      NX[j] = (sgn * ty) / l; NY[j] = (-sgn * tx) / l;
    }
    // a squashed body is drawn taller: it reads as volume being kept
    const g = Math.max(0.05, b.growth), hk = b.R * g * clamp(Math.sqrt((b.restArea * g * g) / Math.max(1, Math.abs(A))), 0.72, 1.45);
    const PX = S.PX, PY = S.PY, PH = S.PH, DF = S.DF, NN = S.NN, mu = s.mu;
    // Rings: an outline scaled toward the centre would carry every dent, crumple or notch
    // of the rim as a crease all the way in. So the rings follow the body's goal shape plus
    // its deformation (outline − goal), smoothed more the deeper the ring; the outer rings
    // and the outline itself stay exact.
    const GX = S.GX, GY = S.GY, DX = S.DX, DY = S.DY, TX = S.TX, TY = S.TY;
    subdivide(b.gx, b.gy, n, GX, GY);
    for (let j = 0; j < M; j++) { DX[j] = BX[j] - GX[j]; DY[j] = BY[j] - GY[j]; }
    PX[0] = cx; PY[0] = cy;
    for (let k = NR - 1, done = 0; k >= 0; k--) {
      for (; done < RING_SMOOTH[k]; done++) {
        for (let j = 0; j < M; j++) {
          const p = j === 0 ? M - 1 : j - 1, q = j + 1 === M ? 0 : j + 1;
          TX[j] = 0.5 * DX[j] + 0.25 * (DX[p] + DX[q]); TY[j] = 0.5 * DY[j] + 0.25 * (DY[p] + DY[q]);
        }
        for (let j = 0; j < M; j++) { DX[j] = TX[j]; DY[j] = TY[j]; }
      }
      const f = LO[k], o = 1 + k * M;
      for (let j = 0; j < M; j++) { PX[o + j] = cx + (GX[j] + DX[j] - cx) * f; PY[o + j] = cy + (GY[j] + DY[j] - cy) * f; }
    }
    DF.fill(0, 0, nm);
    for (const d of b.dents) {
      if (d.depth < 2e-3) continue;
      const r2 = d.r * d.r;
      for (let vi = 0; vi < nm; vi++) {
        const dx = mu[2 * vi] - d.x, dy = mu[2 * vi + 1] - d.y, d2 = dx * dx + dy * dy;
        if (d2 < r2) { const w = 1 - d2 / r2; DF[vi] += d.depth * w * w; }
      }
    }
    for (let vi = 0; vi < nm; vi++) { const f = DF[vi] > 1 ? 1 : DF[vi]; DF[vi] = f; PH[vi] = s.hU[vi] * hk * (1 - 0.85 * f); }
    NN[0] = 0; NN[1] = 0; NN[2] = 1;
    for (let k = 0; k < NR - 1; k++) for (let j = 0; j < M; j++) {
      const vi = 1 + k * M + j, jm = 1 + k * M + (j === 0 ? M - 1 : j - 1), jp = 1 + k * M + (j + 1 === M ? 0 : j + 1);
      const km = k === 0 ? 0 : vi - M, kp = vi + M;
      const ax = PX[jp] - PX[jm], ay = PY[jp] - PY[jm], az = PH[jp] - PH[jm];
      const bx = PX[kp] - PX[km], by = PY[kp] - PY[km], bz = PH[kp] - PH[km];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      NN[3 * vi] = nx / l; NN[3 * vi + 1] = ny / l; NN[3 * vi + 2] = nz / l;
    }
    const eb = 1 + (NR - 1) * M;   // the outline ring: almost horizontal normals → rim light
    for (let j = 0; j < M; j++) {
      const vi = eb + j, l = Math.sqrt(NX[j] * NX[j] + NY[j] * NY[j] + 0.0484);
      NN[3 * vi] = NX[j] / l; NN[3 * vi + 1] = NY[j] / l; NN[3 * vi + 2] = 0.22 / l;
    }
    const V = this.vtx, base = this.nv;
    let o = base * 10;
    for (let vi = 0; vi < nm; vi++) {
      V[o++] = PX[vi]; V[o++] = PY[vi]; V[o++] = NN[3 * vi]; V[o++] = NN[3 * vi + 1]; V[o++] = NN[3 * vi + 2];
      V[o++] = 1 - 0.55 * DF[vi]; V[o++] = 1; V[o++] = vi === 0 ? 1 : SA[((vi - 1) / M) | 0]; V[o++] = mu[2 * vi]; V[o++] = mu[2 * vi + 1];
    }
    const skirt = 1.25 / this.pr, blur = RENDER.shadowBlur * Math.max(0.3, g);
    for (let pass = 0; pass < 2; pass++) {
      const off = pass === 0 ? skirt : blur;
      for (let j = 0; j < M; j++) {
        const vi = eb + j;
        V[o++] = BX[j] + NX[j] * off; V[o++] = BY[j] + NY[j] * off; V[o++] = NN[3 * vi]; V[o++] = NN[3 * vi + 1]; V[o++] = NN[3 * vi + 2];
        V[o++] = 1; V[o++] = 0; V[o++] = 0; V[o++] = mu[2 * vi]; V[o++] = mu[2 * vi + 1];
      }
    }
    this.nv += total;
    // indices only change when the set or order of bodies changes; then rebuild them
    const P = s.pat, bStart = this.ni, sStart = bStart + P.body.length;
    if (this.idxDirty) {
      const I = this.idx;
      let ii = bStart;
      for (let t = 0; t < P.body.length; t++) I[ii++] = P.body[t] + base;
      for (let t = 0; t < P.shadow.length; t++) I[ii++] = P.shadow[t] + base;
    }
    this.ni = sStart + P.shadow.length;
    const fStart = this.nf;
    this.writeFace(b, X, Y, cx, cy);
    const r = this.pool[this.ranges.length] || (this.pool[this.ranges.length] = {});
    r.b = b; r.bStart = bStart; r.bCount = P.body.length; r.web = P.body.length - 6 * M; r.sStart = sStart; r.sCount = P.shadow.length; r.fStart = fStart; r.fCount = this.nf - fStart;
    this.ranges.push(r);
  }
  writeFace(b, X, Y, cx, cy) {
    const s = b.s, f = s.face, fc = b.face, ink = THEME.ink, bl = THEME.blush, P0 = this.p0, P1 = this.p1, P2 = this.p2;
    const at = (ux, uy, rx, ry) => { mapPoint(s, X, Y, cx, cy, ux, uy, P0); mapPoint(s, X, Y, cx, cy, ux + rx, uy, P1); mapPoint(s, X, Y, cx, cy, ux, uy + ry, P2); };
    const squint = fc.squint, closed = squint > 0.45, wide = 1 + 0.18 * Math.min(1, fc.wide / 0.3);
    for (let side = -1; side <= 1; side += 2) {
      at(f.blush[0] * side, f.blush[1], 0.13, 0.075);
      this.feat(P0.x, P0.y, P1.x - P0.x, P1.y - P0.y, P2.x - P0.x, P2.y - P0.y, bl[0], bl[1], bl[2], 0.26 + 0.24 * squint, 1, 0, 0, 0);
    }
    const lx = fc.lx * 0.05, ly = fc.ly * 0.035;
    for (let side = -1; side <= 1; side += 2) {
      at(f.eye[0] * side + lx, f.eye[1] + ly, f.eyeR[0] * wide, f.eyeR[1] * wide);
      const ax = P1.x - P0.x, ay = P1.y - P0.y, bx = P2.x - P0.x, by = P2.y - P0.y;
      if (closed) { this.feat(P0.x, P0.y, ax * 1.3, ay * 1.3, bx * 1.3, by * 1.3, ink[0], ink[1], ink[2], 1, 3, 1.1, 0.75, 0.2); continue; }
      const op = Math.max(0.1, fc.open * (1 - 0.85 * smooth(0.05, 0.45, squint))), sh = (1 - op) * 0.35;
      this.feat(P0.x + bx * sh, P0.y + by * sh, ax, ay, bx * op, by * op, ink[0], ink[1], ink[2], 1, 0, 0, 0, 0);
      const la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by) * op;
      // the catch-light stays top-left on screen, like the light, however the body is turned
      // (not on an eye squashed into a slant or flipped: it would float off it)
      if (op > 0.5 && ax * by - ay * bx > 0.7 * la * lb / op) {
        this.feat(P0.x + bx * sh - la * 0.3, P0.y + by * sh - lb * 0.36, la * 0.34, 0, 0, lb * 0.3, 1, 1, 1, 0.92, 0, 0, 0, 0);
      }
    }
    at(f.mouth[0], f.mouth[1], f.mouthW, f.mouthW);
    const ax = P1.x - P0.x, ay = P1.y - P0.y, bx = P2.x - P0.x, by = P2.y - P0.y;
    if (fc.surprise > 0.35) { const k = 0.34 + 0.22 * fc.surprise; this.feat(P0.x + bx * 0.15, P0.y + by * 0.15, ax * k * 0.85, ay * k * 0.85, bx * k, by * k, ink[0], ink[1], ink[2], 1, 0, 0, 0, 0); }
    else if (closed) this.feat(P0.x, P0.y, ax, ay, bx, by, ink[0], ink[1], ink[2], 1, 2, 0.55, 1.6, 0.17);
    else this.feat(P0.x, P0.y, ax, ay, bx, by, ink[0], ink[1], ink[2], 1, fc.frown ? 3 : 2, 1.0, 0.85, 0.17);   // Upwell: frown
  }
  // A fence two frames old that has not signalled means the GPU is the bottleneck.
  endFrame() {
    const gl = this.gl;
    if (!gl || this.lost || !this.ok) return false;
    let gpuBound = false;
    const f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (f) this.fences.push(f);
    while (this.fences.length > 2) {
      const old = this.fences.shift();
      if (gl.getSyncParameter(old, gl.SYNC_STATUS) !== gl.SIGNALED) gpuBound = true;
      gl.deleteSync(old);
    }
    return gpuBound;
  }
}
