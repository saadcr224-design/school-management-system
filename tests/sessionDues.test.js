import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTransferWithDues, outstandingDues, commitLocalStudentTransfer, readSessionStudents, readSessionFeeSlips } from '../src/services/sessionTransfer.js';
import { createSessionStorage } from '../src/services/academicSession.js';
const student={id:'s1',name:'Test',rollNo:'1',campus:'ABB',balance:7000,monthlyFee:5000};
const slips=[{id:'partial',studentId:'s1',totalAmount:10000,amountPaid:3000,month:'April 2026',paymentHistory:[{amount:3000}]},{id:'paid',studentId:'s1',totalAmount:5000,amountPaid:5000,month:'May 2026'}];
const plan=(source=[student],dest=[],sourceFees=slips,destFees=[],from='2026-2027',to='2027-2028',id='transfer')=>planTransferWithDues(source,dest,sourceFees,destFees,['s1'],from,to,id,'2026-10-03T16:00:00Z');
test('partial fees carry only the unpaid amount, not previous payments',()=>{
 const p=plan();assert.equal(p.totalDues,7000);assert.equal(p.carriedSlips[0].totalAmount,7000);assert.equal(p.carriedSlips[0].amountPaid,0);
 assert.equal(p.sourceFeeSlips[0].amountPaid,3000);assert.equal(p.sourceFeeSlips[0].duesTransferredToSession,'2027-2028');
 assert.equal(p.sourceFeeSlips[1].duesTransferredToSession,undefined);assert.equal(p.moved[0].balance,7000);
 assert.deepEqual(p.carriedSlips[0].sourceDues,[{slipId:'partial',month:'April 2026',totalAmount:10000,amountPaid:3000,remaining:7000}]);
});
test('stored balance is reconciled with challans rather than added twice',()=>{
 assert.equal(outstandingDues(student,slips),7000);
 assert.equal(outstandingDues({...student,balance:9000},slips),9000);
 assert.equal(outstandingDues({...student,balance:0},slips),7000);
});
test('no dues produces no opening voucher and no projected future charges',()=>{
 const p=plan([{...student,balance:0}],[],[slips[1]]);assert.equal(p.totalDues,0);assert.equal(p.carriedSlips.length,0);
});
test('return transfer carries remaining dues after payment, without resurrecting original bill',()=>{
 const first=plan();const paidFees=first.destinationFeeSlips.map(s=>({...s,amountPaid:2000,status:'Partial'}));
 const next=plan(first.destination.map(s=>({...s,balance:5000})),first.source,paidFees,first.sourceFeeSlips,'2027-2028','2026-2027','back');
 assert.equal(next.totalDues,5000);assert.equal(next.moved[0].balance,5000);
 assert.equal(next.destinationFeeSlips.filter(s=>!s.duesTransferredToSession).reduce((sum,s)=>sum+Math.max(0,s.totalAmount-s.amountPaid),0),5000);
});
test('dues never match another student with the same roll number in a different campus',()=>{
 assert.equal(outstandingDues({...student,balance:0},[{id:'other',rollNo:'1',campus:'SWT',totalAmount:12000,amountPaid:0}]),0);
});
test('rosters and fee vouchers commit atomically and remain scoped after reload',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 commitLocalStudentTransfer(storage,'2026-2027','2027-2028',plan());
 assert.equal(readSessionStudents(storage,'2027-2028')[0].balance,7000);
 assert.equal(readSessionFeeSlips(storage,'2027-2028')[0].totalAmount,7000);
 const fees=readSessionFeeSlips(storage,'2027-2028');fees[0].amountPaid=1000;
 createSessionStorage(storage,'2027-2028').setItem('peace_fee_slips',JSON.stringify(fees));
 assert.equal(readSessionFeeSlips(storage,'2026-2027')[0].amountPaid,3000);
 assert.equal(readSessionFeeSlips(storage,'2027-2028')[0].amountPaid,1000);
});
