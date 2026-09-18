import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AttendanceView() {
  const { students, staff, campuses, saveAttendanceRecord } = useApp();
  const [attendanceType, setAttendanceType] = useState('students'); // 'students' or 'staff'
  const [attendanceDate, setAttendanceDate] = useState('2026-03-18');
  const [selectedCampus, setSelectedCampus] = useState('ABB');
  const [selectedClass, setSelectedClass] = useState('9th');
  
  // Local state for current attendance sheet
  const [attendanceMap, setAttendanceMap] = useState({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const targetList = attendanceType === 'students' 
    ? students.filter(s => s.campus === selectedCampus && s.classGrade === selectedClass)
    : staff.filter(s => selectedCampus === 'ALL' || s.campus === selectedCampus);

  const getStatus = (id) => attendanceMap[id] || 'Present';

  const setStatus = (id, status) => {
    setAttendanceMap(prev => ({ ...prev, [id]: status }));
    setSavedSuccess(false);
  };

  const handleMarkAllPresent = () => {
    const newMap = { ...attendanceMap };
    targetList.forEach(item => {
      newMap[item.id] = 'Present';
    });
    setAttendanceMap(newMap);
    setSavedSuccess(false);
  };

  const handleSave = () => {
    const records = targetList.map(item => ({
      targetId: item.id,
      name: item.name,
      rollOrCode: item.rollNo || item.empCode,
      date: attendanceDate,
      campus: selectedCampus,
      classGrade: attendanceType === 'students' ? selectedClass : 'STAFF',
      status: getStatus(item.id)
    }));

    saveAttendanceRecord(attendanceDate, selectedCampus, selectedClass, records);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Metrics
  const total = targetList.length;
  const presentCount = targetList.filter(item => getStatus(item.id) === 'Present').length;
  const absentCount = targetList.filter(item => getStatus(item.id) === 'Absent').length;
  const lateCount = targetList.filter(item => getStatus(item.id) === 'Late').length;
  const leaveCount = targetList.filter(item => getStatus(item.id) === 'Leave').length;
  const presentRate = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Daily Attendance System</h1>
          <p className="page-subtitle">Record daily attendance for students and faculty with instant percentage analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="action-btn-secondary"
            onClick={handleMarkAllPresent}
          >
            Mark All Present
          </button>
          <button 
            className="action-btn-primary"
            onClick={handleSave}
          >
            {savedSuccess ? '✓ Saved Successfully' : 'Save Attendance Sheet'}
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            <button 
              className={`nav-item ${attendanceType === 'students' ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem' }}
              onClick={() => setAttendanceType('students')}
            >
              Students Attendance
            </button>
            <button 
              className={`nav-item ${attendanceType === 'staff' ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem' }}
              onClick={() => setAttendanceType('staff')}
            >
              Staff Attendance
            </button>
          </div>

          <div style={{ width: '160px' }}>
            <input 
              type="date"
              className="form-input"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select 
              className="form-select"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              {campuses.map(c => (
                <option key={c.id} value={c.code}>{c.code} - {c.city}</option>
              ))}
            </select>
          </div>

          {attendanceType === 'students' && (
            <div style={{ width: '150px' }}>
              <select 
                className="form-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="7th">Class 7th</option>
                <option value="8th">Class 8th</option>
                <option value="9th">Class 9th</option>
                <option value="10th">Class 10th</option>
                <option value="1st Year">1st Year (FSc)</option>
                <option value="2nd Year">2nd Year (ICS)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL REGISTERED</span>
            <span className="stat-value">{total}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">📋</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">PRESENT TODAY</span>
            <span className="stat-value" style={{ color: '#059669' }}>{presentCount} ({presentRate}%)</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">✓</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">ABSENT</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>{absentCount}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">✕</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">LATE / ON LEAVE</span>
            <span className="stat-value" style={{ color: '#d97706' }}>{lateCount + leaveCount}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">⏰</div>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">
              {attendanceType === 'students' ? `Attendance Sheet - Class ${selectedClass} (${selectedCampus} Campus)` : `Faculty Attendance (${selectedCampus} Campus)`}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {attendanceDate}</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID / Roll No</th>
                <th>Name</th>
                <th>Father / Contact</th>
                <th>Class / Role</th>
                <th style={{ textAlign: 'center' }}>Present</th>
                <th style={{ textAlign: 'center' }}>Absent</th>
                <th style={{ textAlign: 'center' }}>Late</th>
                <th style={{ textAlign: 'center' }}>Leave</th>
              </tr>
            </thead>
            <tbody>
              {targetList.map(item => {
                const currentStatus = getStatus(item.id);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '700', color: '#0f1d38' }}>{item.rollNo || item.empCode}</td>
                    <td style={{ fontWeight: '600' }}>{item.name}</td>
                    <td style={{ color: '#64748b' }}>{item.fatherName || item.phone}</td>
                    <td>{item.classGrade || item.designation}</td>
                    
                    {/* Present */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, 'Present')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: currentStatus === 'Present' ? '2px solid #059669' : '1px solid #e2e8f0',
                          backgroundColor: currentStatus === 'Present' ? '#ecfdf5' : '#ffffff',
                          color: currentStatus === 'Present' ? '#065f46' : '#64748b',
                          fontWeight: currentStatus === 'Present' ? '700' : '500',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        P
                      </button>
                    </td>

                    {/* Absent */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, 'Absent')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: currentStatus === 'Absent' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          backgroundColor: currentStatus === 'Absent' ? '#fef2f2' : '#ffffff',
                          color: currentStatus === 'Absent' ? '#991b1b' : '#64748b',
                          fontWeight: currentStatus === 'Absent' ? '700' : '500',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        A
                      </button>
                    </td>

                    {/* Late */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, 'Late')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: currentStatus === 'Late' ? '2px solid #d97706' : '1px solid #e2e8f0',
                          backgroundColor: currentStatus === 'Late' ? '#fffbeb' : '#ffffff',
                          color: currentStatus === 'Late' ? '#92400e' : '#64748b',
                          fontWeight: currentStatus === 'Late' ? '700' : '500',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        L
                      </button>
                    </td>

                    {/* Leave */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, 'Leave')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: currentStatus === 'Leave' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: currentStatus === 'Leave' ? '#eff6ff' : '#ffffff',
                          color: currentStatus === 'Leave' ? '#1e40af' : '#64748b',
                          fontWeight: currentStatus === 'Leave' ? '700' : '500',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Lv
                      </button>
                    </td>
                  </tr>
                );
              })}
              {targetList.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No records found for this campus and class combination.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
