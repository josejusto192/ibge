import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import Mascot from './Mascot';
// Dicas curtas que se alternam enquanto carrega (o Duolingo faz igual:
// transforma a espera em algo útil).
const DICAS = [
  'Revisar seus erros no dia seguinte fixa muito mais o conteúdo.',
  '10 minutos todo dia valem mais do que 2 horas no domingo.',
  'Errou? Ótimo: a questão vai para o seu caderno de erros para revisar.',
  'Leia o enunciado até o fim antes de olhar as alternativas.',
  'Na dúvida entre duas alternativas, elimine primeiro as absurdas.',
  'Constância vence intensidade: proteja sua sequência de dias.',
  'Se você consegue explicar a resposta com suas palavras, aprendeu de verdade.',
];

export function LoadingExperience({
  message = 'Preparando seu espaço',
  fullPage = false,
}: {
  message?: string;
  fullPage?: boolean;
}) {
  const [dica, setDica] = useState(() => Math.floor(Math.random() * DICAS.length));
  useEffect(() => {
    const id = window.setInterval(() => setDica((d) => (d + 1) % DICAS.length), 3400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={`loading-experience ${fullPage ? 'full-page' : ''}`} role="status" aria-live="polite">
      <div className="loading-journey" aria-hidden="true">
        <span className="journey-halo" />
        <Mascot mood="thinking" size={144} />
      </div>
      <strong>{message}</strong>
      <span className="loading-steps" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="loading-tip" aria-hidden="true">
        <span className="loading-eyebrow">DICA DE ESTUDO</span>
        <p key={dica}>{DICAS[dica]}</p>
      </div>
    </div>
  );
}

export function TrailLoading() {
  return (
    <div className="trail-loading game-map" role="status" aria-label="Preparando sua trilha">
      <div className="trail-loading-title skeleton-shape" />
      <div className="trail-loading-path" aria-hidden="true">
        <svg viewBox="0 0 320 450" preserveAspectRatio="none">
          <path
            d="M160 45 C160 150 225 115 225 205 C225 300 95 260 95 380"
            fill="none"
            stroke="#D8E2F5"
            strokeWidth="5"
            strokeDasharray="3 12"
            strokeLinecap="round"
          />
        </svg>
        {[0, 1, 2].map((step) => (
          <span key={step} className={`trail-loading-stop stop-${step}`} />
        ))}
      </div>
    </div>
  );
}

export function LoadingCards() {
  return (
    <div className="loading-cards" role="status" aria-label="Carregando conteúdo">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <WarningCircle size={24} />
      <div>
        <strong>Não foi possível carregar</strong>
        <p>{message}</p>
      </div>
      {retry && (
        <button className="button button-secondary" onClick={retry}>
          <ArrowClockwise size={17} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
