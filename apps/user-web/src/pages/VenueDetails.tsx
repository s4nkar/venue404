import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { VenueGallery }             from '../components/venue/VenueGallery'
import { VenueInfo }                from '../components/venue/VenueInfo'
import { AmenitiesList }            from '../components/venue/AmenitiesList'
import { CancellationPolicyCard }   from '../components/venue/CancellationPolicyCard'
import { BookingPanel }             from '../components/venue/BookingPanel'

export default function VenueDetails() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const client     = createClient()

  const {
    data: venue,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['venue', id],
    queryFn:  () => venueEndpoints(client).getVenue(id!),
    enabled:  !!id,
  })

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        {/* Gallery skeleton */}
        <div className="w-full h-72 sm:h-[420px] rounded-2xl bg-zinc-100" />
        <div className="flex gap-10">
          <div className="flex-1 space-y-4">
            <div className="h-6 w-24 bg-zinc-100 rounded-full" />
            <div className="h-9 w-3/4 bg-zinc-100 rounded-lg" />
            <div className="h-4 w-1/2 bg-zinc-100 rounded" />
            <div className="h-24 bg-zinc-100 rounded-xl" />
          </div>
          <div className="w-96 hidden lg:block">
            <div className="h-96 bg-zinc-100 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (isError || !venue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-4">
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Venue not found</h2>
        <p className="text-sm text-zinc-500 mb-6">
          This venue may have been removed or is not yet published.
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-4"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {/* Gallery — full width */}
        <VenueGallery photos={venue.photos ?? []} venueName={venue.name} />

        {/* Two-column layout below gallery */}
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Left column ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">
            <VenueInfo venue={venue} />

            {(venue.amenities ?? []).length > 0 && (
              <div className="border-t border-zinc-100 pt-8">
                <AmenitiesList amenities={venue.amenities ?? []} />
              </div>
            )}

            <div className="border-t border-zinc-100 pt-8">
              <CancellationPolicyCard policy={venue.cancellation_policy} />
            </div>
          </div>

          {/* ── Right column — sticky booking panel ──────────────────── */}
          <div className="w-full lg:w-96 lg:shrink-0">
            <div className="lg:sticky lg:top-6">
              <BookingPanel venue={venue} />
            </div>
          </div>
        </div>

        {/* Mobile booking panel pinned to bottom (shows only on small screens) */}
        {/* Note: on mobile the BookingPanel above renders inline; the sticky
            behaviour is lg-only. This is intentional — on mobile it scrolls
            in naturally after the venue info. */}
      </div>
    </div>
  )
}