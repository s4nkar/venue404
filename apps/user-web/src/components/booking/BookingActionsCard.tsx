import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import {
  createClient,
  paymentEndpoints,
} from '@venue404/api-client'

import type {
  BookingOut,
  PaymentIntentResponse,
} from '../../types'

import { CancellationPreviewModal } from './CancellationPreviewModal'

type Props = {
  booking: BookingOut
}

const CANCELLED_STATUSES = [
  'user_cancelled',
  'admin_cancelled',
  'conflict_cancelled',
  'balance_overdue_cancelled',
]

export function BookingActionsCard({
  booking,
}: Props) {
  const client = createClient()

  const [cancelOpen, setCancelOpen] =
    useState(false)

  const paymentMutation =
    useMutation({
      mutationFn: () =>
        paymentEndpoints(client)
          .createPaymentIntent(
            booking.id,
          ),

      onSuccess: async (
        payment,
      ) => {
        const response =
          payment as PaymentIntentResponse

        if (
          !response.client_secret
        ) {
          return
        }

        /**
         * Stripe integration
         *
         * Replace with:
         *
         * await stripe.confirmPayment(...)
         *
         * once Elements is wired.
         */

        window.location.href =
          `/payment/result?booking_id=${booking.id}`
      },
    })

  const showAdvancePayment =
    booking.status ===
    'owner_accepted'

  const showBalancePayment =
    booking.status ===
      'confirmed' &&
    booking.payment_status ===
      'advance_paid' &&
    booking.balance_due_paise > 0

  const isCancelled =
    CANCELLED_STATUSES.includes(
      booking.status,
    )

  const isCompleted =
    booking.status ===
    'completed'

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 shadow-sm bg-white p-6">
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Actions
          </div>

          {/* Cancelled */}
          {isCancelled && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-4">
              <p className="text-sm text-zinc-600">
                This booking has been
                cancelled.
              </p>
            </div>
          )}

          {/* Completed */}
          {isCompleted && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-4">
              <p className="text-sm text-zinc-600">
                Event completed.
              </p>
            </div>
          )}

          {/* Advance Payment */}
          {showAdvancePayment && (
            <>
              <button
                onClick={() =>
                  paymentMutation.mutate()
                }
                disabled={
                  paymentMutation.isPending
                }
                className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {paymentMutation.isPending
                  ? 'Creating Payment...'
                  : 'Pay Advance'}
              </button>

              <button
                onClick={() =>
                  setCancelOpen(true)
                }
                className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            </>
          )}

          {/* Confirmed */}
          {showBalancePayment && (
            <>
              <button
                className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                Pay Remaining Balance
              </button>

              <button
                onClick={() =>
                  setCancelOpen(true)
                }
                className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            </>
          )}

          {/* Requested */}
          {booking.status ===
            'requested' && (
            <button
              onClick={() =>
                setCancelOpen(true)
              }
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          )}

          {/* Generic confirmed state */}
          {booking.status ===
            'confirmed' &&
            !showBalancePayment && (
              <button
                onClick={() =>
                  setCancelOpen(true)
                }
                className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            )}

          {/* Rejected */}
          {booking.status ===
            'owner_rejected' && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-4">
              <p className="text-sm text-zinc-600">
                This booking request
                was declined by the
                venue owner.
              </p>
            </div>
          )}

          {/* Expired */}
          {(booking.status ===
            'hold_expired' ||
            booking.status ===
              'request_expired') && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-4">
              <p className="text-sm text-zinc-600">
                This booking has
                expired.
              </p>
            </div>
          )}
        </div>
      </div>

      <CancellationPreviewModal
        booking={booking}
        open={cancelOpen}
        onClose={() =>
          setCancelOpen(false)
        }
      />
    </>
  )
}

