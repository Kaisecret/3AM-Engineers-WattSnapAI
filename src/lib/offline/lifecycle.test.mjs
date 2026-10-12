import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

function fixture() {
  const listeners = new Map(), timers = new Map(), intervals = new Map(), states = [], runs = [];
  let offline = true, active = true, auth, finish, progress, timerId = 0;
  const host = { navigator: {}, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); }, setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); }, setInterval(fn) { intervals.set(1, fn); return 1; }, clearInterval(id) { intervals.delete(id); } };
  const exports = {}, file = new URL('./lifecycle.ts', import.meta.url);
  if (existsSync(file)) vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, AbortController });
  const options = { accountId: 'account', host, events: ['device-change', 'receipt-change', 'settings-change'], keys: ['devices', 'receipts'], isCurrent: () => active, isOffline: () => offline,
    subscribeAuth(fn) { auth = fn; return () => { auth = null; }; }, status(state) { states.push(state); },
    async sync(signal, notifyProgress) { progress = notifyProgress; runs.push(signal); if (finish) await new Promise(resolve => { finish = resolve; }); return { state: 'synced', failed: [] }; } };
  const stop = exports.startRecordSync?.(options);
  return { stop, listeners, states, runs, intervals, progress: () => progress?.(), deadline: () => [...timers].find(([, timer]) => timer.ms === 45000)?.[0], async tick() { const queued = [...timers].filter(([, timer]) => timer.ms === 250); queued.forEach(([id, timer]) => { timers.delete(id); timer.fn(); }); for (let i = 0; i < 15; i++) await Promise.resolve(); }, event(name, detail) { listeners.get(name)?.(detail); }, auth(event) { auth?.(event); }, set offline(value) { offline = value; }, set active(value) { active = value; }, hold() { finish = true; }, release() { const resolve = finish; finish = null; resolve(); } };
}
test('sync starts offline and automatically runs after reconnect, edits, focus, and token refresh', async () => {
  const f = fixture(); assert.equal(typeof f.stop, 'function'); await f.tick(); assert.equal(f.runs.length, 0);
  f.offline = false; f.event('online'); await f.tick(); assert.equal(f.runs.length, 1);
  for (const event of ['device-change', 'receipt-change', 'settings-change', 'focus', 'pageshow']) { f.event(event); await f.tick(); }
  f.auth('TOKEN_REFRESHED'); await f.tick(); assert.equal(f.runs.length, 7); assert.equal(f.states.at(-1).state, 'synced'); f.stop();
});
test('saves during a sync schedule another pass without overlapping requests', async () => {
  const f = fixture(); assert.equal(typeof f.stop, 'function'); f.offline = false; f.hold(); await f.tick();
  f.event('device-change'); await f.tick(); assert.equal(f.runs.length, 1);
  f.release(); await f.tick(); await f.tick(); assert.equal(f.runs.length, 2); f.stop();
});
test('cleanup aborts in-flight work and removes retries/listeners', async () => {
  const f = fixture(); assert.equal(typeof f.stop, 'function'); f.offline = false; f.hold(); await f.tick();
  f.stop(); assert.equal(f.runs[0].aborted, true); assert.equal(f.listeners.size, 0); assert.equal(f.intervals.size, 0); f.release();
});
test('database hydration events update screens without scheduling another upload', async () => {
  const f = fixture(); f.offline = false; await f.tick();
  const before = f.runs.length;
  f.event('device-change', { detail: { source: 'database-sync' } }); await f.tick();
  assert.equal(f.runs.length, before); f.stop();
});

test('a slow sync that keeps making progress renews its timeout instead of restarting from the beginning', async () => {
  const f = fixture(); f.offline = false; f.hold(); await f.tick();
  const original = f.deadline(); f.progress();
  assert.notEqual(f.deadline(), original); assert.equal(f.runs[0].aborted, false);
  f.release(); await f.tick(); f.stop();
});
