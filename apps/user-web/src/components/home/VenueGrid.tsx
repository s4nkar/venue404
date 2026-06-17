import { useState, useMemo } from 'react'
import type { SearchResult } from '../../types'
import { VenueCard, VenueCardSkeleton } from './VenueCard'
import { SearchSidebar } from './SearchSidebar'

const PAGE_SIZE = 12

type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'capacity_desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price_asc',   label: 'Price: Low → High' },
  { key: 'price_desc',  label: 'Price: High → Low' },
  { key: 'capacity_desc', label: 'Largest first' },
]

function sortVenues(venues: SearchResult[], sort: SortKey): SearchResult[] {
  const copy = [...venues]
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => (a.starting_price_paise ?? 0) - (b.starting_price_paise ?? 0))
    case 'price_desc':
      return copy.sort((a, b) => (b.starting_price_paise ?? 0) - (a.starting_price_paise ?? 0))
    case 'capacity_desc':
      return copy.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0))
    default:
      return copy
  }
}

type Props = {
  venues: SearchResult[]
  total: number | null
  loading: boolean
  error: string | null
  hasFilters: boolean
  venueType: string
  capacity: string
  onVenueClick: (id: string) => void
  onRetry: () => void
  onClearFilters: () => void
  onVenueTypeChange: (type: string) => void
  onCapacityChange: (value: string) => void
}

// ─── Mobile filter drawer toggle ─────────────────────────────────────────────

function FilterToggle({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
      Filters
      {count > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
        <svg className="h-7 w-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p className="text-base font-semibold text-zinc-800">No venues found</p>
      <p className="mt-1.5 max-w-xs text-sm text-zinc-400">
        {hasFilters
          ? 'Try adjusting your filters or searching a different location.'
          : 'No venues are available right now. Check back soon.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VenueGrid({
  venues,
  total,
  loading,
  error,
  hasFilters,
  venueType,
  capacity,
  onVenueClick,
  onRetry,
  onClearFilters,
  onVenueTypeChange,
  onCapacityChange,
}: Props) {
  const [sort, setSort]             = useState<SortKey>('recommended')
  const [page, setPage]             = useState(1)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const activeFilterCount = [venueType, capacity].filter(Boolean).length

  const sorted = useMemo(() => sortVenues(venues, sort), [venues, sort])
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(next: SortKey) {
    setSort(next)
    setPage(1)
  }

  function handleFilterChange() {
    setPage(1)
  }

  return (
    <section className="border-t border-zinc-100 bg-zinc-50/50 py-10">
      <div className="mx-auto max-w-6xl px-6">

        {/* ── Top bar: result count + mobile filter toggle + sort ────────── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FilterToggle
              onClick={() => setMobileFiltersOpen((v) => !v)}
              count={activeFilterCount}
            />
            {!loading && (
              <p className="text-sm text-zinc-500">
                {hasFilters ? (
                  <>
                    <span className="font-semibold text-zinc-900">{total ?? venues.length}</span>
                    {' '}venue{(total ?? venues.length) !== 1 ? 's' : ''} found
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-zinc-900">{venues.length}</span>
                    {' '}verified venues
                  </>
                )}
              </p>
            )}
            {loading && (
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => handleSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-700 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* ── Mobile filter drawer ──────────────────────────────────────── */}
        {mobileFiltersOpen && (
          <div className="mb-6 lg:hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <SearchSidebar
              venueType={venueType}
              capacity={capacity}
              onVenueTypeChange={(t) => { onVenueTypeChange(t); handleFilterChange() }}
              onCapacityChange={(v) => { onCapacityChange(v); handleFilterChange() }}
              onClearFilters={onClearFilters}
              hasFilters={hasFilters}
              totalResults={total}
            />
          </div>
        )}

        {/* ── Layout: sidebar + results ─────────────────────────────────── */}
        <div className="flex gap-8">

          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-[76px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <SearchSidebar
                venueType={venueType}
                capacity={capacity}
                onVenueTypeChange={(t) => { onVenueTypeChange(t); handleFilterChange() }}
                onCapacityChange={(v) => { onCapacityChange(v); handleFilterChange() }}
                onClearFilters={onClearFilters}
                hasFilters={hasFilters}
                totalResults={total}
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">

            {/* Loading skeletons */}
            {loading && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <VenueCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-700">{error}</p>
                <button
                  onClick={onRetry}
                  className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && venues.length === 0 && (
              <EmptyState hasFilters={hasFilters} onClearFilters={onClearFilters} />
            )}

            {/* Results grid */}
            {!loading && !error && paged.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {paged.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      onClick={() => onVenueClick(venue.id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1
                      const isActive = p === page
                      const isNearby = Math.abs(p - page) <= 1
                      const isEdge = p === 1 || p === totalPages

                      if (!isNearby && !isEdge) {
                        if (p === 2 || p === totalPages - 1) {
                          return <span key={p} className="text-zinc-400 text-sm">…</span>
                        }
                        return null
                      }

                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-brand text-white shadow-sm'
                              : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
