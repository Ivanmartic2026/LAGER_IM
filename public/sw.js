// IMvision Service Worker — v3
const CACHE_NAME = 'imvision-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Push notification received (background push) ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'IMvision', message: event.data?.text() || 'Ny notifikation' };
  }

  const title = data.title || 'IMvision';
  const options = {
    body: data.message || data.body || '',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
    tag: data.type || 'notification',
    renotify: true,
    requireInteraction: data.priority === 'high',
    data: {
      link_page: data.link_page || null,
      link_to: data.link_to || null,
      type: data.type || 'general'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click — deep-link into app ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { link_page, link_to } = event.notification.data || {};
  let url = '/';

  if (link_page) {
    url = `/${link_page}`;
    if (link_to) url += `?id=${link_to}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// ── Fetch: network-first for API, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API calls
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase') || url.hostname.includes('base44')) return;

  // For HTML navigation — always network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
