import { href } from '../router.js'
import { projectsFor, isCompetition } from '../data.js'
import { Avatar } from '../components.jsx'
import { Scramble } from './text.jsx'
import { slotFor, hueFor } from './TeamGlobe.jsx'

// A name card "projected" out of an emitter: the beam flickers on, a scan line
// sweeps down and reveals the card, and the name decodes out of noise.
// Re-mounts (key = person id) whenever the selected member changes.
export default function HoloCard({ person, index, total }) {
  const mine = projectsFor(person.id)
  const comps = mine.filter(isCompetition).length
  const slot = slotFor(index, total)
  const id = `GZ-${String(index + 1).padStart(2, '0')}`

  return (
    <div className="holo" style={{ '--holo': hueFor(index) }}>
      <div className="holo-card" key={person.id}>
        <span className="holo-scan" aria-hidden="true" />
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />

        <div className="holo-head">
          <span>OPERATOR FILE // {id}</span>
          <span>AXIS {slot.label}</span>
        </div>

        <div className="holo-id">
          <Avatar person={person} />
          <div>
            <h3><Scramble text={person.name} on="mount" duration={700} /></h3>
            <p className="meta">{person.role}</p>
          </div>
        </div>

        <p className="holo-line holo-tagline">{person.tagline}</p>

        <dl className="holo-stats holo-line">
          <div><dt>Projects</dt><dd>{mine.length - comps}</dd></div>
          <div><dt>Competitions</dt><dd>{comps}</dd></div>
          <div><dt>Skills</dt><dd>{person.skills.length}</dd></div>
        </dl>

        <ul className="tags holo-line">
          {person.skills.slice(0, 6).map((s) => <li key={s}>{s}</li>)}
        </ul>

        <a className="btn holo-line holo-open" href={href('people', person.id)} data-cursor="OPEN DOSSIER">
          <Scramble text="Open dossier →" />
        </a>
        <p className="holo-foot holo-line" aria-hidden="true">
          signal {(97 + ((index * 7) % 3)).toFixed(1)}% · {index + 1}/{total} · encrypted channel
        </p>
      </div>
      <div className="holo-beam" aria-hidden="true" key={`beam-${person.id}`} />
      <div className="holo-emitter" aria-hidden="true"><span /></div>
    </div>
  )
}
