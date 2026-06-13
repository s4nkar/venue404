import type { VenueResponse } from '../../types'
import { VENUE_TYPE_LABELS } from '../../constants'

type Props = {
  venue: VenueResponse
}

export function VenueSummaryCard({
  venue,
}: Props) {
  const coverPhoto =
    venue.photos?.find(
      (photo) => photo.is_cover,
    )?.image_url ??
    venue.photos?.[0]?.image_url ??
    null

  const venueType =
    VENUE_TYPE_LABELS[
      venue.venue_type
    ] ?? venue.venue_type

  return (
    <div className="rounded-2xl border border-zinc-200 shadow-sm overflow-hidden bg-white">
      {coverPhoto ? (
        <img
          src={coverPhoto}
          alt={venue.name}
          className="w-full h-56 object-cover"
        />
      ) : (
        <div className="w-full h-56 bg-zinc-100 flex items-center justify-center">
          <svg
            className="h-10 w-10 text-zinc-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7l4-4h10l4 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7z"
            />
          </svg>
        </div>
      )}

      <div className="p-6">
        <div className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Venue
            </div>

            <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
              {venue.name}
            </h2>

            <div className="mt-2 flex items-center gap-2 text-zinc-600">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>

              <span className="text-sm">
                {venue.city}, {venue.state}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoCard
              label="Venue Type"
              value={venueType}
            />

            <InfoCard
              label="Capacity"
              value={String(
                venue.max_capacity,
              )}
            />

            <InfoCard
              label="Booking Type"
              value={venue.allowed_booking_types
                .map((type) =>
                  type === 'full_day'
                    ? 'Full Day'
                    : 'Time Slot',
                )
                .join(', ')}
            />

            <InfoCard
              label="Pricing"
              value={venue.pricing_mode}
            />
          </div>

          {venue.description && (
            <div className="border-t border-zinc-100 pt-5">
              <p className="text-sm leading-relaxed text-zinc-600">
                {venue.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type InfoCardProps = {
  label: string
  value: string
}

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-xl border border-zinc-100 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400 font-medium">
        {label}
      </div>

      <div className="mt-2 text-sm font-medium text-zinc-900">
        {value}
      </div>
    </div>
  )
}

