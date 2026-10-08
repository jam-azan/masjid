// ============================================================
// Service Worker — Jam Adzan Masjid Al Himmah
// v7 — network-first untuk HTML, cache-first untuk asset
// ============================================================

const CACHE_VERSION = 'v7';  // ⬅️ NAIKKAN ANGKA INI SETIAP UPDATE HTML
const CACHE_NAME = 'jam-adzan-' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './azanctrl.png'
];

// Install → cache aset statis & langsung aktif
self.addEventListener('install', event => {
  console.log('[SW] Install', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate → hapus cache lama & langsung kontrol semua tab
self.addEventListener('activate', event => {
  console.log('[SW] Activate', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch → strategi beda per tipe request
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip request non-GET
  if (event.request.method !== 'GET') return;

  // Skip request eksternal (GAS, Aladhan, JSONP)
  if (url.origin !== self.location.origin) return;
  if (url.href.includes('script.google.com') ||
      url.href.includes('api.aladhan.com') ||
      url.href.includes('callback=')) {
    return;
  }

  // ===== HTML → NETWORK-FIRST =====
  const isHTML =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/masjid') ||
    url.pathname.endsWith('/masjid/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Simpan versi baru ke cache
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          // Kalau offline, pakai cache
          return caches.match(event.request).then(cached => 
            cached || caches.match('./index.html')
          );
        })
    );
    return;
  }

  // ===== ASSET (icon, manifest) → CACHE-FIRST =====
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// Terima pesan dari client untuk skip waiting
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
