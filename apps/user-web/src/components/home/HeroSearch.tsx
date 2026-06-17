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

// ─── Compact search bar — shown when results are active ───────────────────────

function CompactSearch({
  q,
  city,
  onQChange,
  onCityChange,
  onSubmit,
}: Pick<Props, 'q' | 'city' | 'onQChange' | 'onCityChange' | 'onSubmit'>) {
  return (
    <section className="border-b border-zinc-100 bg-white py-4 shadow-sm">
      <div className="mx-auto max-w-6xl px-6">
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm transition-shadow focus-within:border-brand/40 focus-within:shadow-md"
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Search venues by name or type…"
            className="flex-1 border-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          />
          <div className="hidden sm:flex items-center border-l border-zinc-200 pl-3 gap-2">
            <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <input
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="City"
              className="w-28 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover active:scale-[0.97]"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── Full hero — shown on landing (no active filters) ─────────────────────────

function HeroFull({
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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1f1c] via-[#0f2920] to-[#1a3d2e] py-20 sm:py-28">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-[400px] w-[400px] rounded-full bg-brand-secondary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/30 bg-brand/20 px-3.5 py-1 text-xs font-medium text-brand-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary animate-pulse" />
          Venue discovery & booking
        </div>

        {/* Headline */}
        <h1 className="mt-5 max-w-2xl text-[2.75rem] font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
          Book the perfect space
          <br />
          <span className="text-brand-secondary">for your big moment</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
          Browse verified venues across India — from intimate studios to grand halls.
          Check availability and confirm your booking in minutes.
        </p>

        {/* Search bar */}
        <form
          onSubmit={onSubmit}
          className="mt-10 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition-all focus-within:border-brand-secondary/50 focus-within:bg-white/10 focus-within:shadow-lg"
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="City, venue name, or type…"
            className="flex-1 border-none bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0"
          />
          <div className="hidden sm:flex items-center border-l border-white/10 pl-3 gap-2">
            <svg className="h-3.5 w-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <input
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="City"
              className="w-28 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-brand-secondary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand active:scale-[0.97]"
          >
            Search
          </button>
        </form>

        {/* Category chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = venueType === c.venue_type
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => onCategoryClick(c.venue_type)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
                  active
                    ? 'border-brand-secondary bg-brand-secondary text-white shadow-sm'
                    : 'border-white/10 bg-white/5 text-zinc-300 hover:border-brand-secondary/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            )
          })}
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-red-400/30 hover:bg-red-900/20 hover:text-red-400"
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

// ─── Export — toggles between modes ──────────────────────────────────────────

export function HeroSearch(props: Props) {
  if (props.hasFilters) {
    return (
      <CompactSearch
        q={props.q}
        city={props.city}
        onQChange={props.onQChange}
        onCityChange={props.onCityChange}
        onSubmit={props.onSubmit}
      />
    )
  }
  return <HeroFull {...props} />
}
