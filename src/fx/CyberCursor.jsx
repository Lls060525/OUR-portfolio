import { useEffect, useRef } from 'react'

// A crosshair cursor with a string of characters that snakes after it.
// The string is the pointer's coordinates, or the data-cursor label of
// whatever is under it ("OPEN", "DRAG TO ROTATE", ...).
// Only on devices with a precise pointer and when motion is allowed.

const MAX = 22
const CHAR_W = 8.2

const labelFor = (target) => {
  const tagged = target.closest?.('[data-cursor]')
  if (tagged) return tagged.dataset.cursor
  const link = target.closest?.('a, button')
  if (link) return link.target === '_blank' ? 'EXTERNAL ↗' : 'OPEN →'
  return null
}

export default function CyberCursor() {
  const root = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = root.current
    if (!fine || reduced || !el) return

    document.documentElement.classList.add('cc-on')
    const dot = el.querySelector('.cc-dot')
    const ring = el.querySelector('.cc-ring')
    const trail = [...el.querySelectorAll('.cc-char')]
    const pts = trail.map(() => ({ x: -100, y: -100 }))

    let mx = -100, my = -100, rx = -100, ry = -100
    let label = null, text = '', hot = false, visible = false, down = false
    let raf

    const setText = (t) => {
      if (t === text) return
      text = t
      trail.forEach((c, i) => { c.textContent = t[i] || '' })
    }

    const onMove = (e) => {
      mx = e.clientX; my = e.clientY
      if (!visible) {
        visible = true
        el.classList.add('cc-visible')
        rx = mx; ry = my
        pts.forEach((p) => { p.x = mx; p.y = my })
      }
    }
    const onOver = (e) => {
      label = labelFor(e.target)
      hot = !!label
      el.classList.toggle('cc-hot', hot)
    }
    const onLeave = () => { visible = false; el.classList.remove('cc-visible') }
    const onDown = () => { down = true; el.classList.add('cc-down') }
    const onUp = () => { down = false; el.classList.remove('cc-down') }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      rx += (mx - rx) * 0.22
      ry += (my - ry) * 0.22
      dot.style.transform = `translate(${mx}px, ${my}px)`
      ring.style.transform = `translate(${rx}px, ${ry}px) scale(${hot ? 1.7 : down ? 0.7 : 1})`

      setText(label || `${String(Math.round(mx)).padStart(4, '0')}:${String(Math.round(my)).padStart(4, '0')}`)

      // each character chases the one before it, so the word bends along the path
      const n = text.length
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        const ax = i === 0 ? mx + 20 : pts[i - 1].x + CHAR_W
        const ay = i === 0 ? my + 18 : pts[i - 1].y
        p.x += (ax - p.x) * 0.38
        p.y += (ay - p.y) * 0.38
        const prev = i === 0 ? { x: mx + 20 - CHAR_W, y: my + 18 } : pts[i - 1]
        const ang = Math.atan2(p.y - prev.y, p.x - prev.x)
        trail[i].style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${ang.toFixed(3)}rad)`
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('cc-on')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={root} className="cc" aria-hidden="true">
      <div className="cc-ring" />
      <div className="cc-dot" />
      {Array.from({ length: MAX }, (_, i) => <span key={i} className="cc-char" />)}
    </div>
  )
}
