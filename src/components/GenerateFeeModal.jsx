import React, { useState, useEffect, useMemo } from 'react';
import { useApp, ACADEMIC_MONTHS, getAcademicMonthYear } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';

const CLASSES = [
  'All Classes',
  'Nursery',
  'Prep',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '1st Year',
  '2nd Year'
];

export default function GenerateFeeModal({ isOpen, onClose }) {
  const { 
    allStudents, 
    campuses, 
    generateFeeSlip, 
    generateBatchFeeSlips, 
    siblingDiscountRules = { sibling1: 0, sibling2: 25, sibling3: 50, sibling4Plus: 75 },
    showToast
  } = useApp();

  // Mode: 'single' (One Student), 'batch' (Entire Class), 'sibling' (Family / Sibling Discount)
  const [mode, setMode] = useState('single');

  // Direct Print state after generation
  const [slipsToDirectPrint, setSlipsToDirectPrint] = useState(null);

  // --- BILLING PERIOD & DURATION STATE ---
  // Presets: '1' (1 Month), '3' (3 Months / Quarter), '5' (5 Months / Term), '6' (6 Months / Half Year), '12' (12 Months / Full Session), 'custom'
  const [billingDuration, setBillingDuration] = useState('1');
  const [customMonthsCount, setCustomMonthsCount] = useState(3);
  const [billingOutputFormat, setBillingOutputFormat] = useState('combined'); // 'combined' (1 single multi-month slip) or 'split' (N separate monthly slips)

  // Academic Start Month & Year (April to March Cycle)
  const [selectedAcademicMonth, setSelectedAcademicMonth] = useState('April');
  const [academicYear, setAcademicYear] = useState('2026');

  // Common Fee Fields
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [examFee, setExamFee] = useState(0);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [transportFee, setTransportFee] = useState(0);
  const [miscCharges, setMiscCharges] = useState(0);
  const [miscDescription, setMiscDescription] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  // Calculate target months array based on start month, academic year, and duration
  const targetMonthsList = useMemo(() => {
    const startIdx = ACADEMIC_MONTHS.indexOf(selectedAcademicMonth);
    const safeStartIdx = startIdx >= 0 ? startIdx : 0;

    let numMonths = 1;
    if (billingDuration === '3') numMonths = 3;
    else if (billingDuration === '5') numMonths = 5;
    else if (billingDuration === '6') numMonths = 6;
    else if (billingDuration === '12') numMonths = 12;
    else if (billingDuration === 'custom') numMonths = Math.min(12, Math.max(1, Number(customMonthsCount || 1)));

    const list = [];
    for (let i = 0; i < numMonths; i++) {
      const mIdx = (safeStartIdx + i) % 12;
      const mName = ACADEMIC_MONTHS[mIdx];
      // Academic year handling: If session started in April (or May-Dec), Jan-Mar belong to (academicYear + 1)
      const baseYearNum = Number(academicYear) || 2026;
      let y = String(baseYearNum);
      const isPostJan = ['January', 'February', 'March'].includes(mName);
      const isStartPreJan = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].includes(selectedAcademicMonth);
      if (isPostJan && isStartPreJan) {
        y = String(baseYearNum + 1);
      }

      list.push({
        monthName: mName,
        year: y,
        label: `${mName} ${y}`
      });
    }
    return list;
  }, [selectedAcademicMonth, academicYear, billingDuration, customMonthsCount]);

  // Human-readable Period Name
  const periodLabel = useMemo(() => {
    if (targetMonthsList.length === 1) return targetMonthsList[0].label;
    const first = targetMonthsList[0].label;
    const last = targetMonthsList[targetMonthsList.length - 1].label;
    const count = targetMonthsList.length;
    let tag = `${count} Months`;
    if (count === 12) tag = 'Full Session / 12 Months';
    else if (count === 3) tag = 'Quarterly / 3 Months';
    else if (count === 5) tag = 'Term / 5 Months';
    else if (count === 6) tag = 'Half Session / 6 Months';
    return `${first} – ${last} (${tag})`;
  }, [targetMonthsList]);

  const monthsMultiplier = targetMonthsList.length;

  // --- BATCH / CLASS MODE STATE ---
  const [batchCampus, setBatchCampus] = useState('ALL');
  const [batchClass, setBatchClass] = useState('9th');
  const [useStudentMonthlyFee, setUseStudentMonthlyFee] = useState(true);
  const [batchUniformTuition, setBatchUniformTuition] = useState(4500);
  const [includeStudentTransport, setIncludeStudentTransport] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // --- SIBLING / FAMILY MODE STATE ---
  const [selectedFatherKey, setSelectedFatherKey] = useState('');
  const [siblingSearch, setSiblingSearch] = useState('');
  const [siblingList, setSiblingList] = useState([]); // [{ student, order, discountPercent, customTuition, transportFee, examFee, admissionFee, miscCharges }]
  const [manualAddStudentId, setManualAddStudentId] = useState('');

  // --- SINGLE STUDENT MODE STATE ---
  const [singleCampusFilter, setSingleCampusFilter] = useState('ALL');
  const [singleClassFilter, setSingleClassFilter] = useState('All Classes');
  const [singleStudentSearch, setSingleStudentSearch] = useState('');
  const [selectedSingleStudentId, setSelectedSingleStudentId] = useState('');
  const [singleTuitionFee, setSingleTuitionFee] = useState(4500);

  // Group active students into Family / Sibling Groups by Father Name
  const familyGroups = useMemo(() => {
    const groups = {};
    allStudents.forEach(s => {
      if (s.status === 'Inactive') return;
      const key = (s.fatherName || 'Unknown').trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          fatherName: s.fatherName || 'Unknown',
          phone: s.phone || '',
          students: []
        };
      }
      groups[key].students.push(s);
    });
    return Object.values(groups);
  }, [allStudents]);

  const multiChildFamilies = useMemo(() => {
    return familyGroups.filter(f => f.students.length >= 2);
  }, [familyGroups]);

  useEffect(() => {
    if (multiChildFamilies.length > 0 && !selectedFatherKey) {
      setSelectedFatherKey(multiChildFamilies[0].fatherName);
    }
  }, [multiChildFamilies]);

  // Load siblings whenever selectedFatherKey changes
  useEffect(() => {
    if (!selectedFatherKey) return;
    const targetGroup = familyGroups.find(f => f.fatherName.toLowerCase() === selectedFatherKey.toLowerCase());
    if (targetGroup && targetGroup.students.length > 0) {
      const initialSiblings = targetGroup.students.map((student, index) => {
        let defaultDiscount = 0;
        if (index === 0) defaultDiscount = siblingDiscountRules.sibling1 ?? 0;
        else if (index === 1) defaultDiscount = siblingDiscountRules.sibling2 ?? 25;
        else if (index === 2) defaultDiscount = siblingDiscountRules.sibling3 ?? 50;
        else defaultDiscount = siblingDiscountRules.sibling4Plus ?? 75;

        return {
          id: student.id,
          student,
          order: index + 1,
          discountPercent: defaultDiscount,
          customTuition: student.monthlyFee || 4500,
          transportFee: student.transportFee || 0,
          examFee: 0,
          admissionFee: 0,
          miscCharges: 0
        };
      });
      setSiblingList(initialSiblings);
    }
  }, [selectedFatherKey, familyGroups, siblingDiscountRules]);

  // Matching students for Batch Generation
  const eligibleBatchStudents = allStudents.filter(s => {
    if (s.status === 'Inactive') return false;
    const matchesCampus = batchCampus === 'ALL' || s.campus === batchCampus;
    const matchesClass = batchClass === 'All Classes' || s.classGrade === batchClass;
    return matchesCampus && matchesClass;
  });

  useEffect(() => {
    setSelectedStudentIds(eligibleBatchStudents.map(s => s.id));
  }, [batchCampus, batchClass, allStudents]);

  // Matching students for Single Student Dropdown
  const eligibleSingleStudents = allStudents.filter(s => {
    const matchesCampus = singleCampusFilter === 'ALL' || s.campus === singleCampusFilter;
    const matchesClass = singleClassFilter === 'All Classes' || s.classGrade === singleClassFilter;
    const matchesSearch = !singleStudentSearch || 
      s.name.toLowerCase().includes(singleStudentSearch.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(singleStudentSearch.toLowerCase()) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(singleStudentSearch.toLowerCase()));
    return matchesCampus && matchesClass && matchesSearch;
  });

  useEffect(() => {
    if (eligibleSingleStudents.length > 0 && (!selectedSingleStudentId || !eligibleSingleStudents.find(s => s.id === selectedSingleStudentId))) {
      const first = eligibleSingleStudents[0];
      setSelectedSingleStudentId(first.id);
      setSingleTuitionFee(first.monthlyFee || 4500);
      setTransportFee(first.transportFee || 0);
    }
  }, [eligibleSingleStudents, selectedSingleStudentId]);

  const handleSelectStudentChange = (studentId) => {
    setSelectedSingleStudentId(studentId);
    const target = allStudents.find(s => s.id === studentId);
    if (target) {
      setSingleTuitionFee(target.monthlyFee || 4500);
      setTransportFee(target.transportFee || 0);
    }
  };

  // Calculations for Single Mode (Accounts for Multi-month multiplier in combined format)
  const singleTuitionTotal = Number(singleTuitionFee || 0) * (billingOutputFormat === 'combined' ? monthsMultiplier : 1);
  const singleTransportTotal = Number(transportFee || 0) * (billingOutputFormat === 'combined' ? monthsMultiplier : 1);
  const singleSubtotal = singleTuitionTotal + singleTransportTotal + Number(admissionFee || 0) + Number(examFee || 0) + Number(miscCharges || 0);
  const singleNetPayable = Math.max(0, singleSubtotal - Number(discountAmount || 0));

  // --- SUBMIT HANDLERS ---

  // 1. Submit Single Student Challan(s)
  const handleSingleSubmit = (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    const student = allStudents.find(s => s.id === selectedSingleStudentId);
    if (!student) {
      alert('Please select a student.');
      return;
    }

    const issueDate = new Date().toISOString().split('T')[0];
    let createdSlips = [];

    if (billingOutputFormat === 'combined' || monthsMultiplier === 1) {
      // 1 Consolidated Multi-month Voucher
      const slipObj = {
        studentId: student.id,
        studentName: student.name,
        fatherName: student.fatherName,
        rollNo: student.rollNo,
        campus: student.campus,
        classGrade: student.classGrade,
        section: student.section || 'A',
        phone: student.phone || '',
        month: periodLabel,
        billingMonths: targetMonthsList.map(m => m.label),
        billingDurationMonths: monthsMultiplier,
        issueDate,
        dueDate,
        tuitionFee: singleTuitionTotal,
        transportFee: singleTransportTotal,
        admissionFee: Number(admissionFee || 0),
        examFee: Number(examFee || 0),
        miscCharges: Number(miscCharges || 0),
        miscDescription: miscDescription ? `${miscDescription} (${monthsMultiplier} Mo)` : '',
        subtotal: singleSubtotal,
        discount: Number(discountAmount || 0),
        discountReason,
        totalAmount: singleNetPayable,
        status: 'Unpaid',
        amountPaid: 0
      };
      const created = generateFeeSlip(slipObj);
      createdSlips = [created];
    } else {
      // Split Format: N separate monthly vouchers in batch
      const slipsToBatch = targetMonthsList.map((mObj, idx) => {
        const tuition = Number(singleTuitionFee || 0);
        const transport = Number(transportFee || 0);
        // Apply admission, exam, misc only on first month or distribute
        const isFirstMonth = idx === 0;
        const adm = isFirstMonth ? Number(admissionFee || 0) : 0;
        const exm = isFirstMonth ? Number(examFee || 0) : 0;
        const misc = isFirstMonth ? Number(miscCharges || 0) : 0;
        const disc = isFirstMonth ? Number(discountAmount || 0) : 0;
        const sub = tuition + transport + adm + exm + misc;
        const net = Math.max(0, sub - disc);

        return {
          studentId: student.id,
          studentName: student.name,
          fatherName: student.fatherName,
          rollNo: student.rollNo,
          campus: student.campus,
          classGrade: student.classGrade,
          section: student.section || 'A',
          phone: student.phone || '',
          month: mObj.label,
          billingDurationMonths: 1,
          issueDate,
          dueDate,
          tuitionFee: tuition,
          transportFee: transport,
          admissionFee: adm,
          examFee: exm,
          miscCharges: misc,
          miscDescription: isFirstMonth ? miscDescription : '',
          subtotal: sub,
          discount: disc,
          discountReason: isFirstMonth ? discountReason : '',
          totalAmount: net,
          status: 'Unpaid',
          amountPaid: 0
        };
      });
      createdSlips = generateBatchFeeSlips(slipsToBatch);
    }

    showToast(`✓ Generated ${createdSlips.length} fee voucher(s) for ${student.name}!`, 'success');

    if (shouldPrint) {
      setSlipsToDirectPrint(createdSlips);
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      onClose();
    }
  };

  // 2. Submit Batch Class Challans
  const handleBatchSubmit = (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert('Please select at least 1 student to generate challans.');
      return;
    }

    const studentsToGenerate = allStudents.filter(s => selectedStudentIds.includes(s.id));
    const issueDate = new Date().toISOString().split('T')[0];
    let slipsToCreate = [];

    if (billingOutputFormat === 'combined' || monthsMultiplier === 1) {
      // Combined Single Voucher per Student
      slipsToCreate = studentsToGenerate.map(student => {
        const baseTuition = useStudentMonthlyFee ? (student.monthlyFee || 4500) : Number(batchUniformTuition);
        const baseTransport = includeStudentTransport ? (student.transportFee || 0) : 0;
        const tuitionTotal = baseTuition * monthsMultiplier;
        const transportTotal = baseTransport * monthsMultiplier;
        const subtotal = tuitionTotal + transportTotal + Number(admissionFee || 0) + Number(examFee || 0) + Number(miscCharges || 0);
        const discount = Number(discountAmount || 0);
        const netTotal = Math.max(0, subtotal - discount);

        return {
          studentId: student.id,
          studentName: student.name,
          fatherName: student.fatherName,
          rollNo: student.rollNo,
          campus: student.campus,
          classGrade: student.classGrade,
          section: student.section || 'A',
          phone: student.phone || '',
          month: periodLabel,
          billingMonths: targetMonthsList.map(m => m.label),
          billingDurationMonths: monthsMultiplier,
          issueDate,
          dueDate,
          tuitionFee: tuitionTotal,
          transportFee: transportTotal,
          admissionFee: Number(admissionFee || 0),
          examFee: Number(examFee || 0),
          miscCharges: Number(miscCharges || 0),
          miscDescription,
          subtotal,
          discount,
          discountReason,
          totalAmount: netTotal,
          status: 'Unpaid',
          amountPaid: 0
        };
      });
    } else {
      // Split Format: N separate monthly vouchers per student
      studentsToGenerate.forEach(student => {
        const baseTuition = useStudentMonthlyFee ? (student.monthlyFee || 4500) : Number(batchUniformTuition);
        const baseTransport = includeStudentTransport ? (student.transportFee || 0) : 0;

        targetMonthsList.forEach((mObj, idx) => {
          const isFirstMonth = idx === 0;
          const adm = isFirstMonth ? Number(admissionFee || 0) : 0;
          const exm = isFirstMonth ? Number(examFee || 0) : 0;
          const misc = isFirstMonth ? Number(miscCharges || 0) : 0;
          const disc = isFirstMonth ? Number(discountAmount || 0) : 0;
          const sub = baseTuition + baseTransport + adm + exm + misc;
          const net = Math.max(0, sub - disc);

          slipsToCreate.push({
            studentId: student.id,
            studentName: student.name,
            fatherName: student.fatherName,
            rollNo: student.rollNo,
            campus: student.campus,
            classGrade: student.classGrade,
            section: student.section || 'A',
            phone: student.phone || '',
            month: mObj.label,
            billingDurationMonths: 1,
            issueDate,
            dueDate,
            tuitionFee: baseTuition,
            transportFee: baseTransport,
            admissionFee: adm,
            examFee: exm,
            miscCharges: misc,
            miscDescription: isFirstMonth ? miscDescription : '',
            subtotal: sub,
            discount: disc,
            discountReason: isFirstMonth ? discountReason : '',
            totalAmount: net,
            status: 'Unpaid',
            amountPaid: 0
          });
        });
      });
    }

    const createdSlips = generateBatchFeeSlips(slipsToCreate);
    showToast(`✓ Generated ${createdSlips.length} fee vouchers across ${studentsToGenerate.length} students!`, 'success');

    if (shouldPrint) {
      setSlipsToDirectPrint(createdSlips);
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      onClose();
    }
  };

  // 3. Submit Sibling / Family Fee Challans
  const handleSiblingSubmit = (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (siblingList.length === 0) {
      alert('Please select at least 1 sibling in the family group.');
      return;
    }

    const issueDate = new Date().toISOString().split('T')[0];
    let slipsToCreate = [];

    if (billingOutputFormat === 'combined' || monthsMultiplier === 1) {
      slipsToCreate = siblingList.map(item => {
        const baseTuition = Number(item.customTuition);
        const baseTransport = Number(item.transportFee || 0);
        const tuitionTotal = baseTuition * monthsMultiplier;
        const transportTotal = baseTransport * monthsMultiplier;
        const discountVal = Math.round((tuitionTotal * (item.discountPercent || 0)) / 100);
        const subtotal = tuitionTotal + transportTotal + Number(item.admissionFee || 0) + Number(item.examFee || 0) + Number(item.miscCharges || 0);
        const total = Math.max(0, subtotal - discountVal);

        return {
          studentId: item.student.id,
          studentName: item.student.name,
          fatherName: item.student.fatherName,
          rollNo: item.student.rollNo,
          campus: item.student.campus,
          classGrade: item.student.classGrade,
          section: item.student.section || 'A',
          phone: item.student.phone || '',
          month: periodLabel,
          billingMonths: targetMonthsList.map(m => m.label),
          billingDurationMonths: monthsMultiplier,
          issueDate,
          dueDate,
          tuitionFee: tuitionTotal,
          transportFee: transportTotal,
          admissionFee: Number(item.admissionFee || 0),
          examFee: Number(item.examFee || 0),
          miscCharges: Number(item.miscCharges || 0),
          miscDescription: '',
          subtotal,
          discount: discountVal,
          discountPercent: item.discountPercent,
          discountReason: item.discountPercent > 0 ? `Sibling Concession (Child #${item.order} - ${item.discountPercent}%)` : 'None',
          totalAmount: total,
          isSiblingChallan: true,
          siblingOrder: item.order,
          siblingTotalInFamily: siblingList.length,
          status: 'Unpaid',
          amountPaid: 0
        };
      });
    } else {
      siblingList.forEach(item => {
        const baseTuition = Number(item.customTuition);
        const baseTransport = Number(item.transportFee || 0);
        const discountVal = Math.round((baseTuition * (item.discountPercent || 0)) / 100);

        targetMonthsList.forEach((mObj, idx) => {
          const isFirst = idx === 0;
          const adm = isFirst ? Number(item.admissionFee || 0) : 0;
          const exm = isFirst ? Number(item.examFee || 0) : 0;
          const misc = isFirst ? Number(item.miscCharges || 0) : 0;
          const sub = baseTuition + baseTransport + adm + exm + misc;
          const total = Math.max(0, sub - discountVal);

          slipsToCreate.push({
            studentId: item.student.id,
            studentName: item.student.name,
            fatherName: item.student.fatherName,
            rollNo: item.student.rollNo,
            campus: item.student.campus,
            classGrade: item.student.classGrade,
            section: item.student.section || 'A',
            phone: item.student.phone || '',
            month: mObj.label,
            billingDurationMonths: 1,
            issueDate,
            dueDate,
            tuitionFee: baseTuition,
            transportFee: baseTransport,
            admissionFee: adm,
            examFee: exm,
            miscCharges: misc,
            miscDescription: '',
            subtotal: sub,
            discount: discountVal,
            discountPercent: item.discountPercent,
            discountReason: item.discountPercent > 0 ? `Sibling Concession (Child #${item.order} - ${item.discountPercent}%)` : 'None',
            totalAmount: total,
            isSiblingChallan: true,
            siblingOrder: item.order,
            siblingTotalInFamily: siblingList.length,
            status: 'Unpaid',
            amountPaid: 0
          });
        });
      });
    }

    const createdSlips = generateBatchFeeSlips(slipsToCreate);
    showToast(`✓ Generated ${createdSlips.length} sibling vouchers!`, 'success');

    if (shouldPrint) {
      setSlipsToDirectPrint(createdSlips);
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Direct print view (2-copy School + Student)
  if (slipsToDirectPrint && slipsToDirectPrint.length > 0) {
    return (
      <div className="modal-overlay" onClick={() => { setSlipsToDirectPrint(null); onClose(); }}>
        <div className="modal-content wide" style={{ maxWidth: '1050px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header no-print" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
            <div>
              <h3 className="modal-title" style={{ color: '#fff' }}>
                🖨️ Ready to Print {slipsToDirectPrint.length} Fee Challan Voucher{slipsToDirectPrint.length > 1 ? 's' : ''}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                2-Part Format (School Copy & Student Copy) — Bank Copy Removed
              </p>
            </div>
            <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => { setSlipsToDirectPrint(null); onClose(); }}>✕</button>
          </div>

          <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
            {slipsToDirectPrint.map((slip, slipIdx) => {
              const subtotal = slip.subtotal || (
                (slip.tuitionFee || 0) + 
                (slip.transportFee || 0) + 
                (slip.admissionFee || 0) + 
                (slip.examFee || 0) + 
                (slip.miscCharges || 0)
              );
              const discount = slip.discount || 0;
              const netPayable = slip.totalAmount || (subtotal - discount);

              return (
                <div key={slip.id || slipIdx} className="printable-challan-sheet">
                  <div className="challan-two-parts">
                    {['School Copy', 'Student / Parent Copy'].map((copyName, idx) => (
                      <div key={idx} className="challan-copy">
                        <div className="challan-header">
                          <SchoolLogo size={36} />
                          <div>
                            <h3 className="challan-school-name">SHEZAD CHILDREN ACADEMY</h3>
                            <p className="challan-school-sub">Affiliated with Secondary Education Board · System Generated</p>
                          </div>
                          <span className="challan-copy-tag">{copyName}</span>
                        </div>

                        <div className="challan-meta-grid">
                          <div>Challan #: <strong>{slip.challanNo}</strong></div>
                          <div>Month / Period: <strong>{slip.month}</strong></div>
                          <div>Issue Date: <strong>{slip.issueDate}</strong></div>
                          <div>Due Date: <strong>{slip.dueDate}</strong></div>
                        </div>

                        <div className="challan-student-info">
                          <div>Student Name: <strong>{slip.studentName}</strong></div>
                          <div>Father Name: <strong>{slip.fatherName || '—'}</strong></div>
                          <div>Roll Number: <strong>{slip.rollNo}</strong></div>
                          <div>Class & Section: <strong>{slip.classGrade} ({slip.section || 'A'})</strong></div>
                          <div>Campus: <strong>{slip.campus}</strong></div>
                          <div>Contact Phone: <strong>{slip.phone || '—'}</strong></div>
                        </div>

                        <table className="challan-items-table">
                          <thead>
                            <tr>
                              <th>Fee Particulars</th>
                              <th style={{ textAlign: 'right' }}>Amount (Rs)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                Monthly Tuition Fee
                                {slip.billingDurationMonths > 1 && (
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                                    ({slip.billingDurationMonths} Months Period)
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>{(slip.tuitionFee || 0).toLocaleString()}</td>
                            </tr>
                            {slip.transportFee > 0 && (
                              <tr>
                                <td>
                                  Transport Charges
                                  {slip.billingDurationMonths > 1 && (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                                      ({slip.billingDurationMonths} Months Period)
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>{(slip.transportFee).toLocaleString()}</td>
                              </tr>
                            )}
                            {slip.admissionFee > 0 && (
                              <tr>
                                <td>Admission & Registration Fee</td>
                                <td style={{ textAlign: 'right' }}>{(slip.admissionFee).toLocaleString()}</td>
                              </tr>
                            )}
                            {slip.examFee > 0 && (
                              <tr>
                                <td>Examination & Assessment Fee</td>
                                <td style={{ textAlign: 'right' }}>{(slip.examFee).toLocaleString()}</td>
                              </tr>
                            )}
                            {slip.miscCharges > 0 && (
                              <tr>
                                <td>Misc Charges {slip.miscDescription ? `(${slip.miscDescription})` : ''}</td>
                                <td style={{ textAlign: 'right' }}>{(slip.miscCharges).toLocaleString()}</td>
                              </tr>
                            )}
                            <tr className="challan-row-subtotal">
                              <td><strong>Subtotal Amount</strong></td>
                              <td style={{ textAlign: 'right' }}><strong>{subtotal.toLocaleString()}</strong></td>
                            </tr>
                            {discount > 0 && (
                              <tr className="challan-row-discount">
                                <td>Discount / Concession {slip.discountReason ? `(${slip.discountReason})` : ''}</td>
                                <td style={{ textAlign: 'right' }}>- {discount.toLocaleString()}</td>
                              </tr>
                            )}
                            <tr className="challan-row-total">
                              <td><strong>NET PAYABLE WITHIN DUE DATE</strong></td>
                              <td style={{ textAlign: 'right' }}><strong>Rs {netPayable.toLocaleString()}</strong></td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                          <p style={{ margin: 0 }}>* Payable at School Accounts Office / Authorized Bank Counter.</p>
                          <p style={{ margin: 0 }}>* Late fee fine of Rs. 200 applicable after due date.</p>
                        </div>

                        <div className="challan-stamp-box">
                          <div>Accountant Signature</div>
                          <div>School Stamp / Date</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="action-btn-secondary" onClick={() => { setSlipsToDirectPrint(null); onClose(); }}>
              Close
            </button>
            <button 
              className="action-btn-primary" 
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span><strong>Print {slipsToDirectPrint.length} Fee Challan Voucher{slipsToDirectPrint.length > 1 ? 's' : ''}</strong></span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content wide" style={{ maxWidth: '980px', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ background: '#0f1d38', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#fff', margin: 0, fontSize: '1.25rem' }}>
              📄 Generate Fee Challan Vouchers
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Issue Monthly, 3-Month (Quarterly), 5-Month (Term), 6-Month, or Full Session (12-Month) challans
            </p>
          </div>
          <button className="modal-close-btn" style={{ color: '#fff', fontSize: '1.2rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`nav-item ${mode === 'single' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '7px 16px', borderRadius: '6px', fontSize: '0.86rem' }}
            onClick={() => setMode('single')}
          >
            👤 Individual Student
          </button>
          <button
            type="button"
            className={`nav-item ${mode === 'batch' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '7px 16px', borderRadius: '6px', fontSize: '0.86rem' }}
            onClick={() => setMode('batch')}
          >
            🏫 Entire Class (Batch)
          </button>
          <button
            type="button"
            className={`nav-item ${mode === 'sibling' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '7px 16px', borderRadius: '6px', fontSize: '0.86rem', background: mode === 'sibling' ? '#ecfdf5' : 'transparent', color: mode === 'sibling' ? '#065f46' : 'inherit' }}
            onClick={() => setMode('sibling')}
          >
            👨‍👩‍👧‍👦 Sibling Discount Package
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', maxHeight: '74vh', overflowY: 'auto' }}>
          
          {/* SECTION 1: BILLING PERIOD & DURATION SELECTOR */}
          <div style={{ background: '#f0fdf4', padding: '16px 18px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: '800', color: '#065f46', fontSize: '0.94rem' }}>
                🗓️ Select Billing Period Duration (Full Session / 3 / 5 / 12 Months)
              </span>
              <span style={{ fontSize: '0.78rem', color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
                {periodLabel}
              </span>
            </div>

            {/* Duration Preset Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
              {[
                { id: '1', label: '1 Month', sub: 'Monthly' },
                { id: '3', label: '3 Months', sub: 'Quarterly' },
                { id: '5', label: '5 Months', sub: '1st/2nd Term' },
                { id: '6', label: '6 Months', sub: 'Half Year' },
                { id: '12', label: '12 Months', sub: 'Full Session' },
                { id: 'custom', label: 'Custom', sub: 'Custom Months' }
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBillingDuration(preset.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: billingDuration === preset.id ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: billingDuration === preset.id ? '#ffffff' : '#f8fafc',
                    color: billingDuration === preset.id ? '#065f46' : '#475569',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: billingDuration === preset.id ? '0 2px 6px rgba(5,150,105,0.15)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{preset.label}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{preset.sub}</div>
                </button>
              ))}
            </div>

            {/* Row with Start Month, Academic Year, Custom count, and Output Format */}
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#065f46' }}>Session Start Month *</label>
                <select
                  className="form-select"
                  value={selectedAcademicMonth}
                  onChange={(e) => setSelectedAcademicMonth(e.target.value)}
                  style={{ fontWeight: '700' }}
                >
                  {ACADEMIC_MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#065f46' }}>Academic Year *</label>
                <select
                  className="form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{ fontWeight: '700' }}
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>

              {billingDuration === 'custom' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: '#065f46' }}>Number of Months *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="12"
                    value={customMonthsCount}
                    onChange={(e) => setCustomMonthsCount(Math.min(12, Math.max(1, Number(e.target.value))))}
                    style={{ fontWeight: '700' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#065f46' }}>Voucher Output Format</label>
                <select
                  className="form-select"
                  value={billingOutputFormat}
                  onChange={(e) => setBillingOutputFormat(e.target.value)}
                  style={{ fontWeight: '700', color: '#0369a1' }}
                >
                  <option value="combined">📦 Single Combined Slip ({monthsMultiplier} Months Total)</option>
                  <option value="split">📑 Separate Monthly Slips ({monthsMultiplier} Individual Slips)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>Payment Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Target Months Tags Preview */}
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #86efac', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.76rem' }}>
              <span style={{ color: '#065f46', fontWeight: '700' }}>Target Months:</span>
              {targetMonthsList.map((m, idx) => (
                <span key={idx} style={{ background: '#ffffff', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '4px', color: '#0f1d38', fontWeight: '600' }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* MODE 1: SINGLE STUDENT */}
          {mode === 'single' && (
            <div>
              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: '800' }}>Select Student *</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      className="form-select"
                      value={singleCampusFilter}
                      onChange={(e) => setSingleCampusFilter(e.target.value)}
                      style={{ width: '160px' }}
                    >
                      <option value="ALL">All Campuses</option>
                      {campuses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                    </select>
                    <select
                      className="form-select"
                      value={singleClassFilter}
                      onChange={(e) => setSingleClassFilter(e.target.value)}
                      style={{ width: '160px' }}
                    >
                      {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Filter by name / roll #..."
                      value={singleStudentSearch}
                      onChange={(e) => setSingleStudentSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    value={selectedSingleStudentId}
                    onChange={(e) => handleSelectStudentChange(e.target.value)}
                    style={{ fontWeight: '700', color: '#0f1d38' }}
                  >
                    {eligibleSingleStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rollNo}) — Class {s.classGrade} ({s.section}) · Monthly: Rs {s.monthlyFee} {s.transportFee ? `· Transport: Rs ${s.transportFee}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee Breakdown Fields for Single Student */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0f1d38', fontWeight: '800' }}>
                  💰 Fee Particulars & Breakdown ({monthsMultiplier} Months Duration)
                </h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Monthly Tuition Fee (Rs) {billingOutputFormat === 'combined' && monthsMultiplier > 1 ? `(x ${monthsMultiplier} Mo = Rs ${singleTuitionTotal.toLocaleString()})` : ''}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={singleTuitionFee}
                      onChange={(e) => setSingleTuitionFee(Number(e.target.value))}
                      required
                      style={{ fontWeight: '700', color: '#0f1d38' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Monthly Transport Fee (Rs) {billingOutputFormat === 'combined' && monthsMultiplier > 1 && transportFee > 0 ? `(x ${monthsMultiplier} Mo = Rs ${singleTransportTotal.toLocaleString()})` : ''}
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportFee}
                      onChange={(e) => setTransportFee(Number(e.target.value))}
                      placeholder="0 if not using transport"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Admission Fee (One-Time Rs)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={admissionFee}
                      onChange={(e) => setAdmissionFee(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Examination Fee (Rs)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={examFee}
                      onChange={(e) => setExamFee(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Misc Charges (Uniform / Books Rs)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={miscCharges}
                      onChange={(e) => setMiscCharges(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Misc Charges Description</label>
                    <input
                      type="text"
                      className="form-input"
                      value={miscDescription}
                      onChange={(e) => setMiscDescription(e.target.value)}
                      placeholder="e.g. Annual Paper Fund, Sports"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Discount / Sibling Concession (Rs)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      placeholder="0"
                      style={{ color: '#059669', fontWeight: '700' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Discount Reason / Remarks</label>
                    <input
                      type="text"
                      className="form-input"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. Session Advance Payment 10% Concession"
                    />
                  </div>
                </div>

                {/* Live Single Calculation Box */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', textAlign: 'center', fontSize: '0.8rem' }}>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>DURATION</span>
                    <strong style={{ color: '#0369a1' }}>{monthsMultiplier} Month{monthsMultiplier > 1 ? 's' : ''}</strong>
                  </div>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>PERIOD TUITION</span>
                    <strong style={{ color: '#0f1d38' }}>Rs {singleTuitionTotal.toLocaleString()}</strong>
                  </div>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>PERIOD TRANSPORT</span>
                    <strong style={{ color: '#0284c7' }}>Rs {singleTransportTotal.toLocaleString()}</strong>
                  </div>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#059669', display: 'block', fontSize: '0.7rem' }}>TOTAL DISCOUNT</span>
                    <strong style={{ color: '#059669' }}>- Rs {Number(discountAmount || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <span style={{ color: '#065f46', display: 'block', fontSize: '0.7rem', fontWeight: '700' }}>NET PAYABLE</span>
                    <strong style={{ color: '#065f46', fontSize: '1rem' }}>Rs {singleNetPayable.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Single Mode */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
                <button 
                  type="button" 
                  className="action-btn-secondary"
                  onClick={(e) => handleSingleSubmit(e, true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🖨️ Generate & Print</span>
                </button>
                <button 
                  type="button" 
                  className="action-btn-primary"
                  onClick={(e) => handleSingleSubmit(e, false)}
                >
                  ✓ Generate {billingOutputFormat === 'split' && monthsMultiplier > 1 ? `${monthsMultiplier} Monthly Challans` : 'Challan'}
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: BATCH / CLASS MODE */}
          {mode === 'batch' && (
            <div>
              <div className="form-grid" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Select Campus</label>
                  <select
                    className="form-select"
                    value={batchCampus}
                    onChange={(e) => setBatchCampus(e.target.value)}
                  >
                    <option value="ALL">All Campuses</option>
                    {campuses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Select Target Class *</label>
                  <select
                    className="form-select"
                    value={batchClass}
                    onChange={(e) => setBatchClass(e.target.value)}
                    style={{ fontWeight: '700', color: '#0f1d38' }}
                  >
                    {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
              </div>

              {/* Batch Fee Configuration */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0f1d38', fontWeight: '800' }}>
                  ⚙️ Class Batch Fee Rates ({monthsMultiplier} Months Duration)
                </h4>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="checkbox"
                        checked={useStudentMonthlyFee}
                        onChange={(e) => setUseStudentMonthlyFee(e.target.checked)}
                      />
                      <span>Use Each Student's Enrolled Monthly Tuition Fee</span>
                    </label>
                    {!useStudentMonthlyFee && (
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Uniform tuition fee for class"
                        value={batchUniformTuition}
                        onChange={(e) => setBatchUniformTuition(Number(e.target.value))}
                        style={{ marginTop: '6px', fontWeight: '700' }}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="checkbox"
                        checked={includeStudentTransport}
                        onChange={(e) => setIncludeStudentTransport(e.target.checked)}
                      />
                      <span>Auto-include Assigned Transport Fee for Transport Students</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Examination Fee (Rs per student)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={examFee}
                      onChange={(e) => setExamFee(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Misc Charges (Uniform / Activity Rs)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={miscCharges}
                      onChange={(e) => setMiscCharges(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Student Selection Table */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                    Eligible Students in Class {batchClass}: <strong>{eligibleBatchStudents.length}</strong> (Selected: {selectedStudentIds.length})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="action-btn-secondary"
                      onClick={() => setSelectedStudentIds(eligibleBatchStudents.map(s => s.id))}
                      style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="action-btn-secondary"
                      onClick={() => setSelectedStudentIds([])}
                      style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>✓</th>
                        <th>Roll #</th>
                        <th>Name</th>
                        <th>Monthly Fee</th>
                        <th>Transport</th>
                        <th>Campus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleBatchStudents.map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        return (
                          <tr key={student.id} style={{ background: isSelected ? '#f0fdf4' : 'transparent' }}>
                            <td>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                                  else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                }}
                              />
                            </td>
                            <td style={{ fontWeight: '700' }}>{student.rollNo}</td>
                            <td style={{ fontWeight: '600' }}>{student.name}</td>
                            <td>Rs {student.monthlyFee?.toLocaleString() || '4,500'}</td>
                            <td>{student.transportFee > 0 ? `Rs ${student.transportFee}` : '—'}</td>
                            <td>{student.campus}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons for Batch Mode */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
                <button 
                  type="button" 
                  className="action-btn-secondary"
                  onClick={(e) => handleBatchSubmit(e, true)}
                >
                  🖨️ Batch Generate & Print
                </button>
                <button 
                  type="button" 
                  className="action-btn-primary"
                  onClick={(e) => handleBatchSubmit(e, false)}
                >
                  ✓ Generate Class Challans ({selectedStudentIds.length * (billingOutputFormat === 'split' ? monthsMultiplier : 1)} Slips)
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: SIBLING / FAMILY DISCOUNT PACKAGE */}
          {mode === 'sibling' && (
            <div>
              <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '800', color: '#065f46' }}>
                  👨‍👩‍👧‍👦 Select Family / Sibling Group (Grouped by Father Name)
                </label>
                <select
                  className="form-select"
                  value={selectedFatherKey}
                  onChange={(e) => setSelectedFatherKey(e.target.value)}
                  style={{ fontWeight: '700', color: '#0f1d38' }}
                >
                  {multiChildFamilies.map((f, i) => (
                    <option key={i} value={f.fatherName}>
                      Father: {f.fatherName} ({f.students.length} Children Enrolled) — {f.students.map(s => s.name).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Siblings Breakdown Table */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#0f1d38', fontWeight: '800' }}>
                  Family Siblings & Sibling Concession Breakdown ({monthsMultiplier} Months Period)
                </h4>
                <div className="table-responsive">
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Child #</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Monthly Tuition</th>
                        <th>Transport</th>
                        <th>Sibling Discount %</th>
                        <th>Period Net Total</th>
                        <th>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siblingList.map((item) => {
                        const tTot = Number(item.customTuition) * (billingOutputFormat === 'combined' ? monthsMultiplier : 1);
                        const trTot = Number(item.transportFee || 0) * (billingOutputFormat === 'combined' ? monthsMultiplier : 1);
                        const disc = Math.round((tTot * (item.discountPercent || 0)) / 100);
                        const net = Math.max(0, tTot + trTot - disc);

                        return (
                          <tr key={item.id}>
                            <td>
                              <span style={{ fontWeight: '800', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px' }}>
                                Child #{item.order}
                              </span>
                            </td>
                            <td style={{ fontWeight: '700' }}>{item.student.name} ({item.student.rollNo})</td>
                            <td>{item.student.classGrade}</td>
                            <td>Rs {item.customTuition?.toLocaleString()}</td>
                            <td>{item.transportFee > 0 ? `Rs ${item.transportFee}` : 'None'}</td>
                            <td>
                              <input 
                                type="number"
                                className="form-input"
                                value={item.discountPercent}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSiblingList(prev => prev.map(s => s.id === item.id ? { ...s, discountPercent: val } : s));
                                }}
                                style={{ width: '70px', fontWeight: '700', color: '#059669' }}
                              />
                            </td>
                            <td style={{ fontWeight: '800', color: '#065f46' }}>Rs {net.toLocaleString()}</td>
                            <td>
                              <button 
                                type="button" 
                                className="action-btn-secondary"
                                onClick={() => setSiblingList(prev => prev.filter(s => s.id !== item.id))}
                                style={{ padding: '2px 6px', fontSize: '0.7rem', color: '#dc2626' }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons for Sibling Mode */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
                <button 
                  type="button" 
                  className="action-btn-secondary"
                  onClick={(e) => handleSiblingSubmit(e, true)}
                >
                  🖨️ Generate & Print Family Slips
                </button>
                <button 
                  type="button" 
                  className="action-btn-primary"
                  onClick={(e) => handleSiblingSubmit(e, false)}
                >
                  ✓ Generate Family Challans ({siblingList.length * (billingOutputFormat === 'split' ? monthsMultiplier : 1)} Slips)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
