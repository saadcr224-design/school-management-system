import React from 'react';
import { useApp } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';

export default function SoftwareUpdateModal() {
  const { 
    softwareVersion, 
    isUpdating, 
    updateProgress, 
    updateStatusMessage, 
    updateModalOpen, 
    setUpdateModalOpen, 
    lastUpdatedTime, 
    checkForSoftwareUpdates 
  } = useApp();

  if (!updateModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => !isUpdating && setUpdateModalOpen(false)}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '560px', overflow: 'hidden', padding: 0 }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: '#0f1d38', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SchoolLogo size={36} />
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '800' }}>
                🔄 System Update & Cloud Sync
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Shezad Children Academy — Central Distribution Engine
              </p>
            </div>
          </div>
          {!isUpdating && (
            <button 
              className="modal-close-btn" 
              style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
              onClick={() => setUpdateModalOpen(false)}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          {/* Current Version & Last Updated info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                Current Software Release
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f1d38' }}>
                {softwareVersion}
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
                Last Synced Timestamp
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0369a1', display: 'block', marginTop: '3px' }}>
                {lastUpdatedTime}
              </span>
            </div>
          </div>

          {/* Progress Section */}
          {isUpdating ? (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '700', color: '#0f1d38' }}>Applying System Updates...</span>
                <span style={{ fontWeight: '800', color: '#0284c7' }}>{updateProgress}%</span>
              </div>
              <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${updateProgress}%`, 
                    background: 'linear-gradient(90deg, #0284c7, #059669)',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: '#475569', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                {updateStatusMessage}
              </p>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem', color: '#059669' }}>✓</span>
                <h4 style={{ margin: 0, color: '#065f46', fontSize: '0.96rem', fontWeight: '700' }}>
                  All Software Modules & Locations Up-to-Date
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                All fee management rules (April–March cycles, 2-copy challans, transport & misc fees, defaulter reminders) are active and synced.
              </p>
            </div>
          )}

          {/* Changelog highlights */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h5 style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#334155', fontWeight: '700', textTransform: 'uppercase' }}>
              📦 Release Highlights (v2.4.0)
            </h5>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.7 }}>
              <li><strong>Fee Slip Redesign:</strong> Bank Copy removed; clean 2-Copy (School & Student) layout.</li>
              <li><strong>April → March Cycle:</strong> Annual fee reporting & dashboard graphs start in April.</li>
              <li><strong>Transport & Misc Charges:</strong> Separately managed and billed line items.</li>
              <li><strong>Fee Structure History:</strong> Updates apply to future months while preserving past records.</li>
              <li><strong>Defaulter Reminders:</strong> Real-time contact numbers and notice printing.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {!isUpdating && (
              <button 
                type="button" 
                className="action-btn-secondary" 
                onClick={() => setUpdateModalOpen(false)}
                style={{ padding: '9px 18px' }}
              >
                Close
              </button>
            )}
            <button 
              type="button" 
              className="action-btn-primary" 
              onClick={checkForSoftwareUpdates}
              disabled={isUpdating}
              style={{ 
                padding: '9px 20px', 
                background: isUpdating ? '#94a3b8' : '#0284c7', 
                borderColor: isUpdating ? '#94a3b8' : '#0284c7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isUpdating ? 'Updating...' : '🔄 Run Software Update Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
