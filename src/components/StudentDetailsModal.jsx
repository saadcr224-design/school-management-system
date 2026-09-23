import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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

  // Student specific slips
  const studentSlips = feeSlips.filter(s => s.studentId === student.id || s.rollNo === student.rollNo);
  const totalBilled = studentSlips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalPaid = studentSlips.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const initialBal = student.balance || 0;
  const outstanding = Math.max(0, totalBilled - totalPaid) + (studentSlips.length === 0 ? initialBal : 0);
  const isFeePaid = outstanding === 0;

  // Latest unpaid slip
  const latestUnpaidSlip = studentSlips.find(s => s.status !== 'Paid' || (s.totalAmount - (s.amountPaid || 0) > 0));

  const handlePayFeeClick = () => {
    if (latestUnpaidSlip && onOpenPaymentModal) {
      onOpenPaymentModal(latestUnpaidSlip);
      onClose();
    } else if (onOpenPaymentModal) {
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      onOpenPaymentModal({
        id: 'virtual-' + student.id,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classGrade: student.classGrade,
        section: student.section || 'A',
        campus: student.campus,
        month: currentMonth,
        subtotal: (student.monthlyFee || 4500) + (student.transportFee || 0),
        discount: 0,
        totalAmount: outstanding > 0 ? outstanding : ((student.monthlyFee || 4500) + (student.transportFee || 0)),
        amountPaid: 0,
        phone: student.phone,
        status: 'Unpaid'
      });
      onClose();
    }
  };

  const handleWhatsAppClick = () => {
    const msg = `*STUDENT DETAILS & ACADEMIC NOTICE*\nDear Parent of ${student.name} (Roll #${student.rollNo}, Class ${student.classGrade}),\nCampus: ${student.campus}\nCurrent Fee Status: ${isFeePaid ? 'Cleared (Paid)' : `Outstanding Arrears of Rs. ${outstanding.toLocaleString()}`}.\n\n_Shezad Children Academy Administration_`;
    navigator.clipboard.writeText(msg);
    showToast(`✓ Student information copied to clipboard!`, 'success');
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
            📜 Fee Slips & Payment History ({studentSlips.length})
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
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Billed</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f1d38', marginTop: '3px' }}>
                    Rs {totalBilled.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{studentSlips.length} vouchers</span>
                </div>

                <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '10px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: '700', textTransform: 'uppercase' }}>Total Fee Paid</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669', marginTop: '3px' }}>
                    Rs {totalPaid.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#065f46' }}>Received in accounts</span>
                </div>

                <div style={{ background: outstanding > 0 ? '#fef2f2' : '#f8fafc', padding: '14px', borderRadius: '10px', border: `1px solid ${outstanding > 0 ? '#fecaca' : '#e2e8f0'}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: outstanding > 0 ? '#991b1b' : '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Balance</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: outstanding > 0 ? '#dc2626' : '#059669', marginTop: '3px' }}>
                    Rs {outstanding.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: outstanding > 0 ? '#991b1b' : '#059669', fontWeight: '700' }}>
                    {outstanding > 0 ? 'Pending Payment' : '✓ No Dues Pending'}
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

          {/* TAB 3: Fee Slips & Payment History */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0f1d38' }}>
                  📜 All Issued Challans & Payment Ledger ({studentSlips.length})
                </h4>
                {onOpenFeeModal && (
                  <button 
                    type="button" 
                    className="action-btn-primary" 
                    onClick={() => { onClose(); onOpenFeeModal(); }}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    + Generate New Challan
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="custom-table" style={{ fontSize: '0.84rem' }}>
                  <thead>
                    <tr>
                      <th>Challan #</th>
                      <th>Month</th>
                      <th>Class</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Net Payable</th>
                      <th>Amount Paid</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSlips.map(slip => {
                      const remaining = Math.max(0, (slip.totalAmount || 0) - (slip.amountPaid || 0));
                      return (
                        <tr key={slip.id}>
                          <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                          <td style={{ fontWeight: '600', color: '#0369a1' }}>{slip.month}</td>
                          <td>{slip.classGrade}</td>
                          <td>Rs {(slip.subtotal || slip.totalAmount)?.toLocaleString()}</td>
                          <td style={{ color: slip.discount > 0 ? '#059669' : '#64748b' }}>
                            {slip.discount > 0 ? `-Rs ${slip.discount?.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontWeight: '700', color: '#0f1d38' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                          <td style={{ color: '#059669', fontWeight: '700' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                          <td style={{ color: remaining > 0 ? '#991b1b' : '#64748b', fontWeight: '700' }}>
                            Rs {remaining.toLocaleString()}
                          </td>
                          <td>
                            <span className={`status-badge ${slip.status === 'Paid' ? 'badge-paid' : slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                              {slip.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              {slip.status !== 'Paid' && (
                                <button
                                  type="button"
                                  className="action-btn-primary"
                                  onClick={() => {
                                    onClose();
                                    if (onOpenPaymentModal) onOpenPaymentModal(slip);
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.74rem', background: '#059669', borderColor: '#059669' }}
                                >
                                  💳 Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {studentSlips.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No fee vouchers generated yet for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
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
