import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { fetchTrilhas, type TrilhaRow } from '../../lib/queries';
import { PRAZO_DAYS, QUESTIONS_PER_DAY } from '../../lib/format';
import WelcomeStep from './steps/WelcomeStep';
import ContactStep from './steps/ContactStep';
import ChoiceStep, { type ChoiceOption } from './steps/ChoiceStep';
import CommitStep from './steps/CommitStep';
import PlanStep from './steps/PlanStep';

const STEP_ORDER = ['welcome', 'contact', 'faixa', 'prestou', 'concurso', 'prazo', 'nivel', 'meta', 'commit', 'plan'] as const;

const FAIXA_OPTIONS = ['16-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55+ anos'];
const PRESTOU_OPTIONS: Array<['sim' | 'nao', string]> = [
  ['sim', 'Sim, já prestei antes'],
  ['nao', 'Não, essa é minha primeira vez'],
];
const PRAZO_OPTIONS: Array<[string, string, string]> = [
  ['menos1', 'Menos de 1 mês', 'Reta final — foco total'],
  ['1a3', '1 a 3 meses', 'Ritmo intenso'],
  ['3a6', '3 a 6 meses', 'Construindo a base'],
  ['naosei', 'Ainda não sei', 'Tudo bem, comece leve'],
];
const NIVEL_OPTIONS: Array<[string, string, string]> = [
  ['zero', 'Começando do zero', 'Vou aprender do início'],
  ['pouco', 'Já estudei um pouco', 'Preciso reforçar'],
  ['reta', 'Revisando para a reta final', 'Foco em resolver questões'],
];
const META_OPTIONS: Array<[number, string, string]> = [
  [5, '5 min por dia', '~10 questões · leve'],
  [10, '10 min por dia', '~20 questões · recomendado'],
  [15, '15 min por dia', '~30 questões · focado'],
  [20, '20 min por dia', '~40 questões · intenso'],
];

export default function OnboardingScreen() {
  const { state, dispatch } = useAppState();
  const { ob } = state;
  const obKind = STEP_ORDER[ob.step];
  const showBar = ob.step >= 1;
  const pct = Math.round((ob.step / (STEP_ORDER.length - 1)) * 100);

  const [trilhas, setTrilhas] = useState<TrilhaRow[]>([]);
  useEffect(() => {
    fetchTrilhas().then(setTrilhas);
  }, []);

  // Código de indicação (?ref=FOCO-XXXXXXXX na URL), preservado durante o onboarding.
  const [refCode] = useState(() => new URLSearchParams(window.location.search).get('ref'));

  const qPerDay = QUESTIONS_PER_DAY[ob.meta] || 20;
  const prazoDays = (ob.prazo && PRAZO_DAYS[ob.prazo]) || 90;

  let content: ReactNode = null;

  if (obKind === 'welcome') {
    content = <WelcomeStep />;
  } else if (obKind === 'contact') {
    content = <ContactStep />;
  } else if (obKind === 'commit') {
    content = <CommitStep commitLine={`Vou resolver ${qPerDay} questões por dia`} />;
  } else if (obKind === 'plan') {
    const planConcurso = trilhas.find((t) => t.id === ob.concurso)?.nome || 'IBGE';
    content = (
      <PlanStep planConcurso={planConcurso} planMeta={qPerDay} planWeeks={Math.max(1, Math.round(prazoDays / 7))} refCode={refCode} />
    );
  } else {
    let title = '';
    let subtitle = '';
    let options: ChoiceOption[] = [];

    if (obKind === 'faixa') {
      title = 'Qual sua faixa etária?';
      subtitle = 'Ajuda a calibrar exemplos e linguagem do conteúdo.';
      options = FAIXA_OPTIONS.map((v) => ({
        label: v,
        active: ob.faixa === v,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'faixa', value: v }),
      }));
    } else if (obKind === 'prestou') {
      title = 'Você já prestou concurso antes?';
      subtitle = 'Assim a gente ajusta o tom das dicas ao seu nível de experiência.';
      options = PRESTOU_OPTIONS.map(([key, label]) => ({
        label,
        active: ob.prestou === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'prestou', value: key }),
      }));
    } else if (obKind === 'concurso') {
      title = 'Qual concurso é o seu foco?';
      subtitle = 'Escolha sua trilha principal — dá para mudar depois.';
      options = trilhas.map((t) => ({
        label: t.nome,
        sub: t.ativa ? 'Disponível agora' : 'Em breve',
        active: ob.concurso === t.id,
        disabled: !t.ativa,
        onClick: () => (t.ativa ? dispatch({ type: 'OB_CHOOSE', key: 'concurso', value: t.id }) : undefined),
      }));
    } else if (obKind === 'prazo') {
      title = 'Quando é a sua prova?';
      subtitle = 'Isso define o ritmo do seu plano de estudos.';
      options = PRAZO_OPTIONS.map(([key, label, sub]) => ({
        label,
        sub,
        active: ob.prazo === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'prazo', value: key }),
      }));
    } else if (obKind === 'nivel') {
      title = 'Como está o seu preparo hoje?';
      subtitle = 'Seja sincero — a gente ajusta a dificuldade para você.';
      options = NIVEL_OPTIONS.map(([key, label, sub]) => ({
        label,
        sub,
        active: ob.nivel === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'nivel', value: key }),
      }));
    } else if (obKind === 'meta') {
      title = 'Quanto tempo por dia?';
      subtitle = 'Constância vale mais que volume. Comece pequeno.';
      options = META_OPTIONS.map(([key, label, sub]) => ({
        label,
        sub,
        active: ob.meta === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'meta', value: key }),
      }));
    }

    content = <ChoiceStep title={title} subtitle={subtitle} options={options} />;
  }

  return (
    <div className="scr flex flex-1 flex-col overflow-y-auto">
      {showBar && (
        <div className="flex items-center gap-3 p-[18px_20px_6px]">
          <button
            onClick={() => dispatch({ type: 'OB_SET_STEP', step: Math.max(0, ob.step - 1) })}
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border-none bg-app-bg text-text2"
          >
            <ArrowLeft weight="bold" size={18} />
          </button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-lg bg-border2">
            <div
              className="h-full rounded-lg transition-[width] duration-300"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1557E6,#3a7bff)' }}
            />
          </div>
        </div>
      )}
      {content}
    </div>
  );
}
