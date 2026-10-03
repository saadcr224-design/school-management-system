// The session is fixed for this page lifetime. Switching reloads the app, so
// open forms, asynchronous writes and subscriptions cannot drift into another year.
export const LEGACY_SESSION = '2026-2027';
export const SESSION_KEYS = ['peace_students', 'peace_staff', 'peace_fee_slips', 'peace_ledger', 'peace_attendance', 'peace_families'];
export function isSession(value) {
  return typeof value === 'string' && /^\d{4}-\d{4}$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 9998 &&
    Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;
}
export function storageKey(key, session) {
  return SESSION_KEYS.includes(key) && session !== LEGACY_SESSION ? `${key}__${session}` : key;
}
export function collectionPath(name, session) {
  // Preserve legacy root collections; new years have independent subcollections.
  const canonical = name === 'fee_slips' ? 'feeSlips' : name;
  return ['students', 'staff', 'feeSlips', 'ledger', 'attendance', 'families'].includes(canonical) && session !== LEGACY_SESSION
    ? ['academicSessions', session, canonical] : [canonical];
}
export function createSessionStorage(storage, session) {
  return {
    getItem(key) {
      const value = storage.getItem(storageKey(key, session));
      // Never populate a new year with the old sample students or transactions.
      return value === null && session !== LEGACY_SESSION && SESSION_KEYS.includes(key) ? '[]' : value;
    },
    setItem(key, value) { storage.setItem(storageKey(key, session), value); },
    removeItem(key) { storage.removeItem(storageKey(key, session)); },
  };
}
let selected = LEGACY_SESSION;
try {
  const saved = globalThis.sessionStorage?.getItem('sca_active_session');
  if (isSession(saved)) selected = saved;
} catch { /* Existing session remains available when browser storage is restricted. */ }
export const ACTIVE_SESSION = selected;
export const SESSION_START_YEAR = ACTIVE_SESSION.slice(0, 4);
export const SESSION_END_YEAR = ACTIVE_SESSION.slice(5);
export const SESSION_LABEL = ACTIVE_SESSION.replace('-', '–');
export function readSessions(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem('sca_academic_sessions') || '[]');
    return [...new Set([LEGACY_SESSION, ACTIVE_SESSION, ...(Array.isArray(saved) ? saved.filter(isSession) : [])])].sort();
  } catch { return [...new Set([LEGACY_SESSION, ACTIVE_SESSION])].sort(); }
}
export function rememberSessions(sessions, storage = globalThis.localStorage) {
  const merged = [...new Set([...readSessions(storage), ...sessions.filter(isSession)])].sort();
  storage.setItem('sca_academic_sessions', JSON.stringify(merged));
  return merged;
}
export function sessionDate(month, day = 15) {
  const index = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
  if (index < 0) throw new Error('Invalid academic month');
  const year = index < 3 ? SESSION_END_YEAR : SESSION_START_YEAR;
  return `${year}-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
