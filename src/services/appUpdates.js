import { flushStorage } from './durableStorage';
let registration;
let refreshing = false;
let changedController = false;
const dirty = new Set();
export const updateStatus = { ready: false, offlineReady: false, message: '' };
function announce(message) {
  updateStatus.message = message;
  window.dispatchEvent(new Event('sca-update-status'));
}
function safeToRefresh() {
  for (const element of dirty) if (!element.isConnected) dirty.delete(element);
  return !dirty.size && !document.querySelector('[role="dialog"], .modal-overlay, .modal-backdrop') &&
    !document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
}
async function applyWhenSafe() {
  if (refreshing || (!registration?.waiting && !changedController) || !safeToRefresh()) return;
  try {
    await flushStorage();
    if (!safeToRefresh()) return;
    refreshing = true;
    if (changedController) location.reload();
    else registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
  } catch { announce('Update downloaded. Resolve the device storage error before restarting.'); }
}
export async function checkAppUpdates() {
  if (!navigator.onLine) return 'Offline: updates will download when internet returns.';
  if (!registration) return 'Offline installation is not ready yet. Try again shortly.';
  await registration.update();
  return registration.waiting ? 'Update downloaded. It will apply after open forms are closed.' :
    registration.installing ? 'Downloading the software update…' : 'This device has the latest published software.';
}
export async function startAppUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  document.addEventListener('input', event => {
    // Do not interrupt typing, even in forms without native <form> wrappers.
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) dirty.add(event.target);
  }, true);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateStatus.offlineReady) {
      updateStatus.offlineReady = true;
      announce('Ready for offline use on this device.');
      return;
    }
    changedController = true;
    refreshing = false;
    applyWhenSafe();
  });
  try {
    registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    updateStatus.offlineReady = !!registration.active;
    const ready = () => {
      updateStatus.ready = !!registration.waiting;
      if (registration.waiting) {
        announce('Software update downloaded. Close open forms to apply automatically.');
        applyWhenSafe();
      } else {
        updateStatus.offlineReady = true;
        announce('Ready for offline use on this device.');
      }
    };
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') ready(); });
    });
    if (registration.waiting) ready();
    else if (registration.active) announce('Ready for offline use on this device.');
    const check = () => checkAppUpdates().catch(() => announce('Update check unavailable. Your installed version remains available.'));
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    setInterval(check, 5 * 60 * 1000);
    setInterval(applyWhenSafe, 3000);
  } catch { announce('Offline installation failed. Reconnect and reload to retry.'); }
}
