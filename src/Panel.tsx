import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { AdminPanelSettings } from '@mui/icons-material'
import { auth } from './firebase'

// Moderator accounts are created by hand in the Firebase console, sign-up is disabled
const errors: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło',
  'auth/invalid-email': 'Nieprawidłowy adres e-mail',
  'auth/too-many-requests': 'Zbyt wiele prób, spróbuj później',
}

export default function Panel() {
  // undefined = Firebase hasn't restored the session yet
  const [user, setUser] = useState<User | null>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password')))
    } catch (err) {
      setError(errors[(err as { code?: string }).code ?? ''] ?? 'Coś poszło nie tak, spróbuj ponownie')
    }
    setBusy(false)
  }

  if (user === undefined) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />

  if (!user) {
    return (
      <Paper component="form" onSubmit={login} variant="outlined" sx={{ maxWidth: 420, mx: 'auto', mt: { md: 6 }, p: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <AdminPanelSettings fontSize="large" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Panel miasta</Typography>
          </Box>
          <Chip label="Tylko dla moderatorów" size="small" sx={{ alignSelf: 'flex-start' }} />
          <Typography color="text.secondary">
            Luki cienia, dostępność miejsc chłodu i kandydaci na nowe miejsca chłodu dla urzędników.
          </Typography>
          <TextField name="email" type="email" label="E-mail" autoComplete="username" required />
          <TextField name="password" type="password" label="Hasło" autoComplete="current-password" required />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" loading={busy}>Zaloguj</Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <>
      <Typography variant="h4" component="h1">Panel miasta</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
        <Typography color="text.secondary">Zalogowano jako {user.email}</Typography>
        <Button variant="outlined" size="small" onClick={() => signOut(auth)}>Wyloguj</Button>
      </Box>
    </>
  )
}
