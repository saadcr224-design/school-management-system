import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function StaffSalaryView() {
  const { staff, campuses, paySalary, addStaff, updateStaff, deleteStaff } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('ALL');
  const [staffToDelete, setStaffToDelete] = useState(null);
  
  // Pay Salary Modal State
  const [payingStaff, setPayingStaff] = useState(null);
  const [salaryMonth, setSalaryMonth] = useState('March 2026');
  const [paymentMode, setPaymentMode] = useState('Direct Bank Transfer');
  const [deductions, setDeductions] = useState(0);
  const [bonus, setBonus] = useState(0);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState(null);

  // Add Staff Modal State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    designation: 'Senior Faculty',
    campus: 'ABB',
    salary: 45000,
    phone: '',
    email: '',
    joinDate: '2026-01-01'
  });

  const filteredStaff = staff.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.empCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampus = selectedCampusFilter === 'ALL' || st.campus === selectedCampusFilter;
    return matchesSearch && matchesCampus;
  });

  const totalPayroll = staff.reduce((acc, st) => acc + (st.salary || 0), 0);

  const handlePaySalarySubmit = (e) => {
    e.preventDefault();
    if (!payingStaff) return;
    const finalAmount = Number(payingStaff.salary) + Number(bonus) - Number(deductions);
    paySalary(payingStaff, salaryMonth, finalAmount, paymentMode);
    setPayingStaff(null);
    setDeductions(0);
    setBonus(0);
  };

  const handleEditStaffSubmit = (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    updateStaff(editingStaff.id, {
      ...editingStaff,
      salary: Number(editingStaff.salary) || 0
    });
    setEditingStaff(null);
  };

  const handleAddStaffSubmit = (e) => {
    e.preventDefault();
    if (!newStaff.name) return;
    addStaff({
      ...newStaff,
      empCode: 'STF-' + Math.floor(100 + Math.random() * 900)
    });
    setIsAddStaffOpen(false);
    setNewStaff({
      name: '',
      designation: 'Senior Faculty',
      campus: 'ABB',
      salary: 45000,
      phone: '',
      email: '',
      joinDate: '2026-01-01'
    });
  };

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Staff & Payroll Management</h1>
          <p className="page-subtitle">Faculty profiles, designations, monthly salary disbursals, and staff editing</p>
        </div>
        <button 
          className="action-btn-primary"
          onClick={() => setIsAddStaffOpen(true)}
          style={{ padding: '9px 18px', fontSize: '0.9rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Mini Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL EMPLOYEES</span>
            <span className="stat-value">{staff.length}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-slate">👥</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">MONTHLY PAYROLL BUDGET</span>
            <span className="stat-value">Rs {totalPayroll.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-burgundy">Rs</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">ACTIVE CAMPUSES</span>
            <span className="stat-value">{campuses.length}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">🏫</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search staff by name, designation, or code..."
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
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
            >
              <option value="ALL">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">Staff Members Roster ({filteredStaff.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Faculty and administrative personnel</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th>Campus</th>
                <th>Contact</th>
                <th>Basic Salary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(st => (
                <tr key={st.id}>
                  <td style={{ fontWeight: '700', color: '#0f1d38' }}>{st.empCode}</td>
                  <td style={{ fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: '#334155', 
                        color: '#ffffff',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                      }}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div>{st.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{st.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{st.designation}</td>
                  <td><span className="status-badge badge-active">{st.campus}</span></td>
                  <td>{st.phone}</td>
                  <td style={{ fontWeight: '700', color: '#0f1d38' }}>Rs {st.salary?.toLocaleString()}</td>
                  <td><span className="status-badge badge-paid">{st.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Disburse Salary Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-disburse"
                        title="Disburse Monthly Salary"
                        onClick={() => setPayingStaff(st)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="12" x="2" y="6" rx="2" />
                          <circle cx="12" cy="12" r="2" />
                          <path d="M6 12h.01M18 12h.01" />
                        </svg>
                      </button>

                      {/* Edit Staff Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-edit"
                        title="Edit Staff Member"
                        onClick={() => setEditingStaff({ ...st })}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </button>

                      {/* Delete Staff Icon Button */}
                      <button 
                        type="button"
                        className="table-action-icon-btn btn-delete"
                        title="Delete Staff Member"
                        onClick={() => setStaffToDelete(st)}
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="modal-overlay" onClick={() => setEditingStaff(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Staff Profile</h3>
              <button className="modal-close-btn" onClick={() => setEditingStaff(null)}>✕</button>
            </div>
            <form onSubmit={handleEditStaffSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStaff.name}
                      onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation / Role</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStaff.designation}
                      onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Campus Branch</label>
                    <select 
                      className="form-select"
                      value={editingStaff.campus}
                      onChange={(e) => setEditingStaff({ ...editingStaff, campus: e.target.value })}
                    >
                      {campuses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={editingStaff.salary}
                      onChange={(e) => setEditingStaff({ ...editingStaff, salary: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStaff.phone}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email"
                      className="form-input"
                      value={editingStaff.email}
                      onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Status</label>
                    <select 
                      className="form-select"
                      value={editingStaff.status || 'Active'}
                      onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setEditingStaff(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Delete In-App Confirmation Modal */}
      {staffToDelete && (
        <div className="modal-overlay" onClick={() => setStaffToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Delete Staff Member</h3>
              <button className="modal-close-btn" onClick={() => setStaffToDelete(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.92rem', color: '#1e293b', marginBottom: '8px' }}>
                Are you sure you want to permanently remove <strong>{staffToDelete.name}</strong> ({staffToDelete.designation} - <code>{staffToDelete.empCode}</code>)?
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                * This will remove their record from faculty, attendance, and payroll records.
              </p>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setStaffToDelete(null)}>Cancel</button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  deleteStaff(staffToDelete.id);
                  setStaffToDelete(null);
                }}
              >
                Confirm Delete Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Salary Modal */}
      {payingStaff && (
        <div className="modal-overlay" onClick={() => setPayingStaff(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Disburse Monthly Salary</h3>
              <button className="modal-close-btn" onClick={() => setPayingStaff(null)}>✕</button>
            </div>
            <form onSubmit={handlePaySalarySubmit}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '700', color: '#0f1d38', fontSize: '1rem' }}>{payingStaff.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{payingStaff.designation} · {payingStaff.campus} Campus</div>
                  <div style={{ marginTop: '4px', fontWeight: '700', color: '#059669' }}>Base Salary: Rs {payingStaff.salary?.toLocaleString()}</div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Salary Month</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={salaryMonth}
                      onChange={(e) => setSalaryMonth(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                      <option value="Cheque">Crossed Cheque</option>
                      <option value="Cash Voucher">Cash Voucher</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bonus / Allowance (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={bonus}
                      onChange={(e) => setBonus(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deductions (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#991b1b' }}>Net Payable Amount:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#991b1b' }}>
                      Rs {(Number(payingStaff.salary) + Number(bonus) - Number(deductions)).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#7f1d1d', marginTop: '4px' }}>
                    * This transaction will be immediately debited as a Salary Expense in the school general ledger.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setPayingStaff(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary" style={{ background: '#7f1d1d', borderColor: '#7f1d1d' }}>Confirm & Record Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStaffOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Staff Member</h3>
              <button className="modal-close-btn" onClick={() => setIsAddStaffOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStaffSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newStaff.designation}
                      onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Campus</label>
                    <select 
                      className="form-select"
                      value={newStaff.campus}
                      onChange={(e) => setNewStaff({ ...newStaff, campus: e.target.value })}
                    >
                      {campuses.map(c => (
                        <option key={c.id} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff({ ...newStaff, salary: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email"
                      className="form-input"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setIsAddStaffOpen(false)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
