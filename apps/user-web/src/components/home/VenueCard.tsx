import { VENUE_TYPE_LABELS } from '../../constants'
import { formatPrice } from '../../utils'
import type { SearchResult } from '../../types'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function VenueCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-52 bg-zinc-100" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-zinc-100 rounded w-3/4" />
            <div className="h-3 bg-zinc-100 rounded w-1/2" />
          </div>
          <div className="h-5 w-14 bg-zinc-100 rounded-full shrink-0" />
        </div>
        <div className="pt-2 border-t border-zinc-50 flex items-center justify-between">
          <div className="h-3 bg-zinc-100 rounded w-1/3" />
          <div className="h-5 bg-zinc-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  )
}

// ─── Placeholder icon ─────────────────────────────────────────────────────────

function VenuePlaceholder({ venueName }: { venueName: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-100 to-zinc-50">
      <div className="h-12 w-12 rounded-xl bg-white/80 shadow-sm flex items-center justify-center">
        <svg className="h-6 w-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p className="text-[11px] text-zinc-400 text-center px-4 leading-tight line-clamp-2">{venueName}</p>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type Props = {
  venue: SearchResult
  onClick: () => void
}

export function VenueCard({ venue, onClick }: Props) {
  const typeLabel = VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type

  const pricingLabel =
    venue.pricing_mode === 'hourly' ? '/ hr' :
    venue.pricing_mode === 'flat'   ? '/ day' : null

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-zinc-200"
    >
      {/* Photo */}
      <div className="relative h-52 bg-zinc-100 overflow-hidden">
        {venue.cover_photo_url ? (
          <>
            <img
              src={venue.cover_photo_url}
              alt={venue.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        ) : (
          <VenuePlaceholder venueName={venue.name} />
        )}

        {/* Venue type badge — top right */}
        <span className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm border border-white/50">
          {typeLabel}
        </span>

        {/* Capacity badge — bottom left (overlaid on image) */}
        {venue.capacity != null && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Up to {venue.capacity}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 leading-snug truncate group-hover:text-brand transition-colors duration-150">
              {venue.name}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate">{venue.city}</span>
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-50 pt-3">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400">Starting from</p>
          <div className="text-right">
            <span className="text-sm font-bold text-zinc-900">
              {formatPrice(venue.starting_price_paise)}
            </span>
            {pricingLabel && (
              <span className="ml-0.5 text-[11px] text-zinc-400">{pricingLabel}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
