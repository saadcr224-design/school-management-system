import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SESSION_START_YEAR } from '../services/academicSession';

export default function SessionSelector({ allowCreate = false }) {
  const { activeSession, sessions, switchSession, addSession, currentUser } = useApp();
  const [year, setYear] = useState(String(Number(SESSION_START_YEAR) + 1));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div style={{ padding: '12px 16px' }}>
    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem' }}>
      Academic session
      <select className="form-select" style={{ width: '100%', marginTop: 6 }} value={activeSession}
        onChange={e => switchSession(e.target.value)} aria-label="Academic session">
        {sessions.map(id => <option key={id} value={id}>{id.replace('-', '–')}</option>)}
      </select>
    </label>
    {allowCreate && currentUser?.role === 'Super Admin' && <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      try { const id = await addSession(year); setMessage(`Session ${id} added. Select it above to open it.`); }
      catch (err) { setMessage(err.message); }
      finally { setBusy(false); }
    }}>
      <label className="form-label" htmlFor="session-start-year">New session start year</label>
      <input id="session-start-year" className="form-input" type="number" min="2000" max="9998"
        required value={year} onChange={e => setYear(e.target.value)} />
      <button className="action-btn-primary" style={{ marginTop: 10 }} disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Add Session'}
      </button>
      <p style={{ marginTop: 10, fontSize: '0.875rem' }}>New sessions start empty. Previous years remain saved. Students, families, fees, payments, staff, salaries and attendance are stored separately for each year.</p>
      {message && <p role="status">{message}</p>}
    </form>}
  </div>;
}
