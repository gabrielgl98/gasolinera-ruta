import { bounds, cumulative, distanceToRoute, thinRoute } from './geo.js'

/**
 * Gasolineras con el combustible elegido cerca de la ruta (en línea recta),
 * ordenadas de más barata a más cara. Aún sin medir el desvío real.
 */
export function candidatesNearRoute({ route, stations, fuel, radiusKm }) {
  const thin = thinRoute(route)
  const cum = cumulative(thin)
  const box = bounds(thin, radiusKm)
  const out = []
  for (const s of stations) {
    const price = s.prices[fuel]
    if (price == null) continue
    if (s.lon < box.minLon || s.lon > box.maxLon || s.lat < box.minLat || s.lat > box.maxLat) continue
    const { distance, along } = distanceToRoute([s.lon, s.lat], thin, cum)
    if (distance > radiusKm) continue
    out.push({ ...s, price, offRoute: distance, along })
  }
  out.sort((a, b) => a.price - b.price || a.offRoute - b.offRoute)
  return { candidates: out, routeKm: cum[cum.length - 1] }
}

/**
 * Recorre los candidatos (ya ordenados por precio) en lotes y mide el desvío real
 * por carretera. Como están ordenados, la primera válida es la más barata.
 *
 * measure(batch) -> Promise<[{ extraKm, extraMin } | null, ...]>
 */
export async function pickCheapest({
  candidates,
  maxDetourKm,
  measure,
  batchSize = 24,
  maxBatches = 4,
  wanted = 6,
  onProgress,
}) {
  const valid = []
  let checked = 0
  for (let b = 0; b < maxBatches; b++) {
    const batch = candidates.slice(b * batchSize, (b + 1) * batchSize)
    if (!batch.length) break
    onProgress?.(checked, Math.min(candidates.length, batchSize * maxBatches))
    const results = await measure(batch)
    batch.forEach((s, i) => {
      const r = results[i]
      if (r && r.extraKm <= maxDetourKm) valid.push({ ...s, extraKm: Math.max(0, r.extraKm), extraMin: Math.max(0, r.extraMin) })
    })
    checked += batch.length
    if (valid.length >= wanted) break
  }
  valid.sort((a, b) => a.price - b.price || a.extraKm - b.extraKm)
  return { options: valid, checked }
}
