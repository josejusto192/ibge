import { Check, LockSimple, Play, Path, Trophy } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../../contexts/AppDataContext';
import { useAppState } from '../../state/AppStateContext';
import type { Modulo } from '../../data/types';
import VideoSheet from '../../components/sheets/VideoSheet';
import { som, vibrar } from '../../lib/efeitos';
import { prefereMenosMovimento } from '../../lib/movimento';
import TrilhaInteligentePath from './TrilhaInteligentePath';

const STEP_HEIGHT = 170;
const centerX = (index: number) => 160 + Math.sin((index * Math.PI) / 2) * 66;

export default function TrilhaPath() {
  const { activeTrilha } = useAppData();
  // Trilha inteligente: seções, unidades e lições (estilo Duolingo)
  if (activeTrilha?.tipo === 'inteligente') return <TrilhaInteligentePath />;
  return <TrilhaManualPath />;
}

function TrilhaManualPath() {
  const { modules, activeTrilha } = useAppData();
  const { dispatch } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [aula, setAula] = useState<Modulo | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  // Voltando do resultado (Result.tsx manda `concluido`): o módulo que
  // acabou de fechar comemora e o próximo "desbloqueia".
  const concluidoAgora = (location.state as { concluido?: number } | null)?.concluido;
  const [acabouId] = useState(() => (modules.some((m) => m.id === concluidoAgora && m.status === 'done') ? concluidoAgora : undefined));
  // Etapa bloqueada tocada: balança e explica em vez de não fazer nada.
  const [balancando, setBalancando] = useState<number | null>(null);
  const balancoTimer = useRef(0);
  const indiceAtual = modules.findIndex((m) => m.status === 'current');

  useEffect(() => {
    // Consome o aviso: recarregar a página não repete a comemoração.
    if (concluidoAgora != null) navigate(location.pathname, { replace: true, state: null });
  }, [concluidoAgora, location.pathname, navigate]);

  // Abre a trilha já no próximo passo (trilhas longas não obrigam a rolar).
  useEffect(() => {
    const mapa = mapaRef.current;
    const scroller = mapa?.closest<HTMLElement>('.pattern-scroll');
    if (!mapa || !scroller) return;
    const centralizar = (el: Element | null, suave: boolean) => {
      if (!el) return;
      const topo = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: Math.max(0, topo - scroller.clientHeight * 0.35), behavior: suave && !prefereMenosMovimento() ? 'smooth' : 'auto' });
    };
    const atual = mapa.querySelector('.map-stop.current');
    if (acabouId == null) {
      centralizar(atual, false);
      return;
    }
    centralizar(mapa.querySelector('.map-stop.acabou'), false);
    const id = window.setTimeout(() => {
      centralizar(atual, true);
      if (atual) som.combo();
    }, 1000);
    return () => window.clearTimeout(id);
  }, [acabouId]);

  useEffect(() => () => window.clearTimeout(balancoTimer.current), []);

  function balancar(id: number) {
    window.clearTimeout(balancoTimer.current);
    setBalancando(null);
    requestAnimationFrame(() => setBalancando(id));
    vibrar(25);
    balancoTimer.current = window.setTimeout(() => setBalancando(null), 1800);
  }

  if (!modules.length)
    return (
      <div className="panel empty-state">
        <Path size={34} />
        <h3>Novas etapas a caminho</h3>
        <p>Os módulos desta trilha estão sendo preparados. Você pode escolher outra trilha enquanto isso.</p>
      </div>
    );
  const height = modules.length * STEP_HEIGHT;
  const route = modules
    .map((_, i) =>
      i === 0
        ? `M ${centerX(0)} 48`
        : `C ${centerX(i - 1)} ${(i - 1) * STEP_HEIGHT + 130}, ${centerX(i)} ${i * STEP_HEIGHT - 35}, ${centerX(i)} ${i * STEP_HEIGHT + 48}`,
    )
    .join(' ');
  return (
    <div className="game-map" ref={mapaRef}>
      <div className="map-section-label">
        <span>{activeTrilha?.secao_nome || 'Sua trilha de conquistas'}</span>
      </div>
      <div className="map-path" style={{ height }}>
        <svg className="map-line" viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={route} fill="none" stroke="#d8e2f5" strokeWidth="5" strokeDasharray="3 12" strokeLinecap="round" />
        </svg>
        {modules.map((m, index) => {
          const current = m.status === 'current';
          const done = m.status === 'done';
          const video = m.tipo === 'aula';
          // Módulo pago sem assinatura: toca e vai pra tela de planos (já
          // concluído num período de assinatura continua só como concluído).
          const premium = m.premium && !done;
          const travado = m.status === 'locked' && !premium;
          const title = premium
            ? 'Assine para desbloquear'
            : current
              ? 'Continuar estudando'
              : video
                ? 'Assistir aula'
                : done
                  ? 'Concluído'
                  : 'Conclua a etapa anterior';
          return (
            <div
              key={m.id}
              className={`map-stop ${m.status}${premium ? ' premium' : ''}${m.id === acabouId ? ' acabou' : ''}${
                current && acabouId != null ? ' desbloqueou' : ''
              }${balancando === m.id ? ' balanca' : ''}`}
              style={
                {
                  top: index * STEP_HEIGHT,
                  left: `${(centerX(index) / 320) * 100}%`,
                  // entrada em cascata a partir do próximo passo
                  '--atraso': `${Math.min(Math.abs(index - Math.max(0, indiceAtual)), 6) * 70}ms`,
                } as CSSProperties
              }
            >
              {current && (
                <span className="map-current-label">
                  SEU PRÓXIMO PASSO
                  <span />
                </span>
              )}
              <button
                className="map-node"
                disabled={!premium && !current && !travado && !(video && m.video_url)}
                aria-disabled={travado || undefined}
                aria-label={`${m.titulo}. ${title}`}
                title={title}
                onClick={() => {
                  if (travado) balancar(m.id);
                  else if (premium) navigate('/assinar');
                  else if (video) setAula(m);
                  else {
                    dispatch({ type: 'RESET_SESSION' });
                    navigate('/questao');
                  }
                }}
              >
                {done ? (
                  <Check size={29} weight="bold" />
                ) : premium ? (
                  <LockSimple size={26} weight="fill" />
                ) : current || video ? (
                  <Play size={26} weight="fill" />
                ) : (
                  <LockSimple size={24} weight="duotone" />
                )}
              </button>
              <div className="map-caption">
                <h3>{m.titulo}</h3>
                <p>
                  {done
                    ? `${m.acertos}/${m.total} acertos · concluído`
                    : premium
                      ? 'EXCLUSIVO PARA ASSINANTES'
                      : video
                      ? 'AULA EXTRA · OPCIONAL'
                      : current
                        ? 'Toque para continuar'
                        : balancando === m.id
                          ? 'Conclua a etapa anterior'
                          : 'Próxima conquista'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="map-finish">
        <span>
          <Trophy size={30} weight="duotone" />
        </span>
        <strong>Um passo de cada vez.</strong>
        <p>Sua constância leva você mais longe.</p>
      </div>
      {aula?.video_url && <VideoSheet titulo={aula.titulo} videoUrl={aula.video_url} onClose={() => setAula(null)} />}
    </div>
  );
}
