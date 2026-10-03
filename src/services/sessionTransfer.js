import { isSession, createSessionStorage, STUDENT_SESSION_STORE } from './academicSession.js';

export function visibleStudents(records) {
  return records.filter(student => !student.movedToSession);
}

// Financial history and family membership belong to the original academic year.
const yearFields = ['balance', 'feeHistory', 'paymentHistory', 'feePayments', 'familyId', 'siblingRank', 'siblingDiscountPercent'];
export function planStudentTransfer(source, destination, ids, fromSession, toSession, now = new Date().toISOString()) {
  if (!isSession(fromSession) || !isSession(toSession) || fromSession === toSession) throw new Error('Choose a different valid session.');
  const selected = [...new Set(ids)];
  if (!selected.length) throw new Error('Select at least one student.');
  if (selected.length > 100) throw new Error('Move up to 100 students at a time.');
  const moved = selected.map(id => {
    const student = source.find(s => s.id === id && !s.movedToSession);
    if (!student) throw new Error('A selected student has changed or already moved. Refresh and try again.');
    const existing = destination.find(s => s.id === id);
    if (existing && !existing.movedToSession) throw new Error(`${student.name} already exists in the destination. Nothing was moved.`);
    if (existing && existing.movedToSession !== fromSession) throw new Error(`${student.name} was moved to another session. Nothing was moved.`);
    if (destination.some(s => !s.movedToSession && s.id !== id && s.rollNo === student.rollNo && s.campus === student.campus)) {
      throw new Error(`Roll number ${student.rollNo} already exists in the destination campus. Nothing was moved.`);
    }
    const profile = { ...student };
    for (const field of yearFields) delete profile[field];
    delete profile.movedToSession;
    const financial = { balance: 0, feeHistory: [], familyId: null, siblingRank: 1, siblingDiscountPercent: 0 };
    // Moving back restores that year's own financial fields, never another year's.
    if (existing) for (const field of yearFields) if (existing[field] !== undefined) financial[field] = existing[field];
    return { ...profile, ...financial, sessionId: toSession, transferredFromSession: fromSession, transferredAt: now };
  });
  return {
    source: source.map(s => selected.includes(s.id) ? { ...s, movedToSession: toSession, transferredAt: now } : s),
    destination: [...destination.filter(s => !selected.includes(s.id)), ...moved],
    moved,
  };
}

// One localStorage write commits BOTH rosters, so a quota error cannot half-move students.
export function commitLocalStudentTransfer(storage, fromSession, toSession, plan) {
  const sessions = JSON.parse(storage.getItem(STUDENT_SESSION_STORE) || '{}');
  storage.setItem(STUDENT_SESSION_STORE, JSON.stringify({ ...sessions, [fromSession]: plan.source, [toSession]: plan.destination }));
}
export function readSessionStudents(storage, session) {
  return JSON.parse(createSessionStorage(storage, session).getItem('peace_students') || '[]');
}
