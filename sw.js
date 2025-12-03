// Prije: const CACHE_STATIC_KEY = 'nitro-pwa-static-v1';
const CACHE_STATIC_KEY = 'nitro-pwa-static-v2';
const CACHE_CDN_KEY = 'nitro-pwa-cdn-v1';

// Statika za keširanje (HTML, SW, Manifest)
const staticAssets = [
  './nitro_analytics.html',
  './sw.js',
  './manifest.json',
  // Koristimo Chart.js i PapaParse kao CDN resurse, oni idu u CDN keš
];

// CDN resursi koje koristimo (Chart.js, PapaParse)
const cdnAssets = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

// --- Install Event: Keširanje statike i CDN resursa ---
self.addEventListener('install', event => {
  console.log('[SW] Service Worker je instaliran, keširanje resursa...');
  // Čekamo da se keširaju oba skupa resursa
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC_KEY).then(cache => {
        return cache.addAll(staticAssets).catch(err => {
          console.error('[SW] Greška pri keširanju statike:', err);
        });
      }),
      caches.open(CACHE_CDN_KEY).then(cache => {
        // Dodajemo strategiju za handle-anje CORS-a za CDN
        const cdnRequests = cdnAssets.map(url => {
          return fetch(url, { mode: 'cors' }).then(response => {
            if (!response || response.status !== 200) {
              console.warn(`[SW] CDN resurs nije keširan: ${url}`);
              return Promise.resolve(); // Ne prekidamo, samo upozorimo
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
    .then(() => self.clients.claim()) // Preuzimanje kontrole nad postojećim klijentima
  );
});

// --- Fetch Event: Strategije keširanja ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. AniList GraphQL API (Network First, bez keširanja)
  // AniList je dinamičan, uvijek želimo najnovije podatke.
  if (url.hostname.includes('anilist.co')) {
    event.respondWith(
      fetch(event.request).catch(error => {
        console.error('[SW] Greška pri AniList API pozivu, preskačemo:', error);
        // Nema graceful fall backa za API, samo propadni.
        return new Response('{"error": "API Error or Offline"}', {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }
  
  // 2. CDN Resursi (Cache First, uz fallback na Network)
  // Uvijek pokušaj iz keša, ako nema, pokušaj s mreže.
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Vrati iz keša ako postoji
        if (response) {
          console.log(`[SW] Služenje CDN iz keša: ${url.pathname}`);
          return response;
        }
        
        // Ako nema u kešu, idi na mrežu
        return fetch(event.request).then(networkResponse => {
          // I keširaj ga za buduće korištenje
          return caches.open(CACHE_CDN_KEY).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(error => {
        console.error('[SW] Greška pri dohvaćanju CDN-a:', error);
        // Možeš dodati fallback ovdje, npr. prazan JS fajl
      })
    );
    return;
  }

  // 3. Lokalni statički fajlovi (Network First, uz fallback na Cache)
  // Uvijek pokušaj dohvatiti najnoviju verziju sa mreže. Ako nema mreže, vrati keširanu verziju.
  // Ovo je ključno za glavni HTML fajl.
  event.respondWith(
    fetch(event.request).then(networkResponse => {
      // Keširaj novu verziju (Update keša)
      if (networkResponse && networkResponse.status === 200) {
        if (staticAssets.includes(url.pathname) || url.pathname === '/') {
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
        // U krajnjem slučaju, za nepoznate URL-ove, vrati fallback (npr. početnu stranicu)
        return caches.match('/nitro_analytics.html');
      });
    })
  );
});

// --- Bonus: Detekcija ažuriranja Service Workera ---
self.addEventListener('controllerchange', () => {
  console.log('[SW] Novi Service Worker preuzeo kontrolu. Aplikacija se može osvježiti za nove značajke.');
});