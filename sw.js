/* Service worker for German Drills.

   Source template — build/build.js stamps the placeholder below with a hash of
   the built index.html and writes the result to sw.js at the repo root. The
   hash is the cache name, so every deploy installs a fresh cache and drops the
   previous one; without that, a cache-first worker would pin users to an old
   build forever.

   Why this exists: GitHub Pages serves index.html with Cache-Control:
   max-age=600. Ten minutes after loading, the entry is stale, the browser tries
   to revalidate, and an offline reload fails outright. Without a service worker
   the app is not usable offline in a browser — only from file://.

   The whole app is one HTML file, so this is the classic app-shell pattern:
   every navigation is answered with the cached shell, and the fonts are cached
   opportunistically as they are requested. */

const BUILD = '872b08d55693';
const CACHE = 'german-drills-' + BUILD;

// The shell is resolved against the worker's own scope, so it is correct
// whether the site is served from a domain root or a project subpath.
const SHELL_URL = new URL('index.html', self.location).href;

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' bypasses the HTTP cache, so a deploy can never install
      // a worker that precaches the *previous* build out of the browser cache.
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
    // Deliberately not caught: if the shell cannot be cached there is nothing
    // to serve offline, and a failed install is better than a worker that
    // silently answers every navigation from an empty cache.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k.indexOf('german-drills-') === 0)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Every navigation gets the shell, whatever the URL looked like ('/',
  // '/index.html', '/?x=1', '/#extra'). This is what makes an offline reload
  // work at all.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE)
        .then((cache) => cache.match(SHELL_URL))
        .then((hit) => hit || fetch(req))
        .catch(() => fetch(req))
    );
    return;
  }

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only the webfonts are worth caching as subresources; everything else the
  // page needs is inlined in the shell. Anything else goes straight to the
  // network untouched.
  if (FONT_HOSTS.indexOf(url.hostname) === -1) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          // Opaque cross-origin font responses report status 0 but still
          // replay fine from the cache.
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        });
      })
    )
  );
});
