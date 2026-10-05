import { durableStorage, flushStorage } from '../services/durableStorage';
import { checkAppUpdates } from '../services/appUpdates';
import { assertStudentCapacity, nextRollNumber } from '../services/studentCapacity';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  runTransaction,
  initFirebase, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  getSavedFirebaseConfig, 
  getFirestoreDb, 
  collection as firestoreCollection, 
  getDocs, 
  setDoc as firestoreSetDoc, 
  doc as firestoreDoc, 
  deleteDoc as firestoreDeleteDoc,
  onSnapshot
} from '../services/firebase';

import { ACTIVE_SESSION, LEGACY_SESSION, SESSION_START_YEAR, SESSION_END_YEAR, SESSION_LABEL, SESSION_KEYS,
  createSessionStorage, collectionPath, isSession, readSessions, rememberSessions, sessionDate } from '../services/academicSession';

import { visibleStudents, planTransferWithDues, outstandingDues, belongsToStudent, commitLocalStudentTransfer, readSessionStudents, readSessionFeeSlips } from '../services/sessionTransfer';

const localStorage = createSessionStorage(durableStorage, ACTIVE_SESSION);
const collection = (db, name) => firestoreCollection(db, ...collectionPath(name, ACTIVE_SESSION));
const doc = (db, name, id) => firestoreDoc(db, ...collectionPath(name, ACTIVE_SESSION), id);

const pendingWrites = new Set();
function trackWrite(promise) {
  pendingWrites.add(promise);
  promise.then(() => pendingWrites.delete(promise), () => pendingWrites.delete(promise));
  return promise;
}
const setDoc = (...args) => trackWrite(firestoreSetDoc(...args));
const deleteDoc = (...args) => trackWrite(firestoreDeleteDoc(...args));

const AppContext = createContext();

export const ACADEMIC_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September', 
  'October', 'November', 'December', 'January', 'February', 'March'
];

export const CURRENT_ACADEMIC_YEAR = SESSION_START_YEAR;
export const NEXT_ACADEMIC_YEAR = SESSION_END_YEAR;
export const ACADEMIC_SESSION = `Session ${SESSION_LABEL}`;

// Helper to format academic month display string e.g. "April 2026" or "February 2027"
export function getAcademicMonthYear(monthName, baseYear = Number(SESSION_START_YEAR)) {
  const isSecondHalf = ['January', 'February', 'March'].includes(monthName);
  const year = isSecondHalf ? Number(baseYear) + 1 : Number(baseYear);
  return `${monthName} ${year}`;
}

// Complete 12-Month Academic Year Financial Ledger (April–March)
export function getStudentYearlyFeeLedger(student, feeSlips = [], academicYear = ACTIVE_SESSION) {
  if (!student) return { months: [], totals: {} };

  const startYear = parseInt(academicYear.split('-')[0]) || Number(SESSION_START_YEAR);
  const endYear = startYear + 1;

  // Student specific slips
  const studentSlips = (feeSlips || []).filter(s => !s.duesTransferredToSession && belongsToStudent(s, student));

  const monthsLedger = ACADEMIC_MONTHS.map((monthName) => {
    // April to December are in startYear, January to March are in endYear
    const isNextYear = ['January', 'February', 'March'].includes(monthName);
    const monthYear = isNextYear ? endYear : startYear;
    const fullMonthLabel = `${monthName} ${monthYear}`;

    // Find matching slips for this month
    const matchingSlips = studentSlips.filter(s => {
      if (!s.month || s.isSessionCarryForward) return false;
      const mStr = s.month.toLowerCase();
      const monthLower = monthName.toLowerCase();
      if (mStr.includes(monthLower)) {
        if (mStr.includes(String(monthYear)) || (!mStr.includes(String(startYear)) && !mStr.includes(String(endYear)))) {
          return true;
        }
      }
      return false;
    });

    if (matchingSlips.length > 0) {
      // Aggregate if multiple slips/payments exist for this month
      const tuitionFee = matchingSlips.reduce((sum, s) => sum + (Number(s.tuitionFee) || 0), 0);
      const transportFee = matchingSlips.reduce((sum, s) => sum + (Number(s.transportFee) || 0), 0);
      const admissionFee = matchingSlips.reduce((sum, s) => sum + (Number(s.admissionFee) || 0), 0);
      const examFee = matchingSlips.reduce((sum, s) => sum + (Number(s.examFee) || 0), 0);
      const miscCharges = matchingSlips.reduce((sum, s) => sum + (Number(s.miscCharges) || 0), 0);
      const miscDescription = matchingSlips.map(s => s.miscDescription).filter(Boolean).join(', ');
      const discount = matchingSlips.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
      const discountReason = matchingSlips.map(s => s.discountReason).filter(Boolean).join(', ');
      
      const subtotal = tuitionFee + transportFee + admissionFee + examFee + miscCharges;
      const totalAmount = matchingSlips.reduce((sum, s) => sum + (Number(s.totalAmount) || Math.max(0, subtotal - discount)), 0);
      const amountPaid = matchingSlips.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
      const remaining = Math.max(0, totalAmount - amountPaid);
      
      let status = 'Unpaid';
      if (totalAmount > 0 && amountPaid >= totalAmount) {
        status = 'Paid';
      } else if (amountPaid > 0) {
        status = 'Partial';
      }

      // Collect payment dates, receipts, methods
      const paymentDates = matchingSlips.map(s => s.paidDate).filter(Boolean);
      const paymentMethods = matchingSlips.map(s => s.paymentMethod).filter(Boolean);
      const paymentRemarks = matchingSlips.map(s => s.paymentRemarks || s.notes).filter(Boolean);
      const challanNos = matchingSlips.map(s => s.challanNo).filter(Boolean);
      const slipIds = matchingSlips.map(s => s.id);

      return {
        month: monthName,
        year: monthYear,
        fullMonthLabel,
        isGenerated: true,
        slipId: slipIds[0],
        slipIds,
        challanNo: challanNos.join(', '),
        tuitionFee,
        transportFee,
        admissionFee,
        examFee,
        miscCharges,
        miscDescription,
        discount,
        discountReason,
        subtotal,
        totalAmount,
        amountPaid,
        remaining,
        status,
        paidDate: paymentDates.join(', ') || '—',
        paymentMethod: paymentMethods.join(', ') || '—',
        paymentRemarks: paymentRemarks.join(', ') || '—',
        slips: matchingSlips
      };
    } else {
      // Unpaid month that hasn't had a manual challan issued yet:
      // Must still appear individually and be included in annual totals as required!
      const tuitionFee = Number(student.monthlyFee) || 0;
      const transportFee = (student.isTransport || Number(student.transportFee) > 0) ? (Number(student.transportFee) || 0) : 0;
      const admissionFee = 0;
      const examFee = 0;
      const miscCharges = 0;
      const discount = 0;
      const subtotal = tuitionFee + transportFee;
      const totalAmount = subtotal;
      const amountPaid = 0;
      const remaining = totalAmount;

      return {
        month: monthName,
        year: monthYear,
        fullMonthLabel,
        isGenerated: false,
        slipId: null,
        slipIds: [],
        challanNo: '—',
        tuitionFee,
        transportFee,
        admissionFee,
        examFee,
        miscCharges,
        miscDescription: '',
        discount,
        discountReason: '',
        subtotal,
        totalAmount,
        amountPaid,
        remaining,
        status: 'Unpaid',
        paidDate: '—',
        paymentMethod: '—',
        paymentRemarks: 'Pending billing',
        slips: []
      };
    }
  });

  // Opening dues are a separate row, not a replacement for the new April fee.
  for (const slip of studentSlips.filter(s => s.isSessionCarryForward)) {
    const totalAmount = Number(slip.totalAmount || 0), amountPaid = Number(slip.amountPaid || 0);
    const remaining = Math.max(0, totalAmount - amountPaid);
    monthsLedger.unshift({ month: 'Opening dues', year: startYear, fullMonthLabel: slip.month,
      isGenerated: true, slipId: slip.id, slipIds: [slip.id], challanNo: slip.challanNo,
      tuitionFee: 0, transportFee: 0, admissionFee: 0, examFee: 0, miscCharges: totalAmount,
      miscDescription: slip.miscDescription, discount: 0, discountReason: '', subtotal: totalAmount,
      totalAmount, amountPaid, remaining, status: remaining === 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid',
      paidDate: slip.paidDate || '—', paymentMethod: slip.paymentMethod || '—',
      paymentRemarks: slip.notes || '', slips: [slip] });
  }

  const totals = {
    totalTuition: monthsLedger.reduce((sum, m) => sum + m.tuitionFee, 0),
    totalTransport: monthsLedger.reduce((sum, m) => sum + m.transportFee, 0),
    totalAdmission: monthsLedger.reduce((sum, m) => sum + m.admissionFee, 0),
    totalExam: monthsLedger.reduce((sum, m) => sum + m.examFee, 0),
    totalMisc: monthsLedger.reduce((sum, m) => sum + m.miscCharges, 0),
    totalDiscount: monthsLedger.reduce((sum, m) => sum + m.discount, 0),
    totalAnnualFee: monthsLedger.reduce((sum, m) => sum + m.totalAmount, 0),
    totalPaid: monthsLedger.reduce((sum, m) => sum + m.amountPaid, 0),
    totalRemaining: monthsLedger.reduce((sum, m) => sum + m.remaining, 0),
    paidMonthsCount: monthsLedger.filter(m => m.status === 'Paid').length,
    partialMonthsCount: monthsLedger.filter(m => m.status === 'Partial').length,
    unpaidMonthsCount: monthsLedger.filter(m => m.status === 'Unpaid').length,
  };

  return { months: monthsLedger, totals };
}

const INITIAL_CAMPUSES = [
  { id: 'ABB', name: 'Abbottabad Campus (Main)', code: 'ABB', city: 'Abbottabad', address: 'Main Mansehra Road, Abbottabad', status: 'Active' },
  { id: 'NOW', name: 'Nowshera Campus', code: 'NOW', city: 'Nowshera', address: 'Grand Trunk Rd, Nowshera', status: 'Active' },
  { id: 'MNS', name: 'Mansehra Campus', code: 'MNS', city: 'Mansehra', address: 'Karakoram Hwy, Mansehra', status: 'Active' },
  { id: 'PSH', name: 'Peshawar Campus', code: 'PSH', city: 'Peshawar', address: 'University Road, Peshawar', status: 'Active' },
  { id: 'SWT', name: 'Swat Campus', code: 'SWT', city: 'Swat', address: 'Saidu Sharif Road, Mingora, Swat', status: 'Active' },
  { id: 'HAR', name: 'Haripur Campus', code: 'HAR', city: 'Haripur', address: 'Circular Road, Haripur', status: 'Active' },
  { id: 'MBD', name: 'Mardan Campus', code: 'MBD', city: 'Mardan', address: 'Nowshera Road, Mardan', status: 'Active' },
  { id: 'CHS', name: 'Charsadda Campus', code: 'CHS', city: 'Charsadda', address: 'Mardan Road, Charsadda', status: 'Active' },
  { id: 'ISL', name: 'Islamabad Campus', code: 'ISL', city: 'Islamabad', address: 'Sector H-8, Islamabad', status: 'Active' },
  { id: 'RWL', name: 'Rawalpindi Campus', code: 'RWL', city: 'Rawalpindi', address: 'Peshawar Road, Rawalpindi', status: 'Active' },
];

export const DEFAULT_SCHOOL_PROFILE = {
  name: 'SHEZAD CHILDREN ACADEMY',
  tagline: 'Schools & Colleges',
  phone: '0992-123456 / 0300-1234567',
  helpline: '0313-9413450',
  email: 'info@shezadacademy.edu.pk',
  website: 'www.shezadacademy.edu.pk',
  address: 'Main Mansehra Road, Supply & Mandian, Abbottabad, Pakistan',
  registrationNo: 'REG-BISE-ABB-2026-9988',
  logoUrl: '', // Base64 or image URL
  bankName: 'Habib Bank Limited (HBL)',
  accountTitle: 'Shezad Children Academy Accounts',
  accountNo: '1234-56789012-03',
  branchCode: '0452',
  iban: 'PK36HABB0000123456789012',
  challanInstructions: '1. Please pay fee on or before 10th of every month.\n2. Surcharge after due date Rs. 200 will be charged.\n3. Fee once paid is non-refundable and non-transferable.',
  principalSignatureText: 'Principal / Accounts Officer'
};

export const INITIAL_FAMILIES = [
  {
    id: 'FAM-101',
    familyCode: 'FAM-101',
    fatherName: 'Tariq Mahmood',
    fatherCnic: '13101-1234567-1',
    phone: '0300-1234567',
    altPhone: '0345-6667778',
    campus: 'ABB',
    address: 'Supply Bazar, Mansehra Road, Abbottabad',
    notes: 'Family with 3 children enrolled across 9th, 2nd Year, and 6th grades',
    studentIds: ['std-1', 'std-5', 'std-11']
  },
  {
    id: 'FAM-102',
    familyCode: 'FAM-102',
    fatherName: 'Farooq Ahmad',
    fatherCnic: '15602-9876543-3',
    phone: '0321-4443322',
    altPhone: '0312-7778899',
    campus: 'SWT',
    address: 'Main Bazar, Mingora City, Swat',
    notes: '2 children enrolled in Swat campus',
    studentIds: ['std-6', 'std-12']
  },
  {
    id: 'FAM-103',
    familyCode: 'FAM-103',
    fatherName: 'Ali Asghar',
    fatherCnic: '13101-5544332-5',
    phone: '0312-3456789',
    altPhone: '0301-4433221',
    campus: 'ABB',
    address: 'Kakul Road, Abbottabad',
    notes: '2 children enrolled',
    studentIds: ['std-3', 'std-13']
  }
];

const INITIAL_STUDENTS = [
  // Abbottabad Students
  { 
    id: 'std-1', 
    rollNo: 'ABB-101', 
    name: 'Muhammad Saad', 
    fatherName: 'Tariq Mahmood', 
    fatherCnic: '13101-1234567-1',
    familyId: 'FAM-101',
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'ABB', 
    classGrade: '9th', 
    section: 'A', 
    phone: '0300-1234567', 
    monthlyFee: 4500, 
    transportFee: 1500,
    isTransport: true,
    transportRoute: 'Route 1 - Supply & Mandian',
    admissionFee: 5000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-01-15',
    feeHistory: [
      { effectiveDate: '2026-01-15', monthlyFee: 4500, transportFee: 1500, reason: 'Initial admission' }
    ]
  },
  { 
    id: 'std-2', 
    rollNo: 'ABB-102', 
    name: 'Ayesha Khan', 
    fatherName: 'Dr. Imran Khan', 
    fatherCnic: '13101-7788991-2',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'ABB', 
    classGrade: '10th', 
    section: 'A', 
    phone: '0301-9876543', 
    monthlyFee: 4500, 
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    admissionFee: 5000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-01-20',
    feeHistory: [
      { effectiveDate: '2026-01-20', monthlyFee: 4500, transportFee: 0, reason: 'Initial admission' }
    ]
  },
  { 
    id: 'std-3', 
    rollNo: 'ABB-103', 
    name: 'Hamza Ali', 
    fatherName: 'Ali Asghar', 
    fatherCnic: '13101-5544332-5',
    familyId: 'FAM-103',
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'ABB', 
    classGrade: '8th', 
    section: 'B', 
    phone: '0312-3456789', 
    monthlyFee: 4000, 
    transportFee: 1200,
    isTransport: true,
    transportRoute: 'Route 2 - Kakul Road',
    admissionFee: 4000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-01',
    feeHistory: []
  },
  { 
    id: 'std-4', 
    rollNo: 'ABB-104', 
    name: 'Fatima Bibi', 
    fatherName: 'Sher Zaman', 
    fatherCnic: '13101-9988776-4',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'ABB', 
    classGrade: '1st Year', 
    section: 'Pre-Med', 
    phone: '0333-5554443', 
    monthlyFee: 6500, 
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    admissionFee: 6000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-10',
    feeHistory: []
  },
  { 
    id: 'std-5', 
    rollNo: 'ABB-105', 
    name: 'Bilal Tariq', 
    fatherName: 'Tariq Mahmood', 
    fatherCnic: '13101-1234567-1',
    familyId: 'FAM-101',
    siblingRank: 2,
    siblingDiscountPercent: 25,
    campus: 'ABB', 
    classGrade: '2nd Year', 
    section: 'ICS', 
    phone: '0345-6667778', 
    monthlyFee: 6500, 
    transportFee: 1800,
    isTransport: true,
    transportRoute: 'Route 3 - Nawanshehr',
    admissionFee: 6000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-15',
    feeHistory: []
  },
  { 
    id: 'std-11', 
    rollNo: 'ABB-106', 
    name: 'Zainab Tariq', 
    fatherName: 'Tariq Mahmood', 
    fatherCnic: '13101-1234567-1',
    familyId: 'FAM-101',
    siblingRank: 3,
    siblingDiscountPercent: 50,
    campus: 'ABB', 
    classGrade: '6th', 
    section: 'A', 
    phone: '0300-1234567', 
    monthlyFee: 3800, 
    transportFee: 1500,
    isTransport: true,
    transportRoute: 'Route 1 - Supply & Mandian',
    admissionFee: 4000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-20',
    feeHistory: []
  },
  { 
    id: 'std-13', 
    rollNo: 'ABB-107', 
    name: 'Usman Ali', 
    fatherName: 'Ali Asghar', 
    fatherCnic: '13101-5544332-5',
    familyId: 'FAM-103',
    siblingRank: 2,
    siblingDiscountPercent: 25,
    campus: 'ABB', 
    classGrade: '5th', 
    section: 'A', 
    phone: '0312-3456789', 
    monthlyFee: 3500, 
    transportFee: 1200,
    isTransport: true,
    transportRoute: 'Route 2 - Kakul Road',
    admissionFee: 3500,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-22',
    feeHistory: []
  },
  
  // Swat Students
  { 
    id: 'std-6', 
    rollNo: 'SWT-201', 
    name: 'Umar Farooq', 
    fatherName: 'Farooq Ahmad', 
    fatherCnic: '15602-9876543-3',
    familyId: 'FAM-102',
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'SWT', 
    classGrade: '9th', 
    section: 'A', 
    phone: '0321-4443322', 
    monthlyFee: 4200, 
    transportFee: 1500,
    isTransport: true,
    transportRoute: 'Route 1 - Mingora City',
    admissionFee: 5000,
    balance: 14200, 
    status: 'Active', 
    admissionDate: '2026-01-10',
    feeHistory: []
  },
  { 
    id: 'std-12', 
    rollNo: 'SWT-206', 
    name: 'Khadija Farooq', 
    fatherName: 'Farooq Ahmad', 
    fatherCnic: '15602-9876543-3',
    familyId: 'FAM-102',
    siblingRank: 2,
    siblingDiscountPercent: 25,
    campus: 'SWT', 
    classGrade: '7th', 
    section: 'A', 
    phone: '0321-4443322', 
    monthlyFee: 3800, 
    transportFee: 1500,
    isTransport: true,
    transportRoute: 'Route 1 - Mingora City',
    admissionFee: 4000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-01-12',
    feeHistory: []
  },
  { 
    id: 'std-7', 
    rollNo: 'SWT-202', 
    name: 'Zainab Noor', 
    fatherName: 'Noor Muhammad', 
    fatherCnic: '15602-5544332-5',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'SWT', 
    classGrade: '10th', 
    section: 'B', 
    phone: '0302-7778899', 
    monthlyFee: 4200, 
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    admissionFee: 5000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-01-18',
    feeHistory: []
  },
  { 
    id: 'std-8', 
    rollNo: 'SWT-203', 
    name: 'Hassan Raza', 
    fatherName: 'Raza Ullah', 
    fatherCnic: '15602-1122334-9',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'SWT', 
    classGrade: '7th', 
    section: 'A', 
    phone: '0315-9998877', 
    monthlyFee: 3800, 
    transportFee: 1000,
    isTransport: true,
    transportRoute: 'Route 2 - Saidu Sharif',
    admissionFee: 4000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-05',
    feeHistory: []
  },
  { 
    id: 'std-9', 
    rollNo: 'SWT-204', 
    name: 'Maryam Gul', 
    fatherName: 'Gulzar Khan', 
    fatherCnic: '15602-7766554-1',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'SWT', 
    classGrade: '1st Year', 
    section: 'Pre-Eng', 
    phone: '0332-1112233', 
    monthlyFee: 6000, 
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    admissionFee: 6000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-12',
    feeHistory: []
  },
  { 
    id: 'std-10', 
    rollNo: 'SWT-205', 
    name: 'Danial Khan', 
    fatherName: 'Amjad Khan', 
    fatherCnic: '15602-3344556-7',
    familyId: null,
    siblingRank: 1,
    siblingDiscountPercent: 0,
    campus: 'SWT', 
    classGrade: '2nd Year', 
    section: 'ICS', 
    phone: '0340-9988112', 
    monthlyFee: 6000, 
    transportFee: 1500,
    isTransport: true,
    transportRoute: 'Route 1 - Mingora City',
    admissionFee: 6000,
    balance: 0, 
    status: 'Active', 
    admissionDate: '2026-02-18',
    feeHistory: []
  },
];

const INITIAL_STAFF = [
  { id: 'stf-1', empCode: 'STF-001', name: 'Prof. Tariq Mehmood', designation: 'Campus Principal & Lecturer', campus: 'ABB', salary: 85000, phone: '0300-5551122', email: 'principal.abb@shezad.edu.pk', joinDate: '2020-08-01', status: 'Active' },
  { id: 'stf-2', empCode: 'STF-002', name: 'Asma Jehangir', designation: 'Senior English Faculty', campus: 'ABB', salary: 45000, phone: '0333-8889900', email: 'asma.j@shezad.edu.pk', joinDate: '2022-03-15', status: 'Active' },
  { id: 'stf-3', empCode: 'STF-003', name: 'Engr. Faisal Shah', designation: 'Physics Lecturer', campus: 'SWT', salary: 55000, phone: '0312-7774433', email: 'faisal.shah@shezad.edu.pk', joinDate: '2021-09-10', status: 'Active' },
  { id: 'stf-4', empCode: 'STF-004', name: 'Noman Bashir', designation: 'Accountant & Registrar', campus: 'SWT', salary: 40000, phone: '0345-3332211', email: 'noman.accounts@shezad.edu.pk', joinDate: '2023-01-10', status: 'Active' },
];

const INITIAL_FEE_SLIPS = [
  {
    id: 'slip-101',
    challanNo: 'CH-2026-001',
    studentId: 'std-6',
    studentName: 'Umar Farooq',
    fatherName: 'Farooq Ahmad',
    rollNo: 'SWT-201',
    campus: 'SWT',
    classGrade: '9th',
    section: 'A',
    month: 'March 2026',
    issueDate: '2026-03-01',
    dueDate: '2026-03-15',
    tuitionFee: 8400,
    transportFee: 0,
    admissionFee: 5000,
    examFee: 800,
    miscCharges: 0,
    miscDescription: '',
    discount: 0,
    discountPercent: 0,
    discountReason: '',
    subtotal: 14200,
    totalAmount: 14200,
    amountPaid: 0,
    status: 'Unpaid',
    phone: '0321-4443322',
    notes: 'Pending fee challan'
  },
  {
    id: 'slip-102',
    challanNo: 'CH-2026-002',
    studentId: 'std-1',
    studentName: 'Muhammad Saad',
    fatherName: 'Tariq Mahmood',
    rollNo: 'ABB-101',
    campus: 'ABB',
    classGrade: '9th',
    section: 'A',
    month: 'April 2026',
    issueDate: '2026-04-01',
    dueDate: '2026-04-15',
    tuitionFee: 4500,
    transportFee: 1500,
    admissionFee: 0,
    examFee: 500,
    miscCharges: 500,
    miscDescription: 'Annual ID Card & Library badge',
    discount: 500,
    discountPercent: 0,
    discountReason: 'Special Academic Merit Concession',
    subtotal: 7000,
    totalAmount: 6500,
    amountPaid: 6500,
    paidDate: '2026-04-05',
    paymentMethod: 'Cash at Counter',
    status: 'Paid',
    phone: '0300-1234567',
    notes: 'Paid on time'
  }
];

const INITIAL_LEDGER = [
  { id: 'led-1', date: '2026-02-28', description: 'Opening Balance Session 2026-2027', category: 'Opening Balance', campus: 'ALL', type: 'Credit', amount: 264000, balance: 264000 },
  { id: 'led-2', date: '2026-04-05', description: 'Fee Collection: Muhammad Saad (ABB-101) - April 2026', category: 'Fee Collection', campus: 'ABB', type: 'Credit', amount: 6500, balance: 270500 }
];

const INITIAL_USERS = [
  { 
    id: 'usr-1', 
    name: 'Super Admin', 
    email: 'admin123', 
    password: 'admin',
    role: 'Super Admin', 
    campus: 'ALL', 
    status: 'Active',
    accessGranted: true,
    permissions: {
      dashboard: true,
      students: true,
      siblings: true,
      siblingfees: true,
      feeslips: true,
      staff: true,
      attendance: true,
      ledger: true,
      reports: true,
      users: true,
      settings: true
    }
  },
  { 
    id: 'usr-2', 
    name: 'Working Administrator', 
    email: 'admin', 
    role: 'Admin', 
    campus: 'ALL', 
    status: 'Active',
    accessGranted: true,
    accessGrantedBy: 'Saad Ahmad (Super Admin)',
    permissions: {
      dashboard: true,
      students: true,
      siblings: true,
      siblingfees: true,
      feeslips: true,
      staff: true,
      attendance: true,
      ledger: true,
      reports: true,
      users: false,
      settings: true
    }
  },
  { 
    id: 'usr-3', 
    name: 'Farooq Azam', 
    email: 'farooq.abb@shezad.edu.pk', 
    role: 'Campus Coordinator', 
    campus: 'ABB', 
    status: 'Active',
    permissions: {
      dashboard: true,
      students: true,
      siblings: true,
      siblingfees: true,
      feeslips: true,
      staff: false,
      attendance: true,
      ledger: false,
      reports: true,
      users: false,
      settings: false
    }
  },
  { 
    id: 'usr-4', 
    name: 'Kashif Mehmood', 
    email: 'kashif.swt@shezad.edu.pk', 
    role: 'Accountant', 
    campus: 'SWT', 
    status: 'Active',
    permissions: {
      dashboard: true,
      students: false,
      siblings: true,
      siblingfees: true,
      feeslips: true,
      staff: false,
      attendance: false,
      ledger: true,
      reports: true,
      users: false,
      settings: false
    }
  }
];

export function AppProvider({ children }) {
  const [sessions, setSessions] = useState(() => readSessions(durableStorage));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  
  // App entities with LocalStorage persistence
  const [campuses, setCampuses] = useState(() => {
    const local = localStorage.getItem('peace_campuses');
    return local ? JSON.parse(local) : INITIAL_CAMPUSES;
  });

  const [students, setStudentsState] = useState(() => {
    const local = localStorage.getItem('peace_students');
    if (!local) return INITIAL_STUDENTS;
    try {
      const parsed = JSON.parse(local);
      return parsed.map(s => ({
        ...s,
        familyId: s.familyId || null,
        siblingRank: s.siblingRank !== undefined ? Number(s.siblingRank) : (s.siblingOrder !== undefined ? Number(s.siblingOrder) : 1),
        siblingDiscountPercent: s.siblingDiscountPercent !== undefined ? Number(s.siblingDiscountPercent) : 0,
        transportFee: s.transportFee !== undefined ? Number(s.transportFee) : (s.isTransport ? 1500 : 0),
        isTransport: s.isTransport !== undefined ? s.isTransport : Boolean(Number(s.transportFee || 0) > 0),
        transportRoute: s.transportRoute || '',
        admissionFee: s.admissionFee !== undefined ? Number(s.admissionFee) : 5000,
        feeHistory: s.feeHistory || []
      }));
    } catch(e) {
      return INITIAL_STUDENTS;
    }
  });

  const studentsRef = useRef(students);
  const setStudents = useCallback(next => {
    const value = typeof next === 'function' ? next(studentsRef.current) : next;
    studentsRef.current = value;
    setStudentsState(value);
  }, []);

  const [staff, setStaff] = useState(() => {
    const local = localStorage.getItem('peace_staff');
    return local ? JSON.parse(local) : INITIAL_STAFF;
  });

  const [feeSlips, setFeeSlips] = useState(() => {
    const local = localStorage.getItem('peace_fee_slips');
    if (!local) return INITIAL_FEE_SLIPS;
    try {
      const parsed = JSON.parse(local);
      return parsed.map(s => {
        const tuition = Number(s.tuitionFee || 0);
        const transport = Number(s.transportFee || 0);
        const admission = Number(s.admissionFee || 0);
        const exam = Number(s.examFee || 0);
        const misc = Number(s.miscCharges || 0);
        const discount = Number(s.discount || 0);
        const subtotal = s.subtotal !== undefined ? Number(s.subtotal) : (tuition + transport + admission + exam + misc);
        const total = s.totalAmount !== undefined ? Number(s.totalAmount) : (subtotal - discount);
        return {
          ...s,
          tuitionFee: tuition,
          transportFee: transport,
          admissionFee: admission,
          examFee: exam,
          miscCharges: misc,
          miscDescription: s.miscDescription || '',
          discount,
          discountPercent: s.discountPercent || 0,
          discountReason: s.discountReason || '',
          subtotal,
          totalAmount: total,
          phone: s.phone || ''
        };
      });
    } catch(e) {
      return INITIAL_FEE_SLIPS;
    }
  });

  const [ledger, setLedger] = useState(() => {
    const local = localStorage.getItem('peace_ledger');
    return local ? JSON.parse(local) : INITIAL_LEDGER;
  });

  const [users, setUsers] = useState(() => {
    const local = localStorage.getItem('peace_users');
    return local ? JSON.parse(local) : INITIAL_USERS;
  });

  const [attendance, setAttendance] = useState(() => {
    const local = localStorage.getItem('peace_attendance');
    return local ? JSON.parse(local) : [];
  });

  // School Profile & Branding
  const [schoolProfile, setSchoolProfile] = useState(() => {
    const local = localStorage.getItem('peace_school_profile');
    if (local) {
      try {
        return { ...DEFAULT_SCHOOL_PROFILE, ...JSON.parse(local) };
      } catch (e) {
        return DEFAULT_SCHOOL_PROFILE;
      }
    }
    return DEFAULT_SCHOOL_PROFILE;
  });

  const updateSchoolProfile = (newProfile) => {
    const updated = { ...schoolProfile, ...newProfile };
    setSchoolProfile(updated);
    localStorage.setItem('peace_school_profile', JSON.stringify(updated));
    syncDocToFirestore('settings', 'school_profile', updated);
    showToast('✓ School details & logo updated successfully!', 'success');
  };

  // Sibling Discount Rules
  const [siblingDiscountRules, setSiblingDiscountRules] = useState(() => {
    const local = localStorage.getItem('peace_sibling_rules');
    return local ? JSON.parse(local) : {
      sibling1: 0,    // 1st Child: 0% discount (Full fee)
      sibling2: 25,   // 2nd Child: 25% discount
      sibling3: 50,   // 3rd Child: 50% discount
      sibling4Plus: 75 // 4th+ Child: 75% discount
    };
  });

  const updateSiblingDiscountRules = (newRules) => {
    setSiblingDiscountRules(newRules);
    localStorage.setItem('peace_sibling_rules', JSON.stringify(newRules));
    syncDocToFirestore('settings', 'sibling_rules', newRules);
    showToast('✓ Sibling fee discount policy updated successfully!', 'success');
  };

  // Sibling Families state
  const [families, setFamilies] = useState(() => {
    const local = localStorage.getItem('peace_families');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return INITIAL_FAMILIES;
      }
    }
    return INITIAL_FAMILIES;
  });

  const addFamily = (newFamily) => {
    const familyCode = newFamily.familyCode || `FAM-${Math.floor(100 + Math.random() * 900)}`;
    const familyObj = {
      ...newFamily,
      id: newFamily.id || familyCode,
      familyCode,
      studentIds: newFamily.studentIds || []
    };
    const updated = [familyObj, ...families];
    setFamilies(updated);
    localStorage.setItem('peace_families', JSON.stringify(updated));
    syncDocToFirestore('families', familyObj.id, familyObj);
    showToast(`✓ Family "${familyObj.fatherName}" registered successfully!`, 'success');
    return familyObj;
  };

  const updateFamily = (familyId, updatedData) => {
    const updated = families.map(f => f.id === familyId ? { ...f, ...updatedData } : f);
    setFamilies(updated);
    localStorage.setItem('peace_families', JSON.stringify(updated));
    const target = updated.find(f => f.id === familyId);
    if (target) syncDocToFirestore('families', familyId, target);
    showToast('✓ Family information updated successfully!', 'success');
  };

  const deleteFamily = (familyId) => {
    setStudents(prev => prev.map(s => s.familyId === familyId ? { ...s, familyId: null, siblingRank: 1, siblingDiscountPercent: 0 } : s));
    const updated = families.filter(f => f.id !== familyId);
    setFamilies(updated);
    localStorage.setItem('peace_families', JSON.stringify(updated));
    removeDocFromFirestore('families', familyId);
    showToast('✓ Family group removed', 'info');
  };

  const linkSibling = (familyId, studentId, rank = 1) => {
    const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
    const rIdx = Math.min((Number(rank) || 1) - 1, 3);
    const ruleKey = ruleKeys[Math.max(0, rIdx)];
    const discountPercent = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updatedStudent = {
          ...s,
          familyId,
          siblingRank: Number(rank) || 1,
          siblingDiscountPercent: discountPercent
        };
        syncDocToFirestore('students', studentId, updatedStudent);
        return updatedStudent;
      }
      return s;
    }));

    setFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        const existingIds = f.studentIds || [];
        const studentIds = existingIds.includes(studentId) ? existingIds : [...existingIds, studentId];
        const updatedFam = { ...f, studentIds };
        syncDocToFirestore('families', familyId, updatedFam);
        return updatedFam;
      }
      return f;
    }));

    showToast('✓ Sibling linked to family successfully!', 'success');
  };

  const unlinkSibling = (studentId) => {
    const student = students.find(s => s.id === studentId);
    const famId = student?.familyId;

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updated = { ...s, familyId: null, siblingRank: 1, siblingDiscountPercent: 0 };
        syncDocToFirestore('students', studentId, updated);
        return updated;
      }
      return s;
    }));

    if (famId) {
      setFamilies(prev => prev.map(f => {
        if (f.id === famId) {
          const updatedFam = { ...f, studentIds: (f.studentIds || []).filter(id => id !== studentId) };
          syncDocToFirestore('families', famId, updatedFam);
          return updatedFam;
        }
        return f;
      }));
    }

    showToast('✓ Sibling unlinked from family', 'info');
  };

  const reorderSiblings = (familyId, orderedStudentIds) => {
    const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
    setStudents(prev => prev.map(s => {
      const idx = orderedStudentIds.indexOf(s.id);
      if (idx !== -1) {
        const rank = idx + 1;
        const rIdx = Math.min(idx, 3);
        const ruleKey = ruleKeys[rIdx];
        const discountPercent = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);
        const updated = { ...s, familyId, siblingRank: rank, siblingDiscountPercent: discountPercent };
        syncDocToFirestore('students', s.id, updated);
        return updated;
      }
      return s;
    }));

    setFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        const updatedFam = { ...f, studentIds: orderedStudentIds };
        syncDocToFirestore('families', familyId, updatedFam);
        return updatedFam;
      }
      return f;
    }));

    showToast('✓ Sibling order and discounts re-calculated!', 'success');
  };

  // Generate Fee Slips for a Family (all siblings)
  const generateFamilyFeeSlips = ({ familyId, month = `April ${SESSION_START_YEAR}`, dueDate = sessionDate('April') }) => {
    const family = families.find(f => f.id === familyId);
    if (!family) return { success: false, error: 'Family not found' };

    const famStudents = students.filter(s => !s.movedToSession && (s.familyId === familyId || (family.studentIds && family.studentIds.includes(s.id))));
    if (famStudents.length === 0) return { success: false, error: 'No students found in this family' };

    // Sort by siblingRank
    famStudents.sort((a, b) => (Number(a.siblingRank) || 1) - (Number(b.siblingRank) || 1));

    const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
    const generatedSlips = [];

    setFeeSlips(prev => {
      let currentSlips = [...prev];
      famStudents.forEach((student, idx) => {
        const rank = Number(student.siblingRank) || (idx + 1);
        const rIdx = Math.min(rank - 1, 3);
        const ruleKey = ruleKeys[Math.max(0, rIdx)];
        const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);

        const tuition = Number(student.monthlyFee) || 0;
        const discountAmt = Math.round((tuition * discPct) / 100);
        const transport = (student.isTransport || Number(student.transportFee) > 0) ? (Number(student.transportFee) || 0) : 0;
        const subtotal = tuition + transport;
        const total = Math.max(0, subtotal - discountAmt);

        const existingIdx = currentSlips.findIndex(s => (s.studentId === student.id || s.rollNo === student.rollNo) && s.month === month);
        const challanNo = existingIdx >= 0 ? currentSlips[existingIdx].challanNo : `CH-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

        const slipData = {
          id: existingIdx >= 0 ? currentSlips[existingIdx].id : `slip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          challanNo,
          studentId: student.id,
          studentName: student.name,
          fatherName: student.fatherName || family.fatherName,
          rollNo: student.rollNo,
          campus: student.campus,
          classGrade: student.classGrade,
          section: student.section || 'A',
          month,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate,
          tuitionFee: tuition,
          transportFee: transport,
          admissionFee: 0,
          examFee: 0,
          miscCharges: 0,
          miscDescription: '',
          discount: discountAmt,
          discountPercent: discPct,
          discountReason: discPct > 0 ? `Sibling Concession (Child #${rank} - ${discPct}%)` : '',
          subtotal,
          totalAmount: total,
          amountPaid: existingIdx >= 0 ? (currentSlips[existingIdx].amountPaid || 0) : 0,
          status: existingIdx >= 0 ? currentSlips[existingIdx].status : 'Unpaid',
          phone: student.phone || family.phone || '',
          familyId,
          notes: `Sibling Package (${family.fatherName})`
        };

        if (existingIdx >= 0) {
          currentSlips[existingIdx] = slipData;
        } else {
          currentSlips.push(slipData);
        }
        syncDocToFirestore('fee_slips', slipData.id, slipData);
        generatedSlips.push(slipData);
      });
      return currentSlips;
    });

    showToast(`✓ Generated sibling fee challans for ${famStudents.length} children (${month})!`, 'success');
    return { success: true, slips: generatedSlips };
  };

  // Pay Family Fee (Consolidated)
  const payFamilyFee = ({ familyId, month, amountPaid, paymentMethod = 'Cash at Counter', paymentRemarks = '' }) => {
    const family = families.find(f => f.id === familyId);
    const famStudents = students.filter(s => !s.movedToSession && (s.familyId === familyId || (family?.studentIds && family.studentIds.includes(s.id))));
    
    // Find matching slips for this family for this month
    const matchingSlips = feeSlips.filter(s => 
      famStudents.some(std => std.id === s.studentId || std.rollNo === s.rollNo) && 
      s.month === month
    );

    if (matchingSlips.length === 0) {
      showToast('No generated challans found for this family for the selected month.', 'danger');
      return;
    }

    let remainingToDistribute = Number(amountPaid) || 0;
    const today = new Date().toISOString().split('T')[0];

    setFeeSlips(prev => {
      return prev.map(s => {
        if (matchingSlips.some(m => m.id === s.id)) {
          const dueForThisSlip = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
          const payThis = Math.min(remainingToDistribute, dueForThisSlip);
          remainingToDistribute = Math.max(0, remainingToDistribute - payThis);

          const newAmountPaid = (s.amountPaid || 0) + payThis;
          let newStatus = s.status;
          if (newAmountPaid >= s.totalAmount) newStatus = 'Paid';
          else if (newAmountPaid > 0) newStatus = 'Partial';

          const updated = {
            ...s,
            amountPaid: newAmountPaid,
            status: newStatus,
            paidDate: today,
            paymentMethod,
            paymentRemarks: paymentRemarks || `Family Consolidated Payment (${family?.fatherName || 'Parent'})`
          };
          syncDocToFirestore('fee_slips', s.id, updated);
          return updated;
        }
        return s;
      });
    });

    // Add ledger entry
    addLedgerEntry({
      date: today,
      description: `Family Fee Collection: ${family?.fatherName || 'Parent'} (${famStudents.length} Siblings) - ${month}`,
      category: 'Fee Collection',
      campus: famStudents[0]?.campus || 'ALL',
      type: 'Credit',
      amount: Number(amountPaid) || 0
    });

    showToast(`✓ Received Rs. ${(Number(amountPaid) || 0).toLocaleString()} for ${family?.fatherName || 'Family'}!`, 'success');
  };

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Helper to persist single document to Firestore if connected
  const syncDocToFirestore = async (collName, docId, data) => {
    try {
      const currentDb = getFirestoreDb();
      if (currentDb && docId) {
        await setDoc(doc(currentDb, collName, String(docId)), data, { merge: true });
      }
    } catch (e) {
      console.warn(`Firestore sync warning (${collName}/${docId}):`, e.message);
    }
  };

  // Helper to remove single document from Firestore if connected
  const removeDocFromFirestore = async (collName, docId) => {
    try {
      const currentDb = getFirestoreDb();
      if (currentDb && docId) {
        await deleteDoc(doc(currentDb, collName, String(docId)));
      }
    } catch (e) {
      console.warn(`Firestore delete warning (${collName}/${docId}):`, e.message);
    }
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('shezad_auth') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('shezad_user');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      id: 'usr-2',
      name: 'Working Administrator',
      role: 'Admin',
      email: 'admin',
      accessGranted: true,
      accessGrantedBy: 'Saad Ahmad (Super Admin)',
      permissions: {
        dashboard: true,
        students: true,
        siblings: true,
        siblingfees: true,
        feeslips: true,
        staff: true,
        attendance: true,
        ledger: true,
        reports: true,
        users: false,
        settings: true
      }
    };
  });

  // Cross-PC / Cross-Browser Universal Login
  const login = async (username, password) => {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // 1. Primary Super Admin Login (admin123 / admin)
    if ((cleanUser === 'admin123' || cleanUser === 'superadmin' || cleanUser === 'admin') && (cleanPass === 'admin' || cleanPass === 'admin123')) {
      const superAdminUser = {
        id: 'usr-1',
        name: 'Super Admin',
        role: 'Super Admin',
        email: 'admin123',
        accessGranted: true,
        permissions: {
          dashboard: true,
          students: true,
          feeslips: true,
          staff: true,
          attendance: true,
          ledger: true,
          reports: true,
          users: true,
          settings: true
        }
      };
      setCurrentUser(superAdminUser);
      setIsAuthenticated(true);
      localStorage.setItem('shezad_auth', 'true');
      localStorage.setItem('shezad_user', JSON.stringify(superAdminUser));
      showToast('Welcome, Super Admin! Full system authority enabled.', 'success');
      return { success: true, role: 'Super Admin' };
    }

    // 2. Check in local stored users list
    let matchedUser = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanUser) ||
      (u.username && u.username.toLowerCase() === cleanUser)
    );

    // 3. If not found in local state, fetch fresh users from backend Firestore
    if (!matchedUser) {
      try {
        const currentDb = getFirestoreDb();
        if (currentDb) {
          const userSnap = await getDocs(collection(currentDb, 'users'));
          if (!userSnap.empty) {
            const remoteUsers = [];
            userSnap.forEach(d => remoteUsers.push({ id: d.id, ...d.data() }));
            setUsers(remoteUsers);
            localStorage.setItem('peace_users', JSON.stringify(remoteUsers));
            matchedUser = remoteUsers.find(u => 
              (u.email && u.email.toLowerCase() === cleanUser) ||
              (u.username && u.username.toLowerCase() === cleanUser)
            );
          }
        }
      } catch (e) {
        console.error("Error querying backend database for user:", e);
      }
    }

    if (matchedUser) {
      const validPass = matchedUser.password 
        ? matchedUser.password === cleanPass 
        : cleanPass === 'admin' || cleanPass === 'admin123';

      if (validPass) {
        setCurrentUser(matchedUser);
        setIsAuthenticated(true);
        localStorage.setItem('shezad_auth', 'true');
        localStorage.setItem('shezad_user', JSON.stringify(matchedUser));
        showToast(`Welcome back, ${matchedUser.name}! Logged in as ${matchedUser.role}.`, 'success');
        return { success: true, role: matchedUser.role };
      } else {
        return { success: false, error: 'Incorrect password. Please verify your credentials and try again.' };
      }
    }

    return { 
      success: false, 
      error: 'Invalid email/username or password. Please try again.' 
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('shezad_auth');
    localStorage.removeItem('shezad_user');
    showToast('Signed out successfully.', 'info');
  };

  const updateUserPermissions = async (userId, newPermissions) => {
    let updatedUserRecord = null;
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          updatedUserRecord = {
            ...u,
            permissions: { ...u.permissions, ...newPermissions },
            accessGranted: true,
            accessGrantedBy: `${currentUser?.name || 'Administrator'} (${currentUser?.role || 'Admin'})`,
            lastUpdated: new Date().toLocaleTimeString()
          };
          return updatedUserRecord;
        }
        return u;
      });
      const matching = updated.find(u => u.id === userId);
      if (matching && currentUser?.id === userId) {
        setCurrentUser(matching);
        localStorage.setItem('shezad_user', JSON.stringify(matching));
      }
      return updated;
    });

    if (updatedUserRecord) {
      await syncDocToFirestore('users', userId, updatedUserRecord);
    }
    showToast('User module permissions updated successfully!', 'success');
  };

  const updateUser = async (userId, updatedData) => {
    let updatedUserRecord = null;
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          updatedUserRecord = {
            ...u,
            ...updatedData,
            lastUpdated: new Date().toISOString()
          };
          return updatedUserRecord;
        }
        return u;
      });
      const matching = updated.find(u => u.id === userId);
      if (matching && currentUser?.id === userId) {
        setCurrentUser(matching);
        localStorage.setItem('shezad_user', JSON.stringify(matching));
      }
      return updated;
    });

    if (updatedUserRecord) {
      await syncDocToFirestore('users', userId, updatedUserRecord);
    }
    showToast(`✓ User account updated successfully!`, 'success');
    return updatedUserRecord;
  };

  const hasPermission = (moduleKey) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    
    // Strict restriction: User Management & Admin Access Control is ONLY for Super Admin
    if (moduleKey === 'users') {
      return false;
    }
    
    if (currentUser.role === 'Admin') {
      if (currentUser.permissions && currentUser.permissions[moduleKey] !== undefined) {
        return currentUser.permissions[moduleKey] === true;
      }
      return false;
    }
    if (currentUser.permissions) {
      return currentUser.permissions[moduleKey] === true;
    }
    return false;
  };

  // --- TWO-SYSTEM SYNCHRONIZATION & SOFTWARE UPDATE ENGINE ---
  const [softwareVersion] = useState('v2.8.0');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatusMessage, setUpdateStatusMessage] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => {
    return localStorage.getItem('peace_last_updated') || '2026-09-22 12:00';
  });

  // Pull all records from Firestore backend into local state
  const fetchAllFromBackend = useCallback(async () => {
    const currentDb = getFirestoreDb();
    if (!currentDb || !navigator.onLine || pendingWrites.size) return { success: false, syncedCount: 0 };

    let totalSynced = 0;
    try {
      // 1. Students
      const stdSnap = await getDocs(collection(currentDb, 'students'));
      if (!stdSnap.metadata.fromCache && (!stdSnap.empty || ACTIVE_SESSION !== LEGACY_SESSION)) {
        const remoteStudents = [];
        stdSnap.forEach(d => remoteStudents.push({ id: d.id, ...d.data() }));
        setStudents(remoteStudents);
        localStorage.setItem('peace_students', JSON.stringify(remoteStudents));
        totalSynced += remoteStudents.length;
      }

      // 2. Fee Slips
      const feeSnap = await getDocs(collection(currentDb, 'feeSlips'));
      if (!feeSnap.metadata.fromCache && (!feeSnap.empty || ACTIVE_SESSION !== LEGACY_SESSION)) {
        const remoteFeeSlips = [];
        feeSnap.forEach(d => remoteFeeSlips.push({ id: d.id, ...d.data() }));
        setFeeSlips(remoteFeeSlips);
        localStorage.setItem('peace_fee_slips', JSON.stringify(remoteFeeSlips));
        totalSynced += remoteFeeSlips.length;
      }

      // 3. Staff
      const staffSnap = await getDocs(collection(currentDb, 'staff'));
      if (!staffSnap.metadata.fromCache && (!staffSnap.empty || ACTIVE_SESSION !== LEGACY_SESSION)) {
        const remoteStaff = [];
        staffSnap.forEach(d => remoteStaff.push({ id: d.id, ...d.data() }));
        setStaff(remoteStaff);
        localStorage.setItem('peace_staff', JSON.stringify(remoteStaff));
        totalSynced += remoteStaff.length;
      }

      // 4. Ledger
      const ledSnap = await getDocs(collection(currentDb, 'ledger'));
      if (!ledSnap.metadata.fromCache && (!ledSnap.empty || ACTIVE_SESSION !== LEGACY_SESSION)) {
        const remoteLedger = [];
        ledSnap.forEach(d => remoteLedger.push({ id: d.id, ...d.data() }));
        setLedger(remoteLedger);
        localStorage.setItem('peace_ledger', JSON.stringify(remoteLedger));
        totalSynced += remoteLedger.length;
      }

      // 5. Users
      const usrSnap = await getDocs(collection(currentDb, 'users'));
      if (!usrSnap.empty) {
        const remoteUsers = [];
        usrSnap.forEach(d => remoteUsers.push({ id: d.id, ...d.data() }));
        setUsers(remoteUsers);
        localStorage.setItem('peace_users', JSON.stringify(remoteUsers));
        totalSynced += remoteUsers.length;
      }

      // 6. Campuses
      const campSnap = await getDocs(collection(currentDb, 'campuses'));
      if (!campSnap.empty) {
        const remoteCampuses = [];
        campSnap.forEach(d => remoteCampuses.push({ id: d.id, ...d.data() }));
        setCampuses(remoteCampuses);
        localStorage.setItem('peace_campuses', JSON.stringify(remoteCampuses));
        totalSynced += remoteCampuses.length;
      }

      // 7. Attendance
      const attSnap = await getDocs(collection(currentDb, 'attendance'));
      if (!attSnap.metadata.fromCache && (!attSnap.empty || ACTIVE_SESSION !== LEGACY_SESSION)) {
        const remoteAttendance = [];
        attSnap.forEach(d => {
          const data = d.data();
          if (data.records && Array.isArray(data.records)) {
            remoteAttendance.push(...data.records);
          } else {
            remoteAttendance.push({ id: d.id, ...data });
          }
        });
        if (remoteAttendance.length > 0 || ACTIVE_SESSION !== LEGACY_SESSION) {
          setAttendance(remoteAttendance);
          localStorage.setItem('peace_attendance', JSON.stringify(remoteAttendance));
          totalSynced += remoteAttendance.length;
        }
      }

      return { success: true, syncedCount: totalSynced };
    } catch (e) {
      console.error("Backend fetch error:", e);
      return { success: false, error: e.message, syncedCount: totalSynced };
    }
  }, []);

  // Continuous background synchronization every 12s so changes on System A appear on System B automatically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const currentDb = getFirestoreDb();
      if (currentDb && !isUpdating) {
        fetchAllFromBackend();
      }
    }, 12000);
    return () => clearInterval(syncInterval);
  }, [fetchAllFromBackend, isUpdating]);

  // Update Button Handler (Syncs both PC A and PC B with shared backend)
  const checkForSoftwareUpdates = async () => {
    setUpdateModalOpen(true);
    setIsUpdating(true);
    setUpdateProgress(20);
    setUpdateStatusMessage('Checking for published software updates…');
    try {
      setUpdateStatusMessage(await checkAppUpdates());
      setUpdateProgress(100);
      setLastUpdatedTime(new Date().toLocaleString());
    } catch (error) {
      setUpdateStatusMessage(`Update check failed: ${error.message}. Your installed app and records remain available.`);
    } finally { setIsUpdating(false); }
  };

  // Firebase status state
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [firebaseInfo, setFirebaseInfo] = useState({ status: 'Live System', error: null });

  // Sync to local storage on change
  useEffect(() => {
    localStorage.setItem('peace_campuses', JSON.stringify(campuses));
  }, [campuses]);

  useEffect(() => {
    localStorage.setItem('peace_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('peace_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('peace_fee_slips', JSON.stringify(feeSlips));
  }, [feeSlips]);

  useEffect(() => {
    localStorage.setItem('peace_ledger', JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem('peace_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('peace_attendance', JSON.stringify(attendance));
  }, [attendance]);

  // BroadcastChannel for instant cross-tab / local window synchronization
  useEffect(() => {
    let channel;
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new BroadcastChannel('shezad_school_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_RELOAD') {
            fetchAllFromBackend();
          }
        };
      }
    } catch(e) {}
    return () => {
      if (channel) channel.close();
    };
  }, [fetchAllFromBackend]);

  // Check saved Firebase and sync from backend on initial mount
  useEffect(() => {
    const savedConfig = getSavedFirebaseConfig();
    {
      const res = initFirebase(savedConfig);
      if (res.isConnected) {
        setFirebaseConnected(true);
        setFirebaseInfo({ status: 'Connected to Firestore', error: null, projectId: savedConfig?.projectId || res.app?.options?.projectId });
        // Fetch all shared records immediately so System B gets latest data from System A
        fetchAllFromBackend();
      }
    }
  }, [fetchAllFromBackend]);

  // Real-time Firestore Live Synchronization across all online devices / admins
  useEffect(() => {
    if (!firebaseConnected) return;
    const currentDb = getFirestoreDb();
    if (!currentDb) return;

    const unsubs = [];

    try {
      // 1. Live Students
      const unsubStudents = onSnapshot(collection(currentDb, 'students'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setStudents(list);
          localStorage.setItem('peace_students', JSON.stringify(list));
        }
      }, (err) => console.warn('Students live sync:', err));
      unsubs.push(unsubStudents);

      // 2. Live Fee Slips
      const unsubFeeSlips = onSnapshot(collection(currentDb, 'feeSlips'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setFeeSlips(list);
          localStorage.setItem('peace_fee_slips', JSON.stringify(list));
        }
      }, (err) => console.warn('FeeSlips live sync:', err));
      unsubs.push(unsubFeeSlips);

      // 3. Live Staff
      const unsubStaff = onSnapshot(collection(currentDb, 'staff'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setStaff(list);
          localStorage.setItem('peace_staff', JSON.stringify(list));
        }
      }, (err) => console.warn('Staff live sync:', err));
      unsubs.push(unsubStaff);

      // 4. Live Ledger
      const unsubLedger = onSnapshot(collection(currentDb, 'ledger'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setLedger(list);
          localStorage.setItem('peace_ledger', JSON.stringify(list));
        }
      }, (err) => console.warn('Ledger live sync:', err));
      unsubs.push(unsubLedger);

      // 5. Live Users & Real-time Permissions
      const unsubUsers = onSnapshot(collection(currentDb, 'users'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setUsers(list);
          localStorage.setItem('peace_users', JSON.stringify(list));
          
          // Auto-sync current user permissions if updated by Super Admin
          if (currentUser?.id) {
            const myLatest = list.find(u => u.id === currentUser.id);
            if (myLatest && (JSON.stringify(myLatest.permissions) !== JSON.stringify(currentUser.permissions) || myLatest.status !== currentUser.status)) {
              setCurrentUser(myLatest);
              localStorage.setItem('shezad_user', JSON.stringify(myLatest));
            }
          }
        }
      }, (err) => console.warn('Users live sync:', err));
      unsubs.push(unsubUsers);

      // 6. Live Campuses
      const unsubCampuses = onSnapshot(collection(currentDb, 'campuses'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setCampuses(list);
          localStorage.setItem('peace_campuses', JSON.stringify(list));
        }
      }, (err) => console.warn('Campuses live sync:', err));
      unsubs.push(unsubCampuses);

      // 7. Live Attendance
      const unsubAttendance = onSnapshot(collection(currentDb, 'attendance'), (snap) => {
        if (snap.metadata.fromCache) return;
        if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            if (data.records && Array.isArray(data.records)) {
              list.push(...data.records);
            } else {
              list.push({ id: d.id, ...data });
            }
          });
          if (list.length > 0 || ACTIVE_SESSION !== LEGACY_SESSION) {
            setAttendance(list);
            localStorage.setItem('peace_attendance', JSON.stringify(list));
          }
        }
      }, (err) => console.warn('Attendance live sync:', err));
      unsubs.push(unsubAttendance);
    } catch (e) {
      console.warn('Real-time synchronization setup error:', e);
    }

    return () => {
      unsubs.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [firebaseConnected, currentUser?.id]);

  // Discover year names across devices without changing another tab's selection.
  useEffect(() => {
    if (!firebaseConnected) return;
    const db = getFirestoreDb();
    return onSnapshot(firestoreCollection(db, 'academicSessions'), snap => {
      const names = snap.docs.map(d => d.id).filter(isSession);
      try { setSessions(rememberSessions(names, durableStorage)); }
      catch { setSessions([...new Set([LEGACY_SESSION, ACTIVE_SESSION, ...names])].sort()); }
    }, err => showToast(`Session list could not sync: ${err.message}`, 'danger'));
  }, [firebaseConnected]);

  // Families belong to the selected year just like their linked students.
  useEffect(() => {
    localStorage.setItem('peace_families', JSON.stringify(families));
  }, [families]);
  useEffect(() => {
    if (!firebaseConnected) return;
    return onSnapshot(collection(getFirestoreDb(), 'families'), snap => {
      if (snap.metadata.fromCache) return;
      if (!snap.empty || ACTIVE_SESSION !== LEGACY_SESSION) {
        setFamilies(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }
    }, err => console.warn('Families live sync:', err));
  }, [firebaseConnected]);

  const switchSession = async (session) => {
    if (!isAuthenticated || !isSession(session) || !sessions.includes(session) || session === ACTIVE_SESSION) return;
    if (!window.confirm(`Open session ${session}? Save any unfinished forms first. Current records will remain in ${ACTIVE_SESSION}.`)) return;
    try {
      // Flush state before reloading; do not depend on a pending React effect.
      const data = { peace_students: students, peace_staff: staff, peace_fee_slips: feeSlips,
        peace_ledger: ledger, peace_attendance: attendance, peace_families: families };
      Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
      await flushStorage();
      window.sessionStorage.setItem('sca_active_session', session);
      window.location.reload();
    } catch (err) { showToast(`Cannot switch session: ${err.message}`, 'danger'); }
  };

  const canManageSessions = isAuthenticated && (hasPermission('students') || hasPermission('settings'));

  const addSession = async (startYear) => {
    if (!canManageSessions) throw new Error('Your account needs Students or Settings access to create sessions.');
    const year = Number(startYear);
    const id = `${year}-${year + 1}`;
    if (!Number.isInteger(year) || !isSession(id)) throw new Error('Enter a valid start year between 2000 and 9998.');
    if (sessions.includes(id)) throw new Error('This session already exists. Select it from the session list.');
    const db = getFirestoreDb();
    if (db) setDoc(firestoreDoc(db, 'academicSessions', id), { startYear: year, endYear: year + 1 }, { merge: true })
      .catch(error => showToast(`Session saved on this device; cloud sync failed: ${error.message}`, 'danger'));
    setSessions(rememberSessions([id], durableStorage));
    await flushStorage();
    showToast(`Session ${id} added. Select it to enter that year's records.`, 'success');
    return id;
  };

  const convertStudentsToSession = async (ids, targetSession, expectedDues) => {
    if (!isAuthenticated || !hasPermission('students')) throw new Error('Your account needs Students access.');
    if (!sessions.includes(targetSession) || targetSession === ACTIVE_SESSION) throw new Error('Create and select a different destination session.');
    if (!ids.length || ids.length > 100) throw new Error('Select between 1 and 100 students.');
    const transferId = crypto.randomUUID();
    const verifyPreview = plan => {
      if (expectedDues !== undefined && Math.abs(plan.totalDues - expectedDues) > 0.005) throw new Error('The outstanding dues changed. Refresh the students list and review the new amount before moving.');
      return plan;
    };
    const execute = async () => {
      const db = getFirestoreDb();
      let plan;
      if (db) {
        if (!navigator.onLine) throw new Error('Connect to the internet to move students between cloud sessions. Offline admissions and fee records remain available.');
        const pending = await Promise.allSettled([...pendingWrites]);
        if (pending.some(r => r.status === 'rejected')) throw new Error('Save pending changes before moving students.');
        const [destinationSnapshot, sourceFeesSnapshot, targetFeesSnapshot] = await Promise.all([
          getDocs(firestoreCollection(db, ...collectionPath('students', targetSession))),
          getDocs(collection(db, 'feeSlips')),
          getDocs(firestoreCollection(db, ...collectionPath('feeSlips', targetSession)))
        ]);
        const destination = destinationSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        const selectedStudents = students.filter(s => ids.includes(s.id));
        const affectedFees = sourceFeesSnapshot.docs.filter(d => selectedStudents.some(s => belongsToStudent(d.data(), s)));
        const destinationFees = targetFeesSnapshot.docs.filter(d => selectedStudents.some(s => belongsToStudent(d.data(), s)));
        if (ids.length * 3 + affectedFees.length > 450) throw new Error('Too many fee records for one transfer. Select fewer students.');
        plan = await runTransaction(db, async transaction => {
          const sources = [], targets = [], freshFees = [], freshTargetFees = [];
          for (const id of [...new Set(ids)]) {
            sources.push(await transaction.get(firestoreDoc(db, ...collectionPath('students', ACTIVE_SESSION), id)));
            targets.push(await transaction.get(firestoreDoc(db, ...collectionPath('students', targetSession), id)));
          }
          for (const snapshot of affectedFees) {
            const fresh = await transaction.get(snapshot.ref);
            if (fresh.exists()) freshFees.push({ ...fresh.data(), id: fresh.id });
          }
          for (const snapshot of destinationFees) {
            const fresh = await transaction.get(snapshot.ref);
            if (fresh.exists()) freshTargetFees.push({ ...fresh.data(), id: fresh.id });
          }
          const freshSource = students.filter(s => !ids.includes(s.id));
          for (const snap of sources) if (snap.exists()) freshSource.push({ ...snap.data(), id: snap.id });
          const freshDestination = destination.filter(s => !ids.includes(s.id));
          for (const snap of targets) if (snap.exists()) freshDestination.push({ ...snap.data(), id: snap.id });
          const sourceFees = sourceFeesSnapshot.docs.filter(d => !affectedFees.some(f => f.id === d.id)).map(d => ({ ...d.data(), id: d.id })).concat(freshFees);
          const targetFees = targetFeesSnapshot.docs.filter(d => !destinationFees.some(f => f.id === d.id)).map(d => ({ ...d.data(), id: d.id })).concat(freshTargetFees);
          const result = verifyPreview(planTransferWithDues(freshSource, freshDestination, sourceFees, targetFees, ids, ACTIVE_SESSION, targetSession, transferId));
          for (const student of result.moved) {
            transaction.set(firestoreDoc(db, ...collectionPath('students', targetSession), student.id), student);
            transaction.update(firestoreDoc(db, ...collectionPath('students', ACTIVE_SESSION), student.id), { movedToSession: targetSession, transferredAt: student.transferredAt });
          }
          for (const id of result.transferredSlipIds) transaction.update(doc(db, 'feeSlips', id), {
            duesTransferredToSession: targetSession, duesTransferId: transferId, duesTransferredAt: result.moved[0].transferredAt
          });
          for (const slip of result.carriedSlips) transaction.set(firestoreDoc(db, ...collectionPath('feeSlips', targetSession), slip.id), slip);
          return result;
        });
      } else {
        const savedSource = readSessionStudents(durableStorage, ACTIVE_SESSION);
        const source = savedSource.length ? savedSource : students;
        const savedFees = readSessionFeeSlips(durableStorage, ACTIVE_SESSION);
        plan = verifyPreview(planTransferWithDues(source, readSessionStudents(durableStorage, targetSession),
          savedFees.length ? savedFees : feeSlips, readSessionFeeSlips(durableStorage, targetSession), ids, ACTIVE_SESSION, targetSession, transferId));
      }
      try { commitLocalStudentTransfer(durableStorage, ACTIVE_SESSION, targetSession, plan); await flushStorage(); }
      catch (err) { if (!db) throw err; console.warn('Transfer saved to cloud; local cache unavailable:', err); }
      setStudents(plan.source); setFeeSlips(plan.sourceFeeSlips);
      showToast(`${plan.moved.length} student(s) and Rs ${plan.totalDues.toLocaleString()} dues moved to ${targetSession}.`, 'success');
      return plan.moved.length;
    };
    return window.navigator?.locks ? window.navigator.locks.request('sca-student-session-transfer', execute) : execute();
  };

  // Refresh this tab after another tab completes a local move.
  useEffect(() => {
    const refresh = event => {
      if (event.key === 'sca_student_session_records') {
        try { setStudents(readSessionStudents(durableStorage, ACTIVE_SESSION)); setFeeSlips(readSessionFeeSlips(durableStorage, ACTIVE_SESSION)); }
        catch (error) { console.warn('Session roster reload failed:', error); }
      }
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  // Filtered lists based on current selected campus
  const sessionStudents = visibleStudents(students);
  const filteredStudents = selectedCampus === 'ALL' 
    ? sessionStudents 
    : sessionStudents.filter(s => s.campus === selectedCampus);

  const filteredStaff = selectedCampus === 'ALL'
    ? staff
    : staff.filter(s => s.campus === selectedCampus);

  const sessionFeeSlips = feeSlips.filter(s => !s.duesTransferredToSession);
  const filteredFeeSlips = selectedCampus === 'ALL'
    ? sessionFeeSlips
    : sessionFeeSlips.filter(s => s.campus === selectedCampus);

  const historicalCollectionSlips = selectedCampus === 'ALL' ? feeSlips : feeSlips.filter(s => s.campus === selectedCampus);

  // Dynamic Calculations for KPIs
  const activeStudentsCount = filteredStudents.filter(s => s.status === 'Active').length;
  
  // New admissions this month
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const newAdmissionsCount = filteredStudents.filter(s => s.admissionDate && s.admissionDate.startsWith(currentMonthPrefix)).length;

  // Fee collected total
  const feeCollected = historicalCollectionSlips.reduce((acc, slip) => acc + (slip.amountPaid || 0), 0);

  // Today's fee collection
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollection = historicalCollectionSlips.reduce((acc, slip) => {
    return slip.paidDate === todayStr ? acc + (slip.amountPaid || 0) : acc;
  }, 0);

  // Current month fee collection
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const monthlyCollection = historicalCollectionSlips
    .filter(slip => slip.month && slip.month.includes(currentMonthName))
    .reduce((acc, slip) => acc + (slip.amountPaid || 0), 0);

  // Transport fee collected
  const transportCollection = historicalCollectionSlips.reduce((acc, slip) => {
    if (slip.status === 'Paid') return acc + (slip.transportFee || 0);
    if (slip.status === 'Partial' && slip.totalAmount > 0) {
      const ratio = (slip.amountPaid || 0) / slip.totalAmount;
      return acc + Math.round((slip.transportFee || 0) * ratio);
    }
    return acc;
  }, 0);

  // Total discounts given
  const totalDiscounts = historicalCollectionSlips.reduce((acc, slip) => acc + (slip.discount || 0), 0);

  // Admission fee collected
  const admissionCollection = historicalCollectionSlips.reduce((acc, slip) => {
    if (slip.status === 'Paid') return acc + (slip.admissionFee || 0);
    if (slip.status === 'Partial' && slip.totalAmount > 0) {
      const ratio = (slip.amountPaid || 0) / slip.totalAmount;
      return acc + Math.round((slip.admissionFee || 0) * ratio);
    }
    return acc;
  }, 0);

  // Miscellaneous charges collected
  const miscCollection = historicalCollectionSlips.reduce((acc, slip) => {
    if (slip.status === 'Paid') return acc + (slip.miscCharges || 0);
    if (slip.status === 'Partial' && slip.totalAmount > 0) {
      const ratio = (slip.amountPaid || 0) / slip.totalAmount;
      return acc + Math.round((slip.miscCharges || 0) * ratio);
    }
    return acc;
  }, 0);

  // Outstanding fees (Total Net Payable - Amount Paid)
  const outstanding = filteredFeeSlips
    .filter(s => s.status !== 'Paid')
    .reduce((acc, slip) => acc + Math.max(0, (slip.totalAmount || 0) - (slip.amountPaid || 0)), 0);

  const staffCount = filteredStaff.filter(s => s.status === 'Active').length;

  // Salary expense this month
  const salaryExpense = ledger
    .filter(entry => entry.category === 'Salary' && (selectedCampus === 'ALL' || entry.campus === selectedCampus))
    .reduce((acc, entry) => acc + entry.amount, 0);

  const activeCampusesCount = campuses.filter(c => c.status === 'Active').length;

  // Net Income: Total Credits minus Total Debits
  const netIncome = ledger
    .filter(entry => selectedCampus === 'ALL' || entry.campus === selectedCampus || entry.campus === 'ALL')
    .reduce((acc, entry) => {
      return entry.type === 'Credit' ? acc + entry.amount : acc - entry.amount;
    }, 0);

  // --- Student Actions ---
  const addStudent = (newStudent) => {
    try { assertStudentCapacity(studentsRef.current); }
    catch (error) { showToast(error.message, 'danger'); return null; }
    const id = 'std-' + crypto.randomUUID();
    const studentWithId = { 
      ...newStudent, 
      rollNo: nextRollNumber(studentsRef.current, newStudent.campus),
      id, 
      balance: 0, 
      status: 'Active',
      transportFee: Number(newStudent.transportFee) || 0,
      isTransport: Boolean(newStudent.isTransport || Number(newStudent.transportFee) > 0),
      transportRoute: newStudent.transportRoute || '',
      admissionFee: Number(newStudent.admissionFee) || 0,
      feeHistory: [
        { 
          effectiveDate: newStudent.admissionDate || new Date().toISOString().split('T')[0],
          monthlyFee: Number(newStudent.monthlyFee) || 0,
          transportFee: Number(newStudent.transportFee) || 0,
          reason: 'Initial enrollment & fee assignment'
        }
      ]
    };
    setStudents(prev => [studentWithId, ...prev]);
    syncDocToFirestore('students', id, studentWithId);
    showToast(`✓ New admission registered: ${studentWithId.name} (${studentWithId.rollNo})`, 'success');
    return studentWithId;
  };

  const updateStudent = (id, updatedData) => {
    let updatedRecord = null;
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        updatedRecord = { 
          ...s, 
          ...updatedData,
          transportFee: updatedData.transportFee !== undefined ? Number(updatedData.transportFee) : s.transportFee,
          isTransport: updatedData.isTransport !== undefined ? updatedData.isTransport : (Number(updatedData.transportFee || s.transportFee) > 0)
        };
        return updatedRecord;
      }
      return s;
    }));
    if (updatedRecord) {
      syncDocToFirestore('students', id, updatedRecord);
    }
    showToast('✓ Student profile updated successfully', 'success');
  };

  // Fee Structure Update with History (Preserves previous records)
  const updateStudentFeeStructure = (id, newFeeData, reason = 'Annual fee revision') => {
    let updatedRecord = null;
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        const historyEntry = {
          effectiveDate: newFeeData.effectiveDate || new Date().toISOString().split('T')[0],
          previousMonthlyFee: s.monthlyFee,
          newMonthlyFee: Number(newFeeData.monthlyFee),
          previousTransportFee: s.transportFee,
          newTransportFee: Number(newFeeData.transportFee || 0),
          reason: reason || 'Fee structure update'
        };
        updatedRecord = {
          ...s,
          monthlyFee: Number(newFeeData.monthlyFee),
          transportFee: Number(newFeeData.transportFee || 0),
          isTransport: Boolean(Number(newFeeData.transportFee || 0) > 0),
          transportRoute: newFeeData.transportRoute !== undefined ? newFeeData.transportRoute : s.transportRoute,
          feeHistory: [historyEntry, ...(s.feeHistory || [])]
        };
        return updatedRecord;
      }
      return s;
    }));
    if (updatedRecord) {
      syncDocToFirestore('students', id, updatedRecord);
    }
    showToast('✓ Student fee structure updated with change history logged!', 'success');
  };

  const deleteStudent = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete student records.', 'danger');
      return false;
    }
    const target = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    removeDocFromFirestore('students', id);

    // Also remove associated fee slips permanently
    const targetSlips = feeSlips.filter(s => s.studentId === id || (target && s.rollNo === target.rollNo));
    if (targetSlips.length > 0) {
      setFeeSlips(prev => prev.filter(s => s.studentId !== id && (!target || s.rollNo !== target.rollNo)));
      targetSlips.forEach(slip => removeDocFromFirestore('feeSlips', slip.id));
    }

    showToast(`✓ Student ${target ? target.name : ''} deleted permanently`, 'danger');
    return true;
  };

  // --- Fee Slip Actions ---
  const generateFeeSlip = (slipData) => {
    const id = 'slip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const tuition = Number(slipData.tuitionFee || 0);
    const transport = Number(slipData.transportFee || 0);
    const admission = Number(slipData.admissionFee || 0);
    const exam = Number(slipData.examFee || 0);
    const misc = Number(slipData.miscCharges || 0);
    const discount = Number(slipData.discount || 0);
    const subtotal = tuition + transport + admission + exam + misc;
    const netTotal = Math.max(0, subtotal - discount);

    const targetStudent = students.find(s => s.id === slipData.studentId || s.rollNo === slipData.rollNo);

    const newSlip = {
      ...slipData,
      id,
      challanNo: slipData.challanNo || ('CH-' + Math.floor(100000 + Math.random() * 900000)),
      tuitionFee: tuition,
      transportFee: transport,
      admissionFee: admission,
      examFee: exam,
      miscCharges: misc,
      miscDescription: slipData.miscDescription || '',
      subtotal,
      discount,
      discountPercent: slipData.discountPercent || 0,
      discountReason: slipData.discountReason || '',
      totalAmount: netTotal,
      amountPaid: 0,
      status: 'Unpaid',
      phone: slipData.phone || (targetStudent ? targetStudent.phone : ''),
      classGrade: slipData.classGrade || (targetStudent ? targetStudent.classGrade : ''),
      section: slipData.section || (targetStudent ? targetStudent.section : 'A')
    };

    setFeeSlips(prev => [newSlip, ...prev]);
    syncDocToFirestore('feeSlips', id, newSlip);

    // Update student's balance in state
    if (targetStudent) {
      setStudents(prev => prev.map(st => {
        if (st.id === targetStudent.id || st.rollNo === targetStudent.rollNo) {
          const allSlips = [newSlip, ...feeSlips.filter(s => s.studentId === st.id || s.rollNo === st.rollNo)];
          const totalBilled = allSlips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
          const totalPaid = allSlips.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
          const updatedStd = { ...st, balance: Math.max(0, totalBilled - totalPaid) };
          syncDocToFirestore('students', st.id, updatedStd);
          return updatedStd;
        }
        return st;
      }));
    }

    showToast(`✓ Fee Challan ${newSlip.challanNo} generated for ${newSlip.studentName || (targetStudent ? targetStudent.name : 'Student')}`, 'success');
    return newSlip;
  };

  const generateBatchFeeSlips = (slipsArray) => {
    const timestamp = Date.now();
    const newSlips = slipsArray.map((slipData, idx) => {
      const tuition = Number(slipData.tuitionFee || 0);
      const transport = Number(slipData.transportFee || 0);
      const admission = Number(slipData.admissionFee || 0);
      const exam = Number(slipData.examFee || 0);
      const misc = Number(slipData.miscCharges || 0);
      const discount = Number(slipData.discount || 0);
      const subtotal = tuition + transport + admission + exam + misc;
      const netTotal = Math.max(0, subtotal - discount);

      const targetStudent = students.find(s => s.id === slipData.studentId || s.rollNo === slipData.rollNo);

      const slipObj = {
        ...slipData,
        id: `slip-${timestamp}-${idx}-${Math.floor(Math.random() * 1000)}`,
        challanNo: slipData.challanNo || ('CH-' + Math.floor(100000 + Math.random() * 900000)),
        tuitionFee: tuition,
        transportFee: transport,
        admissionFee: admission,
        examFee: exam,
        miscCharges: misc,
        miscDescription: slipData.miscDescription || '',
        subtotal,
        discount,
        discountPercent: slipData.discountPercent || 0,
        discountReason: slipData.discountReason || '',
        totalAmount: netTotal,
        amountPaid: 0,
        status: 'Unpaid',
        phone: slipData.phone || (targetStudent ? targetStudent.phone : ''),
        classGrade: slipData.classGrade || (targetStudent ? targetStudent.classGrade : ''),
        section: slipData.section || (targetStudent ? targetStudent.section : 'A')
      };

      syncDocToFirestore('feeSlips', slipObj.id, slipObj);
      return slipObj;
    });

    setFeeSlips(prev => [...newSlips, ...prev]);
    showToast(`✓ Successfully generated ${newSlips.length} Fee Challans!`, 'success');
    return newSlips;
  };

  // Pay Fee Slip with Instant Recalculation, Partial Payment History & Multi-System Sync
  const payFeeSlip = (slipId, amountPaid, paymentMethod = 'Cash at Counter', remarks = '', paymentDate = null, receiptNo = '') => {
    const collectedAmount = Number(amountPaid) || 0;
    const existing = feeSlips.find(s => s.id === slipId && !s.duesTransferredToSession);
    if (!existing || collectedAmount <= 0) return false;
    const remaining = Math.max(0, Number(existing.totalAmount || 0) - Number(existing.amountPaid || 0));
    if (collectedAmount > remaining) { showToast('Payment exceeds the outstanding dues.', 'danger'); return false; }
    const payDate = paymentDate || new Date().toISOString().split('T')[0];
    const rcp = receiptNo || ('RCP-' + crypto.randomUUID().slice(0, 8));
    const paid = Number(existing.amountPaid || 0) + collectedAmount;
    const targetSlip = { ...existing, amountPaid: paid, status: paid >= Number(existing.totalAmount) ? 'Paid' : 'Partial',
      paymentMethod, paymentRemarks: remarks, paidDate: payDate, receiptNo: rcp,
      paymentHistory: [...(existing.paymentHistory || []), { date: payDate, amount: collectedAmount, method: paymentMethod, receiptNo: rcp, remarks, recordedAt: new Date().toISOString() }] };
    const updatedFeeSlips = feeSlips.map(s => s.id === slipId ? targetSlip : s);
    setFeeSlips(updatedFeeSlips);
    const student = students.find(s => belongsToStudent(targetSlip, s));
    if (student) {
      const slips = updatedFeeSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, student));
      const totalBilled = slips.reduce((sum,s) => sum + Number(s.totalAmount || 0), 0);
      const totalPaid = slips.reduce((sum,s) => sum + Number(s.amountPaid || 0), 0);
      const updatedStudent = { ...student, balance: Math.max(0,totalBilled - totalPaid), totalBilled, totalPaid };
      setStudents(previous => previous.map(s => s.id === student.id ? updatedStudent : s));
      syncDocToFirestore('students', student.id, updatedStudent);
    }
    addLedgerEntry({ date: payDate, description: `Fee Collection: ${targetSlip.studentName} (${targetSlip.rollNo}) - ${targetSlip.month} [${rcp}]`, category: 'Fee Collection', campus: targetSlip.campus, type: 'Credit', amount: collectedAmount });
    syncDocToFirestore('feeSlips', targetSlip.id, targetSlip);
    showToast(`Payment of Rs ${collectedAmount.toLocaleString()} collected for ${targetSlip.studentName}`, 'success');
    return true;
  };

  // Update existing fee slip (recalculates totals and student balances)
  const updateFeeSlip = (id, updatedData) => {
    let targetSlip = null;
    let updatedFeeSlips = [];

    setFeeSlips(prev => {
      updatedFeeSlips = prev.map(slip => {
        if (slip.id === id) {
          const tuition = updatedData.tuitionFee !== undefined ? Number(updatedData.tuitionFee) : Number(slip.tuitionFee || 0);
          const transport = updatedData.transportFee !== undefined ? Number(updatedData.transportFee) : Number(slip.transportFee || 0);
          const admission = updatedData.admissionFee !== undefined ? Number(updatedData.admissionFee) : Number(slip.admissionFee || 0);
          const exam = updatedData.examFee !== undefined ? Number(updatedData.examFee) : Number(slip.examFee || 0);
          const misc = updatedData.miscCharges !== undefined ? Number(updatedData.miscCharges) : Number(slip.miscCharges || 0);
          const discount = updatedData.discount !== undefined ? Number(updatedData.discount) : Number(slip.discount || 0);
          const amountPaid = updatedData.amountPaid !== undefined ? Number(updatedData.amountPaid) : Number(slip.amountPaid || 0);

          const subtotal = tuition + transport + admission + exam + misc;
          const totalAmount = updatedData.totalAmount !== undefined ? Number(updatedData.totalAmount) : Math.max(0, subtotal - discount);
          const status = amountPaid >= totalAmount && totalAmount > 0 ? 'Paid' : (amountPaid > 0 ? 'Partial' : 'Unpaid');

          targetSlip = {
            ...slip,
            ...updatedData,
            tuitionFee: tuition,
            transportFee: transport,
            admissionFee: admission,
            examFee: exam,
            miscCharges: misc,
            discount,
            subtotal,
            totalAmount,
            amountPaid,
            status
          };
          return targetSlip;
        }
        return slip;
      });
      return updatedFeeSlips;
    });

    if (targetSlip) {
      syncDocToFirestore('feeSlips', id, targetSlip);

      // Recalculate student balance
      setStudents(prev => prev.map(std => {
        if (std.id === targetSlip.studentId || std.rollNo === targetSlip.rollNo) {
          const stdSlips = updatedFeeSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, std));
          const totalBilled = stdSlips.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
          const totalPaid = stdSlips.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);
          const newBalance = Math.max(0, totalBilled - totalPaid);
          const updatedStd = { ...std, balance: newBalance, totalBilled, totalPaid };
          syncDocToFirestore('students', std.id, updatedStd);
          return updatedStd;
        }
        return std;
      }));

      showToast(`✓ Fee Challan ${targetSlip.challanNo} updated successfully`, 'success');
    }
  };

  const deleteFeeSlip = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete fee challans.', 'danger');
      return false;
    }
    const target = feeSlips.find(s => s.id === id);
    const updatedFeeSlips = feeSlips.filter(s => s.id !== id);
    setFeeSlips(updatedFeeSlips);
    removeDocFromFirestore('feeSlips', id);

    if (target) {
      setStudents(prev => prev.map(std => {
        if (std.id === target.studentId || std.rollNo === target.rollNo) {
          const stdSlips = updatedFeeSlips.filter(s => !s.duesTransferredToSession && belongsToStudent(s, std));
          const totalBilled = stdSlips.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
          const totalPaid = stdSlips.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);
          const newBalance = Math.max(0, totalBilled - totalPaid);
          const updatedStd = { ...std, balance: newBalance, totalBilled, totalPaid };
          syncDocToFirestore('students', std.id, updatedStd);
          return updatedStd;
        }
        return std;
      }));
    }

    showToast(`✓ Fee Challan ${target ? target.challanNo : ''} deleted and student balance recalculated`, 'danger');
    return true;
  };

  // --- Staff & Salary Actions ---
  const addStaff = (newStaff) => {
    const id = 'stf-' + Date.now();
    const staffWithId = { ...newStaff, id, status: 'Active' };
    setStaff(prev => [staffWithId, ...prev]);
    syncDocToFirestore('staff', id, staffWithId);
    showToast(`✓ Staff member registered: ${staffWithId.name}`, 'success');
    return staffWithId;
  };

  const updateStaff = (id, updatedData) => {
    let updatedRecord = null;
    setStaff(prev => prev.map(s => {
      if (s.id === id) {
        updatedRecord = { ...s, ...updatedData };
        return updatedRecord;
      }
      return s;
    }));
    if (updatedRecord) {
      syncDocToFirestore('staff', id, updatedRecord);
    }
    showToast('✓ Staff record updated', 'success');
  };

  const deleteStaff = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete staff records.', 'danger');
      return false;
    }
    const target = staff.find(s => s.id === id);
    setStaff(prev => prev.filter(s => s.id !== id));
    removeDocFromFirestore('staff', id);
    showToast(`✓ Staff member ${target ? target.name : ''} deleted`, 'danger');
    return true;
  };

  const paySalary = (staffMember, month, amount, paymentMethod = 'Bank Transfer') => {
    const ledgerEntry = {
      date: new Date().toISOString().split('T')[0],
      description: `Staff Salary: ${staffMember.name} (${staffMember.designation}) for ${month}`,
      category: 'Salary',
      campus: staffMember.campus,
      type: 'Debit',
      amount: Number(amount)
    };
    addLedgerEntry(ledgerEntry);
    showToast(`✓ Salary disbursed: Rs ${Number(amount).toLocaleString()} to ${staffMember.name}`, 'success');
  };

  // --- Ledger Actions ---
  const addLedgerEntry = (entry) => {
    const id = 'led-' + Date.now();
    const newEntry = {
      ...entry,
      id,
      amount: Number(entry.amount)
    };
    setLedger(prev => [newEntry, ...prev]);
    syncDocToFirestore('ledger', id, newEntry);
    showToast(`✓ Ledger entry posted: ${newEntry.description}`, 'success');
  };

  const deleteLedgerEntry = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete financial ledger entries.', 'danger');
      return false;
    }
    const target = ledger.find(e => e.id === id);
    setLedger(prev => prev.filter(e => e.id !== id));
    removeDocFromFirestore('ledger', id);
    showToast(`✓ Ledger transaction voucher deleted`, 'danger');
    return true;
  };

  // --- User / Admin Actions ---
  const addUser = (userData) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to create new admin users.', 'danger');
      return null;
    }
    const id = 'usr-' + Date.now();
    const newUser = {
      id,
      ...userData,
      accessGranted: true,
      accessGrantedBy: currentUser.name || 'Saad Ahmad (Super Admin)',
      permissions: userData.permissions || {
        dashboard: true,
        students: true,
        feeslips: true,
        staff: true,
        attendance: true,
        ledger: true,
        reports: true,
        users: false,
        settings: true
      }
    };
    setUsers(prev => [...prev, newUser]);
    syncDocToFirestore('users', id, newUser);
    showToast(`✓ Admin user ${newUser.name} created with assigned permissions!`, 'success');
    return newUser;
  };

  const deleteUser = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete admin accounts.', 'danger');
      return false;
    }
    const target = users.find(u => u.id === id);
    if (target?.role === 'Super Admin') {
      showToast('Cannot delete the primary Super Admin account.', 'danger');
      return false;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    removeDocFromFirestore('users', id);
    showToast(`✓ Admin account ${target ? target.name : ''} deleted`, 'danger');
    return true;
  };

  // --- Attendance Actions ---
  const saveAttendanceRecord = (date, campus, classGrade, records) => {
    const recordId = `${date}_${campus}_${classGrade}`;
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.date === date && a.campus === campus && a.classGrade === classGrade));
      return [...records, ...filtered];
    });
    syncDocToFirestore('attendance', recordId, { date, campus, classGrade, records, lastUpdated: new Date().toISOString() });
  };

  // --- Campus Actions ---
  const addCampus = (campusData) => {
    const id = campusData.id || 'camp-' + Date.now();
    const newCamp = { ...campusData, id, status: campusData.status || 'Active' };
    setCampuses(prev => [...prev, newCamp]);
    syncDocToFirestore('campuses', id, newCamp);
    showToast(`✓ Campus ${newCamp.name} (${newCamp.code}) registered successfully!`, 'success');
    return newCamp;
  };

  const updateCampus = (id, updatedData) => {
    let updatedRecord = null;
    setCampuses(prev => prev.map(c => {
      if (c.id === id) {
        updatedRecord = { ...c, ...updatedData };
        return updatedRecord;
      }
      return c;
    }));
    if (updatedRecord) {
      syncDocToFirestore('campuses', id, updatedRecord);
    }
    showToast(`✓ Campus details updated!`, 'success');
  };

  const deleteCampus = (id) => {
    if (currentUser?.role !== 'Super Admin') {
      showToast('⚠️ Access Denied: Only Super Admin is authorized to delete campus branches.', 'danger');
      return false;
    }
    const target = campuses.find(c => c.id === id || c.code === id);
    if (!target) return false;
    const studentCount = students.filter(s => s.campus === target.code).length;
    const staffCount = staff.filter(s => s.campus === target.code).length;

    setCampuses(prev => prev.filter(c => c.id !== target.id));
    removeDocFromFirestore('campuses', target.id);
    showToast(`✓ Campus ${target.name} (${target.code}) removed successfully. (${studentCount} students, ${staffCount} staff)`, 'danger');
    return true;
  };

  // --- Connect Firebase ---
  const connectFirebaseProject = async (config) => {
    try {
      const res = initFirebase(config);
      if (res.isConnected) {
        saveFirebaseConfig(config);
        setFirebaseConnected(true);
        setFirebaseInfo({ status: 'Connected to Firestore', error: null, projectId: config.projectId });
        return { success: true };
      } else {
        setFirebaseConnected(false);
        setFirebaseInfo({ status: 'Connection Failed', error: res.error });
        return { success: false, error: res.error };
      }
    } catch (e) {
      setFirebaseConnected(false);
      setFirebaseInfo({ status: 'Connection Failed', error: e.message });
      return { success: false, error: e.message };
    }
  };

  const disconnectFirebase = () => {
    clearFirebaseConfig();
    setFirebaseConnected(false);
    setFirebaseInfo({ status: 'Local Mode', error: null });
  };

  const syncToFirebase = async () => {
    const db = getFirestoreDb();
    if (!firebaseConnected || !db) {
      return { success: false, error: 'Firebase is not connected. Please enter valid Firebase configuration first.' };
    }

    try {
      for (const std of students) {
        await setDoc(doc(db, 'students', std.id), std);
      }
      for (const st of staff) {
        await setDoc(doc(db, 'staff', st.id), st);
      }
      for (const slip of feeSlips) {
        await setDoc(doc(db, 'feeSlips', slip.id), slip);
      }
      for (const led of ledger) {
        await setDoc(doc(db, 'ledger', led.id), led);
      }
      for (const family of families) await setDoc(doc(db, 'families', family.id), family);
      for (const camp of campuses) {
        await setDoc(doc(db, 'campuses', camp.id), camp);
      }

      return { success: true, count: students.length + staff.length + feeSlips.length + ledger.length };
    } catch (e) {
      console.error('Sync failed:', e);
      return { success: false, error: e.message };
    }
  };

  const resetToScreenshotDemo = () => {
    setCampuses(INITIAL_CAMPUSES);
    setStudents(INITIAL_STUDENTS);
    setStaff(INITIAL_STAFF);
    setFeeSlips(INITIAL_FEE_SLIPS);
    setLedger(INITIAL_LEDGER);
    setUsers(INITIAL_USERS);
    setFamilies(INITIAL_FAMILIES);
    setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
    setAttendance([]);
    SESSION_KEYS.forEach(key => localStorage.removeItem(key));
    showToast('✓ Demo data restored to original state', 'info');
  };

  return (
    <AppContext.Provider value={{
      activeSession: ACTIVE_SESSION,
      sessions,
      switchSession,
      addSession,
      canManageSessions,
      convertStudentsToSession,
      activeTab,
      setActiveTab,
      selectedCampus,
      setSelectedCampus,
      campuses,
      addCampus,
      updateCampus,
      deleteCampus,
      students: filteredStudents,
      allStudents: sessionStudents,
      addStudent,
      updateStudent,
      updateStudentFeeStructure,
      deleteStudent,
      staff: filteredStaff,
      allStaff: staff,
      addStaff,
      updateStaff,
      deleteStaff,
      paySalary,
      feeSlips: filteredFeeSlips,
      allFeeSlips: sessionFeeSlips,
      generateFeeSlip,
      generateBatchFeeSlips,
      payFeeSlip,
      updateFeeSlip,
      deleteFeeSlip,
      getStudentYearlyFeeLedger,
      
      // Sibling Management & Family Portal
      families,
      addFamily,
      updateFamily,
      deleteFamily,
      linkSibling,
      unlinkSibling,
      reorderSiblings,
      generateFamilyFeeSlips,
      payFamilyFee,
      siblingDiscountRules,
      updateSiblingDiscountRules,

      // School Profile & Branding Customization
      schoolProfile,
      updateSchoolProfile,

      ledger,
      addLedgerEntry,
      deleteLedgerEntry,
      attendance,
      saveAttendanceRecord,
      users,
      addUser,
      updateUser,
      deleteUser,
      currentUser,
      setCurrentUser,
      
      // Dynamic Calculated Values
      activeStudentsCount,
      newAdmissionsCount,
      feeCollected,
      todayCollection,
      monthlyCollection,
      transportCollection,
      totalDiscounts,
      admissionCollection,
      miscCollection,
      outstanding,
      staffCount,
      salaryExpense,
      activeCampusesCount,
      netIncome,

      // Authentication & Access Control
      isAuthenticated,
      login,
      logout,
      hasPermission,
      updateUserPermissions,

      // Software Update System
      softwareVersion,
      isUpdating,
      updateProgress,
      updateStatusMessage,
      updateModalOpen,
      setUpdateModalOpen,
      lastUpdatedTime,
      checkForSoftwareUpdates,

      // Toast Notifications
      toast,
      showToast,

      // Firebase
      firebaseConnected,
      firebaseInfo,
      connectFirebaseProject,
      disconnectFirebase,
      syncToFirebase,
      resetToScreenshotDemo
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

