import { Copy, WhatsappLogo, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { fetchReferrals, referralCodeFor, type ReferralRow } from '../../lib/queries';

const PALETTE = ['#1557E6', '#22A06B', '#F5B301', '#9b59b6', '#e67e22', '#16a085'];

function initialsOf(nome: string) {
  const parts = nome.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase();
}

export default function ReferralSheet({ onClose }: { onClose: () => void }) {
  const { usuario } = useAppData();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  useEffect(() => {
    if (!usuario) return;
    fetchReferrals(usuario.id).then(setReferrals);
  }, [usuario]);

  const code = usuario ? referralCodeFor(usuario.id) : '';
  const confirmed = referrals.filter((f) => f.status === 'assinou').length;
  const link = `${window.location.origin}/onboarding?ref=${code}`;

  function copy() {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }

  function shareWhatsapp() {
    const text = encodeURIComponent(`Bora estudar pro concurso comigo? Usa meu código ${code} no Foco: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <>
      <div onClick={onClose} className="absolute inset-0 z-[32] bg-[rgba(11,31,77,.5)]" />
      <div className="scr absolute inset-x-0 bottom-0 z-[33] max-h-[88%] overflow-y-auto rounded-t-[26px] rounded-b-[34px] bg-surface p-[8px_20px_26px] animate-sheet-up">
        <div className="mx-auto mb-4 mt-2 h-[5px] w-[42px] rounded-[3px] bg-border" />
        <div className="mb-1 flex items-center justify-between">
          <div className="font-display text-[19px] font-extrabold text-ink">Indique e ganhe</div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] border-none bg-app-bg text-text2">
            <X weight="bold" size={16} />
          </button>
        </div>
        <div className="font-sans text-[13px] font-semibold leading-[1.5] text-text2">
          Cada amigo que assinar a Mentoria Aprovação com seu código vira <b className="text-ink">R$ 30 de crédito</b> na sua próxima
          mensalidade.
        </div>

        <div className="mt-4.5 rounded-2xl p-[18px]" style={{ background: 'linear-gradient(135deg,#1557E6,#2f6bf0)', boxShadow: '0 12px 26px -16px rgba(21,87,230,.7)' }}>
          <div className="font-sans text-[11px] font-bold tracking-[0.5px] text-[#bcd0fb]">SEU CÓDIGO</div>
          <div className="mt-1 flex items-center justify-between gap-2.5">
            <div className="font-display text-[22px] font-extrabold tracking-[0.5px] text-white">{code}</div>
            <button
              onClick={copy}
              className="flex flex-none items-center gap-1.5 rounded-[11px] border-none bg-yellow px-3.5 py-2.5 font-sans text-[12.5px] font-extrabold text-ink"
            >
              <Copy weight="bold" size={15} />
              Copiar
            </button>
          </div>
        </div>
        <button
          onClick={shareWhatsapp}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[15px] border-none bg-success font-sans text-[14.5px] font-extrabold text-white"
          style={{ boxShadow: '0 5px 0 #17784f' }}
        >
          <WhatsappLogo weight="fill" size={18} />
          Compartilhar no WhatsApp
        </button>

        {copied && <div className="mt-2.5 text-center font-sans text-[12.5px] font-bold text-success">Link copiado! ✓</div>}

        <div className="mt-5.5 flex gap-2.5">
          <div className="flex-1 rounded-[14px] border-[1.5px] border-border bg-[#F8FAFF] p-3.5 text-center">
            <div className="font-display text-[20px] font-extrabold text-ink">{referrals.length}</div>
            <div className="mt-0.5 font-sans text-[11px] font-bold text-text3">indicados</div>
          </div>
          <div className="flex-1 rounded-[14px] border-[1.5px] border-border bg-[#F8FAFF] p-3.5 text-center">
            <div className="font-display text-[20px] font-extrabold text-success">{confirmed}</div>
            <div className="mt-0.5 font-sans text-[11px] font-bold text-text3">assinaram</div>
          </div>
          <div className="flex-1 rounded-[14px] border-[1.5px] border-border bg-[#F8FAFF] p-3.5 text-center">
            <div className="font-display text-[20px] font-extrabold text-blue">R${confirmed * 30}</div>
            <div className="mt-0.5 font-sans text-[11px] font-bold text-text3">em crédito</div>
          </div>
        </div>

        <div className="mt-4.5 font-sans text-[12px] font-extrabold tracking-[0.4px] text-text2">SEUS INDICADOS</div>
        {!referrals.length ? (
          <div className="mt-2.5 font-sans text-[13px] font-semibold text-text3">Ninguém usou seu código ainda.</div>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2">
            {referrals.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 rounded-2xl border-[1.5px] border-border2 p-[12px_14px]">
                <div
                  className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full font-sans text-[13px] font-extrabold text-white"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                >
                  {initialsOf(f.indicado_nome ?? '?')}
                </div>
                <div className="flex-1 font-sans text-[13.5px] font-bold text-ink">{f.indicado_nome ?? 'Amigo'}</div>
                <span
                  className="flex-none rounded-lg px-2.5 py-1 font-sans text-[10.5px] font-extrabold"
                  style={{ background: f.status === 'assinou' ? '#E9F7F0' : '#F4F6FC', color: f.status === 'assinou' ? '#17784f' : '#8791a8' }}
                >
                  {f.status === 'assinou' ? 'Assinou ✓' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
