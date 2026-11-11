import { useEffect, useRef, useState } from 'react'

// Full-screen "secure boot" sequence shown when the site opens.
// Click or press any key to skip. Calls onExit when it starts dissolving
// (so the page can animate in underneath) and onDone when it is gone.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function BootScreen({ title, lines, onExit, onDone }) {
  const [shown, setShown] = useState(0)
  const [pct, setPct] = useState(0)
  const [phase, setPhase] = useState('run') // run → granted → exit
  const canvas = useRef(null)
  const cb = useRef({ onExit, onDone })
  cb.current = { onExit, onDone }

  // progress + log lines
  useEffect(() => {
    const total = reduced() ? 500 : 2300
    const start = performance.now()
    // a timer, not requestAnimationFrame: frames pause in background tabs and
    // the boot must still finish there
    const id = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / total)
      // stutter a little, like a real loader
      const eased = t < 1 ? Math.floor(t * 40) / 40 : 1
      setPct(Math.round(eased * 100))
      setShown(Math.min(lines.length, Math.floor(t * (lines.length + 0.6))))
      if (t >= 1) { clearInterval(id); setPhase('granted') }
    }, 30)
    return () => clearInterval(id)
  }, [lines.length])

  // granted → exit → done
  useEffect(() => {
    if (phase === 'granted') {
      const t = setTimeout(() => setPhase('exit'), reduced() ? 150 : 650)
      return () => clearTimeout(t)
    }
    if (phase === 'exit') {
      cb.current.onExit?.()
      const t = setTimeout(() => cb.current.onDone?.(), reduced() ? 100 : 750)
      return () => clearTimeout(t)
    }
  }, [phase])

  // skip
  useEffect(() => {
    const skip = () => setPhase((p) => (p === 'exit' ? p : 'exit'))
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [])

  // lock page scroll while booting
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('booting')
    return () => html.classList.remove('booting')
  }, [])

  // falling hex rain
  useEffect(() => {
    const c = canvas.current
    if (!c || reduced()) return
    const ctx = c.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = 14
    let cols = [], raf, w, h
    const resize = () => {
      w = c.width = innerWidth * dpr
      h = c.height = innerHeight * dpr
      c.style.width = innerWidth + 'px'
      c.style.height = innerHeight + 'px'
      cols = Array.from({ length: Math.ceil(w / (size * dpr)) }, () => Math.random() * -h)
    }
    resize()
    window.addEventListener('resize', resize)
    const glyphs = '0123456789ABCDEF'
    const frame = () => {
      ctx.fillStyle = 'rgba(5, 6, 11, 0.16)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${size * dpr}px "JetBrains Mono", monospace`
      cols.forEach((y, i) => {
        const x = i * size * dpr
        ctx.fillStyle = Math.random() > 0.975 ? '#e9edf7' : i % 7 === 0 ? 'rgba(167,139,250,.75)' : 'rgba(34,211,238,.55)'
        ctx.fillText(glyphs[(Math.random() * 16) | 0], x, y)
        cols[i] = y > h + Math.random() * 4000 ? 0 : y + size * dpr
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  const blocks = 24
  const filled = Math.round((pct / 100) * blocks)

  return (
    <div className={`boot boot-${phase}`} role="status" aria-live="polite" aria-label={`Loading ${title}`}>
      <canvas ref={canvas} className="boot-rain" aria-hidden="true" />
      <div className="boot-scan" aria-hidden="true" />
      <div className="boot-core">
        <div className="boot-ring" aria-hidden="true"><span /><span /><span /></div>
        <h1 className="glitch" data-text={title}>{title}</h1>
        <p className="boot-sub">SECURE BOOT // establishing session</p>

        <ol className="boot-log">
          {lines.slice(0, shown).map((l, i) => (
            <li key={i}><span className="ok">[ OK ]</span> {l}</li>
          ))}
          {phase !== 'run' && <li className="granted">&gt; ACCESS GRANTED_</li>}
        </ol>

        <div className="boot-bar" aria-hidden="true">
          {Array.from({ length: blocks }, (_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
        </div>
        <div className="boot-meta">
          <span>{String(pct).padStart(3, '0')}%</span>
          <span>click or press any key to skip</span>
        </div>
      </div>
    </div>
  )
}
