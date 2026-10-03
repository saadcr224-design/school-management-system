import { isSession, createSessionStorage, STUDENT_SESSION_STORE } from './academicSession.js';

export function visibleStudents(records) {
  return records.filter(student => !student.movedToSession);
}

// Financial history and family membership belong to the original academic year.
const yearFields = ['totalBilled', 'totalPaid', 'balance', 'feeHistory', 'paymentHistory', 'feePayments', 'familyId', 'siblingRank', 'siblingDiscountPercent'];
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
  const records = { ...sessions, [fromSession]: plan.source, [toSession]: plan.destination };
  if (plan.sourceFeeSlips) records.__feeSlips = { ...sessions.__feeSlips, [fromSession]: plan.sourceFeeSlips, [toSession]: plan.destinationFeeSlips };
  storage.setItem(STUDENT_SESSION_STORE, JSON.stringify(records));
}
export function readSessionStudents(storage, session) {
  return JSON.parse(createSessionStorage(storage, session).getItem('peace_students') || '[]');
}

export function belongsToStudent(slip, student) {
  return slip.studentId ? slip.studentId === student.id : slip.rollNo === student.rollNo && (!slip.campus || slip.campus === student.campus);
}
export function outstandingDues(student, slips) {
  const unpaid = slips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, student))
    .reduce((sum, s) => sum + Math.max(0, Number(s.totalAmount || 0) - Number(s.amountPaid || 0)), 0);
  // The stored balance can include opening dues not represented by a challan.
  return Math.round(Math.max(unpaid, Number(student.balance) || 0) * 100) / 100;
}
export function planTransferWithDues(source, destination, sourceSlips, destinationSlips, ids, from, to, transferId, now = new Date().toISOString()) {
  const plan = planStudentTransfer(source, destination, ids, from, to, now);
  const carrySlips = [];
  const markedIds = new Set();
  for (const student of plan.moved) {
    const original = source.find(s => s.id === student.id);
    const due = outstandingDues(original, sourceSlips);
    const unpaid = sourceSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, original) && Number(s.totalAmount || 0) > Number(s.amountPaid || 0));
    unpaid.forEach(s => markedIds.add(s.id));
    const destinationBalance = destinationSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, student))
      .reduce((sum, s) => sum + Math.max(0, Number(s.totalAmount || 0) - Number(s.amountPaid || 0)), 0);
    student.balance = Math.round((destinationBalance + due) * 100) / 100;
    student.totalBilled = destinationSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, student)).reduce((sum,s) => sum + Number(s.totalAmount || 0), due);
    student.totalPaid = destinationSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, student)).reduce((sum,s) => sum + Number(s.amountPaid || 0), 0);
    if (due <= 0) continue;
    const id = `carry-${transferId}-${student.id}`;
    if (destinationSlips.some(s => s.id === id)) throw new Error('This transfer has already been saved. Refresh before trying again.');
    carrySlips.push({
      id, challanNo: `CF-${transferId}-${student.rollNo || student.id}`, studentId: student.id,
      studentName: student.name, fatherName: student.fatherName || '', rollNo: student.rollNo || '',
      campus: student.campus || '', classGrade: student.classGrade || '', section: student.section || '', phone: student.phone || '',
      month: `Opening dues from ${from}`, issueDate: now.slice(0,10), dueDate: now.slice(0,10),
      tuitionFee: 0, transportFee: 0, admissionFee: 0, examFee: 0, discount: 0,
      miscCharges: due, miscDescription: `Outstanding dues transferred from session ${from}`,
      subtotal: due, totalAmount: due, amountPaid: 0, paymentHistory: [], status: 'Unpaid',
      isSessionCarryForward: true, originSession: from, transferId,
      sourceDues: unpaid.map(s => ({ slipId: s.id, month: s.month || '', totalAmount: Number(s.totalAmount || 0), amountPaid: Number(s.amountPaid || 0), remaining: Math.max(0, Number(s.totalAmount || 0) - Number(s.amountPaid || 0)) })),
      notes: `Student and unpaid dues moved from ${from} to ${to}. Previous payments remain recorded in ${from}.`
    });
  }
  plan.sourceFeeSlips = sourceSlips.map(s => markedIds.has(s.id) ? { ...s, duesTransferredToSession: to, duesTransferId: transferId, duesTransferredAt: now } : s);
  plan.destinationFeeSlips = [...destinationSlips, ...carrySlips];
  plan.carriedSlips = carrySlips;
  plan.transferredSlipIds = [...markedIds];
  plan.totalDues = carrySlips.reduce((sum,s) => sum + s.totalAmount, 0);
  return plan;
}
export function readSessionFeeSlips(storage, session) {
  return JSON.parse(createSessionStorage(storage, session).getItem('peace_fee_slips') || '[]');
}
