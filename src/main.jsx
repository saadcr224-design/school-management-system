import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initializeStorage } from './services/durableStorage'
import { startAppUpdates } from './services/appUpdates'

const root = document.getElementById('root');
root.textContent = 'Opening saved school records…';
// One editing tab avoids conflicting whole-record writes between local tabs.
async function boot() {
  try {
    await initializeStorage();
    const { default: App } = await import('./App.jsx');
    createRoot(root).render(<StrictMode><App /></StrictMode>);
    startAppUpdates();
  } catch (error) {
    root.textContent = `Cannot open device storage: ${error.message}. Enable browser storage and reload. Existing records have not been reset.`;
  }
}
if (navigator.locks) {
  navigator.locks.request('sca-school-editor', { ifAvailable: true }, async lock => {
    if (!lock) {
      root.textContent = 'The school app is already open in another tab. Close that tab, then reload here to protect your saved records.';
      return;
    }
    await boot();
    await new Promise(() => {});
  });
} else {
  root.textContent = 'Use a current browser with Web Locks support to safely open offline school records.';
}
