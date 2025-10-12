const CACHE_NAME = "ayos-cache-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// Install the service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  console.log("[ServiceWorker] Installed");
});

// Activate the service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  console.log("[ServiceWorker] Activated");
});

// Fetch requests
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Serve from cache if available, otherwise fetch from network
      return response || fetch(event.request);
    })
  );
});
