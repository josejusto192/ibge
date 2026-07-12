import type { ReactNode } from 'react';

interface PatternBackgroundProps {
  children: ReactNode;
  scrollClassName?: string;
}

// Área de conteúdo com o padrão de fundo sutil (trilha-pattern.png) fixo —
// o fundo não pode se mover/esticar junto com o scroll interno, então ele
// vive numa camada absoluta separada da camada que realmente rola.
export default function PatternBackground({ children, scrollClassName = '' }: PatternBackgroundProps) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "url('/assets/trilha-pattern.png')", backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat' }}
      />
      <div className={`scr relative h-full overflow-y-auto ${scrollClassName}`}>{children}</div>
    </div>
  );
}
