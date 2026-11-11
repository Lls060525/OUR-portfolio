import Lenis from 'lenis'

// ─────────────────────────────────────────────────────────────
// Motion engine
//  • smooth, inertial scrolling (Lenis)
//  • "scenes": every .scene element gets --p (-1 above … 0 centred … 1 below)
//    and --a (0 in focus … 1 far away) each frame, and the class .live while
//    it is the thing in focus. CSS turns that into the slide-deck feel.
//  • soft snap: when scrolling stops near a .slide, glide it to the centre
//  • matrix print: text decodes in from glyphs, in sequence or on view
// ─────────────────────────────────────────────────────────────

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis = null

export const resetScroll = () => {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

export const scrollToEl = (el, offset = 0) => {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 })
  else el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' })
}

function updateScenes() {
  const vh = window.innerHeight
  for (const el of document.querySelectorAll('.scene')) {
    const r = el.getBoundingClientRect()
    if (r.bottom < -vh || r.top > vh * 2) continue
    const centre = r.top + r.height / 2
    // −1 when it has scrolled out the top, +1 when it is still below the fold
    const p = Math.max(-1, Math.min(1, (centre - vh / 2) / (vh / 2 + r.height / 2)))
    // a short dead zone keeps the focused scene perfectly crisp
    const a = Math.max(0, Math.min(1, (Math.abs(p) - 0.14) / 0.7))
    const prev = el._p
    if (prev === undefined || Math.abs(prev - p) > 0.0015) {
      el._p = p
      el.style.setProperty('--p', p.toFixed(4))
      el.style.setProperty('--a', a.toFixed(4))
    }
    const live = a < 0.45
    if (live !== el._live) {
      el._live = live
      el.classList.toggle('live', live)
      if (live) el.dispatchEvent(new CustomEvent('scene-enter'))
    }
  }
}

let snapTimer = 0
function snapNearest() {
  if (!lenis || lenis.isScrolling === 'native') return
  const vh = window.innerHeight
  let best = null, bd = Infinity
  for (const el of document.querySelectorAll('.slide')) {
    const r = el.getBoundingClientRect()
    if (r.height > vh * 0.96) continue
    const d = r.top + r.height / 2 - vh / 2
    if (Math.abs(d) < Math.abs(bd)) { bd = d; best = el }
  }
  if (best && Math.abs(bd) > 3 && Math.abs(bd) < vh * 0.3) {
    lenis.scrollTo(window.scrollY + bd, { duration: 0.9, easing: (t) => 1 - (1 - t) ** 3 })
  }
}

// Starts the loop. Returns a stop function.
export function startMotion() {
  if (!reduced()) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
    lenis.on('scroll', () => {
      clearTimeout(snapTimer)
      snapTimer = setTimeout(snapNearest, 160)
    })
  }
  let raf
  const loop = (t) => {
    lenis?.raf(t)
    updateScenes()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(snapTimer)
    lenis?.destroy()
    lenis = null
  }
}

// ── matrix print ─────────────────────────────────────────────
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789$#@%&*+=<>'
const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

// Decodes every text node inside `el`, left to right.
// blank: true  → characters not reached yet are empty (typed in, like a printer)
// blank: false → everything is visible as glyphs and resolves in place
export function printElement(el, { blank = true, speed = 16, min = 260, max = 950 } = {}) {
  return new Promise((resolve) => {
    if (!el || el._printing) return resolve()
    const finish = () => {
      nodes.forEach((n, i) => { n.nodeValue = originals[i] })
      el.classList.remove('printing')
      el.classList.add('printed')
      el._printing = false
      resolve()
    }
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    const originals = nodes.map((n) => n.nodeValue)
    const total = originals.reduce((s, t) => s + t.length, 0)

    el.classList.add('printed')
    if (reduced() || total === 0) return finish()

    el._printing = true
    el.classList.add('printing')
    const duration = Math.max(min, Math.min(max, total * speed))
    const LEAD = 6 // how many scrambled glyphs run ahead of the resolved text
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const head = Math.floor(t * (total + LEAD))
      let at = 0
      nodes.forEach((n, i) => {
        const src = originals[i]
        let out = ''
        for (let k = 0; k < src.length; k++, at++) {
          const ch = src[k]
          if (at < head - LEAD || /\s/.test(ch)) out += ch
          else if (at < head || !blank) out += glyph()
          else out += ' ' // figure space keeps line wrapping roughly stable
        }
        n.nodeValue = out
      })
      if (t < 1) raf = requestAnimationFrame(tick)
      else finish()
    }
    raf = requestAnimationFrame(tick)
    // safety net if frames are throttled
    setTimeout(() => { if (el._printing) { cancelAnimationFrame(raf); finish() } }, duration + 400)
  })
}

// Prints [data-print="seq"] one after another, then arms [data-print="view"]
// (and "decode") elements to print the first time they scroll into view.
export function runPrints(root) {
  if (!root) return () => {}
  let cancelled = false
  const seq = [...root.querySelectorAll('[data-print="seq"], [data-print="decode-seq"]')]
  ;(async () => {
    for (const el of seq) {
      if (cancelled) { el.classList.add('printed'); continue }
      await printElement(el, { blank: el.dataset.print === 'seq' })
      await new Promise((r) => setTimeout(r, 70))
    }
  })()

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.unobserve(e.target)
      printElement(e.target, { blank: e.target.dataset.print === 'view' })
    }
  }, { threshold: 0.35 })
  root.querySelectorAll('[data-print="view"], [data-print="decode"]').forEach((el) => io.observe(el))

  return () => {
    cancelled = true
    io.disconnect()
    root.querySelectorAll('[data-print]').forEach((el) => el.classList.add('printed'))
  }
}
