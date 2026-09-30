import { HandPalm } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import Confetti from '../../../components/Confetti';
import Mascot from '../../../components/Mascot';
import { som } from '../../../lib/efeitos';
import { useAppState } from '../../../state/AppStateContext';

export default function CommitStep({ commitLine }: { commitLine: string }) {
  const { dispatch } = useAppState();
  const [firmou, setFirmou] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function comprometer() {
    if (firmou) return;
    setFirmou(true);
    som.conclusao();
    timer.current = window.setTimeout(() => dispatch({ type: 'OB_PLEDGE' }), 1300);
  }

  return (
    <div className="ob-tela ob-compromisso">
      {firmou && <Confetti disparo={1} quantidade={90} origemY={0.3} />}
      <div className="ob-compromisso-mascote">
        <Mascot mood={firmou ? 'celebrate' : 'encourage'} size={128} />
      </div>
      <span className="ob-rotulo">SEU COMPROMISSO</span>
      <h1 className="ob-compromisso-frase">“{commitLine}, todos os dias.”</h1>
      <div className="ob-dica">
        Os primeiros <b>7 dias</b> são os que mais contam para criar o hábito. Eu te lembro e comemoro cada dia com você. 🔥
      </div>
      <div className="flex-1" />
      <button type="button" onClick={comprometer} className={`button button-primary ob-botao${firmou ? ' firmou' : ''}`}>
        <HandPalm weight="bold" size={19} />
        {firmou ? 'Combinado!' : 'Eu me comprometo'}
      </button>
      <p className="ob-nota">Você pode ajustar sua meta quando quiser, no Perfil.</p>
    </div>
  );
}
