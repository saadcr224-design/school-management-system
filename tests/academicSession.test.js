import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStorage, collectionPath, isSession, readSessions, rememberSessions, sessionDate } from '../src/services/academicSession.js';
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
test('legacy data remains in place; same student and payment IDs in other years are isolated', () => {
  const raw = memory();
  raw.setItem('peace_students', '[{"id":"std-1","classGrade":"9th"}]');
  raw.setItem('peace_fee_slips', '[{"id":"fee-1","amountPaid":5000}]');
  const previous = createSessionStorage(raw, '2026-2027');
  const next = createSessionStorage(raw, '2027-2028');
  assert.equal(next.getItem('peace_students'), '[]');
  assert.equal(next.getItem('peace_fee_slips'), '[]');
  next.setItem('peace_students', '[{"id":"std-1","classGrade":"10th"}]');
  next.setItem('peace_fee_slips', '[{"id":"fee-1","amountPaid":1000}]');
  assert.equal(JSON.parse(previous.getItem('peace_students'))[0].classGrade, '9th');
  assert.equal(JSON.parse(previous.getItem('peace_fee_slips'))[0].amountPaid, 5000);
  next.removeItem('peace_fee_slips');
  assert.equal(JSON.parse(previous.getItem('peace_fee_slips'))[0].amountPaid, 5000);
  assert.equal(createSessionStorage(raw, '2027-2028').getItem('peace_students'), next.getItem('peace_students'));
});
test('accounts and school settings remain shared across sessions', () => {
  const raw = memory(); const a = createSessionStorage(raw, '2026-2027'); const b = createSessionStorage(raw, '2030-2031');
  a.setItem('peace_users', '[{"id":"admin"}]');
  a.setItem('peace_school_profile', '{"name":"School"}');
  assert.equal(a.getItem('peace_users'), b.getItem('peace_users'));
  assert.equal(a.getItem('peace_school_profile'), b.getItem('peace_school_profile'));
});
test('every academic cloud collection is scoped; authentication collections are not', () => {
  for (const name of ['students','staff','feeSlips','ledger','attendance','families']) {
    assert.deepEqual(collectionPath(name, '2026-2027'), [name]);
    assert.deepEqual(collectionPath(name, '2027-2028'), ['academicSessions','2027-2028',name]);
  }
  assert.deepEqual(collectionPath('fee_slips','2027-2028'), ['academicSessions','2027-2028','feeSlips']);
  assert.deepEqual(collectionPath('users','2027-2028'), ['users']);
});
test('session registry validates years, survives reload and merges devices without duplicates', () => {
  const raw = memory();
  assert.ok(isSession('2027-2028')); assert.ok(!isSession('2027-2029')); assert.ok(!isSession('../2027'));
  rememberSessions(['2027-2028','bad'], raw); rememberSessions(['2028-2029','2027-2028'], raw);
  assert.deepEqual(readSessions(raw), ['2026-2027','2027-2028','2028-2029']);
});
test('January through March use the session end year', () => {
  assert.equal(sessionDate('April'), '2026-04-15');
  assert.equal(sessionDate('January'), '2027-01-15');
  assert.equal(sessionDate('March'), '2027-03-15');
});
