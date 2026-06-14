import { VENUE_TYPE_LABELS } from '../../utils'
import type { VenueResponse } from '../../types'

type Props = {
  venue: VenueResponse
}

export function VenueInfo({ venue }: Props) {
  return (
    <div className="space-y-3">
      {/* Type badge */}
      <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
        {VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type}
      </span>

      {/* Name */}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        {venue.name}
      </h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-zinc-500">
        {/* Location */}
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {venue.city}, {venue.state}
        </span>

        {/* Capacity */}
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {venue.min_capacity ? `${venue.min_capacity}–` : 'Up to '}
          {venue.max_capacity} guests
        </span>

        {/* Pricing mode */}
        <span className="flex items-center gap-1.5 capitalize">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          {venue.pricing_mode} pricing
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100 pt-4">
        {venue.description ? (
          <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-line">
            {venue.description}
          </p>
        ) : (
          <p className="text-sm text-zinc-400 italic">No description provided.</p>
        )}
      </div>
    </div>
  )
}