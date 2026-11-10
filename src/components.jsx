import { useState } from 'react'
import { href } from './router.js'
import { asset, formatDate, personById, shortName } from './data.js'

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
      onPointerMove={spotlight}
      style={{ '--i': index }}
    >
      <div className="card-cover">
        <Cover project={project} noVT={noVT} />
        <div className="badges">
          {project.category === 'hackathon' && <span className="badge">Hackathon</span>}
          {STATUS[project.status] && <span className="badge badge-live"><span className="pulse" />{STATUS[project.status]}</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="meta meta-top">{[project.event, !project.event && formatDate(project.date)].filter(Boolean).join('') || 'Project'}</div>
        <h3 style={{ viewTransitionName: noVT ? 'none' : `title-${project.slug}` }}>{project.title}</h3>
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
