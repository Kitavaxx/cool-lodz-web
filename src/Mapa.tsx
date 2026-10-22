import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ExpressionSpecification, MapMouseEvent } from 'maplibre-gl'
import type { LineString } from 'geojson'
import { Alert, Box, Chip, IconButton, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { BeachAccess, FilterDrama, Visibility, VisibilityOff, WbSunny } from '@mui/icons-material'
import { hourPills, hours, metres, pct, placeIcon, placeLines, placeTypes, showPopup, steps, sunColor, useData, useMap } from './shared'

const placeLayers = placeTypes.map(({ type }) => `places-${type}`)

// Sun-share ranges the user switches on one by one; cut-offs match the colour steps
const ranges = [
  { name: 'Cień', cut: [0, 0.335], Icon: BeachAccess },
  { name: 'Półcień', cut: [0.335, 0.665], Icon: FilterDrama },
  { name: 'Słońce', cut: [0.665, 1.01], Icon: WbSunny },
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

  // Share of street length in each range at this hour, for the bar above the range buttons
  const lengths = useMemo(() => edges?.features.map((f) => {
    const c = (f.geometry as LineString).coordinates
    return c.slice(1).reduce((sum, p, i) => sum + metres(c[i], p), 0)
  }), [edges])
  const shares = useMemo(() => {
    if (!edges || !lengths) return
    const sum = [0, 0, 0]
    edges.features.forEach((f, i) => {
      const s = f.properties![`s${hour}`]
      sum[ranges.findIndex(({ cut }) => s >= cut[0] && s < cut[1])] += lengths[i]
    })
    const total = sum[0] + sum[1] + sum[2]
    return sum.map((x) => x / total)
  }, [edges, lengths, hour])

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
      showPopup(map, e.lngLat, f.layer.id === 'edges' ? [`${pct(p[`s${hour}`])} w słońcu`, `o ${hour}:00 · ${edges?.accuracy}`] : placeLines(p))
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
        <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && setHour(h)} aria-label="Godzina" sx={hourPills}>
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
      </Paper>
      <Paper sx={{ position: 'absolute', bottom: { xs: 64, sm: 32 }, left: 16, right: { xs: 16, sm: 'auto' }, p: 1.5, width: { sm: 340 } }}>
        {edges === null ? <Alert severity="warning">Brak danych</Alert> : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WbSunny sx={{ color: steps[1].color }} />
              <Typography sx={{ fontWeight: 700, flex: 1 }}>Słońce na ulicach · {hour}:00</Typography>
              <Tooltip title={picked.length === ranges.length ? 'Ukryj ulice' : 'Pokaż wszystkie'}>
                <IconButton size="small" onClick={() => setPicked(picked.length === ranges.length ? [] : [0, 1, 2])}>
                  {picked.length === ranges.length ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Box>
            {/* How much of the street length falls in each range at this hour */}
            <Box sx={{ display: 'flex', gap: '3px', height: 8, mt: 1, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover' }}>
              {shares?.map((share, i) => (
                <Tooltip key={i} title={`${ranges[i].name}: ${pct(share)} długości ulic (${edges?.accuracy})`}>
                  <Box sx={{ width: `${share * 100}%`, bgcolor: steps[i].color, opacity: !picked.length || picked.includes(i) ? 1 : 0.3, transition: 'all .3s' }} />
                </Tooltip>
              ))}
            </Box>
            <ToggleButtonGroup value={picked} onChange={(_, v: number[]) => setPicked(v)} size="small" fullWidth aria-label="Zakres słońca" sx={{ mt: 1.5, gap: 1, '& .MuiToggleButtonGroup-grouped': { border: 1.5, borderColor: 'divider', borderRadius: '14px !important', m: 0 } }}>
              {ranges.map(({ name, Icon }, i) => {
                const { color, label } = steps[i]
                const on = picked.includes(i)
                return (
                  <ToggleButton
                    key={name}
                    value={i}
                    sx={{ flexDirection: 'column', gap: 0.5, py: 1, lineHeight: 1.2, color: 'text.primary', '&.Mui-selected, &.Mui-selected:hover': { bgcolor: `${color}1f`, borderColor: `${color} !important` } }}
                  >
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', transition: 'all .2s', bgcolor: on ? color : `${color}1f`, color: on ? '#fff' : color }}><Icon /></Box>
                    <b>{name}</b>
                    <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Box>
                  </ToggleButton>
                )
              })}
            </ToggleButtonGroup>
          </>
        )}
      </Paper>
    </Box>
  )
}
