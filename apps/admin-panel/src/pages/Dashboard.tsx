import { useAuth } from '../lib/AuthContext'
import {
  MetricCard, ActivityItem,
  SectionHeader, StatusBadge, EmptyState,
  type DashboardMetric,
} from '@venue404/ui'
import {
  Building2, UserCheck,
  CalendarDays, ClipboardList,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components/AdminLayout'

const METRICS: DashboardMetric[] = [
  {
    label: 'Pending Approvals',
    value: '—',
    description: 'Venues awaiting review',
    icon: <Building2 className="h-4 w-4" />,
    accent: 'amber',
  },
  {
    label: 'Active Bookings',
    value: '—',
    description: 'Confirmed this month',
    icon: <CalendarDays className="h-4 w-4" />,
    accent: 'blue',
  },
  {
    label: 'Venue Owners',
    value: '—',
    description: 'Registered on platform',
    icon: <UserCheck className="h-4 w-4" />,
    accent: 'emerald',
  },
  {
    label: 'Open Actions',
    value: '—',
    description: 'Pending admin review',
    icon: <ClipboardList className="h-4 w-4" />,
    accent: 'violet',
  },
]

const MOCK_VENUES = [
  { id: '1', name: 'The Grand Ballroom',    owner: 'Ravi Kumar',    submitted: '2h ago' },
  { id: '2', name: 'Rooftop Events Space',  owner: 'Priya Sharma',  submitted: '5h ago' },
  { id: '3', name: 'Garden Pavilion',       owner: 'Amit Patel',    submitted: '1d ago' },
]

const MOCK_ACTIONS = [
  { id: '1', action: 'Venue approved',  target: 'Sunset Terrace',    ok: true,  time: '3h ago' },
  { id: '2', action: 'User suspended',  target: 'john@example.com',  ok: false, time: '1d ago' },
  { id: '3', action: 'Venue rejected',  target: 'Old Warehouse',     ok: false, time: '2d ago' },
]

const today = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.profile.full_name?.split(' ')[0] ?? null

  return (
    <AdminLayout pageTitle="Dashboard" pageSubtitle={today}>
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          {firstName ? `Good to see you, ${firstName}` : 'Welcome back'}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          Here is what needs your attention today.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m, i) => (
          <div key={m.label} className="card-enter" style={{ '--index': i } as React.CSSProperties}>
            <MetricCard {...m} />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Pending venue approvals */}
        <div className="card-enter lg:col-span-2 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <SectionHeader
              title="Pending Venue Approvals"
              description="Submissions waiting for your review"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/venues/pending')}
                  className="press text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  View all
                </button>
              }
            />
          </div>
          <div className="px-5">
            {MOCK_VENUES.length > 0 ? (
              <ul className="divide-y divide-zinc-100">
                {MOCK_VENUES.map((v) => (
                  <li key={v.id}>
                    <ActivityItem
                      title={v.name}
                      description={`Submitted by ${v.owner}`}
                      timestamp={v.submitted}
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      badge={<StatusBadge label="Pending" variant="pending" />}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4">
                <EmptyState
                  icon={<Building2 className="h-4 w-4" />}
                  title="No pending venues"
                  description="All submissions have been reviewed."
                />
              </div>
            )}
          </div>
        </div>

        {/* Recent audit actions */}
        <div className="card-enter rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <SectionHeader
              title="Recent Admin Actions"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/audit-log')}
                  className="press text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Full log
                </button>
              }
            />
          </div>
          <ul className="divide-y divide-zinc-100 px-5">
            {MOCK_ACTIONS.map((a) => (
              <li key={a.id}>
                <ActivityItem
                  title={a.action}
                  description={a.target}
                  timestamp={a.time}
                  icon={
                    a.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <XCircle className="h-3.5 w-3.5 text-red-400" />
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card-enter mt-5 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <SectionHeader title="Quick actions" className="mb-3" />
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Review pending venues', href: '/venues/pending', icon: <Building2 className="h-3.5 w-3.5" /> },
            { label: 'View all owners',        href: '/owners',         icon: <UserCheck className="h-3.5 w-3.5" /> },
            { label: 'Open audit log',         href: '/audit-log',      icon: <ClipboardList className="h-3.5 w-3.5" /> },
            { label: 'Active bookings',        href: '/bookings',       icon: <Clock className="h-3.5 w-3.5" /> },
          ].map((a) => (
            <button
              key={a.href}
              type="button"
              onClick={() => navigate(a.href)}
              className="press flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-100"
            >
              <span className="text-zinc-400" aria-hidden="true">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
