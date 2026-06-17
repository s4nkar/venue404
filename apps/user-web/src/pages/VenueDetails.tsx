import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { AppNavbar }             from '../components/shared/AppNavbar'
import { VenueGallery }          from '../components/venue/VenueGallery'
import { VenueInfo }             from '../components/venue/VenueInfo'
import { AmenitiesList }         from '../components/venue/AmenitiesList'
import { VenueReviews }          from '../components/venue/VenueReviews'
import { VenueWhereYoullBe }     from '../components/venue/VenueWhereYoullBe'
import { VenueMeetHost }         from '../components/venue/VenueMeetHost'
import { VenueThingsToKnow }     from '../components/venue/VenueThingsToKnow'
import { BookingPanel }          from '../components/venue/BookingPanel'

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider() {
  return <div className="my-10 border-t border-zinc-100" />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VenueDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Gallery */}
      <div className="h-[500px] w-full rounded-2xl bg-zinc-100" />

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
        {/* Left */}
        <div className="flex-1 space-y-8">
          <div className="space-y-3">
            <div className="h-9 w-2/3 rounded-xl bg-zinc-100" />
            <div className="h-4 w-1/3 rounded bg-zinc-100" />
            <div className="h-3.5 w-1/4 rounded bg-zinc-100" />
          </div>
          <div className="h-px w-full bg-zinc-100" />
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-zinc-100" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-zinc-100" />
              <div className="h-3 w-24 rounded bg-zinc-100" />
            </div>
          </div>
          <div className="h-px w-full bg-zinc-100" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 py-4 border-b border-zinc-50">
              <div className="h-6 w-6 rounded bg-zinc-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-zinc-100" />
                <div className="h-3 w-1/2 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>

        {/* Right */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="h-[520px] rounded-2xl bg-zinc-100" />
        </div>
      </div>
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function VenueNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100">
        <svg className="h-9 w-9 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-zinc-900">Venue not found</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        This venue may have been removed or is not yet published.
      </p>
      <button
        onClick={onBack}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Browse venues
      </button>
    </div>
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

  return (
    <div className="min-h-screen bg-white">
      <AppNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-24 pt-6">

        {/* Back breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>

        {isLoading && <VenueDetailSkeleton />}

        {(isError || (!isLoading && !venue)) && (
          <VenueNotFound onBack={() => navigate('/')} />
        )}

        {venue && (
          <>
            {/* ── Gallery ──────────────────────────────────── */}
            <VenueGallery photos={venue.photos ?? []} venueName={venue.name} />

            {/* ── Two-column body ──────────────────────────── */}
            <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16 xl:gap-20">

              {/* ════ LEFT COLUMN ═══════════════════════════ */}
              <div className="flex-1 min-w-0">

                {/* 1 · Title, rating, hosted-by, highlights, description */}
                <VenueInfo venue={venue} />

                <Divider />

                {/* 2 · What this place offers */}
                <AmenitiesList amenities={venue.amenities ?? []} />

                <Divider />

                {/* 3 · Reviews */}
                <VenueReviews />

                <Divider />

                {/* 4 · Where you'll be */}
                <VenueWhereYoullBe venue={venue} />

                <Divider />

                {/* 5 · Meet your host */}
                <VenueMeetHost venue={venue} />

                <Divider />

                {/* 6 · Things to know */}
                <VenueThingsToKnow venue={venue} />

                {/* Space so booking panel doesn't overlap on mobile */}
                <div className="h-32 lg:hidden" />
              </div>

              {/* ════ RIGHT COLUMN — sticky reserve panel ═══ */}
              <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0">
                <div className="lg:sticky lg:top-[82px]">
                  <BookingPanel venue={venue} />

                  {/* Trust micro-copy */}
                  <div className="mt-5 space-y-3 px-1">
                    {[
                      { icon: '🛡️', text: 'No charge until the owner accepts your request' },
                      { icon: '✓',  text: 'Verified venue on Venue404' },
                      { icon: '↩',  text: 'Cancellation terms as per policy above' },
                    ].map(({ icon, text }) => (
                      <div key={text} className="flex items-start gap-2.5 text-xs text-zinc-400">
                        <span className="mt-0.5">{icon}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  )
}
