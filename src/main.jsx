import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './fx/fx.css'

// Browsers without the View Transitions API get a plain CSS page-enter animation instead.
document.documentElement.classList.toggle('vt', 'startViewTransition' in document)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
