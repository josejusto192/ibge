import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { TrilhaPage } from './pages/TrilhaPage'
import { FiltrosPage } from './pages/FiltrosPage'
import { SessaoPage } from './pages/SessaoPage'
import { DisciplinaConcluidaPage } from './pages/DisciplinaConcluida'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2 animate-pulse">📊</div>
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/trilha/:slug" element={<PrivateRoute><TrilhaPage /></PrivateRoute>} />
      <Route
        path="/trilha/:slug/disciplina/:disciplina"
        element={<PrivateRoute><FiltrosPage /></PrivateRoute>}
      />
      <Route
        path="/trilha/:slug/disciplina/:disciplina/sessao"
        element={<PrivateRoute><SessaoPage /></PrivateRoute>}
      />
      <Route
        path="/trilha/:slug/disciplina/:disciplina/concluida"
        element={<PrivateRoute><DisciplinaConcluidaPage /></PrivateRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
