import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function UserManagementView() {
  const { 
    users, 
    campuses, 
    currentUser, 
    addUser, 
    updateUser,
    deleteUser, 
    updateUserPermissions, 
    showToast,
    setActiveTab 
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'admin123',
    role: 'Admin',
    campus: 'ALL',
    status: 'Active',
    permissions: {
      dashboard: true,
      students: true,
      feeslips: true,
      staff: true,
      attendance: true,
      ledger: true,
      reports: true,
      settings: true,
      users: true
    }
  });

  // Comprehensive module list
  const modulesList = [
    { key: 'dashboard', label: 'Dashboard & Analytics', desc: '8 KPI cards, enrollment & fee distribution charts' },
    { key: 'students', label: 'Students Management', desc: 'Directory, admissions, edit profile, printable ID cards' },
    { key: 'feeslips', label: 'Fee Slips & Challans', desc: 'Issue challans, receive payments, print 3-copy bank slips' },
    { key: 'staff', label: 'Staff & Payroll', desc: 'Faculty directory, monthly salary disbursement & vouchers' },
    { key: 'attendance', label: 'Daily Attendance', desc: 'Mark student & staff daily attendance' },
    { key: 'ledger', label: 'School Financial Ledger', desc: 'Double-entry cash flow journal, vouchers, CSV export' },
    { key: 'reports', label: 'Executive Reports', desc: 'Fee defaulter audits, financial comparison' },
    { key: 'settings', label: 'System Settings', desc: 'Manage campuses, academic sessions, and sibling policy' },
    { key: 'users', label: 'Admin Access Control', desc: 'Manage users and delegate operational permissions' }
  ];

  const handleAddAdminSubmit = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      showToast('Please provide both full name and login username.', 'danger');
      return;
    }

    addUser({
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      password: newUser.password || 'admin123',
      role: newUser.role,
      campus: newUser.campus,
      status: 'Active',
      accessGranted: true,
      accessGrantedBy: `${currentUser.name} (${currentUser.role || 'Admin'})`,
      permissions: newUser.permissions
    });

    setIsAddUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      password: 'admin123',
      role: 'Admin',
      campus: 'ALL',
      status: 'Active',
      permissions: {
        dashboard: true,
        students: true,
        feeslips: true,
        staff: true,
        attendance: true,
        ledger: true,
        reports: true,
        settings: true,
        users: true
      }
    });
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email.toLowerCase(),
      password: editingUser.password,
      role: editingUser.role,
      campus: editingUser.campus,
      status: editingUser.status || 'Active'
    });

    setEditingUser(null);
  };

  const handleTogglePermission = (moduleKey) => {
    if (!selectedUserForPermissions) return;
    const currentPerms = selectedUserForPermissions.permissions || {};
    const updatedPerms = {
      ...currentPerms,
      [moduleKey]: currentPerms[moduleKey] === false ? true : false
    };
    
    setSelectedUserForPermissions({
      ...selectedUserForPermissions,
      permissions: updatedPerms
    });

    updateUserPermissions(selectedUserForPermissions.id, updatedPerms);
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
      users: true
    };

    setSelectedUserForPermissions({
      ...selectedUserForPermissions,
      permissions: fullWorkingPerms
    });

    updateUserPermissions(selectedUserForPermissions.id, fullWorkingPerms);
  };

  const handleDeleteUserConfirm = (user) => {
    if (user.role === 'Super Admin') {
      showToast('Cannot delete the primary Super Admin account.', 'danger');
      return;
    }
    if (!isSuperAdmin && user.id === currentUser.id) {
      showToast('Cannot delete your own active administrator account.', 'danger');
      return;
    }
    deleteUser(user.id);
    setDeletingUserId(null);
  };

  const adminUsers = users.filter(u => u.role === 'Admin');
  const otherUsers = users.filter(u => u.role !== 'Admin' && u.role !== 'Super Admin');

  if (!isSuperAdmin) {
    return (
      <div className="content-body">
        <div style={{
          maxWidth: '620px',
          margin: '60px auto',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#0f1d38', fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px' }}>
            Access Restricted: Super Admin Only
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Only the primary <strong>Super Admin</strong> is authorized to create new Admin working accounts, assign module permissions, or delete accounts.
          </p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-block', textAlign: 'left', fontSize: '0.84rem', color: '#334155' }}>
            <div>Current Account: <strong>{currentUser?.name || 'Administrator'}</strong></div>
            <div>Role: <span className="status-badge badge-active">{currentUser?.role || 'Admin'}</span></div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <button 
              type="button" 
              className="action-btn-primary" 
              onClick={() => setActiveTab('dashboard')}
              style={{ padding: '10px 24px' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-body">
      {/* Control Center Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #091326 0%, #102344 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(9, 19, 38, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: isSuperAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            boxShadow: isSuperAdmin ? '0 4px 14px rgba(245, 158, 11, 0.4)' : '0 4px 14px rgba(2, 132, 199, 0.4)'
          }}>
            {isSuperAdmin ? '👑' : '🛡️'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: '800' }}>
                {isSuperAdmin ? 'Super Admin Control Center' : 'Administrator & User Access Control'}
              </h2>
              <span style={{
                background: isSuperAdmin ? '#f59e0b' : '#38bdf8',
                color: '#0f1d38',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '800'
              }}>
                {isSuperAdmin ? 'MASTER AUTHORITY' : 'ADMINISTRATOR (ACCESS DELEGATION)'}
              </span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.84rem', marginTop: '2px' }}>
              Create and manage system administrators, staff users, assign campus branches, and delegate module permissions across all systems.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button"
            className="action-btn-primary"
            onClick={() => setIsAddUserOpen(true)}
            style={{ 
              padding: '10px 20px', 
              fontSize: '0.92rem', 
              background: '#059669', 
              borderColor: '#059669', 
              color: '#ffffff',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>+ Add Admin / User for Working</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total System Users</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f1d38', marginTop: '4px' }}>{users.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '2px' }}>All operational accounts</div>
        </div>
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Working Admins</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e3a8a', marginTop: '4px' }}>{adminUsers.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#3b82f6', marginTop: '2px' }}>Delegated operational staff</div>
        </div>
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Other Roles</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{otherUsers.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', marginTop: '2px' }}>Coordinators & Accountants</div>
        </div>
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Active Session</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669', marginTop: '4px' }}>{currentUser.name}</div>
          <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '2px' }}>Logged in as {currentUser.role}</div>
        </div>
      </div>

      {/* Complete Users Roster */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">System Administrators & Working Accounts ({users.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Manage user credentials, assign campuses, and toggle module authorizations</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Login Username</th>
                <th>Assigned Role</th>
                <th>Campus Branch</th>
                <th>Module Permissions</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSuper = u.role === 'Super Admin';
                const perms = u.permissions || {};
                const activeCount = Object.keys(perms).filter(k => perms[k] !== false).length;

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '38px', 
                          height: '38px', 
                          borderRadius: '50%', 
                          background: isSuper ? '#102344' : '#0284c7', 
                          color: '#ffffff',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: '800'
                        }}>
                          {u.name ? u.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div style={{ color: '#0f1d38', fontWeight: '700' }}>
                            {u.name} {u.id === currentUser.id && <span style={{ color: '#059669', fontSize: '0.75rem' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {isSuper ? 'Primary Controller' : (u.accessGrantedBy || 'Delegated Admin')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '700', color: '#0f1d38' }}>
                        {u.email}
                      </code>
                    </td>
                    <td>
                      <span className={`status-badge ${isSuper ? 'badge-paid' : 'badge-active'}`} style={{ fontWeight: '700' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.campus === 'ALL' || !u.campus ? 'All Campuses (Central)' : `${u.campus} Campus`}
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: '700', 
                        color: activeCount > 0 ? '#059669' : '#991b1b',
                        background: activeCount > 0 ? '#ecfdf5' : '#fef2f2',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {isSuper ? 'All 9 Modules' : `${activeCount} Modules Active`}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status === 'Active' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Edit User Details */}
                        <button 
                          type="button"
                          className="table-action-icon-btn btn-edit"
                          title="Edit User Details / Password"
                          onClick={() => setEditingUser(u)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                          </svg>
                        </button>

                        {/* Edit Permissions Button */}
                        <button 
                          type="button"
                          className="table-action-icon-btn btn-permissions"
                          title="Manage Module Access & Permissions"
                          onClick={() => setSelectedUserForPermissions(u)}
                          style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="7.5" cy="15.5" r="5.5"/>
                            <path d="m21 2-9.6 9.6"/>
                            <path d="m15.5 7.5 3 3L22 7l-3-3"/>
                          </svg>
                        </button>
                        
                        {/* Delete User Button (Protected for Super Admin) */}
                        {!isSuper && (
                          <button 
                            type="button"
                            className="table-action-icon-btn btn-delete"
                            title="Delete Admin Account"
                            onClick={() => setDeletingUserId(u)}
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Delegation Modal */}
      {selectedUserForPermissions && (
        <div className="modal-overlay" onClick={() => setSelectedUserForPermissions(null)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>Delegate Module Access</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  User: <strong>{selectedUserForPermissions.name}</strong> ({selectedUserForPermissions.role}) · Username: <code>{selectedUserForPermissions.email}</code>
                </p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setSelectedUserForPermissions(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Quick Action Button */}
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
                  <h4 style={{ color: '#065f46', fontSize: '0.92rem', fontWeight: '700', margin: 0 }}>
                    1-Click Full Working Access
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#047857', margin: '2px 0 0' }}>
                    Authorize all operational school modules for this administrator
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGrantFullWorkingAccess}
                  className="action-btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', fontSize: '0.82rem', padding: '7px 16px', fontWeight: '700' }}
                >
                  ✓ Grant Full Access
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

            <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
              <button className="action-btn-secondary" onClick={() => setSelectedUserForPermissions(null)}>
                Close
              </button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={() => {
                  showToast(`✓ Access permissions updated for ${selectedUserForPermissions.name}!`, 'success');
                  setSelectedUserForPermissions(null);
                }}
              >
                ✓ Save & Apply Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>Edit Administrator / User</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Update user account information and login credentials</p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Login Username / Email</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Login Password</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingUser.password}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Role</label>
                    <select 
                      className="form-select"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      disabled={editingUser.role === 'Super Admin'}
                    >
                      <option value="Admin">Administrator (Working Access)</option>
                      <option value="Campus Coordinator">Campus Coordinator</option>
                      <option value="Accountant">Accountant / Cashier</option>
                      <option value="Operator">Data Entry Operator</option>
                      {editingUser.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Campus Branch</label>
                    <select 
                      className="form-select"
                      value={editingUser.campus}
                      onChange={(e) => setEditingUser({ ...editingUser, campus: e.target.value })}
                    >
                      <option value="ALL">All Campuses (Central Access)</option>
                      {campuses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Account Status</label>
                    <select 
                      className="form-select"
                      value={editingUser.status || 'Active'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    >
                      <option value="Active">Active (Can Log In)</option>
                      <option value="Inactive">Inactive (Suspended)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="action-btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  ✓ Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUserId && (
        <div className="modal-overlay" onClick={() => setDeletingUserId(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Delete Administrator Account</h3>
              <button className="modal-close-btn" onClick={() => setDeletingUserId(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '12px' }}>
                Are you sure you want to permanently delete the admin account for <strong>{deletingUserId.name}</strong> (Username: <code>{deletingUserId.email}</code>)?
              </p>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                * This user will no longer be able to log in or operate the school system.
              </p>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setDeletingUserId(null)}>
                Cancel
              </button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleDeleteUserConfirm(deletingUserId)}
              >
                Confirm Delete Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: + Add New Admin / User for Working */}
      {isAddUserOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUserOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>Register New Admin for Working</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Create admin credentials and assign school management module permissions
                </p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setIsAddUserOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddAdminSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="e.g. Muhammad Kashif"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Login Username / Email *</label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="e.g. admin_kashif or kashif"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Login Password *</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Default: admin123"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Role</label>
                    <select 
                      className="form-select"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="Admin">Administrator (Working Access)</option>
                      <option value="Campus Coordinator">Campus Coordinator</option>
                      <option value="Accountant">Accountant / Cashier</option>
                      <option value="Operator">Data Entry Operator</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Campus Assignment</label>
                    <select 
                      className="form-select"
                      value={newUser.campus}
                      onChange={(e) => setNewUser({ ...newUser, campus: e.target.value })}
                    >
                      <option value="ALL">All Campuses (Central Access)</option>
                      {campuses.map(c => (
                        <option key={c.id || c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h5 style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0f1d38', margin: 0 }}>
                      Working Permissions:
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setNewUser({
                          ...newUser,
                          permissions: {
                            dashboard: true,
                            students: true,
                            feeslips: true,
                            staff: true,
                            attendance: true,
                            ledger: true,
                            reports: true,
                            settings: true,
                            users: true
                          }
                        });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Select All Modules
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {modulesList.map(m => {
                      const checked = newUser.permissions[m.key] !== false;
                      return (
                        <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={(e) => {
                              setNewUser({
                                ...newUser,
                                permissions: {
                                  ...newUser.permissions,
                                  [m.key]: e.target.checked
                                }
                              });
                            }}
                          />
                          <span>{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="action-btn-secondary" onClick={() => setIsAddUserOpen(false)}>Cancel</button>
                <button type="submit" className="action-btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  ✓ Create Admin & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
