import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Building2, User, Search,
  CheckCircle2, Clock, CalendarCheck,
} from 'lucide-react'
import { createClient, adminBookingEndpoints } from '@venue404/api-client'
import type { AdminBookingSummary } from '@venue404/api-client'
import { AdminLayout } from '../components/AdminLayout'
import {
  MetricCard, SectionHeader, StatusBadge, EmptyState,
  LoadingScreen, ErrorState, Button,
} from '@venue404/ui'

const api = adminBookingEndpoints(createClient())

const PAGE_SIZE = 25
const DEBOUNCE_MS = 350

type TabValue = '' | 'requested' | 'confirmed' | 'completed' | 'cancelled'

const TABS: { label: string; value: TabValue; statsKey?: 'requested' | 'confirmed' | 'completed' | 'cancelled' }[] = [
  { label: 'All',       value: '' },
  { label: 'Requested', value: 'requested', statsKey: 'requested' },
  { label: 'Confirmed', value: 'confirmed', statsKey: 'confirmed' },
  { label: 'Completed', value: 'completed', statsKey: 'completed' },
  { label: 'Cancelled', value: 'cancelled', statsKey: 'cancelled' },
]

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'pending' | 'neutral' {
  if (status === 'confirmed')      return 'success'
  if (status === 'completed')      return 'neutral'
  if (status === 'owner_accepted') return 'warning'
  if (status === 'requested')      return 'pending'
  return 'danger'
}

function statusLabel(status: string): string {
  if (status === 'owner_accepted')            return 'Accepted'
  if (status === 'conflict_cancelled')        return 'Conflict Cancelled'
  if (status === 'user_cancelled')            return 'User Cancelled'
  if (status === 'admin_cancelled')           return 'Admin Cancelled'
  if (status === 'owner_rejected')            return 'Rejected'
  if (status === 'hold_expired')              return 'Hold Expired'
  if (status === 'request_expired')           return 'Request Expired'
  if (status === 'balance_overdue_cancelled') return 'Balance Overdue'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(iso)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Bookings() {
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabValue>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, DEBOUNCE_MS)
  }
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'bookings', { page, status: activeTab, search }],
    queryFn: () => api.listBookings({
      page,
      page_size: PAGE_SIZE,
      status: activeTab || undefined,
      search: search.trim() || undefined,
    }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1
  const stats = data?.stats ?? null
  const hasFilters = !!(searchInput || activeTab)

  const invalidateBookings = () => qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })

  return (
    <AdminLayout pageTitle="Bookings" pageSubtitle="Monitor booking activity across the marketplace">

      {/* Metric strip */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Bookings', value: stats?.total,     accent: 'brand'   as const, icon: <CalendarDays className="h-4 w-4" />,  description: 'All time' },
          { label: 'Confirmed',      value: stats?.confirmed, accent: 'emerald' as const, icon: <CheckCircle2 className="h-4 w-4" />,   description: 'Payment received' },
          { label: 'Requested',      value: stats?.requested, accent: 'amber'   as const, icon: <Clock className="h-4 w-4" />,          description: 'Awaiting owner action' },
          { label: 'Completed',      value: stats?.completed, accent: 'violet'  as const, icon: <CalendarCheck className="h-4 w-4" />,  description: 'Successfully held' },
        ].map((m, i) => (
          <div key={m.label} className="card-enter" style={{ '--index': i } as React.CSSProperties}>
            <MetricCard
              label={m.label}
              value={m.value !== undefined ? String(m.value) : '—'}
              description={m.description}
              icon={m.icon}
              accent={m.accent}
            />
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="card-enter rounded-xl border border-zinc-200 bg-white shadow-sm" style={{ '--index': 4 } as React.CSSProperties}>

        {/* Header + tabs */}
        <div className="border-b border-zinc-100 px-5 pt-4">
          <SectionHeader
            title="All bookings"
            description={
              !isLoading && data
                ? `${total.toLocaleString()} ${total === 1 ? 'booking' : 'bookings'}${hasFilters ? ' matching filters' : ''}`
                : undefined
            }
          />

          {/* Tabs */}
          <div className="mt-3 flex items-center gap-0.5 border-b border-zinc-100 -mx-5 px-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.value
              const count = tab.statsKey ? stats?.[tab.statsKey] : undefined
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { setActiveTab(tab.value); setPage(1) }}
                  className={[
                    'relative px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none',
                    isActive
                      ? 'text-zinc-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand'
                      : 'text-zinc-400 hover:text-zinc-600',
                  ].join(' ')}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className={[
                      'ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                      isActive ? 'bg-brand-light-strong text-brand' : 'bg-zinc-100 text-zinc-500',
                    ].join(' ')}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="mt-3 mb-4">
            <div className="relative max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search by venue or customer…"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>
        </div>

        {/* Content states */}
        {isLoading && (
          <div className="px-5 py-10">
            <LoadingScreen message="Loading bookings…" fullScreen={false} />
          </div>
        )}

        {!isLoading && error && (
          <div className="px-5 py-10">
            <ErrorState
              title="Could not load bookings"
              message={error instanceof Error ? error.message : 'Failed to load bookings'}
              fullScreen={false}
              action={<Button variant="secondary" onClick={invalidateBookings}>Retry</Button>}
            />
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="px-5 py-10">
            <EmptyState
              icon={<CalendarDays className="h-4 w-4" />}
              title="No bookings found"
              description={
                hasFilters
                  ? 'Try adjusting the search or filters.'
                  : 'Bookings will appear here once customers start making requests.'
              }
            />
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Venue</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Event date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Guests</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {items.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
                <span>
                  {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="press rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="tabular-nums">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="press rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function BookingRow({ booking: b }: { booking: AdminBookingSummary }) {
  return (
    <tr className="transition-colors hover:bg-zinc-50/70">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
          <span className="font-medium text-zinc-900">{b.venue_name}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
          <div className="min-w-0">
            <div className="truncate text-zinc-800">{b.customer_name ?? '—'}</div>
            {b.customer_email && (
              <div className="truncate text-xs text-zinc-400">{b.customer_email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-zinc-600">{fmtDate(b.event_date)}</td>
      <td className="px-5 py-3.5">
        <StatusBadge label={statusLabel(b.status)} variant={statusVariant(b.status)} dot={false} />
      </td>
      <td className="px-5 py-3.5 tabular-nums text-zinc-600">{b.guest_count}</td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-zinc-400" title={fmtDateTime(b.created_at)}>
          {timeAgo(b.created_at)}
        </span>
      </td>
    </tr>
  )
}
