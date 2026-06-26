import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '../node_modules/@douyinfe/semi-ui-19/dist/css/semi.min.css'
import './index.css'
import './styles/theme.css'
import './styles/animations.css'
import './styles/navigation.css'
import './styles/hero-split.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
