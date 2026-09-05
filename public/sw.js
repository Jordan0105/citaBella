/**
 * Service worker de CitaBella (PWA).
 * Estrategia (instructions/performance.md):
 *  - Navegaciones (HTML): network-first con fallback a caché y /offline.
 *  - Assets estáticos de Next (_next/static): cache-first (inmutables).
 *  - API / Supabase / cron: SIEMPRE red (sin caché de datos).
 */
const VERSION = "citabella-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const PRECACHE = ["/", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$/.test(url.pathname)
  );
}

function isDataRequest(url) {
  return (
    url.pathname.startsWith("/rest/v1") ||
    url.pathname.startsWith("/auth/v1") ||
    url.pathname.startsWith("/realtime/v1") ||
    url.pathname.startsWith("/storage/v1") ||
    url.pathname.startsWith("/api/")
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Datos: siempre red, sin interceptar
  if (isDataRequest(url)) return;

  // Assets inmutables: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ??
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches
              .open(ASSET_CACHE)
              .then((cache) => cache.put(event.request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Navegaciones: network-first con fallback offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(PAGE_CACHE)
            .then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((hit) => hit ?? caches.match("/offline"))
            .then(
              (hit) => hit ?? new Response("Sin conexión", { status: 503 }),
            ),
        ),
    );
  }
});
