import { useState, useEffect } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components/AdminLayout'
import { createClient } from '@venue404/api-client'
import { adminActionEndpoints } from '@venue404/api-client'
import type { AdminAction } from '@venue404/api-client'

const actionsApi = adminActionEndpoints(createClient())

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

const today = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

function actionLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function actionIcon(type: string) {
  const ok = type.endsWith('approved') || type.endsWith('reactivated') || type.endsWith('completed')
  return ok
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    : <XCircle className="h-3.5 w-3.5 text-red-400" />
}

function actionBadge(type: string) {
  if (type.includes('suspend')) return <StatusBadge label="Suspended" variant="danger" dot={false} />
  if (type.includes('reactivat')) return <StatusBadge label="Reactivated" variant="success" dot={false} />
  if (type.includes('approved')) return <StatusBadge label="Approved" variant="success" dot={false} />
  if (type.includes('rejected')) return <StatusBadge label="Rejected" variant="warning" dot={false} />
  return null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [recentActions, setRecentActions] = useState<AdminAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)

  useEffect(() => {
    actionsApi.listActions({ limit: 8 })
      .then((res) => setRecentActions(res.items))
      .catch(() => { /* silent — dashboard degrades gracefully */ })
      .finally(() => setActionsLoading(false))
  }, [])

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

        {/* Recent audit actions — real data */}
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

          {actionsLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-300" />
            </div>
          )}

          {!actionsLoading && recentActions.length === 0 && (
            <div className="px-5 py-4">
              <EmptyState
                icon={<ClipboardList className="h-4 w-4" />}
                title="No actions yet"
                description="Admin actions will appear here."
              />
            </div>
          )}

          {!actionsLoading && recentActions.length > 0 && (
            <ul className="divide-y divide-zinc-100 px-5">
              {recentActions.map((a) => (
                <li key={a.id}>
                  <ActivityItem
                    title={actionLabel(a.action_type)}
                    description={a.reason ?? a.target_type}
                    timestamp={timeAgo(a.created_at)}
                    icon={actionIcon(a.action_type)}
                    badge={actionBadge(a.action_type) ?? undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card-enter mt-5 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <SectionHeader title="Quick actions" className="mb-3" />
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Review pending venues', href: '/venues/pending', icon: <Building2 className="h-3.5 w-3.5" /> },
            { label: 'Manage users',           href: '/users',          icon: <UserCheck className="h-3.5 w-3.5" /> },
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
