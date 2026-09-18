import React from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar({ onOpenAdmissionModal, onOpenFeeModal }) {
  const { 
    selectedCampus, 
    setSelectedCampus, 
    campuses, 
    firebaseConnected, 
    firebaseInfo, 
    setActiveTab 
  } = useApp();

  return (
    <header className="top-navbar no-print">
      <div className="navbar-left">
        <div className="campus-select-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <label htmlFor="campusSelect" style={{ fontSize: '0.78rem', color: '#64748b' }}>Campus:</label>
          <select 
            id="campusSelect"
            className="campus-select"
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="ALL">All Campuses (10 Campuses)</option>
            {campuses.map(camp => (
              <option key={camp.id} value={camp.code}>
                {camp.name} ({camp.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="navbar-right">
        {/* Firebase Live Status Pill */}
        <div 
          className={`firebase-pill ${firebaseConnected ? 'connected' : 'local'}`}
          onClick={() => setActiveTab('settings')}
          title="Click to view/configure Firebase connection settings"
        >
          <span className={`status-dot ${firebaseConnected ? 'green' : 'yellow'}`}></span>
          <span>{firebaseConnected ? `Firebase Live (${firebaseInfo.projectId || 'Connected'})` : 'Local Storage Mode'}</span>
        </div>

        <button 
          className="action-btn-secondary"
          onClick={onOpenFeeModal}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Issue Challan</span>
        </button>

        <button 
          className="action-btn-primary"
          onClick={onOpenAdmissionModal}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          <span>New Admission</span>
        </button>
      </div>
    </header>
  );
}
