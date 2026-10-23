import { useEffect, useState } from 'react'
import { LngLatBounds, type GeoJSONSource } from 'maplibre-gl'
import type { LineString } from 'geojson'
import { Alert, Box, Button, Card, CardActionArea, CircularProgress, Collapse, Stack, Typography } from '@mui/material'
import { DirectionsWalk, ExpandMore, Museum, Schedule, Straighten, WbSunny } from '@mui/icons-material'
import { PageHeader } from './ui'
import { pct, useData, useMap } from './shared'

type Tours = {
  items: {
    id: number; name: string; description: string; hour: number; stops: { name: string; coordinates: number[] }[]
    distance_m: number; time_min: number; sun_share: number; sun_share_shortest: number; geometry: LineString
  }[]
}

const km = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const colors = ['#0e5f74', '#7b4fb3', '#2e7d32'] // one per tour, on the card and the map
const colorOf = (id: number) => colors[(id - 1) % colors.length]

export default function TrasyTurystyczne() {
  const tours = useData<Tours>('/data/tours.json')
  const [container, map] = useMap()
  const [selected, setSelected] = useState(1)
  const [about, setAbout] = useState(false)

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
      map.addLayer({ id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-radius': 11, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
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
    map.setPaintProperty('tours', 'line-color', ['case', ['==', ['get', 'id'], selected], colorOf(selected), '#9aa9b0'])
    map.setPaintProperty('stops', 'circle-color', colorOf(selected))
    map.setPaintProperty('tours', 'line-opacity', ['case', ['==', ['get', 'id'], selected], 1, 0.5])
    map.setLayoutProperty('tours', 'line-sort-key', ['case', ['==', ['get', 'id'], selected], 1, 0])
    const box = new LngLatBounds()
    for (const c of tour.geometry.coordinates) box.extend(c as [number, number])
    map.fitBounds(box, { padding: { top: 50, left: 50, right: 50, bottom: 90 }, duration: 600 })
  }, [map, tours, selected])

  function show(id: number) {
    if (id !== selected) setAbout(false)
    setSelected(id)
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }) // the map is above the list on phones
  }

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <PageHeader icon={<Museum />} title="Trasy turystyczne w cieniu" sub="Zabytki Śródmieścia, jak najdłużej w cieniu budynków." color="#7b4fb3" />
      {tours === undefined && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />}
      {tours === null && <Alert severity="warning" sx={{ mt: 3 }}>Brak danych</Alert>}

      <Box sx={{ display: tours ? 'grid' : 'none', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '440px minmax(0, 1fr)' }, gap: 2, mt: 3, alignItems: 'start' }}>
        <Box
          ref={container}
          sx={{ order: { md: 2 }, height: { xs: 'clamp(340px, 58dvh, 600px)', md: 'calc(100dvh - 200px)' }, minHeight: 340, position: { md: 'sticky' }, top: 0, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }}
        />
        <Stack spacing={2}>
          {tours?.items.map((t) => {
            const on = t.id === selected
            const c = colorOf(t.id)
            return (
              <Card key={t.id} variant="outlined" sx={{ borderColor: on ? c : 'divider', borderWidth: 2, boxShadow: on ? `0 8px 24px ${c}2e` : 'none', transition: 'all .2s' }}>
                <CardActionArea onClick={() => show(t.id)} aria-pressed={on} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: c, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><DirectionsWalk /></Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{t.name}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, mt: 0.5, typography: 'body2', color: 'text.secondary', '& > span': { display: 'inline-flex', alignItems: 'center', gap: 0.5 }, '& svg': { fontSize: 18 } }}>
                        <span><Straighten />{km.format(t.distance_m / 1000)} km</span>
                        <span><Schedule />{Math.round(t.time_min)} min</span>
                        <span title={`Słońce o ${t.hour}:00; najkrótszą drogą ${pct(t.sun_share_shortest)}`}>
                          <WbSunny sx={{ color: '#f4b942' }} /><Box component="b" sx={{ color: 'text.primary' }}>{pct(t.sun_share)}</Box><s>{pct(t.sun_share_shortest)}</s>
                        </span>
                      </Box>
                    </Box>
                  </Box>
                  {on ? (
                    <>
                      {/* Stops as a line with numbered dots, the same numbers as on the map */}
                      <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2 }}>
                        {t.stops.map((s, i) => (
                          <Box
                            component="li"
                            key={s.name}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', '&:not(:last-child)': { pb: 1.75 }, '&:not(:last-child)::before': { content: '""', position: 'absolute', left: 11, top: 24, bottom: 0, width: 3, bgcolor: c, opacity: 0.35 } }}
                          >
                            <Box sx={{ width: 25, height: 25, borderRadius: '50%', bgcolor: c, color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</Box>
                            <Typography sx={{ fontWeight: i === 0 || i === t.stops.length - 1 ? 700 : 400 }}>{s.name}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 1.5 }}>
                      {t.stops[0].name} → {t.stops.at(-1)!.name} · {t.stops.length} przystanki
                    </Typography>
                  )}
                </CardActionArea>
                {/* The description stays folded until asked for */}
                {on && (
                  <Box sx={{ px: 2, pb: 1.5 }}>
                    <Button size="small" onClick={() => setAbout(!about)} endIcon={<ExpandMore sx={{ transform: about ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />} aria-expanded={about} sx={{ color: c }}>
                      O trasie
                    </Button>
                    <Collapse in={about}>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t.description}</Typography>
                    </Collapse>
                  </Box>
                )}
              </Card>
            )
          })}
          {tours && (
            <Typography variant="caption" color="text.secondary">
              Słońce o {tours.items[0].hour}:00 na trasie, przekreślone: najkrótszą drogą. Dokładność: {tours.accuracy}.
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
