import { Link } from 'react-router-dom'
import { Logo } from '@venue404/ui'

type Props = {
  isLoggedIn: boolean
  onSignOut: () => void
}

export function HomeNavbar({ isLoggedIn, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo />
        <nav className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <Link
                to="/my-bookings"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                My Bookings
              </Link>
              <Link
                to="/notifications"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Notifications
              </Link>
              <Link
                to="/profile"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Profile
              </Link>
              <button
                onClick={onSignOut}
                className="ml-1 rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}