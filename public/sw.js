// ═══════════════════════════════════════════════════
// public/sw.js — Service Worker for Bio Defence PWA
// Cache-first for assets, network-first for app shell
// __BUILD_HASH__ is replaced at build time by Vite
// ═══════════════════════════════════════════════════

const CACHE_VERSION = "bio-defence-__BUILD_HASH__";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// App shell files — cached on install
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: pre-cache the app shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate new SW immediately (don't wait for old tabs to close)
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith("bio-defence-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: serve from cache with smart strategies ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST to devlog endpoints)
  if (request.method !== "GET") return;

  // Skip devlog endpoints
  if (url.pathname.startsWith("/__devlog")) return;

  // Skip cross-origin requests (e.g. Google Fonts CDN) — let them pass through
  // but cache font files on first load
  if (url.origin !== self.location.origin) {
    // Cache Google Fonts responses
    if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
      event.respondWith(
        caches.open(ASSET_CACHE).then((cache) =>
          cache.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            });
          })
        )
      );
    }
    return;
  }

  // Game assets (images, audio) — cache-first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Vite build outputs (hashed JS/CSS) — cache-first (hash ensures freshness)
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]+\.(js|css)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // App shell (HTML, manifest, icons) — network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache the fresh response
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline support)
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // If nothing cached and it's a navigation, serve the index
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
