import { useEffect, useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

const errors: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło',
  'auth/email-already-in-use': 'Konto z tym adresem już istnieje',
  'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków',
  'auth/invalid-email': 'Nieprawidłowy adres e-mail',
  'auth/too-many-requests': 'Zbyt wiele prób, spróbuj później',
}

export default function Panel() {
  // undefined = Firebase hasn't restored the session yet
  const [user, setUser] = useState<User | null>()
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const send = register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
    setError('')
    try {
      await send(auth, String(form.get('email')), String(form.get('password')))
    } catch (err) {
      setError(errors[(err as { code?: string }).code ?? ''] ?? 'Coś poszło nie tak, spróbuj ponownie')
    }
  }

  if (user === undefined) return <p>Ładowanie…</p>

  if (!user) {
    return (
      <form onSubmit={submit}>
        <h1>Panel miasta</h1>
        <p>Luki cienia, dostępność miejsc chłodu i kandydaci na nowe miejsca chłodu dla urzędników.</p>
        <label>E-mail <input name="email" type="email" autoComplete="username" required /></label>
        <label>
          Hasło{' '}
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button>{register ? 'Załóż konto' : 'Zaloguj'}</button>
        <button type="button" onClick={() => { setRegister(!register); setError('') }}>
          {register ? 'Mam już konto' : 'Nie masz konta? Zarejestruj się'}
        </button>
      </form>
    )
  }

  return (
    <>
      <h1>Panel miasta</h1>
      <p>Zalogowano jako {user.email} <button onClick={() => signOut(auth)}>Wyloguj</button></p>
    </>
  )
}
