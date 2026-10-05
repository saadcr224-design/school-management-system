import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStudentCapacity, nextRollNumber, indexStudentSlips } from '../src/services/studentCapacity.js';
import { planStudentTransfer } from '../src/services/sessionTransfer.js';
test('allows the 100,000th admission and rejects overflow including transfers', () => {
  const records = Array.from({ length: 99999 }, (_, i) => ({ id: `${i}`, campus: 'A', rollNo: `A-${i + 100}` }));
  assert.doesNotThrow(() => assertStudentCapacity(records));
  assert.equal(nextRollNumber(records, 'A'), 'A-100099');
  records.push({ id: 'last' });
  assert.throws(() => assertStudentCapacity(records), /100,000/);
  assert.throws(() => planStudentTransfer([{ id: 'new', rollNo: 'A-20000' }], records, ['new'], '2026-2027', '2027-2028'), /100,000/);
  records[0].movedToSession = '2028-2029';
  assert.doesNotThrow(() => assertStudentCapacity(records));
});
test('fee index preserves identity and legacy campus isolation', () => {
  const slips = [{ id: 'a', studentId: '1' }, { id: 'b', rollNo: '42', campus: 'A' }, { id: 'c', rollNo: '42', campus: 'B' }, { id: 'd', rollNo: '42' }];
  assert.deepEqual(indexStudentSlips(slips)({ id: '1', rollNo: '42', campus: 'A' }).map(s => s.id), ['a', 'b', 'd']);
});
