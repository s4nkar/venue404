import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, MapPin, Users, Clock, IndianRupee,
  CheckCircle2, XCircle, ShieldOff, ShieldCheck,
  ImageOff, Search,
} from 'lucide-react'
import { createClient, adminVenueEndpoints } from '@venue404/api-client'
import type { AdminVenueItem, AdminVenueStats } from '@venue404/api-client'
import { AdminLayout } from '../components/AdminLayout'
import {
  MetricCard, SectionHeader, StatusBadge, EmptyState,
  LoadingScreen, ErrorState, Button, Modal,
} from '@venue404/ui'

const api = adminVenueEndpoints(createClient())

type TabStatus = AdminVenueItem['status'] | ''

const TABS: { label: string; value: TabStatus; statsKey?: keyof AdminVenueStats }[] = [
  { label: 'All',              value: '' },
  { label: 'Pending Approval', value: 'pending_approval', statsKey: 'pending_approval' },
  { label: 'Approved',         value: 'approved',         statsKey: 'approved' },
  { label: 'Rejected',         value: 'rejected',         statsKey: 'rejected' },
  { label: 'Suspended',        value: 'suspended',        statsKey: 'suspended' },
]

function statusVariant(s: AdminVenueItem['status']): 'success' | 'danger' | 'pending' | 'warning' | 'neutral' {
  if (s === 'approved')         return 'success'
  if (s === 'suspended')        return 'danger'
  if (s === 'pending_approval') return 'pending'
  if (s === 'rejected')         return 'warning'
  return 'neutral'
}

function statusLabel(s: AdminVenueItem['status']): string {
  if (s === 'pending_approval') return 'Pending Approval'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function venueTypeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function pricingLabel(v: AdminVenueItem): string {
  const fmt = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`
  if (v.pricing_mode === 'flat' && v.starting_price_paise != null)
    return `${fmt(v.starting_price_paise)} flat`
  if (v.pricing_mode === 'hourly' && v.hourly_rate_paise != null)
    return `${fmt(v.hourly_rate_paise)}/hr`
  if (v.pricing_mode === 'mixed')
    return [
      v.starting_price_paise != null ? fmt(v.starting_price_paise) : null,
      v.hourly_rate_paise != null ? `${fmt(v.hourly_rate_paise)}/hr` : null,
    ].filter(Boolean).join(' + ')
  return '—'
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

const PAGE_SIZE = 10

export default function VenueApprovals() {
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabStatus>('pending_approval')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Modal targets — no loading/error state needed, mutations own that
  const [approveTarget, setApproveTarget] = useState<AdminVenueItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminVenueItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [suspendTarget, setSuspendTarget] = useState<AdminVenueItem | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [reactivateTarget, setReactivateTarget] = useState<AdminVenueItem | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, 350)
  }
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // ── Query ───────────────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'venues', { page, status: activeTab, search }],
    queryFn: () => api.listVenues({
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

  const invalidateVenues = () => qc.invalidateQueries({ queryKey: ['admin', 'venues'] })

  // ── Mutations ───────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveVenue(id),
    onSuccess: () => { invalidateVenues(); closeApprove() },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.rejectVenue(id, { reason }),
    onSuccess: () => { invalidateVenues(); closeReject() },
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.suspendVenue(id, { reason }),
    onSuccess: () => { invalidateVenues(); closeSuspend() },
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.reactivateVenue(id),
    onSuccess: () => { invalidateVenues(); closeReactivate() },
  })

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function closeApprove()    { setApproveTarget(null);    approveMutation.reset() }
  function closeReject()     { setRejectTarget(null);     setRejectReason('');  rejectMutation.reset() }
  function closeSuspend()    { setSuspendTarget(null);    setSuspendReason(''); suspendMutation.reset() }
  function closeReactivate() { setReactivateTarget(null); reactivateMutation.reset() }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleApprove() {
    if (!approveTarget) return
    approveMutation.mutate(approveTarget.id)
  }

  function handleReject() {
    if (!rejectTarget) return
    rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() || undefined })
  }

  function handleSuspend() {
    if (!suspendTarget || !suspendReason.trim()) return
    suspendMutation.mutate({ id: suspendTarget.id, reason: suspendReason.trim() })
  }

  function handleReactivate() {
    if (!reactivateTarget) return
    reactivateMutation.mutate(reactivateTarget.id)
  }

  return (
    <AdminLayout pageTitle="Venue Approvals" pageSubtitle="Review, approve, and manage venue listings">

      {/* Stats strip */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Pending Approval', value: stats?.pending_approval, accent: 'amber' as const, icon: <Clock className="h-4 w-4" /> },
          { label: 'Approved',         value: stats?.approved,         accent: 'emerald' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
          { label: 'Suspended',        value: stats?.suspended,        accent: 'rose' as const,    icon: <ShieldOff className="h-4 w-4" /> },
          { label: 'Total Venues',     value: stats?.total,            accent: 'brand' as const,    icon: <Building2 className="h-4 w-4" /> },
        ].map((m, i) => (
          <div key={m.label} className="card-enter" style={{ '--index': i } as React.CSSProperties}>
            <MetricCard
              label={m.label}
              value={m.value !== undefined ? String(m.value) : '—'}
              description=""
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
            title="Venue listings"
            description={!isLoading ? `${total} ${total === 1 ? 'venue' : 'venues'}` : undefined}
          />
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
                placeholder="Search by venue name…"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="px-5 py-12">
            <LoadingScreen message="Loading venues…" fullScreen={false} />
          </div>
        )}

        {!isLoading && error && (
          <div className="px-5 py-12">
            <ErrorState
              title="Could not load venues"
              message={error instanceof Error ? error.message : 'Failed to load venues'}
              fullScreen={false}
              action={<Button variant="secondary" onClick={invalidateVenues}>Retry</Button>}
            />
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="px-5 py-12">
            <EmptyState
              icon={<Building2 className="h-4 w-4" />}
              title={activeTab === 'pending_approval' ? 'No pending venues' : 'No venues found'}
              description={
                activeTab === 'pending_approval'
                  ? 'All venue submissions have been reviewed.'
                  : 'No venues match this filter.'
              }
            />
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {items.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onApprove={() => setApproveTarget(venue)}
                onReject={() => setRejectTarget(venue)}
                onSuspend={() => setSuspendTarget(venue)}
                onReactivate={() => setReactivateTarget(venue)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
            <span>
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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
      </div>

      {/* ── Approve Modal ─────────────────────────────────────────────────────── */}
      <Modal open={approveTarget !== null} onClose={closeApprove}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-900/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-zinc-900">Approve venue</h3>
            <p className="mb-5 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{approveTarget?.name}</span> will be
              listed publicly and visible to customers immediately.
            </p>
            {approveMutation.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {approveMutation.error instanceof Error ? approveMutation.error.message : 'Failed to approve venue'}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeApprove} disabled={approveMutation.isPending}>Cancel</Button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="press rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving…' : 'Approve venue'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────────────── */}
      <Modal open={rejectTarget !== null} onClose={closeReject}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-900/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-zinc-900">Reject venue</h3>
            <p className="mb-5 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{rejectTarget?.name}</span> will be
              marked rejected. The owner can resubmit after making changes.
            </p>
            <div>
              <label htmlFor="reject-reason">
                Reason <span className="font-normal text-zinc-400 text-xs">(optional)</span>
              </label>
              <input
                id="reject-reason"
                type="text"
                placeholder="e.g. Incomplete information, poor photos"
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); rejectMutation.reset() }}
                autoFocus
              />
              {rejectMutation.error && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {rejectMutation.error instanceof Error ? rejectMutation.error.message : 'Failed to reject venue'}
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeReject} disabled={rejectMutation.isPending}>Cancel</Button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="press rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject venue'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Suspend Modal ─────────────────────────────────────────────────────── */}
      <Modal open={suspendTarget !== null} onClose={closeSuspend}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-900/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <ShieldOff className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-zinc-900">Suspend venue</h3>
            <p className="mb-1 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{suspendTarget?.name}</span> will be
              hidden from customers immediately. This action cannot proceed if the venue has
              active bookings.
            </p>
            <p className="mb-5 text-xs text-amber-600 font-medium">
              Venues with confirmed or accepted bookings cannot be suspended.
            </p>
            <div>
              <label htmlFor="suspend-reason">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                id="suspend-reason"
                type="text"
                placeholder="e.g. Violation of platform terms"
                value={suspendReason}
                onChange={(e) => { setSuspendReason(e.target.value); suspendMutation.reset() }}
                autoFocus
              />
              {suspendMutation.error && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {suspendMutation.error instanceof Error ? suspendMutation.error.message : 'Failed to suspend venue'}
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeSuspend} disabled={suspendMutation.isPending}>Cancel</Button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={suspendMutation.isPending || !suspendReason.trim()}
                className="press rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {suspendMutation.isPending ? 'Suspending…' : 'Suspend venue'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Reactivate Modal ──────────────────────────────────────────────────── */}
      <Modal open={reactivateTarget !== null} onClose={closeReactivate}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-900/5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-zinc-900">Reactivate venue</h3>
            <p className="mb-5 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{reactivateTarget?.name}</span> will be
              restored to approved status and visible to customers again.
            </p>
            {reactivateMutation.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {reactivateMutation.error instanceof Error ? reactivateMutation.error.message : 'Failed to reactivate venue'}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeReactivate} disabled={reactivateMutation.isPending}>Cancel</Button>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
                className="press rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate venue'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

    </AdminLayout>
  )
}

// ── Venue Card ───────────────────────────────────────────────────────────────

type VenueCardProps = {
  venue: AdminVenueItem
  onApprove: () => void
  onReject: () => void
  onSuspend: () => void
  onReactivate: () => void
}

function VenueCard({ venue, onApprove, onReject, onSuspend, onReactivate }: VenueCardProps) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [venue.id])

  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">

        {/* Cover photo */}
        <div className="relative h-44 w-full overflow-hidden bg-zinc-100">
          {venue.cover_photo_url && !imgError ? (
            <img
              src={venue.cover_photo_url}
              alt={venue.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-zinc-300" />
            </div>
          )}
          <div className="absolute right-3 top-3">
            <StatusBadge
              label={statusLabel(venue.status)}
              variant={statusVariant(venue.status)}
            />
          </div>
          {venue.status === 'approved' && !venue.is_active && (
            <div className="absolute left-3 top-3">
              <StatusBadge label="Inactive" variant="neutral" dot={false} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-zinc-900">{venue.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-zinc-400">{venueTypeLabel(venue.venue_type)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-zinc-700">{venue.owner.full_name ?? '—'}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{venue.owner.email ?? '—'}</p>
            </div>
          </div>

          {/* Description */}
          {venue.description && (
            <p className="mt-3 text-sm text-zinc-500 line-clamp-2">{venue.description}</p>
          )}

          {/* Details grid */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
            <DetailItem icon={<MapPin className="h-3.5 w-3.5" />}>
              {venue.city}, {venue.state}
            </DetailItem>
            <DetailItem icon={<Users className="h-3.5 w-3.5" />}>
              {venue.min_capacity ? `${venue.min_capacity}–` : 'Up to '}{venue.max_capacity} guests
            </DetailItem>
            <DetailItem icon={<IndianRupee className="h-3.5 w-3.5" />}>
              {pricingLabel(venue)}
            </DetailItem>
            <DetailItem icon={<Clock className="h-3.5 w-3.5" />}>
              {formatTime(venue.open_time)} – {formatTime(venue.close_time)}
            </DetailItem>
          </div>

          {/* Address */}
          <p className="mt-3 text-xs text-zinc-400">{venue.address_line1}, {venue.city}</p>

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {venue.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Advance / commission note */}
          <p className="mt-3 text-xs text-zinc-400">
            {venue.advance_pct}% advance · {venue.platform_commission_pct}% platform commission
          </p>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4">
            {venue.status === 'pending_approval' && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  className="press inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="press inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}

            {venue.status === 'approved' && (
              <button
                type="button"
                onClick={onSuspend}
                className="press inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}

            {(venue.status === 'suspended' || venue.status === 'rejected') && (
              <button
                type="button"
                onClick={onReactivate}
                className="press inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Reactivate
              </button>
            )}

            <span className="ml-auto text-xs text-zinc-300">
              Submitted {new Date(venue.updated_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-zinc-600">
      <span className="mt-0.5 shrink-0 text-zinc-400">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
