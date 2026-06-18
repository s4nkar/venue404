import { VENUE_TYPE_LABELS } from '../../constants'
import { formatPrice } from '../../utils'
import type { SearchResult } from '../../types'

type Props = { venue: SearchResult; onClick: () => void }

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function VenueCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] animate-pulse">
      <div className="aspect-[4/3] bg-zinc-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-3/4 rounded bg-zinc-100" />
        <div className="h-3 w-1/2 rounded bg-zinc-100" />
        <div className="h-3 w-2/5 rounded bg-zinc-100" />
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-4/5 rounded bg-zinc-100" />
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function VenueCard({ venue, onClick }: Props) {
  const typeLabel = VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type

  const priceLabel =
    venue.starting_price_paise != null
      ? `From ${formatPrice(venue.starting_price_paise)} min spend`
      : null

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer overflow-hidden"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[8/5] overflow-hidden rounded-2xl bg-zinc-100">
        {venue.cover_photo_url ? (
          <img
            src={venue.cover_photo_url}
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500rounded-2xl"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-100 to-zinc-50">
            <svg className="h-9 w-9 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="px-4 text-center text-xs leading-tight text-zinc-400 line-clamp-2">{venue.name}</p>
          </div>
        )}

        {/* Heart / save button */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
          aria-label="Save venue"
        >
          <svg className="h-4 w-4 text-zinc-400 transition-colors hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* ── Info ── */}
      <div className="py-3 px-1">
        <h5 className="truncate font-medium text-zinc-900 leading-snug transition-colors group-hover:text-brand">
          {venue.name}
        </h5>

        <p className="text-[.8rem] text-zinc-500">
          {venue.city}
          {venue.capacity != null && (
            <> &middot; Up to {venue.capacity.toLocaleString()} guests</>
          )}
        </p>

        {priceLabel && (
          <p className="mt-1.5 text-sm font-semibold text-zinc-900">{priceLabel}</p>
        )}

        <p className="mt-1.5 text-[.8rem] text-zinc-400 line-clamp-2">
          A {typeLabel.toLowerCase()} venue in {venue.city}. Available for events, conferences, and private hire.
        </p>
      </div>
    </article>
  )
}
