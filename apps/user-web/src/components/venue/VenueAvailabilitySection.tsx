import { AvailabilityCalendarDouble } from './AvailabilityCalendar'
import { TimeSlotPicker }             from './TimeSlotPicker'
import type { VenueResponse, AvailabilityResponse, BookingType } from '../../types'
import { formatDate } from '../../utils'

type Props = {
  venue:         VenueResponse
  bookingType:   BookingType
  startDate:     string | null
  endDate:       string | null
  selectedStart: string | null
  selectedEnd:   string | null
  availability:  AvailabilityResponse | undefined
  availLoading:  boolean
  availError:    boolean
  onRangeChange: (start: string | null, end: string | null) => void
  onSlotSelect:  (start: string, end: string | null) => void
  onClear:       () => void
  onClearSlot:   () => void
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function VenueAvailabilitySection({
  venue,
  bookingType,
  startDate,
  endDate,
  selectedStart,
  selectedEnd,
  availability,
  availLoading,
  availError,
  onRangeChange,
  onSlotSelect,
  onClear,
  onClearSlot,
}: Props) {
  const startLabel = startDate ? formatDate(startDate + 'T00:00:00') : null
  const endLabel   = endDate   ? formatDate(endDate   + 'T00:00:00') : null
  const days       = startDate && endDate ? daysBetween(startDate, endDate) + 1 : null

  const headerText =
    startDate && endDate && bookingType === 'full_day'
      ? days === 1
        ? `1 day in ${venue.city}`
        : `${days} days in ${venue.city}`
      : startDate && bookingType === 'full_day'
      ? 'Select end date'
      : startDate && bookingType === 'time_slot'
      ? `1 day in ${venue.city}`
      : bookingType === 'full_day'
      ? 'Select event dates'
      : 'Select event date'

  const subText =
    startDate && endDate && bookingType === 'full_day'
      ? `${startLabel} — ${endLabel}`
      : startDate
      ? startLabel ?? undefined
      : undefined

  return (
    <div>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">{headerText}</h2>
        {subText && <p className="mt-1 text-sm text-zinc-500">{subText}</p>}
        {!startDate && bookingType === 'full_day' && (
          <p className="mt-1 text-sm text-zinc-400">Click a start date, then click an end date</p>
        )}
        {startDate && !endDate && bookingType === 'full_day' && (
          <p className="mt-1 text-sm text-zinc-400">
            Click the same day for a 1-day event or select an end date for multi-day
          </p>
        )}
      </div>

      {/* ── Double-month calendar ─────────────────────────── */}
      <AvailabilityCalendarDouble
        venueId={venue.id}
        startDate={startDate}
        endDate={endDate}
        onRangeChange={onRangeChange}
        onClear={onClear}
      />

      {/* ── Time slot picker (time_slot only) ────────────── */}
      {bookingType === 'time_slot' && startDate && (
        <div className="mt-8 border-t border-zinc-100 pt-8">
          <h3 className="mb-4 text-base font-semibold text-zinc-900">Select your time</h3>

          {availLoading && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {availError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              Failed to load time slots. Please try again.
            </div>
          )}

          {availability && !availLoading && (
            <TimeSlotPicker
              date={startDate}
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
