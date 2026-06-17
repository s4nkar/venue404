import { CATEGORIES } from '../../constants'

type Props = {
  onCategoryClick: (type: string) => void
}

// Stable picsum seed → real professional photo as background
const CARD_IMAGE: Record<string, string> = {
  wedding_hall:    'https://picsum.photos/seed/elegant-hall/800/600',
  banquet_hall:    'https://picsum.photos/seed/banquet-dinner/800/600',
  event_space:     'https://picsum.photos/seed/modern-event/800/600',
  rooftop:         'https://picsum.photos/seed/city-rooftop/800/600',
  conference_room: 'https://picsum.photos/seed/office-meeting/800/600',
  lawn:            'https://picsum.photos/seed/outdoor-garden/800/600',
}

// Fallback gradient per category (shown while image loads or if it fails)
const FALLBACK_GRADIENT: Record<string, string> = {
  wedding_hall:    'from-rose-900 to-pink-950',
  banquet_hall:    'from-amber-900 to-orange-950',
  event_space:     'from-violet-900 to-purple-950',
  rooftop:         'from-sky-900 to-blue-950',
  conference_room: 'from-blue-900 to-indigo-950',
  lawn:            'from-emerald-900 to-green-950',
}

export function CategorySection({ onCategoryClick }: Props) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Find a space for your event
          </h2>
          <p className="mt-2 text-sm text-zinc-400">Browse by venue type · {CATEGORIES.length} categories</p>
        </div>

        {/* Grid — 2 cols mobile, 3 cols desktop */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {CATEGORIES.map((cat, idx) => {
            const imgSrc  = CARD_IMAGE[cat.venue_type]
            const fallback = FALLBACK_GRADIENT[cat.venue_type] ?? 'from-zinc-800 to-zinc-900'

            // First card spans 2 cols on desktop for a featured look
            const isFeature = idx === 0

            return (
              <button
                key={cat.venue_type}
                type="button"
                onClick={() => onCategoryClick(cat.venue_type)}
                className={`group relative overflow-hidden rounded-2xl cursor-pointer text-left
                  ${isFeature ? 'lg:col-span-1 lg:row-span-2' : ''}
                  ${isFeature ? 'aspect-square sm:aspect-[3/4]' : 'aspect-[4/3]'}
                  bg-gradient-to-br ${fallback}
                `}
              >
                {/* Background photo */}
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={cat.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                )}

                {/* Gradient overlay — darker at bottom for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5 transition-opacity duration-300 group-hover:from-black/70" />

                {/* Top-right label */}
                <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    Browse
                  </span>
                </div>

                {/* Bottom-left text */}
                <div className="absolute bottom-0 left-0 p-4 sm:p-5">
                  <p className={`font-bold leading-tight text-white drop-shadow-sm
                    ${isFeature ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
                    {cat.label}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-white/70 transition-colors group-hover:text-white">
                    <span>Explore venues</span>
                    <svg
                      className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
