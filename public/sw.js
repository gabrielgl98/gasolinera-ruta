// Service worker: la app abre sin conexión y los precios usan la última copia si no hay red.
const SHELL = 'shell-v1'
const DATA = 'data-v1'
const BASE = self.registration.scope

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      await cache.addAll([BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`])
      // Guarda también los ficheros con hash que usa la página (JS y CSS)
      try {
        const html = await (await fetch(BASE, { cache: 'reload' })).text()
        const urls = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], BASE).href)
        await Promise.all(urls.map((u) => cache.add(u).catch(() => {})))
      } catch { /* se guardarán al usarse */ }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== SHELL && key !== DATA) await caches.delete(key)
      }
      await self.clients.claim()
    })(),
  )
})

async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(fallbackKey ?? request, res.clone())
    return res
  } catch (err) {
    const hit = await cache.match(fallbackKey ?? request)
    if (hit) return hit
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok) cache.put(request, res.clone())
  return res
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // rutas, direcciones y mapa: siempre red

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, BASE))
  } else if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request, DATA))
  } else {
    event.respondWith(cacheFirst(request))
  }
})
