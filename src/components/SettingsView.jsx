import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function SettingsView() {
  const { 
    campuses, 
    addCampus, 
    deleteCampus,
    allStudents,
    allStaff,
    siblingDiscountRules,
    updateSiblingDiscountRules,
    resetToScreenshotDemo,
    softwareVersion,
    lastUpdatedTime,
    checkForSoftwareUpdates,
    isUpdating,
    firebaseConnected,
    firebaseInfo,
    syncToFirebase,
    currentUser
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const [activeTab, setActiveTab] = useState('campuses'); // 'campuses', 'sibling_policy', 'update_system', 'general'
  const [campusToDelete, setCampusToDelete] = useState(null);
  
  // Sibling discount policy local edit state
  const [siblingRules, setSiblingRules] = useState(siblingDiscountRules || {
    sibling1: 0,
    sibling2: 25,
    sibling3: 50,
    sibling4Plus: 75
  });

  // New Campus state
  const [isAddCampusOpen, setIsAddCampusOpen] = useState(false);
  const [newCampus, setNewCampus] = useState({
    name: '',
    code: '',
    city: '',
    address: ''
  });

  const handleAddCampusSubmit = (e) => {
    e.preventDefault();
    if (!newCampus.name || !newCampus.code) return;
    addCampus({
      id: newCampus.code.toUpperCase(),
      name: newCampus.name,
      code: newCampus.code.toUpperCase(),
      city: newCampus.city,
      address: newCampus.address,
      status: 'Active'
    });
    setIsAddCampusOpen(false);
    setNewCampus({ name: '', code: '', city: '', address: '' });
  };

  return (
    <div className="content-body">
      <div className="page-title-section">
        <h1 className="page-title">System Settings & Configurations</h1>
        <p className="page-subtitle">Configure campus branches, sibling fee concession policies, software updates, and institutional academic profiles</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button 
          className={`nav-item ${activeTab === 'campuses' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveTab('campuses')}
        >
          🏫 Campuses & Branches ({campuses.length})
        </button>
        <button 
          className={`nav-item ${activeTab === 'sibling_policy' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px', background: activeTab === 'sibling_policy' ? '#ecfdf5' : 'transparent', color: activeTab === 'sibling_policy' ? '#065f46' : 'inherit', borderColor: activeTab === 'sibling_policy' ? '#10b981' : 'transparent' }}
          onClick={() => setActiveTab('sibling_policy')}
        >
          👨‍👩‍👧‍👦 Sibling Fee Policy
        </button>
        <button 
          className={`nav-item ${activeTab === 'update_system' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px', background: activeTab === 'update_system' ? '#f0f9ff' : 'transparent', color: activeTab === 'update_system' ? '#0369a1' : 'inherit', borderColor: activeTab === 'update_system' ? '#0284c7' : 'transparent' }}
          onClick={() => setActiveTab('update_system')}
        >
          🔄 Software Update & Cloud Sync
        </button>
        <button 
          className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ Academic Session & Profile
        </button>
      </div>

      {/* Tab 1: Campuses */}
      {activeTab === 'campuses' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="chart-title">Registered Campuses & Branches ({campuses.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Active schools and college campuses across Pakistan</p>
            </div>
            <button 
              className="action-btn-primary"
              onClick={() => setIsAddCampusOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add New Campus</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Campus Full Name</th>
                  <th>City</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'center' }}>Students</th>
                  <th style={{ textAlign: 'center' }}>Staff</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map(camp => {
                  const studentCount = allStudents.filter(s => s.campus === camp.code).length;
                  const staffCount = allStaff.filter(s => s.campus === camp.code).length;

                  return (
                    <tr key={camp.id}>
                      <td style={{ fontWeight: '800', color: '#0369a1' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          {camp.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{camp.name}</td>
                      <td><strong>{camp.city}</strong></td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{camp.address || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>
                          {studentCount} Students
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>
                          {staffCount} Staff
                        </span>
                      </td>
                      <td><span className="status-badge badge-paid">{camp.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            className="table-action-icon-btn btn-delete"
                            onClick={() => setCampusToDelete(camp)}
                            title="Remove Campus Branch (Super Admin Only)"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {campuses.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No campuses registered. Click "+ Add New Campus" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Campus In-App Confirmation Modal */}
      {campusToDelete && (
        <div className="modal-overlay" onClick={() => setCampusToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Remove Campus Branch</h3>
              <button className="modal-close-btn" onClick={() => setCampusToDelete(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.94rem', color: '#1e293b', marginBottom: '10px' }}>
                Are you sure you want to remove <strong>{campusToDelete.name} ({campusToDelete.code})</strong>?
              </p>
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e' }}>
                ⚠️ Notice: {allStudents.filter(s => s.campus === campusToDelete.code).length} students and {allStaff.filter(s => s.campus === campusToDelete.code).length} staff members are currently tagged to this campus code.
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setCampusToDelete(null)}>Cancel</button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  deleteCampus(campusToDelete.id);
                  setCampusToDelete(null);
                }}
              >
                Confirm Remove Campus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sibling Fee Concession Policy */}
      {activeTab === 'sibling_policy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <h3 className="chart-title">👨‍👩‍👧‍👦 Sibling Fee Concession & Discount Rules</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Define automatic discount percentage tiers for families with multiple children enrolled in the academy
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateSiblingDiscountRules(siblingRules);
            }}>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                
                {/* 1st Child */}
                <div className="form-group" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                    1st Child (Eldest / Primary)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={siblingRules.sibling1 ?? 0}
                      onChange={(e) => setSiblingRules({ ...siblingRules, sibling1: Number(e.target.value) })}
                      min="0"
                      max="100"
                      required
                    />
                    <span style={{ fontWeight: '700', color: '#64748b' }}>% Off</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Standard: 0% (Full Monthly Fee)
                  </span>
                </div>

                {/* 2nd Child */}
                <div className="form-group" style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #bfdbfe' }}>
                  <label className="form-label" style={{ fontWeight: '800', color: '#1e40af' }}>
                    2nd Sibling Discount
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={siblingRules.sibling2 ?? 25}
                      onChange={(e) => setSiblingRules({ ...siblingRules, sibling2: Number(e.target.value) })}
                      min="0"
                      max="100"
                      required
                      style={{ fontWeight: '700', color: '#1e40af' }}
                    />
                    <span style={{ fontWeight: '700', color: '#1e40af' }}>% Off</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#3b82f6', marginTop: '4px', display: 'block' }}>
                    Standard: 25% Sibling Discount
                  </span>
                </div>

                {/* 3rd Child */}
                <div className="form-group" style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #fde68a' }}>
                  <label className="form-label" style={{ fontWeight: '800', color: '#92400e' }}>
                    3rd Sibling Discount
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={siblingRules.sibling3 ?? 50}
                      onChange={(e) => setSiblingRules({ ...siblingRules, sibling3: Number(e.target.value) })}
                      min="0"
                      max="100"
                      required
                      style={{ fontWeight: '700', color: '#92400e' }}
                    />
                    <span style={{ fontWeight: '700', color: '#92400e' }}>% Off</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '4px', display: 'block' }}>
                    Standard: 50% Half Fee Concession
                  </span>
                </div>

                {/* 4th+ Child */}
                <div className="form-group" style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #a7f3d0' }}>
                  <label className="form-label" style={{ fontWeight: '800', color: '#065f46' }}>
                    4th & Subsequent Siblings
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={siblingRules.sibling4Plus ?? 75}
                      onChange={(e) => setSiblingRules({ ...siblingRules, sibling4Plus: Number(e.target.value) })}
                      min="0"
                      max="100"
                      required
                      style={{ fontWeight: '700', color: '#065f46' }}
                    />
                    <span style={{ fontWeight: '700', color: '#065f46' }}>% Off</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#059669', marginTop: '4px', display: 'block' }}>
                    Standard: 75% or 100% Free Concession
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="action-btn-primary" style={{ padding: '10px 24px' }}>
                  💾 Save Sibling Discount Policy
                </button>
              </div>
            </form>
          </div>

          {/* Sibling Guide card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="section-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <h4 style={{ color: '#166534', fontSize: '1rem', fontWeight: '800', marginBottom: '8px' }}>
                💡 How Sibling Fee Generation Works
              </h4>
              <ul style={{ fontSize: '0.82rem', color: '#15803d', lineHeight: 1.8, paddingLeft: '18px' }}>
                <li>When you open <strong>"Fee Slips & Challans"</strong> &gt; <strong>"Generate Fee Challan"</strong>, switch to the <strong>"👨‍👩‍👧‍👦 Sibling Discount Package"</strong> tab.</li>
                <li>Pick the family father name to load all brothers & sisters automatically.</li>
                <li>The system applies your policy rules automatically with live financial calculations.</li>
                <li>When printed, each 2-copy bank challan clearly shows the <strong>Sibling Concession Line Item</strong>!</li>
              </ul>
            </div>

            <div className="section-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <h4 style={{ color: '#92400e', fontSize: '0.95rem', marginBottom: '8px' }}>Demo State Management</h4>
              <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, marginBottom: '12px' }}>
                You can restore the initial sample dataset (students, staff, campuses, ledger) at any time.
              </p>
              <button 
                type="button"
                className="action-btn-secondary"
                style={{ background: '#ffffff', borderColor: '#d97706', color: '#92400e', width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  if (window.confirm("Reset all local records to default sample data?")) {
                    resetToScreenshotDemo();
                  }
                }}
              >
                Reset to Initial Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Software Update & Cloud Sync */}
      {activeTab === 'update_system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <h3 className="chart-title">🔄 Software Update & Distribution Engine</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Deploy and synchronize feature updates across all deployed stations and campuses
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Active Build Version</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f1d38' }}>{softwareVersion}</div>
                  </div>
                  <span className="status-badge badge-paid">Up to Date</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Last Checked / Synced: <strong>{lastUpdatedTime}</strong>
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1.5px solid #bae6fd' }}>
                <h4 style={{ margin: '0 0 8px', color: '#0369a1', fontSize: '0.94rem', fontWeight: '700' }}>
                  🚀 1-Click Universal Software Update
                </h4>
                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#0284c7', lineHeight: 1.5 }}>
                  Clicking "Check & Apply Software Update" checks all academic modules (April-to-March reporting, 2-copy fee challan templates, transport fee structures, and defaulter reminders) and updates local caches without deleting historical data.
                </p>

                <button 
                  type="button" 
                  className="action-btn-primary"
                  onClick={checkForSoftwareUpdates}
                  disabled={isUpdating}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                  <span>{isUpdating ? 'Updating All Modules...' : '🔄 Check & Apply Software Update'}</span>
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 8px', color: '#334155', fontSize: '0.88rem', fontWeight: '700' }}>
                  ☁️ Firestore Cloud Database Sync
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
                  Status: <strong>{firebaseConnected ? 'Connected to Cloud' : 'Local Offline / Standalone Mode'}</strong>
                </p>
                {firebaseConnected && (
                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={syncToFirebase}
                    style={{ fontSize: '0.84rem' }}
                  >
                    Sync All Records to Firebase
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="section-card" style={{ background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f1d38', fontSize: '0.96rem', fontWeight: '800' }}>
              📋 Installed Enhancements Checklist
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.9 }}>
              <li>✓ <strong>Bank Copy Removal:</strong> Fee slip redesigned to 2 equal parts (School & Student).</li>
              <li>✓ <strong>Transport Fee Module:</strong> Separately calculated and reported transport charges.</li>
              <li>✓ <strong>April to March Cycle:</strong> Financial year reports & charts sequence strictly April → March.</li>
              <li>✓ <strong>Miscellaneous Charges:</strong> Uniform, books, and event charges integrated with fee slip.</li>
              <li>✓ <strong>Fee History Preservation:</strong> Modifying fee structures never alters previous vouchers.</li>
              <li>✓ <strong>Contact Phone Numbers:</strong> Direct visibility on fee collection, reminders, and slips.</li>
              <li>✓ <strong>8 Financial Reports:</strong> Monthly, Student, Defaulters, Collection, Discount, Transport, Misc, and Admission.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: General Settings */}
      {activeTab === 'general' && (
        <div className="section-card" style={{ maxWidth: '650px' }}>
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>Academic Session Configuration</h3>
          <div className="form-grid single">
            <div className="form-group">
              <label className="form-label">Institution Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="Shezad Children Academy - Schools & Colleges" 
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active Academic Session</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="Academic Session 2026–2027 (April 2026 to March 2027)" 
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="PKR - Pakistani Rupee (Rs)" 
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Challan Copies Format</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="2 Copies (School Copy & Student Copy) — Bank Copy Removed" 
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Annual Financial Cycle</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="April → May → June → July → August → September → October → November → December → January → February → March" 
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Campus Modal */}
      {isAddCampusOpen && (
        <div className="modal-overlay" onClick={() => setIsAddCampusOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Campus</h3>
              <button className="modal-close-btn" onClick={() => setIsAddCampusOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCampusSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Campus Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Kohat Campus"
                      value={newCampus.name}
                      onChange={(e) => setNewCampus({ ...newCampus, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campus 3-Letter Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. KHT"
                      maxLength={4}
                      value={newCampus.code}
                      onChange={(e) => setNewCampus({ ...newCampus, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Kohat"
                      value={newCampus.city}
                      onChange={(e) => setNewCampus({ ...newCampus, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Main Bannu Road"
                      value={newCampus.address}
                      onChange={(e) => setNewCampus({ ...newCampus, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setIsAddCampusOpen(false)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Add Campus</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
