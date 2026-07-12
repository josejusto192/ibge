import { ArrowRight, Check, X } from '@phosphor-icons/react';
import { useAppState } from '../../state/AppStateContext';
import { MENTOR_BULLETS } from '../../data/mock';

export default function MentorSheet() {
  const { state, dispatch } = useAppState();
  if (!state.mentorOpen) return null;

  const close = () => dispatch({ type: 'SET_MENTOR_OPEN', open: false });

  return (
    <>
      <div onClick={close} className="absolute inset-0 z-[28] bg-[rgba(11,31,77,.55)]" />
      <div
        className="scr absolute inset-x-0 bottom-0 z-[29] max-h-[88%] overflow-y-auto rounded-t-[26px] bg-surface pb-6 animate-sheet-up"
      >
        <div
          className="relative rounded-b-[24px] rounded-t-[26px] p-[22px_22px_24px]"
          style={{ background: 'linear-gradient(160deg,#1557E6,#1349c4)' }}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border-none bg-white/[.18] text-white"
          >
            <X weight="bold" size={15} />
          </button>
          <div className="font-sans text-[10px] font-extrabold tracking-[1.5px] text-yellow">MENTORIA APROVAÇÃO</div>
          <div className="mt-2 font-display text-[23px] font-extrabold leading-[1.25] text-white">
            Da trilha à aprovação, com um mentor ao seu lado.
          </div>
          <div className="mt-2.5 flex gap-4">
            <div>
              <span className="font-display text-[18px] font-extrabold text-yellow">+2 mil</span>
              <span className="ml-1 font-sans text-[11px] font-bold text-[#c9d7fb]">aprovados</span>
            </div>
            <div>
              <span className="font-display text-[18px] font-extrabold text-yellow">4,9★</span>
              <span className="ml-1 font-sans text-[11px] font-bold text-[#c9d7fb]">avaliação</span>
            </div>
          </div>
        </div>

        <div className="p-[20px_22px_0]">
          <div className="flex flex-col gap-3.5">
            {MENTOR_BULLETS.map((b) => (
              <div key={b.titulo} className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-success-tint text-success">
                  <Check weight="bold" size={12} />
                </span>
                <div>
                  <div className="font-sans text-[13.5px] font-extrabold text-ink">{b.titulo}</div>
                  <div className="mt-0.5 font-sans text-[12px] leading-[1.4] font-semibold text-text2">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] p-4 text-center">
            <div className="font-sans text-[12px] font-bold text-text3">A partir de</div>
            <div className="mt-0.5 font-display text-[28px] font-extrabold text-ink">
              R$ 197<span className="font-sans text-[14px] font-bold text-text3">/mês</span>
            </div>
            <div className="mt-0.5 font-sans text-[11px] font-bold text-success">7 dias de garantia · cancele quando quiser</div>
          </div>

          <button
            onClick={close}
            className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none bg-blue font-sans text-[16px] font-extrabold text-white"
            style={{ boxShadow: '0 6px 0 #0E3DAE' }}
          >
            Quero minha vaga <ArrowRight weight="bold" size={18} />
          </button>
          <div onClick={close} className="mt-3 cursor-pointer text-center font-sans text-[13px] font-bold text-text3">
            Agora não
          </div>
        </div>
      </div>
    </>
  );
}
