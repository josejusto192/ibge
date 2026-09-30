import { Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MascotMood } from '../../../components/Mascot';
import { som } from '../../../lib/efeitos';
import FocoFala from './FocoFala';

export interface ChoiceOption {
  label: string;
  sub?: string;
  emoji?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ChoiceStepProps {
  title: string;
  subtitle: string;
  options: ChoiceOption[];
  humor?: MascotMood;
}

// Pergunta do onboarding: o Foco pergunta, as opções entram em cascata e a
// escolhida "pula" antes de avançar sozinha.
export default function ChoiceStep({ title, subtitle, options, humor = 'thinking' }: ChoiceStepProps) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function escolher(o: ChoiceOption) {
    if (o.disabled || escolhida) return;
    som.toque();
    setEscolhida(o.label);
    timer.current = window.setTimeout(o.onClick, 380);
  }

  return (
    <div className="ob-tela">
      <FocoFala titulo={title} subtitulo={subtitle} humor={escolhida ? 'happy' : humor} />
      <div className="ob-opcoes" role="list">
        {options.map((o, i) => {
          const ativa = escolhida ? escolhida === o.label : o.active;
          return (
            <button
              key={o.label}
              role="listitem"
              onClick={() => escolher(o)}
              disabled={o.disabled}
              aria-pressed={ativa}
              className={`ob-opcao${ativa ? ' ativa' : ''}${escolhida === o.label ? ' escolhida' : ''}`}
              style={{ '--i': i } as CSSProperties}
            >
              {o.emoji && (
                <span className="ob-opcao-emoji" aria-hidden="true">
                  {o.emoji}
                </span>
              )}
              <span className="ob-opcao-texto">
                <strong>{o.label}</strong>
                {o.sub && <small>{o.sub}</small>}
              </span>
              <span className="ob-opcao-marca" aria-hidden="true">
                {ativa && <Check size={13} weight="bold" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
