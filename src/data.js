import people from '../content/people.json'
import site from '../content/site.json'

// Every JSON file in content/projects becomes a project.
// The file name (without .json) is the project's URL slug.
const files = import.meta.glob('../content/projects/*.json', { eager: true })

export const projects = Object.entries(files)
  .map(([path, mod]) => ({
    slug: path.split('/').pop().replace('.json', ''),
    ...(mod.default ?? mod),
  }))
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

export { people, site }

// Short display name for nav and card labels (falls back to the full name).
export const shortName = (p) => p?.short || p?.name || ''

export const personById = (id) => people.find((p) => p.id === id)

// ── categories ──────────────────────────────────────────────
// category: "project" (personal / coursework) or "competition".
// competition: "hackathon" | "ctf" | "other". The older category values
// "hackathon" and "ctf" are still accepted and mean the same thing.
export const COMPETITION_TYPES = {
  hackathon: 'Hackathon',
  ctf: 'CTF',
  other: 'Competition',
}

export const isCompetition = (p) => ['competition', 'hackathon', 'ctf'].includes(p.category)

export const competitionType = (p) => {
  if (!isCompetition(p)) return null
  const t = p.category === 'competition' ? p.competition : p.category
  return COMPETITION_TYPES[t] ? t : 'other'
}

// The label shown on a card badge.
export const kindLabel = (p) => (isCompetition(p) ? COMPETITION_TYPES[competitionType(p)] : 'Project')

// filter: { kind: 'all' | 'project' | 'competition', type: 'all' | 'hackathon' | 'ctf' | 'other' }
export const matchesFilter = (p, { kind, type }) => {
  if (kind === 'project') return !isCompetition(p) || !!p.alsoProject
  if (kind === 'competition') return isCompetition(p) && (type === 'all' || competitionType(p) === type)
  return true
}

export const projectsFor = (personId) =>
  projects.filter((p) => p.contributors?.some((c) => c.id === personId))

// Files in /public are served from the site root; base './' keeps paths relative.
export const asset = (path) => (path ? `${import.meta.env.BASE_URL}${path}` : '')

export const formatDate = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, (m || 1) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

// ["A"] → "A", ["A","B"] → "A & B", ["A","B","C"] → "A, B & C"
export const joinNames = (names) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
