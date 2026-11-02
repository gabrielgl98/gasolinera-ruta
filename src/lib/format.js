const eur3 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const eur2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dec1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtPrice = (p) => eur3.format(p)
export const fmtMoney = (v) => `${eur2.format(v)} €`
export const fmtKm = (km) => (km < 10 ? dec1.format(km) : Math.round(km).toString())

export function fmtMin(min) {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

const SMALL = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'a', 'en'])
export function titleCase(s = '') {
  return s
    .toLowerCase()
    .replace(/(^|[\s(/-])(\p{L})/gu, (m, sep, ch, off, str) => {
      const word = str.slice(off + sep.length).split(/[\s,)/-]/)[0]
      return off > 0 && SMALL.has(word) ? m : sep + ch.toUpperCase()
    })
}

export function ago(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (min < 2) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h === 1 ? 'hace 1 hora' : `hace ${h} horas`
}

export function mapsLinks(origin, dest, station) {
  const ll = ([lon, lat]) => `${lat},${lon}`
  const google =
    `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${ll(origin)}` +
    `&destination=${ll(dest)}&waypoints=${ll([station.lon, station.lat])}`
  const apple = `https://maps.apple.com/?saddr=${ll(origin)}&daddr=${ll([station.lon, station.lat])}+to:${ll(dest)}&dirflg=d`
  return { google, apple }
}
