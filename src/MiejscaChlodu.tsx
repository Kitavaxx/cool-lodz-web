import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import { Alert, Box, Button, Card, CardActionArea, Checkbox, Chip, CircularProgress, FormControlLabel, Stack, Typography } from '@mui/material'
import { AccessTime, Map, Place, WaterDrop } from '@mui/icons-material'
import { isOpen, polishDays, warsawNow } from './hours'
import { metres, placeLines, showPopup, useData, useMap } from './shared'

const dayNames = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

export default function MiejscaChlodu() {
  const places = useData('/data/places.geojson')
  const [container, map] = useMap()
  const [now, setNow] = useState(warsawNow)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(warsawNow()), 60_000)
    return () => clearInterval(t)
  }, [])

  const water = useMemo(() => (places?.features ?? []).filter((f) => f.properties?.type === 'water') as Feature<Point>[], [places])
  const list = useMemo(() => {
    const cool = (places?.features ?? []).filter((f) => f.properties?.type === 'cool') as Feature<Point>[]
    return cool
      .map((f) => {
        const at = f.geometry.coordinates
        const nearest = Math.min(...water.map((w) => metres(at, w.geometry.coordinates)))
        return { f, name: f.properties!.name as string, open: isOpen(f.properties!.hours, now.day, now.time), water: nearest }
      })
      .sort((a, b) => Number(b.open) - Number(a.open) || a.name.localeCompare(b.name, 'pl'))
  }, [places, water, now])
  const shown = onlyOpen ? list.filter((p) => p.open) : list
  const openCount = list.filter((p) => p.open).length

  // Cool places (coloured by open now) and drinking water on the mini map
  useEffect(() => {
    if (!map || !places) return
    const data = {
      type: 'FeatureCollection' as const,
      features: [...water, ...shown.map(({ f, open }) => ({ ...f, properties: { ...f.properties, open } }))],
    }
    const source = map.getSource('places') as GeoJSONSource | undefined
    if (source) return void source.setData(data)
    map.addSource('places', { type: 'geojson', data })
    map.addLayer({ id: 'drinking-water', type: 'circle', source: 'places', filter: ['==', ['get', 'type'], 'water'], paint: { 'circle-radius': 4, 'circle-color': '#1565c0', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } })
    map.addLayer({
      id: 'cool', type: 'circle', source: 'places', filter: ['==', ['get', 'type'], 'cool'],
      paint: { 'circle-radius': 8, 'circle-color': ['case', ['get', 'open'], '#4fb3e8', '#9aa9b0'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
    })
    map.on('click', 'cool', (e: MapMouseEvent & { features?: Feature[] }) => {
      const f = e.features![0]
      setSelected(f.properties!.name)
      showPopup(map, (f.geometry as Point).coordinates as [number, number], placeLines(f.properties!))
    })
    map.on('mouseenter', 'cool', () => (map.getCanvas().style.cursor = 'pointer'))
    map.on('mouseleave', 'cool', () => (map.getCanvas().style.cursor = ''))
  }, [map, places, water, shown])

  useEffect(() => {
    if (!map?.getLayer('cool')) return
    map.setPaintProperty('cool', 'circle-stroke-color', ['case', ['==', ['get', 'name'], selected], '#0e5f74', '#fff'])
    map.setPaintProperty('cool', 'circle-radius', ['case', ['==', ['get', 'name'], selected], 11, 8])
  }, [map, selected, shown])

  function pick(name: string, at: number[]) {
    setSelected(name)
    map?.flyTo({ center: at as [number, number], zoom: 16 })
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Miejsca chłodu</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
        Biblioteki, muzea, galerie i domy kultury w Śródmieściu, w których można odpocząć od upału. Godziny otwarcia pochodzą z OpenStreetMap, sprawdź je przed wyjściem.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 0.5, sm: 2 }, mt: 2 }}>
        <FormControlLabel control={<Checkbox checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />} label="Otwarte teraz" />
        <Chip icon={<AccessTime />} label={`Teraz w Łodzi: ${dayNames[now.day]} ${clock(now.time)}`} variant="outlined" />
        {places && <Typography color="text.secondary">Otwarte: {openCount} z {list.length}</Typography>}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2, alignItems: 'start' }}>
        <Box
          ref={container}
          sx={{ order: { md: 2 }, height: { xs: 280, md: 'calc(100dvh - 260px)' }, minHeight: 280, position: { md: 'sticky' }, top: 0, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }}
        />
        <Stack spacing={1.5}>
          {places === undefined && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}
          {places === null && <Alert severity="warning">Brak danych</Alert>}
          {places && shown.length === 0 && <Alert severity="info">Żadne miejsce chłodu nie jest teraz otwarte.</Alert>}
          {shown.map(({ f, name, open, water }) => {
            const p = f.properties!
            return (
              <Card key={name} variant="outlined" sx={{ borderColor: selected === name ? 'primary.main' : 'divider', borderWidth: selected === name ? 2 : 1 }}>
                <CardActionArea onClick={() => pick(name, f.geometry.coordinates)} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
                    <Chip size="small" label={open ? 'Otwarte teraz' : 'Zamknięte'} color={open ? 'success' : 'default'} sx={{ flexShrink: 0 }} />
                  </Box>
                  <Stack spacing={0.5} sx={{ mt: 1, typography: 'body2', color: 'text.secondary', '& > div': { display: 'flex', gap: 1, alignItems: 'center' }, '& svg': { fontSize: 18 } }}>
                    {p.address && <div><Place />{p.address}</div>}
                    <div><AccessTime />{p.hours ? polishDays(p.hours) : 'Brak godzin otwarcia'}</div>
                    {Number.isFinite(water) && <div><WaterDrop sx={{ color: '#1565c0' }} />Woda pitna: {Math.round(water)} m</div>}
                  </Stack>
                </CardActionArea>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 1.5 }}>
                  <Chip size="small" variant="outlined" label={p.verified ? 'Zweryfikowane' : 'Niezweryfikowane'} />
                  <Button component={Link} to={`/mapa?place=${encodeURIComponent(name)}`} size="small" startIcon={<Map />}>Pokaż na mapie</Button>
                </Box>
              </Card>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
