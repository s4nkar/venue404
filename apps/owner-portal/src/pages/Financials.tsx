import { useState, useEffect } from 'react'
import { Card, SectionHeader, PaymentStatusBadge, EmptyState, Skeleton } from '@venue404/ui'
import { IndianRupee, Wallet } from 'lucide-react'
import { createClient } from '@venue404/api-client'
import { paymentEndpoints } from '@venue404/api-client/src/endpoints/payments'
import { Link } from 'react-router-dom'

export default function Financials() {
  const [tab, setTab] = useState('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [stats, setStats] = useState({ total_collected_paise: 0, pending_collection_paise: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const client = createClient()
        const data = await paymentEndpoints(client).getOwnerStats()
        setStats(data)
      } catch (err) {
        console.error("Failed to fetch stats", err)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true)
      try {
        const client = createClient()
        const apiTab = tab === 'all' ? undefined : (tab === 'unpaid' ? 'unpaid_overdue' : tab)
        const data = await paymentEndpoints(client).getOwnerBookings(apiTab)
        setBookings(data || [])
      } catch (err) {
        console.error("Failed to fetch bookings", err)
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [tab])

  const TABS = [
    { id: 'all', label: 'All Payments' },
    { id: 'unpaid', label: 'Unpaid / Overdue' },
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Card className="relative overflow-hidden p-6 border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-32 h-32 text-emerald-900" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Total Collected</h3>
              <p className="text-xs text-zinc-400 mt-0.5">All-time revenue</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-zinc-900 tracking-tight relative z-10">
            ₹{(stats.total_collected_paise / 100).toLocaleString('en-IN')}
          </div>
        </Card>
        
        <Card className="relative overflow-hidden p-6 border-zinc-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
            <IndianRupee className="w-32 h-32 text-amber-900" />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Pending Collection</h3>
              <p className="text-xs text-zinc-400 mt-0.5">To be paid by users</p>
            </div>
          </div>
          <div className="text-4xl font-bold text-zinc-900 tracking-tight relative z-10">
            ₹{(stats.pending_collection_paise / 100).toLocaleString('en-IN')}
          </div>
        </Card>
      </div>

      <div className="border-b border-zinc-200 mb-6">
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

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-1/2">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <Skeleton className="h-5 w-20 mb-1 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState 
          icon={<IndianRupee className="h-10 w-10 text-zinc-300" />}
          title="No payments found"
          description="Try adjusting your filters to see past or pending payments."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(booking => (
            <Link key={booking.id} to={`/bookings/${booking.id}`} className="block group">
              <Card className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-brand-300 hover:shadow-md bg-white">
                <div className="flex flex-col">
                  <h4 className="font-semibold text-zinc-900 text-lg group-hover:text-brand-600 transition-colors">{booking.venue_name || 'Unknown Venue'}</h4>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                    <span className="font-medium text-zinc-700">#{booking.id.split('-')[0]}</span>
                    <span>•</span>
                    <span>{booking.user_full_name || 'Guest'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="font-bold text-zinc-900 text-lg">
                      ₹{booking.quoted_price_paise ? (booking.quoted_price_paise / 100).toLocaleString('en-IN') : 0}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 mt-0.5">Total Amount</div>
                  </div>
                  <PaymentStatusBadge status={booking.payment_status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
