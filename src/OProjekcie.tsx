import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Box, Button, Card, CardActionArea, Chip, Typography } from '@mui/material'
import {
  Apartment, BeachAccess, CalendarMonth, Calculate, Construction, DirectionsWalk, FilterDrama, Height, Info, Map, NearMe, OpenInNew, Park, Percent, Place, Public, Science, Storage, WbSunny,
} from '@mui/icons-material'
import { steps } from './shared'
import { HeatFacts, PageHeader, Reveal } from './ui'

// The long version of the start page: problem with sources, methodology, limitations, data (SPEC 6, SPEC 9)

const method = [
  { icon: <WbSunny />, title: 'Słońce', text: 'Położenie słońca nad Łodzią 15 lipca, co dwie godziny.' },
  { icon: <Apartment />, title: 'Cień budynków', text: 'Obrys budynku przesunięty od słońca o wysokość / tg(kąta słońca).' },
  { icon: <Percent />, title: 'Udział słońca', text: 'Jaka część chodnika jest poza cieniem.' },
  { icon: <DirectionsWalk />, title: 'Trasy', text: 'Odcinki w słońcu „kosztują” więcej. Czas przy 4,5 km/h.' },
]

const lambdas = [
  { label: 'Najkrótsza', value: '0', color: '#e4572e' },
  { label: 'Kompromis', value: '0,3', color: '#f2a516' },
  { label: 'Zacieniona', value: '3', color: '#0e5f74' },
]

const status = [
  { icon: <Public />, color: '#5b6b72', label: 'OpenStreetMap, niezweryfikowane', note: 'Prawdziwe punkty z mapy społeczności, niesprawdzone na miejscu.', items: ['Woda pitna', 'Ławki', 'Miejsca chłodu'] },
  { icon: <Calculate />, color: '#1e88c9', label: 'Szacunek', note: 'Nasze obliczenia na danych OSM, tylko z budynków, bez drzew.', items: ['Cień', 'Trasy', 'Luki cienia', 'Kandydaci', 'Trasy turystyczne'] },
  { icon: <Science />, color: '#ef6c00', label: 'Dane symulowane', note: 'Przykłady wpisane ręcznie. Prawdziwy ranking powstanie w aplikacji.', items: ['Baner upału', 'Ranking dzielnic', 'Miejsca testowe 1–10'] },
]

const limits = [
  { icon: <Height />, text: 'Wysokość z tagu height albo kondygnacje × 3 m, bez danych 12 m' },
  { icon: <Park />, text: 'Bez drzew, dlatego etykieta „szacunek”' },
  { icon: <CalendarMonth />, text: 'Jeden letni dzień (15.07), 5 godzin' },
  { icon: <Map />, text: 'Tylko Śródmieście, od Manufaktury do końca Piotrkowskiej' },
  { icon: <NearMe />, text: '4 gotowe trasy, bez trasy z dowolnego punktu A do B' },
  { icon: <Place />, text: 'Punkty z OSM mogą być nieaktualne' },
  { icon: <Science />, text: 'Baner upału i ranking dzielnic są symulowane' },
  { icon: <Storage />, text: 'Panel miasta czyta pliki statyczne, baza z regułami dostępu w planach' },
]

const sources = [
  { name: 'OpenStreetMap', text: 'budynki, sieć piesza, woda, ławki, budynki publiczne', href: 'https://www.openstreetmap.org/copyright' },
  { name: 'OpenFreeMap', text: 'podkład mapy', href: 'https://openfreemap.org' },
  { name: 'Łódź.pl', text: 'zdjęcie w tle: ul. Piotrkowska z nowymi drzewami', href: 'https://lodz.pl/artykul/ponad-40-nowych-drzew-na-piotrkowskiej-to-dzieki-wspolpracy-miasta-z-firmami-z-lodzi-zdjecia-63839/' },
  { name: 'Wikimedia Commons', text: 'zdjęcie Parku Źródliska, autor Rakoon, CC0', href: 'https://commons.wikimedia.org/wiki/File:20200531_142731_Park_%C5%B9r%C3%B3dliska_in_%C5%81%C3%B3d%C5%BA_May_2020.jpg' },
  { name: 'astral', text: 'pozycja słońca dla Łodzi', href: 'https://github.com/sffjunkie/astral' },
  { name: 'OSMnx, Shapely, GeoPandas', text: 'obliczenia cienia i tras', href: 'https://osmnx.readthedocs.io' },
  { name: 'IMGW-PIB', text: 'definicja dnia upalnego, ostrzeżenia', href: 'https://meteo.imgw.pl' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: { xs: 5, md: 7 } }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 2.5, fontSize: { md: 28 } }}>{title}</Typography>
      {children}
    </Box>
  )
}

export default function OProjekcie() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      <PageHeader icon={<Info />} title="O projekcie" sub="Skąd bierzemy dane, jak liczymy cień i czego jeszcze nie wiemy." />

      <Section title="Problem">
        <HeatFacts />
      </Section>

      <Section title="Jak liczymy cień">
        {/* Four steps on a line, numbered like the stops on the tours page */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {method.map(({ icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.12}>
              <Card variant="outlined" sx={{ height: '100%', p: 2.5, borderRadius: '24px', position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'primary.main', color: 'common.white', display: 'grid', placeItems: 'center' }}>{icon}</Box>
                  <Typography sx={{ fontSize: 40, fontWeight: 800, color: 'divider', ml: 'auto', lineHeight: 1 }}>{i + 1}</Typography>
                </Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 1.5 }}>{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
                {i === 2 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }}>
                    {[BeachAccess, FilterDrama, WbSunny].map((Icon, k) => (
                      <Box key={k} sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: '10px', bgcolor: `${steps[k].color}1f`, color: steps[k].color, typography: 'caption', fontWeight: 700 }}>
                        <Icon sx={{ display: 'block', mx: 'auto', fontSize: 20 }} />{steps[k].label}
                      </Box>
                    ))}
                  </Box>
                )}
              </Card>
            </Reveal>
          ))}
        </Box>
        <Reveal>
          <Card variant="outlined" sx={{ mt: 2, p: { xs: 2.5, md: 3 }, borderRadius: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Box sx={{ fontFamily: 'ui-monospace, monospace', fontSize: { xs: 15, md: 18 }, fontWeight: 700, px: 2, py: 1, borderRadius: '12px', bgcolor: '#f4f7f8' }}>
              koszt = długość × (1 + λ × udział słońca)
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {lambdas.map(({ label, value, color }) => (
                <Chip key={label} label={<><b>{label}</b> λ = {value}</>} sx={{ bgcolor: `${color}1f`, border: 1.5, borderColor: color }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
              <Chip size="small" icon={<Calculate />} label="szacunek: tylko budynki" />
              <Chip size="small" icon={<Construction />} label="model: dokładne wysokości i drzewa" variant="outlined" />
            </Box>
          </Card>
        </Reveal>
      </Section>

      <Section title="Skąd są dane na stronie">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {status.map(({ icon, color, label, note, items }, i) => (
            <Reveal key={label} delay={i * 0.12}>
              <Card variant="outlined" sx={{ height: '100%', p: 2.5, borderRadius: '24px', borderTop: `6px solid ${color}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color }}>
                  {icon}
                  <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 2 }}>
                  {items.map((item) => <Chip key={item} size="small" label={item} sx={{ bgcolor: `${color}1a`, fontWeight: 600 }} />)}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{note}</Typography>
              </Card>
            </Reveal>
          ))}
        </Box>
      </Section>

      <Section title="Ograniczenia">
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {limits.map(({ icon, text }) => (
            <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: '#fff4e5', color: '#c2410c' }}>{icon}</Box>
              <Typography>{text}</Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section title="Źródła danych">
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          {sources.map(({ name, text, href }) => (
            <Card key={name} variant="outlined" sx={{ borderRadius: '16px' }}>
              <CardActionArea href={href} target="_blank" rel="noopener" sx={{ p: 1.75, display: 'flex', alignItems: 'flex-start', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>{name}</Typography>
                  <Typography variant="body2" color="text.secondary">{text}</Typography>
                </Box>
                <OpenInNew sx={{ fontSize: 16, color: 'text.secondary', mt: 0.5 }} />
              </CardActionArea>
            </Card>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Dane mapy © autorzy OpenStreetMap, licencja ODbL.</Typography>
      </Section>

      <Button component={Link} to="/mapa" variant="contained" size="large" startIcon={<Map />} sx={{ mt: 5 }}>Otwórz mapę</Button>
    </Box>
  )
}
