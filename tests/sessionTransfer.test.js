import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planStudentTransfer, visibleStudents, commitLocalStudentTransfer, readSessionStudents } from '../src/services/sessionTransfer.js';
import { createSessionStorage, STUDENT_SESSION_STORE } from '../src/services/academicSession.js';
const from = '2026-2027', to = '2027-2028';
const student = { id: 's1', name: 'Student One', rollNo: '1', campus: 'A', fatherName: 'Parent', classGrade: '9th', phone: 'test', monthlyFee: 5000, balance: 2200, feeHistory: [{ monthlyFee: 4000 }], familyId: 'family-1', siblingRank: 2, siblingDiscountPercent: 25 };
const memory = () => { const values=new Map(); return { getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key) }; };
test('move changes only selected roster membership and keeps identity and rates',()=>{
  const source=[student,{...student,id:'s2',rollNo:'2'}];
  const plan=planStudentTransfer(source,[],['s1'],from,to,'now');
  assert.deepEqual(visibleStudents(plan.source).map(s=>s.id),['s2']);
  assert.deepEqual(visibleStudents(plan.destination).map(s=>s.id),['s1']);
  assert.equal(plan.destination[0].fatherName,'Parent');
  assert.equal(plan.destination[0].monthlyFee,5000);
  assert.equal(plan.destination[0].balance,0);
  assert.deepEqual(plan.destination[0].feeHistory,[]);
  assert.equal(plan.destination[0].familyId,null);
  assert.equal(source[0].movedToSession,undefined);
  assert.equal(plan.source[0].balance,2200);
});
test('same-session moves and duplicate active IDs/roll numbers are rejected',()=>{
  assert.throws(()=>planStudentTransfer([student],[],['s1'],from,from));
  assert.throws(()=>planStudentTransfer([student],[student],['s1'],from,to),/already exists/);
  assert.throws(()=>planStudentTransfer([student],[{...student,id:'different'}],['s1'],from,to),/Roll number/);
  assert.throws(()=>planStudentTransfer([student],[],[],from,to),/Select/);
});
test('retry after success cannot duplicate a moved student',()=>{
  const plan=planStudentTransfer([student],[],['s1'],from,to);
  assert.throws(()=>planStudentTransfer(plan.source,plan.destination,['s1'],from,to),/already moved/);
});
test('moving back restores original-year balance and family, without importing later payments',()=>{
  const first=planStudentTransfer([student],[],['s1'],from,to);
  first.destination[0].balance=900;
  const back=planStudentTransfer(first.destination,first.source,['s1'],to,from);
  assert.equal(back.destination[0].balance,2200);
  assert.equal(back.destination[0].familyId,'family-1');
  assert.equal(visibleStudents(back.source).length,0);
  assert.equal(visibleStudents(back.destination).length,1);
});
test('one atomic local write persists both sessions and subsequent normal edits stay separate',()=>{
  const storage=memory(); const original=createSessionStorage(storage,from); const next=createSessionStorage(storage,to);
  original.setItem('peace_students',JSON.stringify([student]));
  original.setItem('peace_fee_slips','[{"id":"fee1","amountPaid":5000}]');
  const plan=planStudentTransfer([student],[],['s1'],from,to);
  commitLocalStudentTransfer(storage,from,to,plan);
  assert.equal(visibleStudents(readSessionStudents(storage,from)).length,0);
  assert.equal(visibleStudents(readSessionStudents(storage,to)).length,1);
  const updated=readSessionStudents(storage,to);updated[0].name='Changed';
  next.setItem('peace_students',JSON.stringify(updated));
  assert.equal(readSessionStudents(storage,from)[0].name,'Student One');
  assert.equal(readSessionStudents(storage,to)[0].name,'Changed');
  assert.equal(next.getItem('peace_fee_slips'),'[]');
  assert.equal(original.getItem('peace_fee_slips'),'[{"id":"fee1","amountPaid":5000}]');
});
test('storage quota failure leaves both rosters intact',()=>{
  const storage=memory();storage.setItem('peace_students',JSON.stringify([student]));
  const failing={...storage,setItem:(key,value)=>{if(key===STUDENT_SESSION_STORE)throw new Error('Quota exceeded');storage.setItem(key,value);}};
  assert.throws(()=>commitLocalStudentTransfer(failing,from,to,planStudentTransfer([student],[],['s1'],from,to)),/Quota/);
  assert.equal(visibleStudents(readSessionStudents(storage,from)).length,1);
  assert.equal(readSessionStudents(storage,to).length,0);
});
test('bulk transfers reject stale selection without changing either input',()=>{
  const source=[student];const destination=[];
  assert.throws(()=>planStudentTransfer(source,destination,['s1','missing'],from,to),/changed/);
  assert.equal(source[0].movedToSession,undefined);assert.deepEqual(destination,[]);
});
