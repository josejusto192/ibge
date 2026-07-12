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

// PWA: registra o service worker só em produção (no dev ele atrapalharia o
// HMR). Sem esperar o evento load — recursos externos lentos (fontes,
// analytics) atrasariam o registro sem necessidade.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // instalar o app é um extra — falha aqui não pode quebrar nada
  })
}

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
