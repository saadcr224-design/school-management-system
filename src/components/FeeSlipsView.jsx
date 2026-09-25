import React, { useState } from 'react';
import { useApp, ACADEMIC_MONTHS, getAcademicMonthYear } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';
import StudentDetailsModal from './StudentDetailsModal';

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

export default function FeeSlipsView({ onOpenFeeModal, onOpenPaymentModal }) {
  const { feeSlips, deleteFeeSlip, campuses, allStudents, currentUser, showToast } = useApp();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const [activeSubTab, setActiveSubTab] = useState('challans'); // 'challans', 'paid', 'unpaid', 'reminders'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [reminderMonthFilter, setReminderMonthFilter] = useState('ALL');
  
  // Modals state
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [slipsToPrint, setSlipsToPrint] = useState([]); // Array of slips to print (1 or many)
  const [selectedSlipIds, setSelectedSlipIds] = useState([]);
  const [slipToDelete, setSlipToDelete] = useState(null);
  const [reminderNoticeToPrint, setReminderNoticeToPrint] = useState(null);

  const filteredSlips = feeSlips.filter(slip => {
    const matchesStatus = statusFilter === 'ALL' || slip.status === statusFilter;
    const matchesClass = classFilter === 'All Classes' || slip.classGrade === classFilter;
    const matchesSearch = slip.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slip.phone && slip.phone.includes(searchTerm)) ||
      (slip.campus && slip.campus.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesClass && matchesSearch;
  });

  // Paid Students list
  const paidSlips = feeSlips.filter(slip => {
    const isPaid = slip.status === 'Paid' || ((slip.totalAmount || 0) > 0 && (slip.totalAmount || 0) <= (slip.amountPaid || 0));
    const matchesClass = classFilter === 'All Classes' || slip.classGrade === classFilter;
    const matchesMonth = reminderMonthFilter === 'ALL' || (slip.month && slip.month.includes(reminderMonthFilter));
    const matchesSearch = slip.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slip.phone && slip.phone.includes(searchTerm));
    return isPaid && matchesClass && matchesMonth && matchesSearch;
  });

  // Unpaid Students list (Unpaid or Partial or remaining > 0)
  const unpaidSlips = feeSlips.filter(slip => {
    const remaining = (slip.totalAmount || 0) - (slip.amountPaid || 0);
    const isUnpaid = remaining > 0 || slip.status !== 'Paid';
    const matchesClass = classFilter === 'All Classes' || slip.classGrade === classFilter;
    const matchesMonth = reminderMonthFilter === 'ALL' || (slip.month && slip.month.includes(reminderMonthFilter));
    const matchesSearch = slip.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slip.phone && slip.phone.includes(searchTerm));
    return isUnpaid && matchesClass && matchesMonth && matchesSearch;
  });

  // Reminders list
  const reminderSlips = unpaidSlips;

  const totalBilled = feeSlips.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalReceived = feeSlips.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
  const totalPending = totalBilled - totalReceived;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSlipIds(filteredSlips.map(s => s.id));
    } else {
      setSelectedSlipIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedSlipIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrintBatch = () => {
    const selected = feeSlips.filter(s => selectedSlipIds.includes(s.id));
    if (selected.length === 0) {
      alert('Please select at least one fee challan to print.');
      return;
    }
    setSlipsToPrint(selected);
  };

  const handleExportCSV = (type) => {
    let list = type === 'paid' ? paidSlips : type === 'unpaid' ? unpaidSlips : filteredSlips;
    let title = type === 'paid' ? 'Fee_Paid_Students' : type === 'unpaid' ? 'Fee_Unpaid_Students' : 'All_Fee_Challans';
    
    let csvContent = `data:text/csv;charset=utf-8,Challan #,Student Name,Roll No,Class,Campus,Month,Subtotal,Discount,Net Amount,Amount Paid,Remaining Balance,Due Date,Status,Phone\n`;
    
    list.forEach(s => {
      const rem = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
      const row = [
        `"${s.challanNo}"`,
        `"${s.studentName}"`,
        `"${s.rollNo}"`,
        `"${s.classGrade}"`,
        `"${s.campus || 'Main'}"`,
        `"${s.month}"`,
        s.subtotal || s.totalAmount || 0,
        s.discount || 0,
        s.totalAmount || 0,
        s.amountPaid || 0,
        rem,
        `"${s.dueDate || ''}"`,
        `"${s.status}"`,
        `"${s.phone || ''}"`
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
    showToast(`✓ Exported ${list.length} records to CSV!`, 'success');
  };

  const handleCopyWhatsAppReminder = (slip) => {
    const remaining = (slip.totalAmount || 0) - (slip.amountPaid || 0);
    const msg = `*FEE REMINDER NOTICE*\nDear Parent of ${slip.studentName} (Roll #${slip.rollNo}, Class ${slip.classGrade}),\nThis is a friendly reminder that the school fee for *${slip.month}* has an outstanding balance of *Rs. ${remaining.toLocaleString()}* (Total: Rs. ${slip.totalAmount?.toLocaleString()}, Paid: Rs. ${slip.amountPaid?.toLocaleString()}).\nDue Date: *${slip.dueDate}*.\nPlease clear the dues at your earliest to avoid late charges.\n\n_Shezad Children Academy Accounts Department_`;
    navigator.clipboard.writeText(msg);
    showToast(`✓ Reminder message copied to clipboard for ${slip.studentName}!`, 'success');
  };

  const isAllSelected = filteredSlips.length > 0 && filteredSlips.every(s => selectedSlipIds.includes(s.id));

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Fee Management & Challan Generation</h1>
          <p className="page-subtitle">Monthly fee records, fee paid vs unpaid tracking, 2-copy vouchers, transport fees, and reminders</p>
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

          {selectedSlipIds.length > 0 && activeSubTab === 'challans' && (
            <button 
              className="action-btn-secondary"
              onClick={handlePrintBatch}
              style={{ padding: '9px 16px', fontSize: '0.9rem', background: '#0284c7', color: '#fff', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              <span><strong>Print Selected ({selectedSlipIds.length})</strong></span>
            </button>
          )}

          <button 
            className="action-btn-secondary"
            onClick={() => handleExportCSV(activeSubTab)}
            style={{ padding: '9px 14px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export current view to Excel CSV"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>

          <button 
            className="action-btn-primary"
            onClick={onOpenFeeModal}
            style={{ padding: '9px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span><strong>Generate Fee Challan</strong></span>
          </button>
        </div>
      </div>

      {/* Summary Stat Mini-Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div 
          className="stat-card"
          onClick={() => setActiveSubTab('challans')}
          style={{ cursor: 'pointer', border: activeSubTab === 'challans' ? '2px solid #0284c7' : '1px solid #e2e8f0' }}
        >
          <div className="stat-info">
            <span className="stat-label">TOTAL BILLED (NET)</span>
            <span className="stat-value">Rs {totalBilled.toLocaleString()}</span>
            <span className="stat-sublabel">{feeSlips.length} Total Challans</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">Rs</div>
        </div>

        <div 
          className="stat-card"
          onClick={() => setActiveSubTab('paid')}
          style={{ cursor: 'pointer', border: activeSubTab === 'paid' ? '2px solid #059669' : '1px solid #e2e8f0', background: activeSubTab === 'paid' ? '#f0fdf4' : '#fff' }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: '#065f46' }}>FEE PAID STUDENTS</span>
            <span className="stat-value" style={{ color: '#059669' }}>Rs {totalReceived.toLocaleString()}</span>
            <span className="stat-sublabel" style={{ color: '#166534', fontWeight: '700' }}>{paidSlips.length} Students Cleared</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">✓</div>
        </div>

        <div 
          className="stat-card"
          onClick={() => setActiveSubTab('unpaid')}
          style={{ cursor: 'pointer', border: activeSubTab === 'unpaid' ? '2px solid #dc2626' : '1px solid #e2e8f0', background: activeSubTab === 'unpaid' ? '#fef2f2' : '#fff' }}
        >
          <div className="stat-info">
            <span className="stat-label" style={{ color: '#991b1b' }}>UNPAID / ARREARS DUE</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>Rs {totalPending.toLocaleString()}</span>
            <span className="stat-sublabel" style={{ color: '#991b1b', fontWeight: '700' }}>{unpaidSlips.length} Students Pending</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">!</div>
        </div>
      </div>

      {/* Sub Tabs: All Fee Slips vs Fee Paid vs Fee Unpaid vs Reminders */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '18px', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button 
          className={`nav-item ${activeSubTab === 'challans' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveSubTab('challans')}
        >
          📄 All Issued Challans ({feeSlips.length})
        </button>
        <button 
          className={`nav-item ${activeSubTab === 'paid' ? 'active' : ''}`}
          style={{ 
            width: 'auto', 
            padding: '8px 18px', 
            borderRadius: '6px', 
            background: activeSubTab === 'paid' ? '#ecfdf5' : 'transparent', 
            color: activeSubTab === 'paid' ? '#065f46' : 'inherit', 
            borderColor: activeSubTab === 'paid' ? '#059669' : 'transparent',
            fontWeight: activeSubTab === 'paid' ? '700' : 'normal'
          }}
          onClick={() => setActiveSubTab('paid')}
        >
          🟢 Fee Paid Students ({paidSlips.length})
        </button>
        <button 
          className={`nav-item ${activeSubTab === 'unpaid' ? 'active' : ''}`}
          style={{ 
            width: 'auto', 
            padding: '8px 18px', 
            borderRadius: '6px', 
            background: activeSubTab === 'unpaid' ? '#fef2f2' : 'transparent', 
            color: activeSubTab === 'unpaid' ? '#991b1b' : 'inherit', 
            borderColor: activeSubTab === 'unpaid' ? '#dc2626' : 'transparent',
            fontWeight: activeSubTab === 'unpaid' ? '700' : 'normal'
          }}
          onClick={() => setActiveSubTab('unpaid')}
        >
          🔴 Fee Unpaid Students ({unpaidSlips.length})
        </button>
        <button 
          className={`nav-item ${activeSubTab === 'reminders' ? 'active' : ''}`}
          style={{ 
            width: 'auto', 
            padding: '8px 18px', 
            borderRadius: '6px', 
            background: activeSubTab === 'reminders' ? '#fff7ed' : 'transparent', 
            color: activeSubTab === 'reminders' ? '#c2410c' : 'inherit', 
            borderColor: activeSubTab === 'reminders' ? '#ea580c' : 'transparent' 
          }}
          onClick={() => setActiveSubTab('reminders')}
        >
          📢 Reminders & WhatsApp Notices ({reminderSlips.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search Box */}
          <div style={{ flex: '2', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder={activeSubTab === 'reminders' ? "Search student, roll #, or contact phone..." : "Search challan #, student name, roll #, or phone..."}
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

          {/* Class Filter */}
          <div style={{ width: '170px' }}>
            <select 
              className="form-select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              {CLASSES.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {activeSubTab === 'challans' ? (
            /* Status Filter */
            <div style={{ width: '160px' }}>
              <select 
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Unpaid">Unpaid Only</option>
                <option value="Paid">Paid Only</option>
                <option value="Partial">Partial Only</option>
              </select>
            </div>
          ) : (
            /* Academic Month Filter for Reminders */
            <div style={{ width: '180px' }}>
              <select 
                className="form-select"
                value={reminderMonthFilter}
                onChange={(e) => setReminderMonthFilter(e.target.value)}
              >
                <option value="ALL">All Months (Apr–Mar)</option>
                {ACADEMIC_MONTHS.map(m => (
                  <option key={m} value={m}>{getAcademicMonthYear(m)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Select All Button for Challans */}
          {activeSubTab === 'challans' && filteredSlips.length > 0 && (
            <button
              type="button"
              className="action-btn-secondary"
              onClick={() => {
                if (isAllSelected) {
                  setSelectedSlipIds([]);
                } else {
                  setSelectedSlipIds(filteredSlips.map(s => s.id));
                }
              }}
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              {isAllSelected ? '✕ Deselect All' : '✓ Select All in View'}
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Challans Table */}
      {activeSubTab === 'challans' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title">Issued Fee Challans ({filteredSlips.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {classFilter !== 'All Classes' ? `Filtered by Class: ${classFilter}` : 'All fee challan vouchers with 2-copy printable output'}
              </p>
            </div>
            {selectedSlipIds.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: '700', background: '#e0f2fe', padding: '4px 12px', borderRadius: '12px' }}>
                {selectedSlipIds.length} Challan(s) Selected
              </span>
            )}
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      title="Select all currently visible slips"
                    />
                  </th>
                  <th>Challan #</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Month</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Net Payable</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlips.map(slip => {
                  const remaining = Math.max(0, (slip.totalAmount || 0) - (slip.amountPaid || 0));
                  const isSelected = selectedSlipIds.includes(slip.id);
                  const student = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                  const phoneDisplay = slip.phone || (student ? student.phone : '—');

                  return (
                    <tr 
                      key={slip.id}
                      style={{ background: isSelected ? '#f0f9ff' : 'transparent' }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(slip.id)}
                        />
                      </td>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                      <td 
                        style={{ fontWeight: '600', cursor: 'pointer' }}
                        onClick={() => {
                          const st = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                          if (st) setSelectedStudentForDetails(st);
                        }}
                        title="Click to view full 360° student details & fee history"
                      >
                        <span style={{ textDecoration: 'underline', color: '#0284c7' }}>{slip.studentName}</span>
                      </td>
                      <td>{slip.rollNo}</td>
                      <td><strong>{slip.classGrade}</strong></td>
                      <td style={{ fontWeight: '600', color: '#0369a1' }}>{slip.month}</td>
                      <td style={{ color: '#475569' }}>Rs {(slip.subtotal || slip.totalAmount)?.toLocaleString()}</td>
                      <td style={{ color: slip.discount > 0 ? '#059669' : '#64748b', fontWeight: slip.discount > 0 ? '700' : 'normal' }}>
                        {slip.discount > 0 ? `-Rs ${slip.discount?.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: '600' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                      <td style={{ color: remaining > 0 ? '#991b1b' : '#64748b', fontWeight: '700' }}>
                        Rs {remaining.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#334155' }}>{phoneDisplay}</td>
                      <td>
                        <span className={`status-badge ${
                          slip.status === 'Paid' ? 'badge-paid' :
                          slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'
                        }`}>
                          {slip.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Print Challan Icon Button */}
                          <button 
                            type="button"
                            className="table-action-icon-btn btn-print"
                            title="Print 2-Copy Fee Challan (School & Student Copy)"
                            onClick={() => setSlipsToPrint([slip])}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9"></polyline>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                              <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                          </button>

                          {/* Collect Fee Icon Button */}
                          {slip.status !== 'Paid' && (
                            <button 
                              type="button"
                              className="table-action-icon-btn btn-collect"
                              title="Collect Fee & Record Payment"
                              onClick={() => onOpenPaymentModal(slip)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="14" x="2" y="5" rx="2" />
                                <line x1="2" x2="22" y1="10" y2="10" />
                              </svg>
                            </button>
                          )}

                          {/* Delete Challan Icon Button (Super Admin Only) */}
                          {isSuperAdmin && (
                            <button 
                              type="button"
                              className="table-action-icon-btn btn-delete"
                              title="Delete Fee Slip (Super Admin Only)"
                              onClick={() => setSlipToDelete(slip)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSlips.length === 0 && (
                  <tr>
                    <td colSpan="14" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No fee vouchers found matching the filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Fee Paid Students Table */}
      {activeSubTab === 'paid' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title" style={{ color: '#059669' }}>🟢 Fee Paid Students ({paidSlips.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                All student fee vouchers fully cleared and received in counter accounts
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: '700', background: '#ecfdf5', padding: '5px 12px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                Total Cleared: Rs {paidSlips.reduce((acc, s) => acc + (s.amountPaid || 0), 0).toLocaleString()}
              </span>
              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => handleExportCSV('paid')}
                style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}
              >
                📥 Export Paid List CSV
              </button>
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
                  <th>Campus</th>
                  <th>Month</th>
                  <th>Total Billed</th>
                  <th>Discount</th>
                  <th>Net Paid</th>
                  <th>Contact Phone</th>
                  <th>Fee Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paidSlips.map(slip => {
                  const student = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                  const phoneDisplay = slip.phone || (student ? student.phone : '—');

                  return (
                    <tr key={slip.id} style={{ background: '#fcfdfd' }}>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                      <td 
                        style={{ fontWeight: '600', cursor: 'pointer' }}
                        onClick={() => {
                          const st = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                          if (st) setSelectedStudentForDetails(st);
                        }}
                        title="Click to view full 360° student details & fee history"
                      >
                        <span style={{ textDecoration: 'underline', color: '#059669' }}>{slip.studentName}</span>
                      </td>
                      <td>{slip.rollNo}</td>
                      <td><strong>{slip.classGrade}</strong></td>
                      <td><span className="status-badge badge-active">{slip.campus}</span></td>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{slip.month}</td>
                      <td style={{ color: '#64748b' }}>Rs {(slip.subtotal || slip.totalAmount)?.toLocaleString()}</td>
                      <td style={{ color: slip.discount > 0 ? '#059669' : '#64748b' }}>
                        {slip.discount > 0 ? `-Rs ${slip.discount?.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ color: '#059669', fontWeight: '700', fontSize: '0.92rem' }}>
                        Rs {slip.amountPaid?.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#334155' }}>{phoneDisplay}</td>
                      <td>
                        <span className="status-badge badge-paid" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                          ✓ Paid & Cleared
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => setSlipsToPrint([slip])}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Print 2-Copy Paid Receipt"
                          >
                            🖨️ Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paidSlips.length === 0 && (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No fee-paid records found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Fee Unpaid / Due Students Table */}
      {activeSubTab === 'unpaid' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title" style={{ color: '#dc2626' }}>🔴 Fee Unpaid / Arrears Students ({unpaidSlips.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Students with pending fees, partial payments, or overdue fee challans
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '700', background: '#fef2f2', padding: '5px 12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                Total Pending Arrears: Rs {unpaidSlips.reduce((acc, s) => acc + Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0)), 0).toLocaleString()}
              </span>
              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => handleExportCSV('unpaid')}
                style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}
              >
                📥 Export Unpaid List CSV
              </button>
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
                  <th>Net Payable</th>
                  <th>Paid So Far</th>
                  <th>Remaining Dues</th>
                  <th>Due Date</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unpaidSlips.map(slip => {
                  const remaining = Math.max(0, (slip.totalAmount || 0) - (slip.amountPaid || 0));
                  const student = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                  const phoneDisplay = slip.phone || (student ? student.phone : '—');

                  return (
                    <tr key={slip.id}>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                      <td 
                        style={{ fontWeight: '600', cursor: 'pointer' }}
                        onClick={() => {
                          const st = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                          if (st) setSelectedStudentForDetails(st);
                        }}
                        title="Click to view full 360° student details & fee history"
                      >
                        <span style={{ textDecoration: 'underline', color: '#dc2626' }}>{slip.studentName}</span>
                      </td>
                      <td>{slip.rollNo}</td>
                      <td><strong>{slip.classGrade}</strong></td>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{slip.month}</td>
                      <td style={{ fontWeight: '600' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: '600' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                      <td style={{ color: '#991b1b', fontWeight: '800', fontSize: '0.94rem' }}>
                        Rs {remaining.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{slip.dueDate || '10th of month'}</td>
                      <td style={{ fontWeight: '600', color: '#0369a1' }}>
                        <a href={`tel:${phoneDisplay}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          📞 {phoneDisplay}
                        </a>
                      </td>
                      <td>
                        <span className={`status-badge ${slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {slip.status === 'Partial' ? 'Partial' : '! Unpaid'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => handleCopyWhatsAppReminder(slip)}
                            style={{ padding: '5px 8px', fontSize: '0.78rem', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}
                            title="Copy WhatsApp SMS reminder"
                          >
                            💬 SMS
                          </button>
                          <button 
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => setSlipsToPrint([slip])}
                            style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                            title="Print 2-Copy Fee Challan"
                          >
                            🖨️ Challan
                          </button>
                          <button 
                            type="button"
                            className="action-btn-primary"
                            onClick={() => onOpenPaymentModal(slip)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', background: '#059669', borderColor: '#059669' }}
                            title="Collect Fee & Record Payment"
                          >
                            💳 Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {unpaidSlips.length === 0 && (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: '#059669', fontWeight: '700' }}>
                      ✓ All fee dues clear! No unpaid vouchers found for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: Fee Reminders & Overdue Defaulters */}
      {activeSubTab === 'reminders' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title" style={{ color: '#991b1b' }}>📢 Outstanding Fee Reminders ({reminderSlips.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Students with unpaid, partially paid, or overdue fee balances
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll # / ID</th>
                  <th>Class & Section</th>
                  <th>Campus</th>
                  <th>Billing Month</th>
                  <th>Total Fee</th>
                  <th>Paid Amount</th>
                  <th>Remaining Balance</th>
                  <th>Contact Number</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Reminder Actions</th>
                </tr>
              </thead>
              <tbody>
                {reminderSlips.map(slip => {
                  const remaining = Math.max(0, (slip.totalAmount || 0) - (slip.amountPaid || 0));
                  const student = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                  const phoneDisplay = slip.phone || (student ? student.phone : '0300-0000000');

                  return (
                    <tr key={slip.id}>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.studentName}</td>
                      <td>{slip.rollNo}</td>
                      <td><strong>{slip.classGrade}</strong> ({slip.section || 'A'})</td>
                      <td><span className="status-badge badge-active">{slip.campus}</span></td>
                      <td style={{ fontWeight: '700', color: '#0369a1' }}>{slip.month}</td>
                      <td style={{ fontWeight: '600' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: '600' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                      <td style={{ color: '#991b1b', fontWeight: '800', fontSize: '0.94rem' }}>
                        Rs {remaining.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>
                        <a href={`tel:${phoneDisplay}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          📞 {phoneDisplay}
                        </a>
                      </td>
                      <td>
                        <span className={`status-badge ${slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {slip.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => handleCopyWhatsAppReminder(slip)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Copy formatted WhatsApp/SMS reminder message"
                          >
                            💬 Copy SMS
                          </button>
                          <button
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => setReminderNoticeToPrint(slip)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Print official fee overdue notice"
                          >
                            🖨️ Notice
                          </button>
                          <button
                            type="button"
                            className="action-btn-primary"
                            onClick={() => onOpenPaymentModal(slip)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', background: '#059669', borderColor: '#059669' }}
                            title="Collect payment on counter"
                          >
                            Collect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {reminderSlips.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: '#059669', fontWeight: '700' }}>
                      ✓ Outstanding fee clear! No pending reminders found for selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Challan Modal */}
      {slipToDelete && (
        <div className="modal-overlay" onClick={() => setSlipToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Delete Fee Challan</h3>
              <button className="modal-close-btn" onClick={() => setSlipToDelete(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.92rem', color: '#1e293b', marginBottom: '8px' }}>
                Are you sure you want to delete Fee Challan <strong>{slipToDelete.challanNo}</strong> for <strong>{slipToDelete.studentName}</strong>?
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Total amount: <strong>Rs {slipToDelete.totalAmount?.toLocaleString()}</strong> · Month: <strong>{slipToDelete.month}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setSlipToDelete(null)}>Cancel</button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  deleteFeeSlip(slipToDelete.id);
                  setSlipToDelete(null);
                }}
              >
                Confirm Delete Challan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Reminder Notice Modal */}
      {reminderNoticeToPrint && (
        <div className="modal-overlay" onClick={() => setReminderNoticeToPrint(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3 className="modal-title">Official Fee Overdue Reminder Notice</h3>
              <button className="modal-close-btn" onClick={() => setReminderNoticeToPrint(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f1d38', paddingBottom: '12px', marginBottom: '16px' }}>
                <SchoolLogo size={44} />
                <h2 style={{ margin: '8px 0 2px', color: '#0f1d38', fontSize: '1.2rem', fontWeight: '800' }}>
                  SHEZAD CHILDREN ACADEMY
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: '700' }}>
                  Accounts & Finance Department — {reminderNoticeToPrint.campus} Campus · Helpline: 0313 9413450
                </div>
              </div>

              <div style={{ marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: '800' }}>
                  URGENT: FEE PAYMENT REMINDER NOTICE
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '4px' }}>
                  Billing Month: <strong>{reminderNoticeToPrint.month}</strong> · Challan No: <strong>{reminderNoticeToPrint.challanNo}</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.7, marginBottom: '16px' }}>
                <p><strong>To: Parent / Guardian of {reminderNoticeToPrint.studentName}</strong></p>
                <p>Roll No: <strong>{reminderNoticeToPrint.rollNo}</strong> | Class: <strong>{reminderNoticeToPrint.classGrade} ({reminderNoticeToPrint.section || 'A'})</strong> | Contact: <strong>{reminderNoticeToPrint.phone}</strong></p>
                <p>This is to inform you that the school fee for the month of <strong>{reminderNoticeToPrint.month}</strong> is currently overdue.</p>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: '0.84rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0' }}>Total Fee Billed:</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }}>Rs {reminderNoticeToPrint.totalAmount?.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0' }}>Amount Paid:</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: '700' }}>Rs {reminderNoticeToPrint.amountPaid?.toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid #0f1d38', background: '#fff1f2' }}>
                      <td style={{ padding: '8px 4px', fontWeight: '800', color: '#991b1b' }}>Net Outstanding Balance:</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#991b1b', padding: '8px 4px' }}>
                        Rs {Math.max(0, (reminderNoticeToPrint.totalAmount || 0) - (reminderNoticeToPrint.amountPaid || 0)).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Please deposit the remaining dues immediately at the campus accounts counter or online to avoid inconvenience.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#64748b' }}>
                <div>Issued Date: {new Date().toLocaleDateString()}</div>
                <div>Authorized Signatory / Accountant</div>
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="action-btn-secondary" onClick={() => setReminderNoticeToPrint(null)}>Close</button>
              <button className="action-btn-primary" onClick={() => window.print()}>🖨️ Print Notice</button>
            </div>
          </div>
        </div>
      )}

      {/* Official 2-Copy Printable Bank Challan Modal (Bank Copy completely removed; School Copy & Student Copy) */}
      {slipsToPrint.length > 0 && (
        <div className="modal-overlay" onClick={() => setSlipsToPrint([])}>
          <div className="modal-content wide" style={{ maxWidth: '1050px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div>
                <h3 className="modal-title">
                  Official 2-Copy Fee Challan Vouchers ({slipsToPrint.length} Student{slipsToPrint.length > 1 ? 's' : ''})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Standard 2-part format (School Copy & Student Copy) with full breakdown & contact numbers
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSlipsToPrint([])}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
              {slipsToPrint.map((slip, slipIdx) => {
                const subtotal = slip.subtotal || (
                  (slip.tuitionFee || 0) + 
                  (slip.transportFee || 0) + 
                  (slip.admissionFee || 0) + 
                  (slip.examFee || 0) + 
                  (slip.miscCharges || 0)
                );
                const discount = slip.discount || 0;
                const netPayable = slip.totalAmount || (subtotal - discount);
                const amountPaid = slip.amountPaid || 0;
                const remaining = Math.max(0, netPayable - amountPaid);
                const student = allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                const contactNumber = slip.phone || (student ? student.phone : '0300-1234567');
                const fatherName = slip.fatherName || (student ? student.fatherName : 'Guardian');

                return (
                  <div 
                    key={slip.id || slipIdx} 
                    className="printable-challan-sheet"
                  >
                    {/* 2 Equal Copies: School Copy and Student Copy */}
                    <div className="challan-two-parts">
                      {['School Copy', 'Student / Parent Copy'].map((copyName, idx) => (
                        <div key={idx} className="challan-copy">
                          {/* School Header */}
                          <div className="challan-school-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <SchoolLogo size={36} />
                              <div>
                                <div className="challan-school-name">SHEZAD CHILDREN ACADEMY</div>
                                <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '700' }}>
                                  Schools & Colleges ({slip.campus} Campus) · Contact: <strong>0313 9413450</strong>
                                </div>
                              </div>
                            </div>
                            <div className="challan-copy-type">{copyName}</div>
                          </div>

                          {/* Student & Challan Meta */}
                          <div className="challan-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: '0.78rem', marginBottom: '8px', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div><strong>Challan #:</strong> {slip.challanNo}</div>
                            <div><strong>Issue Date:</strong> {slip.issueDate || '2026-04-01'}</div>
                            <div><strong>Student Name:</strong> {slip.studentName}</div>
                            <div><strong style={{ color: '#dc2626' }}>Due Date:</strong> {slip.dueDate}</div>
                            <div><strong>Father Name:</strong> {fatherName}</div>
                            <div><strong>Roll No:</strong> {slip.rollNo}</div>
                            <div><strong>Class & Sec:</strong> {slip.classGrade} ({slip.section || 'A'})</div>
                            <div><strong>Helpline #:</strong> <strong style={{ color: '#0369a1' }}>0313 9413450</strong></div>
                            <div style={{ gridColumn: 'span 2', color: '#0369a1', fontWeight: '700' }}>
                              Billing Month: {slip.month} · Student Cell: {contactNumber}
                            </div>
                          </div>

                          {/* Itemized Fee Table */}
                          <table className="challan-fee-table">
                            <thead>
                              <tr>
                                <th>Fee Particulars</th>
                                <th style={{ textAlign: 'right' }}>Amount (Rs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Monthly Tuition Fee</td>
                                <td style={{ textAlign: 'right' }}>{Number(slip.tuitionFee || 0).toLocaleString()}</td>
                              </tr>
                              {slip.transportFee > 0 && (
                                <tr>
                                  <td>Transport Charges</td>
                                  <td style={{ textAlign: 'right' }}>{Number(slip.transportFee).toLocaleString()}</td>
                                </tr>
                              )}
                              {slip.admissionFee > 0 && (
                                <tr>
                                  <td>Admission Fee / Arrears</td>
                                  <td style={{ textAlign: 'right' }}>{Number(slip.admissionFee).toLocaleString()}</td>
                                </tr>
                              )}
                              {slip.examFee > 0 && (
                                <tr>
                                  <td>Examination & Assessment Fee</td>
                                  <td style={{ textAlign: 'right' }}>{Number(slip.examFee).toLocaleString()}</td>
                                </tr>
                              )}
                              {slip.miscCharges > 0 && (
                                <tr>
                                  <td>Misc Charges {slip.miscDescription ? `(${slip.miscDescription})` : ''}</td>
                                  <td style={{ textAlign: 'right' }}>{Number(slip.miscCharges).toLocaleString()}</td>
                                </tr>
                              )}
                              <tr style={{ background: '#f8fafc', fontWeight: '600' }}>
                                <td>Subtotal</td>
                                <td style={{ textAlign: 'right' }}>Rs {subtotal.toLocaleString()}</td>
                              </tr>
                              {discount > 0 && (
                                <tr style={{ color: '#059669', fontWeight: '700' }}>
                                  <td>Fee Concession / Discount {slip.discountPercent ? `(${slip.discountPercent}%)` : ''}</td>
                                  <td style={{ textAlign: 'right' }}>-Rs {Number(discount).toLocaleString()}</td>
                                </tr>
                              )}
                              <tr className="challan-total-row">
                                <td><strong>Net Payable Amount</strong></td>
                                <td style={{ textAlign: 'right' }}><strong>Rs {netPayable.toLocaleString()}</strong></td>
                              </tr>
                              {amountPaid > 0 && (
                                <tr>
                                  <td style={{ color: '#059669', fontWeight: '600' }}>Amount Paid</td>
                                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: '700' }}>Rs {amountPaid.toLocaleString()}</td>
                                </tr>
                              )}
                              {remaining > 0 && amountPaid > 0 && (
                                <tr style={{ color: '#991b1b', fontWeight: '700' }}>
                                  <td>Remaining Balance</td>
                                  <td style={{ textAlign: 'right' }}>Rs {remaining.toLocaleString()}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
                            <p style={{ margin: 0 }}>* Official Accounts Helpline / WhatsApp: <strong>0313 9413450</strong></p>
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
              <button className="action-btn-secondary" onClick={() => setSlipsToPrint([])}>
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
                <span><strong>Print {slipsToPrint.length} Fee Challan Voucher{slipsToPrint.length > 1 ? 's' : ''}</strong></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° STUDENT DETAILS & COMPLETE FEE LEDGER MODAL */}
      <StudentDetailsModal
        student={selectedStudentForDetails}
        isOpen={Boolean(selectedStudentForDetails)}
        onClose={() => setSelectedStudentForDetails(null)}
        onOpenPaymentModal={onOpenPaymentModal}
        onOpenFeeModal={onOpenFeeModal}
      />
    </div>
  );
}
