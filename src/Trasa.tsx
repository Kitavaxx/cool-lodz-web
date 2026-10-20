import { useEffect, useMemo, useState } from 'react'
import { LngLatBounds, type GeoJSONSource } from 'maplibre-gl'
import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import { Alert, Box, Card, CardActionArea, Chip, CircularProgress, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { AcUnit, WaterDrop } from '@mui/icons-material'
import { hours, pct, placeLines, showPopup, useData, useMap } from './shared'

// Colour and dash differ, so variants are told apart without colour alone
const variants = [
  { id: 'shortest', label: 'Najkrótsza', color: '#e4572e', dash: [1, 2], width: 5 },
  { id: 'compromise', label: 'Kompromis', color: '#f2a516', dash: [3, 2], width: 5 },
  { id: 'shaded', label: 'Zacieniona', color: '#0e5f74', dash: undefined, width: 6 },
]
const NEAR = 200 // m

const num = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const distance = (m: number) => (m >= 1000 ? `${num.format(m / 1000)} km` : `${m} m`)

// Shortest distance in metres from a point to a polyline
function toLine(p: number[], line: number[][]) {
  const k = 111320 * Math.cos((p[1] * Math.PI) / 180)
  const xy = ([x, y]: number[]) => [(x - p[0]) * k, (y - p[1]) * 110540]
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1])
    const [bx, by] = xy(line[i])
    const t = Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)))
    best = Math.min(best, Math.hypot(ax + t * (bx - ax), ay + t * (by - ay)))
  }
  return best
}

export default function Trasa() {
  const routes = useData<FeatureCollection<LineString>>('/data/routes.geojson')
  const places = useData('/data/places.geojson')
  const [container, map] = useMap()
  const [routeId, setRouteId] = useState(1)
  const [hour, setHour] = useState(14)
  const [focus, setFocus] = useState('')

  const names = useMemo(() => [...new Map((routes?.features ?? []).map((f) => [f.properties!.route_id, f.properties!.route_name])).entries()], [routes])
  const current = useMemo(
    () => variants.map((v) => routes?.features.find((f) => f.properties!.route_id === routeId && f.properties!.hour === hour && f.properties!.variant === v.id)).filter(Boolean) as Feature<LineString>[],
    [routes, routeId, hour],
  )
  const coolest = Math.min(...current.map((f) => f.properties!.sun_share))
  const near = useMemo(
    () => ((places?.features ?? []) as Feature<Point>[])
      .filter((f) => ['cool', 'water'].includes(f.properties!.type))
      .map((f) => ({ f, d: Math.min(...current.map((r) => toLine(f.geometry.coordinates, r.geometry.coordinates))) }))
      .filter(({ d }) => d <= NEAR)
      .sort((a, b) => a.d - b.d),
    [places, current],
  )

  // Draw the variants, start and end, and places near the route
  useEffect(() => {
    if (!map || !current.length) return
    const line = current[0].geometry.coordinates
    const ends = [line[0], line[line.length - 1]].map((c, i) => ({ type: 'Feature' as const, properties: { label: i ? 'Cel' : 'Start' }, geometry: { type: 'Point' as const, coordinates: c } }))
    const data = { routes: { type: 'FeatureCollection' as const, features: current }, ends: { type: 'FeatureCollection' as const, features: ends }, near: { type: 'FeatureCollection' as const, features: near.map(({ f }) => f) } }
    if (!map.getSource('routes')) {
      for (const [id, d] of Object.entries(data)) map.addSource(id, { type: 'geojson', data: d })
      map.addLayer({ id: 'route-casing', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 10 } })
      for (const v of variants) {
        map.addLayer({
          id: `route-${v.id}`, type: 'line', source: 'routes', filter: ['==', ['get', 'variant'], v.id],
          layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': v.color, 'line-width': v.width, ...(v.dash && { 'line-dasharray': v.dash }) },
        })
      }
      map.addLayer({
        id: 'near', type: 'circle', source: 'near',
        paint: { 'circle-radius': ['match', ['get', 'type'], 'cool', 7, 5], 'circle-color': ['match', ['get', 'type'], 'cool', '#4fb3e8', '#1565c0'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      })
      map.addLayer({ id: 'ends', type: 'circle', source: 'ends', paint: { 'circle-radius': 8, 'circle-color': '#1b2a30', 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } })
      map.addLayer({
        id: 'ends-label', type: 'symbol', source: 'ends',
        layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-offset': [0, 1.4], 'text-anchor': 'top' },
        paint: { 'text-color': '#1b2a30', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      })
      map.on('click', 'near', (e) => {
        const f = e.features![0]
        showPopup(map, (f.geometry as Point).coordinates as [number, number], placeLines(f.properties!))
      })
    } else {
      for (const [id, d] of Object.entries(data)) (map.getSource(id) as GeoJSONSource).setData(d)
    }
    const box = new LngLatBounds()
    for (const f of current) for (const c of f.geometry.coordinates) box.extend(c as [number, number])
    map.fitBounds(box, { padding: { top: 50, left: 50, right: 50, bottom: 90 }, duration: 600 })
  }, [map, current, near])

  // A tapped card puts its variant in front and fades the others
  useEffect(() => {
    if (!map?.getLayer('route-shaded')) return
    for (const v of variants) map.setPaintProperty(`route-${v.id}`, 'line-opacity', !focus || focus === v.id ? 1 : 0.25)
  }, [map, focus, current])

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Trasa w cieniu</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
        Wybierz jedną z 4 gotowych tras i godzinę. Porównaj trasę najkrótszą, kompromisową i zacienioną: ile dłużej idziesz i ile słońca unikasz.
      </Typography>

      {routes === undefined && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />}
      {routes === null && <Alert severity="warning" sx={{ mt: 3 }}>Brak danych</Alert>}

      <Box sx={{ display: routes ? 'grid' : 'none', gridTemplateColumns: { xs: '1fr', md: '400px 1fr' }, gap: 2, mt: 3, alignItems: 'start' }}>
        <Stack spacing={2}>
          <TextField select label="Trasa" value={routeId} onChange={(e) => setRouteId(Number(e.target.value))}>
            {names.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
          </TextField>
          <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && setHour(h)} aria-label="Godzina">
            {hours.map((h) => <ToggleButton key={h} value={h}>{h}:00</ToggleButton>)}
          </ToggleButtonGroup>

          {current.map((f) => {
            const v = variants.find((x) => x.id === f.properties!.variant)!
            const p = f.properties!
            return (
              <Card key={v.id} variant="outlined" sx={{ borderColor: focus === v.id ? v.color : 'divider', borderWidth: 2 }}>
                <CardActionArea onClick={() => setFocus(focus === v.id ? '' : v.id)} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <svg width="36" height="8" aria-hidden><line x1="4" y1="4" x2="32" y2="4" stroke={v.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={v.dash?.map((d) => d * 5).join(' ')} /></svg>
                    <Typography sx={{ fontWeight: 700, flex: 1 }}>{v.label}</Typography>
                    {p.sun_share === coolest && v.id !== 'shortest' && <Chip size="small" color="primary" icon={<AcUnit />} label="Najmniej słońca" />}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', mt: 1.5, typography: 'body2', '& b': { display: 'block', fontSize: 18, color: 'text.primary' }, color: 'text.secondary' }}>
                    <div><b>{distance(p.distance_m)}</b>dystans</div>
                    <div><b>{Math.round(p.time_min)} min</b>czas</div>
                    <div><b>{pct(p.sun_share)}</b>słońca</div>
                    <div><b>{p.extra_min > 0 ? `+${num.format(p.extra_min)} min` : '—'}</b>{p.extra_min > 0 ? 'dłużej' : 'bazowa'}</div>
                  </Box>
                </CardActionArea>
              </Card>
            )
          })}
          {routes && <Typography variant="caption" color="text.secondary">Udział słońca o {hour}:00, dokładność: {routes.accuracy}. Czas przy 4,5 km/h.</Typography>}

          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>W pobliżu trasy (do {NEAR} m)</Typography>
            {places === null && <Alert severity="warning" sx={{ mt: 1 }}>Brak danych o miejscach</Alert>}
            {places && near.length === 0 && <Typography color="text.secondary" sx={{ mt: 1 }}>Brak miejsc chłodu i wody pitnej przy tej trasie.</Typography>}
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {near.slice(0, 8).map(({ f, d }, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, typography: 'body2' }}>
                  {f.properties!.type === 'cool' ? <AcUnit sx={{ fontSize: 18, color: '#4fb3e8' }} /> : <WaterDrop sx={{ fontSize: 18, color: '#1565c0' }} />}
                  <Box sx={{ flex: 1 }}>{f.properties!.name}</Box>
                  <Box sx={{ color: 'text.secondary' }}>{Math.round(d)} m</Box>
                </Box>
              ))}
              {near.length > 8 && <Typography variant="body2" color="text.secondary">i jeszcze {near.length - 8} na mapie</Typography>}
            </Stack>
          </Card>
        </Stack>

        <Box
          ref={container}
          sx={{ order: { xs: -1, md: 0 }, gridRow: { xs: 'auto', md: '1' }, gridColumn: { md: 2 }, height: { xs: 340, md: 'calc(100dvh - 200px)' }, minHeight: 340, position: { md: 'sticky' }, top: 0, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }}
        />
      </Box>
    </Box>
  )
}
