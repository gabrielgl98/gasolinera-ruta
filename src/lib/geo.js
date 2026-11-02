// Geometría sobre coordenadas [lon, lat]. Distancias en kilómetros.

const R = 6371.0088
const rad = (d) => (d * Math.PI) / 180

export function haversine([lon1, lat1], [lon2, lat2]) {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Reduce la ruta dejando puntos separados al menos `minKm` (siempre conserva el último). */
export function thinRoute(coords, minKm = 0.15) {
  if (coords.length < 3) return coords.slice()
  const out = [coords[0]]
  let last = coords[0]
  for (let i = 1; i < coords.length - 1; i++) {
    if (haversine(last, coords[i]) >= minKm) {
      out.push(coords[i])
      last = coords[i]
    }
  }
  out.push(coords[coords.length - 1])
  return out
}

/** Distancia acumulada (km) en cada punto de la ruta. */
export function cumulative(coords) {
  const cum = [0]
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]))
  return cum
}

/**
 * Distancia mínima de un punto a la ruta y posición a lo largo de ella.
 * Proyección plana local centrada en el punto (precisa a estas distancias).
 */
export function distanceToRoute(point, coords, cum) {
  const [plon, plat] = point
  const kx = 111.320 * Math.cos(rad(plat))
  const ky = 110.574
  let best = Infinity
  let bestAlong = 0
  let ax = (coords[0][0] - plon) * kx
  let ay = (coords[0][1] - plat) * ky
  for (let i = 1; i < coords.length; i++) {
    const bx = (coords[i][0] - plon) * kx
    const by = (coords[i][1] - plat) * ky
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const cx = ax + t * dx
    const cy = ay + t * dy
    const d = Math.hypot(cx, cy)
    if (d < best) {
      best = d
      bestAlong = cum[i - 1] + t * (cum[i] - cum[i - 1])
    }
    ax = bx
    ay = by
  }
  return { distance: best, along: bestAlong }
}

export function bounds(coords, marginKm = 0) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const dLat = marginKm / 110.574
  const dLon = marginKm / (111.32 * Math.cos(rad((minLat + maxLat) / 2)))
  return { minLon: minLon - dLon, maxLon: maxLon + dLon, minLat: minLat - dLat, maxLat: maxLat + dLat }
}
