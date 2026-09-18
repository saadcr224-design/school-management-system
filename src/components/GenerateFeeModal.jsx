import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function GenerateFeeModal({ isOpen, onClose }) {
  const { students, generateFeeSlip } = useApp();
  
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [month, setMonth] = useState('March 2026');
  const [dueDate, setDueDate] = useState('2026-03-25');
  const [tuitionFee, setTuitionFee] = useState(4500);
  const [examFee, setExamFee] = useState(500);
  const [admissionFee, setAdmissionFee] = useState(0);

  if (!isOpen) return null;

  const handleStudentChange = (e) => {
    const stdId = e.target.value;
    setSelectedStudentId(stdId);
    const found = students.find(s => s.id === stdId);
    if (found) {
      setTuitionFee(found.monthlyFee || 4500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const total = Number(tuitionFee) + Number(examFee) + Number(admissionFee);

    generateFeeSlip({
      studentId: student.id,
      studentName: student.name,
      rollNo: student.rollNo,
      campus: student.campus,
      classGrade: student.classGrade,
      month,
      dueDate,
      tuitionFee: Number(tuitionFee),
      examFee: Number(examFee),
      admissionFee: Number(admissionFee),
      totalAmount: total
    });

    alert(`Fee Challan issued successfully for ${student.name} (${student.rollNo})! Total: Rs. ${total.toLocaleString()}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Generate Fee Challan</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Select Student *</label>
                <select 
                  className="form-select"
                  value={selectedStudentId}
                  onChange={handleStudentChange}
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNo}) - {s.campus} Campus - Class {s.classGrade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Month</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tuition Fee (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={tuitionFee}
                  onChange={(e) => setTuitionFee(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Examination Fee (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={examFee}
                  onChange={(e) => setExamFee(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admission / Arrears Fee (Rs)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={admissionFee}
                  onChange={(e) => setAdmissionFee(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Calculated Total Fee</label>
                <div style={{ padding: '9px 12px', background: '#f8fafc', borderRadius: '8px', fontWeight: '800', color: '#0f1d38', border: '1px solid #e2e8f0' }}>
                  Rs {(Number(tuitionFee) + Number(examFee) + Number(admissionFee)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="action-btn-primary">Generate & Print Challan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
