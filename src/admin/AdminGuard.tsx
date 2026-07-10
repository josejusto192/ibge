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

// adminOnly: páginas sensíveis (usuários, erros, configurações) exigem
// admin de verdade; as demais aceitam também o papel editor (curadoria).
export default function AdminGuard({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, loading: loadingAuth } = useAuth();
  const { usuario, loading: loadingUsuario } = useUsuario();

  if (loadingAuth || (session && loadingUsuario)) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  const allowed = usuario?.is_admin || (!adminOnly && usuario?.is_editor);
  if (!allowed) return <Navigate to="/trilha" replace />;

  return <>{children}</>;
}
