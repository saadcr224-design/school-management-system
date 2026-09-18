import React, { createContext, useContext, useState, useEffect } from 'react';
import { initFirebase, saveFirebaseConfig, clearFirebaseConfig, getSavedFirebaseConfig, db } from '../services/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

const AppContext = createContext();

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
  // 5 Abbottabad Students
  { id: 'std-1', rollNo: 'ABB-101', name: 'Muhammad Saad', fatherName: 'Tariq Mahmood', campus: 'ABB', classGrade: '9th', section: 'A', phone: '0300-1234567', monthlyFee: 4500, balance: 0, status: 'Active', admissionDate: '2026-01-15' },
  { id: 'std-2', rollNo: 'ABB-102', name: 'Ayesha Khan', fatherName: 'Dr. Imran Khan', campus: 'ABB', classGrade: '10th', section: 'A', phone: '0301-9876543', monthlyFee: 4500, balance: 0, status: 'Active', admissionDate: '2026-01-20' },
  { id: 'std-3', rollNo: 'ABB-103', name: 'Hamza Ali', fatherName: 'Ali Asghar', campus: 'ABB', classGrade: '8th', section: 'B', phone: '0312-3456789', monthlyFee: 4000, balance: 0, status: 'Active', admissionDate: '2026-02-01' },
  { id: 'std-4', rollNo: 'ABB-104', name: 'Fatima Bibi', fatherName: 'Sher Zaman', campus: 'ABB', classGrade: '1st Year', section: 'Pre-Med', phone: '0333-5554443', monthlyFee: 6500, balance: 0, status: 'Active', admissionDate: '2026-02-10' },
  { id: 'std-5', rollNo: 'ABB-105', name: 'Bilal Tariq', fatherName: 'Tariq Mehmood', campus: 'ABB', classGrade: '2nd Year', section: 'ICS', phone: '0345-6667778', monthlyFee: 6500, balance: 0, status: 'Active', admissionDate: '2026-02-15' },
  
  // 5 Swat Students (Including the 1 Unpaid Student with Rs 14,200 Outstanding)
  { id: 'std-6', rollNo: 'SWT-201', name: 'Umar Farooq', fatherName: 'Farooq Ahmad', campus: 'SWT', classGrade: '9th', section: 'A', phone: '0321-4443322', monthlyFee: 4200, balance: 14200, status: 'Active', admissionDate: '2026-01-10' },
  { id: 'std-7', rollNo: 'SWT-202', name: 'Zainab Noor', fatherName: 'Noor Muhammad', campus: 'SWT', classGrade: '10th', section: 'B', phone: '0302-7778899', monthlyFee: 4200, balance: 0, status: 'Active', admissionDate: '2026-01-18' },
  { id: 'std-8', rollNo: 'SWT-203', name: 'Hassan Raza', fatherName: 'Raza Ullah', campus: 'SWT', classGrade: '7th', section: 'A', phone: '0315-9998877', monthlyFee: 3800, balance: 0, status: 'Active', admissionDate: '2026-02-05' },
  { id: 'std-9', rollNo: 'SWT-204', name: 'Maryam Gul', fatherName: 'Gulzar Khan', campus: 'SWT', classGrade: '1st Year', section: 'Pre-Eng', phone: '0332-1112233', monthlyFee: 6000, balance: 0, status: 'Active', admissionDate: '2026-02-12' },
  { id: 'std-10', rollNo: 'SWT-205', name: 'Danial Khan', fatherName: 'Amjad Khan', campus: 'SWT', classGrade: '2nd Year', section: 'ICS', phone: '0340-9988112', monthlyFee: 6000, balance: 0, status: 'Active', admissionDate: '2026-02-18' },
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
    rollNo: 'SWT-201',
    campus: 'SWT',
    classGrade: '9th',
    month: 'March 2026',
    issueDate: '2026-03-01',
    dueDate: '2026-03-15',
    tuitionFee: 8400, // 2 months
    admissionFee: 5000,
    examFee: 800,
    totalAmount: 14200,
    amountPaid: 0,
    status: 'Unpaid',
    notes: 'Pending fee challan'
  }
];

const INITIAL_LEDGER = [
  { id: 'led-1', date: '2026-02-28', description: 'Opening Balance Session 2026-2027', category: 'Opening Balance', campus: 'ALL', type: 'Credit', amount: 264000, balance: 264000 }
];

const INITIAL_USERS = [
  { 
    id: 'usr-1', 
    name: 'Saad Ahmad', 
    email: 'superadmin', 
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
    return local ? JSON.parse(local) : INITIAL_STUDENTS;
  });

  const [staff, setStaff] = useState(() => {
    const local = localStorage.getItem('peace_staff');
    return local ? JSON.parse(local) : INITIAL_STAFF;
  });

  const [feeSlips, setFeeSlips] = useState(() => {
    const local = localStorage.getItem('peace_fee_slips');
    return local ? JSON.parse(local) : INITIAL_FEE_SLIPS;
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

  const login = (username, password) => {
    const cleanUser = (username || '').trim().toLowerCase();

    // 1. Super Admin login
    if ((cleanUser === 'superadmin' || cleanUser === 'saad' || cleanUser === 'saad.ahmad@shezad.edu.pk') && password === 'admin123') {
      const superAdminUser = users.find(u => u.role === 'Super Admin') || {
        id: 'usr-1',
        name: 'Saad Ahmad',
        role: 'Super Admin',
        email: 'superadmin',
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
      return { success: true, role: 'Super Admin' };
    }

    // 2. Admin login (working access granted by Super Admin)
    if ((cleanUser === 'admin' || cleanUser === 'admin@shezad.edu.pk') && password === 'admin123') {
      const adminUser = users.find(u => u.role === 'Admin') || {
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
      setCurrentUser(adminUser);
      setIsAuthenticated(true);
      localStorage.setItem('shezad_auth', 'true');
      localStorage.setItem('shezad_user', JSON.stringify(adminUser));
      return { success: true, role: 'Admin' };
    }

    return { 
      success: false, 
      error: 'Invalid credentials. Enter Email: admin and Password: admin123 (or superadmin / admin123)' 
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('shezad_auth');
    localStorage.removeItem('shezad_user');
  };

  const updateUserPermissions = (userId, newPermissions) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            permissions: { ...u.permissions, ...newPermissions },
            accessGranted: true,
            accessGrantedBy: currentUser.name || 'Super Admin',
            lastUpdated: new Date().toLocaleTimeString()
          };
        }
        return u;
      });
      const matching = updated.find(u => u.id === userId);
      if (matching && currentUser.id === userId) {
        setCurrentUser(matching);
        localStorage.setItem('shezad_user', JSON.stringify(matching));
      }
      return updated;
    });
  };

  const hasPermission = (moduleKey) => {
    if (currentUser.role === 'Super Admin') return true;
    if (currentUser.permissions) {
      return currentUser.permissions[moduleKey] !== false;
    }
    return true;
  };

  // PC Desktop Installation (PWA) Handler
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } else {
      alert("To install Shezad Children Academy on your PC:\n\n1. In Chrome / Edge, look for the 'Install app' icon in the address bar (computer with down arrow).\n2. Or click the browser 3-dots menu > 'Save and share' / 'Install Shezad Children Academy'.");
    }
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

  // Check saved Firebase on initial mount
  useEffect(() => {
    const savedConfig = getSavedFirebaseConfig();
    if (savedConfig) {
      const res = initFirebase(savedConfig);
      if (res.isConnected) {
        setFirebaseConnected(true);
        setFirebaseInfo({ status: 'Connected to Firestore', error: null, projectId: savedConfig.projectId });
      }
    }
  }, []);

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

  // Fee collected this month
  const feeCollected = filteredFeeSlips.reduce((acc, slip) => acc + (slip.amountPaid || 0), 0);

  // Outstanding fees
  const outstanding = filteredFeeSlips
    .filter(s => s.status !== 'Paid')
    .reduce((acc, slip) => acc + ((slip.totalAmount || 0) - (slip.amountPaid || 0)), 0);

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
    const studentWithId = { ...newStudent, id, balance: 0, status: 'Active' };
    setStudents(prev => [studentWithId, ...prev]);
    return studentWithId;
  };

  const updateStudent = (id, updatedData) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
  };

  const deleteStudent = (id) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  // --- Fee Slip Actions ---
  const generateFeeSlip = (slipData) => {
    const id = 'slip-' + Date.now();
    const newSlip = {
      ...slipData,
      id,
      challanNo: 'CH-' + Math.floor(100000 + Math.random() * 900000),
      amountPaid: 0,
      status: 'Unpaid'
    };
    setFeeSlips(prev => [newSlip, ...prev]);
    return newSlip;
  };

  const payFeeSlip = (slipId, amountPaid, paymentMethod = 'Cash', remarks = '') => {
    setFeeSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        const newPaid = (slip.amountPaid || 0) + Number(amountPaid);
        const newStatus = newPaid >= slip.totalAmount ? 'Paid' : 'Partial';
        return {
          ...slip,
          amountPaid: newPaid,
          status: newStatus,
          paymentMethod,
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
      return slip;
    }));

    // Post to General Ledger automatically!
    const targetSlip = feeSlips.find(s => s.id === slipId);
    if (targetSlip) {
      addLedgerEntry({
        date: new Date().toISOString().split('T')[0],
        description: `Fee Collection: ${targetSlip.studentName} (${targetSlip.rollNo}) - ${targetSlip.month}`,
        category: 'Fee Collection',
        campus: targetSlip.campus,
        type: 'Credit',
        amount: Number(amountPaid)
      });
    }
  };

  const deleteFeeSlip = (id) => {
    setFeeSlips(prev => prev.filter(s => s.id !== id));
  };

  // --- Staff & Salary Actions ---
  const addStaff = (newStaff) => {
    const id = 'stf-' + Date.now();
    const staffWithId = { ...newStaff, id, status: 'Active' };
    setStaff(prev => [staffWithId, ...prev]);
    return staffWithId;
  };

  const updateStaff = (id, updatedData) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
  };

  const paySalary = (staffMember, month, amount, paymentMethod = 'Bank Transfer') => {
    // Add debit transaction to Ledger
    addLedgerEntry({
      date: new Date().toISOString().split('T')[0],
      description: `Staff Salary: ${staffMember.name} (${staffMember.designation}) for ${month}`,
      category: 'Salary',
      campus: staffMember.campus,
      type: 'Debit',
      amount: Number(amount)
    });
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
  };

  // --- Attendance Actions ---
  const saveAttendanceRecord = (date, campus, classGrade, records) => {
    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.date === date && a.campus === campus && a.classGrade === classGrade));
      return [...records, ...filtered];
    });
  };

  // --- Campus Actions ---
  const addCampus = (campusData) => {
    setCampuses(prev => [...prev, campusData]);
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

  // 1-Click Upload to Live Firebase Firestore
  const syncToFirebase = async () => {
    if (!firebaseConnected || !db) {
      return { success: false, error: 'Firebase is not connected. Please enter valid Firebase configuration first.' };
    }

    try {
      // Sync Students
      for (const std of students) {
        await setDoc(doc(db, 'students', std.id), std);
      }
      // Sync Staff
      for (const st of staff) {
        await setDoc(doc(db, 'staff', st.id), st);
      }
      // Sync Fee Slips
      for (const slip of feeSlips) {
        await setDoc(doc(db, 'feeSlips', slip.id), slip);
      }
      // Sync Ledger
      for (const led of ledger) {
        await setDoc(doc(db, 'ledger', led.id), led);
      }
      // Sync Campuses
      for (const camp of campuses) {
        await setDoc(doc(db, 'campuses', camp.id), camp);
      }

      return { success: true, count: students.length + staff.length + feeSlips.length + ledger.length };
    } catch (e) {
      console.error('Sync failed:', e);
      return { success: false, error: e.message };
    }
  };

  // Reset demo data to screenshot match
  const resetToScreenshotDemo = () => {
    setCampuses(INITIAL_CAMPUSES);
    setStudents(INITIAL_STUDENTS);
    setStaff(INITIAL_STAFF);
    setFeeSlips(INITIAL_FEE_SLIPS);
    setLedger(INITIAL_LEDGER);
    setUsers(INITIAL_USERS);
    setAttendance([]);
    localStorage.clear();
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      selectedCampus,
      setSelectedCampus,
      campuses,
      addCampus,
      students: filteredStudents,
      allStudents: students,
      addStudent,
      updateStudent,
      deleteStudent,
      staff: filteredStaff,
      allStaff: staff,
      addStaff,
      updateStaff,
      paySalary,
      feeSlips: filteredFeeSlips,
      allFeeSlips: feeSlips,
      generateFeeSlip,
      payFeeSlip,
      deleteFeeSlip,
      ledger,
      addLedgerEntry,
      attendance,
      saveAttendanceRecord,
      users,
      currentUser,
      setCurrentUser,
      
      // Dynamic Calculated Values
      activeStudentsCount,
      newAdmissionsCount,
      feeCollected,
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

      // PWA Desktop Install
      canInstall,
      installApp,

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
