import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createClient, bookingEndpoints, paymentEndpoints, venueEndpoints } from '@venue404/api-client'
import { AppShell, Button, Card, Input } from '@venue404/ui'
import { useAuth } from '../lib/AuthContext'
import { Calendar, Users, FileText, ChevronLeft, CreditCard, Loader2 } from 'lucide-react'

type CheckoutState = {
  venue_id: string
  venue_name: string
  booking_type: 'full_day' | 'time_slot'
  starts_at: string
  ends_at: string
  booking_date: string
  guest_count: number
  quote: {
    quoted_price_paise: number
    advance_due_paise: number
    balance_due_paise: number
    platform_fee_paise: number
    owner_payout_paise: number
    advance_pct: number
  }
}

export default function Checkout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Retrieve checkout state from router location
  const checkoutState = location.state as CheckoutState | null

  const [guestCount, setGuestCount] = useState<number>(checkoutState?.guest_count || 1)
  const [eventType, setEventType] = useState('')
  const [userNotes, setUserNotes] = useState('')

  // Quote state
  const [quote, setQuote] = useState(checkoutState?.quote || null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if no state
  useEffect(() => {
    if (!checkoutState) {
      navigate('/')
    }
  }, [checkoutState])

  // Refetch quote if guest count changes
  useEffect(() => {
    const refetchQuote = async () => {
      if (!checkoutState || guestCount === checkoutState.guest_count) return
      setQuoteLoading(true)
      try {
        const client = createClient()
        const pricing = await venueEndpoints(client).getQuote(checkoutState.venue_id, {
          starts_at: checkoutState.starts_at,
          ends_at: checkoutState.ends_at,
          booking_type: checkoutState.booking_type,
        })
        setQuote(pricing)
      } catch (err) {
        console.error('Failed to update quote for new guest count', err)
      } finally {
        setQuoteLoading(false)
      }
    }
    refetchQuote()
  }, [guestCount])

  if (!checkoutState || !quote) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100)
  }

  const formatDateTime = (isoString: string) => {
    const dateObj = new Date(isoString)
    if (checkoutState.booking_type === 'full_day') {
      return dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
    return dateObj.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const client = createClient()

      // 1. Create Booking
      const bookingData = await bookingEndpoints(client).createBooking({
        venue_id: checkoutState.venue_id,
        booking_type: checkoutState.booking_type,
        starts_at: checkoutState.starts_at,
        ends_at: checkoutState.ends_at,
        booking_date: checkoutState.booking_date,
        guest_count: guestCount,
        event_type: eventType || null,
        user_notes: userNotes || null,
      })

      const bookingId = (bookingData as any).id

      // 2. Create Payment
      // Amount in standard currency units (not paise)
      const paymentResponse = await paymentEndpoints(client).createPayment({
        booking_id: bookingId,
        amount: quote.advance_due_paise / 100,
      })

      const stripePiId = (paymentResponse as any).stripe_payment_intent_id

      // 3. Simulate Stripe.js Redirect to payment results page
      navigate(`/payment/result?booking_id=${bookingId}&payment_intent=${stripePiId}&redirect_status=succeeded`)
    } catch (err: any) {
      setError(err.message || 'Booking submission or payment failed. Please try again.')
      setSubmitting(false)
    }
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
      pageTitle="Checkout"
      pageSubtitle="Review your booking and pay the advance"
      user={mappedUser}
      onSignOut={signOut}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 text-sm font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          Back to venue details
        </button>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Side: Summary & Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Venue Summary Section */}
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" />
                  Booking Details
                </h3>
                <div className="space-y-3 pt-2">
                  <div>
                    <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Venue</p>
                    <p className="text-sm font-medium text-zinc-800 mt-0.5">{checkoutState.venue_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Starts At</p>
                      <p className="text-sm text-zinc-700 mt-0.5">{formatDateTime(checkoutState.starts_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Ends At</p>
                      <p className="text-sm text-zinc-700 mt-0.5">{formatDateTime(checkoutState.ends_at)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Guest Count</label>
                    <div className="relative max-w-[150px]">
                      <Users className="absolute left-3 top-2 h-4 w-4 text-zinc-400" />
                      <input
                        type="number"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                        className="pl-9 pr-3 py-1.5 text-sm w-full rounded-lg border border-zinc-200"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Event Details Form */}
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  Event Information
                </h3>
                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">Event Type (Optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g. Birthday Party, Corporate Meet"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500">Special Notes for the Owner (Optional)</label>
                    <textarea
                      placeholder="Add any specific requests, decorations preference or notes here..."
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      rows={4}
                      className="w-full text-sm rounded-lg border border-zinc-200 p-2.5 focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Side: Quote Breakdown & CTA */}
          <div className="space-y-6">
            <Card>
              <div className="p-5 space-y-4">
                <h3 className="font-semibold text-zinc-900 text-base flex items-center gap-2 pb-2 border-b border-zinc-100">
                  <CreditCard size={18} className="text-blue-500" />
                  Payment Summary
                </h3>

                {quoteLoading ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
                    <p className="text-xs text-zinc-400 mt-2">Recalculating payment split...</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>Total Quote</span>
                      <span className="text-zinc-800 font-medium">{formatPrice(quote.quoted_price_paise)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>Platform Fee</span>
                      <span className="text-zinc-700">{formatPrice(quote.platform_fee_paise)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>Balance (Pay Later)</span>
                      <span className="text-zinc-700">{formatPrice(quote.balance_due_paise)}</span>
                    </div>

                    <div className="border-t border-zinc-100 pt-3 flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">Advance Due Now</p>
                        <p className="text-[10px] text-zinc-400">Secures reservation hold</p>
                      </div>
                      <span className="text-lg font-bold text-zinc-950">{formatPrice(quote.advance_due_paise)}</span>
                    </div>

                    {quote.balance_due_paise > 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5 leading-relaxed mt-2">
                        Note: Remaining balance of <strong>{formatPrice(quote.balance_due_paise)}</strong> is due before the event date.
                      </p>
                    )}

                    {error && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 mt-2">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-2.5 font-semibold mt-4 flex items-center justify-center gap-1.5"
                      disabled={submitting || quoteLoading}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Confirm & Pay ${formatPrice(quote.advance_due_paise)}`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
