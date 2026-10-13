import { NavLink } from 'react-router-dom';
import { STUDENT_LINKS } from './studentLinks';

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {STUDENT_LINKS.map(({ to, label, shortLabel, icon: Icon }) => (
        <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <span className="tab-icon" aria-hidden="true">
                <Icon size={24} weight={isActive ? 'fill' : 'duotone'} />
              </span>
              <span className="tab-label">{shortLabel}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
