import { ArrowClockwise, ArrowRight, CircleNotch, Fire, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../contexts/AppDataContext';
import {
  concluirLicao,
  criarTicket,
  fetchQuestoesDoModulo,
  fetchRespostas,
  fetchRevisoesParaSessao,
  fetchSessaoInteligente,
  responderQuestao,
  upsertProgressoModulo,
  type OrigemResposta,
} from '../../lib/queries';
import { formatTimer } from '../../lib/format';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { useAppState } from '../../state/AppStateContext';
import type { MotivoQuestao, Questao } from '../../data/types';
import PatternBackground from '../../components/PatternBackground';
import ReportSheet from './ReportSheet';
import AiTutorSheet from './AiTutorSheet';
import { NOME_MASCOTE } from '../../lib/mascote';
import { logClientError } from '../../lib/errorLog';
import Dialog from '../../components/Dialog';
import { LoadingExperience } from '../../components/Feedback';
import Mascot from '../../components/Mascot';
import { som } from '../../lib/efeitos';
import { prefereMenosMovimento } from '../../lib/movimento';

// Frases do rodapé de feedback (variam por questão, como no Duolingo).
const FRASES_ACERTO = ['Mandou bem!', 'Isso aí!', 'Excelente!', 'Na mosca!', 'Perfeito!', 'Arrasou!', 'Muito bom!'];
const FRASES_ERRO = ['Quase lá!', 'Não foi dessa vez', 'Errar faz parte!', 'Bora aprender com essa', 'Tudo bem, respira'];
// Comemora 3 acertos seguidos e depois a cada 5 (5, 10, 15…).
const ehMarcoDeCombo = (combo: number) => combo === 3 || (combo >= 5 && combo % 5 === 0);

// Selo de por que a questão apareceu (revisão espaçada / algoritmo).
const SELO_MOTIVO: Partial<Record<MotivoQuestao, string>> = {
  revisao: '🔁 Revisão',
  relembrar: '🔁 Relembrando',
  reforco: '💪 Reforço',
  repeticao: '↺ Refazendo',
};

// Intercala as questões de revisão nas que ainda faltam do módulo (a 1ª
// depois de 2 questões, a próxima 3 depois), nunca como última.
function intercalar(base: Questao[], inicio: number, extras: Questao[]): Questao[] {
  const out = [...base];
  extras.forEach((extra, i) => {
    const pos = Math.min(out.length - 1, inicio + 2 + i * 4);
    if (pos > inicio) out.splice(pos, 0, extra);
  });
  return out;
}

export default function Question() {
  const { state, dispatch } = useAppState();
  const { usuario, activeTrilha, modules, loading: loadingModules, aplicarResposta, refreshModules, refreshDailyDone, refreshErrosCount } =
    useAppData();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [quitOpen, setQuitOpen] = useState(false);
  const savingRef = useRef(false);
  const explicacaoRef = useRef<HTMLDivElement>(null);
  const [ultimoGanho, setUltimoGanho] = useState(0);
  // Retomada: módulo não concluído continua da 1ª questão sem resposta.
  // Só na entrada (sessão zerada) — nunca no meio de uma sessão em curso.
  const sessaoNovaRef = useRef(state.session.qIndex === 0 && state.session.sessionAnswered === 0);
  const [retomadaDe, setRetomadaDe] = useState<number | null>(null);
  const [todasRespondidas, setTodasRespondidas] = useState<{ answered: number; correct: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Depois de responder, rola só o bastante pra mostrar o começo da
  // explicação acima do rodapé de feedback — sem tirar da tela as
  // alternativas (o aluno precisa ver qual marcou e qual era a certa).
  useEffect(() => {
    if (!state.session.answered) return;
    const id = window.setTimeout(() => {
      const painel = explicacaoRef.current;
      const scroller = painel?.closest<HTMLElement>('.pattern-scroll');
      if (!painel || !scroller) return;
      const rodape = document.querySelector<HTMLElement>('.question-actions')?.offsetHeight ?? 0;
      const visivelAte = scroller.getBoundingClientRect().bottom - rodape;
      const falta = painel.getBoundingClientRect().top + 105 - visivelAte;
      if (falta > 0) scroller.scrollBy({ top: falta, behavior: prefereMenosMovimento() ? 'auto' : 'smooth' });
    }, 340);
    return () => window.clearTimeout(id);
  }, [state.session.answered, state.session.qIndex]);

  useEffect(() => {
    contentRef.current?.closest('.pattern-scroll')?.scrollTo({ top: 0 });
    contentRef.current?.focus({ preventScroll: true });
  }, [state.session.qIndex]);

  const currentModulo = modules.find((m) => m.status === 'current') ?? null;
  const currentModuloId = currentModulo?.id;
  const ehInteligente = currentModulo?.tipo === 'inteligente';
  // unidade inteligente: depois das lições vem a bolinha de revisão
  // (lido por ref: ao concluir a lição o progresso muda e não deve remontar a sessão)
  const ehRevisaoUnidade = !!currentModulo?.etapa && currentModulo.etapa.licoesFeitas >= currentModulo.etapa.licoes;
  const revisaoRef = useRef(ehRevisaoUnidade);
  revisaoRef.current = ehRevisaoUnidade;
  const trilhaId = activeTrilha?.id;
  const precisaAssinar = !!currentModulo?.premium;
  const usuarioId = usuario?.id;

  useEffect(() => {
    if (precisaAssinar) navigate('/assinar', { replace: true });
  }, [precisaAssinar, navigate]);

  useEffect(() => {
    if (!currentModuloId || precisaAssinar) return;
    setQuestoes(null);
    setLoadError(false);

    const falhou = (err: { message?: string } | null, contexto: string) => {
      // O banco também barra módulo pago sem assinatura (migration 022).
      if (err?.message?.includes('ASSINATURA_NECESSARIA')) {
        navigate('/assinar', { replace: true });
        return;
      }
      logClientError(err, contexto);
      setLoadError(true);
    };

    // Trilha inteligente: o servidor monta a lição (revisões, reforço e
    // questões novas no nível do aluno) — não existe "retomar".
    if (ehInteligente) {
      sessaoNovaRef.current = false;
      fetchSessaoInteligente(currentModuloId, revisaoRef.current)
        .then(setQuestoes)
        .catch((err) => falhou(err, 'fetchSessaoInteligente'));
      return;
    }

    fetchQuestoesDoModulo(currentModuloId)
      .then(async (qs) => {
        if (sessaoNovaRef.current && usuarioId && qs.length) {
          sessaoNovaRef.current = false;
          let feitas = 0;
          try {
            // As respostas ficam gravadas a cada questão; o módulo só é
            // marcado como concluído no fim. Então, se o aluno saiu no meio,
            // as questões do começo já têm resposta: pula elas e soma os
            // acertos no resultado.
            const respostas = await fetchRespostas(usuarioId, qs.map((q) => q.id));
            let corretas = 0;
            while (feitas < qs.length && respostas.has(qs[feitas].id)) {
              if (respostas.get(qs[feitas].id)) corretas += 1;
              feitas += 1;
            }
            if (feitas === qs.length) setTodasRespondidas({ answered: feitas, correct: corretas });
            else if (feitas > 0) {
              dispatch({ type: 'RESUME_SESSION', qIndex: feitas, answered: feitas, correct: corretas });
              setRetomadaDe(feitas);
            }
          } catch (err) {
            // sem as respostas anteriores, começa do início (como antes)
            logClientError(err, 'fetchRespostas');
          }
          // Revisão espaçada: 1–2 questões antigas no meio do que falta.
          const restantes = qs.length - feitas;
          const limite = restantes >= 5 ? 2 : restantes >= 3 ? 1 : 0;
          if (trilhaId && limite > 0) {
            try {
              const extras = await fetchRevisoesParaSessao(trilhaId, limite, qs.map((q) => q.id));
              setQuestoes(intercalar(qs, feitas, extras));
              return;
            } catch (err) {
              logClientError(err, 'fetchRevisoesParaSessao');
            }
          }
        }
        setQuestoes(qs);
      })
      .catch((err) => falhou(err, 'fetchQuestoesDoModulo'));
  }, [currentModuloId, precisaAssinar, navigate, usuarioId, dispatch, ehInteligente, trilhaId]);

  if (!currentModulo) {
    return (
      <div className="flex flex-1 flex-col gap-4 items-center justify-center p-6 text-center font-sans text-[13.5px] font-semibold text-text2">
        {loadingModules ? <LoadingExperience message="Preparando sua sessão" /> : 'Nenhum módulo disponível para começar agora.'}
        {!loadingModules && (
          <button className="button button-primary" onClick={() => navigate('/trilha')}>
            Voltar para a trilha
          </button>
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="font-sans text-[13.5px] font-semibold text-text2">Não conseguimos carregar as questões agora.</div>
        <button onClick={() => navigate('/trilha')} className="font-sans text-[13px] font-extrabold text-blue">
          Voltar para a trilha
        </button>
      </div>
    );
  }

  if (!questoes) {
    return <LoadingExperience message="Organizando suas questões" />;
  }

  if (!questoes.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="font-sans text-[13.5px] font-semibold text-text2">Este módulo ainda não tem questões cadastradas.</div>
        <button onClick={() => navigate('/trilha')} className="font-sans text-[13px] font-extrabold text-blue">
          Voltar para a trilha
        </button>
      </div>
    );
  }

  if (todasRespondidas) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="font-display text-[18px] font-extrabold text-ink">Você já respondeu todas as questões</div>
        <div className="font-sans text-[13.5px] font-semibold text-text2">
          Falta só concluir o módulo: {todasRespondidas.correct} de {todasRespondidas.answered} acertos.
        </div>
        {saveError && <div className="font-sans text-[12.5px] font-bold text-error">{saveError}</div>}
        <div className="w-full max-w-[360px]">
          <button
            disabled={finalizing}
            onClick={() => {
              dispatch({
                type: 'RESUME_SESSION',
                qIndex: todasRespondidas.answered - 1,
                answered: todasRespondidas.answered,
                correct: todasRespondidas.correct,
              });
              concluirModulo(todasRespondidas.correct, todasRespondidas.answered);
            }}
            className="button button-primary w-full"
          >
            {finalizing ? 'Concluindo…' : 'Concluir módulo'}
          </button>
        </div>
      </div>
    );
  }

  const total = questoes.length;
  const q = questoes[Math.min(state.session.qIndex, total - 1)];
  const { selected, answered } = state.session;
  const isCorrect = answered && selected === q.gabarito_letra;
  const confirmReady = !!selected;
  const showAskAi = answered && !isCorrect;
  const isLast = state.session.qIndex >= total - 1;

  function quit() {
    dispatch({ type: 'RESET_SESSION' });
    navigate('/trilha');
  }

  async function confirm() {
    if (!confirmReady || answered || !usuario || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      // o servidor confere o gabarito e decide XP, ofensiva, revisão e domínio
      const origem: OrigemResposta =
        q.motivo === 'revisao' || q.motivo === 'relembrar' || q.motivo === 'reforco' ? 'revisao' : ehInteligente ? 'inteligente' : 'trilha';
      const r = await responderQuestao(q.id, selected ?? '', origem);
      aplicarResposta(r);
      const correct = r.acertou;
      const gained = r.xp_ganho;
      dispatch({ type: 'MARK_ANSWERED', correct, gained });
      setUltimoGanho(gained);
      if (correct) {
        som.acerto();
        if (ehMarcoDeCombo(state.session.combo + 1)) window.setTimeout(som.combo, 260);
      } else {
        som.erro();
      }
      if (r.ofensiva_nova) dispatch({ type: 'OFENSIVA_ESTENDIDA', valor: r.ofensiva_nova });
      await Promise.all([refreshDailyDone(), refreshErrosCount()]);
    } catch (err) {
      if ((err as { message?: string })?.message?.includes('ASSINATURA_NECESSARIA')) {
        navigate('/assinar', { replace: true });
        return;
      }
      logClientError(err, 'responderQuestao');
      setSaveError('Sua resposta ainda não foi salva. Confira a conexão e toque em confirmar para tentar novamente.');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  async function next() {
    if (savingRef.current) return;
    setSaveError('');
    if (!isLast) {
      dispatch({ type: 'NEXT_QUESTION' });
      setAiOpen(false);
      return;
    }
    await concluirModulo(state.session.sessionCorrect, state.session.sessionAnswered);
  }

  async function concluirModulo(acertos: number, respondidas: number) {
    // Unidade inteligente: terminou a lição, a próxima libera (sem nota
    // mínima); depois da revisão final a unidade fica concluída.
    if (ehInteligente && currentModuloId) {
      if (finalizing) return;
      savingRef.current = true;
      setFinalizing(true);
      try {
        const licao = await concluirLicao(currentModuloId);
        await refreshModules();
        navigate('/resultado', {
          state: {
            moduloId: currentModuloId,
            moduloTitulo: currentModulo?.titulo,
            trilhaNome: activeTrilha?.nome,
            acertos,
            total: respondidas,
            licao,
          },
        });
      } catch (err) {
        logClientError(err, 'concluirLicao');
        setSaveError('Não foi possível salvar o resultado da sessão. Tente novamente.');
        setFinalizing(false);
        savingRef.current = false;
      }
      return;
    }
    if (usuario && currentModuloId && !finalizing) {
      savingRef.current = true;
      setFinalizing(true);
      try {
        await upsertProgressoModulo(usuario.id, currentModuloId, acertos, respondidas);
        await refreshModules();
      } catch (err) {
        logClientError(err, 'upsertProgressoModulo');
        setSaveError('Não foi possível concluir o módulo. Tente novamente para salvar seu resultado.');
        setFinalizing(false);
        savingRef.current = false;
        return;
      }
    }
    navigate('/resultado', { state: { moduloId: currentModuloId, moduloTitulo: currentModulo?.titulo, trilhaNome: activeTrilha?.nome } });
  }

  // Vira ticket em Admin → Reportes. Erro sobe pro ReportSheet mostrar.
  async function submitReport(reason: string, mensagem: string) {
    if (!usuario) return;
    try {
      await criarTicket({ usuarioId: usuario.id, tipo: 'questao', motivo: reason, mensagem, questaoId: q.id });
    } catch (err) {
      logClientError(err, 'criarTicket questao');
      throw err;
    }
    setReportOpen(false);
    setReportReason(reason);
    setTimeout(() => setReportReason(null), 2800);
  }

  function openAi() {
    dispatch({
      type: 'AI_OPEN_SEED',
      text: `Oi! Sou o ${NOME_MASCOTE}, seu tutor. Vi que essa questão de ${q.disciplina} te pegou. Já li o enunciado, as alternativas e o comentário — me conta o que ficou confuso que eu te explico.`,
    });
    setAiOpen(true);
  }

  const warn = q.anulada || q.desatualizada;
  const { combo } = state.session;
  const frase = isCorrect
    ? FRASES_ACERTO[(state.session.qIndex * 3 + state.session.sessionAnswered) % FRASES_ACERTO.length]
    : FRASES_ERRO[(state.session.qIndex * 3 + state.session.sessionAnswered) % FRASES_ERRO.length];
  const progresso = Math.round(((state.session.qIndex + (answered ? 1 : 0)) / total) * 100);

  return (
    <>
      <div className="z-[3] bg-surface p-[14px_16px_12px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuitOpen(true)}
            disabled={saving || finalizing}
            aria-label="Sair da sessão"
            className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-[10px] border-none bg-app-bg text-text2"
          >
            <X weight="bold" size={17} />
          </button>
          <div
            className="question-progress"
            role="progressbar"
            aria-label="Progresso do módulo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso}
          >
            <div className={`question-progress-fill ${combo >= 3 ? 'em-chamas' : ''}`} style={{ width: `${Math.max(progresso, 4)}%` }}>
              {answered && <span className="progress-shine" key={`${state.session.qIndex}-shine`} />}
            </div>
          </div>
          <button
            aria-label={state.timerOn ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
            className="flex h-[34px] flex-none items-center gap-1.5 rounded-[10px] border-[1.5px] px-3 font-display text-[13px] font-extrabold"
            style={{
              borderColor: state.timerOn ? '#F5B301' : '#E6EAF5',
              background: state.timerOn ? '#FFF6D6' : '#fff',
              color: state.timerOn ? '#8a6400' : '#6B7488',
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'currentColor' }} />
            {formatTimer(state.seconds)}
          </button>
        </div>
        <div className="question-status">
          <span>{currentModulo.titulo}</span>
          {combo >= 3 ? (
            <span className="combo-status" key={combo}>
              <Fire size={13} weight="fill" aria-hidden="true" />
              {combo} seguidas
            </span>
          ) : (
            <span>
              Questão {state.session.qIndex + 1} de {total}
            </span>
          )}
        </div>
      </div>

      <PatternBackground scrollClassName="p-[18px_18px_230px]">
        <div ref={contentRef} tabIndex={-1} className="sr-only">
          Questão {state.session.qIndex + 1}
        </div>
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-blue-tint px-2.5 py-1 font-sans text-[11px] font-bold text-blue">
            {q.banca} · {q.ano}
          </span>
          <span className="rounded-lg bg-yellow-tint px-2.5 py-1 font-sans text-[11px] font-bold text-yellow-text">
            {q.disciplina}
          </span>
          <span className="rounded-lg bg-app-bg px-2.5 py-1 font-sans text-[11px] font-bold text-text2">
            Questão {state.session.qIndex + 1} / {total}
          </span>
          {q.motivo && SELO_MOTIVO[q.motivo] && (
            <span className="rounded-lg bg-[#fff1e0] px-2.5 py-1 font-sans text-[11px] font-bold text-[#b33d00]">{SELO_MOTIVO[q.motivo]}</span>
          )}
          {retomadaDe !== null && state.session.qIndex === retomadaDe && !answered && (
            <span className="flex items-center gap-1 rounded-lg bg-success-tint px-2.5 py-1 font-sans text-[11px] font-bold text-success" role="status">
              <ArrowClockwise size={12} weight="bold" />
              Continuando de onde você parou
            </span>
          )}
        </div>

        {warn && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-2xl p-[12px_13px]"
            style={{ background: q.anulada ? '#FDECEC' : '#FFF6D6', border: `1.5px solid ${q.anulada ? '#f6c9cb' : '#FFE38A'}` }}
          >
            <span
              className="flex h-5 w-5 flex-none items-center justify-center rounded-[7px] font-sans text-[13px] font-extrabold text-white"
              style={{ background: q.anulada ? '#E5484D' : '#F5B301' }}
            >
              !
            </span>
            <div>
              <div className="font-sans text-[12.5px] font-extrabold" style={{ color: q.anulada ? '#c0392b' : '#8a6400' }}>
                {q.anulada ? 'Questão anulada pela banca' : 'Questão possivelmente desatualizada'}
              </div>
              <div className="mt-0.5 font-sans text-[12px] font-semibold leading-[1.45] text-text2">
                {q.anulada
                  ? 'A banca anulou esta questão — considerada correta para todos.'
                  : 'Pode não refletir o manual/legislação vigente. Confira antes de estudar por ela.'}
              </div>
            </div>
          </div>
        )}

        {q.enunciado_html ? (
          <div
            className="rich-content mb-5 font-sans text-[16px] font-semibold leading-[1.55] text-ink"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.enunciado_html) }}
          />
        ) : (
          <div className="mb-5 whitespace-pre-line font-sans text-[16px] font-semibold leading-[1.55] text-ink">
            {q.enunciado}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {q.alternativas.map((a) => {
            const sel = selected === a.letra;
            const corr = a.letra === q.gabarito_letra;
            let bd = '#E6EAF5';
            let bg = '#fff';
            let color = '#0B1F4D';
            let bBg = '#F4F6FC';
            let bColor = '#6B7488';
            let bBd = '#E6EAF5';
            let mark: string = a.letra;
            const estado = !answered ? (sel ? 'alt-selected' : '') : corr ? 'alt-correct' : sel ? 'alt-wrong' : 'alt-dim';

            if (!answered) {
              if (sel) {
                bd = '#1557E6';
                bg = '#EEF3FF';
                bBg = '#1557E6';
                bColor = '#fff';
                bBd = '#1557E6';
              }
            } else if (corr) {
              bd = '#22A06B';
              bg = '#E9F7F0';
              bBg = '#22A06B';
              bColor = '#fff';
              bBd = '#22A06B';
              mark = '✓';
            } else if (sel) {
              bd = '#E5484D';
              bg = '#FDECEC';
              bBg = '#E5484D';
              bColor = '#fff';
              bBd = '#E5484D';
              mark = '✕';
            } else {
              color = '#8791a8';
            }

            return (
              <button
                key={a.letra}
                disabled={answered || saving}
                aria-pressed={sel}
                aria-label={`Alternativa ${a.letra}: ${a.texto}`}
                onClick={() => !answered && dispatch({ type: 'SELECT_ALT', letra: a.letra })}
                className={`question-alternative ${estado} flex w-full items-start gap-3 rounded-2xl p-[13px_14px] text-left font-sans text-[14px] font-semibold leading-[1.45] transition-all`}
                style={{ border: `1.5px solid ${bd}`, background: bg, color, cursor: answered ? 'default' : 'pointer' }}
              >
                <span
                  key={mark}
                  className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] font-sans text-[14px] font-extrabold ${answered && (corr || sel) ? 'alt-mark-pop' : ''}`}
                  style={{ background: bBg, color: bColor, border: `1.5px solid ${bBd}` }}
                >
                  {mark}
                </span>
                {a.html ? (
                  <span className="rich-content pt-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.html) }} />
                ) : (
                  <span className="pt-1">{a.texto}</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            ref={explicacaoRef}
            className="explicacao mt-4.5 animate-slide-up rounded-2xl p-4"
            style={{ background: isCorrect ? '#E9F7F0' : '#FDECEC', border: `1.5px solid ${isCorrect ? '#b6e6cd' : '#f6c9cb'}` }}
          >
            <div className="font-sans text-[15px] font-extrabold" style={{ color: isCorrect ? '#17784f' : '#c0392b' }}>
              {isCorrect ? 'Por que está certo' : `A resposta certa é a ${q.gabarito_letra}`}
            </div>
            {q.comentario_html ? (
              <div
                className="rich-content mt-2 font-sans text-[13.5px] font-medium leading-[1.6] text-ink-soft"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.comentario_html) }}
              />
            ) : (
              <div className="mt-2 font-sans text-[13.5px] font-medium leading-[1.6] text-ink-soft">{q.comentario}</div>
            )}

            {showAskAi && (
              <button
                onClick={openAi}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-blue-border bg-blue-tint p-3 font-sans text-[13.5px] font-extrabold text-blue"
              >
                <Mascot mood="wave" size={34} className="-my-2" />
                Ainda com dúvida? Chame o {NOME_MASCOTE}
              </button>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 border-none bg-transparent font-sans text-[12.5px] font-bold text-text3"
          >
            <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[6px] border-[1.5px] border-[#c2c9da] font-sans text-[10px] font-extrabold text-text3">
              !
            </span>
            Reportar ou comentar questão
          </button>
        </div>
      </PatternBackground>

      <div
        className={`question-actions absolute inset-x-0 bottom-0 p-[16px_18px_22px] ${answered ? `feedback-bar ${isCorrect ? 'is-correct' : 'is-wrong'}` : ''}`}
        style={answered ? undefined : { background: 'linear-gradient(180deg,rgba(244,246,252,0),#F4F6FC 30%)' }}
      >
        {answered && (
          <div className="feedback-head" role="status">
            <Mascot mood={isCorrect ? 'happy' : 'encourage'} size={62} />
            <div className="min-w-0 flex-1">
              <div className="feedback-title">{frase}</div>
              <div className="feedback-sub">
                {isCorrect ? (
                  ultimoGanho > 0 ? <span className="xp-pill">+{ultimoGanho} XP</span> : <span>Resposta certa!</span>
                ) : (
                  <span>Resposta certa: {q.gabarito_letra}</span>
                )}
                {isCorrect && ehMarcoDeCombo(combo) && (
                  <span className="combo-pill">
                    <Fire size={13} weight="fill" aria-hidden="true" />
                    {combo} seguidas!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {saveError && (
          <p className="mb-3 rounded-xl bg-white p-3 text-xs font-semibold text-error" role="alert">
            {saveError}
          </p>
        )}
        {answered ? (
          <button
            onClick={next}
            disabled={finalizing || saving}
            className="btn-3d flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white"
            style={
              (isCorrect
                ? { background: '#22A06B', '--btn-sombra': '#17784f' }
                : { background: '#E5484D', '--btn-sombra': '#b8343a' }) as CSSProperties
            }
          >
            {finalizing ? 'Salvando resultado…' : isLast ? 'Ver resultado' : 'Próxima questão'}{' '}
            {finalizing ? <CircleNotch className="busy-icon" size={18} /> : <ArrowRight weight="bold" size={18} />}
          </button>
        ) : (
          <button
            onClick={confirm}
            disabled={!confirmReady || saving}
            className="btn-3d flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white"
            style={
              {
                background: confirmReady ? '#1557E6' : '#c9d2e8',
                '--btn-sombra': confirmReady ? '#0E3DAE' : 'transparent',
                cursor: confirmReady ? 'pointer' : 'default',
              } as CSSProperties
            }
          >
            {saving ? 'Salvando resposta…' : 'Confirmar resposta'}{' '}
            {saving ? <CircleNotch className="busy-icon" size={18} /> : <ArrowRight weight="bold" size={18} />}
          </button>
        )}
      </div>

      {reportOpen && <ReportSheet onClose={() => setReportOpen(false)} onSubmit={submitReport} />}
      {quitOpen && (
        <Dialog title="Pausar por aqui?" onClose={() => setQuitOpen(false)}>
          <p className="dialog-description">
            Suas respostas já estão salvas. Quando voltar, você continua exatamente de onde parou.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="button button-primary" onClick={() => setQuitOpen(false)}>
              Continuar estudando
            </button>
            <button className="button button-secondary" onClick={quit}>
              Voltar para a trilha
            </button>
          </div>
        </Dialog>
      )}
      {reportReason && (
        <div
          className="absolute inset-x-5 bottom-7 z-30 animate-slide-up rounded-2xl bg-ink p-[14px_16px] text-center font-sans text-[13px] font-bold text-white"
          style={{ boxShadow: '0 12px 30px -10px rgba(11,31,77,.6)' }}
        >
          Obrigado! Recebemos seu reporte ✓
        </div>
      )}

      {aiOpen && <AiTutorSheet q={q} selected={selected} acertou={isCorrect} onClose={() => setAiOpen(false)} />}
    </>
  );
}
