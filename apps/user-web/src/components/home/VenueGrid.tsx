import type { SearchResult } from '../../types'
import { VenueCard, VenueCardSkeleton } from './VenueCard'

type Props = {
  venues: SearchResult[]
  total: number | null
  loading: boolean
  error: string | null
  hasFilters: boolean
  onVenueClick: (id: string) => void
  onRetry: () => void
  onClearFilters: () => void
}

export function VenueGrid({
  venues,
  total,
  loading,
  error,
  hasFilters,
  onVenueClick,
  onRetry,
  onClearFilters,
}: Props) {
  const sectionHeading = hasFilters
    ? `${total ?? venues.length} result${(total ?? venues.length) !== 1 ? 's' : ''} found`
    : 'Popular venues'

  return (
    <section className="border-t border-zinc-100 bg-zinc-50/60 py-14">
      <div className="mx-auto max-w-6xl px-6">

        {/* Section header */}
        <div className="mb-7 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-zinc-900">{sectionHeading}</h2>
          {!hasFilters && (
            <span className="text-xs text-zinc-400">Showing all verified venues</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && venues.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl">🏛️</p>
            <p className="mt-3 text-sm font-medium text-zinc-700">No venues found</p>
            <p className="mt-1 text-sm text-zinc-400">
              Try adjusting your search or clearing filters.
            </p>
            {hasFilters && (
              <button
                onClick={onClearFilters}
                className="mt-5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && !error && venues.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onClick={() => onVenueClick(venue.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}