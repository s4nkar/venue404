import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { MetricCard, SectionHeader, StatusBadge, Card, Skeleton } from '@venue404/ui'
import { CalendarDays, IndianRupee, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const userName = user?.profile?.full_name?.split(' ')[0] || 'Owner'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API fetch for the mock data
    const timer = setTimeout(() => {
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // MOCK DATA for now until API client is fully wired
  const stats = {
    venues: 3,
    requests: 7,
    revenue: "1,20,000",
    payouts: "45,000"
  }

  const urgentActions = [
    { id: '1', type: 'request', message: 'Priya Mehta wants to book Skyline Rooftop on Aug 17', link: '/bookings/101' },
    { id: '2', type: 'hold_expired', message: 'Hold expired for Grand Ballroom — 2 other requests waiting', link: '/bookings/102' },
    { id: '3', type: 'overdue', message: 'Balance overdue for Booking #1042 — respond by 6 PM today', link: '/bookings/1042' },
  ]

  const upcomingEvents = [
    { id: '201', venue: 'Skyline Rooftop', date: 'Aug 17, 2026', time: '18:00 - 23:00', guests: 150, status: 'fully_paid' },
    { id: '202', venue: 'Grand Ballroom', date: 'Aug 20, 2026', time: 'Full Day', guests: 300, status: 'advance_paid' },
  ]

  if (loading) {
    return (
      <div className="space-y-8 pb-8 pt-4">
        <section>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <div className="flex flex-col gap-3">
              {[1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Strip */}
      <section>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Good morning, {userName}</h1>
        <p className="mt-1 text-zinc-500">
          You have <span className="font-medium text-zinc-900">{stats.venues} venues</span>,{' '}
          <span className="font-medium text-amber-600">{stats.requests} pending requests</span>, and{' '}
          <span className="font-medium text-emerald-600">₹{stats.payouts} in upcoming payouts</span>.
        </p>
      </section>

      {/* KPI Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Requests received"
          value={stats.requests.toString()}
          icon={<Clock className="h-5 w-5" />}
          accent="amber"
          description="Pending owner response"
        />
        <MetricCard
          label="Bookings confirmed"
          value="12"
          icon={<CalendarDays className="h-5 w-5" />}
          accent="brand"
          description="This month"
        />
        <MetricCard
          label="Revenue collected"
          value={`₹${stats.revenue}`}
          icon={<IndianRupee className="h-5 w-5" />}
          accent="emerald"
          description="This month"
        />
        <MetricCard
          label="Pending payouts"
          value={`₹${stats.payouts}`}
          icon={<IndianRupee className="h-5 w-5" />}
          accent="brand"
          description="To be processed"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Urgent Actions */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="Urgent Actions" description="Items that need your attention today" />
          
          {urgentActions.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-zinc-500">
                All clear — no actions needed right now ✓
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {urgentActions.map((action) => (
                <Link 
                  key={action.id} 
                  to={action.link}
                  className="flex items-center justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-sm font-medium text-zinc-900">{action.message}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <SectionHeader title="Upcoming Events" description="Next 5 confirmed events" />
          <div className="flex flex-col gap-3">
            {upcomingEvents.map((event) => (
              <Card key={event.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm text-zinc-900">{event.venue}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{event.date} • {event.time}</p>
                    </div>
                    <StatusBadge 
                      label={event.status === 'fully_paid' ? 'Fully Paid' : 'Advance Paid'} 
                      variant={event.status === 'fully_paid' ? 'success' : 'pending'} 
                    />
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">
                    {event.guests} guests
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
