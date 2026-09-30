import type { ReactNode } from 'react';
import Mascot, { type MascotMood } from '../../../components/Mascot';

// O Foco "fala" a pergunta do onboarding num balão (estilo Duolingo).
export default function FocoFala({
  titulo,
  subtitulo,
  humor = 'idle',
  tamanho = 84,
  children,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  humor?: MascotMood;
  tamanho?: number;
  children?: ReactNode;
}) {
  return (
    <div className="ob-fala">
      <div className="ob-fala-mascote">
        <Mascot mood={humor} size={tamanho} />
      </div>
      <div className="ob-balao">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}
