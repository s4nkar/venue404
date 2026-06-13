import { VENUE_TYPE_LABELS } from '../../constants'
import { formatPrice } from '../../utils'
import type { SearchResult } from '../../types'

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function VenueCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-44 bg-zinc-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-zinc-100 rounded w-2/3" />
        <div className="h-3 bg-zinc-100 rounded w-1/2" />
        <div className="h-5 bg-zinc-100 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type Props = {
  venue: SearchResult
  onClick: () => void
}

export function VenueCard({ venue, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Photo */}
      <div className="relative h-44 bg-zinc-100 overflow-hidden">
        {venue.cover_photo_url ? (
          <img
            src={venue.cover_photo_url}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-zinc-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}
        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-medium text-zinc-700 border border-zinc-200/50">
          {VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-sm font-semibold text-zinc-900 leading-tight truncate group-hover:text-blue-600 transition-colors">
          {venue.name}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {venue.city}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div className="text-xs text-zinc-400">
            Up to{' '}
            <span className="font-medium text-zinc-700">{venue.capacity} guests</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 leading-none">from</p>
            <p className="text-sm font-bold text-zinc-900 mt-0.5">
              {formatPrice(venue.starting_price_paise)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}