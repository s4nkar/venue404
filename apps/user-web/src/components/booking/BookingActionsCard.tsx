import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../../lib/queryClient'


import { createClient, paymentEndpoints } from '@venue404/api-client'

import type { BookingOut, PaymentIntentResponse } from '../../types'

import { CancellationPreviewModal } from './CancellationPreviewModal'
import { PaymentForm } from '../PaymentForm'
import { Alert } from '@venue404/ui'

type Props = {
  booking: BookingOut
}

const CANCELLED_STATUSES = [
  'user_cancelled',
  'admin_cancelled',
  'conflict_cancelled',
  'balance_overdue_cancelled',
]

export function BookingActionsCard({ booking }: Props) {
  const client = createClient()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const paymentMutation = useMutation({
    mutationFn: () => paymentEndpoints(client).createPaymentIntent(booking.id),

    onSuccess: async (payment) => {
      const response = payment as PaymentIntentResponse
      if (!response.client_secret) return

      // Keep old redirect behavior as fallback
      window.location.href = `/payment/result?booking_id=${booking.id}`
    },
  })

  const showAdvancePayment = booking.status === 'owner_accepted'

  const showBalancePayment =
    booking.status === 'confirmed' &&
    booking.payment_status === 'advance_paid' &&
    booking.balance_due_paise > 0

  const isCancelled = CANCELLED_STATUSES.includes(booking.status)

  const isCompleted = booking.status === 'completed'

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 shadow-sm bg-white p-6">
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Actions
          </div>

          {/* Cancelled */}
          {isCancelled && <Alert variant="destructive">This booking has been cancelled.</Alert>}

          {/* Completed */}
          {isCompleted && <Alert variant="success">Event completed.</Alert>}

          {/* Advance Payment */}
          {showAdvancePayment && !showPaymentForm && !paymentSuccess && (
            <>
              <button
                onClick={() => setShowPaymentForm(true)}
                disabled={paymentMutation.isPending}
                className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {paymentMutation.isPending ? 'Creating Payment...' : 'Pay Advance'}
              </button>

              <button
                onClick={() => setCancelOpen(true)}
                className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            </>
          )}

          {/* Stripe Elements Form */}
          {showAdvancePayment && showPaymentForm && (
            <PaymentForm
              booking={booking}
              onSuccess={() => {
                setPaymentSuccess(true)
                setShowPaymentForm(false)
                queryClient.invalidateQueries({ queryKey: ['booking', booking.id] })

                // window.location.href = `/payment/result?booking_id=${booking.id}`
              }}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}

          {/* Payment Success Message */}
          {paymentSuccess && (
            <Alert variant="success">Payment successful! Booking confirmed.</Alert>
          )}

          {/* Balance Payment */}
          {showBalancePayment && (
            <>
              <button className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors">
                Pay Remaining Balance
              </button>

              <button
                onClick={() => setCancelOpen(true)}
                className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            </>
          )}

          {/* Requested */}
          {booking.status === 'requested' && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          )}

          {/* Generic confirmed state */}
          {booking.status === 'confirmed' && !showBalancePayment && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {/* Rejected */}
          {booking.status === 'owner_rejected' && (
            <Alert variant="warning">This booking request was declined by the venue owner.</Alert>
          )}

          {/* Expired */}
          {(booking.status === 'hold_expired' || booking.status === 'request_expired') && (
            <Alert variant="warning">This booking has expired.</Alert>
          )}
        </div>
      </div>

      <CancellationPreviewModal
        booking={booking}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </>
  )
}
