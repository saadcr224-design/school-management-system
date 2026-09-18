import React from 'react';
import { useApp } from '../context/AppContext';

export default function DashboardView({ onOpenAdmissionModal, onOpenFeeModal, onOpenPaymentModal }) {
  const {
    activeStudentsCount,
    newAdmissionsCount,
    feeCollected,
    outstanding,
    staffCount,
    salaryExpense,
    activeCampusesCount,
    netIncome,
    students,
    feeSlips,
    campuses,
    setActiveTab
  } = useApp();

  // Campus enrollment counts for the Bar Chart
  const campusCodes = ['ABB', 'NOW', 'MNS', 'PSH', 'SWT', 'HAR', 'MBD', 'CHS', 'ISL', 'RWL'];
  
  const campusCounts = campusCodes.map(code => {
    return {
      code,
      count: students.filter(s => s.campus === code && s.status === 'Active').length
    };
  });

  const maxCount = 8; // Matches y-axis in screenshot

  // Fee Status Distribution data
  const unpaidCount = feeSlips.filter(s => s.status === 'Unpaid').length;
  const paidCount = feeSlips.filter(s => s.status === 'Paid').length;
  const partialCount = feeSlips.filter(s => s.status === 'Partial').length;

  return (
    <div className="content-body">
      {/* Page Header (Exact match to screenshot) */}
      <div className="page-title-section">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Academic Session 2026–2027 · Shezad Children Academy</p>
      </div>

      {/* Top 8 Metric Cards Grid (Exact match to screenshot) */}
      <div className="stat-grid-8">
        {/* Card 1: Active Students */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">ACTIVE STUDENTS</span>
            <span className="stat-value">{activeStudentsCount}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        {/* Card 2: New Admissions */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">NEW ADMISSIONS</span>
            <span className="stat-value">{newAdmissionsCount}</span>
            <span className="stat-sublabel">This month</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-teal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
        </div>

        {/* Card 3: Fee Collected */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">FEE COLLECTED</span>
            <span className="stat-value">Rs {feeCollected.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
        </div>

        {/* Card 4: Outstanding */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">OUTSTANDING</span>
            <span className="stat-value" style={{ color: '#991b1b' }}>Rs {outstanding.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Card 5: Staff Members */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">STAFF MEMBERS</span>
            <span className="stat-value">{staffCount}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-slate">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <circle cx="19" cy="11" r="2" />
              <path d="M19 13v2" />
            </svg>
          </div>
        </div>

        {/* Card 6: Salary Expense */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">SALARY EXPENSE</span>
            <span className="stat-value">Rs {salaryExpense.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-burgundy">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>
        </div>

        {/* Card 7: Active Campuses */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">ACTIVE CAMPUSES</span>
            <span className="stat-value">{activeCampusesCount}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
            </svg>
          </div>
        </div>

        {/* Card 8: Net Income */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">NET INCOME</span>
            <span className="stat-value" style={{ color: '#059669' }}>Rs {netIncome.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Analytics Charts (Matching Screenshot Layout) */}
      <div className="charts-grid">
        {/* Student Enrollment by Campus Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Student Enrollment by Campus</h3>
          </div>
          <div className="bar-chart-container">
            {/* Y Axis */}
            <div className="chart-y-axis">
              <span>8</span>
              <span>6</span>
              <span>4</span>
              <span>2</span>
              <span>0</span>
            </div>

            {/* Gridlines */}
            <div className="chart-grid-lines">
              <div className="grid-line"></div>
              <div className="grid-line"></div>
              <div className="grid-line"></div>
              <div className="grid-line"></div>
              <div className="grid-line" style={{ borderBottom: '1px solid #cbd5e1' }}></div>
            </div>

            {/* Columns */}
            <div className="bar-columns-wrapper">
              {campusCounts.map((item, idx) => {
                const heightPercent = (item.count / maxCount) * 100;
                return (
                  <div key={idx} className="bar-col" title={`${item.code}: ${item.count} students`}>
                    <div 
                      className="bar-pillar" 
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    ></div>
                    <span className="bar-pillar-label">{item.code}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fee Status Distribution Donut/Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Fee Status Distribution</h3>
          </div>
          <div className="pie-chart-container">
            <svg width="170" height="170" viewBox="0 0 42 42">
              {/* Background circle / Unpaid wedge */}
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              {/* Red Unpaid slice */}
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="1"
              />
              {/* Center text */}
              <text x="21" y="22" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">
                {unpaidCount}
              </text>
            </svg>
            
            <div className="pie-legend">
              <div className="legend-item">
                <span className="legend-color-box" style={{ backgroundColor: '#dc2626' }}></span>
                <span>Unpaid ({unpaidCount})</span>
              </div>
              {paidCount > 0 && (
                <div className="legend-item">
                  <span className="legend-color-box" style={{ backgroundColor: '#10b981' }}></span>
                  <span>Paid ({paidCount})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action & Pending Dues Section */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">Pending Fee Dues & Urgent Collection</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Students requiring fee recovery for the current academic session</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="action-btn-secondary"
              onClick={() => setActiveTab('feeslips')}
            >
              View All Challans
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Campus</th>
                <th>Class</th>
                <th>Due Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeSlips.filter(s => s.status !== 'Paid').map((slip) => (
                <tr key={slip.id}>
                  <td style={{ fontWeight: '700', color: '#0f1d38' }}>{slip.challanNo}</td>
                  <td style={{ fontWeight: '600' }}>{slip.studentName}</td>
                  <td>{slip.rollNo}</td>
                  <td><span className="status-badge badge-active">{slip.campus}</span></td>
                  <td>{slip.classGrade}</td>
                  <td style={{ fontWeight: '700', color: '#991b1b' }}>Rs {(slip.totalAmount - (slip.amountPaid || 0)).toLocaleString()}</td>
                  <td style={{ color: '#64748b' }}>{slip.dueDate}</td>
                  <td>
                    <span className="status-badge badge-unpaid">
                      {slip.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => onOpenPaymentModal(slip)}
                    >
                      Collect Fee
                    </button>
                  </td>
                </tr>
              ))}
              {feeSlips.filter(s => s.status !== 'Paid').length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    All fee dues are completely cleared!
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
