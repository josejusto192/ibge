import { ArrowsLeftRight, Check, Fire, Lightning, Play, Trophy } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../state/AppStateContext';
import Mascot from '../../components/Mascot';
import OfensivaSheet from './OfensivaSheet';
import { useAppData } from '../../contexts/AppDataContext';
import Brand from '../../components/Brand';
import ErrosFab from '../../components/ErrosFab';
import { ErrorState, TrailLoading } from '../../components/Feedback';
import PatternBackground from '../../components/PatternBackground';
import TrilhaPath from './TrilhaPath';
import TrilhasSheet from './TrilhasSheet';

// Reused by the login and onboarding illustrations.
export function PathIllustration() {
  return (
    <div className="hero-path" aria-hidden="true">
      <span className="hero-step one">
        <Check size={23} weight="bold" />
      </span>
      <span className="hero-step two">
        <Play size={28} weight="fill" />
      </span>
      <span className="hero-step three">
        <Trophy size={25} weight="duotone" />
      </span>
      <span className="hero-spark">✦</span>
    </div>
  );
}

export default function Home() {
  const { usuario, activeTrilha, dailyDone, errosCount, refreshErrosCount, loading, loadError, retry, modules, ofensiva, estudouHoje } =
    useAppData();
  const { dispatch } = useAppState();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ofensivaOpen, setOfensivaOpen] = useState(false);
  // Os dados do app sobrevivem à troca de tela — recarrega a contagem ao
  // voltar pra trilha (ex.: saiu do caderno de erros no meio da revisão).
  useEffect(() => {
    refreshErrosCount();
  }, [refreshErrosCount]);
  const dailyGoal = Math.max(1, usuario?.meta_diaria ?? 20);
  const dailyRatio = Math.min(1, dailyDone / dailyGoal);
  const metaBatida = dailyDone >= dailyGoal;

  // "Estudar agora" (lembrete e janela da ofensiva): próximo módulo da
  // trilha; se a trilha acabou, o caderno de erros. A tela da questão cuida
  // de mandar pra assinatura se o módulo for pago.
  const atual = modules.find((m) => m.status === 'current');
  const estudarAgora = atual
    ? () => {
        dispatch({ type: 'RESET_SESSION' });
        navigate(atual.premium ? '/assinar' : '/questao');
      }
    : errosCount > 0
      ? () => navigate('/caderno-de-erros')
      : null;

  return (
    <>
      <header className="compact-home-header">
        <div className="compact-home-top">
          <Brand />
          <div className="compact-home-badges" aria-label="Seu progresso">
            <button
              type="button"
              className={`compact-badge streak ${estudouHoje ? 'acesa' : 'apagada'}`}
              aria-label={`${ofensiva} dias de ofensiva${estudouHoje ? '' : ', ainda sem estudo hoje'}. Ver detalhes`}
              onClick={() => setOfensivaOpen(true)}
            >
              <Fire size={16} weight="fill" aria-hidden="true" />
              <strong>{ofensiva}</strong>
            </button>
            <span className="compact-badge xp" aria-label={`${usuario?.xp ?? 0} pontos de experiência`}>
              <Lightning size={16} weight="fill" aria-hidden="true" />
              <strong>{(usuario?.xp ?? 0).toLocaleString('pt-BR')} XP</strong>
            </span>
          </div>
        </div>

        <button className="compact-trilha" type="button" onClick={() => setSheetOpen(true)} aria-label="Trocar trilha de estudos">
          <span className="compact-trilha-label">
            TRILHA ATUAL
            <span className="compact-trilha-switch">
              <ArrowsLeftRight size={12} weight="bold" aria-hidden="true" />
              trocar
            </span>
          </span>
          <strong>{activeTrilha?.nome || 'Escolha sua trilha'}</strong>
          {activeTrilha?.tipo === 'inteligente' && <span className="trilha-inteligente-selo">✨ TRILHA INTELIGENTE · se adapta a você</span>}
          {activeTrilha?.descricao && <small>{activeTrilha.descricao}</small>}
        </button>

        <div className={`compact-goal ${metaBatida ? 'done' : ''}`} aria-label={`Meta de hoje: ${dailyDone} de ${dailyGoal} questões`}>
          <div className="compact-goal-track" aria-hidden="true">
            <span style={{ width: `${dailyRatio * 100}%` }} />
          </div>
          <strong>{metaBatida ? 'Meta do dia batida ✓' : `Meta ${dailyDone}/${dailyGoal}`}</strong>
        </div>
      </header>

      <PatternBackground scrollClassName="compact-path-scroll">
        {!loading && !loadError && !estudouHoje && (
          <div className="lembrete-ofensiva" role="status">
            <Mascot mood="wave" size={64} />
            <div className="min-w-0 flex-1">
              <strong>{ofensiva > 0 ? `Não perca sua ofensiva de ${ofensiva} ${ofensiva === 1 ? 'dia' : 'dias'}!` : 'Comece sua ofensiva hoje!'}</strong>
              <span>Responda 1 questão hoje para {ofensiva > 0 ? 'manter a sequência' : 'acender o fogo'}.</span>
            </div>
            {estudarAgora && (
              <button type="button" className="lembrete-ofensiva-cta" onClick={estudarAgora}>
                Estudar
              </button>
            )}
          </div>
        )}
        {loading ? <TrailLoading /> : loadError ? <ErrorState message={loadError} retry={retry} /> : <TrilhaPath />}
      </PatternBackground>

      <ErrosFab count={errosCount} />
      {sheetOpen && <TrilhasSheet onClose={() => setSheetOpen(false)} />}
      {ofensivaOpen && usuario && (
        <OfensivaSheet
          usuarioId={usuario.id}
          ofensiva={ofensiva}
          estudouHoje={estudouHoje}
          onEstudar={
            estudarAgora
              ? () => {
                  setOfensivaOpen(false);
                  estudarAgora();
                }
              : null
          }
          onClose={() => setOfensivaOpen(false)}
        />
      )}
    </>
  );
}
