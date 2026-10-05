import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
const legacy = new Map([
  ['peace_students', '[{"id":"old","balance":2300}]'],
  ['sca_academic_sessions', '["2026-2027","2027-2028"]'],
  ['unrelated', 'ignore']
]);
globalThis.indexedDB = indexedDB;
globalThis.window = new EventTarget();
window.localStorage = {
  get length() { return legacy.size; },
  key: n => [...legacy.keys()][n],
  getItem: key => legacy.get(key) ?? null
};
const storage = await import('../src/services/durableStorage.js');
test('migrates legacy data once and persists 10,000 full records beyond localStorage size', async () => {
  await storage.initializeStorage();
  assert.equal(storage.durableStorage.getItem('peace_students'), legacy.get('peace_students'));
  assert.equal(storage.durableStorage.getItem('unrelated'), null);
  const records = Array.from({ length: 10000 }, (_, i) => ({ id: `std-${i}`, name: `Student ${i}`, balance: i, notes: 'x'.repeat(700) }));
  const payload = JSON.stringify(records);
  assert.ok(payload.length > 7_000_000);
  storage.durableStorage.setItem('peace_students', payload);
  storage.durableStorage.removeItem('sca_academic_sessions');
  await storage.flushStorage();
  const tx = indexedDB.open('sca-school-records', 1);
  const db = await new Promise(resolve => { tx.onsuccess = () => resolve(tx.result); });
  const stored = await new Promise(resolve => {
    const request = db.transaction('records').objectStore('records').get('peace_students');
    request.onsuccess = () => resolve(request.result);
  });
  assert.equal(JSON.parse(stored).length, 10000);
  assert.equal(JSON.parse(stored)[9999].balance, 9999);
  const reloaded = await import('../src/services/durableStorage.js?reload');
  await reloaded.initializeStorage();
  assert.equal(reloaded.durableStorage.getItem('peace_students'), payload);
  assert.equal(reloaded.durableStorage.getItem('sca_academic_sessions'), null, 'deleted values must not migrate again');
  assert.equal(legacy.get('peace_students'), '[{"id":"old","balance":2300}]', 'legacy recovery copy is untouched');
  db.close();
});
