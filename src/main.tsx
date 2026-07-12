import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyPerformanceProfile } from './utils/performanceProfile'

function applyInitialThemeAndScene() {
  const root = document.documentElement

  try {
    const storedTheme = window.localStorage.getItem('theme')
    const mode = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto' ? storedTheme : 'auto'
    const hour = new Date().getHours()
    const resolved = mode === 'auto' ? (hour >= 6 && hour < 18 ? 'light' : 'dark') : mode
    root.classList.toggle('light-theme', resolved === 'light')
  } catch {
    // Keep the default dark tokens if storage is unavailable.
  }

  try {
    const storedScene = window.localStorage.getItem('biau-port-harbor-scene')
    root.dataset.harborScene =
      storedScene === 'garden' || storedScene === 'stellar' || storedScene === 'dusk' ? storedScene : 'dusk'
  } catch {
    root.dataset.harborScene = 'dusk'
  }
}

applyInitialThemeAndScene()
applyPerformanceProfile()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
