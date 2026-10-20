import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { LngLatBounds } from 'maplibre-gl'
import type { Feature, LineString, Point } from 'geojson'
import { Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { AdminPanelSettings, Check, ContentCopy } from '@mui/icons-material'
import { auth } from './firebase'
import { polishDays } from './hours'
import { metres, pct, steps, useData, useMap } from './shared'

const REACH = 400 // m, walking distance to a cool place we treat as reachable (source spec 7.2)
const [covered, uncovered] = ['#4fb3e8', '#e4572e']

type Candidates = {
  weights: { no_shade_200m: number; dist_to_cool_m: number; summer_hours: number }
  far_m: number
  items: { name: string; address: string | null; score: number; no_shade_200m: number; dist_to_cool_m: number; summer_hours: string | null }[]
}
type Gaps = { items: { id: number; name: string; length_m: number; s14: number; geometry: LineString }[] }

// The login is a demo of the access flow, so the test account is shown on the login card (SPEC 7).
// It lives in the Firebase project shared with the mobile app: keep it a throwaway password, never reused.
const demo = { email: 'public.test@gmail.com', password: 'test1111' }

const errors: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło',
  'auth/invalid-email': 'Nieprawidłowy adres e-mail',
  'auth/too-many-requests': 'Zbyt wiele prób, spróbuj później',
}

// A value with a copy button; a tick shows for a moment after copying
function Copyable({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the value is still selectable with one tap
    }
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>{label}: <b style={{ userSelect: 'all' }}>{value}</b></Typography>
      <IconButton size="small" onClick={copy} aria-label={`Kopiuj: ${label}`}>
        {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
      </IconButton>
    </Box>
  )
}

export default function Panel() {
  // undefined = Firebase hasn't restored the session yet
  const [user, setUser] = useState<User | null>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState(0)

  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), [])

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth!, String(form.get('email')), String(form.get('password')))
    } catch (err) {
      setError(errors[(err as { code?: string }).code ?? ''] ?? 'Coś poszło nie tak, spróbuj ponownie')
    }
    setBusy(false)
  }

  if (!auth) return <Alert severity="warning" sx={{ maxWidth: 420, mx: 'auto', mt: { md: 6 } }}>Logowanie do panelu jest chwilowo niedostępne.</Alert>
  if (user === undefined) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />

  if (!user) {
    return (
      <Paper component="form" onSubmit={login} variant="outlined" sx={{ maxWidth: 420, mx: 'auto', mt: { md: 6 }, p: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <AdminPanelSettings fontSize="large" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Panel miasta</Typography>
          </Box>
          <Chip label="Wersja demonstracyjna" size="small" sx={{ alignSelf: 'flex-start' }} />
          <Typography color="text.secondary">
            Luki cienia, dostępność miejsc chłodu i kandydaci na nowe miejsca chłodu dla urzędników.
          </Typography>
          <TextField name="email" type="email" label="E-mail" autoComplete="username" required />
          <TextField name="password" type="password" label="Hasło" autoComplete="current-password" required />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" loading={busy}>Zaloguj</Button>
          <Alert severity="info" icon={false}>
            <Typography variant="subtitle2">Konto demo dla testujących</Typography>
            <Copyable label="E-mail" value={demo.email} />
            <Copyable label="Hasło" value={demo.password} />
          </Alert>
        </Stack>
      </Paper>
    )
  }

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, flex: 1 }}>Panel miasta</Typography>
        <Chip icon={<AdminPanelSettings />} label={user.email} variant="outlined" />
        <Button variant="outlined" size="small" onClick={() => signOut(auth!)}>Wyloguj</Button>
      </Box>
      <Tabs value={tab} onChange={(_, t) => setTab(t)} variant="scrollable" allowScrollButtonsMobile sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
        {views.map(({ label }) => <Tab key={label} label={label} />)}
      </Tabs>
      <Box sx={{ mt: 3 }}>{views[tab].view}</Box>
    </Box>
  )
}

const views = [
  { label: 'Luki cienia', view: <ShadeGaps /> },
  { label: 'Dostępność miejsc chłodu', view: <Reach /> },
  { label: 'Kandydaci na miejsca chłodu', view: <Candidates /> },
]

// Segments with the most sun at 14:00 (source spec 7.2), on a map and in a table
function ShadeGaps() {
  const gaps = useData<Gaps>('/data/panel_gaps.json')
  const [container, map] = useMap()
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!map || !gaps) return
    const features = gaps.items.map(({ geometry, ...p }) => ({ type: 'Feature' as const, properties: p, geometry }))
    map.addSource('gaps', { type: 'geojson', data: { type: 'FeatureCollection', features } })
    map.addLayer({ id: 'gaps-casing', type: 'line', source: 'gaps', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': 10 } })
    map.addLayer({ id: 'gaps', type: 'line', source: 'gaps', layout: { 'line-cap': 'round' }, paint: { 'line-color': steps[2].color, 'line-width': 6 } })
    map.addLayer({
      id: 'gaps-label', type: 'symbol', source: 'gaps',
      layout: { 'text-field': ['to-string', ['get', 'id']], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'symbol-placement': 'line-center' },
      paint: { 'text-color': '#1b2a30', 'text-halo-color': '#fff', 'text-halo-width': 2 },
    })
    map.on('click', 'gaps', (e) => setSelected(e.features![0].properties!.id))
  }, [map, gaps])

  useEffect(() => {
    if (!map?.getLayer('gaps') || !gaps) return
    map.setPaintProperty('gaps', 'line-color', ['case', ['==', ['get', 'id'], selected], '#0e5f74', steps[2].color])
    const gap = gaps.items.find((g) => g.id === selected)
    if (!gap) return
    const box = new LngLatBounds()
    for (const c of gap.geometry.coordinates) box.extend(c as [number, number])
    map.fitBounds(box, { padding: 80, maxZoom: 17, duration: 600 })
  }, [map, gaps, selected])

  if (gaps === null) return <Alert severity="warning">Brak danych</Alert>
  return (
    <>
      <Typography color="text.secondary" sx={{ maxWidth: 800 }}>
        20 odcinków ulic o długości co najmniej 80 m z największym udziałem słońca o 14:00 (najwyżej jeden na ulicę). Kliknij wiersz, aby pokazać odcinek na mapie. To miejsca, gdzie drzewa, zadaszenia lub kurtyny wodne dadzą najwięcej.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2, alignItems: 'start' }}>
        <Box ref={container} sx={{ height: { xs: 320, md: 560 }, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider', position: { md: 'sticky' }, top: 0 }} />
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>#</TableCell><TableCell>Ulica</TableCell><TableCell align="right">Długość</TableCell><TableCell align="right">Słońce o 14:00</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {gaps?.items.map((g) => (
                <TableRow key={g.id} hover selected={g.id === selected} onClick={() => setSelected(g.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>{g.id}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell align="right">{g.length_m} m</TableCell>
                  <TableCell align="right">{pct(g.s14)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {gaps && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Dokładność: {gaps.accuracy}, obliczono {gaps.computed_at}. Dane: OpenStreetMap.</Typography>}
    </>
  )
}

// Polygon ring approximating a circle of r metres around [lon, lat]
function circle([x, y]: number[], r: number) {
  const k = 111320 * Math.cos((y * Math.PI) / 180)
  return Array.from({ length: 65 }, (_, i) => [x + (r * Math.cos((i / 32) * Math.PI)) / k, y + (r * Math.sin((i / 32) * Math.PI)) / 110540])
}

// 400 m circles around cool places; walking segments outside every circle are the "biała plama"
function Reach() {
  const places = useData('/data/places.geojson')
  const edges = useData<{ features: Feature<LineString>[] }>('/data/edges.geojson')
  const [container, map] = useMap()

  const cool = useMemo(() => (places?.features ?? []).filter((f) => f.properties?.type === 'cool') as Feature<Point>[], [places])
  const [network, share] = useMemo(() => {
    if (!edges || !cool.length) return [[], 0]
    let total = 0, outside = 0
    const marked = edges.features.map((f) => {
      const c = f.geometry.coordinates
      const mid = c[Math.floor(c.length / 2)]
      const len = c.slice(1).reduce((sum, p, i) => sum + metres(c[i], p), 0)
      const inside = cool.some((p) => metres(mid, p.geometry.coordinates) <= REACH)
      total += len
      if (!inside) outside += len
      return { ...f, properties: { inside } }
    })
    return [marked, outside / total]
  }, [edges, cool])

  useEffect(() => {
    if (!map || !network.length) return
    const rings = cool.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [circle(p.geometry.coordinates, REACH)] } }))
    map.addSource('network', { type: 'geojson', data: { type: 'FeatureCollection', features: network } })
    map.addSource('reach', { type: 'geojson', data: { type: 'FeatureCollection', features: rings } })
    map.addSource('cool', { type: 'geojson', data: { type: 'FeatureCollection', features: cool } })
    map.addLayer({ id: 'reach-fill', type: 'fill', source: 'reach', paint: { 'fill-color': covered, 'fill-opacity': 0.08 } })
    map.addLayer({
      id: 'network', type: 'line', source: 'network',
      paint: { 'line-color': ['case', ['get', 'inside'], covered, uncovered], 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 16, 3] },
    })
    map.addLayer({ id: 'reach-line', type: 'line', source: 'reach', paint: { 'line-color': '#0e5f74', 'line-width': 1.5, 'line-dasharray': [2, 2] } })
    map.addLayer({ id: 'cool', type: 'circle', source: 'cool', paint: { 'circle-radius': 6, 'circle-color': '#0e5f74', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
  }, [map, network, cool])

  if (places === null || edges === null) return <Alert severity="warning">Brak danych</Alert>
  return (
    <>
      <Typography color="text.secondary" sx={{ maxWidth: 800 }}>
        Koła o promieniu {REACH} m (ok. 5 minut pieszo) wokół {cool.length || '…'} miejsc chłodu. Chodniki poza wszystkimi kołami to „białe plamy”: stamtąd do najbliższego miejsca chłodu jest dalej niż {REACH} m.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 2, mt: 2, alignItems: 'start' }}>
        <Box ref={container} sx={{ height: { xs: 360, md: 600 }, borderRadius: '16px', overflow: 'hidden', border: 1, borderColor: 'divider' }} />
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          {!network.length ? <CircularProgress /> : (
            <>
              <Typography sx={{ fontSize: 44, fontWeight: 700, color: uncovered, lineHeight: 1.1 }}>{pct(share)}</Typography>
              <Typography>długości chodników leży w białych plamach, dalej niż {REACH} m od miejsca chłodu.</Typography>
            </>
          )}
          <Stack spacing={1} sx={{ mt: 3, typography: 'body2' }}>
            {[[covered, `do ${REACH} m od miejsca chłodu`], [uncovered, 'biała plama: dalej niż ' + REACH + ' m']].map(([color, label]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 24, height: 4, borderRadius: 1, bgcolor: color }} />{label}</Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0e5f74', mx: '6px' }} />miejsce chłodu</Box>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Odległość w linii prostej od środka odcinka. Miejsca chłodu z OpenStreetMap ze znanymi godzinami otwarcia.
          </Typography>
        </Paper>
      </Box>
    </>
  )
}

// Public buildings ranked as possible new cool places, with the weights shown (source spec 7.2)
function Candidates() {
  const data = useData<Candidates>('/data/panel_candidates.json')
  if (data === null) return <Alert severity="warning">Brak danych</Alert>
  if (!data) return <CircularProgress />
  const w = data.weights
  const criteria = [
    [w.no_shade_200m, 'Brak cienia w promieniu 200 m', 'udział słońca na chodnikach o 14:00'],
    [w.dist_to_cool_m, 'Odległość do najbliższego miejsca chłodu', `maksimum od ${data.far_m} m`],
    [w.summer_hours, 'Znane godziny otwarcia', 'czy wiadomo, kiedy budynek jest otwarty'],
  ] as const
  return (
    <>
      <Alert severity="info" sx={{ maxWidth: 900 }}>
        <b>Rekomendacja, nie decyzja.</b> Ranking pokazuje budynki publiczne, które warto sprawdzić jako nowe miejsca chłodu. Wynik nie uwzględnia m.in. dostępności dla osób z niepełnosprawnościami, klimatyzacji ani zgody zarządcy.
      </Alert>
      <Typography sx={{ fontWeight: 700, mt: 3 }}>Wagi kryteriów (wynik 0–100)</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mt: 1 }}>
        {criteria.map(([weight, label, note]) => (
          <Paper key={label} variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'primary.main', minWidth: 64 }}>{pct(weight)}</Typography>
            <Box><Typography sx={{ fontWeight: 500 }}>{label}</Typography><Typography variant="body2" color="text.secondary">{note}</Typography></Box>
          </Paper>
        ))}
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell><TableCell>Budynek</TableCell><TableCell sx={{ width: 160 }}>Wynik</TableCell>
              <TableCell align="right">Słońce w 200 m</TableCell><TableCell align="right">Do miejsca chłodu</TableCell><TableCell>Godziny otwarcia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((c, i) => (
              <TableRow key={c.name} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell><b>{c.name}</b>{c.address && <Typography variant="body2" color="text.secondary">{c.address}</Typography>}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <b>{c.score}</b><LinearProgress variant="determinate" value={c.score} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                  </Box>
                </TableCell>
                <TableCell align="right">{pct(c.no_shade_200m)}</TableCell>
                <TableCell align="right">{c.dist_to_cool_m} m</TableCell>
                <TableCell>{c.summer_hours ? polishDays(c.summer_hours) : <Typography variant="body2" color="text.secondary">nieznane</Typography>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Budynki z OpenStreetMap: muzea, biblioteki i domy kultury bez znanych godzin, urzędy. Dokładność: {data.accuracy}, obliczono {data.computed_at}.
      </Typography>
    </>
  )
}
