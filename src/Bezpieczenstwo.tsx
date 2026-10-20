import { Link } from 'react-router'
import { Alert, Box, Button, Card, CardContent, Link as MuiLink, Typography } from '@mui/material'
import { AcUnit, Checkroom, ChildCare, Elderly, LocalDrink, Map, Phone, WbSunny } from '@mui/icons-material'

// Everyday rules from the RCB guide "Jak przygotować się na upał"; no medical advice (source spec 6.2)
const rules = [
  { icon: <LocalDrink />, title: 'Pij wodę', text: 'Regularnie, małymi porcjami, także gdy nie czujesz pragnienia. Unikaj alkoholu i napojów z dużą ilością cukru.' },
  { icon: <WbSunny />, title: 'Unikaj pełnego słońca', text: 'Najcieplej jest zwykle między 15:00 a 18:00, a promieniowanie UV jest najsilniejsze około południa. Wtedy ogranicz wysiłek i wybieraj trasy w cieniu.' },
  { icon: <Checkroom />, title: 'Ubierz się lekko', text: 'Jasne, przewiewne ubranie, nakrycie głowy i okulary przeciwsłoneczne.' },
  { icon: <AcUnit />, title: 'Odpoczywaj w chłodzie', text: 'Biblioteki, muzea i domy kultury to dobre miejsca na przerwę od upału.' },
  { icon: <ChildCare />, title: 'Nie zostawiaj w aucie', text: 'Nigdy nie zostawiaj dzieci ani zwierząt w zaparkowanym samochodzie, nawet na chwilę.' },
  { icon: <Elderly />, title: 'Pomyśl o innych', text: 'Zapytaj starszych sąsiadów i osoby samotne, jak się czują i czy czegoś potrzebują.' },
]

const links = [
  { name: 'IMGW-PIB: ostrzeżenia meteorologiczne', text: 'Aktualne ostrzeżenia przed upałem dla województwa łódzkiego.', href: 'https://meteo.imgw.pl' },
  { name: 'Rządowe Centrum Bezpieczeństwa', text: 'Alerty RCB i poradniki, jak przygotować się na upał.', href: 'https://www.gov.pl/web/rcb' },
  { name: 'Główny Inspektorat Sanitarny', text: 'Komunikaty i zalecenia sanitarne, także o jakości wody w kąpieliskach.', href: 'https://www.gov.pl/web/gis' },
]

export default function Bezpieczenstwo() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Bezpieczeństwo w upał</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
        Kilka prostych zasad na upalne dni w mieście. Przed wyjściem sprawdź oficjalne ostrzeżenia.
      </Typography>

      <Alert severity="error" icon={<Phone />} sx={{ mt: 3, fontSize: 16 }}>
        W razie zagrożenia zdrowia lub życia dzwoń pod numer alarmowy <b>112</b>.
      </Alert>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 3 }}>
        {rules.map(({ icon, title, text }) => (
          <Card key={title} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'inline-flex', p: 1.25, borderRadius: '12px', bgcolor: 'primary.main', color: 'common.white' }}>{icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1.5 }}>{title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>Oficjalne komunikaty</Typography>
      <Card variant="outlined">
        {links.map(({ name, text, href }, i) => (
          <Box key={name} sx={{ px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <MuiLink href={href} target="_blank" rel="noopener" sx={{ fontWeight: 700 }}>{name}</MuiLink>
            <Typography color="text.secondary">{text}</Typography>
          </Box>
        ))}
      </Card>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Zasady na podstawie poradnika RCB „Jak przygotować się na upał”. To nie są porady medyczne.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 4 }}>
        <Button component={Link} to="/miejsca-chlodu" variant="contained" startIcon={<AcUnit />}>Znajdź miejsce chłodu</Button>
        <Button component={Link} to="/mapa" variant="outlined" startIcon={<Map />}>Sprawdź cień na mapie</Button>
      </Box>
    </Box>
  )
}
