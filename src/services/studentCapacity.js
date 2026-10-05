export const MAX_STUDENTS = 100000;
export function assertStudentCapacity(records, additional = 1) {
  let count = additional;
  for (const student of records) if (!student.movedToSession) count++;
  if (count > MAX_STUDENTS) {
    throw new Error('This session allows a maximum of 100,000 students.');
  }
}
export function nextRollNumber(records, campus) {
  const used = new Set(records.filter(s => s.campus === campus).map(s => s.rollNo));
  let number = 100;
  while (used.has(`${campus}-${number}`)) number++;
  return `${campus}-${number}`;
}
// Legacy vouchers without a student ID use roll number plus campus.
export function indexStudentSlips(slips) {
  const index = new Map();
  for (const slip of slips) {
    const key = slip.studentId ? `id:${slip.studentId}` : `roll:${slip.rollNo}:${slip.campus || ''}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(slip);
  }
  return student => [...(index.get(`id:${student.id}`) || []),
    ...(index.get(`roll:${student.rollNo}:${student.campus || ''}`) || []),
    ...(student.campus ? index.get(`roll:${student.rollNo}:`) || [] : [])];
}
