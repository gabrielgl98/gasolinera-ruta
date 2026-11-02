// Búsqueda de direcciones con Photon (OpenStreetMap). Solo España.
const PHOTON = 'https://photon.komoot.io'
const SPAIN_BBOX = '-18.5,27.4,4.6,43.9'

function label(p) {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ')
  const first = p.name && p.name !== p.street ? p.name : street
  const parts = [first, p.name && street && p.name !== p.street ? street : null, p.city || p.town || p.village || p.district, p.state]
  return [...new Set(parts.filter(Boolean))].join(', ')
}

export async function searchPlaces(query, signal) {
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=7&bbox=${SPAIN_BBOX}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('No se pudo buscar la dirección.')
  const json = await res.json()
  return json.features
    .filter((f) => !f.properties.countrycode || f.properties.countrycode === 'ES')
    .map((f) => ({ label: label(f.properties), coord: f.geometry.coordinates }))
    .filter((p) => p.label)
}

export async function reversePlace([lon, lat]) {
  try {
    const res = await fetch(`${PHOTON}/reverse?lon=${lon}&lat=${lat}&limit=1`, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const l = json.features?.[0] && label(json.features[0].properties)
    return l || 'Mi ubicación'
  } catch {
    return 'Mi ubicación'
  }
}
