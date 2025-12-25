// Service Worker for PWA Offline Support
// Provides caching strategies for different resource types

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `room-mess-finder-${CACHE_VERSION}`;

// Resources to cache immediately
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html', // Fallback page
];

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
    images: 'cache-first',
    api: 'network-first',
    static: 'cache-first',
    dynamic: 'stale-while-revalidate',
};

// Install event - cache essential resources
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching app shell');
            return cache.addAll(PRECACHE_URLS);
        })
    );

    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    // Take control of all pages immediately
    return self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Determine cache strategy based on request type
    if (request.url.includes('/api/')) {
        // API requests - network first
        event.respondWith(networkFirst(request));
    } else if (request.destination === 'image') {
        // Images - cache first
        event.respondWith(cacheFirst(request));
    } else if (request.url.includes('.js') || request.url.includes('.css')) {
        // Static assets - cache first
        event.respondWith(cacheFirst(request));
    } else {
        // HTML pages - stale while revalidate
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Cache-first strategy
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Network-first strategy
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Network request failed, trying cache:', error);
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return cache.match('/offline.html');
        }
        return new Response('Offline', { status: 503 });
    });

    return cached || fetchPromise;
}

// Background sync for offline bookings
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-bookings') {
        event.waitUntil(syncBookings());
    }
});

async function syncBookings() {
    // Get pending bookings from IndexedDB
    const db = await openDB();
    const pendingBookings = await db.getAll('pending-bookings');

    for (const booking of pendingBookings) {
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(booking),
            });

            if (response.ok) {
                await db.delete('pending-bookings', booking.id);
                console.log('[SW] Synced booking:', booking.id);
            }
        } catch (error) {
            console.error('[SW] Failed to sync booking:', error);
        }
    }
}

// IndexedDB helper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('room-mess-finder-db', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending-bookings')) {
                db.createObjectStore('pending-bookings', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('favorites')) {
                db.createObjectStore('favorites', { keyPath: 'id' });
            }
        };
    });
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Room & Mess Finder';
    const options = {
        body: data.body || 'New notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const url = event.notification.data || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(event.data.urls);
            })
        );
    }
});

console.log('[SW] Service worker loaded');
