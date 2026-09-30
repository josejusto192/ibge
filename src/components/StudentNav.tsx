import { Notebook, ShieldCheck, ArrowUpRight } from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import Brand from './Brand';
import { STUDENT_LINKS } from './studentLinks';

export default function StudentNav() {
  const { usuario, errosCount } = useAppData();
  return (
    <aside className="student-sidebar">
      <NavLink to="/trilha" aria-label="Foco, início">
        <Brand caption="UM POUCO TODO DIA" />
      </NavLink>
      <p className="nav-section-label">SEU ESPAÇO</p>
      <nav aria-label="Navegação principal">
        {STUDENT_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <span className="side-icon" aria-hidden="true">
                  <Icon size={21} weight={isActive ? 'fill' : 'duotone'} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <NavLink to="/caderno-de-erros" className="side-link">
          <span className="side-icon" aria-hidden="true">
            <Notebook size={21} weight="duotone" />
          </span>
          Caderno de erros{errosCount > 0 && <span className="nav-count">{errosCount}</span>}
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="little-spark">✦</span>
          <strong>Consistência muda o jogo.</strong>
          <p>Cada questão é mais um passo na sua preparação.</p>
        </div>
        {(usuario?.is_admin || usuario?.is_editor) && (
          <NavLink to="/admin" className="side-link">
            <ShieldCheck size={20} />
            Administração
            <ArrowUpRight size={16} className="ml-auto" />
          </NavLink>
        )}
        <NavLink to="/perfil" className="sidebar-profile">
          <span className="avatar">{usuario?.nome?.trim().slice(0, 1).toUpperCase() || 'F'}</span>
          <span>
            <strong>{usuario?.nome?.split(' ')[0] || 'Meu perfil'}</strong>
            <small>Seu próximo passo começa aqui</small>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
