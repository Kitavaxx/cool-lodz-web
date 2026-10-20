import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { LngLatBounds } from 'maplibre-gl'
import type { LineString } from 'geojson'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import { AdminPanelSettings } from '@mui/icons-material'
import { auth } from './firebase'
import { pct, steps, useData, useMap } from './shared'

type Gaps = { items: { id: number; name: string; length_m: number; s14: number; geometry: LineString }[] }

// Moderator accounts are created by hand in the Firebase console, sign-up is disabled
const errors: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło',
  'auth/invalid-email': 'Nieprawidłowy adres e-mail',
  'auth/too-many-requests': 'Zbyt wiele prób, spróbuj później',
}

export default function Panel() {
  // undefined = Firebase hasn't restored the session yet
  const [user, setUser] = useState<User | null>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState(0)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password')))
    } catch (err) {
      setError(errors[(err as { code?: string }).code ?? ''] ?? 'Coś poszło nie tak, spróbuj ponownie')
    }
    setBusy(false)
  }

  if (user === undefined) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />

  if (!user) {
    return (
      <Paper component="form" onSubmit={login} variant="outlined" sx={{ maxWidth: 420, mx: 'auto', mt: { md: 6 }, p: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <AdminPanelSettings fontSize="large" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Panel miasta</Typography>
          </Box>
          <Chip label="Tylko dla moderatorów" size="small" sx={{ alignSelf: 'flex-start' }} />
          <Typography color="text.secondary">
            Luki cienia, dostępność miejsc chłodu i kandydaci na nowe miejsca chłodu dla urzędników.
          </Typography>
          <TextField name="email" type="email" label="E-mail" autoComplete="username" required />
          <TextField name="password" type="password" label="Hasło" autoComplete="current-password" required />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" loading={busy}>Zaloguj</Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, flex: 1 }}>Panel miasta</Typography>
        <Chip icon={<AdminPanelSettings />} label={user.email} variant="outlined" />
        <Button variant="outlined" size="small" onClick={() => signOut(auth)}>Wyloguj</Button>
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
