// Park Day service worker.
// - index.html / app shell: NETWORK-FIRST so bug fixes and updates always reach
//   the user. Falls back to cache when offline.
// - Static assets (icons, manifest): cache-first for instant offline loads.
// - API data and cross-origin requests: network only, never cached.
const CACHE = "park-day-v2";
const STATIC_ASSETS = ["./manifest.json", "./icon-192.png", "./icon-512.png", "./logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppShell(url) {
  return url.pathname === "/" || url.pathname.endsWith("/index.html");
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // APIs & CDNs: network only
  if (isAppShell(url)) {
    // Network-first: always try for the newest app code.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});
