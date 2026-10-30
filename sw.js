'use strict';

const CACHE_PREFIX = 'nitro-pwa-';
const CACHE_STATIC = CACHE_PREFIX + 'static-v17';
const CACHE_CDN = CACHE_PREFIX + 'cdn-v10';
const APP_BASE = new URL('./', self.registration.scope);
const APP_ROOT = new URL('./', APP_BASE);
const SHELL_URL = new URL('index.html', APP_BASE);
const STATIC_URLS = ['index.html', 'sw.js', 'manifest.json', 'nitro-icon.svg', 'styles.css', 'app.js']
  .map(path => new URL(path, APP_BASE).href);
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(CACHE_STATIC);
    await staticCache.addAll(STATIC_URLS);

    const cdnCache = await caches.open(CACHE_CDN);
    await Promise.all(CDN_URLS.map(async url => {
      try {
        const response = await fetch(new Request(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'reload'
        }));
        if (response.ok) await cdnCache.put(url, response);
      } catch (error) {
        console.warn('[SW] CDN nije dostupan za predmemoriranje:', url, error);
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_STATIC, CACHE_CDN]);
    const oldAppCaches = (await caches.keys()).filter(name =>
      name.startsWith(CACHE_PREFIX) && !keep.has(name)
    );
    await Promise.all(oldAppCaches.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') {
    if (new URL(request.url).hostname === 'graphql.anilist.co') {
      event.respondWith(fetch(request).catch(() => new Response(
        JSON.stringify({error: 'AniList API nije dostupan offline.'}),
        {status: 503, headers: {'Content-Type': 'application/json'}}
      )));
    }
    return;
  }

  const url = new URL(request.url);
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith((async () => {
      const cached = await caches.match(request, {cacheName: CACHE_CDN});
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_CDN);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return new Response('', {status: 504, statusText: 'Offline'});
      }
    })());
    return;
  }

  const isInApp = url.origin === APP_BASE.origin && url.pathname.startsWith(APP_BASE.pathname);
  if (!isInApp) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_STATIC);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_STATIC);
        return await cache.match(request)
          || await cache.match(APP_ROOT)
          || await cache.match(SHELL_URL)
          || new Response('Aplikacija nije dostupna offline.', {
            status: 503,
            headers: {'Content-Type': 'text/plain; charset=utf-8'}
          });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_STATIC);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request, {cacheName: CACHE_STATIC});
      return cached || Response.error();
    }
  })());
});
