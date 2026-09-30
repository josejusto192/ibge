import { ShieldCheck } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import Brand from './Brand';
import Mascot, { type MascotMood } from './Mascot';
import { PathIllustration } from '../screens/home/Home';

// Painel azul das telas de acesso (onboarding, login, senha) com o Foco.
export default function AuthStory({
  titulo,
  texto,
  rodape = 'Seu progresso acompanha você.',
  humor = 'wave',
}: {
  titulo: ReactNode;
  texto: ReactNode;
  rodape?: ReactNode;
  humor?: MascotMood;
}) {
  return (
    <section className="auth-story">
      <Brand light caption="UM POUCO TODO DIA" />
      <div>
        <h1>{titulo}</h1>
        <p>{texto}</p>
        <div className="auth-art">
          <PathIllustration />
        </div>
      </div>
      <div className="auth-mascote" aria-hidden="true">
        <Mascot mood={humor} size={132} />
      </div>
      <footer>
        <ShieldCheck size={19} />
        {rodape}
      </footer>
    </section>
  );
}
