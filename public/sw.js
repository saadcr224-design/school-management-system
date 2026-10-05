// Replaced by the build with the complete, content-versioned app shell.
const CACHE_NAME = 'sca-app-__BUILD_ID__';
const ASSETS = __PRECACHE_ASSETS__;
self.addEventListener('install', event => {
  // A failed download must never replace the last working offline version.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  // Keep old app assets available for other tabs with unfinished forms.
  // IndexedDB and school records are never touched by software updates.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match('/index.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache =>
      (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
