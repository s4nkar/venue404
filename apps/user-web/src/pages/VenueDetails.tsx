import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { toUtcIso } from '../utils'

import { AppNavbar }                from '../components/shared/AppNavbar'
import { VenueGallery }             from '../components/venue/VenueGallery'
import { VenueInfo }                from '../components/venue/VenueInfo'
import { AmenitiesList }            from '../components/venue/AmenitiesList'
import { VenueAvailabilitySection } from '../components/venue/VenueAvailabilitySection'
import { VenueReserveCard }         from '../components/venue/VenueReserveCard'
import { VenueReviews }             from '../components/venue/VenueReviews'
import { VenueWhereYoullBe }        from '../components/venue/VenueWhereYoullBe'
import { VenueMeetHost }            from '../components/venue/VenueMeetHost'
import { VenueThingsToKnow }        from '../components/venue/VenueThingsToKnow'

import type { VenueResponse, AvailabilityResponse, PricingQuote, BookingType } from '../types'

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider() {
  return <div className="my-10 border-t border-zinc-100" />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VenueDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-[500px] w-full rounded-2xl bg-zinc-100" />
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
        <div className="flex-1 space-y-6">
          <div className="h-9 w-2/3 rounded-xl bg-zinc-100" />
          <div className="h-4 w-1/3 rounded bg-zinc-100" />
          <div className="h-px w-full bg-zinc-100" />
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-zinc-100" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-zinc-100" />
              <div className="h-3 w-28 rounded bg-zinc-100" />
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
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="h-[480px] rounded-2xl bg-zinc-100" />
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

// ─── Booking logic (lifted from BookingPanel) ─────────────────────────────────

function useVenueBooking(venue: VenueResponse) {
  const navigate = useNavigate()
  const client   = createClient()

  const isTimeSlotVenue = venue.allowed_booking_types.includes('time_slot')
  const isFullDayVenue  = venue.allowed_booking_types.includes('full_day')
  const showTypeToggle  = isTimeSlotVenue && isFullDayVenue

  const [bookingType,   setBookingType]   = useState<BookingType>(
    isTimeSlotVenue && !isFullDayVenue ? 'time_slot' : 'full_day'
  )
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd,   setSelectedEnd]   = useState<string | null>(null)
  const [slotError,     setSlotError]     = useState<string | null>(null)

  // Sync booking type if venue config changes
  useEffect(() => {
    if (isTimeSlotVenue && !isFullDayVenue)  setBookingType('time_slot')
    else if (isFullDayVenue && !isTimeSlotVenue) setBookingType('full_day')
  }, [isTimeSlotVenue, isFullDayVenue])

  // Availability for selected date (needed for time slot picker)
  const availQuery = useQuery<AvailabilityResponse>({
    queryKey: ['availability-date', venue.id, selectedDate],
    queryFn:  () => venueEndpoints(client).getDateAvailability(venue.id, toUtcIso(selectedDate)!),
    enabled:  !!selectedDate,
    staleTime: 2 * 60 * 1000,
  })

  // Auto-set full day start/end from operating window
  useEffect(() => {
    if (
      bookingType === 'full_day' &&
      selectedDate &&
      availQuery.data?.operating_window?.is_available &&
      !selectedStart
    ) {
      const ow = availQuery.data.operating_window
      if (ow.opens_at && ow.closes_at) {
        setSelectedStart(`${selectedDate}T${ow.opens_at.slice(0, 5)}:00`)
        setSelectedEnd(`${selectedDate}T${ow.closes_at.slice(0, 5)}:00`)
      }
    }
  }, [bookingType, availQuery.data, selectedDate, selectedStart])

  // Pricing quote
  const quoteEnabled = !!selectedDate && !!selectedStart && !!selectedEnd && selectedStart !== selectedEnd

  const quoteQuery = useQuery<PricingQuote>({
    queryKey: ['quote', venue.id, selectedStart, selectedEnd, bookingType],
    queryFn:  () => venueEndpoints(client).getQuote(venue.id, {
      starts_at:    toUtcIso(selectedStart)!,
      ends_at:      toUtcIso(selectedEnd)!,
      booking_type: bookingType,
    }),
    enabled:   quoteEnabled,
    staleTime: 60 * 1000,
  })

  // Validate & navigate to checkout
  const validateMutation = useMutation({
    mutationFn: () =>
      venueEndpoints(client).validateSlot(venue.id, {
        booking_type: bookingType,
        starts_at:    toUtcIso(selectedStart) ?? undefined,
        ends_at:      toUtcIso(selectedEnd)   ?? undefined,
        booking_date: bookingType === 'full_day' ? (toUtcIso(selectedDate) ?? undefined) : undefined,
      }),
    onSuccess: (validation) => {
      if (!validation.valid) {
        setSlotError('This slot is no longer available. Please choose another date.')
        return
      }
      navigate('/checkout', {
        state: {
          venueId:         venue.id,
          venueName:       venue.name,
          venueCoverImage: venue.photos?.find((p) => p.is_cover)?.image_url ?? null,
          bookingType,
          startsAt:        validation.effective_starts_at,
          endsAt:          validation.effective_ends_at,
          bookingDate:     toUtcIso(selectedDate),
          quote:           quoteQuery.data,
        },
      })
    },
    onError: (err: any) => setSlotError(err?.message ?? 'Unable to book. Please try again.'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBookingTypeChange(next: BookingType) {
    if (next === bookingType) return
    setBookingType(next)
    setSelectedDate(null); setSelectedStart(null); setSelectedEnd(null); setSlotError(null)
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedStart(null); setSelectedEnd(null); setSlotError(null)
  }

  function handleSlotSelect(start: string, end: string | null) {
    setSelectedStart(start); setSelectedEnd(end); setSlotError(null)
  }

  function resetDate() {
    setSelectedDate(null); setSelectedStart(null); setSelectedEnd(null); setSlotError(null)
  }

  function resetSlot() {
    setSelectedStart(null); setSelectedEnd(null); setSlotError(null)
  }

  function handleBook() {
    setSlotError(null)
    validateMutation.mutate()
  }

  return {
    bookingType, showTypeToggle,
    selectedDate, selectedStart, selectedEnd,
    slotError,
    availability:  availQuery.data,
    availLoading:  availQuery.isLoading,
    availError:    availQuery.isError,
    quote:         quoteQuery.data,
    quoteLoading:  quoteQuery.isLoading,
    quoteError:    quoteQuery.isError,
    isPending:     validateMutation.isPending,
    handleBookingTypeChange,
    handleDateSelect,
    handleSlotSelect,
    resetDate,
    resetSlot,
    handleBook,
  }
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

        {venue && <VenueContent venue={venue} />}
      </main>
    </div>
  )
}

// ─── Content (separate component so hooks run after venue loads) ──────────────

function VenueContent({ venue }: { venue: VenueResponse }) {
  const booking = useVenueBooking(venue)

  return (
    <>
      {/* Gallery */}
      <VenueGallery photos={venue.photos ?? []} venueName={venue.name} />

      {/* Two-column body */}
      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16 xl:gap-20">

        {/* ════ LEFT COLUMN ════════════════════════════════════ */}
        <div className="flex-1 min-w-0">

          {/* 1 · Title / hosted-by / highlights / description */}
          <VenueInfo venue={venue} />

          <Divider />

          {/* 2 · Amenities */}
          <AmenitiesList amenities={venue.amenities ?? []} />

          <Divider />

          {/* 3 · Date / time selection (two-month calendar) */}
          <VenueAvailabilitySection
            venue={venue}
            bookingType={booking.bookingType}
            selectedDate={booking.selectedDate}
            selectedStart={booking.selectedStart}
            selectedEnd={booking.selectedEnd}
            availability={booking.availability}
            availLoading={booking.availLoading}
            availError={booking.availError}
            onDateSelect={booking.handleDateSelect}
            onSlotSelect={booking.handleSlotSelect}
            onClearDate={booking.resetDate}
            onClearSlot={booking.resetSlot}
          />

          <Divider />

          {/* 4 · Reviews */}
          <VenueReviews />

          <Divider />

          {/* 5 · Where you'll be */}
          <VenueWhereYoullBe venue={venue} />

          <Divider />

          {/* 6 · Meet your host */}
          <VenueMeetHost venue={venue} />

          <Divider />

          {/* 7 · Things to know */}
          <VenueThingsToKnow venue={venue} />

          {/* Mobile bottom padding */}
          <div className="h-32 lg:hidden" />
        </div>

        {/* ════ RIGHT COLUMN — sticky reserve card ═════════════ */}
        <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0">
          <div className="lg:sticky lg:top-[82px]">
            <VenueReserveCard
              venue={venue}
              bookingType={booking.bookingType}
              showTypeToggle={booking.showTypeToggle}
              selectedDate={booking.selectedDate}
              selectedStart={booking.selectedStart}
              selectedEnd={booking.selectedEnd}
              quote={booking.quote}
              quoteLoading={booking.quoteLoading}
              quoteError={booking.quoteError}
              slotError={booking.slotError}
              isPending={booking.isPending}
              onBookingTypeChange={booking.handleBookingTypeChange}
              onReset={booking.resetDate}
              onBook={booking.handleBook}
            />

            {/* Trust micro-copy */}
            <div className="mt-5 space-y-3 px-1">
              {[
                { icon: '🛡️', text: 'No charge until the owner accepts your request' },
                { icon: '✓',  text: 'Verified venue on Venue404' },
                { icon: '↩',  text: 'Cancellation terms as per the policy listed below' },
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
  )
}
