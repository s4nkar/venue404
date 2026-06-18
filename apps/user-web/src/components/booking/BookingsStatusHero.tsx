import type { BookingOut } from '../../types'

type Props = {
  booking: BookingOut
}

const STATUS_META = {
  requested: {
    label: 'Requested',
    color: 'bg-amber-50 text-amber-700',
    description:
      'Your booking request has been submitted and is awaiting venue approval.',
  },

  owner_accepted: {
    label: 'Accepted',
    color: 'bg-brand-light text-brand',
    description:
      'The venue owner has accepted your booking. Complete payment to secure your reservation.',
  },

  confirmed: {
    label: 'Confirmed',
    color: 'bg-green-50 text-green-700',
    description:
      'Your venue booking has been confirmed.',
  },

  completed: {
    label: 'Completed',
    color: 'bg-green-50 text-green-700',
    description:
      'This event has been completed.',
  },

  hold_expired: {
    label: 'Expired',
    color: 'bg-zinc-100 text-zinc-600',
    description:
      'The booking hold period expired before payment was completed.',
  },

  request_expired: {
    label: 'Expired',
    color: 'bg-zinc-100 text-zinc-600',
    description:
      'The booking request expired before owner action.',
  },

  owner_rejected: {
    label: 'Rejected',
    color: 'bg-zinc-100 text-zinc-600',
    description:
      'The venue owner declined this booking request.',
  },

  user_cancelled: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-700',
    description:
      'This booking was cancelled.',
  },

  admin_cancelled: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-700',
    description:
      'This booking was cancelled.',
  },

  conflict_cancelled: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-700',
    description:
      'This booking was cancelled due to a scheduling conflict.',
  },

  balance_overdue_cancelled: {
    label: 'Cancelled',
    color: 'bg-red-50 text-red-700',
    description:
      'The booking was cancelled because the balance payment became overdue.',
  },
} as const

export function BookingStatusHero({
  booking,
}: Props) {
  const meta =
    STATUS_META[
      booking.status as keyof typeof STATUS_META
    ] ??
    STATUS_META.requested

  return (
    <div className="rounded-2xl border border-zinc-200 shadow-sm bg-white p-8">
      <div className="space-y-6">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${meta.color}`}
          >
            {meta.label}
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            {meta.label}
          </h1>

          <p className="mt-2 text-zinc-600 max-w-2xl">
            {meta.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Booking ID
            </div>

            <div className="mt-1 text-sm font-medium text-zinc-900 break-all">
              {booking.id}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Payment Status
            </div>

            <div className="mt-1 text-sm font-medium text-zinc-900 capitalize">
              {booking.payment_status.replace(/_/g, ' ')}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Venue ID
            </div>

            <div className="mt-1 text-sm font-medium text-zinc-900 break-all">
              {booking.venue_id}
            </div>
          </div>
        </div>

        {booking.confirmed_at && (
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
            <div className="text-sm font-medium text-green-800">
              Booking confirmed
            </div>

            <div className="text-xs text-green-700 mt-1">
              Confirmation recorded on{' '}
              {new Date(
                booking.confirmed_at,
              ).toLocaleString('en-IN')}
            </div>
          </div>
        )}

        {booking.cancelled_at && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <div className="text-sm font-medium text-red-800">
              Booking cancelled
            </div>

            <div className="text-xs text-red-700 mt-1">
              Cancellation recorded on{' '}
              {new Date(
                booking.cancelled_at,
              ).toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

