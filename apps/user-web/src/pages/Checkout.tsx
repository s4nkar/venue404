import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import { Button, Card, ErrorState } from '@venue404/ui'
import { formatDate, formatTime } from '../utils'
import type { PricingQuote, BookingType } from '../types'
import { QuoteBreakdown } from '../components/venue/QuoteBreakdown'

type CheckoutState = {
  venueId: string
  venueName: string
  venueCoverImage: string | null
  bookingType: BookingType
  startsAt: string
  endsAt: string
  bookingDate: string
  quote: PricingQuote
}

export default function Checkout() {
  const location = useLocation()
  const navigate = useNavigate()
  const client = createClient()

  const state = location.state as CheckoutState | undefined

  const [guestCount, setGuestCount] = useState(1)
  const [eventType, setEventType] = useState('')
  const [userNotes, setUserNotes] = useState('')

  const createBooking = useMutation({
    mutationFn: () =>
      bookingEndpoints(client).createBooking({
        venue_id: state!.venueId,
        venue_name: state!.venueName,
        venue_cover_image: state!.venueCoverImage,
        booking_type: state!.bookingType,
        starts_at: state!.startsAt,
        ends_at: state!.endsAt,
        booking_date: state!.bookingDate,
        guest_count: guestCount,
        event_type: eventType.trim() || null,
        user_notes: userNotes.trim() || null,
      }),
    onSuccess: (booking) => {
      navigate(`/bookings/${booking.id}`)
    },
  })

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState
          title="No booking details found"
          message="Please start your booking from the venue page."
          action={
            <Button onClick={() => navigate('/')}>Browse venues</Button>
          }
        />
      </div>
    )
  }

  const { venueName, venueCoverImage, bookingType, startsAt, endsAt, bookingDate, quote } = state

  const balanceDuePaise = quote.balance_due_paise

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Request booking</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review your details and send a booking request to the venue owner. No payment is taken now.
        </p>
      </div>

      {/* Venue summary */}
      <Card className="p-6">
        <div className="flex gap-4">
          {venueCoverImage ? (
            <img
              src={venueCoverImage}
              alt={venueName}
              className="h-20 w-28 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="h-20 w-28 rounded-xl bg-zinc-100 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900 truncate">{venueName}</h2>
            <p className="mt-1 text-sm text-zinc-500">{formatDate(bookingDate)}</p>
            {bookingType === 'time_slot' ? (
              <p className="text-sm text-zinc-500">
                {formatTime(startsAt)} – {formatTime(endsAt)}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Full day</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="guest_count" className="block text-sm font-medium text-zinc-700">
              Guests
            </label>
            <input
              id="guest_count"
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-32 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Event details */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Event details (optional)</h2>

        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-zinc-700">
            Event type
          </label>
          <input
            id="event_type"
            type="text"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="e.g. Birthday party, Corporate offsite"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="user_notes" className="block text-sm font-medium text-zinc-700">
            Notes for the owner
          </label>
          <textarea
            id="user_notes"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            rows={4}
            placeholder="Anything the owner should know about your event"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Quote */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Price summary</h2>
        <QuoteBreakdown source="quote" quote={quote} loading={false} />

        {balanceDuePaise > 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            A balance will be due closer to your event date, once the owner accepts and the advance is paid.
          </p>
        )}
      </Card>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        This sends a request to the venue owner. You won't be charged until the owner accepts and you pay the
        advance.
      </div>

      {createBooking.isError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          Something went wrong while sending your request. Please try again.
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={() => createBooking.mutate()}
        disabled={createBooking.isPending}
      >
        {createBooking.isPending ? 'Sending request…' : 'Request booking'}
      </Button>
    </div>
  )
}