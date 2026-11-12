// The CrazyGames build: the game's tracked files (index.html, src, assets; never assets/_raw), with the CrazyGames SDK v3 and
// tools/crazygames/cg.js where the other portal's script was, and no word of that portal left: the page's notes out, and the scripts'
// comments out (CrazyGames' terms: no other portal's branding, no LGPL code). Each change is made exactly once, or the build stops: a
// line moved in index.html needs a look here. The folder is what CrazyGames' preview takes; the zip is what goes to the Developer Portal.
//   node --expose-internals tools/crazygames/build.mjs [out-dir]
//   (default ~/Desktop/Claude/UPWELL/crazygames: game/ and upwell-crazygames-<version>-<sha>.zip; --expose-internals: Node's own acorn)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const acorn = createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.argv[2] || path.join(os.homedir(), 'Desktop/Claude/UPWELL/crazygames'));
const GAME = path.join(OUT, 'game');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

const files = git('ls-files', 'index.html', 'src', 'assets').split('\n').filter((f) => f && !f.startsWith('assets/_raw/'));
if (fs.existsSync(GAME)) fs.rmSync(GAME, { recursive: true, force: true });   // a clean folder every time: a file an older build left would ship
for (const f of files) { fs.mkdirSync(path.dirname(path.join(GAME, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(GAME, f)); }
fs.copyFileSync(path.join(ROOT, 'tools/crazygames/cg.js'), path.join(GAME, 'cg.js'));

function once(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: expected one, found ${n}`);
  return text.replace(from, () => to);
}
const indexFile = path.join(GAME, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');
const bridgeTag = html.match(/<script src="https:\/\/bridge\.playgama\.com\/[^"]+"[^>]*><\/script>/g) || [];
if (bridgeTag.length !== 1) throw new Error('the Bridge tag: expected one, found ' + bridgeTag.length);
html = once(html, bridgeTag[0], '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n<script src="cg.js"></script>', 'the Bridge tag');
html = once(html, ', Playgama 3.4.2)', ')', 'the boot language note');
html = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/).map((part, i) => (i % 2 ? part : part
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (all, open, css, close) => open + css.replace(/\/\*[\s\S]*?\*\//g, '') + close))).join('');
if (!html.includes('crazygames-sdk-v3.js') || !html.includes('src="cg.js"')) throw new Error('the CrazyGames tags are missing');
fs.writeFileSync(indexFile, html);

// The scripts' comments out, their code untouched: a comment alone on its line goes with its line, one after code with the spaces before
// it, a block comment across lines leaves a line break (no two lines joined: semicolon insertion stays as it was). Checked token for token.
const tokens = (src) => { const t = []; for (const k of acorn.tokenizer(src, { ecmaVersion: 'latest' })) t.push(k.type.label + '\u0000' + k.value); return t; };
function stripComments(src) {
  const cuts = [];
  acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', onComment: (block, text, start, end) => cuts.push([start, end, block && /[\n\r\u2028\u2029]/.test(text), block]) });
  let out = '', at = 0;
  for (const [start, end, multi, block] of cuts) {
    const lineStart = src.lastIndexOf('\n', start - 1) + 1;
    let s = start;
    while (s > at && (src[s - 1] === ' ' || src[s - 1] === '\t')) s--;
    const alone = s === lineStart && s >= at;
    let e = end;
    if (alone && !multi && src[e] === '\n') e++;   // the whole line, its break too
    else if (alone && !multi && src[e] === '\r' && src[e + 1] === '\n') e += 2;
    out += src.slice(at, s) + (multi ? '\n' : alone ? '' : block ? ' ' : '');   // (a block between two tokens keeps them apart)
    at = e;
  }
  return out + src.slice(at);
}
const scripts = files.filter((f) => f.endsWith('.js')).concat('cg.js');
for (const f of scripts) {
  const file = path.join(GAME, f), src = fs.readFileSync(file, 'utf8'), out = stripComments(src);
  const a = tokens(src), b = tokens(out);
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) throw new Error(`${f}: the code changed while its comments came out`);
  fs.writeFileSync(file, out);
}

// Nothing of the other portal anywhere in the folder's text.
const all = []; (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : all.push(p); } })(GAME);
for (const p of all) {
  if (/playgama/i.test(path.basename(p))) throw new Error('a Playgama file name: ' + p);
  if (/\.(html|js|json|css|txt|svg)$/i.test(p) && /playgama/i.test(fs.readFileSync(p, 'utf8'))) throw new Error('a Playgama word left in ' + path.relative(GAME, p));
}
const strays = fs.readdirSync(GAME).filter((n) => !['index.html', 'cg.js', 'src', 'assets'].includes(n));
if (strays.length) throw new Error('unexpected files in the CrazyGames folder: ' + strays.join(', '));
if (fs.existsSync(path.join(GAME, 'assets/_raw'))) throw new Error('assets/_raw in the CrazyGames folder');
if (all.length > 1500) throw new Error(`${all.length} files: CrazyGames takes 1500 at most`);

const version = (fs.readFileSync(path.join(ROOT, 'src/world.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1] || 'x';
const sha = git('rev-parse', '--short', 'HEAD') + (git('status', '--porcelain', '--', 'index.html', 'src', 'assets', 'tools/crazygames') ? '-dirty' : '');
const zip = path.join(OUT, `upwell-crazygames-${version}-${sha}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: GAME });
let bytes = 0; for (const p of all) bytes += fs.statSync(p).size;
console.log(`crazygames: ${all.length} files, ${(bytes / 1e6).toFixed(2)} MB in ${GAME}`);
console.log(`crazygames: ${zip} (${(fs.statSync(zip).size / 1e6).toFixed(2)} MB)`);
