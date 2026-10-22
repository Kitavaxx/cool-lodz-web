import { Link } from 'react-router'
import { Box, Button, Card, CardActionArea, Typography } from '@mui/material'
import { AcUnit, Campaign, Checkroom, ChildCare, DirectionsWalk, Elderly, HealthAndSafety, LocalDrink, Map, OpenInNew, Phone, Science, Thunderstorm, WbSunny } from '@mui/icons-material'
import { PageHeader, Reveal } from './ui'

// Everyday rules from the RCB guide "Jak przygotować się na upał"; no medical advice (source spec 6.2)
const rules = [
  { icon: <LocalDrink />, color: '#1e88c9', title: 'Pij wodę', text: 'Małymi porcjami, także bez pragnienia. Bez alkoholu i słodkich napojów.' },
  { icon: <WbSunny />, color: '#e4572e', title: 'Unikaj pełnego słońca', text: 'W najgorętsze godziny ogranicz wysiłek i idź w cieniu.' },
  { icon: <Checkroom />, color: '#7b4fb3', title: 'Ubierz się lekko', text: 'Jasne, przewiewne ubranie, nakrycie głowy, okulary.' },
  { icon: <AcUnit />, color: '#0e5f74', title: 'Odpoczywaj w chłodzie', text: 'Biblioteki, muzea i domy kultury to dobre miejsca na przerwę.' },
  { icon: <ChildCare />, color: '#f2a516', title: 'Nie zostawiaj w aucie', text: 'Dzieci ani zwierząt. Nigdy, nawet na chwilę.' },
  { icon: <Elderly />, color: '#2e7d32', title: 'Pomyśl o innych', text: 'Zapytaj starszych sąsiadów, jak się czują.' },
]

const links = [
  { icon: <Thunderstorm />, name: 'IMGW-PIB', text: 'Ostrzeżenia przed upałem dla województwa łódzkiego', href: 'https://meteo.imgw.pl' },
  { icon: <Campaign />, name: 'Rządowe Centrum Bezpieczeństwa', text: 'Alerty RCB i poradniki na upał', href: 'https://www.gov.pl/web/rcb' },
  { icon: <Science />, name: 'Główny Inspektorat Sanitarny', text: 'Komunikaty sanitarne i jakość wody w kąpieliskach', href: 'https://www.gov.pl/web/gis' },
]

// 6:00–22:00 on one axis: where an hour sits as a percentage
const x = (hour: number) => `${((hour - 6) / 16) * 100}%`

// A hot day at a glance: UV peaks around noon, it is hottest 15–18, walk in the morning or evening (RCB guide)
function HotDay() {
  const mark = { position: 'absolute', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', typography: 'body2', fontWeight: 600, whiteSpace: 'nowrap' } as const
  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, mt: 3, borderRadius: '24px' }}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>Rytm upalnego dnia</Typography>
      <Box role="img" aria-label="Promieniowanie UV jest najsilniejsze około południa, najgoręcej jest między 15:00 a 18:00. Najlepiej wychodzić rano i wieczorem." sx={{ position: 'relative', mt: 2, mx: { xs: 1.5, md: 2 } }}>
        {/* Labels above the bar */}
        <Box sx={{ position: 'relative', height: 56 }}>
          <Box sx={{ ...mark, left: x(12.5), bottom: 4, color: '#c77d00' }}><WbSunny sx={{ color: '#f4b942' }} />UV max</Box>
          <Box sx={{ ...mark, left: x(16.5), bottom: 4, color: '#c2410c' }}>
            <Box sx={{ display: 'flex', gap: 0.25, '& svg': { fontSize: 20, color: '#e4572e' } }}><WbSunny /><WbSunny /></Box>
            Najgoręcej
          </Box>
        </Box>
        <Box sx={{ position: 'relative', height: 18, borderRadius: 9, background: 'linear-gradient(90deg, #4fb3e8 0%, #9fd3ef 12%, #f4b942 34%, #ef8a3a 50%, #e4572e 60%, #e4572e 74%, #f4b942 86%, #4fb3e8 100%)' }}>
          {/* The hottest hours framed */}
          <Box sx={{ position: 'absolute', left: x(15), width: `calc(${x(18)} - ${x(15)})`, top: -4, bottom: -4, border: '3px solid #b3261e', borderRadius: 2 }} />
        </Box>
        <Box sx={{ position: 'relative', height: 22, mt: 0.5, typography: 'caption', color: 'text.secondary' }}>
          {[6, 9, 12, 15, 18, 21].map((h) => <Box key={h} component="span" sx={{ position: 'absolute', left: x(h), transform: 'translateX(-50%)' }}>{h}:00</Box>)}
        </Box>
        {/* Good times to go out */}
        <Box sx={{ position: 'relative', height: 48 }}>
          {[7.5, 20.5].map((h) => (
            <Box key={h} sx={{ ...mark, left: x(h), top: 0, color: 'primary.main' }}><DirectionsWalk />{h < 12 ? 'rano' : 'wieczorem'}</Box>
          ))}
        </Box>
      </Box>
    </Card>
  )
}

export default function Bezpieczenstwo() {
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 4 }}>
      <PageHeader icon={<HealthAndSafety />} title="Bezpieczeństwo w upał" sub="Proste zasady na upalne dni w mieście." color="#b3261e" />

      {/* Emergency number first and big */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, mt: 3, p: { xs: 2.5, md: 3 }, borderRadius: '24px', color: 'common.white', background: 'linear-gradient(135deg, #b3261e, #e4572e)', boxShadow: '0 12px 30px rgb(179 38 30 / 0.3)' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgb(255 255 255 / 0.2)', display: 'grid', placeItems: 'center', animation: 'ring 2s infinite', '@keyframes ring': { '0%, 100%': { boxShadow: '0 0 0 0 rgb(255 255 255 / 0.5)' }, '50%': { boxShadow: '0 0 0 12px rgb(255 255 255 / 0)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
          <Phone sx={{ fontSize: 30 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: { xs: 40, md: 48 }, fontWeight: 800, lineHeight: 1 }}>112</Typography>
          <Typography sx={{ opacity: 0.9 }}>Zagrożenie zdrowia lub życia</Typography>
        </Box>
      </Box>

      <HotDay />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 3 }}>
        {rules.map(({ icon, color, title, text }, i) => (
          <Reveal key={title} delay={(i % 3) * 0.1}>
            <Card variant="outlined" sx={{ height: '100%', p: 2.5, borderRadius: '24px', display: 'flex', gap: 2, alignItems: 'flex-start', transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${color}26` } }}>
              <Box sx={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: `${color}1a`, color, '& svg': { fontSize: 28 } }}>{icon}</Box>
              <Box>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
              </Box>
            </Card>
          </Reveal>
        ))}
      </Box>

      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>Oficjalne komunikaty</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {links.map(({ icon, name, text, href }) => (
          <Card key={name} variant="outlined" sx={{ borderRadius: '20px' }}>
            <CardActionArea href={href} target="_blank" rel="noopener" sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', height: '100%' }}>
              <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 32 } }}>{icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
                <Typography variant="body2" color="text.secondary">{text}</Typography>
              </Box>
              <OpenInNew sx={{ color: 'text.secondary', fontSize: 18 }} />
            </CardActionArea>
          </Card>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Na podstawie poradnika RCB „Jak przygotować się na upał”. To nie są porady medyczne.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 4 }}>
        <Button component={Link} to="/miejsca-chlodu" variant="contained" startIcon={<AcUnit />}>Znajdź miejsce chłodu</Button>
        <Button component={Link} to="/mapa" variant="outlined" startIcon={<Map />}>Sprawdź cień na mapie</Button>
      </Box>
    </Box>
  )
}
