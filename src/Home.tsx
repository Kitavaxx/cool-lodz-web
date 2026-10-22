import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { FeatureCollection, LineString } from 'geojson'
import { Box, Button, Card, CardActionArea, Chip, Typography } from '@mui/material'
import { AcUnit, AdminPanelSettings, Android, ArrowForward, DirectionsWalk, Info, KeyboardArrowDown, Map, WbSunny } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import { pct, useData } from './shared'
import { GrowBar, HeatFacts, Reveal } from './ui'

// ponytail: set when the mobile team publishes the APK; until then the card says "wkrótce"
const apkUrl = ''

// One idea per card; the long version lives on /o-projekcie
const howTo = [
  { to: '/mapa', icon: <Map />, title: 'Sprawdź cień', text: 'Który chodnik jest w cieniu o wybranej godzinie.' },
  { to: '/trasa', icon: <DirectionsWalk />, title: 'Wybierz trasę', text: 'Zacieniona droga zamiast najkrótszej, zwykle tylko minuta dłużej.' },
  { to: '/miejsca-chlodu', icon: <AcUnit />, title: 'Odpocznij w chłodzie', text: 'Otwarta biblioteka, muzeum albo woda pitna w pobliżu.' },
]

const amber = '#f4b942'
const white = { bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: '#e6f4f8' } }

// A big rounded panel, roughly one screen of the scroll story
function Section({ id, dark, children }: { id?: string; dark?: boolean; children: ReactNode }) {
  return (
    <Box
      component="section"
      id={id}
      sx={{
        mt: { xs: 3, md: 4 }, borderRadius: { xs: '28px', md: '40px' }, px: { xs: 2.5, sm: 4, md: 7 }, py: { xs: 7, md: 12 },
        bgcolor: dark ? undefined : 'background.paper', color: dark ? 'common.white' : undefined,
        background: dark ? 'linear-gradient(160deg, #0b3f4d 0%, #0e5f74 100%)' : undefined,
      }}
    >
      {children}
    </Box>
  )
}

function Title({ plain, accent, color = 'primary.main', sub }: { plain: string; accent: string; color?: string; sub: string }) {
  return (
    <Reveal>
      <Typography variant="h2" component="h2" sx={{ fontWeight: 700, textAlign: 'center', fontSize: { xs: 32, md: 48 }, lineHeight: 1.1 }}>
        {plain} <Box component="span" sx={{ color }}>{accent}</Box>
      </Typography>
      <Typography sx={{ textAlign: 'center', mt: 2, fontSize: { xs: 17, md: 19 }, opacity: 0.75, maxWidth: 560, mx: 'auto' }}>{sub}</Typography>
    </Reveal>
  )
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
    <Card sx={{ p: 3, borderRadius: '24px', boxShadow: '0 30px 60px rgb(0 0 0 / 0.3)', color: 'text.primary', width: { xs: '100%', md: 400, xl: 460 }, maxWidth: '100%' }}>
      <Typography variant="body2" color="text.secondary">Przykład o 14:00</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{rows[0].p.route_name}</Typography>
      {rows.map(({ label, color, p }) => (
        <Box key={label} sx={{ mt: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', typography: 'body2' }}>
            <b>{label}</b>
            <span>{pct(p!.sun_share)} słońca · {Math.round(p!.time_min)} min</span>
          </Box>
          <Box sx={{ mt: 1 }}><GrowBar share={p!.sun_share} color={color} height={12} /></Box>
        </Box>
      ))}
      <Chip icon={<AcUnit />} color="primary" sx={{ mt: 3 }} label={`${Math.round((rows[0].p.sun_share - rows[1].p.sun_share) * 100)} p.p. mniej słońca za +${Math.round(rows[1].p.extra_min)} min`} />
    </Card>
  )
}

// Park photo behind the hero that scrolls slower than the content. The page scrolls inside <main>, not the window.
// It sits taller than the hero (-35% top, -5% bottom) so the shift never shows a gap.
function ParallaxPhoto() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    const scroller = el.closest('main')
    if (!scroller || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = () => {
      frame = 0
      el.style.transform = `translate3d(0, ${Math.min(scroller.scrollTop, 1500) * 0.3}px, 0)`
    }
    const onScroll = () => { frame ||= requestAnimationFrame(move) }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return (
    <>
      <Box
        ref={ref}
        sx={{
          position: 'absolute', inset: '-35% 0 -5% 0', willChange: 'transform', backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundImage: { xs: 'url(/img/park-zrodliska-small.webp)', md: 'url(/img/park-zrodliska.webp)' },
        }}
      />
      {/* Dark teal wash: keeps the white text readable and the page in its brand colours */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgb(11 74 92 / 0.9) 0%, rgb(14 95 116 / 0.75) 50%, rgb(27 138 166 / 0.5) 100%)' }} />
    </>
  )
}

export default function Home() {
  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 4 }}>
      {/* Hero: the whole first screen */}
      <Box
        sx={{
          position: 'relative', overflow: 'hidden', isolation: 'isolate', borderRadius: { xs: '28px', md: '40px' }, color: 'common.white',
          px: { xs: 3, md: 8, xl: 16 }, pt: { xs: 5, md: 8 }, pb: { xs: 9, md: 8 }, minHeight: { md: 'calc(100dvh - 64px - 48px)' },
          bgcolor: '#0b4a5b',
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' }, gap: { xs: 5, md: 6 }, alignItems: 'center',
        }}
      >
        <ParallaxPhoto />
        <WbSunny sx={{ position: 'absolute', right: -80, top: -90, fontSize: 320, color: amber, opacity: 0.14 }} />
        <Box sx={{ position: 'relative' }}>
          <Reveal>
            <Chip icon={<WbSunny />} label="Upał 2. stopnia, do 33 °C · dane symulowane" sx={{ bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white', '& .MuiChip-icon': { color: amber } }} />
            <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mt: 3, fontSize: { xs: 40, md: 64, xl: 80 }, lineHeight: 1.02 }}>
              Przejdź przez Łódź <Box component="span" sx={{ color: amber }}>w{' '}cieniu</Box>
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: { xs: 18, md: 21, xl: 24 }, opacity: 0.9 }}>
              Cień, woda i miejsca chłodu w Śródmieściu, godzina po godzinie.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 5 }}>
              <Button component={Link} to="/mapa" size="large" variant="contained" startIcon={<Map />} sx={{ ...white, px: 3, py: 1.25 }}>Otwórz mapę</Button>
              <Button component={Link} to="/trasa" size="large" variant="outlined" startIcon={<DirectionsWalk />} sx={{ color: 'common.white', borderColor: 'rgb(255 255 255 / 0.5)', px: 3, py: 1.25 }}>
                Zaplanuj trasę
              </Button>
            </Box>
          </Reveal>
        </Box>
        <Box sx={{ position: 'relative', display: 'flex', justifyContent: { md: 'flex-end' } }}>
          <Reveal delay={0.2}><Preview /></Reveal>
        </Box>
        <Button
          onClick={() => document.getElementById('jak')?.scrollIntoView({ behavior: 'smooth' })}
          endIcon={<KeyboardArrowDown />}
          sx={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'common.white', opacity: 0.85,
            '& .MuiButton-endIcon': { animation: 'bounce 1.6s infinite' },
            '@keyframes bounce': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(5px)' } },
          }}
        >
          Przewiń
        </Button>
      </Box>

      <Section id="jak">
        <Title plain="Chłodniej w" accent="3 krokach" sub="Wszystko, czego potrzebujesz w upalny dzień w centrum Łodzi." />
        <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mt: { xs: 5, md: 8 }, alignItems: 'center' }}>
          {howTo.map(({ to, icon, title, text }, i) => {
            const main = i === 1 // the middle card stands out
            return (
              <Reveal key={to} delay={i * 0.15}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '28px', height: '100%', border: 1, borderColor: main ? 'primary.main' : 'divider',
                    bgcolor: main ? 'primary.main' : '#f4f7f8', color: main ? 'common.white' : 'text.primary',
                    transform: { md: main ? 'scale(1.06)' : 'none' }, boxShadow: main ? '0 24px 48px rgb(14 95 116 / 0.3)' : 'none',
                    transition: 'transform .25s, box-shadow .25s', '&:hover': { boxShadow: '0 24px 48px rgb(14 95 116 / 0.25)' },
                  }}
                >
                  <CardActionArea component={Link} to={to} sx={{ p: { xs: 3.5, md: 4.5 }, textAlign: 'center', height: '100%' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', p: 2.25, borderRadius: '50%', bgcolor: main ? 'rgb(255 255 255 / 0.15)' : 'primary.main', color: 'common.white', '& svg': { fontSize: 32 } }}>
                      {icon}
                      <Box sx={{ position: 'absolute', top: -6, right: -10, width: 28, height: 28, borderRadius: '50%', bgcolor: amber, color: '#1b2a30', fontWeight: 700, fontSize: 14, display: 'grid', placeItems: 'center' }}>{i + 1}</Box>
                    </Box>
                    <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 3 }}>{title}</Typography>
                    <Typography sx={{ mt: 1.5, opacity: 0.8 }}>{text}</Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 3, fontWeight: 700, color: main ? 'common.white' : 'primary.main' }}>
                      Otwórz <ArrowForward fontSize="small" />
                    </Box>
                  </CardActionArea>
                </Card>
              </Reveal>
            )
          })}
        </Box>
      </Section>

      <Section dark>
        <Title plain="Upał w mieście" accent="to realny problem" color={amber} sub="Zwarta zabudowa nagrzewa się w dzień i oddaje ciepło w nocy." />
        <Box sx={{ mt: { xs: 5, md: 8 } }}><HeatFacts dark /></Box>
        <Reveal>
          <Box sx={{ textAlign: 'center', mt: { xs: 5, md: 7 } }}>
            <Button component={Link} to="/o-projekcie" variant="outlined" endIcon={<ArrowForward />} sx={{ color: 'common.white', borderColor: 'rgb(255 255 255 / 0.5)', px: 3 }}>
              Metodyka, ograniczenia i źródła
            </Button>
          </Box>
        </Reveal>
      </Section>

      <Section>
        <Title plain="Cool Łódź" accent="dla każdego" sub="Dla mieszkańców w telefonie, dla urzędników w panelu miasta." />
        <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: { xs: 5, md: 8 } }}>
          <Reveal>
            <Box sx={{ height: '100%', p: { xs: 3.5, md: 5 }, borderRadius: '28px', bgcolor: 'primary.main', color: 'common.white', display: 'flex', gap: 3, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
              <Box sx={{ flex: 1 }}>
                <Android sx={{ fontSize: 44, color: 'secondary.main' }} />
                <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 1.5 }}>Aplikacja na Androida</Typography>
                <Typography sx={{ mt: 1, opacity: 0.85 }}>Cień i miejsca chłodu zawsze pod ręką.</Typography>
                {apkUrl ? <Button href={apkUrl} variant="contained" sx={{ ...white, mt: 3 }}>Pobierz APK</Button> : <Chip label="APK wkrótce" sx={{ mt: 3, bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white' }} />}
              </Box>
              {apkUrl && <Box sx={{ bgcolor: 'common.white', p: 1.5, borderRadius: '16px', display: 'flex' }}><QRCodeSVG value={apkUrl} size={128} /></Box>}
            </Box>
          </Reveal>
          <Reveal delay={0.15}>
            <Box sx={{ height: '100%', p: { xs: 3.5, md: 5 }, borderRadius: '28px', bgcolor: '#f4f7f8', border: 1, borderColor: 'divider', textAlign: { xs: 'center', sm: 'left' } }}>
              <AdminPanelSettings sx={{ fontSize: 44, color: 'primary.main' }} />
              <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 1.5 }}>Panel miasta</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Luki cienia, zasięg miejsc chłodu i kandydaci na nowe.</Typography>
              <Button component={Link} to="/panel" variant="outlined" endIcon={<ArrowForward />} sx={{ mt: 3 }}>Zaloguj się</Button>
            </Box>
          </Reveal>
        </Box>
      </Section>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 4, mx: 'auto', width: 'fit-content', maxWidth: '100%', px: 2, py: 0.75, borderRadius: 999, bgcolor: 'rgb(255 255 255 / 0.85)' }}>
        <Info sx={{ fontSize: 16 }} /> Cień szacujemy z budynków, bez drzew. Dane mapy © autorzy OpenStreetMap.
      </Typography>
    </Box>
  )
}
