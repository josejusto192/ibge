import { ArrowUpRight, Fire, Lightning, Target } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Confetti from '../components/Confetti';
import Mascot, { type MascotMood } from '../components/Mascot';
import PrimaryButton from '../components/PrimaryButton';
import SemanaOfensiva from '../components/SemanaOfensiva';
import { useAppData } from '../contexts/AppDataContext';
import { diaLocal } from '../lib/datas';
import { som } from '../lib/efeitos';
import { useContagem } from '../lib/movimento';
import type { LicaoConcluida } from '../lib/queries';
import { useAppState } from '../state/AppStateContext';

interface ResultLocationState {
  moduloId?: number;
  moduloTitulo?: string;
  trilhaNome?: string;
  // lição de unidade inteligente: quantas lições feitas e se a unidade fechou (migration 030)
  licao?: LicaoConcluida;
}

type Destino = '/trilha' | '/caderno-de-erros';

// Título, frase e humor do mascote conforme o desempenho no módulo.
function desempenho(pct: number, concluido = 'Módulo concluído!'): { titulo: string; frase: string; humor: MascotMood; festa: boolean } {
  if (pct === 100) return { titulo: 'Gabaritou!', frase: 'Acertou todas as questões. Impecável!', humor: 'celebrate', festa: true };
  if (pct >= 80) return { titulo: 'Mandou muito bem!', frase: 'Quase perfeito. Siga nesse ritmo!', humor: 'celebrate', festa: true };
  if (pct >= 50) return { titulo: concluido, frase: 'Bom trabalho! Cada questão te deixa mais perto da aprovação.', humor: 'happy', festa: true };
  return { titulo: concluido, frase: 'Errar faz parte: é revisando os erros que a matéria fixa de vez.', humor: 'encourage', festa: false };
}

// Marcos da ofensiva com frase especial (e confete).
const MARCOS: Record<number, string> = {
  3: '3 dias seguidos: o hábito está nascendo!',
  7: 'Uma semana inteira estudando!',
  14: 'Duas semanas seguidas. Que constância!',
  30: 'Um mês de ofensiva! Disciplina de aprovado.',
  50: '50 dias seguidos. Você é exemplo!',
  100: '100 dias! Poucos chegam aqui.',
};

// A meta diária é comemorada uma vez por dia (guardado no aparelho).
const CHAVE_META = 'foco:meta-comemorada';

function metaJaComemorada(dia: string): boolean {
  try {
    return localStorage.getItem(CHAVE_META) === dia;
  } catch {
    return true;
  }
}

export default function Result() {
  const { state } = useAppState();
  // Sem sessão na memória (ex.: recarregou a página aqui), volta pra trilha.
  if (!state.session.sessionAnswered) return <Navigate to="/trilha" replace />;
  return <Resultado />;
}

function Resultado() {
  const { state, dispatch } = useAppState();
  const { usuario, ofensiva, dailyDone, modules } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const { moduloId, moduloTitulo, trilhaNome, licao } = (location.state as ResultLocationState) ?? {};
  const { sessionAnswered, sessionCorrect, gained, maxCombo } = state.session;
  const ofensivaEstendida = state.ofensivaEstendida;
  const pct = Math.round((sessionCorrect / sessionAnswered) * 100);
  const erros = sessionAnswered - sessionCorrect;
  const d = licao?.concluiu_agora
    ? { titulo: 'Unidade concluída!', frase: 'Você fechou esta unidade com a revisão. Próxima liberada!', humor: 'celebrate' as MascotMood, festa: true }
    : desempenho(pct, licao ? 'Lição concluída!' : 'Módulo concluído!');
  const proximo = modules.find((m) => m.status === 'current');

  // 1º estudo do dia: depois do resultado vem a tela da ofensiva (Duolingo).
  const [etapa, setEtapa] = useState<'resultado' | 'ofensiva'>('resultado');
  const destino = useRef<Destino>('/trilha');

  const hoje = diaLocal();
  const metaDiaria = Math.max(1, usuario?.meta_diaria ?? 20);
  const [metaNova] = useState(() => dailyDone >= metaDiaria && !metaJaComemorada(hoje));
  useEffect(() => {
    if (!metaNova) return;
    try {
      localStorage.setItem(CHAVE_META, hoje);
    } catch {
      // sem storage: no máximo comemora de novo
    }
  }, [metaNova, hoje]);

  const tocou = useRef(false);
  useEffect(() => {
    if (tocou.current) return;
    tocou.current = true;
    som.conclusao();
  }, []);

  const pctAnimado = useContagem(pct, 900, 350);
  const xpAnimado = useContagem(gained, 900, 470);
  const ofensivaAnimada = useContagem(ofensiva, 900, 590);

  function ir(para: Destino) {
    // A trilha usa `concluido` pra comemorar o módulo que acabou de fechar.
    navigate(para, para === '/trilha' ? { state: { concluido: moduloId } } : undefined);
  }

  function seguir(para: Destino) {
    if (etapa === 'resultado' && ofensivaEstendida) {
      destino.current = para;
      setEtapa('ofensiva');
      return;
    }
    ir(para);
  }

  if (etapa === 'ofensiva' && ofensivaEstendida && usuario) {
    return <OfensivaEstendida valor={ofensivaEstendida} usuarioId={usuario.id} onContinuar={() => ir(destino.current)} />;
  }

  const resumo =
    licao && !licao.unidade_concluida
      ? erros > 0
        ? `${erros === 1 ? 'A que você errou volta' : `As ${erros} que você errou voltam`} nas próximas lições para você fixar.`
        : licao.licoes_feitas >= licao.licoes
          ? 'Falta só a revisão da unidade!'
          : 'Próxima lição liberada!'
      : erros > 0
      ? `${erros === 1 ? 'A que você errou foi' : `As ${erros} que você errou foram`} para o caderno de erros. Revisar agora ajuda a fixar!`
      : proximo
        ? `Próximo passo liberado: ${proximo.titulo}.`
        : 'Você concluiu todos os módulos desta trilha!';

  return (
    <div className="scr relative flex flex-1 flex-col overflow-hidden">
      {d.festa && <Confetti quantidade={pct === 100 ? 160 : 110} origemY={0.28} />}
      <div className="flex flex-1 flex-col items-center overflow-y-auto p-[30px_20px_16px] text-center">
        <div className={`resultado-halo ${pct >= 80 ? 'dourado' : ''}`} aria-hidden="true">
          <span className="resultado-mascote">
            <Mascot mood={d.humor} size={148} />
          </span>
        </div>
        <h1 className="resultado-titulo">{d.titulo}</h1>
        <p className="resultado-frase">{d.frase}</p>
        <div className="resultado-modulo">
          {moduloTitulo ?? 'Módulo'}
          {trilhaNome ? ` · ${trilhaNome}` : ''}
        </div>
        {metaNova && (
          <div className="meta-chip">
            <Target size={15} weight="fill" aria-hidden="true" />
            Meta do dia batida!
          </div>
        )}

        <div className="resultado-cards">
          <div className="resultado-card" style={{ animationDelay: '250ms' }}>
            <span className="resultado-card-icone acerto" aria-hidden="true">
              <Target size={17} weight="fill" />
            </span>
            {/* nota baixa em cor neutra: o resultado avisa sem punir */}
            <strong className={pct >= 70 ? 'text-success' : pct >= 50 ? 'text-[#d99a00]' : 'text-ink-soft'}>{pctAnimado}%</strong>
            <small>ACERTOS</small>
          </div>
          <div className="resultado-card" style={{ animationDelay: '370ms' }}>
            <span className="resultado-card-icone xp" aria-hidden="true">
              <Lightning size={17} weight="fill" />
            </span>
            <strong className="text-blue">+{xpAnimado}</strong>
            <small>XP GANHO</small>
          </div>
          <div className="resultado-card" style={{ animationDelay: '490ms' }}>
            {ofensivaEstendida && <span className="resultado-card-tag">+1 hoje</span>}
            <span className="resultado-card-icone fogo" aria-hidden="true">
              <Fire size={17} weight="fill" />
            </span>
            <strong className="text-[#ff7a00]">{ofensivaAnimada}</strong>
            <small>{ofensiva === 1 ? 'DIA SEGUIDO' : 'DIAS SEGUIDOS'}</small>
          </div>
        </div>

        {licao && <ProgressoUnidade licao={licao} titulo={moduloTitulo ?? 'esta unidade'} />}

        {maxCombo >= 3 && (
          <div className="resultado-combo">
            <Fire size={15} weight="fill" aria-hidden="true" />
            Maior sequência: <b>{maxCombo} acertos seguidos</b>
          </div>
        )}

        <div className="resultado-resumo">
          <strong>
            Você acertou {sessionCorrect} de {sessionAnswered} {sessionAnswered === 1 ? 'questão' : 'questões'}
          </strong>
          <span>{resumo}</span>
        </div>

        <div
          onClick={() => dispatch({ type: 'SET_MENTOR_OPEN', open: true })}
          className="mt-3.5 flex w-full cursor-pointer items-center gap-3.5 rounded-2xl p-4 text-left"
          style={{ background: 'linear-gradient(135deg,#FFCB2D,#F5B301)', boxShadow: '0 12px 26px -16px rgba(245,179,1,.9)' }}
        >
          <div className="flex-1">
            <div className="font-sans text-[9px] font-extrabold tracking-[1px] text-[#7a5900]">MENTORIA APROVAÇÃO</div>
            <div className="mt-1 font-sans text-[15px] font-extrabold text-ink">Quer acelerar sua aprovação?</div>
            <div className="mt-0.5 font-sans text-[12px] font-bold text-[#7a5900]">Um mentor monta seu cronograma. Ver como funciona ›</div>
          </div>
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[13px] bg-[rgba(11,31,77,.12)] text-ink">
            <ArrowUpRight weight="bold" size={20} />
          </div>
        </div>
      </div>

      <div className="resultado-rodape">
        <PrimaryButton onClick={() => seguir('/trilha')}>Continuar</PrimaryButton>
        {erros > 0 && (
          <button type="button" className="resultado-secundario" onClick={() => seguir('/caderno-de-erros')}>
            Revisar meus erros agora
          </button>
        )}
      </div>
    </div>
  );
}

// Tela da ofensiva estendida: o dia de hoje é "carimbado" no calendário, o
// fogo acende e o número sobe (ex.: 4 → 5).
function OfensivaEstendida({ valor, usuarioId, onContinuar }: { valor: number; usuarioId: string; onContinuar: () => void }) {
  const [acendeu, setAcendeu] = useState(false);
  const marco = MARCOS[valor];

  const aoCarimbar = useCallback(() => {
    setAcendeu(true);
    som.ofensiva();
  }, []);

  const numero = acendeu ? valor : valor - 1;
  const titulo = valor === 1 ? 'Ofensiva acesa!' : 'Ofensiva estendida!';
  const mensagem =
    valor === 1
      ? 'Você começou uma nova ofensiva. Estude amanhã para chegar a 2 dias!'
      : `Você estudou ${valor} dias seguidos. Volte amanhã para chegar a ${valor + 1}!`;

  return (
    <div className="scr relative flex flex-1 flex-col overflow-hidden">
      {acendeu && marco && <Confetti quantidade={130} origemY={0.25} />}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-[24px_22px] text-center">
        <div className={`ofensiva-hero grande ${acendeu || valor > 1 ? 'acesa' : 'apagada'} ${acendeu ? 'acendeu' : ''}`} aria-hidden="true">
          <Fire size={92} weight="fill" />
        </div>
        <div key={numero} className={`ofensiva-numero ${acendeu ? 'novo' : ''}`} aria-live="polite">
          {numero}
        </div>
        <div className="font-sans text-[13px] font-extrabold uppercase tracking-[.08em] text-text2">
          {numero === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
        </div>

        <SemanaOfensiva usuarioId={usuarioId} estudouHoje carimbarHoje onCarimbo={aoCarimbar} />

        <div className="ofensiva-titulo">{titulo}</div>
        <p className="mt-1.5 max-w-[300px] font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">{mensagem}</p>
        {acendeu && marco && <div className="ofensiva-marco">🏅 {marco}</div>}
      </div>
      <div className="resultado-rodape">
        <PrimaryButton onClick={onContinuar}>Continuar</PrimaryButton>
      </div>
    </div>
  );
}

// Bolinhas da unidade inteligente: lições feitas + a revisão final.
function ProgressoUnidade({ licao, titulo }: { licao: LicaoConcluida; titulo: string }) {
  const total = licao.licoes + 1;
  const feitas = Math.min(total, licao.licoes_feitas);
  return (
    <div className="unidade-card">
      <div className="unidade-card-topo">
        <span>{titulo}</span>
        <strong>{licao.unidade_concluida ? 'Concluída 🏆' : `${Math.min(feitas, licao.licoes)} de ${licao.licoes} lições`}</strong>
      </div>
      <div className="unidade-bolinhas" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`${i < feitas ? 'feita' : ''}${i === feitas - 1 ? ' agora' : ''}${i === total - 1 ? ' revisao' : ''}`} />
        ))}
      </div>
    </div>
  );
}
