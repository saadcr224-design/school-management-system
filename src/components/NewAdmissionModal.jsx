import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function NewAdmissionModal({ isOpen, onClose }) {
  const { campuses, addStudent, addLedgerEntry } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    campus: 'ABB',
    classGrade: '9th',
    section: 'A',
    phone: '',
    monthlyFee: 4500,
    admissionFee: 5000,
    address: '',
    admissionDate: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.fatherName) return;

    const rollNo = `${formData.campus}-${Math.floor(100 + Math.random() * 900)}`;
    const student = addStudent({
      ...formData,
      rollNo,
      monthlyFee: Number(formData.monthlyFee)
    });

    // Record Admission Fee in Ledger if greater than 0
    if (formData.admissionFee > 0) {
      addLedgerEntry({
        date: formData.admissionDate,
        description: `Admission Fee: ${formData.name} (${rollNo})`,
        category: 'Admission Fee',
        campus: formData.campus,
        type: 'Credit',
        amount: Number(formData.admissionFee)
      });
    }

    alert(`Student ${formData.name} successfully admitted with Roll No: ${rollNo}!`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Student Admission Form</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Student Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Zeeshan Khan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Father / Guardian Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Tariq Khan"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campus Branch</label>
                <select 
                  className="form-select"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                >
                  {campuses.map(c => (
                    <option key={c.id} value={c.code}>{c.code} - {c.city}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Class / Grade</label>
                <select 
                  className="form-select"
                  value={formData.classGrade}
                  onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                >
                  <option value="7th">Class 7th</option>
                  <option value="8th">Class 8th</option>
                  <option value="9th">Class 9th</option>
                  <option value="10th">Class 10th</option>
                  <option value="1st Year">1st Year (FSc / ICS)</option>
                  <option value="2nd Year">2nd Year (FSc / ICS)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Section</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="A, B, Pre-Med, etc."
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact / Mobile Phone</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="0300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Tuition Fee (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admission Fee Charged (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.admissionFee}
                  onChange={(e) => setFormData({ ...formData, admissionFee: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Residential Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="City, District, Street Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="action-btn-primary">Register & Admit Student</button>
          </div>
        </form>
      </div>
    </div>
  );
}
