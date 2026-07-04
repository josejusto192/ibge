import { X } from '@phosphor-icons/react';
import { FILTER_BANCAS } from '../../data/mock';
import { useAppState } from '../../state/AppStateContext';

export default function FiltersSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppState();

  return (
    <>
      <div onClick={onClose} className="absolute inset-0 z-20 bg-[rgba(11,31,77,.5)]" />
      <div className="scr absolute inset-x-0 bottom-0 z-[21] max-h-[82%] overflow-y-auto rounded-t-[26px] rounded-b-[34px] bg-surface p-[8px_20px_24px] animate-sheet-up">
        <div className="mx-auto mb-4 mt-2 h-[5px] w-[42px] rounded-[3px] bg-border" />
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-display text-[19px] font-extrabold text-ink">Filtrar questões</div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border-none bg-app-bg text-text2"
          >
            <X weight="bold" size={16} />
          </button>
        </div>
        <div className="mt-4.5">
          <div className="mb-2.5 font-sans text-[12px] font-extrabold tracking-[0.4px] text-text2">BANCA</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => dispatch({ type: 'SET_FILTER', key: 'banca', value: '' })}
              className="rounded-xl border-[1.5px] px-[15px] py-2.5 font-sans text-[13px] font-bold"
              style={{
                borderColor: state.filters.banca === '' ? '#1557E6' : '#E6EAF5',
                background: state.filters.banca === '' ? '#1557E6' : '#fff',
                color: state.filters.banca === '' ? '#fff' : '#3a4257',
              }}
            >
              Todas
            </button>
            {FILTER_BANCAS.map((opt) => {
              const active = state.filters.banca === opt;
              return (
                <button
                  key={opt}
                  onClick={() => dispatch({ type: 'SET_FILTER', key: 'banca', value: opt })}
                  className="rounded-xl border-[1.5px] px-[15px] py-2.5 font-sans text-[13px] font-bold"
                  style={{
                    borderColor: active ? '#1557E6' : '#E6EAF5',
                    background: active ? '#1557E6' : '#fff',
                    color: active ? '#fff' : '#3a4257',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-6.5 flex gap-3">
          <button
            onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}
            className="h-[52px] flex-none rounded-[15px] border-[1.5px] border-border px-5 font-sans text-[14px] font-extrabold text-text2"
          >
            Limpar
          </button>
          <button
            onClick={onClose}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[15px] border-none bg-blue font-sans text-[15px] font-extrabold text-white"
            style={{ boxShadow: '0 5px 0 #0E3DAE' }}
          >
            Aplicar filtro
          </button>
        </div>
      </div>
    </>
  );
}
