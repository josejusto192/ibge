import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUsuario } from '../hooks/useUsuario';
import { LoadingExperience } from '../components/Feedback';

// adminOnly: páginas sensíveis (usuários, erros, configurações) exigem
// admin de verdade; as demais aceitam também o papel editor (curadoria).
export default function AdminGuard({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, loading: loadingAuth } = useAuth();
  const { usuario, loading: loadingUsuario } = useUsuario();
  const location = useLocation();

  if (loadingAuth || (session && loadingUsuario)) return <LoadingExperience message="Abrindo o painel" fullPage />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const allowed = usuario?.is_admin || (!adminOnly && usuario?.is_editor);
  if (!allowed) return <Navigate to="/trilha" replace />;

  return <>{children}</>;
}
