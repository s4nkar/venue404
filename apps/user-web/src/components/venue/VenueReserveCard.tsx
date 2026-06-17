import { formatPrice, formatDate, formatTime } from '../../utils'
import { QuoteBreakdown } from './QuoteBreakdown'
import type { VenueResponse, PricingQuote, BookingType } from '../../types'

type Props = {
  venue:           VenueResponse
  bookingType:     BookingType
  showTypeToggle:  boolean
  selectedDate:    string | null
  selectedStart:   string | null
  selectedEnd:     string | null
  quote:           PricingQuote | undefined
  quoteLoading:    boolean
  quoteError:      boolean
  slotError:       string | null
  isPending:       boolean
  onBookingTypeChange: (type: BookingType) => void
  onReset:         () => void
  onBook:          () => void
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Airbnb-style input field ─────────────────────────────────────────────────

function InputField({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string
  value: string | null
  placeholder: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 border-zinc-200 text-left px-4 py-3 transition-colors hover:bg-zinc-50 first:rounded-tl-xl first:rounded-bl-xl last:rounded-tr-xl last:rounded-br-xl"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-sm font-medium truncate ${value ? 'text-zinc-900' : 'text-zinc-400'}`}>
        {value ?? placeholder}
      </p>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VenueReserveCard({
  venue,
  bookingType,
  showTypeToggle,
  selectedDate,
  selectedStart,
  selectedEnd,
  quote,
  quoteLoading,
  quoteError,
  slotError,
  isPending,
  onBookingTypeChange,
  onReset,
  onBook,
}: Props) {
  const dateLabel  = selectedDate  ? formatDate(selectedDate + 'T00:00:00') : null
  const startLabel = selectedStart ? formatTime(selectedStart) : null
  const endLabel   = selectedEnd   ? formatTime(selectedEnd)   : null

  const advanceLabel  = quote ? formatPrice(quote.advance_due_paise) : null
  const totalLabel    = quote ? formatPrice(quote.quoted_price_paise) : null

  const hasDate    = !!selectedDate
  const hasSlot    = bookingType === 'time_slot' ? !!(selectedStart && selectedEnd) : true
  const readyToBook = !!quote && !quoteLoading && !quoteError && hasDate && hasSlot

  // Price to show at top
  const priceDisplay =
    venue.pricing_mode === 'flat' && venue.starting_price_paise != null
      ? { amount: formatPrice(venue.starting_price_paise), unit: 'day' }
      : venue.pricing_mode === 'hourly' && venue.hourly_rate_paise != null
      ? { amount: formatPrice(venue.hourly_rate_paise), unit: 'hr' }
      : null

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-lg overflow-hidden">

      {/* ── Price header ─────────────────────────────── */}
      <div className="px-6 pt-6 pb-5">
        {priceDisplay ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900">{priceDisplay.amount}</span>
            <span className="text-sm text-zinc-500">/ {priceDisplay.unit}</span>
          </div>
        ) : totalLabel ? (
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Total</p>
            <p className="text-2xl font-bold text-zinc-900 underline underline-offset-2">{totalLabel}</p>
          </div>
        ) : (
          <p className="text-base font-semibold text-zinc-500">Price on request</p>
        )}

        {/* Rating placeholder */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="h-3 w-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-zinc-400">New · No reviews yet</span>
        </div>
      </div>

      {/* ── Booking type toggle ───────────────────────── */}
      {showTypeToggle && (
        <div className="px-6 pb-4">
          <div className="flex overflow-hidden rounded-xl border border-zinc-200">
            <button
              type="button"
              onClick={() => onBookingTypeChange('full_day')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                bookingType === 'full_day'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              Full Day
            </button>
            <button
              type="button"
              onClick={() => onBookingTypeChange('time_slot')}
              className={`flex-1 border-l border-zinc-200 py-2.5 text-sm font-medium transition-colors ${
                bookingType === 'time_slot'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              Time Slot
            </button>
          </div>
        </div>
      )}

      {/* ── Airbnb-style date input fields ───────────── */}
      <div className="px-6 pb-4">
        <div className="overflow-hidden rounded-xl border border-zinc-300">
          {bookingType === 'time_slot' ? (
            /* Time slot: date | time range */
            <div className="flex divide-x divide-zinc-200">
              <InputField
                label="Date"
                value={dateLabel}
                placeholder="Add date"
                onClick={onReset}
              />
              <InputField
                label="Time"
                value={startLabel && endLabel ? `${startLabel} – ${endLabel}` : null}
                placeholder="Add time"
              />
            </div>
          ) : (
            /* Full day: single date field */
            <InputField
              label="Event date"
              value={dateLabel}
              placeholder="Select a date"
              onClick={onReset}
            />
          )}
        </div>

        {/* Capacity note */}
        <div className="mt-3 flex overflow-hidden rounded-xl border border-zinc-200">
          <div className="flex-1 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Guests</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-900">
              {venue.min_capacity
                ? `${venue.min_capacity}–${venue.max_capacity} guests`
                : `Up to ${venue.max_capacity} guests`}
            </p>
          </div>
          <div className="flex items-center pr-4 text-zinc-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Quote breakdown ───────────────────────────── */}
      {(quote || quoteLoading || quoteError) && (
        <div className="px-6 pb-4">
          {quoteLoading && <QuoteBreakdown source="quote" quote={{} as PricingQuote} loading />}
          {quoteError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              Could not calculate price.
            </div>
          )}
          {quote && !quoteLoading && <QuoteBreakdown source="quote" quote={quote} />}
        </div>
      )}

      {/* ── Slot error ────────────────────────────────── */}
      {slotError && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {slotError}
        </div>
      )}

      {/* ── CTA ──────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <button
          onClick={onBook}
          disabled={!readyToBook || isPending}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Checking availability…
            </span>
          ) : !hasDate ? (
            'Select a date to continue'
          ) : bookingType === 'time_slot' && !hasSlot ? (
            'Select a time to continue'
          ) : quoteLoading ? (
            'Calculating price…'
          ) : advanceLabel ? (
            <span className="flex flex-col leading-tight">
              <span>Request to Book</span>
              <span className="text-xs font-normal opacity-80">{advanceLabel} advance · no charge yet</span>
            </span>
          ) : (
            'Request to Book'
          )}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-400">
          You won't be charged yet · Owner must confirm
        </p>

        {selectedDate && (
          <button
            onClick={onReset}
            className="mt-3 w-full text-center text-xs font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-700 transition-colors"
          >
            Change date
          </button>
        )}
      </div>
    </div>
  )
}
