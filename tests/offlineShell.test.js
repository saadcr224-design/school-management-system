import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
function worker(cache) {
  const handlers = {};
  vm.runInNewContext(code, { URL, self: { location: { origin: 'https://school.test' }, addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => {} } }, caches: { open: async () => cache } });
  return handlers;
}
test('production install precaches every JS/CSS bundle and fails on incomplete download', async () => {
  let assets;
  const handlers = worker({ addAll: async list => { assets = list; } });
  let installed;
  handlers.install({ waitUntil: promise => { installed = promise; } });
  await installed;
  for (const name of readdirSync(new URL('../dist/assets', import.meta.url))) assert.ok(assets.includes('/assets/' + name));
  assert.ok(assets.includes('/index.html'));
  const failed = worker({ addAll: async () => { throw new Error('network'); } });
  failed.install({ waitUntil: promise => { installed = promise; } });
  await assert.rejects(installed, /network/);
});
test('offline navigation returns cached HTML without requiring a network request', async () => {
  const handlers = worker({ match: async path => path === '/index.html' ? 'cached app' : null });
  let response;
  handlers.fetch({ request: { method: 'GET', url: 'https://school.test/students', mode: 'navigate' }, respondWith: value => { response = value; } });
  assert.equal(await response, 'cached app');
  let intercepted = false;
  handlers.fetch({ request: { method: 'GET', url: 'https://firestore.googleapis.com/data' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
