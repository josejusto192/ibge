// Mascote do Foco — o mesmo personagem da tela de carregamento, agora com
// humores. Cada humor é só uma classe CSS (delight.css) animando partes do
// SVG com transform/opacity (leve até em celular simples). `key={mood}` faz
// a animação recomeçar sempre que o humor muda (ex.: acertou → errou).
//
//   idle       respira, pisca e olha em volta
//   thinking   saltita "pensando" (carregamento)
//   happy      pulinho com os braços pra cima (acertou)
//   celebrate  pula sem parar, braços balançando (módulo concluído)
//   encourage  cabeça inclinada + braço de força (errou — "bora de novo")
//   wave       acena (boas-vindas, lembretes)
export type MascotMood = 'idle' | 'thinking' | 'happy' | 'celebrate' | 'encourage' | 'wave';

const INK = '#0B1F4D';

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g className="m-eyes" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M57.5 61q4.5-6 9 0" />
        <path d="M77.5 61q4.5-6 9 0" />
      </g>
    );
  }
  return (
    <g className="m-eyes">
      <g className="m-pupils" fill={INK}>
        <circle cx="62" cy="59" r="3.8" />
        <circle cx="82" cy="59" r="3.8" />
        <circle cx="63.3" cy="57.7" r="1.2" fill="#fff" />
        <circle cx="83.3" cy="57.7" r="1.2" fill="#fff" />
      </g>
    </g>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g className="m-mouth">
        <path d="M63 67.5h18c0 7.2-4 11.5-9 11.5s-9-4.3-9-11.5Z" fill={INK} />
        <path d="M66.6 75.6c2.4-2.2 8.4-2.2 10.8 0-1.6 1.9-3.4 2.9-5.4 2.9s-3.8-1-5.4-2.9Z" fill="#FF8A9A" />
      </g>
    );
  }
  if (mood === 'thinking') return <ellipse className="m-mouth" cx="72" cy="71.5" rx="3" ry="3.4" fill={INK} />;
  if (mood === 'encourage') {
    return <path className="m-mouth" d="M66 70.5c3.6 3.4 8.4 3.4 12 0" stroke={INK} strokeWidth="2.7" strokeLinecap="round" fill="none" />;
  }
  return <path className="m-mouth" d="M65 69.5c4 5 10 5 14 0" stroke={INK} strokeWidth="2.7" strokeLinecap="round" fill="none" />;
}

function Extras({ mood }: { mood: MascotMood }) {
  if (mood === 'thinking') {
    return (
      <g className="m-thought" fill="#1557E6">
        <circle className="m-dot d1" cx="108" cy="24" r="2.6" />
        <circle className="m-dot d2" cx="116" cy="16" r="3.4" />
        <circle className="m-dot d3" cx="126" cy="7" r="4.4" />
      </g>
    );
  }
  if (mood === 'celebrate' || mood === 'happy') {
    const star = (x: number, y: number, s: number) =>
      `M${x} ${y - s}l${s * 0.28} ${s * 0.72} ${s * 0.72} ${s * 0.28}-${s * 0.72} ${s * 0.28}-${s * 0.28} ${s * 0.72}-${s * 0.28}-${s * 0.72}-${s * 0.72}-${s * 0.28} ${s * 0.72}-${s * 0.28}Z`;
    return (
      <g className="m-sparkles" fill="#FFCB2D">
        <path className="m-spark s1" d={star(118, 30, 9)} />
        <path className="m-spark s2" d={star(24, 40, 7)} />
        {mood === 'celebrate' && <path className="m-spark s3" d={star(122, 72, 6)} fill="#1557E6" />}
      </g>
    );
  }
  return null;
}

export default function Mascot({ mood = 'idle', size = 120, className = '' }: { mood?: MascotMood; size?: number; className?: string }) {
  const brows = mood === 'encourage';
  return (
    <svg
      key={mood}
      className={`mascot mood-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 144 144"
      fill="none"
      aria-hidden="true"
    >
      <ellipse className="m-shadow" cx="72" cy="127" rx="31" ry="6" fill="#0B1F4D" opacity=".12" />
      <g className="m-jump">
        <g className="m-body">
          <path d="M51 105v12m42-12v12" stroke="#0B3FAF" strokeWidth="9" strokeLinecap="round" />
          <path d="M41 119h20m22 0h20" stroke="#FFCB2D" strokeWidth="10" strokeLinecap="round" />
          <g className="m-arm-l">
            <path d="M42 73 28 83" stroke="#1557E6" strokeWidth="8" strokeLinecap="round" />
            <circle cx="27" cy="84" r="5" fill="#FFCB2D" />
          </g>
          <g className="m-arm-r">
            <path d="m102 73 14 10" stroke="#1557E6" strokeWidth="8" strokeLinecap="round" />
            <circle cx="117" cy="84" r="5" fill="#FFCB2D" />
          </g>
          <g className="m-antenna">
            <path d="M72 28V14" stroke="#1557E6" strokeWidth="4" strokeLinecap="round" />
            <circle cx="72" cy="11" r="5.5" fill="#FFCB2D" />
          </g>
          <rect x="34" y="25" width="76" height="86" rx="32" fill="#1557E6" />
          <path d="M44 44c1.5-6 5-10.5 10.5-13.5" stroke="#fff" strokeOpacity=".28" strokeWidth="4" strokeLinecap="round" />
          <path d="M42 38c8-12 20-17 35-17 11 0 22 5 28 13" stroke="#FFCB2D" strokeWidth="8" strokeLinecap="round" />
          <g className="m-head">
            <rect x="46" y="42" width="52" height="42" rx="21" fill="#fff" />
            {brows && (
              <g stroke={INK} strokeWidth="2.4" strokeLinecap="round">
                <path d="M57.5 52.5 65 50.8" />
                <path d="M86.5 52.5 79 50.8" />
              </g>
            )}
            <Eyes mood={mood} />
            <Mouth mood={mood} />
            <circle cx="53" cy="69" r="3.2" fill="#FFB0A3" opacity=".85" />
            <circle cx="91" cy="69" r="3.2" fill="#FFB0A3" opacity=".85" />
          </g>
          <path d="M60 96h24" stroke="#FFCB2D" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
      <Extras mood={mood} />
    </svg>
  );
}
