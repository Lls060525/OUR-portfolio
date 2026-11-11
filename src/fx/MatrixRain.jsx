import { useEffect, useRef } from 'react'

// Background glyph rain. Starts dense right after boot (the page "being built"),
// then settles to a faint ambient drizzle. ~30fps, paused when the tab is hidden.
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏ0123456789'

export default function MatrixRain() {
  const ref = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current
    const ctx = c.getContext('2d')
    const size = 16
    let w, h, cols, raf, last = 0
    const born = performance.now()

    const resize = () => {
      w = c.width = innerWidth
      h = c.height = innerHeight
      cols = Array.from({ length: Math.ceil(w / size) }, () => ({ y: Math.random() * -h * 0.6, v: 0.6 + Math.random() * 0.8 }))
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden || now - last < 33) return
      last = now
      // intensity: strong for the first ~1.5s, easing down to ambient
      const age = (now - born) / 1000
      const k = age < 1.4 ? 1 : Math.max(0, 1 - (age - 1.4) / 1.8)
      c.style.opacity = (0.08 + k * 0.5).toFixed(3)

      ctx.fillStyle = 'rgba(5, 6, 11, 0.12)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${size - 2}px "JetBrains Mono", monospace`
      cols.forEach((col, i) => {
        // in ambient mode only some columns are active
        if (k < 0.05 && i % 3) return
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0]
        ctx.fillStyle = Math.random() > 0.96 ? '#e9edf7' : i % 9 === 0 ? 'rgba(167, 139, 250, .8)' : 'rgba(34, 211, 238, .75)'
        ctx.fillText(ch, i * size, col.y)
        col.y += size * col.v
        if (col.y > h + Math.random() * 2000) col.y = 0
      })
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className="matrix-rain" aria-hidden="true" />
}
