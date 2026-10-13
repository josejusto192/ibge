import { useEffect, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { fetchRanking, type RankingRow } from '../lib/queries';
import { daysLeftInMonth } from '../lib/format';
import PatternBackground from '../components/PatternBackground';

const POS_COLORS: Record<number, string> = { 1: '#F5B301', 2: '#9aa4bd', 3: '#cd7f32' };
const PRIZES: Record<number, string> = { 1: 'Mentoria grátis', 2: '50% off', 3: '25% off' };
const PALETTE = ['#1557E6', '#22A06B', '#F5B301', '#9b59b6', '#e67e22', '#16a085', '#c0392b', '#2980b9'];

function initialsOf(nome: string) {
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase();
}

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

export default function Ranking() {
  const { usuario } = useAppData();
  const [rows, setRows] = useState<RankingRow[]>([]);

  useEffect(() => {
    fetchRanking().then(setRows);
  }, []);

  return (
    <>
      <div className="z-[3] bg-surface p-[18px_18px_14px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
        <div className="font-display text-[20px] font-extrabold text-ink">Ranking mensal</div>
        <div className="mt-0.5 font-sans text-[12px] font-semibold text-text2">Liga Ouro · termina em {daysLeftInMonth()} dias</div>
      </div>
      <PatternBackground scrollClassName="p-[18px_18px_30px]">
        <div className="mb-4 flex gap-2">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'linear-gradient(135deg,#FFCB2D,#F5B301)', boxShadow: '0 10px 22px -14px rgba(245,179,1,.8)' }}>
            <div className="font-sans text-[18px] font-extrabold text-ink">🥇</div>
            <div className="mt-1 font-sans text-[11px] font-extrabold text-[#7a5900]">Mentoria grátis</div>
          </div>
          <div className="flex-1 rounded-2xl border-[1.5px] border-border2 bg-surface p-3 text-center">
            <div className="font-sans text-[18px] font-extrabold text-ink">🥈</div>
            <div className="mt-1 font-sans text-[11px] font-extrabold text-text2">50% off mentoria</div>
          </div>
          <div className="flex-1 rounded-2xl border-[1.5px] border-border2 bg-surface p-3 text-center">
            <div className="font-sans text-[18px] font-extrabold text-ink">🥉</div>
            <div className="mt-1 font-sans text-[11px] font-extrabold text-text2">25% off mentoria</div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {rows.map((r, i) => {
            const pos = i + 1;
            const prize = PRIZES[pos];
            const me = r.id === usuario?.id;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-[15px] p-[11px_13px]"
                style={{ background: me ? '#EEF3FF' : '#fff', border: `1.5px solid ${me ? '#1557E6' : '#EDF0F8'}` }}
              >
                <div className="w-[26px] flex-none text-center font-display text-[15px] font-extrabold" style={{ color: POS_COLORS[pos] || '#8791a8' }}>
                  {pos}
                </div>
                <div
                  className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full font-sans text-[14px] font-extrabold text-white"
                  style={{ background: colorFor(r.id) }}
                >
                  {initialsOf(r.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[14px] text-ink"
                    style={{ fontWeight: me ? 800 : 700 }}
                  >
                    {me ? 'Você' : r.nome}
                  </div>
                </div>
                {prize && (
                  <span
                    className="mr-0.5 flex-none rounded-lg px-2 py-1 font-sans text-[10.5px] font-extrabold"
                    style={{ background: pos === 1 ? '#FFF6D6' : '#EEF3FF', color: pos === 1 ? '#7a5900' : '#1557E6' }}
                  >
                    {prize}
                  </span>
                )}
                <div className="font-display text-[14px] font-extrabold text-blue">{r.xp}</div>
              </div>
            );
          })}
        </div>
      </PatternBackground>
    </>
  );
}
