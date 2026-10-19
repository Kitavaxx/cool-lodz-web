import { useEffect, useRef, useState } from 'react'
import { Map as MapLibre, type ExpressionSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { Alert, Box } from '@mui/material'

// Data files carry accuracy and computed_at next to the features (SPEC 5)
type Data = FeatureCollection & { accuracy: string; computed_at: string }

const bounds: [number, number, number, number] = [19.43, 51.74, 19.48, 51.78]

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
  const hour = 14

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

  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <Box ref={container} sx={{ height: '100%' }} />
      {edges === null && <Alert severity="warning" sx={{ position: 'absolute', top: 16, left: 16 }}>Brak danych</Alert>}
    </Box>
  )
}
