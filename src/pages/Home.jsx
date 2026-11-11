import { useState } from 'react'
import { people, projects, site, isCompetition } from '../data.js'
import { ProjectBrowser, SectionTitle } from '../components.jsx'
import { ProximityText } from '../fx/text.jsx'
import TeamGlobe, { hueFor } from '../fx/TeamGlobe.jsx'
import HoloCard from '../fx/HoloCard.jsx'

export default function Home() {
  const [active, setActive] = useState(0)
  const builds = projects.filter((p) => !isCompetition(p) || p.alsoProject)
  const competitions = projects.filter(isCompetition)
  const techCount = new Set(projects.flatMap((p) => p.tech || [])).size

  return (
    <>
      <section className="hero scene">
        <p className="eyebrow" data-print="seq"><span className="pulse" />{site.tag}<span className="caret">_</span></p>
        <h1 data-print="seq">
          <ProximityText text={site.headline} highlight={site.highlight} />
        </h1>
        <p className="lead" data-print="seq">
          {site.intro}
        </p>

        <dl className="hud" data-print="seq">
          <div><dt>Projects</dt><dd>{builds.length}</dd></div>
          <div><dt>Competitions</dt><dd>{competitions.length}</dd></div>
          <div><dt>Technologies</dt><dd>{techCount}</dd></div>
          <div><dt>Developers</dt><dd>{people.length}</dd></div>
        </dl>
      </section>

      <section>
        <SectionTitle index={1}>The team</SectionTitle>
        <div className="team-stage scene">
          <div className="globe-col">
            <TeamGlobe people={people} active={active} onActive={setActive} />
            <div className="member-switch" role="tablist" aria-label="Team members">
              {people.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  className={active === i ? 'on' : ''}
                  style={{ '--c': hueFor(i) }}
                  onClick={() => setActive(i)}
                >
                  <span className="dot" />{p.short || p.name}
                </button>
              ))}
            </div>
          </div>
          <HoloCard person={people[active]} index={active} total={people.length} />
        </div>
      </section>

      <section>
        <SectionTitle index={2}>Projects &amp; competitions</SectionTitle>
        <ProjectBrowser items={projects} />
      </section>
    </>
  )
}
