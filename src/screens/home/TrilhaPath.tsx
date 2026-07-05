import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../contexts/AppDataContext';
import { useAppState } from '../../state/AppStateContext';
import type { Modulo } from '../../data/types';

const AMP = 34;
const CELL_H = 116;

function offsetX(i: number) {
  return Math.round(Math.sin((i * Math.PI) / 2) * AMP);
}

export default function TrilhaPath() {
  const { modules, loading } = useAppData();
  const { dispatch } = useAppState();
  const navigate = useNavigate();

  function startModule() {
    dispatch({ type: 'RESET_SESSION' });
    navigate('/questao');
  }

  if (loading) return null;

  if (!modules.length) {
    return (
      <div className="mt-10 text-center font-sans text-[13px] font-semibold text-text3">
        Nenhum módulo cadastrado nesta trilha ainda.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-center">
        <div className="inline-block rounded-[20px] border border-border2 bg-surface px-3.5 py-1.5 font-sans text-[11px] font-bold tracking-[1px] text-text3">
          SEÇÃO 1
        </div>
      </div>
      {modules.map((m, i) => (
        <ModuleNode key={m.id} m={m} index={i} onStart={startModule} />
      ))}
    </div>
  );
}

function ModuleNode({ m, index, onStart }: { m: Modulo; index: number; onStart: () => void }) {
  const isCurrent = m.status === 'current';
  const isDone = m.status === 'done';

  let bg: string;
  let glyphColor: string;
  let glyph: string;
  let shadow: string;

  if (isDone) {
    bg = '#1557E6';
    glyphColor = '#fff';
    glyph = '✓';
    shadow = '0 6px 0 #0E3DAE';
  } else if (isCurrent) {
    bg = '#FFCB2D';
    glyphColor = '#0B1F4D';
    glyph = '▶';
    shadow = '0 6px 0 #E0A800';
  } else {
    bg = '#E6EAF5';
    glyphColor = '#AEB6CC';
    glyph = String(index + 1);
    shadow = '0 5px 0 #D3D9EA';
  }

  const size = 66;
  const titleColor = isCurrent ? '#1557E6' : isDone ? '#3a4257' : '#9aa4bd';

  return (
    <div
      className="relative flex justify-center transition-transform duration-300"
      style={{ height: `${CELL_H}px`, marginTop: isCurrent ? '22px' : 0, transform: `translateX(${offsetX(index)}px)` }}
    >
      <div className="relative flex flex-col items-center">
        {isCurrent && (
          <div
            className="absolute -top-[39px] left-1/2 z-[3] animate-float-y-center whitespace-nowrap rounded-[11px] bg-surface px-[15px] py-[7px] font-sans text-[11px] font-extrabold tracking-[0.6px] text-blue"
            style={{ transform: 'translateX(-50%)', boxShadow: '0 8px 18px -5px rgba(11,31,77,.28)' }}
          >
            COMEÇAR
            <span
              className="absolute left-1/2 -bottom-[5px] h-2.5 w-2.5 bg-surface"
              style={{ transform: 'translateX(-50%) rotate(45deg)' }}
            />
          </div>
        )}
        <div
          onClick={isCurrent ? onStart : undefined}
          className={`relative z-[1] flex items-center justify-center rounded-full border-4 border-white font-display font-extrabold ${isCurrent ? 'animate-pulse-node cursor-pointer' : ''}`}
          style={{ width: `${size}px`, height: `${size}px`, background: bg, color: glyphColor, fontSize: '22px', boxShadow: shadow }}
        >
          {glyph}
        </div>
        <div className="mt-2.5 max-w-[104px] text-center font-sans text-[12px] font-extrabold leading-[1.2]" style={{ color: titleColor }}>
          {m.titulo}
        </div>
      </div>
    </div>
  );
}
