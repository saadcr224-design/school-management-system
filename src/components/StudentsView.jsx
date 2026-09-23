import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';
import StudentDetailsModal from './StudentDetailsModal';

export default function StudentsView({ onOpenAdmissionModal, onOpenFeeModal, onOpenPaymentModal }) {
  const { students, campuses, deleteStudent, updateStudent, updateStudentFeeStructure, feeSlips, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [feeStatusFilter, setFeeStatusFilter] = useState('ALL'); // 'ALL', 'PAID', 'UNPAID'
  
  // Modals state
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null); // Full 360 Student Profile & Fee Details Modal
  const [activeStudentDetail, setActiveStudentDetail] = useState(null); // ID Card modal
  const [activeFeeStructureStudent, setActiveFeeStructureStudent] = useState(null); // Overall Fee Structure & History modal
  const [editingFeeStructureStudent, setEditingFeeStructureStudent] = useState(null); // Edit Fee Structure modal
  const [editingStudent, setEditingStudent] = useState(null); // General Profile Edit
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Edit Fee Structure form state
  const [feeEditData, setFeeEditData] = useState({
    monthlyFee: 4500,
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Annual session fee revision'
  });

  // Calculate each student's fee summary
  const studentsWithFeeStats = useMemo(() => {
    return students.map(student => {
      const studentSlips = feeSlips.filter(s => s.studentId === student.id || s.rollNo === student.rollNo);
      const billed = studentSlips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const paid = studentSlips.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
      const initialBal = student.balance || 0;
      const outstanding = Math.max(0, billed - paid) + (studentSlips.length === 0 ? initialBal : 0);
      const isFeePaid = outstanding === 0;

      // Find latest unpaid slip if any
      const latestUnpaidSlip = studentSlips.find(s => s.status !== 'Paid' || (s.totalAmount - (s.amountPaid || 0) > 0));

      return {
        ...student,
        totalBilled: billed,
        totalPaid: paid,
        outstandingBalance: outstanding,
        isFeePaid,
        feeStatus: isFeePaid ? 'Paid' : 'Unpaid',
        latestUnpaidSlip
      };
    });
  }, [students, feeSlips]);

  // Overall counts for Paid vs Unpaid
  const totalPaidStudentsCount = studentsWithFeeStats.filter(s => s.isFeePaid).length;
  const totalUnpaidStudentsCount = studentsWithFeeStats.filter(s => !s.isFeePaid).length;
  const totalOutstandingArrears = studentsWithFeeStats.reduce((sum, s) => sum + s.outstandingBalance, 0);

  const filtered = studentsWithFeeStats.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchesCampus = selectedCampusFilter === 'ALL' || s.campus === selectedCampusFilter;
    const matchesClass = selectedClassFilter === 'ALL' || s.classGrade === selectedClassFilter;
    const matchesFeeStatus = feeStatusFilter === 'ALL' || 
      (feeStatusFilter === 'PAID' && s.isFeePaid) || 
      (feeStatusFilter === 'UNPAID' && !s.isFeePaid);

    return matchesSearch && matchesCampus && matchesClass && matchesFeeStatus;
  });

  const classesList = ['Nursery', 'Prep', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '1st Year', '2nd Year'];

  const handleExportStudentsCSV = () => {
    let title = feeStatusFilter === 'PAID' ? 'Fee_Paid_Students' : feeStatusFilter === 'UNPAID' ? 'Fee_Unpaid_Students' : 'All_Enrolled_Students';
    let csvContent = `data:text/csv;charset=utf-8,Roll No,Student Name,Father Name,Class,Section,Campus,Phone,Monthly Fee,Transport Fee,Total Billed,Total Paid,Outstanding Arrears,Fee Status\n`;
    
    filtered.forEach(s => {
      const row = [
        `"${s.rollNo}"`,
        `"${s.name}"`,
        `"${s.fatherName || ''}"`,
        `"${s.classGrade}"`,
        `"${s.section || 'A'}"`,
        `"${s.campus || 'Main'}"`,
        `"${s.phone || ''}"`,
        s.monthlyFee || 0,
        s.transportFee || 0,
        s.totalBilled || 0,
        s.totalPaid || 0,
        s.outstandingBalance || 0,
        `"${s.feeStatus}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported ${filtered.length} student records to CSV!`, 'success');
  };

  const handleQuickCollectPayment = (student) => {
    if (student.latestUnpaidSlip && onOpenPaymentModal) {
      onOpenPaymentModal(student.latestUnpaidSlip);
    } else if (onOpenFeeModal) {
      onOpenFeeModal();
      showToast(`Generating new fee voucher for ${student.name}`, 'info');
    }
  };

  const handleCopyStudentWhatsApp = (student) => {
    const msg = `*FEE OUTSTANDING REMINDER*\nDear Parent of ${student.name} (Roll #${student.rollNo}, Class ${student.classGrade}),\nKindly note that there are outstanding school fee arrears of *Rs. ${student.outstandingBalance.toLocaleString()}*.\nPlease clear the dues at the school accounts counter.\n\n_Shezad Children Academy_`;
    navigator.clipboard.writeText(msg);
    showToast(`✓ Reminder copied for ${student.name}!`, 'success');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudent(editingStudent.id, editingStudent);
    setEditingStudent(null);
  };

  const handleOpenFeeStructureEdit = (student) => {
    setEditingFeeStructureStudent(student);
    setFeeEditData({
      monthlyFee: student.monthlyFee || 4500,
      transportFee: student.transportFee || 0,
      isTransport: Boolean(Number(student.transportFee || 0) > 0),
      transportRoute: student.transportRoute || '',
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: 'Fee structure revision'
    });
  };

  const handleSaveFeeStructure = (e) => {
    e.preventDefault();
    if (!editingFeeStructureStudent) return;
    updateStudentFeeStructure(editingFeeStructureStudent.id, {
      monthlyFee: feeEditData.monthlyFee,
      transportFee: feeEditData.isTransport ? feeEditData.transportFee : 0,
      transportRoute: feeEditData.isTransport ? feeEditData.transportRoute : '',
      effectiveDate: feeEditData.effectiveDate
    }, feeEditData.reason);
    setEditingFeeStructureStudent(null);
  };

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Students Directory & Fee Profiles</h1>
          <p className="page-subtitle">Manage student enrollments, fee paid vs unpaid tracking, transport assignments, and financial profiles</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onOpenPaymentModal && (
            <button 
              className="action-btn-primary"
              onClick={() => onOpenPaymentModal({})}
              style={{ padding: '9px 18px', fontSize: '0.9rem', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              <span><strong>💳 Pay Student Fee</strong></span>
            </button>
          )}
          <button 
            className="action-btn-secondary"
            onClick={handleExportStudentsCSV}
            style={{ padding: '9px 14px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export student list to Excel CSV"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
          {onOpenFeeModal && (
            <button 
              className="action-btn-secondary"
              onClick={onOpenFeeModal}
              style={{ padding: '9px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', borderColor: '#bae6fd' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>
              <span><strong>Issue Fee Challans</strong></span>
            </button>
          )}
          <button 
            className="action-btn-primary"
            onClick={onOpenAdmissionModal}
            style={{ padding: '9px 18px', fontSize: '0.9rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>New Admission</span>
          </button>
        </div>
      </div>

      {/* Fee Paid vs Unpaid Students Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div 
          className="stat-card" 
          onClick={() => setFeeStatusFilter('ALL')}
          style={{ cursor: 'pointer', border: feeStatusFilter === 'ALL' ? '2px solid #0284c7' : '1px solid #e2e8f0' }}
        >
          <div className="stat-info">
            <span className="stat-label">TOTAL STUDENTS</span>
            <span className="stat-value">{students.length}</span>
            <span className="stat-sublabel">All active enrollments</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">
            👥
          </div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setFeeStatusFilter('PAID')}
          style={{ cursor: 'pointer', border: feeStatusFilter === 'PAID' ? '2px solid #059669' : '1px solid #e2e8f0', background: feeStatusFilter === 'PAID' ? '#f0fdf4' : '#fff' }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: '#065f46' }}>FEE PAID STUDENTS</span>
            <span className="stat-value" style={{ color: '#059669' }}>{totalPaidStudentsCount}</span>
            <span className="stat-sublabel" style={{ color: '#166534', fontWeight: '700' }}>
              {students.length > 0 ? `${Math.round((totalPaidStudentsCount / students.length) * 100)}% Settled` : '100%'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            ✓
          </div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setFeeStatusFilter('UNPAID')}
          style={{ cursor: 'pointer', border: feeStatusFilter === 'UNPAID' ? '2px solid #dc2626' : '1px solid #e2e8f0', background: feeStatusFilter === 'UNPAID' ? '#fef2f2' : '#fff' }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: '#991b1b' }}>UNPAID / ARREARS STUDENTS</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>{totalUnpaidStudentsCount}</span>
            <span className="stat-sublabel" style={{ color: '#991b1b', fontWeight: '700' }}>
              Rs {totalOutstandingArrears.toLocaleString()} Dues
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">
            !
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '2', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search student name, roll number, father name, or phone..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#94a3b8" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Fee Status Filter Dropdown */}
          <div style={{ width: '180px' }}>
            <select 
              className="form-select"
              value={feeStatusFilter}
              onChange={(e) => setFeeStatusFilter(e.target.value)}
              style={{ 
                fontWeight: '700', 
                color: feeStatusFilter === 'PAID' ? '#059669' : feeStatusFilter === 'UNPAID' ? '#dc2626' : '#0f1d38' 
              }}
            >
              <option value="ALL">All Fee Statuses</option>
              <option value="PAID">🟢 Fee Paid Students ({totalPaidStudentsCount})</option>
              <option value="UNPAID">🔴 Fee Unpaid Students ({totalUnpaidStudentsCount})</option>
            </select>
          </div>

          <div style={{ width: '160px' }}>
            <select 
              className="form-select"
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
            >
              <option value="ALL">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.city}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '150px' }}>
            <select 
              className="form-select"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="ALL">All Classes</option>
              {classesList.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="section-card">
        <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="chart-title">Enrolled Students ({filtered.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {feeStatusFilter === 'PAID' ? 'Fee Paid Students' : feeStatusFilter === 'UNPAID' ? 'Fee Unpaid / Defaulter Students' : 'All Students'}
            </p>
          </div>
          {feeStatusFilter !== 'ALL' && (
            <button 
              type="button" 
              className="action-btn-secondary"
              onClick={() => setFeeStatusFilter('ALL')}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              Clear Status Filter ✕
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Father Name</th>
                <th>Campus</th>
                <th>Class & Sec</th>
                <th>Contact Phone</th>
                <th>Monthly Tuition</th>
                <th>Transport Fee</th>
                <th>Fee Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => (
                <tr key={student.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedStudentForDetails(student)}>
                  <td style={{ fontWeight: '700', color: '#0284c7' }}>
                    <span style={{ textDecoration: 'underline' }}>{student.rollNo}</span>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: '#e0f2fe', 
                        color: '#0369a1',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '800'
                      }}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <span style={{ color: '#0f1d38', fontWeight: '700', fontSize: '0.92rem' }}>{student.name}</span>
                        <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>Click to view 360° profile & fee history</div>
                      </div>
                    </div>
                  </td>
                  <td>{student.fatherName}</td>
                  <td>
                    <span className="status-badge badge-active">{student.campus}</span>
                  </td>
                  <td>{student.classGrade} ({student.section || 'A'})</td>
                  <td style={{ fontWeight: '600', color: '#0369a1' }}>{student.phone}</td>
                  <td style={{ fontWeight: '700' }}>Rs {student.monthlyFee?.toLocaleString()}</td>
                  <td>
                    {student.transportFee > 0 ? (
                      <span style={{ color: '#0369a1', fontWeight: '700' }}>
                        Rs {student.transportFee?.toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>None</span>
                    )}
                  </td>
                  <td>
                    {student.isFeePaid ? (
                      <span className="status-badge badge-paid" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                        ✓ Fee Paid
                      </span>
                    ) : (
                      <span className="status-badge badge-unpaid" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                        ! Arrears: Rs {student.outstandingBalance.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* 1-Click Collect Fee for Unpaid Students */}
                      {!student.isFeePaid && (
                        <button
                          type="button"
                          className="table-action-icon-btn btn-collect"
                          title="Collect Fee / Record Payment for Student"
                          onClick={() => handleQuickCollectPayment(student)}
                          style={{ color: '#059669', borderColor: '#059669', background: '#ecfdf5' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <line x1="2" x2="22" y1="10" y2="10" />
                          </svg>
                        </button>
                      )}

                      {/* 1-Click WhatsApp Reminder for Unpaid Students */}
                      {!student.isFeePaid && (
                        <button
                          type="button"
                          className="table-action-icon-btn btn-edit"
                          title="Copy WhatsApp SMS fee reminder notice"
                          onClick={() => handleCopyStudentWhatsApp(student)}
                          style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                          </svg>
                        </button>
                      )}

                      {/* Direct Pay Fee Button */}
                      {onOpenPaymentModal && (
                        <button 
                          type="button"
                          className="table-action-icon-btn"
                          title={`Pay / Collect Fee for ${student.name}`}
                          onClick={() => {
                            if (student.latestUnpaidSlip) {
                              onOpenPaymentModal(student.latestUnpaidSlip);
                            } else {
                              onOpenPaymentModal({
                                studentId: student.id,
                                studentName: student.name,
                                rollNo: student.rollNo,
                                classGrade: student.classGrade,
                                section: student.section,
                                campus: student.campus,
                                phone: student.phone
                              });
                            }
                          }}
                          style={{ color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5', fontWeight: 'bold' }}
                        >
                          💳
                        </button>
                      )}

                      {/* Overall Student Fee Structure & History Modal */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-slip"
                        title="View Complete Student Fee Structure & Ledger"
                        onClick={() => setActiveFeeStructureStudent(student)}
                        style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="5" rx="2" />
                          <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                      </button>

                      {/* Edit Fee Structure Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-edit"
                        title="Update Student Fee Structure (With Effective Date)"
                        onClick={() => handleOpenFeeStructureEdit(student)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </button>

                      {/* View Student ID Card Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-idcard"
                        title="View / Print Student ID Card"
                        onClick={() => setActiveStudentDetail(student)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="14" x="3" y="5" rx="2"/>
                          <circle cx="9" cy="11" r="2"/>
                          <path d="M15 9h2M15 13h2M6 16c0-1.5 1.5-2 3-2s3 .5 3 2"/>
                        </svg>
                      </button>

                      {/* Edit Student Profile Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-edit"
                        title="Edit Student Profile Details"
                        onClick={() => setEditingStudent(student)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </button>

                      {/* Delete Student Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-delete"
                        title="Delete Student Record"
                        onClick={() => setStudentToDelete(student)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: OVERALL STUDENT FEE STRUCTURE & COMPLETE FINANCIAL HISTORY */}
      {activeFeeStructureStudent && (() => {
        const studentSlips = feeSlips.filter(s => s.studentId === activeFeeStructureStudent.id || s.rollNo === activeFeeStructureStudent.rollNo);
        const totalBilled = studentSlips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const totalPaid = studentSlips.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
        const outstandingBalance = Math.max(0, totalBilled - totalPaid);

        return (
          <div className="modal-overlay" onClick={() => setActiveFeeStructureStudent(null)}>
            <div className="modal-content wide" style={{ maxWidth: '850px', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
                <div>
                  <h3 className="modal-title" style={{ color: '#fff' }}>
                    💰 Complete Student Fee Structure & Ledger
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    {activeFeeStructureStudent.name} ({activeFeeStructureStudent.rollNo}) — {activeFeeStructureStudent.campus} Campus
                  </p>
                </div>
                <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setActiveFeeStructureStudent(null)}>✕</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
                {/* Top Profile Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>MONTHLY TUITION</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f1d38' }}>Rs {activeFeeStructureStudent.monthlyFee?.toLocaleString()}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>TRANSPORT FEE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0369a1' }}>
                      {activeFeeStructureStudent.transportFee > 0 ? `Rs ${activeFeeStructureStudent.transportFee?.toLocaleString()}` : 'None (0)'}
                    </div>
                    {activeFeeStructureStudent.transportRoute && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{activeFeeStructureStudent.transportRoute}</span>
                    )}
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#166534', textTransform: 'uppercase', fontWeight: '700' }}>TOTAL PAID TO DATE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#059669' }}>Rs {totalPaid.toLocaleString()}</div>
                  </div>

                  <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '0.72rem', color: '#991b1b', textTransform: 'uppercase', fontWeight: '700' }}>CURRENT BALANCE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#dc2626' }}>Rs {outstandingBalance.toLocaleString()}</div>
                  </div>
                </div>

                {/* Student Info Details */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div><strong>Father / Guardian:</strong> {activeFeeStructureStudent.fatherName}</div>
                    <div><strong>Class & Section:</strong> {activeFeeStructureStudent.classGrade} ({activeFeeStructureStudent.section || 'A'})</div>
                    <div><strong>Contact Phone:</strong> {activeFeeStructureStudent.phone}</div>
                    <div><strong>Admission Date:</strong> {activeFeeStructureStudent.admissionDate || '2026-01-15'}</div>
                    <div><strong>Initial Admission Fee:</strong> Rs {(activeFeeStructureStudent.admissionFee || 5000).toLocaleString()}</div>
                    <div>
                      <strong>Fee Payment Status:</strong>{' '}
                      {outstandingBalance === 0 ? (
                        <span className="status-badge badge-paid">✓ Fully Paid</span>
                      ) : (
                        <span className="status-badge badge-unpaid">! Rs {outstandingBalance.toLocaleString()} Pending</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chronological Fee Slips History */}
                <h4 style={{ margin: '0 0 10px', fontSize: '0.94rem', color: '#0f1d38', fontWeight: '800' }}>
                  📄 Fee Challan History ({studentSlips.length} Vouchers)
                </h4>
                <div className="table-responsive" style={{ marginBottom: '20px' }}>
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Challan #</th>
                        <th>Month</th>
                        <th>Class (At Time)</th>
                        <th>Tuition</th>
                        <th>Transport</th>
                        <th>Exam/Misc</th>
                        <th>Discount</th>
                        <th>Net Payable</th>
                        <th>Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentSlips.map(slip => (
                        <tr key={slip.id}>
                          <td style={{ fontWeight: '700' }}>{slip.challanNo}</td>
                          <td style={{ fontWeight: '700', color: '#0369a1' }}>{slip.month}</td>
                          <td><strong>{slip.classGrade}</strong></td>
                          <td>Rs {slip.tuitionFee?.toLocaleString()}</td>
                          <td>Rs {Number(slip.transportFee || 0).toLocaleString()}</td>
                          <td>Rs {(Number(slip.examFee || 0) + Number(slip.miscCharges || 0) + Number(slip.admissionFee || 0)).toLocaleString()}</td>
                          <td style={{ color: slip.discount > 0 ? '#059669' : '#64748b' }}>
                            {slip.discount > 0 ? `-Rs ${slip.discount?.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontWeight: '700' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                          <td style={{ color: '#059669', fontWeight: '700' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                          <td>
                            <span className={`status-badge ${slip.status === 'Paid' ? 'badge-paid' : slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                              {slip.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {studentSlips.length === 0 && (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                            No fee challans generated yet for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Fee Structure Change History Log */}
                <h4 style={{ margin: '0 0 10px', fontSize: '0.94rem', color: '#0f1d38', fontWeight: '800' }}>
                  📜 Fee Structure Update History
                </h4>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  {activeFeeStructureStudent.feeHistory && activeFeeStructureStudent.feeHistory.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.8 }}>
                      {activeFeeStructureStudent.feeHistory.map((h, i) => (
                        <li key={i}>
                          <strong>Effective {h.effectiveDate}:</strong> Monthly Tuition: Rs {h.newMonthlyFee || h.monthlyFee}, Transport: Rs {h.newTransportFee ?? h.transportFee ?? 0} — <em>{h.reason || 'Fee structure update'}</em>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Initial fee assignment established at admission. No subsequent rate changes logged.
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {onOpenPaymentModal && (
                    <button 
                      type="button" 
                      className="action-btn-primary"
                      style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        const st = activeFeeStructureStudent;
                        setActiveFeeStructureStudent(null);
                        const sSlip = studentSlips.find(s => s.status !== 'Paid' || (s.totalAmount - (s.amountPaid || 0) > 0));
                        if (sSlip) {
                          onOpenPaymentModal(sSlip);
                        } else {
                          onOpenPaymentModal({
                            studentId: st.id,
                            studentName: st.name,
                            rollNo: st.rollNo,
                            classGrade: st.classGrade,
                            section: st.section,
                            campus: st.campus,
                            phone: st.phone
                          });
                        }
                      }}
                    >
                      💳 Pay Student Fee ({outstandingBalance > 0 ? `Rs ${outstandingBalance.toLocaleString()}` : `Rs ${(activeFeeStructureStudent.monthlyFee || 4500).toLocaleString()}`})
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="action-btn-secondary" onClick={() => setActiveFeeStructureStudent(null)}>Close</button>
                  <button 
                    type="button" 
                    className="action-btn-primary"
                    onClick={() => {
                      handleOpenFeeStructureEdit(activeFeeStructureStudent);
                      setActiveFeeStructureStudent(null);
                    }}
                  >
                    ✏️ Edit Fee Structure
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: EDIT STUDENT FEE STRUCTURE (Preserves past records) */}
      {editingFeeStructureStudent && (
        <div className="modal-overlay" onClick={() => setEditingFeeStructureStudent(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>Edit Fee Structure</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  {editingFeeStructureStudent.name} ({editingFeeStructureStudent.rollNo})
                </p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setEditingFeeStructureStudent(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveFeeStructure}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '16px', fontSize: '0.8rem', color: '#1e40af' }}>
                  ℹ️ Changes made here will apply to future fee challans from the effective date. All historical fee vouchers and past class records remain safely intact.
                </div>

                <div className="form-grid single">
                  <div className="form-group">
                    <label className="form-label">Monthly Tuition Fee (Rs) *</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={feeEditData.monthlyFee}
                      onChange={(e) => setFeeEditData({ ...feeEditData, monthlyFee: Number(e.target.value) })}
                      required
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '8px' }}>
                      <input 
                        type="checkbox"
                        checked={feeEditData.isTransport}
                        onChange={(e) => setFeeEditData({ ...feeEditData, isTransport: e.target.checked })}
                      />
                      <strong>Enable Transport Service</strong>
                    </label>
                    {feeEditData.isTransport && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label">Transport Fee (Rs)</label>
                          <input 
                            type="number"
                            className="form-input"
                            value={feeEditData.transportFee}
                            onChange={(e) => setFeeEditData({ ...feeEditData, transportFee: Number(e.target.value) })}
                            min="0"
                            required={feeEditData.isTransport}
                          />
                        </div>
                        <div>
                          <label className="form-label">Route Name</label>
                          <input 
                            type="text"
                            className="form-input"
                            placeholder="e.g. Route 1"
                            value={feeEditData.transportRoute}
                            onChange={(e) => setFeeEditData({ ...feeEditData, transportRoute: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Effective Date *</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={feeEditData.effectiveDate}
                      onChange={(e) => setFeeEditData({ ...feeEditData, effectiveDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason for Change / Note</label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="e.g. Annual session promotion / Transport added"
                      value={feeEditData.reason}
                      onChange={(e) => setFeeEditData({ ...feeEditData, reason: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setEditingFeeStructureStudent(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">✓ Update Fee Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT STUDENT GENERAL PROFILE */}
      {editingStudent && (
        <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Student Profile</h3>
              <button className="modal-close-btn" onClick={() => setEditingStudent(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Student Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Father Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.fatherName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select 
                      className="form-select"
                      value={editingStudent.classGrade}
                      onChange={(e) => setEditingStudent({ ...editingStudent, classGrade: e.target.value })}
                    >
                      {classesList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.section || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.phone || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campus Branch</label>
                    <select 
                      className="form-select"
                      value={editingStudent.campus}
                      onChange={(e) => setEditingStudent({ ...editingStudent, campus: e.target.value })}
                    >
                      {campuses.map(c => <option key={c.id} value={c.code}>{c.name} ({c.code})</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setEditingStudent(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE STUDENT */}
      {studentToDelete && (
        <div className="modal-overlay" onClick={() => setStudentToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Delete Student Record</h3>
              <button className="modal-close-btn" onClick={() => setStudentToDelete(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.94rem', color: '#1e293b', marginBottom: '8px' }}>
                Are you sure you want to delete student <strong>{studentToDelete.name} ({studentToDelete.rollNo})</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setStudentToDelete(null)}>Cancel</button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  deleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: STUDENT ID CARD VIEW */}
      {activeStudentDetail && (
        <div className="modal-overlay" onClick={() => setActiveStudentDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3 className="modal-title">Student Identity Card</h3>
              <button className="modal-close-btn" onClick={() => setActiveStudentDetail(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ background: '#0f1d38', color: '#fff', borderRadius: '12px', padding: '18px', textAlign: 'center', boxShadow: '0 8px 24px rgba(15,29,56,0.2)' }}>
                <SchoolLogo size={42} />
                <h3 style={{ margin: '6px 0 2px', fontSize: '1.1rem', color: '#fff' }}>SHEZAD CHILDREN ACADEMY</h3>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Student Identity Card</span>
                
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#fff', margin: '14px auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '800', color: '#0f1d38' }}>
                  {activeStudentDetail.name.charAt(0)}
                </div>

                <h4 style={{ margin: '0 0 2px', fontSize: '1.15rem', color: '#fff' }}>{activeStudentDetail.name}</h4>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                  Father: {activeStudentDetail.fatherName}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', textAlign: 'left', fontSize: '0.78rem' }}>
                  <div>Roll No: <strong>{activeStudentDetail.rollNo}</strong></div>
                  <div>Class: <strong>{activeStudentDetail.classGrade}</strong></div>
                  <div>Campus: <strong>{activeStudentDetail.campus}</strong></div>
                  <div>Contact: <strong>{activeStudentDetail.phone}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="action-btn-secondary" onClick={() => setActiveStudentDetail(null)}>Close</button>
              <button className="action-btn-primary" onClick={() => window.print()}>🖨️ Print ID Card</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: 360° STUDENT PROFILE & COMPLETE FEE LEDGER MODAL */}
      <StudentDetailsModal
        student={selectedStudentForDetails}
        isOpen={Boolean(selectedStudentForDetails)}
        onClose={() => setSelectedStudentForDetails(null)}
        onOpenPaymentModal={onOpenPaymentModal}
        onOpenFeeModal={onOpenFeeModal}
        onOpenEditStudent={(st) => setEditingStudent(st)}
        onOpenEditFeeStructure={(st) => handleOpenFeeStructureEdit(st)}
      />
    </div>
  );
}
