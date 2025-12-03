// Ime keša i verzija.
const CACHE_STATIC_KEY = 'nitro-pwa-static-v7'; // Povećana verzija za prisilni update
const CACHE_CDN_KEY = 'nitro-pwa-cdn-v7'; // Povećana verzija

// Statika za keširanje (HTML, SW, Manifest) - Putanje su ROOT-relativne
const staticAssets = [
  '/index.html',
  '/sw.js',
  '/manifest.json',
];

// CDN resursi koje koristimo (Chart.js, PapaParse)
const cdnAssets = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

// --- Install Event: Keširanje statike i CDN resursa ---
self.addEventListener('install', event => {
  console.log('[SW] Service Worker je instaliran, keširanje resursa...');
  
  event.waitUntil(
    Promise.all([
      // Keširanje statičkih resursa
      caches.open(CACHE_STATIC_KEY).then(cache => {
        return cache.addAll(staticAssets).catch(err => {
          console.error('[SW] Greška pri keširanju statike:', err);
        });
      }),
      // Keširanje CDN resursa (Fix: Uklonjen { mode: 'cors' })
      caches.open(CACHE_CDN_KEY).then(cache => {
        const cdnRequests = cdnAssets.map(url => {
          return fetch(url).then(response => {
            if (!response || response.status !== 200) {
              console.warn(`[SW] CDN resurs nije keširan: ${url}`);
              return Promise.resolve();
            }
            return cache.put(url, response);
          });
        });
        return Promise.all(cdnRequests);
      })
    ])
    .then(() => self.skipWaiting())
  );
});

// --- Activate Event: Čišćenje starih keševa ---
self.addEventListener('activate', event => {
  console.log('[SW] Service Worker je aktiviran, čišćenje starog keša...');
  const cacheWhitelist = [CACHE_STATIC_KEY, CACHE_CDN_KEY];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[SW] Brisanje starog keša: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// --- Fetch Event: Strategije keširanja ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. AniList GraphQL API (Network First, bez keširanja)
  if (url.hostname.includes('anilist.co')) {
    event.respondWith(
      fetch(event.request).catch(error => {
        console.error('[SW] Greška pri AniList API pozivu, preskačemo:', error);
        return new Response('{"error": "API Error or Offline"}', {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }
  
  // 2. CDN Resursi (Cache First, uz fallback na Network)
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          console.log(`[SW] Služenje CDN iz keša: ${url.pathname}`);
          return response;
        }
        
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_CDN_KEY).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(error => {
        console.error('[SW] Greška pri dohvaćanju CDN-a:', error);
      })
    );
    return;
  }

  // 3. Lokalni statički fajlovi (Network First, uz fallback na Cache)
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      // Keširaj novu verziju (Update keša)
      if (networkResponse && networkResponse.status === 200) {
        const assetPath = url.pathname;
        // Provjeravamo i za root putanju i za statične asete
        if (staticAssets.includes(assetPath)) {
           caches.open(CACHE_STATIC_KEY).then(cache => {
             cache.put(event.request, networkResponse.clone());
           });
        }
      }
      return networkResponse;
    }).catch(() => {
      // Offline fallback: vrati keširanu verziju
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          console.log(`[SW] Offline: Služenje iz keša: ${url.pathname}`);
          return cachedResponse;
        }
        // U krajnjem slučaju, vrati index.html
        return caches.match('/index.html');
      });
    })
  );
});

// --- Bonus: Detekcija ažuriranja Service Workera ---
self.addEventListener('controllerchange', () => {
  console.log('[SW] Novi Service Worker preuzeo kontrolu. Aplikacija se može osvježiti za nove značajke.');
});
