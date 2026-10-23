import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ExpressionSpecification, MapMouseEvent } from 'maplibre-gl'
import { Alert, Box, Chip, Collapse, IconButton, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { BeachAccess, FilterDrama, KeyboardArrowDown, KeyboardArrowUp, Visibility, VisibilityOff, WbSunny } from '@mui/icons-material'
import { cityBounds, hourPills, hours, pct, placeIcon, placeLines, placeTypes, showPopup, steps, sunColor, useData, useMap } from './shared'

const placeLayers = placeTypes.map(({ type }) => `places-${type}`)

// Sun-share ranges the user switches on one by one, in whole percents like the shade tiles; cut-offs match the colour steps
const ranges = [
  { name: 'Cień', cut: [0, 33.5], Icon: BeachAccess },
  { name: 'Półcień', cut: [33.5, 66.5], Icon: FilterDrama },
  { name: 'Słońce', cut: [66.5, 101], Icon: WbSunny },
]
const inRange = (hour: number, i: number): ExpressionSpecification =>
  ['all', ['>=', ['get', `s${hour}`], ranges[i].cut[0]], ['<', ['get', `s${hour}`], ranges[i].cut[1]]]

type Shares = { items: { hour: number; shares: number[] }[] }

export default function Mapa() {
  const [container, map] = useMap(cityBounds)
  const shareData = useData<Shares>('/data/shares.json') // share of street length per range and hour, worked out with the tiles
  const places = useData('/data/places.geojson')
  const [hour, setHour] = useState(14)
  const [picked, setPicked] = useState<number[]>([]) // no streets coloured until the user picks a range
  // The sun panel folds down to its title row. It starts folded on phones (under 600 px, MUI's sm), where it would cover the map
  const [open, setOpen] = useState(() => matchMedia('(min-width: 600px)').matches)
  const [shown, setShown] = useState<Record<string, boolean>>({ cool: true, water: true, bench: false })  // thousands of benches, opt-in
  const placeName = useSearchParams()[0].get('place')

  const shares = shareData?.items.find((i) => i.hour === hour)?.shares // for the bar above the range buttons

  // The whole city's walking network comes as vector tiles (scripts/tiles.py): the GeoJSON would be far too big
  useEffect(() => {
    if (!map) return
    if (!map.getSource('edges')) {
      map.addSource('edges', { type: 'vector', tiles: [`${location.origin}/data/tiles/{z}/{x}/{y}.pbf`], minzoom: 9, maxzoom: 15 })
      // Keep segments under the points if places loaded first
      map.addLayer({
        id: 'edges', type: 'line', source: 'edges', 'source-layer': 'edges', layout: { 'line-cap': 'round' },
        paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.4, 12, 2.2, 14, 2.4, 15, 2.8, 17, 6] }, // thick at city zoom, or a few shaded streets get lost
      }, map.getLayer('places-bench') ? 'places-bench' : undefined)
    }
    map.setPaintProperty('edges', 'line-color', sunColor(hour))
    map.setLayoutProperty('edges', 'visibility', picked.length ? 'visible' : 'none')
    // Opacity, not a filter: a new filter makes MapLibre re-parse every tile of the city, which is slow and left the streets blank for a moment
    map.setPaintProperty('edges', 'line-opacity', ['case', ['any', ...picked.map((i) => inRange(hour, i))], 1, 0] as ExpressionSpecification)
  }, [map, hour, picked])

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
      showPopup(map, e.lngLat, f.layer.id === 'edges' ? [`${p[`s${hour}`]} % w słońcu`, `o ${hour}:00 · ${shareData?.accuracy}`] : placeLines(p))
    }
    map.on('click', onClick)
    return () => void map.off('click', onClick)
  }, [map, shareData, hour])

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
      <Paper sx={{ position: 'absolute', top: { xs: 8, sm: 16 }, left: { xs: 8, sm: 16 }, right: { xs: 8, sm: 'auto' }, p: { xs: 1, sm: 1.5 } }}>
        <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && setHour(h)} aria-label="Godzina" sx={hourPills}>
          {hours.map((h) => <ToggleButton key={h} value={h}>{h}:00</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 1, mt: { xs: 1, sm: 1.5 }, '& > *': { flexShrink: 0 } }}>
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
                height: { xs: 32, sm: 36 }, pl: 0.25, fontWeight: 600, borderWidth: 1.5, transition: 'all .15s',
                ...(shown[type]
                  ? { borderColor: color, bgcolor: `${color}1a`, '&&:hover': { bgcolor: `${color}2e` } }
                  : { color: 'text.secondary', '& img': { filter: 'grayscale(1)', opacity: 0.45 } }),
              }}
            />
          ))}
        </Box>
      </Paper>
      {/* The bottom bar is outside the map box, so the panel only needs a small margin */}
      <Paper sx={{ position: 'absolute', bottom: { xs: 8, sm: 32 }, left: { xs: 8, sm: 16 }, right: { xs: 8, sm: 'auto' }, p: { xs: 1, sm: 1.5 }, width: { sm: 340 } }}>
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WbSunny sx={{ color: steps[1].color }} />
              <Typography sx={{ fontWeight: 700, flex: 1 }}>Słońce na ulicach · {hour}:00</Typography>
              <Tooltip title={picked.length === ranges.length ? 'Ukryj ulice' : 'Pokaż wszystkie'}>
                <IconButton size="small" onClick={() => setPicked(picked.length === ranges.length ? [] : [0, 1, 2])}>
                  {picked.length === ranges.length ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
              <Tooltip title={open ? 'Zwiń' : 'Rozwiń'}>
                <IconButton size="small" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Zwiń panel' : 'Rozwiń panel'}>
                  {open ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
                </IconButton>
              </Tooltip>
            </Box>
            <Collapse in={open}>
            {/* How much of the street length falls in each range at this hour */}
            <Box sx={{ display: 'flex', gap: '3px', height: 8, mt: 1, borderRadius: 4, overflow: 'hidden', bgcolor: 'action.hover' }}>
              {shares?.map((share, i) => (
                <Tooltip key={i} title={`${ranges[i].name}: ${pct(share)} długości ulic (${shareData?.accuracy})`}>
                  <Box sx={{ width: `${share * 100}%`, bgcolor: steps[i].color, opacity: !picked.length || picked.includes(i) ? 1 : 0.3, transition: 'all .3s' }} />
                </Tooltip>
              ))}
            </Box>
            <ToggleButtonGroup value={picked} onChange={(_, v: number[]) => setPicked(v)} size="small" fullWidth aria-label="Zakres słońca" sx={{ mt: { xs: 1, sm: 1.5 }, gap: 1, '& .MuiToggleButtonGroup-grouped': { border: 1.5, borderColor: 'divider', borderRadius: '14px !important', m: 0 } }}>
              {ranges.map(({ name, Icon }, i) => {
                const { color, label } = steps[i]
                const on = picked.includes(i)
                return (
                  <ToggleButton
                    key={name}
                    value={i}
                    sx={{ flexDirection: 'column', gap: { xs: 0.25, sm: 0.5 }, py: { xs: 0.5, sm: 1 }, lineHeight: 1.2, color: 'text.primary', '&.Mui-selected, &.Mui-selected:hover': { bgcolor: `${color}1f`, borderColor: `${color} !important` } }}
                  >
                    <Box sx={{ width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 }, borderRadius: '50%', display: 'grid', placeItems: 'center', transition: 'all .2s', bgcolor: on ? color : `${color}1f`, color: on ? '#fff' : color }}><Icon /></Box>
                    <b>{name}</b>
                    <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Box>
                  </ToggleButton>
                )
              })}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Szacunek z budynków OSM, bez drzew. Poza centrum miasta wyniki mogą być mniej dokładne.
            </Typography>
            </Collapse>
        </>
      </Paper>
    </Box>
  )
}
