import { CATEGORIES, VENUE_TYPE_LABELS } from '../../constants'

type Props = {
  venueType: string
  capacity: string
  onVenueTypeChange: (type: string) => void
  onCapacityChange: (value: string) => void
  onClearFilters: () => void
  hasFilters: boolean
  totalResults: number | null
}

const CAPACITY_PRESETS = [
  { label: '1–50', value: '50' },
  { label: '51–100', value: '100' },
  { label: '101–250', value: '250' },
  { label: '251–500', value: '500' },
  { label: '500+', value: '501' },
]

export function SearchSidebar({
  venueType,
  capacity,
  onVenueTypeChange,
  onCapacityChange,
  onClearFilters,
  hasFilters,
}: Props) {
  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs font-medium text-brand hover:text-brand-hover transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Venue type */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Venue Type
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onVenueTypeChange('')}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left ${
              venueType === ''
                ? 'bg-brand-light text-brand font-medium'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <span className="text-base">🏛️</span>
            All types
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.venue_type}
              type="button"
              onClick={() => onVenueTypeChange(c.venue_type === venueType ? '' : c.venue_type)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left ${
                venueType === c.venue_type
                  ? 'bg-brand-light text-brand font-medium'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span className="text-base">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100" />

      {/* Capacity */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Guest Capacity
        </p>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onCapacityChange('')}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              capacity === ''
                ? 'bg-brand-light text-brand font-medium'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <span>Any size</span>
            {capacity === '' && (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          {CAPACITY_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onCapacityChange(capacity === p.value ? '' : p.value)}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                capacity === p.value
                  ? 'bg-brand-light text-brand font-medium'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span>{p.label} guests</span>
              {capacity === p.value && (
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Custom capacity input */}
        <div className="mt-3">
          <label className="mb-1.5 block text-xs text-zinc-400">Or enter exact minimum</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={10000}
              value={capacity && !CAPACITY_PRESETS.find(p => p.value === capacity) ? capacity : ''}
              onChange={(e) => onCapacityChange(e.target.value)}
              placeholder="e.g. 150"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">guests</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
