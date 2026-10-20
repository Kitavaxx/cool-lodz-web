import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { FeatureCollection, LineString } from 'geojson'
import { Box, Button, Card, CardActionArea, Chip, Link as MuiLink, Typography } from '@mui/material'
import { AcUnit, AdminPanelSettings, Android, ArrowForward, DirectionsWalk, Info, Map, WbSunny } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import { pct, useData } from './shared'

// ponytail: set when the mobile team publishes the APK; until then the card says "wkrótce"
const apkUrl = ''

// One idea per card; the long version lives on /o-projekcie
const howTo = [
  { to: '/mapa', icon: <Map />, title: 'Mapa cienia', text: 'Sprawdź, który chodnik jest w cieniu.' },
  { to: '/trasa', icon: <DirectionsWalk />, title: 'Trasa w cieniu', text: 'Porównaj drogę najkrótszą i chłodniejszą.' },
  { to: '/miejsca-chlodu', icon: <AcUnit />, title: 'Miejsca chłodu', text: 'Znajdź otwartą bibliotekę lub muzeum.' },
]

const facts = [
  { value: '75 %', text: 'nocy z miejską wyspą ciepła w Łodzi', href: 'https://nowa.mapa.lodz.pl/wp-content/uploads/pdf/the_lodz_atlas/en-10R.pdf' },
  { value: '10–11', text: 'dni upalnych w roku w centralnej Polsce', href: 'https://demagog.org.pl/wypowiedzi/dni-upalne-w-miastach-czy-2022-rok-byl-rekordowy/' },
  { value: '61 tys.', text: 'zgonów od upału w Europie latem 2022', href: 'https://www.nature.com/articles/s41591-023-02419-z' },
]

const white = { bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: '#e6f4f8' } }

function Heading({ children }: { children: ReactNode }) {
  return <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: { xs: 6, md: 8 }, mb: 2 }}>{children}</Typography>
}

// Real numbers from routes.geojson: what walking in the shade costs on the first route at 14:00
function Preview() {
  const routes = useData<FeatureCollection<LineString>>('/data/routes.geojson')
  const pick = (variant: string) => routes?.features.find((f) => f.properties!.route_id === 1 && f.properties!.hour === 14 && f.properties!.variant === variant)?.properties
  const rows = [
    { label: 'Najkrótsza', color: '#e4572e', p: pick('shortest') },
    { label: 'Zacieniona', color: '#0e5f74', p: pick('shaded') },
  ]
  if (!rows[0].p || !rows[1].p) return null
  return (
    <Card sx={{ p: 2.5, borderRadius: '20px', boxShadow: '0 20px 50px rgb(0 0 0 / 0.25)', color: 'text.primary', width: '100%', maxWidth: 380 }}>
      <Typography variant="body2" color="text.secondary">Przykład o 14:00</Typography>
      <Typography sx={{ fontWeight: 700 }}>{rows[0].p.route_name}</Typography>
      {rows.map(({ label, color, p }) => (
        <Box key={label} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', typography: 'body2' }}>
            <b>{label}</b>
            <span>{pct(p!.sun_share)} słońca · {Math.round(p!.time_min)} min</span>
          </Box>
          <Box sx={{ mt: 0.75, height: 10, borderRadius: 5, bgcolor: '#edf1f2', overflow: 'hidden' }}>
            <Box sx={{ width: pct(p!.sun_share).replace(' ', ''), height: '100%', borderRadius: 5, bgcolor: color }} />
          </Box>
        </Box>
      ))}
      <Chip icon={<AcUnit />} color="primary" sx={{ mt: 2.5 }} label={`${Math.round((rows[0].p.sun_share - rows[1].p.sun_share) * 100)} p.p. mniej słońca za +${Math.round(rows[1].p.extra_min)} min`} />
    </Card>
  )
}

export default function Home() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 4 }}>
      <Box
        sx={{
          position: 'relative', overflow: 'hidden', borderRadius: '28px', color: 'common.white', px: { xs: 3, md: 6 }, py: { xs: 4, md: 7 },
          background: 'linear-gradient(135deg, #0b4a5b 0%, #0e5f74 45%, #1b8aa6 100%)',
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 4, alignItems: 'center',
        }}
      >
        <WbSunny sx={{ position: 'absolute', right: -70, top: -80, fontSize: 280, color: '#f4b942', opacity: 0.15 }} />
        <Box sx={{ position: 'relative' }}>
          <Chip icon={<AcUnit />} label="Śródmieście Łodzi · lato 2026" sx={{ bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white', '& .MuiChip-icon': { color: 'secondary.main' } }} />
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mt: 2.5, fontSize: { xs: 38, md: 54 }, lineHeight: 1.05 }}>
            Przejdź przez Łódź w{' '}cieniu
          </Typography>
          <Typography sx={{ mt: 2, fontSize: { xs: 17, md: 20 }, opacity: 0.9 }}>
            Cień, woda i miejsca chłodu godzina po godzinie.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4 }}>
            <Button component={Link} to="/mapa" size="large" variant="contained" startIcon={<Map />} sx={white}>Otwórz mapę</Button>
            <Button component={Link} to="/trasa" size="large" variant="outlined" startIcon={<DirectionsWalk />} sx={{ color: 'common.white', borderColor: 'rgb(255 255 255 / 0.5)' }}>
              Zaplanuj trasę
            </Button>
          </Box>
        </Box>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: { md: 'flex-end' } }}><Preview /></Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, px: 2, py: 1.25, borderRadius: '14px', bgcolor: '#fff4dc', border: 1, borderColor: '#f4d58a' }}>
        <WbSunny sx={{ color: '#e4572e' }} />
        <Typography sx={{ flex: 1, fontWeight: 500 }}>Upał 2. stopnia w Łodzi, do 33 °C</Typography>
        <Chip label="dane symulowane" size="small" variant="outlined" />
      </Box>

      <Heading>Jak to działa</Heading>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {howTo.map(({ to, icon, title, text }, i) => (
          <Card key={to} variant="outlined" sx={{ transition: 'border-color .2s, transform .2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' } }}>
            <CardActionArea component={Link} to={to} sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', p: 1.25, borderRadius: '14px', bgcolor: 'primary.main', color: 'common.white' }}>{icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">Krok {i + 1}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">{text}</Typography>
              </Box>
              <ArrowForward color="primary" />
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Heading>Dlaczego cień?</Heading>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        {facts.map(({ value, text, href }) => (
          <Box key={value} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', bgcolor: '#e6f4f8', display: { xs: 'flex', sm: 'block' }, alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: { xs: 28, sm: 40 }, fontWeight: 700, color: 'primary.main', lineHeight: 1, minWidth: { xs: 96, sm: 0 } }}>{value}</Typography>
            <Box>
            <Typography sx={{ mt: { sm: 1 } }}>{text}</Typography>
            <MuiLink href={href} target="_blank" rel="noopener" variant="caption" color="text.secondary">źródło</MuiLink>
            </Box>
          </Box>
        ))}
      </Box>
      <Button component={Link} to="/o-projekcie" endIcon={<ArrowForward />} sx={{ mt: 1.5 }}>Metodyka, ograniczenia i źródła danych</Button>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, mt: { xs: 6, md: 8 } }}>
        <Card sx={{ bgcolor: 'primary.main', color: 'common.white', p: { xs: 3, md: 4 }, display: 'flex', gap: 3, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Android sx={{ fontSize: 36, color: 'secondary.main' }} />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 1 }}>Cool Łódź na Androida</Typography>
            <Typography sx={{ mt: 0.5, opacity: 0.9 }}>Cień i miejsca chłodu w telefonie.</Typography>
            {apkUrl ? <Button href={apkUrl} variant="contained" sx={{ ...white, mt: 2 }}>Pobierz APK</Button> : <Chip label="APK wkrótce" sx={{ mt: 2, bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white' }} />}
          </Box>
          {apkUrl && <Box sx={{ bgcolor: 'common.white', p: 1.5, borderRadius: '12px', display: 'flex' }}><QRCodeSVG value={apkUrl} size={120} /></Box>}
        </Card>
        <Card variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
          <AdminPanelSettings sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 1 }}>Dla miasta</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Luki cienia i kandydaci na miejsca chłodu.</Typography>
          <Button component={Link} to="/panel" variant="outlined" sx={{ mt: 2 }}>Panel miasta</Button>
        </Card>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 4 }}>
        <Info sx={{ fontSize: 16 }} /> Cień szacujemy z budynków, bez drzew. Dane mapy © autorzy OpenStreetMap.
      </Typography>
    </Box>
  )
}
