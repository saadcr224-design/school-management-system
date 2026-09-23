import React, { useState, useMemo } from 'react';
import { useApp, getStudentYearlyFeeLedger } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';

export default function StudentDetailsModal({ 
  student, 
  isOpen, 
  onClose, 
  onOpenPaymentModal, 
  onOpenFeeModal,
  onOpenEditStudent,
  onOpenEditFeeStructure
}) {
  const { feeSlips, campuses, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'fee_structure', 'history', 'id_card'

  if (!isOpen || !student) return null;

  // Student 12-Month Academic Year Ledger (April–March)
  const yearlyLedger = getStudentYearlyFeeLedger(student, feeSlips);
  const studentSlips = feeSlips.filter(s => s.studentId === student.id || s.rollNo === student.rollNo);
  
  const totalBilled = yearlyLedger.totals.totalAnnualFee;
  const totalPaid = yearlyLedger.totals.totalPaid;
  const outstanding = yearlyLedger.totals.totalRemaining;
  const isFeePaid = outstanding === 0;

  // Latest unpaid month/slip
  const firstUnpaidMonth = yearlyLedger.months.find(m => m.status !== 'Paid');

  const handlePayFeeClick = (monthData = null) => {
    const targetMonth = monthData || firstUnpaidMonth;
    if (targetMonth && targetMonth.slipId && onOpenPaymentModal) {
      const liveSlip = feeSlips.find(s => s.id === targetMonth.slipId);
      if (liveSlip) {
        onOpenPaymentModal(liveSlip);
        onClose();
        return;
      }
    }
    
    if (onOpenPaymentModal) {
      const monthLabel = targetMonth ? targetMonth.fullMonthLabel : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const dueAmount = targetMonth ? targetMonth.remaining : (outstanding > 0 ? outstanding : ((student.monthlyFee || 4500) + (student.transportFee || 0)));
      
      onOpenPaymentModal({
        id: 'virtual-' + student.id + '-' + (targetMonth ? targetMonth.month : 'current'),
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classGrade: student.classGrade,
        section: student.section || 'A',
        campus: student.campus,
        month: monthLabel,
        tuitionFee: targetMonth ? targetMonth.tuitionFee : (student.monthlyFee || 4500),
        transportFee: targetMonth ? targetMonth.transportFee : (student.transportFee || 0),
        admissionFee: targetMonth ? targetMonth.admissionFee : 0,
        examFee: targetMonth ? targetMonth.examFee : 0,
        miscCharges: targetMonth ? targetMonth.miscCharges : 0,
        subtotal: targetMonth ? targetMonth.subtotal : ((student.monthlyFee || 4500) + (student.transportFee || 0)),
        discount: targetMonth ? targetMonth.discount : 0,
        totalAmount: dueAmount,
        amountPaid: 0,
        phone: student.phone,
        status: 'Unpaid'
      });
      onClose();
    }
  };

  const handleWhatsAppClick = () => {
    const msg = `*STUDENT FINANCIAL LEDGER & ACADEMIC NOTICE*\nDear Parent of ${student.name} (Roll #${student.rollNo}, Class ${student.classGrade}),\nCampus: ${student.campus}\nSession: 2026–2027 (April–March)\nTotal Annual Fee: Rs. ${totalBilled.toLocaleString()}\nTotal Paid: Rs. ${totalPaid.toLocaleString()}\nRemaining Balance: Rs. ${outstanding.toLocaleString()}.\nStatus: ${isFeePaid ? 'Cleared (Paid in Full)' : `Outstanding Arrears of Rs. ${outstanding.toLocaleString()}`}.\n\n_Shezad Children Academy Administration_`;
    navigator.clipboard.writeText(msg);
    showToast(`✓ Student financial statement copied to clipboard!`, 'success');
  };

  const handleExportYearlyLedgerCSV = () => {
    let csvContent = `data:text/csv;charset=utf-8,Student Name,Roll No,Class,Campus,Month,Tuition Fee,Transport Fee,Admission Fee,Exam Fee,Misc Charges,Discount,Net Monthly Fee,Amount Paid,Remaining Balance,Status,Payment Date,Payment Method,Receipt/Ref #\n`;
    
    yearlyLedger.months.forEach(m => {
      const row = [
        `"${student.name}"`,
        `"${student.rollNo}"`,
        `"${student.classGrade}"`,
        `"${student.campus}"`,
        `"${m.fullMonthLabel}"`,
        m.tuitionFee,
        m.transportFee,
        m.admissionFee,
        m.examFee,
        m.miscCharges,
        m.discount,
        m.totalAmount,
        m.amountPaid,
        m.remaining,
        `"${m.status}"`,
        `"${m.paidDate}"`,
        `"${m.paymentMethod}"`,
        `"${m.challanNo}"`
      ].join(',');
      csvContent += row + '\n';
    });

    // Add totals row
    csvContent += `\n"ANNUAL TOTALS","","","","",${yearlyLedger.totals.totalTuition},${yearlyLedger.totals.totalTransport},${yearlyLedger.totals.totalAdmission},${yearlyLedger.totals.totalExam},${yearlyLedger.totals.totalMisc},${yearlyLedger.totals.totalDiscount},${yearlyLedger.totals.totalAnnualFee},${yearlyLedger.totals.totalPaid},${yearlyLedger.totals.totalRemaining},"","","",""\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yearly_Ledger_${student.rollNo}_${student.name.replace(/\s+/g, '_')}_2026_2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported complete 12-month ledger for ${student.name}!`, 'success');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Student Profile Banner */}
        <div style={{ background: 'linear-gradient(135deg, #0f1d38 0%, #1e3a8a 100%)', color: '#fff', padding: '20px 24px', position: 'relative' }}>
          <button 
            className="modal-close-btn" 
            style={{ color: '#fff', position: 'absolute', right: '18px', top: '18px', fontSize: '1.2rem', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            ✕
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ 
              width: '68px', 
              height: '68px', 
              borderRadius: '50%', 
              background: '#0284c7', 
              border: '3px solid #ffffff', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.8rem', 
              fontWeight: '800',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              {student.name.charAt(0)}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: '#ffffff' }}>{student.name}</h2>
                <span className="status-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '3px 10px' }}>
                  Roll #{student.rollNo}
                </span>
                <span className="status-badge" style={{ background: '#0284c7', color: '#fff' }}>
                  Class {student.classGrade} ({student.section || 'A'})
                </span>
                <span className="status-badge" style={{ background: '#3b82f6', color: '#fff' }}>
                  {student.campus} Campus
                </span>
              </div>
              <div style={{ fontSize: '0.86rem', color: '#cbd5e1', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span>Father: <strong>{student.fatherName || 'N/A'}</strong></span>
                <span>Phone: <strong style={{ color: '#38bdf8' }}>{student.phone || 'N/A'}</strong></span>
                <span>Admission: <strong>{student.admissionDate || '2026-04-01'}</strong></span>
              </div>
            </div>

            {/* Fee Status Badge on Top Header */}
            <div>
              {isFeePaid ? (
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '8px 16px', borderRadius: '10px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>FEE STATUS</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800' }}>✓ Fee Paid</div>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '8px 16px', borderRadius: '10px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>FEE STATUS</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800' }}>! Due: Rs {outstanding.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons inside Banner */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isFeePaid && (
              <button 
                type="button" 
                onClick={handlePayFeeClick}
                style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
              >
                💳 Pay / Collect Fee (Rs {outstanding.toLocaleString()})
              </button>
            )}

            {isFeePaid && onOpenFeeModal && (
              <button 
                type="button" 
                onClick={() => { onClose(); onOpenFeeModal(); }}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                📄 Generate Next Month Challan
              </button>
            )}

            <button 
              type="button" 
              onClick={handleWhatsAppClick}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '7px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              💬 Copy WhatsApp SMS
            </button>

            {onOpenEditStudent && (
              <button 
                type="button" 
                onClick={() => { onClose(); onOpenEditStudent(student); }}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', padding: '7px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Modal Navigation Sub-Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '0 20px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{ 
              padding: '12px 18px', 
              border: 'none', 
              background: 'none', 
              borderBottom: activeTab === 'overview' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'overview' ? '#0f1d38' : '#64748b',
              fontWeight: activeTab === 'overview' ? '700' : '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            👤 Personal & Academic Profile
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('fee_structure')}
            style={{ 
              padding: '12px 18px', 
              border: 'none', 
              background: 'none', 
              borderBottom: activeTab === 'fee_structure' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'fee_structure' ? '#0f1d38' : '#64748b',
              fontWeight: activeTab === 'fee_structure' ? '700' : '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            💰 Fee Structure & Transport
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('history')}
            style={{ 
              padding: '12px 18px', 
              border: 'none', 
              background: 'none', 
              borderBottom: activeTab === 'history' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'history' ? '#0f1d38' : '#64748b',
              fontWeight: activeTab === 'history' ? '700' : '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            📜 Complete Yearly Fee Ledger (12 Months Apr–Mar)
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('id_card')}
            style={{ 
              padding: '12px 18px', 
              border: 'none', 
              background: 'none', 
              borderBottom: activeTab === 'id_card' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'id_card' ? '#0f1d38' : '#64748b',
              fontWeight: activeTab === 'id_card' ? '700' : '600',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            🪪 Student ID Card
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* TAB 1: Overview & Personal Details */}
          {activeTab === 'overview' && (
            <div>
              {/* Financial Snapshot mini-cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Annual Billed Fee</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f1d38', marginTop: '3px' }}>
                    Rs {totalBilled.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Full Year (12 Months)</span>
                </div>

                <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '10px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: '700', textTransform: 'uppercase' }}>Total Fee Paid</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginTop: '3px' }}>
                    Rs {totalPaid.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#065f46' }}>{yearlyLedger.totals.paidMonthsCount} Months Cleared</span>
                </div>

                <div style={{ background: outstanding > 0 ? '#fef2f2' : '#f8fafc', padding: '14px', borderRadius: '10px', border: `1px solid ${outstanding > 0 ? '#fecaca' : '#e2e8f0'}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: outstanding > 0 ? '#991b1b' : '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Balance</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: outstanding > 0 ? '#dc2626' : '#059669', marginTop: '3px' }}>
                    Rs {outstanding.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: outstanding > 0 ? '#991b1b' : '#059669', fontWeight: '700' }}>
                    {outstanding > 0 ? `${yearlyLedger.totals.unpaidMonthsCount + yearlyLedger.totals.partialMonthsCount} Months Pending` : '✓ No Dues Pending'}
                  </span>
                </div>
              </div>

              {/* Personal & Academic Details Grid */}
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.98rem', color: '#0f1d38', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  📋 Complete Student Records & Enrollment Information
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>FULL NAME</span>
                    <strong style={{ color: '#0f1d38' }}>{student.name}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>ROLL NUMBER / ID</span>
                    <strong style={{ color: '#0284c7' }}>{student.rollNo}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>FATHER'S NAME</span>
                    <strong style={{ color: '#0f1d38' }}>{student.fatherName || 'Not Specified'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>CLASS & SECTION</span>
                    <strong style={{ color: '#0f1d38' }}>{student.classGrade} ({student.section || 'A'})</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>CAMPUS</span>
                    <strong style={{ color: '#0f1d38' }}>{student.campus} Campus</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>CONTACT PHONE</span>
                    <strong style={{ color: '#0369a1' }}>
                      <a href={`tel:${student.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                        📞 {student.phone || '0300-0000000'}
                      </a>
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>DATE OF BIRTH</span>
                    <strong style={{ color: '#0f1d38' }}>{student.dob || '2015-05-12'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>GENDER</span>
                    <strong style={{ color: '#0f1d38' }}>{student.gender || 'Male'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#0f1d38' }}>{student.bloodGroup || 'B+'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>ADMISSION DATE</span>
                    <strong style={{ color: '#0f1d38' }}>{student.admissionDate || '2026-04-01'}</strong>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.76rem', fontWeight: '700' }}>RESIDENTIAL ADDRESS</span>
                    <strong style={{ color: '#0f1d38' }}>{student.address || 'House #12, Street 4, Satellite Town'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Fee Structure & Transport Details */}
          {activeTab === 'fee_structure' && (
            <div>
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0f1d38' }}>
                    💰 Assigned Monthly Fee Package & Transport Route
                  </h4>
                  {onOpenEditFeeStructure && (
                    <button 
                      type="button" 
                      className="action-btn-secondary" 
                      onClick={() => { onClose(); onOpenEditFeeStructure(student); }}
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      ✏️ Edit Fee Structure
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: '700' }}>MONTHLY TUITION FEE</span>
                    <strong style={{ color: '#0f1d38', fontSize: '1.15rem' }}>Rs {student.monthlyFee?.toLocaleString() || '4,500'}</strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: '700' }}>TRANSPORT CHARGES</span>
                    <strong style={{ color: student.transportFee > 0 ? '#0284c7' : '#64748b', fontSize: '1.15rem' }}>
                      {student.transportFee > 0 ? `Rs ${student.transportFee?.toLocaleString()}` : 'No Transport (Rs 0)'}
                    </strong>
                    {student.transportFee > 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '3px' }}>
                        Route: <strong>{student.transportRoute || 'Assigned Van'}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: '700' }}>TOTAL MONTHLY BILLING</span>
                    <strong style={{ color: '#059669', fontSize: '1.15rem' }}>
                      Rs {((student.monthlyFee || 4500) + (student.transportFee || 0)).toLocaleString()} / Month
                    </strong>
                  </div>
                </div>

                {student.feeHistory && student.feeHistory.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h5 style={{ margin: '0 0 10px', fontSize: '0.86rem', color: '#475569' }}>📜 Historical Fee Revisions</h5>
                    <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                      {student.feeHistory.map((h, i) => (
                        <div key={i} style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '6px' }}>
                          📅 Effective <strong>{h.effectiveDate}</strong>: Tuition Rs {h.monthlyFee?.toLocaleString()}, Transport Rs {h.transportFee?.toLocaleString()} ({h.reason || 'Session revision'})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Complete 12-Month Academic Year Financial Ledger (April–March) */}
          {activeTab === 'history' && (
            <div>
              {/* Ledger Summary Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.02rem', color: '#0f1d38', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📜 Full Academic Year Financial Ledger (April 2026 → March 2027)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Complete 12-month schedule showing Monthly Fee &rarr; Paid &rarr; Remaining. Unpaid months are permanently tracked.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="action-btn-secondary" 
                    onClick={handleExportYearlyLedgerCSV}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    📥 Export Ledger CSV
                  </button>
                  {onOpenFeeModal && (
                    <button 
                      type="button" 
                      className="action-btn-primary" 
                      onClick={() => { onClose(); onOpenFeeModal(); }}
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      + Generate Custom Challan
                    </button>
                  )}
                </div>
              </div>

              {/* Annual Summary KPI Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>TOTAL ANNUAL FEE</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f1d38', marginTop: '2px' }}>
                    Rs {yearlyLedger.totals.totalAnnualFee.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: '700' }}>TOTAL PAID</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                    Rs {yearlyLedger.totals.totalPaid.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: yearlyLedger.totals.totalRemaining > 0 ? '#fef2f2' : '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${yearlyLedger.totals.totalRemaining > 0 ? '#fecaca' : '#e2e8f0'}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: yearlyLedger.totals.totalRemaining > 0 ? '#991b1b' : '#64748b', fontWeight: '700' }}>REMAINING BALANCE</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: yearlyLedger.totals.totalRemaining > 0 ? '#dc2626' : '#059669', marginTop: '2px' }}>
                    Rs {yearlyLedger.totals.totalRemaining.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '700' }}>TOTAL DISCOUNT</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
                    Rs {yearlyLedger.totals.totalDiscount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 12 Months Ledger Table */}
              <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="custom-table" style={{ fontSize: '0.82rem', margin: 0 }}>
                  <thead style={{ background: '#0f1d38', color: '#ffffff' }}>
                    <tr>
                      <th style={{ color: '#fff' }}>#</th>
                      <th style={{ color: '#fff' }}>Academic Month</th>
                      <th style={{ color: '#fff' }}>Challan / Ref #</th>
                      <th style={{ color: '#fff' }}>Tuition Fee</th>
                      <th style={{ color: '#fff' }}>Transport</th>
                      <th style={{ color: '#fff' }}>Adm/Misc</th>
                      <th style={{ color: '#fff' }}>Discount</th>
                      <th style={{ color: '#fff' }}>Net Monthly Fee</th>
                      <th style={{ color: '#fff' }}>Paid Amount</th>
                      <th style={{ color: '#fff' }}>Remaining</th>
                      <th style={{ color: '#fff' }}>Status</th>
                      <th style={{ color: '#fff' }}>Payment Date</th>
                      <th style={{ color: '#fff', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyLedger.months.map((m, idx) => {
                      const admAndMisc = (m.admissionFee || 0) + (m.examFee || 0) + (m.miscCharges || 0);
                      const isUnpaidOrPartial = m.status !== 'Paid';
                      
                      return (
                        <tr 
                          key={m.fullMonthLabel}
                          style={{ 
                            background: m.status === 'Paid' ? '#ffffff' : m.status === 'Partial' ? '#fffbeb' : '#ffffff' 
                          }}
                        >
                          <td style={{ fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '700', color: '#0f1d38' }}>
                            {m.fullMonthLabel}
                          </td>
                          <td style={{ color: m.challanNo !== '—' ? '#0284c7' : '#94a3b8', fontWeight: '600' }}>
                            {m.challanNo}
                          </td>
                          <td>Rs {m.tuitionFee?.toLocaleString()}</td>
                          <td style={{ color: m.transportFee > 0 ? '#0284c7' : '#64748b' }}>
                            {m.transportFee > 0 ? `Rs ${m.transportFee.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ color: admAndMisc > 0 ? '#d97706' : '#64748b' }}>
                            {admAndMisc > 0 ? `Rs ${admAndMisc.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ color: m.discount > 0 ? '#059669' : '#64748b' }}>
                            {m.discount > 0 ? `-Rs ${m.discount.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontWeight: '700', color: '#0f1d38' }}>
                            Rs {m.totalAmount?.toLocaleString()}
                          </td>
                          <td style={{ color: '#059669', fontWeight: '700' }}>
                            Rs {m.amountPaid?.toLocaleString()}
                          </td>
                          <td style={{ color: m.remaining > 0 ? '#dc2626' : '#059669', fontWeight: '800' }}>
                            Rs {m.remaining?.toLocaleString()}
                          </td>
                          <td>
                            <span className={`status-badge ${m.status === 'Paid' ? 'badge-paid' : m.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {m.paidDate !== '—' ? m.paidDate : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isUnpaidOrPartial && (
                              <button
                                type="button"
                                className="action-btn-primary"
                                onClick={() => handlePayFeeClick(m)}
                                style={{ padding: '4px 10px', fontSize: '0.74rem', background: '#059669', borderColor: '#059669', whiteSpace: 'nowrap' }}
                              >
                                💳 Pay (Rs {m.remaining.toLocaleString()})
                              </button>
                            )}
                            {!isUnpaidOrPartial && (
                              <span style={{ color: '#059669', fontSize: '0.78rem', fontWeight: '700' }}>✓ Cleared</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Annual Totals Footer */}
                  <tfoot style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'left', color: '#0f1d38' }}>ANNUAL TOTALS (12 Months)</td>
                      <td>Rs {yearlyLedger.totals.totalTuition.toLocaleString()}</td>
                      <td>Rs {yearlyLedger.totals.totalTransport.toLocaleString()}</td>
                      <td>Rs {(yearlyLedger.totals.totalAdmission + yearlyLedger.totals.totalExam + yearlyLedger.totals.totalMisc).toLocaleString()}</td>
                      <td style={{ color: '#059669' }}>-Rs {yearlyLedger.totals.totalDiscount.toLocaleString()}</td>
                      <td style={{ color: '#0f1d38', fontSize: '0.9rem' }}>Rs {yearlyLedger.totals.totalAnnualFee.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontSize: '0.9rem' }}>Rs {yearlyLedger.totals.totalPaid.toLocaleString()}</td>
                      <td style={{ color: yearlyLedger.totals.totalRemaining > 0 ? '#dc2626' : '#059669', fontSize: '0.9rem' }}>
                        Rs {yearlyLedger.totals.totalRemaining.toLocaleString()}
                      </td>
                      <td colSpan="3" style={{ textAlign: 'right', color: '#64748b', fontSize: '0.76rem' }}>
                        {yearlyLedger.totals.paidMonthsCount}/12 Months Cleared
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Printable Student ID Card */}
          {activeTab === 'id_card' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
              <div style={{ 
                width: '320px', 
                borderRadius: '14px', 
                overflow: 'hidden', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
                background: '#fff', 
                border: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                <div style={{ background: 'linear-gradient(135deg, #0f1d38 0%, #1e3a8a 100%)', color: '#fff', padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                    <SchoolLogo width={36} height={36} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                    SHEZAD CHILDREN ACADEMY
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    STUDENT IDENTITY CARD
                  </span>
                </div>

                <div style={{ padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: '#0284c7', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.6rem', 
                    fontWeight: '800', 
                    margin: '0 auto 10px',
                    border: '3px solid #e0f2fe'
                  }}>
                    {student.name.charAt(0)}
                  </div>
                  
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.15rem', color: '#0f1d38' }}>{student.name}</h3>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                    Father: <strong>{student.fatherName || 'N/A'}</strong>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'left', lineHeight: '1.6', border: '1px solid #f1f5f9' }}>
                    <div>Roll No: <strong style={{ color: '#0284c7' }}>{student.rollNo}</strong></div>
                    <div>Class & Sec: <strong>{student.classGrade} ({student.section || 'A'})</strong></div>
                    <div>Campus: <strong>{student.campus}</strong></div>
                    <div>Contact Phone: <strong>{student.phone}</strong></div>
                    <div>Blood Group: <strong>{student.bloodGroup || 'B+'}</strong></div>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '8px', textAlign: 'center', fontSize: '0.68rem', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                  Authorized Signatory · Session 2026–2027
                </div>
              </div>

              <button 
                type="button" 
                className="action-btn-primary" 
                onClick={() => window.print()}
                style={{ padding: '8px 20px', fontSize: '0.88rem' }}
              >
                🖨️ Print Student ID Card
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            System ID: <code style={{ color: '#0284c7' }}>{student.id}</code>
          </div>
          <button type="button" className="action-btn-secondary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
