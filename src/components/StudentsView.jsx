import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function StudentsView({ onOpenAdmissionModal }) {
  const { students, campuses, deleteStudent, updateStudent } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  
  // Selected student for detail/card modal
  const [activeStudentDetail, setActiveStudentDetail] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchesCampus = selectedCampusFilter === 'ALL' || s.campus === selectedCampusFilter;
    const matchesClass = selectedClassFilter === 'ALL' || s.classGrade === selectedClassFilter;
    return matchesSearch && matchesCampus && matchesClass;
  });

  const classesList = ['7th', '8th', '9th', '10th', '1st Year', '2nd Year'];

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudent(editingStudent.id, editingStudent);
    setEditingStudent(null);
    alert('Student record updated successfully!');
  };

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Students Directory</h1>
          <p className="page-subtitle">Manage student enrollments, academic profiles, and admission records</p>
        </div>
        <button 
          className="action-btn-primary"
          onClick={onOpenAdmissionModal}
          style={{ padding: '9px 18px', fontSize: '0.9rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>New Admission</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search by student name, roll number, or phone..."
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

          <div style={{ width: '160px' }}>
            <select 
              className="form-select"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="ALL">All Classes</option>
              {classesList.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">Enrolled Students ({filtered.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Active students across all campuses</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Father Name</th>
                <th>Campus</th>
                <th>Class & Sec</th>
                <th>Contact</th>
                <th>Monthly Fee</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => (
                <tr key={student.id}>
                  <td style={{ fontWeight: '700', color: '#0f1d38' }}>{student.rollNo}</td>
                  <td style={{ fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%', 
                        background: '#e2e8f0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#1e293b'
                      }}>
                        {student.name.charAt(0)}
                      </div>
                      <span>{student.name}</span>
                    </div>
                  </td>
                  <td>{student.fatherName}</td>
                  <td>
                    <span className="status-badge badge-active">{student.campus}</span>
                  </td>
                  <td>{student.classGrade} ({student.section})</td>
                  <td>{student.phone}</td>
                  <td style={{ fontWeight: '600' }}>Rs {student.monthlyFee?.toLocaleString()}</td>
                  <td>
                    <span className="status-badge badge-paid">{student.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        className="action-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        title="View Student ID Card"
                        onClick={() => setActiveStudentDetail(student)}
                      >
                        ID Card
                      </button>
                      <button 
                        className="action-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        title="Edit Student"
                        onClick={() => setEditingStudent(student)}
                      >
                        Edit
                      </button>
                      <button 
                        className="action-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626' }}
                        title="Delete Student"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove ${student.name}?`)) {
                            deleteStudent(student.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student ID Card Modal */}
      {activeStudentDetail && (
        <div className="modal-overlay" onClick={() => setActiveStudentDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Student Identity Card</h3>
              <button className="modal-close-btn" onClick={() => setActiveStudentDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'linear-gradient(135deg, #0f1d38 0%, #1e3a8a 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(15, 29, 56, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '32px', height: '32px', background: '#f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🎓
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '800', lineHeight: 1.1 }}>SHEZAD CHILDREN ACADEMY</h4>
                    <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Schools & Colleges · {activeStudentDetail.campus} Campus</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0f1d38', fontWeight: '800' }}>
                    {activeStudentDetail.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ color: '#ffffff', fontSize: '1.1rem' }}>{activeStudentDetail.name}</h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>S/D of {activeStudentDetail.fatherName}</p>
                    <span style={{ display: 'inline-block', marginTop: '4px', background: '#f59e0b', color: '#0f1d38', fontWeight: '800', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                      {activeStudentDetail.rollNo}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>Class & Section:</span>
                    <span style={{ fontWeight: '600' }}>{activeStudentDetail.classGrade} - {activeStudentDetail.section}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>Emergency Contact:</span>
                    <span style={{ fontWeight: '600' }}>{activeStudentDetail.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#cbd5e1' }}>Session:</span>
                    <span style={{ fontWeight: '600' }}>2026–2027</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => window.print()}>
                Print ID Card
              </button>
              <button className="action-btn-primary" onClick={() => setActiveStudentDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Student Profile</h3>
              <button className="modal-close-btn" onClick={() => setEditingStudent(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.fatherName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Campus</label>
                    <select 
                      className="form-select"
                      value={editingStudent.campus}
                      onChange={(e) => setEditingStudent({ ...editingStudent, campus: e.target.value })}
                    >
                      {campuses.map(c => (
                        <option key={c.id} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select 
                      className="form-select"
                      value={editingStudent.classGrade}
                      onChange={(e) => setEditingStudent({ ...editingStudent, classGrade: e.target.value })}
                    >
                      {classesList.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.section}
                      onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={editingStudent.phone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Tuition Fee (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={editingStudent.monthlyFee}
                      onChange={(e) => setEditingStudent({ ...editingStudent, monthlyFee: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setEditingStudent(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
