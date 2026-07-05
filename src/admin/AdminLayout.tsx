import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-extrabold text-gray-900">Foco · Admin</span>
          <nav className="flex gap-1">
            <NavLink to="/admin/trilhas" className={NAV_LINK_CLASS}>
              Trilhas
            </NavLink>
            <NavLink to="/admin/questoes" className={NAV_LINK_CLASS}>
              Banco de questões
            </NavLink>
            <NavLink to="/admin/usuarios" className={NAV_LINK_CLASS}>
              Usuários
            </NavLink>
            <NavLink to="/admin/configuracoes" className={NAV_LINK_CLASS}>
              Configurações
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/trilha')} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
            Ver como aluno
          </button>
          <button onClick={logout} className="text-sm font-semibold text-red-600 hover:text-red-700">
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
