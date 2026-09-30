import { Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { fetchDiasDeEstudo } from '../lib/queries';
import { diaLocal, diaLocalDeslocado } from '../lib/datas';
import { prefereMenosMovimento } from '../lib/movimento';

const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Os últimos 7 dias (estudou ou não), como o calendário de ofensiva do
// Duolingo. Com `carimbarHoje`, o dia de hoje começa vazio e é "carimbado"
// logo depois (comemoração do 1º estudo do dia no resultado do módulo);
// `onCarimbo` avisa esse momento pra tela tocar som, acender o fogo etc.
export default function SemanaOfensiva({
  usuarioId,
  estudouHoje,
  carimbarHoje = false,
  onCarimbo,
}: {
  usuarioId: string;
  estudouHoje: boolean;
  carimbarHoje?: boolean;
  onCarimbo?: () => void;
}) {
  const [dias, setDias] = useState<Set<string> | null>(null);
  const [carimbado, setCarimbado] = useState(() => !carimbarHoje);
  // ref: a tela pai re-renderiza (números contando) e não pode reiniciar o timer
  const onCarimboRef = useRef(onCarimbo);
  useEffect(() => {
    onCarimboRef.current = onCarimbo;
  });

  useEffect(() => {
    fetchDiasDeEstudo(usuarioId)
      .then(setDias)
      .catch(() => setDias(new Set()));
  }, [usuarioId]);

  useEffect(() => {
    if (carimbado) return;
    const id = window.setTimeout(
      () => {
        setCarimbado(true);
        onCarimboRef.current?.();
      },
      prefereMenosMovimento() ? 0 : 900,
    );
    return () => window.clearTimeout(id);
  }, [carimbado]);

  const hoje = diaLocal();
  const semana = Array.from({ length: 7 }, (_, i) => {
    const dia = diaLocalDeslocado(i - 6);
    const eHoje = dia === hoje;
    const estudou = eHoje ? (estudouHoje || !!dias?.has(dia)) && carimbado : !!dias?.has(dia);
    return { dia, inicial: INICIAIS[new Date(`${dia}T12:00:00`).getDay()], estudou, hoje: eHoje };
  });

  return (
    <div className="ofensiva-semana" aria-label="Seus últimos 7 dias">
      {semana.map((d, i) => (
        <div key={d.dia} className="ofensiva-dia" style={{ animationDelay: `${120 + i * 60}ms` }}>
          <span className="ofensiva-inicial">{d.inicial}</span>
          <span
            className={`ofensiva-bolinha ${d.estudou ? 'estudou' : ''} ${d.hoje ? 'hoje' : ''} ${d.hoje && carimbarHoje && d.estudou ? 'carimbo' : ''}`}
            aria-label={`${d.hoje ? 'Hoje' : d.dia}: ${d.estudou ? 'estudou' : 'não estudou'}`}
          >
            {d.estudou && <Check size={14} weight="bold" />}
          </span>
        </div>
      ))}
    </div>
  );
}
