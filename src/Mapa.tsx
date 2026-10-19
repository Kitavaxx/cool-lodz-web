import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { MapMouseEvent } from 'maplibre-gl'
import { Alert, Box, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { hours, pct, placeLines, placeTypes, showPopup, steps, sunColor, useData, useMap } from './shared'

const placeLayers = placeTypes.map(({ type }) => `places-${type}`)

export default function Mapa() {
  const [container, map] = useMap()
  const edges = useData('/data/edges.geojson')
  const places = useData('/data/places.geojson')
  const [hour, setHour] = useState(14)
  const [shown, setShown] = useState<Record<string, boolean>>({ cool: true, water: true, bench: false })  // thousands of benches, opt-in
  const placeName = useSearchParams()[0].get('place')

  useEffect(() => {
    if (!map || !edges) return
    if (!map.getSource('edges')) {
      map.addSource('edges', { type: 'geojson', data: edges })
      // Keep segments under the points if places loaded first
      map.addLayer({ id: 'edges', type: 'line', source: 'edges', layout: { 'line-cap': 'round' }, paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 15, 2.5, 17, 6] } }, map.getLayer(placeLayers[0]) ? placeLayers[0] : undefined)
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
          // Points grow with zoom so thousands of benches don't cover the city at the start view
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, { cool: 6, water: 4 }[type] ?? 2.5, 17, { cool: 11, water: 8 }[type] ?? 7],
            'circle-color': color, 'circle-stroke-width': type === 'cool' ? 2 : 1, 'circle-stroke-color': '#fff',
          },
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
        <Box sx={{ display: 'flex', flexWrap: { xs: 'nowrap', sm: 'wrap' }, overflowX: 'auto', scrollbarWidth: 'none', gap: 1, mt: 1.5, maxWidth: { sm: 400 }, '& > *': { flexShrink: 0 } }}>
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
      <Paper sx={{ position: 'absolute', bottom: { xs: 64, sm: 32 }, left: 16, p: 1.5 }}>
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
