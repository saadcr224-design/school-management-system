import React, { useState } from 'react';
import { useApp, ACADEMIC_MONTHS, getAcademicMonthYear } from '../context/AppContext';

export default function DashboardView({ onOpenAdmissionModal, onOpenFeeModal, onOpenPaymentModal }) {
  const {
    activeStudentsCount,
    newAdmissionsCount,
    feeCollected,
    todayCollection,
    monthlyCollection,
    transportCollection,
    totalDiscounts,
    admissionCollection,
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

  // Chart Metric Toggle: 'collection', 'outstanding', 'billed', 'discounts'
  const [chartMetric, setChartMetric] = useState('collection');

  // Compute 12-Month Academic Data (April → March) from real fee slips
  const monthlyAcademicData = ACADEMIC_MONTHS.map(monthName => {
    // Slips that match this month
    const matchingSlips = feeSlips.filter(s => s.month && s.month.includes(monthName));
    const billed = matchingSlips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const collected = matchingSlips.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const pending = Math.max(0, billed - collected);
    const discounts = matchingSlips.reduce((sum, s) => sum + (s.discount || 0), 0);

    return {
      month: monthName,
      shortLabel: monthName.substring(0, 3),
      fullTag: getAcademicMonthYear(monthName),
      billed,
      collected,
      outstanding: pending,
      discounts,
      slipsCount: matchingSlips.length
    };
  });

  // Calculate highest metric for bar chart scaling
  const maxChartVal = Math.max(
    ...monthlyAcademicData.map(d => {
      if (chartMetric === 'collection') return d.collected;
      if (chartMetric === 'outstanding') return d.outstanding;
      if (chartMetric === 'billed') return d.billed;
      return d.discounts;
    }),
    15000 // min ceiling for pleasant scaling
  );

  // Class-wise student enrollment
  const classGrades = ['Nursery', 'Prep', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '1st Year', '2nd Year'];
  const classDistribution = classGrades.map(grade => {
    const classStudents = students.filter(s => s.classGrade === grade && s.status === 'Active');
    const transportCount = classStudents.filter(s => s.isTransport || (s.transportFee > 0)).length;
    return {
      grade,
      count: classStudents.length,
      transportCount
    };
  }).filter(c => c.count > 0);

  const maxClassCount = Math.max(...classDistribution.map(c => c.count), 5);

  // Fee Status Distribution data
  const unpaidCount = feeSlips.filter(s => s.status === 'Unpaid').length;
  const paidCount = feeSlips.filter(s => s.status === 'Paid').length;
  const partialCount = feeSlips.filter(s => s.status === 'Partial').length;

  return (
    <div className="content-body">
      {/* Page Header */}
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Academic Session 2026–2027 · April to March Financial Cycle · Shezad Children Academy</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onOpenPaymentModal && (
            <button 
              className="action-btn-primary"
              onClick={() => onOpenPaymentModal({})}
              style={{ fontSize: '0.85rem', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              <span><strong>💳 Pay Student Fee</strong></span>
            </button>
          )}
          <button 
            className="action-btn-secondary"
            onClick={onOpenAdmissionModal}
            style={{ fontSize: '0.85rem' }}
          >
            + New Admission
          </button>
          <button 
            className="action-btn-secondary"
            onClick={onOpenFeeModal}
            style={{ fontSize: '0.85rem' }}
          >
            + Generate Challan
          </button>
        </div>
      </div>

      {/* Top 8 Metric Cards Grid */}
      <div className="stat-grid-8" style={{ marginBottom: '24px' }}>
        {/* Card 1: Total Active Students */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL STUDENTS</span>
            <span className="stat-value">{activeStudentsCount}</span>
            <span className="stat-sublabel">{students.filter(s => s.isTransport).length} on Transport</span>
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
            <span className="stat-sublabel">This Month</span>
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

        {/* Card 3: Total Fee Collection */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL COLLECTED</span>
            <span className="stat-value" style={{ color: '#059669' }}>Rs {feeCollected.toLocaleString()}</span>
            <span className="stat-sublabel">Overall session</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Card 4: Today's Collection */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TODAY'S COLLECTION</span>
            <span className="stat-value" style={{ color: '#0284c7' }}>Rs {todayCollection.toLocaleString()}</span>
            <span className="stat-sublabel">Recorded today</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
        </div>

        {/* Card 5: Monthly Collection */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">MONTHLY COLLECTION</span>
            <span className="stat-value">Rs {monthlyCollection.toLocaleString()}</span>
            <span className="stat-sublabel">Current Academic Month</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
        </div>

        {/* Card 6: Total Outstanding Fees */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">OUTSTANDING FEES</span>
            <span className="stat-value" style={{ color: '#991b1b' }}>Rs {outstanding.toLocaleString()}</span>
            <span className="stat-sublabel">{unpaidCount + partialCount} unpaid slips</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        {/* Card 7: Total Discounts */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL DISCOUNTS</span>
            <span className="stat-value" style={{ color: '#d97706' }}>Rs {totalDiscounts.toLocaleString()}</span>
            <span className="stat-sublabel">Sibling & concessions</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="5" x2="5" y2="19" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>
        </div>

        {/* Card 8: Transport Collection */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TRANSPORT COLLECTION</span>
            <span className="stat-value" style={{ color: '#0369a1' }}>Rs {transportCollection.toLocaleString()}</span>
            <span className="stat-sublabel">Van & Bus recovery</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="12" x="3" y="6" rx="2" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* GRAPH 1: 12-Month Academic Fee Activity Chart (April → March) */}
      <div className="section-card" style={{ marginBottom: '24px' }}>
        <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="chart-title">📊 Academic Financial Year Performance (April 2026 → March 2027)</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Complete 12-month sequence tracking fee billing, collections, outstanding dues, and concessions
            </p>
          </div>

          {/* Metric Switcher Pills */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setChartMetric('collection')}
              style={{
                border: 'none',
                background: chartMetric === 'collection' ? '#059669' : 'transparent',
                color: chartMetric === 'collection' ? '#fff' : '#475569',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Fee Collected
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('outstanding')}
              style={{
                border: 'none',
                background: chartMetric === 'outstanding' ? '#dc2626' : 'transparent',
                color: chartMetric === 'outstanding' ? '#fff' : '#475569',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Outstanding Dues
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('billed')}
              style={{
                border: 'none',
                background: chartMetric === 'billed' ? '#0284c7' : 'transparent',
                color: chartMetric === 'billed' ? '#fff' : '#475569',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Total Billed
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('discounts')}
              style={{
                border: 'none',
                background: chartMetric === 'discounts' ? '#d97706' : 'transparent',
                color: chartMetric === 'discounts' ? '#fff' : '#475569',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Discounts
            </button>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 10px 0', borderBottom: '1px solid #cbd5e1', position: 'relative' }}>
          {monthlyAcademicData.map((item, idx) => {
            let currentVal = item.collected;
            let barColor = '#059669';
            if (chartMetric === 'outstanding') {
              currentVal = item.outstanding;
              barColor = '#dc2626';
            } else if (chartMetric === 'billed') {
              currentVal = item.billed;
              barColor = '#0284c7';
            } else if (chartMetric === 'discounts') {
              currentVal = item.discounts;
              barColor = '#d97706';
            }

            const heightPercent = maxChartVal > 0 ? (currentVal / maxChartVal) * 100 : 0;

            return (
              <div 
                key={idx} 
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                title={`${item.fullTag}: Rs ${currentVal.toLocaleString()} (${item.slipsCount} vouchers)`}
              >
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: currentVal > 0 ? '#0f1d38' : '#94a3b8', marginBottom: '4px' }}>
                  {currentVal > 0 ? (currentVal >= 1000 ? `${(currentVal/1000).toFixed(1)}k` : currentVal) : '0'}
                </span>
                <div 
                  style={{ 
                    width: '100%', 
                    maxWidth: '38px', 
                    height: `${Math.max(heightPercent, currentVal > 0 ? 6 : 2)}%`, 
                    background: currentVal > 0 ? barColor : '#e2e8f0', 
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease'
                  }}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginTop: '6px' }}>
                  {item.shortLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.78rem', color: '#64748b' }}>
          <span>Academic Cycle Start: <strong>April 2026</strong></span>
          <span>Cycle End: <strong>March 2027</strong></span>
        </div>
      </div>

      {/* Row of 2 Charts: Student Distribution by Class & Fee Status Breakdown */}
      <div className="charts-grid">
        {/* Class Enrollment Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Student Enrollment & Transport by Class</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '6px' }}>
            {classDistribution.map(cls => {
              const widthPct = (cls.count / maxClassCount) * 100;
              return (
                <div key={cls.grade}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: '700', color: '#0f1d38' }}>Class {cls.grade}</span>
                    <span style={{ color: '#64748b' }}>
                      <strong>{cls.count} Students</strong> {cls.transportCount > 0 ? `(${cls.transportCount} Transport)` : ''}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: '#0284c7', borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fee Status Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Fee Voucher Status Breakdown</h3>
          </div>
          <div className="pie-chart-container">
            <svg width="170" height="170" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
              <circle cx="21" cy="21" r="15.91549430918954" fill={paidCount > 0 ? '#059669' : '#dc2626'} stroke="#ffffff" strokeWidth="1" />
              <text x="21" y="22" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">
                {feeSlips.length}
              </text>
            </svg>
            
            <div className="pie-legend">
              <div className="legend-item">
                <span className="legend-color-box" style={{ backgroundColor: '#059669' }}></span>
                <span>Paid ({paidCount})</span>
              </div>
              <div className="legend-item">
                <span className="legend-color-box" style={{ backgroundColor: '#dc2626' }}></span>
                <span>Unpaid ({unpaidCount})</span>
              </div>
              {partialCount > 0 && (
                <div className="legend-item">
                  <span className="legend-color-box" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>Partial ({partialCount})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
