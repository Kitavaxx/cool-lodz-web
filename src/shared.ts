import { useEffect, useRef, useState } from 'react'
import { Map as MapLibre, Popup, setWorkerUrl, type ExpressionSpecification, type LngLatLike } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, GeoJsonProperties } from 'geojson'

// Code used by more than one page (SPEC 4)

// MapLibre finds its worker from import.meta.url at runtime, which Vite can't follow, so hand it the URL
setWorkerUrl(workerUrl)

// Data files carry accuracy and computed_at next to the features or items (SPEC 5)
export type Data<T = FeatureCollection> = T & { accuracy: string; computed_at: string }

export const bounds: [number, number, number, number] = [19.43, 51.74, 19.48, 51.78]
export const hours = [10, 12, 14, 16, 18]
export const pct = (s: number) => `${Math.round(s * 100)} %`

// Three sun-share steps; cut-offs match Math.round on the percentage labels
export const steps = [
  { color: '#2c7fb8', label: '0–33 %' },
  { color: '#f4b942', label: '34–66 %' },
  { color: '#e4572e', label: '67–100 %' },
]
export const sunColor = (hour: number) =>
  ['step', ['get', `s${hour}`], steps[0].color, 0.335, steps[1].color, 0.665, steps[2].color] as ExpressionSpecification

export const placeTypes = [
  { type: 'cool', label: 'Miejsca chłodu', color: '#4fb3e8' },
  { type: 'water', label: 'Woda pitna', color: '#1565c0' },
  { type: 'bench', label: 'Ławki', color: '#8d6e63' },
]

// OSM opening_hours day codes to Polish
const days: Record<string, string> = { Mo: 'pn', Tu: 'wt', We: 'śr', Th: 'czw', Fr: 'pt', Sa: 'sob', Su: 'nd' }
export const polishDays = (hours: string) => hours.replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (d) => days[d])

export const placeLines = (p: NonNullable<GeoJsonProperties>) =>
  [p.name, p.address, p.hours ? polishDays(p.hours) : 'Brak godzin otwarcia', p.verified ? 'Zweryfikowane' : 'Niezweryfikowane', `Źródło: ${p.source}`]

// Text only (no HTML), one line per entry
export function showPopup(map: MapLibre, at: LngLatLike, lines: string[]) {
  const el = document.createElement('div')
  el.style.whiteSpace = 'pre-line'
  el.textContent = lines.filter(Boolean).join('\n')
  return new Popup().setLngLat(at).setDOMContent(el).addTo(map)
}

// undefined = loading, null = missing or broken file (shown as "Brak danych")
export function useData<T = FeatureCollection>(url: string) {
  const [data, setData] = useState<Data<T> | null>()
  useEffect(() => {
    fetch(url).then((r) => r.json()).then((d) => setData(d?.features || d?.items ? d : null)).catch(() => setData(null))
  }, [url])
  return data
}

// Base map of Śródmieście; the map is returned once its style has loaded
export function useMap() {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre>()
  useEffect(() => {
    const m = new MapLibre({ container: ref.current!, style: 'https://tiles.openfreemap.org/styles/positron', bounds })
    m.on('load', () => setMap(m))
    return () => m.remove()
  }, [])
  return [ref, map] as const
}
