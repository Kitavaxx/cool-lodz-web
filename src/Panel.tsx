import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { LngLatBounds } from 'maplibre-gl'
import type { Feature, LineString, Point } from 'geojson'
import { Alert, Box, Button, Card, CardActionArea, Chip, CircularProgress, IconButton, LinearProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { AcUnit, AddLocationAlt, AdminPanelSettings, Check, ContentCopy, WbSunny } from '@mui/icons-material'
import { auth } from './firebase'
import { polishDays } from './hours'
import { cityBounds, pct, steps, useData, useMap } from './shared'
import { CountUp, GrowBar, PageHeader, Ring } from './ui'

const REACH = 400 // m, walking distance to a cool place we treat as reachable (source spec 7.2)
const [covered, uncovered] = ['#4fb3e8', '#e4572e']
const amber = '#f4b942'

type Candidates = {
  weights: { no_shade_200m: number; dist_to_cool_m: number; summer_hours: number }
  far_m: number
  items: { name: string; address: string | null; score: number; no_shade_200m: number; dist_to_cool_m: number; summer_hours: string | null }[]
}
type Gaps = { items: { id: number; name: string; length_m: number; s14: number; geometry: LineString }[] }
type ReachData = { items: { reach_m: number; uncovered: number; cool_places: number }[] }

// The look shared by the cards of the panel: the same soft corners and shadow as the rest of the site
const card = { borderRadius: '24px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 8px 28px rgb(14 95 116 / 0.07)' } as const
const tableHead = { '& th': { fontWeight: 700, color: 'text.secondary', bgcolor: '#f4f7f8', borderBottom: 1, borderColor: 'divider' } } as const
const lead = { color: 'text.secondary', maxWidth: 820, fontSize: { md: 17 } } as const

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

// Round tile with an icon, in a colour
function IconTile({ icon, color, size = 52 }: { icon: ReactNode; color: string; size?: number }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: '16px', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: `${color}1a`, color, '& svg': { fontSize: size * 0.54 } }}>{icon}</Box>
  )
}

const views = [
  { label: 'Luki cienia', icon: <WbSunny />, view: <ShadeGaps /> },
  { label: 'Dostępność miejsc chłodu', icon: <AcUnit />, view: <Reach /> },
  { label: 'Kandydaci na miejsca chłodu', icon: <AddLocationAlt />, view: <Candidates /> },
]

// The left side of the login screen: what the panel is for, and one live number from it
function LoginHero() {
  const reach = useData<ReachData>('/data/reach.json')
  const share = reach?.items[0]?.uncovered
  return (
    <Box
      sx={{
        position: 'relative', overflow: 'hidden', borderRadius: '28px', p: { xs: 3.5, md: 5 }, color: 'common.white',
        background: 'linear-gradient(150deg, #0b3f4d 0%, #0e5f74 55%, #1b8aa6 100%)', display: 'flex', flexDirection: 'column', gap: 3,
      }}
    >
      <WbSunny aria-hidden sx={{ position: 'absolute', right: -70, top: -80, fontSize: 280, color: amber, opacity: 0.12 }} />
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '18px', display: 'grid', placeItems: 'center', bgcolor: 'rgb(255 255 255 / 0.16)', '& svg': { fontSize: 32 } }}><AdminPanelSettings /></Box>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mt: 2.5, fontSize: { xs: 34, md: 44 }, lineHeight: 1.05 }}>Panel miasta</Typography>
        <Typography sx={{ mt: 1.5, opacity: 0.88, fontSize: { md: 18 } }}>Gdzie w Łodzi brakuje cienia i miejsc chłodu. Dla urzędników.</Typography>
      </Box>
      {share !== undefined && (
        <Box sx={{ position: 'relative', p: 2.5, borderRadius: '20px', bgcolor: 'rgb(255 255 255 / 0.1)', border: 1, borderColor: 'rgb(255 255 255 / 0.16)' }}>
          <Typography sx={{ fontSize: { xs: 44, md: 54 }, fontWeight: 800, color: amber, lineHeight: 1 }}><CountUp to={Math.round(share * 100)} /> %</Typography>
          <Typography sx={{ mt: 0.75, opacity: 0.9 }}>długości ulic w Łodzi leży dalej niż {REACH} m od miejsca chłodu</Typography>
        </Box>
      )}
      <Stack spacing={1.25} sx={{ position: 'relative' }}>
        {views.map(({ label, icon }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, '& svg': { color: amber } }}>{icon}<Typography sx={{ fontWeight: 600 }}>{label}</Typography></Box>
        ))}
      </Stack>
    </Box>
  )
}

// Three numbers from the three views; a tap on one opens that view
function Kpis({ onPick }: { onPick: (tab: number) => void }) {
  const reach = useData<ReachData>('/data/reach.json')
  const gaps = useData<Gaps>('/data/panel_gaps.json')
  const cands = useData<Candidates>('/data/panel_candidates.json')
  const share = reach?.items[0]?.uncovered
  const longest = gaps && Math.max(...gaps.items.map((g) => g.length_m))
  const best = cands?.items[0]
  const kpis = [
    { tab: 0, color: steps[2].color, icon: <WbSunny />, value: gaps ? <CountUp to={gaps.items.length} /> : '…', label: 'odcinków z największym słońcem', note: longest ? `o 14:00, najdłuższy ma ${longest} m` : '' },
    { tab: 1, color: uncovered, icon: <AcUnit />, value: share !== undefined ? <><CountUp to={Math.round(share * 100)} /> %</> : '…', label: 'ulic w „białych plamach”', note: `dalej niż ${REACH} m od miejsca chłodu`, bar: share },
    { tab: 2, color: '#0e5f74', icon: <AddLocationAlt />, value: cands ? <CountUp to={cands.items.length} /> : '…', label: 'kandydatów na nowe miejsca', note: best ? `najlepszy: ${best.name} (${best.score}/100)` : '' },
  ]
  return (
    // A row you swipe on phones, so the three numbers do not push the tabs off the first screen
    <Box sx={{ display: { xs: 'flex', md: 'grid' }, gridTemplateColumns: { md: 'repeat(3, 1fr)' }, gap: 2, mt: 3, overflowX: { xs: 'auto', md: 'visible' }, scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, scrollbarWidth: 'none', mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, pb: { xs: 1.5, md: 0 }, '& > *': { flex: { xs: '0 0 82%', sm: '0 0 56%', md: 'initial' }, scrollSnapAlign: 'start' } }}>
      {kpis.map(({ tab, color, icon, value, label, note, bar }) => (
        <Card key={tab} elevation={0} sx={{ ...card, transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 32px ${color}33` } }}>
          <CardActionArea onClick={() => onPick(tab)} sx={{ p: 2.5, height: '100%', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <IconTile icon={icon} color={color} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
              <Typography sx={{ fontWeight: 700, mt: 0.75 }}>{label}</Typography>
              <Typography variant="body2" color="text.secondary">{note}</Typography>
              {bar !== undefined && <Box sx={{ mt: 1.25 }}><GrowBar share={bar} color={color} height={8} /></Box>}
            </Box>
          </CardActionArea>
        </Card>
      ))}
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: { xs: 2.5, md: 4 }, maxWidth: 1040, mx: 'auto', mt: { md: 4 } }}>
        <LoginHero />
        <Paper component="form" onSubmit={login} elevation={0} sx={{ ...card, p: { xs: 3, md: 4 }, alignSelf: 'center' }}>
          <Stack spacing={2}>
            <Chip label="Wersja demonstracyjna" size="small" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>Zaloguj się</Typography>
            <TextField name="email" type="email" label="E-mail" autoComplete="username" required />
            <TextField name="password" type="password" label="Hasło" autoComplete="current-password" required />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" loading={busy}>Zaloguj</Button>
            <Alert severity="info" icon={false} sx={{ borderRadius: '16px' }}>
              <Typography variant="subtitle2">Konto demo dla testujących</Typography>
              <Copyable label="E-mail" value={demo.email} />
              <Copyable label="Hasło" value={demo.password} />
            </Alert>
          </Stack>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <PageHeader icon={<AdminPanelSettings />} title="Panel miasta" sub="Gdzie brakuje cienia i miejsc chłodu: dane dla urzędników.">
        <Chip icon={<AdminPanelSettings />} label={user.email} variant="outlined" />
        <Button variant="outlined" size="small" onClick={() => signOut(auth!)}>Wyloguj</Button>
      </PageHeader>
      <Kpis onPick={setTab} />
      <Tabs
        value={tab}
        onChange={(_, t) => setTab(t)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          mt: 3, minHeight: 0,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTabs-flexContainer': { gap: 1 },
          '& .MuiTab-root': { minHeight: 44, borderRadius: 999, px: 2.5, bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700, '&.Mui-selected': { bgcolor: 'primary.main', color: 'common.white' } },
        }}
      >
        {views.map(({ label, icon }) => <Tab key={label} icon={icon} iconPosition="start" label={label} />)}
      </Tabs>
      <Box sx={{ mt: 3 }}>{views[tab].view}</Box>
    </Box>
  )
}

// Segments with the most sun at 14:00 (source spec 7.2), on a map and in a table
function ShadeGaps() {
  const gaps = useData<Gaps>('/data/panel_gaps.json')
  const [container, map] = useMap(cityBounds)
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
      <Typography sx={lead}>
        20 odcinków ulic w całej Łodzi o długości co najmniej 80 m z największym udziałem słońca o 14:00 (najwyżej jeden na ulicę, tylko w zabudowanej części miasta). Kliknij wiersz, aby pokazać odcinek na mapie. To miejsca, gdzie drzewa, zadaszenia lub kurtyny wodne dadzą najwięcej.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mt: 2.5, alignItems: 'start' }}>
        <Box ref={container} sx={{ ...card, overflow: 'hidden', height: { xs: 'clamp(320px, 55dvh, 560px)', md: 560 }, position: { md: 'sticky' }, top: 0 }} />
        <TableContainer sx={{ ...card, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={tableHead}>
              <TableRow><TableCell>#</TableCell><TableCell>Ulica</TableCell><TableCell align="right">Długość</TableCell><TableCell align="right">Słońce o 14:00</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {gaps?.items.map((g) => {
                const on = g.id === selected
                return (
                  <TableRow key={g.id} hover selected={on} onClick={() => setSelected(g.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ width: 52 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, bgcolor: on ? 'primary.main' : `${steps[2].color}1f`, color: on ? 'common.white' : steps[2].color }}>{g.id}</Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: on ? 700 : 400 }}>{g.name}</TableCell>
                    <TableCell align="right">{g.length_m} m</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: steps[2].color }}><WbSunny sx={{ fontSize: 16 }} />{pct(g.s14)}</Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {gaps && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Dokładność: {gaps.accuracy}, obliczono {gaps.computed_at}. Dane: OpenStreetMap.</Typography>}
    </>
  )
}

// Polygon ring approximating a circle of r metres around [lon, lat]
function circle([x, y]: number[], r: number) {
  const k = 111320 * Math.cos((y * Math.PI) / 180)
  return Array.from({ length: 65 }, (_, i) => [x + (r * Math.cos((i / 32) * Math.PI)) / k, y + (r * Math.sin((i / 32) * Math.PI)) / 110540])
}

// 400 m circles around cool places; walking segments outside every circle are the "biała plama". The whole city: the streets
// come from the shade tiles, where scripts/tiles.py already stored each segment's distance `d` to the nearest cool place,
// and the share of street length in white patches is in reach.json (worked out for REACH, keep the two in step)
function Reach() {
  const places = useData('/data/places.geojson')
  const reach = useData<ReachData>('/data/reach.json')
  const [container, map] = useMap(cityBounds)

  const cool = useMemo(() => (places?.features ?? []).filter((f) => f.properties?.type === 'cool') as Feature<Point>[], [places])
  const share = reach?.items[0]?.uncovered

  useEffect(() => {
    if (!map || !cool.length || map.getSource('network')) return
    const rings = cool.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [circle(p.geometry.coordinates, REACH)] } }))
    map.addSource('network', { type: 'vector', tiles: [`${location.origin}/data/tiles/{z}/{x}/{y}.pbf`], minzoom: 9, maxzoom: 15 })
    map.addSource('reach', { type: 'geojson', data: { type: 'FeatureCollection', features: rings } })
    map.addSource('cool', { type: 'geojson', data: { type: 'FeatureCollection', features: cool } })
    map.addLayer({ id: 'reach-fill', type: 'fill', source: 'reach', paint: { 'fill-color': covered, 'fill-opacity': 0.08 } })
    map.addLayer({
      id: 'network', type: 'line', source: 'network', 'source-layer': 'edges', layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['case', ['<=', ['get', 'd'], REACH], covered, uncovered], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 13, 1, 16, 3] },
    })
    map.addLayer({ id: 'reach-line', type: 'line', source: 'reach', paint: { 'line-color': '#0e5f74', 'line-width': 1.5, 'line-dasharray': [2, 2] } })
    map.addLayer({ id: 'cool', type: 'circle', source: 'cool', paint: { 'circle-radius': 6, 'circle-color': '#0e5f74', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
  }, [map, cool])

  if (places === null || reach === null) return <Alert severity="warning">Brak danych</Alert>
  return (
    <>
      <Typography sx={lead}>
        Koła o promieniu {REACH} m (ok. 5 minut pieszo) wokół {cool.length || '…'} miejsc chłodu. Chodniki poza wszystkimi kołami to „białe plamy”: stamtąd do najbliższego miejsca chłodu jest dalej niż {REACH} m.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2.5, mt: 2.5, alignItems: 'start' }}>
        <Box ref={container} sx={{ ...card, overflow: 'hidden', height: { xs: 'clamp(360px, 58dvh, 600px)', md: 600 } }} />
        <Box sx={{ ...card, p: 2.5 }}>
          {share === undefined ? <CircularProgress /> : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Ring share={share} color={uncovered} size={108}>
                <Typography sx={{ fontWeight: 800, fontSize: 24, color: uncovered }}><CountUp to={Math.round(share * 100)} /> %</Typography>
              </Ring>
              <Typography sx={{ fontWeight: 600 }}>długości chodników leży w białych plamach, dalej niż {REACH} m od miejsca chłodu.</Typography>
            </Box>
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
        </Box>
      </Box>
    </>
  )
}

// Gold, silver and bronze for the top three, plain for the rest
const medal = ['#f4b942', '#aab7bd', '#c98a5a']

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
      <Alert severity="info" sx={{ maxWidth: 900, borderRadius: '16px' }}>
        <b>Rekomendacja, nie decyzja.</b> Ranking pokazuje budynki publiczne, które warto sprawdzić jako nowe miejsca chłodu. Wynik nie uwzględnia m.in. dostępności dla osób z niepełnosprawnościami, klimatyzacji ani zgody zarządcy.
      </Alert>
      <Typography sx={{ fontWeight: 800, fontSize: 20, mt: 3 }}>Wagi kryteriów (wynik 0–100)</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 1.5 }}>
        {criteria.map(([weight, label, note]) => (
          <Box key={label} sx={{ ...card, p: 2.5 }}>
            <Typography sx={{ fontSize: 36, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>{pct(weight)}</Typography>
            <Box sx={{ mt: 1.25 }}><GrowBar share={weight} color="#0e5f74" height={8} /></Box>
            <Typography sx={{ fontWeight: 700, mt: 1.5 }}>{label}</Typography>
            <Typography variant="body2" color="text.secondary">{note}</Typography>
          </Box>
        ))}
      </Box>
      <TableContainer sx={{ ...card, overflow: 'hidden', mt: 2.5 }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead sx={tableHead}>
            <TableRow>
              <TableCell>#</TableCell><TableCell>Budynek</TableCell><TableCell sx={{ width: 160 }}>Wynik</TableCell>
              <TableCell align="right">Słońce w 200 m</TableCell><TableCell align="right">Do miejsca chłodu</TableCell><TableCell>Godziny otwarcia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((c, i) => (
              <TableRow key={c.name} hover>
                <TableCell sx={{ width: 52 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, bgcolor: i < 3 ? medal[i] : 'action.hover', color: i < 3 ? '#1b2a30' : 'text.secondary' }}>{i + 1}</Box>
                </TableCell>
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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Budynki z OpenStreetMap: muzea, biblioteki i domy kultury bez znanych godzin, urzędy. Dokładność: {data.accuracy}, obliczono {data.computed_at}.
      </Typography>
    </>
  )
}
