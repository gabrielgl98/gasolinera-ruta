import test from 'node:test'
import assert from 'node:assert/strict'
import { haversine, cumulative, distanceToRoute, thinRoute } from '../src/lib/geo.js'
import { candidatesNearRoute, pickCheapest } from '../src/lib/search.js'
import { parseMiteco } from '../src/lib/prices.js'

// Ruta recta de oeste a este por el ecuador: ~111 km por grado de longitud.
const route = [[0, 0], [0.5, 0], [1, 0]]

test('haversine: 1 grado en el ecuador ≈ 111,2 km', () => {
  assert.ok(Math.abs(haversine([0, 0], [1, 0]) - 111.19) < 0.1)
})

test('distanceToRoute: punto a ~11 km del trazado y a mitad de camino', () => {
  const cum = cumulative(route)
  const { distance, along } = distanceToRoute([0.5, 0.1], route, cum)
  assert.ok(Math.abs(distance - 11.1) < 0.2, `distance=${distance}`)
  assert.ok(Math.abs(along - 55.6) < 0.5, `along=${along}`)
})

test('thinRoute conserva extremos', () => {
  const dense = Array.from({ length: 1001 }, (_, i) => [i / 1000, 0])
  const t = thinRoute(dense)
  assert.deepEqual(t[0], dense[0])
  assert.deepEqual(t.at(-1), dense.at(-1))
  assert.ok(t.length < 600 && t.length > 400, `puntos=${t.length}`)
  for (let i = 1; i < t.length - 1; i++) assert.ok(haversine(t[i - 1], t[i]) >= 0.15)
})

const st = (id, lon, lat, price) => ({ id, lon, lat, price, prices: { gasoleo: price } })

test('candidatesNearRoute filtra por radio y combustible y ordena por precio', () => {
  const stations = [
    st('cara', 0.5, 0.01, 1.7),
    st('barata', 0.2, 0.02, 1.5),
    st('lejos', 0.5, 0.5, 1.0),
    { id: 'sinDiesel', lon: 0.5, lat: 0, prices: { gasolina95: 1.2 } },
  ]
  const { candidates } = candidatesNearRoute({ route, stations, fuel: 'gasoleo', radiusKm: 5 })
  assert.deepEqual(candidates.map((c) => c.id), ['barata', 'cara'])
})

test('pickCheapest devuelve la más barata cuyo desvío real cabe', async () => {
  const candidates = [st('a', 0, 0, 1.4), st('b', 0, 0, 1.5), st('c', 0, 0, 1.6)]
  const extra = { a: 12, b: 4, c: 1 }
  const measure = async (batch) => batch.map((s) => ({ extraKm: extra[s.id], extraMin: extra[s.id] }))
  const { options } = await pickCheapest({ candidates, maxDetourKm: 5, measure })
  assert.deepEqual(options.map((o) => o.id), ['b', 'c'])
})

test('pickCheapest sin ninguna válida devuelve lista vacía', async () => {
  const candidates = [st('a', 0, 0, 1.4)]
  const { options } = await pickCheapest({ candidates, maxDetourKm: 1, measure: async () => [{ extraKm: 9, extraMin: 9 }] })
  assert.equal(options.length, 0)
})

test('parseMiteco convierte comas decimales y descarta lo inservible', () => {
  const json = { Fecha: '01/01/2026 10:00:00', ListaEESSPrecio: [
    { IDEESS: '1', 'Rótulo': 'X', 'Dirección': 'C/ A', Localidad: 'L', Provincia: 'P', Horario: 'L-D', Latitud: '40,5', 'Longitud (WGS84)': '-3,5', 'Tipo Venta': 'P', 'Precio Gasoleo A': '1,539', 'Precio Gasolina 95 E5': '' },
    { IDEESS: '2', Latitud: '40,5', 'Longitud (WGS84)': '-3,5', 'Tipo Venta': 'P', 'Precio Gasoleo A': '' },
    { IDEESS: '3', Latitud: '40,5', 'Longitud (WGS84)': '-3,5', 'Tipo Venta': 'R', 'Precio Gasoleo A': '1,2' },
  ] }
  const { stations } = parseMiteco(json)
  assert.equal(stations.length, 1)
  assert.deepEqual(stations[0].prices, { gasoleo: 1.539 })
  assert.equal(stations[0].lon, -3.5)
})
