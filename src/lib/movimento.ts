import { useEffect, useState } from 'react';

// Respeita a opção "Reduzir movimento" do aparelho (acessibilidade).
export function prefereMenosMovimento(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Número que "conta" de 0 até `alvo` (resultado do módulo, XP…), com
// desaceleração no fim. Com "reduzir movimento", já mostra o valor final.
export function useContagem(alvo: number, duracaoMs = 900, atrasoMs = 0): number {
  const [valor, setValor] = useState(() => (prefereMenosMovimento() ? alvo : 0));

  useEffect(() => {
    if (prefereMenosMovimento()) {
      setValor(alvo);
      return;
    }
    let frame = 0;
    let inicio: number | null = null;
    const passo = (agora: number) => {
      inicio ??= agora + atrasoMs;
      const p = Math.min(1, Math.max(0, (agora - inicio) / duracaoMs));
      const suave = 1 - Math.pow(1 - p, 3);
      setValor(Math.round(alvo * suave));
      if (p < 1) frame = requestAnimationFrame(passo);
    };
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [alvo, duracaoMs, atrasoMs]);

  return valor;
}
