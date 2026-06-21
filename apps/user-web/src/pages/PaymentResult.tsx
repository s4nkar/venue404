import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import { Navbar } from '../components/Navbar'
import { Card, Button, LoadingScreen, ErrorState } from '@venue404/ui'
import { formatTime, formatDate } from '../utils'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const client = createClient()
  const bookingId = searchParams.get('booking_id')

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingEndpoints(client).getBooking(bookingId!),
    enabled: !!bookingId,
    // Poll every 2 seconds if status is still owner_accepted or payment status is unpaid
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 2000
      if (
        data.status === 'owner_accepted' ||
        data.status === 'requested' ||
        data.payment_status === 'unpaid' ||
        (data.status === 'confirmed' && data.payment_status === 'pending')
      ) {
        return 2000
      }
      return false
    },
  })

  // Redirect if no booking ID
  useEffect(() => {
    if (!bookingId) {
      navigate('/')
    }
  }, [bookingId, navigate])

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <h2 className="text-xl font-semibold text-zinc-900">Securing your time slot…</h2>
            <p className="text-sm text-zinc-500 max-w-xs">
              We're verifying your transaction with Stripe and securing your venue block. This should only take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-16">
          <ErrorState
            title="Unable to verify payment"
            message="We had trouble checking your booking status. Please verify your bookings history."
            action={
              <div className="flex gap-2">
                <Button onClick={() => void refetch()} variant="primary">
                  Retry Verification
                </Button>
                <Button onClick={() => navigate('/my-bookings')} variant="secondary">
                  Go to My Bookings
                </Button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed'
  const isFullyPaid = booking.payment_status === 'fully_paid'
  const isCancelled = booking.status === 'conflict_cancelled' || booking.status === 'user_cancelled'

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          {isCancelled ? (
            <>
              {/* Failure State */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">Slot unavailable</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Another user confirmed this slot right before your payment completed. Any funds deducted have been automatically refunded to your original payment method.
              </p>
            </>
          ) : isConfirmed || isFullyPaid ? (
            <>
              {/* Success State */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-6">
                <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">
                {isFullyPaid ? 'Booking Fully Paid!' : 'Booking Confirmed!'}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Your payment was processed successfully. {isFullyPaid ? 'You are all set!' : 'Your venue reservation is now locked in.'}
              </p>

              {/* Booking Details Summary */}
              <div className="mt-8 border-t border-b border-zinc-100 py-6 text-left space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Venue</span>
                  <span className="text-zinc-900 font-semibold">{booking.venue_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Location</span>
                  <span className="text-zinc-900 font-semibold">{booking.venue_city}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Date</span>
                  <span className="text-zinc-900 font-semibold">
                    {formatDate(booking.starts_at)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Time</span>
                  <span className="text-zinc-900 font-semibold">
                    {formatTime(booking.starts_at)} – {formatTime(booking.ends_at)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-zinc-50">
                  <span className="text-zinc-500 font-medium">Amount Paid</span>
                  <span className="text-brand font-bold">
                    {booking.display.quoted_price}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Webhook Polling Fallback */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-6">
                <svg className="h-8 w-8 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">Payment pending confirmation</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Stripe is still processing your transaction. This page will update automatically.
              </p>
            </>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate(`/bookings/${booking.id}`)}
              variant="primary"
              className="w-full sm:w-auto"
            >
              View Booking Timeline
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
