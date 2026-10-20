import { lazy, Suspense, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router'
import { AppBar, Box, ButtonBase, CircularProgress, ListItemIcon, Menu, MenuItem, Toolbar, Typography } from '@mui/material'
import { AccountBalance, AcUnit, DirectionsWalk, HealthAndSafety, Home, Info, Leaderboard, Map, MoreHoriz, Museum } from '@mui/icons-material'
import Mapa from './Mapa'
import HomePage from './Home'
import MiejscaChlodu from './MiejscaChlodu'
import Trasa from './Trasa'
import Bezpieczenstwo from './Bezpieczenstwo'
import TrasyTurystyczne from './TrasyTurystyczne'
import Ranking from './Ranking'
import OProjekcie from './OProjekcie'

// Firebase only loads on /panel, so the public pages never depend on it
const Panel = lazy(() => import('./Panel'))

// Optional pages and /panel ("Dla miasta", the login) sit under "Więcej" (more: true) so the phone bar keeps 5 slots.
const pages = [
  { to: '/', label: 'Start', icon: <Home />, element: <HomePage /> },
  { to: '/mapa', label: 'Mapa', icon: <Map />, element: <Mapa /> },
  { to: '/trasa', label: 'Trasa', icon: <DirectionsWalk />, element: <Trasa /> },
  { to: '/miejsca-chlodu', label: 'Chłód', icon: <AcUnit />, element: <MiejscaChlodu /> },
  { to: '/panel', label: 'Dla miasta', icon: <AccountBalance />, element: <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />}><Panel /></Suspense>, more: true },
  { to: '/trasy-turystyczne', label: 'Trasy turystyczne', icon: <Museum />, element: <TrasyTurystyczne />, more: true },
  { to: '/bezpieczenstwo', label: 'Bezpieczeństwo w upał', icon: <HealthAndSafety />, element: <Bezpieczenstwo />, more: true },
  { to: '/ranking', label: 'Ranking dzielnic', icon: <Leaderboard />, element: <Ranking />, more: true },
  { to: '/o-projekcie', label: 'O projekcie', icon: <Info />, element: <OProjekcie />, more: true },
]

const item = {
  flex: { xs: 1, md: 'none' },
  flexDirection: { xs: 'column', md: 'row' },
  gap: { xs: 0.5, md: 1 },
  borderRadius: 999,
  px: { md: 2 },
  py: { md: 1 },
  color: 'text.secondary',
  fontFamily: 'inherit', // "Więcej" is a <button>, which doesn't inherit Roboto
  fontSize: { xs: 14, md: 15 },
  fontWeight: 500,
  '& .icon': { display: 'flex', px: { xs: 2.5, md: 0 }, py: { xs: 0.5, md: 0 }, borderRadius: 999 },
  '&.active': {
    color: { xs: 'primary.main', md: 'common.white' },
    fontWeight: 700,
    bgcolor: { md: 'primary.main' },
    '& .icon': { bgcolor: 'primary.main', color: 'common.white' },
  },
} as const

// Phone: bottom bar like the mobile app. Desktop: pills in the top bar.
function Nav() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const more = pages.filter((p) => p.more)
  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        gap: { md: 1 },
        zIndex: 'appBar',
        bgcolor: { xs: 'background.paper', md: 'transparent' },
        boxShadow: { xs: '0 -1px 3px rgb(0 0 0 / 0.08)', md: 'none' },
        py: { xs: 1.5, md: 0 },
      }}
    >
      {pages.filter((p) => !p.more).map(({ to, label, icon }) => (
        <ButtonBase key={to} component={NavLink} to={to} end sx={item}>
          <span className="icon">{icon}</span>
          {label}
        </ButtonBase>
      ))}
      <ButtonBase className={more.some((p) => p.to === pathname) ? 'active' : ''} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" sx={item}>
        <span className="icon"><MoreHoriz /></span>
        Więcej
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} onClick={() => setAnchor(null)}>
        {more.map(({ to, label, icon }) => (
          <MenuItem key={to} component={Link} to={to} selected={to === pathname}>
            <ListItemIcon>{icon}</ListItemIcon>
            {label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}

export default function App() {
  // Screen-high column, so pages like /mapa can fill the space between the bars
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component={Link} to="/" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', flexGrow: 1 }}>
            Cool Łódź
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}><Nav /></Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, overflow: 'auto', position: 'relative', p: { xs: 2, md: 3 } }}>
        <Routes>
          {pages.map(({ to, element }) => <Route key={to} path={to} element={element} />)}
        </Routes>
      </Box>
      <Box sx={{ display: { md: 'none' } }}><Nav /></Box>
    </Box>
  )
}
