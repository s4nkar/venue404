import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, Button, StatusBadge, PaymentStatusBadge, Modal } from '@venue404/ui'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import { Calendar, MapPin, User, Clock, ArrowLeft, Check, X, AlertTriangle, History, AlignLeft, Info, Receipt } from 'lucide-react'

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchBooking = async () => {
    if (!bookingId) return
    try {
      const client = createClient()
      const data = await bookingEndpoints(client).getBooking(bookingId)
      setBooking(data)
    } catch (err) {
      console.error("Failed to fetch booking detail", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  const handleAction = async (action: 'accept' | 'reject' | 'cancelForfeit' | 'cancelGoodwill' | 'extendBalanceDeadline', payload?: any) => {
    if (!bookingId) return
    setActionLoading(true)
    try {
      const client = createClient()
      if (action === 'accept') {
        await bookingEndpoints(client).acceptBooking(bookingId)
      } else if (action === 'reject') {
        await bookingEndpoints(client).rejectBooking(bookingId, payload?.reason || 'No reason provided')
        setRejectModalOpen(false)
      } else if (action === 'cancelForfeit') {
        await bookingEndpoints(client).cancelForfeit(bookingId)
      } else if (action === 'cancelGoodwill') {
        await bookingEndpoints(client).cancelGoodwill(bookingId)
      } else if (action === 'extendBalanceDeadline') {
        await bookingEndpoints(client).extendBalanceDeadline(bookingId, payload?.new_deadline)
      }
      await fetchBooking()
    } catch (err) {
      console.error(`Failed to ${action} booking`, err)
      alert(`Error performing action: ${err}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500 animate-pulse">Loading booking details...</div>
  }

  if (!booking) {
    return <div className="text-center py-20 text-zinc-500">Booking not found.</div>
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Header & Actions Layout */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-zinc-200 pb-6">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="p-2 mt-1 bg-white border border-zinc-200 shadow-sm hover:bg-zinc-50 rounded-full transition-colors text-zinc-600 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Booking <span className="text-zinc-500 font-medium">#{booking.id.split('-')[0]}</span>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              For <span className="font-medium text-zinc-900">{booking.venue_name}</span> • Created on {new Date(booking.created_at || Date.now()).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge 
                label={booking.status.replace(/_/g, ' ').toUpperCase()} 
                variant={
                  booking.status === 'confirmed' ? 'success' :
                  booking.status === 'requested' || booking.status === 'owner_accepted' ? 'pending' :
                  booking.status.includes('cancelled') || booking.status.includes('expired') || booking.status === 'owner_rejected' ? 'danger' :
                  'neutral'
                }
              />
              <PaymentStatusBadge status={booking.payment_status} />
            </div>
          </div>
        </div>

        {/* Top Right Action Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {booking.status === 'requested' && (
            <>
              <Button variant="secondary" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setRejectModalOpen(true)} disabled={actionLoading}>
                <X className="h-4 w-4 mr-2" /> Reject
              </Button>
              <Button variant="primary" className="bg-brand-600 hover:bg-brand-700" onClick={() => handleAction('accept')} disabled={actionLoading}>
                <Check className="h-4 w-4 mr-2" /> Accept Request
              </Button>
            </>
          )}
          {(booking.status === 'confirmed' || booking.status === 'owner_accepted') && (
            <>
              <Button variant="secondary" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { if(confirm('Cancel and forfeit?')) handleAction('cancelForfeit') }} disabled={actionLoading}>
                Cancel (Forfeit)
              </Button>
              <Button variant="secondary" onClick={() => { if(confirm('Cancel as goodwill?')) handleAction('cancelGoodwill') }} disabled={actionLoading}>
                Cancel (Goodwill)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-200 mb-6">
        <nav className="-mb-px flex w-full overflow-x-auto no-scrollbar" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'financials', label: 'Financials', icon: Receipt },
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'notes', label: 'Notes', icon: AlignLeft },
          ].map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm transition-all ${
                  tab === t.id 
                    ? 'border-brand-500 text-brand-600' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-5">
              <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3">Event Overview</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Booking Type</div>
                  <div className="text-sm font-medium text-zinc-900 mt-1 capitalize">{booking.booking_type?.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Event Type</div>
                  <div className="text-sm font-medium text-zinc-900 mt-1">{booking.event_type || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Guest Count</div>
                  <div className="text-sm font-medium text-zinc-900 mt-1">{booking.guest_count} guests</div>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900">Event Time</div>
                    <div className="text-sm text-zinc-600 mt-0.5">
                      {booking.starts_at && new Date(booking.starts_at).toLocaleString()} — {booking.ends_at && new Date(booking.ends_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-3 border-t border-zinc-200/60">
                  <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900">Effective Operational Time</div>
                    <div className="text-xs text-zinc-500 mt-0.5 mb-1">Includes buffer for setup and teardown.</div>
                    <div className="text-sm text-zinc-600">
                      {booking.effective_starts_at && new Date(booking.effective_starts_at).toLocaleString()} — {booking.effective_ends_at && new Date(booking.effective_ends_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 space-y-5">
                <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3">Venue Snapshot</h3>
                <div className="flex gap-4 items-center">
                  {booking.venue_cover_photo_url ? (
                    <img src={booking.venue_cover_photo_url} alt="Venue" className="w-20 h-20 object-cover rounded-lg border border-zinc-200 shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-zinc-100 rounded-lg border border-zinc-200 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-zinc-300" />
                    </div>
                  )}
                  <div>
                    <div className="text-base font-semibold text-zinc-900">{booking.venue_name}</div>
                    <div className="text-sm text-zinc-500 flex items-center mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1" /> {booking.venue_city || 'City not specified'}
                    </div>
                    <Link to={`/venues/${booking.venue_id}/overview`} className="text-sm text-brand-600 hover:text-brand-700 font-medium mt-2 inline-block">
                      View Venue Details →
                    </Link>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-5">
                <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3">Customer Profile</h3>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0 border border-brand-100">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-zinc-900">{booking.user_full_name}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100 inline-block">ID: {booking.user_id}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'financials' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Financial Ledger</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600">Base Quoted Price</span>
                  <span className="font-medium text-zinc-900">{booking.display?.quoted_price || `₹${(booking.quoted_price_paise || 0)/100}`}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-600">Platform Commission ({booking.platform_commission_pct}%)</span>
                  <span className="font-medium text-rose-600">-{booking.display?.platform_fee || `₹${(booking.platform_fee_paise || 0)/100}`}</span>
                </div>

                <div className="border-t border-zinc-200 pt-4 flex justify-between items-center">
                  <span className="font-semibold text-zinc-900">Net Owner Payout</span>
                  <span className="text-xl font-bold text-emerald-600">{booking.display?.owner_payout || `₹${(booking.owner_payout_paise || 0)/100}`}</span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Payment Milestones</h4>
                
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium text-zinc-900">Advance Deposit ({booking.advance_pct}%)</span>
                    <span className="font-medium text-zinc-900">{booking.display?.advance_due || `₹${(booking.advance_due_paise || 0)/100}`}</span>
                  </div>
                  {booking.stripe_advance_payment_intent_id && (
                    <div className="text-xs text-zinc-400 font-mono mt-2 pt-2 border-t border-zinc-200/60">Ref: {booking.stripe_advance_payment_intent_id}</div>
                  )}
                </div>

                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium text-zinc-900">Balance Due</span>
                    <span className="font-medium text-zinc-900">{booking.display?.balance_due || `₹${(booking.balance_due_paise || 0)/100}`}</span>
                  </div>
                  {booking.balance_due_date && (
                    <div className="text-xs text-brand-600 font-medium">Due: {new Date(booking.balance_due_date).toLocaleDateString()}</div>
                  )}
                  {booking.stripe_balance_payment_intent_id && (
                    <div className="text-xs text-zinc-400 font-mono mt-2 pt-2 border-t border-zinc-200/60">Ref: {booking.stripe_balance_payment_intent_id}</div>
                  )}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3 mb-4">Transaction Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Amount Paid</div>
                    <div className="text-2xl font-black text-emerald-700">₹{((booking.amount_paid_paise || 0) / 100).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-5 bg-rose-50 rounded-xl border border-rose-100 text-center">
                    <div className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-2">Refunded</div>
                    <div className="text-2xl font-black text-rose-700">₹{((booking.refund_amount_paise || 0) / 100).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </Card>

              {booking.payment_status === 'unpaid' && booking.status !== 'requested' && (
                <Card className="p-5 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900">Payment Overdue / Unpaid</h4>
                      <p className="text-sm text-amber-700 mt-1">The user has not completed the required payments. Extensions used: {booking.deadline_extension_count}</p>
                      <Button variant="secondary" className="mt-4 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 text-sm shadow-sm" onClick={() => {
                        const newDate = prompt("Enter new deadline (YYYY-MM-DDTHH:mm:ssZ)");
                        if (newDate) handleAction('extendBalanceDeadline', { new_deadline: newDate })
                      }}>Extend Deadline</Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3 mb-8">Booking Lifecycle</h3>
            
            <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] md:before:ml-[23px] before:h-full before:w-[2px] before:bg-zinc-200">
              
              <div className="relative flex items-center group">
                <div className="absolute left-0 -ml-2.5 md:-ml-[5.5px] w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white bg-blue-500 shadow-sm z-10" />
                <div className="w-full pl-6 md:pl-8">
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-brand-300 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-zinc-900 text-base">Booking Requested</div>
                      <div className="text-xs font-semibold px-2 py-1 bg-brand-50 text-brand-700 rounded-md">Initial</div>
                    </div>
                    <div className="text-sm text-zinc-500">
                      User submitted request.
                      {booking.owner_action_deadline && <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block border border-amber-100 font-medium">Deadline to act: {new Date(booking.owner_action_deadline).toLocaleString()}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {booking.hold_expires_at && (
                <div className="relative flex items-center group">
                  <div className="absolute left-0 -ml-2.5 md:-ml-[5.5px] w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white bg-indigo-500 shadow-sm z-10" />
                  <div className="w-full pl-6 md:pl-8">
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-brand-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-zinc-900 text-base">Owner Accepted</div>
                        <div className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">Pending Deposit</div>
                      </div>
                      <div className="text-sm text-zinc-500">
                        Hold expires at: {new Date(booking.hold_expires_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {booking.confirmed_at && (
                <div className="relative flex items-center group">
                  <div className="absolute left-0 -ml-2.5 md:-ml-[5.5px] w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white bg-emerald-500 shadow-sm z-10" />
                  <div className="w-full pl-6 md:pl-8">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm hover:border-emerald-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-emerald-900 text-base">Booking Confirmed</div>
                        <div className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md">Deposit Paid</div>
                      </div>
                      <div className="text-sm text-emerald-700">
                        {new Date(booking.confirmed_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(booking.cancelled_at || booking.expired_at) && (
                <div className="relative flex items-center group">
                  <div className="absolute left-0 -ml-2.5 md:-ml-[5.5px] w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white bg-rose-500 shadow-sm z-10" />
                  <div className="w-full pl-6 md:pl-8">
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 shadow-sm hover:border-rose-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-rose-900 text-base">{booking.cancelled_at ? 'Cancelled' : 'Expired'}</div>
                      </div>
                      <div className="text-sm text-rose-700">
                        {new Date(booking.cancelled_at || booking.expired_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Card>
        )}

        {tab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg text-zinc-900 border-b border-zinc-100 pb-3 mb-4">User Notes / Special Requests</h3>
              {booking.user_notes ? (
                <div className="p-5 bg-zinc-50 rounded-xl text-zinc-700 text-sm whitespace-pre-wrap border border-zinc-100 leading-relaxed">
                  {booking.user_notes}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm italic p-4 text-center border border-dashed border-zinc-200 rounded-xl">No user notes provided.</div>
              )}
            </Card>

            <Card className="p-6 border-brand-200 bg-brand-50/30">
              <h3 className="font-semibold text-lg text-brand-900 border-b border-brand-100 pb-3 mb-4">Owner Internal Notes</h3>
              {booking.owner_notes ? (
                <div className="p-5 bg-white rounded-xl text-zinc-700 text-sm whitespace-pre-wrap border border-brand-200 shadow-sm leading-relaxed">
                  {booking.owner_notes}
                </div>
              ) : (
                <div className="text-brand-600/70 text-sm italic p-4 text-center border border-dashed border-brand-200 rounded-xl">No internal notes added for this booking.</div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <Modal 
          open={rejectModalOpen} 
          onClose={() => setRejectModalOpen(false)}
        >
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Reject Booking Request</h2>
              <p className="text-sm text-zinc-600 mt-1">Please provide a reason for rejecting this booking. The user will be notified.</p>
            </div>
            <textarea 
              className="w-full border border-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
              rows={4}
              placeholder="e.g. Venue is under maintenance, dates unavailable..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
               <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
               <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white border-none" onClick={() => handleAction('reject', { reason: rejectReason })}>Confirm Rejection</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
