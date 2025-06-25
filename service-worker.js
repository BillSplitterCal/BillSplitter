const CACHE_NAME = 'bill-splitter-cache-v1';
const urlsToCache = [
    './', // Caches the root URL (index.html)
    './index.html',
    './manifest.json',
    // We don't cache external CDN links like Tailwind CSS or Google Fonts as they are outside our control.
    // However, a real-world PWA might pre-fetch these for better offline experience if permissible.
];

// Install event: Caches all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache during install:', error);
            })
    );
});

// Fetch event: Intercepts network requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request)
                    .then(
                        (response) => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            // IMPORTANT: Clone the response. A response is a stream
                            // and can only be consumed once. We must clone it so that
                            // the browser can consume one and we can consume the other.
                            const responseToCache = response.clone();

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    // Only cache successful GET requests for files we want to keep offline
                                    if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension:') && !event.request.url.includes('googleapis.com')) {
                                        cache.put(event.request, responseToCache);
                                    }
                                });

                            return response;
                        }
                    )
                    .catch(error => {
                        console.error('Fetch failed, serving fallback:', error);
                        // You could serve a custom offline page here if desired
                        // For simplicity, we'll just return an empty response or an error
                        return new Response('<h1>Offline</h1><p>Please check your internet connection.</p>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
