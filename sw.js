const CACHE_NAME = 'heads-up-neon-patch-1.2';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/data.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[SW] Installing new service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] All resources cached');
                return self.skipWaiting(); // Activate immediately
            })
    );
});

// Fetch event - Network-first for app files, cache-first for static assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first strategy for HTML, CSS, JS to ensure fresh content
    const isAppFile = url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname === '/';

    if (isAppFile) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone and cache the fresh response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseToCache));
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache-first for static assets (images, fonts, etc.)
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseToCache));
                        return response;
                    });
                })
        );
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating new service worker...');
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Claiming clients...');
            return self.clients.claim(); // Take control immediately
        })
    );
});
