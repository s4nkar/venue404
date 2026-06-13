import { useEffect, useState } from 'react'
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
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const openLightbox = (index: number) => {
    setActive(index)
    setLightboxOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    document.body.style.overflow = ''
  }

  const prev = () => {
    setActive((p) => (p - 1 + sorted.length) % sorted.length)
  }

  const next = () => {
    setActive((p) => (p + 1) % sorted.length)
  }

  useEffect(() => {
    if (!lightboxOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen])

  if (sorted.length === 0) {
    return (
      <div className="w-full h-72 sm:h-96 bg-zinc-100 rounded-2xl flex items-center justify-center">
        <svg
          className="h-12 w-12 text-zinc-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  const previewPhotos = sorted.slice(1, 5)

  return (
    <>
      {/* MOBILE */}
      <div className="md:hidden space-y-2">
        <div className="relative h-72 rounded-2xl overflow-hidden bg-zinc-100">
          <img
            src={sorted[active].image_url}
            alt={`${venueName} photo ${active + 1}`}
            className="w-full h-full object-cover"
            onClick={() => openLightbox(active)}
          />

          {sorted.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                aria-label="Previous photo"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                aria-label="Next photo"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {active + 1} / {sorted.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="relative">
          {sorted.length === 1 ? (
            <button
              onClick={() => openLightbox(0)}
              className="w-full h-[480px] rounded-2xl overflow-hidden"
            >
              <img
                src={sorted[0].image_url}
                alt={venueName}
                className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
              />
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2 h-[480px] rounded-2xl overflow-hidden">
              <button
                onClick={() => openLightbox(0)}
                className="col-span-2 row-span-2 overflow-hidden"
              >
                <img
                  src={sorted[0].image_url}
                  alt={venueName}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </button>

              {previewPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => openLightbox(index + 1)}
                  className="overflow-hidden"
                >
                  <img
                    src={photo.image_url}
                    alt=""
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}

              {previewPhotos.length < 4 &&
                Array.from({ length: 4 - previewPhotos.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-zinc-100" />
                ))}
            </div>
          )}

          {sorted.length > 1 && (
            <button
              onClick={() => openLightbox(0)}
              className="absolute bottom-4 right-4 bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
            >
              Show all photos
            </button>
          )}
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
            aria-label="Close gallery"
          >
            ✕
          </button>

          {sorted.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
              >
                ←
              </button>

              <button
                onClick={next}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
              >
                →
              </button>
            </>
          )}

          <div className="flex h-full items-center justify-center p-8">
            <img
              src={sorted[active].image_url}
              alt={`${venueName} photo ${active + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
            {active + 1} / {sorted.length}
          </div>

          {sorted.length > 1 && (
            <div className="absolute bottom-20 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto">
              {sorted.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setActive(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === active ? 'border-white' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={photo.image_url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
