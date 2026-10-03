import { sessionDate } from '../services/academicSession';
import { SESSION_LABEL, SESSION_START_YEAR, SESSION_END_YEAR } from '../services/academicSession';
import React, { useState, useMemo } from 'react';
import { useApp, ACADEMIC_MONTHS, getAcademicMonthYear } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';

export default function SiblingFeeView() {
  const { 
    allStudents = [], 
    families = [], 
    feeSlips = [], 
    campuses = [], 
    siblingDiscountRules = { sibling1: 0, sibling2: 25, sibling3: 50, sibling4Plus: 75 },
    generateFamilyFeeSlips,
    payFamilyFee,
    schoolProfile,
    setActiveTab,
    showToast
  } = useApp();

  // Academic Month & Year Selector (April - March)
  const [selectedMonth, setSelectedMonth] = useState('April');
  const [selectedYear, setSelectedYear] = useState(SESSION_START_YEAR);
  const fullMonthLabel = useMemo(() => getAcademicMonthYear(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  // Filters
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL', 'Paid', 'Partial', 'Unpaid'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [familyToPay, setFamilyToPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash at Counter');
  const [paymentRemarks, setPaymentRemarks] = useState('');

  const [familyToPrintChallan, setFamilyToPrintChallan] = useState(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Consolidated billing data per family for the active billing month
  const familyBillingList = useMemo(() => {
    return families.map(fam => {
      const famStudents = allStudents.filter(s => 
        s.familyId === fam.id || (fam.studentIds && fam.studentIds.includes(s.id))
      );

      // Sort by sibling rank
      famStudents.sort((a, b) => (Number(a.siblingRank) || 1) - (Number(b.siblingRank) || 1));

      const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];

      const childrenSlips = famStudents.map((student, idx) => {
        const rank = Number(student.siblingRank) || (idx + 1);
        const rIdx = Math.min(rank - 1, 3);
        const ruleKey = ruleKeys[Math.max(0, rIdx)];
        const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);

        // Find existing slip for this month
        const slip = feeSlips.find(s => 
          (s.studentId === student.id || s.rollNo === student.rollNo) && 
          (s.month === fullMonthLabel || s.month?.toLowerCase().includes(selectedMonth.toLowerCase()))
        );

        const tuition = Number(student.monthlyFee) || 0;
        const transport = (student.isTransport || Number(student.transportFee) > 0) ? (Number(student.transportFee) || 0) : 0;
        const discountAmt = Math.round((tuition * discPct) / 100);
        const netFee = Math.max(0, tuition + transport - discountAmt);

        if (slip) {
          return {
            student,
            rank,
            discPct: slip.discountPercent !== undefined ? slip.discountPercent : discPct,
            grossFee: (Number(slip.tuitionFee) || tuition) + (Number(slip.transportFee) || transport),
            tuitionFee: Number(slip.tuitionFee) || tuition,
            transportFee: Number(slip.transportFee) || transport,
            discountAmt: Number(slip.discount) || discountAmt,
            netFee: Number(slip.totalAmount) || netFee,
            amountPaid: Number(slip.amountPaid) || 0,
            remaining: Math.max(0, (Number(slip.totalAmount) || netFee) - (Number(slip.amountPaid) || 0)),
            status: slip.status || 'Unpaid',
            challanNo: slip.challanNo,
            slipId: slip.id,
            isGenerated: true,
            slip
          };
        } else {
          return {
            student,
            rank,
            discPct,
            grossFee: tuition + transport,
            tuitionFee: tuition,
            transportFee: transport,
            discountAmt,
            netFee,
            amountPaid: 0,
            remaining: netFee,
            status: 'Unpaid',
            challanNo: '—',
            slipId: null,
            isGenerated: false,
            slip: null
          };
        }
      });

      const totalGross = childrenSlips.reduce((sum, c) => sum + c.grossFee, 0);
      const totalDiscount = childrenSlips.reduce((sum, c) => sum + c.discountAmt, 0);
      const totalNetPayable = childrenSlips.reduce((sum, c) => sum + c.netFee, 0);
      const totalPaid = childrenSlips.reduce((sum, c) => sum + c.amountPaid, 0);
      const totalRemaining = Math.max(0, totalNetPayable - totalPaid);

      let overallStatus = 'Unpaid';
      if (totalNetPayable > 0 && totalPaid >= totalNetPayable) {
        overallStatus = 'Paid';
      } else if (totalPaid > 0) {
        overallStatus = 'Partial';
      }

      const allGenerated = childrenSlips.length > 0 && childrenSlips.every(c => c.isGenerated);

      return {
        ...fam,
        childrenSlips,
        totalGross,
        totalDiscount,
        totalNetPayable,
        totalPaid,
        totalRemaining,
        overallStatus,
        allGenerated,
        childCount: famStudents.length
      };
    });
  }, [families, allStudents, feeSlips, fullMonthLabel, selectedMonth, siblingDiscountRules]);

  // Filtered Billing List
  const filteredBillingList = useMemo(() => {
    return familyBillingList.filter(fam => {
      if (selectedCampus !== 'ALL' && fam.campus !== selectedCampus) {
        const hasCampusStudent = fam.childrenSlips.some(c => c.student.campus === selectedCampus);
        if (!hasCampusStudent) return false;
      }

      if (selectedStatus !== 'ALL' && fam.overallStatus !== selectedStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFather = (fam.fatherName || '').toLowerCase().includes(q);
        const matchCode = (fam.familyCode || '').toLowerCase().includes(q);
        const matchPhone = (fam.phone || '').includes(q);
        const matchChild = fam.childrenSlips.some(c => 
          c.student.name.toLowerCase().includes(q) || 
          c.student.rollNo.toLowerCase().includes(q) ||
          (c.challanNo && c.challanNo.toLowerCase().includes(q))
        );
        return matchFather || matchCode || matchPhone || matchChild;
      }

      return true;
    });
  }, [familyBillingList, selectedCampus, selectedStatus, searchQuery]);

  // Overall Financial Totals for Active Month
  const totalBilledMonth = familyBillingList.reduce((sum, f) => sum + f.totalNetPayable, 0);
  const totalDiscountsMonth = familyBillingList.reduce((sum, f) => sum + f.totalDiscount, 0);
  const totalCollectedMonth = familyBillingList.reduce((sum, f) => sum + f.totalPaid, 0);
  const totalOutstandingMonth = familyBillingList.reduce((sum, f) => sum + f.totalRemaining, 0);

  // 1-Click Batch Generate Sibling Challans for all families
  const handleBatchGenerateSiblingChallans = () => {
    setIsBatchGenerating(true);
    let count = 0;
    familyBillingList.forEach(fam => {
      if (fam.childCount > 0) {
        generateFamilyFeeSlips({
          familyId: fam.id,
          month: fullMonthLabel,
          dueDate: sessionDate(selectedMonth)
        });
        count++;
      }
    });
    setIsBatchGenerating(false);
    showToast(`✓ Generated sibling fee challans for ${count} families (${fullMonthLabel})!`, 'success');
  };

  // Open Collect Family Payment Modal
  const handleOpenPaymentModal = (fam) => {
    setFamilyToPay(fam);
    setPaymentAmount(fam.totalRemaining);
    setPaymentMethod('Cash at Counter');
    setPaymentRemarks(`Family fee collection for ${fullMonthLabel}`);
  };

  // Submit Family Payment
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!familyToPay || paymentAmount <= 0) return;

    payFamilyFee({
      familyId: familyToPay.id,
      month: fullMonthLabel,
      amountPaid: Number(paymentAmount),
      paymentMethod,
      paymentRemarks
    });

    setFamilyToPay(null);
  };

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (fam) => {
    const contact = fam.phone?.replace(/[^0-9]/g, '');
    if (!contact) {
      showToast('No valid phone number for this family.', 'danger');
      return;
    }

    const childrenDetails = fam.childrenSlips.map(c => 
      `• ${c.student.name} (${c.student.classGrade}) - Net: Rs. ${c.netFee.toLocaleString()} (Paid: Rs. ${c.amountPaid.toLocaleString()}, Due: Rs. ${c.remaining.toLocaleString()})`
    ).join('\n');

    const msg = `*OFFICIAL SIBLING FEE BILLING NOTICE*\nDear Parent (${fam.fatherName}),\nThis is a fee statement for *${fullMonthLabel}* for your children enrolled in ${schoolProfile?.name || 'our academy'}:\n\n${childrenDetails}\n\n*Total Family Payable:* Rs. ${fam.totalNetPayable.toLocaleString()}\n*Amount Paid:* Rs. ${fam.totalPaid.toLocaleString()}\n*Net Outstanding Balance:* Rs. ${fam.totalRemaining.toLocaleString()}\n\nKindly clear the dues at the campus accounts counter or via online bank transfer.\n\n_${schoolProfile?.name || 'Academy Accounts Directorate'}_`;

    const cleanPhone = contact.startsWith('0') ? '92' + contact.slice(1) : contact;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="content-body">
      {/* Page Header */}
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>💳</span>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Sibling Fee Management & Consolidated Billing</h1>
              <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
                Automated sibling concession calculations, multi-child family invoices, consolidated payments, and 2-copy bank challans
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="action-btn-secondary"
            onClick={() => setActiveTab('siblings')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>👨‍👩‍👧‍👦 Sibling Directory Portal</span>
          </button>

          <button 
            type="button"
            className="action-btn-primary"
            onClick={handleBatchGenerateSiblingChallans}
            disabled={isBatchGenerating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0284c7, #059669)', borderColor: '#0284c7' }}
          >
            <span>⚡ Generate Sibling Challans ({fullMonthLabel})</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="metric-cards-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="metric-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" /><path d="M7 12h10" /><path d="M7 17h10" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Sibling Billed ({fullMonthLabel})</span>
            <div className="metric-value">Rs {totalBilledMonth.toLocaleString()}</div>
            <span className="metric-trend text-blue">Net Payable across all sibling families</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#10b981' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Sibling Fee Collected</span>
            <div className="metric-value">Rs {totalCollectedMonth.toLocaleString()}</div>
            <span className="metric-trend text-green">Deposited into Accounts</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Sibling Concessions Applied</span>
            <div className="metric-value">Rs {totalDiscountsMonth.toLocaleString()}</div>
            <span className="metric-trend text-amber">Family Discount Concessions</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Outstanding Sibling Balance</span>
            <div className="metric-value">Rs {totalOutstandingMonth.toLocaleString()}</div>
            <span className="metric-trend text-crimson">Pending Family Arrears</span>
          </div>
        </div>
      </div>

      {/* Month & Campus Filters Card */}
      <div className="table-controls-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Billing Month Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f1d38' }}>📅 Billing Month:</span>
              <select 
                className="table-select-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: '700', color: '#0284c7', padding: '4px' }}
              >
                {ACADEMIC_MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                className="table-select-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: '700', color: '#0f1d38', padding: '4px' }}
              >
                <option value={SESSION_START_YEAR}>{SESSION_START_YEAR}–{SESSION_END_YEAR}</option>
              </select>
            </div>

            {/* Campus Selector */}
            <select 
              className="table-select-filter"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="ALL">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.code}>{c.name}</option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select 
              className="table-select-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="Paid">Paid in Full</option>
              <option value="Partial">Partial Payment</option>
              <option value="Unpaid">Unpaid / Pending</option>
            </select>
          </div>

          <div className="search-input-wrap" style={{ flex: 1, maxWidth: '360px', minWidth: '220px' }}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search father, child, roll #, challan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="table-search-input"
            />
          </div>

        </div>
      </div>

      {/* Family Consolidated Invoicing Table */}
      <div className="section-card">
        <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="chart-title">Family Consolidated Sibling Billing Ledger ({filteredBillingList.length} Families)</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Billing Month: <strong>{fullMonthLabel}</strong> · Itemized breakdown per family unit</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Family / Father Name</th>
                <th>Campus</th>
                <th>Siblings</th>
                <th>Children Fee Breakdown</th>
                <th style={{ textAlign: 'right' }}>Gross Total</th>
                <th style={{ textAlign: 'right' }}>Sibling Concession</th>
                <th style={{ textAlign: 'right' }}>Net Payable</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBillingList.map((fam) => {
                return (
                  <tr key={fam.id} style={{ verticalAlign: 'top' }}>
                    <td>
                      <div style={{ fontWeight: '800', color: '#0f1d38', fontSize: '0.94rem' }}>
                        {fam.fatherName}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: '700' }}>
                        {fam.familyCode} · 📞 {fam.phone}
                      </div>
                    </td>

                    <td>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>
                        {fam.campus}
                      </span>
                    </td>

                    <td>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '800' }}>
                        {fam.childCount} Children
                      </span>
                    </td>

                    {/* Children Itemized Breakdown */}
                    <td style={{ minWidth: '300px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {fam.childrenSlips.map((c, i) => (
                          <div 
                            key={c.student.id || i}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong style={{ color: '#0f1d38' }}>{c.student.name}</strong> ({c.student.rollNo} · {c.student.classGrade})
                              <span style={{ 
                                marginLeft: '6px', 
                                fontSize: '0.7rem', 
                                background: c.rank === 1 ? '#ecfdf5' : '#e0f2fe',
                                color: c.rank === 1 ? '#065f46' : '#0369a1',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: '700'
                              }}>
                                #{c.rank} ({c.discPct}% Off)
                              </span>
                            </div>

                            <div style={{ textAlign: 'right', fontWeight: '700' }}>
                              Rs {c.netFee.toLocaleString()}
                              {c.status === 'Paid' && <span style={{ color: '#059669', marginLeft: '4px' }}>✓</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      Rs {fam.totalGross.toLocaleString()}
                    </td>

                    <td style={{ textAlign: 'right', color: fam.totalDiscount > 0 ? '#059669' : '#64748b', fontWeight: '800' }}>
                      {fam.totalDiscount > 0 ? `- Rs ${fam.totalDiscount.toLocaleString()}` : 'Rs 0'}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#0f1d38', fontSize: '0.94rem' }}>
                      Rs {fam.totalNetPayable.toLocaleString()}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                      Rs {fam.totalPaid.toLocaleString()}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '800', color: fam.totalRemaining > 0 ? '#dc2626' : '#64748b' }}>
                      Rs {fam.totalRemaining.toLocaleString()}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${fam.overallStatus === 'Paid' ? 'badge-paid' : fam.overallStatus === 'Partial' ? 'badge-partial' : 'badge-unpaid'}`}>
                        {fam.overallStatus === 'Paid' ? 'Paid in Full' : fam.overallStatus === 'Partial' ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {fam.totalRemaining > 0 ? (
                          <button
                            type="button"
                            className="action-btn-primary"
                            onClick={() => handleOpenPaymentModal(fam)}
                            style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                            title="Collect payment for all siblings"
                          >
                            💵 Collect
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="action-btn-secondary"
                            onClick={() => handleOpenPaymentModal(fam)}
                            style={{ padding: '4px 8px', fontSize: '0.74rem', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}
                            title="Payment settled in full"
                          >
                            ✓ Settled
                          </button>
                        )}

                        <button
                          type="button"
                          className="action-btn-secondary"
                          onClick={() => setFamilyToPrintChallan(fam)}
                          style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                          title="Print 2-Copy Family Consolidated Challan"
                        >
                          🖨️ Challan
                        </button>

                        <button
                          type="button"
                          className="action-btn-secondary"
                          onClick={() => handleSendWhatsAppReminder(fam)}
                          style={{ padding: '4px 8px', fontSize: '0.74rem', color: '#16a34a', borderColor: '#bbf7d0' }}
                          title="Send WhatsApp Fee Notice to Father"
                        >
                          📱
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBillingList.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No sibling families match your selected filters for {fullMonthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Collect Family Unified Payment Modal */}
      {familyToPay && (
        <div className="modal-overlay" onClick={() => setFamilyToPay(null)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>💵 Collect Consolidated Family Fee Payment</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Billing Month: <strong>{fullMonthLabel}</strong> · Family: <strong>{familyToPay.fatherName}</strong>
                </p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setFamilyToPay(null)}>✕</button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.84rem' }}>
                    <span>Total Family Net Dues:</span>
                    <strong>Rs {familyToPay.totalNetPayable.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.84rem', color: '#059669' }}>
                    <span>Previously Deposited:</span>
                    <strong>Rs {familyToPay.totalPaid.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #cbd5e1', fontWeight: '800', color: '#dc2626' }}>
                    <span>Remaining Balance:</span>
                    <span>Rs {familyToPay.totalRemaining.toLocaleString()}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontWeight: '800', color: '#0f1d38' }}>
                    Amount Receiving Now (Rs) *
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="1"
                    required
                    style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f1d38' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(familyToPay.totalRemaining)}
                      style={{ padding: '3px 8px', fontSize: '0.74rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0284c7', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Pay Full (Rs {familyToPay.totalRemaining.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.round(familyToPay.totalRemaining / 2))}
                      style={{ padding: '3px 8px', fontSize: '0.74rem', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Pay 50% (Rs {Math.round(familyToPay.totalRemaining / 2).toLocaleString()})
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Payment Channel / Method</label>
                  <select 
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash at Counter">Cash at Counter</option>
                    <option value="Bank Online Deposit / Transfer">Bank Online Deposit / Transfer</option>
                    <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                    <option value="Cheque / Pay Order">Cheque / Pay Order</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Voucher Remarks</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setFamilyToPay(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Confirm & Deposit Rs {Number(paymentAmount).toLocaleString()}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Official 2-Copy Family Consolidated Fee Challan */}
      {familyToPrintChallan && (
        <div className="modal-overlay" onClick={() => setFamilyToPrintChallan(null)}>
          <div className="modal-content wide" style={{ maxWidth: '1050px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div>
                <h3 className="modal-title">
                  Official 2-Copy Family Sibling Fee Challan Voucher ({familyToPrintChallan.fatherName})
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Standard 2-part voucher (School Copy & Student/Parent Copy) with itemized sibling breakdown
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setFamilyToPrintChallan(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
              <div className="printable-challan-sheet">
                <div className="challan-two-parts">
                  {['School Copy', 'Student / Parent Copy'].map((copyName, idx) => (
                    <div key={idx} className="challan-copy">
                      {/* Header */}
                      <div className="challan-school-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <SchoolLogo size={36} />
                          <div>
                            <div className="challan-school-name">{schoolProfile?.name || 'SHEZAD CHILDREN ACADEMY'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '700' }}>
                              {schoolProfile?.tagline || 'Schools & Colleges'} ({familyToPrintChallan.campus} Campus) · Contact: <strong>{schoolProfile?.helpline || schoolProfile?.phone || '0313 9413450'}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="challan-copy-type">{copyName}</div>
                      </div>

                      {/* Family Meta */}
                      <div className="challan-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: '0.78rem', marginBottom: '8px', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div><strong>Family Code:</strong> {familyToPrintChallan.familyCode}</div>
                        <div><strong>Billing Month:</strong> {fullMonthLabel}</div>
                        <div><strong>Father Name:</strong> {familyToPrintChallan.fatherName}</div>
                        <div><strong style={{ color: '#dc2626' }}>Due Date:</strong> {sessionDate(selectedMonth)}</div>
                        <div><strong>Father Cell:</strong> {familyToPrintChallan.phone}</div>
                        <div><strong>Siblings Count:</strong> {familyToPrintChallan.childCount} Children</div>
                      </div>

                      {/* Sibling Breakdown Table */}
                      <table className="challan-breakdown-table" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', marginBottom: '8px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>#</th>
                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>Child Name & Class</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Standard</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Concession</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Net Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyToPrintChallan.childrenSlips.map((c, cIdx) => (
                            <tr key={cIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '4px 6px', fontWeight: '800' }}>#{c.rank}</td>
                              <td style={{ padding: '4px 6px' }}>
                                <strong>{c.student.name}</strong> ({c.student.rollNo} - {c.student.classGrade})
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right' }}>Rs {c.grossFee}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'right', color: c.discountAmt > 0 ? '#059669' : '#64748b', fontWeight: '700' }}>
                                {c.discountAmt > 0 ? `- Rs ${c.discountAmt} (${c.discPct}%)` : '0%'}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '800' }}>
                                Rs {c.netFee}
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #0f1d38' }}>
                            <td colSpan={2} style={{ padding: '5px 6px' }}>Total Family Billing:</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>Rs {familyToPrintChallan.totalGross}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#059669' }}>- Rs {familyToPrintChallan.totalDiscount}</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#0369a1', fontSize: '0.86rem' }}>
                              Rs {familyToPrintChallan.totalNetPayable}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Bank & Payment Information */}
                      <div style={{ background: '#eff6ff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.72rem', color: '#1e3a8a', marginBottom: '8px' }}>
                        <div><strong>Bank:</strong> {schoolProfile?.bankName || 'Habib Bank Limited (HBL)'} · <strong>A/C:</strong> {schoolProfile?.accountNo || '1234-56789012-03'}</div>
                        <div><strong>Title:</strong> {schoolProfile?.accountTitle || 'Shezad Children Academy Accounts'}</div>
                      </div>

                      {/* Signatures */}
                      <div className="challan-signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontSize: '0.72rem', color: '#64748b' }}>
                        <div>Bank Cashier / Accounts Officer</div>
                        <div>{schoolProfile?.principalSignatureText || 'Principal / Authorized Signatory'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button className="action-btn-secondary" onClick={() => setFamilyToPrintChallan(null)}>Close</button>
              <button className="action-btn-primary" onClick={() => window.print()}>🖨️ Print 2-Copy Challan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

