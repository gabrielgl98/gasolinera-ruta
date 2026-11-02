import { MITECO_URL, parseMiteco } from './prices.js'

const MAX_AGE_MS = 3 * 60 * 60 * 1000
let memo

/**
 * Precios: primero el fichero ligero que se regenera cada hora.
 * Si falta o tiene más de 3 horas, directo al Ministerio (12 MB).
 */
export async function loadPrices(onStatus) {
  if (memo && Date.now() - new Date(memo.updated) < MAX_AGE_MS) return memo
  let local = null
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/prices.json`, { cache: 'no-cache' })
    if (res.ok) local = await res.json()
  } catch { /* sin red o sin fichero */ }
  if (local && Date.now() - new Date(local.updated) < MAX_AGE_MS) return (memo = local)

  try {
    onStatus?.('Descargando precios oficiales del Ministerio…')
    const res = await fetch(MITECO_URL, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (memo = parseMiteco(await res.json()))
  } catch (err) {
    if (local) return (memo = { ...local, stale: true })
    throw new Error('No se pudieron cargar los precios de combustible. Comprueba tu conexión.')
  }
}
