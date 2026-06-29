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

function PrimaryActionButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="press w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm outline-none transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2"
    >
      {children}
    </button>
  )
}

function DestructiveActionButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
    >
      {children}
    </button>
  )
}

export function BookingActionsCard({ booking }: Props) {
  const navigate = useNavigate()
  const [cancelOpen, setCancelOpen] = useState(false)

  const isFullPaymentRequired = booking.advance_pct === 100 || booking.balance_due_paise === 0

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
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Actions
          </div>

          {isCancelled && <Alert variant="destructive">This booking has been cancelled.</Alert>}
          {isCompleted && <Alert variant="success">Event completed.</Alert>}

          {/* Advance Payment Button */}
          {showAdvancePayment && (
            <PrimaryActionButton onClick={() => navigate(`/payment/${booking.id}?type=advance`)}>
              {isFullPaymentRequired
                ? `Pay Full Amount • ${booking.display?.quoted_price || ''}`
                : `Pay Advance • ${booking.display?.advance_due || ''}`}
            </PrimaryActionButton>
          )}

          {/* Balance Payment Button */}
          {showBalancePayment && (
            <PrimaryActionButton onClick={() => navigate(`/payment/${booking.id}?type=balance`)}>
              {`Pay Remaining Balance • ${booking.display?.balance_due || ''}`}
            </PrimaryActionButton>
          )}

          {/* Cancel Buttons */}
          {(showAdvancePayment || showBalancePayment) && (
            <DestructiveActionButton onClick={() => setCancelOpen(true)}>
              Cancel Booking
            </DestructiveActionButton>
          )}

          {booking.status === 'requested' && (
            <DestructiveActionButton onClick={() => setCancelOpen(true)}>
              Cancel Request
            </DestructiveActionButton>
          )}

          {booking.status === 'confirmed' && !showBalancePayment && (
            <DestructiveActionButton onClick={() => setCancelOpen(true)}>
              Cancel Booking
            </DestructiveActionButton>
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
