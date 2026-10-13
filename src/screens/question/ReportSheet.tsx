import { ArrowLeft, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { REPORT_REASONS } from '../../data/mock';
import ModalFrame from '../../components/ModalFrame';

interface ReportSheetProps {
  onClose: () => void;
  // Vira ticket em Admin → Reportes. Rejeita se não conseguir salvar.
  onSubmit: (reason: string, mensagem: string) => Promise<void>;
}

export default function ReportSheet({ onClose, onSubmit }: ReportSheetProps) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    if (!motivo || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      await onSubmit(motivo, mensagem);
    } catch (err) {
      setErro(err instanceof Error && err.message.includes('muitos chamados') ? err.message : 'Não foi possível enviar agora. Tente de novo.');
      setEnviando(false);
    }
  }

  return (
    <ModalFrame title="Reportar questão" onClose={onClose} sheet>
      {(close) => (
        <div className="bg-surface p-[8px_20px_24px]">
          <div className="mx-auto mb-4 mt-2 h-[5px] w-[42px] rounded-[3px] bg-border" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {motivo && (
                <button
                  onClick={() => setMotivo(null)}
                  disabled={enviando}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-app-bg text-text2"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={17} />
                </button>
              )}
              <div className="font-display text-[18px] font-extrabold text-ink">{motivo ?? 'Reportar questão'}</div>
            </div>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-app-bg text-text2"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>

          {!motivo ? (
            <>
              <div className="mt-0.5 font-sans text-[12.5px] font-semibold text-text2">Ajude a manter o banco de questões correto.</div>
              <div className="mt-4 flex flex-col gap-2.5">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setMotivo(r)}
                    className="flex w-full items-center justify-between rounded-2xl border-[1.5px] border-border2 bg-surface p-3.5 text-left font-sans text-[13.5px] font-bold text-ink"
                  >
                    {r}
                    <span className="text-[16px] text-[#c2c9da]">›</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label htmlFor="report-msg" className="mt-3 block font-sans text-[12.5px] font-semibold text-text2">
                Quer contar mais detalhes? (opcional)
              </label>
              <textarea
                id="report-msg"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="Ex.: a alternativa C também está correta porque…"
                className="mt-2 w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] p-3.5 font-sans text-[16px] font-semibold text-ink outline-none"
              />
              {erro && (
                <div role="alert" className="mt-2 font-sans text-[12.5px] font-bold text-error">
                  {erro}
                </div>
              )}
              <button onClick={enviar} disabled={enviando} className="button button-primary mt-3 w-full">
                {enviando ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </>
          )}
        </div>
      )}
    </ModalFrame>
  );
}
