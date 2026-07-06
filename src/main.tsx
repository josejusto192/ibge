import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { logClientError } from './lib/errorLog.ts'

window.addEventListener('error', (e) => logClientError(e.error ?? e.message, 'window.onerror'))
window.addEventListener('unhandledrejection', (e) => logClientError(e.reason, 'unhandledrejection'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
)
