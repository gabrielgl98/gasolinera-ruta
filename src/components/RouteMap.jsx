import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { fmtPrice } from '../lib/format.js'

const latlng = ([lon, lat]) => [lat, lon]

export default function RouteMap({ route, origin, dest, options, selectedId, onSelect }) {
  const el = useRef()
  const map = useRef()
  const layer = useRef()
  const fitted = useRef(null)

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])

  useEffect(() => {
    const g = layer.current
    g.clearLayers()
    const line = L.polyline(route.map(latlng), { color: '#007aff', weight: 5, opacity: 0.85 }).addTo(g)
    const pin = (c, cls) => L.marker(latlng(c), { icon: L.divIcon({ className: '', html: `<span class="map-dot ${cls}"></span>`, iconSize: [18, 18] }), interactive: false }).addTo(g)
    pin(origin, 'start')
    pin(dest, 'end')
    options.forEach((o, i) => {
      const cls = `map-price${i === 0 ? ' best' : ''}${o.id === selectedId ? ' selected' : ''}`
      L.marker([o.lat, o.lon], {
        icon: L.divIcon({ className: '', html: `<span class="${cls}">${fmtPrice(o.price)}</span>`, iconSize: [0, 0] }),
        zIndexOffset: o.id === selectedId ? 1000 : i === 0 ? 500 : 0,
      })
        .on('click', () => onSelect(o.id))
        .addTo(g)
    })
    if (fitted.current !== route) {
      fitted.current = route
      map.current.fitBounds(line.getBounds().pad(0.12))
    }
  }, [route, origin, dest, options, selectedId, onSelect])

  return <div ref={el} className="map" role="img" aria-label="Mapa de la ruta con las gasolineras" />
}
