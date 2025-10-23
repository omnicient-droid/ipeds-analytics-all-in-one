'use client'
import { useEffect, useMemo, useState } from 'react'
import { SCHOOLS, type School } from '@/lib/schools'

type Props = {
  unitid: number
  durationMs?: number
}

// Lightweight splash that tries to show a mascot GIF from public/mascots/{school.key}.gif
// Falls back to the school's logo with a subtle bounce. Auto-hides after duration.
export default function MascotSplash({ unitid, durationMs = 2200 }: Props) {
  const school: School | undefined = useMemo(
    () => Object.values(SCHOOLS).find((s) => s.unitid === unitid),
    [unitid],
  )

  const [visible, setVisible] = useState(false)
  const [hasGif, setHasGif] = useState(false)
  const [gifSrc, setGifSrc] = useState<string | null>(null)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduceMotion = mql.matches
    // If reduced motion, skip the splash entirely
    if (reduceMotion) return

    let cancelled = false
    setVisible(true)

    // Try to preload the mascot gif from public
    const key = (school?.key ?? 'unknown').toLowerCase()
    const candidate = `/mascots/${key}.gif`
  const img = new window.Image()
    img.onload = () => {
      if (cancelled) return
      setGifSrc(candidate)
      setHasGif(true)
    }
    img.onerror = () => {
      if (cancelled) return
      setHasGif(false)
    }
    img.src = candidate

    const t = setTimeout(() => !cancelled && setVisible(false), durationMs)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [school, durationMs])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <button
        className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
        onClick={() => setVisible(false)}
      >
        Skip
      </button>
      <div className="flex flex-col items-center">
        {hasGif && gifSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gifSrc}
            alt={`${school?.short || 'School'} mascot`}
            className="h-40 w-40 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
          />
        ) : (
          <div
            className="flex h-36 w-36 items-center justify-center rounded-2xl border border-white/20 bg-white/5 shadow-2xl"
            style={{ borderColor: (school?.color ?? '#999') + '55' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={school?.logo || '/logos/placeholder.png'}
              alt={school?.logoAlt || 'School Logo'}
              className="h-24 w-24 object-contain animate-bounce [animation-duration:1.2s]"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
            />
          </div>
        )}
        <div className="mt-4 text-center text-sm text-white/90">
          <span className="opacity-80">Entering</span>{' '}
          <b style={{ color: school?.color }}>{school?.name ?? `UNITID ${unitid}`}</b>
        </div>
      </div>
    </div>
  )
}
