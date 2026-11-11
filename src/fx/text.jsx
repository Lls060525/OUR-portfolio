import { useEffect, useRef } from 'react'

const GLYPHS = '!<>-_\\/[]{}=+*^?#%01ABCDEF$&@'
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => window.matchMedia('(pointer: fine)').matches

// Decodes `text` out of random glyphs, left to right, like a terminal resolving a string.
export function scrambleInto(el, text, duration = 520) {
  if (!el) return () => {}
  if (reduced()) { el.textContent = text; return () => {} }
  let raf
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const solved = Math.floor(t * text.length)
    let out = text.slice(0, solved)
    for (let i = solved; i < text.length; i++) {
      out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    el.textContent = out
    if (t < 1) raf = requestAnimationFrame(tick)
    else el.textContent = text
  }
  raf = requestAnimationFrame(tick)
  // if frames get throttled (background tab), still land on the real text
  const done = setTimeout(() => { cancelAnimationFrame(raf); el.textContent = text }, duration + 120)
  return () => { cancelAnimationFrame(raf); clearTimeout(done); el.textContent = text }
}

// <Scramble text="..." />  re-decodes on hover of its closest link/button (or itself).
// on="mount" decodes once when it appears instead.
export function Scramble({ text, on = 'hover', duration, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let stop = () => {}
    const run = () => { stop(); stop = scrambleInto(el, text, duration) }
    if (on === 'mount') { run(); return () => stop() }
    const host = el.closest('a, button, .scramble-host') || el
    host.addEventListener('pointerenter', run)
    return () => { host.removeEventListener('pointerenter', run); stop() }
  }, [text, on, duration])

  // Screen readers get the real text; the animated copy is hidden from them.
  return (
    <span className={className} aria-label={text}>
      <span key={text} ref={ref} aria-hidden="true">{text}</span>
    </span>
  )
}

// Interpolates the cyan → violet → pink gradient for character i of n.
const STOPS = [[34, 211, 238], [167, 139, 250], [244, 114, 182]]
const gradAt = (t) => {
  const s = t * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(s))
  const f = s - i
  const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f))
  return `rgb(${c.join(',')})`
}

// Headline whose letters lean toward the pointer and light up as it passes.
// `highlight` is the phrase rendered in the gradient colours.
export function ProximityText({ text, highlight }) {
  const root = useRef(null)

  useEffect(() => {
    const el = root.current
    if (!el || reduced() || !finePointer()) return
    const chars = [...el.querySelectorAll('.px-char')]
    const state = chars.map(() => ({ x: 0, y: 0, g: 0 }))
    let base = []
    const measure = () => {
      base = chars.map((c) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    let mx = -1e4, my = -1e4, raf = 0, running = false
    const R = 160
    const frame = () => {
      const r = el.getBoundingClientRect()
      let moving = false
      chars.forEach((c, i) => {
        const dx = mx - (r.left + base[i].x)
        const dy = my - (r.top + base[i].y)
        const d = Math.hypot(dx, dy)
        const k = d < R ? (1 - d / R) ** 2 : 0
        const s = state[i]
        // pull toward the pointer, capped so letters never fly away
        const tx = d > 0 ? (dx / d) * Math.min(d, 18) * k : 0
        const ty = (d > 0 ? (dy / d) * Math.min(d, 18) * k : 0) - 10 * k
        s.x += (tx - s.x) * 0.18
        s.y += (ty - s.y) * 0.18
        s.g += (k - s.g) * 0.18
        if (Math.abs(tx - s.x) + Math.abs(ty - s.y) + Math.abs(k - s.g) > 0.01) moving = true
        c.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) scale(${(1 + s.g * 0.18).toFixed(3)})`
        c.style.textShadow = s.g > 0.02 ? `0 0 ${(s.g * 24).toFixed(1)}px rgba(34, 211, 238, ${(s.g * 0.9).toFixed(2)})` : ''
      })
      running = moving
      if (moving) raf = requestAnimationFrame(frame)
    }
    // re-measure at the start of each burst: the matrix print can shift letters
    const kick = () => { if (!running) { measure(); running = true; raf = requestAnimationFrame(frame) } }
    const onMove = (e) => { mx = e.clientX; my = e.clientY; kick() }
    const onLeave = () => { mx = my = -1e4; kick() }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [text, highlight])

  const hi = highlight ? text.indexOf(highlight) : -1
  const words = text.split(' ')
  let pos = 0
  return (
    <span ref={root} className="px-text" aria-label={text}>
      {words.map((w, wi) => {
        const start = pos
        pos += w.length + 1
        return (
          <span key={wi} aria-hidden="true">
            <span className="px-word">
              {[...w].map((ch, ci) => {
                const at = start + ci
                const inHi = hi >= 0 && at >= hi && at < hi + highlight.length
                return (
                  <span
                    key={ci}
                    className={`px-char${inHi ? ' px-hi' : ''}`}
                    style={inHi ? { color: gradAt((at - hi) / Math.max(1, highlight.length - 1)) } : undefined}
                  >{ch}</span>
                )
              })}
            </span>
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}
