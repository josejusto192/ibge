import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { useAppState } from '../state/AppStateContext';

interface ResultLocationState {
  moduloTitulo?: string;
  trilhaNome?: string;
}

export default function Result() {
  const { state, dispatch } = useAppState();
  const { usuario } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const { moduloTitulo, trilhaNome } = (location.state as ResultLocationState) ?? {};
  const { sessionAnswered, sessionCorrect, gained } = state.session;
  const accuracy = sessionAnswered ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0;

  return (
    <div className="scr flex flex-1 flex-col items-center overflow-y-auto p-[60px_24px_32px] text-center">
      <div
        className="flex h-24 w-24 animate-pop-in items-center justify-center rounded-[28px] bg-yellow"
        style={{ boxShadow: '0 12px 0 #E0A800', transform: 'rotate(-6deg)' }}
      >
        <span className="font-display text-[46px] font-extrabold text-ink" style={{ transform: 'rotate(6deg)' }}>
          ★
        </span>
      </div>
      <div className="mt-6.5 font-display text-[26px] font-extrabold text-ink">Módulo concluído!</div>
      <div className="mt-1.5 font-sans text-[14px] font-semibold text-text2">
        {moduloTitulo ?? 'Módulo'}
        {trilhaNome ? ` · ${trilhaNome}` : ''}
      </div>

      <div className="mt-7 flex w-full gap-3">
        <div className="flex-1 rounded-[18px] bg-surface p-[18px_12px]" style={{ boxShadow: '0 10px 28px -18px rgba(11,31,77,.4)' }}>
          <div className="font-display text-[28px] font-extrabold text-success">{accuracy}%</div>
          <div className="mt-0.5 font-sans text-[11px] font-bold text-text2">ACERTOS</div>
        </div>
        <div className="flex-1 rounded-[18px] bg-surface p-[18px_12px]" style={{ boxShadow: '0 10px 28px -18px rgba(11,31,77,.4)' }}>
          <div className="font-display text-[28px] font-extrabold text-blue">+{gained}</div>
          <div className="mt-0.5 font-sans text-[11px] font-bold text-text2">XP GANHO</div>
        </div>
        <div className="flex-1 rounded-[18px] bg-surface p-[18px_12px]" style={{ boxShadow: '0 10px 28px -18px rgba(11,31,77,.4)' }}>
          <div className="font-display text-[28px] font-extrabold text-yellow-deep">{usuario?.streak ?? 0}</div>
          <div className="mt-0.5 font-sans text-[11px] font-bold text-text2">DIAS SEGUIDOS</div>
        </div>
      </div>

      <div className="mt-5 w-full rounded-2xl border-[1.5px] border-blue-border bg-blue-tint p-4 text-left">
        <div className="font-sans text-[13px] font-extrabold text-blue">
          Você acertou {sessionCorrect} de {sessionAnswered} questões
        </div>
        <div className="mt-1.5 font-sans text-[12.5px] font-medium leading-[1.5] text-ink-soft">
          Continue assim! O próximo módulo da trilha já está desbloqueado.
        </div>
      </div>

      <div
        onClick={() => dispatch({ type: 'SET_MENTOR_OPEN', open: true })}
        className="mt-3.5 flex w-full cursor-pointer items-center gap-3.5 rounded-2xl p-4 text-left"
        style={{ background: 'linear-gradient(135deg,#FFCB2D,#F5B301)', boxShadow: '0 12px 26px -16px rgba(245,179,1,.9)' }}
      >
        <div className="flex-1">
          <div className="font-sans text-[9px] font-extrabold tracking-[1px] text-[#7a5900]">MENTORIA APROVAÇÃO</div>
          <div className="mt-1 font-sans text-[15px] font-extrabold text-ink">Quer acelerar sua aprovação?</div>
          <div className="mt-0.5 font-sans text-[12px] font-bold text-[#7a5900]">Um mentor monta seu cronograma. Ver como funciona ›</div>
        </div>
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-[rgba(11,31,77,.12)] text-ink">
          <ArrowUpRight weight="bold" size={20} />
        </div>
      </div>

      <button
        onClick={() => navigate('/trilha')}
        className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none bg-blue font-sans text-[16px] font-extrabold text-white"
        style={{ boxShadow: '0 6px 0 #0E3DAE' }}
      >
        Continuar trilha <ArrowRight weight="bold" size={18} />
      </button>
    </div>
  );
}
