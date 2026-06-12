import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { AppShell, Button, Card, LoadingScreen, ErrorState } from '@venue404/ui'
import { useAuth } from '../lib/AuthContext'
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react'

type VenuePhoto = {
  id: string
  image_url: string
  is_cover: boolean
}

type Amenity = {
  id: string
  name: string
  icon: string | null
}

type CancellationPolicy = {
  tier_1_hours: number | null
  tier_1_refund_pct: string | null
  tier_2_hours: number | null
  tier_2_refund_pct: string | null
  tier_3_hours: number | null
  tier_3_refund_pct: string | null
  no_show_refund_pct: string
  platform_fee_refundable: boolean
  notes: string | null
}

type VenueDetailsResponse = {
  id: string
  name: string
  description: string | null
  venue_type: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  min_capacity: number | null
  max_capacity: number
  open_time: string
  close_time: string
  allowed_booking_types: ('full_day' | 'time_slot')[]
  slot_interval_minutes: number
  photos: VenuePhoto[]
  amenities: Amenity[]
  cancellation_policy: CancellationPolicy | null
}

type CalendarDay = {
  date: string
  status: 'available' | 'partially_booked' | 'fully_booked' | 'blocked' | 'closed'
  is_bookable: boolean
  available_for_full_day: boolean
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  banquet_hall: 'Banquet Hall',
  lawn: 'Lawn',
  conference_room: 'Conference Room',
  coworking_space: 'Coworking Space',
  studio: 'Studio',
  other: 'Other',
}

export default function VenueDetails() {
  const { id } = useParams<{ id: string }>()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [venue, setVenue] = useState<VenueDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Booking selections
  const [bookingType, setBookingType] = useState<'full_day' | 'time_slot'>('full_day')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [guestCount, setGuestCount] = useState<number>(1)

  // Quote / validation states
  const [quote, setQuote] = useState<any | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Fetch venue basic info
  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (!id) return
      setLoading(true)
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getVenue(id)
        setVenue(data as VenueDetailsResponse)
        if (data.allowed_booking_types && data.allowed_booking_types.length > 0) {
          setBookingType(data.allowed_booking_types[0])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch venue details')
      } finally {
        setLoading(false)
      }
    }
    fetchVenueDetails()
  }, [id])

  // Fetch calendar availability for the current view month
  useEffect(() => {
    const fetchCalendar = async () => {
      if (!id) return
      try {
        const client = createClient()
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)

        const startStr = start.toISOString().split('T')[0]
        const endStr = end.toISOString().split('T')[0]

        const data = await venueEndpoints(client).getCalendar(id, {
          start_date: startStr,
          end_date: endStr,
        })
        setCalendarDays(data.days || [])
      } catch (err) {
        console.error('Failed to fetch availability calendar', err)
      }
    }
    fetchCalendar()
  }, [id, currentDate])

  // Fetch quote when selection changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!id || !selectedDate) {
        setQuote(null)
        return
      }

      if (bookingType === 'time_slot' && (!startTime || !endTime)) {
        setQuote(null)
        return
      }

      setQuoteLoading(true)
      setQuoteError(null)
      try {
        const client = createClient()
        let startsAt = ''
        let endsAt = ''

        if (bookingType === 'full_day') {
          // Full day uses default operating times or start of day
          startsAt = `${selectedDate}T00:00:00Z`
          endsAt = `${selectedDate}T23:59:59Z`
        } else {
          startsAt = `${selectedDate}T${startTime}:00`
          endsAt = `${selectedDate}T${endTime}:00`
        }

        const pricing = await venueEndpoints(client).getQuote(id, {
          starts_at: startsAt,
          ends_at: endsAt,
          booking_type: bookingType,
        })
        setQuote(pricing)
      } catch (err: any) {
        setQuoteError(err.message || 'Failed to calculate quote')
        setQuote(null)
      } finally {
        setQuoteLoading(false)
      }
    }

    fetchQuote()
  }, [id, selectedDate, bookingType, startTime, endTime])

  if (loading) return <LoadingScreen message="Loading venue details..." />
  if (error || !venue) return <ErrorState message={error || 'Venue not found'} />

  // Calendar view navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Generate date list for grid alignment (empty slots for weekday start padding)
  const getDaysInMonthGrid = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sunday, 1 = Monday...
    const grid: (CalendarDay | null)[] = Array(firstDayIndex).fill(null)

    // Match calendarDays fetched from API
    const daysMap = new Map(calendarDays.map((d) => [new Date(d.date).getDate(), d]))

    const numDays = new Date(year, month + 1, 0).getDate()
    for (let day = 1; day <= numDays; day++) {
      const dayData = daysMap.get(day)
      if (dayData) {
        grid.push(dayData)
      } else {
        // Fallback placeholder
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        grid.push({
          date: dateStr,
          status: 'closed',
          is_bookable: false,
          available_for_full_day: false,
        })
      }
    }
    return grid
  }

  // Parse open/close times to generate dropdown values
  const generateTimeOptions = () => {
    const options: string[] = []
    const [openH, openM] = venue.open_time.split(':').map(Number)
    const [closeH, closeM] = venue.close_time.split(':').map(Number)

    let current = openH * 60 + openM
    const end = closeH * 60 + closeM

    const interval = venue.slot_interval_minutes || 30

    while (current <= end) {
      const h = Math.floor(current / 60)
      const m = current % 60
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      options.push(timeStr)
      current += interval
    }
    return options
  }

  const handleBookNow = async () => {
    if (!id || !selectedDate) return
    if (bookingType === 'time_slot' && (!startTime || !endTime)) return

    setValidating(true)
    setValidationError(null)
    try {
      const client = createClient()
      let startsAt = ''
      let endsAt = ''

      if (bookingType === 'full_day') {
        startsAt = `${selectedDate}T00:00:00Z`
        endsAt = `${selectedDate}T23:59:59Z`
      } else {
        startsAt = `${selectedDate}T${startTime}:00`
        endsAt = `${selectedDate}T${endTime}:00`
      }

      // Check slot validation
      const validation = await venueEndpoints(client).validateSlot(id, {
        booking_type: bookingType,
        starts_at: startsAt,
        ends_at: endsAt,
        booking_date: selectedDate,
        guest_count: guestCount,
      })

      if (validation.valid) {
        // Navigate to checkout with selections
        navigate('/checkout', {
          state: {
            venue_id: venue.id,
            venue_name: venue.name,
            booking_type: bookingType,
            starts_at: startsAt,
            ends_at: endsAt,
            booking_date: selectedDate,
            guest_count: guestCount,
            quote: quote,
          },
        })
      } else {
        setValidationError('The selected slot overlaps with an existing block or booking.')
      }
    } catch (err: any) {
      setValidationError(err.message || 'Slot conflict or validation failed')
    } finally {
      setValidating(false)
    }
  }

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100)
  }

  const navItems = [
    { label: 'Explore', href: '/' },
    { label: 'My Bookings', href: '/my-bookings' },
    { label: 'Profile', href: '/profile' },
  ]

  const mappedUser = user
    ? {
        name: user.profile.full_name || user.email || 'Customer',
        email: user.email || '',
        role: user.roles.includes('venue_owner') ? 'Owner' : 'Customer',
      }
    : undefined

  return (
    <AppShell
      navItems={navItems}
      activePath=""
      onNavigate={(href) => navigate(href)}
      pageTitle={venue.name}
      pageSubtitle={`${venue.city}, ${venue.state}`}
      user={mappedUser}
      onSignOut={signOut}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Photo Gallery Carousel */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          {venue.photos.length > 0 ? (
            <div className="relative h-96 bg-zinc-100 flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
              {venue.photos
                .sort((a, b) => (a.is_cover ? -1 : b.is_cover ? 1 : 0))
                .map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.image_url}
                    alt={venue.name}
                    className="w-full h-full object-cover snap-start shrink-0"
                  />
                ))}
            </div>
          ) : (
            <div className="h-64 bg-zinc-100 flex items-center justify-center text-zinc-400">
              <Calendar size={48} />
              <span className="ml-2 font-medium">No photos available</span>
            </div>
          )}
        </div>

        {/* Two-Column Info & Booking Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Side: Venue details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-900">{venue.name}</h3>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">
                    {VENUE_TYPE_LABELS[venue.venue_type] || venue.venue_type}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                  <MapPin size={16} />
                  {venue.address_line1}
                  {venue.address_line2 ? `, ${venue.address_line2}` : ''}, {venue.city}, {venue.state}
                </p>
                <div className="flex items-center gap-6 pt-4 border-t border-zinc-100 text-sm">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-400" />
                    <span>
                      Capacity: <strong>{venue.min_capacity || 1} - {venue.max_capacity} guests</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-zinc-400" />
                    <span>
                      Hours: <strong>{venue.open_time.slice(0, 5)} - {venue.close_time.slice(0, 5)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6 space-y-3">
                <h4 className="font-semibold text-zinc-900 text-base">About the space</h4>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                  {venue.description || 'No description provided.'}
                </p>
              </div>
            </Card>

            <Card>
              <div className="p-6 space-y-4">
                <h4 className="font-semibold text-zinc-900 text-base">Amenities offered</h4>
                {venue.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {venue.amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/60 p-2.5 rounded-lg text-sm text-zinc-700">
                        <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                        <span className="truncate">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No amenities listed.</p>
                )}
              </div>
            </Card>

            {venue.cancellation_policy && (
              <Card>
                <div className="p-6 space-y-4">
                  <h4 className="font-semibold text-zinc-900 text-base">Cancellation & Refund Policy</h4>
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Notice Period</th>
                          <th className="px-4 py-2 text-right font-medium text-zinc-500">Refund Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {venue.cancellation_policy.tier_1_hours && (
                          <tr>
                            <td className="px-4 py-2 text-zinc-700">&gt; {venue.cancellation_policy.tier_1_hours} hours before event</td>
                            <td className="px-4 py-2 text-right font-medium text-zinc-900">{venue.cancellation_policy.tier_1_refund_pct}%</td>
                          </tr>
                        )}
                        {venue.cancellation_policy.tier_2_hours && (
                          <tr>
                            <td className="px-4 py-2 text-zinc-700">{venue.cancellation_policy.tier_2_hours} - {venue.cancellation_policy.tier_1_hours} hours</td>
                            <td className="px-4 py-2 text-right font-medium text-zinc-900">{venue.cancellation_policy.tier_2_refund_pct}%</td>
                          </tr>
                        )}
                        {venue.cancellation_policy.tier_3_hours && (
                          <tr>
                            <td className="px-4 py-2 text-zinc-700">{venue.cancellation_policy.tier_3_hours} - {venue.cancellation_policy.tier_2_hours} hours</td>
                            <td className="px-4 py-2 text-right font-medium text-zinc-900">{venue.cancellation_policy.tier_3_refund_pct}%</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-4 py-2 text-zinc-700">Late cancellation / No show</td>
                          <td className="px-4 py-2 text-right font-medium text-zinc-900">{venue.cancellation_policy.no_show_refund_pct}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>
                      * Platform fees are{' '}
                      <strong>{venue.cancellation_policy.platform_fee_refundable ? 'refundable' : 'non-refundable'}</strong>.
                    </p>
                    {venue.cancellation_policy.notes && (
                      <p className="italic">Note: {venue.cancellation_policy.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Side: Booking Panel Sticky Card */}
          <div className="space-y-6 lg:sticky lg:top-6">
            <Card>
              <div className="p-6 space-y-6">
                <h4 className="font-bold text-zinc-900 text-lg">Book this venue</h4>

                {/* Calendar availability grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-700">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" className="p-1.5 h-auto rounded" onClick={handlePrevMonth}>
                        <ChevronLeft size={16} />
                      </Button>
                      <Button variant="ghost" className="p-1.5 h-auto rounded" onClick={handleNextMonth}>
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400 mb-1">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {getDaysInMonthGrid().map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />

                      const dateObj = new Date(day.date)
                      const dayNum = dateObj.getDate()
                      const isSelected = selectedDate === day.date
                      const isBookable = day.is_bookable

                      let statusClass = 'bg-white border-zinc-200 hover:bg-zinc-50'
                      if (!isBookable) {
                        statusClass = 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent'
                      } else if (day.status === 'partially_booked') {
                        statusClass = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }

                      if (isSelected) {
                        statusClass = 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      }

                      return (
                        <button
                          key={day.date}
                          disabled={!isBookable}
                          onClick={() => {
                            setSelectedDate(day.date)
                            setValidationError(null)
                          }}
                          className={`h-9 w-9 text-xs rounded-lg border flex items-center justify-center transition-all press ${statusClass}`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDate && (
                  <div className="space-y-4 border-t border-zinc-100 pt-4 card-enter">
                    {/* Booking Type Select */}
                    {venue.allowed_booking_types.length > 1 && (
                      <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
                        {venue.allowed_booking_types.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setBookingType(type)
                              setValidationError(null)
                            }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                              bookingType === type
                                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                                : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                          >
                            {type === 'full_day' ? 'Full Day' : 'Hourly Slots'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Guest Count */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500">Guest Count</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <input
                          type="number"
                          value={guestCount}
                          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                          min="1"
                          max={venue.max_capacity}
                          className="pl-9 pr-3 py-2 text-sm w-full rounded-lg border border-zinc-200 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Time Slot Picker */}
                    {bookingType === 'time_slot' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-500">Starts At</label>
                          <select
                            value={startTime}
                            onChange={(e) => {
                              setStartTime(e.target.value)
                              setValidationError(null)
                            }}
                            className="w-full text-sm h-[38px] rounded-lg border border-zinc-200 px-3 bg-white"
                          >
                            <option value="">Start</option>
                            {generateTimeOptions().map((time) => (
                              <option key={`start-${time}`} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-500">Ends At</label>
                          <select
                            value={endTime}
                            onChange={(e) => {
                              setEndTime(e.target.value)
                              setValidationError(null)
                            }}
                            className="w-full text-sm h-[38px] rounded-lg border border-zinc-200 px-3 bg-white"
                          >
                            <option value="">End</option>
                            {generateTimeOptions()
                              .filter((t) => !startTime || t > startTime)
                              .map((time) => (
                                <option key={`end-${time}`} value={time}>
                                  {time}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Pricing Quote Breakdown */}
                    {quoteLoading ? (
                      <div className="text-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600 mx-auto" />
                        <p className="text-xs text-zinc-400 mt-1">Calculating quote...</p>
                      </div>
                    ) : quoteError ? (
                      <div className="text-center py-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg">
                        {quoteError}
                      </div>
                    ) : quote ? (
                      <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200/60 space-y-2.5 text-xs">
                        <p className="font-semibold text-zinc-800 border-b border-zinc-200/50 pb-1.5">Pricing Breakdown</p>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Total Price</span>
                          <strong className="text-zinc-900">{formatPrice(quote.quoted_price_paise)}</strong>
                        </div>
                        <div className="flex justify-between border-t border-zinc-200/40 pt-1.5">
                          <span className="text-zinc-500">Advance Due (Pay now)</span>
                          <strong className="text-zinc-950 font-bold">{formatPrice(quote.advance_due_paise)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Balance Due (Pay later)</span>
                          <span className="text-zinc-700">{formatPrice(quote.balance_due_paise)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Convenience Platform Fee</span>
                          <span className="text-zinc-700">{formatPrice(quote.platform_fee_paise)}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2">
                          * Advance of {quote.advance_pct}% secures your booking lock.
                        </p>
                      </div>
                    ) : null}

                    {/* Validation Errors */}
                    {validationError && (
                      <div className="bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-100 flex items-start gap-2 text-xs">
                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Book Now button */}
                    <Button
                      variant="primary"
                      className="w-full py-2.5 font-semibold"
                      disabled={!quote || quoteLoading || validating}
                      onClick={handleBookNow}
                    >
                      {validating ? 'Checking Slot...' : 'Book Now'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
