const NOT_FOUND_URL = "/404.html";
const CACHE_NAME = "site-fallback-v2";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.add(NOT_FOUND_URL)),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith("site-fallback-"))
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.mode !== "navigate") {
        return;
    }

    event.respondWith(
        fetch(request).then(async (response) => {
            if (response.status !== 404) {
                return response;
            }

            const fallback = await caches.match(NOT_FOUND_URL);
            return fallback || response;
        }),
    );
});
