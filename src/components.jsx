import { useState } from 'react'
import { flushSync } from 'react-dom'
import { href } from './router.js'
import {
  asset, formatDate, personById, shortName,
  competitionType, kindLabel, matchesFilter, COMPETITION_TYPES,
} from './data.js'
import { Scramble } from './fx/text.jsx'

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

// noVT: used when the same project appears twice on a page — view-transition names must be unique.
export function ProjectCard({ project, focusId, index = 0, noVT = false }) {
  const mine = focusId && project.contributors?.find((c) => c.id === focusId)
  const who = project.contributors?.map((c) => shortName(personById(c.id)) || c.name).filter(Boolean)

  return (
    <a
      className="card glass reveal"
      href={href('projects', project.slug)}
      data-cursor="VIEW CASE →"
      onPointerMove={spotlight}
      style={{ '--i': index }}
    >
      <div className="card-cover">
        <Cover project={project} noVT={noVT} />
        <div className="badges">
          <span className={`badge badge-${competitionType(project) || 'project'}`}>{kindLabel(project)}</span>
          {STATUS[project.status] && <span className="badge badge-live"><span className="pulse" />{STATUS[project.status]}</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="meta meta-top">{[project.event, !project.event && formatDate(project.date)].filter(Boolean).join('') || 'Project'}</div>
        <h3 style={{ viewTransitionName: noVT ? 'none' : `title-${project.slug}` }}><Scramble text={project.title} /></h3>
        <p>{project.summary}</p>
        {mine && <p className="role"><span>my role</span>{mine.did}</p>}
        {who?.length > 0 && <div className="meta">by {who.join(' · ')}</div>}
        <Tags items={project.tech} />
        <span className="card-arrow" aria-hidden="true">→</span>
      </div>
    </a>
  )
}

export function ProjectGrid({ items, focusId, noVTFor = [] }) {
  if (!items.length) return <p className="muted">Nothing here yet.</p>
  return (
    <div className="grid">
      {items.map((p, i) => <ProjectCard key={p.slug} project={p} focusId={focusId} index={i} noVT={noVTFor.includes(p.slug)} />)}
    </div>
  )
}

export function SectionTitle({ index, children }) {
  return (
    <h2 className="section-title">
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
      <ProjectGrid items={shown} focusId={focusId} />
    </>
  )
}
