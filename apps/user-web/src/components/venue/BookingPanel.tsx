import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { formatPrice, formatDate, formatTime, toDateString } from '../../utils'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import { TimeSlotPicker } from './TimeSlotPicker'
import { QuoteBreakdown } from './QuoteBreakdown'
import type { VenueResponse, AvailabilityResponse, PricingQuote, BookingType } from '../../types'

type Props = {
  venue: VenueResponse
}

type Step = 'date' | 'time' | 'quote'

export function BookingPanel({ venue }: Props) {
  const navigate   = useNavigate()
  const client     = createClient()

  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd,   setSelectedEnd]   = useState<string | null>(null)
  const [step,          setStep]          = useState<Step>('date')
  const [slotError,     setSlotError]     = useState<string | null>(null)

  const isTimeSlotVenue     = venue.allowed_booking_types.includes('time_slot')
  const isFullDayVenue      = venue.allowed_booking_types.includes('full_day')
  const bookingType: BookingType =
    isTimeSlotVenue && !isFullDayVenue ? 'time_slot' : 'full_day'

  // ── Date availability (fires when date is selected) ────────────────────
  const {
    data: availability,
    isLoading: availLoading,
    isError: availError,
  } = useQuery<AvailabilityResponse>({
    queryKey: ['availability-date', venue.id, selectedDate],
    queryFn: () =>
      venueEndpoints(client).getDateAvailability(venue.id, selectedDate!),
    enabled: !!selectedDate,
    staleTime: 2 * 60 * 1000,
  })

  // ── Auto-set full_day times when availability loads ────────────────────
  // For full_day venues: set times from operating window automatically
  const isFullDayOnly = isFullDayVenue && !isTimeSlotVenue

  // ── Pricing quote ──────────────────────────────────────────────────────
  const quoteEnabled =
    !!selectedDate && !!selectedStart && !!selectedEnd &&
    selectedStart !== selectedEnd

  const {
    data: quote,
    isLoading: quoteLoading,
    isError: quoteError,
  } = useQuery<PricingQuote>({
    queryKey: ['quote', venue.id, selectedStart, selectedEnd, bookingType],
    queryFn: () =>
      venueEndpoints(client).getQuote(venue.id, {
        starts_at:    selectedStart!,
        ends_at:      selectedEnd!,
        booking_type: bookingType,
      }),
    enabled: quoteEnabled,
    staleTime: 60 * 1000,
  })

  // ── Validate + navigate mutation ───────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: () =>
      venueEndpoints(client).validateSlot(venue.id, {
        booking_type:  bookingType,
        starts_at:     selectedStart ?? undefined,
        ends_at:       selectedEnd ?? undefined,
        booking_date:  isFullDayOnly ? selectedDate ?? undefined : undefined,
      }),
    onSuccess: (validation) => {
      if (!validation.valid) {
        setSlotError('This slot is no longer available. Please choose another date or time.')
        return
      }
      navigate('/checkout', {
        state: {
          venueId:          venue.id,
          venueName:        venue.name,
          venueCoverImage:  venue.photos?.find((p) => p.is_cover)?.image_url ?? null,
          bookingType,
          startsAt:         validation.effective_starts_at,
          endsAt:           validation.effective_ends_at,
          bookingDate:      selectedDate,
          quote,
        },
      })
    },
   onError: (error: any) => {
  setSlotError(
    error?.message ?? 'Unable to create booking. Please try again.'
  )
}
  })

  // ── Date selected handler ──────────────────────────────────────────────
  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedStart(null)
    setSelectedEnd(null)
    setSlotError(null)
    setStep(isTimeSlotVenue ? 'time' : 'quote')
  }

  // ── Slot selected handler (time_slot only) ────────────────────────────
  function handleSlotSelect(start: string, end: string) {
    setSelectedStart(start)
    setSelectedEnd(end)
    setSlotError(null)
    setStep('quote')
  }

  function handleSlotClear() {
    setSelectedStart(null)
    setSelectedEnd(null)
    setStep('time')
  }

  // ── Auto-set times for full_day ────────────────────────────────────────
  if (
    isFullDayOnly &&
    availability &&
    availability.operating_window.is_available &&
    selectedDate &&
    !selectedStart
  ) {
    const opens  = availability.operating_window.opens_at
    const closes = availability.operating_window.closes_at
    if (opens && closes) {
      const start = `${selectedDate}T${opens.slice(0, 5)}:00`
      const end   = `${selectedDate}T${closes.slice(0, 5)}:00`
      setSelectedStart(start)
      setSelectedEnd(end)
    }
  }

  // ── Summary line ───────────────────────────────────────────────────────
  const hasSummary = selectedDate && selectedStart && selectedEnd
  const summaryDate  = selectedDate  ? formatDate(selectedDate + 'T00:00:00') : null
  const summaryStart = selectedStart ? formatTime(selectedStart) : null
  const summaryEnd   = selectedEnd   ? formatTime(selectedEnd)   : null

  const canBook = !!quote && !quoteLoading && !quoteError && !validateMutation.isPending

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5 space-y-5">
      {/* Pricing hint */}
      {!selectedDate && (
        <div className="text-center pb-1">
          {venue.pricing_mode === 'flat' && venue.base_price_paise != null && (
            <p className="text-2xl font-bold text-zinc-900">
              {formatPrice(venue.base_price_paise)}
              <span className="text-sm font-normal text-zinc-400 ml-1">/ day</span>
            </p>
          )}
          {venue.pricing_mode === 'hourly' && venue.hourly_rate_paise != null && (
            <p className="text-2xl font-bold text-zinc-900">
              {formatPrice(venue.hourly_rate_paise)}
              <span className="text-sm font-normal text-zinc-400 ml-1">/ hour</span>
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-1">Select a date to see full pricing</p>
        </div>
      )}

      {/* Step 1: Calendar */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          {step === 'date' ? 'Select date' : (
            <button
              onClick={() => { setSelectedDate(null); setSelectedStart(null); setSelectedEnd(null); setStep('date') }}
              className="flex items-center gap-1 text-blue-500 hover:text-blue-700 normal-case tracking-normal font-medium transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Change date
            </button>
          )}
        </p>

        {step === 'date' ? (
          <AvailabilityCalendar
            venueId={venue.id}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        ) : (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-blue-800">{summaryDate}</span>
          </div>
        )}
      </div>

      {/* Step 2: Time slots (time_slot venues only) */}
      {step !== 'date' && isTimeSlotVenue && (
        <div className="border-t border-zinc-100 pt-5">
          {availLoading && (
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-100 rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-9 bg-zinc-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          )}
          {availError && (
            <p className="text-sm text-red-500 text-center">Failed to load availability.</p>
          )}
          {availability && (
            <TimeSlotPicker
              date={selectedDate!}
              availability={availability}
              venueConfig={venue}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              onSelect={handleSlotSelect}
              onClear={handleSlotClear}
            />
          )}
        </div>
      )}

      {/* Step 3: Quote */}
      {step === 'quote' && (
        <div className="border-t border-zinc-100 pt-5 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Price breakdown</p>
          {quoteLoading && (
            <QuoteBreakdown source="quote" quote={{} as PricingQuote} loading />
          )}
          {quoteError && (
            <p className="text-sm text-red-500">Could not load price. Please try again.</p>
          )}
          {quote && !quoteLoading && (
            <QuoteBreakdown source="quote" quote={quote} />
          )}
        </div>
      )}

      {/* Slot error */}
      {slotError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {slotError}
        </div>
      )}

      {/* CTA */}
      <div className="pt-1">
        {!selectedDate ? (
          <button
            disabled
            className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-400 cursor-not-allowed"
          >
            Select a date to continue
          </button>
        ) : isTimeSlotVenue && (!selectedStart || !selectedEnd) ? (
          <button
            disabled
            className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-400 cursor-not-allowed"
          >
            Select a time slot to continue
          </button>
        ) : (
          <button
            onClick={() => {
              setSlotError(null)
              validateMutation.mutate()
            }}
            disabled={!canBook || validateMutation.isPending}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {validateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Checking availability…
              </span>
            ) : (
              'Request Booking'
            )}
          </button>
        )}
        <p className="text-xs text-zinc-400 text-center mt-2">
          No payment now — owner confirms first
        </p>
      </div>
    </div>
  )
}