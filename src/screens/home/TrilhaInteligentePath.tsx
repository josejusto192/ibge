import { Barbell, Check, LockSimple, Path, Star, Trophy } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../../contexts/AppDataContext';
import { useAppState } from '../../state/AppStateContext';
import type { Modulo } from '../../data/types';
import type { SecaoRow } from '../../lib/queries';
import { som, vibrar } from '../../lib/efeitos';
import { prefereMenosMovimento } from '../../lib/movimento';

// Caminho da trilha inteligente no formato do Duolingo: seções → unidades →
// bolinhas (lições) e, no fim de cada unidade, a bolinha de revisão.
// Terminou a lição, a próxima libera — sem nota mínima nem meta na tela.

const CORES = ['#1557e6', '#7c3aed', '#0f9d6b', '#e8590c', '#d6336c', '#0c8599'];
// zigue-zague suave das bolinhas dentro da unidade
const deslocamento = (i: number) => Math.round(Math.sin((i * Math.PI) / 3) * 56);

type EstadoBolinha = 'done' | 'current' | 'locked';

interface Grupo {
  secao: SecaoRow | null;
  unidades: Modulo[];
}

function agrupar(modules: Modulo[], secoes: SecaoRow[]): Grupo[] {
  const ids = new Set(secoes.map((s) => s.id));
  // unidades sem seção (ou de seção apagada) ficam num grupo no começo
  const soltas = modules.filter((m) => m.secaoId == null || !ids.has(m.secaoId));
  const grupos: Grupo[] = soltas.length ? [{ secao: null, unidades: soltas }] : [];
  for (const s of secoes) {
    const unidades = modules.filter((m) => m.secaoId === s.id);
    if (unidades.length) grupos.push({ secao: s, unidades });
  }
  return grupos;
}

function estadoDa(m: Modulo, i: number, licoes: number, feitas: number): EstadoBolinha {
  if (m.status === 'done') return 'done';
  if (m.status !== 'current') return 'locked';
  if (i < feitas) return 'done';
  return i === Math.min(feitas, licoes) ? 'current' : 'locked';
}

export default function TrilhaInteligentePath() {
  const { modules, activeTrilha, secoes } = useAppData();
  const { dispatch } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [balancando, setBalancando] = useState<string | null>(null);
  const balancoTimer = useRef(0);
  const mapaRef = useRef<HTMLDivElement>(null);
  const voltouDeLicao = (location.state as { concluido?: number } | null)?.concluido != null;
  const [animarAvanco] = useState(voltouDeLicao);

  useEffect(() => {
    if (voltouDeLicao) navigate(location.pathname, { replace: true, state: null });
  }, [voltouDeLicao, location.pathname, navigate]);

  // Abre já na próxima bolinha; voltando de uma lição, desliza até ela.
  useEffect(() => {
    const mapa = mapaRef.current;
    const scroller = mapa?.closest<HTMLElement>('.pattern-scroll');
    const atual = mapa?.querySelector('.licao.current');
    if (!scroller || !atual) return;
    const topo = atual.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const ir = (suave: boolean) =>
      scroller.scrollTo({ top: Math.max(0, topo - scroller.clientHeight * 0.4), behavior: suave && !prefereMenosMovimento() ? 'smooth' : 'auto' });
    if (!animarAvanco) {
      ir(false);
      return;
    }
    const id = window.setTimeout(() => {
      ir(true);
      som.combo();
    }, 450);
    return () => window.clearTimeout(id);
  }, [animarAvanco]);

  useEffect(() => () => window.clearTimeout(balancoTimer.current), []);

  function balancar(chave: string) {
    window.clearTimeout(balancoTimer.current);
    setBalancando(null);
    requestAnimationFrame(() => setBalancando(chave));
    vibrar(25);
    balancoTimer.current = window.setTimeout(() => setBalancando(null), 1800);
  }

  if (!modules.length)
    return (
      <div className="panel empty-state">
        <Path size={34} />
        <h3>Novas unidades a caminho</h3>
        <p>As lições desta trilha estão sendo preparadas. Você pode escolher outra trilha enquanto isso.</p>
      </div>
    );

  const grupos = agrupar(modules, secoes);
  let numeroUnidade = 0;

  return (
    <div className="caminho" ref={mapaRef}>
      {grupos.map((g, gi) => (
        <section key={g.secao?.id ?? 'sem-secao'} className="caminho-secao">
          {(g.secao || grupos.length > 1) && (
            <div className="caminho-secao-titulo">
              <small>SEÇÃO {gi + 1}</small>
              <strong>{g.secao?.titulo ?? activeTrilha?.secao_nome ?? 'Primeiros passos'}</strong>
            </div>
          )}
          {g.unidades.map((m) => {
            numeroUnidade += 1;
            const cor = CORES[(numeroUnidade - 1) % CORES.length];
            const licoes = m.etapa?.licoes ?? 4;
            const feitas = m.status === 'done' ? licoes + 1 : (m.etapa?.licoesFeitas ?? 0);
            const premium = m.premium && m.status !== 'done';
            const bolinhas = Array.from({ length: licoes + 1 }, (_, i) => i);
            return (
              <div key={m.id} className={`unidade ${m.status}${premium ? ' premium' : ''}`} style={{ '--cor': cor } as CSSProperties}>
                <header className="unidade-banner">
                  <div>
                    <small>UNIDADE {numeroUnidade}</small>
                    <strong>{m.titulo}</strong>
                  </div>
                  <span className="unidade-contagem">
                    {m.status === 'done' ? (
                      <>
                        <Trophy size={15} weight="fill" /> Concluída
                      </>
                    ) : premium ? (
                      <>
                        <LockSimple size={14} weight="fill" /> Assinantes
                      </>
                    ) : (
                      `${Math.min(feitas, licoes)}/${licoes} lições`
                    )}
                  </span>
                </header>
                <div className="unidade-bolinhas-caminho">
                  {bolinhas.map((i) => {
                    const revisao = i === licoes;
                    const estado = estadoDa(m, i, licoes, feitas);
                    const chave = `${m.id}-${i}`;
                    const nome = revisao ? 'Revisão da unidade' : `Lição ${i + 1}`;
                    const jogar = estado === 'current' && !premium;
                    return (
                      <div
                        key={i}
                        className={`licao ${estado}${revisao ? ' revisao' : ''}${balancando === chave ? ' balanca' : ''}${
                          jogar && animarAvanco ? ' desbloqueou' : ''
                        }`}
                        style={{ translate: `${deslocamento(i)}px 0` }}
                      >
                        {jogar && (
                          <span className="map-current-label">
                            {revisao ? 'REVISAR' : feitas === 0 ? 'COMEÇAR' : 'CONTINUAR'}
                            <span />
                          </span>
                        )}
                        <button
                          className="licao-no"
                          aria-label={`${m.titulo}, ${nome}. ${
                            estado === 'done' ? 'Concluída' : jogar ? 'Toque para começar' : premium ? 'Assine para desbloquear' : 'Bloqueada'
                          }`}
                          disabled={estado === 'done'}
                          onClick={() => {
                            if (premium) navigate('/assinar');
                            else if (!jogar) balancar(chave);
                            else {
                              dispatch({ type: 'RESET_SESSION' });
                              navigate('/questao');
                            }
                          }}
                        >
                          {estado === 'done' ? (
                            <Check size={28} weight="bold" />
                          ) : premium || estado === 'locked' ? (
                            revisao ? <Trophy size={26} weight="duotone" /> : <LockSimple size={24} weight="duotone" />
                          ) : revisao ? (
                            <Barbell size={28} weight="fill" />
                          ) : (
                            <Star size={28} weight="fill" />
                          )}
                        </button>
                        {(revisao || balancando === chave) && (
                          <span className="licao-legenda">
                            {balancando === chave ? (m.status === 'locked' ? 'Termine a unidade anterior' : 'Termine a lição anterior') : nome}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      <div className="map-finish">
        <span>
          <Trophy size={30} weight="duotone" />
        </span>
        <strong>Um passo de cada vez.</strong>
        <p>Sua constância leva você mais longe.</p>
      </div>
    </div>
  );
}
