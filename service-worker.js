// ============================================================
// Service Worker — Jam Adzan Masjid Al Himmah
// ============================================================
const CACHE_NAME = 'jam-adzan-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './azanctrl.png'
];

// Install → cache aset statis
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate → hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch → network-first untuk API, cache-first untuk aset
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Jangan cache request ke GAS / Aladhan / JSONP
  if (url.includes('script.google.com') ||
      url.includes('api.aladhan.com') ||
      url.includes('callback=')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        if (event.request.method === 'GET' && res.ok && !url.startsWith('chrome-extension')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
