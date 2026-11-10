import { useRoute, href } from './router.js'
import { people, site, joinNames, shortName } from './data.js'
import Home from './pages/Home.jsx'
import Person from './pages/Person.jsx'
import Project from './pages/Project.jsx'

export default function App() {
  const { page, id, key } = useRoute()

  let content
  if (page === 'people') content = <Person id={id} />
  else if (page === 'projects') content = <Project slug={id} />
  else content = <Home />

  return (
    <>
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

      <main key={key} className="page">{content}</main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} {site.teamName} · {joinNames(people.map((p) => p.name))}</span>
        <span>React + Vite · content in JSON · shipped via pull requests</span>
      </footer>
    </>
  )
}
