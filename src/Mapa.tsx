import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ExpressionSpecification, MapMouseEvent } from 'maplibre-gl'
import { Alert, Box, Button, Chip, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { hours, pct, placeIcon, placeLines, placeTypes, showPopup, steps, sunColor, useData, useMap } from './shared'

const placeLayers = placeTypes.map(({ type }) => `places-${type}`)

// Sun-share ranges the user switches on one by one; cut-offs match the colour steps
const ranges = [
  { name: 'Cień', cut: [0, 0.335] },
  { name: 'Półcień', cut: [0.335, 0.665] },
  { name: 'Słońce', cut: [0.665, 1.01] },
]
const inRange = (hour: number, i: number): ExpressionSpecification =>
  ['all', ['>=', ['get', `s${hour}`], ranges[i].cut[0]], ['<', ['get', `s${hour}`], ranges[i].cut[1]]]

export default function Mapa() {
  const [container, map] = useMap()
  const edges = useData('/data/edges.geojson')
  const places = useData('/data/places.geojson')
  const [hour, setHour] = useState(14)
  const [picked, setPicked] = useState<number[]>([]) // no streets coloured until the user picks a range
  const [shown, setShown] = useState<Record<string, boolean>>({ cool: true, water: true, bench: false })  // thousands of benches, opt-in
  const placeName = useSearchParams()[0].get('place')

  useEffect(() => {
    if (!map || !edges) return
    if (!map.getSource('edges')) {
      map.addSource('edges', { type: 'geojson', data: edges })
      // Keep segments under the points if places loaded first
      map.addLayer({ id: 'edges', type: 'line', source: 'edges', layout: { 'line-cap': 'round' }, paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 15, 2.5, 17, 6] } }, map.getLayer('places-bench') ? 'places-bench' : undefined)
    }
    map.setPaintProperty('edges', 'line-color', sunColor(hour))
    map.setLayoutProperty('edges', 'visibility', picked.length ? 'visible' : 'none')
    map.setFilter('edges', ['any', ...picked.map((i) => inRange(hour, i))])
  }, [map, edges, hour, picked])

  useEffect(() => {
    if (!map || !places) return
    if (!map.getSource('places')) {
      map.addSource('places', { type: 'geojson', data: places })
      // Benches first so cool places and water sit on top; benches may hide each other so thousands don't cover the start view
      for (const { type } of [...placeTypes].reverse()) {
        map.addLayer({
          id: `places-${type}`, type: 'symbol', source: 'places', filter: ['==', ['get', 'type'], type],
          layout: {
            'icon-image': `place-${type}`, 'icon-allow-overlap': type !== 'bench',
            'icon-size': ['interpolate', ['linear'], ['zoom'], 13, { cool: 0.75, water: 0.6 }[type] ?? 0.4, 17, { cool: 1.1, water: 0.9 }[type] ?? 0.75],
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
        <Box sx={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 1, mt: 1.5, '& > *': { flexShrink: 0 } }}>
          {places === null && <Alert severity="warning">Brak danych o miejscach</Alert>}
          {places && placeTypes.map(({ type, label, color }) => (
            <Chip
              key={type}
              label={<>{label} <Box component="span" sx={{ opacity: 0.6, fontWeight: 400 }}>{places.features.filter((f) => f.properties?.type === type).length}</Box></>}
              variant="outlined"
              icon={<img src={placeIcon(type)} alt="" width={24} height={24} />}
              onClick={() => setShown({ ...shown, [type]: !shown[type] })}
              aria-pressed={shown[type]}
              sx={{
                height: 36, pl: 0.25, fontWeight: 600, borderWidth: 1.5, transition: 'all .15s',
                ...(shown[type]
                  ? { borderColor: color, bgcolor: `${color}1a`, '&&:hover': { bgcolor: `${color}2e` } }
                  : { color: 'text.secondary', '& img': { filter: 'grayscale(1)', opacity: 0.45 } }),
              }}
            />
          ))}
        </Box>
        {places && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, maxWidth: { sm: 400 } }}>
            Punkty: OpenStreetMap, niezweryfikowane. Dotknij punktu, by zobaczyć szczegóły.
          </Typography>
        )}
      </Paper>
      <Paper sx={{ position: 'absolute', bottom: { xs: 64, sm: 32 }, left: 16, right: { xs: 16, sm: 'auto' }, p: 1.5, width: { sm: 340 } }}>
        {edges === null ? <Alert severity="warning">Brak danych</Alert> : (
          <>
            <Typography variant="subtitle2">Pokaż ulice według słońca o {hour}:00</Typography>
            <ToggleButtonGroup value={picked} onChange={(_, v: number[]) => setPicked(v)} size="small" fullWidth aria-label="Zakres słońca" sx={{ mt: 1 }}>
              {ranges.map(({ name }, i) => (
                <ToggleButton
                  key={name}
                  value={i}
                  sx={{ flexDirection: 'column', gap: 0.5, py: 1, lineHeight: 1.2, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: `${steps[i].color}26`, color: 'text.primary' } }}
                >
                  <Box sx={{ width: 28, height: 5, borderRadius: 1, bgcolor: steps[i].color }} />
                  <b>{name}</b>
                  <Box component="span" sx={{ fontSize: 12 }}>{steps[i].label}</Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {picked.length ? `Dokładność: ${edges?.accuracy ?? '…'}` : 'Wybierz zakres, by pokolorować ulice'}
              </Typography>
              <Button size="small" onClick={() => setPicked(picked.length === ranges.length ? [] : [0, 1, 2])}>
                {picked.length === ranges.length ? 'Ukryj' : 'Wszystkie'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  )
}
