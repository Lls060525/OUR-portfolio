import { people, projects, site } from '../data.js'
import { href } from '../router.js'
import { ProjectGrid, Tags, Avatar, SectionTitle, spotlight } from '../components.jsx'

export default function Home() {
  const builds = projects.filter((p) => p.category !== 'hackathon' || p.alsoProject)
  const hackathons = projects.filter((p) => p.category === 'hackathon')
  const techCount = new Set(projects.flatMap((p) => p.tech || [])).size

  return (
    <>
      <section className="hero">
        <p className="eyebrow"><span className="pulse" />{site.tag}<span className="caret">_</span></p>
        <h1>
          <Highlight text={site.headline} highlight={site.highlight} />
        </h1>
        <p className="lead">
          {site.intro}
        </p>

        <dl className="hud">
          <div><dt>Projects</dt><dd>{builds.length}</dd></div>
          <div><dt>Hackathons</dt><dd>{hackathons.length}</dd></div>
          <div><dt>Technologies</dt><dd>{techCount}</dd></div>
          <div><dt>Developers</dt><dd>{people.length}</dd></div>
        </dl>
      </section>

      <section>
        <SectionTitle index={1}>The team</SectionTitle>
        <div className="people">
          {people.map((p, i) => (
            <a
              key={p.id}
              className="person-card glass reveal"
              href={href('people', p.id)}
              onPointerMove={spotlight}
              style={{ '--i': i }}
            >
              <Avatar person={p} />
              <div className="person-info">
                <h3 style={{ viewTransitionName: `name-${p.id}` }}>{p.name}</h3>
                <p className="meta">{p.role}</p>
                <p className="tagline">{p.tagline}</p>
                <Tags items={p.skills.slice(0, 5)} />
              </div>
              <span className="card-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle index={2}>Projects</SectionTitle>
        <ProjectGrid items={builds} />
      </section>

      {hackathons.length > 0 && (
        <section>
          <SectionTitle index={3}>Hackathons &amp; competitions</SectionTitle>
          <ProjectGrid items={hackathons} noVTFor={builds.map((p) => p.slug)} />
        </section>
      )}
    </>
  )
}

// Wraps the "highlight" phrase of the headline in gradient text.
function Highlight({ text, highlight }) {
  const i = highlight ? text.indexOf(highlight) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <span className="gradient-text">{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  )
}
