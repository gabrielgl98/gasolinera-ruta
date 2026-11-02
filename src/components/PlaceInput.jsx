import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces } from '../lib/geocode.js'

export default function PlaceInput({ label, value, onChange, placeholder, dot, children }) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [items, setItems] = useState([])
  const timer = useRef()
  const ctrl = useRef()

  useEffect(() => {
    clearTimeout(timer.current)
    ctrl.current?.abort()
    const q = value.text.trim()
    if (!focused || value.coord || q.length < 3) {
      setItems([])
      return
    }
    timer.current = setTimeout(async () => {
      ctrl.current = new AbortController()
      try {
        setItems(await searchPlaces(q, ctrl.current.signal))
      } catch (e) {
        if (e.name !== 'AbortError') setItems([])
      }
    }, 350)
    return () => clearTimeout(timer.current)
  }, [value.text, value.coord, focused])

  const pick = (p) => {
    onChange({ text: p.label, coord: p.coord })
    setItems([])
  }

  return (
    <div className="row place">
      <span className={`dot ${dot}`} aria-hidden="true" />
      <div className="grow">
        <label htmlFor={id} className="row-label">{label}</label>
        <input
          id={id}
          type="text"
          value={value.text}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          onChange={(e) => onChange({ text: e.target.value, coord: null })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {value.text && (
        <button type="button" className="icon-btn clear" aria-label={`Borrar ${label.toLowerCase()}`} onClick={() => onChange({ text: '', coord: null })}>
          ×
        </button>
      )}
      {children}
      {focused && items.length > 0 && (
        <ul className="suggestions" role="listbox">
          {items.map((p, i) => (
            <li key={i} role="option" onPointerDown={(e) => { e.preventDefault(); pick(p) }}>
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
