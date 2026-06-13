import { useState } from 'react'
import type { VenuePhoto } from '../../types'

type Props = {
  photos: VenuePhoto[]
  venueName: string
}

export function VenueGallery({ photos, venueName }: Props) {
  const sorted = [...photos].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1
    if (!a.is_cover && b.is_cover) return 1
    return a.sort_order - b.sort_order
  })

  const [active, setActive] = useState(0)

  if (sorted.length === 0) {
    return (
      <div className="w-full h-72 sm:h-96 bg-zinc-100 rounded-2xl flex items-center justify-center">
        <svg className="h-12 w-12 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative w-full h-72 sm:h-[420px] rounded-2xl overflow-hidden bg-zinc-100">
        <img
          src={sorted[active].image_url}
          alt={`${venueName} — photo ${active + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {/* Nav arrows — only when >1 photo */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={() => setActive((p) => (p - 1 + sorted.length) % sorted.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm p-2 shadow transition-all hover:bg-white"
              aria-label="Previous photo"
            >
              <svg className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setActive((p) => (p + 1) % sorted.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm p-2 shadow transition-all hover:bg-white"
              aria-label="Next photo"
            >
              <svg className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {/* Counter pill */}
            <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
              {active + 1} / {sorted.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === active ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}