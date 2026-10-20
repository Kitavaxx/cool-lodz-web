import { Alert, Box, Card, Chip, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material'
import { AcUnit, Science, Park } from '@mui/icons-material'
import { pct, useData } from './shared'

type Ranking = { simulated: boolean; items: { district: string; comfort: number; shade_share: number; cool_places: number }[] }

// Preview of the district ranking; real values come from the mobile app, so here they are simulated (source spec 6.2)
export default function Ranking() {
  const data = useData<Ranking>('/data/ranking.json')
  const items = [...(data?.items ?? [])].sort((a, b) => b.comfort - a.comfort)
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>Ranking dzielnic</Typography>
        <Chip icon={<Science />} label="dane symulowane" color="warning" />
      </Box>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
        Które dzielnice Łodzi są najbardziej przyjazne w upał? Wskaźnik komfortu łączy udział cienia na chodnikach i liczbę miejsc chłodu.
      </Typography>
      <Alert severity="warning" sx={{ mt: 2 }}>
        To podgląd: <b>wszystkie liczby na tej stronie są symulowane</b>.
      </Alert>

      {data === undefined && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 6 }} />}
      {data === null && <Alert severity="warning" sx={{ mt: 3 }}>Brak danych</Alert>}
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {items.map((d, i) => (
          <Card key={d.district} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: 32, fontWeight: 700, color: i ? 'text.secondary' : 'primary.main', width: 40, textAlign: 'center' }}>{i + 1}</Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{d.district}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{d.comfort}<Typography component="span" color="text.secondary"> / 100</Typography></Typography>
              </Box>
              <LinearProgress variant="determinate" value={d.comfort} aria-label={`Komfort w upale: ${d.comfort} na 100`} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} />
              <Box sx={{ display: 'flex', columnGap: 2.5, rowGap: 0.5, mt: 1, typography: 'body2', color: 'text.secondary', flexWrap: 'wrap', '& span': { display: 'flex', alignItems: 'center', gap: 0.5 }, '& svg': { fontSize: 18 } }}>
                <span><Park />cień na chodnikach: {pct(d.shade_share)}</span>
                <span><AcUnit />miejsca chłodu: {d.cool_places}</span>
              </Box>
            </Box>
          </Card>
        ))}
      </Stack>
      {data && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Źródło: {data.accuracy}. Wyższy wynik oznacza większy komfort w upale.</Typography>}
    </Box>
  )
}
