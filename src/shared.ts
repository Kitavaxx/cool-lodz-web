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

// Hour buttons as pills, the selected one filled like the active nav item
export const hourPills = {
  gap: 0.5, bgcolor: 'action.hover', p: 0.5, borderRadius: 999,
  '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '999px !important', m: 0, fontWeight: 600, color: 'text.secondary' },
  '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': { bgcolor: 'primary.main', color: 'common.white' },
}

// Three sun-share steps; cut-offs match Math.round on the percentage labels
export const steps = [
  { color: '#2c7fb8', label: '0–33 %' },
  { color: '#f4b942', label: '34–66 %' },
  { color: '#e4572e', label: '67–100 %' },
]
export const sunColor = (hour: number) =>
  ['step', ['get', `s${hour}`], steps[0].color, 0.335, steps[1].color, 0.665, steps[2].color] as ExpressionSpecification

// icon: 24×24 SVG path (snowflake and drop from Material Icons, bench drawn by hand)
export const placeTypes = [
  { type: 'cool', label: 'Miejsca chłodu', color: '#1e88c9', icon: 'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z' },
  { type: 'water', label: 'Woda pitna', color: '#3949ab', icon: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8M7.83 14c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87' },
  { type: 'bench', label: 'Ławki', color: '#8d6e63', icon: 'M4 6h16v3.5H4zM2 11h20v3h-2v5h-2.5v-5h-11v5H4v-5H2z' },
]

// Round badge with a white glyph, as a data URL: the map marker and the matching legend icon
export const placeIcon = (type: string) => {
  const { color, icon } = placeTypes.find((t) => t.type === type)!
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="34" r="28" fill="#000" opacity=".2"/><circle cx="32" cy="31" r="27" fill="${color}" stroke="#fff" stroke-width="4"/><path transform="translate(17 16) scale(1.25)" fill="#fff" d="${icon}"/></svg>`,
  )
}

async function addPlaceIcons(map: MapLibre) {
  await Promise.all(placeTypes.map(async ({ type }) => {
    const img = new Image(64, 64)
    img.src = placeIcon(type)
    await img.decode()
    map.addImage(`place-${type}`, img, { pixelRatio: 2 })
  }))
}


// Water and bench points have no address or hours in OSM, so say what they are instead of "Brak godzin otwarcia"
export const placeLines = (p: NonNullable<GeoJsonProperties>) => {
  const source = `${p.source} · ${p.verified ? 'zweryfikowane' : 'niezweryfikowane'}`
  if (p.type === 'cool') return [p.name, p.address, p.hours ? polishDays(p.hours) : 'Brak godzin otwarcia', source]
  return [p.type === 'water' ? 'Woda pitna' : p.name, p.address, source]
}

// Text only (no HTML): the first line is the title, the rest smaller and grey
export function showPopup(map: MapLibre, at: LngLatLike, lines: string[]) {
  const el = document.createElement('div')
  lines.filter(Boolean).forEach((line, i) => {
    const row = el.appendChild(document.createElement('div'))
    row.textContent = line
    row.style.cssText = i ? 'font-size:13px;color:#5b6b72;margin-top:2px' : 'font-size:15px;font-weight:700;margin-bottom:2px;padding-right:16px'
  })
  return new Popup({ maxWidth: '280px', focusAfterOpen: false }).setLngLat(at).setDOMContent(el).addTo(map)
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

// Base map of Śródmieście; the map is returned once its style (with the city mask and place icons) has loaded
export function useMap() {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre>()
  useEffect(() => {
    const m = new MapLibre({ container: ref.current!, style: 'https://tiles.openfreemap.org/styles/positron', bounds, maxBounds: city })
    // On narrow screens MapLibre opens the attribution text as soon as the style data arrives, over the panels. Fold it to the "i" button
    // (a tap still opens it). Its own listeners run before ours in the same event, so it never gets painted open. Only until load.
    const fold = () => m.getContainer().querySelector('.maplibregl-ctrl-attrib.maplibregl-compact')?.classList.remove('maplibregl-compact-show')
    m.on('styledata', fold)
    m.on('sourcedata', fold)
    m.on('load', () => {
      m.off('styledata', fold)
      m.off('sourcedata', fold)
      fold()
      Promise.allSettled([maskOutsideCity(m), addPlaceIcons(m)]).then(() => setMap(m)) // no mask is fine, no map is not
    })
    return () => m.remove()
  }, [])
  return [ref, map] as const
}

// Distance in metres between two [lon, lat] points (equirectangular, fine within a city)
export const metres = ([x1, y1]: number[], [x2, y2]: number[]) =>
  Math.hypot((x2 - x1) * 111320 * Math.cos((y1 * Math.PI) / 180), (y2 - y1) * 110540)
