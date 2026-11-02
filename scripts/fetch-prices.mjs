// Descarga los precios del Ministerio y deja un JSON compacto en public/data/prices.json
import { mkdir, writeFile } from 'node:fs/promises'
import { MITECO_URL, parseMiteco } from '../src/lib/prices.js'

let res
for (let i = 1; i <= 4; i++) {
  try {
    res = await fetch(MITECO_URL, { signal: AbortSignal.timeout(90_000) })
    if (res.ok) break
    console.error(`Intento ${i}: HTTP ${res.status}`)
  } catch (err) {
    console.error(`Intento ${i}: ${err.message}`)
  }
  await new Promise((r) => setTimeout(r, 5000 * i))
}
if (!res?.ok) {
  console.error('No se pudieron descargar los precios.')
  process.exit(1)
}
const data = parseMiteco(await res.json())
if (data.stations.length < 5000) {
  console.error(`Solo ${data.stations.length} gasolineras: la respuesta parece incompleta.`)
  process.exit(1)
}
await mkdir('public/data', { recursive: true })
await writeFile('public/data/prices.json', JSON.stringify(data))
console.log(`${data.stations.length} gasolineras guardadas (${data.fecha}).`)
