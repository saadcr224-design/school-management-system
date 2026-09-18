import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function UserManagementView() {
  const { users, campuses, currentUser, updateUserPermissions } = useApp();
  const [userList, setUserList] = useState(users);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Admin',
    campus: 'ALL',
    status: 'Active'
  });

  // Modules list for permissions
  const modulesList = [
    { key: 'dashboard', label: 'Dashboard & Analytics', desc: 'View 8 KPI cards, enrollment & fee distribution charts' },
    { key: 'students', label: 'Students Management', desc: 'Student directory, admissions, and ID card generation' },
    { key: 'feeslips', label: 'Fee Slips & Challans', desc: 'Issue challans, receive payments, print 3-copy bank vouchers' },
    { key: 'staff', label: 'Staff & Payroll', desc: 'Faculty directory, salary vouchers, and payroll calculation' },
    { key: 'attendance', label: 'Daily Attendance', desc: 'Mark student and staff daily attendance' },
    { key: 'ledger', label: 'School Financial Ledger', desc: 'Double-entry bookkeeping, posting vouchers, CSV export' },
    { key: 'reports', label: 'Executive Reports', desc: 'Fee defaulter audits, campus comparative performance' },
    { key: 'settings', label: 'System Settings', desc: 'Manage campuses, academic sessions, and Firebase connectivity' },
    { key: 'users', label: 'User & Access Delegation', desc: 'Manage system users and delegate module permissions' }
  ];

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    const user = {
      id: 'usr-' + Date.now(),
      ...newUser,
      accessGranted: true,
      accessGrantedBy: currentUser.name || 'Super Admin',
      permissions: {
        dashboard: true,
        students: true,
        feeslips: true,
        staff: true,
        attendance: true,
        ledger: true,
        reports: true,
        users: false,
        settings: true
      }
    };
    setUserList(prev => [...prev, user]);
    setIsAddUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      role: 'Admin',
      campus: 'ALL',
      status: 'Active'
    });
    alert(`User ${user.name} created successfully with role ${user.role}!`);
  };

  const toggleStatus = (id) => {
    setUserList(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' };
      }
      return u;
    }));
  };

  const handleTogglePermission = (moduleKey) => {
    if (!selectedUserForPermissions) return;
    const currentPerms = selectedUserForPermissions.permissions || {};
    const updatedPerms = {
      ...currentPerms,
      [moduleKey]: !currentPerms[moduleKey]
    };
    
    setSelectedUserForPermissions({
      ...selectedUserForPermissions,
      permissions: updatedPerms
    });

    updateUserPermissions(selectedUserForPermissions.id, updatedPerms);
    setUserList(prev => prev.map(u => u.id === selectedUserForPermissions.id ? { ...u, permissions: updatedPerms } : u));
  };

  const handleGrantFullWorkingAccess = () => {
    if (!selectedUserForPermissions) return;
    const fullWorkingPerms = {
      dashboard: true,
      students: true,
      feeslips: true,
      staff: true,
      attendance: true,
      ledger: true,
      reports: true,
      settings: true,
      users: selectedUserForPermissions.role === 'Super Admin'
    };

    setSelectedUserForPermissions({
      ...selectedUserForPermissions,
      permissions: fullWorkingPerms
    });

    updateUserPermissions(selectedUserForPermissions.id, fullWorkingPerms);
    setUserList(prev => prev.map(u => u.id === selectedUserForPermissions.id ? { ...u, permissions: fullWorkingPerms } : u));
    alert(`✓ Full Working Access successfully granted to ${selectedUserForPermissions.name} (${selectedUserForPermissions.role}) by Super Admin!`);
  };

  return (
    <div className="content-body">
      {/* Super Admin Access Control Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #102344 0%, #1e3a8a 100%)',
        borderRadius: '14px',
        padding: '20px 24px',
        color: '#ffffff',
        marginBottom: '24px',
        boxShadow: '0 4px 14px rgba(16, 35, 68, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            🛡️
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '800', marginBottom: '2px' }}>
              Access Delegation & Role Control
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
              Super Admin can grant, customize, and delegate working access to Administrator accounts for daily operations
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            Active Session: <strong>{currentUser.name} ({currentUser.role})</strong>
          </span>
        </div>
      </div>

      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">User Accounts & Working Access</h1>
          <p className="page-subtitle">Configure administrative roles, campus coordinators, and system access</p>
        </div>
        <button 
          className="action-btn-primary"
          onClick={() => setIsAddUserOpen(true)}
          style={{ padding: '9px 18px', fontSize: '0.9rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>Create User</span>
        </button>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">System Personnel & Access Matrix ({userList.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Super Admin can click "Manage Access" to grant or revoke app modules for Admin</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Role</th>
                <th>Assigned Campus</th>
                <th>Working Access Status</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map(u => {
                const isSuperAdmin = u.role === 'Super Admin';
                const isAdmin = u.role === 'Admin';
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: isSuperAdmin ? '#102344' : '#1e3a8a', 
                          color: '#ffffff',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: '800'
                        }}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: '#0f1d38', fontWeight: '700' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Username: <strong>{u.email}</strong>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${isSuperAdmin ? 'badge-paid' : 'badge-active'}`} style={{ fontWeight: '700' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.campus === 'ALL' ? 'All Campuses (Central)' : `${u.campus} Campus`}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#059669' }}>
                          ● Full Working Access Granted
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Delegated by: <strong>Saad Ahmad (Super Admin)</strong>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status === 'Active' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="action-btn-primary"
                          style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                          title="Manage module permissions"
                          onClick={() => setSelectedUserForPermissions(u)}
                        >
                          🔑 Manage Access
                        </button>
                        {!isSuperAdmin && (
                          <button 
                            className="action-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                            onClick={() => toggleStatus(u.id)}
                          >
                            {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Delegation Modal */}
      {selectedUserForPermissions && (
        <div className="modal-overlay" onClick={() => setSelectedUserForPermissions(null)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Delegate Working Access</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  User: <strong>{selectedUserForPermissions.name}</strong> ({selectedUserForPermissions.role})
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedUserForPermissions(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Quick Action Button for Super Admin */}
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h4 style={{ color: '#065f46', fontSize: '0.92rem', fontWeight: '700' }}>
                    1-Click Working Access Delegation
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#047857' }}>
                    Super Admin grants complete operational permissions for all modules
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGrantFullWorkingAccess}
                  className="action-btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  ✓ Grant Full Working Access
                </button>
              </div>

              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f1d38', marginBottom: '10px' }}>
                Module Permissions Breakdown:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {modulesList.map((mod) => {
                  const isEnabled = selectedUserForPermissions.permissions
                    ? selectedUserForPermissions.permissions[mod.key] !== false
                    : true;

                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleTogglePermission(mod.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isEnabled ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        background: isEnabled ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: isEnabled ? '#0f1d38' : '#64748b' }}>
                          {mod.label}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {mod.desc}
                        </div>
                      </div>

                      <div style={{
                        width: '42px',
                        height: '22px',
                        borderRadius: '9999px',
                        background: isEnabled ? '#059669' : '#cbd5e1',
                        position: 'relative',
                        transition: 'background 0.2s'
                      }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          position: 'absolute',
                          top: '2px',
                          left: isEnabled ? '22px' : '2px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setSelectedUserForPermissions(null)}>
                Close
              </button>
              <button 
                className="action-btn-primary" 
                onClick={() => {
                  alert(`Access permissions successfully saved for ${selectedUserForPermissions.name}!`);
                  setSelectedUserForPermissions(null);
                }}
              >
                Save & Apply Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUserOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create System User</h3>
              <button className="modal-close-btn" onClick={() => setIsAddUserOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email / Username</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select 
                      className="form-select"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="Admin">Administrator (Working Access)</option>
                      <option value="Campus Coordinator">Campus Coordinator</option>
                      <option value="Accountant">Accountant / Cashier</option>
                      <option value="Teacher / Faculty">Teacher / Faculty</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campus Assignment</label>
                    <select 
                      className="form-select"
                      value={newUser.campus}
                      onChange={(e) => setNewUser({ ...newUser, campus: e.target.value })}
                    >
                      <option value="ALL">All Campuses</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setIsAddUserOpen(false)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Create User & Grant Access</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
