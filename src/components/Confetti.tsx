import { useEffect, useRef } from 'react';
import { prefereMenosMovimento } from '../lib/movimento';

// Confete leve em <canvas> (sem biblioteca): uma rajada que cai com
// gravidade e some sozinha em ~3 s. Cobre o elemento pai (position:
// absolute), então o pai precisa ser `relative`. Mudar `disparo` solta outra
// rajada. Com "reduzir movimento" ligado no aparelho, não aparece.
const CORES = ['#1557E6', '#FFCB2D', '#22A06B', '#FF7A8A', '#7C5CFF', '#3A7BFF'];

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  w: number;
  h: number;
  cor: string;
  vida: number;
}

export default function Confetti({ disparo = 0, quantidade = 120, origemY = 0.35 }: { disparo?: number; quantidade?: number; origemY?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefereMenosMovimento()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particulas: Particula[] = Array.from({ length: quantidade }, () => {
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const forca = 7 + Math.random() * 9;
      return {
        x: width / 2 + (Math.random() - 0.5) * 40,
        y: height * origemY,
        vx: Math.cos(angulo) * forca,
        vy: Math.sin(angulo) * forca,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
        vida: 0,
      };
    });

    let frame = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = (agora - inicio) / 1000;
      ctx.clearRect(0, 0, width, height);
      for (const p of particulas) {
        p.vy += 0.32; // gravidade
        p.vx *= 0.985; // resistência do ar
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.vida += 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2) / 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // "achatamento" simula o papel girando no ar
        ctx.scale(1, Math.cos(p.vida * 0.18));
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < 3) frame = requestAnimationFrame(passo);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [disparo, quantidade, origemY]);

  return <canvas ref={ref} className="confetti-canvas" aria-hidden="true" />;
}
