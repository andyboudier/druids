/*
 * Druids PoloACT — app-shell service worker.
 *
 * Goal: stop the JS/CSS shell being re-downloaded on every cold start, WITHOUT
 * breaking the ~90s web-update mechanism that installed apps rely on.
 *
 * How the ~90s path is preserved:
 *   - Navigations / index.html use NETWORK-FIRST. When online you always get the
 *     freshest index.html, which references the newest content-hashed asset URLs,
 *     so a new Vercel deploy is picked up immediately (same as today). The cached
 *     copy is only a fallback for when the network is unavailable.
 *   - /assets/* files are content-hashed and immutable (Vite fingerprints them,
 *     and vercel.json already serves them `immutable`). They use CACHE-FIRST: once
 *     fetched they are served from the Cache Storage on subsequent cold starts and
 *     never re-downloaded. A new build emits new filenames, which simply get cached
 *     on first use; the old ones linger harmlessly and are pruned on activate.
 *
 * Anything cross-origin (Firestore, Google Fonts, FCM) is NOT intercepted — those
 * requests pass straight through untouched.
 *
 * This worker's logic is static: it never needs to change per deploy, because the
 * freshness guarantee comes from network-first HTML + content-hashed assets, not
 * from a precache manifest. vercel.json serves /sw.js with no-cache so any future
 * edit here is still picked up promptly.
 */

const VERSION = 'v1';
const SHELL_CACHE = `dlpc-shell-${VERSION}`;
const ASSET_CACHE = `dlpc-assets-${VERSION}`;
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE]);

self.addEventListener('install', (event) => {
  // Activate this worker as soon as it's installed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older worker versions.
      const names = await caches.keys();
      await Promise.all(names.map((n) => (KEEP.has(n) ? null : caches.delete(n))));
      await self.clients.claim();
    })()
  );
});

const isNavigation = (req) =>
  req.mode === 'navigate' ||
  (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs. Everything else (Firestore, fonts, POSTs…)
  // is left completely alone.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations / the HTML shell: network-first, cache as offline fallback.
  // This is what keeps the ~90s update path working — online users always get
  // fresh HTML pointing at the newest asset hashes.
  if (isNavigation(req)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch (err) {
          const cache = await caches.open(SHELL_CACHE);
          const cached = (await cache.match('/index.html')) || (await cache.match(req));
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  // Content-hashed build assets: cache-first (safe because the filename changes
  // whenever the content does).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        // Only cache complete, same-origin 200s.
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          cache.put(req, fresh.clone());
        }
        return fresh;
      })()
    );
    return;
  }

  // Everything else on our origin: just go to the network.
});
