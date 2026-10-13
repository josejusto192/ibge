import { ArrowRight, Fire, PlayCircle, X } from '@phosphor-icons/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { fetchQuestoesErradas, responderQuestao } from '../lib/queries';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import type { Questao } from '../data/types';
import PatternBackground from '../components/PatternBackground';
import { LoadingExperience } from '../components/Feedback';
import VideoSheet from '../components/sheets/VideoSheet';
import Mascot from '../components/Mascot';
import Confetti from '../components/Confetti';
import { som } from '../lib/efeitos';
import { logClientError } from '../lib/errorLog';

// Escada da revisão espaçada (migration 028): errou → caderno; acertou →
// volta em 1 dia → 7 dias → 30 dias → dominada.
const ROTULO_ETAPA: Record<number, string> = { 1: 'depois de 1 dia', 2: 'depois de 7 dias', 3: 'depois de 30 dias' };

function textoProximaRevisao(etapa: number | null): string {
  if (etapa === 1) return 'Volta amanhã pra fixar';
  if (etapa === 2) return 'Próxima revisão em 7 dias';
  if (etapa === 3) return 'Próxima revisão em 30 dias';
  if (etapa != null && etapa >= 4) return 'Dominada! Não volta mais 🎉';
  return 'Saiu do caderno';
}

export default function CadernoErros() {
  const { usuario, aplicarResposta, refreshDailyDone, refreshErrosCount } = useAppData();
  const navigate = useNavigate();

  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [acertosNestaSessao, setAcertosNestaSessao] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [aulaAberta, setAulaAberta] = useState(false);
  const [ofensivaNova, setOfensivaNova] = useState<number | null>(null);
  const [xpGanho, setXpGanho] = useState(0);
  // o que o servidor decidiu: volta em 1/7/30 dias ou dominada (4)
  const [proximaEtapa, setProximaEtapa] = useState<number | null>(null);

  // erros + revisões programadas vencidas, de todas as trilhas (migration 028)
  useEffect(() => {
    fetchQuestoesErradas()
      .then(setQuestoes)
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="font-sans text-[13.5px] font-semibold text-text2">Não conseguimos carregar o caderno de erros agora.</div>
        <button onClick={() => navigate('/trilha')} className="font-sans text-[13px] font-extrabold text-blue">
          Voltar para a trilha
        </button>
      </div>
    );
  }

  if (!questoes) {
    return <LoadingExperience message="Separando suas revisões" />;
  }

  const total = questoes.length;

  if (total === 0 || finalizado) {
    const comemorar = finalizado && acertosNestaSessao > 0;
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        {comemorar && <Confetti quantidade={90} />}
        <Mascot mood={!finalizado ? 'wave' : comemorar ? 'celebrate' : 'encourage'} size={132} />
        <div className="font-display text-[20px] font-extrabold text-ink">
          {finalizado ? 'Revisão concluída!' : 'Tudo revisado por aqui!'}
        </div>
        <div className="max-w-[300px] font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
          {finalizado
            ? `Você acertou ${acertosNestaSessao} de ${total} desta vez.${acertosNestaSessao > 0 ? ' As que acertou voltam para uma revisão rápida daqui a alguns dias, pra fixar de vez.' : ' Elas continuam aqui para a próxima revisão.'}`
            : 'Nenhum erro ou revisão pendente agora. As questões voltam aqui no dia certo de revisar. Continue avançando!'}
        </div>
        {ofensivaNova && (
          <div className="ofensiva-chip">
            <Fire size={16} weight="fill" aria-hidden="true" />
            Ofensiva de {ofensivaNova} {ofensivaNova === 1 ? 'dia' : 'dias'}!
          </div>
        )}
        <div className="mt-2 w-full max-w-[360px]">
          <button onClick={() => navigate('/trilha')} className="button button-primary w-full">
            Voltar para a trilha
          </button>
        </div>
      </div>
    );
  }

  const q = questoes[index];
  const isCorrect = answered && selected === q.gabarito_letra;
  const isLast = index >= total - 1;

  async function confirm() {
    if (!selected || answered || !usuario) return;
    const correct = selected === q.gabarito_letra;
    setAnswered(true);
    setXpGanho(0);
    setProximaEtapa(null);
    if (correct) {
      som.acerto();
      setAcertosNestaSessao((n) => n + 1);
    } else {
      som.erro();
    }
    try {
      // o servidor confere o gabarito e decide XP e ofensiva
      const r = await responderQuestao(q.id, selected, 'caderno');
      aplicarResposta(r);
      setXpGanho(r.xp_ganho);
      setProximaEtapa(r.revisao_etapa);
      if (r.ofensiva_nova) setOfensivaNova(r.ofensiva_nova);
      await Promise.all([refreshDailyDone(), refreshErrosCount()]);
    } catch (err) {
      // não trava a revisão se a gravação falhar — o aluno já viu o feedback
      logClientError(err, 'responderQuestao (caderno)');
    }
  }

  function next() {
    if (isLast) {
      if (acertosNestaSessao > 0) som.conclusao();
      setFinalizado(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
    setAulaAberta(false);
  }

  return (
    <>
      <div className="z-[3] bg-surface p-[14px_16px_12px]" style={{ borderBottom: '1px solid #EDF0F8' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trilha')}
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border-none bg-app-bg text-text2"
          >
            <X weight="bold" size={17} />
          </button>
          <div className="question-progress">
            <div
              className="question-progress-fill caderno"
              style={{ width: `${Math.max(Math.round(((index + (answered ? 1 : 0)) / total) * 100), 4)}%` }}
            >
              {answered && <span className="progress-shine" key={`${index}-shine`} />}
            </div>
          </div>
          <span className="flex-none font-sans text-[12px] font-extrabold text-text3">
            {index + 1}/{total}
          </span>
        </div>
      </div>

      <PatternBackground scrollClassName="p-[18px_18px_230px]">
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {(q.revisaoEtapa ?? 0) > 0 ? (
            <span className="rounded-lg bg-[#fff1e0] px-2.5 py-1 font-sans text-[11px] font-bold text-[#b33d00]">
              🔁 Revisão programada · {ROTULO_ETAPA[q.revisaoEtapa ?? 1] ?? 'revisão'}
            </span>
          ) : (
            <span className="rounded-lg bg-error-tint px-2.5 py-1 font-sans text-[11px] font-bold text-error">Você errou esta</span>
          )}
          <span className="rounded-lg bg-blue-tint px-2.5 py-1 font-sans text-[11px] font-bold text-blue">
            {q.banca} · {q.ano}
          </span>
          <span className="rounded-lg bg-yellow-tint px-2.5 py-1 font-sans text-[11px] font-bold text-yellow-text">{q.disciplina}</span>
        </div>

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
                disabled={answered}
                aria-pressed={sel}
                onClick={() => !answered && setSelected(a.letra)}
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
            {q.aula && (
              <button
                onClick={() => setAulaAberta(true)}
                className="mt-3 flex w-full items-center gap-2.5 rounded-xl border-none bg-surface p-[10px_12px] text-left font-sans text-[13px] font-extrabold text-blue"
                style={{ border: '1.5px solid #d6e0fb' }}
              >
                <PlayCircle weight="fill" size={22} className="flex-none" />
                <span className="min-w-0 flex-1">
                  Assistir aula sobre o assunto
                  <span className="block truncate text-[11.5px] font-semibold text-text2">{q.aula.titulo}</span>
                </span>
              </button>
            )}
          </div>
        )}
      </PatternBackground>

      <div
        className={`question-actions absolute inset-x-0 bottom-0 p-[16px_18px_22px] ${answered ? `feedback-bar ${isCorrect ? 'is-correct' : 'is-wrong'}` : ''}`}
        style={answered ? undefined : { background: 'linear-gradient(180deg,rgba(244,246,252,0),#F4F6FC 30%)' }}
      >
        {answered && (
          <div className="feedback-head" role="status">
            <Mascot mood={isCorrect ? 'happy' : 'encourage'} size={62} />
            <div className="min-w-0 flex-1">
              <div className="feedback-title">{isCorrect ? 'Agora foi!' : 'Ainda não'}</div>
              <div className="feedback-sub">
                {isCorrect ? (
                  <>
                    {xpGanho > 0 && <span className="xp-pill">+{xpGanho} XP</span>}
                    <span>{textoProximaRevisao(proximaEtapa)}</span>
                  </>
                ) : (
                  <span>Ela continua no caderno para revisar depois</span>
                )}
              </div>
            </div>
          </div>
        )}
        {answered ? (
          <button
            onClick={next}
            className="btn-3d flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white"
            style={
              (isCorrect
                ? { background: '#22A06B', '--btn-sombra': '#17784f' }
                : { background: '#E5484D', '--btn-sombra': '#b8343a' }) as CSSProperties
            }
          >
            {isLast ? 'Concluir revisão' : 'Próxima'} <ArrowRight weight="bold" size={18} />
          </button>
        ) : (
          <button
            onClick={confirm}
            className="btn-3d flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white"
            style={
              {
                background: selected ? '#1557E6' : '#c9d2e8',
                '--btn-sombra': selected ? '#0E3DAE' : 'transparent',
                cursor: selected ? 'pointer' : 'default',
              } as CSSProperties
            }
          >
            Confirmar resposta <ArrowRight weight="bold" size={18} />
          </button>
        )}
      </div>

      {aulaAberta && q.aula && (
        <VideoSheet titulo={q.aula.titulo} videoUrl={q.aula.video_url} descricao="Aula de apoio · opcional" onClose={() => setAulaAberta(false)} />
      )}
    </>
  );
}
