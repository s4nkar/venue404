import { CATEGORIES } from '../../constants'

type Props = {
  q: string
  city: string
  venueType: string
  hasFilters: boolean
  onQChange: (value: string) => void
  onCityChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCategoryClick: (type: string) => void
  onClearFilters: () => void
}

export function HeroSearch({
  q,
  city,
  venueType,
  hasFilters,
  onQChange,
  onCityChange,
  onSubmit,
  onCategoryClick,
  onClearFilters,
}: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-16">
      <div className="max-w-2xl">
        {/* Eyebrow + headline */}
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          Venue discovery & booking
        </p>
        <h1 className="mt-3 text-[2.75rem] font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-5xl">
          Book spaces for your
          <br />
          next big moment
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-500">
          Browse verified venues across India — from intimate studios to grand halls.
          Check availability and confirm your booking in minutes.
        </p>

        {/* Search bar */}
        <form
          onSubmit={onSubmit}
          className="mt-8 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm transition-shadow focus-within:border-blue-400 focus-within:shadow-md"
        >
          <svg
            className="h-4 w-4 shrink-0 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            type="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="City, venue name, or type…"
            className="flex-1 border-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          />

          {/* City quick-filter — hidden on mobile */}
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            className="hidden sm:block w-28 border-l border-zinc-100 pl-3 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          />

          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Search
          </button>
        </form>

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = venueType === c.venue_type
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => onCategoryClick(c.venue_type)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:bg-brand hover:text-white'
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            )
          })}

          {/* Clear pill — shown only when filters are active */}
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>
    </section>
  )
}