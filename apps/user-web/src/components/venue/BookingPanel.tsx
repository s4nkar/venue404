import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { formatPrice, formatDate, formatTime } from '../../utils'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import { TimeSlotPicker } from './TimeSlotPicker'
import { QuoteBreakdown } from './QuoteBreakdown'
import type { VenueResponse, AvailabilityResponse, PricingQuote, BookingType } from '../../types'

type Props = { venue: VenueResponse }
type Step = 'date' | 'time' | 'quote'

function formatDuration(hours: number) {
  const mins = Math.round(hours * 60)

  const h = Math.floor(mins / 60)
  const m = mins % 60

  if (!m) return `${h}h`

  return `${h}h ${m}m`
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Step pill indicator ──────────────────────────────────────────────────────

function StepDots({ step, bookingType }: { step: Step; bookingType: BookingType }) {
  const steps = bookingType === 'full_day' ? ['date', 'quote'] : ['date', 'time', 'quote']

  const idx = steps.indexOf(step)

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= idx ? 'w-4 bg-blue-600' : 'w-1.5 bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingPanel({ venue }: Props) {
  const navigate = useNavigate()
  const client = createClient()

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('date')
  const [slotError, setSlotError] = useState<string | null>(null)

  const isTimeSlotVenue = venue.allowed_booking_types.includes('time_slot')
  const isFullDayVenue = venue.allowed_booking_types.includes('full_day')

  const [bookingType, setBookingType] = useState<BookingType>(
    isTimeSlotVenue && !isFullDayVenue ? 'time_slot' : 'full_day'
  )

  const showBookingTypeSelector = isTimeSlotVenue && isFullDayVenue

  const durationHours = useMemo(() => {
    if (!selectedStart || !selectedEnd) return null

    return (new Date(selectedEnd).getTime() - new Date(selectedStart).getTime()) / (1000 * 60 * 60)
  }, [selectedStart, selectedEnd])

  // ── Availability for selected date ────────────────────────────────────
  const {
    data: availability,
    isLoading: availLoading,
    isError: availError,
  } = useQuery<AvailabilityResponse>({
    queryKey: ['availability-date', venue.id, selectedDate],
    queryFn: () => venueEndpoints(client).getDateAvailability(venue.id, selectedDate!),
    enabled: !!selectedDate,
    staleTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    if (isTimeSlotVenue && !isFullDayVenue) {
      setBookingType('time_slot')
    } else if (isFullDayVenue && !isTimeSlotVenue) {
      setBookingType('full_day')
    }
  }, [isTimeSlotVenue, isFullDayVenue])

  useEffect(() => {
    if (
      bookingType === 'full_day' &&
      selectedDate &&
      availability?.operating_window?.is_available &&
      !selectedStart &&
      !selectedEnd
    ) {
      const opens = availability.operating_window.opens_at
      const closes = availability.operating_window.closes_at

      if (opens && closes) {
        setSelectedStart(`${selectedDate}T${opens.slice(0, 5)}:00`)

        setSelectedEnd(`${selectedDate}T${closes.slice(0, 5)}:00`)
        setStep('quote')
      }
    }
  }, [bookingType, availability, selectedDate, selectedStart, selectedEnd])

  // ── Pricing quote ─────────────────────────────────────────────────────
  const quoteEnabled =
    !!selectedDate && !!selectedStart && !!selectedEnd && selectedStart !== selectedEnd

  const {
    data: quote,
    isLoading: quoteLoading,
    isError: quoteError,
  } = useQuery<PricingQuote>({
    queryKey: ['quote', venue.id, selectedStart, selectedEnd, bookingType],
    queryFn: () =>
      venueEndpoints(client).getQuote(venue.id, {
        starts_at: selectedStart!,
        ends_at: selectedEnd!,
        booking_type: bookingType,
      }),
    enabled: quoteEnabled,
    staleTime: 60 * 1000,
  })

  // ── Validate & navigate ───────────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: () =>
      venueEndpoints(client).validateSlot(venue.id, {
        booking_type: bookingType,
        starts_at: selectedStart ?? undefined,
        ends_at: selectedEnd ?? undefined,
        booking_date: bookingType === 'full_day' ? (selectedDate ?? undefined) : undefined,
      }),
    onSuccess: (validation) => {
      if (!validation.valid) {
        setSlotError('This slot is no longer available. Please choose another.')
        return
      }
      navigate('/checkout', {
        state: {
          venueId: venue.id,
          venueName: venue.name,
          venueCoverImage: venue.photos?.find((p) => p.is_cover)?.image_url ?? null,
          bookingType,
          startsAt: validation.effective_starts_at,
          endsAt: validation.effective_ends_at,
          bookingDate: selectedDate,
          quote,
        },
      })
    },
    onError: (err: any) => setSlotError(err?.message ?? 'Unable to book. Please try again.'),
  })

  function handleBookingTypeChange(next: BookingType) {
    if (next === bookingType) return

    setBookingType(next)

    setSelectedDate(null)
    setSelectedStart(null)
    setSelectedEnd(null)

    setSlotError(null)

    setStep('date')
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleDateSelect(date: string) {
    setSelectedDate(date)

    setSelectedStart(null)
    setSelectedEnd(null)

    setSlotError(null)

    setStep(bookingType === 'time_slot' ? 'time' : 'quote')
  }

  function handleSlotSelect(start: string, end: string | null) {
    setSelectedStart(start)
    setSelectedEnd(end)

    setSlotError(null)

    if (end) {
      setStep('quote')
    }
  }

  function resetDate() {
    setSelectedDate(null)
    setSelectedStart(null)
    setSelectedEnd(null)
    setStep('date')
    setSlotError(null)
  }

  // ── Derived display values ─────────────────────────────────────────────
  const summaryDate = selectedDate ? formatDate(selectedDate + 'T00:00:00') : null
  const summaryStart = selectedStart ? formatTime(selectedStart) : null
  const summaryEnd = selectedEnd ? formatTime(selectedEnd) : null

  const readyToBook = !!quote && !quoteLoading && !quoteError

  // ── Advance amount display (shown in CTA area) ─────────────────────────
  const advanceLabel = quote ? formatPrice(quote.advance_due_paise) : null

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-md overflow-hidden">
      {/* ── Panel header: pricing anchor ─────────────────────────────── */}
      <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
        <div className="flex items-start justify-between">
          <div>
            {venue.pricing_mode === 'flat' && venue.base_price_paise != null ? (
              <>
                <p className="text-[28px] font-bold tracking-tight text-zinc-900 leading-none">
                  {formatPrice(venue.base_price_paise)}
                </p>
                <p className="text-sm text-zinc-400 mt-1">per day</p>
              </>
            ) : venue.pricing_mode === 'hourly' && venue.hourly_rate_paise != null ? (
              <>
                <p className="text-[28px] font-bold tracking-tight text-zinc-900 leading-none">
                  {formatPrice(venue.hourly_rate_paise)}
                </p>
                <p className="text-sm text-zinc-400 mt-1">per hour</p>
              </>
            ) : (
              <p className="text-base font-medium text-zinc-500">Price on request</p>
            )}
          </div>
          {/* Step dots — show only after date is picked */}
          {step !== 'date' && (
            <div className="flex flex-col items-end gap-1">
              <StepDots step={step} bookingType={bookingType} />
              <p className="text-[11px] text-zinc-400">
                {step === 'time'
                  ? 'Pick a time'
                  : step === 'quote'
                    ? 'Review price'
                    : 'Select date'}
              </p>
            </div>
          )}
        </div>

        {showBookingTypeSelector && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Booking Type
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleBookingTypeChange('full_day')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  bookingType === 'full_day'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                Full Day
              </button>

              <button
                type="button"
                onClick={() => handleBookingTypeChange('time_slot')}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  bookingType === 'time_slot'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                Time Slot
              </button>
            </div>
          </div>
        )}

        {summaryDate && (
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Booking Type</span>

                <span className="font-medium">
                  {bookingType === 'full_day' ? 'Full Day' : 'Time Slot'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Date</span>

                <span className="font-medium">{summaryDate}</span>
              </div>

              {summaryStart && summaryEnd && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Time</span>

                  <span className="font-medium">
                    {summaryStart} – {summaryEnd}
                  </span>
                </div>
              )}

              {durationHours !== null && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Duration</span>

                  <span className="font-medium">{formatDuration(durationHours)}</span>
                </div>
              )}
            </div>

            <button
              onClick={resetDate}
              className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* ── Panel body ────────────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-5">
        {/* STEP 1: Calendar */}
        {step === 'date' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Select a date
            </p>
            <AvailabilityCalendar
              venueId={venue.id}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>
        )}

        {/* STEP 2: Time slot picker */}
        {step === 'time' && bookingType === 'time_slot' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Select a time
            </p>
            {availLoading && (
              <div className="space-y-2.5">
                <div className="h-4 w-28 bg-zinc-100 rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            )}
            {availError && (
              <p className="text-sm text-red-500 text-center py-4">
                Failed to load time slots. Please try again.
              </p>
            )}
            {availability && !availLoading && (
              <TimeSlotPicker
                date={selectedDate!}
                availability={availability}
                venueConfig={venue}
                selectedStart={selectedStart}
                selectedEnd={selectedEnd}
                onSelect={handleSlotSelect}
                onClear={() => {
                  setSelectedStart(null)
                  setSelectedEnd(null)
                  setSlotError(null)
                }}
              />
            )}
          </div>
        )}

        {/* STEP 3: Quote */}
        {step === 'quote' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Price breakdown
            </p>
            {quoteLoading && <QuoteBreakdown source="quote" quote={{} as PricingQuote} loading />}
            {quoteError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                Could not calculate price. Please try again.
              </div>
            )}
            {quote && !quoteLoading && <QuoteBreakdown source="quote" quote={quote} />}
          </div>
        )}

        {/* Slot error */}
        {slotError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            <svg
              className="h-4 w-4 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {slotError}
          </div>
        )}
      </div>

      {/* ── Panel footer: CTA ─────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        {!selectedDate ? (
          <button
            disabled
            className="w-full rounded-xl bg-zinc-100 py-3.5 text-sm font-semibold text-zinc-400 cursor-not-allowed"
          >
            Select a date to continue
          </button>
        ) : bookingType === 'time_slot' && (!selectedStart || !selectedEnd) ? (
          <button
            disabled
            className="w-full rounded-xl bg-zinc-100 py-3.5 text-sm font-semibold text-zinc-400 cursor-not-allowed"
          >
            Select a time to continue
          </button>
        ) : (
          <button
            onClick={() => {
              setSlotError(null)
              validateMutation.mutate()
            }}
            disabled={!readyToBook || validateMutation.isPending}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {validateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Checking availability…
              </span>
            ) : advanceLabel ? (
              <span className="flex flex-col leading-tight">
                <span>Request to Book</span>
                <span className="text-xs font-normal opacity-80">
                  {advanceLabel} advance · no charge yet
                </span>
              </span>
            ) : (
              'Request to Book'
            )}
          </button>
        )}

        {/* Trust note */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Owner must confirm · No charge until accepted
        </div>
      </div>
    </div>
  )
}
