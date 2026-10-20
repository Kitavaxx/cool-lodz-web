import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Box, Button, Card, CardContent, Chip, Link as MuiLink, Typography } from '@mui/material'
import { Map } from '@mui/icons-material'

// The long version of the start page: problem with sources, methodology, limitations, data (SPEC 6, SPEC 9)

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

const limits = [
  'Cień liczymy tylko z obrysów budynków z OpenStreetMap. Wysokość bierzemy z tagu height, z liczby kondygnacji × 3 m, a gdy jej brak, przyjmujemy 12 m.',
  'W wersji podstawowej pomijamy drzewa, dlatego wyniki mają etykietę „szacunek”.',
  'Liczymy jeden letni dzień (15.07) i 5 godzin.',
  'Obszar to Śródmieście: od Manufaktury do południowego końca Piotrkowskiej.',
  '4 gotowe trasy, bez wyznaczania trasy z dowolnego punktu A do B.',
  'Miejsca chłodu z godzinami otwarcia, woda pitna i ławki pochodzą z OpenStreetMap. Nie sprawdzaliśmy ich na miejscu i mogą być nieaktualne.',
  'Baner upału i ranking dzielnic to dane symulowane.',
  'Dane panelu miasta to pliki statyczne. W kolejnych krokach przeniesiemy je do bazy z regułami dostępu.',
]

const status: { label: string; color: 'default' | 'info' | 'warning'; text: string }[] = [
  { label: 'OpenStreetMap, niezweryfikowane', color: 'default', text: 'Woda pitna, ławki i miejsca chłodu z godzinami otwarcia. To prawdziwe punkty z mapy tworzonej przez społeczność, ale nie sprawdzaliśmy ich na miejscu.' },
  { label: 'Szacunek', color: 'info', text: 'Cień, trasy, luki cienia, kandydaci na nowe miejsca chłodu i trasy turystyczne. To nasze obliczenia na danych OpenStreetMap, tylko z budynków i bez drzew.' },
  { label: 'Dane symulowane', color: 'warning', text: 'Baner upału na stronie głównej i ranking dzielnic. To przykłady wpisane ręcznie. Prawdziwy ranking powstanie w aplikacji.' },
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
    <Box component="section" sx={{ mt: { xs: 5, md: 7 } }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
      {children}
    </Box>
  )
}

export default function OProjekcie() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>O projekcie</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, fontSize: 18 }}>
        Cool Łódź pokazuje, które chodniki Śródmieścia są w cieniu o danej godzinie, gdzie się schłodzić i napić wody, i jak dojść na miejsce, mniej się grzejąc. Tu opisujemy, skąd bierzemy dane i czego nie wiemy.
      </Typography>

      <Section title="Problem">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {facts.map(({ value, text, source, href }) => (
            <Card key={value} variant="outlined">
              <CardContent>
                <Typography sx={{ fontSize: 36, fontWeight: 700, color: 'primary.main', lineHeight: 1.1 }}>{value}</Typography>
                <Typography sx={{ mt: 1 }}>{text}</Typography>
                <MuiLink href={href} target="_blank" rel="noopener" variant="body2" sx={{ display: 'block', mt: 2 }}>Źródło: {source}</MuiLink>
              </CardContent>
            </Card>
          ))}
        </Box>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Zwarta zabudowa Śródmieścia nagrzewa się w dzień i oddaje ciepło w nocy. Mapy pogody nie mówią, po której stronie ulicy jest cień ani gdzie w pobliżu można odpocząć w chłodzie.
        </Typography>
      </Section>

      <Section title="Jak liczymy cień">
        <Card variant="outlined">
          <CardContent>
            <Box component="ol" sx={{ pl: 2.5, my: 0, '& li': { mt: 1 } }}>
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
      </Section>

      <Section title="Skąd są dane na stronie">
        <Card variant="outlined">
          {status.map(({ label, color, text }, i) => (
            <Box key={label} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' }, gap: { xs: 1, sm: 2 }, px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ minWidth: 260 }}><Chip label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} /></Box>
              <Typography color="text.secondary">{text}</Typography>
            </Box>
          ))}
        </Card>
      </Section>

      <Section title="Ograniczenia">
        <Card variant="outlined">
          <CardContent>
            <Box component="ul" sx={{ pl: 2.5, my: 0, '& li': { mt: 1 } }}>
              {limits.map((l) => <li key={l}>{l}</li>)}
            </Box>
          </CardContent>
        </Card>
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

      <Button component={Link} to="/mapa" variant="contained" size="large" startIcon={<Map />} sx={{ mt: 5 }}>Otwórz mapę</Button>
    </Box>
  )
}
