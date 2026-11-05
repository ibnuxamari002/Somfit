// Som Fit Service Worker — no-cache for app files
const TILE_CACHE = "somfit-tiles-v1";

self.addEventListener("install", function() {
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function(e) {
  var url = e.request.url;

  // Cache only map tiles (they rarely change)
  if (url.includes("tile.openstreetmap.org")) {
    e.respondWith(
      caches.open(TILE_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          return cached || fetch(e.request).then(function(res) {
            cache.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Everything else — always fetch fresh from network, no cache
  // This means index.html always loads the latest version after a deploy
  e.respondWith(fetch(e.request, {cache: "reload"}));
});
