// Simple service worker for PWA support
const CACHE_NAME = 'parrhq-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  try {
    const url = new URL(e.request.url);

    // Skip API routes, Firebase domains, and external APIs we don't want to cache
    if (
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('nager.at')
    ) {
      return;
    }
  } catch (err) {
    // If URL parsing fails, ignore and let browser handle naturally
    return;
  }

  // Simple network-first fallback to cache strategy
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
