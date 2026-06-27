import type { BookingOut } from '../../types'

import { formatDate, formatTime } from '../../utils'

type Props = {
  booking: BookingOut
}

export function BookingInformationCard({ booking }: Props) {
  const bookingType = booking.booking_type === 'full_day' ? 'Full Day' : 'Time Slot'

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Booking Details
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Booking Type" value={bookingType} />
          <Field label="Guests" value={booking.guest_count.toString()} />
          <Field label="Event Date" value={formatDate(booking.starts_at)} />
          <Field label="Start Time" value={formatTime(booking.starts_at)} />
          <Field label="End Time" value={formatTime(booking.ends_at)} />
          <Field label="Booking Status" value={formatStatus(booking.status)} />

          {booking.event_type && <Field label="Event Type" value={booking.event_type} />}

          <Field label="Payment Status" value={formatStatus(booking.payment_status)} />

          {booking.balance_due_date && (
            <Field label="Balance Due Date" value={formatDate(booking.balance_due_date)} />
          )}

          {booking.owner_action_deadline && (
            <Field
              label="Owner Action Deadline"
              value={formatDate(booking.owner_action_deadline)}
            />
          )}
        </div>

        {booking.user_notes && (
          <div className="border-t border-zinc-100 pt-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Notes
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
              {booking.user_notes}
            </p>
          </div>
        )}

        {booking.owner_notes && (
          <div className="border-t border-zinc-100 pt-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Venue Notes
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
              {booking.owner_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 font-medium text-zinc-900">{value}</div>
    </div>
  )
}

function formatStatus(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
