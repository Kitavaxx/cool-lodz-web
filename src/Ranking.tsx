import { Alert, Box, Card, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { AcUnit, Leaderboard, Park, Science } from '@mui/icons-material'
import { pct, useData } from './shared'
import { GrowBar, PageHeader, Reveal } from './ui'

type Ranking = { simulated: boolean; items: { district: string; comfort: number; shade_share: number; cool_places: number }[] }

const medals = ['#f4b942', '#9aa9b0', '#c58b5b'] // gold, silver, bronze

// Preview of the district ranking; real values come from the mobile app, so here they are simulated (source spec 6.2)
export default function Ranking() {
  const data = useData<Ranking>('/data/ranking.json')
  const items = [...(data?.items ?? [])].sort((a, b) => b.comfort - a.comfort)
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      <PageHeader icon={<Leaderboard />} title="Ranking dzielnic" sub="Gdzie w Łodzi najłatwiej przetrwać upał: cień na chodnikach i miejsca chłodu.">
        <Chip icon={<Science />} label="Wszystkie liczby są symulowane" color="warning" />
      </PageHeader>

      {data === undefined && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />}
      {data === null && <Alert severity="warning" sx={{ mt: 3 }}>Brak danych</Alert>}
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {items.map((d, i) => (
          <Reveal key={d.district} delay={i * 0.08}>
            <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: '20px' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800, bgcolor: medals[i] ?? '#f1f3f4', color: i < 3 ? 'common.white' : 'text.secondary', boxShadow: i < 3 ? `0 6px 16px ${medals[i]}66` : 'none' }}>
                {i + 1}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{d.district}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{d.comfort}<Typography component="span" color="text.secondary"> / 100</Typography></Typography>
                </Box>
                <Box sx={{ mt: 0.5 }} role="img" aria-label={`Komfort w upale: ${d.comfort} na 100`}><GrowBar share={d.comfort / 100} color={i ? '#0e5f74' : '#2e7d32'} /></Box>
                <Box sx={{ display: 'flex', columnGap: 1, rowGap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" icon={<Park />} label={`${pct(d.shade_share)} cienia`} sx={{ bgcolor: '#e8f5e9', '& .MuiChip-icon': { color: '#2e7d32' } }} />
                  <Chip size="small" icon={<AcUnit />} label={`${d.cool_places} miejsc chłodu`} sx={{ bgcolor: '#e3f1f6', '& .MuiChip-icon': { color: '#1e88c9' } }} />
                </Box>
              </Box>
            </Card>
          </Reveal>
        ))}
      </Stack>
      {data && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Źródło: {data.accuracy}. Wyższy wynik to większy komfort w upale.</Typography>}
    </Box>
  )
}
