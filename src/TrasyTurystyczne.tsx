import { useEffect, useState } from 'react'
import { LngLatBounds, type GeoJSONSource } from 'maplibre-gl'
import type { LineString } from 'geojson'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { Map } from '@mui/icons-material'
import { pct, useData, useMap } from './shared'

type Tours = {
  items: {
    id: number; name: string; description: string; hour: number; stops: { name: string; coordinates: number[] }[]
    distance_m: number; time_min: number; sun_share: number; sun_share_shortest: number; geometry: LineString
  }[]
}

const km = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })

export default function TrasyTurystyczne() {
  const tours = useData<Tours>('/data/tours.json')
  const [container, map] = useMap()
  const [selected, setSelected] = useState(1)

  useEffect(() => {
    if (!map || !tours) return
    const tour = tours.items.find((t) => t.id === selected)!
    const lines = { type: 'FeatureCollection' as const, features: tours.items.map(({ id, geometry }) => ({ type: 'Feature' as const, properties: { id }, geometry })) }
    const stops = {
      type: 'FeatureCollection' as const,
      features: tour.stops.map((s, i) => ({ type: 'Feature' as const, properties: { n: String(i + 1), name: s.name }, geometry: { type: 'Point' as const, coordinates: s.coordinates } })),
    }
    if (!map.getSource('tours')) {
      map.addSource('tours', { type: 'geojson', data: lines })
      map.addSource('stops', { type: 'geojson', data: stops })
      map.addLayer({ id: 'tours-casing', type: 'line', source: 'tours', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 9 } })
      map.addLayer({ id: 'tours', type: 'line', source: 'tours', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 5 } })
      map.addLayer({ id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-radius': 11, 'circle-color': '#0e5f74', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
      map.addLayer({
        id: 'stops-label', type: 'symbol', source: 'stops',
        layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
        paint: { 'text-color': '#fff' },
      })
      map.addLayer({
        id: 'stops-name', type: 'symbol', source: 'stops',
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-max-width': 10 },
        paint: { 'text-color': '#1b2a30', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      })
    } else {
      (map.getSource('stops') as GeoJSONSource).setData(stops)
    }
    // Selected tour in front, the others faint
    map.setPaintProperty('tours', 'line-color', ['case', ['==', ['get', 'id'], selected], '#0e5f74', '#9aa9b0'])
    map.setPaintProperty('tours', 'line-opacity', ['case', ['==', ['get', 'id'], selected], 1, 0.5])
    map.setLayoutProperty('tours', 'line-sort-key', ['case', ['==', ['get', 'id'], selected], 1, 0])
    const box = new LngLatBounds()
    for (const c of tour.geometry.coordinates) box.extend(c as [number, number])
    map.fitBounds(box, { padding: { top: 50, left: 50, right: 50, bottom: 90 }, duration: 600 })
  }, [map, tours, selected])

  function show(id: number) {
    setSelected(id)
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }) // the map is above the list on phones
  }

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Trasy turystyczne w cieniu</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
        Spacery po najciekawszych miejscach Śródmieścia, wyznaczone tak, by iść jak najdłużej w cieniu budynków o najgorętszej porze dnia.
      </Typography>
      {tours === undefined && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />}
      {tours === null && <Alert severity="warning" sx={{ mt: 3 }}>Brak danych</Alert>}

      <Box sx={{ display: tours ? 'grid' : 'none', gridTemplateColumns: { xs: '1fr', md: '440px 1fr' }, gap: 2, mt: 3, alignItems: 'start' }}>
        <Box
          ref={container}
          sx={{ order: { md: 2 }, height: { xs: 340, md: 'calc(100dvh - 200px)' }, minHeight: 340, position: { md: 'sticky' }, top: 0, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }}
        />
        <Stack spacing={2}>
          {tours?.items.map((t) => (
            <Card key={t.id} variant="outlined" sx={{ borderColor: t.id === selected ? 'primary.main' : 'divider', borderWidth: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{t.name}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>{t.description}</Typography>
                <Box component="ol" sx={{ pl: 2.5, my: 1.5, '& li::marker': { color: 'primary.main', fontWeight: 700 } }}>
                  {t.stops.map((s) => <li key={s.name}>{s.name}</li>)}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', typography: 'body2', color: 'text.secondary', '& b': { display: 'block', fontSize: 18, color: 'text.primary' } }}>
                  <div><b>{km.format(t.distance_m / 1000)} km</b>długość</div>
                  <div><b>{Math.round(t.time_min)} min</b>spacer</div>
                  <div><b>{pct(t.sun_share)}</b>słońca o {t.hour}:00</div>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Najkrótszą drogą byłoby {pct(t.sun_share_shortest)} słońca. Dokładność: {tours.accuracy}.
                </Typography>
                <Button variant={t.id === selected ? 'contained' : 'outlined'} startIcon={<Map />} onClick={() => show(t.id)} sx={{ mt: 2 }}>Pokaż na mapie</Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
