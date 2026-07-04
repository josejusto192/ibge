import { useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import TrilhaPath from './TrilhaPath';
import TrilhasSheet from './TrilhasSheet';
import FiltersSheet from './FiltersSheet';

export default function Home() {
  const { usuario, activeTrilha, dailyDone } = useAppData();
  const [sheet, setSheet] = useState<'none' | 'trilhas' | 'filters'>('none');

  const dailyGoal = usuario?.meta_diaria ?? 20;
  const dailyRatio = Math.min(1, dailyDone / dailyGoal);

  return (
    <>
      <div className="z-[3] bg-surface p-[16px_18px_14px]" style={{ borderBottom: '1px solid #EDF0F8', boxShadow: '0 6px 20px -14px rgba(11,31,77,.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-blue">
              <span className="font-display text-[18px] font-extrabold text-yellow">F</span>
            </div>
            <div className="font-display text-[17px] font-extrabold text-ink">Foco</div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-yellow-border bg-yellow-tint px-2.5 py-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-deep" />
              <span className="font-sans text-[13px] font-extrabold text-yellow-text">{usuario?.streak ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-blue-border bg-blue-tint px-2.5 py-1.5">
              <span className="font-sans text-[11px] font-bold text-blue">XP</span>
              <span className="font-sans text-[13px] font-extrabold text-blue">{usuario?.xp ?? 0}</span>
            </div>
          </div>
        </div>

        <div
          className="mt-3.5 flex items-center justify-between rounded-[18px] p-[14px_16px]"
          style={{ background: 'linear-gradient(100deg,#1557E6,#2f6bf0)', boxShadow: '0 10px 24px -12px rgba(21,87,230,.6)' }}
        >
          <div onClick={() => setSheet('trilhas')} className="min-w-0 flex-1 cursor-pointer">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-[11px] font-bold tracking-[0.4px] text-[#bcd0fb]">TRILHA ATUAL</span>
              <span className="rounded-md bg-yellow px-1.5 py-0.5 font-sans text-[10px] font-extrabold text-ink">trocar ›</span>
            </div>
            <div className="mt-0.5 font-sans text-[16px] font-extrabold text-white">{activeTrilha?.nome ?? '—'}</div>
            <div className="mt-0.5 truncate font-sans text-[12px] font-semibold text-[#c9d7fb]">{activeTrilha?.descricao ?? ''}</div>
          </div>
          <button
            onClick={() => setSheet('filters')}
            className="ml-3 flex flex-none flex-col items-center gap-1 rounded-[13px] border-none bg-white/[.16] px-2.5 py-2.5"
          >
            <span className="flex flex-col gap-0.5">
              <span className="h-0.5 w-4 rounded-sm bg-white" />
              <span className="ml-auto h-0.5 w-[11px] rounded-sm bg-white" />
              <span className="h-0.5 w-4 rounded-sm bg-white" />
            </span>
            <span className="font-sans text-[10px] font-bold text-white">Filtros</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-[9px] flex-1 overflow-hidden rounded-md bg-border2">
            <div
              className="h-full rounded-md"
              style={{ width: `${Math.round(dailyRatio * 100)}%`, background: 'linear-gradient(90deg,#FFCB2D,#F5B301)' }}
            />
          </div>
          <div className="font-sans text-[12px] font-extrabold text-ink">
            Meta {dailyDone}/{dailyGoal}
          </div>
        </div>
      </div>

      <div
        className="scr flex-1 overflow-y-auto overflow-x-hidden p-[26px_18px]"
        style={{ backgroundImage: "url('/assets/trilha-pattern.png')", backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat' }}
      >
        <TrilhaPath />
      </div>

      {sheet === 'trilhas' && <TrilhasSheet onClose={() => setSheet('none')} />}
      {sheet === 'filters' && <FiltersSheet onClose={() => setSheet('none')} />}
    </>
  );
}
