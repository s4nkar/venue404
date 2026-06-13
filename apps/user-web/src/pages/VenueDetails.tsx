import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { useAuth } from '../lib/AuthContext'
import { Link } from 'react-router-dom'
import { Logo } from '@venue404/ui'
import { VenueGallery }           from '../components/venue/VenueGallery'
import { VenueInfo }              from '../components/venue/VenueInfo'
import { AmenitiesList }          from '../components/venue/AmenitiesList'
import { CancellationPolicyCard } from '../components/venue/CancellationPolicyCard'
import { BookingPanel }           from '../components/venue/BookingPanel'

// ─── Page-level skeleton ──────────────────────────────────────────────────────

function VenueDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Gallery */}
      <div className="w-full h-[480px] bg-zinc-100" />
      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-5">
            <div className="h-5 w-20 bg-zinc-100 rounded-full" />
            <div className="h-10 w-2/3 bg-zinc-100 rounded-lg" />
            <div className="h-4 w-1/3 bg-zinc-100 rounded" />
            <div className="h-4 w-1/4 bg-zinc-100 rounded" />
            <div className="mt-6 h-32 bg-zinc-100 rounded-xl" />
          </div>
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="h-[480px] bg-zinc-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Minimal navbar (used on detail pages — no hero, just nav) ────────────────

function DetailNavbar() {
  const { user, signOut } = useAuth()
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link to="/my-bookings" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                My Bookings
              </Link>
              <Link to="/profile" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                Profile
              </Link>
              <button onClick={signOut} className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">Sign in</Link>
              <Link to="/register" className="ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenueDetails() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const client   = createClient()

  const { data: venue, isLoading, isError } = useQuery({
    queryKey: ['venue', id],
    queryFn:  () => venueEndpoints(client).getVenue(id!),
    enabled:  !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <DetailNavbar />
        <VenueDetailSkeleton />
      </div>
    )
  }

  if (isError || !venue) {
    return (
      <div className="min-h-screen bg-white">
        <DetailNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-32 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-6">
            <svg className="h-7 w-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Venue not found</h2>
          <p className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto">
            This venue may have been removed or is not yet published.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            Browse venues
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <DetailNavbar />

      {/* ── Gallery — edge-to-edge, full bleed ───────────────────── */}
      <div className="w-full">
        <VenueGallery photos={venue.photos ?? []} venueName={venue.name} />
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Breadcrumb / back */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>

        <div className="flex flex-col lg:flex-row gap-12 xl:gap-16">

          {/* ── Left column ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Venue info header */}
            <VenueInfo venue={venue} />

            {/* Divider */}
            <div className="my-10 border-t border-zinc-100" />

            {/* Amenities */}
            {(venue.amenities ?? []).length > 0 && (
              <>
                <AmenitiesList amenities={venue.amenities ?? []} />
                <div className="my-10 border-t border-zinc-100" />
              </>
            )}

            {/* Cancellation */}
            <CancellationPolicyCard policy={venue.cancellation_policy} />

            {/* Extra bottom padding so mobile booking panel doesn't overlap */}
            <div className="h-32 lg:hidden" />
          </div>

          {/* ── Right column — sticky booking panel ───────────────── */}
          <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0">
            <div className="lg:sticky lg:top-[80px]">
              <BookingPanel venue={venue} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom CTA bar ───────────────────────────────── */}
      {/* BookingPanel renders inline on mobile and scrolls naturally.
          The sticky panel is lg-only via the class above. */}
    </div>
  )
}