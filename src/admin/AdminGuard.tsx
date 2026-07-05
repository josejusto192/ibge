import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUsuario } from '../hooks/useUsuario';

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { session, loading: loadingAuth } = useAuth();
  const { usuario, loading: loadingUsuario } = useUsuario();

  if (loadingAuth || (session && loadingUsuario)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!usuario?.is_admin) return <Navigate to="/trilha" replace />;

  return <>{children}</>;
}
