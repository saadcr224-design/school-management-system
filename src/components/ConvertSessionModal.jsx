import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SESSION_START_YEAR } from '../services/academicSession';

export default function ConvertSessionModal({ students, onClose }) {
  const { sessions, activeSession, addSession, convertStudentsToSession } = useApp();
  const [selected, setSelected] = useState([]);
  const [target, setTarget] = useState('');
  const [year, setYear] = useState(String(Number(SESSION_START_YEAR) + 1));
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const available = sessions.filter(s => s !== activeSession);
  const selectedStudents = students.filter(s => selected.includes(s.id));
  return <div className="modal-overlay">
    <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="convert-session-title" style={{ width: 'min(680px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="modal-header">
        <h3 id="convert-session-title" className="modal-title">Convert to Session</h3>
        <button className="modal-close-btn" aria-label="Close transfer" disabled={busy} onClick={onClose}>✕</button>
      </div>
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await convertStudentsToSession(selectedStudents.map(s => s.id), target); onClose(); }
        catch (err) { setError(err.message); }
        finally { setBusy(false); }
      }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="modal-body">
            <p>Move student details from <strong>{activeSession}</strong> to a session you choose.</p>
            <label className="form-label" htmlFor="transfer-destination">Destination session</label>
            <select id="transfer-destination" className="form-select" value={target} required onChange={e => setTarget(e.target.value)}>
              <option value="">Select session</option>
              {available.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="action-btn-secondary" style={{ marginTop: 10 }} onClick={() => setCreating(!creating)}>+ Create Session</button>
            {creating && <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label>Start year <input type="number" aria-label="New destination session start year" className="form-input" min="2000" max="9998" value={year} onChange={e => setYear(e.target.value)} /></label>
              <button type="button" className="action-btn-primary" onClick={async () => {
                setBusy(true); setError('');
                try { setTarget(await addSession(year)); setCreating(false); }
                catch (err) { setError(err.message); }
                finally { setBusy(false); }
              }}>Create {year}–{Number(year) + 1}</button>
            </div>}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '18px 0 8px' }}>
              <strong>{selectedStudents.length} selected</strong>
              <button type="button" className="action-btn-secondary" onClick={() => setSelected(students.slice(0, 100).map(s => s.id))}>Select shown (up to 100)</button>
              <button type="button" className="action-btn-secondary" onClick={() => setSelected([])}>Clear</button>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              {students.map(s => <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderBottom: '1px solid #e2e8f0' }}>
                <input type="checkbox" checked={selected.includes(s.id)} disabled={!selected.includes(s.id) && selected.length >= 100}
                  onChange={e => setSelected(previous => e.target.checked ? [...previous, s.id] : previous.filter(id => id !== s.id))} />
                <span><strong>{s.name}</strong> · {s.rollNo}<br /><small>{s.classGrade} · {s.campus} · {s.fatherName}</small></span>
              </label>)}
              {!students.length && <p style={{ padding: 12 }}>No students match the current filters.</p>}
            </div>
            <p style={{ marginTop: 14 }}>Selected students will leave this session’s student list and appear in the destination. Personal details, class and fee rates move with them. Fees, payments, balances, attendance and sibling groups stay in their original session.</p>
            {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="action-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="action-btn-primary" type="submit" disabled={!target || !selectedStudents.length}>{busy ? 'Moving…' : `Move ${selectedStudents.length} Student(s)`}</button>
          </div>
        </fieldset>
      </form>
    </div>
  </div>;
}
