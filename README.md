# Gasolinera en ruta

PWA en React que, dados un origen y un destino, encuentra la gasolinera **más barata de la ruta** sin salirte más de un **desvío máximo configurable**.

- **Precios:** API oficial del Ministerio para la Transición Ecológica. Una tarea de GitHub Actions los descarga cada hora y los publica como `data/prices.json` (~450 KB comprimido). Si ese fichero tiene más de 3 h, la app consulta al Ministerio directamente (12 MB).
- **Rutas y desvío real:** OSRM. Se descartan las gasolineras lejos de la ruta en línea recta y, con las más baratas, se calcula `A → gasolinera → B` menos `A → B` por carretera.
- **Direcciones:** Photon (OpenStreetMap). **Mapa:** Leaflet + OpenStreetMap.
- **Móvil:** service worker (funciona sin conexión con la última copia) y manifest para instalarla en la pantalla de inicio.

```bash
npm install
npm run prices   # descarga los precios a public/data/prices.json
npm run dev
npm test
```
