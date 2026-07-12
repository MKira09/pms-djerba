import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Carrousel photo réutilisable.
 * Le parent doit avoir la classe `group` pour que les flèches apparaissent au survol sur desktop.
 * Hauteur contrôlée par le parent — ce composant remplit 100% de son conteneur.
 */
export default function PhotoCarousel({
  photos,
  villaName,
}: {
  photos: string[]
  villaName: string
}) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const count = photos.length

  if (!count) return null

  function prev(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIdx(i => (i - 1 + count) % count)
  }

  function next(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIdx(i => (i + 1) % count)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setIdx(i => (i + 1) % count)
      else setIdx(i => (i - 1 + count) % count)
    }
    touchStartX.current = null
  }

  return (
    <div
      className="relative w-full h-full select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={photos[idx]}
        alt={`${villaName} — photo ${idx + 1}`}
        className="w-full h-full object-cover"
      />

      {count > 1 && (
        <>
          {/* Flèche gauche — toujours visible mobile, hover desktop */}
          <button
            onClick={prev}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center transition-opacity
              opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Flèche droite */}
          <button
            onClick={next}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center transition-opacity
              opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots — pill animée sur la photo active */}
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setIdx(i) }}
                aria-label={`Photo ${i + 1}`}
                className={`rounded-full transition-all shadow-sm ${
                  i === idx ? 'bg-white w-4 h-1.5' : 'bg-white/60 w-1.5 h-1.5 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
