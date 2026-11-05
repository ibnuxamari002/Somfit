// Som Fit Service Worker — always-fresh strategy
// Bump this version string every deploy to force clients to update immediately
const CACHE_VERSION = "somfit-v" + Date.now();

self.addEventListener("install", function(e) {
  // Skip waiting so the new SW activates immediately (no manual refresh needed)
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  // Take control of all open tabs immediately
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          // Delete ALL old caches so stale files are gone
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(e) {
  var url = e.request.url;

  // For map tiles and external CDN — use network first, fall back to cache
  if (url.includes("tile.openstreetmap") || url.includes("cdnjs.cloudflare") || url.includes("cdn.jsdelivr")) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_VERSION).then(function(c) { c.put(e.request, clone); });
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // For the app itself (index.html and same-origin files) — ALWAYS network first
  // This ensures users always get the latest version after a deploy
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).catch(function() {
      return caches.match(e.request);
    })
  );
});
