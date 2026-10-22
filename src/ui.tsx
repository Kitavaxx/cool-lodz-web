import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Link as MuiLink, Typography } from '@mui/material'
import { Thermostat, WbSunny } from '@mui/icons-material'

// Pieces shared by the content pages: page header, scroll-in animations, animated numbers and bars

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// True from the first time the element scrolls into view (native IntersectionObserver)
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.15 })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  return [ref, shown] as const
}

// Fades and slides its content in the first time it scrolls into view
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [ref, shown] = useInView<HTMLDivElement>()
  return (
    <Box
      ref={ref}
      sx={{
        height: '100%',
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(40px)',
        transition: `opacity .8s ease ${delay}s, transform .8s cubic-bezier(.2,.7,.2,1) ${delay}s`,
        '@media (prefers-reduced-motion: reduce)': { opacity: 1, transform: 'none', transition: 'none' },
      }}
    >
      {children}
    </Box>
  )
}

// Counts up from 0 to `to` once it is on screen
export function CountUp({ to }: { to: number }) {
  const [ref, shown] = useInView<HTMLSpanElement>()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!shown || still()) return
    const start = performance.now()
    let frame = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 1200)
      setValue(to * (1 - (1 - k) ** 3))
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [shown, to])
  return <span ref={ref}>{Math.round(still() ? to : value).toLocaleString('pl-PL')}</span>
}

// A rounded bar that grows to `share` (0–1) once it is on screen
export function GrowBar({ share, color, height = 10 }: { share: number; color: string; height?: number }) {
  const [ref, shown] = useInView<HTMLDivElement>()
  return (
    <Box ref={ref} sx={{ height, borderRadius: height, bgcolor: '#edf1f2', overflow: 'hidden' }}>
      <Box sx={{ width: shown ? `${share * 100}%` : 0, height: '100%', borderRadius: height, bgcolor: color, transition: 'width 1.2s cubic-bezier(.2,.7,.2,1)' }} />
    </Box>
  )
}

// Icon tile, title and one line under it, the same on every content page
export function PageHeader({ icon, title, sub, color = '#0e5f74', children }: { icon: ReactNode; title: string; sub: string; color?: string; children?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box
        sx={{
          width: 56, height: 56, borderRadius: '18px', flexShrink: 0, display: 'grid', placeItems: 'center', color: 'common.white',
          background: `linear-gradient(135deg, ${color}, ${color}b3)`, boxShadow: `0 8px 20px ${color}40`, '& svg': { fontSize: 30 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 36 }, lineHeight: 1.15 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: { md: 17 } }}>{sub}</Typography>
      </Box>
      {children}
    </Box>
  )
}

// Round progress ring (0–1) that fills once it is on screen, with content in the middle
export function Ring({ share, color, size = 120, children }: { share: number; color: string; size?: number; children?: ReactNode }) {
  const [ref, shown] = useInView<HTMLDivElement>()
  const r = 42
  const length = 2 * Math.PI * r
  return (
    <Box ref={ref} sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={length}
          strokeDashoffset={shown ? length * (1 - share) : length} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</Box>
    </Box>
  )
}

const amber = '#f4b942'

// Three facts about heat in the city, each with a small graphic; on the home page (dark) and /o-projekcie
export function HeatFacts({ dark }: { dark?: boolean }) {
  const [suns, sunsShown] = useInView<HTMLDivElement>()
  const accent = dark ? amber : 'primary.main'
  const card = {
    height: '100%', p: { xs: 3, md: 4 }, borderRadius: '28px', display: 'flex', flexDirection: 'column',
    ...(dark ? { bgcolor: 'rgb(255 255 255 / 0.08)', border: 1, borderColor: 'rgb(255 255 255 / 0.12)' } : { bgcolor: 'background.paper', border: 1, borderColor: 'divider' }),
  }
  const big = { fontSize: { xs: 44, md: 52 }, fontWeight: 800, color: accent, lineHeight: 1 }
  const source = (href: string, name: string) => (
    <MuiLink href={href} target="_blank" rel="noopener" variant="body2" sx={{ mt: 'auto', pt: 2, color: dark ? 'rgb(255 255 255 / 0.6)' : undefined }}>{name}</MuiLink>
  )
  return (
    <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
      <Reveal>
        <Box sx={card}>
          <Ring share={0.75} color={dark ? amber : '#e4572e'}>
            <Typography sx={{ fontSize: 28, fontWeight: 800 }}><CountUp to={75} /> %</Typography>
          </Ring>
          <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 600 }}>nocy w roku z miejską wyspą ciepła</Typography>
          <Typography sx={{ mt: 0.5, opacity: 0.7 }}>Centrum Łodzi jest o 3–4 °C cieplejsze niż okolice, rekordowo o 12 °C.</Typography>
          {source('https://nowa.mapa.lodz.pl/wp-content/uploads/pdf/the_lodz_atlas/en-10R.pdf', 'Atlas Miasta Łodzi')}
        </Box>
      </Reveal>
      <Reveal delay={0.15}>
        <Box sx={card}>
          <Typography sx={big}>10–11</Typography>
          {/* One sun per hot day, popping in one after another */}
          <Box ref={suns} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 2 }} aria-hidden>
            {Array.from({ length: 11 }, (_, i) => (
              <WbSunny key={i} sx={{ color: i < 10 ? amber : 'rgb(244 185 66 / 0.45)', fontSize: 22, transform: sunsShown ? 'scale(1)' : 'scale(0)', transition: `transform .4s cubic-bezier(.3,1.6,.5,1) ${i * 0.08}s` }} />
            ))}
          </Box>
          <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 600 }}>dni upalnych w roku (≥ 30 °C)</Typography>
          <Typography sx={{ mt: 0.5, opacity: 0.7 }}>Średnio w centralnej Polsce w latach 1991–2022. Jest ich coraz więcej.</Typography>
          {source('https://demagog.org.pl/wypowiedzi/dni-upalne-w-miastach-czy-2022-rok-byl-rekordowy/', 'Demagog na podstawie IMGW')}
        </Box>
      </Reveal>
      <Reveal delay={0.3}>
        <Box sx={{ ...card, position: 'relative', overflow: 'hidden' }}>
          <Thermostat sx={{ position: 'absolute', right: -24, top: 12, fontSize: 180, color: dark ? amber : '#e4572e', opacity: 0.12 }} />
          <Typography sx={big}><CountUp to={61} /> tys.</Typography>
          <Typography sx={{ mt: 2, fontSize: 18, fontWeight: 600 }}>zgonów związanych z upałem</Typography>
          <Typography sx={{ mt: 0.5, opacity: 0.7 }}>W Europie latem 2022 roku.</Typography>
          {source('https://www.nature.com/articles/s41591-023-02419-z', 'Nature Medicine 2023')}
        </Box>
      </Reveal>
    </Box>
  )
}
