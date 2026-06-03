import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const USER_WEB_URL = import.meta.env.VITE_USER_WEB_URL ?? 'http://localhost:5173'
const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL ?? 'http://localhost:5175'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (user.roles.includes('super_admin')) {
        window.location.href = ADMIN_PANEL_URL
      } else if (user.roles.includes('venue_owner')) {
        navigate('/', { replace: true })
      } else {
        // customer — send them to user-web
        window.location.href = USER_WEB_URL
      }
    }
  }, [user, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email, password })
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div>
      <h1>Owner Portal — Sign in</h1>
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
