import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { ArrowUpRight, Bug, ChartPieSlice, CaretRight, CurrencyCircleDollar, Eye, Flag, GearSix, House, List, Path, PlayCircle, SignOut, Stack, Users, X } from '@phosphor-icons/react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUsuario } from '../hooks/useUsuario';
import Brand from '../components/Brand';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  adminOnly?: boolean;
  end?: boolean;
}
const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Visão geral', icon: House, end: true },
  { to: '/admin/trilhas', label: 'Trilhas de estudo', icon: Path },
  { to: '/admin/aulas', label: 'Aulas', icon: PlayCircle },
  { to: '/admin/questoes', label: 'Banco de questões', icon: Stack },
  { to: '/admin/reportes', label: 'Reportes', icon: Flag },
  { to: '/admin/planos', label: 'Planos', icon: CurrencyCircleDollar, adminOnly: true },
  { to: '/admin/usuarios', label: 'Alunos e equipe', icon: Users, adminOnly: true },
  { to: '/admin/publico', label: 'Público', icon: ChartPieSlice, adminOnly: true },
  { to: '/admin/erros', label: 'Saúde do app', icon: Bug, adminOnly: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: GearSix, adminOnly: true },
];
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { usuario } = useUsuario();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const media = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => {
      if (media.matches) setMenuOpen(false);
    };
    media.addEventListener('change', closeOnDesktop);
    return () => {
      media.removeEventListener('change', closeOnDesktop);
      toggle?.focus();
    };
  }, [menuOpen]);
  const [logoutError, setLogoutError] = useState('');
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || usuario?.is_admin);
  const active = [...NAV_ITEMS].reverse().find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  async function logout() {
    try {
      await signOut();
      navigate('/login');
    } catch {
      setLogoutError('Não foi possível sair. Tente novamente.');
    }
  }
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#admin-content">
        Pular para o conteúdo
      </a>
      <button
        className={`admin-scrim ${menuOpen ? 'open' : ''}`}
        aria-label="Fechar menu"
        onClick={() => setMenuOpen(false)}
        tabIndex={menuOpen ? 0 : -1}
      />
      <aside
        ref={menuRef}
        id="admin-menu"
        className={`admin-sidebar ${menuOpen ? 'open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMenuOpen(false);
        }}
      >
        <div className="flex items-center justify-between">
          <Link to="/admin">
            <Brand caption="PAINEL DE GESTÃO" />
          </Link>
          <button className="icon-button admin-menu-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>
        <p className="nav-section-label">GERENCIAR</p>
        <nav aria-label="Administração">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} weight="duotone" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <strong>Conteúdo que faz a diferença.</strong>
            <p>Uma boa preparação começa com uma curadoria cuidadosa.</p>
          </div>
          <Link to="/trilha" className="side-link">
            <Eye size={20} />
            Ver como aluno
            <ArrowUpRight size={15} className="ml-auto" />
          </Link>
          <button onClick={logout} className="side-link">
            <SignOut size={20} />
            Sair da conta
          </button>
          {logoutError && (
            <p role="alert" className="text-error text-xs">
              {logoutError}
            </p>
          )}
          <div className="sidebar-profile">
            <span className="avatar">{usuario?.nome?.slice(0, 1) || 'A'}</span>
            <span>
              <strong>{usuario?.nome || 'Sua conta'}</strong>
              <small>{usuario?.is_admin ? 'Administrador' : 'Editor de conteúdo'}</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="admin-viewport" inert={menuOpen}>
        <header className="admin-topbar">
          <div className="flex items-center gap-3">
            <button
              ref={toggleRef}
              className="icon-button admin-menu-button"
              aria-label="Abrir menu de administração"
              aria-expanded={menuOpen}
              aria-controls="admin-menu"
              onClick={() => setMenuOpen(true)}
            >
              <List size={23} />
            </button>
            <div className="admin-breadcrumb">
              <span>Workspace</span>
              <CaretRight size={13} />
              <strong>{active?.label || 'Curadoria de módulos'}</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <Link to="/trilha" className="button button-secondary">
              <Eye size={16} />
              Ver aplicativo
              <ArrowUpRight size={14} />
            </Link>
            <span className="pill">{usuario?.is_admin ? 'Admin' : 'Editor'}</span>
          </div>
        </header>
        <main id="admin-content" className="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
