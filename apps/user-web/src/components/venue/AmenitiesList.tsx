import type { Amenity } from '../../types'

type Props = {
  amenities: Amenity[]
}

export function AmenitiesList({ amenities }: Props) {
  if (amenities.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">Amenities</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4">
        {amenities.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm text-zinc-600">
            {a.icon ? (
              <span className="text-base leading-none">{a.icon}</span>
            ) : (
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}