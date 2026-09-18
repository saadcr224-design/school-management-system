import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function FeeSlipsView({ onOpenFeeModal, onOpenPaymentModal }) {
  const { feeSlips, deleteFeeSlip, students } = useApp();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChallanForPrint, setSelectedChallanForPrint] = useState(null);

  const filteredSlips = feeSlips.filter(slip => {
    const matchesStatus = statusFilter === 'ALL' || slip.status === statusFilter;
    const matchesSearch = slip.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.challanNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalBilled = feeSlips.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalReceived = feeSlips.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
  const totalPending = totalBilled - totalReceived;

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Fee Slips & Challans</h1>
          <p className="page-subtitle">Generate fee vouchers, track student payments, and print 3-copy bank challans</p>
        </div>
        <button 
          className="action-btn-primary"
          onClick={onOpenFeeModal}
          style={{ padding: '9px 18px', fontSize: '0.9rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Generate Fee Challan</span>
        </button>
      </div>

      {/* Summary Stat Mini-Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL BILLED</span>
            <span className="stat-value">Rs {totalBilled.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">Rs</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">FEE RECOVERED</span>
            <span className="stat-value" style={{ color: '#059669' }}>Rs {totalReceived.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">✓</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL OUTSTANDING</span>
            <span className="stat-value" style={{ color: '#991b1b' }}>Rs {totalPending.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">!</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search challan #, student name, or roll no..."
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

          <div style={{ width: '180px' }}>
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
        </div>
      </div>

      {/* Challans Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">Issued Fee Challans ({filteredSlips.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Fee records and payment ledger status</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Campus</th>
                <th>Billing Month</th>
                <th>Total Fee</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlips.map(slip => {
                const remaining = (slip.totalAmount || 0) - (slip.amountPaid || 0);
                return (
                  <tr key={slip.id}>
                    <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                    <td style={{ fontWeight: '600' }}>{slip.studentName}</td>
                    <td>{slip.rollNo}</td>
                    <td><span className="status-badge badge-active">{slip.campus}</span></td>
                    <td>{slip.month}</td>
                    <td style={{ fontWeight: '700' }}>Rs {slip.totalAmount?.toLocaleString()}</td>
                    <td style={{ color: '#059669', fontWeight: '600' }}>Rs {slip.amountPaid?.toLocaleString()}</td>
                    <td style={{ color: remaining > 0 ? '#991b1b' : '#64748b', fontWeight: '700' }}>
                      Rs {remaining.toLocaleString()}
                    </td>
                    <td style={{ color: '#64748b' }}>{slip.dueDate}</td>
                    <td>
                      <span className={`status-badge ${
                        slip.status === 'Paid' ? 'badge-paid' :
                        slip.status === 'Partial' ? 'badge-partial' : 'badge-unpaid'
                      }`}>
                        {slip.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="action-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          title="Print 3-Copy Bank Challan"
                          onClick={() => setSelectedChallanForPrint(slip)}
                        >
                          Print Slip
                        </button>
                        {slip.status !== 'Paid' && (
                          <button 
                            className="action-btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                            title="Collect Fee"
                            onClick={() => onOpenPaymentModal(slip)}
                          >
                            Collect
                          </button>
                        )}
                        <button 
                          className="action-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626' }}
                          title="Delete Slip"
                          onClick={() => {
                            if (window.confirm(`Delete Challan ${slip.challanNo}?`)) {
                              deleteFeeSlip(slip.id);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSlips.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No fee vouchers found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official 3-Copy Printable Bank Challan Modal */}
      {selectedChallanForPrint && (
        <div className="modal-overlay" onClick={() => setSelectedChallanForPrint(null)}>
          <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3 className="modal-title">Official 3-Copy Bank Challan Voucher</h3>
              <button className="modal-close-btn" onClick={() => setSelectedChallanForPrint(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '16px' }}>
              <div className="challan-three-parts">
                {['Bank Copy', 'School Copy', 'Student Copy'].map((copyName, idx) => (
                  <div key={idx} className="challan-copy">
                    <div className="challan-school-header">
                      <div className="challan-school-name">SHEZAD CHILDREN ACADEMY</div>
                      <div style={{ fontSize: '0.68rem', color: '#475569' }}>Schools & Colleges ({selectedChallanForPrint.campus} Campus)</div>
                      <div className="challan-copy-type">{copyName}</div>
                    </div>

                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Challan No:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.challanNo}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Issue Date:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.issueDate || '2026-03-01'}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Due Date:</span>
                      <span className="challan-meta-value" style={{ color: '#dc2626' }}>{selectedChallanForPrint.dueDate}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Student Name:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.studentName}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Roll No:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.rollNo}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Class:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.classGrade}</span>
                    </div>
                    <div className="challan-meta-row">
                      <span className="challan-meta-label">Billing Month:</span>
                      <span className="challan-meta-value">{selectedChallanForPrint.month}</span>
                    </div>

                    <table className="challan-fee-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Amount (Rs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Tuition Fee</td>
                          <td style={{ textAlign: 'right' }}>{(selectedChallanForPrint.tuitionFee || (selectedChallanForPrint.totalAmount - 1000)).toLocaleString()}</td>
                        </tr>
                        {selectedChallanForPrint.admissionFee > 0 && (
                          <tr>
                            <td>Admission / Registration</td>
                            <td style={{ textAlign: 'right' }}>{selectedChallanForPrint.admissionFee.toLocaleString()}</td>
                          </tr>
                        )}
                        {selectedChallanForPrint.examFee > 0 && (
                          <tr>
                            <td>Examination & Lab Fee</td>
                            <td style={{ textAlign: 'right' }}>{selectedChallanForPrint.examFee.toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="challan-total-row">
                          <td><strong>Payable Total</strong></td>
                          <td style={{ textAlign: 'right' }}><strong>Rs {selectedChallanForPrint.totalAmount?.toLocaleString()}</strong></td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '6px' }}>
                      <p>* Payable at any designated Allied Bank / HBL branch.</p>
                      <p>* Late fee fine of Rs. 200 applies after due date.</p>
                    </div>

                    <div className="challan-stamp-box">
                      <div>Cashier Sign</div>
                      <div>Bank Stamp</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer no-print">
              <button className="action-btn-secondary" onClick={() => setSelectedChallanForPrint(null)}>
                Close
              </button>
              <button 
                className="action-btn-primary" 
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Official 3-Part Challan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
