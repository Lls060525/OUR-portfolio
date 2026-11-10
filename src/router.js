import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// Tiny hash router: #/  #/people/<id>  #/projects/<slug>
// Hash URLs work on GitHub Pages and Vercel with no server rewrites.
// Page changes are wrapped in the View Transitions API, so elements that share a
// view-transition-name (avatar, project cover, title) morph between pages.

const read = () => window.location.hash.replace(/^#/, '') || '/'
const depth = (route) => route.split('/').filter(Boolean).length
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useRoute() {
  const [route, setRoute] = useState(read)

  useEffect(() => {
    let current = read()

    const onChange = () => {
      const next = read()
      // forward = going deeper (home → person → project), back = the reverse
      document.documentElement.dataset.dir = depth(next) >= depth(current) ? 'forward' : 'back'
      current = next

      const update = () => {
        flushSync(() => setRoute(next))
        window.scrollTo(0, 0)
      }

      if (document.startViewTransition && !reducedMotion()) document.startViewTransition(update)
      else update()
    }

    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const parts = route.split('/').filter(Boolean)
  return { page: parts[0] || 'home', id: parts[1], key: route }
}

export const href = (...parts) => '#/' + parts.join('/')
