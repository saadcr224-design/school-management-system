import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import SchoolLogo from './SchoolLogo';

const CLASSES = [
  'Nursery', 'Prep', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '1st Year', '2nd Year'
];

export default function SiblingPortalView() {
  const { 
    allStudents = [], 
    families = [], 
    campuses = [], 
    siblingDiscountRules = { sibling1: 0, sibling2: 25, sibling3: 50, sibling4Plus: 75 },
    addFamily,
    updateFamily,
    deleteFamily,
    linkSibling,
    unlinkSibling,
    reorderSiblings,
    addStudent,
    schoolProfile,
    setActiveTab,
    showToast
  } = useApp();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  
  // Modals state
  const [isAddFamilyModalOpen, setIsAddFamilyModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState('group_existing'); // 'group_existing', 'add_to_family', 'create_family'
  
  const [familyToEdit, setFamilyToEdit] = useState(null);
  const [familyToReorder, setFamilyToReorder] = useState(null);
  const [familyToAddSibling, setFamilyToAddSibling] = useState(null);
  const [familyToPrint, setFamilyToPrint] = useState(null);
  const [familyToDelete, setFamilyToDelete] = useState(null);

  // Derive consolidated list of families with populated student objects
  const populatedFamilies = useMemo(() => {
    return families.map(fam => {
      // Find students linked to this familyId or listed in studentIds
      const famStudents = allStudents.filter(s => 
        s.familyId === fam.id || (fam.studentIds && fam.studentIds.includes(s.id))
      );

      // Sort by siblingRank (1st child first)
      famStudents.sort((a, b) => (Number(a.siblingRank) || 1) - (Number(b.siblingRank) || 1));

      // Calculate totals
      const totalTuition = famStudents.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);
      const totalTransport = famStudents.reduce((sum, s) => sum + ((s.isTransport || Number(s.transportFee) > 0) ? (Number(s.transportFee) || 0) : 0), 0);
      
      const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
      const totalSiblingDiscount = famStudents.reduce((sum, s, idx) => {
        const rank = Number(s.siblingRank) || (idx + 1);
        const rIdx = Math.min(rank - 1, 3);
        const ruleKey = ruleKeys[Math.max(0, rIdx)];
        const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);
        const tuition = Number(s.monthlyFee) || 0;
        return sum + Math.round((tuition * discPct) / 100);
      }, 0);

      const netMonthlyPayable = Math.max(0, (totalTuition + totalTransport) - totalSiblingDiscount);

      return {
        ...fam,
        students: famStudents,
        totalTuition,
        totalTransport,
        totalSiblingDiscount,
        netMonthlyPayable,
        childCount: famStudents.length
      };
    });
  }, [families, allStudents, siblingDiscountRules]);

  // Filtered families based on campus and search
  const filteredFamilies = useMemo(() => {
    return populatedFamilies.filter(fam => {
      if (selectedCampus !== 'ALL' && fam.campus !== selectedCampus) {
        // Also check if any student belongs to this campus
        const hasCampusStudent = fam.students.some(s => s.campus === selectedCampus);
        if (!hasCampusStudent) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFather = (fam.fatherName || '').toLowerCase().includes(q);
        const matchCode = (fam.familyCode || '').toLowerCase().includes(q);
        const matchPhone = (fam.phone || '').includes(q);
        const matchCnic = (fam.fatherCnic || '').includes(q);
        const matchStudent = fam.students.some(s => 
          s.name.toLowerCase().includes(q) || 
          s.rollNo.toLowerCase().includes(q) ||
          s.classGrade.toLowerCase().includes(q)
        );
        return matchFather || matchCode || matchPhone || matchCnic || matchStudent;
      }

      return true;
    });
  }, [populatedFamilies, selectedCampus, searchQuery]);

  // All sibling students flattened
  const allSiblingStudents = useMemo(() => {
    const list = [];
    populatedFamilies.forEach(fam => {
      fam.students.forEach((s, idx) => {
        const rank = Number(s.siblingRank) || (idx + 1);
        const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
        const rIdx = Math.min(rank - 1, 3);
        const ruleKey = ruleKeys[Math.max(0, rIdx)];
        const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);
        const tuition = Number(s.monthlyFee) || 0;
        const discAmt = Math.round((tuition * discPct) / 100);
        const netFee = Math.max(0, tuition - discAmt);

        list.push({
          ...s,
          familyCode: fam.familyCode,
          familyFather: fam.fatherName,
          familyPhone: fam.phone,
          effectiveRank: rank,
          effectiveDiscPct: discPct,
          discAmt,
          netFee
        });
      });
    });
    return list;
  }, [populatedFamilies, siblingDiscountRules]);

  // Overall KPI statistics
  const totalFamiliesCount = populatedFamilies.length;
  const totalSiblingStudentsCount = populatedFamilies.reduce((sum, f) => sum + f.students.length, 0);
  const totalBeneficiaryCount = populatedFamilies.reduce((sum, f) => {
    return sum + f.students.filter((s, idx) => (Number(s.siblingRank) || (idx + 1)) > 1).length;
  }, 0);
  const totalMonthlySavings = populatedFamilies.reduce((sum, f) => sum + f.totalSiblingDiscount, 0);

  // State for Group Existing Students form
  const [groupFatherName, setGroupFatherName] = useState('');
  const [groupFatherCnic, setGroupFatherCnic] = useState('');
  const [groupPhone, setGroupPhone] = useState('');
  const [groupCampus, setGroupCampus] = useState(campuses[0]?.code || 'ABB');
  const [groupAddress, setGroupAddress] = useState('');
  const [groupSelectedStudentIds, setGroupSelectedStudentIds] = useState([]);

  // State for Add New Admission Brother/Sister form
  const [newSibFamilyId, setNewSibFamilyId] = useState('');
  const [newSibName, setNewSibName] = useState('');
  const [newSibClass, setNewSibClass] = useState('1st');
  const [newSibSection, setNewSibSection] = useState('A');
  const [newSibMonthlyFee, setNewSibMonthlyFee] = useState(4000);
  const [newSibIsTransport, setNewSibIsTransport] = useState(false);
  const [newSibTransportFee, setNewSibTransportFee] = useState(1500);
  const [newSibAdmissionFee, setNewSibAdmissionFee] = useState(4000);

  // State for Create Full New Family
  const [newFamFatherName, setNewFamFatherName] = useState('');
  const [newFamCnic, setNewFamCnic] = useState('');
  const [newFamPhone, setNewFamPhone] = useState('');
  const [newFamCampus, setNewFamCampus] = useState(campuses[0]?.code || 'ABB');
  const [newFamAddress, setNewFamAddress] = useState('');
  const [newFamChildren, setNewFamChildren] = useState([
    { name: '', classGrade: '9th', monthlyFee: 4500, isTransport: false, transportFee: 0 },
    { name: '', classGrade: '6th', monthlyFee: 4000, isTransport: false, transportFee: 0 }
  ]);

  // Handle Group Existing Students submit
  const handleGroupExistingSubmit = (e) => {
    e.preventDefault();
    if (!groupFatherName.trim() || groupSelectedStudentIds.length < 2) {
      showToast('Please provide father name and select at least 2 students to link as siblings.', 'danger');
      return;
    }

    const newFam = addFamily({
      fatherName: groupFatherName.trim(),
      fatherCnic: groupFatherCnic.trim(),
      phone: groupPhone.trim(),
      campus: groupCampus,
      address: groupAddress.trim(),
      notes: `Grouped ${groupSelectedStudentIds.length} existing students`,
      studentIds: groupSelectedStudentIds
    });

    // Link each student with ranking
    groupSelectedStudentIds.forEach((stdId, idx) => {
      linkSibling(newFam.id, stdId, idx + 1);
    });

    setIsAddFamilyModalOpen(false);
    setGroupFatherName('');
    setGroupPhone('');
    setGroupFatherCnic('');
    setGroupSelectedStudentIds([]);
  };

  // Handle Add Sibling to Existing Family submit
  const handleAddNewSiblingSubmit = (e) => {
    e.preventDefault();
    if (!newSibFamilyId || !newSibName.trim()) {
      showToast('Please select a family and enter student name.', 'danger');
      return;
    }

    const fam = families.find(f => f.id === newSibFamilyId);
    const selectedCamp = campuses.find(c => c.code === fam?.campus) || campuses[0];
    const campusCode = fam?.campus || selectedCamp?.code || 'ABB';
    const rollNo = `${campusCode}-${Math.floor(100 + Math.random() * 900)}`;

    const currentSiblingsCount = (fam?.studentIds || []).length;
    const newRank = currentSiblingsCount + 1;

    const newStudent = {
      name: newSibName.trim(),
      fatherName: fam?.fatherName || '',
      fatherCnic: fam?.fatherCnic || '',
      campus: campusCode,
      classGrade: newSibClass,
      section: newSibSection,
      phone: fam?.phone || '',
      monthlyFee: Number(newSibMonthlyFee) || 0,
      transportFee: newSibIsTransport ? (Number(newSibTransportFee) || 0) : 0,
      isTransport: newSibIsTransport,
      admissionFee: Number(newSibAdmissionFee) || 0,
      address: fam?.address || '',
      admissionDate: new Date().toISOString().split('T')[0],
      rollNo,
      familyId: fam.id,
      siblingRank: newRank
    };

    const createdStd = addStudent(newStudent);
    linkSibling(fam.id, createdStd.id, newRank);

    setIsAddFamilyModalOpen(false);
    setFamilyToAddSibling(null);
    setNewSibName('');
    showToast(`✓ Registered and linked ${newStudent.name} (Child #${newRank}) to family!`, 'success');
  };

  // Handle Create Full New Family submit
  const handleCreateFullFamilySubmit = (e) => {
    e.preventDefault();
    if (!newFamFatherName.trim() || newFamChildren.some(c => !c.name.trim())) {
      showToast('Please fill all father details and child names.', 'danger');
      return;
    }

    const newFam = addFamily({
      fatherName: newFamFatherName.trim(),
      fatherCnic: newFamCnic.trim(),
      phone: newFamPhone.trim(),
      campus: newFamCampus,
      address: newFamAddress.trim(),
      notes: `Family unit created with ${newFamChildren.length} children`,
      studentIds: []
    });

    const createdIds = [];
    newFamChildren.forEach((child, idx) => {
      const rollNo = `${newFamCampus}-${Math.floor(100 + Math.random() * 900)}`;
      const rank = idx + 1;
      const created = addStudent({
        name: child.name.trim(),
        fatherName: newFamFatherName.trim(),
        fatherCnic: newFamCnic.trim(),
        campus: newFamCampus,
        classGrade: child.classGrade,
        section: 'A',
        phone: newFamPhone.trim(),
        monthlyFee: Number(child.monthlyFee) || 0,
        transportFee: child.isTransport ? (Number(child.transportFee) || 0) : 0,
        isTransport: child.isTransport,
        admissionFee: 4000,
        address: newFamAddress.trim(),
        admissionDate: new Date().toISOString().split('T')[0],
        rollNo,
        familyId: newFam.id,
        siblingRank: rank
      });
      createdIds.push(created.id);
      linkSibling(newFam.id, created.id, rank);
    });

    setIsAddFamilyModalOpen(false);
    setNewFamFatherName('');
    setNewFamPhone('');
    setNewFamChildren([
      { name: '', classGrade: '9th', monthlyFee: 4500, isTransport: false, transportFee: 0 },
      { name: '', classGrade: '6th', monthlyFee: 4000, isTransport: false, transportFee: 0 }
    ]);
  };

  return (
    <div className="content-body">
      {/* Page Header */}
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>👨‍👩‍👧‍👦</span>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Sibling Portal & Family Unit Directory</h1>
              <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
                Manage sibling links, child order hierarchy, family records, and automated sibling fee concessions
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="action-btn-secondary"
            onClick={() => setActiveTab('siblingfees')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontWeight: '700' }}
          >
            <span>💰 Sibling Fee Portal</span>
          </button>

          <button 
            type="button"
            className="action-btn-primary"
            onClick={() => {
              setAddModalTab('group_existing');
              setIsAddFamilyModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Add / Link Sibling Family</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Operational Metric Cards */}
      <div className="metric-cards-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="metric-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Registered Sibling Families</span>
            <div className="metric-value">{totalFamiliesCount} Families</div>
            <span className="metric-trend text-blue">Consolidated Family Units</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#10b981' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Enrolled Sibling Students</span>
            <div className="metric-value">{totalSiblingStudentsCount} Students</div>
            <span className="metric-trend text-green">Brothers & Sisters across classes</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Concession Beneficiaries</span>
            <div className="metric-value">{totalBeneficiaryCount} Students</div>
            <span className="metric-trend text-amber">2nd, 3rd, 4th+ Children Discounted</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="metric-icon-box" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="metric-info">
            <span className="metric-label">Monthly Sibling Concessions</span>
            <div className="metric-value">Rs {totalMonthlySavings.toLocaleString()}</div>
            <span className="metric-trend text-purple">Saved per month by families</span>
          </div>
        </div>
      </div>

      {/* Sibling Policy Notice Bar */}
      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>💡</span>
          <div>
            <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.92rem' }}>
              Active Sibling Concession Policy: 1st Child ({siblingDiscountRules.sibling1 || 0}%) · 2nd Sibling ({siblingDiscountRules.sibling2 || 25}% Off) · 3rd Sibling ({siblingDiscountRules.sibling3 || 50}% Off) · 4th+ Sibling ({siblingDiscountRules.sibling4Plus || 75}% Off)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
              Discounts are automatically calculated on tuition fees according to child order ranking.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{ background: '#ffffff', border: '1px solid #86efac', color: '#166534', padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
        >
          ⚙️ Modify Policy in Settings
        </button>
      </div>

      {/* Search and Campus Controls */}
      <div className="table-controls-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div className="search-input-wrap" style={{ flex: 1, minWidth: '220px' }}>
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search by Father Name, Child Name, Roll No, Phone, Family Code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="table-search-input"
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn" 
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              )}
            </div>

            <select 
              className="table-select-filter"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              style={{ minWidth: '170px' }}
            >
              <option value="ALL">All Campuses ({populatedFamilies.length})</option>
              {campuses.map(c => (
                <option key={c.id} value={c.code}>
                  {c.name} ({populatedFamilies.filter(f => f.campus === c.code).length})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? '#0f1d38' : '#64748b',
                  fontWeight: viewMode === 'cards' ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🎴 Family Units ({filteredFamilies.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#0f1d38' : '#64748b',
                  fontWeight: viewMode === 'table' ? '700' : '500',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📋 Students List ({allSiblingStudents.length})</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* VIEW 1: Family Cards Grid */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredFamilies.map((fam) => {
            return (
              <div 
                key={fam.id} 
                className="section-card"
                style={{ 
                  margin: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.05)'
                }}
              >
                <div>
                  {/* Family Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800' }}>
                          {fam.familyCode}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700' }}>
                          {fam.campus} Campus
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f1d38', fontWeight: '800' }}>
                        {fam.fatherName}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                        📞 <strong>{fam.phone || 'No phone'}</strong> {fam.fatherCnic ? `· CNIC: ${fam.fatherCnic}` : ''}
                      </div>
                    </div>

                    <span style={{ 
                      background: fam.childCount > 1 ? '#ecfdf5' : '#f8fafc', 
                      color: fam.childCount > 1 ? '#065f46' : '#64748b', 
                      border: `1px solid ${fam.childCount > 1 ? '#a7f3d0' : '#e2e8f0'}`,
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem', 
                      fontWeight: '800' 
                    }}>
                      👨‍👩‍👧‍👦 {fam.childCount} Sibling{fam.childCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Children List in this Family */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {fam.students.map((child, cIdx) => {
                      const rank = Number(child.siblingRank) || (cIdx + 1);
                      const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
                      const rIdx = Math.min(rank - 1, 3);
                      const ruleKey = ruleKeys[Math.max(0, rIdx)];
                      const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);
                      const tuition = Number(child.monthlyFee) || 0;
                      const discAmt = Math.round((tuition * discPct) / 100);
                      const netChildFee = Math.max(0, tuition - discAmt);

                      let rankColor = '#10b981';
                      let rankBg = '#ecfdf5';
                      let rankBorder = '#a7f3d0';
                      let rankLabel = `1st Child (0% Off)`;

                      if (rank === 2) {
                        rankColor = '#0284c7';
                        rankBg = '#e0f2fe';
                        rankBorder = '#bae6fd';
                        rankLabel = `2nd Sibling (${discPct}% Off)`;
                      } else if (rank === 3) {
                        rankColor = '#d97706';
                        rankBg = '#fef3c7';
                        rankBorder = '#fde68a';
                        rankLabel = `3rd Sibling (${discPct}% Off)`;
                      } else if (rank >= 4) {
                        rankColor = '#7c3aed';
                        rankBg = '#f3e8ff';
                        rankBorder = '#ddd6fe';
                        rankLabel = `${rank}th+ Sibling (${discPct}% Off)`;
                      }

                      return (
                        <div 
                          key={child.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '34px', 
                              height: '34px', 
                              borderRadius: '50%', 
                              background: '#e2e8f0', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: '800', 
                              color: '#334155',
                              fontSize: '0.86rem' 
                            }}>
                              {child.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: '800', color: '#0f1d38', fontSize: '0.9rem' }}>
                                  {child.name}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  ({child.rollNo})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                                Class: <strong>{child.classGrade} ({child.section || 'A'})</strong>
                                {child.isTransport ? ' · 🚌 Transport' : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ 
                              display: 'inline-block',
                              background: rankBg, 
                              color: rankColor, 
                              border: `1px solid ${rankBorder}`,
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '0.7rem', 
                              fontWeight: '800',
                              marginBottom: '3px'
                            }}>
                              {rankLabel}
                            </span>
                            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0f1d38' }}>
                              Rs {netChildFee.toLocaleString()}
                              {discAmt > 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '4px' }}>
                                  {tuition}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {fam.students.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', background: '#f8fafc', borderRadius: '8px' }}>
                        No students currently linked to this family. Click "+ Add Sibling" below.
                      </div>
                    )}
                  </div>

                  {/* Family Financial Summary Footer */}
                  <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Gross Monthly Tuition:</span>
                      <span style={{ fontWeight: '700' }}>Rs {fam.totalTuition.toLocaleString()}</span>
                    </div>
                    {fam.totalSiblingDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#059669' }}>
                        <span>👨‍👩‍👧‍👦 Total Sibling Concessions:</span>
                        <span style={{ fontWeight: '800' }}>- Rs {fam.totalSiblingDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {fam.totalTransport > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#0369a1' }}>
                        <span>🚌 Total Transport:</span>
                        <span style={{ fontWeight: '700' }}>+ Rs {fam.totalTransport.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #cbd5e1', fontWeight: '800', fontSize: '0.92rem', color: '#0f1d38' }}>
                      <span>Net Family Monthly Due:</span>
                      <span style={{ color: '#0369a1' }}>Rs {fam.netMonthlyPayable.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => {
                      setFamilyToAddSibling(fam);
                      setNewSibFamilyId(fam.id);
                      setIsAddFamilyModalOpen(true);
                      setAddModalTab('add_to_family');
                    }}
                    style={{ flex: 1, minWidth: '110px', fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
                    title="Add another child / sibling to this family"
                  >
                    ➕ Add Sibling
                  </button>

                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setFamilyToReorder(fam)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
                    title="Adjust Child Order (1st, 2nd, 3rd)"
                  >
                    ⬆️⬇️ Order
                  </button>

                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setFamilyToPrint(fam)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
                    title="Print Family Sibling Record"
                  >
                    🖨️ Card
                  </button>

                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setFamilyToEdit(fam)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
                    title="Edit Family Info"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setFamilyToDelete(fam)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px', color: '#dc2626', borderColor: '#fecaca', justifyContent: 'center' }}
                    title="Remove Family Group"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {filteredFamilies.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👨‍👩‍👧‍👦</div>
              <h3 style={{ color: '#0f1d38', marginBottom: '6px' }}>No Sibling Families Found</h3>
              <p style={{ color: '#64748b', fontSize: '0.86rem', maxWidth: '400px', margin: '0 auto 16px' }}>
                {searchQuery ? `No families match "${searchQuery}". Try a different search.` : 'Get started by creating your first family unit or linking existing students.'}
              </p>
              <button
                type="button"
                className="action-btn-primary"
                onClick={() => {
                  setAddModalTab('group_existing');
                  setIsAddFamilyModalOpen(true);
                }}
              >
                + Register / Link Sibling Family
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: All Sibling Students Table View */}
      {viewMode === 'table' && (
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="chart-title">Enrolled Sibling Students Directory ({allSiblingStudents.length})</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Itemized list of all brothers and sisters with their assigned discount tiers</p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Father / Family</th>
                  <th>Campus</th>
                  <th>Class</th>
                  <th>Sibling Rank</th>
                  <th style={{ textAlign: 'right' }}>Standard Fee</th>
                  <th style={{ textAlign: 'right' }}>Sibling Discount</th>
                  <th style={{ textAlign: 'right' }}>Net Monthly Fee</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSiblingStudents.map((child) => (
                  <tr key={child.id}>
                    <td style={{ fontWeight: '800', color: '#0369a1' }}>{child.rollNo}</td>
                    <td style={{ fontWeight: '700', color: '#0f1d38' }}>{child.name}</td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{child.familyFather}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{child.familyCode} · {child.familyPhone}</div>
                    </td>
                    <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>{child.campus}</span></td>
                    <td><strong>{child.classGrade} ({child.section || 'A'})</strong></td>
                    <td>
                      <span style={{ 
                        background: child.effectiveRank === 1 ? '#ecfdf5' : child.effectiveRank === 2 ? '#e0f2fe' : '#fef3c7',
                        color: child.effectiveRank === 1 ? '#065f46' : child.effectiveRank === 2 ? '#0284c7' : '#92400e',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: '800'
                      }}>
                        Child #{child.effectiveRank} ({child.effectiveDiscPct}% Off)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>Rs {Number(child.monthlyFee || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: child.discAmt > 0 ? '#059669' : '#64748b', fontWeight: '700' }}>
                      {child.discAmt > 0 ? `- Rs ${child.discAmt.toLocaleString()} (${child.effectiveDiscPct}%)` : '0% (Full Fee)'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                      Rs {child.netFee.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        onClick={() => unlinkSibling(child.id)}
                        title="Unlink student from family"
                        style={{ color: '#dc2626' }}
                      >
                        ✕ Unlink
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Sibling / Register Family Modal */}
      {isAddFamilyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddFamilyModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0f1d38', color: '#fff' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>👨‍👩‍👧‍👦 Sibling & Family Unit Registration</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Link brothers & sisters, register family groups, and assign automated concession tiers
                </p>
              </div>
              <button className="modal-close-btn" style={{ color: '#fff' }} onClick={() => setIsAddFamilyModalOpen(false)}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '6px 16px 0', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAddModalTab('group_existing')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: addModalTab === 'group_existing' ? '3px solid #0284c7' : '3px solid transparent',
                  background: 'none',
                  color: addModalTab === 'group_existing' ? '#0284c7' : '#64748b',
                  fontWeight: addModalTab === 'group_existing' ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                1. Group Existing Students
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('add_to_family')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: addModalTab === 'add_to_family' ? '3px solid #0284c7' : '3px solid transparent',
                  background: 'none',
                  color: addModalTab === 'add_to_family' ? '#0284c7' : '#64748b',
                  fontWeight: addModalTab === 'add_to_family' ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                2. Add Sibling to Existing Family
              </button>

              <button
                type="button"
                onClick={() => setAddModalTab('create_family')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderBottom: addModalTab === 'create_family' ? '3px solid #0284c7' : '3px solid transparent',
                  background: 'none',
                  color: addModalTab === 'create_family' ? '#0284c7' : '#64748b',
                  fontWeight: addModalTab === 'create_family' ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                3. Create Full New Family
              </button>
            </div>

            {/* TAB 1: Group Existing Enrolled Students */}
            {addModalTab === 'group_existing' && (
              <form onSubmit={handleGroupExistingSubmit}>
                <div className="modal-body" style={{ padding: '20px' }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Father / Guardian Full Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Tariq Mahmood"
                        value={groupFatherName}
                        onChange={(e) => setGroupFatherName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Phone / WhatsApp *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 0300-1234567"
                        value={groupPhone}
                        onChange={(e) => setGroupPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Father CNIC (Optional)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 13101-1234567-1"
                        value={groupFatherCnic}
                        onChange={(e) => setGroupFatherCnic(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Registered Campus</label>
                      <select 
                        className="form-select"
                        value={groupCampus}
                        onChange={(e) => setGroupCampus(e.target.value)}
                      >
                        {campuses.map(c => (
                          <option key={c.id} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label" style={{ fontWeight: '800', color: '#0f1d38' }}>
                      Select Enrolled Students to Bind as Siblings (Select in Eldest-to-Youngest Order):
                    </label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px' }}>
                      {allStudents.map(std => {
                        const isSelected = groupSelectedStudentIds.includes(std.id);
                        const selIndex = groupSelectedStudentIds.indexOf(std.id);
                        const rankLabel = selIndex === 0 ? '1st Child (0% Off)' : selIndex === 1 ? '2nd Child (25% Off)' : selIndex === 2 ? '3rd Child (50% Off)' : `${selIndex + 1}th Child (75% Off)`;

                        return (
                          <div 
                            key={std.id}
                            onClick={() => {
                              if (isSelected) {
                                setGroupSelectedStudentIds(groupSelectedStudentIds.filter(id => id !== std.id));
                              } else {
                                setGroupSelectedStudentIds([...groupSelectedStudentIds, std.id]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 10px',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              borderRadius: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => {}} 
                              />
                              <div>
                                <span style={{ fontWeight: '700', color: '#0f1d38' }}>{std.name}</span>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                                  ({std.rollNo} · {std.classGrade} · Father: {std.fatherName})
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                                Rank #{selIndex + 1} ({rankLabel})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      {groupSelectedStudentIds.length} student(s) selected. The order you click determines 1st child, 2nd child, 3rd child!
                    </span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="action-btn-secondary" onClick={() => setIsAddFamilyModalOpen(false)}>Cancel</button>
                  <button type="submit" className="action-btn-primary">Create Family Unit & Apply Sibling Links</button>
                </div>
              </form>
            )}

            {/* TAB 2: Add New Admission Sibling to Existing Family */}
            {addModalTab === 'add_to_family' && (
              <form onSubmit={handleAddNewSiblingSubmit}>
                <div className="modal-body" style={{ padding: '20px' }}>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Select Existing Family Unit *</label>
                    <select 
                      className="form-select"
                      value={newSibFamilyId}
                      onChange={(e) => setNewSibFamilyId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a Registered Family --</option>
                      {families.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.fatherName} ({f.familyCode} - {f.campus} Campus - {f.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Sibling Student Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Khadija Tariq"
                        value={newSibName}
                        onChange={(e) => setNewSibName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Class Grade *</label>
                      <select 
                        className="form-select"
                        value={newSibClass}
                        onChange={(e) => setNewSibClass(e.target.value)}
                      >
                        {CLASSES.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Section</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. A"
                        value={newSibSection}
                        onChange={(e) => setNewSibSection(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Standard Monthly Tuition (Rs) *</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={newSibMonthlyFee}
                        onChange={(e) => setNewSibMonthlyFee(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Transport Service</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <input 
                          type="checkbox" 
                          id="newSibTrans"
                          checked={newSibIsTransport}
                          onChange={(e) => setNewSibIsTransport(e.target.checked)}
                        />
                        <label htmlFor="newSibTrans" style={{ fontSize: '0.86rem', cursor: 'pointer' }}>
                          Uses School Bus / Van
                        </label>
                      </div>
                    </div>

                    {newSibIsTransport && (
                      <div className="form-group">
                        <label className="form-label">Monthly Transport Fee (Rs)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={newSibTransportFee}
                          onChange={(e) => setNewSibTransportFee(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="action-btn-secondary" onClick={() => setIsAddFamilyModalOpen(false)}>Cancel</button>
                  <button type="submit" className="action-btn-primary">Register Sibling & Add to Family</button>
                </div>
              </form>
            )}

            {/* TAB 3: Create Full New Family */}
            {addModalTab === 'create_family' && (
              <form onSubmit={handleCreateFullFamilySubmit}>
                <div className="modal-body" style={{ padding: '20px' }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Father Full Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Muhammad Aslam"
                        value={newFamFatherName}
                        onChange={(e) => setNewFamFatherName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Phone *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 0313-9876543"
                        value={newFamPhone}
                        onChange={(e) => setNewFamPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Campus</label>
                      <select 
                        className="form-select"
                        value={newFamCampus}
                        onChange={(e) => setNewFamCampus(e.target.value)}
                      >
                        {campuses.map(c => (
                          <option key={c.id} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Residential Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Kakul Road, Abbottabad"
                        value={newFamAddress}
                        onChange={(e) => setNewFamAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '800', color: '#0f1d38' }}>Brothers & Sisters (Children in this Family):</span>
                      <button
                        type="button"
                        onClick={() => setNewFamChildren([...newFamChildren, { name: '', classGrade: '1st', monthlyFee: 4000, isTransport: false, transportFee: 0 }])}
                        style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + Add Another Child
                      </button>
                    </div>

                    {newFamChildren.map((child, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: '#64748b' }}>Child #{idx + 1} Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Student Name"
                            value={child.name}
                            onChange={(e) => {
                              const copy = [...newFamChildren];
                              copy[idx].name = e.target.value;
                              setNewFamChildren(copy);
                            }}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.74rem', color: '#64748b' }}>Class</label>
                          <select 
                            className="form-select"
                            value={child.classGrade}
                            onChange={(e) => {
                              const copy = [...newFamChildren];
                              copy[idx].classGrade = e.target.value;
                              setNewFamChildren(copy);
                            }}
                          >
                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.74rem', color: '#64748b' }}>Tuition (Rs)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={child.monthlyFee}
                            onChange={(e) => {
                              const copy = [...newFamChildren];
                              copy[idx].monthlyFee = Number(e.target.value);
                              setNewFamChildren(copy);
                            }}
                          />
                        </div>

                        {newFamChildren.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setNewFamChildren(newFamChildren.filter((_, i) => i !== idx))}
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginTop: '16px' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="action-btn-secondary" onClick={() => setIsAddFamilyModalOpen(false)}>Cancel</button>
                  <button type="submit" className="action-btn-primary">Register New Family Unit</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Reorder Siblings Modal */}
      {familyToReorder && (
        <div className="modal-overlay" onClick={() => setFamilyToReorder(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Sibling Order & Discount Ranks</h3>
              <button className="modal-close-btn" onClick={() => setFamilyToReorder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
                Change the ranking of children in <strong>{familyToReorder.fatherName}'s</strong> family. The 1st child pays standard fee, while subsequent siblings receive automatic percentage discounts!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {familyToReorder.students.map((child, idx) => (
                  <div 
                    key={child.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '800', color: '#0f1d38' }}>
                        #{idx + 1}. {child.name} ({child.rollNo})
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Class: {child.classGrade} · Tuition: Rs {child.monthlyFee}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const list = [...familyToReorder.students];
                          const temp = list[idx - 1];
                          list[idx - 1] = list[idx];
                          list[idx] = temp;
                          reorderSiblings(familyToReorder.id, list.map(c => c.id));
                          setFamilyToReorder({ ...familyToReorder, students: list });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: idx === 0 ? '#f1f5f9' : '#fff', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                      >
                        ▲ Up
                      </button>

                      <button
                        type="button"
                        disabled={idx === familyToReorder.students.length - 1}
                        onClick={() => {
                          const list = [...familyToReorder.students];
                          const temp = list[idx + 1];
                          list[idx + 1] = list[idx];
                          list[idx] = temp;
                          reorderSiblings(familyToReorder.id, list.map(c => c.id));
                          setFamilyToReorder({ ...familyToReorder, students: list });
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: idx === familyToReorder.students.length - 1 ? '#f1f5f9' : '#fff', cursor: idx === familyToReorder.students.length - 1 ? 'not-allowed' : 'pointer' }}
                      >
                        ▼ Down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn-primary" onClick={() => setFamilyToReorder(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Family Info Modal */}
      {familyToEdit && (
        <div className="modal-overlay" onClick={() => setFamilyToEdit(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Family Profile</h3>
              <button className="modal-close-btn" onClick={() => setFamilyToEdit(null)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateFamily(familyToEdit.id, {
                fatherName: familyToEdit.fatherName,
                phone: familyToEdit.phone,
                fatherCnic: familyToEdit.fatherCnic,
                address: familyToEdit.address,
                notes: familyToEdit.notes
              });
              setFamilyToEdit(null);
            }}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Father Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={familyToEdit.fatherName}
                    onChange={(e) => setFamilyToEdit({ ...familyToEdit, fatherName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Primary Contact Phone *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={familyToEdit.phone}
                    onChange={(e) => setFamilyToEdit({ ...familyToEdit, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Father CNIC</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={familyToEdit.fatherCnic || ''}
                    onChange={(e) => setFamilyToEdit({ ...familyToEdit, fatherCnic: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Home Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={familyToEdit.address || ''}
                    onChange={(e) => setFamilyToEdit({ ...familyToEdit, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Administrative Notes</label>
                  <textarea 
                    className="form-input" 
                    rows={2}
                    value={familyToEdit.notes || ''}
                    onChange={(e) => setFamilyToEdit({ ...familyToEdit, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="action-btn-secondary" onClick={() => setFamilyToEdit(null)}>Cancel</button>
                <button type="submit" className="action-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Printable Family Sibling Registration Card */}
      {familyToPrint && (
        <div className="modal-overlay" onClick={() => setFamilyToPrint(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3 className="modal-title">Family Sibling Registration Certificate</h3>
              <button className="modal-close-btn" onClick={() => setFamilyToPrint(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px', background: '#fff' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f1d38', paddingBottom: '12px', marginBottom: '16px' }}>
                <SchoolLogo size={46} showText={true} />
                <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '700', marginTop: '4px' }}>
                  Central Directorate of Admissions & Student Welfare · {familyToPrint.campus} Campus
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: '#0f1d38' }}>
                  OFFICIAL FAMILY SIBLING RECORD & CONCESSION CARD
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Family ID: <strong>{familyToPrint.familyCode}</strong> · Issued: <strong>{new Date().toLocaleDateString()}</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.84rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><strong>Father / Guardian:</strong> {familyToPrint.fatherName}</div>
                  <div><strong>Contact Phone:</strong> {familyToPrint.phone}</div>
                  <div><strong>CNIC No:</strong> {familyToPrint.fatherCnic || '—'}</div>
                  <div><strong>Campus Branch:</strong> {familyToPrint.campus} Campus</div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {familyToPrint.address || '—'}</div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '0.94rem', color: '#0f1d38' }}>Enrolled Children & Concession Tiers:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#0f1d38', color: '#fff' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Order</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Student Name</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Roll No</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Class</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Standard Fee</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Sibling Concession</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Net Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {familyToPrint.students.map((c, i) => {
                    const rank = Number(c.siblingRank) || (i + 1);
                    const ruleKeys = ['sibling1', 'sibling2', 'sibling3', 'sibling4Plus'];
                    const rIdx = Math.min(rank - 1, 3);
                    const ruleKey = ruleKeys[Math.max(0, rIdx)];
                    const discPct = siblingDiscountRules[ruleKey] ?? (rIdx === 0 ? 0 : rIdx === 1 ? 25 : rIdx === 2 ? 50 : 75);
                    const tuition = Number(c.monthlyFee) || 0;
                    const discAmt = Math.round((tuition * discPct) / 100);
                    const net = Math.max(0, tuition - discAmt);

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 8px', fontWeight: '800' }}>#{rank}</td>
                        <td style={{ padding: '6px 8px', fontWeight: '700' }}>{c.name}</td>
                        <td style={{ padding: '6px 8px' }}>{c.rollNo}</td>
                        <td style={{ padding: '6px 8px' }}>{c.classGrade}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs {tuition}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: discAmt > 0 ? '#059669' : '#64748b', fontWeight: '700' }}>
                          {discAmt > 0 ? `- Rs ${discAmt} (${discPct}%)` : '0%'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                          Rs {net}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#f1f5f9', fontWeight: '800', borderTop: '2px solid #0f1d38' }}>
                    <td colSpan={4} style={{ padding: '8px' }}>Consolidated Family Monthly Total:</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>Rs {familyToPrint.totalTuition.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>- Rs {familyToPrint.totalSiblingDiscount.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0369a1' }}>Rs {familyToPrint.netMonthlyPayable.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#64748b' }}>
                <div>Verified by Accounts Officer</div>
                <div>Principal / Authorized Signatory</div>
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="action-btn-secondary" onClick={() => setFamilyToPrint(null)}>Close</button>
              <button className="action-btn-primary" onClick={() => window.print()}>🖨️ Print Certificate</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Family Confirmation Modal */}
      {familyToDelete && (
        <div className="modal-overlay" onClick={() => setFamilyToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <h3 className="modal-title" style={{ color: '#991b1b' }}>Remove Family Unit</h3>
              <button className="modal-close-btn" onClick={() => setFamilyToDelete(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.92rem', color: '#1e293b', marginBottom: '10px' }}>
                Are you sure you want to remove family unit <strong>{familyToDelete.fatherName} ({familyToDelete.familyCode})</strong>?
              </p>
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e' }}>
                ⚠️ Notice: All {familyToDelete.students.length} linked student records will be unlinked back to individual status without deleting the students.
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn-secondary" onClick={() => setFamilyToDelete(null)}>Cancel</button>
              <button 
                className="action-btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => {
                  deleteFamily(familyToDelete.id);
                  setFamilyToDelete(null);
                }}
              >
                Confirm Remove Family Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
