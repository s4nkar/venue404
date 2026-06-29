import { useState, useEffect } from 'react'
import { Card, SectionHeader, PaymentStatusBadge, EmptyState, Skeleton } from '@venue404/ui'
import { IndianRupee, Wallet } from 'lucide-react'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import { Link } from 'react-router-dom'

export default function Financials() {
  const [tab, setTab] = useState('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const client = createClient()
        const allBookings = await bookingEndpoints(client).getOwnerBookings()
        
        const sortedBookings = (allBookings || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setBookings(sortedBookings)
      } catch (err) {
        console.error("Failed to fetch financials", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const TABS = [
    { id: 'all', label: 'All Payments' },
    { id: 'unpaid', label: 'Unpaid / Overdue' },
    { id: 'advance_paid', label: 'Advance Paid' },
    { id: 'fully_paid', label: 'Fully Paid' },
    { id: 'refunded', label: 'Refunded' },
  ]

  const filteredBookings = bookings.filter(b => {
    if (tab !== 'all' && b.payment_status !== tab) {
      if (tab === 'refunded' && !['refunded', 'partially_refunded'].includes(b.payment_status)) {
        return false
      } else if (tab !== 'refunded') {
        return false
      }
    }
    // Only show bookings that have a cost associated
    return b.total_price > 0
  })

  // Summary Metrics Calculation
  const totalRevenue = bookings
    .filter(b => ['fully_paid', 'advance_paid', 'completed'].includes(b.status) && b.payment_status === 'fully_paid')
    .reduce((sum, b) => sum + (b.quoted_price_paise || 0), 0)
    
  const advanceCollected = bookings
    .filter(b => b.payment_status === 'advance_paid')
    .reduce((sum, b) => sum + ((b.quoted_price_paise || 0) * 0.2), 0) // Assume 20% advance or real field if exists

  const pendingCollection = bookings
    .filter(b => ['unpaid', 'advance_paid'].includes(b.payment_status) && ['confirmed', 'completed'].includes(b.status))
    .reduce((sum, b) => sum + (b.payment_status === 'advance_paid' ? (b.quoted_price_paise || 0) * 0.8 : (b.quoted_price_paise || 0)), 0)

  return (
    <div className="space-y-6 pb-8">
      <SectionHeader 
        title="Payments & Payouts" 
        description="Track your earnings, pending balances, and refunds." 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-emerald-200 bg-emerald-50/30">
          <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
            <Wallet className="h-4 w-4" /> Total Collected
          </div>
          <div className="text-3xl font-bold text-zinc-900">₹{(totalRevenue + advanceCollected) / 100}</div>
        </Card>
        <Card className="p-5 border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <IndianRupee className="h-4 w-4" /> Pending Collection
          </div>
          <div className="text-3xl font-bold text-zinc-900">₹{pendingCollection / 100}</div>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              tab === t.id 
                ? 'bg-zinc-100 text-zinc-900' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {t.label}
          </button>
        ))}
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
      ) : filteredBookings.length === 0 ? (
        <EmptyState 
          icon={<IndianRupee className="h-10 w-10 text-zinc-400" />}
          title="No payments found"
          description="Try adjusting your filters."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredBookings.map(booking => (
            <Link key={booking.id} to={`/bookings/${booking.id}`} className="block group">
              <Card className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors group-hover:border-zinc-300 group-hover:shadow-sm">
                <div>
                  <h4 className="font-medium text-zinc-900">{booking.venue_name || 'Unknown Venue'}</h4>
                  <p className="text-sm text-zinc-500 mt-1">Booking #{booking.id.split('-')[0]} • {booking.user_full_name || 'User'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold text-zinc-900">₹{booking.quoted_price_paise ? booking.quoted_price_paise / 100 : 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">Total Amount</div>
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
