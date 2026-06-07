import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const OWNER_PORTAL_URL = import.meta.env.VITE_OWNER_PORTAL_URL ?? 'http://localhost:5398'
const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL ?? 'http://localhost:5399'

function redirectByRole(roles: string[]) {
  if (roles.includes('super_admin')) {
    window.location.href = ADMIN_PANEL_URL
  } else if (roles.includes('venue_owner')) {
    window.location.href = OWNER_PORTAL_URL
  }
  // customer stays on user-web — handled by navigate below
}

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // if already logged in, redirect immediately
  useEffect(() => {
    if (!loading && user) {
      if (user.roles.includes('super_admin') || user.roles.includes('venue_owner')) {
        redirectByRole(user.roles)
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [user, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn({ email, password })
      // onAuthStateChange fires → loadUser → user state updates → useEffect above redirects
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
