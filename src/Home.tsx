import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { FeatureCollection, LineString } from 'geojson'
import { Box, Button, Card, CardActionArea, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { AcUnit, AddLocationAlt, AdminPanelSettings, Android, ArrowForward, DirectionsWalk, Info, KeyboardArrowDown, Map, WbSunny } from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import { hourPills, hours, pct, useData } from './shared'
import { GrowBar, HeatRows, Reveal, Stars } from './ui'

// The releases page of the mobile app, where the newest build has the APK. For now a page rather than a direct download
// (agreed with the team); the direct link would be .../releases/latest/download/cool-lodz.apk. Empty: the card says "wkrótce"
const apkUrl = 'https://github.com/mikita672/cool-lodz-app/releases'

// The three views of the city panel, as chips on its card
const panelViews: [SvgIconComponent, string][] = [
  [WbSunny, 'Luki cienia'],
  [AcUnit, 'Dostępność miejsc chłodu'],
  [AddLocationAlt, 'Kandydaci na nowe miejsca'],
]

// One idea per card, each with a picture of the real thing (screenshots of the site, public/img); the long version lives on /o-projekcie
const howTo = [
  { to: '/mapa', icon: <Map />, title: 'Sprawdź cień', text: 'Który chodnik jest w cieniu o wybranej godzinie.', img: '/img/step-shade.webp', alt: 'Mapa Piotrkowskiej z ulicami pokolorowanymi według udziału słońca', at: 'center' },
  { to: '/trasa', icon: <DirectionsWalk />, title: 'Wybierz trasę', text: 'Zacieniona droga zamiast najkrótszej, zwykle tylko minuta dłużej.', img: '/img/step-route.webp', alt: 'Trzy warianty trasy z Manufaktury na OFF Piotrkowską', at: 'center' },
  { to: '/miejsca-chlodu', icon: <AcUnit />, title: 'Odpocznij w chłodzie', text: 'Otwarta biblioteka, muzeum albo woda pitna w pobliżu.', img: '/img/step-places.webp', alt: 'Lista otwartych miejsc chłodu z odległością do wody pitnej', at: 'top' },
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
const textColour = new Set(['ink', 'muted', 'accent']) // switched, not blended, so they never sit grey on grey
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
      root.setProperty('--night', String(t)) // the hero sky follows the hour smoothly
      // The panels of the page are light or dark, never grey: blended halfway, text and background meet (at 16:00 it was grey
      // on grey). So they blend only in the middle of the range, and the text colours switch at the halfway point.
      const k2 = Math.min(1, Math.max(0, (t - 0.5) / 0.25))
      const p = k2 * k2 * (3 - 2 * k2)
      for (const [name, [day, dark]] of Object.entries(palette)) root.setProperty(`--${name}`, textColour.has(name) ? (p < 0.5 ? day : dark) : mix(day, dark, p))
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
  const reach = useData<{ items: { uncovered: number }[] }>('/data/reach.json') // share of street length in white patches, for the panel card
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
          {howTo.map(({ to, icon, title, text, img, alt, at }, i) => {
            const main = i === 1 // the middle card stands out
            return (
              <Reveal key={to} delay={i * 0.15}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '28px', height: '100%', overflow: 'hidden', border: 1, borderColor: main ? 'primary.main' : v('line'),
                    bgcolor: main ? 'primary.main' : v('card'), color: main ? 'common.white' : v('ink'),
                    transform: { md: main ? 'scale(1.05)' : 'none' }, boxShadow: main ? '0 24px 48px rgb(14 95 116 / 0.3)' : 'none',
                    transition: 'transform .25s, box-shadow .25s', '&:hover': { boxShadow: '0 24px 48px rgb(14 95 116 / 0.25)' },
                  }}
                >
                  <CardActionArea component={Link} to={to} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', '&:hover img': { transform: 'scale(1.06)' } }}>
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{ aspectRatio: '16 / 10', overflow: 'hidden', bgcolor: v('line') }}>
                        <Box component="img" src={img} alt={alt} loading="lazy" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: at, transition: 'transform .6s cubic-bezier(.2,.7,.2,1)' }} />
                      </Box>
                      {/* The step number sits on the edge between the picture and the text, where it covers nothing */}
                      <Box sx={{ position: 'absolute', bottom: -18, right: 22, width: 38, height: 38, borderRadius: '50%', bgcolor: amber, color: '#1b2a30', fontWeight: 800, fontSize: 17, display: 'grid', placeItems: 'center', border: 3, borderColor: main ? 'primary.main' : v('card'), boxShadow: '0 4px 12px rgb(0 0 0 / 0.2)' }}>{i + 1}</Box>
                    </Box>
                    <Box sx={{ p: { xs: 3, md: 3.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{ display: 'grid', placeItems: 'center', p: 0.9, borderRadius: '12px', bgcolor: main ? 'rgb(255 255 255 / 0.15)' : 'primary.main', color: 'common.white', '& svg': { fontSize: 22 } }}>{icon}</Box>
                        <Typography variant="h5" component="h3" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 22 } }}>{title}</Typography>
                      </Box>
                      <Typography sx={{ mt: 1.5, opacity: 0.8 }}>{text}</Typography>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: 2.5, fontWeight: 700, color: main ? 'common.white' : v('accent') }}>
                        Otwórz <ArrowForward fontSize="small" />
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              </Reveal>
            )
          })}
        </Box>
      </Section>

      {/* The heading on the left, the facts as rows on the right: a different rhythm from the centred blocks around it */}
      <Section dark>
        <Box sx={{ display: 'grid', gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, alignItems: 'center' }}>
          <Reveal>
            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, fontSize: { xs: 32, md: 52 }, lineHeight: 1.08 }}>
              Upał w mieście <Box component="span" sx={{ color: amber }}>to realny problem</Box>
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: { xs: 17, md: 20 }, opacity: 0.8, maxWidth: 440 }}>Zwarta zabudowa nagrzewa się w dzień i oddaje ciepło w nocy.</Typography>
            <Button component={Link} to="/o-projekcie" variant="outlined" endIcon={<ArrowForward />} sx={{ mt: 4, color: 'common.white', borderColor: 'rgb(255 255 255 / 0.5)', px: 3 }}>
              Metodyka, ograniczenia i źródła
            </Button>
          </Reveal>
          <HeatRows />
        </Box>
      </Section>

      <Section>
        <Title plain="Cool Łódź" accent="dla każdego" sub="Dla mieszkańców w telefonie, dla urzędników w panelu miasta." />
        <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, mt: { xs: 5, md: 8 } }}>
          <Reveal>
            {/* The city panel: a real screenshot filling the top of the card, and what the panel holds */}
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '28px', overflow: 'hidden', bgcolor: v('card'), border: 1, borderColor: v('line') }}>
              <Box sx={{ position: 'relative', aspectRatio: { xs: '4 / 3', md: '16 / 9' }, overflow: 'hidden', bgcolor: v('line') }}>
                <Box component="img" src="/img/panel-reach.webp" alt="Panel miasta: ulice Łodzi dalej niż 400 m od miejsca chłodu na czerwono" loading="lazy" sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%' }} />
                {reach && (
                  <Chip icon={<AcUnit />} label={`${pct(reach.items[0].uncovered)} ulic dalej niż 400 m od miejsca chłodu`} sx={{ position: 'absolute', left: 16, bottom: 16, fontWeight: 700, bgcolor: 'rgb(255 255 255 / 0.94)', color: '#1b2a30', boxShadow: '0 4px 14px rgb(0 0 0 / 0.2)', '& .MuiChip-icon': { color: '#e4572e' } }} />
                )}
              </Box>
              <Box sx={{ p: { xs: 3.5, md: 4.5 }, display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <AdminPanelSettings sx={{ fontSize: 36, color: v('accent') }} />
                  <Typography variant="h5" component="h3" sx={{ fontWeight: 700 }}>Panel miasta</Typography>
                </Box>
                <Typography sx={{ mt: 1, color: v('muted') }}>Trzy widoki dla urzędników: gdzie brakuje cienia, gdzie brakuje miejsc chłodu i gdzie otworzyć nowe.</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  {panelViews.map(([Icon, label]) => (
                    <Chip key={label} icon={<Icon />} label={label} size="small" variant="outlined" sx={{ borderColor: v('line'), color: v('ink'), fontWeight: 600, '& .MuiChip-icon': { color: v('accent') } }} />
                  ))}
                </Box>
                <Button component={Link} to="/panel" variant="outlined" endIcon={<ArrowForward />} sx={{ mt: 3, color: v('accent'), borderColor: v('accent') }}>Zaloguj się</Button>
              </Box>
            </Box>
          </Reveal>
          <Reveal delay={0.15}>
            <Box sx={{ height: '100%', p: { xs: 3.5, md: 5 }, borderRadius: '28px', bgcolor: 'primary.main', color: 'common.white', display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'left' } }}>
              <Android sx={{ fontSize: 44, color: 'secondary.main' }} />
              <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 1.5 }}>Aplikacja na Androida</Typography>
              <Typography sx={{ mt: 1, opacity: 0.85 }}>Cień i miejsca chłodu zawsze pod ręką.</Typography>
              {/* The code takes the space between the text and the button, so a tall card does not leave a hole */}
              {apkUrl && <Box sx={{ flex: 1, width: '100%', display: 'grid', placeItems: 'center', py: 3 }}><Box sx={{ bgcolor: 'common.white', p: 1.5, borderRadius: '20px', display: 'flex' }}><QRCodeSVG value={apkUrl} size={172} /></Box></Box>}
              <Box sx={{ mt: apkUrl ? 0 : 'auto', pt: apkUrl ? 0 : 3, alignSelf: 'center' }}>
                {apkUrl ? <Button href={apkUrl} target="_blank" rel="noopener" variant="contained" sx={white}>Pobierz aplikację</Button> : <Chip label="APK wkrótce" sx={{ bgcolor: 'rgb(255 255 255 / 0.15)', color: 'common.white' }} />}
              </Box>
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
