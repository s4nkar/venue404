import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { createClient, bookingEndpoints, paymentEndpoints } from '@venue404/api-client'
import { Logo, Alert } from '@venue404/ui'

import { AppNavbar } from '../components/shared/AppNavbar'
import { StripePaymentForm } from '../components/StripePaymentForm'
import { QuoteBreakdown } from '../components/venue/QuoteBreakdown'

import { formatDate, formatTime, formatPrice } from '../utils'
import type { BookingOut } from '../types'

type PaymentType = 'advance' | 'balance'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Booking summary sidebar card ────────────────────────────────────────────
function BookingSummaryCard({ booking }: { booking: BookingOut }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Venue image */}
      <div className="relative h-48 bg-zinc-100">
        {booking.venue_cover_photo_url ? (
          <img src={booking.venue_cover_photo_url} alt={booking.venue_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-base font-semibold text-zinc-900 leading-snug">{booking.venue_name}</h3>

        {/* Date / time row */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(booking.starts_at)}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {booking.booking_type === 'time_slot'
              ? `${formatTime(booking.starts_at)} – ${formatTime(booking.ends_at)}`
              : 'Full day'}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {booking.guest_count} guest{booking.guest_count !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="my-5 border-t border-zinc-100" />

        <QuoteBreakdown
          source="booking"
          display={booking.display}
          balanceDueDate={booking.balance_due_date}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Payment() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const client = createClient()

  const paymentType = (searchParams.get('type') as PaymentType) || 'advance'

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingEndpoints(client).getBooking(bookingId!),
    enabled: !!bookingId,
  })

  const booking = bookingQuery.data as BookingOut | undefined

  // Is this payment actually still due? Guards against stale state: if the
  // webhook already flipped the booking past this payment, we bounce to the
  // result page instead of letting a stale "Pay" button stay mounted.
  const isAdvanceDue =
    booking != null &&
    booking.status === 'owner_accepted' &&
    booking.advance_due_paise > 0

  const isBalanceDue =
    booking != null &&
    booking.status === 'confirmed' &&
    booking.payment_status === 'advance_paid' &&
    booking.balance_due_paise > 0

  const isPaymentDue = paymentType === 'balance' ? isBalanceDue : isAdvanceDue

  // Create the PaymentIntent up-front (only when a payment is genuinely due).
  const intentQuery = useQuery({
    queryKey: ['payment-intent', bookingId, paymentType],
    queryFn: () =>
      paymentEndpoints(client).createPaymentIntent(bookingId!, {
        payment_type: paymentType,
      }),
    enabled: !!bookingId && !!booking && isPaymentDue,
    retry: false,
  })

  // Redirect to the result page if the requested payment is already settled —
  // the root cause of the "button still showing" bug is mounting a pay surface
  // on stale booking state, so we never do that here.
  useEffect(() => {
    if (booking && !isPaymentDue) {
      navigate(`/payment/result?booking_id=${booking.id}`, { replace: true })
    }
  }, [booking, isPaymentDue, navigate])

  if (bookingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <h2 className="text-xl font-semibold text-zinc-900">Preparing your payment…</h2>
            <p className="text-sm text-zinc-500 max-w-xs">
              We're loading your booking details.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="min-h-screen bg-zinc-50/60">
        <AppNavbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Booking not found</h2>
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

  const isFullPayment = booking.advance_pct === 100
  const amountDuePaise =
    paymentType === 'balance' ? booking.balance_due_paise : booking.advance_due_paise
  const payLabel = formatPrice(amountDuePaise)

  const heading =
    paymentType === 'balance'
      ? 'Pay your balance'
      : isFullPayment
        ? 'Complete your payment'
        : 'Pay the token advance'

  const subheading =
    paymentType === 'balance'
      ? 'Settle the remaining amount to complete your booking.'
      : 'Pay the advance to confirm your slot. The balance is due later.'

  return (
    <div className="min-h-screen bg-zinc-50/60">
      {/* ── Minimal payment navbar ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Secure payment
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
          {/* ── Left: payment form ──────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">{heading}</h1>
              <p className="mt-1.5 text-sm text-zinc-500">{subheading}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900">Amount due</span>
                <span className="text-2xl font-bold text-zinc-900">{payLabel}</span>
              </div>

              {intentQuery.isLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
                  <Spinner /> Loading secure payment…
                </div>
              )}

              {intentQuery.isError && (
                <>
                  <Alert variant="destructive">
                    We couldn't start your payment.{' '}
                    {(intentQuery.error as any)?.message || 'Please try again.'}
                  </Alert>
                  <button
                    onClick={() => intentQuery.refetch()}
                    className="w-full rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Try again
                  </button>
                </>
              )}

              {intentQuery.data?.client_secret && (
                <StripePaymentForm
                  clientSecret={intentQuery.data.client_secret}
                  payLabel={payLabel}
                  onSuccess={() =>
                    navigate(`/payment/result?booking_id=${booking.id}`)
                  }
                  onCancel={() => navigate(`/bookings/${booking.id}`)}
                />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Payments are encrypted and processed securely by Stripe.
            </div>
          </div>

          {/* ── Right: sticky summary ─────────────────────────── */}
          <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 lg:sticky lg:top-[80px]">
            <BookingSummaryCard booking={booking} />
          </div>
        </div>
      </div>
    </div>
  )
}
