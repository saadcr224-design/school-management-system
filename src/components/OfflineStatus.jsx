import { useEffect, useState } from 'react';
import { storageStatus, retryStorage } from '../services/durableStorage';
import { updateStatus } from '../services/appUpdates';
export default function OfflineStatus() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh(n => n + 1);
    const events = ['online', 'offline', 'sca-storage-status', 'sca-update-status'];
    events.forEach(name => window.addEventListener(name, update));
    return () => events.forEach(name => window.removeEventListener(name, update));
  }, []);
  const message = storageStatus.error ? `Device save failed: ${storageStatus.error}. Keep this app open and free storage before continuing.` :
    storageStatus.pending ? 'Saving on this device…' :
    !navigator.onLine ? 'Offline · Records saved on this device. Cloud changes sync when connected.' :
    updateStatus.message || 'Preparing offline access…';
  return <div role={storageStatus.error ? 'alert' : 'status'} className="no-print" style={{
    padding: '5px 14px', fontSize: 12, background: storageStatus.error ? '#fee2e2' : '#e0f2fe',
    color: '#122241', textAlign: 'center'
  }}>{message}{storageStatus.error && <button onClick={retryStorage} style={{ marginLeft: 12 }}>Retry saving</button>}</div>;
}
