import { useNavigate } from 'react-router-dom'

import type { BookingOut } from '../../types'

import { CancellationPreviewModal } from './CancellationPreviewModal'
import { Alert } from '@venue404/ui'
import { useState } from 'react'

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
  const navigate = useNavigate()

  const [cancelOpen, setCancelOpen] = useState(false)

  const isFullPaymentRequired =
    booking.advance_pct === 100 || booking.balance_due_paise === 0

  // These conditions read live server state, so once the webhook flips the
  // booking to fully_paid / confirmed the buttons disappear automatically —
  // no local flag racing the async webhook.
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

          {isCancelled && <Alert variant="destructive">This booking has been cancelled.</Alert>}
          {isCompleted && <Alert variant="success">Event completed.</Alert>}

          {/* Advance Payment Button */}
          {showAdvancePayment && (
            <button
              onClick={() => navigate(`/payment/${booking.id}?type=advance`)}
              className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              {isFullPaymentRequired
                ? `Pay Full Amount • ${booking.display?.quoted_price || ''}`
                : `Pay Advance • ${booking.display?.advance_due || ''}`}
            </button>
          )}

          {/* Balance Payment Button */}
          {showBalancePayment && (
            <button
              onClick={() => navigate(`/payment/${booking.id}?type=balance`)}
              className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              {`Pay Remaining Balance • ${booking.display?.balance_due || ''}`}
            </button>
          )}

          {/* Cancel Buttons */}
          {(showAdvancePayment || showBalancePayment) && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {booking.status === 'requested' && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          )}

          {booking.status === 'confirmed' && !showBalancePayment && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Cancel Booking
            </button>
          )}

          {booking.status === 'owner_rejected' && (
            <Alert variant="warning">This booking request was declined by the venue owner.</Alert>
          )}

          {(booking.status === 'hold_expired' || booking.status === 'request_expired') && (
            <Alert variant="warning">This booking has expired.</Alert>
          )}

          {/* Fully paid confirmation */}
          {booking.payment_status === 'fully_paid' && booking.status === 'confirmed' && (
            <Alert variant="success">Payment complete — this booking is fully paid.</Alert>
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
