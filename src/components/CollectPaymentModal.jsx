import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function CollectPaymentModal({ slip, isOpen = false, onClose }) {
  const { payFeeSlip, allStudents, feeSlips, showToast, generateFeeSlip, campuses } = useApp();
  
  // Determine if this is opened for a specific pre-existing voucher or the general counter
  const hasSpecificSlip = Boolean(slip && slip.id && !String(slip.id).startsWith('virtual-') && slip.studentId);
  const isVisible = Boolean(slip || isOpen);

  // Filter and search state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState(slip?.studentId || (allStudents[0]?.id || ''));
  const [selectedSlipId, setSelectedSlipId] = useState(hasSpecificSlip ? slip.id : '');

  // Reset/sync selection when slip prop changes
  useEffect(() => {
    if (slip?.studentId) {
      setSelectedStudentId(slip.studentId);
      if (hasSpecificSlip) setSelectedSlipId(slip.id);
    } else if (allStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(allStudents[0].id);
    }
  }, [slip, hasSpecificSlip, allStudents]);

  // Filter students based on search term and campus
  const filteredStudents = useMemo(() => {
    const term = studentSearchTerm.trim().toLowerCase();
    return allStudents.filter(s => {
      if (selectedCampusFilter !== 'ALL' && s.campus !== selectedCampusFilter) {
        return false;
      }
      if (!term) return true;
      const nameMatch = s.name?.toLowerCase().includes(term);
      const rollMatch = s.rollNo?.toLowerCase().includes(term);
      const fatherMatch = s.fatherName?.toLowerCase().includes(term);
      const classMatch = s.classGrade?.toLowerCase().includes(term);
      const phoneMatch = s.phone?.includes(term);
      const campusMatch = s.campus?.toLowerCase().includes(term);
      return nameMatch || rollMatch || fatherMatch || classMatch || phoneMatch || campusMatch;
    });
  }, [allStudents, studentSearchTerm, selectedCampusFilter]);

  // If user searched and currently selected student is not in results, default to first filtered result
  useEffect(() => {
    if (!hasSpecificSlip && filteredStudents.length > 0) {
      const isStillInList = filteredStudents.some(s => s.id === selectedStudentId);
      if (!isStillInList) {
        setSelectedStudentId(filteredStudents[0].id);
        setSelectedSlipId('');
      }
    }
  }, [filteredStudents, selectedStudentId, hasSpecificSlip]);

  // Active target student
  const activeStudent = useMemo(() => {
    if (hasSpecificSlip) {
      return allStudents.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo) || allStudents[0];
    }
    return allStudents.find(s => s.id === selectedStudentId) || filteredStudents[0] || allStudents[0];
  }, [hasSpecificSlip, slip, selectedStudentId, filteredStudents, allStudents]);

  // Slips for the active student
  const activeStudentSlips = useMemo(() => {
    if (!activeStudent) return [];
    return feeSlips.filter(s => s.studentId === activeStudent.id || s.rollNo === activeStudent.rollNo);
  }, [activeStudent, feeSlips]);

  const unpaidSlips = useMemo(() => {
    return activeStudentSlips.filter(s => s.status !== 'Paid' || (s.totalAmount - (s.amountPaid || 0) > 0));
  }, [activeStudentSlips]);

  // Determine active target slip dynamically from live feeSlips context
  const liveSlip = hasSpecificSlip ? (feeSlips.find(s => s.id === slip.id) || slip) : null;
  const activeSlip = liveSlip || (unpaidSlips.find(s => s.id === selectedSlipId) || unpaidSlips[0] || activeStudentSlips[0] || null);

  const subtotal = activeSlip ? (activeSlip.subtotal || activeSlip.totalAmount || 0) : ((activeStudent?.monthlyFee || 4500) + (activeStudent?.transportFee || 0));
  const discount = activeSlip ? (activeSlip.discount || 0) : 0;
  const netPayable = activeSlip ? (activeSlip.totalAmount || (subtotal - discount)) : subtotal;
  const alreadyPaid = activeSlip ? (activeSlip.amountPaid || 0) : 0;
  const remaining = Math.max(0, netPayable - alreadyPaid);

  const contactPhone = activeSlip?.phone || activeStudent?.phone || '—';

  const [payAmount, setPayAmount] = useState(remaining || (activeStudent?.monthlyFee || 4500));
  const [paymentMode, setPaymentMode] = useState('Cash at Counter');
  const [receiptNumber, setReceiptNumber] = useState('RCP-' + Math.floor(1000 + Math.random() * 9000));
  const [remarks, setRemarks] = useState('Fee received in full');

  // Update payAmount when active target changes
  useEffect(() => {
    if (activeSlip) {
      const rem = Math.max(0, (activeSlip.totalAmount || 0) - (activeSlip.amountPaid || 0));
      setPayAmount(rem > 0 ? rem : (activeSlip.totalAmount || 4500));
    } else if (activeStudent) {
      const defaultAmt = (activeStudent.monthlyFee || 4500) + (activeStudent.transportFee || 0);
      setPayAmount(defaultAmt);
    }
  }, [activeSlip?.id, activeStudent?.id, selectedStudentId]);

  if (!isVisible) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!payAmount || payAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (activeSlip && activeSlip.id && !String(activeSlip.id).startsWith('virtual-')) {
      payFeeSlip(activeSlip.id, payAmount, paymentMode, remarks);
      showToast(`✓ Payment of Rs ${payAmount.toLocaleString()} recorded successfully for ${activeSlip.studentName}!`, 'success');
    } else if (activeStudent) {
      // Create on-the-spot fee slip and mark paid
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const newSlip = {
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        rollNo: activeStudent.rollNo,
        classGrade: activeStudent.classGrade,
        section: activeStudent.section || 'A',
        campus: activeStudent.campus,
        month: currentMonth,
        tuitionFee: activeStudent.monthlyFee || 4500,
        transportFee: activeStudent.transportFee || 0,
        admissionFee: 0,
        examFee: 0,
        miscCharges: 0,
        subtotal: (activeStudent.monthlyFee || 4500) + (activeStudent.transportFee || 0),
        discount: 0,
        totalAmount: payAmount,
        amountPaid: payAmount,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        phone: activeStudent.phone,
        status: 'Paid',
        paymentHistory: [{
          date: new Date().toISOString().split('T')[0],
          amount: payAmount,
          mode: paymentMode,
          receiptNo: receiptNumber,
          remarks: remarks
        }]
      };
      generateFeeSlip(newSlip);
      showToast(`✓ Fee payment of Rs ${payAmount.toLocaleString()} recorded and voucher generated for ${activeStudent.name}!`, 'success');
    }

    onClose();
  };

  const remainingAfterThisPay = Math.max(0, remaining - payAmount);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '640px', 
          width: '95%', 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          borderRadius: '12px'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div style={{ background: '#0f1d38', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 className="modal-title" style={{ color: '#fff', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💳 Pay Student Fee Counter
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Select any enrolled student, enter payment amount, and collect fees instantly
            </p>
          </div>
          <button className="modal-close-btn" style={{ color: '#fff', fontSize: '1.2rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>✕</button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            
            {/* Student Search & Picker for Universal Counter */}
            {!hasSpecificSlip && (
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: '800', margin: 0, color: '#0f1d38', fontSize: '0.88rem' }}>
                    🔍 Search & Select Student ({filteredStudents.length} of {allStudents.length} Students)
                  </label>
                  {studentSearchTerm && (
                    <button 
                      type="button" 
                      onClick={() => setStudentSearchTerm('')} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
                    >
                      ✕ Clear Search
                    </button>
                  )}
                </div>

                {/* Campus and Search Input */}
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', marginBottom: '8px' }}>
                  <select 
                    className="form-select"
                    value={selectedCampusFilter}
                    onChange={(e) => setSelectedCampusFilter(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="ALL">All Campuses</option>
                    {(campuses || []).map(c => (
                      <option key={c.id || c.code} value={c.code}>{c.code} Campus</option>
                    ))}
                  </select>

                  <input 
                    type="text" 
                    placeholder="Type name, roll no, father name, class..." 
                    className="form-input"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                    autoFocus
                  />
                </div>

                {/* Student Dropdown */}
                {filteredStudents.length > 0 ? (
                  <select 
                    className="form-select"
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      setSelectedSlipId('');
                    }}
                    style={{ fontWeight: '600', fontSize: '0.88rem', background: '#fff', borderColor: '#0369a1' }}
                  >
                    {filteredStudents.map(s => {
                      const sSlips = feeSlips.filter(sl => sl.studentId === s.id || sl.rollNo === s.rollNo);
                      const b = sSlips.reduce((acc, x) => acc + (x.totalAmount || 0), 0);
                      const p = sSlips.reduce((acc, x) => acc + (x.amountPaid || 0), 0);
                      const bal = Math.max(0, b - p);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.rollNo} — {s.name} s/d/o {s.fatherName || 'N/A'} (Class {s.classGrade} | {s.campus}) {bal > 0 ? `[🔴 Due: Rs ${bal.toLocaleString()}]` : `[🟢 Paid]`}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div style={{ padding: '10px', textAlign: 'center', background: '#fff', borderRadius: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No student found matching "{studentSearchTerm}". Try another keyword.
                  </div>
                )}
              </div>
            )}

            {/* If multiple vouchers exist for this student, allow picking voucher */}
            {unpaidSlips.length > 1 && !hasSpecificSlip && (
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Select Pending Fee Voucher / Challan</label>
                <select 
                  className="form-select"
                  value={selectedSlipId || unpaidSlips[0]?.id}
                  onChange={(e) => setSelectedSlipId(e.target.value)}
                  style={{ fontWeight: '600' }}
                >
                  {unpaidSlips.map(s => {
                    const rem = Math.max(0, (s.totalAmount || 0) - (s.amountPaid || 0));
                    return (
                      <option key={s.id} value={s.id}>
                        Challan #{s.challanNo} — {s.month} (Net: Rs {s.totalAmount?.toLocaleString()}, Pending: Rs {rem.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Student Info & Fee Summary Card */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: '800', color: '#0f1d38', fontSize: '1.08rem' }}>
                  {activeSlip?.studentName || activeStudent?.name}
                </span>
                <span className="status-badge badge-active">{activeSlip?.campus || activeStudent?.campus} Campus</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Father: <strong>{activeStudent?.fatherName || '—'}</strong> · Roll No: <strong>{activeSlip?.rollNo || activeStudent?.rollNo}</strong> · Class: <strong>{activeSlip?.classGrade || activeStudent?.classGrade} ({activeSlip?.section || activeStudent?.section || 'A'})</strong> · Phone: <strong style={{ color: '#0369a1' }}>{contactPhone}</strong>
              </div>
              
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.8rem' }}>
                <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>TOTAL CHARGES</span>
                  <strong style={{ color: '#0f1d38' }}>Rs {netPayable.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#059669', display: 'block', fontSize: '0.72rem' }}>ALREADY PAID</span>
                  <strong style={{ color: '#059669' }}>Rs {alreadyPaid.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#991b1b', display: 'block', fontSize: '0.72rem' }}>CURRENT BALANCE</span>
                  <strong style={{ color: '#991b1b' }}>Rs {remaining.toLocaleString()}</strong>
                </div>
              </div>

              {/* Quick Amount Selection Buttons */}
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setPayAmount(remaining > 0 ? remaining : (activeStudent?.monthlyFee || 4500))}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                >
                  ⚡ Pay Full Due (Rs {(remaining > 0 ? remaining : (activeStudent?.monthlyFee || 4500)).toLocaleString()})
                </button>
                {activeStudent?.monthlyFee && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(activeStudent.monthlyFee)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Monthly Tuition Only (Rs {activeStudent.monthlyFee.toLocaleString()})
                  </button>
                )}
              </div>
            </div>

            {/* Payment Fields */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#0f1d38' }}>
                  Payment Amount to Pay (Rs) *
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={payAmount}
                  min="1"
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  style={{ fontSize: '1.15rem', fontWeight: '800', color: '#059669', border: '2px solid #059669', background: '#f0fdf4' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>Payment Mode / Channel *</label>
                <select 
                  className="form-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ fontWeight: '600' }}
                >
                  <option value="Cash at Counter">Cash at Counter</option>
                  <option value="Allied Bank Deposit">Allied Bank Deposit</option>
                  <option value="HBL Online Transfer">HBL Online Transfer</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                  <option value="Cheque / Pay Order">Cheque / Pay Order</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Voucher #</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Remarks</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Monthly fee received in full"
                />
              </div>
            </div>

            {/* Remaining balance preview */}
            <div style={{ marginTop: '10px', padding: '10px 14px', background: remainingAfterThisPay === 0 ? '#ecfdf5' : '#fffbeb', borderRadius: '8px', border: `1px solid ${remainingAfterThisPay === 0 ? '#a7f3d0' : '#fde68a'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                <span style={{ color: remainingAfterThisPay === 0 ? '#065f46' : '#92400e', fontWeight: '700' }}>
                  {remainingAfterThisPay === 0 ? '✓ Fee will be marked as FULLY PAID & CLEARED' : `⚠️ Remaining Balance after this payment: Rs ${remainingAfterThisPay.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer - Fixed & Always Visible */}
          <div className="modal-footer" style={{ padding: '16px 22px', background: '#f8fafc', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button type="button" className="action-btn-secondary" onClick={onClose} style={{ padding: '10px 18px' }}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="action-btn-primary" 
              style={{ 
                background: '#059669', 
                borderColor: '#059669', 
                padding: '12px 26px', 
                fontSize: '1rem', 
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
              }}
            >
              <span>💳 Pay Student Fee — Rs {Number(payAmount || 0).toLocaleString()}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
