import { ArrowRight, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { fetchQuestoesErradas, atualizarRespostaErro } from '../lib/queries';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import type { Questao } from '../data/types';
import PatternBackground from '../components/PatternBackground';

export default function CadernoErros() {
  const { usuario, activeTrilha, addXp, refreshDailyDone, refreshErrosCount } = useAppData();
  const navigate = useNavigate();

  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [acertosNestaSessao, setAcertosNestaSessao] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    if (!activeTrilha) return;
    fetchQuestoesErradas(activeTrilha.id)
      .then(setQuestoes)
      .catch(() => setLoadError(true));
  }, [activeTrilha]);

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
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-11 w-11 animate-spin-fast rounded-full border-4 border-border" style={{ borderTopColor: '#1557E6' }} />
      </div>
    );
  }

  const total = questoes.length;

  if (total === 0 || finalizado) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-tint font-display text-[28px] font-extrabold text-success">
          ✓
        </div>
        <div className="font-display text-[18px] font-extrabold text-ink">
          {finalizado ? 'Revisão concluída!' : 'Nenhuma questão pra revisar'}
        </div>
        {finalizado && (
          <div className="font-sans text-[13.5px] font-semibold text-text2">
            Você acertou {acertosNestaSessao} de {total} desta vez.
          </div>
        )}
        <button onClick={() => navigate('/trilha')} className="mt-1 font-sans text-[13px] font-extrabold text-blue">
          Voltar para a trilha
        </button>
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
    if (correct) {
      setAcertosNestaSessao((n) => n + 1);
      await addXp(10);
    }
    try {
      await atualizarRespostaErro(usuario.id, q.id, correct);
      await refreshDailyDone();
    } catch {
      // não deve travar a revisão se a gravação falhar — o aluno já viu o feedback
    }
  }

  function next() {
    if (isLast) {
      refreshErrosCount();
      setFinalizado(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
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
          <div className="h-3 flex-1 overflow-hidden rounded-lg bg-border2">
            <div
              className="h-full rounded-lg transition-[width] duration-300"
              style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / total) * 100)}%`, background: 'linear-gradient(90deg,#E5484D,#F5484D)' }}
            />
          </div>
          <span className="flex-none font-sans text-[12px] font-extrabold text-text3">
            {index + 1}/{total}
          </span>
        </div>
      </div>

      <PatternBackground scrollClassName="p-[18px_18px_150px]">
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-error-tint px-2.5 py-1 font-sans text-[11px] font-bold text-error">Caderno de erros</span>
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
                onClick={() => !answered && setSelected(a.letra)}
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
              {isCorrect ? 'Acertou dessa vez! 🎉' : `Ainda não — resposta correta: ${q.gabarito_letra}`}
            </div>
            {q.comentario_html ? (
              <div
                className="rich-content mt-2 font-sans text-[13.5px] font-medium leading-[1.6] text-ink-soft"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.comentario_html) }}
              />
            ) : (
              <div className="mt-2 font-sans text-[13.5px] font-medium leading-[1.6] text-ink-soft">{q.comentario}</div>
            )}
          </div>
        )}
      </PatternBackground>

      <div className="absolute inset-x-0 bottom-0 p-[16px_18px_22px]" style={{ background: 'linear-gradient(180deg,rgba(244,246,252,0),#F4F6FC 30%)' }}>
        {answered ? (
          <button
            onClick={next}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none bg-success font-sans text-[16px] font-extrabold text-white"
            style={{ boxShadow: '0 6px 0 #17784f' }}
          >
            {isLast ? 'Concluir revisão' : 'Próxima'} <ArrowRight weight="bold" size={18} />
          </button>
        ) : (
          <button
            onClick={confirm}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white transition-all"
            style={{ background: selected ? '#1557E6' : '#c9d2e8', boxShadow: selected ? '0 6px 0 #0E3DAE' : 'none', cursor: selected ? 'pointer' : 'default' }}
          >
            Confirmar resposta <ArrowRight weight="bold" size={18} />
          </button>
        )}
      </div>
    </>
  );
}
