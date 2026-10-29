// Runs tools/bot.js on levels in a headless Chromium at phone size (375×812), so a long
// playtest needs no browser window and has no time limit. Needs the dev server running
// (python3 tools/serve.py 8793). Prints one JSON line per level. NOFOES=1 plays the same
// levels with the enemies taken out.
// Usage: node tools/botrun.mjs [seed] [level…]     e.g. node tools/botrun.mjs 5 2-3 3-1 (a random run's), c1-4 (the campaign's; c1-4L, c1-4R its map's sides);
// the seed r plays a campaign level on its recipe's own seed. d1, d2, d3: the daily well's levels, the seed its day (days since 1970: 20746 is 2026-10-20).
// c1-10 is world 1's boss: its line has the boss, the hearts dealt of its hearts, and when each went and what it was doing then;
// its hits say what the boss was doing (boss@warn). result: clear (out by the hole), won (the boss beaten), dead, or time (still
// going at the bot's cap). ORDER=k: a campaign tier's three parts in another order (and the play's other chances), from a seed
// of their own, as a player gets a new order each time (campMerge). The level's seed is the same, but its chunks come out
// otherwise too: the parts' odds of enemies draw on the same generator as its chunks.
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
for (let i = 0; !(await run(`document.readyState === 'complete' && typeof __up === 'object' && __up.started && typeof BOSS_FRAMES !== 'undefined'`)); i++) {
  if (i > 300) throw new Error('the game did not load');
  await new Promise((ok) => setTimeout(ok, 100));
}
await run(`new Promise((ok) => { const s = document.createElement('script'); s.src = 'tools/bot.js?' + Date.now(); s.onload = ok; document.body.append(s); })`);
await run('__up.freeze(true)');
// PARTS=all plays each campaign tier in every order of its three parts (worlds 1-3: the calm part first, К1; from world 4 all six), PARTS=021 one order
// (owner, К10 «А»: the bot over every order); LANDINGS=1 adds where the hero landed (botreport.py makes the landing map and the stalls and hits by chunk).
const PERMS = ['012', '021', '102', '120', '201', '210'];
const ordersOf = async (name) => {
  const P = process.env.PARTS;
  if (!P || name[0] !== 'c') return [null];
  if (P !== 'all') return [P];
  const [w, s] = name.replace(/^c/, '').replace(/[LR]$/, '').split('-').map(Number), alone = await run(`(() => { const r = CAMPAIGN[${w - 1}].levels[${s - 1}]; return ${s} === 1 || !!r.boss || r.bonus != null; })()`);
  return alone ? [null] : w <= 3 ? ['012', '021'] : PERMS;
};
try {
  for (const name of levels) for (const parts of await ordersOf(name)) {
    const camp = name[0] === 'c', col = /L$/.test(name) ? 0 : /R$/.test(name) ? 2 : 1, [w, s] = name.replace(/^c/, '').replace(/[LR]$/, '').split('-').map(Number);
    const daily = /^d\d$/.test(name), a = await run(daily ? `__bot.level(0, ${name[1] - 1}, ${+seed}, { noFoes: ${process.env.NOFOES === '1'}, daily: true })`
      : `__bot.level(${w - 1}, ${s - 1}, ${seed === 'r' ? 'null' : +seed}, { noFoes: ${process.env.NOFOES === '1'}, camp: ${camp}, col: ${col}, order: ${process.env.ORDER ? +process.env.ORDER : null}${parts ? `, parts: [${[...parts].join(',')}]` : ''} })`);
    const boss = a.boss && { boss: a.boss.name, dealt: `${a.boss.max - a.boss.hp}/${a.boss.max}`, blows: a.boss.dealt.map(([t, at]) => `${at}@${t}`) };
    console.log(JSON.stringify({ level: name, result: a.result === 'play' ? 'time' : a.result, time: a.time, heartsLost: a.heartsLost, hits: a.hits.map((h) => `${h.by}@${h.chunk}`), ...boss,
      foes: a.spawned, stomped: a.killed, coins: `${a.coins}/${a.coinsPlaced}`, combo: a.combo, stuck: a.stuck.map((q) => `${q.chunk}@${q.at}`), tight: a.tightness, wall: a.wall, wallJumps: a.wallJumps, rebounds: a.rebounds, flats: a.flats, tasks: a.tasks, chunks: a.chunks,
      ...(parts ? { order: parts } : {}), ...(process.env.LANDINGS === '1' ? { landings: a.landings } : {}) }));
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  process.exit();
}
