import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import {
  createClient,
  bookingEndpoints,
  venueEndpoints,
} from '@venue404/api-client'

import { Navbar } from '../components/Navbar'

import { CancellationPolicyCard } from '../components/venue/CancellationPolicyCard'

import { BookingStatusHero } from '../components/booking/BookingsStatusHero'
import { VenueSummaryCard } from '../components/booking/VenueSummaryCard'
import { BookingInformationCard } from '../components/booking/BookingInformationCard'
import { BookingTimelineCard } from '../components/booking/BookingTimelineCard'
import { PaymentSummaryCard } from '../components/booking/PaymentSummaryCard'
import { BookingActionsCard } from '../components/booking/BookingActionsCard'



function BookingDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>

        <div className="w-full lg:w-[380px]">
          <div className="h-80 rounded-2xl bg-zinc-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()

  const navigate = useNavigate()

  const client = createClient()

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () =>
      bookingEndpoints(client).getBooking(id!),
    enabled: !!id,
  })

  const booking = bookingQuery.data

  const venueQuery = useQuery({
    queryKey: ['venue', booking?.venue_id],
    queryFn: () =>
      venueEndpoints(client).getVenue(
        booking!.venue_id,
      ),
    enabled: !!booking?.venue_id,
  })

  const venue = venueQuery.data

  const isLoading =
    bookingQuery.isLoading ||
    (booking && venueQuery.isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <BookingDetailSkeleton />
      </div>
    )
  }

  if (
    bookingQuery.isError ||
    venueQuery.isError ||
    !booking ||
    !venue
  ) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-6">
            <svg
              className="h-7 w-7 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Booking not found
          </h2>

          <p className="text-sm text-zinc-500 mb-8">
            The booking may have been removed.
          </p>

          <button
            onClick={() => navigate('/my-bookings')}
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>

          Back
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-8">
            <BookingStatusHero booking={booking} />

            <VenueSummaryCard venue={venue} />

            <BookingInformationCard booking={booking} />

            <BookingTimelineCard booking={booking} />

            <CancellationPolicyCard
              policy={venue.cancellation_policy}
            />
          </div>

          <aside className="w-full lg:w-[380px] shrink-0">
            <div className="lg:sticky lg:top-[80px] space-y-6">
              <PaymentSummaryCard booking={booking} />

              <BookingActionsCard booking={booking} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

