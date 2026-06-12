import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient, bookingEndpoints } from '@venue404/api-client'
import {
  AppShell,
  Card,
  LoadingScreen,
  ErrorState,
  Button,
  EmptyState,
} from '@venue404/ui'
import { Calendar, Clock, IndianRupee } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'confirmed'
  | 'cancelled'
  | 'rejected'
  | 'expired'

type PaymentStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'

type Booking = {
  id: string
  status: BookingStatus
  payment_status: PaymentStatus

  booking_type: 'full_day' | 'time_slot'

  quoted_price_paise: number
  balance_due_paise: number

  venue_name?: string

  starts_at?: string
  ends_at?: string
}

type TabType =
  | 'upcoming'
  | 'pending'
  | 'past'
  | 'cancelled'

export default function MyBookings() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true)

        const client = createClient()

        const data =
          await bookingEndpoints(client).listBookings()

        setBookings(data as Booking[])
      } catch (err: any) {
        setError(
          err?.message ??
          'Failed to load bookings'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const filteredBookings = useMemo(() => {
    const now = new Date()

    switch (activeTab) {
      case 'upcoming':
        return bookings.filter((booking) => {
          const end = booking.ends_at
            ? new Date(booking.ends_at)
            : null

          return (
            ['accepted', 'confirmed'].includes(
              booking.status
            ) &&
            (!end || end > now)
          )
        })

      case 'pending':
        return bookings.filter(
          (booking) =>
            booking.status === 'requested'
        )

      case 'past':
        return bookings.filter((booking) => {
          const end = booking.ends_at
            ? new Date(booking.ends_at)
            : null

          return (
            booking.status === 'confirmed' &&
            end &&
            end < now
          )
        })

      case 'cancelled':
        return bookings.filter((booking) =>
          [
            'cancelled',
            'rejected',
            'expired',
          ].includes(booking.status)
        )

      default:
        return bookings
    }
  }, [bookings, activeTab])

  const navItems = [
    {
      label: 'Explore',
      href: '/',
    },
    {
      label: 'My Bookings',
      href: '/my-bookings',
    },
    {
      label: 'Profile',
      href: '/profile',
    },
  ]

  const mappedUser = user
    ? {
      name:
        user.profile.full_name ||
        user.email ||
        'Customer',
      email: user.email || '',
      role: 'Customer',
    }
    : undefined

  if (loading) {
    return (
      <LoadingScreen message="Loading bookings..." />
    )
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <AppShell
      navItems={navItems}
      activePath="/my-bookings"
      onNavigate={(href) => navigate(href)}
      pageTitle="My Bookings"
      pageSubtitle="Track and manage your venue reservations"
      user={mappedUser}
      onSignOut={signOut}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <BookingTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {filteredBookings.length === 0 ? (
          <EmptyBookingState
            tab={activeTab}
            onBrowse={() => navigate('/')}
          />
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onView={() =>
                  navigate(
                    `/bookings/${booking.id}`
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function BookingTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabType
  onChange: (tab: TabType) => void
}) {
  const tabs: {
    value: TabType
    label: string
  }[] = [
      {
        value: 'upcoming',
        label: 'Upcoming',
      },
      {
        value: 'pending',
        label: 'Pending',
      },
      {
        value: 'past',
        label: 'Past',
      },
      {
        value: 'cancelled',
        label: 'Cancelled',
      },
    ]

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() =>
            onChange(tab.value)
          }
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.value
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function BookingCard({
  booking,
  onView,
}: {
  booking: Booking
  onView: () => void
}) {
  const formatPrice = (paise?: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((paise ?? 0) / 100)

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-zinc-900">
              {booking.venue_name ??
                'Venue'}
            </h3>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
              {booking.starts_at && (
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(
                    booking.starts_at
                  ).toLocaleDateString()}
                </div>
              )}

              {booking.starts_at &&
                booking.ends_at && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(
                      booking.starts_at
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
            </div>
          </div>

          <BookingStatusBadge
            status={booking.status}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">
              Booking Type
            </div>
            <div className="text-sm font-medium capitalize">
              {booking.booking_type.replace(
                '_',
                ' '
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500">
              Total Price
            </div>
            <div className="font-semibold text-zinc-900 flex items-center gap-1">
              <IndianRupee size={14} />
              {formatPrice(
                booking.quoted_price_paise
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            variant="primary"
            onClick={onView}
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  )
}

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus
}) {
  const styles: Record<
    BookingStatus,
    string
  > = {
    requested:
      'bg-amber-50 text-amber-700 border-amber-200',
    accepted:
      'bg-blue-50 text-blue-700 border-blue-200',
    confirmed:
      'bg-green-50 text-green-700 border-green-200',
    cancelled:
      'bg-red-50 text-red-700 border-red-200',
    rejected:
      'bg-zinc-100 text-zinc-700 border-zinc-200',
    expired:
      'bg-zinc-100 text-zinc-700 border-zinc-200',
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${styles[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function EmptyBookingState({
  tab,
  onBrowse,
}: {
  tab: TabType
  onBrowse: () => void
}) {
  const messages: Record<
    TabType,
    string
  > = {
    upcoming:
      'No upcoming bookings found.',
    pending:
      'No pending booking requests.',
    past: 'No completed bookings yet.',
    cancelled:
      'No cancelled bookings.',
  }

  return (
    <Card>
      <div className="p-10 text-center space-y-4">
        <p className="text-zinc-500">
          {messages[tab]}
        </p>

        {tab === 'upcoming' && (
          <Button
            variant="primary"
            onClick={onBrowse}
          >
            Browse Venues
          </Button>
        )}
      </div>
    </Card>
  )
}