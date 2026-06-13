import { Link } from 'react-router-dom'
import { Logo } from '@venue404/ui'

export function HomeFooter() {
  return (
    <footer className="border-t border-zinc-100 py-7">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <Logo />
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Venue404</p>
        <div className="flex gap-5">
          <Link to="/login"    className="text-xs text-zinc-400 transition-colors hover:text-zinc-700">Sign in</Link>
          <Link to="/register" className="text-xs text-zinc-400 transition-colors hover:text-zinc-700">Register</Link>
        </div>
      </div>
    </footer>
  )
}