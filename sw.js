// Som Fit Service Worker — offline support
var CACHE = "somfit-v1";
var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// On install: cache the app shell
self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(PRECACHE); })
  );
  self.skipWaiting();
});

// On activate: clear old caches
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch strategy:
// - Same-origin (app shell, icons): cache-first
// - CDN scripts (React, Firebase, Leaflet): network-first with cache fallback
// - Firebase API calls: network-only (no caching auth/firestore)
// - Tile map (OSM): cache-first with network update
self.addEventListener("fetch", function(e){
  var url = e.request.url;

  // Skip non-GET requests
  if(e.request.method !== "GET") return;

  // Skip Firebase API — always needs network
  if(url.includes("firestore.googleapis.com") || url.includes("firebase") || url.includes("accounts.google.com/gsi")) return;

  // OSM map tiles — cache-first
  if(url.includes("tile.openstreetmap.org")){
    e.respondWith(
      caches.open("somfit-tiles").then(function(c){
        return c.match(e.request).then(function(cached){
          var fresh = fetch(e.request).then(function(r){
            c.put(e.request, r.clone());
            return r;
          }).catch(function(){ return cached; });
          return cached || fresh;
        });
      })
    );
    return;
  }

  // CDN (unpkg, cdnjs, gstatic) — network-first with cache fallback
  if(url.includes("unpkg.com") || url.includes("cdnjs.cloudflare.com") || url.includes("gstatic.com")){
    e.respondWith(
      fetch(e.request).then(function(r){
        var clone = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return r;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // App shell — cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(r){
        var clone = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return r;
      });
    })
  );
});
