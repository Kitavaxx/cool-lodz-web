import { NavLink, Route, Routes } from 'react-router'

const pages = [
  ['/', 'Start'],
  ['/mapa', 'Mapa'],
  ['/trasa', 'Trasa'],
  ['/miejsca-chlodu', 'Miejsca chłodu'],
  ['/panel', 'Panel miasta'],
]

export default function App() {
  return (
    <>
      <nav>
        {pages.map(([to, label]) => (
          <NavLink key={to} to={to} end>{label}</NavLink>
        ))}
      </nav>
      <main>
        <Routes>
          {pages.map(([path, label]) => (
            <Route key={path} path={path} element={<h1>{label}</h1>} />
          ))}
        </Routes>
      </main>
    </>
  )
}
