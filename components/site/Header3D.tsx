'use client'
import * as React from 'react'

/**
 * Lightweight header background: parallax dots connected by lines.
 * Respects prefers-reduced-motion.
 */
export default function Header3D() {
  const ref = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let w = (canvas.width = canvas.offsetWidth)
    let h = (canvas.height = Math.max(64, canvas.offsetHeight))

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = media.matches

    const points = Array.from({ length: reduce ? 18 : 36 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }))

    function resize() {
      if (!ref.current) return
      const c = ref.current
      w = c.width = c.offsetWidth
      h = c.height = Math.max(64, c.offsetHeight)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let raf = 0
    function step() {
      ctx.clearRect(0, 0, w, h)
      // gradient background glow
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, 'rgba(37,99,235,0.08)')
      g.addColorStop(1, 'rgba(6,182,212,0.08)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // update + draw points
      for (const p of points) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      // connect nearby points
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i]
          const b = points[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 120 * 120) {
            const alpha = 1 - Math.sqrt(dist2) / 120
            ctx.strokeStyle = `rgba(148,163,184,${alpha * 0.4})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      // draw dots
      for (const p of points) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(148,163,184,0.75)'
        ctx.fill()
      }
      raf = requestAnimationFrame(step)
    }
    if (!reduce) raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
