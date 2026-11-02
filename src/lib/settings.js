import { useEffect, useState } from 'react'

const KEY = 'gasolinera-ruta:v1'
export const DEFAULTS = {
  fuel: 'gasoleo',
  maxDetour: 5,
  liters: 40,
  consumption: 6.5,
  origin: { text: '', coord: null },
  dest: { text: '', coord: null },
}

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [s, setS] = useState(read)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch { /* almacenamiento no disponible */ }
  }, [s])
  return [s, (patch) => setS((prev) => ({ ...prev, ...patch }))]
}
