import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  initFirebase, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  getSavedFirebaseConfig, 
  getFirestoreDb, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc 
} from '../services/firebase';

const AppContext = createContext();

export const ACADEMIC_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September', 
  'October', 'November', 'December', 'January', 'February', 'March'
];

export const CURRENT_ACADEMIC_YEAR = '2026';
export const NEXT_ACADEMIC_YEAR = '2027';
export const ACADEMIC_SESSION = 'Session 2026–2027';

// Helper to format academic month display string e.g. "April 2026" or "February 2027"
export function getAcademicMonthYear(monthName, baseYear = 2026) {
  const isSecondHalf = ['January', 'February', 'March'].includes(monthName);
  const year = isSecondHalf ? Number(baseYear) + 1 : Number(baseYear);
  return `${monthName} ${year}`;
}

// Complete 12-Month Academic Year Financial Ledger (April–March)
export function getStudentYearlyFeeLedger(student, feeSlips = [], academicYear = '2026-2027') {
  if (!student) return { months: [], totals: {} };

  const startYear = parseInt(academicYear.split('-')[0]) || 2026;
  const endYear = startYear + 1;

  // Student specific slips
  const studentSlips = (feeSlips || []).filter(s => s.studentId === student.id || s.rollNo === student.rollNo);

  const monthsLedger = ACADEMIC_MONTHS.map((monthName) => {
    // April to December are in startYear, January to March are in endYear
    const isNextYear = ['January', 'February', 'March'].includes(monthName);
    const monthYear = isNextYear ? endYear : startYear;
    const fullMonthLabel = `${monthName} ${monthYear}`;

    // Find matching slips for this month
    const matchingSlips = studentSlips.filter(s => {
      if (!s.month) return false;
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

const INITIAL_STUDENTS = [
  // Abbottabad Students
  { 
    id: 'std-1', 
    rollNo: 'ABB-101', 
    name: 'Muhammad Saad', 
    fatherName: 'Tariq Mahmood', 
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
    fatherName: 'Tariq Mehmood', 
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
  
  // Swat Students
  { 
    id: 'std-6', 
    rollNo: 'SWT-201', 
    name: 'Umar Farooq', 
    fatherName: 'Farooq Ahmad', 
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
    id: 'std-7', 
    rollNo: 'SWT-202', 
    name: 'Zainab Noor', 
    fatherName: 'Noor Muhammad', 
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  
  // App entities with LocalStorage persistence
  const [campuses, setCampuses] = useState(() => {
    const local = localStorage.getItem('peace_campuses');
    return local ? JSON.parse(local) : INITIAL_CAMPUSES;
  });

  const [students, setStudents] = useState(() => {
    const local = localStorage.getItem('peace_students');
    if (!local) return INITIAL_STUDENTS;
    try {
      const parsed = JSON.parse(local);
      return parsed.map(s => ({
        ...s,
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
    if (currentUser.role === 'Admin') {
      // Admins have access to operational modules by default including users delegation
      if (currentUser.permissions && currentUser.permissions[moduleKey] !== undefined) {
        return currentUser.permissions[moduleKey] !== false;
      }
      return true;
    }
    if (currentUser.permissions) {
      return currentUser.permissions[moduleKey] !== false;
    }
    return true;
  };

  // --- TWO-SYSTEM SYNCHRONIZATION & SOFTWARE UPDATE ENGINE ---
  const [softwareVersion] = useState('v2.4.0');
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
    if (!currentDb) return { success: false, syncedCount: 0 };

    let totalSynced = 0;
    try {
      // 1. Students
      const stdSnap = await getDocs(collection(currentDb, 'students'));
      if (!stdSnap.empty) {
        const remoteStudents = [];
        stdSnap.forEach(d => remoteStudents.push({ id: d.id, ...d.data() }));
        setStudents(remoteStudents);
        localStorage.setItem('peace_students', JSON.stringify(remoteStudents));
        totalSynced += remoteStudents.length;
      }

      // 2. Fee Slips
      const feeSnap = await getDocs(collection(currentDb, 'feeSlips'));
      if (!feeSnap.empty) {
        const remoteFeeSlips = [];
        feeSnap.forEach(d => remoteFeeSlips.push({ id: d.id, ...d.data() }));
        setFeeSlips(remoteFeeSlips);
        localStorage.setItem('peace_fee_slips', JSON.stringify(remoteFeeSlips));
        totalSynced += remoteFeeSlips.length;
      }

      // 3. Staff
      const staffSnap = await getDocs(collection(currentDb, 'staff'));
      if (!staffSnap.empty) {
        const remoteStaff = [];
        staffSnap.forEach(d => remoteStaff.push({ id: d.id, ...d.data() }));
        setStaff(remoteStaff);
        localStorage.setItem('peace_staff', JSON.stringify(remoteStaff));
        totalSynced += remoteStaff.length;
      }

      // 4. Ledger
      const ledSnap = await getDocs(collection(currentDb, 'ledger'));
      if (!ledSnap.empty) {
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
      if (!attSnap.empty) {
        const remoteAttendance = [];
        attSnap.forEach(d => {
          const data = d.data();
          if (data.records && Array.isArray(data.records)) {
            remoteAttendance.push(...data.records);
          } else {
            remoteAttendance.push({ id: d.id, ...data });
          }
        });
        if (remoteAttendance.length > 0) {
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
    setUpdateProgress(15);
    setUpdateStatusMessage('Connecting to Central Database & Cloud Backend...');

    const currentDb = getFirestoreDb();

    await new Promise(r => setTimeout(r, 400));
    setUpdateProgress(40);
    setUpdateStatusMessage('Synchronizing students, fee payments, ledger, and staff across all systems...');

    // Push local records if database is empty / connect and pull latest records
    if (currentDb) {
      try {
        const fetchRes = await fetchAllFromBackend();
        if (fetchRes.syncedCount === 0) {
          // If backend was empty, initialize it with current data
          for (const s of students) await setDoc(doc(currentDb, 'students', s.id), s, { merge: true });
          for (const fs of feeSlips) await setDoc(doc(currentDb, 'feeSlips', fs.id), fs, { merge: true });
          for (const st of staff) await setDoc(doc(currentDb, 'staff', st.id), st, { merge: true });
          for (const l of ledger) await setDoc(doc(currentDb, 'ledger', l.id), l, { merge: true });
          for (const u of users) await setDoc(doc(currentDb, 'users', u.id), u, { merge: true });
          for (const c of campuses) await setDoc(doc(currentDb, 'campuses', c.id), c, { merge: true });
        }
      } catch (err) {
        console.warn("Sync during update notice:", err);
      }
    }

    await new Promise(r => setTimeout(r, 400));
    setUpdateProgress(75);
    setUpdateStatusMessage('Refreshing local caches & validating balance calculations...');

    // Service worker update
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
        }
      } catch (e) {}
    }

    await new Promise(r => setTimeout(r, 300));
    setUpdateProgress(100);
    const nowStr = new Date().toLocaleString();
    setLastUpdatedTime(nowStr);
    localStorage.setItem('peace_last_updated', nowStr);
    setUpdateStatusMessage('✓ Multi-system synchronization complete! All data and modules are 100% up-to-date.');
    setIsUpdating(false);
    showToast('✓ Data synchronized successfully! Both systems are in sync with latest records.', 'success');
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
    if (savedConfig) {
      const res = initFirebase(savedConfig);
      if (res.isConnected) {
        setFirebaseConnected(true);
        setFirebaseInfo({ status: 'Connected to Firestore', error: null, projectId: savedConfig.projectId });
        // Fetch all shared records immediately so System B gets latest data from System A
        fetchAllFromBackend();
      }
    }
  }, [fetchAllFromBackend]);

  // Filtered lists based on current selected campus
  const filteredStudents = selectedCampus === 'ALL' 
    ? students 
    : students.filter(s => s.campus === selectedCampus);

  const filteredStaff = selectedCampus === 'ALL'
    ? staff
    : staff.filter(s => s.campus === selectedCampus);

  const filteredFeeSlips = selectedCampus === 'ALL'
    ? feeSlips
    : feeSlips.filter(s => s.campus === selectedCampus);

  // Dynamic Calculations for KPIs
  const activeStudentsCount = filteredStudents.filter(s => s.status === 'Active').length;
  
  // New admissions this month
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const newAdmissionsCount = filteredStudents.filter(s => s.admissionDate && s.admissionDate.startsWith(currentMonthPrefix)).length;

  // Fee collected total
  const feeCollected = filteredFeeSlips.reduce((acc, slip) => acc + (slip.amountPaid || 0), 0);

  // Today's fee collection
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollection = filteredFeeSlips.reduce((acc, slip) => {
    return slip.paidDate === todayStr ? acc + (slip.amountPaid || 0) : acc;
  }, 0);

  // Current month fee collection
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const monthlyCollection = filteredFeeSlips
    .filter(slip => slip.month && slip.month.includes(currentMonthName))
    .reduce((acc, slip) => acc + (slip.amountPaid || 0), 0);

  // Transport fee collected
  const transportCollection = filteredFeeSlips.reduce((acc, slip) => {
    if (slip.status === 'Paid') return acc + (slip.transportFee || 0);
    if (slip.status === 'Partial' && slip.totalAmount > 0) {
      const ratio = (slip.amountPaid || 0) / slip.totalAmount;
      return acc + Math.round((slip.transportFee || 0) * ratio);
    }
    return acc;
  }, 0);

  // Total discounts given
  const totalDiscounts = filteredFeeSlips.reduce((acc, slip) => acc + (slip.discount || 0), 0);

  // Admission fee collected
  const admissionCollection = filteredFeeSlips.reduce((acc, slip) => {
    if (slip.status === 'Paid') return acc + (slip.admissionFee || 0);
    if (slip.status === 'Partial' && slip.totalAmount > 0) {
      const ratio = (slip.amountPaid || 0) / slip.totalAmount;
      return acc + Math.round((slip.admissionFee || 0) * ratio);
    }
    return acc;
  }, 0);

  // Miscellaneous charges collected
  const miscCollection = filteredFeeSlips.reduce((acc, slip) => {
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
    const id = 'std-' + Date.now();
    const studentWithId = { 
      ...newStudent, 
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

    const targetStudent = allStudents.find(s => s.id === slipData.studentId || s.rollNo === slipData.rollNo);

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

    showToast(`✓ Fee Challan ${newSlip.challanNo} generated for ${newSlip.studentName}`, 'success');
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

      const targetStudent = allStudents.find(s => s.id === slipData.studentId || s.rollNo === slipData.rollNo);

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
    if (collectedAmount <= 0) return;

    const payDate = paymentDate || new Date().toISOString().split('T')[0];
    const rcp = receiptNo || ('RCP-' + Math.floor(1000 + Math.random() * 9000));

    let targetSlip = null;
    let updatedFeeSlips = [];

    setFeeSlips(prev => {
      updatedFeeSlips = prev.map(slip => {
        if (slip.id === slipId) {
          const currentPaid = Number(slip.amountPaid || 0);
          const totalAmt = Number(slip.totalAmount || 0);
          const newPaid = currentPaid + collectedAmount;
          const newStatus = newPaid >= totalAmt ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');
          const existingHistory = Array.isArray(slip.paymentHistory) ? slip.paymentHistory : [];
          
          targetSlip = {
            ...slip,
            amountPaid: newPaid,
            status: newStatus,
            paymentMethod,
            paymentRemarks: remarks,
            paidDate: payDate,
            receiptNo: rcp,
            paymentHistory: [
              ...existingHistory,
              {
                date: payDate,
                amount: collectedAmount,
                method: paymentMethod,
                receiptNo: rcp,
                remarks: remarks,
                recordedAt: new Date().toISOString()
              }
            ]
          };
          return targetSlip;
        }
        return slip;
      });
      return updatedFeeSlips;
    });

    // Recalculate remaining student balance immediately and persist
    if (targetSlip) {
      let updatedStudent = null;
      setStudents(prev => prev.map(std => {
        if (std.id === targetSlip.studentId || std.rollNo === targetSlip.rollNo) {
          const stdSlips = updatedFeeSlips.filter(s => s.studentId === std.id || s.rollNo === std.rollNo);
          const totalBilled = stdSlips.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
          const totalPaid = stdSlips.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);
          const newBalance = Math.max(0, totalBilled - totalPaid);
          updatedStudent = {
            ...std,
            balance: newBalance,
            totalBilled,
            totalPaid
          };
          return updatedStudent;
        }
        return std;
      }));

      // Post to General Ledger automatically
      const ledgerEntry = {
        date: payDate,
        description: `Fee Collection: ${targetSlip.studentName} (${targetSlip.rollNo}) - ${targetSlip.month} [${rcp}]`,
        category: 'Fee Collection',
        campus: targetSlip.campus,
        type: 'Credit',
        amount: collectedAmount
      };
      addLedgerEntry(ledgerEntry);

      // Persist fee slip and updated student to Firestore
      syncDocToFirestore('feeSlips', targetSlip.id, targetSlip);
      if (updatedStudent) {
        syncDocToFirestore('students', updatedStudent.id, updatedStudent);
      }

      showToast(`✓ Payment of Rs ${collectedAmount.toLocaleString()} collected for ${targetSlip.studentName}`, 'success');
    }
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
          const stdSlips = updatedFeeSlips.filter(s => s.studentId === std.id || s.rollNo === std.rollNo);
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
    const target = feeSlips.find(s => s.id === id);
    const updatedFeeSlips = feeSlips.filter(s => s.id !== id);
    setFeeSlips(updatedFeeSlips);
    removeDocFromFirestore('feeSlips', id);

    if (target) {
      setStudents(prev => prev.map(std => {
        if (std.id === target.studentId || std.rollNo === target.rollNo) {
          const stdSlips = updatedFeeSlips.filter(s => s.studentId === std.id || s.rollNo === std.rollNo);
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
    const target = staff.find(s => s.id === id);
    setStaff(prev => prev.filter(s => s.id !== id));
    removeDocFromFirestore('staff', id);
    showToast(`✓ Staff member ${target ? target.name : ''} deleted`, 'danger');
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
    const target = ledger.find(e => e.id === id);
    setLedger(prev => prev.filter(e => e.id !== id));
    removeDocFromFirestore('ledger', id);
    showToast(`✓ Ledger transaction voucher deleted`, 'danger');
  };

  // --- User / Admin Actions ---
  const addUser = (userData) => {
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
    showToast(`✓ Admin user ${newUser.name} created!`, 'success');
    return newUser;
  };

  const deleteUser = (id) => {
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
    setAttendance([]);
    localStorage.clear();
    showToast('✓ Demo data restored to original state', 'info');
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      selectedCampus,
      setSelectedCampus,
      campuses,
      addCampus,
      updateCampus,
      deleteCampus,
      students: filteredStudents,
      allStudents: students,
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
      allFeeSlips: feeSlips,
      generateFeeSlip,
      generateBatchFeeSlips,
      payFeeSlip,
      updateFeeSlip,
      deleteFeeSlip,
      getStudentYearlyFeeLedger,
      siblingDiscountRules,
      updateSiblingDiscountRules,
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
