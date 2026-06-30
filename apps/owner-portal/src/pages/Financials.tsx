import { useState, useEffect } from 'react'
import { Card, SectionHeader, PaymentStatusBadge, EmptyState, Skeleton } from '@venue404/ui'
import { IndianRupee, Wallet, TrendingDown } from 'lucide-react'
import { createClient } from '@venue404/api-client'
import { paymentEndpoints } from '@venue404/api-client/src/endpoints/payments'
import { Link } from 'react-router-dom'

function formatEventDate(booking: any): string {
  if (!booking.starts_at) return '—'
  return new Date(booking.starts_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function inr(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN')
}

const COL = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400'
const CELL = 'px-4 py-4 text-sm text-zinc-700 align-middle'

export default function Financials() {
  const [tab, setTab] = useState('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [stats, setStats] = useState({
    total_collected_paise: 0,
    pending_collection_paise: 0,
    refunds_issued_paise: 0,
    net_revenue_paise: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const client = createClient()
        const data = await paymentEndpoints(client).getOwnerStats()
        setStats({
          total_collected_paise: data.total_collected_paise || 0,
          pending_collection_paise: data.pending_collection_paise || 0,
          refunds_issued_paise: data.refunds_issued_paise || 0,
          net_revenue_paise: data.net_revenue_paise || 0,
        })
      } catch (err) {
        console.error('Failed to fetch stats', err)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true)
      try {
        const client = createClient()
        const apiTab = tab === 'all' ? undefined : tab
        const data = await paymentEndpoints(client).getOwnerBookings(apiTab)
        setBookings(data || [])
      } catch (err) {
        console.error('Failed to fetch bookings', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [tab])

  const TABS = [
    { id: 'all', label: 'All Payments' },
    { id: 'unpaid', label: 'Unpaid' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'advance_paid', label: 'Advance Paid' },
    { id: 'fully_paid', label: 'Fully Paid' },
    { id: 'refunded', label: 'Refunded' },
  ]

  return (
    <div className="space-y-6 pb-8">
      <SectionHeader
        title="Payments & Payouts"
        description="Track your earnings, pending balances, and refunds."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
        {/* Net Revenue */}
        <Card className="relative overflow-hidden p-5 border-zinc-200/60 shadow-sm col-span-1 md:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Wallet className="w-28 h-28 text-emerald-900" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Net Revenue</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">After refunds</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 tracking-tight relative z-10 mb-3">
            {inr(stats.net_revenue_paise)}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs">
            <div>
              <div className="text-zinc-400">Gross Collected</div>
              <div className="font-semibold text-zinc-700 mt-0.5">{inr(stats.total_collected_paise)}</div>
            </div>
            <div className="text-right">
              <div className="text-zinc-400">Refunds Issued</div>
              <div className="font-semibold text-red-500 mt-0.5">-{inr(stats.refunds_issued_paise)}</div>
            </div>
          </div>
        </Card>

        {/* Pending Collection */}
        <Card className="relative overflow-hidden p-5 border-zinc-200/60 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <IndianRupee className="w-28 h-28 text-amber-900" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Pending Collection</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">To be paid by users</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-zinc-900 tracking-tight relative z-10">
            {inr(stats.pending_collection_paise)}
          </div>
        </Card>

        {/* Total Refunds */}
        <Card className="relative overflow-hidden p-5 border-zinc-200/60 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingDown className="w-28 h-28 text-red-900" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Total Refunds</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Returned to customers</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-500 tracking-tight relative z-10">
            -{inr(stats.refunds_issued_paise)}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex w-full overflow-x-auto no-scrollbar" aria-label="Tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all ${
                tab === t.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {['Venue', 'Customer', 'Event Date', 'Charged', 'Payment', 'Refunded', 'Net Received', ''].map(h => (
                  <th key={h} className={COL}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td className={CELL}><Skeleton className="h-4 w-28" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-32" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-20" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-16" /></td>
                  <td className={CELL}><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-14" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-16" /></td>
                  <td className={CELL}><Skeleton className="h-4 w-12" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<IndianRupee className="h-10 w-10 text-zinc-300" />}
          title="No payments found"
          description="Try adjusting your filters to see past or pending payments."
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className={COL}>Venue</th>
                <th className={COL}>Customer</th>
                <th className={COL}>Event Date</th>
                <th className={COL}>Charged</th>
                <th className={COL}>Payment</th>
                <th className={COL}>Refunded</th>
                <th className={COL}>Net Received</th>
                <th className={COL}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bookings.map(booking => {
                const charged = booking.quoted_price_paise || 0
                const refunded = booking.refund_amount_paise || 0
                const net = charged - refunded
                const hasRefund = refunded > 0

                return (
                  <tr key={booking.id} className="hover:bg-zinc-50/70 transition-colors">

                    {/* Venue */}
                    <td className={CELL}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-400">
                          <IndianRupee className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-zinc-900 whitespace-nowrap">
                          {booking.venue_name || 'Unknown Venue'}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className={CELL}>
                      <div className="font-medium text-zinc-800 leading-tight">
                        {booking.user_full_name || 'Guest'}
                      </div>
                      {booking.user_email && (
                        <div className="text-xs text-zinc-400 mt-0.5">{booking.user_email}</div>
                      )}
                    </td>

                    {/* Event Date */}
                    <td className={`${CELL} whitespace-nowrap text-zinc-500`}>
                      {formatEventDate(booking)}
                    </td>

                    {/* Charged */}
                    <td className={`${CELL} font-semibold text-zinc-800 whitespace-nowrap`}>
                      {inr(charged)}
                    </td>

                    {/* Payment Status */}
                    <td className={CELL}>
                      <PaymentStatusBadge status={booking.payment_status} />
                    </td>

                    {/* Refunded */}
                    <td className={`${CELL} whitespace-nowrap`}>
                      {hasRefund ? (
                        <span className="font-semibold text-red-500">-{inr(refunded)}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    {/* Net Received */}
                    <td className={`${CELL} whitespace-nowrap`}>
                      {hasRefund ? (
                        <div>
                          <span className="font-bold text-zinc-900">{inr(net)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-zinc-700">{inr(charged)}</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className={CELL}>
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline underline-offset-2 transition-colors whitespace-nowrap"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
