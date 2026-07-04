import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PhoneShell from './components/PhoneShell';
import WithNav from './components/WithNav';
import { AppStateProvider } from './state/AppStateContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppDataProvider } from './contexts/AppDataContext';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import LoginScreen from './screens/Login';
import Home from './screens/home/Home';
import Question from './screens/question/Question';
import Result from './screens/Result';
import Stats from './screens/Stats';
import Ranking from './screens/Ranking';
import Profile from './screens/profile/Profile';

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

function AppRoutes() {
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

function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <PhoneShell>
          <AppRoutes />
        </PhoneShell>
      </AppStateProvider>
    </AuthProvider>
  );
}

export default App;
