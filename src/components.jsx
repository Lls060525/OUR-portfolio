import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { href } from './router.js'
import {
  asset, formatDate, personById, shortName,
  competitionType, kindLabel, matchesFilter, COMPETITION_TYPES,
} from './data.js'
import { printElement } from './fx/motion.js'

// Moves a soft glow to follow the pointer on cards.
export const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export const STATUS = { upcoming: 'Upcoming', 'in-progress': 'In progress' }

const hueFor = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

export const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()

export function Tags({ items }) {
  return (
    <ul className="tags">
      {items?.map((t) => <li key={t}>{t}</li>)}
    </ul>
  )
}

export function Avatar({ person, size = 'md' }) {
  return (
    <div className={`avatar avatar-${size}`} style={{ viewTransitionName: `avatar-${person.id}` }}>
      <span>{initials(person.name)}</span>
    </div>
  )
}

// Screenshot if there is one (and it loads); otherwise a generated sci-fi tile.
export function Cover({ project, className = '', noVT = false }) {
  const [broken, setBroken] = useState(false)
  const hue = hueFor(project.slug)
  const showImg = project.cover && !broken

  return (
    <div
      className={`cover ${className}`}
      style={{ viewTransitionName: noVT ? 'none' : `cover-${project.slug}`, '--h': hue }}
    >
      {showImg
        ? <img src={asset(project.cover)} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <span className="cover-glyph">{project.title.slice(0, 1)}</span>}
    </div>
  )
}

// One project as a full-height "slide". While it is the scene in focus it gets
// .live (see fx/motion.js): the cover scans in and the text prints out of glyphs.
// Scrolling away dissolves it again.
export function ProjectSlide({ project, focusId, index = 0, total = 1 }) {
  const ref = useRef(null)
  const mine = focusId && project.contributors?.find((c) => c.id === focusId)
  const who = project.contributors?.map((c) => shortName(personById(c.id)) || c.name).filter(Boolean)
  const link = href('projects', project.slug)

  useEffect(() => {
    const el = ref.current
    const onEnter = () => {
      el.querySelectorAll('[data-sp]').forEach((n, i) => {
        setTimeout(() => printElement(n, { blank: false, speed: 7, max: 700 }), 120 + i * 90)
      })
    }
    el.addEventListener('scene-enter', onEnter)
    return () => el.removeEventListener('scene-enter', onEnter)
  }, [])

  return (
    <article ref={ref} className="slide scene" onPointerMove={spotlight}>
      <div className="slide-inner glass">
        <a className="slide-cover" href={link} data-cursor="VIEW CASE →" tabIndex={-1} aria-hidden="true">
          <Cover project={project} />
          <span className="slide-scan" />
          <div className="badges">
            <span className={`badge badge-${competitionType(project) || 'project'}`}>{kindLabel(project)}</span>
            {STATUS[project.status] && <span className="badge badge-live"><span className="pulse" />{STATUS[project.status]}</span>}
          </div>
        </a>

        <div className="slide-info">
          <div className="slide-index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}<span>/{String(total).padStart(2, '0')}</span>
          </div>
          <p className="meta" data-sp>{[project.event || formatDate(project.date) || 'Project'].join('')}</p>
          <h3 style={{ viewTransitionName: `title-${project.slug}` }}>
            <a href={link} data-sp data-cursor="VIEW CASE →">{project.title}</a>
          </h3>
          <p className="slide-summary" data-sp>{project.summary}</p>
          {mine && <p className="role"><span>my role</span>{mine.did}</p>}
          {who?.length > 0 && <div className="meta">by {who.join(' · ')}</div>}
          <Tags items={project.tech} />
          <a className="btn slide-open" href={link} data-cursor="OPEN CASE">Open case study →</a>
        </div>
      </div>
    </article>
  )
}

export function ProjectDeck({ items, focusId }) {
  if (!items.length) return <p className="muted">Nothing here yet.</p>
  return (
    <div className="deck">
      {items.map((p, i) => <ProjectSlide key={p.slug} project={p} focusId={focusId} index={i} total={items.length} />)}
    </div>
  )
}

export function SectionTitle({ index, children }) {
  return (
    <h2 className="section-title" data-print="view">
      <span className="section-index">{String(index).padStart(2, '0')}</span>
      {children}
    </h2>
  )
}

// ── filtering ───────────────────────────────────────────────
const KINDS = [['all', 'All'], ['project', 'Projects'], ['competition', 'Competitions']]

// Runs a state change inside a view transition so cards glide to their new
// positions instead of jumping. The root cross-fade is switched off for it.
const animated = (fn) => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) return fn()
  const html = document.documentElement
  html.dataset.vt = 'filter'
  const vt = document.startViewTransition(() => flushSync(fn))
  vt.finished.finally(() => delete html.dataset.vt)
}

export function FilterBar({ items, filter, setFilter }) {
  const count = (f) => items.filter((p) => matchesFilter(p, f)).length
  const set = (f) => animated(() => setFilter(f))

  return (
    <div className="filters" role="group" aria-label="Filter projects">
      <div className="seg">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={filter.kind === k ? 'on' : ''}
            aria-pressed={filter.kind === k}
            onClick={() => set({ kind: k, type: 'all' })}
          >
            {label} <span className="n">{count({ kind: k, type: 'all' })}</span>
          </button>
        ))}
      </div>

      {filter.kind === 'competition' && (
        <div className="chips" role="group" aria-label="Competition type">
          {[['all', 'All types'], ...Object.entries(COMPETITION_TYPES).map(([k, v]) => [k, k === 'other' ? 'Others' : v])].map(([t, label]) => {
            const n = count({ kind: 'competition', type: t })
            return (
              <button
                key={t}
                type="button"
                className={`chip chip-${t}${filter.type === t ? ' on' : ''}`}
                aria-pressed={filter.type === t}
                disabled={n === 0 && t !== 'all'}
                onClick={() => set({ kind: 'competition', type: t })}
              >
                <span className="dot" />{label} <span className="n">{n}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Filter bar + grid. Used on the home page and on each person's page.
export function ProjectBrowser({ items, focusId }) {
  const [filter, setFilter] = useState({ kind: 'all', type: 'all' })
  const shown = items.filter((p) => matchesFilter(p, filter))
  return (
    <>
      <FilterBar items={items} filter={filter} setFilter={setFilter} />
      <ProjectDeck items={shown} focusId={focusId} />
    </>
  )
}
