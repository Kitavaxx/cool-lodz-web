import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.tsx'

// Colours taken from the mobile app so both demos look like one product
const theme = createTheme({
  palette: {
    primary: { main: '#0e5f74' },
    secondary: { main: '#4fb3e8' },
    background: { default: '#f4f7f8' },
    text: { primary: '#1b2a30' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999 } },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
