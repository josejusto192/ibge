import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { Bug, Eye, GearSix, House, Path, SignOut, Stack, Users } from '@phosphor-icons/react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUsuario } from '../hooks/useUsuario';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  adminOnly?: boolean;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Visão geral', icon: House, end: true },
  { to: '/admin/trilhas', label: 'Trilhas', icon: Path },
  { to: '/admin/questoes', label: 'Banco de questões', icon: Stack },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
  { to: '/admin/erros', label: 'Erros', icon: Bug, adminOnly: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: GearSix, adminOnly: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { usuario } = useUsuario();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || usuario?.is_admin);

  async function logout() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <aside className="flex w-64 flex-none flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 p-5">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blue-600">
            <span className="font-display text-base font-extrabold text-yellow-400">F</span>
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-extrabold text-gray-900">Foco</div>
            <div className="truncate text-xs font-semibold text-gray-400">Painel Admin</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: ItemIcon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <ItemIcon weight="bold" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t border-gray-100 p-3">
          <button
            onClick={() => navigate('/trilha')}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-500 hover:bg-gray-100"
          >
            <Eye weight="bold" size={18} />
            Ver como aluno
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <SignOut weight="bold" size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <main className="mx-auto max-w-5xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
