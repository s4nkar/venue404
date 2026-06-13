import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { toDateString, addMonths } from '../../utils'
import type { CalendarDay } from '../../types'

type Props = {
  venueId: string
  selectedDate: string | null
  onDateSelect: (date: string) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonthGrid(year: number, month: number): (string | null)[] {
  // Returns YYYY-MM-DD strings (or null for padding cells)
  const firstDay = new Date(year, month, 1)
  // getDay() is 0=Sun; we want 0=Mon
  const startPad = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const grid: (string | null)[] = []
  for (let i = 0; i < startPad; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    grid.push(toDateString(date))
  }
  // Fill tail to complete last row
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

const STATUS_DOT: Record<string, string | null> = {
  available:        null,
  partially_booked: 'bg-amber-400',
  fully_booked:     null,
  blocked:          null,
  closed:           null,
}

function DaySkeleton() {
  return (
    <div className="h-9 w-9 rounded-full bg-zinc-100 animate-pulse" />
  )
}

export function AvailabilityCalendar({ venueId, selectedDate, onDateSelect }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // First and last day of month for API
  const startDate = toDateString(viewDate)
  const lastDay   = new Date(year, month + 1, 0)
  const endDate   = toDateString(lastDay)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['calendar', venueId, year, month],
    queryFn:  () => venueEndpoints(createClient()).getCalendar(venueId, { start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000,
  })

  // Build lookup map from date string → CalendarDay
  const dayMap = new Map<string, CalendarDay>()
  data?.days.forEach((d: CalendarDay) => dayMap.set(d.date, d))

  const grid = getDaysInMonthGrid(year, month)

  const prevMonth = () => setViewDate(addMonths(viewDate, -1))
  const nextMonth = () => setViewDate(addMonths(viewDate, 1))

  // Prevent navigating to months before today's month
  const canGoPrev =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth())

  const monthLabel = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-zinc-800">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-zinc-400 py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Error state */}
      {isError && (
        <p className="text-xs text-red-500 text-center py-4">Failed to load availability.</p>
      )}

      {/* Calendar grid */}
      {!isError && (
        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((dateStr, i) => {
            if (!dateStr) {
              return <div key={`pad-${i}`} />
            }

            const calDay  = dayMap.get(dateStr)
            const dateObj = new Date(dateStr + 'T00:00:00')
            const isPast  = dateObj < today
            const isSelected = dateStr === selectedDate

            // Loading skeleton
            if (isLoading || !data) {
              return (
                <div key={dateStr} className="flex items-center justify-center py-0.5">
                  <DaySkeleton />
                </div>
              )
            }

            const isDisabled =
              isPast ||
              !calDay ||
              !calDay.is_bookable ||
              calDay.status === 'fully_booked' ||
              calDay.status === 'blocked' ||
              calDay.status === 'closed'

            const dot = calDay ? STATUS_DOT[calDay.status] : null

            let cellClass =
              'relative flex flex-col items-center justify-center h-9 w-9 rounded-full text-sm font-medium transition-all mx-auto '

            if (isSelected) {
              cellClass += 'bg-blue-600 text-white shadow-sm'
            } else if (isDisabled) {
              cellClass += 'text-zinc-300 cursor-not-allowed'
            } else {
              cellClass +=
                calDay?.status === 'partially_booked'
                  ? 'text-zinc-700 hover:bg-amber-50 cursor-pointer'
                  : 'text-zinc-700 hover:bg-blue-50 cursor-pointer'
            }

            return (
              <div key={dateStr} className="flex items-center justify-center py-0.5">
                <button
                  onClick={() => !isDisabled && onDateSelect(dateStr)}
                  disabled={isDisabled}
                  className={cellClass}
                  aria-label={dateStr}
                  aria-pressed={isSelected}
                >
                  {new Date(dateStr + 'T00:00:00').getDate()}
                  {dot && !isSelected && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${dot}`}
                    />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
        <LegendItem color="bg-blue-600" label="Selected" />
        <LegendItem dot="bg-amber-400" label="Partial" />
        <LegendItem color="bg-zinc-200" label="Unavailable" />
      </div>
    </div>
  )
}

function LegendItem({ color, dot, label }: { color?: string; dot?: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
      {dot ? (
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        </span>
      ) : (
        <span className={`h-3.5 w-3.5 rounded-full ${color}`} />
      )}
      {label}
    </span>
  )
}