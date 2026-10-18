// Runs tools/bot.js on levels in a headless Chromium at phone size (375×812), so a long
// playtest needs no browser window and has no time limit. Needs the dev server running
// (python3 tools/serve.py 8793). Prints one JSON line per level. NOFOES=1 plays the same
// levels with the enemies taken out.
// Usage: node tools/botrun.mjs [seed] [level…]     e.g. node tools/botrun.mjs 5 2-3 3-1 (a random run's), c1-4 (the campaign's)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PAGE = process.env.PAGE || 'http://localhost:8793/';
const [seed = '5', ...asked] = process.argv.slice(2);
const levels = asked.length ? asked : [1, 2, 3, 4].flatMap((w) => [1, 2, 3].map((s) => `${w}-${s}`));

const chrome = spawn(CHROME, ['--remote-debugging-port=0', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'upwell-'))}`,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
process.on('exit', () => chrome.kill());   // whatever way this ends, the browser goes with it
const wsUrl = await new Promise((ok, no) => {
  let log = '';
  chrome.stderr.on('data', (d) => { log += d; const m = log.match(/ws:\/\/\S+/); if (m) ok(m[0]); });
  chrome.on('exit', () => no(new Error('chrome quit: ' + log)));
});
const ws = new WebSocket(wsUrl);
await new Promise((ok) => ws.addEventListener('open', ok));
let id = 0;
const waiting = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
const send = (method, params = {}, sessionId) => new Promise((ok, no) => {
  waiting.set(++id, (m) => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
const run = async (expression) => {
  const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await page('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
await page('Page.navigate', { url: PAGE });
for (let i = 0; !(await run(`document.readyState === 'complete' && typeof __up === 'object' && __up.started`)); i++) {
  if (i > 300) throw new Error('the game did not load');
  await new Promise((ok) => setTimeout(ok, 100));
}
await run(`new Promise((ok) => { const s = document.createElement('script'); s.src = 'tools/bot.js?' + Date.now(); s.onload = ok; document.body.append(s); })`);
await run('__up.freeze(true)');
try {
  for (const name of levels) {
    const camp = name[0] === 'c', [w, s] = name.replace(/^c/, '').split('-').map(Number);
    const a = await run(`__bot.level(${w - 1}, ${s - 1}, ${+seed}, { noFoes: ${process.env.NOFOES === '1'}, camp: ${camp} })`);
    console.log(JSON.stringify({ level: name, result: a.result, time: a.time, heartsLost: a.heartsLost, hits: a.hits.map((h) => `${h.by}@${h.chunk}`),
      foes: a.spawned, stomped: a.killed, coins: `${a.coins}/${a.coinsPlaced}`, combo: a.combo, stuck: a.stuck.map((q) => `${q.chunk}@${q.at}`), tight: a.tightness, chunks: a.chunks }));
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  process.exit();
}
