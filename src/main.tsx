import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('The HomeTeam application root is unavailable.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
