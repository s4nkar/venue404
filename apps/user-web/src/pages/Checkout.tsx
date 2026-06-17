import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import { Logo } from '@venue404/ui'
import { formatDate, formatTime, formatPrice } from '../utils'
import type { PricingQuote, BookingType } from '../types'
import { QuoteBreakdown } from '../components/venue/QuoteBreakdown'

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckoutState = {
  venueId:         string
  venueName:       string
  venueCoverImage: string | null
  bookingType:     BookingType
  startsAt:        string
  endsAt:          string
  bookingDate:     string
  quote:           PricingQuote
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700 mb-1.5">
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'

// ─── Booking summary sidebar card ─────────────────────────────────────────────

function BookingSummaryCard({
  state,
  guestCount,
}: {
  state: CheckoutState
  guestCount: number
}) {
  const { venueName, venueCoverImage, bookingType, startsAt, endsAt, bookingDate, quote } = state

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Venue image */}
      <div className="relative h-48 bg-zinc-100">
        {venueCoverImage ? (
          <img src={venueCoverImage} alt={venueName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Venue name */}
        <h3 className="text-base font-semibold text-zinc-900 leading-snug">{venueName}</h3>

        {/* Date / time row */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(bookingDate)}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {bookingType === 'time_slot'
              ? `${formatTime(startsAt)} – ${formatTime(endsAt)}`
              : 'Full day'}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {guestCount} guest{guestCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-zinc-100" />

        {/* Price breakdown */}
        <QuoteBreakdown source="quote" quote={quote} />

        {/* Advance callout */}
        <div className="mt-4 rounded-xl bg-brand-light border border-brand-light-strong px-4 py-3">
          <p className="text-sm font-semibold text-brand">
            {formatPrice(quote.advance_due_paise)} due now
          </p>
          <p className="text-xs text-brand-secondary mt-0.5">
            After owner accepts · remaining {formatPrice(quote.balance_due_paise)} paid later
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Checkout() {
  const location = useLocation()
  const navigate = useNavigate()
  const client   = createClient()

  const state = location.state as CheckoutState | undefined
  const [guestCount, setGuestCount] = useState(1)
  const [eventType,  setEventType]  = useState('')
  const [userNotes,  setUserNotes]  = useState('')

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
    onSuccess: (booking) => navigate(`/bookings/${booking.id}`),
  })

  // ── Guard: no state ────────────────────────────────────────────────────
  if (!state) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="h-14 w-14 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
          <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">No booking details found</h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-sm">
          Please start your booking from a venue page.
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          Browse venues
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/60">

      {/* ── Minimal checkout navbar ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/">
            <Logo />
          </Link>
          {/* Step label */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Confirm your request
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* ── Two-column body ──────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10 xl:gap-14 items-start">

          {/* ── Left: form ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">Request to book</h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                No payment taken now — the owner will confirm your request first.
              </p>
            </div>

            {/* ── Guest count ─────────────────────────────────── */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900">Your booking</h2>

              <div>
                <FieldLabel htmlFor="guest_count">Number of guests</FieldLabel>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
                    className="h-9 w-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
                    aria-label="Decrease guests"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    id="guest_count"
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 text-center rounded-xl border border-zinc-200 px-2 py-2 text-base font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGuestCount((n) => n + 1)}
                    className="h-9 w-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
                    aria-label="Increase guests"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Event details ────────────────────────────────── */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Event details</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Optional — helps the owner prepare for your event</p>
              </div>

              <div>
                <FieldLabel htmlFor="event_type">Event type</FieldLabel>
                <input
                  id="event_type"
                  type="text"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="e.g. Birthday party, Corporate offsite, Wedding"
                  className={inputCls}
                />
              </div>

              <div>
                <FieldLabel htmlFor="user_notes">Notes for the owner</FieldLabel>
                <textarea
                  id="user_notes"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows={4}
                  placeholder="Anything the owner should know — setup requirements, special requests, access needs…"
                  className={inputCls}
                />
              </div>
            </div>

            {/* ── What happens next ────────────────────────────── */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">What happens next</h2>
              <ol className="space-y-4">
                {[
                  {
                    n: '1',
                    title: 'Request sent',
                    desc: 'The venue owner will be notified of your booking request.',
                  },
                  {
                    n: '2',
                    title: 'Owner confirms',
                    desc: `The owner has ${state.quote ? '48' : '—'} hours to accept or decline.`,
                  },
                  {
                    n: '3',
                    title: 'Pay the advance',
                    desc: `Once accepted, you'll pay ${formatPrice(state.quote.advance_due_paise)} to confirm your slot.`,
                  },
                  {
                    n: '4',
                    title: 'Balance due later',
                    desc: `The remaining ${formatPrice(state.quote.balance_due_paise)} is due before your event date.`,
                  },
                ].map((item) => (
                  <li key={item.n} className="flex gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.n}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Error */}
            {createBooking.isError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Something went wrong. Please try again.
              </div>
            )}

            {/* CTA — visible on mobile here, hidden on lg (sidebar has it) */}
            <div className="lg:hidden">
              <button
                onClick={() => createBooking.mutate()}
                disabled={createBooking.isPending}
                className="w-full rounded-xl bg-brand py-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {createBooking.isPending ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> Sending request…</span>
                ) : (
                  'Request to Book'
                )}
              </button>
              <p className="text-xs text-zinc-400 text-center mt-2">No charge until owner accepts</p>
            </div>
          </div>

          {/* ── Right: sticky summary ─────────────────────────── */}
          <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 lg:sticky lg:top-[80px]">
            <BookingSummaryCard state={state} guestCount={guestCount} />

            {/* CTA — lg only */}
            <div className="hidden lg:block mt-4">
              <button
                onClick={() => createBooking.mutate()}
                disabled={createBooking.isPending}
                className="w-full rounded-xl bg-brand py-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {createBooking.isPending ? (
                  <span className="flex items-center justify-center gap-2"><Spinner /> Sending request…</span>
                ) : (
                  'Request to Book'
                )}
              </button>
              <p className="text-xs text-zinc-400 text-center mt-2">
                No charge until owner accepts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}