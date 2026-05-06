/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'lucky-pos-v1';
const API_CACHE_NAME = 'lucky-pos-api-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS: string[] = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([CACHE_NAME, API_CACHE_NAME]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !allowedCaches.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin && !url.hostname.endsWith('.supabase.co')) return;

  if (url.pathname.startsWith('/rest/') || url.hostname.endsWith('.supabase.co')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflinePage(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstWithCache(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstWithOfflinePage(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
    return new Response('You are offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cached ?? new Response('offline', { status: 503 }));

  return cached ?? fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'QUEUE_SALE') {
    storePendingSale(event.data.payload);
  }
  if (event.data?.type === 'SYNC_SALES') {
    syncPendingSales();
  }
});

interface PendingSale {
  id: string;
  payload: unknown;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lucky-pos-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending_sales')) {
        db.createObjectStore('pending_sales', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storePendingSale(payload: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_sales', 'readwrite');
  const store = tx.objectStore('pending_sales');
  const record: PendingSale = {
    id: crypto.randomUUID(),
    payload,
    timestamp: Date.now(),
  };
  store.put(record);
}

async function syncPendingSales(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_sales', 'readwrite');
  const store = tx.objectStore('pending_sales');
  const getAllReq = store.getAll();

  return new Promise((resolve) => {
    getAllReq.onsuccess = () => {
      const sales: PendingSale[] = getAllReq.result;
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PENDING_SALES_COUNT', count: sales.length });
        });
      });
      resolve();
    };
  });
}

export {};