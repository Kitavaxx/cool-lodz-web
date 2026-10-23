import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
import type { Feature, Point } from 'geojson'
import { Alert, Box, Card, CardActionArea, Chip, CircularProgress, FormControlLabel, IconButton, Stack, Switch, Tooltip, Typography } from '@mui/material'
import { AccessTime, AcUnit, Map, Place, WaterDrop } from '@mui/icons-material'
import { isOpen, rangesOn, warsawNow } from './hours'
import { cityBounds, metres, placeIcon, placeLines, showPopup, useData, useMap } from './shared'
import { PageHeader, Ring } from './ui'

const dayNames = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']
const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
const span = (ranges: [number, number][]) => ranges.map(([a, b]) => `${clock(a)}–${clock(b)}`).join(', ')
const green = '#2e7d32'

export default function MiejscaChlodu() {
  const places = useData('/data/places.geojson')
  const [container, map] = useMap(cityBounds)
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
        let nearest = Infinity
        let waterAt: number[] | undefined
        for (const w of water) {
          const d = metres(at, w.geometry.coordinates)
          if (d < nearest) [nearest, waterAt] = [d, w.geometry.coordinates]
        }
        return { f, name: f.properties!.name as string, open: isOpen(f.properties!.hours, now.day, now.time), water: nearest, waterAt }
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
    // Straight line from the selected place to its nearest water point, under the points
    map.addSource('water-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({ id: 'water-line', type: 'line', source: 'water-line', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#1565c0', 'line-width': 2.5, 'line-dasharray': [2, 2] } })
    map.addLayer({ id: 'drinking-water', type: 'symbol', source: 'places', filter: ['==', ['get', 'type'], 'water'], layout: { 'icon-image': 'place-water', 'icon-size': 0.55, 'icon-allow-overlap': true } })
    map.addLayer({
      id: 'cool', type: 'symbol', source: 'places', filter: ['==', ['get', 'type'], 'cool'],
      layout: { 'icon-image': 'place-cool', 'icon-allow-overlap': true },
      paint: { 'icon-opacity': ['case', ['get', 'open'], 1, 0.45] },
    })
    map.on('click', 'cool', (e: MapMouseEvent & { features?: Feature[] }) => {
      const f = e.features![0]
      setSelected(f.properties!.name)
      showPopup(map, (f.geometry as Point).coordinates as [number, number], placeLines(f.properties!))
    })
    map.on('click', 'drinking-water', (e: MapMouseEvent & { features?: Feature[] }) => {
      const f = e.features![0]
      showPopup(map, (f.geometry as Point).coordinates as [number, number], placeLines(f.properties!))
    })
    for (const layer of ['cool', 'drinking-water']) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
    }
  }, [map, places, water, shown])

  useEffect(() => {
    const source = map?.getSource('water-line') as GeoJSONSource | undefined
    const place = list.find((p) => p.name === selected)
    const features = place?.waterAt ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [place.f.geometry.coordinates, place.waterAt] } }] : []
    source?.setData({ type: 'FeatureCollection', features })
  }, [map, selected, list])

  useEffect(() => {
    if (!map?.getLayer('cool')) return
    map.setLayoutProperty('cool', 'icon-size', ['case', ['==', ['get', 'name'], selected], 1.2, 0.85])
    map.setLayoutProperty('cool', 'symbol-sort-key', ['case', ['==', ['get', 'name'], selected], 1, 0])
  }, [map, selected, shown])

  function pick(name: string, at: number[]) {
    setSelected(name)
    map?.flyTo({ center: at as [number, number], zoom: 16 })
  }

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <PageHeader icon={<AcUnit />} title="Miejsca chłodu" sub="Biblioteki, muzea i domy kultury, gdzie odpoczniesz od upału." color="#1e88c9" />

      {/* Open right now as a ring, next to the clock and the filter */}
      <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1.5, sm: 3 }, mt: 3, p: 2, borderRadius: '24px' }}>
        <Ring share={list.length ? openCount / list.length : 0} color={green} size={72}>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{openCount}</Typography>
        </Ring>
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{places ? `${openCount} z ${list.length} otwarte teraz` : '…'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16 }} />Łódź, {dayNames[now.day]} {clock(now.time)}
          </Typography>
        </Box>
        <FormControlLabel control={<Switch checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} color="success" />} label="Tylko otwarte" />
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1fr 1fr' }, gap: 2, mt: 2, alignItems: 'start' }}>
        <Box
          ref={container}
          sx={{ order: { md: 2 }, height: { xs: 'clamp(320px, 55dvh, 560px)', md: 'calc(100dvh - 260px)' }, minHeight: 320, position: { md: 'sticky' }, top: 0, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }}
        />
        <Stack spacing={1.5}>
          {places === undefined && <CircularProgress sx={{ mx: 'auto', my: 4 }} />}
          {places === null && <Alert severity="warning">Brak danych</Alert>}
          {places && shown.length === 0 && <Alert severity="info">Żadne miejsce chłodu nie jest teraz otwarte.</Alert>}
          {shown.map(({ f, name, open, water }) => {
            const p = f.properties!
            const today = rangesOn(p.hours, now.day)
            const on = selected === name
            return (
              <Card key={name} variant="outlined" sx={{ borderColor: on ? 'primary.main' : 'divider', borderWidth: 2, borderRadius: '20px', boxShadow: on ? '0 8px 24px rgb(14 95 116 / 0.18)' : 'none', transition: 'all .2s' }}>
                <CardActionArea onClick={() => pick(name, f.geometry.coordinates)} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <img src={placeIcon('cool')} alt="" width={40} height={40} style={{ flexShrink: 0, filter: open ? 'none' : 'grayscale(1)', opacity: open ? 1 : 0.5 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{name}</Typography>
                      {p.address && <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Place sx={{ fontSize: 16 }} />{p.address}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, typography: 'body2', fontWeight: 700, color: open ? green : 'text.secondary' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: open ? green : 'text.disabled', boxShadow: open ? `0 0 0 4px ${green}33` : 'none' }} />
                      {open ? 'Otwarte' : 'Zamknięte'}
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime sx={{ fontSize: 16 }} />{p.hours ? <>Dziś: <b>{today.length ? span(today) : 'zamknięte'}</b></> : 'Brak godzin otwarcia'}
                  </Typography>
                </CardActionArea>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pb: 1.5 }}>
                  {Number.isFinite(water) && (
                    <Tooltip title="Najbliższa woda pitna, w linii prostej">
                      <Chip size="small" icon={<WaterDrop />} label={`${Math.round(water)} m`} sx={{ bgcolor: '#e8eaf6', color: '#3949ab', fontWeight: 700, '& .MuiChip-icon': { color: '#3949ab' } }} />
                    </Tooltip>
                  )}
                  <Typography variant="caption" color="text.secondary">{p.verified ? 'zweryfikowane' : 'niezweryfikowane'}</Typography>
                  <Tooltip title="Pokaż na mapie">
                    <IconButton component={Link} to={`/mapa?place=${encodeURIComponent(name)}`} size="small" sx={{ ml: 'auto', color: 'primary.main' }} aria-label="Pokaż na mapie"><Map /></IconButton>
                  </Tooltip>
                </Box>
              </Card>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
