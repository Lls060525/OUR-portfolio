import { projects, personById, formatDate, kindLabel } from '../data.js'
import { href } from '../router.js'
import { Tags, Cover, initials, STATUS } from '../components.jsx'

// Accepts a normal YouTube link and returns a privacy-friendly embed URL.
function youtubeEmbed(url) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
}

export default function Project({ slug }) {
  const p = projects.find((x) => x.slug === slug)
  if (!p) {
    return (
      <section className="hero">
        <p className="eyebrow">error 404</p>
        <h1>Project not found</h1>
        <p><a className="btn" href={href()}>Back to home</a></p>
      </section>
    )
  }

  const video = youtubeEmbed(p.links?.video)
  const sections = [
    ['The problem', p.problem],
    ['What we built', p.solution],
    ['Outcome', p.outcome],
  ].filter(([, text]) => text)

  return (
    <article className="case">
      <a className="back" href={href()}>← all projects</a>

      <p className="eyebrow" data-print="seq">
        <span className="pulse" />
        {[kindLabel(p), p.event, formatDate(p.date), STATUS[p.status]]
          .filter(Boolean).join(' // ')}
      </p>
      <h1 data-print="decode-seq" style={{ viewTransitionName: `title-${p.slug}` }}>{p.title}</h1>
      <p className="lead" data-print="seq">{p.summary}</p>

      <div className="actions">
        {p.links?.demo && <a className="btn primary" href={p.links.demo} target="_blank" rel="noopener noreferrer">Live demo ↗</a>}
        {p.links?.repo && <a className="btn" href={p.links.repo} target="_blank" rel="noopener noreferrer">Source code ↗</a>}
        {p.links?.repos?.map((r) => (
          <a key={r.url} className="btn" href={r.url} target="_blank" rel="noopener noreferrer">{r.label} ↗</a>
        ))}
      </div>
      {p.tech?.length > 0 && <Tags items={p.tech} />}

      <div className="case-media">
        {video
          ? <div className="video"><iframe src={video} title={`${p.title} demo video`} allowFullScreen loading="lazy" /></div>
          : <Cover project={p} className="cover-lg" />}
      </div>

      <section className="who glass scene">
        <h2 className="panel-label">// who built what</h2>
        <ul>
          {p.contributors?.map((c) => {
            const person = personById(c.id)
            return (
              <li key={c.id || c.name}>
                {person
                  ? <a href={href('people', c.id)} className="who-name">
                      <span className="mini-avatar">{initials(person.name)}</span>{person.name}
                    </a>
                  : <span className="who-name">
                      <span className="mini-avatar guest">{initials(c.name || c.id)}</span>{c.name || c.id}
                    </span>}
                <span>{c.did}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {sections.map(([title, text], i) => (
        <section key={title} className="story scene">
          <span className="section-index">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <h2 data-print="view">{title}</h2>
            <p>{text}</p>
          </div>
        </section>
      ))}
    </article>
  )
}
