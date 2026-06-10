import { Link } from 'react-router-dom'
import { Logo } from '@venue404/ui'
import { useAuth } from '../lib/AuthContext'

const CATEGORIES = [
  { label: 'Wedding Halls', icon: '💒' },
  { label: 'Photo Studios', icon: '📸' },
  { label: 'Event Spaces', icon: '🎉' },
  { label: 'Rooftops', icon: '🌆' },
  { label: 'Conference Rooms', icon: '🏢' },
  { label: 'Outdoor Lawns', icon: '🌿' },
]

const VENUES = [
  {
    name: 'The Amber Hall',
    location: 'Bandra, Mumbai',
    type: 'Wedding Hall',
    price: '₹12,000',
    rating: '4.9',
    reviews: 38,
    bg: 'bg-stone-100',
  },
  {
    name: 'Studio Noir',
    location: 'Koramangala, Bengaluru',
    type: 'Photo Studio',
    price: '₹2,500',
    rating: '4.8',
    reviews: 61,
    bg: 'bg-zinc-900',
    dark: true,
  },
  {
    name: 'Skyline Terrace',
    location: 'Connaught Place, Delhi',
    type: 'Rooftop',
    price: '₹6,000',
    rating: '4.7',
    reviews: 24,
    bg: 'bg-slate-100',
  },
  {
    name: 'The Green Room',
    location: 'Anna Nagar, Chennai',
    type: 'Event Space',
    price: '₹4,500',
    rating: '4.9',
    reviews: 17,
    bg: 'bg-stone-200',
  },
]

function StarIcon() {
  return (
    <svg className="h-3 w-3 fill-zinc-400 text-zinc-400" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <nav className="flex items-center gap-1">
            {user ? (
              <>
                <Link
                  to="/my-bookings"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  My Bookings
                </Link>
                <button
                  onClick={() => signOut()}
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
                  className="press ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-brand">
            Venue discovery & booking
          </p>
          <h1 className="mt-3 text-[2.75rem] font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-5xl">
            Book spaces for your
            <br />
            next big moment
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            Browse verified venues across India — from intimate studios to grand halls. Check availability and confirm your booking in minutes.
          </p>

          {/* Search */}
          <div className="mt-8 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm transition-shadow focus-within:border-brand-secondary focus-within:shadow-md">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="City, venue name, or type…"
              className="flex-1 border-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
            />
            <button className="press shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
              Search
            </button>
          </div>

          {/* Category chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                className="press flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:border-brand hover:bg-brand hover:text-white"
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Venue listings */}
      <section className="border-t border-zinc-100 bg-zinc-50/60 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Popular venues</h2>
            <Link to="/login" className="text-xs font-medium text-brand hover:text-brand-hover transition-colors">
              Browse all →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VENUES.map((v) => (
              <div
                key={v.name}
                className="card-enter group cursor-pointer rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`relative h-44 ${v.bg} flex items-end p-3.5`}>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    v.dark
                      ? 'bg-white/15 text-white'
                      : 'bg-white/80 text-zinc-700'
                  }`}>
                    {v.type}
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-sm font-semibold text-zinc-900 leading-tight">{v.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                    <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {v.location}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-zinc-900">{v.price}</span>
                      <span className="text-xs text-zinc-400"> /hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarIcon />
                      <span className="text-xs font-medium text-zinc-600">{v.rating}</span>
                      <span className="text-xs text-zinc-400">({v.reviews})</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-zinc-100 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
            {[
              { stat: '500+', label: 'Verified venues' },
              { stat: '12,000+', label: 'Bookings completed' },
              { stat: '4.8 ★', label: 'Average rating' },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-semibold tracking-tight text-zinc-900">{stat}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-7">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <Logo />
          <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Venue404</p>
          <div className="flex gap-5">
            <Link to="/login" className="text-xs text-zinc-400 transition-colors hover:text-zinc-700">Sign in</Link>
            <Link to="/register" className="text-xs text-zinc-400 transition-colors hover:text-zinc-700">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
