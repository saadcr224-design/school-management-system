import React, { useId, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SESSION_START_YEAR } from '../services/academicSession';

export default function SessionSelector({ allowCreate = false }) {
  const { activeSession, sessions, switchSession, addSession, canManageSessions } = useApp();
  const inputId = useId();
  const [showCreate, setShowCreate] = useState(allowCreate);
  const [year, setYear] = useState(String(Number(SESSION_START_YEAR) + 1));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div style={{ padding: '12px 16px' }}>
    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem' }}>
      Academic session
      <select className="form-select" style={{ width: '100%', marginTop: 6 }} value={activeSession}
        disabled={busy} onChange={e => switchSession(e.target.value)} aria-label="Academic session">
        {sessions.map(id => <option key={id} value={id}>{id.replace('-', '–')}</option>)}
      </select>
    </label>
    {canManageSessions && <button type="button" className="action-btn-secondary" onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate}>
      {showCreate ? 'Close' : '+ Create Session'}
    </button>}
    {showCreate && canManageSessions && <form style={{ marginTop: 10 }} onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      try { const id = await addSession(year); setMessage(`Session ${id} created. Select it above to add students.`); }
      catch (err) { setMessage(err.message); }
      finally { setBusy(false); }
    }}>
      <label className="form-label" htmlFor={inputId}>Session start year</label>
      <input id={inputId} className="form-input" type="number" min="2000" max="9998"
        required value={year} onChange={e => setYear(e.target.value)} />
      <p style={{ fontSize: '0.875rem', marginTop: 6 }}>{year}–{Number(year) + 1}</p>
      <button className="action-btn-primary" style={{ marginTop: 10 }} disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Create Session'}
      </button>
      <p style={{ marginTop: 10, fontSize: '0.875rem' }}>Starts empty. Add students here or use Students → Convert to Session.</p>
      {message && <p role="status">{message}</p>}
    </form>}
  </div>;
}
