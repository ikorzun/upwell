// The Poki build: the game's tracked files (index.html, src, assets; never assets/_raw), with Poki's SDK and tools/poki/poki.js where the
// Playgama Bridge was, <html data-host="poki"> (what src/game.js's POKI reads), and the page's own notes left out (they name the other
// portal). The folder is what Poki's Inspector takes; the zip is what goes to Poki for Developers. Each change is made exactly once, or the
// build stops: a line moved in index.html needs a look here.
//   node tools/poki/build.mjs [out-dir]      (default ~/Desktop/Claude/UPWELL/poki: game/ and upwell-poki-<version>-<sha>.zip)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.argv[2] || path.join(os.homedir(), 'Desktop/Claude/UPWELL/poki'));
const GAME = path.join(OUT, 'game');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

const files = git('ls-files', 'index.html', 'src', 'assets').split('\n').filter((f) => f && !f.startsWith('assets/_raw/'));
if (fs.existsSync(GAME)) fs.rmSync(GAME, { recursive: true, force: true });   // a clean folder every time: a file an older build left would ship
for (const f of files) { fs.mkdirSync(path.dirname(path.join(GAME, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(GAME, f)); }
fs.copyFileSync(path.join(ROOT, 'tools/poki/poki.js'), path.join(GAME, 'poki.js'));

function once(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: expected one, found ${n}`);
  return text.replace(from, () => to);
}
const indexFile = path.join(GAME, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');
const bridgeTag = html.match(/<script async src="https:\/\/bridge\.playgama\.com\/[^"]+"[^>]*><\/script>/g) || [];
if (bridgeTag.length !== 1) throw new Error('the Bridge tag: expected one, found ' + bridgeTag.length);
// Poki's tag as its docs show it (in the head, not deferred: its loader is small, and the game asks for it at boot), then the adapter.
html = once(html, bridgeTag[0], '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n<script src="poki.js"></script>', 'the Bridge tag');
html = once(html, '<html lang="en" data-theme="dark">', '<html lang="en" data-theme="dark" data-host="poki">', 'the <html> tag');
// The markup's and the styles' notes out; scripts byte for byte.
html = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/).map((part, i) => (i % 2 ? part : part
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (all, open, css, close) => open + css.replace(/\/\*[\s\S]*?\*\//g, '') + close))).join('');
if (/bridge\.playgama\.com|playgama/i.test(html)) throw new Error('a Playgama reference is left in index.html');
if (!html.includes('poki-sdk.js') || !html.includes('data-host="poki"')) throw new Error('the Poki tags are missing');
fs.writeFileSync(indexFile, html);

const strays = fs.readdirSync(GAME).filter((n) => !['index.html', 'poki.js', 'src', 'assets'].includes(n));
if (strays.length) throw new Error('unexpected files in the Poki folder: ' + strays.join(', '));
if (fs.existsSync(path.join(GAME, 'assets/_raw'))) throw new Error('assets/_raw in the Poki folder');

const version = (fs.readFileSync(path.join(ROOT, 'src/world.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1] || 'x';
const sha = git('rev-parse', '--short', 'HEAD') + (git('status', '--porcelain', '--', 'index.html', 'src', 'assets', 'tools/poki') ? '-dirty' : '');
const zip = path.join(OUT, `upwell-poki-${version}-${sha}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: GAME });
let bytes = 0; for (const f of [...files, 'poki.js']) bytes += fs.statSync(path.join(GAME, f === 'poki.js' ? 'poki.js' : f)).size;
console.log(`poki: ${files.length + 1} files, ${(bytes / 1e6).toFixed(2)} MB in ${GAME}`);
console.log(`poki: ${zip} (${(fs.statSync(zip).size / 1e6).toFixed(2)} MB)`);
