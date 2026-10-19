import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Box, Button, Card, CardContent, Chip, Link as MuiLink, Stack, Typography } from '@mui/material'
import { AcUnit, AdminPanelSettings, AccessTime, Android, DirectionsWalk, Map, WbSunny } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import { steps } from './shared'

// ponytail: set when the mobile team publishes the APK; until then the section says "wkrótce"
const apkUrl = ''

const facts = [
  {
    value: '75 %',
    text: 'nocy w roku w Łodzi występuje miejska wyspa ciepła. Centrum jest zwykle o 3–4 °C cieplejsze niż okolice, rekordowo nawet o 12 °C.',
    source: 'Atlas Miasta Łodzi, plansza „Klimat lokalny”',
    href: 'https://nowa.mapa.lodz.pl/wp-content/uploads/pdf/the_lodz_atlas/en-10R.pdf',
  },
  {
    value: '10–11',
    text: 'dni upalnych (co najmniej 30 °C) średnio w roku w miastach centralnej Polski w latach 1991–2022, a ich liczba rośnie.',
    source: 'Demagog na podstawie danych IMGW',
    href: 'https://demagog.org.pl/wypowiedzi/dni-upalne-w-miastach-czy-2022-rok-byl-rekordowy/',
  },
  {
    value: '61 tys.',
    text: 'zgonów związanych z upałem w Europie latem 2022 roku.',
    source: 'Ballester i in., Nature Medicine 2023',
    href: 'https://www.nature.com/articles/s41591-023-02419-z',
  },
]

const howTo = [
  { icon: <AccessTime />, title: 'Wybierz godzinę', text: 'Cień zmienia się w ciągu dnia. Sprawdź 10:00, 12:00, 14:00, 16:00 lub 18:00.' },
  { icon: <Map />, title: 'Zobacz cień na mapie', text: 'Każdy odcinek chodnika ma udział słońca w procentach: od pełnego cienia do pełnego słońca.' },
  { icon: <DirectionsWalk />, title: 'Idź chłodniejszą trasą', text: 'Porównaj trasę najkrótszą, kompromisową i zacienioną. Po drodze znajdziesz wodę i miejsca chłodu.' },
]

const limits = [
  'Cień liczymy tylko z obrysów budynków z OpenStreetMap. Wysokość bierzemy z tagu height, z liczby kondygnacji × 3 m, a gdy jej brak, przyjmujemy 12 m.',
  'W wersji podstawowej pomijamy drzewa, dlatego wyniki mają etykietę „szacunek”.',
  'Liczymy jeden letni dzień (15.07) i 5 godzin.',
  'Obszar to Śródmieście: od Manufaktury do południowego końca Piotrkowskiej.',
  '4 gotowe trasy, bez wyznaczania trasy z dowolnego punktu A do B.',
  'Baner upału i ranking dzielnic to dane symulowane.',
  'Dane panelu miasta to pliki statyczne. W kolejnych krokach przeniesiemy je do bazy z regułami dostępu.',
  'Kod strony pisaliśmy z pomocą AI (Claude Code).',
]

const sources = [
  { name: 'OpenStreetMap', text: 'budynki, sieć piesza, woda pitna, ławki, budynki publiczne', href: 'https://www.openstreetmap.org/copyright' },
  { name: 'OpenFreeMap', text: 'podkład mapy', href: 'https://openfreemap.org' },
  { name: 'astral', text: 'pozycja słońca dla Łodzi', href: 'https://github.com/sffjunkie/astral' },
  { name: 'OSMnx, Shapely, GeoPandas', text: 'obliczenia cienia i tras w Pythonie', href: 'https://osmnx.readthedocs.io' },
  { name: 'IMGW-PIB', text: 'definicja dnia upalnego, ostrzeżenia', href: 'https://meteo.imgw.pl' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: { xs: 6, md: 9 } }}>
      <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: 26, md: 32 } }}>{title}</Typography>
      {children}
    </Box>
  )
}

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }

export default function Home() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 4 }}>
      <Box
        sx={{
          position: 'relative', overflow: 'hidden', borderRadius: '28px', color: 'common.white', px: { xs: 3, md: 7 }, py: { xs: 5, md: 9 },
          background: 'linear-gradient(135deg, #0b4a5b 0%, #0e5f74 45%, #1b8aa6 100%)',
        }}
      >
        <WbSunny sx={{ position: 'absolute', right: { xs: -50, md: 40 }, top: { xs: -50, md: 30 }, fontSize: { xs: 200, md: 300 }, color: '#f4b942', opacity: 0.18 }} />
        <Chip icon={<AcUnit />} label="Śródmieście Łodzi · lato 2026" sx={{ bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white', '& .MuiChip-icon': { color: 'secondary.main' } }} />
        <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mt: 3, maxWidth: 700, fontSize: { xs: 36, md: 56 }, lineHeight: 1.1 }}>
          Przejdź przez Łódź w cieniu
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: 580, fontSize: { xs: 17, md: 19 }, opacity: 0.9 }}>
          Pokazujemy, które chodniki są w cieniu o danej godzinie, gdzie się schłodzić i napić wody, i jak dojść na miejsce, mniej się grzejąc.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
          <Button component={Link} to="/mapa" size="large" variant="contained" startIcon={<Map />} sx={{ bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: '#e6f4f8' } }}>
            Otwórz mapę
          </Button>
          <Button component={Link} to="/trasa" size="large" variant="outlined" startIcon={<DirectionsWalk />} sx={{ color: 'common.white', borderColor: 'rgb(255 255 255 / 0.5)' }}>
            Zaplanuj trasę
          </Button>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 5, flexWrap: 'wrap', rowGap: 1 }}>
          {steps.map(({ color, label }, i) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14 }}>
              <Box sx={{ width: 28, height: 6, borderRadius: 3, bgcolor: color }} />
              {label} słońca{i === 0 && ' · cień'}
            </Box>
          ))}
        </Stack>
      </Box>

      <Card variant="outlined" sx={{ mt: 3, borderColor: '#f4b942', bgcolor: '#fff8e8' }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: { sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' } }}>
          <WbSunny sx={{ color: '#e4572e', fontSize: 36 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Ostrzeżenie: upał 2. stopnia w Łodzi, do 33 °C</Typography>
            <Typography variant="body2" color="text.secondary">Unikaj słońca między 12:00 a 16:00, pij wodę, korzystaj z miejsc chłodu.</Typography>
          </Box>
          <Chip label="dane symulowane" size="small" variant="outlined" />
        </CardContent>
      </Card>

      <Section title="Problem">
        <Box sx={grid}>
          {facts.map(({ value, text, source, href }) => (
            <Card key={value} variant="outlined">
              <CardContent>
                <Typography sx={{ fontSize: 44, fontWeight: 700, color: 'primary.main', lineHeight: 1.1 }}>{value}</Typography>
                <Typography sx={{ mt: 1 }}>{text}</Typography>
                <MuiLink href={href} target="_blank" rel="noopener" variant="body2" sx={{ display: 'block', mt: 2 }}>Źródło: {source}</MuiLink>
              </CardContent>
            </Card>
          ))}
        </Box>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 760 }}>
          Zwarta zabudowa Śródmieścia nagrzewa się w dzień i oddaje ciepło w nocy. Mapy pogody nie mówią, po której stronie ulicy jest cień ani gdzie w pobliżu można odpocząć w chłodzie.
        </Typography>
      </Section>

      <Section title="Jak to działa">
        <Box sx={grid}>
          {howTo.map(({ icon, title, text }, i) => (
            <Card key={title} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', p: 1.25, borderRadius: '12px', bgcolor: 'primary.main', color: 'common.white' }}>{icon}</Box>
                  <Typography color="text.secondary" sx={{ fontWeight: 700 }}>Krok {i + 1}</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Section>

      <Section title="Metodyka i ograniczenia">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Jak liczymy cień</Typography>
              <Box component="ol" sx={{ pl: 2.5, mb: 0, '& li': { mt: 1 } }}>
                <li>Dla każdej godziny liczymy położenie słońca nad Łodzią 15 lipca.</li>
                <li>Cień budynku to jego obrys przesunięty od słońca o wysokość / tg(wysokości słońca).</li>
                <li>Dla każdego odcinka chodnika liczymy, jaka część długości jest poza cieniem. To <b>udział słońca</b>: 0 % to pełny cień, 100 % to pełne słońce.</li>
                <li>Trasy liczymy z kosztem odcinka <b>długość × (1 + λ × udział słońca)</b>: najkrótsza (λ = 0), kompromis (λ = 0,3), zacieniona (λ = 3). Czas przy 4,5 km/h.</li>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Etykieta dokładności: <b>szacunek</b> (tylko budynki) albo <b>model</b> (dokładne wysokości i drzewa).
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Ograniczenia</Typography>
              <Box component="ul" sx={{ pl: 2.5, mb: 0, '& li': { mt: 1 } }}>
                {limits.map((l) => <li key={l}>{l}</li>)}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Section>

      <Section title="Źródła danych">
        <Card variant="outlined">
          {sources.map(({ name, text, href }, i) => (
            <Box key={name} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { sm: 2 }, px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <MuiLink href={href} target="_blank" rel="noopener" sx={{ fontWeight: 700, minWidth: 220 }}>{name}</MuiLink>
              <Typography color="text.secondary">{text}</Typography>
            </Box>
          ))}
        </Card>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Dane mapy © autorzy OpenStreetMap, licencja ODbL.</Typography>
      </Section>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, mt: { xs: 6, md: 9 } }}>
        <Card sx={{ bgcolor: 'primary.main', color: 'common.white' }}>
          <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, p: { xs: 3, md: 4 } }}>
            <Box sx={{ flex: 1 }}>
              <Android sx={{ fontSize: 40, color: 'secondary.main' }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 1 }}>Aplikacja na Androida</Typography>
              <Typography sx={{ mt: 1, opacity: 0.9 }}>Cool Łódź w telefonie: cień, miejsca chłodu i trasy zawsze pod ręką.</Typography>
              {apkUrl && (
                <Button href={apkUrl} variant="contained" size="large" sx={{ mt: 2, bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: '#e6f4f8' } }}>
                  Pobierz APK
                </Button>
              )}
            </Box>
            <Box sx={{ bgcolor: 'common.white', p: 1.5, borderRadius: '12px', color: 'text.secondary', textAlign: 'center' }}>
              {apkUrl ? <QRCodeSVG value={apkUrl} size={140} /> : <Typography sx={{ width: 140, py: 6 }}>Link do APK wkrótce</Typography>}
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 1 }}>Dla miasta</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Luki cienia, zasięg miejsc chłodu i kandydaci na nowe miejsca chłodu.</Typography>
            <Button component={Link} to="/panel" variant="outlined" sx={{ mt: 2 }}>Panel miasta</Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
