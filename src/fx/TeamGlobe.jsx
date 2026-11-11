import { useEffect, useRef } from 'react'

// A wireframe 3D sphere drawn on a canvas, no libraries.
// Drag to rotate on any axis (Shift + drag rolls around Z), with inertia.
// Each member sits at the end of a coordinate axis (+X, +Y, +Z, then -X, -Y, -Z…),
// so the markers are equally spaced. When you let go, the globe snaps the nearest
// marker to the front reticle and reports it through onActive.

// ── tiny 3×3 matrix kit (row-major arrays) ──────────────────
const mul = (a, b) => {
  const o = new Array(9)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
  return o
}
const apply = (m, [x, y, z]) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
]
// rotation about a unit axis (Rodrigues)
const rot = ([x, y, z], a) => {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ]
}
// keeps the matrix orthonormal after thousands of small rotations
const orthonormalize = (m) => {
  const n = (v) => { const l = Math.hypot(...v); return v.map((k) => k / l) }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const x = n([m[0], m[3], m[6]])
  let y = [m[1], m[4], m[7]]
  const z = n(cross(x, y))
  y = cross(z, x)
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]
}

const AXES = [
  { v: [1, 0, 0], label: '+X' }, { v: [0, 1, 0], label: '+Y' }, { v: [0, 0, 1], label: '+Z' },
  { v: [-1, 0, 0], label: '-X' }, { v: [0, -1, 0], label: '-Y' }, { v: [0, 0, -1], label: '-Z' },
]
// Slot i for member i: the axis ends first, then an even Fibonacci spread.
export const slotFor = (i, n) => {
  if (i < AXES.length) return AXES[i]
  const k = i - AXES.length, m = n - AXES.length
  const y = 1 - ((k + 0.5) / m) * 2, r = Math.sqrt(1 - y * y), th = k * 2.39996
  return { v: [Math.cos(th) * r, y, Math.sin(th) * r], label: `N${i + 1}` }
}

const HUES = ['34, 211, 238', '167, 139, 250', '244, 114, 182', '74, 222, 128', '251, 191, 36', '96, 165, 250']
export const hueFor = (i) => HUES[i % HUES.length]

const fib = (n) => Array.from({ length: n }, (_, i) => {
  const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996
  return [Math.cos(th) * r, y, Math.sin(th) * r]
})

const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()

export default function TeamGlobe({ people, active, onActive }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const readout = useRef(null)
  const api = useRef({})
  const activeRef = useRef(active)
  const onActiveRef = useRef(onActive)
  onActiveRef.current = onActive

  // parent changed the selection (chip click / keyboard): fly there
  useEffect(() => {
    if (active !== activeRef.current) {
      activeRef.current = active
      api.current.flyTo?.(active)
    }
  }, [active])

  useEffect(() => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const n = people.length
    const slots = people.map((_, i) => slotFor(i, n))
    const dots = fib(380)

    // start in an isometric view so all three axes are visible, then glide to member 0
    const iso = (() => {
      const w = [1, 1, 1].map((k) => k / Math.sqrt(3))
      const axis = [w[1], -w[0], 0], l = Math.hypot(...axis)
      return rot(axis.map((k) => k / l), Math.acos(w[2]))
    })()
    let R = mul(rot([0, 0, 1], -0.35), iso)
    let vx = 0, vy = 0, vz = 0
    let dragging = false, target = active ?? 0, lastInput = performance.now()
    let W = 0, H = 0, dpr = 1, visible = true, raf = 0
    let lastCycle = performance.now()

    const setActive = (i) => {
      if (i !== activeRef.current) {
        activeRef.current = i
        onActiveRef.current?.(i)
      }
    }
    api.current.flyTo = (i) => { target = i; lastInput = performance.now() }

    const resize = () => {
      const r = wrap.current.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = r.width; H = r.height
      c.width = W * dpr; c.height = H * dpr
      c.style.width = W + 'px'; c.style.height = H + 'px'
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick() })
    io.observe(c)

    // ── input ────────────────────────────────────────────────
    let px = 0, py = 0, moved = 0, roll = false, lastMove = 0
    const down = (e) => {
      dragging = true; roll = e.shiftKey; moved = 0
      px = e.clientX; py = e.clientY
      vx = vy = vz = 0; target = null
      c.setPointerCapture(e.pointerId)
      wrap.current.classList.add('grabbing')
      lastInput = performance.now()
    }
    const move = (e) => {
      if (!dragging) return
      const dx = e.clientX - px, dy = e.clientY - py
      px = e.clientX; py = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      lastMove = performance.now()
      const k = 0.0085
      if (roll || e.shiftKey) { vz = -dx * k; vx = vy = 0 }
      else { vy = dx * k; vx = dy * k; vz = 0 }
      R = mul(rot([0, 1, 0], vy), mul(rot([1, 0, 0], vx), mul(rot([0, 0, 1], vz), R)))
      lastInput = performance.now()
    }
    const up = (e) => {
      if (!dragging) return
      dragging = false
      wrap.current.classList.remove('grabbing')
      lastInput = performance.now()
      // held still before letting go: no fling
      if (lastInput - lastMove > 90) vx = vy = vz = 0
      if (moved < 6) {
        // a tap: select the marker under the pointer, if any
        const r = c.getBoundingClientRect()
        const hit = hitTest(e.clientX - r.left, e.clientY - r.top)
        if (hit != null) { target = hit; setActive(hit) }
      }
    }
    const key = (e) => {
      const step = 0.12
      const map = {
        ArrowLeft: [0, -step, 0], ArrowRight: [0, step, 0],
        ArrowUp: [-step, 0, 0], ArrowDown: [step, 0, 0],
        q: [0, 0, step], e: [0, 0, -step],
      }
      if (map[e.key]) {
        e.preventDefault()
        ;[vx, vy, vz] = map[e.key]
        target = null
        lastInput = performance.now()
        kick()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        target = (activeRef.current + 1) % n
        setActive(target)
      }
    }
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up)
    c.addEventListener('pointercancel', up)
    c.addEventListener('keydown', key)

    // ── projection ───────────────────────────────────────────
    let cx = 0, cy = 0, rad = 0
    const F = 3.4
    const project = (v) => {
      const [x, y, z] = apply(R, v)
      const s = F / (F - z)
      return { x: cx + x * rad * s, y: cy - y * rad * s, z, s }
    }
    let markerScreen = []
    const hitTest = (x, y) => {
      let best = null, bd = 30
      markerScreen.forEach((m, i) => {
        const d = Math.hypot(m.x - x, m.y - y)
        if (m.z > -0.3 && d < bd) { bd = d; best = i }
      })
      return best
    }

    // ── drawing helpers ──────────────────────────────────────
    const line = (pts, front, back) => {
      // split a 3D polyline into front-facing and back-facing strokes
      ctx.beginPath()
      for (let i = 1; i < pts.length; i++) if ((pts[i].z + pts[i - 1].z) / 2 < 0) { ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y) }
      ctx.strokeStyle = back; ctx.stroke()
      ctx.beginPath()
      for (let i = 1; i < pts.length; i++) if ((pts[i].z + pts[i - 1].z) / 2 >= 0) { ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y) }
      ctx.strokeStyle = front; ctx.stroke()
    }
    const circle3d = (fn, seg = 72) => Array.from({ length: seg + 1 }, (_, i) => project(fn((i / seg) * Math.PI * 2)))

    // ── frame ────────────────────────────────────────────────
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const frame = (now) => {
      raf = 0
      if (!visible || document.hidden) return
      const t = now / 1000

      // motion
      if (!dragging) {
        if (target == null) {
          // inertia
          R = mul(rot([0, 1, 0], vy), mul(rot([1, 0, 0], vx), mul(rot([0, 0, 1], vz), R)))
          vx *= 0.94; vy *= 0.94; vz *= 0.9
          if (Math.abs(vx) + Math.abs(vy) + Math.abs(vz) < 0.002) {
            // settled: lock onto whichever marker is most in front
            let best = 0, bz = -2
            slots.forEach((s, i) => { const z = apply(R, s.v)[2]; if (z > bz) { bz = z; best = i } })
            target = best
          }
        }
        if (target != null) {
          // rotate the target marker toward the viewer (0,0,1)
          const w = apply(R, slots[target].v)
          const ang = Math.acos(Math.max(-1, Math.min(1, w[2])))
          if (ang > 0.001) {
            let axis = [w[1], -w[0], 0]
            const l = Math.hypot(...axis)
            axis = l < 1e-6 ? [0, 1, 0] : axis.map((k) => k / l)
            R = mul(rot(axis, ang * (reduced ? 1 : 0.09)), R)
          }
          if (ang < 0.45) setActive(target)
        }
        // attract mode: after a quiet spell, cycle through members
        if (!reduced && n > 1 && now - lastInput > 9000 && now - lastCycle > 6500) {
          lastCycle = now
          target = (activeRef.current + 1) % n
        }
      } else {
        // while dragging, the card follows whichever marker is nearly centred
        slots.forEach((s, i) => { if (apply(R, s.v)[2] > 0.93) setActive(i) })
      }
      if (now - lastInput < 9000) lastCycle = now
      R = orthonormalize(R)

      // layout
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      cx = W / 2; cy = H / 2; rad = Math.min(W, H) * 0.29
      ctx.lineWidth = 1

      // ambient glow
      const g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.6)
      g.addColorStop(0, 'rgba(34, 211, 238, 0.10)')
      g.addColorStop(0.6, 'rgba(167, 139, 250, 0.05)')
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      // outer HUD dial (2D, slowly turning)
      const dial = rad * 1.5
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.05)
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2, long = i % 10 === 0
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * dial, Math.sin(a) * dial)
        ctx.lineTo(Math.cos(a) * (dial - (long ? 10 : 4)), Math.sin(a) * (dial - (long ? 10 : 4)))
        ctx.strokeStyle = long ? 'rgba(34, 211, 238, .55)' : 'rgba(139, 148, 171, .25)'
        ctx.stroke()
      }
      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.fillStyle = 'rgba(139, 148, 171, .6)'
      ctx.textAlign = 'center'
      for (let d = 0; d < 360; d += 30) {
        const a = (d / 180) * Math.PI
        ctx.fillText(String(d).padStart(3, '0'), Math.cos(a) * (dial + 12), Math.sin(a) * (dial + 12) + 3)
      }
      ctx.restore()
      ctx.beginPath()
      ctx.setLineDash([2, 6])
      ctx.arc(cx, cy, rad * 1.22, -t * 0.2, -t * 0.2 + Math.PI * 1.6)
      ctx.strokeStyle = 'rgba(167, 139, 250, .35)'
      ctx.stroke()
      ctx.setLineDash([])

      // sphere silhouette
      ctx.beginPath()
      ctx.arc(cx, cy, rad * (F / Math.sqrt(F * F - 1)), 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(8, 12, 24, .55)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(34, 211, 238, .25)'
      ctx.stroke()

      // latitude + longitude grid
      for (let lat = -60; lat <= 60; lat += 30) {
        const p = (lat * Math.PI) / 180, y = Math.sin(p), r = Math.cos(p)
        line(circle3d((a) => [Math.cos(a) * r, y, Math.sin(a) * r]),
          lat === 0 ? 'rgba(34, 211, 238, .55)' : 'rgba(34, 211, 238, .22)', 'rgba(34, 211, 238, .05)')
      }
      for (let lon = 0; lon < 180; lon += 30) {
        const l = (lon * Math.PI) / 180
        line(circle3d((a) => [Math.cos(a) * Math.cos(l), Math.sin(a), Math.cos(a) * Math.sin(l)]),
          'rgba(167, 139, 250, .2)', 'rgba(167, 139, 250, .04)')
      }

      // point cloud
      for (const d of dots) {
        const p = project(d)
        if (p.z < -0.1) continue
        const a = 0.15 + p.z * 0.5
        ctx.fillStyle = `rgba(233, 237, 247, ${a.toFixed(2)})`
        const s = p.z > 0.6 ? 1.6 : 1.1
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      }

      // scanning band clipped to the sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rad * 1.02, 0, Math.PI * 2)
      ctx.clip()
      const sy = cy - rad + ((t * 0.35) % 1) * rad * 2
      const sg = ctx.createLinearGradient(0, sy - 28, 0, sy + 4)
      sg.addColorStop(0, 'rgba(34, 211, 238, 0)')
      sg.addColorStop(1, 'rgba(34, 211, 238, .22)')
      ctx.fillStyle = sg
      ctx.fillRect(cx - rad, sy - 28, rad * 2, 32)
      ctx.restore()

      // coordinate axes
      ;[[1, 0, 0, '34, 211, 238', 'X'], [0, 1, 0, '167, 139, 250', 'Y'], [0, 0, 1, '244, 114, 182', 'Z']].forEach(([x, y, z, col, name]) => {
        const a = project([-x * 1.55, -y * 1.55, -z * 1.55]), b = project([x * 1.55, y * 1.55, z * 1.55])
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(${col}, .45)`
        ctx.stroke()
        ctx.setLineDash([])
        ctx.font = '600 11px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(${col}, ${b.z > -0.2 ? 0.9 : 0.35})`
        ctx.fillText(`+${name}`, b.x, b.y + 4)
        ctx.fillStyle = `rgba(${col}, ${a.z > -0.2 ? 0.6 : 0.25})`
        ctx.fillText(`-${name}`, a.x, a.y + 4)
      })

      // orbit rings with satellites
      ;[[0.35, 0.6, 1.22, 0.6], [-0.5, 0.2, 1.32, -0.4]].forEach(([tx, tz, rr, speed], k) => {
        const M = mul(rot([1, 0, 0], tx), rot([0, 0, 1], tz))
        const pts = circle3d((a) => apply(M, [Math.cos(a) * rr, 0, Math.sin(a) * rr]), 90)
        line(pts, `rgba(${k ? '244, 114, 182' : '34, 211, 238'}, .35)`, `rgba(${k ? '244, 114, 182' : '34, 211, 238'}, .07)`)
        const a = t * speed
        const s = project(apply(M, [Math.cos(a) * rr, 0, Math.sin(a) * rr]))
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2.5 * s.s, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${k ? '244, 114, 182' : '34, 211, 238'}, ${s.z > 0 ? 1 : 0.3})`
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // member markers, back to front
      markerScreen = slots.map((s) => project(s.v))
      const order = markerScreen.map((m, i) => i).sort((a, b) => markerScreen[a].z - markerScreen[b].z)
      for (const i of order) {
        const m = markerScreen[i], col = hueFor(i), front = m.z > -0.15
        const isActive = i === activeRef.current
        const alpha = front ? 1 : 0.3
        const r0 = 9 * m.s

        // stalk from the surface out to the marker tag
        const tip = project(slots[i].v.map((k) => k * 1.22))
        ctx.beginPath()
        ctx.moveTo(m.x, m.y); ctx.lineTo(tip.x, tip.y)
        ctx.strokeStyle = `rgba(${col}, ${0.6 * alpha})`
        ctx.stroke()

        // pulse ring
        const pulse = (t * 0.8 + i * 0.33) % 1
        ctx.beginPath()
        ctx.arc(m.x, m.y, r0 + pulse * 18, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${col}, ${(1 - pulse) * 0.6 * alpha})`
        ctx.stroke()

        // core
        ctx.beginPath()
        ctx.arc(m.x, m.y, r0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(5, 6, 11, ${0.85 * alpha})`
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = `rgba(${col}, ${alpha})`
        ctx.shadowColor = `rgba(${col}, 1)`
        ctx.shadowBlur = front ? 14 : 0
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.lineWidth = 1
        ctx.font = `600 ${Math.round(8 * m.s)}px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(233, 237, 247, ${alpha})`
        ctx.fillText(initials(people[i].name), m.x, m.y + 3 * m.s)

        // tag
        if (front) {
          const label = `${slots[i].label} // ${(people[i].short || people[i].name).toUpperCase()}`
          ctx.font = '500 10px "JetBrains Mono", monospace'
          const tw = ctx.measureText(label).width
          const right = tip.x >= m.x
          const bx = Math.max(6, Math.min(W - tw - 16, right ? tip.x + 4 : tip.x - tw - 14))
          ctx.fillStyle = 'rgba(5, 6, 11, .75)'
          ctx.fillRect(bx, tip.y - 9, tw + 10, 16)
          ctx.strokeStyle = `rgba(${col}, .7)`
          ctx.strokeRect(bx + 0.5, tip.y - 8.5, tw + 9, 15)
          ctx.fillStyle = `rgba(${col}, 1)`
          ctx.textAlign = 'left'
          ctx.fillText(label, bx + 5, tip.y + 3)
        }

        // lock-on reticle
        if (isActive && front) {
          const rr = r0 + 14, spin = t * 1.6
          ctx.strokeStyle = `rgba(${col}, .95)`
          ctx.lineWidth = 2
          for (let q = 0; q < 4; q++) {
            ctx.beginPath()
            ctx.arc(m.x, m.y, rr, spin + q * Math.PI / 2, spin + q * Math.PI / 2 + 0.6)
            ctx.stroke()
          }
          ctx.lineWidth = 1
        }
      }

      // fixed front crosshair
      ctx.strokeStyle = 'rgba(233, 237, 247, .25)'
      ctx.beginPath()
      ctx.moveTo(cx - rad * 0.12, cy); ctx.lineTo(cx - rad * 0.05, cy)
      ctx.moveTo(cx + rad * 0.05, cy); ctx.lineTo(cx + rad * 0.12, cy)
      ctx.moveTo(cx, cy - rad * 0.12); ctx.lineTo(cx, cy - rad * 0.05)
      ctx.moveTo(cx, cy + rad * 0.05); ctx.lineTo(cx, cy + rad * 0.12)
      ctx.stroke()

      // readout: orientation as yaw / pitch / roll
      if (readout.current && ((now / 100) | 0) % 2 === 0) {
        const deg = (r) => String(Math.round((r * 180) / Math.PI)).padStart(4, ' ')
        const yaw = Math.atan2(R[2], R[8]), pitch = Math.asin(-Math.max(-1, Math.min(1, R[5]))), rl = Math.atan2(R[3], R[4])
        readout.current.textContent = `YAW ${deg(yaw)}°  PITCH ${deg(pitch)}°  ROLL ${deg(rl)}°`
      }

      kick()
    }
    kick()
    const onVis = () => { if (!document.hidden) kick() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      c.removeEventListener('pointerdown', down)
      c.removeEventListener('pointermove', move)
      c.removeEventListener('pointerup', up)
      c.removeEventListener('pointercancel', up)
      c.removeEventListener('keydown', key)
      api.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people])

  return (
    <div ref={wrap} className="globe" data-cursor="DRAG // ROTATE">
      <canvas
        ref={canvas}
        tabIndex={0}
        role="application"
        aria-label="3D team globe. Drag or use arrow keys to rotate, Q and E to roll, Enter for the next member."
      />
      <div className="globe-hud tl">SYS://ORBITAL_INDEX</div>
      <div className="globe-hud tr">{people.length} OPERATORS · {people.length} AXES</div>
      <div className="globe-hud bl" ref={readout} />
      <div className="globe-hud br">DRAG · SHIFT+DRAG ROLL</div>
    </div>
  )
}
