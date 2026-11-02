const OSRM = 'https://router.project-osrm.org'

async function getJson(url, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25_000) })
      if (res.status === 429) throw new Error('El servicio de rutas está saturado. Inténtalo en unos segundos.')
      if (!res.ok && res.status !== 400) throw new Error(`El servicio de rutas respondió ${res.status}.`)
      const json = await res.json()
      if (json.code && json.code !== 'Ok') {
        if (json.code === 'NoRoute') throw Object.assign(new Error('No hay ruta por carretera entre esos dos puntos.'), { final: true })
        throw new Error(json.message || `Error de rutas: ${json.code}`)
      }
      return json
    } catch (err) {
      lastErr = err
      if (err.final) break
      await new Promise((r) => setTimeout(r, 700))
    }
  }
  throw lastErr
}

const pt = ([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`

/** Ruta A -> B. Devuelve geometría [lon,lat][], km y minutos. */
export async function getRoute(a, b) {
  const json = await getJson(`${OSRM}/route/v1/driving/${pt(a)};${pt(b)}?overview=full&geometries=geojson`)
  const r = json.routes[0]
  return { coords: r.geometry.coordinates, km: r.distance / 1000, min: r.duration / 60 }
}

/**
 * Para cada gasolinera: kilómetros y minutos extra de ir A -> gasolinera -> B
 * frente a la ruta directa. Una sola petición por lote.
 */
export async function measureDetours(a, b, stations) {
  const coords = [a, b, ...stations.map((s) => [s.lon, s.lat])]
  const path = coords.map(pt).join(';')
  const json = await getJson(`${OSRM}/table/v1/driving/${path}?annotations=distance,duration`)
  const { distances: D, durations: T } = json
  const baseKm = D[0][1]
  const baseMin = T[0][1]
  return stations.map((_, i) => {
    const k = i + 2
    const d1 = D[0][k], d2 = D[k][1], t1 = T[0][k], t2 = T[k][1]
    if (d1 == null || d2 == null || baseKm == null) return null
    return { extraKm: (d1 + d2 - baseKm) / 1000, extraMin: (t1 + t2 - baseMin) / 60 }
  })
}
