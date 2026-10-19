import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'

export default function Panel() {
  // undefined = Firebase hasn't restored the session yet
  const [user, setUser] = useState<User | null>()
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password')))
    } catch {
      setError('Nieprawidłowy e-mail lub hasło')
    }
  }

  if (user === undefined) return <p>Ładowanie…</p>

  if (!user) {
    return (
      <form onSubmit={login}>
        <h1>Panel miasta</h1>
        <label>E-mail <input name="email" type="email" autoComplete="username" required /></label>
        <label>Hasło <input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p role="alert">{error}</p>}
        <button>Zaloguj</button>
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
