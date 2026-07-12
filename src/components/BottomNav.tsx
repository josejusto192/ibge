import { useLocation } from 'react-router-dom';
import { useAppState } from '../state/AppStateContext';

const TABS = [
  { path: '/trilha', label: 'Trilha' },
  { path: '/stats', label: 'Stats' },
  { path: '/ranking', label: 'Ranking' },
  { path: '/perfil', label: 'Perfil' },
] as const;

export default function BottomNav() {
  const { navWithLoading } = useAppState();
  const location = useLocation();

  return (
    <div
      className="flex flex-none bg-surface px-1.5 pt-2 pb-3.5"
      style={{ borderTop: '1px solid #EDF0F8', boxShadow: '0 -6px 20px -14px rgba(11,31,77,.3)' }}
    >
      {TABS.map((tab) => {
        const on = location.pathname === tab.path;
        const color = on ? '#1557E6' : '#b4bccf';
        return (
          <button
            key={tab.path}
            onClick={() => navWithLoading(tab.path)}
            className="flex flex-1 flex-col items-center gap-1.5 border-none bg-transparent py-1 font-sans text-[11px] font-extrabold"
            style={{ color: on ? '#1557E6' : '#9aa4bd' }}
          >
            <NavGlyph path={tab.path} color={color} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function NavGlyph({ path, color }: { path: string; color: string }) {
  if (path === '/trilha') {
    return (
      <span className="flex h-[19px] items-center justify-center">
        <span className="h-[13px] w-[13px] rounded-[3px]" style={{ background: color, transform: 'rotate(45deg)' }} />
      </span>
    );
  }
  if (path === '/stats') {
    return (
      <span className="flex h-[19px] items-end justify-center gap-[3px]">
        <span className="w-1 rounded-sm" style={{ height: '8px', background: color }} />
        <span className="w-1 rounded-sm" style={{ height: '16px', background: color }} />
        <span className="w-1 rounded-sm" style={{ height: '12px', background: color }} />
      </span>
    );
  }
  if (path === '/ranking') {
    return (
      <span className="flex h-[19px] items-center justify-center">
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full font-sans text-[10px] font-extrabold text-white"
          style={{ background: color }}
        >
          ★
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-[19px] flex-col items-center justify-center gap-0.5">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      <span className="h-[7px] w-[13px] rounded-t-[7px]" style={{ background: color }} />
    </span>
  );
}
