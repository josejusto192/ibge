import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAppState } from '../../state/AppStateContext';
import { fetchTrilhas, registrarOnboarding, type TrilhaRow } from '../../lib/queries';
import { PRAZO_DAYS, QUESTIONS_PER_DAY } from '../../lib/format';
import { lerOrigem } from '../../lib/origem';
import type { MascotMood } from '../../components/Mascot';
import WelcomeStep from './steps/WelcomeStep';
import ContactStep from './steps/ContactStep';
import ChoiceStep, { type ChoiceOption } from './steps/ChoiceStep';
import CommitStep from './steps/CommitStep';
import PlanStep from './steps/PlanStep';

// A mesma ordem está em etapas_onboarding() (migration 031), usada no funil do admin.
const STEP_ORDER = ['welcome', 'contact', 'faixa', 'prestou', 'concurso', 'prazo', 'nivel', 'meta', 'commit', 'plan'] as const;

const FAIXA_OPTIONS = ['16-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55+ anos'];
const PRESTOU_OPTIONS: Array<['sim' | 'nao', string, string]> = [
  ['sim', 'Sim, já prestei antes', '🎯'],
  ['nao', 'Não, essa é minha primeira vez', '🌱'],
];
const PRAZO_OPTIONS: Array<[string, string, string, string]> = [
  ['menos1', 'Menos de 1 mês', 'Reta final, foco total', '⏰'],
  ['1a3', '1 a 3 meses', 'Ritmo intenso', '🔥'],
  ['3a6', '3 a 6 meses', 'Construindo a base', '📚'],
  ['naosei', 'Ainda não sei', 'Tudo bem, comece leve', '🤔'],
];
const NIVEL_OPTIONS: Array<[string, string, string, string]> = [
  ['zero', 'Começando do zero', 'Vou aprender do início', '🌱'],
  ['pouco', 'Já estudei um pouco', 'Preciso reforçar', '📖'],
  ['reta', 'Revisando para a reta final', 'Foco em resolver questões', '🚀'],
];
const META_OPTIONS: Array<[number, string, string, string]> = [
  [5, '5 min por dia', '~10 questões · leve', '☕'],
  [10, '10 min por dia', '~20 questões · recomendado', '⭐'],
  [15, '15 min por dia', '~30 questões · focado', '💪'],
  [20, '20 min por dia', '~40 questões · intenso', '🔥'],
];

export default function OnboardingScreen() {
  const { state, dispatch } = useAppState();
  const { ob } = state;
  const obKind = STEP_ORDER[ob.step];
  const showBar = ob.step >= 1;
  const pct = Math.round((ob.step / (STEP_ORDER.length - 1)) * 100);

  const [trilhas, setTrilhas] = useState<TrilhaRow[]>([]);
  useEffect(() => {
    fetchTrilhas()
      .then(setTrilhas)
      .catch(() => setTrilhas([]));
  }, []);

  // Funil do admin: cada tela vista conta uma vez por pessoa.
  useEffect(() => {
    if (obKind) registrarOnboarding(obKind);
  }, [obKind]);

  // Código de indicação (?ref=FOCO-XXXXXXXX na URL), preservado durante o onboarding.
  const [refCode] = useState(() => new URLSearchParams(window.location.search).get('ref') ?? lerOrigem()?.ref ?? null);

  const qPerDay = QUESTIONS_PER_DAY[ob.meta] || 20;
  const trilhaEscolhida = trilhas.find((t) => t.id === ob.concurso);

  let content: ReactNode = null;

  if (obKind === 'welcome') {
    content = <WelcomeStep />;
  } else if (obKind === 'contact') {
    content = <ContactStep />;
  } else if (obKind === 'commit') {
    content = <CommitStep commitLine={`Vou resolver ${qPerDay} questões por dia`} />;
  } else if (obKind === 'plan') {
    content = (
      <PlanStep
        planConcurso={trilhaEscolhida?.nome || 'Sua trilha'}
        planMeta={qPerDay}
        prazoDias={ob.prazo && ob.prazo !== 'naosei' ? (PRAZO_DAYS[ob.prazo] ?? null) : null}
        refCode={refCode}
      />
    );
  } else {
    let title = '';
    let subtitle = '';
    let humor: MascotMood = 'thinking';
    let options: ChoiceOption[] = [];

    if (obKind === 'faixa') {
      title = 'Qual é a sua faixa etária?';
      subtitle = 'Ajuda a gente a conhecer quem estuda com o Foco.';
      humor = 'idle';
      options = FAIXA_OPTIONS.map((v) => ({
        label: v,
        active: ob.faixa === v,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'faixa', value: v }),
      }));
    } else if (obKind === 'prestou') {
      title = 'Você já prestou concurso antes?';
      subtitle = 'Quero entender a sua experiência com provas.';
      options = PRESTOU_OPTIONS.map(([key, label, emoji]) => ({
        label,
        emoji,
        active: ob.prestou === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'prestou', value: key }),
      }));
    } else if (obKind === 'concurso') {
      title = 'Qual concurso é o seu foco?';
      subtitle = 'Escolha sua trilha principal. Dá para trocar depois.';
      humor = 'idle';
      options = trilhas.map((t) => ({
        label: t.nome,
        sub: t.ativa ? (t.tipo === 'inteligente' ? '✨ Trilha inteligente · disponível' : 'Disponível agora') : 'Em breve',
        active: ob.concurso === t.id,
        disabled: !t.ativa,
        onClick: () => (t.ativa ? dispatch({ type: 'OB_CHOOSE', key: 'concurso', value: t.id }) : undefined),
      }));
    } else if (obKind === 'prazo') {
      title = 'Quando é a sua prova?';
      subtitle = 'Com isso eu confiro se o seu ritmo cabe até o dia da prova.';
      options = PRAZO_OPTIONS.map(([key, label, sub, emoji]) => ({
        label,
        sub,
        emoji,
        active: ob.prazo === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'prazo', value: key }),
      }));
    } else if (obKind === 'nivel') {
      title = 'Como está o seu preparo hoje?';
      subtitle =
        trilhaEscolhida?.tipo === 'inteligente'
          ? 'Seja sincero: suas primeiras questões já começam no seu nível.'
          : 'Seja sincero: isso me ajuda a entender o seu momento.';
      options = NIVEL_OPTIONS.map(([key, label, sub, emoji]) => ({
        label,
        sub,
        emoji,
        active: ob.nivel === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'nivel', value: key }),
      }));
    } else if (obKind === 'meta') {
      title = 'Quanto tempo por dia você quer estudar?';
      subtitle = 'Constância vale mais que volume. Comece pequeno.';
      humor = 'encourage';
      options = META_OPTIONS.map(([key, label, sub, emoji]) => ({
        label,
        sub,
        emoji,
        active: ob.meta === key,
        onClick: () => dispatch({ type: 'OB_CHOOSE', key: 'meta', value: key }),
      }));
    }

    content = <ChoiceStep key={obKind} title={title} subtitle={subtitle} options={options} humor={humor} />;
  }

  if (obKind === 'welcome') return content;

  return (
    <div className="scr flex flex-1 flex-col overflow-y-auto">
      <div className="onboarding-steps flex flex-1 flex-col">
        {showBar && (
          <div className="ob-topo">
            <button aria-label="Voltar à etapa anterior" onClick={() => dispatch({ type: 'OB_SET_STEP', step: Math.max(0, ob.step - 1) })}>
              <ArrowLeft weight="bold" size={18} />
            </button>
            <div className="ob-progresso" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <div key={obKind} className="flex flex-1 flex-col">
          {content}
        </div>
      </div>
    </div>
  );
}
