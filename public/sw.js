self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("olympus-static-v1").then((cache) =>
      cache.addAll(["/", "/admin", "/icon-192.svg", "/icon-512.svg"])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const cloned = response.clone();
            caches.open("olympus-static-v1").then((cache) => cache.put(request, cloned));
          }

          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
