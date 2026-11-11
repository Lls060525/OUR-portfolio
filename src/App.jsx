import { useState } from 'react'
import { useRoute, href } from './router.js'
import { people, projects, site, joinNames, shortName, isCompetition } from './data.js'
import BootScreen from './fx/BootScreen.jsx'
import CyberCursor from './fx/CyberCursor.jsx'
import Home from './pages/Home.jsx'
import Person from './pages/Person.jsx'
import Project from './pages/Project.jsx'

const BOOT_LINES = [
  'Initialising kernel modules',
  `Mounting /dev/team (${people.length} operators)`,
  `Decrypting project archive (${projects.length} records)`,
  `Indexing competitions (${projects.filter(isCompetition).length} entries)`,
  'Handshake with 0x22D3EE ... established',
  'Calibrating holo-projector',
]

export default function App() {
  const { page, id, key } = useRoute()
  // boot: 'run' (overlay only) → 'exit' (page animates in under it) → 'done'
  const [boot, setBoot] = useState('run')

  let content
  if (page === 'people') content = <Person id={id} />
  else if (page === 'projects') content = <Project slug={id} />
  else content = <Home />

  return (
    <>
      {boot !== 'done' && (
        <BootScreen
          title={site.teamName}
          lines={BOOT_LINES}
          onExit={() => setBoot('exit')}
          onDone={() => setBoot('done')}
        />
      )}
      <CyberCursor />
      <div className="backdrop" aria-hidden="true">
        <div className="grid-bg" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>

      <header className="nav">
        <a className="brand" href={href()}>
          <span className="brand-mark" aria-hidden="true" />
          {site.teamName}
        </a>
        <nav>
          {people.map((p) => (
            <a key={p.id} href={href('people', p.id)} className={page === 'people' && id === p.id ? 'active' : ''}>
              {shortName(p)}
            </a>
          ))}
        </nav>
      </header>

      <main key={key} className="page">{boot !== 'run' && content}</main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} {site.teamName} · {joinNames(people.map((p) => p.name))}</span>
        <span>React + Vite · content in JSON · shipped via pull requests</span>
      </footer>
    </>
  )
}
