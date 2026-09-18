import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function CollectPaymentModal({ slip, onClose }) {
  const { payFeeSlip } = useApp();
  
  if (!slip) return null;

  const remaining = (slip.totalAmount || 0) - (slip.amountPaid || 0);
  const [payAmount, setPayAmount] = useState(remaining);
  const [paymentMode, setPaymentMode] = useState('Cash at Counter');
  const [receiptNumber, setReceiptNumber] = useState('RCP-' + Math.floor(1000 + Math.random() * 9000));
  const [remarks, setRemarks] = useState('Fee received in full');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    payFeeSlip(slip.id, payAmount, paymentMode, remarks);
    alert(`Payment of Rs. ${Number(payAmount).toLocaleString()} received successfully for Challan #${slip.challanNo}!\nReceipt #${receiptNumber} generated.`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Fee Collection & Receipt Issuance</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Challan Details Highlight */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', color: '#0f1d38', fontSize: '1.05rem' }}>{slip.studentName}</span>
                <span className="status-badge badge-active">{slip.campus} Campus</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Roll No: <strong>{slip.rollNo}</strong> · Class: <strong>{slip.classGrade}</strong> · Challan: <strong>{slip.challanNo}</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Challan: <strong>Rs {slip.totalAmount?.toLocaleString()}</strong></span>
                <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: '700' }}>Balance Outstanding: Rs {remaining.toLocaleString()}</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Payment Amount (Rs) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={payAmount}
                  max={remaining}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Channel</label>
                <select 
                  className="form-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash at Counter">Cash at Counter</option>
                  <option value="Allied Bank Deposit">Allied Bank Deposit</option>
                  <option value="HBL Online Transfer">HBL Online Transfer</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
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
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <p style={{ fontSize: '0.78rem', color: '#065f46', lineHeight: 1.4 }}>
                ✓ Once confirmed, this collection will automatically be credited to the School General Ledger and update the student's arrears.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="action-btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
              Confirm Payment & Issue Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
