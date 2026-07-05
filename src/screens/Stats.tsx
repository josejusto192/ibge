import { useEffect, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { fetchStats, type StatsData } from '../lib/queries';
import { levelFromXp } from '../lib/format';
import { useAppState } from '../state/AppStateContext';
import PatternBackground from '../components/PatternBackground';

const WEEK_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function colorForPct(pct: number) {
  if (pct >= 75) return '#22A06B';
  if (pct >= 50) return '#1557E6';
  return '#F5B301';
}

export default function Stats() {
  const { dispatch } = useAppState();
  const { usuario, dailyDone } = useAppData();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!usuario) return;
    fetchStats(usuario.id).then(setStats);
  }, [usuario]);

  const level = levelFromXp(usuario?.xp ?? 0);
  const dailyGoal = usuario?.meta_diaria ?? 20;
  const dailyRatio = Math.min(1, dailyDone / dailyGoal);
  const dailyPct = Math.round(dailyRatio * 100);
  const dailyLeft = Math.max(0, dailyGoal - dailyDone);

  const weekData = stats?.ultimos7Dias ?? [0, 0, 0, 0, 0, 0, dailyDone];
  const weekMax = Math.max(1, ...weekData);
  const weakest = stats?.porDisciplina.length ? [...stats.porDisciplina].sort((a, b) => a.pct - b.pct)[0] : null;

  return (
    <>
      <div className="z-[3] bg-surface p-[18px_18px_14px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
        <div className="font-display text-[20px] font-extrabold text-ink">Estatísticas</div>
      </div>
      <PatternBackground scrollClassName="p-[18px_18px_30px]">
        <div className="flex gap-3">
          <div className="flex-1 rounded-[20px] p-4" style={{ background: 'linear-gradient(135deg,#FFCB2D,#F5B301)', boxShadow: '0 12px 26px -16px rgba(245,179,1,.8)' }}>
            <div className="font-display text-[34px] font-extrabold text-ink">{usuario?.streak ?? 0}</div>
            <div className="font-sans text-[12px] font-extrabold text-[#7a5900]">dias seguidos 🔥</div>
          </div>
          <div className="flex-1 rounded-[20px] p-4" style={{ background: 'linear-gradient(135deg,#1557E6,#2f6bf0)', boxShadow: '0 12px 26px -16px rgba(21,87,230,.7)' }}>
            <div className="font-display text-[34px] font-extrabold text-white">{level}</div>
            <div className="font-sans text-[12px] font-extrabold text-[#c9d7fb]">nível · {usuario?.xp ?? 0} XP</div>
          </div>
        </div>

        <div className="mt-3.5 rounded-[20px] bg-surface p-[18px]" style={{ boxShadow: '0 10px 28px -20px rgba(11,31,77,.4)' }}>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="font-sans text-[14px] font-extrabold text-ink">Meta diária</div>
            <div className="font-sans text-[12px] font-bold text-text2">
              {dailyDone} de {dailyGoal} questões
            </div>
          </div>
          <div className="flex items-center gap-4.5">
            <div
              className="flex h-[82px] w-[82px] flex-none items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#F5B301 ${dailyRatio * 360}deg,#EDF0F8 0)` }}
            >
              <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-surface font-display text-[17px] font-extrabold text-ink">
                {dailyPct}%
              </div>
            </div>
            <div className="flex-1 font-sans text-[13px] font-semibold leading-[1.5] text-ink-soft">
              Faltam <b className="text-ink">{dailyLeft} questões</b> para bater sua meta de hoje e manter o streak.
            </div>
          </div>
        </div>

        <div className="mt-3.5 rounded-[20px] bg-surface p-[18px]" style={{ boxShadow: '0 10px 28px -20px rgba(11,31,77,.4)' }}>
          <div className="mb-4 font-sans text-[14px] font-extrabold text-ink">Questões nos últimos 7 dias</div>
          <div className="flex h-[120px] items-end justify-between gap-2">
            {weekData.map((v, i) => {
              const active = i === 6;
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full max-w-[26px] rounded-[7px]"
                    style={{ height: `${(v / weekMax) * 100}%`, minHeight: '6px', background: active ? '#1557E6' : '#cfe0ff' }}
                  />
                  <div className="font-sans text-[11px] font-bold" style={{ color: active ? '#1557E6' : '#8791a8' }}>
                    {WEEK_LABELS[i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3.5 rounded-[20px] bg-surface p-[18px]" style={{ boxShadow: '0 10px 28px -20px rgba(11,31,77,.4)' }}>
          <div className="mb-4 font-sans text-[14px] font-extrabold text-ink">Desempenho por disciplina</div>
          {stats && !stats.porDisciplina.length ? (
            <div className="font-sans text-[13px] font-semibold text-text3">Responda questões para ver seu desempenho aqui.</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {(stats?.porDisciplina ?? []).map((d) => (
                <div key={d.disciplina}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="font-sans text-[13px] font-bold text-ink">{d.disciplina}</span>
                    <span className="font-sans text-[12px] font-extrabold" style={{ color: colorForPct(d.pct) }}>
                      {d.pct}%
                    </span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-md bg-border2">
                    <div className="h-full rounded-md" style={{ width: `${d.pct}%`, background: colorForPct(d.pct) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {weakest && (
          <div
            onClick={() => dispatch({ type: 'SET_MENTOR_OPEN', open: true })}
            className="mt-3.5 cursor-pointer rounded-[20px] border-[1.5px] border-yellow-border bg-surface p-[18px]"
            style={{ boxShadow: '0 10px 28px -20px rgba(11,31,77,.4)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-yellow-tint font-display text-[20px] font-extrabold text-yellow-deep">
                !
              </div>
              <div className="flex-1">
                <div className="font-sans text-[14px] font-extrabold text-ink">Travando em {weakest.disciplina}?</div>
                <div className="mt-0.5 font-sans text-[12px] font-bold text-text3">{weakest.pct}% de acerto é seu ponto fraco hoje.</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-yellow-tint p-[12px_13px] font-sans text-[12.5px] font-bold leading-[1.5] text-yellow-text">
              Um mentor pode montar um plano de reforço focado na sua maior dificuldade.{' '}
              <span className="text-ink">Conhecer a mentoria ›</span>
            </div>
          </div>
        )}
      </PatternBackground>
    </>
  );
}
