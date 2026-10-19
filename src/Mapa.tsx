import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Map as MapLibre, Popup, type ExpressionSpecification, type LngLatLike, type MapMouseEvent } from 'maplibre-gl'
import type { FeatureCollection, GeoJsonProperties } from 'geojson'
import { Alert, Box, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

// Data files carry accuracy and computed_at next to the features (SPEC 5)
type Data = FeatureCollection & { accuracy: string; computed_at: string }

const bounds: [number, number, number, number] = [19.43, 51.74, 19.48, 51.78]
const hours = [10, 12, 14, 16, 18]
const pct = (s: number) => `${Math.round(s * 100)} %`

// Three sun-share steps; cut-offs match Math.round on the percentage labels
const steps = [
  { color: '#2c7fb8', label: '0–33 %' },
  { color: '#f4b942', label: '34–66 %' },
  { color: '#e4572e', label: '67–100 %' },
]

const placeTypes = [
  { type: 'cool', label: 'Miejsca chłodu', color: '#4fb3e8' },
  { type: 'water', label: 'Woda pitna', color: '#1565c0' },
  { type: 'bench', label: 'Ławki', color: '#8d6e63' },
]
const placeLayers = placeTypes.map(({ type }) => `places-${type}`)

// OSM opening_hours day codes to Polish
const days: Record<string, string> = { Mo: 'pn', Tu: 'wt', We: 'śr', Th: 'czw', Fr: 'pt', Sa: 'sob', Su: 'nd' }
const polishDays = (hours: string) => hours.replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (d) => days[d])

const placeLines = (p: NonNullable<GeoJsonProperties>) =>
  [p.name, p.address, p.hours ? polishDays(p.hours) : 'Brak godzin otwarcia', p.verified ? 'Zweryfikowane' : 'Niezweryfikowane', `Źródło: ${p.source}`]

// Text only (no HTML), one line per entry
function showPopup(map: MapLibre, at: LngLatLike, lines: string[]) {
  const el = document.createElement('div')
  el.style.whiteSpace = 'pre-line'
  el.textContent = lines.filter(Boolean).join('\n')
  return new Popup().setLngLat(at).setDOMContent(el).addTo(map)
}

const sunColor = (hour: number) =>
  ['step', ['get', `s${hour}`], steps[0].color, 0.335, steps[1].color, 0.665, steps[2].color] as ExpressionSpecification

// null = missing or broken file, shown as "Brak danych"
const load = (url: string): Promise<Data | null> =>
  fetch(url).then((r) => r.json()).then((d) => (d?.features ? d : null)).catch(() => null)

export default function Mapa() {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre>()
  const [edges, setEdges] = useState<Data | null>()
  const [places, setPlaces] = useState<Data | null>()
  const [hour, setHour] = useState(14)
  const [shown, setShown] = useState<Record<string, boolean>>({ cool: true, water: true, bench: true })
  const placeName = useSearchParams()[0].get('place')

  useEffect(() => {
    const m = new MapLibre({ container: container.current!, style: 'https://tiles.openfreemap.org/styles/positron', bounds })
    m.on('load', () => setMap(m))
    return () => m.remove()
  }, [])

  useEffect(() => {
    load('/data/edges.geojson').then(setEdges)
    load('/data/places.geojson').then(setPlaces)
  }, [])

  useEffect(() => {
    if (!map || !edges) return
    if (!map.getSource('edges')) {
      map.addSource('edges', { type: 'geojson', data: edges })
      // Keep segments under the points if places loaded first
      map.addLayer({ id: 'edges', type: 'line', source: 'edges', layout: { 'line-cap': 'round' }, paint: { 'line-width': 5 } }, map.getLayer(placeLayers[0]) ? placeLayers[0] : undefined)
    }
    map.setPaintProperty('edges', 'line-color', sunColor(hour))
  }, [map, edges, hour])

  useEffect(() => {
    if (!map || !places) return
    if (!map.getSource('places')) {
      map.addSource('places', { type: 'geojson', data: places })
      for (const { type, color } of placeTypes) {
        map.addLayer({
          id: `places-${type}`, type: 'circle', source: 'places', filter: ['==', ['get', 'type'], type],
          paint: { 'circle-radius': type === 'cool' ? 8 : 5, 'circle-color': color, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
        })
      }
    }
    for (const { type } of placeTypes) map.setLayoutProperty(`places-${type}`, 'visibility', shown[type] ? 'visible' : 'none')
  }, [map, places, shown])

  // One handler for all layers, so a point over a segment opens one popup. Colour is never the only signal.
  useEffect(() => {
    if (!map) return
    const onClick = (e: MapMouseEvent) => {
      const { x, y } = e.point
      const layers = ['edges', ...placeLayers].filter((id) => map.getLayer(id))
      const f = map.queryRenderedFeatures([[x - 6, y - 6], [x + 6, y + 6]], { layers })[0]
      if (!f) return
      const p = f.properties
      showPopup(map, e.lngLat, f.layer.id === 'edges' ? [`Słońce o ${hour}:00: ${pct(p[`s${hour}`])} (${edges?.accuracy})`] : placeLines(p))
    }
    map.on('click', onClick)
    return () => void map.off('click', onClick)
  }, [map, edges, hour])

  // /mapa?place=<name>, linked from /miejsca-chlodu
  useEffect(() => {
    const f = places?.features.find((f) => f.properties?.name === placeName)
    if (!map || f?.geometry.type !== 'Point') return
    const at = f.geometry.coordinates as [number, number]
    map.flyTo({ center: at, zoom: 17 })
    const popup = showPopup(map, at, placeLines(f.properties!))
    return () => void popup.remove()
  }, [map, places, placeName])

  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <Box ref={container} sx={{ height: '100%' }} />
      <Paper sx={{ position: 'absolute', top: 16, left: 16, right: { xs: 16, sm: 'auto' }, p: 1.5 }}>
        <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && setHour(h)} aria-label="Godzina">
          {hours.map((h) => <ToggleButton key={h} value={h}>{h}:00</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, maxWidth: { sm: 400 } }}>
          {places === null && <Alert severity="warning">Brak danych o miejscach</Alert>}
          {places && placeTypes.map(({ type, label, color }) => (
            <Chip
              key={type}
              label={label}
              variant={shown[type] ? 'filled' : 'outlined'}
              icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, opacity: shown[type] ? 1 : 0.4 }} />}
              onClick={() => setShown({ ...shown, [type]: !shown[type] })}
              aria-pressed={shown[type]}
            />
          ))}
          <Chip label="Cisza · w przygotowaniu" variant="outlined" disabled />
          <Chip label="Powietrze · w przygotowaniu" variant="outlined" disabled />
        </Box>
      </Paper>
      <Paper sx={{ position: 'absolute', bottom: 32, left: 16, p: 1.5 }}>
        {edges === null ? <Alert severity="warning">Brak danych</Alert> : (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Słońce o {hour}:00</Typography>
            {steps.map(({ color, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 5, borderRadius: 1, bgcolor: color }} />
                <Typography variant="body2">{label}</Typography>
              </Box>
            ))}
            {edges && <Typography variant="caption" color="text.secondary">Dokładność: {edges.accuracy}</Typography>}
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
