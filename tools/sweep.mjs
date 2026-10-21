// The campaign's regression sweep: tools/botrun.mjs over every level on the campaign's map, on the recipes' own seeds (what
// players get): ten a world, c1-1 … c8-10, 80 levels (the Village first, the Sea fourth, the Dark Forest eighth, a bonus world off the line: CAMP_ORDER; the Junkyard gone); a tier's level is its three versions one over another, in the order the
// bot's seed picks (campMerge: players get a new one each time). It prints a table (result, time, hearts lost, stuck, hits; at a
// boss, its hearts dealt) and the levels that came out otherwise than in a saved baseline, so a change to a world that breaks a
// level shows at once. Needs the dev server (python3 tools/serve.py 8793, or PAGE for another port); each of its -j workers (4)
// is a botrun of its own share.
// Usage: node tools/sweep.mjs [--save] [--base file] [-j n] [world or level…]
//   node tools/sweep.mjs              all of them, against tools/sweep-baseline.json
//   node tools/sweep.mjs c3 c6-10     world 3 and the Crane
//   node tools/sweep.mjs --save       all of them, kept as the baseline (some: only theirs in it change)
// It exits 1 when a level did worse than in the baseline (a result further from out: clear, won; stuck more often; two hearts
// more lost; fewer of a boss's hearts dealt), or when one threw (error).
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1]; };
const SAVE = args.includes('--save'), BASE = opt('--base', join(here, 'sweep-baseline.json')), J = Math.max(1, +opt('-j', 4));
if (SAVE) args.splice(args.indexOf('--save'), 1);

const ALL = [];
for (let w = 1; w <= 8; w++) for (let s = 1; s <= 10; s++) ALL.push(`c${w}-${s}`);   // one level a tier (campHas: the middle ids)
const unknown = args.filter((a) => !ALL.some((n) => n === a || n.startsWith(a + '-')));
if (unknown.length) { console.error(`not on the map: ${unknown.join(' ')} (a world is c1…c8, a level c1-1 … c8-10)`); process.exit(2); }
const levels = args.length ? ALL.filter((n) => args.some((a) => n === a || (/^c\d$/.test(a) && n.startsWith(a + '-')))) : ALL;

// ── the run: botrun's lines as they come; a level that throws is an error, and its worker goes on with the rest ──
const got = new Map(), t0 = Date.now();
function work(share, delay) {
  return new Promise((done) => setTimeout(function go(rest = share) {
    const p = spawn(process.execPath, [join(here, 'botrun.mjs'), 'r', ...rest], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => {
      out += d;
      for (let i; (i = out.indexOf('\n')) >= 0; out = out.slice(i + 1)) {
        const line = out.slice(0, i).trim();
        if (!line.startsWith('{')) continue;
        const a = JSON.parse(line);
        got.set(a.level, a);
        console.error(`[${got.size}/${levels.length}] ${a.level} ${a.result} ${a.time} s  (${Math.round((Date.now() - t0) / 1000)} s in)`);
      }
    });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', () => {   // (its output read to the end: 'exit' can come first)
      const left = rest.filter((n) => !got.has(n));
      if (!left.length) { done(); return; }
      const why = (err.match(/\w*Error: [^\n]*/) || [err.trim().split('\n')[0] || 'botrun quit'])[0];
      got.set(left[0], { level: left[0], result: 'error', error: why, time: 0, heartsLost: 0, hits: [], stuck: [] });
      console.error(`[${got.size}/${levels.length}] ${left[0]} error: ${why}`);
      if (left.length > 1) go(left.slice(1)); else done();
    });
  }, delay));
}
await Promise.all(Array.from({ length: Math.min(J, levels.length) }, (_, k) => work(levels.filter((_, i) => i % J === k), k * 1500)));   // starts apart: headless loads at once time out

// ── the table ──
const kinds = (a) => { const n = {}; for (const s of a) { const k = s.split('@')[0]; n[k] = (n[k] || 0) + 1; } return Object.entries(n).map(([k, c]) => (c > 1 ? `${c} ${k}` : k)).join(', '); };
const row = (a) => [a.level.padEnd(7), a.result.padEnd(6), String(a.time).padStart(6), String(a.heartsLost).padStart(7), String(a.stuck.length).padStart(6), String(a.hits.length).padStart(5),
  a.boss ? `  ${a.boss} ${a.dealt}` : '', a.hits.length ? `  hits: ${kinds(a.hits)}` : '', a.stuck.length ? `  stuck: ${a.stuck.join(' ')}` : '', a.error ? `  ${a.error}` : ''].join('');
console.log(`${'level'.padEnd(7)}${'result'.padEnd(6)}${'time'.padStart(6)}${'hearts'.padStart(7)}${'stuck'.padStart(6)}${'hits'.padStart(5)}`);
for (const n of levels) console.log(row(got.get(n)));
const res = levels.map((n) => got.get(n)), count = (f) => res.filter(f).length;
console.log(`\n${res.length} levels: ${count((a) => a.result === 'clear' || a.result === 'won')} out (cleared or won), ${count((a) => a.result === 'reward')} bonus run out, ${count((a) => a.result === 'dead')} dead, ${count((a) => a.result === 'time')} at the time cap, ${count((a) => a.result === 'error')} errors; ` +
  `${res.reduce((s, a) => s + a.heartsLost, 0)} hearts lost, ${res.reduce((s, a) => s + a.stuck.length, 0)} stuck; ${Math.round((Date.now() - t0) / 1000)} s`);

// ── against the baseline ──
const keep = (a) => ({ result: a.result, time: a.time, heartsLost: a.heartsLost, stuck: a.stuck, hits: a.hits, ...(a.boss && { boss: a.boss, dealt: a.dealt }), ...(a.error && { error: a.error }) });
const rank = { error: -1, dead: 0, time: 1, reward: 2, clear: 3, won: 3 }, dealt = (a) => parseInt(a.dealt || '0', 10);
const base = existsSync(BASE) ? JSON.parse(readFileSync(BASE, 'utf8')) : null;
let worse = 0;
if (base) {
  const lines = [];
  for (const a of res) {
    const b = base.levels[a.level];
    if (!b) { lines.push(`  ${a.level.padEnd(7)} new`); continue; }
    const d = [];
    if (a.result !== b.result) d.push(`${b.result}→${a.result}`);
    for (const [k, f] of [['time', (x) => x.time], ['hearts', (x) => x.heartsLost], ['stuck', (x) => x.stuck.length], ['hits', (x) => x.hits.length], ['dealt', (x) => x.dealt]]) if (f(a) !== f(b)) d.push(`${k} ${f(b)}→${f(a)}`);
    if (!d.length) continue;
    const bad = rank[a.result] < rank[b.result] || a.stuck.length > b.stuck.length || a.heartsLost >= b.heartsLost + 2 || dealt(a) < dealt(b);
    if (bad) worse++;
    lines.push(`  ${a.level.padEnd(7)} ${d.join('  ')}${bad ? '   WORSE' : ''}`);
  }
  console.log(`\nAgainst ${BASE.replace(here + '/', 'tools/')} (${base.commit}, ${base.made}): ${lines.length ? `${lines.length} changed, ${worse} worse` : 'all the same'}`);
  for (const l of lines) console.log(l);
} else if (!SAVE) console.log(`\nNo baseline at ${BASE}: --save makes one.`);
if (SAVE) {
  const git = (c) => { try { return execSync(`git -C ${join(here, '..')} ${c}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const kept = { commit: git('log -1 --format=%h -- src index.html') + (git('status --porcelain -- src index.html') ? '+changes' : ''), made: new Date().toISOString().slice(0, 10), levels: Object.assign({}, base && base.levels) };   // commit: the game's last (a rebase keeps it)
  for (const a of res) kept.levels[a.level] = keep(a);
  kept.levels = Object.fromEntries(ALL.filter((n) => kept.levels[n]).map((n) => [n, kept.levels[n]]));   // in the map's order
  writeFileSync(BASE, JSON.stringify(kept, null, 1) + '\n');
  console.log(`\nKept as the baseline: ${BASE} (${res.length} levels of ${Object.keys(kept.levels).length})`);
}
process.exitCode = worse || count((a) => a.result === 'error') ? 1 : 0;   // an error breaks a level too, baseline or none
