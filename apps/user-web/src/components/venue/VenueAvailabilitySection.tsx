import { AvailabilityCalendarDouble } from './AvailabilityCalendar'
import { TimeSlotPicker }             from './TimeSlotPicker'
import type { VenueResponse, AvailabilityResponse, BookingType } from '../../types'
import { formatDate } from '../../utils'

type Props = {
  venue:         VenueResponse
  bookingType:   BookingType
  selectedDate:  string | null
  selectedStart: string | null
  selectedEnd:   string | null
  availability:  AvailabilityResponse | undefined
  availLoading:  boolean
  availError:    boolean
  onDateSelect:  (date: string) => void
  onSlotSelect:  (start: string, end: string | null) => void
  onClearDate:   () => void
  onClearSlot:   () => void
}

export function VenueAvailabilitySection({
  venue,
  bookingType,
  selectedDate,
  selectedStart,
  selectedEnd,
  availability,
  availLoading,
  availError,
  onDateSelect,
  onSlotSelect,
  onClearDate,
  onClearSlot,
}: Props) {
  const dateLabel = selectedDate ? formatDate(selectedDate + 'T00:00:00') : null

  return (
    <div>
      {/* ── Section header ──────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">
          {selectedDate ? `1 day in ${venue.city}` : 'Select event date'}
        </h2>
        {dateLabel && (
          <p className="mt-1 text-sm text-zinc-500">{dateLabel}</p>
        )}
      </div>

      {/* ── Double-month calendar ────────────────────────────── */}
      <AvailabilityCalendarDouble
        venueId={venue.id}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        onClear={onClearDate}
      />

      {/* ── Time slot picker (only for time_slot type) ──────── */}
      {bookingType === 'time_slot' && selectedDate && (
        <div className="mt-8 border-t border-zinc-100 pt-8">
          <h3 className="mb-4 text-base font-semibold text-zinc-900">Select time slot</h3>

          {availLoading && (
            <div className="space-y-2.5">
              <div className="h-4 w-28 bg-zinc-100 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {availError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              Failed to load time slots. Please try again.
            </div>
          )}

          {availability && !availLoading && (
            <TimeSlotPicker
              date={selectedDate}
              availability={availability}
              venueConfig={venue}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              onSelect={onSlotSelect}
              onClear={onClearSlot}
            />
          )}
        </div>
      )}
    </div>
  )
}
