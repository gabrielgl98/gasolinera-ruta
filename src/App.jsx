import { useCallback, useState } from 'react'
import { FUELS } from './lib/prices.js'
import { loadPrices } from './lib/data.js'
import { getRoute, measureDetours } from './lib/osrm.js'
import { searchPlaces, reversePlace } from './lib/geocode.js'
import { candidatesNearRoute, pickCheapest } from './lib/search.js'
import { ago, fmtKm, fmtMin, fmtMoney, fmtPrice, mapsLinks, titleCase } from './lib/format.js'
import { useSettings } from './lib/settings.js'
import PlaceInput from './components/PlaceInput.jsx'
import RouteMap from './components/RouteMap.jsx'

const MAX_OPTIONS = 8

async function resolve(place) {
  if (place.coord) return place
  const found = (await searchPlaces(place.text.trim()))[0]
  if (!found) throw new Error(`No encuentro «${place.text}». Prueba con una dirección o población más concreta.`)
  return { text: found.label, coord: found.coord }
}

export default function App() {
  const [s, set] = useSettings()
  const [busy, setBusy] = useState(null) // texto de progreso o null
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [locating, setLocating] = useState(false)

  const fuelLabel = FUELS.find((f) => f.key === s.fuel).label
  const canSearch = s.origin.text.trim() && s.dest.text.trim() && !busy

  const locate = () => {
    if (!navigator.geolocation) return setError('Tu navegador no permite obtener la ubicación.')
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coord = [coords.longitude, coords.latitude]
        set({ origin: { text: 'Mi ubicación', coord } })
        setLocating(false)
        const text = await reversePlace(coord)
        set({ origin: { text, coord } })
      },
      () => {
        setLocating(false)
        setError('No he podido obtener tu ubicación. Revisa el permiso de ubicación del navegador.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  const swap = () => set({ origin: s.dest, dest: s.origin })

  const search = async (e) => {
    e?.preventDefault()
    if (!canSearch) return
    setError(null)
    setResult(null)
    try {
      setBusy('Cargando precios…')
      const [data, origin, dest] = await Promise.all([
        loadPrices(setBusy),
        resolve(s.origin),
        resolve(s.dest),
      ])
      set({ origin, dest })

      setBusy('Calculando la ruta…')
      const route = await getRoute(origin.coord, dest.coord)

      setBusy('Buscando gasolineras en tu ruta…')
      const { candidates } = candidatesNearRoute({
        route: route.coords,
        stations: data.stations,
        fuel: s.fuel,
        radiusKm: s.maxDetour,
      })

      const { options } = await pickCheapest({
        candidates,
        maxDetourKm: s.maxDetour,
        measure: (batch) => measureDetours(origin.coord, dest.coord, batch),
        onProgress: (done, total) => setBusy(`Midiendo desvíos reales… (${done}/${total})`),
      })

      const avg = candidates.length ? candidates.reduce((a, c) => a + c.price, 0) / candidates.length : null
      setResult({
        route, origin: origin.coord, dest: dest.coord, options: options.slice(0, MAX_OPTIONS), nearby: candidates.length, avg,
        fuel: s.fuel, maxDetour: s.maxDetour, updated: data.updated, fecha: data.fecha, stale: data.stale,
      })
      setSelectedId(options[0]?.id ?? null)
    } catch (err) {
      setError(err.message || 'Algo ha fallado. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const onSelect = useCallback((id) => setSelectedId(id), [])
  const selected = result?.options.find((o) => o.id === selectedId) ?? result?.options[0]

  return (
    <main>
      <header>
        <h1>Gasolinera en ruta</h1>
        <p>La más barata de tu camino, sin salirte más de lo que quieras.</p>
      </header>

      <form onSubmit={search}>
        <div className="group">
          <PlaceInput label="Origen" dot="start" value={s.origin} onChange={(origin) => set({ origin })} placeholder="Desde dónde sales">
            <button type="button" className="icon-btn" onClick={locate} disabled={locating} aria-label="Usar mi ubicación" title="Usar mi ubicación">
              {locating ? '…' : '◎'}
            </button>
          </PlaceInput>
          <PlaceInput label="Destino" dot="end" value={s.dest} onChange={(dest) => set({ dest })} placeholder="A dónde vas">
            <button type="button" className="icon-btn" onClick={swap} aria-label="Intercambiar origen y destino" title="Intercambiar">⇅</button>
          </PlaceInput>
        </div>

        <div className="group pad">
          <div className="field-title" id="fuel-title">Combustible</div>
          <div className="chips" role="radiogroup" aria-labelledby="fuel-title">
            {FUELS.map((f) => (
              <button key={f.key} type="button" role="radio" aria-checked={s.fuel === f.key} className={`chip${s.fuel === f.key ? ' on' : ''}`} onClick={() => set({ fuel: f.key })}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="group pad">
          <div className="slider-head">
            <label htmlFor="detour" className="field-title">Desvío máximo</label>
            <output htmlFor="detour" className="big">{s.maxDetour} km</output>
          </div>
          <input id="detour" type="range" min="1" max="30" step="1" value={s.maxDetour} onChange={(e) => set({ maxDetour: Number(e.target.value) })} />
          <p className="hint">Kilómetros extra que aceptas hacer respecto a la ruta directa (ida a la gasolinera y vuelta a tu camino).</p>

          <details>
            <summary>Más ajustes</summary>
            <div className="slider-head">
              <label htmlFor="liters" className="field-title">Litros a repostar</label>
              <output htmlFor="liters" className="big sm">{s.liters} L</output>
            </div>
            <input id="liters" type="range" min="5" max="100" step="5" value={s.liters} onChange={(e) => set({ liters: Number(e.target.value) })} />
            <div className="slider-head">
              <label htmlFor="cons" className="field-title">Consumo de tu coche</label>
              <output htmlFor="cons" className="big sm">{String(s.consumption).replace('.', ',')} L/100 km</output>
            </div>
            <input id="cons" type="range" min="3" max="15" step="0.5" value={s.consumption} onChange={(e) => set({ consumption: Number(e.target.value) })} />
            <p className="hint">Se usan para estimar lo que cuesta de verdad cada opción, contando el combustible del desvío.</p>
          </details>
        </div>

        <button type="submit" className="primary" disabled={!canSearch}>
          {busy ? <><span className="spinner" aria-hidden="true" />{busy}</> : `Buscar ${fuelLabel.toLowerCase()} más barato`}
        </button>
      </form>

      {error && <div className="alert" role="alert">{error}</div>}

      {result && (
        <Results result={result} selected={selected} selectedId={selectedId} onSelect={onSelect} settings={s} />
      )}

      <footer>
        Precios oficiales del Ministerio para la Transición Ecológica
        {result?.fecha ? <> · datos del {result.fecha.slice(0, 16)} (act. {ago(result.updated)})</> : null}. Rutas: OSRM. Mapa: © OpenStreetMap.
      </footer>
    </main>
  )
}

function totalCost(o, s) {
  return s.liters * o.price + (o.extraKm * s.consumption) / 100 * o.price
}

function Results({ result, selected, selectedId, onSelect, settings: s }) {
  const { options, route, origin, dest, fuel, maxDetour, avg, nearby } = result
  const fuelLabel = FUELS.find((f) => f.key === fuel).label

  if (!options.length) {
    return (
      <section className="card empty">
        <h2>Ninguna gasolinera a menos de {maxDetour} km de desvío</h2>
        <p>
          {nearby
            ? `Hay ${nearby} cerca de la ruta con ${fuelLabel.toLowerCase()}, pero todas te obligan a desviarte más de ${maxDetour} km por carretera.`
            : `No hay gasolineras con ${fuelLabel.toLowerCase()} cerca de esta ruta.`}{' '}
          Sube el desvío máximo o cambia de combustible.
        </p>
      </section>
    )
  }

  const best = options[0]
  const links = mapsLinks(origin, dest, selected)
  const isBest = selected.id === best.id
  const saving = avg && nearby >= 5 ? (avg - selected.price) * s.liters : 0
  const others = options.filter((o) => o.id !== selected.id)

  return (
    <>
      <section className="card hero" aria-live="polite">
        <div className="hero-top">
          <span className={`badge${isBest ? '' : ' neutral'}`}>{isBest ? 'La más barata en tu ruta' : 'Opción seleccionada'}</span>
          <span className="fuel-tag">{fuelLabel}</span>
        </div>
        <div className="price">{fmtPrice(selected.price)}<small> €/L</small></div>
        <h2>{titleCase(selected.brand) || 'Gasolinera'}</h2>
        <p className="addr">
          {titleCase(selected.address)}, {titleCase(selected.city)}
          {selected.hours && <><br /><span className="muted">{selected.hours}</span></>}
        </p>

        <dl className="metrics">
          <div><dt>Desvío</dt><dd>+{fmtKm(selected.extraKm)} km<span>+{fmtMin(selected.extraMin)}</span></dd></div>
          <div><dt>Posición</dt><dd>km {Math.round(selected.along)}<span> de {Math.round(route.km)}</span></dd></div>
          <div><dt>{s.liters} L salen a</dt><dd>{fmtMoney(totalCost(selected, s))}</dd></div>
        </dl>
        {saving >= 0.5 && <p className="saving">Ahorras ≈ {fmtMoney(saving)} en {s.liters} L frente a la media de las gasolineras cercanas a tu ruta.</p>}

        <div className="actions">
          <a className="btn" href={links.google} target="_blank" rel="noopener noreferrer">Google Maps</a>
          <a className="btn" href={links.apple} target="_blank" rel="noopener noreferrer">Apple Maps</a>
        </div>
      </section>

      <RouteMap route={route.coords} origin={origin} dest={dest} options={options} selectedId={selected.id} onSelect={onSelect} />

      {others.length > 0 && (
        <section>
          <h3 className="section-title">Otras opciones</h3>
          <ul className="group list">
            {others.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => { onSelect(o.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                  <span className="grow">
                    <strong>{titleCase(o.brand) || 'Gasolinera'}</strong>
                    <span className="muted">{titleCase(o.city)} · km {Math.round(o.along)} · +{fmtKm(o.extraKm)} km</span>
                  </span>
                  <span className="right">
                    <strong>{fmtPrice(o.price)} €</strong>
                    <span className="muted">{fmtMoney(totalCost(o, s))}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
