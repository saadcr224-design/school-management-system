import React, { useState } from 'react';
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

export default function ReportsView() {
  const { students, feeSlips, staff, campuses, ledger } = useApp();
  
  // Active Report Tab: 'monthly', 'student', 'outstanding', 'collection', 'discount', 'transport', 'misc', 'admission'
  const [activeReportTab, setActiveReportTab] = useState('monthly');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');

  // Base filtered fee slips
  const filteredFeeSlips = feeSlips.filter(slip => {
    const matchesMonth = selectedMonth === 'ALL' || (slip.month && slip.month.includes(selectedMonth));
    const matchesClass = selectedClass === 'All Classes' || slip.classGrade === selectedClass;
    const matchesCampus = selectedCampus === 'ALL' || slip.campus === selectedCampus;
    const matchesStatus = selectedStatus === 'ALL' || slip.status === selectedStatus;
    const matchesStudent = selectedStudentId === 'ALL' || slip.studentId === selectedStudentId;
    return matchesMonth && matchesClass && matchesCampus && matchesStatus && matchesStudent;
  });

  // 1. Monthly April–March Summary Calculation
  const monthlySummaries = ACADEMIC_MONTHS.map(monthName => {
    const slipsInMonth = feeSlips.filter(s => {
      const matchMonth = s.month && s.month.includes(monthName);
      const matchCampus = selectedCampus === 'ALL' || s.campus === selectedCampus;
      const matchClass = selectedClass === 'All Classes' || s.classGrade === selectedClass;
      return matchMonth && matchCampus && matchClass;
    });

    const billed = slipsInMonth.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const collected = slipsInMonth.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const discounts = slipsInMonth.reduce((acc, s) => acc + (s.discount || 0), 0);
    const transport = slipsInMonth.reduce((acc, s) => acc + (s.transportFee || 0), 0);
    const misc = slipsInMonth.reduce((acc, s) => acc + (s.miscCharges || 0), 0);
    const outstanding = Math.max(0, billed - collected);
    const recoveryRate = billed > 0 ? Math.round((collected / billed) * 100) : 100;

    return {
      month: monthName,
      fullTag: getAcademicMonthYear(monthName),
      vouchersCount: slipsInMonth.length,
      billed,
      collected,
      discounts,
      transport,
      misc,
      outstanding,
      recoveryRate
    };
  });

  // 2. Selected Student Ledger Data
  const targetStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const studentLedgerSlips = feeSlips.filter(s => s.studentId === targetStudent?.id || s.rollNo === targetStudent?.rollNo);

  // 3. Outstanding Defaulters
  const outstandingSlips = filteredFeeSlips.filter(s => s.status !== 'Paid' || (s.totalAmount - (s.amountPaid || 0) > 0));

  // 4. Transport fee slips
  const transportSlips = filteredFeeSlips.filter(s => s.transportFee > 0);

  // 5. Misc charges slips
  const miscSlips = filteredFeeSlips.filter(s => s.miscCharges > 0);

  // 6. Discount slips
  const discountSlips = filteredFeeSlips.filter(s => s.discount > 0);

  // 7. Admission fee slips
  const admissionSlips = filteredFeeSlips.filter(s => s.admissionFee > 0);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = `data:text/csv;charset=utf-8,Challan #,Student Name,Roll No,Class,Campus,Month,Tuition,Transport,Admission,Exam,Misc,Discount,Net Payable,Paid,Remaining,Status\n`;
    filteredFeeSlips.forEach(s => {
      const remaining = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
      csvContent += `"${s.challanNo}","${s.studentName}","${s.rollNo}","${s.classGrade}","${s.campus}","${s.month}","${s.tuitionFee || 0}","${s.transportFee || 0}","${s.admissionFee || 0}","${s.examFee || 0}","${s.miscCharges || 0}","${s.discount || 0}","${s.totalAmount || 0}","${s.amountPaid || 0}","${remaining}","${s.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Report_${activeReportTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content-body">
      {/* Official Printable Header */}
      <div className="official-print-report-header" style={{ display: 'none', borderBottom: '2.5px solid #0f1d38', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <SchoolLogo size={48} showText={true} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: '800', color: '#0f1d38', fontSize: '1.1rem' }}>
              OFFICIAL FINANCIAL AUDIT REPORT
            </div>
            <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '700' }}>
              Session 2026–2027 (April 2026 → March 2027)
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Report Type: {activeReportTab.toUpperCase()} · Generated on: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>
      </div>

      <div className="page-title-section no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Executive Financial Reports & Audit</h1>
          <p className="page-subtitle">April to March academic cycle audit, student ledgers, transport, and defaulter tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="action-btn-secondary"
            onClick={handleExportCSV}
            style={{ fontSize: '0.85rem' }}
          >
            📥 Export CSV
          </button>
          <button 
            className="action-btn-primary"
            onClick={() => window.print()}
            style={{ padding: '9px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 8 Report Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #cbd5e1', marginBottom: '18px', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button 
          className={`nav-item ${activeReportTab === 'monthly' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('monthly')}
        >
          1. Monthly Report (Apr–Mar)
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'student' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('student')}
        >
          2. Student Ledger Report
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'outstanding' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', color: activeReportTab === 'outstanding' ? '#991b1b' : 'inherit' }}
          onClick={() => setActiveReportTab('outstanding')}
        >
          3. Outstanding / Defaulters
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'collection' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('collection')}
        >
          4. Collection Report
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'discount' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('discount')}
        >
          5. Discounts Report
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'transport' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('transport')}
        >
          6. Transport Fee Report
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'misc' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('misc')}
        >
          7. Misc Charges Report
        </button>
        <button 
          className={`nav-item ${activeReportTab === 'admission' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem' }}
          onClick={() => setActiveReportTab('admission')}
        >
          8. Admission Fee Report
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="section-card no-print" style={{ padding: '12px 16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Month Filter */}
          <div style={{ width: '170px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>Month</label>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Months (Apr–Mar)</option>
              {ACADEMIC_MONTHS.map(m => (
                <option key={m} value={m}>{getAcademicMonthYear(m)}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div style={{ width: '140px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>Class</label>
            <select
              className="form-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>

          {/* Campus Filter */}
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '2px' }}>Campus</label>
            <select
              className="form-select"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="ALL">All Campuses</option>
              {campuses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
            </select>
          </div>

          {/* Student Filter (for Student Report) */}
          {activeReportTab === 'student' && (
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0284c7', display: 'block', marginBottom: '2px' }}>Select Student</label>
              <select
                className="form-select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '6px 10px', fontWeight: '700' }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.rollNo}) - Class {s.classGrade}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* REPORT 1: MONTHLY FEE REPORT (APRIL TO MARCH) */}
      {activeReportTab === 'monthly' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">📅 Academic Year Monthly Audit Summary (April 2026 → March 2027)</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Complete 12-month billing, collections, transport, and recovery rate</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Academic Month</th>
                  <th>Challans</th>
                  <th>Total Billed</th>
                  <th>Transport Fees</th>
                  <th>Misc Charges</th>
                  <th>Discounts</th>
                  <th>Net Collected</th>
                  <th>Outstanding</th>
                  <th>Recovery Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.map(row => (
                  <tr key={row.month}>
                    <td style={{ fontWeight: '700', color: '#0f1d38' }}>{row.fullTag}</td>
                    <td>{row.vouchersCount}</td>
                    <td style={{ fontWeight: '600' }}>Rs {row.billed.toLocaleString()}</td>
                    <td>Rs {row.transport.toLocaleString()}</td>
                    <td>Rs {row.misc.toLocaleString()}</td>
                    <td style={{ color: row.discounts > 0 ? '#059669' : '#64748b' }}>
                      {row.discounts > 0 ? `-Rs ${row.discounts.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ color: '#059669', fontWeight: '700' }}>Rs {row.collected.toLocaleString()}</td>
                    <td style={{ color: row.outstanding > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                      Rs {row.outstanding.toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: row.recoveryRate >= 80 ? '#059669' : '#d97706' }}>
                        {row.recoveryRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: STUDENT OVERALL FEE REPORT */}
      {activeReportTab === 'student' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="chart-title">👤 Student Financial Profile & Ledger</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {targetStudent ? `${targetStudent.name} (${targetStudent.rollNo}) · Class ${targetStudent.classGrade} · Phone: ${targetStudent.phone}` : 'Select a student'}
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Month</th>
                  <th>Class</th>
                  <th>Tuition</th>
                  <th>Transport</th>
                  <th>Admission</th>
                  <th>Exam/Misc</th>
                  <th>Discount</th>
                  <th>Net Payable</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studentLedgerSlips.map(s => {
                  const remaining = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '700' }}>{s.challanNo}</td>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{s.month}</td>
                      <td>{s.classGrade}</td>
                      <td>Rs {Number(s.tuitionFee || 0).toLocaleString()}</td>
                      <td>Rs {Number(s.transportFee || 0).toLocaleString()}</td>
                      <td>Rs {Number(s.admissionFee || 0).toLocaleString()}</td>
                      <td>Rs {(Number(s.examFee || 0) + Number(s.miscCharges || 0)).toLocaleString()}</td>
                      <td style={{ color: s.discount > 0 ? '#059669' : '#64748b' }}>{s.discount > 0 ? `-Rs ${s.discount}` : '—'}</td>
                      <td style={{ fontWeight: '700' }}>Rs {s.totalAmount?.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: '700' }}>Rs {s.amountPaid?.toLocaleString()}</td>
                      <td style={{ color: remaining > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>Rs {remaining.toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${s.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>{s.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: OUTSTANDING / DEFAULTERS REPORT */}
      {activeReportTab === 'outstanding' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title" style={{ color: '#991b1b' }}>⚠️ Outstanding Arrears & Defaulters Audit ({outstandingSlips.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Students with unpaid or partial fee balances along with parent contact numbers</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Father Name</th>
                  <th>Campus</th>
                  <th>Class</th>
                  <th>Billing Month</th>
                  <th>Total Due</th>
                  <th>Paid Amount</th>
                  <th>Outstanding Balance</th>
                  <th>Parent Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {outstandingSlips.map(s => {
                  const remaining = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
                  const student = students.find(std => std.id === s.studentId || std.rollNo === s.rollNo);
                  const phone = s.phone || (student ? student.phone : '—');

                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '700' }}>{s.rollNo}</td>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{s.studentName}</td>
                      <td>{s.fatherName || (student ? student.fatherName : '—')}</td>
                      <td><span className="status-badge badge-active">{s.campus}</span></td>
                      <td><strong>{s.classGrade}</strong></td>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{s.month}</td>
                      <td>Rs {s.totalAmount?.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: '600' }}>Rs {s.amountPaid?.toLocaleString()}</td>
                      <td style={{ color: '#991b1b', fontWeight: '800' }}>Rs {remaining.toLocaleString()}</td>
                      <td style={{ fontWeight: '600', color: '#0284c7' }}>{phone}</td>
                      <td><span className="status-badge badge-unpaid">{s.status}</span></td>
                    </tr>
                  );
                })}
                {outstandingSlips.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: '#059669', fontWeight: '700' }}>
                      ✓ All fee vouchers settled! Zero defaulters found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: COLLECTION REPORT */}
      {activeReportTab === 'collection' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">💵 Fee Collection Journal & Payment Methods</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Records of all payments received across campuses</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Month</th>
                  <th>Paid Date</th>
                  <th>Payment Mode</th>
                  <th>Amount Collected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeSlips.filter(s => (s.amountPaid || 0) > 0).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.challanNo}</td>
                    <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                    <td>{s.rollNo}</td>
                    <td>{s.classGrade}</td>
                    <td style={{ fontWeight: '600', color: '#0369a1' }}>{s.month}</td>
                    <td>{s.paidDate || s.issueDate}</td>
                    <td><span className="status-badge badge-active">{s.paymentMethod || 'Cash at Counter'}</span></td>
                    <td style={{ color: '#059669', fontWeight: '800' }}>Rs {s.amountPaid?.toLocaleString()}</td>
                    <td><span className="status-badge badge-paid">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 5: DISCOUNT REPORT */}
      {activeReportTab === 'discount' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">🎁 Sibling Concessions & Fee Discounts Audit</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Breakdown of fee concessions granted to students</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Month</th>
                  <th>Gross Tuition</th>
                  <th>Discount Amount</th>
                  <th>Discount Reason</th>
                  <th>Net Billed</th>
                </tr>
              </thead>
              <tbody>
                {discountSlips.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.challanNo}</td>
                    <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                    <td>{s.rollNo}</td>
                    <td>{s.classGrade}</td>
                    <td style={{ fontWeight: '600', color: '#0369a1' }}>{s.month}</td>
                    <td>Rs {((s.tuitionFee || s.totalAmount) + (s.discount || 0)).toLocaleString()}</td>
                    <td style={{ color: '#059669', fontWeight: '800' }}>-Rs {s.discount?.toLocaleString()}</td>
                    <td>{s.discountReason || (s.discountPercent ? `Sibling Concession (${s.discountPercent}%)` : 'Special Concession')}</td>
                    <td style={{ fontWeight: '700' }}>Rs {s.totalAmount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 6: TRANSPORT FEE REPORT */}
      {activeReportTab === 'transport' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">🚌 School Transport Fee Recovery & Collections</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Transport fees billed and collected per student route</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Campus</th>
                  <th>Month</th>
                  <th>Monthly Transport Fee</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {transportSlips.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.rollNo}</td>
                    <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                    <td>{s.classGrade}</td>
                    <td><span className="status-badge badge-active">{s.campus}</span></td>
                    <td style={{ fontWeight: '600', color: '#0369a1' }}>{s.month}</td>
                    <td style={{ fontWeight: '800', color: '#0369a1' }}>Rs {s.transportFee?.toLocaleString()}</td>
                    <td><span className={`status-badge ${s.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 7: MISCELLANEOUS CHARGES REPORT */}
      {activeReportTab === 'misc' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">📦 Miscellaneous Charges Collection</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Uniforms, books, badges, activities, and special charges</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Month</th>
                  <th>Charge Description</th>
                  <th>Misc Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {miscSlips.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.challanNo}</td>
                    <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                    <td>{s.rollNo}</td>
                    <td>{s.month}</td>
                    <td>{s.miscDescription || 'School Miscellaneous Items'}</td>
                    <td style={{ fontWeight: '800', color: '#0f1d38' }}>Rs {s.miscCharges?.toLocaleString()}</td>
                    <td><span className={`status-badge ${s.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 8: ADMISSION FEE REPORT */}
      {activeReportTab === 'admission' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">📝 New Admission Fee Collection Journal</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Admission fees registered and billed for new enrollments</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Campus</th>
                  <th>Class</th>
                  <th>Month / Session</th>
                  <th>Admission Fee Charged</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {admissionSlips.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.rollNo}</td>
                    <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                    <td><span className="status-badge badge-active">{s.campus}</span></td>
                    <td>{s.classGrade}</td>
                    <td>{s.month}</td>
                    <td style={{ fontWeight: '800', color: '#059669' }}>Rs {s.admissionFee?.toLocaleString()}</td>
                    <td><span className={`status-badge ${s.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
