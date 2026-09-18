import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ReportsView() {
  const { students, feeSlips, staff, campuses, ledger } = useApp();
  const [reportTab, setReportTab] = useState('defaulters');

  // Defaulters (Unpaid or Partial)
  const unpaidSlips = feeSlips.filter(s => s.status !== 'Paid');
  const totalDefaulterAmount = unpaidSlips.reduce((acc, s) => acc + ((s.totalAmount || 0) - (s.amountPaid || 0)), 0);

  // Campus comparison calculation
  const campusAnalytics = campuses.map(camp => {
    const campusStudents = students.filter(s => s.campus === camp.code);
    const campusSlips = feeSlips.filter(s => s.campus === camp.code);
    const campusStaff = staff.filter(s => s.campus === camp.code);
    
    const billed = campusSlips.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const collected = campusSlips.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const outstanding = billed - collected;
    const recoveryRate = billed > 0 ? Math.round((collected / billed) * 100) : 100;

    return {
      code: camp.code,
      name: camp.name,
      city: camp.city,
      studentsCount: campusStudents.length,
      staffCount: campusStaff.length,
      billed,
      collected,
      outstanding,
      recoveryRate
    };
  });

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Executive Reports & Analytics</h1>
          <p className="page-subtitle">Campus audit reports, fee recovery status, and administrative analytics</p>
        </div>
        <button 
          className="action-btn-primary"
          onClick={() => window.print()}
          style={{ padding: '9px 18px', fontSize: '0.9rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Print Official Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '20px', paddingBottom: '2px' }}>
        <button 
          className={`nav-item ${reportTab === 'defaulters' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px', borderRadius: '6px' }}
          onClick={() => setReportTab('defaulters')}
        >
          Fee Defaulters List ({unpaidSlips.length})
        </button>
        <button 
          className={`nav-item ${reportTab === 'campus' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px', borderRadius: '6px' }}
          onClick={() => setReportTab('campus')}
        >
          Campus-wise Performance
        </button>
        <button 
          className={`nav-item ${reportTab === 'enrollment' ? 'active' : ''}`}
          style={{ width: 'auto', padding: '8px 16px', borderRadius: '6px' }}
          onClick={() => setReportTab('enrollment')}
        >
          Class Enrollment Distribution
        </button>
      </div>

      {/* Tab 1: Defaulters */}
      {reportTab === 'defaulters' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">Overdue Fee Defaulters Audit</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Total Pending Arrears: <strong style={{ color: '#991b1b' }}>Rs {totalDefaulterAmount.toLocaleString()}</strong> across {unpaidSlips.length} student(s)
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Campus</th>
                  <th>Class</th>
                  <th>Challan #</th>
                  <th>Month</th>
                  <th>Total Due</th>
                  <th>Contact #</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {unpaidSlips.map(slip => {
                  const student = students.find(s => s.id === slip.studentId || s.rollNo === slip.rollNo);
                  const remaining = slip.totalAmount - (slip.amountPaid || 0);
                  return (
                    <tr key={slip.id}>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.rollNo}</td>
                      <td style={{ fontWeight: '600' }}>{slip.studentName}</td>
                      <td><span className="status-badge badge-active">{slip.campus}</span></td>
                      <td>{slip.classGrade}</td>
                      <td style={{ color: '#64748b' }}>{slip.challanNo}</td>
                      <td>{slip.month}</td>
                      <td style={{ fontWeight: '800', color: '#991b1b' }}>Rs {remaining.toLocaleString()}</td>
                      <td>{student ? student.phone : '-'}</td>
                      <td>
                        <span className="status-badge badge-unpaid">
                          {slip.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {unpaidSlips.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#059669', fontWeight: '600' }}>
                      ✓ 100% of all fee challans are settled! No defaulters found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Campus Performance */}
      {reportTab === 'campus' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">Campus-Wise Financial & Enrollment Analysis</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Breakdown of fee recovery and student counts across all 10 branches</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th>City</th>
                  <th>Students</th>
                  <th>Staff</th>
                  <th>Total Billed</th>
                  <th>Collected</th>
                  <th>Outstanding</th>
                  <th>Recovery Rate</th>
                </tr>
              </thead>
              <tbody>
                {campusAnalytics.map(ca => (
                  <tr key={ca.code}>
                    <td style={{ fontWeight: '700', color: '#0f1d38' }}>{ca.name} ({ca.code})</td>
                    <td>{ca.city}</td>
                    <td style={{ fontWeight: '600' }}>{ca.studentsCount}</td>
                    <td>{ca.staffCount}</td>
                    <td style={{ fontWeight: '600' }}>Rs {ca.billed.toLocaleString()}</td>
                    <td style={{ color: '#059669', fontWeight: '700' }}>Rs {ca.collected.toLocaleString()}</td>
                    <td style={{ color: ca.outstanding > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                      Rs {ca.outstanding.toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: '1', height: '6px', background: '#e2e8f0', borderRadius: '3px', width: '60px', overflow: 'hidden' }}>
                          <div style={{ width: `${ca.recoveryRate}%`, height: '100%', background: ca.recoveryRate > 75 ? '#059669' : '#dc2626' }}></div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>{ca.recoveryRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Enrollment */}
      {reportTab === 'enrollment' && (
        <div className="section-card">
          <div className="section-card-header">
            <div>
              <h3 className="chart-title">Enrollment Distribution by Class & Level</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Student distribution across academic tiers</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Class / Grade Level</th>
                  <th>Total Students</th>
                  <th>Abbottabad (ABB)</th>
                  <th>Swat (SWT)</th>
                  <th>Average Monthly Tuition</th>
                </tr>
              </thead>
              <tbody>
                {['7th', '8th', '9th', '10th', '1st Year', '2nd Year'].map(grade => {
                  const gradeStudents = students.filter(s => s.classGrade === grade);
                  const abbCount = gradeStudents.filter(s => s.campus === 'ABB').length;
                  const swtCount = gradeStudents.filter(s => s.campus === 'SWT').length;
                  const avgFee = gradeStudents.length > 0 
                    ? Math.round(gradeStudents.reduce((a, s) => a + (s.monthlyFee || 0), 0) / gradeStudents.length)
                    : 0;

                  return (
                    <tr key={grade}>
                      <td style={{ fontWeight: '700', color: '#0f1d38' }}>Class {grade}</td>
                      <td style={{ fontWeight: '600' }}>{gradeStudents.length}</td>
                      <td>{abbCount}</td>
                      <td>{swtCount}</td>
                      <td>Rs {avgFee.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
