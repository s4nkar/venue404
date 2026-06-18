import type { VenueResponse } from '../../types'

type Props = { venue: VenueResponse }

export function VenueWhereYoullBe({ venue }: Props) {
  const hasCoords = venue.latitude && venue.longitude

  const fullAddress = [
    venue.address_line1,
    venue.address_line2,
    venue.city,
    venue.state,
    venue.postal_code,
    venue.country,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900">Where you'll be</h2>
      <p className="mb-5 text-sm text-zinc-500">{fullAddress}</p>

      {/* Map placeholder */}
      <div className="relative h-72 overflow-hidden rounded-2xl bg-zinc-100 sm:h-80">
        {/* Grid pattern to hint at a map */}
        <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>

        {/* Simulated road lines */}
        <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="40%" x2="100%" y2="38%" stroke="#cbd5e1" strokeWidth="8" />
          <line x1="0" y1="65%" x2="100%" y2="62%" stroke="#cbd5e1" strokeWidth="4" />
          <line x1="35%" y1="0" x2="33%" y2="100%" stroke="#cbd5e1" strokeWidth="8" />
          <line x1="68%" y1="0" x2="70%" y2="100%" stroke="#cbd5e1" strokeWidth="4" />
        </svg>

        {/* Center pin */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/50">
            <svg className="h-7 w-7 text-brand" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.688 3.218-7.327A8.5 8.5 0 0012 3.5a8.5 8.5 0 00-8.503 8.5c0 2.64 1.274 5.249 3.218 7.327a19.58 19.58 0 002.683 2.282c.36.247.72.478 1.073.691l.072.041zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 shadow text-center">
            <p className="text-sm font-semibold text-zinc-900">{venue.name}</p>
            <p className="text-xs text-zinc-500">{venue.city}, {venue.state}</p>
          </div>
        </div>

        {/* Coords badge */}
        {hasCoords && (
          <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-zinc-500 shadow backdrop-blur-sm">
            {parseFloat(venue.latitude!).toFixed(4)}°, {parseFloat(venue.longitude!).toFixed(4)}°
          </div>
        )}

        {/* Map coming soon note */}
        <div className="absolute bottom-4 right-4 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-zinc-400 shadow backdrop-blur-sm">
          Interactive map coming soon
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
        Located in {venue.city}, {venue.state}.
        {venue.address_line2 && ` ${venue.address_line2}.`}
        {' '}Exact address provided after booking is confirmed.
      </p>
    </div>
  )
}
