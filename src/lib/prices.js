// Lectura de los precios oficiales del Ministerio (MITECO).
// Lo usan tanto el script de descarga (Node) como la app (navegador).

export const MITECO_URL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/'

export const FUELS = [
  { key: 'gasoleo', label: 'Diésel', field: 'Precio Gasoleo A' },
  { key: 'gasolina95', label: 'Gasolina 95', field: 'Precio Gasolina 95 E5' },
  { key: 'gasolina98', label: 'Gasolina 98', field: 'Precio Gasolina 98 E5' },
  { key: 'gasoleoPremium', label: 'Diésel+', field: 'Precio Gasoleo Premium' },
  { key: 'glp', label: 'GLP', field: 'Precio Gases licuados del petróleo' },
]

const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Convierte la respuesta del Ministerio en un formato compacto. */
export function parseMiteco(json, now = new Date()) {
  const stations = []
  for (const e of json.ListaEESSPrecio ?? []) {
    if (e['Tipo Venta'] && e['Tipo Venta'] !== 'P') continue // solo venta al público
    const lat = num(e['Latitud'])
    const lon = num(e['Longitud (WGS84)'])
    if (lat == null || lon == null) continue
    const prices = {}
    for (const f of FUELS) {
      const p = num(e[f.field])
      if (p != null && p > 0) prices[f.key] = p
    }
    if (!Object.keys(prices).length) continue
    stations.push({
      id: e['IDEESS'],
      brand: (e['Rótulo'] || '').trim(),
      address: (e['Dirección'] || '').trim(),
      city: (e['Localidad'] || e['Municipio'] || '').trim(),
      province: (e['Provincia'] || '').trim(),
      hours: (e['Horario'] || '').trim(),
      lat,
      lon,
      prices,
    })
  }
  return {
    updated: now.toISOString(),
    fecha: json.Fecha ?? null,
    stations,
  }
}
