import { ArrowRight, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../contexts/AppDataContext';
import { fetchQuestoesDoModulo, recordResposta, upsertProgressoModulo } from '../../lib/queries';
import { formatTimer } from '../../lib/format';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { useAppState } from '../../state/AppStateContext';
import type { Questao } from '../../data/types';
import PatternBackground from '../../components/PatternBackground';
import ReportSheet from './ReportSheet';
import AiTutorSheet from './AiTutorSheet';

export default function Question() {
  const { state, dispatch } = useAppState();
  const { usuario, activeTrilha, modules, addXp, refreshModules, refreshDailyDone } = useAppData();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const currentModulo = modules.find((m) => m.status === 'current') ?? null;
  const currentModuloId = currentModulo?.id;

  useEffect(() => {
    if (!currentModuloId) return;
    setQuestoes(null);
    fetchQuestoesDoModulo(currentModuloId).then(setQuestoes);
  }, [currentModuloId]);

  if (!currentModulo) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center font-sans text-[13.5px] font-semibold text-text2">
        Nenhum módulo disponível para começar agora.
      </div>
    );
  }

  if (!questoes) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-11 w-11 animate-spin-fast rounded-full border-4 border-border" style={{ borderTopColor: '#1557E6' }} />
      </div>
    );
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
    if (!confirmReady || answered || !usuario) return;
    const correct = selected === q.gabarito_letra;
    dispatch({ type: 'MARK_ANSWERED', correct });
    try {
      await recordResposta(usuario.id, q.id, correct);
      if (correct) await addXp(10);
      await refreshDailyDone();
    } catch (err) {
      console.error('Falha ao gravar resposta', err);
    }
  }

  async function next() {
    if (!isLast) {
      dispatch({ type: 'NEXT_QUESTION' });
      setAiOpen(false);
      return;
    }
    if (usuario && currentModuloId && !finalizing) {
      setFinalizing(true);
      try {
        await upsertProgressoModulo(usuario.id, currentModuloId, state.session.sessionCorrect, state.session.sessionAnswered);
        await refreshModules();
      } catch (err) {
        console.error('Falha ao gravar progresso do módulo', err);
      }
    }
    navigate('/resultado', { state: { moduloTitulo: currentModulo?.titulo, trilhaNome: activeTrilha?.nome } });
  }

  function submitReport(reason: string) {
    setReportOpen(false);
    setReportReason(reason);
    setTimeout(() => setReportReason(null), 2800);
  }

  function openAi() {
    dispatch({
      type: 'AI_OPEN_SEED',
      text: `Vi que você errou essa questão de ${q.disciplina}. Baseado no enunciado, nas alternativas e no comentário, me conta o que ficou confuso — posso te ajudar.`,
    });
    setAiOpen(true);
  }

  const warn = q.anulada || q.desatualizada;

  return (
    <>
      <div className="z-[3] bg-surface p-[14px_16px_12px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
        <div className="flex items-center gap-3">
          <button onClick={quit} className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border-none bg-app-bg text-text2">
            <X weight="bold" size={17} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-lg bg-border2">
            <div
              className="h-full rounded-lg transition-[width] duration-300"
              style={{ width: `${Math.round(((state.session.qIndex + (answered ? 1 : 0)) / total) * 100)}%`, background: 'linear-gradient(90deg,#1557E6,#3a7bff)' }}
            />
          </div>
          <button
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
      </div>

      <PatternBackground scrollClassName="p-[18px_18px_150px]">
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-blue-tint px-2.5 py-1 font-sans text-[11px] font-bold text-blue">
            {q.banca} · {q.ano}
          </span>
          <span className="rounded-lg bg-yellow-tint px-2.5 py-1 font-sans text-[11px] font-bold text-yellow-text">{q.disciplina}</span>
          <span className="rounded-lg bg-app-bg px-2.5 py-1 font-sans text-[11px] font-bold text-text2">
            Questão {state.session.qIndex + 1} / {total}
          </span>
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
          <div className="mb-5 whitespace-pre-line font-sans text-[16px] font-semibold leading-[1.55] text-ink">{q.enunciado}</div>
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
                onClick={() => !answered && dispatch({ type: 'SELECT_ALT', letra: a.letra })}
                className="flex w-full items-start gap-3 rounded-2xl p-[13px_14px] text-left font-sans text-[14px] font-semibold leading-[1.45] transition-all"
                style={{ border: `1.5px solid ${bd}`, background: bg, color, cursor: answered ? 'default' : 'pointer' }}
              >
                <span
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] font-sans text-[14px] font-extrabold"
                  style={{ background: bBg, color: bColor, border: `1.5px solid ${bBd}` }}
                >
                  {mark}
                </span>
                <span className="pt-1">{a.texto}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className="mt-4.5 animate-slide-up rounded-2xl p-4"
            style={{ background: isCorrect ? '#E9F7F0' : '#FDECEC', border: `1.5px solid ${isCorrect ? '#b6e6cd' : '#f6c9cb'}` }}
          >
            <div className="font-sans text-[15px] font-extrabold" style={{ color: isCorrect ? '#17784f' : '#c0392b' }}>
              {isCorrect ? 'Você acertou! 🎉' : `Ops! Resposta correta: ${q.gabarito_letra}`}
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
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-blue font-display text-[11px] font-extrabold text-yellow">
                  IA
                </span>
                Ainda com dúvida? Perguntar para a IA
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

      <div className="absolute inset-x-0 bottom-0 p-[16px_18px_22px]" style={{ background: 'linear-gradient(180deg,rgba(244,246,252,0),#F4F6FC 30%)' }}>
        {answered ? (
          <button
            onClick={next}
            disabled={finalizing}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none bg-success font-sans text-[16px] font-extrabold text-white"
            style={{ boxShadow: '0 6px 0 #17784f' }}
          >
            {isLast ? 'Ver resultado' : 'Próxima questão'} <ArrowRight weight="bold" size={18} />
          </button>
        ) : (
          <button
            onClick={confirm}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white transition-all"
            style={{ background: confirmReady ? '#1557E6' : '#c9d2e8', boxShadow: confirmReady ? '0 6px 0 #0E3DAE' : 'none', cursor: confirmReady ? 'pointer' : 'default' }}
          >
            Confirmar resposta <ArrowRight weight="bold" size={18} />
          </button>
        )}
      </div>

      {reportOpen && <ReportSheet onClose={() => setReportOpen(false)} onSubmit={submitReport} />}
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
