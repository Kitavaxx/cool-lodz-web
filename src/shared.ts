import { useEffect, useRef, useState } from 'react'
import { Map as MapLibre, Popup, setWorkerUrl, type ExpressionSpecification, type LngLatBoundsLike, type LngLatLike } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, GeoJsonProperties } from 'geojson'
import { polishDays } from './hours'

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


// Water and bench points have no address or hours in OSM, so say what they are instead of "Brak godzin otwarcia". Their unverified status is in the map caption.
export const placeLines = (p: NonNullable<GeoJsonProperties>) => {
  const status = [p.verified ? 'Zweryfikowane' : 'Niezweryfikowane', `Źródło: ${p.source}`]
  if (p.type === 'cool') return [p.name, p.address, p.hours ? polishDays(p.hours) : 'Brak godzin otwarcia', ...status]
  return [p.type === 'water' ? 'Miejsce, w którym można napić się wody' : p.name, p.address, `Źródło: ${p.source}`]
}

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

// Łódź city limits with some margin: maps can't be panned or zoomed out beyond it
const city: LngLatBoundsLike = [[19.25, 51.64], [19.71, 51.9]]

// Dim everything outside the Łódź boundary (lodz.geojson) and outline the city, under the basemap labels
async function maskOutsideCity(map: MapLibre) {
  const d = await fetch('/data/lodz.geojson').then((r) => r.json())
  const ring = d.features[0].geometry.coordinates[0]
  const world = [[18, 51], [21, 51], [21, 52.5], [18, 52.5], [18, 51]]
  const labels = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
  map.addSource('city', { type: 'geojson', data: { type: 'Polygon', coordinates: [world, ring] } })
  map.addLayer({ id: 'city-mask', type: 'fill', source: 'city', paint: { 'fill-color': '#e9eef0', 'fill-opacity': 0.88 } }, labels)
  map.addLayer({ id: 'city-line', type: 'line', source: 'city', paint: { 'line-color': '#0e5f74', 'line-width': 2, 'line-opacity': 0.5 } }, labels)
}

// Base map of Śródmieście; the map is returned once its style (and the city mask) has loaded
export function useMap() {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre>()
  useEffect(() => {
    const m = new MapLibre({ container: ref.current!, style: 'https://tiles.openfreemap.org/styles/positron', bounds, maxBounds: city })
    m.on('load', () => maskOutsideCity(m).catch(() => { }).finally(() => setMap(m))) // no mask is fine, no map is not
    return () => m.remove()
  }, [])
  return [ref, map] as const
}

// Distance in metres between two [lon, lat] points (equirectangular, fine within a city)
export const metres = ([x1, y1]: number[], [x2, y2]: number[]) =>
  Math.hypot((x2 - x1) * 111320 * Math.cos((y1 * Math.PI) / 180), (y2 - y1) * 110540)
