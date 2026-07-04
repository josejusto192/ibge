import { useAppData } from '../../contexts/AppDataContext';
import type { TrilhaRow } from '../../lib/queries';

const PALETTE = ['#1557E6', '#22A06B', '#F5B301', '#9b59b6', '#e67e22', '#16a085'];

function trilhaInitials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function trilhaColor(t: TrilhaRow) {
  return PALETTE[t.id % PALETTE.length];
}

export default function TrilhasSheet({ onClose }: { onClose: () => void }) {
  const { trilhas, activeTrilha, setActiveTrilha } = useAppData();

  async function select(t: TrilhaRow) {
    if (!t.ativa) return;
    await setActiveTrilha(t.id);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} className="absolute inset-0 z-20 bg-[rgba(11,31,77,.5)]" />
      <div className="scr absolute inset-x-0 bottom-0 z-[21] max-h-[82%] overflow-y-auto rounded-t-[26px] rounded-b-[34px] bg-surface p-[8px_20px_24px] animate-sheet-up">
        <div className="mx-auto mb-4 mt-2 h-[5px] w-[42px] rounded-[3px] bg-border" />
        <div className="font-display text-[19px] font-extrabold text-ink">Escolha sua trilha</div>
        <div className="mt-1 font-sans text-[12.5px] font-semibold text-text2">Novas trilhas chegando em breve. Foque em uma por vez.</div>
        <div className="mt-4.5 flex flex-col gap-2.5">
          {trilhas.map((t) => {
            const on = t.id === activeTrilha?.id;
            const soon = !t.ativa;
            const tag = soon ? 'Em breve' : on ? 'Ativa' : 'Trocar';
            return (
              <button
                key={t.id}
                onClick={() => select(t)}
                className="flex w-full items-center gap-3.5 rounded-[18px] border-[1.5px] p-3.5 text-left"
                style={{
                  borderColor: on ? '#1557E6' : '#EDF0F8',
                  background: on ? '#EEF3FF' : '#fff',
                  cursor: soon ? 'default' : 'pointer',
                  opacity: soon ? 0.6 : 1,
                }}
              >
                <div
                  className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] font-display text-[16px] font-extrabold text-white"
                  style={{ background: trilhaColor(t) }}
                >
                  {trilhaInitials(t.nome)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-sans text-[14.5px] font-extrabold text-ink">{t.nome}</div>
                  <div className="mt-0.5 truncate font-sans text-[12px] font-semibold text-text2">{t.descricao}</div>
                </div>
                <span
                  className="flex-none rounded-lg px-2.5 py-1 font-sans text-[10px] font-extrabold tracking-[0.3px]"
                  style={{
                    background: soon ? '#F4F6FC' : on ? '#1557E6' : '#EEF3FF',
                    color: soon ? '#8791a8' : on ? '#fff' : '#1557E6',
                  }}
                >
                  {tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
