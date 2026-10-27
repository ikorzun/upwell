// Feed Moti's rules (src/feed.js, FL) against the brief's «must pass» list, over many seeded boards, and the fullness two kinds of player reach in
// eight moves, to set the stars (FEED.stars). Usage: node tools/feed-test.mjs [seeds]   (exits 1 on a failed check)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FL, FEED, FEED_SET } = require('../src/feed.js');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = +(process.argv[2] || 2000), n = FEED.n, kinds = FEED_SET;
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; if (fails < 20) console.log('FAIL', what); } };

// 1. Every starting board: 25 foods of the four, no line, two moves at least
for (let s = 1; s <= N; s++) {
  const b = FL.fresh(mulberry32(s), kinds);
  check(b.length === n * n && b.every((k) => kinds.includes(k)), `board ${s}: 25 of the four`);
  check(FL.runs(b).length === 0, `board ${s}: a line at the start`);
  check(FL.legal(b).length >= 2, `board ${s}: fewer than two moves`);
}
// 2. A swap that isn't with a neighbour is refused; one that makes no line is refused (it costs nothing: no move is taken before ok)
{
  const b = FL.fresh(mulberry32(7), kinds);
  check(!FL.ok(b, 0, 2) && !FL.ok(b, 0, 6) && !FL.ok(b, 0, 0), 'non-adjacent or same-cell swap refused');
  let bad = null; for (let i = 0; i < n * n && !bad; i++) if (i % n < n - 1 && b[i] !== b[i + 1] && !FL.ok(b, i, i + 1)) bad = [i, i + 1];
  check(bad && !FL.ok(b, ...bad) && FL.adj(...bad), 'an adjacent swap with no line is refused');
}
// 3. Lines across, down, and crossing (T and L): every cell of them cleared once
{
  const A = 'sakura', B = 'matcha', C = 'taiyaki', D = 'imo';
  const T = [A, A, A, B, C,   D, A, C, D, B,   B, A, D, C, D,   C, D, B, B, C,   D, C, C, D, B];   // a T: row 0 cols 0-2 and col 1 rows 0-2
  const rs = FL.runs(T), gone = new Set(rs.flat());
  check(rs.length === 2 && gone.size === 5, `T: two lines, five cells (got ${rs.length}, ${gone.size})`);
  const r = FL.resolve(T, mulberry32(3), kinds);
  check(r.phases[0].gone.length === 5 && new Set(r.phases[0].gone).size === 5, 'T: five cleared, each once');
  const L = [A, B, C, D, B,   A, C, D, B, C,   A, A, A, C, D,   B, D, B, D, B,   C, B, C, B, C];   // an L: col 0 rows 0-2 and row 2 cols 0-2
  check(new Set(FL.runs(L).flat()).size === 5, 'L: five cells');
  const H = [A, A, A, A, B,   B, C, D, B, C,   C, D, B, C, D,   D, B, C, D, B,   B, C, D, B, C];   // four in a row
  check(FL.runs(H).length === 1 && FL.runs(H)[0].length === 4, 'four in a row: one line of four');
}
// 4. Gravity and refill keep 5 x 5 and resolve every cascade; the end has no line and a move (a shuffle if it had none)
for (let s = 1; s <= N; s++) {
  const rng = mulberry32(1e6 + s), b = FL.fresh(rng, kinds), [i, j] = FL.legal(b)[0], r = FL.resolve(FL.swapped(b, i, j), rng, kinds);
  check(r.phases.length >= 1, `resolve ${s}: the swap's line`);
  check(r.b.length === n * n && r.b.every((k) => kinds.includes(k)), `resolve ${s}: 25 foods after`);
  check(FL.runs(r.b).length === 0, `resolve ${s}: a line left`);
  check(FL.legal(r.b).length >= 1, `resolve ${s}: no move left`);
  for (const ph of r.phases) check(ph.b.every((k) => k != null) && ph.gone.length >= 3, `resolve ${s}: a phase's board whole`);
}
// 5. A board with no move is shuffled: the same foods, no line, two moves; nothing else changed
{
  const A = 'sakura', B = 'matcha', C = 'taiyaki', D = 'imo';
  const dead = [A, B, C, D, A,   C, D, A, B, C,   A, B, C, D, A,   C, D, A, B, C,   A, B, C, D, A];
  check(FL.legal(dead).length === 0 && FL.runs(dead).length === 0, 'the dead board has no move');
  const sh = FL.shuffle(dead, mulberry32(5), kinds), count = (b) => kinds.map((k) => b.filter((q) => q === k).length).join();
  check(count(sh) === count(dead), 'shuffle keeps the foods'); check(FL.runs(sh).length === 0 && FL.legal(sh).length >= 2, 'shuffle: no line, two moves');
}
// 6. Fullness: one a food cleared, cascades too; score 10 a food times the cascade (at most x4)
{
  const ph = { gone: [1, 2, 3], cascade: 2 }; check(FL.score(ph) === 60, 'score: 3 foods x 10 x2');
  check(FL.score({ gone: [1, 2, 3], cascade: 9 }) === 120, 'score: the cascade capped at x4');
}
// 7. Whole runs of eight moves by two players, the fullness they reach (for FEED.stars)
const play = (seed, greedy) => {
  const rng = mulberry32(seed), pick = mulberry32(seed ^ 0x9e3779b9); let b = FL.fresh(rng, kinds), full = 0, score = 0, cas = 0;
  for (let m = 0; m < FEED.moves; m++) {
    const ls = FL.legal(b); if (!ls.length) return null;
    let mv = ls[(pick() * ls.length) | 0];
    if (greedy) { let best = -1; for (const q of ls) { const v = new Set(FL.runs(FL.swapped(b, ...q)).flat()).size + pick() * 0.5; if (v > best) { best = v; mv = q; } } }
    const r = FL.resolve(FL.swapped(b, ...mv), rng, kinds);
    for (const ph of r.phases) { full += ph.gone.length; score += FL.score(ph); cas = Math.max(cas, ph.cascade); }
    b = r.b;
  }
  return { full, score, cas };
};
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
for (const [name, greedy] of [['random legal moves', false], ['the biggest line each move', true]]) {
  const runs = []; for (let s = 1; s <= N; s++) { const r = play(5e6 + s, greedy); check(r != null, `${name} ${s}: a move missing`); if (r) runs.push(r); }
  const fs = runs.map((r) => r.full).sort((a, b) => a - b);
  check(fs[0] >= FEED.moves * 3, `${name}: fullness under ${FEED.moves * 3}`);
  const st = [0, 1, 2, 3].map((k) => runs.filter((r) => FL.stars(r.full) === k).length / runs.length);
  console.log(`${name}: fullness min ${fs[0]}, p25 ${pct(fs, 0.25)}, median ${pct(fs, 0.5)}, p75 ${pct(fs, 0.75)}, p90 ${pct(fs, 0.9)}, max ${fs[fs.length - 1]}; stars 0/1/2/3 ${st.map((x) => Math.round(100 * x) + '%').join(' / ')}`);
}
console.log(fails ? `${fails} checks failed` : `all checks passed over ${N} seeds`);
process.exit(fails ? 1 : 0);
