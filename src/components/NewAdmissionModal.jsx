import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const CLASSES = [
  'Nursery',
  'Prep',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '1st Year',
  '2nd Year'
];

export default function NewAdmissionModal({ isOpen, onClose }) {
  const { campuses, addStudent, addLedgerEntry, showToast } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    campus: campuses[0]?.code || 'ABB',
    classGrade: '9th',
    section: 'A',
    phone: '',
    monthlyFee: 4500,
    transportFee: 0,
    isTransport: false,
    transportRoute: '',
    admissionFee: 5000,
    address: '',
    admissionDate: new Date().toISOString().split('T')[0]
  });

  // Keep campus updated if campuses change
  useEffect(() => {
    if (campuses.length > 0 && !campuses.some(c => c.code === formData.campus)) {
      setFormData(prev => ({ ...prev, campus: campuses[0].code }));
    }
  }, [campuses]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.fatherName) {
      alert('Please fill in Student Name and Father Name.');
      return;
    }

    const selectedCamp = campuses.find(c => c.code === formData.campus);
    const campusCode = formData.campus || (campuses[0]?.code || 'ABB');
    const campusFullName = selectedCamp ? selectedCamp.name : campusCode;
    const campusCity = selectedCamp ? selectedCamp.city : '';

    const rollNo = `${campusCode}-${Math.floor(100 + Math.random() * 900)}`;

    const newStudentData = {
      ...formData,
      campus: campusCode,
      campusName: campusFullName,
      campusCity,
      rollNo,
      monthlyFee: Number(formData.monthlyFee) || 0,
      transportFee: formData.isTransport ? (Number(formData.transportFee) || 0) : 0,
      admissionFee: Number(formData.admissionFee) || 0
    };

    addStudent(newStudentData);

    // Record Admission Fee in Ledger if greater than 0
    if (Number(formData.admissionFee) > 0) {
      addLedgerEntry({
        date: formData.admissionDate,
        description: `New Admission Fee: ${formData.name} (${rollNo}) - ${campusFullName}`,
        category: 'Admission Fee',
        campus: campusCode,
        type: 'Credit',
        amount: Number(formData.admissionFee)
      });
    }

    // Reset form
    setFormData({
      name: '',
      fatherName: '',
      campus: campuses[0]?.code || 'ABB',
      classGrade: '9th',
      section: 'A',
      phone: '',
      monthlyFee: 4500,
      transportFee: 0,
      isTransport: false,
      transportRoute: '',
      admissionFee: 5000,
      address: '',
      admissionDate: new Date().toISOString().split('T')[0]
    });

    onClose();
  };

  const selectedCampusObj = campuses.find(c => c.code === formData.campus);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#0f1d38', color: '#fff', padding: '16px 20px' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#fff' }}>📝 New Student Admission Registration</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              Register new student with academic profile, tuition fee, and optional transport service
            </p>
          </div>
          <button className="modal-close-btn" style={{ color: '#fff' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            <div className="form-grid">
              
              {/* Student Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                  Student Full Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Muhammad Bilal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Father Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>
                  Father / Guardian Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Tariq Mahmood"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  required
                />
              </div>

              {/* Campus Branch Selection */}
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#f0f9ff', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #bae6fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: '800', color: '#0369a1', margin: 0 }}>
                    🏫 Select Campus Branch *
                  </label>
                  {selectedCampusObj && (
                    <span style={{ fontSize: '0.76rem', color: '#0369a1', fontWeight: '600' }}>
                      📍 City: {selectedCampusObj.city}
                    </span>
                  )}
                </div>
                <select 
                  className="form-select"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                  required
                  style={{ fontWeight: '700', color: '#0f1d38', background: '#fff', border: '1.5px solid #0284c7' }}
                >
                  {campuses.map(c => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.name} ({c.code}) — {c.city}
                    </option>
                  ))}
                  {campuses.length === 0 && (
                    <option value="ABB">Default Main Campus (ABB)</option>
                  )}
                </select>
              </div>

              {/* Class */}
              <div className="form-group">
                <label className="form-label">Class / Grade *</label>
                <select 
                  className="form-select"
                  value={formData.classGrade}
                  onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                  required
                >
                  {CLASSES.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="form-group">
                <label className="form-label">Section / Group</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. A, B, Pre-Medical, ICS"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Contact / Mobile Phone *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 0300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              {/* Admission Date */}
              <div className="form-group">
                <label className="form-label">Admission Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                />
              </div>

              {/* Monthly Tuition Fee */}
              <div className="form-group">
                <label className="form-label">Monthly Tuition Fee (Rs) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                  min="0"
                  required
                />
              </div>

              {/* Admission Fee Charged */}
              <div className="form-group">
                <label className="form-label">Admission Fee Charged (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.admissionFee}
                  onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })}
                  min="0"
                />
              </div>

              {/* Transport Service Toggle & Details */}
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer', marginBottom: formData.isTransport ? '10px' : 0 }}>
                  <input 
                    type="checkbox"
                    checked={formData.isTransport}
                    onChange={(e) => setFormData({ ...formData, isTransport: e.target.checked })}
                  />
                  🚌 Student will use School Transport Van/Bus Service
                </label>

                {formData.isTransport && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                    <div>
                      <label className="form-label">Monthly Transport Fee (Rs) *</label>
                      <input 
                        type="number"
                        className="form-input"
                        placeholder="e.g. 1500"
                        value={formData.transportFee}
                        onChange={(e) => setFormData({ ...formData, transportFee: e.target.value })}
                        min="0"
                        required={formData.isTransport}
                      />
                    </div>
                    <div>
                      <label className="form-label">Transport Route / Stop</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. Route 1 - Main City / Station"
                        value={formData.transportRoute}
                        onChange={(e) => setFormData({ ...formData, transportRoute: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Residential Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Street Address, Area, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="action-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="action-btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.94rem' }}
            >
              ✓ Confirm & Register Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
