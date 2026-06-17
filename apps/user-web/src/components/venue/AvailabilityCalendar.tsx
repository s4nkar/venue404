import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { toDateString, addMonths } from '../../utils'
import type { CalendarDay } from '../../types'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_DOT: Record<string, string | null> = {
  available:        null,
  partially_booked: 'bg-amber-400',
  fully_booked:     null,
  blocked:          null,
  closed:           null,
}

function getDaysInMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay  = new Date(year, month, 1)
  const startPad  = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (string | null)[] = []
  for (let i = 0; i < startPad; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(toDateString(new Date(year, month, d)))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

// ─── Single-month grid ────────────────────────────────────────────────────────

type MonthGridProps = {
  year: number
  month: number
  dayMap: Map<string, CalendarDay>
  isLoading: boolean
  isError: boolean
  selectedDate: string | null
  onDateSelect: (date: string) => void
  compact?: boolean
}

function DaySkeleton({ compact }: { compact?: boolean }) {
  const sz = compact ? 'h-8 w-8' : 'h-10 w-10'
  return <div className={`${sz} rounded-full bg-zinc-100 animate-pulse`} />
}

function MonthGrid({ year, month, dayMap, isLoading, isError, selectedDate, onDateSelect, compact }: MonthGridProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const grid = getDaysInMonthGrid(year, month)

  const cellBase = compact
    ? 'relative flex flex-col items-center justify-center h-8 w-8 rounded-full text-xs font-medium transition-all mx-auto '
    : 'relative flex flex-col items-center justify-center h-10 w-10 rounded-full text-sm font-medium transition-all mx-auto '

  if (isError) {
    return <p className="text-xs text-red-500 text-center py-4">Failed to load.</p>
  }

  return (
    <>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className={`text-center ${compact ? 'text-[10px]' : 'text-xs'} font-medium text-zinc-400 py-1`}>
            {compact ? label[0] : label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} />

          if (isLoading || !dayMap.size) {
            return (
              <div key={dateStr} className="flex items-center justify-center py-0.5">
                <DaySkeleton compact={compact} />
              </div>
            )
          }

          const calDay   = dayMap.get(dateStr)
          const dateObj  = new Date(dateStr + 'T00:00:00')
          const isPast   = dateObj < today
          const isSelected = dateStr === selectedDate

          const isDisabled =
            isPast || !calDay || !calDay.is_bookable ||
            calDay.status === 'fully_booked' ||
            calDay.status === 'blocked' ||
            calDay.status === 'closed'

          const dot = calDay ? STATUS_DOT[calDay.status] : null

          let cls = cellBase
          if (isSelected) {
            cls += 'bg-zinc-900 text-white shadow-sm'
          } else if (isDisabled) {
            cls += 'text-zinc-300 cursor-not-allowed line-through'
          } else {
            cls += calDay?.status === 'partially_booked'
              ? 'text-zinc-700 hover:bg-amber-50 cursor-pointer'
              : 'text-zinc-700 hover:bg-brand-light cursor-pointer'
          }

          return (
            <div key={dateStr} className="flex items-center justify-center py-0.5">
              <button
                onClick={() => !isDisabled && onDateSelect(dateStr)}
                disabled={isDisabled}
                className={cls}
                aria-label={dateStr}
                aria-pressed={isSelected}
              >
                {new Date(dateStr + 'T00:00:00').getDate()}
                {dot && !isSelected && (
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${dot}`} />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-4 mt-2 pt-3 border-t border-zinc-100">
      <LegendItem color="bg-zinc-900" label="Selected" />
      <LegendItem dot="bg-amber-400"  label="Partial" />
      <LegendItem color="bg-zinc-200" label="Unavailable" />
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

// ─── Single-month calendar (used inside BookingPanel compact) ─────────────────

type Props = {
  venueId: string
  selectedDate: string | null
  onDateSelect: (date: string) => void
}

export function AvailabilityCalendar({ venueId, selectedDate, onDateSelect }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const startDate = toDateString(viewDate)
  const endDate   = toDateString(new Date(year, month + 1, 0))

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['calendar', venueId, year, month],
    queryFn:   () => venueEndpoints(createClient()).getCalendar(venueId, { start_date: startDate, end_date: endDate }),
    staleTime: 5 * 60 * 1000,
  })

  const dayMap = new Map<string, CalendarDay>()
  data?.days.forEach((d: CalendarDay) => dayMap.set(d.date, d))

  const canGoPrev =
    year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())

  const monthLabel = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(addMonths(viewDate, -1))} disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-zinc-800">{monthLabel}</span>
        <button onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <MonthGrid
        year={year} month={month} dayMap={dayMap}
        isLoading={isLoading} isError={isError}
        selectedDate={selectedDate} onDateSelect={onDateSelect}
        compact
      />
      <Legend />
    </div>
  )
}

// ─── Double-month calendar (inline section on venue detail page) ──────────────

type DoubleProps = {
  venueId: string
  selectedDate: string | null
  onDateSelect: (date: string) => void
  onClear: () => void
}

function fetchMonth(venueId: string, year: number, month: number) {
  const start = toDateString(new Date(year, month, 1))
  const end   = toDateString(new Date(year, month + 1, 0))
  return venueEndpoints(createClient()).getCalendar(venueId, { start_date: start, end_date: end })
}

export function AvailabilityCalendarDouble({ venueId, selectedDate, onDateSelect, onClear }: DoubleProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })

  const year1  = viewDate.getFullYear()
  const month1 = viewDate.getMonth()
  const next   = addMonths(viewDate, 1)
  const year2  = next.getFullYear()
  const month2 = next.getMonth()

  const q1 = useQuery({
    queryKey:  ['calendar', venueId, year1, month1],
    queryFn:   () => fetchMonth(venueId, year1, month1),
    staleTime: 5 * 60 * 1000,
  })
  const q2 = useQuery({
    queryKey:  ['calendar', venueId, year2, month2],
    queryFn:   () => fetchMonth(venueId, year2, month2),
    staleTime: 5 * 60 * 1000,
  })

  const map1 = new Map<string, CalendarDay>()
  q1.data?.days.forEach((d: CalendarDay) => map1.set(d.date, d))
  const map2 = new Map<string, CalendarDay>()
  q2.data?.days.forEach((d: CalendarDay) => map2.set(d.date, d))

  const canGoPrev =
    year1 > today.getFullYear() || (year1 === today.getFullYear() && month1 > today.getMonth())

  const label1 = viewDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const label2 = next.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      {/* Two-month grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Month 1 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewDate(addMonths(viewDate, -1))}
              disabled={!canGoPrev}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-zinc-900">{label1}</span>
            <div className="w-8" /> {/* spacer */}
          </div>
          <MonthGrid
            year={year1} month={month1} dayMap={map1}
            isLoading={q1.isLoading} isError={q1.isError}
            selectedDate={selectedDate} onDateSelect={onDateSelect}
          />
        </div>

        {/* Month 2 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-8" /> {/* spacer */}
            <span className="text-sm font-semibold text-zinc-900">{label2}</span>
            <button
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <MonthGrid
            year={year2} month={month2} dayMap={map2}
            isLoading={q2.isLoading} isError={q2.isError}
            selectedDate={selectedDate} onDateSelect={onDateSelect}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
        <Legend />
        {selectedDate && (
          <button
            onClick={onClear}
            className="text-sm font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 transition-colors"
          >
            Clear date
          </button>
        )}
      </div>
    </div>
  )
}
