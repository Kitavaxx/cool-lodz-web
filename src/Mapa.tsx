import { useEffect, useRef, useState } from 'react'
import { Map as MapLibre, Popup, type ExpressionSpecification, type MapLayerMouseEvent } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { Alert, Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

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

const sunColor = (hour: number) =>
  ['step', ['get', `s${hour}`], steps[0].color, 0.335, steps[1].color, 0.665, steps[2].color] as ExpressionSpecification

// null = missing or broken file, shown as "Brak danych"
const load = (url: string): Promise<Data | null> =>
  fetch(url).then((r) => r.json()).then((d) => (d?.features ? d : null)).catch(() => null)

export default function Mapa() {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre>()
  const [edges, setEdges] = useState<Data | null>()
  const [hour, setHour] = useState(14)

  useEffect(() => {
    const m = new MapLibre({ container: container.current!, style: 'https://tiles.openfreemap.org/styles/positron', bounds })
    m.on('load', () => setMap(m))
    return () => m.remove()
  }, [])

  useEffect(() => {
    load('/data/edges.geojson').then(setEdges)
  }, [])

  useEffect(() => {
    if (!map || !edges) return
    if (!map.getSource('edges')) {
      map.addSource('edges', { type: 'geojson', data: edges })
      map.addLayer({ id: 'edges', type: 'line', source: 'edges', layout: { 'line-cap': 'round' }, paint: { 'line-width': 5 } })
    }
    map.setPaintProperty('edges', 'line-color', sunColor(hour))
  }, [map, edges, hour])

  // Colour is never the only signal: tapping a segment shows its percentage
  useEffect(() => {
    if (!map || !edges) return
    const onClick = (e: MapLayerMouseEvent) => {
      const s = e.features![0].properties[`s${hour}`]
      new Popup().setLngLat(e.lngLat).setText(`Słońce o ${hour}:00: ${pct(s)} (${edges.accuracy})`).addTo(map)
    }
    map.on('click', 'edges', onClick)
    return () => void map.off('click', 'edges', onClick)
  }, [map, edges, hour])

  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <Box ref={container} sx={{ height: '100%' }} />
      <Paper sx={{ position: 'absolute', top: 16, left: 16, right: { xs: 16, sm: 'auto' }, p: 1.5 }}>
        <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && setHour(h)} aria-label="Godzina">
          {hours.map((h) => <ToggleButton key={h} value={h}>{h}:00</ToggleButton>)}
        </ToggleButtonGroup>
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
