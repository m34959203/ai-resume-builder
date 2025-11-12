/* eslint-disable no-restricted-globals */
const CACHE = 'app-cache-v1';
const OFFLINE_URL = '/offline.html';

// Устанавливаем офлайн-страницу
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([OFFLINE_URL]);
  })());
  self.skipWaiting();
});

// Включаем navigation preload корректно
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // feature detection
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    // чищу старые кэши при необходимости
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Главный fetch-обработчик: ждём preloadResponse
self.addEventListener('fetch', (event) => {
  // только навигации (переходы по страницам)
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // 1) если есть ответ от navigation preload — используем
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // 2) обычная сеть
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (err) {
        // 3) офлайн-фолбэк
        const cache = await caches.open(CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return; // важно не проваливаться дальше
  }

  // Для прочих запросов — как обычно
  event.respondWith(fetch(event.request));
});
