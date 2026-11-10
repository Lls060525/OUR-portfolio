import { personById, projectsFor, asset } from '../data.js'
import { href } from '../router.js'
import { ProjectGrid, Tags, Avatar, SectionTitle } from '../components.jsx'

export default function Person({ id }) {
  const person = personById(id)
  if (!person) return <NotFound />

  const mine = projectsFor(person.id)
  const { github, linkedin, resume } = person.links || {}

  return (
    <>
      <a className="back" href={href()}>← back to team</a>

      <section className="hero profile">
        <Avatar person={person} size="lg" />
        <div>
          <p className="eyebrow"><span className="pulse" />{person.role}</p>
          <h1 style={{ viewTransitionName: `name-${person.id}` }}>{person.name}</h1>
          <p className="lead">{person.bio}</p>
          <div className="actions">
            {resume && <a className="btn primary" href={asset(resume)} target="_blank" rel="noopener noreferrer">Résumé ↗</a>}
            {github && <a className="btn" href={github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
            {linkedin && <a className="btn" href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
          </div>
          <Tags items={person.skills} />
        </div>
      </section>

      <section>
        <SectionTitle index={1}>Projects <span className="count">[{mine.length}]</span></SectionTitle>
        <ProjectGrid items={mine} focusId={person.id} />
      </section>
    </>
  )
}

function NotFound() {
  return (
    <section className="hero">
      <p className="eyebrow">error 404</p>
      <h1>Not found</h1>
      <p><a className="btn" href={href()}>Back to home</a></p>
    </section>
  )
}
