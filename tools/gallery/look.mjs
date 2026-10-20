// The gallery's runner (tools/gallery): opens the game headless at phone size (393 x 660 @3x) on the dev server, runs a scene setup, then ticks and
// captures screenshots + returns traces. Usage: node look.mjs <setup.js> <outPrefix>
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const [setupFile, out] = process.argv.slice(2);
const chrome = spawn(CHROME, ['--remote-debugging-port=0', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'upwell-look-'))}`,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--lang=ru-RU', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
try {
  await page('Emulation.setDeviceMetricsOverride', { width: 393, height: 660, deviceScaleFactor: 3, mobile: true });
  await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page('Page.navigate', { url: 'http://localhost:8793/' + (process.env.Q || '') });
  for (let i = 0; !(await run(`document.readyState === 'complete' && typeof __up === 'object' && __up.started`)); i++) {
    if (i > 100) throw new Error('no load');
    await new Promise((ok) => setTimeout(ok, 100));
  }
  await run('__up.freeze(true)');
  // the setup defines window.__steps = [ () => ({...}) , ...]: each step runs, then a screenshot
  await run(readFileSync(setupFile, 'utf8'));
  const n = await run('window.__steps.length');
  const logs = [];
  for (let i = 0; i < n; i++) {
    logs.push(await run(`window.__steps[${i}]()`));
    const shot = await page('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    writeFileSync(`${out}-${i}.jpg`, Buffer.from(shot.data, 'base64'));
  }
  for (const l of logs) console.log(JSON.stringify(l));
} catch (e) {
  console.log('ERROR', e.message);
} finally {
  chrome.kill();
  process.exit(0);
}
