import { useMemo } from 'react'
import { formatTime } from '../../utils'
import type { AvailabilityResponse, VenueResponse } from '../../types'

type VenueConfig = Pick<
  VenueResponse,
  'slot_interval_minutes' | 'min_booking_duration_minutes' | 'max_booking_duration_minutes'
>

type Props = {
  date: string                   // YYYY-MM-DD, used to build full ISO datetimes
  availability: AvailabilityResponse
  venueConfig: VenueConfig
  selectedStart: string | null   // ISO datetime
  selectedEnd: string | null     // ISO datetime
  onSelect: (start: string, end: string) => void
  onClear: () => void
}

/** Convert HH:MM:SS or ISO datetime to minutes-since-midnight */
function toMinutes(timeStr: string): number {
  const t = timeStr.length <= 8 ? timeStr : timeStr.slice(11, 19)
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Build ISO datetime string for a given date + minutes-since-midnight */
function minutesToISO(date: string, minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${date}T${h}:${m}:00`
}

/** Duration label e.g. "2h 30m" */
function durationLabel(startMinutes: number, endMinutes: number): string {
  const diff = endMinutes - startMinutes
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function TimeSlotPicker({
  date,
  availability,
  venueConfig,
  selectedStart,
  selectedEnd,
  onSelect,
  onClear,
}: Props) {
  const { operating_window, blocked_slots = [] } = availability
  const { slot_interval_minutes, min_booking_duration_minutes, max_booking_duration_minutes } = venueConfig

  // All possible slot start times
  const allSlots = useMemo<number[]>(() => {
    if (!operating_window.is_available || !operating_window.opens_at || !operating_window.closes_at) {
      return []
    }
    const openMin  = toMinutes(operating_window.opens_at)
    const closeMin = toMinutes(operating_window.closes_at)
    const slots: number[] = []
    for (let m = openMin; m < closeMin; m += slot_interval_minutes) {
      slots.push(m)
    }
    return slots
  }, [operating_window, slot_interval_minutes])

  // Set of blocked minute ranges for fast lookup
  const blockedRanges = useMemo(
    () => blocked_slots.map((s) => ({ start: toMinutes(s.starts_at), end: toMinutes(s.ends_at) })),
    [blocked_slots]
  )

  function isBlocked(startMin: number, endMin: number): boolean {
    return blockedRanges.some((r) => startMin < r.end && endMin > r.start)
  }

  const selectedStartMin = selectedStart ? toMinutes(selectedStart) : null
  const selectedEndMin   = selectedEnd   ? toMinutes(selectedEnd)   : null

  const closeMin = operating_window.closes_at ? toMinutes(operating_window.closes_at) : 0

  // When a start is selected, compute which end slots are valid
  const validEndSlots = useMemo<Set<number>>(() => {
    if (selectedStartMin == null) return new Set()
    const valid = new Set<number>()
    for (
      let m = selectedStartMin + min_booking_duration_minutes;
      m <= selectedStartMin + max_booking_duration_minutes && m <= closeMin;
      m += slot_interval_minutes
    ) {
      if (!isBlocked(selectedStartMin, m)) valid.add(m)
    }
    return valid
  }, [selectedStartMin, min_booking_duration_minutes, max_booking_duration_minutes, closeMin, slot_interval_minutes, blockedRanges])

  function handleSlotClick(minutes: number) {
    if (selectedStartMin == null) {
      // First click — set start
      onSelect(minutesToISO(date, minutes), minutesToISO(date, minutes + min_booking_duration_minutes))
      // Note: onSelect will be called again when end is finalized; we call with provisional end here
      // so parent can show the start visually. The parent ignores end until user clicks an end slot.
    } else if (selectedEndMin == null || minutes <= selectedStartMin) {
      // Clicking before or on the start — reset start
      onClear()
      onSelect(minutesToISO(date, minutes), minutesToISO(date, minutes + min_booking_duration_minutes))
    } else {
      // Second click — set end (only if valid)
      if (validEndSlots.has(minutes)) {
        onSelect(minutesToISO(date, selectedStartMin), minutesToISO(date, minutes))
      }
    }
  }

  if (!operating_window.is_available) {
    return (
      <p className="text-sm text-zinc-400 italic text-center py-4">
        Venue is closed on this date.
      </p>
    )
  }

  if (allSlots.length === 0) {
    return (
      <p className="text-sm text-zinc-400 italic text-center py-4">
        No available time slots for this date.
      </p>
    )
  }

  // Determine step phase: picking start or end
  const pickingEnd = selectedStartMin != null && selectedEndMin != null &&
    toMinutes(selectedEnd!) === toMinutes(selectedStart!) + min_booking_duration_minutes &&
    !validEndSlots.has(toMinutes(selectedEnd!))
  // simpler: phase = 'start' if no start chosen, 'end' if start chosen
  const phase: 'start' | 'end' = selectedStartMin == null ? 'start' : 'end'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {phase === 'start' ? 'Select start time' : 'Select end time'}
        </p>
        {selectedStartMin != null && (
          <button
            onClick={onClear}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Duration hint */}
      {selectedStartMin != null && selectedEndMin != null && (
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500 bg-blue-50 rounded-lg px-3 py-2">
          <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {formatTime(selectedStart!)} – {formatTime(selectedEnd!)}
            {' '}·{' '}
            <strong className="text-blue-700">
              {durationLabel(selectedStartMin, selectedEndMin)}
            </strong>
          </span>
        </div>
      )}

      {/* Slot grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {allSlots.map((minutes) => {
          const slotISO   = minutesToISO(date, minutes)
          const isStart   = selectedStartMin === minutes
          const isEnd     = selectedEndMin === minutes
          const isInRange =
            selectedStartMin != null &&
            selectedEndMin != null &&
            minutes > selectedStartMin &&
            minutes < selectedEndMin

          // Is this slot blocked as a start?
          const blockedAsStart = isBlocked(minutes, minutes + min_booking_duration_minutes)

          // In "end" phase, non-valid slots are dimmed
          const isValidEnd = phase === 'end' ? validEndSlots.has(minutes) : true
          const isDisabled = phase === 'start' ? blockedAsStart : !isValidEnd

          let cls =
            'px-2 py-2 rounded-lg text-xs font-medium text-center transition-all border '

          if (isStart || isEnd) {
            cls += 'bg-blue-600 text-white border-blue-600'
          } else if (isInRange) {
            cls += 'bg-blue-50 text-blue-700 border-blue-200'
          } else if (isDisabled) {
            cls += 'bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed'
          } else {
            cls += 'bg-white text-zinc-700 border-zinc-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
          }

          return (
            <button
              key={slotISO}
              onClick={() => !isDisabled && handleSlotClick(minutes)}
              disabled={isDisabled}
              className={cls}
            >
              {formatTime(slotISO)}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        Min {min_booking_duration_minutes / 60}h · Max {max_booking_duration_minutes / 60}h
      </p>
    </div>
  )
}