import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { AuthLayout, AuthCard, AuthStatusPanel, Logo } from '@venue404/ui'

const OWNER_PORTAL_URL = import.meta.env.VITE_OWNER_PORTAL_URL ?? 'http://localhost:5398'
const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL ?? 'http://localhost:5399'

const FEATURES = [
  { label: 'Discover unique venues near you' },
  { label: 'Book instantly or on request' },
  { label: 'Track your bookings in one place' },
  { label: 'Secure payments & easy refunds' },
]

function redirectByRole(roles: string[]) {
  if (roles.includes('super_admin')) {
    window.location.href = ADMIN_PANEL_URL
  } else if (roles.includes('venue_owner')) {
    window.location.href = OWNER_PORTAL_URL
  }
}

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (user.roles.includes('super_admin') || user.roles.includes('venue_owner')) {
        redirectByRole(user.roles)
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [user, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email, password })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <AuthLayout
      left={
        <AuthCard
          title="Welcome back"
          subtitle="Sign in to discover and book amazing venues."
          footer={
            <>
              New here?{' '}
              <Link to="/register" className="font-medium text-brand hover:text-brand-hover">
                Create an account
              </Link>
            </>
          }
        >
          <div className="mb-7">
            <Logo />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                disabled={submitting}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="press flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition-[background-color,box-shadow] duration-150 hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </AuthCard>
      }
      right={
        <AuthStatusPanel
          tagline="Venue404"
          title="Find and book the perfect venue"
          description="Discover unique spaces for events, parties, shoots, and more — and book them with just a few clicks."
          features={FEATURES}
        />
      }
    />
  )
}
