import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getSavedFirebaseConfig } from '../services/firebase';

export default function SettingsView() {
  const { 
    campuses, 
    addCampus, 
    firebaseConnected, 
    firebaseInfo, 
    connectFirebaseProject, 
    disconnectFirebase,
    syncToFirebase,
    resetToScreenshotDemo
  } = useApp();

  const [activeTab, setActiveTab] = useState('firebase'); // 'firebase', 'campuses', 'general'
  
  // Firebase configuration state
  const savedConfig = getSavedFirebaseConfig() || {};
  const [fbConfig, setFbConfig] = useState({
    apiKey: savedConfig.apiKey || '',
    authDomain: savedConfig.authDomain || '',
    projectId: savedConfig.projectId || '',
    storageBucket: savedConfig.storageBucket || '',
    messagingSenderId: savedConfig.messagingSenderId || '',
    appId: savedConfig.appId || ''
  });

  const [syncStatusMessage, setSyncStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Campus state
  const [isAddCampusOpen, setIsAddCampusOpen] = useState(false);
  const [newCampus, setNewCampus] = useState({
    name: '',
    code: '',
    city: '',
    address: ''
  });

  const handleSaveFirebase = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSyncStatusMessage('Connecting to Firebase...');
    const res = await connectFirebaseProject(fbConfig);
    setIsSubmitting(false);
    if (res.success) {
      setSyncStatusMessage('✓ Successfully connected to Firebase Project!');
    } else {
      setSyncStatusMessage(`✕ Connection failed: ${res.error}`);
    }
  };

  const handleSyncData = async () => {
    setIsSubmitting(true);
    setSyncStatusMessage('Synchronizing all collections to Cloud Firestore...');
    const res = await syncToFirebase();
    setIsSubmitting(false);
    if (res.success) {
      setSyncStatusMessage(`✓ Successfully uploaded ${res.count} records to Cloud Firestore!`);
    } else {
      setSyncStatusMessage(`✕ Sync error: ${res.error}`);
    }
  };

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
    alert('New campus registered successfully!');
  };

  return (
    <div className="content-body">
      <div className="page-title-section">
        <h1 className="page-title">System Settings & Firebase Cloud Hub</h1>
        <p className="page-subtitle">Configure academic sessions, campus branches, and live Firebase Firestore database connectivity</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px', paddingBottom: '2px' }}>
        <button 
          className={`nav-item ${activeTab === 'firebase' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveTab('firebase')}
        >
          🔥 Firebase Cloud Database
        </button>
        <button 
          className={`nav-item ${activeTab === 'campuses' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveTab('campuses')}
        >
          🏫 Campuses & Branches ({campuses.length})
        </button>
        <button 
          className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 18px', borderRadius: '6px' }}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ Academic Session & Profile
        </button>
      </div>

      {/* Tab 1: Firebase Hub */}
      {activeTab === 'firebase' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          {/* Config Form */}
          <div className="section-card">
            <div className="section-card-header">
              <div>
                <h3 className="chart-title">Firebase Credentials & Cloud Setup</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Connect your live Google Firebase Firestore database and Authentication
                </p>
              </div>
              <div className={`status-badge ${firebaseConnected ? 'badge-paid' : 'badge-partial'}`}>
                {firebaseConnected ? '● Live Connected' : '○ Local / Demo Mode'}
              </div>
            </div>

            {syncStatusMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: syncStatusMessage.startsWith('✓') ? '#ecfdf5' : '#fef2f2',
                color: syncStatusMessage.startsWith('✓') ? '#065f46' : '#991b1b',
                fontWeight: '600',
                fontSize: '0.86rem'
              }}>
                {syncStatusMessage}
              </div>
            )}

            <form onSubmit={handleSaveFirebase}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Firebase Project ID</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. peace-group-school-db"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">API Key (apiKey)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="AIzaSy..."
                    value={fbConfig.apiKey}
                    onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Auth Domain (authDomain)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="project-id.firebaseapp.com"
                    value={fbConfig.authDomain}
                    onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Storage Bucket (storageBucket)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="project-id.appspot.com"
                    value={fbConfig.storageBucket}
                    onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Messaging Sender ID</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1029384756"
                    value={fbConfig.messagingSenderId}
                    onChange={(e) => setFbConfig({ ...fbConfig, messagingSenderId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">App ID (appId)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="1:1029384756:web:abcd123"
                    value={fbConfig.appId}
                    onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="submit" 
                  className="action-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Save & Connect Firebase'}
                </button>

                {firebaseConnected && (
                  <>
                    <button 
                      type="button" 
                      className="action-btn-primary"
                      style={{ background: '#059669', borderColor: '#059669' }}
                      onClick={handleSyncData}
                      disabled={isSubmitting}
                    >
                      ☁️ Upload All Data to Firestore
                    </button>
                    <button 
                      type="button" 
                      className="action-btn-secondary"
                      onClick={disconnectFirebase}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Quick Guide & Status Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="section-card">
              <h3 className="chart-title" style={{ marginBottom: '10px' }}>Firebase Client Setup Guide</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                Follow these 4 simple steps to connect your production Firebase database:
              </p>
              <ol style={{ fontSize: '0.82rem', color: '#334155', paddingLeft: '18px', lineHeight: 1.8 }}>
                <li>Go to <strong style={{ color: '#0f1d38' }}>console.firebase.google.com</strong> and click <strong>Create a project</strong>.</li>
                <li>In your project, click <strong>Build &gt; Firestore Database</strong>, choose <strong>Create Database</strong> in Test or Production mode.</li>
                <li>Go to <strong>Project Settings (Gear icon) &gt; General</strong>, scroll to <strong>Your apps</strong> and click the <strong>&lt;/&gt; (Web)</strong> icon.</li>
                <li>Copy the <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>firebaseConfig</code> values and paste them into the form on the left!</li>
              </ol>
            </div>

            <div className="section-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <h4 style={{ color: '#92400e', fontSize: '0.95rem', marginBottom: '8px' }}>Demo State Management</h4>
              <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, marginBottom: '12px' }}>
                You can restore the exact initial demo dataset matching the screenshot (10 students, 4 staff members, 10 campuses, Rs 14,200 outstanding) at any time.
              </p>
              <button 
                type="button"
                className="action-btn-secondary"
                style={{ background: '#ffffff', borderColor: '#d97706', color: '#92400e', width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  if (window.confirm("Reset all local records to the exact screenshot demo state?")) {
                    resetToScreenshotDemo();
                    alert("App state has been reset to the exact reference screenshot!");
                  }
                }}
              >
                Reset to Screenshot Sample Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Campuses */}
      {activeTab === 'campuses' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">Registered Campuses & Branches ({campuses.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Active schools and college campuses across Pakistan</p>
            </div>
            <button 
              className="action-btn-primary"
              onClick={() => setIsAddCampusOpen(true)}
              style={{ padding: '8px 16px', fontSize: '0.86rem' }}
            >
              + Add New Campus
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Campus Code</th>
                  <th>Campus Name</th>
                  <th>City</th>
                  <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map(camp => (
                  <tr key={camp.id}>
                    <td style={{ fontWeight: '800', color: '#0f1d38' }}>{camp.code}</td>
                    <td style={{ fontWeight: '600' }}>{camp.name}</td>
                    <td>{camp.city}</td>
                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{camp.address}</td>
                    <td><span className="status-badge badge-paid">{camp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                defaultValue="Academic Session 2026–2027" 
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
              <label className="form-label">Challan Bank Copies</label>
              <input 
                type="text" 
                className="form-input" 
                defaultValue="3 Copies (Bank Copy, School Copy, Student Copy)" 
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
