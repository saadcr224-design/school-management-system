import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function LedgerView() {
  const { ledger, addLedgerEntry, campuses } = useApp();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Manual Entry Modal
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Operational Expense',
    campus: 'ALL',
    type: 'Debit',
    amount: ''
  });

  const categories = [
    'Opening Balance',
    'Fee Collection',
    'Admission Fee',
    'Salary',
    'Campus Rent',
    'Utilities (Electricity/Water/Gas)',
    'Maintenance & Repairs',
    'Books & Printing',
    'Exam Expense',
    'Miscellaneous'
  ];

  const filteredLedger = ledger.filter(item => {
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.campus && item.campus.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesCategory && matchesSearch;
  });

  const totalCredits = ledger.filter(i => i.type === 'Credit').reduce((acc, i) => acc + i.amount, 0);
  const totalDebits = ledger.filter(i => i.type === 'Debit').reduce((acc, i) => acc + i.amount, 0);
  const netBalance = totalCredits - totalDebits;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.description || !newEntry.amount) return;
    addLedgerEntry(newEntry);
    setIsOpenAddModal(false);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: 'Operational Expense',
      campus: 'ALL',
      type: 'Debit',
      amount: ''
    });
    alert('Transaction posted to Ledger successfully!');
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Description,Category,Campus,Type,Amount (Rs)\n";
    filteredLedger.forEach(row => {
      csvContent += `"${row.id}","${row.date}","${row.description.replace(/"/g, '""')}","${row.category}","${row.campus}","${row.type}","${row.amount}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `School_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content-body">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">School Financial Ledger</h1>
          <p className="page-subtitle">Double-entry cash flow book, income logs, operational expenses, and audit statements</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="action-btn-secondary"
            onClick={handleExportCSV}
          >
            Export to CSV
          </button>
          <button 
            className="action-btn-primary"
            onClick={() => setIsOpenAddModal(true)}
            style={{ padding: '9px 18px', fontSize: '0.9rem' }}
          >
            + Post Voucher
          </button>
        </div>
      </div>

      {/* Top Ledger Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL CASH INFLOW (CREDIT)</span>
            <span className="stat-value" style={{ color: '#059669' }}>Rs {totalCredits.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-green">↓</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">TOTAL EXPENDITURE (DEBIT)</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>Rs {totalDebits.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-crimson">↑</div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">NET BALANCE IN TREASURY</span>
            <span className="stat-value" style={{ color: '#0f1d38' }}>Rs {netBalance.toLocaleString()}</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-navy">Rs</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="section-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
            <input 
              type="text"
              placeholder="Search transaction description..."
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

          <div style={{ width: '160px' }}>
            <select 
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Flow Types</option>
              <option value="Credit">Credit (Income)</option>
              <option value="Debit">Debit (Expense)</option>
            </select>
          </div>

          <div style={{ width: '200px' }}>
            <select 
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3 className="chart-title">Ledger Entries ({filteredLedger.length})</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Complete journal entries in chronological sequence</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Campus</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Credit (Rs)</th>
                <th style={{ textAlign: 'right' }}>Debit (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((row) => (
                <tr key={row.id}>
                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{row.date}</td>
                  <td style={{ fontWeight: '600', color: '#0f1d38' }}>{row.description}</td>
                  <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{row.category}</span></td>
                  <td><span className="status-badge badge-active">{row.campus}</span></td>
                  <td>
                    <span className={`status-badge ${row.type === 'Credit' ? 'badge-paid' : 'badge-unpaid'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                    {row.type === 'Credit' ? `+ Rs ${row.amount.toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                    {row.type === 'Debit' ? `- Rs ${row.amount.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No ledger records match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Transaction Modal */}
      {isOpenAddModal && (
        <div className="modal-overlay" onClick={() => setIsOpenAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Post Transaction Voucher</h3>
              <button className="modal-close-btn" onClick={() => setIsOpenAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Transaction Date</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Campus</label>
                    <select 
                      className="form-select"
                      value={newEntry.campus}
                      onChange={(e) => setNewEntry({ ...newEntry, campus: e.target.value })}
                    >
                      <option value="ALL">All Campuses / Central Head Office</option>
                      {campuses.map(c => (
                        <option key={c.id} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Entry Type</label>
                    <select 
                      className="form-select"
                      value={newEntry.type}
                      onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                    >
                      <option value="Credit">Credit (Cash Inflow / Income)</option>
                      <option value="Debit">Debit (Cash Outflow / Expense)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={newEntry.category}
                      onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Amount (Rs)</label>
                    <input 
                      type="number"
                      className="form-input"
                      value={newEntry.amount}
                      placeholder="e.g. 15000"
                      onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Particulars / Description</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={newEntry.description}
                      placeholder="e.g. Campus utility bill electricity March 2026"
                      onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setIsOpenAddModal(false)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Post to Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
