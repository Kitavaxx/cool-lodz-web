import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { FeatureCollection, LineString } from 'geojson'
import { Box, Button, Card, CardActionArea, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { AcUnit, AdminPanelSettings, Android, ArrowForward, DirectionsWalk, Info, KeyboardArrowDown, Map, WbSunny } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import { hourPills, hours, pct, useData } from './shared'
import { GrowBar, HeatFacts, Reveal, Stars } from './ui'

// ponytail: set when the mobile team publishes the APK; until then the card says "wkrótce"
const apkUrl = ''

// One idea per card; the long version lives on /o-projekcie
const howTo = [
  { to: '/mapa', icon: <Map />, title: 'Sprawdź cień', text: 'Który chodnik jest w cieniu o wybranej godzinie.' },
  { to: '/trasa', icon: <DirectionsWalk />, title: 'Wybierz trasę', text: 'Zacieniona droga zamiast najkrótszej, zwykle tylko minuta dłużej.' },
  { to: '/miejsca-chlodu', icon: <AcUnit />, title: 'Odpocznij w chłodzie', text: 'Otwarta biblioteka, muzeum albo woda pitna w pobliżu.' },
]

const amber = '#f4b942'

// The page follows the chosen hour from a day theme to a night theme. night: 0 = day, 1 = night.
const night: Record<number, number> = { 10: 0, 12: 0, 14: 0.1, 16: 0.45, 18: 1 }
const palette: Record<string, [string, string]> = {
  surface: ['#ffffff', '#122129'],
  card: ['#f4f7f8', '#1a2e38'],
  ink: ['#1b2a30', '#e6eff2'],
  muted: ['#5b6b72', '#9db2ba'],
  line: ['#dfe5e7', '#2b414b'],
  accent: ['#0e5f74', '#6cc4ee'],
  track: ['#edf1f2', '#2b414b'], // read by GrowBar
}
// A page colour as a CSS variable, with the day colour until the first frame sets it
const v = (name: string) => `var(--${name}, ${palette[name][0]})`
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => `rgb(${rgb(a).map((x, i) => Math.round(x + (rgb(b)[i] - x) * t)).join(' ')})`

// Blends the palette towards the hour's darkness over 1.2 s and writes it as CSS variables on <html>,
// where the page and the blurred photo behind it (App) both read them
function useNight(hour: number) {
  const shown = useRef(night[hour])
  useEffect(() => {
    const root = document.documentElement.style
    const [from, to, start] = [shown.current, night[hour], performance.now()]
    let frame = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1200)
      const t = from + (to - from) * k * k * (3 - 2 * k)
      shown.current = t
      root.setProperty('--night', String(t))
      for (const [name, [day, dark]] of Object.entries(palette)) root.setProperty(`--${name}`, mix(day, dark, t))
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [hour])
  // Other pages keep their own colours
  useEffect(() => () => {
    const root = document.documentElement.style
    for (const name of ['night', ...Object.keys(palette)]) root.removeProperty(`--${name}`)
  }, [])
}
const white = { bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: '#e6f4f8' } }

// A big rounded panel, roughly one screen of the scroll story
function Section({ id, dark, children }: { id?: string; dark?: boolean; children: ReactNode }) {
  return (
    <Box
      component="section"
      id={id}
      sx={{
        mt: { xs: 3, md: 4 }, borderRadius: { xs: '28px', md: '40px' }, px: { xs: 2.5, sm: 4, md: 7 }, py: { xs: 7, md: 12 },
        bgcolor: dark ? undefined : v('surface'), color: dark ? 'common.white' : v('ink'),
        background: dark ? 'linear-gradient(160deg, #0b3f4d 0%, #0e5f74 100%)' : undefined,
      }}
    >
      {children}
    </Box>
  )
}

function Title({ plain, accent, color = v('accent'), sub }: { plain: string; accent: string; color?: string; sub: string }) {
  return (
    <Reveal>
      <Typography variant="h2" component="h2" sx={{ fontWeight: 700, textAlign: 'center', fontSize: { xs: 32, md: 48 }, lineHeight: 1.1 }}>
        {plain} <Box component="span" sx={{ color }}>{accent}</Box>
      </Typography>
      <Typography sx={{ textAlign: 'center', mt: 2, fontSize: { xs: 17, md: 19 }, opacity: 0.75, maxWidth: 560, mx: 'auto' }}>{sub}</Typography>
    </Reveal>
  )
}

// Real numbers from routes.geojson: what walking in the shade costs on the first route at the chosen hour
function Preview({ hour, onHour }: { hour: number; onHour: (h: number) => void }) {
  const routes = useData<FeatureCollection<LineString>>('/data/routes.geojson')
  const pick = (variant: string) => routes?.features.find((f) => f.properties!.route_id === 1 && f.properties!.hour === hour && f.properties!.variant === variant)?.properties
  const rows = [
    { label: 'Najkrótsza', color: '#e4572e', p: pick('shortest') },
    { label: 'Zacieniona', color: '#0e5f74', p: pick('shaded') },
  ]
  if (!rows[0].p || !rows[1].p) return null
  const extra = Math.round(rows[1].p.extra_min)
  return (
    <Card sx={{ p: 3, borderRadius: '24px', boxShadow: '0 30px 60px rgb(0 0 0 / 0.3)', bgcolor: v('surface'), color: v('ink'), width: { xs: '100%', md: 400, xl: 460 }, maxWidth: '100%' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{rows[0].p.route_name}</Typography>
      <ToggleButtonGroup value={hour} exclusive size="small" fullWidth onChange={(_, h) => h && onHour(h)} aria-label="Godzina" sx={{ ...hourPills, mt: 1.5, bgcolor: v('card'), '& .MuiToggleButtonGroup-grouped': { ...hourPills['& .MuiToggleButtonGroup-grouped'], color: v('muted') } }}>
        {hours.map((h) => <ToggleButton key={h} value={h}>{h}:00</ToggleButton>)}
      </ToggleButtonGroup>
      {rows.map(({ label, color, p }) => (
        <Box key={label} sx={{ mt: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', typography: 'body2' }}>
            <b>{label}</b>
            <span>{pct(p!.sun_share)} słońca · {Math.round(p!.time_min)} min</span>
          </Box>
          <Box sx={{ mt: 1 }}><GrowBar share={p!.sun_share} color={color} height={12} /></Box>
        </Box>
      ))}
      <Chip icon={<AcUnit />} color="primary" sx={{ mt: 3 }} label={`${Math.round((rows[0].p.sun_share - rows[1].p.sun_share) * 100)} p.p. mniej słońca ${extra > 0 ? `za +${extra} min` : 'w tym samym czasie'}`} />
    </Card>
  )
}

// The sun on a dotted arc along the top of the hero, at the chosen hour (sunrise ~5:00, sunset ~21:00 in July).
// Desktop only: on phones the text starts at the very top, so there is no room above it.
function SunArc({ hour }: { hour: number }) {
  const a = (Math.PI * (hour - 5)) / 16
  const x = 50 - 44 * Math.cos(a)
  const y = 30 - 24 * Math.sin(a)
  const move = 'left 1.2s cubic-bezier(.4,0,.2,1), top 1.2s cubic-bezier(.4,0,.2,1)'
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Box component="svg" viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M6 30 A44 24 0 0 1 94 30" fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </Box>
      {/* Night sky over the hero: darker blue and stars as the evening comes */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #050d24, #0a2236 70%)', opacity: 'calc(var(--night, 0) * 0.6)' }} />
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}><Stars /></Box>
      {/* Warmer light towards the hottest hours */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgb(244 120 40 / 0.35), rgb(244 120 40 / 0) 70%)', opacity: Math.max(0, 1 - Math.abs(hour - 15) / 5), transition: 'opacity 1.2s' }} />
      <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', transition: move, textAlign: 'center' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', mx: 'auto', background: hour >= 18 ? 'radial-gradient(circle, #ffd29a 0%, #f2853a 55%, #e4572e 100%)' : 'radial-gradient(circle, #fff3c4 0%, #f4b942 55%, #f29a2e 100%)', transition: 'background 1.2s', boxShadow: '0 0 40px 16px rgb(244 185 66 / 0.45), 0 0 120px 40px rgb(244 185 66 / 0.2)' }} />
        <Box sx={{ mt: 1, fontWeight: 700, fontSize: 14, color: amber, textShadow: '0 1px 4px rgb(0 0 0 / 0.4)' }}>{hour}:00</Box>
      </Box>
    </Box>
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
  const [hour, setHour] = useState(14)
  const [auto, setAuto] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!auto) return
    // Only while the hero is in view, so the page light doesn't change under someone reading further down
    const t = setInterval(() => document.querySelector('main')!.scrollTop < 300 && setHour((h) => hours[(hours.indexOf(h) + 1) % hours.length]), 2500)
    return () => clearInterval(t)
  }, [auto])

  useNight(hour)

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
        <SunArc hour={hour} />
        <Box sx={{ position: 'relative' }}>
          <Reveal>
            <Chip icon={<WbSunny />} label="Upał 2. stopnia, do 33 °C · dane symulowane" sx={{ bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white', '& .MuiChip-icon': { color: amber } }} />
            <Typography variant="h2" component="h1" sx={{ fontWeight: 700, mt: 3, fontSize: { xs: 40, md: 64, xl: 80 }, lineHeight: 1.02 }}>
              Przejdź przez Łódź <Box component="span" sx={{ color: amber }}>w{' '}cieniu</Box>
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: { xs: 18, md: 21, xl: 24 }, opacity: 0.9 }}>
              Cień, woda i miejsca chłodu w całej Łodzi, godzina po godzinie.
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
          <Reveal delay={0.2}><Preview hour={hour} onHour={(h) => { setAuto(false); setHour(h) }} /></Reveal>
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
                    borderRadius: '28px', height: '100%', border: 1, borderColor: main ? 'primary.main' : v('line'),
                    bgcolor: main ? 'primary.main' : v('card'), color: main ? 'common.white' : v('ink'),
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
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 3, fontWeight: 700, color: main ? 'common.white' : v('accent') }}>
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
            <Box sx={{ height: '100%', p: { xs: 3.5, md: 5 }, borderRadius: '28px', bgcolor: v('card'), border: 1, borderColor: v('line'), textAlign: { xs: 'center', sm: 'left' } }}>
              <AdminPanelSettings sx={{ fontSize: 44, color: v('accent') }} />
              <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 1.5 }}>Panel miasta</Typography>
              <Typography sx={{ mt: 1, color: v('muted') }}>Luki cienia, zasięg miejsc chłodu i kandydaci na nowe.</Typography>
              <Button component={Link} to="/panel" variant="outlined" endIcon={<ArrowForward />} sx={{ mt: 3, color: v('accent'), borderColor: v('accent') }}>Zaloguj się</Button>
            </Box>
          </Reveal>
        </Box>
      </Section>

      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 4, mx: 'auto', width: 'fit-content', maxWidth: '100%', px: 2, py: 0.75, borderRadius: 999, bgcolor: v('surface'), color: v('muted') }}>
        <Info sx={{ fontSize: 16 }} /> Cień szacujemy z budynków, bez drzew. Dane mapy © autorzy OpenStreetMap.
      </Typography>
    </Box>
  )
}
