import { Fire } from '@phosphor-icons/react';
import Dialog from '../../components/Dialog';
import PrimaryButton from '../../components/PrimaryButton';
import SemanaOfensiva from '../../components/SemanaOfensiva';
import { useContagem } from '../../lib/movimento';

// Aberta ao tocar no fogo da tela inicial: tamanho da ofensiva e os últimos
// 7 dias (estudou ou não), como o calendário de ofensiva do Duolingo.
export default function OfensivaSheet({
  usuarioId,
  ofensiva,
  estudouHoje,
  onEstudar,
  onClose,
}: {
  usuarioId: string;
  ofensiva: number;
  estudouHoje: boolean;
  onEstudar: (() => void) | null;
  onClose: () => void;
}) {
  const numero = useContagem(ofensiva, 700, 150);

  const mensagem = estudouHoje
    ? `Ofensiva garantida hoje! Volte amanhã para chegar a ${ofensiva + 1} ${ofensiva + 1 === 1 ? 'dia' : 'dias'}.`
    : ofensiva > 0
      ? `Responda pelo menos 1 questão hoje para não perder sua ofensiva de ${ofensiva} ${ofensiva === 1 ? 'dia' : 'dias'}.`
      : 'Responda pelo menos 1 questão hoje para começar uma nova ofensiva.';

  return (
    <Dialog title="Sua ofensiva" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className={`ofensiva-hero ${estudouHoje ? 'acesa' : 'apagada'}`} aria-hidden="true">
          <Fire size={62} weight="fill" />
        </div>
        <div className="mt-2 font-display text-[40px] font-extrabold leading-none text-ink">{numero}</div>
        <div className="mt-1 font-sans text-[13px] font-extrabold uppercase tracking-[.08em] text-text2">
          {ofensiva === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
        </div>

        <SemanaOfensiva usuarioId={usuarioId} estudouHoje={estudouHoje} />

        <p className="mt-4 max-w-[300px] font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">{mensagem}</p>
        {!estudouHoje && onEstudar && (
          <PrimaryButton onClick={onEstudar} className="mt-4">
            Estudar agora
          </PrimaryButton>
        )}
      </div>
    </Dialog>
  );
}
