import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PhoneShell from './components/PhoneShell';
import WithNav from './components/WithNav';
import { AppStateProvider } from './state/AppStateContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppDataProvider } from './contexts/AppDataContext';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import LoginScreen from './screens/Login';
import ForgotPasswordScreen from './screens/ForgotPassword';
import ResetPasswordScreen from './screens/ResetPassword';
import TermosDeUsoScreen from './screens/legal/Termos';
import PoliticaPrivacidadeScreen from './screens/legal/Privacidade';
import Home from './screens/home/Home';
import Question from './screens/question/Question';
import CadernoErros from './screens/CadernoErros';
import Result from './screens/Result';
import Stats from './screens/Stats';
import Ranking from './screens/Ranking';
import Profile from './screens/profile/Profile';
import AdminGuard from './admin/AdminGuard';
import AdminTrilhasPage from './admin/AdminTrilhasPage';
import AdminTrilhaDetailPage from './admin/AdminTrilhaDetailPage';
import AdminModuloPage from './admin/AdminModuloPage';
import AdminQuestoesBancoPage from './admin/AdminQuestoesBancoPage';
import AdminQuestaoReviewPage from './admin/AdminQuestaoReviewPage';
import AdminUsuariosPage from './admin/AdminUsuariosPage';
import AdminErrosPage from './admin/AdminErrosPage';
import AdminConfiguracoesPage from './admin/AdminConfiguracoesPage';

function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-border" style={{ borderTopColor: '#1557E6' }} />
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <AppDataProvider>{children}</AppDataProvider>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/trilha" replace />;
  return <>{children}</>;
}

function StudentRoutes() {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <PublicOnlyRoute>
            <OnboardingScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/esqueci-senha"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordScreen />
          </PublicOnlyRoute>
        }
      />
      {/* Sem guarda: o link de recuperação de e-mail estabelece uma sessão de
          recovery, e PublicOnlyRoute redirecionaria pra /trilha antes do
          aluno poder trocar a senha. */}
      <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />
      {/* Sem guarda de propósito: acessíveis tanto no onboarding (aluno ainda
          sem conta) quanto por um aluno já logado. */}
      <Route path="/termos" element={<TermosDeUsoScreen />} />
      <Route path="/privacidade" element={<PoliticaPrivacidadeScreen />} />
      <Route
        path="/trilha"
        element={
          <PrivateRoute>
            <WithNav>
              <Home />
            </WithNav>
          </PrivateRoute>
        }
      />
      <Route
        path="/questao"
        element={
          <PrivateRoute>
            <Question />
          </PrivateRoute>
        }
      />
      <Route
        path="/caderno-de-erros"
        element={
          <PrivateRoute>
            <CadernoErros />
          </PrivateRoute>
        }
      />
      <Route
        path="/resultado"
        element={
          <PrivateRoute>
            <Result />
          </PrivateRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <PrivateRoute>
            <WithNav>
              <Stats />
            </WithNav>
          </PrivateRoute>
        }
      />
      <Route
        path="/ranking"
        element={
          <PrivateRoute>
            <WithNav>
              <Ranking />
            </WithNav>
          </PrivateRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <WithNav>
              <Profile />
            </WithNav>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/admin/trilhas" replace />} />
      <Route
        path="trilhas"
        element={
          <AdminGuard>
            <AdminTrilhasPage />
          </AdminGuard>
        }
      />
      <Route
        path="trilhas/:id"
        element={
          <AdminGuard>
            <AdminTrilhaDetailPage />
          </AdminGuard>
        }
      />
      <Route
        path="modulos/:moduloId"
        element={
          <AdminGuard>
            <AdminModuloPage />
          </AdminGuard>
        }
      />
      <Route
        path="questoes"
        element={
          <AdminGuard>
            <AdminQuestoesBancoPage />
          </AdminGuard>
        }
      />
      <Route
        path="questoes/:id"
        element={
          <AdminGuard>
            <AdminQuestaoReviewPage />
          </AdminGuard>
        }
      />
      <Route
        path="usuarios"
        element={
          <AdminGuard>
            <AdminUsuariosPage />
          </AdminGuard>
        }
      />
      <Route
        path="erros"
        element={
          <AdminGuard>
            <AdminErrosPage />
          </AdminGuard>
        }
      />
      <Route
        path="configuracoes"
        element={
          <AdminGuard>
            <AdminConfiguracoesPage />
          </AdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/admin/trilhas" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route
          path="/*"
          element={
            <AppStateProvider>
              <PhoneShell>
                <StudentRoutes />
              </PhoneShell>
            </AppStateProvider>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
