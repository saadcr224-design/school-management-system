// A synchronous view for React, backed by committed IndexedDB transactions.
// Existing localStorage records are migrated once and retained as a recovery copy.
let database;
const values = new Map();
let queue = Promise.resolve();
let failure = null;
let pending = 0;
export const storageStatus = { pending: false, error: null };
const managed = key => /^(peace_|shezad_|sca_)/.test(key);
function report() {
  Object.assign(storageStatus, { pending: pending > 0, error: failure?.message || null });
  window.dispatchEvent(new Event('sca-storage-status'));
}
function transaction(action) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('records', 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Device storage could not save.'));
    action(tx.objectStore('records'));
  });
}
export async function initializeStorage() {
  database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('sca-school-records', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other school app tabs and try again.'));
  });
  await new Promise((resolve, reject) => {
    const tx = database.transaction('records', 'readonly');
    const request = tx.objectStore('records').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { values.set(cursor.key, cursor.value); cursor.continue(); }
    };
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error);
  });
  if (!values.has('__migrated')) {
    const entries = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (managed(key)) entries.push([key, window.localStorage.getItem(key)]);
    }
    await transaction(store => {
      for (const [key, value] of entries) store.put(value, key);
      store.put('1', '__migrated');
    });
    for (const [key, value] of entries) values.set(key, value);
    values.set('__migrated', '1');
  }
  // Best effort: browsers retain authority over persistence and available space.
  navigator.storage?.persist?.().catch(() => {});
}
function enqueue(key, value) {
  pending++;
  report();
  queue = queue.then(() => transaction(store => value === null ? store.delete(key) : store.put(value, key)))
    .catch(error => { failure = error; })
    .finally(() => { pending--; report(); });
}
export const durableStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) {
    if (failure) throw failure;
    value = String(value);
    if (values.get(key) === value) return;
    values.set(key, value);
    enqueue(key, value);
  },
  removeItem(key) {
    if (failure) throw failure;
    values.delete(key);
    enqueue(key, null);
  }
};
export async function flushStorage() {
  await queue;
  if (failure) throw failure;
}
window.addEventListener('beforeunload', event => {
  if (pending || failure) { event.preventDefault(); event.returnValue = ''; }
});
export async function retryStorage() {
  await queue;
  try {
    await transaction(store => {
      store.clear();
      for (const [key, value] of values) store.put(value, key);
    });
    failure = null;
  } catch (error) { failure = error; }
  report();
}
