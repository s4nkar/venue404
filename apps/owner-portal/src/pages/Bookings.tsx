import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, StatusBadge, SectionHeader, PaymentStatusBadge, EmptyState, Skeleton } from '@venue404/ui'
import { Search, Calendar, MapPin, IndianRupee } from 'lucide-react'
import { createClient, venueEndpoints, bookingEndpoints } from '@venue404/api-client'

export default function Bookings() {
  const [tab, setTab] = useState('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedVenue, setSelectedVenue] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [search])

  useEffect(() => {
    let isCurrent = true
    const fetchData = async () => {
      try {
        setLoading(true)
        const client = createClient()
        const [venuesData, allBookings] = await Promise.all([
          venueEndpoints(client).getMyVenues(),
          bookingEndpoints(client).getOwnerBookings({
            tab: tab !== 'all' ? tab : undefined,
            venue_id: selectedVenue !== 'all' ? selectedVenue : undefined,
            search: debouncedSearch || undefined
          })
        ])
        
        if (!isCurrent) return
        
        const activeVenues = (venuesData || []).filter((v: any) => v.is_active && v.status === 'approved')
        
        setBookings(allBookings || [])
        setVenues(activeVenues)
      } catch (err) {
        if (!isCurrent) return
        console.error("Failed to fetch bookings", err)
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    fetchData()
    return () => { isCurrent = false }
  }, [tab, selectedVenue, debouncedSearch])

  const TABS = [
    { id: 'all', label: 'All Bookings' },
    { id: 'requested', label: 'Pending Requests' },
    { id: 'owner_accepted', label: 'On Hold' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled/Expired' },
  ]

  const filteredBookings = bookings

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 md:gap-4 mb-2">
        <SectionHeader 
          title="All Bookings" 
          description="View and manage all booking requests across your venues." 
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by venue or user..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-zinc-400"
            />
          </div>
          <select 
            className="w-full sm:w-48 px-3 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-700 cursor-pointer"
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
          >
            <option value="all">All Venues</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
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

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-0 overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-col space-y-3 w-full sm:w-2/3">
                  <div>
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState 
          icon={<Calendar className="h-10 w-10 text-zinc-400" />}
          title="No bookings found"
          description="Try adjusting your filters or search query."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookings.map(booking => (
            <Link key={booking.id} to={`/bookings/${booking.id}`} className="block group">
              <Card className="p-0 overflow-hidden transition-all group-hover:shadow-md group-hover:border-zinc-300">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex flex-col space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-zinc-900">{booking.venue_name || 'Unknown Venue'}</h3>
                      <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Requested by: <span className="font-medium text-zinc-700">{booking.user_full_name || 'User'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        {booking.booking_type === 'full_day' ? (
                           <span>{new Date(booking.starts_at).toLocaleDateString()} - {new Date(booking.ends_at).toLocaleDateString()}</span>
                        ) : (
                           <span>{new Date(booking.starts_at).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <IndianRupee className="h-4 w-4 text-zinc-400" />
                        ₹{booking.quoted_price_paise ? booking.quoted_price_paise / 100 : 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <StatusBadge 
                      label={booking.status.replace(/_/g, ' ').toUpperCase()} 
                      variant={
                        booking.status === 'confirmed' ? 'success' :
                        booking.status === 'requested' ? 'pending' :
                        booking.status.includes('cancelled') || booking.status.includes('expired') || booking.status === 'owner_rejected' ? 'danger' :
                        'neutral'
                      }
                    />
                    <PaymentStatusBadge status={booking.payment_status} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
